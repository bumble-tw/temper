// src/types/rhythm.ts
// 節奏相關的類型定義

/**
 * 子拍點資料結構
 */
export type SubBeat = {
  time: string        // Tone.js time notation (e.g., "0:0:0", "0:0:2") 0 小節, 第 0 拍, 第 0 個十六分音符
  note: string        // C2:主拍(較重)、C1:次拍(較輕)、Rest:空拍
  label: string       // 顯示在介面上的標籤(e.g.、 "1", "e", "&", "a")
  isMain?: boolean    // 是否為主拍
  isRest?: boolean    // 是否為空拍
  enabled?: boolean   // 用於自定義模式
}

/**
 * 預設節奏模式
 */
export type Preset = {
  id: string
  name: string
  beats: SubBeat[]
  usePickup?: boolean // 是否使用 pickup beat
  isCustom?: boolean  // 是否為用戶自定義
}

/**
 * 測驗結果狀態
 */
export type QuizStatus = 'correct' | 'missed' | 'extra' | 'correct-silent'
