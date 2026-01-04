// src/utils/beatGeneration.ts
// 隨機節奏生成工具

import type { SubBeat } from '../types/rhythm'

/**
 * 輔助函數：啟用指定位置的拍點
 */
export const enableBeat = (beats: SubBeat[], index: number) => {
  if (index < beats.length) {
    beats[index].enabled = true
    beats[index].note = beats[index].isMain ? 'C2' : 'C1'
    beats[index].isRest = false
  }
}

/**
 * 生成隨機考題（簡單難度）
 * 簡單：只有四分音符位置，有空拍，可能只有少數拍點
 */
export const generateEasyQuestion = (initialBeats: SubBeat[]): SubBeat[] => {
  const newBeats = JSON.parse(JSON.stringify(initialBeats)) as SubBeat[]

  // 8 個四分音符位置（每拍的第一個十六分音符）
  const quarterNotePositions = [0, 4, 8, 12, 16, 20, 24, 28]

  // 決定要啟用多少個拍點（1-6 個，偏向少數）
  const totalBeats = Math.floor(Math.random() * 6) + 1 // 1-6 個

  // 隨機選擇要啟用的位置
  const shuffled = [...quarterNotePositions].sort(() => Math.random() - 0.5)
  const selectedPositions = shuffled.slice(0, totalBeats)

  // 啟用選中的位置
  selectedPositions.forEach(pos => enableBeat(newBeats, pos))

  return newBeats
}

/**
 * 生成隨機考題（中等難度）
 * 中等：增加 'a' 拍，有空拍（不使用 '&' 拍）
 * 'a' 拍（ple）一定會連著四分音符，不會單獨出現
 */
export const generateMediumQuestion = (initialBeats: SubBeat[]): SubBeat[] => {
  const newBeats = JSON.parse(JSON.stringify(initialBeats)) as SubBeat[]

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

  return newBeats
}

/**
 * 生成隨機考題（困難難度）
 * 困難：使用 'e' 和 'a' 位置（不使用 '&' 拍），較密集的組合
 */
export const generateHardQuestion = (initialBeats: SubBeat[]): SubBeat[] => {
  const newBeats = JSON.parse(JSON.stringify(initialBeats)) as SubBeat[]

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

  return newBeats
}

/**
 * 生成隨機考題（地獄難度）
 * 地獄：極度密集，複雜切分音
 */
export const generateHellQuestion = (initialBeats: SubBeat[]): SubBeat[] => {
  const newBeats = JSON.parse(JSON.stringify(initialBeats)) as SubBeat[]

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

  return newBeats
}
