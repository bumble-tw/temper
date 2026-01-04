// src/constants/beats.ts
// 節奏相關的常量定義

import type { SubBeat, Preset } from '../types/rhythm'

/**
 * 總拍點數：8 拍（每拍四個十六分音符，共 32 個拍點)
 */
export const TOTAL_BEAT_COUNT = 32

/**
 * LocalStorage 鍵值
 */
export const CUSTOM_PRESETS_KEY = 'rhythm-trainer-custom-presets'

/**
 * 初始32拍點陣列
 */
export const INITIAL_CUSTOM_BEATS: SubBeat[] = Array.from({ length: TOTAL_BEAT_COUNT }).map((_, index) => {
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

/**
 * 創建預設節奏的輔助函數
 */
export const createBeatsFromIndices = (indices: number[]): SubBeat[] => {
  const beats = JSON.parse(JSON.stringify(INITIAL_CUSTOM_BEATS)) as SubBeat[]
  indices.forEach(index => {
    beats[index].enabled = true
    beats[index].note = beats[index].isMain ? 'C2' : 'C1'
    beats[index].isRest = false
  })
  return beats
}

/**
 * 固定預設考題
 */
export const BUILT_IN_PRESETS: Preset[] = [
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
