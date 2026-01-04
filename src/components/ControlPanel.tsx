// src/components/ControlPanel.tsx
// 控制面板組件

import { Group, Button, Switch, Stack, Text, Slider, Checkbox, Select } from '@mantine/core'
import { SOUND_OPTIONS, type SoundType } from '../constants/soundTypes'

export interface ControlPanelProps {
  isPlaying: boolean
  isQuizMode: boolean
  loop: boolean
  bpm: number
  showTimePositions: boolean[]
  enableCountdown: boolean
  soundType: SoundType
  onToggleQuizMode: (checked: boolean) => void
  onToggleLoop: (checked: boolean) => void
  onBpmChange: (value: number) => void
  onToggleTimePosition: (index: number) => void
  onToggleCountdown: (checked: boolean) => void
  onSoundTypeChange: (type: SoundType) => void
}

export function ControlPanel({
  isPlaying,
  isQuizMode,
  loop,
  bpm,
  showTimePositions,
  enableCountdown,
  soundType,
  onToggleQuizMode,
  onToggleLoop,
  onBpmChange,
  onToggleTimePosition,
  onToggleCountdown,
  onSoundTypeChange
}: ControlPanelProps) {
  return (
    <Group justify="space-between" align="flex-start" wrap="wrap">
      <Group gap="lg">
        <Switch
          label="循環"
          checked={loop}
          onChange={(e) => onToggleLoop(e.currentTarget.checked)}
          disabled={isPlaying || isQuizMode}
        />
        <Switch
          label="測驗模式"
          checked={isQuizMode}
          onChange={(e) => onToggleQuizMode(e.currentTarget.checked)}
          disabled={isPlaying}
          color="orange"
        />
        <Switch
          label="倒數"
          checked={enableCountdown}
          onChange={(e) => onToggleCountdown(e.currentTarget.checked)}
          disabled={isPlaying}
          color="blue"
        />
      </Group>
      <Stack gap="md" style={{ flex: 1, minWidth: '250px' }}>
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
          <Group gap="xs" mt={4}>
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
          <Text size="xs" c="dimmed" mt={4}>選擇時間流動要顯示的拍點位置</Text>
        </Stack>
      </Stack>
    </Group>
  )
}
