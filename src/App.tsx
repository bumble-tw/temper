// src/App.tsx
import { useState, useEffect, useRef } from 'react'
import { Button, Container, Title, Text, Group, Paper, Grid, Slider, Badge, Stack } from '@mantine/core'
import { Routes, Route, Link } from 'react-router-dom'
import * as Tone from 'tone'

// --- 節拍練習器組件 ---
function RhythmTrainer() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [bpm, setBpm] = useState(120)
  // 用來追蹤目前走到第幾拍 (0-7)，用於視覺顯示
  const [currentBeat, setCurrentBeat] = useState<number | null>(null)

  // 定義 4 個小組，每個小組 2 拍，這裡可以擴充你的 "Triple Step", "Step Step" 邏輯
  // 這裡僅示範結構，未來你可以把每個小組變成可選單
  const groups = [1, 2, 3, 4]

  // 用 ref 存儲 Loop 物件，避免重渲染時遺失
  const loopRef = useRef<Tone.Sequence | null>(null)
  const synthRef = useRef<Tone.MembraneSynth | null>(null)

  useEffect(() => {
    // 初始化合成器 (發出聲音的東西)
    synthRef.current = new Tone.MembraneSynth().toDestination()

    // 設定 Swing (搖擺感)，數值 0-1，0是直拍，1是完全三連音
    Tone.Transport.swing = 0.2
    Tone.Transport.swingSubdivision = "8n" // 設定以八分音符為基礎做 swing

    return () => {
      // 組件卸載時清理
      Tone.Transport.stop()
      Tone.Transport.cancel()
      if (loopRef.current) loopRef.current.dispose()
    }
  }, [])

  useEffect(() => {
    // 當 BPM 改變時更新
    Tone.Transport.bpm.value = bpm
  }, [bpm])

  const togglePlay = async () => {
    if (!isPlaying) {
      await Tone.start() // 瀏覽器要求必須有互動才能開始聲音

      // 定義一個 8 拍的序列 (0 到 7)
      const beats = [0, 1, 2, 3, 4, 5, 6, 7]

      // 建立序列：每 4 分音符觸發一次
      loopRef.current = new Tone.Sequence((time, beatIndex) => {
        // 1. 發出聲音
        // 第一拍(0)重音，其他輕音
        const note = beatIndex % 8 === 0 ? "C2" : "C1"
        synthRef.current?.triggerAttackRelease(note, "8n", time)

        // 2. 處理視覺同步 (使用 Tone.Draw 確保動畫不延遲)
        Tone.Draw.schedule(() => {
          setCurrentBeat(beatIndex)
        }, time)

      }, beats, "4n").start(0)

      Tone.Transport.start()
      setIsPlaying(true)
    } else {
      Tone.Transport.stop()
      if (loopRef.current) {
        loopRef.current.stop()
        loopRef.current.dispose() // 清除舊的 loop 以免疊加
      }
      setIsPlaying(false)
      setCurrentBeat(null)
    }
  }

  return (
    <Container size="sm" py="xl">
      <Title order={2} mb="lg">Swing 節拍練習器</Title>

      <Paper shadow="xs" p="md" withBorder>
        <Stack gap="lg">
          {/* 控制區 */}
          <Group justify="space-between">
            <Button
              color={isPlaying ? "red" : "green"}
              onClick={togglePlay}
              size="lg"
            >
              {isPlaying ? "停止 (Stop)" : "開始 (Start)"}
            </Button>
            <Stack gap={0} style={{ flex: 1, maxWidth: '300px' }}>
              <Text size="sm">BPM: {bpm}</Text>
              <Slider
                value={bpm}
                onChange={setBpm}
                min={60}
                max={200}
                disabled={isPlaying} // 建議播放時鎖定，或需處理即時變更邏輯
              />
            </Stack>
          </Group>

          {/* 視覺化顯示區：8拍，每2拍一組 */}
          <Grid>
            {groups.map((group, groupIndex) => (
              <Grid.Col span={3} key={groupIndex}>
                <Paper
                  p="sm"
                  withBorder
                  bg="gray.1"
                  style={{ textAlign: 'center' }}
                >
                  <Text fw={700} mb="xs">Group {group}</Text>
                  <Group justify="center" gap="xs">
                    {/* 每一組裡的第 1 拍 */}
                    <BeatIndicator
                      isActive={currentBeat === groupIndex * 2}
                      label={`${groupIndex * 2 + 1}`}
                    />
                    {/* 每一組裡的第 2 拍 */}
                    <BeatIndicator
                      isActive={currentBeat === groupIndex * 2 + 1}
                      label={`${groupIndex * 2 + 2}`}
                    />
                  </Group>
                  <Badge mt="sm" variant="dot" color="blue">
                    Triple Step
                    {/* 這裡未來可以用狀態控制顯示 Step Step 或 Triple Step */}
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

// 簡單的視覺指示燈組件
function BeatIndicator({ isActive, label }: { isActive: boolean, label: string }) {
  return (
    <div style={{
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      backgroundColor: isActive ? '#228be6' : '#dee2e6', // Mantine blue vs gray
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: isActive ? 'white' : 'black',
      fontWeight: 'bold',
      transition: 'background-color 0.1s ease'
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