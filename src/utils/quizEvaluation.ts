// src/utils/quizEvaluation.ts
// 測驗評分邏輯

import type { BeatEvaluation, QuizEvaluation } from '../types/quiz'
import { isWithinTolerance, calculateTimingError } from './audioDetection'

// SubBeat 類型（臨時定義，之後會從 App.tsx 導入）
interface SubBeat {
  enabled?: boolean
  [key: string]: any
}

/**
 * 評估測驗結果
 * @param customBeats 節奏模式（32 個拍點）
 * @param recordedClaps 錄製到的掌聲拍點索引陣列
 * @param bpm 每分鐘拍數
 * @param recordingStartIndex 錄音開始的拍點索引（通常是 32，對應第二個 8 拍）
 * @returns 完整的測驗評估結果
 */
export const evaluateQuiz = (
  customBeats: SubBeat[],
  recordedClaps: number[],
  bpm: number,
  recordingStartIndex: number = 32
): QuizEvaluation => {
  // 1. 建立預期拍點列表（對應錄音階段，索引 32-63）
  const expectedIndices: number[] = []
  customBeats.forEach((beat, idx) => {
    if (beat.enabled) {
      expectedIndices.push(idx + recordingStartIndex)
    }
  })

  // 2. 評估每個拍點
  const beatEvaluations: BeatEvaluation[] = []

  for (let i = 0; i < 32; i++) {
    const actualIndex = i + recordingStartIndex
    const expected = expectedIndices.includes(actualIndex)

    // 查找是否有匹配的偵測
    const matchingClap = recordedClaps.find(clap =>
      isWithinTolerance(clap, actualIndex, bpm)
    )
    const detected = matchingClap !== undefined

    // 確定狀態
    let status: BeatEvaluation['status']
    if (expected && detected) {
      status = 'correct'
    } else if (expected && !detected) {
      status = 'missed'
    } else if (!expected && detected) {
      status = 'extra'
    } else {
      status = 'correct-silent'
    }

    // 計算時間誤差
    let timingError: number | undefined
    if (detected && matchingClap !== undefined) {
      timingError = calculateTimingError(matchingClap, actualIndex, bpm)
    }

    beatEvaluations.push({
      index: i,  // 轉換回 0-31
      expected,
      detected,
      status,
      timestamp: matchingClap,
      timingError
    })
  }

  // 3. 計算統計數據
  const correctCount = beatEvaluations.filter(e => e.status === 'correct').length
  const missedCount = beatEvaluations.filter(e => e.status === 'missed').length
  const extraCount = beatEvaluations.filter(e => e.status === 'extra').length

  // 計算準確率：正確數 / 預期總數
  const totalExpected = expectedIndices.length
  const accuracy = totalExpected > 0 ? (correctCount / totalExpected) * 100 : 100

  // 計算平均時間誤差
  const timingErrors = beatEvaluations
    .filter(e => e.timingError !== undefined)
    .map(e => Math.abs(e.timingError!))  // 使用絕對值
  const averageTimingError = timingErrors.length > 0
    ? Math.round(timingErrors.reduce((a, b) => a + b, 0) / timingErrors.length)
    : 0

  // 4. 返回完整評估
  return {
    beatEvaluations,
    accuracy: Math.round(accuracy * 10) / 10,  // 保留一位小數
    correctCount,
    missedCount,
    extraCount,
    averageTimingError
  }
}

/**
 * 生成評估摘要文字
 * @param evaluation 測驗評估結果
 * @returns 摘要文字
 */
export const getEvaluationSummary = (evaluation: QuizEvaluation): string => {
  const { correctCount, missedCount, extraCount, accuracy, averageTimingError } = evaluation

  let summary = `準確率: ${accuracy}%\n`
  summary += `正確: ${correctCount}，遺漏: ${missedCount}，多餘: ${extraCount}\n`

  if (averageTimingError > 0) {
    summary += `平均時間誤差: ${averageTimingError}ms`
  }

  return summary
}

/**
 * 根據準確率獲取評級
 * @param accuracy 準確率 (0-100)
 * @returns 評級文字和顏色
 */
export const getAccuracyGrade = (accuracy: number): { grade: string; color: string } => {
  if (accuracy >= 95) {
    return { grade: '完美', color: 'green' }
  } else if (accuracy >= 85) {
    return { grade: '優秀', color: 'teal' }
  } else if (accuracy >= 70) {
    return { grade: '良好', color: 'blue' }
  } else if (accuracy >= 50) {
    return { grade: '及格', color: 'yellow' }
  } else {
    return { grade: '需加強', color: 'red' }
  }
}
