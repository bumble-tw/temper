// src/utils/quizStorage.ts
// 測驗歷史記錄的 LocalStorage 存取工具

import type { QuizRecord, QuizHistoryStorage } from '../types/quiz'

// LocalStorage 鍵名
const QUIZ_HISTORY_KEY = 'rhythm-trainer-quiz-history'

// 默認配置
const DEFAULT_MAX_RECORDS = 50

/**
 * 載入測驗歷史記錄
 * @returns 測驗歷史存儲對象
 */
export const loadQuizHistory = (): QuizHistoryStorage => {
  try {
    const saved = localStorage.getItem(QUIZ_HISTORY_KEY)

    if (saved) {
      const parsed = JSON.parse(saved) as QuizHistoryStorage
      return parsed
    }

    // 如果沒有存儲，返回默認值
    return {
      version: 1,
      records: [],
      maxRecords: DEFAULT_MAX_RECORDS
    }
  } catch (error) {
    console.error('載入測驗歷史失敗:', error)
    return {
      version: 1,
      records: [],
      maxRecords: DEFAULT_MAX_RECORDS
    }
  }
}

/**
 * 儲存測驗記錄
 * @param record 測驗記錄
 */
export const saveQuizRecord = (record: QuizRecord): void => {
  try {
    const storage = loadQuizHistory()

    // 新記錄放在最前面
    storage.records.unshift(record)

    // 限制數量
    if (storage.records.length > storage.maxRecords) {
      storage.records = storage.records.slice(0, storage.maxRecords)
    }

    // 儲存到 localStorage
    localStorage.setItem(QUIZ_HISTORY_KEY, JSON.stringify(storage))
  } catch (error) {
    console.error('儲存測驗記錄失敗:', error)
    throw new Error('無法儲存測驗記錄')
  }
}

/**
 * 刪除指定的測驗記錄
 * @param recordId 記錄 ID
 */
export const deleteQuizRecord = (recordId: string): void => {
  try {
    const storage = loadQuizHistory()
    storage.records = storage.records.filter(r => r.id !== recordId)
    localStorage.setItem(QUIZ_HISTORY_KEY, JSON.stringify(storage))
  } catch (error) {
    console.error('刪除測驗記錄失敗:', error)
    throw new Error('無法刪除測驗記錄')
  }
}

/**
 * 清空所有測驗記錄
 */
export const clearQuizHistory = (): void => {
  try {
    const storage: QuizHistoryStorage = {
      version: 1,
      records: [],
      maxRecords: DEFAULT_MAX_RECORDS
    }
    localStorage.setItem(QUIZ_HISTORY_KEY, JSON.stringify(storage))
  } catch (error) {
    console.error('清空測驗歷史失敗:', error)
    throw new Error('無法清空測驗歷史')
  }
}

/**
 * 獲取最近的 N 筆測驗記錄
 * @param count 記錄數量
 * @returns 測驗記錄陣列
 */
export const getRecentQuizRecords = (count: number = 10): QuizRecord[] => {
  const storage = loadQuizHistory()
  return storage.records.slice(0, count)
}

/**
 * 根據節奏模式名稱篩選記錄
 * @param patternName 節奏模式名稱
 * @returns 測驗記錄陣列
 */
export const getQuizRecordsByPattern = (patternName: string): QuizRecord[] => {
  const storage = loadQuizHistory()
  return storage.records.filter(r => r.patternName === patternName)
}

/**
 * 獲取測驗統計
 * @returns 統計數據
 */
export const getQuizStatistics = () => {
  const storage = loadQuizHistory()
  const records = storage.records

  if (records.length === 0) {
    return {
      totalQuizzes: 0,
      averageAccuracy: 0,
      bestAccuracy: 0,
      averageTimingError: 0
    }
  }

  const totalQuizzes = records.length
  const accuracies = records.map(r => r.evaluation.accuracy)
  const timingErrors = records.map(r => r.evaluation.averageTimingError)

  const averageAccuracy = Math.round(
    (accuracies.reduce((a, b) => a + b, 0) / totalQuizzes) * 10
  ) / 10

  const bestAccuracy = Math.max(...accuracies)

  const averageTimingError = Math.round(
    timingErrors.reduce((a, b) => a + b, 0) / totalQuizzes
  )

  return {
    totalQuizzes,
    averageAccuracy,
    bestAccuracy,
    averageTimingError
  }
}
