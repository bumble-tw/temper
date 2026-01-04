// src/components/BeatIndicator.tsx
// 視覺指示燈組件 - 支援主拍與子拍的差異顯示

import type { QuizStatus } from '../types/rhythm'

export interface BeatIndicatorProps {
  isActive: boolean
  isTimePlaying?: boolean
  label: string
  isMain?: boolean
  isRest?: boolean
  quizStatus?: QuizStatus | null
}

export function BeatIndicator({
  isActive,
  isTimePlaying = false,
  label,
  isMain = true,
  isRest = false,
  quizStatus = null
}: BeatIndicatorProps) {
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
