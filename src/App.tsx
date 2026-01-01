// src/App.tsx
import { useState, useEffect, useRef } from 'react'
import { Button, Container, Title, Text, Group, Paper, Stack, Switch, Divider, Slider } from '@mantine/core'
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

// --- 節拍練習器組件 ---
function RhythmTrainer() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [bpm, setBpm] = useState(120)
  const [loop, setLoop] = useState(true)
  const [volume, setVolume] = useState(-10) // 音量控制 (dB)
  const [currentBeatIndex, setCurrentBeatIndex] = useState<number | null>(null)
  // 自定義模式的狀態 (32 個拍點的扁平陣列)
  const [customBeats, setCustomBeats] = useState<SubBeat[]>(
    JSON.parse(JSON.stringify(INITIAL_CUSTOM_BEATS))
  )

  const partRef = useRef<Tone.Part | null>(null) // 節奏控制器
  const synthRef = useRef<Tone.NoiseSynth | null>(null) // 掌聲合成器
  const filterRef = useRef<Tone.Filter | null>(null) // 掌聲合成器

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
      swing: 0.09,
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

  // 建立播放序列
  const buildSequence = () => {
    const events: Array<[string, number]> = []
    // 加入 Pickup Beat (-1)
    events.push(['0:0:2', -1])
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

      getTransport().start()
      setIsPlaying(true)
    } else {
      getTransport().stop()
      if (partRef.current) {
        partRef.current.stop()
        partRef.current.dispose()
        partRef.current = null
      }
      setIsPlaying(false)
      setCurrentBeatIndex(null)
    }
  }

  return (
    <Container size="lg" py="xl">
      <Title order={2} mb="lg">Swing 節拍練習器</Title>
      <Paper shadow="xs" p="md" withBorder>
        <Stack gap="lg">
          {/* 控制區 */}
          <Group justify="space-between" align="flex-start" wrap="wrap">
            <Group>
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
          {/* 視覺化與編輯區 */}
          <Paper p="md" withBorder bg="gray.0">
            {/* Pickup Beat (永遠顯示) */}
            <Group justify="center" mb="md">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Text size="xs" c="dimmed" mb={4}>Pickup</Text>
                <BeatIndicator isActive={currentBeatIndex === -1} label="a" isMain={false} />
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
function BeatIndicator({ isActive, label, isMain = true, isRest = false }: { isActive: boolean, label: string, isMain?: boolean, isRest?: boolean }) {
  const size = isMain ? '50px' : '35px'
  const fontSize = isMain ? '14px' : '11px'

  const baseColor = isRest ? '#f8f9fa' : (isMain ? '#dee2e6' : '#e9ecef') // 空拍用超淺色
  const activeColor = isRest ? '#fa5252' : (isMain ? '#228be6' : '#4dabf7') // 空拍被點亮時特殊色

  const textColor = isActive ? 'white' : (isRest ? '#adb5bd' : (isMain ? '#495057' : '#868e96'))
  const fontWeight = isRest ? 'normal' : (isMain ? 'bold' : 'normal')

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      backgroundColor: isActive ? activeColor : baseColor,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: textColor,
      fontWeight: fontWeight,
      fontSize: fontSize,
      transition: 'all 0.1s ease',
      border: isActive ? '3px solid #1864ab' : (isMain ? '2px solid #adb5bd' : '1px solid #ced4da'),
      boxShadow: isActive ? '0 0 10px rgba(34, 139, 230, 0.5)' : 'none',
      transform: isActive ? 'scale(1.1)' : 'scale(1)'
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