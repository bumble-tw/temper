// src/components/TabControlsCard.tsx
// 共用的分頁控制項卡片：BPM 滑桿、音效選擇、時間流動顯示，並可選擇顯示循環/倒數開關

import { Card, Stack, Text, Slider, Select, Checkbox, Group, Switch } from '@mantine/core'
import { SOUND_OPTIONS, type SoundType } from '../constants/soundTypes'

export interface TabControlsCardProps {
  bpm: number
  onBpmChange: (value: number) => void
  soundType: SoundType
  onSoundTypeChange: (type: SoundType) => void
  showTimePositions: boolean[]
  onToggleTimePosition: (index: number) => void
  isPlaying: boolean
  showLoopAndCountdown?: boolean
  loop?: boolean
  onToggleLoop?: (value: boolean) => void
  enableCountdown?: boolean
  onToggleCountdown?: (value: boolean) => void
}

export function TabControlsCard({
  bpm,
  onBpmChange,
  soundType,
  onSoundTypeChange,
  showTimePositions,
  onToggleTimePosition,
  isPlaying,
  showLoopAndCountdown = false,
  loop = false,
  onToggleLoop,
  enableCountdown = false,
  onToggleCountdown
}: TabControlsCardProps) {
  return (
    <Card withBorder shadow="sm" radius="md" p="md">
      <Stack gap="md">
        {showLoopAndCountdown && (
          <Group gap="lg">
            <Switch
              label="循環"
              checked={loop}
              onChange={(e) => onToggleLoop?.(e.currentTarget.checked)}
              disabled={isPlaying}
            />
            <Switch
              label="倒數"
              checked={enableCountdown}
              onChange={(e) => onToggleCountdown?.(e.currentTarget.checked)}
              disabled={isPlaying}
              color="blue"
            />
          </Group>
        )}
        <Stack gap={0}>
          <Text size="sm">BPM: {bpm}</Text>
          <Slider value={bpm} onChange={onBpmChange} min={60} max={200} disabled={isPlaying} />
        </Stack>
        <Stack gap={0}>
          <Select
            label="拍子音效"
            value={soundType}
            onChange={(value) => value && onSoundTypeChange(value as SoundType)}
            data={SOUND_OPTIONS}
            disabled={isPlaying}
            allowDeselect={false}
          />
        </Stack>
        <Stack gap={0}>
          <Text size="sm">時間流動顯示</Text>
          <Group gap="xs" mt={4} wrap="nowrap">
            <Checkbox
              label="1"
              checked={showTimePositions[0]}
              onChange={() => onToggleTimePosition(0)}
              size="xs"
            />
            <Checkbox
              label="e"
              checked={showTimePositions[1]}
              onChange={() => onToggleTimePosition(1)}
              size="xs"
            />
            <Checkbox
              label="&"
              checked={showTimePositions[2]}
              onChange={() => onToggleTimePosition(2)}
              size="xs"
            />
            <Checkbox
              label="a"
              checked={showTimePositions[3]}
              onChange={() => onToggleTimePosition(3)}
              size="xs"
            />
          </Group>
        </Stack>
      </Stack>
    </Card>
  )
}
