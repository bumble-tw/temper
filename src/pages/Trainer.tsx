// src/pages/Trainer.tsx
// 節拍練習器主頁面

import { useState, useEffect, useRef } from 'react'
import { Container, Title, Paper, Stack, Divider, Group, Button, Modal, Center } from '@mantine/core'
import { Link } from 'react-router-dom'
import * as Tone from 'tone'
import { getTransport } from 'tone'

// 類型導入
import type { SubBeat, Preset } from '../types/rhythm'
import type { QuizPhase, QuizEvaluation, QuizRecord } from '../types/quiz'

// 常量導入
import { INITIAL_CUSTOM_BEATS, BUILT_IN_PRESETS, CUSTOM_PRESETS_KEY } from '../constants/beats'
import type { SoundType } from '../constants/soundTypes'

// 工具函數導入
import { generateEasyQuestion, generateMediumQuestion, generateHardQuestion, generateHellQuestion } from '../utils/beatGeneration'
import { buildSequence, buildTimeSequence } from '../utils/sequenceBuilder'
import { initMicrophone, startClapDetection, stopClapDetection, getBeatIndexFromTime, cleanupMicrophone, type MicrophoneSetup } from '../utils/audioDetection'
import { evaluateQuiz } from '../utils/quizEvaluation'
import { loadQuizHistory, saveQuizRecord } from '../utils/quizStorage'

// 組件導入
import { ControlPanel } from '../components/ControlPanel'
import { QuizStatusPanel } from '../components/QuizStatusPanel'
import { PresetManager } from '../components/PresetManager'
import { BeatEditor } from '../components/BeatEditor'
import { RandomQuestionGenerator } from '../components/RandomQuestionGenerator'

export function Trainer() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [bpm, setBpm] = useState(120)
  const [loop, setLoop] = useState(true)
  const [currentBeatIndex, setCurrentBeatIndex] = useState<number | null>(null)
  const [currentTimeIndex, setCurrentTimeIndex] = useState<number | null>(null)

  // 固定音量值
  const volume = -10

  // 時間流動顯示控制
  const [showTimePositions, setShowTimePositions] = useState([false, false, false, false])

  // 新增功能開關
  const [enableCountdown, setEnableCountdown] = useState(true) // 倒數模式開關
  const [soundType, setSoundType] = useState<SoundType>('clap') // 音效類型

  // 自定義模式的狀態
  const [customBeats, setCustomBeats] = useState<SubBeat[]>(
    JSON.parse(JSON.stringify(INITIAL_CUSTOM_BEATS))
  )

  // 預設管理
  const [customPresets, setCustomPresets] = useState<Preset[]>([])
  const [selectedPresetId, setSelectedPresetId] = useState<string>('')
  const [newPresetName, setNewPresetName] = useState('')
  const [showManagePresets, setShowManagePresets] = useState(false)

  // 測驗模式相關狀態
  const [isQuizMode, setIsQuizMode] = useState(false)
  const [quizPhase, setQuizPhase] = useState<QuizPhase>('idle')
  const [recordedClaps, setRecordedClaps] = useState<number[]>([])
  const [quizResult, setQuizResult] = useState<QuizEvaluation | null>(null)
  const [_quizHistory, setQuizHistory] = useState<QuizRecord[]>([])
  const [countdown, setCountdown] = useState<number | null>(null)

  // Refs
  const partRef = useRef<Tone.Part | null>(null)
  const timePartRef = useRef<Tone.Part | null>(null)
  const synthRef = useRef<Tone.NoiseSynth | null>(null)
  const filterRef = useRef<Tone.Filter | null>(null)
  const countdownSynthRef = useRef<Tone.Synth | null>(null)
  const micSetupRef = useRef<MicrophoneSetup | null>(null)
  const recordingStartTimeRef = useRef<number>(0)
  const lastClapTimeRef = useRef<number>(0)

  // 切換時間流動顯示位置
  const toggleTimePosition = (index: number) => {
    const newPositions = [...showTimePositions]
    newPositions[index] = !newPositions[index]
    setShowTimePositions(newPositions)
  }

  // 創建音效合成器的工廠函數
  const createSoundSynth = (type: SoundType): Tone.Synth | Tone.NoiseSynth | Tone.MetalSynth | Tone.MembraneSynth => {
    switch (type) {
      case 'clap':
        // 掌聲 - 使用粉紅噪音 + 濾波器
        return new Tone.NoiseSynth({
          noise: { type: "pink" },
          envelope: { attack: 0.005, decay: 0.08, sustain: 0, release: 0.08 }
        }).connect(filterRef.current!)

      case 'meow':
        // 貓咪聲 - 使用三角波模擬
        return new Tone.Synth({
          oscillator: { type: "triangle" },
          envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.1 }
        }).toDestination()

      case 'woodblock':
        // 木魚 - 使用金屬音
        return new Tone.MetalSynth({
          envelope: { attack: 0.001, decay: 0.1, release: 0.05 },
          harmonicity: 5.1,
          modulationIndex: 32,
          resonance: 4000,
          octaves: 1.5
        }).toDestination()

      case 'kick':
        // 踢鼓 - 使用膜音合成器
        return new Tone.MembraneSynth({
          pitchDecay: 0.05,
          octaves: 4,
          oscillator: { type: "sine" },
          envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 0.4 }
        }).toDestination()

      case 'snare':
        // 小鼓 - 使用噪音 + 短衰減
        return new Tone.NoiseSynth({
          noise: { type: "white" },
          envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 }
        }).toDestination()

      case 'hihat':
        // 鈸 - 使用金屬音高頻
        return new Tone.MetalSynth({
          envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
          harmonicity: 5.1,
          modulationIndex: 64,
          resonance: 6000,
          octaves: 1.5
        }).toDestination()

      case 'cowbell':
        // 響板 - 使用方波
        return new Tone.Synth({
          oscillator: { type: "square" },
          envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 }
        }).toDestination()

      case 'tom':
        // 鼓 - 使用膜音 (較高音)
        return new Tone.MembraneSynth({
          pitchDecay: 0.08,
          octaves: 2,
          oscillator: { type: "sine" },
          envelope: { attack: 0.001, decay: 0.5, sustain: 0, release: 0.2 }
        }).toDestination()

      default:
        return new Tone.NoiseSynth({
          noise: { type: "pink" },
          envelope: { attack: 0.005, decay: 0.08, sustain: 0, release: 0.08 }
        }).connect(filterRef.current!)
    }
  }

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

  // 載入測驗歷史
  useEffect(() => {
    try {
      const storage = loadQuizHistory()
      setQuizHistory(storage.records)
    } catch (error) {
      console.error('載入測驗歷史失敗:', error)
    }
  }, [])

  // 初始化音頻引擎
  useEffect(() => {
    filterRef.current = new Tone.Filter({
      frequency: 1500,
      type: "bandpass",
      Q: 2
    }).toDestination()

    synthRef.current = createSoundSynth(soundType) as any

    countdownSynthRef.current = new Tone.Synth({
      oscillator: {
        type: "sine"
      },
      envelope: {
        attack: 0.005,
        decay: 0.1,
        sustain: 0,
        release: 0.1
      },
      volume: volume // 設置為與拍子相同的音量
    }).toDestination()

    getTransport().set({
      swing: 0,
      swingSubdivision: "16n"
    })

    return () => {
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
      if (countdownSynthRef.current) {
        countdownSynthRef.current.dispose()
        countdownSynthRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    getTransport().bpm.value = bpm
  }, [bpm])

  // 設置固定音量
  useEffect(() => {
    if (synthRef.current) {
      synthRef.current.volume.value = volume
    }
    if (countdownSynthRef.current) {
      countdownSynthRef.current.volume.value = volume
    }
  }, [])

  // 當音效類型改變時重新創建合成器
  useEffect(() => {
    if (synthRef.current) {
      synthRef.current.dispose()
    }
    synthRef.current = createSoundSynth(soundType) as any
    if (synthRef.current) {
      synthRef.current.volume.value = volume
    }
  }, [soundType])

  // 清除所有節奏
  const clearPattern = () => {
    if (isPlaying) return
    if (isQuizMode && quizPhase === 'result') {
      setQuizPhase('idle')
      setQuizResult(null)
    }
    setCustomBeats(JSON.parse(JSON.stringify(INITIAL_CUSTOM_BEATS)))
    setSelectedPresetId('')
  }

  // 載入預設
  const loadPreset = (presetId: string) => {
    if (isPlaying) return
    if (isQuizMode && quizPhase === 'result') {
      setQuizPhase('idle')
      setQuizResult(null)
    }

    const allPresets = [...BUILT_IN_PRESETS, ...customPresets]
    const preset = allPresets.find(p => p.id === presetId)

    if (preset) {
      setCustomBeats(JSON.parse(JSON.stringify(preset.beats)))
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
      isCustom: true
    }

    const updatedPresets = [...customPresets, newPreset]
    setCustomPresets(updatedPresets)

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

  // 生成隨機考題（使用工具函數）
  const handleGenerateEasyQuestion = () => {
    if (isPlaying) return
    if (isQuizMode && quizPhase === 'result') {
      setQuizPhase('idle')
      setQuizResult(null)
    }
    setCustomBeats(generateEasyQuestion(INITIAL_CUSTOM_BEATS))
    setSelectedPresetId('')
  }

  const handleGenerateMediumQuestion = () => {
    if (isPlaying) return
    if (isQuizMode && quizPhase === 'result') {
      setQuizPhase('idle')
      setQuizResult(null)
    }
    setCustomBeats(generateMediumQuestion(INITIAL_CUSTOM_BEATS))
    setSelectedPresetId('')
  }

  const handleGenerateHardQuestion = () => {
    if (isPlaying) return
    if (isQuizMode && quizPhase === 'result') {
      setQuizPhase('idle')
      setQuizResult(null)
    }
    setCustomBeats(generateHardQuestion(INITIAL_CUSTOM_BEATS))
    setSelectedPresetId('')
  }

  const handleGenerateHellQuestion = () => {
    if (isPlaying) return
    if (isQuizMode && quizPhase === 'result') {
      setQuizPhase('idle')
      setQuizResult(null)
    }
    setCustomBeats(generateHellQuestion(INITIAL_CUSTOM_BEATS))
    setSelectedPresetId('')
  }

  // 倒數函數
  const performCountdown = async () => {
    await Tone.start()

    setCountdown(3)
    if (countdownSynthRef.current) {
      countdownSynthRef.current.triggerAttackRelease('C5', '0.1')
    }
    await new Promise(resolve => setTimeout(resolve, 1000))

    setCountdown(2)
    if (countdownSynthRef.current) {
      countdownSynthRef.current.triggerAttackRelease('C5', '0.1')
    }
    await new Promise(resolve => setTimeout(resolve, 1000))

    setCountdown(1)
    if (countdownSynthRef.current) {
      countdownSynthRef.current.triggerAttackRelease('C6', '0.1')
    }
    await new Promise(resolve => setTimeout(resolve, 1000))

    setCountdown(null)
  }

  // 測驗模式函數
  const startQuizWithCountdown = async () => {
    await performCountdown()
    await startQuiz()
  }

  const startQuiz = async () => {
    try {
      await Tone.start()
      console.log('測驗模式啟動')

      micSetupRef.current = await initMicrophone()
      console.log('麥克風初始化成功')

      setRecordedClaps([])
      setQuizResult(null)
      lastClapTimeRef.current = 0

      const playSequence = buildSequence(customBeats)
      const timeSequence = buildTimeSequence(customBeats)

      partRef.current = new Tone.Part((time, beatInfo) => {
        const beatIndex = beatInfo as number
        const beat = customBeats[beatIndex]

        if (beat && beat.enabled) {
          if (synthRef.current) {
            let volumeOffset = 0
            if (beat.isMain) {
              volumeOffset = beat.note === 'C2' ? 4 : 0
            } else {
              volumeOffset = -4
            }
            synthRef.current.volume.setValueAtTime(volume + volumeOffset, time)
            synthRef.current.triggerAttackRelease("16n", time)
          }

          Tone.Draw.schedule(() => {
            setCurrentBeatIndex(beatIndex)
          }, time)
        }
      }, playSequence).start(0)

      partRef.current.loop = false

      if (customBeats[31]?.enabled) {
        getTransport().scheduleOnce((time) => {
          const beat = customBeats[31]
          if (synthRef.current && beat) {
            const volumeOffset = -4
            synthRef.current.volume.setValueAtTime(volume + volumeOffset, time)
            synthRef.current.triggerAttackRelease("16n", time)
          }
          Tone.Draw.schedule(() => {
            setCurrentBeatIndex(31)
          }, time)
        }, "0:0:3")
      }

      timePartRef.current = new Tone.Part((time, beatInfo) => {
        const beatIndex = beatInfo as number
        Tone.Draw.schedule(() => {
          setCurrentTimeIndex(beatIndex)
        }, time)
      }, timeSequence).start(0)

      timePartRef.current.loop = false

      if (customBeats[31]?.enabled) {
        getTransport().scheduleOnce((time) => {
          Tone.Draw.schedule(() => {
            setCurrentTimeIndex(31)
          }, time)
        }, "0:0:3")
      }

      Tone.Transport.schedule((time) => {
        Tone.Draw.schedule(() => {
          setQuizPhase('recording')
          startRecording()
        }, time)
      }, "0:9:0")

      Tone.Transport.schedule((time) => {
        Tone.Draw.schedule(() => {
          stopRecording()
          evaluateAndShowResults()
        }, time)
      }, "0:17:0")

      setQuizPhase('playing')
      getTransport().position = 0
      getTransport().start()
      setIsPlaying(true)
    } catch (error) {
      console.error('啟動測驗失敗:', error)
      alert('無法啟動測驗：' + (error as Error).message)
      resetQuiz()
    }
  }

  const startRecording = () => {
    if (!micSetupRef.current) return

    console.log('開始錄音偵測')
    recordingStartTimeRef.current = Tone.Transport.seconds

    const { analyserSetup } = micSetupRef.current
    if (analyserSetup) {
      startClapDetection(analyserSetup, () => {
        const currentTime = Tone.Transport.seconds
        const clapTime = currentTime - recordingStartTimeRef.current
        const beatIndex = getBeatIndexFromTime(clapTime, bpm) + 32

        console.log('偵測到掌聲:', beatIndex, 'time:', clapTime)

        setRecordedClaps(prev => [...prev, beatIndex])
        lastClapTimeRef.current = currentTime

        Tone.Draw.schedule(() => {
          setCurrentBeatIndex(beatIndex)
        }, currentTime)
      })
    }
  }

  const stopRecording = () => {
    if (!micSetupRef.current) return

    console.log('停止錄音')
    const { analyserSetup } = micSetupRef.current
    if (analyserSetup) {
      stopClapDetection(analyserSetup)
    }

    cleanupMicrophone(micSetupRef.current)
    micSetupRef.current = null
  }

  const evaluateAndShowResults = () => {
    setQuizPhase('evaluating')

    getTransport().stop()
    if (partRef.current) {
      partRef.current.dispose()
      partRef.current = null
    }
    if (timePartRef.current) {
      timePartRef.current.dispose()
      timePartRef.current = null
    }

    setIsPlaying(false)
    setCurrentBeatIndex(null)
    setCurrentTimeIndex(null)

    const evaluation = evaluateQuiz(customBeats, recordedClaps, bpm, 32)
    setQuizResult(evaluation)

    const record: QuizRecord = {
      id: `quiz-${Date.now()}`,
      timestamp: Date.now(),
      patternName: selectedPresetId
        ? (BUILT_IN_PRESETS.find(p => p.id === selectedPresetId)?.name || customPresets.find(p => p.id === selectedPresetId)?.name || 'Custom')
        : 'Custom',
      bpm,
      pattern: JSON.parse(JSON.stringify(customBeats)),
      evaluation
    }

    saveQuizRecord(record)
    setQuizHistory(prev => [record, ...prev])

    setQuizPhase('result')
    console.log('測驗評分完成:', evaluation)
  }

  const resetQuiz = () => {
    getTransport().stop()
    getTransport().position = 0
    getTransport().cancel(0)

    if (partRef.current) {
      partRef.current.dispose()
      partRef.current = null
    }
    if (timePartRef.current) {
      timePartRef.current.dispose()
      timePartRef.current = null
    }

    if (micSetupRef.current) {
      cleanupMicrophone(micSetupRef.current)
      micSetupRef.current = null
    }

    setIsPlaying(false)
    setQuizPhase('idle')
    setRecordedClaps([])
    setCurrentBeatIndex(null)
    setCurrentTimeIndex(null)
  }

  const togglePlay = async () => {
    if (isQuizMode) {
      if (quizPhase === 'idle' || quizPhase === 'result') {
        // 測驗模式總是使用倒數
        await startQuizWithCountdown()
      } else {
        resetQuiz()
      }
      return
    }

    if (!isPlaying) {
      // 根據倒數模式開關決定是否執行倒數
      if (enableCountdown) {
        await performCountdown()
      } else {
        await Tone.start()
      }

      console.log('Tone.js started, context state:', Tone.context.state)

      const sequence = buildSequence(customBeats)
      console.log('Built sequence:', sequence)

      partRef.current = new Tone.Part((time, beatInfo) => {
        const beatIndex = beatInfo as number
        const beat = customBeats[beatIndex]

        if (beat && beat.enabled) {
          if (synthRef.current) {
            let volumeOffset = 0
            if (beat.isMain) {
              volumeOffset = beat.note === 'C2' ? 4 : 0
            } else {
              volumeOffset = -4
            }
            synthRef.current.volume.setValueAtTime(volume + volumeOffset, time)
            synthRef.current.triggerAttackRelease("16n", time)
          }

          Tone.Draw.schedule(() => {
            setCurrentBeatIndex(beatIndex)
          }, time)
        }
      }, sequence).start(0)

      if (loop) {
        partRef.current.loop = true
        partRef.current.loopStart = "0:1:0"
        partRef.current.loopEnd = "0:9:0"
      } else {
        partRef.current.loop = false
      }

      if (customBeats[31]?.enabled) {
        getTransport().scheduleOnce((time) => {
          const beat = customBeats[31]
          if (synthRef.current && beat) {
            const volumeOffset = -4
            synthRef.current.volume.setValueAtTime(volume + volumeOffset, time)
            synthRef.current.triggerAttackRelease("16n", time)
          }
          Tone.Draw.schedule(() => {
            setCurrentBeatIndex(31)
          }, time)
        }, "0:0:3")
      }

      const timeSequence = buildTimeSequence(customBeats)
      timePartRef.current = new Tone.Part((time, beatInfo) => {
        const beatIndex = beatInfo as number

        Tone.Draw.schedule(() => {
          setCurrentTimeIndex(beatIndex)
        }, time)
      }, timeSequence).start(0)

      if (loop) {
        timePartRef.current.loop = true
        timePartRef.current.loopStart = "0:1:0"
        timePartRef.current.loopEnd = "0:9:0"
      } else {
        timePartRef.current.loop = false
      }

      if (customBeats[31]?.enabled) {
        getTransport().scheduleOnce((time) => {
          Tone.Draw.schedule(() => {
            setCurrentTimeIndex(31)
          }, time)
        }, "0:0:3")
      }

      getTransport().position = 0
      getTransport().start()
      setIsPlaying(true)
    } else {
      getTransport().stop()
      getTransport().position = 0
      getTransport().cancel(0)
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

  // 拍點切換處理
  const handleBeatToggle = (index: number) => {
    if (!isPlaying) {
      if (isQuizMode && quizPhase === 'result') {
        setQuizPhase('idle')
        setQuizResult(null)
      }
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
  }

  return (
    <Container size="lg" py="xl">
      <Title order={2} mb="lg">Swing 節拍練習器</Title>
      <Paper shadow="xs" p="md" withBorder>
        <Stack gap="lg">
          {/* 控制區 */}
          <ControlPanel
            isPlaying={isPlaying}
            isQuizMode={isQuizMode}
            loop={loop}
            bpm={bpm}
            showTimePositions={showTimePositions}
            enableCountdown={enableCountdown}
            soundType={soundType}
            onToggleQuizMode={(checked) => {
              setIsQuizMode(checked)
              if (checked) {
                setLoop(false)
                setQuizPhase('idle')
                setQuizResult(null)
              }
            }}
            onToggleLoop={setLoop}
            onBpmChange={setBpm}
            onToggleTimePosition={toggleTimePosition}
            onToggleCountdown={setEnableCountdown}
            onSoundTypeChange={setSoundType}
          />
          <Divider />

          {/* 測驗模式狀態指示器 */}
          {isQuizMode && (
            <QuizStatusPanel
              quizPhase={quizPhase}
              quizResult={quizResult}
              onRetry={() => {
                setQuizPhase('idle')
                setQuizResult(null)
              }}
            />
          )}

          {/* 隨機考題區 */}
          <RandomQuestionGenerator
            isPlaying={isPlaying}
            onGenerateEasy={handleGenerateEasyQuestion}
            onGenerateMedium={handleGenerateMediumQuestion}
            onGenerateHard={handleGenerateHardQuestion}
            onGenerateHell={handleGenerateHellQuestion}
          />
          <Divider />

          {/* 預設管理區 */}
          <PresetManager
            customPresets={customPresets}
            selectedPresetId={selectedPresetId}
            newPresetName={newPresetName}
            showManagePresets={showManagePresets}
            isPlaying={isPlaying}
            onLoadPreset={loadPreset}
            onClearPattern={clearPattern}
            onToggleManagePresets={() => setShowManagePresets(!showManagePresets)}
            onSaveAsPreset={saveAsPreset}
            onDeletePreset={deletePreset}
            onNewPresetNameChange={setNewPresetName}
          />

          {/* 拍點編輯器 */}
          <BeatEditor
            customBeats={customBeats}
            currentBeatIndex={currentBeatIndex}
            currentTimeIndex={currentTimeIndex}
            showTimePositions={showTimePositions}
            isPlaying={isPlaying}
            isQuizMode={isQuizMode}
            quizPhase={quizPhase}
            quizResult={quizResult}
            onBeatToggle={handleBeatToggle}
          />
        </Stack>
      </Paper>
      <Group mt="xl" justify="center">
        <Link to="/">
          <Button variant="subtle">回到首頁</Button>
        </Link>
      </Group>

      {/* 測驗倒數 Modal */}
      <Modal
        opened={countdown !== null}
        onClose={() => {}}
        withCloseButton={false}
        centered
        size="lg"
        padding="xl"
      >
        <Center style={{ minHeight: '200px' }}>
          <Title size={120} c="blue">
            {countdown}
          </Title>
        </Center>
      </Modal>

      {/* 固定在右下角的開始/停止按鈕 */}
      <Button
        color={isPlaying ? "red" : "green"}
        onClick={togglePlay}
        size="xl"
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '90px',
          height: '90px',
          borderRadius: '50%',
          fontSize: '14px',
          fontWeight: 'bold',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          padding: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          whiteSpace: 'normal',
          wordBreak: 'break-all',
          lineHeight: '1.2'
        }}
      >
        {isPlaying ? "停止" : (isQuizMode ? "開始測驗" : "開始")}
      </Button>
    </Container>
  )
}
