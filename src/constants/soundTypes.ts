// src/constants/soundTypes.ts
// 音效類型定義

export type SoundType = 'clap' | 'meow' | 'woodblock' | 'kick' | 'snare' | 'hihat' | 'cowbell' | 'tom'

export const SOUND_OPTIONS: Array<{ value: SoundType; label: string }> = [
  { value: 'clap', label: '掌聲 👏' },
  { value: 'meow', label: '貓咪 🐱' },
  { value: 'woodblock', label: '木魚 🪵' },
  { value: 'tom', label: '鼓 🥁' },
  { value: 'kick', label: '踢鼓 🦶' },
  { value: 'snare', label: '小鼓 🎵' },
  { value: 'hihat', label: '鈸 🔔' },
  { value: 'cowbell', label: '響板 🔕' }
]
