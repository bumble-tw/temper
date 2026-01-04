// src/components/PresetManager.tsx
// 預設節奏管理組件

import { Stack, Group, Select, Button, TextInput, Collapse, Paper, Text, Badge, Pagination } from '@mantine/core'
import type { Preset } from '../types/rhythm'
import { BUILT_IN_PRESETS } from '../constants/beats'
import { usePagination } from '../utils/usePagination'

export interface PresetManagerProps {
  customPresets: Preset[]
  selectedPresetId: string
  newPresetName: string
  showManagePresets: boolean
  isPlaying: boolean
  onLoadPreset: (presetId: string) => void
  onClearPattern: () => void
  onToggleManagePresets: () => void
  onSaveAsPreset: () => void
  onDeletePreset: (presetId: string) => void
  onNewPresetNameChange: (name: string) => void
}

export function PresetManager({
  customPresets,
  selectedPresetId,
  newPresetName,
  showManagePresets,
  isPlaying,
  onLoadPreset,
  onClearPattern,
  onToggleManagePresets,
  onSaveAsPreset,
  onDeletePreset,
  onNewPresetNameChange
}: PresetManagerProps) {
  // 使用分頁 Hook
  const {
    currentPage,
    totalPages,
    currentItems: currentPresets,
    setCurrentPage
  } = usePagination({
    items: customPresets,
    itemsPerPage: 5,
    initialPage: 1
  })

  return (
    <Stack gap="md">
      {/* 選擇預設 */}
      <Group justify="space-between" align="flex-end" wrap="wrap">
        <Select
          label="選擇預設考題"
          placeholder="選擇一個預設節奏"
          value={selectedPresetId}
          onChange={(value) => value && onLoadPreset(value)}
          data={[
            {
              group: '內建預設',
              items: BUILT_IN_PRESETS.map(p => ({ value: p.id, label: p.name }))
            },
            ...(customPresets.length > 0 ? [{
              group: '自定義預設',
              items: customPresets.map(p => ({ value: p.id, label: p.name }))
            }] : [])
          ]}
          disabled={isPlaying}
          style={{ flex: 1, minWidth: '200px' }}
          clearable
        />
        <Group gap="xs">
          <Button
            variant="light"
            color="gray"
            onClick={onClearPattern}
            disabled={isPlaying}
            size="sm"
          >
            清除
          </Button>
          {customPresets.length > 0 && (
            <Button
              variant="light"
              color="blue"
              onClick={onToggleManagePresets}
              size="sm"
            >
              管理預設 ({customPresets.length})
            </Button>
          )}
        </Group>
      </Group>

      {/* 管理預設區域 */}
      <Collapse in={showManagePresets}>
        <Paper p="md" withBorder bg="gray.0" mt="md">
          <Group justify="space-between" mb="sm">
            <Text size="sm" fw={600}>自定義預設列表</Text>
            <Text size="xs" c="dimmed">
              共 {customPresets.length} 個預設
            </Text>
          </Group>
          <Stack gap="xs">
            {currentPresets.map(preset => (
              <Group key={preset.id} justify="space-between" p="xs" style={{ borderRadius: '4px', backgroundColor: 'white' }}>
                <Group gap="sm">
                  <Badge color="blue" variant="light" size="sm">自定義</Badge>
                  <Text size="sm">{preset.name}</Text>
                </Group>
                <Group gap="xs">
                  <Button
                    variant="subtle"
                    color="blue"
                    size="xs"
                    onClick={() => {
                      onLoadPreset(preset.id)
                      onToggleManagePresets()
                    }}
                    disabled={isPlaying}
                  >
                    載入
                  </Button>
                  <Button
                    variant="subtle"
                    color="red"
                    size="xs"
                    onClick={() => onDeletePreset(preset.id)}
                    disabled={isPlaying}
                  >
                    刪除
                  </Button>
                </Group>
              </Group>
            ))}
          </Stack>
          {totalPages > 1 && (
            <Group justify="center" mt="md">
              <Pagination
                total={totalPages}
                value={currentPage}
                onChange={setCurrentPage}
                size="sm"
              />
            </Group>
          )}
        </Paper>
      </Collapse>

      {/* 儲存為新預設 */}
      <Group justify="space-between" align="flex-end" wrap="wrap">
        <TextInput
          label="儲存當前節奏為預設"
          placeholder="輸入預設名稱"
          value={newPresetName}
          onChange={(e) => onNewPresetNameChange(e.currentTarget.value)}
          disabled={isPlaying}
          style={{ flex: 1, minWidth: '200px' }}
        />
        <Button
          variant="filled"
          color="green"
          onClick={onSaveAsPreset}
          disabled={isPlaying || !newPresetName.trim()}
        >
          儲存
        </Button>
      </Group>
    </Stack>
  )
}
