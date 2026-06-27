## 1. 建立集中主題設定（theme.ts）

- [x] 1.1 新增 `src/theme.ts`，使用 Mantine `createTheme` 定義 primaryColor、字級層級與間距 token，並在 `src/main.tsx` 的 `MantineProvider` 套用此主題，驗證方式：執行 `npm run dev` 開啟任一頁面，確認按鈕/Tabs 等元件顏色不再是 Mantine 預設藍色而是新設定的 primaryColor — 對應 Requirement: Centralized Mantine theme
- [x] 1.2 確認 `npm run build`（含 tsc 型別檢查）在套用主題後仍可成功通過，驗證方式：執行 `npm run build` 並確認 exit code 為 0

## 2. 抽出共用控制項元件（TabControlsCard）

- [x] 2.1 新增 `src/components/TabControlsCard.tsx`，將 BPM 滑桿、音效 Select、時間流動 Checkbox 群組整併為單一共用元件，並支援 `showLoopAndCountdown` 等 prop 控制循環/倒數開關是否顯示，驗證方式：在三個分頁分別呼叫此元件並於瀏覽器手動確認三個分頁的控制項排版、文字、間距完全一致 — 對應 Requirement: Shared control card across tabs
- [x] 2.2 將 `src/pages/Trainer.tsx` 三個 `Tabs.Panel`（測驗模式/隨機考題/自訂模式）中原本重複撰寫的控制項程式碼，改為呼叫 `TabControlsCard`，驗證方式：於瀏覽器切換到 自訂模式 與 隨機考題 分頁時可見循環與倒數開關，切換到 測驗模式 分頁時這兩個開關不顯示 — 對應 Scenario: Tab-specific control visibility

## 3. 卡片化排版取代鬆散 Group/Stack

- [x] 3.1 將 `Trainer.tsx` 每個 `Tabs.Panel` 內的功能區塊（狀態指示器、控制項、拍點編輯器、預設管理區、隨機考題生成器）改為各自包在 Mantine `Card`（`withBorder`、`shadow="sm"`、`radius="md"`）中，驗證方式：於瀏覽器檢視三個分頁，確認每個功能區塊皆有明顯邊框、圓角與陰影分隔 — 對應 Requirement: Card-based section layout on the Trainer page
- [x] 3.2 調整 `src/components/BeatEditor.tsx` 與 `src/components/QuizStatusPanel.tsx` 的外層容器樣式（背景色、圓角）以符合新主題，但保留拍點圓圈本身既有的啟用/播放中/測驗評分語意色彩不變，驗證方式：手動執行一次測驗模式流程，確認拍點顏色（綠/紅/黃/灰）與評分結果顯示邏輯與重構前一致

## 4. 行為一致性驗證

- [x] 4.1 手動驗證播放、BPM 調整、音效切換、時間流動 checkbox、循環/倒數開關、預設儲存/載入/刪除、隨機考題生成、測驗模式倒數與評分流程，皆與重構前行為一致，驗證方式：依序操作上述每一項功能並確認結果與重構前相同 — 對應 Requirement: Visual changes preserve existing interaction behavior
- [x] 4.2 執行 `npm run lint`，確認新增程式碼未引入超過重構前既有數量的 lint error/warning，驗證方式：比對重構前後 `npm run lint` 輸出的 error/warning 數量

## 5. 移除死碼 ControlPanel.tsx

- [x] 5.1 確認專案內已無任何檔案引用 `ControlPanel` 後刪除 `src/components/ControlPanel.tsx`，驗證方式：執行 `grep -rln "ControlPanel" src` 確認回傳空結果，並執行 `npm run build` 成功通過 — 對應 Requirement: Removal of unused ControlPanel component
