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
          >
            簡單
          </Button>
          <Button
            variant="filled"
            color="yellow"
            onClick={onGenerateMedium}
            disabled={isPlaying}
            size="sm"
          >
            中等
          </Button>
          <Button
            variant="filled"
            color="orange"
            onClick={onGenerateHard}
            disabled={isPlaying}
            size="sm"
          >
            困難
          </Button>
          <Button
            variant="filled"
            color="red"
            onClick={onGenerateHell}
            disabled={isPlaying}
            size="sm"
          >
            地獄
          </Button>
        </Group>
        <Stack gap={4}>
          <Text size="xs" c="dimmed">
            <strong>簡單</strong>：只有四分音符，1-6 個拍點，無 Pickup Beat
          </Text>
          <Text size="xs" c="dimmed">
            <strong>中等</strong>：四分音符 + 'a' 拍（無 '&' 拍），'a' 拍必連著四分音符，50% 有 Pickup Beat
          </Text>
          <Text size="xs" c="dimmed">
            <strong>困難</strong>：四分音符 + 'e' + 'a' 位置（無 '&' 拍），複雜組合，75% 有 Pickup Beat
          </Text>
          <Text size="xs" c="dimmed">
            <strong>地獄</strong>：極密集節奏，複雜多音符組合，90% 有 Pickup Beat
          </Text>
        </Stack>
      </Stack>
    </Paper>
  )
}
