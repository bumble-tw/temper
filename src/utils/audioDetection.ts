// src/utils/audioDetection.ts
// 音頻偵測工具：麥克風捕獲和掌聲偵測

import Meyda from 'meyda'
import * as Tone from 'tone'

// Meyda Analyzer 類型
type MeydaAnalyzer = ReturnType<typeof Meyda.createMeydaAnalyzer>

// 掌聲偵測閾值配置
export const CLAP_DETECTION_THRESHOLDS = {
  rms: 0.1,                    // 音量強度閾值
  spectralFlux: 0.05,          // 頻譜變化率閾值
  zcr: 50,                     // 過零率閾值
  spectralCentroidMin: 1000,   // 頻譜重心最小值 (Hz)
  spectralCentroidMax: 4000,   // 頻譜重心最大值 (Hz)
}

// 時間容錯配置
export const TOLERANCE_MS = 100  // ±100ms

// 麥克風初始化結果
export interface MicrophoneSetup {
  stream: MediaStream
  analyzer: MeydaAnalyzer
  audioContext: AudioContext
  source: MediaStreamAudioSourceNode
}

/**
 * 初始化麥克風並創建 Meyda 分析器
 * @returns 麥克風設置對象
 * @throws 如果用戶拒絕麥克風權限或不支援
 */
export const initMicrophone = async (): Promise<MicrophoneSetup> => {
  try {
    // 請求麥克風權限
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,  // 關閉回音消除（避免影響偵測）
        noiseSuppression: false,  // 關閉噪音抑制
        autoGainControl: false    // 關閉自動增益
      }
    })

    // 獲取 Tone.js 的 AudioContext
    const audioContext = Tone.context.rawContext as AudioContext

    // 創建音頻源
    const source = audioContext.createMediaStreamSource(stream)

    // 創建 Meyda 分析器
    const analyzer = Meyda.createMeydaAnalyzer({
      audioContext: audioContext,
      source: source,
      bufferSize: 512,  // 平衡延遲與準確度
      featureExtractors: ['rms', 'spectralFlux', 'zcr', 'spectralCentroid'],
      callback: () => {
        // 回調函數會在外部設置
      }
    })

    return {
      stream,
      analyzer,
      audioContext,
      source
    }
  } catch (error) {
    console.error('麥克風初始化失敗:', error)
    throw new Error('無法訪問麥克風，請確認已授予權限')
  }
}

/**
 * 判斷是否偵測到掌聲
 * @param features Meyda 提取的音頻特徵
 * @returns 是否偵測到掌聲
 */
export const isClapDetected = (features: any): boolean => {
  if (!features) return false

  const {
    rms = 0,
    spectralFlux = 0,
    zcr = 0,
    spectralCentroid = 0
  } = features

  // 需同時滿足所有條件
  return (
    rms > CLAP_DETECTION_THRESHOLDS.rms &&
    spectralFlux > CLAP_DETECTION_THRESHOLDS.spectralFlux &&
    zcr > CLAP_DETECTION_THRESHOLDS.zcr &&
    spectralCentroid > CLAP_DETECTION_THRESHOLDS.spectralCentroidMin &&
    spectralCentroid < CLAP_DETECTION_THRESHOLDS.spectralCentroidMax
  )
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
    // 停止分析器
    if (setup.analyzer) {
      setup.analyzer.stop()
    }

    // 停止所有音軌
    if (setup.stream) {
      setup.stream.getTracks().forEach(track => track.stop())
    }

    // 斷開音頻源
    if (setup.source) {
      setup.source.disconnect()
    }
  } catch (error) {
    console.error('清理麥克風資源失敗:', error)
  }
}
