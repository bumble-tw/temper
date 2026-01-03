// src/types/quiz.ts
// 測驗模式相關的 TypeScript 類型定義

import type { SubBeat } from '../App'

// 測驗階段狀態
export type QuizPhase = 'idle' | 'playing' | 'recording' | 'evaluating' | 'result'

// 單個拍點的評估結果
export type BeatEvaluation = {
  index: number               // 拍點索引 (0-31)
  expected: boolean           // 是否應該拍
  detected: boolean           // 是否偵測到
  status: 'correct' | 'missed' | 'extra' | 'correct-silent'
  // correct: 正確拍了
  // missed: 應該拍但沒拍
  // extra: 不應該拍但拍了
  // correct-silent: 正確的空拍（不應該拍且沒拍）
  timestamp?: number          // 實際拍的時間（秒）
  timingError?: number        // 時間誤差（毫秒）
}

// 完整測驗評估
export type QuizEvaluation = {
  beatEvaluations: BeatEvaluation[]
  accuracy: number            // 正確率（0-100）
  correctCount: number        // 正確數量
  missedCount: number         // 遺漏數量
  extraCount: number          // 多餘數量
  averageTimingError: number  // 平均時間誤差（毫秒）
}

// 測驗歷史記錄
export type QuizRecord = {
  id: string                  // 唯一識別碼
  timestamp: number           // 測驗時間戳
  patternName: string         // 節奏模式名稱（或 "Custom"）
  bpm: number                 // 當時的 BPM
  usePickup: boolean          // 是否使用 Pickup Beat
  pattern: SubBeat[]          // 測驗的節奏模式（完整備份）
  evaluation: QuizEvaluation  // 評估結果
}

// LocalStorage 存儲結構
export type QuizHistoryStorage = {
  version: number             // Schema 版本（未來擴充用）
  records: QuizRecord[]       // 測驗記錄陣列
  maxRecords: number          // 最大保留數量
}

// Meyda 音頻特徵（從 Meyda 類型擴展）
export interface AudioFeatures {
  rms: number                 // Root Mean Square - 音量強度
  spectralFlux: number        // 頻譜變化率
  zcr: number                 // Zero Crossing Rate - 過零率
  spectralCentroid: number    // 頻譜重心
}
