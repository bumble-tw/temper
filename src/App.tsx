// src/App.tsx
import { useState, useEffect, useRef } from 'react'
import { Button, Container, Title, Text, Group, Paper, Grid, Slider, Badge, Stack, Select, Switch } from '@mantine/core'
import { Routes, Route, Link } from 'react-router-dom'
import * as Tone from 'tone'
import { getTransport } from 'tone'

// --- 節奏模式資料結構 ---
type SubBeat = {
  time: string // Tone.js time notation (e.g., "0:0:0", "0:0:2") 0 小節, 第 0 拍, 第 0 個十六分音符
  note: string // 音符高度 (e.g. 空拍時可為'None'或 'Rest')
  label: string // 視覺標籤 (e.g., "1", "ple", "2")
  isMain?: boolean // 是否為主拍
  isRest?: boolean // 是否為空拍
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

// --- 節拍練習器組件 ---
function RhythmTrainer() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [bpm, setBpm] = useState(120)
  const [loop, setLoop] = useState(true) // 循環播放開關
  const [currentBeatIndex, setCurrentBeatIndex] = useState<number | null>(null)

  // 4個小組，每個小組可選擇不同的模式
  const [groupPatterns, setGroupPatterns] = useState<PatternType[]>([
    'triple-step',
    'triple-step',
    'triple-step',
    'triple-step'
  ])

  // 用 ref 存儲 Tone.js 物件
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

  // 建立完整的節奏序列 (包含 Pickup Beat)
  const buildSequence = () => {
    const events: Array<[string, number]> = []

    // 加入 Pickup Beat (預備拍 'a') - 在第一拍之前的半拍
    events.push(['0:0:2', -1]) // -1 代表 pickup beat，時間是 0 小節 0 拍的第 2 個八分音符

    // 為每個小組建立拍點
    groupPatterns.forEach((patternType, groupIndex) => {
      const pattern = PATTERNS[patternType]
      const measureOffset = groupIndex * 2 // 每組佔2拍，groupIndex 0->0拍, 1->2拍, 2->4拍, 3->6拍

      pattern.subBeats.forEach((subBeat) => {
        // 解析相對時間並加上小組偏移
        const [bar, quarter, eighth] = subBeat.time.split(':').map(Number)
        const totalQuarters = bar * 4 + quarter + measureOffset + 1 // +1 讓所有拍點往後移一拍，為 pickup beat 留空間
        const timeStr = `0:${totalQuarters}:${eighth}`

        // 記錄時間與拍點索引
        const beatIndex = events.length
        events.push([timeStr, beatIndex])
      })
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

          if(!subBeat.isRest) {          
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
              <Button
                color={isPlaying ? "red" : "green"}
                onClick={togglePlay}
                size="lg"
              >
                {isPlaying ? "停止 (Stop)" : "開始 (Start)"}
              </Button>
              <Switch
                label="循環播放"
                checked={loop}
                onChange={(event) => setLoop(event.currentTarget.checked)}
                disabled={isPlaying}
              />
            </Group>
            <Stack gap={0} style={{ flex: 1, minWidth: '250px', maxWidth: '300px' }}>
              <Text size="sm">BPM: {bpm}</Text>
              <Slider
                value={bpm}
                onChange={setBpm}
                min={60}
                max={200}
                disabled={isPlaying}
              />
            </Stack>
          </Group>

          {/* Pickup Beat 顯示區 */}
          <Paper p="sm" withBorder bg="yellow.1">
            <Text size="xs" c="dimmed" mb="xs" ta="center">Pickup Beat</Text>

            <Group gap="md" justify="center" wrap="nowrap">
              {/* Pickup beat 'a' */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <BeatIndicator
                  isActive={currentBeatIndex === -1}
                  label="a"
                  isMain={false}
                />
              </div>

              {/* 視覺化顯示區：4個小組，每組可選擇模式 */}
              {groupPatterns.map((patternType, groupIndex) => {
                const pattern = PATTERNS[patternType]

                // 計算此 group 的拍點在整體序列中的索引範圍
                let startBeatIndex = 1 // 跳過 pickup beat (index 0)
                for (let i = 0; i < groupIndex; i++) {
                  startBeatIndex += PATTERNS[groupPatterns[i]].subBeats.length
                }

                return (
                  <div key={groupIndex} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Text size="xs" fw={500} mb="xs">Group {groupIndex + 1}</Text>
                    <Group gap="xs" wrap="nowrap">
                      {pattern.subBeats.map((subBeat, subIndex) => {
                        const beatIndex = startBeatIndex + subIndex
                        return (
                          <BeatIndicator
                            key={subIndex}
                            isActive={currentBeatIndex === beatIndex}
                            label={subBeat.label}
                            isMain={subBeat.isMain}
                            isRest={subBeat.isRest}
                          />
                        )
                      })}
                    </Group>
                  </div>
                )
              })}
            </Group>
          </Paper>

          {/* 模式選擇區 */}
          <Grid gutter="md">
            {groupPatterns.map((patternType, groupIndex) => (
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }} key={groupIndex}>
                <Paper p="sm" withBorder bg="gray.0">
                  <Text size="sm" fw={600} mb="xs" ta="center">Group {groupIndex + 1}</Text>
                  <Select
                    value={patternType}
                    onChange={(value) => {
                      const newPatterns = [...groupPatterns]
                      newPatterns[groupIndex] = value as PatternType
                      setGroupPatterns(newPatterns)
                    }}
                    data={[
                      { value: 'step-step', label: 'Step Step' },
                      { value: 'triple-step', label: 'Triple Step' },
                      { value: 'step-hold', label: 'Step Hold'}
                    ]}
                    disabled={isPlaying}
                  />
                  <Badge
                    mt="sm"
                    variant="light"
                    color={patternType === 'triple-step' ? 'blue' : 'green'}
                    fullWidth
                  >
                    {PATTERNS[patternType].name}
                  </Badge>
                </Paper>
              </Grid.Col>
            ))}
          </Grid>
        </Stack>
      </Paper>

      <Link to="/">
        <Button variant="subtle" mt="xl">回到首頁</Button>
      </Link>
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
  const fontWeight = isRest ? 'normal' : (isMain ? 'bold' : 'normal');

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