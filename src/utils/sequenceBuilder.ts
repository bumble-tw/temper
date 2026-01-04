// src/utils/sequenceBuilder.ts
// 節奏序列建構工具

import type { SubBeat } from '../App'

/**
 * 建立播放序列（只包含啟用的拍點）
 * @param customBeats 自定義拍點陣列
 * @returns 時間-拍點索引對應的事件陣列
 */
export const buildSequence = (customBeats: SubBeat[]): Array<[string, number]> => {
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

/**
 * 建立完整時間序列（所有拍點，用於顯示時間流動）
 * @param customBeats 自定義拍點陣列
 * @returns 時間-拍點索引對應的事件陣列
 */
export const buildTimeSequence = (customBeats: SubBeat[]): Array<[string, number]> => {
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
