// src/components/ControlPanel.tsx
// 控制面板組件

import { Group, Button, Switch, Stack, Text, Slider, Checkbox } from '@mantine/core'

export interface ControlPanelProps {
  isPlaying: boolean
  isQuizMode: boolean
  loop: boolean
  bpm: number
  volume: number
  showTimePositions: boolean[]
  enableCountdown: boolean
  landscapeMode: boolean
  onTogglePlay: () => void
  onToggleQuizMode: (checked: boolean) => void
  onToggleLoop: (checked: boolean) => void
  onBpmChange: (value: number) => void
  onVolumeChange: (value: number) => void
  onToggleTimePosition: (index: number) => void
  onToggleCountdown: (checked: boolean) => void
  onToggleLandscape: (checked: boolean) => void
}

export function ControlPanel({
  isPlaying,
  isQuizMode,
  loop,
  bpm,
  volume,
  showTimePositions,
  enableCountdown,
  landscapeMode,
  onTogglePlay,
  onToggleQuizMode,
  onToggleLoop,
  onBpmChange,
  onVolumeChange,
  onToggleTimePosition,
  onToggleCountdown,
  onToggleLandscape
}: ControlPanelProps) {
  return (
    <Group justify="space-between" align="flex-start" wrap="wrap">
      <Group gap="lg">
        <Button color={isPlaying ? "red" : "green"} onClick={onTogglePlay} size="lg">
          {isPlaying ? "停止" : (isQuizMode ? "開始測驗" : "開始")}
        </Button>
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
        <Switch
          label="橫向模式"
          checked={landscapeMode}
          onChange={(e) => onToggleLandscape(e.currentTarget.checked)}
          disabled={isPlaying}
          color="violet"
        />
      </Group>
      <Stack gap="md" style={{ flex: 1, minWidth: '250px' }}>
        <Stack gap={0}>
          <Text size="sm">BPM: {bpm}</Text>
          <Slider value={bpm} onChange={onBpmChange} min={60} max={200} disabled={isPlaying} />
        </Stack>
        <Stack gap={0}>
          <Text size="sm">音量: {volume} dB</Text>
          <Slider
            value={volume}
            onChange={onVolumeChange}
            min={-30}
            max={0}
            step={1}
            marks={[
              { value: -30, label: '小' },
              { value: -15, label: '中' },
              { value: 0, label: '大' }
            ]}
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
              label="."
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
              label="."
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
