## Why

目前 Trainer 頁面（測驗模式/隨機考題/自訂模式三個分頁）視覺風格鬆散：沒有套用 Mantine 主題色彩與字級系統，三個分頁內的控制項（BPM、音效選擇、時間流動 checkbox）各自重複排列、缺乏卡片分組與一致留白，導致介面看起來凌亂且不專業。使用者反饋「介面醜到爆」，需要在不更動既有功能行為的前提下重新設計視覺呈現。

## What Changes

- 新增 Mantine 主題設定（`theme.ts`）：定義 primaryColor、字級層級、間距 token，套用到整個應用程式
- 將三個分頁中重複的控制項區塊（BPM 滑桿、音效選擇、時間流動顯示）改為使用 `Card` 包裝並統一視覺分組，取代目前鬆散的 `Group`/`Stack` 排列
- 統一三個分頁（測驗模式/隨機考題/自訂模式）的控制項排版結構與間距規則，避免目前各分頁排版不一致的狀況
- 調整 `BeatEditor` 拍點編輯器與 `QuizStatusPanel` 等元件的色彩、圓角、陰影樣式，使其符合新主題
- 不變更任何現有互動行為、狀態邏輯或音訊播放邏輯，純粹是視覺呈現層的調整

## Capabilities

### New Capabilities

- `trainer-visual-design`: Trainer 頁面的視覺設計規範，定義主題色彩、間距、卡片化排版與三個分頁的視覺一致性要求

### Modified Capabilities

(none)

## Impact

- Affected specs: `trainer-visual-design`（新增）
- Affected code:
  - New: src/theme.ts
  - Modified: src/pages/Trainer.tsx, src/components/BeatEditor.tsx, src/components/QuizStatusPanel.tsx, src/components/RandomQuestionGenerator.tsx, src/components/PresetManager.tsx, src/main.tsx
  - Removed: src/components/ControlPanel.tsx（已無使用者引用，視覺重構時一併清除死碼）
