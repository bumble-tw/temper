// src/App.tsx
import { useState, useEffect, useRef } from 'react'
import { Button, Container, Title, Text, Group, Paper, Stack, Switch, Divider, Slider, Select, TextInput } from '@mantine/core'
import { Routes, Route, Link } from 'react-router-dom'
import * as Tone from 'tone'
import { getTransport } from 'tone'

// --- 節奏模式資料結構 ---
type SubBeat = {
  time: string // Tone.js time notation (e.g., "0:0:0", "0:0:2") 0 小節, 第 0 拍, 第 0 個十六分音符
  note: string // C2:主拍(較重)、C1:次拍(較輕)、Rest:空拍
  label: string // 顯示在介面上的標籤(e.g.、 "1", "ple", "2")
  isMain?: boolean // 是否為主拍
  isRest?: boolean // 是否為空拍
  enabled?: boolean // 用於自定義模式
}

type Preset = {
  id: string
  name: string
  beats: SubBeat[]
  usePickup?: boolean // 是否使用 pickup beat
  isCustom?: boolean // 是否為用戶自定義
}

// 總拍點數：8 拍（每拍四個十六分音符，共 32 個拍點)
const TOTAL_BEAT_COUNT = 32

// 初始32拍點陣列
const INITIAL_CUSTOM_BEATS: SubBeat[] = Array.from({ length: TOTAL_BEAT_COUNT }).map((_, index) => {
  const quarter = Math.floor(index / 4) // 拍數
  const sixteenth = index % 4           // 1/4拍
  return {
    time: `0:${quarter}:${sixteenth}`,
    note: 'Rest', // 預設為空拍
    label: sixteenth === 0 ? `${quarter + 1}` : (sixteenth === 2 ? '&' : '.'),
    isMain: sixteenth === 0,
    isRest: true,
    enabled: false
  }
})

// 創建預設節奏的輔助函數
const createBeatsFromIndices = (indices: number[]): SubBeat[] => {
  const beats = JSON.parse(JSON.stringify(INITIAL_CUSTOM_BEATS)) as SubBeat[]
  indices.forEach(index => {
    beats[index].enabled = true
    beats[index].note = beats[index].isMain ? 'C2' : 'C1'
    beats[index].isRest = false
  })
  return beats
}

// 固定預設考題
const BUILT_IN_PRESETS: Preset[] = [
  {
    id: 'triple-step',
    name: 'Triple Step (×4)',
    beats: createBeatsFromIndices([0, 3, 4, 8, 11, 12, 16, 19, 20, 24, 27, 28])
  },
  {
    id: 'step-step',
    name: 'Step-Step (×4)',
    beats: createBeatsFromIndices([0, 4, 8, 12, 16, 20, 24, 28])
  },
  {
    id: 'step-hold',
    name: 'Step-Hold (×4)',
    beats: createBeatsFromIndices([0, 8, 16, 24])
  },
  {
    id: 'mixed-1',
    name: '混合：Triple + Step',
    beats: createBeatsFromIndices([0, 3, 4, 8, 11, 12, 16, 20, 24, 28])
  }
]

// LocalStorage 鍵值
const CUSTOM_PRESETS_KEY = 'rhythm-trainer-custom-presets'

// --- 節拍練習器組件 ---
function RhythmTrainer() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [bpm, setBpm] = useState(120)
  const [loop, setLoop] = useState(true)
  const [volume, setVolume] = useState(-10) // 音量控制 (dB)
  const [currentBeatIndex, setCurrentBeatIndex] = useState<number | null>(null) // 正在發聲的拍點
  const [currentTimeIndex, setCurrentTimeIndex] = useState<number | null>(null) // 當前時間位置（8拍循環）
  // 自定義模式的狀態 (32 個拍點的扁平陣列)
  const [customBeats, setCustomBeats] = useState<SubBeat[]>(
    JSON.parse(JSON.stringify(INITIAL_CUSTOM_BEATS))
  )

  // 預設管理
  const [customPresets, setCustomPresets] = useState<Preset[]>([])
  const [selectedPresetId, setSelectedPresetId] = useState<string>('')
  const [newPresetName, setNewPresetName] = useState('')
  const [usePickup, setUsePickup] = useState(true) // 是否使用 pickup beat


  const partRef = useRef<Tone.Part | null>(null) // 節奏控制器（聲音）
  const timePartRef = useRef<Tone.Part | null>(null) // 時間追蹤器（視覺）
  const synthRef = useRef<Tone.NoiseSynth | null>(null) // 掌聲合成器
  const filterRef = useRef<Tone.Filter | null>(null) // 掌聲合成器

  // 從 localStorage 載入自定義預設
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_PRESETS_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as Preset[]
        setCustomPresets(parsed)
      }
    } catch (error) {
      console.error('載入自定義預設失敗:', error)
    }
  }, [])

  useEffect(() => {
    // 使用 NoiseSynth 搭配濾波器產生更接近掌聲的音效
    filterRef.current = new Tone.Filter({
      frequency: 1500,
      type: "bandpass",
      Q: 2
    }).toDestination()

    synthRef.current = new Tone.NoiseSynth({
      noise: {
        type: "pink" // 粉紅噪音更接近自然掌聲
      },
      envelope: {
        attack: 0.005,
        decay: 0.08,
        sustain: 0,
        release: 0.08
      }
    }).connect(filterRef.current)

    // Transport 全局時鐘,控制 BPM 和播放/停止。
    // 設定 Swing (搖擺感),數值 0-1,0是直拍,1是完全三連音
    // 0.1 產生適中的搖擺感，讓 tri-ple-step 聽起來更自然
    getTransport().set({
      swing: 0,
      swingSubdivision: "16n" // 設定以十六分音符為基礎做 swing，更適合 triple step
    })

    return () => {
      // 組件卸載時清理
      getTransport().stop()
      getTransport().cancel(0)
      if (partRef.current) {
        partRef.current.dispose()
        partRef.current = null
      }
      if (synthRef.current) {
        synthRef.current.dispose()
        synthRef.current = null
      }
      if (filterRef.current) {
        filterRef.current.dispose()
        filterRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    // 當 BPM 改變時更新
    getTransport().bpm.value = bpm
  }, [bpm])

  useEffect(() => {
    // 當音量改變時更新 synth 的基礎音量
    if (synthRef.current) {
      synthRef.current.volume.value = volume
    }
  }, [volume])

  // 設定 Triple Step 預設節奏
  const setTripleStepPattern = () => {
    if (isPlaying) return // 播放中不允許改變

    const newBeats = JSON.parse(JSON.stringify(INITIAL_CUSTOM_BEATS)) as SubBeat[]

    // Triple Step 節奏：Tri(0) - ple(3) - Step(4)，在 8 拍中重複 4 次
    // ple 在每個奇數拍的第4個十六分音符（距離下一拍 1/4 拍）
    const tripleStepIndices = [
      0, 3, 4,      // 第1-2拍：Tri, ple, Step
      8, 11, 12,    // 第3-4拍：Tri, ple, Step
      16, 19, 20,   // 第5-6拍：Tri, ple, Step
      24, 27, 28    // 第7-8拍：Tri, ple, Step
    ]

    tripleStepIndices.forEach(index => {
      newBeats[index].enabled = true
      newBeats[index].note = newBeats[index].isMain ? 'C2' : 'C1'
      newBeats[index].isRest = false
    })

    setCustomBeats(newBeats)
  }

  // 清除所有節奏
  const clearPattern = () => {
    if (isPlaying) return
    setCustomBeats(JSON.parse(JSON.stringify(INITIAL_CUSTOM_BEATS)))
    setSelectedPresetId('')
    setUsePickup(true) // 重置為預設啟用
  }

  // 載入預設
  const loadPreset = (presetId: string) => {
    if (isPlaying) return

    const allPresets = [...BUILT_IN_PRESETS, ...customPresets]
    const preset = allPresets.find(p => p.id === presetId)

    if (preset) {
      setCustomBeats(JSON.parse(JSON.stringify(preset.beats)))
      setUsePickup(preset.usePickup !== undefined ? preset.usePickup : true)
      setSelectedPresetId(presetId)
    }
  }

  // 儲存當前節奏為新預設
  const saveAsPreset = () => {
    if (!newPresetName.trim()) {
      alert('請輸入預設名稱')
      return
    }

    const newPreset: Preset = {
      id: `custom-${Date.now()}`,
      name: newPresetName.trim(),
      beats: JSON.parse(JSON.stringify(customBeats)),
      usePickup: usePickup,
      isCustom: true
    }

    const updatedPresets = [...customPresets, newPreset]
    setCustomPresets(updatedPresets)

    // 儲存到 localStorage
    try {
      localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(updatedPresets))
      setNewPresetName('')
      setSelectedPresetId(newPreset.id)
      alert(`已儲存預設：${newPreset.name}`)
    } catch (error) {
      console.error('儲存預設失敗:', error)
      alert('儲存失敗，請檢查瀏覽器儲存空間')
    }
  }

  // 刪除自定義預設
  const deletePreset = (presetId: string) => {
    if (!confirm('確定要刪除此預設？')) return

    const updatedPresets = customPresets.filter(p => p.id !== presetId)
    setCustomPresets(updatedPresets)

    try {
      localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(updatedPresets))
      if (selectedPresetId === presetId) {
        setSelectedPresetId('')
      }
    } catch (error) {
      console.error('刪除預設失敗:', error)
    }
  }

  // 建立播放序列（只包含啟用的拍點）
  const buildSequence = () => {
    const events: Array<[string, number]> = []
    // 加入 Pickup Beat (-1) - 只在啟用時
    if (usePickup) {
      events.push(['0:0:2', -1])
    }
    customBeats.forEach((beat, index) => {
      if (beat.enabled) {
        const quarter = Math.floor(index / 4) + 1
        const sixteenth = index % 4
        const timeStr = `0:${quarter}:${sixteenth}`
        events.push([timeStr, index])
      }
    })
    return events
  }

  // 建立完整時間序列（所有拍點，用於顯示時間流動）
  const buildTimeSequence = () => {
    const events: Array<[string, number]> = []
    // 包含所有 32 個拍點
    customBeats.forEach((beat, index) => {
      const quarter = Math.floor(index / 4) + 1
      const sixteenth = index % 4
      const timeStr = `0:${quarter}:${sixteenth}`
      events.push([timeStr, index])
    })
    return events
  }

  const togglePlay = async () => {
    if (!isPlaying) {
      await Tone.start() // 瀏覽器要求必須有互動才能開始聲音
      console.log('Tone.js started, context state:', Tone.context.state)

      const sequence = buildSequence()
      console.log('Built sequence:', sequence)

      // 建立 Tone.Part 用於精確控制每個音符的時間點
      partRef.current = new Tone.Part((time, beatInfo) => {
        // 修正：beatInfo 收到的直接就是我們存入的 value (也就是 beatIndex 數字)，不需要解構
        const beatIndex = beatInfo as number

        // 處理 Pickup Beat
        if (beatIndex === -1) {
          // 主拍 - 較大聲的拍掌 (基礎音量 + 2 dB)
          if (synthRef.current) {
            synthRef.current.volume.setValueAtTime(volume + 2, time)
            synthRef.current.triggerAttackRelease("16n", time)
          }
          Tone.Draw.schedule(() => {
            setCurrentBeatIndex(-1)
          }, time)
          return
        }

        // 取得拍點資訊
        const beat = customBeats[beatIndex]

        if (beat && beat.enabled) {
          // 1. 發出聲音 - 主拍較大聲，子拍較小聲（相對於基礎音量的偏移）
          if (synthRef.current) {
            let volumeOffset = 0
            if (beat.isMain) {
              // 主拍：C2 更大聲 (+4 dB)，其他主拍 (0 dB)
              volumeOffset = beat.note === 'C2' ? 4 : 0
            } else {
              // 子拍較小聲 (-4 dB)
              volumeOffset = -4
            }
            synthRef.current.volume.setValueAtTime(volume + volumeOffset, time)
            synthRef.current.triggerAttackRelease("16n", time)
          }

          // 2. 視覺同步
          Tone.Draw.schedule(() => {
            setCurrentBeatIndex(beatIndex)
          }, time)
        }
      }, sequence).start(0)

      // 設定循環
      if (loop) {
        partRef.current.loop = true
        partRef.current.loopEnd = "0:9:0" // 9 拍 (包含 pickup beat)
      } else {
        partRef.current.loop = false
      }

      // 建立時間追蹤器（顯示所有拍點的時間流動）
      const timeSequence = buildTimeSequence()
      timePartRef.current = new Tone.Part((time, beatInfo) => {
        const beatIndex = beatInfo as number

        // 更新時間位置指示器
        Tone.Draw.schedule(() => {
          setCurrentTimeIndex(beatIndex)
        }, time)
      }, timeSequence).start(0)

      // 設定時間追蹤器的循環
      if (loop) {
        timePartRef.current.loop = true
        timePartRef.current.loopEnd = "0:9:0" // 8 拍 + 1 拍緩衝
      } else {
        timePartRef.current.loop = false
      }

      getTransport().start()
      setIsPlaying(true)
    } else {
      getTransport().stop()
      if (partRef.current) {
        partRef.current.stop()
        partRef.current.dispose()
        partRef.current = null
      }
      if (timePartRef.current) {
        timePartRef.current.stop()
        timePartRef.current.dispose()
        timePartRef.current = null
      }
      setIsPlaying(false)
      setCurrentBeatIndex(null)
      setCurrentTimeIndex(null)
    }
  }

  return (
    <Container size="lg" py="xl">
      <Title order={2} mb="lg">Swing 節拍練習器</Title>
      <Paper shadow="xs" p="md" withBorder>
        <Stack gap="lg">
          {/* 控制區 */}
          <Group justify="space-between" align="flex-start" wrap="wrap">
            <Group gap="lg">
              <Button color={isPlaying ? "red" : "green"} onClick={togglePlay} size="lg">
                {isPlaying ? "停止" : "開始"}
              </Button>
              <Switch
                label="循環"
                checked={loop}
                onChange={(e) => setLoop(e.currentTarget.checked)}
                disabled={isPlaying}
              />
            </Group>
            <Stack gap="md" style={{ flex: 1, minWidth: '250px' }}>
              <Stack gap={0}>
                <Text size="sm">BPM: {bpm}</Text>
                <Slider value={bpm} onChange={setBpm} min={60} max={200} disabled={isPlaying} />
              </Stack>
              <Stack gap={0}>
                <Text size="sm">音量: {volume} dB</Text>
                <Slider
                  value={volume}
                  onChange={setVolume}
                  min={-30}
                  max={0}
                  step={1}
                  marks={[
                    { value: -30, label: '小' },
                    { value: -15, label: '中' },
                    { value: 0, label: '大' }
                  ]}
                />
              </Stack>
            </Stack>
          </Group>
          <Divider />
          {/* 預設管理區 */}
          <Stack gap="md">
            {/* 選擇預設 */}
            <Group justify="space-between" align="flex-end" wrap="wrap">
              <Select
                label="選擇預設考題"
                placeholder="選擇一個預設節奏"
                value={selectedPresetId}
                onChange={(value) => value && loadPreset(value)}
                data={[
                  {
                    group: '內建預設',
                    items: BUILT_IN_PRESETS.map(p => ({ value: p.id, label: p.name }))
                  },
                  ...(customPresets.length > 0 ? [{
                    group: '自定義預設',
                    items: customPresets.map(p => ({ value: p.id, label: p.name }))
                  }] : [])
                ]}
                disabled={isPlaying}
                style={{ flex: 1, minWidth: '200px' }}
                clearable
              />
              <Group gap="xs">
                <Button
                  variant="light"
                  color="gray"
                  onClick={clearPattern}
                  disabled={isPlaying}
                  size="sm"
                >
                  清除
                </Button>
                {selectedPresetId && customPresets.find(p => p.id === selectedPresetId) && (
                  <Button
                    variant="light"
                    color="red"
                    onClick={() => deletePreset(selectedPresetId)}
                    disabled={isPlaying}
                    size="sm"
                  >
                    刪除預設
                  </Button>
                )}
              </Group>
            </Group>

            {/* 儲存為新預設 */}
            <Group justify="space-between" align="flex-end" wrap="wrap">
              <TextInput
                label="儲存當前節奏為預設"
                placeholder="輸入預設名稱"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.currentTarget.value)}
                disabled={isPlaying}
                style={{ flex: 1, minWidth: '200px' }}
              />
              <Button
                variant="filled"
                color="green"
                onClick={saveAsPreset}
                disabled={isPlaying || !newPresetName.trim()}
              >
                儲存
              </Button>
            </Group>
          </Stack>
          {/* 視覺化與編輯區 */}
          <Paper p="md" withBorder bg="gray.0">
            {/* Pickup Beat (可點擊切換) */}
            <Group justify="center" mb="md">
              <div
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: isPlaying ? 'default' : 'pointer' }}
                onClick={() => {
                  if (!isPlaying) {
                    setUsePickup(!usePickup)
                  }
                }}
              >
                <Text size="xs" c="dimmed" mb={4}>Pickup</Text>
                <BeatIndicator
                  isActive={currentBeatIndex === -1}
                  label="a"
                  isMain={false}
                  isRest={!usePickup}
                />
              </div>
            </Group>
            {/* 主要節奏顯示區 - 序列檢視 */}
            <Group gap="xs" justify="center" style={{ maxWidth: '100%' }}>
              {customBeats.map((beat, index) => {
                const isBeatStart = index % 4 === 0
                return (
                  <div key={index} style={{ display: 'flex', alignItems: 'center' }} onClick={() => {
                    if (!isPlaying) {
                      setCustomBeats(prev => {
                        const newBeats = [...prev]
                        const b = { ...newBeats[index] }
                        b.enabled = !b.enabled
                        if (b.enabled) {
                          b.note = b.isMain ? 'C2' : 'C1'
                          b.isRest = false
                        } else {
                          b.note = 'Rest'
                          b.isRest = true
                        }
                        newBeats[index] = b
                        return newBeats
                      })
                    }
                  }}>
                    {index > 0 && index % 8 === 0 && <div style={{ width: 10 }} />}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      {isBeatStart && <Text size="10px" c="dimmed" style={{ marginBottom: 2 }}>{Math.floor(index / 4) + 1}</Text>}
                      <BeatIndicator
                        isActive={currentBeatIndex === index}
                        isTimePlaying={currentTimeIndex === index}
                        label={beat.label}
                        isMain={beat.isMain}
                        isRest={!beat.enabled}
                      />
                    </div>
                  </div>
                )
              })}
            </Group>
          </Paper>
          {/* 底部說明 */}
          <Paper p="xs" bg="blue.0">
            <Text size="xs" ta="center" c="blue.8">
              點擊上方 1-8 拍的任意圓點來編輯節奏
            </Text>
          </Paper>
        </Stack>
      </Paper>
      <Group mt="xl" justify="center">
        <Link to="/">
          <Button variant="subtle">回到首頁</Button>
        </Link>
      </Group>
    </Container>
  )
}

// 視覺指示燈組件 - 支援主拍與子拍的差異顯示
function BeatIndicator({ isActive, isTimePlaying, label, isMain = true, isRest = false }: {
  isActive: boolean,
  isTimePlaying?: boolean,
  label: string,
  isMain?: boolean,
  isRest?: boolean
}) {
  const size = isMain ? '50px' : '35px'
  const fontSize = isMain ? '14px' : '11px'

  // 基礎顏色
  const baseColor = isRest ? '#f8f9fa' : (isMain ? '#dee2e6' : '#e9ecef')

  // 時間流動顏色（淡藍色）
  const timePlayingColor = '#c5dff8' // 淡藍色

  // 發聲時的高亮顏色（鮮艷橙色）
  const soundPlayingColor = '#ff9500'

  // 決定背景顏色：發聲 > 時間流動 > 基礎
  let backgroundColor = baseColor
  if (isTimePlaying && !isActive) {
    backgroundColor = timePlayingColor
  }
  if (isActive) {
    backgroundColor = soundPlayingColor
  }

  // 文字顏色
  const textColor = isActive ? 'white' : (isTimePlaying ? '#1864ab' : (isRest ? '#adb5bd' : (isMain ? '#495057' : '#868e96')))
  const fontWeight = isRest ? 'normal' : (isMain ? 'bold' : 'normal')

  // 邊框
  let border = isMain ? '2px solid #adb5bd' : '1px solid #ced4da'
  if (isRest) border = '2px solid #dee2e6'
  if (isTimePlaying && !isActive) border = '3px solid #74b9ff'
  if (isActive) border = '4px solid #ff6b00'

  // 陰影
  let boxShadow = 'none'
  if (isTimePlaying && !isActive) boxShadow = '0 0 10px rgba(116, 185, 255, 0.5)'
  if (isActive) boxShadow = '0 0 20px rgba(255, 149, 0, 0.8), 0 0 40px rgba(255, 149, 0, 0.4)'

  // 縮放
  let transform = 'scale(1)'
  if (isTimePlaying && !isActive) transform = 'scale(1.15)'
  if (isActive) transform = 'scale(1.4)'

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      backgroundColor,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: textColor,
      fontWeight: fontWeight,
      fontSize: fontSize,
      transition: 'all 0.08s ease-out',
      border,
      boxShadow,
      transform,
      zIndex: isActive ? 10 : (isTimePlaying ? 5 : 1),
      position: 'relative'
    }}>
      {label}
    </div>
  )
}

// --- 原有的組件 ---
function Home() {
  return (
    <>
      <Title>首頁</Title>
      <Text>這是 Mantine 的文字組件</Text>
      <Group mt="md">
        <Link to="/about">
          <Button>前往關於頁面</Button>
        </Link>
        <Link to="/trainer">
          <Button variant="gradient" gradient={{ from: 'indigo', to: 'cyan' }}>
            進入節拍練習器
          </Button>
        </Link>
      </Group>
    </>
  )
}

function About() {
  return (
    <>
      <Title>關於我們</Title>
      <Link to="/">
        <Button variant="outline" mt="md">回到首頁</Button>
      </Link>
    </>
  )
}

function App() {
  return (
    <Container p="xl">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/trainer" element={<RhythmTrainer />} />
      </Routes>
    </Container>
  )
}

export default App