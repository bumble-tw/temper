// src/components/BeatEditor.tsx
// 拍點編輯器組件

import { Paper, Group, Text } from '@mantine/core'
import type { SubBeat } from '../types/rhythm'
import type { QuizEvaluation } from '../types/quiz'
import type { QuizPhase } from '../types/quiz'
import { BeatIndicator } from './BeatIndicator'

export interface BeatEditorProps {
  customBeats: SubBeat[]
  currentBeatIndex: number | null
  currentTimeIndex: number | null
  showTimePositions: boolean[]
  isPlaying: boolean
  isQuizMode: boolean
  quizPhase: QuizPhase
  quizResult: QuizEvaluation | null
  onBeatToggle: (index: number) => void
}

export function BeatEditor({
  customBeats,
  currentBeatIndex,
  currentTimeIndex,
  showTimePositions,
  isPlaying: _isPlaying,
  isQuizMode: _isQuizMode,
  quizPhase,
  quizResult,
  onBeatToggle
}: BeatEditorProps) {
  return (
    <>
      {/* 視覺化與編輯區 */}
      <Paper p="md" withBorder bg="gray.0">
        {/* 主要節奏顯示區 - 序列檢視 */}
        <Group gap="xs" justify="center" style={{ maxWidth: '100%' }}>
          {customBeats.map((beat, index) => {
            const isBeatStart = index % 4 === 0

            // 獲取測驗結果狀態
            const quizStatus = quizPhase === 'result' && quizResult
              ? quizResult.beatEvaluations[index]?.status
              : null

            return (
              <div
                key={index}
                style={{ display: 'flex', alignItems: 'center' }}
                onClick={() => onBeatToggle(index)}
              >
                {index > 0 && index % 8 === 0 && <div style={{ width: 10 }} />}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {isBeatStart && <Text size="10px" c="dimmed" style={{ marginBottom: 2 }}>{Math.floor(index / 4) + 1}</Text>}
                  <BeatIndicator
                    isActive={currentBeatIndex === index}
                    isTimePlaying={currentTimeIndex === index && showTimePositions[index % 4]}
                    label={beat.label}
                    isMain={beat.isMain}
                    isRest={!beat.enabled}
                    quizStatus={quizStatus}
                  />
                </div>
              </div>
            )
          })}
        </Group>
      </Paper>
      {/* 底部說明 */}
      <Paper p="xs" bg="blue.0">
        <Text size="xs" ta="center" c="blue.8">
          點擊上方 1-8 拍的任意圓點來編輯節奏
        </Text>
      </Paper>
    </>
  )
}
