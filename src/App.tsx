// src/App.tsx
import { useState, useEffect, useRef } from 'react'
import { Button, Container, Title, Text, Group, Paper, Stack, Switch, Divider, Slider, Select, TextInput, Checkbox, Collapse, Badge, Pagination, Loader, Modal, Center } from '@mantine/core'
import { Routes, Route, Link } from 'react-router-dom'
import * as Tone from 'tone'
import { getTransport } from 'tone'

// 測驗模式相關導入
import type { QuizPhase, QuizEvaluation, QuizRecord } from './types/quiz'
import { initMicrophone, startClapDetection, stopClapDetection, getBeatIndexFromTime, cleanupMicrophone, type MicrophoneSetup } from './utils/audioDetection'
import { evaluateQuiz } from './utils/quizEvaluation'
import { loadQuizHistory, saveQuizRecord } from './utils/quizStorage'

// --- 節奏模式資料結構 ---
export type SubBeat = {
  time: string // Tone.js time notation (e.g., "0:0:0", "0:0:2") 0 小節, 第 0 拍, 第 0 個十六分音符
  note: string // C2:主拍(較重)、C1:次拍(較輕)、Rest:空拍
  label: string // 顯示在介面上的標籤(e.g.、 "1", "ple", "2")
  isMain?: boolean // 是否為主拍
  isRest?: boolean // 是否為空拍
  enabled?: boolean // 用於自定義模式
}

export type Preset = {
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

  // 標籤：1 e & a
  let label = ''
  if (sixteenth === 0) label = `${quarter + 1}` // 1, 2, 3...
  else if (sixteenth === 1) label = 'e'
  else if (sixteenth === 2) label = '&'
  else label = 'a'

  return {
    time: `0:${quarter}:${sixteenth}`,
    note: 'Rest', // 預設為空拍
    label,
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

  // 時間流動顯示控制：[四分音符, 第2個, &, 第4個]
  const [showTimePositions, setShowTimePositions] = useState([false, false, false, false])

  // 自定義模式的狀態 (32 個拍點的扁平陣列)
  const [customBeats, setCustomBeats] = useState<SubBeat[]>(
    JSON.parse(JSON.stringify(INITIAL_CUSTOM_BEATS))
  )

  // 預設管理
  const [customPresets, setCustomPresets] = useState<Preset[]>([])
  const [selectedPresetId, setSelectedPresetId] = useState<string>('')
  const [newPresetName, setNewPresetName] = useState('')
  const [showManagePresets, setShowManagePresets] = useState(false) // 顯示管理預設區域
  const [currentPage, setCurrentPage] = useState(1) // 當前頁碼
  const PRESETS_PER_PAGE = 5 // 每頁顯示數量

  // 測驗模式相關狀態
  const [isQuizMode, setIsQuizMode] = useState(false) // 測驗模式開關
  const [quizPhase, setQuizPhase] = useState<QuizPhase>('idle') // 當前測驗階段
  const [recordedClaps, setRecordedClaps] = useState<number[]>([]) // 錄製到的掌聲拍點索引
  const [quizResult, setQuizResult] = useState<QuizEvaluation | null>(null) // 測驗結果
  const [_quizHistory, setQuizHistory] = useState<QuizRecord[]>([]) // 測驗歷史（未來用於顯示歷史記錄）
  const [countdown, setCountdown] = useState<number | null>(null) // 倒數計時（3, 2, 1）

  // 切換時間流動顯示位置
  const toggleTimePosition = (index: number) => {
    const newPositions = [...showTimePositions]
    newPositions[index] = !newPositions[index]
    setShowTimePositions(newPositions)
  }

  // 計算分頁
  const totalPages = Math.ceil(customPresets.length / PRESETS_PER_PAGE)
  const startIndex = (currentPage - 1) * PRESETS_PER_PAGE
  const endIndex = startIndex + PRESETS_PER_PAGE
  const currentPresets = customPresets.slice(startIndex, endIndex)


  const partRef = useRef<Tone.Part | null>(null) // 節奏控制器（聲音）
  const timePartRef = useRef<Tone.Part | null>(null) // 時間追蹤器（視覺）
  const synthRef = useRef<Tone.NoiseSynth | null>(null) // 掌聲合成器
  const filterRef = useRef<Tone.Filter | null>(null) // 掌聲合成器
  const countdownSynthRef = useRef<Tone.Synth | null>(null) // 倒數提示音合成器

  // 測驗模式相關 refs
  const micSetupRef = useRef<MicrophoneSetup | null>(null) // 麥克風設置
  const recordingStartTimeRef = useRef<number>(0) // 錄音開始時間
  const lastClapTimeRef = useRef<number>(0) // 最後一次掌聲時間（用於去抖動）

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

    // 倒數提示音合成器（清脆的嗶聲）
    countdownSynthRef.current = new Tone.Synth({
      oscillator: {
        type: "sine"
      },
      envelope: {
        attack: 0.005,
        decay: 0.1,
        sustain: 0,
        release: 0.1
      }
    }).toDestination()

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
      if (countdownSynthRef.current) {
        countdownSynthRef.current.dispose()
        countdownSynthRef.current = null
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

  // 清除所有節奏
  const clearPattern = () => {
    if (isPlaying) return
    // 如果在測驗模式且有結果，清除結果
    if (isQuizMode && quizPhase === 'result') {
      setQuizPhase('idle')
      setQuizResult(null)
    }
    setCustomBeats(JSON.parse(JSON.stringify(INITIAL_CUSTOM_BEATS)))
    setSelectedPresetId('')
  }

  // 生成隨機考題（簡單難度）
  // 簡單：只有四分音符位置，有空拍，可能只有少數拍點
  const generateEasyQuestion = () => {
    if (isPlaying) return
    // 如果在測驗模式且有結果，清除結果
    if (isQuizMode && quizPhase === 'result') {
      setQuizPhase('idle')
      setQuizResult(null)
    }

    const newBeats = JSON.parse(JSON.stringify(INITIAL_CUSTOM_BEATS)) as SubBeat[]

    // 8 個四分音符位置（每拍的第一個十六分音符）
    const quarterNotePositions = [0, 4, 8, 12, 16, 20, 24, 28]

    // 決定要啟用多少個拍點（1-6 個，偏向少數）
    const totalBeats = Math.floor(Math.random() * 6) + 1 // 1-6 個

    // 隨機選擇要啟用的位置
    const shuffled = [...quarterNotePositions].sort(() => Math.random() - 0.5)
    const selectedPositions = shuffled.slice(0, totalBeats)

    // 啟用選中的位置
    selectedPositions.forEach(pos => enableBeat(newBeats, pos))

    setCustomBeats(newBeats)
    setSelectedPresetId('') // 清除選擇的預設
  }

  // 生成隨機考題（中等難度）
  // 中等：增加 'a' 拍，有 pickup beat，有空拍（不使用 '&' 拍）
  // 'a' 拍（ple）一定會連著四分音符，不會單獨出現
  const generateMediumQuestion = () => {
    if (isPlaying) return
    // 如果在測驗模式且有結果，清除結果
    if (isQuizMode && quizPhase === 'result') {
      setQuizPhase('idle')
      setQuizResult(null)
    }

    const newBeats = JSON.parse(JSON.stringify(INITIAL_CUSTOM_BEATS)) as SubBeat[]

    // 8 拍，每拍可以在四分音符位置或 'a' 位置（不使用 '&' 拍）
    // 'a' 拍不會單獨出現，一定連著四分音符
    for (let beat = 0; beat < 8; beat++) {
      const quarterPos = beat * 4 // 四分音符位置 (0, 4, 8, ...)
      const aPos = beat * 4 + 3    // 'a' 位置 (3, 7, 11, ...)

      const rand = Math.random()

      if (rand < 0.4) {
        // 40% 機率：只有四分音符
        enableBeat(newBeats, quarterPos)
      } else if (rand < 0.7) {
        // 30% 機率：四分音符 + 'a' 拍（'a' 拍一定連著四分音符）
        enableBeat(newBeats, quarterPos)
        enableBeat(newBeats, aPos)
      }
      // 30% 機率：空拍（什麼都不做）
    }

    setCustomBeats(newBeats)
    setSelectedPresetId('') // 清除選擇的預設
  }

  // 生成隨機考題（困難難度）
  // 困難：使用 'e' 和 'a' 位置（不使用 '&' 拍），較密集的組合，經常有 pickup beat
  const generateHardQuestion = () => {
    if (isPlaying) return
    // 如果在測驗模式且有結果，清除結果
    if (isQuizMode && quizPhase === 'result') {
      setQuizPhase('idle')
      setQuizResult(null)
    }

    const newBeats = JSON.parse(JSON.stringify(INITIAL_CUSTOM_BEATS)) as SubBeat[]

    // 8 拍，每拍可以在四分音符、'e'、'a' 位置（不使用 '&' 拍）
    for (let beat = 0; beat < 8; beat++) {
      const basePos = beat * 4

      const rand = Math.random()

      if (rand < 0.15) {
        // 15% 機率：四分音符 + 'e' + 'a'（跳過 '&'）
        enableBeat(newBeats, basePos)      // 四分音符
        enableBeat(newBeats, basePos + 1)  // 'e'
        enableBeat(newBeats, basePos + 3)  // 'a'
      } else if (rand < 0.3) {
        // 15% 機率：'e' + 'a'（跳過正拍和 '&'）
        enableBeat(newBeats, basePos + 1)  // 'e'
        enableBeat(newBeats, basePos + 3)  // 'a'
      } else if (rand < 0.45) {
        // 15% 機率：四分音符 + 'e'
        enableBeat(newBeats, basePos)      // 四分音符
        enableBeat(newBeats, basePos + 1)  // 'e'
      } else if (rand < 0.6) {
        // 15% 機率：四分音符 + 'a'（Triple Step 風格）
        enableBeat(newBeats, basePos)      // 四分音符
        enableBeat(newBeats, basePos + 3)  // 'a'
      } else if (rand < 0.7) {
        // 10% 機率：只有 'e'
        enableBeat(newBeats, basePos + 1)  // 'e'
      } else if (rand < 0.8) {
        // 10% 機率：只有 'a'
        enableBeat(newBeats, basePos + 3)  // 'a'
      } else if (rand < 0.9) {
        // 10% 機率：只有四分音符
        enableBeat(newBeats, basePos)      // 四分音符
      }
      // 10% 機率：空拍
    }

    setCustomBeats(newBeats)
    setSelectedPresetId('')
  }

  // 生成隨機考題（地獄難度）
  // 地獄：極度密集，複雜切分音，幾乎總是有 pickup beat
  const generateHellQuestion = () => {
    if (isPlaying) return
    // 如果在測驗模式且有結果，清除結果
    if (isQuizMode && quizPhase === 'result') {
      setQuizPhase('idle')
      setQuizResult(null)
    }

    const newBeats = JSON.parse(JSON.stringify(INITIAL_CUSTOM_BEATS)) as SubBeat[]

    // 8 拍，每拍都有高機率產生複雜節奏
    for (let beat = 0; beat < 8; beat++) {
      const basePos = beat * 4

      const rand = Math.random()

      if (rand < 0.2) {
        // 20% 機率：所有四個十六分音符
        enableBeat(newBeats, basePos)
        enableBeat(newBeats, basePos + 1)
        enableBeat(newBeats, basePos + 2)
        enableBeat(newBeats, basePos + 3)
      } else if (rand < 0.35) {
        // 15% 機率：'e' + '&' + 'a'（省略四分音符）
        enableBeat(newBeats, basePos + 1)
        enableBeat(newBeats, basePos + 2)
        enableBeat(newBeats, basePos + 3)
      } else if (rand < 0.5) {
        // 15% 機率：四分音符 + 'e' + 'a'（省略 '&'）
        enableBeat(newBeats, basePos)
        enableBeat(newBeats, basePos + 1)
        enableBeat(newBeats, basePos + 3)
      } else if (rand < 0.65) {
        // 15% 機率：四分音符 + '&' + 'a'（省略 'e'）
        enableBeat(newBeats, basePos)
        enableBeat(newBeats, basePos + 2)
        enableBeat(newBeats, basePos + 3)
      } else if (rand < 0.75) {
        // 10% 機率：'e' + 'a'（跳過正拍和 '&'）
        enableBeat(newBeats, basePos + 1)
        enableBeat(newBeats, basePos + 3)
      } else if (rand < 0.85) {
        // 10% 機率：只有 'e' + '&'
        enableBeat(newBeats, basePos + 1)
        enableBeat(newBeats, basePos + 2)
      } else if (rand < 0.92) {
        // 7% 機率：只有 '&' + 'a'
        enableBeat(newBeats, basePos + 2)
        enableBeat(newBeats, basePos + 3)
      } else if (rand < 0.97) {
        // 5% 機率：只有 '&'（稀有的單一反拍）
        enableBeat(newBeats, basePos + 2)
      }
      // 3% 機率：空拍（極少）
    }

    setCustomBeats(newBeats)
    setSelectedPresetId('')
  }

  // 輔助函數：啟用指定位置的拍點
  const enableBeat = (beats: SubBeat[], index: number) => {
    if (index < beats.length) {
      beats[index].enabled = true
      beats[index].note = beats[index].isMain ? 'C2' : 'C1'
      beats[index].isRest = false
    }
  }

  // 載入預設
  const loadPreset = (presetId: string) => {
    if (isPlaying) return
    // 如果在測驗模式且有結果，清除結果
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

    // 如果刪除後當前頁沒有項目了，跳回上一頁
    const newTotalPages = Math.ceil(updatedPresets.length / PRESETS_PER_PAGE)
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(newTotalPages)
    }

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
    customBeats.forEach((_beat, index) => {
      const quarter = Math.floor(index / 4) + 1
      const sixteenth = index % 4
      const timeStr = `0:${quarter}:${sixteenth}`
      events.push([timeStr, index])
    })
    return events
  }

  // --- 倒數函數 ---

  // 通用倒數函數（帶聲音）
  const performCountdown = async () => {
    // 確保 Tone.js 已啟動
    await Tone.start()

    // 倒數 3
    setCountdown(3)
    if (countdownSynthRef.current) {
      countdownSynthRef.current.triggerAttackRelease('C5', '0.1')
    }
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 倒數 2
    setCountdown(2)
    if (countdownSynthRef.current) {
      countdownSynthRef.current.triggerAttackRelease('C5', '0.1')
    }
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 倒數 1（較高音，表示即將開始）
    setCountdown(1)
    if (countdownSynthRef.current) {
      countdownSynthRef.current.triggerAttackRelease('C6', '0.1')
    }
    await new Promise(resolve => setTimeout(resolve, 1000))

    setCountdown(null)
  }

  // --- 測驗模式函數 ---

  // 開始測驗（帶倒數）
  const startQuizWithCountdown = async () => {
    await performCountdown()
    await startQuiz()
  }

  // 開始測驗
  const startQuiz = async () => {
    try {
      // 1. 初始化 Tone.js
      await Tone.start()
      console.log('測驗模式啟動')

      // 2. 初始化麥克風（但先不開始偵測）
      micSetupRef.current = await initMicrophone()
      console.log('麥克風初始化成功')

      // 3. 重置測驗狀態
      setRecordedClaps([])
      setQuizResult(null)
      lastClapTimeRef.current = 0

      // 4. 建立播放序列（前 8 拍）
      const playSequence = buildSequence()

      // 5. 建立時間序列（用於顯示時間流動）
      const timeSequence = buildTimeSequence()

      // 6. 設定播放邏輯（前 8 拍播放，後 8 拍靜音）
      partRef.current = new Tone.Part((time, beatInfo) => {
        const beatIndex = beatInfo as number
        const beat = customBeats[beatIndex]

        if (beat && beat.enabled) {
          // 發出聲音
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

          // 視覺同步
          Tone.Draw.schedule(() => {
            setCurrentBeatIndex(beatIndex)
          }, time)
        }
      }, playSequence).start(0)

      partRef.current.loop = false  // 測驗模式不循環

      // 特例：如果第 8 拍的 'a' (index 31) 有啟用，在第一次播放時加入 pickup
      if (customBeats[31]?.enabled) {
        getTransport().scheduleOnce((time) => {
          const beat = customBeats[31]
          if (synthRef.current && beat) {
            const volumeOffset = -4 // 子拍音量
            synthRef.current.volume.setValueAtTime(volume + volumeOffset, time)
            synthRef.current.triggerAttackRelease("16n", time)
          }
          Tone.Draw.schedule(() => {
            setCurrentBeatIndex(31)
          }, time)
        }, "0:0:3") // 在第 1 拍之前播放（pickup）
      }

      // 7. 設定時間追蹤器
      timePartRef.current = new Tone.Part((time, beatInfo) => {
        const beatIndex = beatInfo as number
        Tone.Draw.schedule(() => {
          setCurrentTimeIndex(beatIndex)
        }, time)
      }, timeSequence).start(0)

      timePartRef.current.loop = false

      // 特例：時間追蹤器的視覺回饋
      if (customBeats[31]?.enabled) {
        getTransport().scheduleOnce((time) => {
          Tone.Draw.schedule(() => {
            setCurrentTimeIndex(31)
          }, time)
        }, "0:0:3")
      }

      // 8. 設定階段轉換時間點
      // 8 拍後開始錄音（"0:9:0" 表示第 9 拍開始，因為包含 pickup beat）
      Tone.Transport.schedule((time) => {
        Tone.Draw.schedule(() => {
          setQuizPhase('recording')
          startRecording()
        }, time)
      }, "0:9:0")

      // 16 拍後結束並評分（"0:17:0" 表示第 17 拍）
      Tone.Transport.schedule((time) => {
        Tone.Draw.schedule(() => {
          stopRecording()
          evaluateAndShowResults()
        }, time)
      }, "0:17:0")

      // 9. 開始播放
      setQuizPhase('playing')
      getTransport().position = 0 // 確保從頭開始
      getTransport().start()
      setIsPlaying(true)
    } catch (error) {
      console.error('啟動測驗失敗:', error)
      alert('無法啟動測驗：' + (error as Error).message)
      resetQuiz()
    }
  }

  // 開始錄音
  const startRecording = () => {
    if (!micSetupRef.current) return

    console.log('開始錄音偵測')
    recordingStartTimeRef.current = Tone.Transport.seconds

    // 使用 AnalyserNode 掌聲偵測
    const { analyserSetup } = micSetupRef.current
    if (analyserSetup) {
      startClapDetection(analyserSetup, () => {
        const currentTime = Tone.Transport.seconds
        const clapTime = currentTime - recordingStartTimeRef.current

        // 去抖動已在 startClapDetection 內部處理
        const beatIndex = getBeatIndexFromTime(clapTime, bpm) + 32  // +32 因為是第二個 8 拍

        console.log('偵測到掌聲:', beatIndex, 'time:', clapTime)

        setRecordedClaps(prev => [...prev, beatIndex])
        lastClapTimeRef.current = currentTime

        // 即時視覺回饋
        Tone.Draw.schedule(() => {
          setCurrentBeatIndex(beatIndex)
        }, currentTime)
      })
    }
  }

  // 停止錄音
  const stopRecording = () => {
    if (!micSetupRef.current) return

    console.log('停止錄音')
    const { analyserSetup } = micSetupRef.current
    if (analyserSetup) {
      stopClapDetection(analyserSetup)
    }

    // 清理麥克風資源
    cleanupMicrophone(micSetupRef.current)
    micSetupRef.current = null
  }

  // 評分並顯示結果
  const evaluateAndShowResults = () => {
    setQuizPhase('evaluating')

    // 停止 Transport
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

    // 評分
    const evaluation = evaluateQuiz(customBeats, recordedClaps, bpm, 32)
    setQuizResult(evaluation)

    // 儲存到歷史記錄
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

    // 進入結果階段
    setQuizPhase('result')
    console.log('測驗評分完成:', evaluation)
  }

  // 重置測驗
  const resetQuiz = () => {
    // 停止播放
    getTransport().stop()
    getTransport().position = 0 // 重置位置
    getTransport().cancel(0)

    // 清理 Parts
    if (partRef.current) {
      partRef.current.dispose()
      partRef.current = null
    }
    if (timePartRef.current) {
      timePartRef.current.dispose()
      timePartRef.current = null
    }

    // 清理麥克風
    if (micSetupRef.current) {
      cleanupMicrophone(micSetupRef.current)
      micSetupRef.current = null
    }

    // 重置狀態
    setIsPlaying(false)
    setQuizPhase('idle')
    setRecordedClaps([])
    setCurrentBeatIndex(null)
    setCurrentTimeIndex(null)
  }

  const togglePlay = async () => {
    // 測驗模式分支
    if (isQuizMode) {
      if (quizPhase === 'idle' || quizPhase === 'result') {
        // 開始新測驗（帶倒數）
        await startQuizWithCountdown()
      } else {
        // 停止測驗
        resetQuiz()
      }
      return
    }

    // 原有練習模式邏輯
    if (!isPlaying) {
      // 先執行倒數
      await performCountdown()

      console.log('Tone.js started, context state:', Tone.context.state)

      const sequence = buildSequence()
      console.log('Built sequence:', sequence)

      // 建立 Tone.Part 用於精確控制每個音符的時間點
      partRef.current = new Tone.Part((time, beatInfo) => {
        // 修正：beatInfo 收到的直接就是我們存入的 value (也就是 beatIndex 數字)，不需要解構
        const beatIndex = beatInfo as number
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
        partRef.current.loopStart = "0:1:0" // 從第 1 拍開始循環
        partRef.current.loopEnd = "0:9:0"   // 到第 9 拍結束（正好 8 拍）
      } else {
        partRef.current.loop = false
      }

      // 特例：如果第 8 拍的 'a' (index 31) 有啟用，在第一次播放時加入 pickup
      if (customBeats[31]?.enabled) {
        getTransport().scheduleOnce((time) => {
          const beat = customBeats[31]
          if (synthRef.current && beat) {
            const volumeOffset = -4 // 子拍音量
            synthRef.current.volume.setValueAtTime(volume + volumeOffset, time)
            synthRef.current.triggerAttackRelease("16n", time)
          }
          Tone.Draw.schedule(() => {
            setCurrentBeatIndex(31)
          }, time)
        }, "0:0:3") // 在第 1 拍之前播放（pickup）
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
        timePartRef.current.loopStart = "0:1:0" // 從第 1 拍開始循環
        timePartRef.current.loopEnd = "0:9:0"   // 到第 9 拍結束（正好 8 拍）
      } else {
        timePartRef.current.loop = false
      }

      // 特例：如果第 8 拍的 'a' 有啟用，在第一次播放時也要顯示視覺回饋
      if (customBeats[31]?.enabled) {
        getTransport().scheduleOnce((time) => {
          Tone.Draw.schedule(() => {
            setCurrentTimeIndex(31)
          }, time)
        }, "0:0:3")
      }

      getTransport().position = 0 // 確保從頭開始
      getTransport().start()
      setIsPlaying(true)
    } else {
      getTransport().stop()
      getTransport().position = 0 // 重置位置
      getTransport().cancel(0) // 清除所有排程事件（包括 scheduleOnce）
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
                {isPlaying ? "停止" : (isQuizMode ? "開始測驗" : "開始")}
              </Button>
              <Switch
                label="循環"
                checked={loop}
                onChange={(e) => setLoop(e.currentTarget.checked)}
                disabled={isPlaying || isQuizMode}
              />
              <Switch
                label="測驗模式"
                checked={isQuizMode}
                onChange={(e) => {
                  setIsQuizMode(e.currentTarget.checked)
                  if (e.currentTarget.checked) {
                    setLoop(false)  // 測驗模式自動關閉循環
                    setQuizPhase('idle')
                    setQuizResult(null)
                  }
                }}
                disabled={isPlaying}
                color="orange"
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
              <Stack gap={0}>
                <Text size="sm">時間流動顯示</Text>
                <Group gap="xs" mt={4}>
                  <Checkbox
                    label="1"
                    checked={showTimePositions[0]}
                    onChange={() => toggleTimePosition(0)}
                    size="xs"
                  />
                  <Checkbox
                    label="."
                    checked={showTimePositions[1]}
                    onChange={() => toggleTimePosition(1)}
                    size="xs"
                  />
                  <Checkbox
                    label="&"
                    checked={showTimePositions[2]}
                    onChange={() => toggleTimePosition(2)}
                    size="xs"
                  />
                  <Checkbox
                    label="."
                    checked={showTimePositions[3]}
                    onChange={() => toggleTimePosition(3)}
                    size="xs"
                  />
                </Group>
                <Text size="xs" c="dimmed" mt={4}>選擇時間流動要顯示的拍點位置</Text>
              </Stack>
            </Stack>
          </Group>
          <Divider />

          {/* 測驗模式狀態指示器 */}
          {isQuizMode && (
            <Paper p="md" withBorder bg={
              quizPhase === 'idle' ? 'gray.0' :
              quizPhase === 'playing' ? 'blue.0' :
              quizPhase === 'recording' ? 'orange.1' :
              quizPhase === 'evaluating' ? 'yellow.0' :
              'green.0'
            }>
              <Stack gap="md">
                <Group justify="space-between">
                  <Badge size="lg" color={
                    quizPhase === 'idle' ? 'gray' :
                    quizPhase === 'playing' ? 'blue' :
                    quizPhase === 'recording' ? 'orange' :
                    quizPhase === 'evaluating' ? 'yellow' :
                    'green'
                  }>
                    {
                      quizPhase === 'idle' ? '待機' :
                      quizPhase === 'playing' ? '播放階段' :
                      quizPhase === 'recording' ? '錄音階段' :
                      quizPhase === 'evaluating' ? '評分中...' :
                      '測驗完成'
                    }
                  </Badge>
                  {quizPhase === 'playing' && <Text size="sm">聆聽節奏...</Text>}
                  {quizPhase === 'recording' && (
                    <Group>
                      <Text size="sm" fw={600}>請拍掌！</Text>
                      <Loader size="sm" />
                    </Group>
                  )}
                  {quizPhase === 'result' && quizResult && (
                    <Text size="sm" fw={600}>
                      準確度: {quizResult.accuracy.toFixed(1)}%
                    </Text>
                  )}
                </Group>

                {/* 測驗結果詳細 */}
                {quizPhase === 'result' && quizResult && (
                  <Stack gap="xs">
                    <Divider />
                    <Group gap="lg" justify="space-around">
                      <Stack gap={4} align="center">
                        <Text size="xs" c="dimmed">正確</Text>
                        <Badge color="green" size="lg">{quizResult.correctCount}</Badge>
                      </Stack>
                      <Stack gap={4} align="center">
                        <Text size="xs" c="dimmed">遺漏</Text>
                        <Badge color="red" size="lg">{quizResult.missedCount}</Badge>
                      </Stack>
                      <Stack gap={4} align="center">
                        <Text size="xs" c="dimmed">多餘</Text>
                        <Badge color="yellow" size="lg">{quizResult.extraCount}</Badge>
                      </Stack>
                      <Stack gap={4} align="center">
                        <Text size="xs" c="dimmed">平均誤差</Text>
                        <Badge color="blue" size="lg">{quizResult.averageTimingError}ms</Badge>
                      </Stack>
                    </Group>
                    <Group justify="center" mt="sm">
                      <Button
                        variant="filled"
                        color="orange"
                        onClick={() => {
                          setQuizPhase('idle')
                          setQuizResult(null)
                        }}
                      >
                        再測驗一次
                      </Button>
                    </Group>
                  </Stack>
                )}
              </Stack>
            </Paper>
          )}

          {/* 隨機考題區 */}
          <Paper p="md" withBorder bg="orange.0">
            <Stack gap="md">
              <Text size="sm" fw={600} c="orange.8">隨機考題生成器</Text>
              <Group gap="md" wrap="wrap">
                <Button
                  variant="filled"
                  color="green"
                  onClick={generateEasyQuestion}
                  disabled={isPlaying}
                  size="sm"
                >
                  簡單
                </Button>
                <Button
                  variant="filled"
                  color="yellow"
                  onClick={generateMediumQuestion}
                  disabled={isPlaying}
                  size="sm"
                >
                  中等
                </Button>
                <Button
                  variant="filled"
                  color="orange"
                  onClick={generateHardQuestion}
                  disabled={isPlaying}
                  size="sm"
                >
                  困難
                </Button>
                <Button
                  variant="filled"
                  color="red"
                  onClick={generateHellQuestion}
                  disabled={isPlaying}
                  size="sm"
                >
                  地獄
                </Button>
              </Group>
              <Stack gap={4}>
                <Text size="xs" c="dimmed">
                  <strong>簡單</strong>：只有四分音符，1-6 個拍點，無 Pickup Beat
                </Text>
                <Text size="xs" c="dimmed">
                  <strong>中等</strong>：四分音符 + 'a' 拍（無 '&' 拍），'a' 拍必連著四分音符，50% 有 Pickup Beat
                </Text>
                <Text size="xs" c="dimmed">
                  <strong>困難</strong>：四分音符 + 'e' + 'a' 位置（無 '&' 拍），複雜組合，75% 有 Pickup Beat
                </Text>
                <Text size="xs" c="dimmed">
                  <strong>地獄</strong>：極密集節奏，複雜多音符組合，90% 有 Pickup Beat
                </Text>
              </Stack>
            </Stack>
          </Paper>
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
                {customPresets.length > 0 && (
                  <Button
                    variant="light"
                    color="blue"
                    onClick={() => setShowManagePresets(!showManagePresets)}
                    size="sm"
                  >
                    管理預設 ({customPresets.length})
                  </Button>
                )}
              </Group>
            </Group>

            {/* 管理預設區域 */}
            <Collapse in={showManagePresets}>
              <Paper p="md" withBorder bg="gray.0" mt="md">
                <Group justify="space-between" mb="sm">
                  <Text size="sm" fw={600}>自定義預設列表</Text>
                  <Text size="xs" c="dimmed">
                    共 {customPresets.length} 個預設
                  </Text>
                </Group>
                <Stack gap="xs">
                  {currentPresets.map(preset => (
                    <Group key={preset.id} justify="space-between" p="xs" style={{ borderRadius: '4px', backgroundColor: 'white' }}>
                      <Group gap="sm">
                        <Badge color="blue" variant="light" size="sm">自定義</Badge>
                        <Text size="sm">{preset.name}</Text>
                      </Group>
                      <Group gap="xs">
                        <Button
                          variant="subtle"
                          color="blue"
                          size="xs"
                          onClick={() => {
                            loadPreset(preset.id)
                            setShowManagePresets(false)
                          }}
                          disabled={isPlaying}
                        >
                          載入
                        </Button>
                        <Button
                          variant="subtle"
                          color="red"
                          size="xs"
                          onClick={() => deletePreset(preset.id)}
                          disabled={isPlaying}
                        >
                          刪除
                        </Button>
                      </Group>
                    </Group>
                  ))}
                </Stack>
                {totalPages > 1 && (
                  <Group justify="center" mt="md">
                    <Pagination
                      total={totalPages}
                      value={currentPage}
                      onChange={setCurrentPage}
                      size="sm"
                    />
                  </Group>
                )}
              </Paper>
            </Collapse>

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
            {/* 主要節奏顯示區 - 序列檢視 */}
            <Group gap="xs" justify="center" style={{ maxWidth: '100%' }}>
              {customBeats.map((beat, index) => {
                const isBeatStart = index % 4 === 0

                // 獲取測驗結果狀態
                const quizStatus = quizPhase === 'result' && quizResult
                  ? quizResult.beatEvaluations[index]?.status
                  : null

                return (
                  <div key={index} style={{ display: 'flex', alignItems: 'center' }} onClick={() => {
                    if (!isPlaying) {
                      // 如果在測驗模式且有結果，編輯時清除結果
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
                  }}>
                    {index > 0 && index % 8 === 0 && <div style={{ width: 10 }} />}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      {isBeatStart && <Text size="10px" c="dimmed" style={{ marginBottom: 2 }}>{Math.floor(index / 4) + 1}</Text>}
                      <BeatIndicator
                        isActive={currentBeatIndex === index}
                        isTimePlaying={currentTimeIndex === index && showTimePositions[index % 4]}
                        label={beat.label}
                        isMain={beat.isMain}
                        isRest={!beat.enabled}
                        quizStatus={quizStatus}
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
    </Container>
  )
}

// 視覺指示燈組件 - 支援主拍與子拍的差異顯示
function BeatIndicator({ isActive, isTimePlaying, label, isMain = true, isRest = false, quizStatus }: {
  isActive: boolean,
  isTimePlaying?: boolean,
  label: string,
  isMain?: boolean,
  isRest?: boolean,
  quizStatus?: 'correct' | 'missed' | 'extra' | 'correct-silent' | null
}) {
  const size = isMain ? '50px' : '35px'
  const fontSize = isMain ? '14px' : '11px'

  // 測驗結果顏色
  const quizColors = {
    correct: '#51cf66',           // 綠色
    missed: '#ff6b6b',            // 紅色
    extra: '#ffd43b',             // 黃色
    'correct-silent': '#e9ecef'   // 灰色（正確的空拍）
  }

  // 基礎顏色
  let baseColor = isRest ? '#f8f9fa' : (isMain ? '#dee2e6' : '#e9ecef')

  // 如果有測驗結果，使用測驗結果顏色
  if (quizStatus && quizStatus !== 'correct-silent') {
    baseColor = quizColors[quizStatus]
  }

  // 時間流動顏色（淡藍色）
  const timePlayingColor = '#c5dff8' // 淡藍色

  // 發聲時的高亮顏色（鮮艷橙色）
  const soundPlayingColor = '#ff9500'

  // 決定背景顏色：發聲 > 時間流動 > 測驗結果/基礎
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