// src/components/QuizStatusPanel.tsx
// 測驗狀態顯示面板

import { Paper, Stack, Group, Badge, Text, Divider, Button, Loader } from '@mantine/core'
import type { QuizPhase, QuizEvaluation } from '../types/quiz'

export interface QuizStatusPanelProps {
  quizPhase: QuizPhase
  quizResult: QuizEvaluation | null
  onRetry: () => void
}

export function QuizStatusPanel({ quizPhase, quizResult, onRetry }: QuizStatusPanelProps) {
  return (
    <Paper p="md" withBorder bg={
      quizPhase === 'idle' ? 'gray.0' :
      quizPhase === 'playing' ? 'blue.0' :
      quizPhase === 'recording' ? 'orange.1' :
      quizPhase === 'evaluating' ? 'yellow.0' :
      'green.0'
    }>
      <Stack gap="md">
        <Group justify="space-between">
          <Badge size="lg" color={
            quizPhase === 'idle' ? 'gray' :
            quizPhase === 'playing' ? 'blue' :
            quizPhase === 'recording' ? 'orange' :
            quizPhase === 'evaluating' ? 'yellow' :
            'green'
          }>
            {
              quizPhase === 'idle' ? '待機' :
              quizPhase === 'playing' ? '播放階段' :
              quizPhase === 'recording' ? '錄音階段' :
              quizPhase === 'evaluating' ? '評分中...' :
              '測驗完成'
            }
          </Badge>
          {quizPhase === 'playing' && <Text size="sm">聆聽節奏...</Text>}
          {quizPhase === 'recording' && (
            <Group>
              <Text size="sm" fw={600}>請拍掌！</Text>
              <Loader size="sm" />
            </Group>
          )}
          {quizPhase === 'result' && quizResult && (
            <Text size="sm" fw={600}>
              準確度: {quizResult.accuracy.toFixed(1)}%
            </Text>
          )}
        </Group>

        {/* 測驗結果詳細 */}
        {quizPhase === 'result' && quizResult && (
          <Stack gap="xs">
            <Divider />
            <Group gap="lg" justify="space-around">
              <Stack gap={4} align="center">
                <Text size="xs" c="dimmed">正確</Text>
                <Badge color="green" size="lg">{quizResult.correctCount}</Badge>
              </Stack>
              <Stack gap={4} align="center">
                <Text size="xs" c="dimmed">遺漏</Text>
                <Badge color="red" size="lg">{quizResult.missedCount}</Badge>
              </Stack>
              <Stack gap={4} align="center">
                <Text size="xs" c="dimmed">多餘</Text>
                <Badge color="yellow" size="lg">{quizResult.extraCount}</Badge>
              </Stack>
              <Stack gap={4} align="center">
                <Text size="xs" c="dimmed">平均誤差</Text>
                <Badge color="blue" size="lg">{quizResult.averageTimingError}ms</Badge>
              </Stack>
            </Group>
            <Group justify="center" mt="sm">
              <Button
                variant="filled"
                color="orange"
                onClick={onRetry}
              >
                再測驗一次
              </Button>
            </Group>
          </Stack>
        )}
      </Stack>
    </Paper>
  )
}
