// src/App.tsx
import { useState, useEffect, useRef } from 'react'
import { Button, Container, Title, Text, Group, Paper, Stack, Select, Switch, SegmentedControl, Divider, Slider } from '@mantine/core'
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

type PatternType = 'step-step' | 'triple-step' | 'step-hold'

type Pattern = {
  id: PatternType
  name: string
  duration: string // 此模式佔用的總長度 (e.g., "2n" = 2拍)
  subBeats: SubBeat[] // 此模式包含的所有拍點
}

// 定義節奏模式
const PATTERNS: Record<PatternType, Pattern> = {
  'step-step': {
    id: 'step-step',
    name: 'Step Step',
    duration: '2n', // 2拍 (兩個四分音符)
    subBeats: [
      { time: '0:0:0', note: 'C2', label: '1', isMain: true },
      { time: '0:1:0', note: 'C1', label: '2', isMain: true }
    ]
  },
  'step-hold': {
    id: 'step-hold',
    name: 'Step Hold',
    duration: '2n', // 2拍 (兩個四分音符)
    subBeats: [
      { time: '0:0:0', note: 'C2', label: '1', isMain: true },
      { time: '0:1:0', note: 'C1', label: '2', isRest: true }
    ]
  },
  'triple-step': {
    id: 'triple-step',
    name: 'Triple Step',
    duration: '2n', // 2拍
    subBeats: [
      { time: '0:0:0', note: 'C2', label: 'Tri', isMain: true },
      { time: '0:0:2', note: 'C1', label: 'ple', isMain: false }, // 八分音符的後半拍
      { time: '0:1:0', note: 'C1', label: 'Step', isMain: true }
    ]
  }
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
  const [currentBeatIndex, setCurrentBeatIndex] = useState<number | null>(null)

  // 狀態 1: 是否開啟自定義點擊模式 (vs 下拉選單模式)
  const [isCustomMode, setIsCustomMode] = useState(false)
  // 狀態 2: 自定義模式下的檢視方式 (分組 vs 序列)
  const [viewMode, setViewMode] = useState<'grouped' | 'sequence'>('grouped')
  // 下拉選單模式的狀態
  const [groupPatterns, setGroupPatterns] = useState<PatternType[]>([
    'triple-step', 'triple-step', 'triple-step', 'triple-step'
  ])
  // 自定義模式的狀態 (統一為 32 個拍點的扁平陣列)
  const [customBeats, setCustomBeats] = useState<SubBeat[]>(
    JSON.parse(JSON.stringify(INITIAL_CUSTOM_BEATS))
  )

  const partRef = useRef<Tone.Part | null>(null)
  const synthRef = useRef<Tone.NoiseSynth | null>(null)
  const filterRef = useRef<Tone.Filter | null>(null)

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
    getTransport().set({
      swing: 0.2,
      swingSubdivision: "8n" // 設定以八分音符為基礎做 swing
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

  // 建立播放序列
  const buildSequence = () => {
    const events: Array<[string, number]> = []
    // 加入 Pickup Beat (-1)
    events.push(['0:0:2', -1])
    if (isCustomMode) {
      customBeats.forEach((beat, index) => {
        if (beat.enabled) {
          const quarter = Math.floor(index / 4) + 1
          const sixteenth = index % 4
          const timeStr = `0:${quarter}:${sixteenth}`
          events.push([timeStr, index])
        }
      })
    } else {
      groupPatterns.forEach((patternType, groupIndex) => {
        const pattern = PATTERNS[patternType]
        const measureOffset = groupIndex * 2
        pattern.subBeats.forEach((subBeat) => {
          const [bar, quarter, eighth] = subBeat.time.split(':').map(Number)
          const totalQuarters = bar * 4 + quarter + measureOffset + 1
          const timeStr = `0:${totalQuarters}:${eighth}`
          const absoluteIndex = (groupIndex * 8) + (quarter * 4) + eighth
          events.push([timeStr, absoluteIndex])
        })
      })
    }
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
          // 主拍 - 較大聲的拍掌
          if (synthRef.current) {
            synthRef.current.volume.setValueAtTime(-8, time)
            synthRef.current.triggerAttackRelease("16n", time)
          }
          Tone.Draw.schedule(() => {
            setCurrentBeatIndex(-1)
          }, time)
          return
        }

        // 計算實際的拍點資訊
        let currentEventIndex = 0
        let groupIndex = -1
        let subBeatIndex = -1

        // 跳過 pickup beat
        for (let i = 1; i < sequence.length; i++) {
          if (sequence[i][1] === beatIndex) {
            currentEventIndex = i - 1 // 減去 pickup beat
            break
          }
        }

        // 計算屬於哪個 group 和 sub-beat
        let accumulator = 0
        for (let g = 0; g < groupPatterns.length; g++) {
          const pattern = PATTERNS[groupPatterns[g]]
          if (currentEventIndex < accumulator + pattern.subBeats.length) {
            groupIndex = g
            subBeatIndex = currentEventIndex - accumulator
            break
          }
          accumulator += pattern.subBeats.length
        }

        if (groupIndex >= 0 && subBeatIndex >= 0) {
          const pattern = PATTERNS[groupPatterns[groupIndex]]
          const subBeat = pattern.subBeats[subBeatIndex]

          if (!subBeat.isRest) {
            // 1. 發出聲音 - 主拍較大聲，子拍較小聲
            if (synthRef.current) {
              if (subBeat.isMain) {
                // 第一拍更大聲、更清脆
                synthRef.current.volume.setValueAtTime(subBeat.note === 'C2' ? -6 : -10, time)
              } else {
                // 子拍較小聲、較柔和
                synthRef.current.volume.setValueAtTime(-14, time)
              }
              synthRef.current.triggerAttackRelease("16n", time)
            }
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
        partRef.current.loopEnd = "9:0:0" // 9 拍 (包含 pickup beat)
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
            <Stack gap={0} style={{ flex: 1, minWidth: '250px' }}>
              <Text size="sm">BPM: {bpm}</Text>
              <Slider value={bpm} onChange={setBpm} min={60} max={200} disabled={isPlaying} />
            </Stack>
          </Group>
          <Divider />
          {/* 模式控制區：切換 Pattern/Custom 以及 Custom 下的 View Mode */}
          <Group justify="space-between" align="center">
            <Switch
              label={<Text fw={700}>啟用自定義編輯 (Custom Mode)</Text>}
              checked={isCustomMode}
              onChange={(e) => setIsCustomMode(e.currentTarget.checked)}
              disabled={isPlaying}
              size="md"
            />
            {isCustomMode && (
              <SegmentedControl
                value={viewMode}
                onChange={(value) => setViewMode(value as 'grouped' | 'sequence')}
                data={[
                  { label: '分組檢視 (Groups)', value: 'grouped' },
                  { label: '序列檢視 (Sequence)', value: 'sequence' },
                ]}
                disabled={isPlaying}
              />
            )}
          </Group>
          {/* 視覺化與編輯區 */}
          <Paper p="md" withBorder bg="gray.0">
            {/* Pickup Beat (永遠顯示) */}
            <Group justify="center" mb="md">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Text size="xs" c="dimmed" mb={4}>Pickup</Text>
                <BeatIndicator isActive={currentBeatIndex === -1} label="a" isMain={false} />
              </div>
            </Group>
            {/* 主要節奏顯示區 - 根據模式條件渲染 */}
            {isCustomMode && viewMode === 'sequence' ? (
              <Group gap="xs" justify="center" style={{ maxWidth: '100%' }}>
                {customBeats.map((beat, index) => {
                  // (移除未用 isMeasureStart)
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
            ) : (
              <Group gap="xl" justify="center" wrap="wrap">
                {[0, 1, 2, 3].map((groupIndex) => {
                  let currentGroupBeats: SubBeat[] = []
                  let startIndex = 0
                  if (isCustomMode) {
                    startIndex = groupIndex * 8
                    currentGroupBeats = customBeats.slice(startIndex, startIndex + 8)
                  } else {
                    currentGroupBeats = PATTERNS[groupPatterns[groupIndex]].subBeats
                  }
                  return (
                    <Stack key={groupIndex} align="center" gap="xs">
                      <Text size="sm" fw={600} c="dimmed">Group {groupIndex + 1}</Text>
                      <Group gap={4}>
                        {currentGroupBeats.map((beat, subIndex) => {
                          const realIndex = isCustomMode ? startIndex + subIndex : -999
                          const isActive = isCustomMode
                            ? currentBeatIndex === realIndex
                            : currentBeatIndex === (groupIndex * 8) + (parseInt(beat.time.split(':')[1]) * 4) + parseInt(beat.time.split(':')[2])
                          return (
                            <div key={subIndex} onClick={isCustomMode ? () => {
                              if (!isPlaying) {
                                setCustomBeats(prev => {
                                  const newBeats = [...prev]
                                  const b = { ...newBeats[realIndex] }
                                  b.enabled = !b.enabled
                                  if (b.enabled) {
                                    b.note = b.isMain ? 'C2' : 'C1'
                                    b.isRest = false
                                  } else {
                                    b.note = 'Rest'
                                    b.isRest = true
                                  }
                                  newBeats[realIndex] = b
                                  return newBeats
                                })
                              }
                            } : undefined} style={{ display: 'inline-block' }}>
                              <BeatIndicator
                                isActive={isActive}
                                label={beat.label}
                                isMain={beat.isMain}
                                isRest={isCustomMode ? !beat.enabled : beat.isRest}
                              />
                            </div>
                          )
                        })}
                      </Group>
                      {!isCustomMode && (
                        <Select
                          size="xs"
                          value={groupPatterns[groupIndex]}
                          onChange={(val) => {
                            const newP = [...groupPatterns]
                            newP[groupIndex] = val as PatternType
                            setGroupPatterns(newP)
                          }}
                          data={[
                            { value: 'step-step', label: 'Step Step' },
                            { value: 'triple-step', label: 'Triple Step' },
                            { value: 'step-hold', label: 'Step Hold' }
                          ]}
                          disabled={isPlaying}
                        />
                      )}
                    </Stack>
                  )
                })}
              </Group>
            )}
          </Paper>
          {/* 底部說明 */}
          <Paper p="xs" bg="blue.0">
            <Text size="xs" ta="center" c="blue.8">
              {isCustomMode
                ? (viewMode === 'sequence' ? "點擊上方 1-8 拍的任意圓點來編輯節奏" : "點擊各群組內的圓點來編輯節奏")
                : "選擇下拉選單來組合標準 Swing 節奏"}
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