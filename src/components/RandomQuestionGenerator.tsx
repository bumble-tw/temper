// src/components/RandomQuestionGenerator.tsx
// 隨機考題生成器組件

import { Paper, Stack, Text, Group, Button } from '@mantine/core'

export interface RandomQuestionGeneratorProps {
  isPlaying: boolean
  onGenerateEasy: () => void
  onGenerateMedium: () => void
  onGenerateHard: () => void
  onGenerateHell: () => void
}

export function RandomQuestionGenerator({
  isPlaying,
  onGenerateEasy,
  onGenerateMedium,
  onGenerateHard,
  onGenerateHell
}: RandomQuestionGeneratorProps) {
  return (
    <Paper p="md" withBorder bg="orange.0">
      <Stack gap="md">
        <Text size="sm" fw={600} c="orange.8">隨機考題生成器</Text>
        <Group gap="md" wrap="wrap">
          <Button
            variant="filled"
            color="green"
            onClick={onGenerateEasy}
            disabled={isPlaying}
            size="sm"
            style={{ width: '60px', padding: '4px 8px' }}
          >
            簡單
          </Button>
          <Button
            variant="filled"
            color="yellow"
            onClick={onGenerateMedium}
            disabled={isPlaying}
            size="sm"
            style={{ width: '60px', padding: '4px 8px' }}
          >
            中等
          </Button>
          <Button
            variant="filled"
            color="orange"
            onClick={onGenerateHard}
            disabled={isPlaying}
            size="sm"
            style={{ width: '60px', padding: '4px 8px' }}
          >
            困難
          </Button>
          <Button
            variant="filled"
            color="red"
            onClick={onGenerateHell}
            disabled={isPlaying}
            size="sm"
            style={{ width: '60px', padding: '4px 8px' }}
          >
            地獄
          </Button>
        </Group>
      </Stack>
    </Paper>
  )
}
