## Context

`src/pages/Trainer.tsx` 目前用 Mantine 預設樣式（未設定自訂主題），三個分頁（測驗模式/隨機考題/自訂模式）各自重複寫了一份幾乎相同的控制項排版（BPM 滑桿、音效 Select、時間流動 Checkbox 群組），用 `Group`/`Stack` 鬆散排列，沒有卡片分組或視覺層級。`src/components/ControlPanel.tsx` 目前已無任何頁面引用，是先前重構留下的死碼。本次變更純粹是視覺層調整，不改變任何播放/測驗邏輯。

## Goals / Non-Goals

**Goals:**

- 建立一份集中管理的 Mantine 主題設定，取代目前完全依賴預設樣式的狀態
- 把三個分頁中重複的控制項排版抽成共用元件，並用卡片化排版呈現
- 統一三個分頁的視覺間距與分組規則
- 移除已無引用的 `ControlPanel.tsx`

**Non-Goals:**

- 不變更 BPM、音效、循環、倒數、測驗等任何互動邏輯或狀態管理方式
- 不引入新的 UI 框架或取代 Mantine
- 不調整音訊合成、Tone.js 排程或拍點資料結構

## Decisions

### 建立集中主題設定（theme.ts）

新增 `src/theme.ts`，使用 Mantine 的 `createTheme` 定義 `primaryColor`、字級層級（`headings`/`fontSizes`）與間距 token（`spacing`），並在 `src/main.tsx` 的 `MantineProvider` 套用。取代原本完全依賴 Mantine 預設值的作法，使色彩與間距有單一來源可調整。

### 抽出共用控制項元件（TabControlsCard）

新增 `src/components/TabControlsCard.tsx`，把目前在 `Trainer.tsx` 三個 `Tabs.Panel` 中重複的 BPM 滑桿、音效 Select、時間流動 Checkbox 群組整併為一個共用元件，並用 Mantine `Card` 包裝。三個分頁改為呼叫同一元件並傳入各自需要的 props（例如是否顯示循環/倒數開關），不再各自重複排版程式碼。

### 卡片化排版取代鬆散 Group/Stack

`Trainer.tsx` 中每個 `Tabs.Panel` 內的區塊（狀態指示器、控制項、拍點編輯器）改為各自包在 Mantine `Card`（`withBorder`, `shadow="sm"`, `radius="md"`）中，取代目前直接用 `Group`/`Stack`/`Divider` 平鋪的排版方式，建立明確的視覺分組。

### 移除死碼 ControlPanel.tsx

確認專案內已無任何檔案引用 `ControlPanel` 後，刪除 `src/components/ControlPanel.tsx`。

## Implementation Contract

**行為**：使用者開啟 `/trainer` 頁面時，三個分頁（測驗模式/隨機考題/自訂模式）呈現一致的卡片化排版與統一配色（依 `theme.ts` 的 `primaryColor`），每個功能區塊（狀態指示器、控制項、拍點編輯器）視覺上以獨立卡片呈現,具備邊框、圓角與陰影。所有現有互動（播放/停止、BPM 調整、音效切換、時間流動 checkbox、循環/倒數開關、測驗流程）行為與目前完全相同。

**介面/資料形狀**：
- `src/theme.ts` export 一個 Mantine `MantineThemeOverride`（或 `createTheme` 回傳值），由 `src/main.tsx` 的 `<MantineProvider theme={theme}>` 使用
- `TabControlsCard` 元件 props：`bpm: number`、`onBpmChange: (v: number) => void`、`soundType: SoundType`、`onSoundTypeChange: (v: SoundType) => void`、`showTimePositions: boolean[]`、`onToggleTimePosition: (i: number) => void`、`isPlaying: boolean`、`showLoopAndCountdown?: boolean`、`loop?: boolean`、`onToggleLoop?: (v: boolean) => void`、`enableCountdown?: boolean`、`onToggleCountdown?: (v: boolean) => void`

**失敗模式**：純前端展示元件，無新的錯誤狀態；既有的麥克風權限錯誤、LocalStorage 讀寫例外處理維持原樣不變動。

**驗收標準**：
- `npm run build`（含 tsc 型別檢查）通過
- `npm run lint` 不新增任何錯誤（與重構前的 lint 錯誤數相同或更少）
- 手動以 `npm run dev` 開啟 `/trainer`，確認三個分頁皆可正常切換、播放/停止、BPM 調整、音效切換、時間流動 checkbox、測驗模式倒數與評分流程皆與目前行為一致
- 全專案搜尋 `ControlPanel` 確認刪除後無殘留引用

**範圍邊界**：本次變更僅限 `src/theme.ts`、`src/main.tsx`、`src/pages/Trainer.tsx`、`src/components/TabControlsCard.tsx`（新增）、`src/components/BeatEditor.tsx`、`src/components/QuizStatusPanel.tsx`、`src/components/RandomQuestionGenerator.tsx`、`src/components/PresetManager.tsx` 的視覺呈現與排版，以及刪除 `src/components/ControlPanel.tsx`。不涉及 `audioDetection.ts`、`quizEvaluation.ts`、`quizStorage.ts`、`beatGeneration.ts`、`sequenceBuilder.ts` 等邏輯層檔案。

## Risks / Trade-offs

- [Risk] 抽出 `TabControlsCard` 共用元件可能在合併三個分頁的條件式 props（例如自訂模式不顯示循環/倒數開關）時引入邏輯誤差 → Mitigation：以 `showLoopAndCountdown` 等明確 boolean prop 控制顯示與否，並在每個分頁手動驗證一次
- [Risk] 調整主題色彩可能與既有的拍點編輯器狀態色（啟用/播放中/測驗評分顏色）衝突，造成對比不足 → Mitigation：維持 `BeatEditor` 既有的狀態色定義不變，僅調整外層卡片與背景色，不更動拍點圓圈本身的語意色彩
- [Risk] 刪除 `ControlPanel.tsx` 若有遺漏引用會造成建置失敗 → Mitigation：刪除前以全專案 grep 確認零引用，刪除後執行 `npm run build` 驗證
