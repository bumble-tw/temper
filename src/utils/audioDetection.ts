// src/utils/audioDetection.ts
// 音頻偵測工具：麥克風捕獲和掌聲偵測（使用 Web Audio API AnalyserNode）

import * as Tone from 'tone'

// 時間容錯配置
export const TOLERANCE_MS = 100  // ±100ms

// 掌聲偵測閾值配置
export const CLAP_DETECTION_CONFIG = {
  energyThreshold: 0.15,      // 能量閾值（0-1）
  minTimeBetweenClaps: 100,   // 兩次掌聲之間的最小間隔（毫秒）
  smoothingTimeConstant: 0.3, // AnalyserNode 平滑係數（0-1）
  fftSize: 2048,              // FFT 大小
}

// 音頻分析設置類型
export interface AudioAnalyserSetup {
  stream: MediaStream
  audioContext: AudioContext
  source: MediaStreamAudioSourceNode
  analyser: AnalyserNode
  dataArray: Uint8Array
  animationFrameId: number | null
}

// 麥克風初始化結果
export interface MicrophoneSetup {
  stream: MediaStream
  analyserSetup: AudioAnalyserSetup
  audioContext: AudioContext
  source: MediaStreamAudioSourceNode
}

/**
 * 初始化麥克風並創建音頻分析器
 * @returns 麥克風設置對象
 * @throws 如果用戶拒絕麥克風權限或不支援
 */
export const initMicrophone = async (): Promise<MicrophoneSetup> => {
  try {
    // 確保 Tone.js 已啟動
    await Tone.start()

    // 請求麥克風權限
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,  // 關閉回音消除（避免影響偵測）
        noiseSuppression: false,  // 關閉噪音抑制
        autoGainControl: false    // 關閉自動增益
      }
    })

    // 獲取 AudioContext
    const toneContext = Tone.getContext()
    const audioContext = (toneContext.rawContext || toneContext) as unknown as AudioContext

    // 確保 AudioContext 處於 running 狀態
    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }

    console.log('AudioContext state:', audioContext.state)

    // 創建音頻源
    const source = audioContext.createMediaStreamSource(stream)

    // 創建 AnalyserNode（現代的音頻分析方式）
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = CLAP_DETECTION_CONFIG.fftSize
    analyser.smoothingTimeConstant = CLAP_DETECTION_CONFIG.smoothingTimeConstant

    // 連接音頻節點
    source.connect(analyser)

    // 創建數據陣列用於存儲音頻數據
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const analyserSetup: AudioAnalyserSetup = {
      stream,
      audioContext,
      source,
      analyser,
      dataArray,
      animationFrameId: null
    }

    return {
      stream,
      analyserSetup,
      audioContext,
      source
    }
  } catch (error) {
    console.error('麥克風初始化失敗:', error)
    throw new Error('無法訪問麥克風，請確認已授予權限')
  }
}

/**
 * 計算音頻能量（RMS - Root Mean Square）
 * @param dataArray 音頻數據陣列
 * @returns 歸一化的能量值（0-1）
 */
const calculateEnergy = (dataArray: Uint8Array): number => {
  let sum = 0
  for (let i = 0; i < dataArray.length; i++) {
    const normalized = dataArray[i] / 255.0  // 歸一化到 0-1
    sum += normalized * normalized
  }
  const rms = Math.sqrt(sum / dataArray.length)
  return rms
}

/**
 * 開始掌聲偵測（使用 AnalyserNode）
 * @param analyserSetup 音頻分析器設置
 * @param onClapDetected 偵測到掌聲時的回調函數
 */
export const startClapDetection = (
  analyserSetup: AudioAnalyserSetup,
  onClapDetected: () => void
) => {
  const { analyser, dataArray } = analyserSetup
  let lastClapTime = 0

  const detectClap = () => {
    // 獲取時域數據（waveform）
    analyser.getByteTimeDomainData(dataArray)

    // 計算當前音頻能量
    const energy = calculateEnergy(dataArray)

    // 檢查是否超過閾值
    if (energy > CLAP_DETECTION_CONFIG.energyThreshold) {
      const currentTime = Date.now()
      const timeSinceLastClap = currentTime - lastClapTime

      // 去抖動：確保兩次掌聲之間有足夠間隔
      if (timeSinceLastClap > CLAP_DETECTION_CONFIG.minTimeBetweenClaps) {
        console.log('偵測到掌聲，能量:', energy.toFixed(3))
        lastClapTime = currentTime
        onClapDetected()
      }
    }

    // 持續偵測
    analyserSetup.animationFrameId = requestAnimationFrame(detectClap)
  }

  // 開始偵測循環
  detectClap()
}

/**
 * 停止掌聲偵測
 * @param analyserSetup 音頻分析器設置
 */
export const stopClapDetection = (analyserSetup: AudioAnalyserSetup) => {
  if (analyserSetup.animationFrameId !== null) {
    cancelAnimationFrame(analyserSetup.animationFrameId)
    analyserSetup.animationFrameId = null
  }
}

/**
 * 將時間（秒）轉換為拍點索引
 * @param timeInSeconds 時間（秒）
 * @param bpm 每分鐘拍數
 * @returns 拍點索引（十六分音符單位）
 */
export const getBeatIndexFromTime = (timeInSeconds: number, bpm: number): number => {
  const beatDuration = 60 / bpm          // 一拍的時間（秒）
  const sixteenthDuration = beatDuration / 4  // 十六分音符的時間
  const totalBeats = timeInSeconds / sixteenthDuration
  return Math.round(totalBeats)
}

/**
 * 判斷兩個拍點索引是否在容錯範圍內
 * @param detectedIndex 偵測到的拍點索引
 * @param expectedIndex 預期的拍點索引
 * @param bpm 每分鐘拍數
 * @returns 是否在容錯範圍內
 */
export const isWithinTolerance = (
  detectedIndex: number,
  expectedIndex: number,
  bpm: number
): boolean => {
  const beatDuration = 60 / bpm
  const sixteenthDuration = beatDuration / 4
  const toleranceBeats = (TOLERANCE_MS / 1000) / sixteenthDuration

  return Math.abs(detectedIndex - expectedIndex) <= toleranceBeats
}

/**
 * 計算時間誤差（毫秒）
 * @param detectedIndex 偵測到的拍點索引
 * @param expectedIndex 預期的拍點索引
 * @param bpm 每分鐘拍數
 * @returns 時間誤差（毫秒），正數表示晚了，負數表示早了
 */
export const calculateTimingError = (
  detectedIndex: number,
  expectedIndex: number,
  bpm: number
): number => {
  const beatDuration = 60 / bpm
  const sixteenthDuration = beatDuration / 4
  const timeDiff = (detectedIndex - expectedIndex) * sixteenthDuration
  return Math.round(timeDiff * 1000)  // 轉換為毫秒
}

/**
 * 清理麥克風資源
 * @param setup 麥克風設置對象
 */
export const cleanupMicrophone = (setup: MicrophoneSetup | null) => {
  if (!setup) return

  try {
    const { analyserSetup, stream, source } = setup

    // 停止偵測
    if (analyserSetup) {
      stopClapDetection(analyserSetup)
      analyserSetup.analyser.disconnect()
    }

    // 停止所有音軌
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }

    // 斷開音頻源
    if (source) {
      source.disconnect()
    }
  } catch (error) {
    console.error('清理麥克風資源失敗:', error)
  }
}
