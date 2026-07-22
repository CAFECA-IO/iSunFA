# AI 圖表編輯器合併計畫 (MermaidAiModal × CustomChartAiModal)

> **Date**: 2026-07-21
> **Author**: Julian
> **Status**: Done（Phase 0–4 皆完成；僅 T4 wheel 監聽技術債續留追蹤。待人工 QA 驗收）
> **Scope**: `src/components/chart/mermaid_ai_modal.tsx` 與 `src/components/chart/custom_chart_ai_modal.tsx` 及其子元件的收斂

---

## 1. 目標與背景

兩個 AI 圖表編輯器目前是**平行實作**：`CustomChartAiModal` 當初刻意「以 MermaidAiModal 為藍本」開發，版面、Tab 結構、工具列 `ToolsSection` 介面（`{ selectedTool, setSelectedTool, chart, onAddAction }`）幾乎一致。維護兩份幾乎相同的版面與狀態機成本高，且未來每加一個共同功能（採用、中止、關閉警示、快捷鍵）都要改兩處。

先前曾嘗試「把自訂圖表以選填 props + variant 旗標塞進 MermaidAiModal」，結果不如預期而 revert。**本計畫的核心教訓**：不要用「optional props + 條件分支」硬拼，而是抽出一個**明確的 Adapter 介面**當接縫，讓 mermaid 與 custom 各自提供 adapter，共用同一顆通用 modal。

目標：**單一通用編輯器**（版面/狀態機/工具列/前後預覽/底部動作只有一份），差異全部收斂到 adapter。

---

## 2. 現況盤點

| 面向 | MermaidAiModal | CustomChartAiModal |
|---|---|---|
| 版面 | 兩欄：`MermaidAiControlPanel` + `MermaidAiPreviewPanel` | 兩欄（同版面，但目前寫在單一檔案內） |
| 左欄 Tab | 常用工具 / AI 指令 | 常用工具 / AI 指令（相同） |
| 標題編輯 | 有（title input + `CHANGE_TITLE` action） | 無 |
| 動作模型 | `IChartAction`（union）+ `applyChartAction(chartType, chart, action)` 分派器 | `IMatrixAction`（僅矩陣）+ `applyMatrixAction(raw, action)` |
| 工具覆蓋 | flowchart / pie / gantt / xychart / sankey | 僅 matrix（其餘顯示「開發中」佔位） |
| 前預覽 | mermaid SVG（async）／pie 走 `DonutChart`／`ZoomableSvgContainer` | `CustomChartCanvas`（同步 SVG） |
| 後預覽 | `useMermaidRender` + 渲染錯誤處理 | `CustomChartCanvas`（套用 pendingActions 後） |
| 產生 | 真後端 `/api/v1/admin/pdf_editor/mermaid_modify` | mock（模擬思考後回報開發中） |
| 中止 / 採用 | 有 `onAbort` / `onAdopt` | 無（mock，尚未接） |
| 關閉警示 | `ConfirmModal`（isDirty 時） | 無 |
| i18n | `chart.mermaid.ai_editor.*` | `chart.custom_chart.*` |
| chartType | `MermaidChartType` | `CustomChartType` |

**已對齊、可直接共用的部分**：兩欄版面與 CSS、Tab 結構、`ToolsSection` 介面、pendingActions 暫存清單 + 移除、AI 指令輸入 + 範例區、預覽排版 ROW/COLUMN 切換、mock/generating/notice 狀態機骨架。

---

## 3. 差異軸（要被 adapter 吸收的東西）

1. **動作模型與套用引擎**：`applyChartAction(type,…)` vs `applyMatrixAction(…)`。需統一為 `applyAction(chart, action)` 的形狀（type 由 adapter 綁定）。
2. **前後預覽渲染**：mermaid（async + pie + zoom + 錯誤態）vs custom（同步 canvas）。統一為 `renderPreview(chart) => ReactNode`。
3. **產生流程**：真後端 vs mock。統一為 `generate(base, instruction, signal) => Promise<string>`。
4. **標題**：mermaid 有 title 編輯，custom 無。以 adapter 選填 `getTitle` / `buildTitleAction` 表達。
5. **工具列內容**：各 chartType 的 `ToolsSection`。以 adapter `renderTools?()` 提供；未提供 → 只顯示 AI 指令。
6. **文案 / i18n / 範例**：以 adapter 提供 t-key 前綴或 labels 物件 + `examples`。
7. **chartType 型別**：`MermaidChartType | CustomChartType`。用泛型 `TAction` + adapter 綁定，避免聯集滲透到通用元件。

---

## 4. 設計方案：Adapter 化通用編輯器

單一通用元件 `AiChartEditorModal<TAction>`，行為完全由注入的 `IChartEditorAdapter<TAction>` 決定。

```ts
// src/interfaces/ai_chart_editor.ts（新增）
export interface IChartEditorAdapter<TAction extends { id: string; type: string; description: string }> {
  // 識別與文案
  headerTitle: string;                 // 已由呼叫端 t() 取好的字串
  headerSubtitle: string;              // 例："custom-matrix · 交易金額分布"
  isMock?: boolean;                    // 顯示 Mock 徽章、隱藏真實產生行為

  // 左欄工具（未提供 → 只顯示 AI 指令）
  renderTools?: (ctx: {
    chart: string;
    selectedTool: string | null;
    setSelectedTool: (v: string | null) => void;
    onAddAction: (a: TAction) => void;
  }) => ReactNode;

  // 標題（選填）
  getTitle?: (chart: string) => string;
  buildTitleAction?: (title: string) => TAction;

  // 決定論套用引擎
  applyAction: (chart: string, action: TAction) => string;

  // 前後預覽（兩側共用同一函式）
  renderPreview: (chart: string) => ReactNode;

  // 產生（真後端 or mock）
  generate: (baseChart: string, instruction: string, signal: AbortSignal) => Promise<string>;

  // 指令範例
  examples: string[];
}
```

通用 modal 只擁有**狀態機**（`internalBaseChart`、`pendingActions`、`aiInstruction`、`isGenerating`、`apiError`、`previewDirective`、`isDirty`、關閉警示）與**版面**，所有分歧走 adapter。

兩個 adapter 工廠：

- `createMermaidEditorAdapter({ chartType, svgStr, parsedPieData })`：`applyAction = (c,a)=>applyChartAction(chartType,c,a)`；`renderPreview` = 現有 mermaid 預覽（含 pie/zoom/async 錯誤態）；`generate` = 打後端；`renderTools` = 現有工具分派；`getTitle/buildTitleAction` = `getChartTitle` / `CHANGE_TITLE`。
- `createCustomEditorAdapter({ chartType })`：`applyAction = applyCustomChartAction(chartType, …)`（新的分派器，內部對 matrix 走 `applyMatrixAction`，其餘待補）；`renderPreview = (c)=><CustomChartCanvas type raw={c}/>`；`generate = mockGenerate`（`isMock: true`）；`renderTools` = matrix 有、其餘無。

> 關鍵：**mermaid 的 async 預覽**與 **custom 的同步預覽**都被 `renderPreview(chart)=>ReactNode` 這一個介面吃掉——mermaid 版回傳一個內部自帶 `useMermaidRender` 的小元件即可，通用 modal 不需要知道差異。

---

## 5. 目標檔案結構

```
src/components/chart/ai_chart_editor/
  ai_chart_editor_modal.tsx        // 通用 modal（狀態機 + 版面）
  ai_chart_editor_control_panel.tsx// 左欄（Tab：工具 / AI 指令；工具由 adapter.renderTools）
  ai_chart_editor_preview_panel.tsx// 右欄（前後對比 + ROW/COLUMN + 產生/中止/採用）
  adapters/
    mermaid_editor_adapter.tsx
    custom_editor_adapter.tsx
src/interfaces/ai_chart_editor.ts  // IChartEditorAdapter
src/lib/utils/custom_chart_editor.ts // applyCustomChartAction 分派器（含 matrix，後續補其餘）
```

`mermaid_ai_modal.tsx` / `custom_chart_ai_modal.tsx` 收斂為薄包裝（或直接由 consumer 改用通用 modal + adapter 後移除）。既有 `MermaidAiControlPanel`/`MermaidAiPreviewPanel`/`matrix_tools_submenu`/`custom_matrix_editor` 等**保留**，被 adapter 引用。

---

## 6. 分階段實作（低風險、每階段可獨立驗證）

**Phase 0 — 對齊前置（不改行為）✅ 完成 (2026-07-21)**
- ✅ 確認 action 形狀最小介面：`IChartAction`（mermaid）與 `IMatrixAction`（custom）皆有 `id / type / description`，相容。
- ✅ enum 集中至 `src/constants/`：`ExportFileName` → `custom_chart.ts` 的 `CustomChartExportName`；`PreviewDirective` → 新增 `src/constants/chart_ui.ts`，並讓 `custom_chart_ai_modal` 與 `mermaid_ai_preview_panel` 共用（移除兩處本地重複定義）。原 T2 ToDo 已清除。
- ✅ i18n 策略定案：採方案 A（見 §8）。

**Phase 1 — 抽出通用元件，先只遷移 mermaid ✅ 完成 (2026-07-21)**
- ✅ 新增 `src/interfaces/ai_chart_editor.ts`（`IChartEditorAdapter` + control/preview context + close-warning）。
- ✅ 新增 `src/components/chart/ai_chart_editor/ai_chart_editor_modal.tsx`（通用狀態機 + 兩欄外殼 + ConfirmModal），忠實複製原 `MermaidAiModal` 狀態機，差異全走 adapter。
- ✅ 新增 `adapters/mermaid_editor_adapter.tsx`：`applyAction`=`applyChartAction(chartType,…)`、`ControlPanel`/`PreviewPanel` 包**既有** `MermaidAiControlPanel`/`MermaidAiPreviewPanel`（不重寫 → 零回歸）、`generate`=後端、`buildTitleAction`/`getTitle`=`CHANGE_TITLE`/`getChartTitle`。
- ✅ adapter 面板以 **component**（`ControlPanel`/`PreviewPanel`，非 render 函式）暴露，並在通用 modal 以 JSX element 渲染；避免把讀取 `abortControllerRef` 的 handler 傳入「render 期間呼叫的函式」而觸發 `react-hooks/refs` 誤判（已 `eslint` 驗證通過）。
- ✅ `MermaidAiModal` 改為薄包裝（建 adapter → 渲染 `AiChartEditorModal`），對外 API 不變，`MermaidChart` 未改動。
- ⚠️ 唯一行為差異：產生失敗改由 adapter `generate` throw → 通用 catch 顯示同一訊息（多一行 console.error），可忽略。
- 待人工 QA：mermaid 五種圖工具、標題、產生（成功/失敗/中止）、採用、關閉警示、pie、渲染錯誤，皆應與原本一致。
- 註：z-index（T3）刻意**不動**（維持 `z-8888`），避免影響 ConfirmModal 疊放而破壞零回歸；T3 另案處理（見 §12）。
- **驗收：mermaid 編輯器行為與外觀零回歸**（工具、標題、產生、中止、採用、關閉警示、pie、渲染錯誤）。這是最高風險關卡，先過。

**Phase 2 — 遷移 custom ✅ 完成 (2026-07-21)**
- ✅ 新增 `src/lib/utils/custom_chart_editor.ts`：`applyCustomChartAction` 分派器（matrix→`applyMatrixAction`，其餘原樣返回）。
- ✅ 抽出 `custom_editor_control_panel.tsx` / `custom_editor_preview_panel.tsx`（自各自的 i18n `chart.custom_chart.*`；矩陣圖工具沿用 `MatrixToolsSection`）。
- ✅ 新增 `adapters/custom_editor_adapter.tsx`：`isMock`、`applyAction`、`getTitle`（由 DSL 解析）、mock `generate`（honor abort signal）、closeWarning 沿用 mermaid key。
- ✅ `CustomChart` 改用 `AiChartEditorModal` + custom adapter，並加本地 `currentRaw` 狀態，`onAdopt` 提交編輯（矩陣工具現可實際套用→預覽→採用）。
- ✅ 刪除 `custom_chart_ai_modal.tsx`；新增 i18n key `applied_changes` / `stop_generating` / `adopt`（五語系）。原 T1 ToDo 由 adapter `isMock` 承接。
- 待人工 QA：四類型開啟編輯器、矩陣六工具的預覽/採用、mock 產生提示、關閉警示、下載/全螢幕不受影響。

**Phase 3 — 收斂子元件 ✅ 完成 (2026-07-21)**
- ✅ 新增 `ai_chart_editor/chart_editor_control_shell.tsx`：共用左欄外殼（header + Mock 徽章、兩分頁、暫存動作清單、AI 指令輸入 + 提示）；差異以 `titleSlot`/`toolsSlot` + label props 注入。
- ✅ 新增 `ai_chart_editor/chart_editor_preview_shell.tsx`：共用右欄外殼（header + ROW/COLUMN 切換、前後對照框、底部動作列）；前後內容以 `before`/`after` slot 注入，`canAdopt` 控制採用鈕。
- ✅ `MermaidAiControlPanel` / `MermaidAiPreviewPanel` / `CustomEditorControlPanel` / `CustomEditorPreviewPanel` 全改為薄包裝：各自保留圖表別邏輯（mermaid 的 `useMermaidRender`/`ZoomableSvgContainer`/pie/render-error、custom 的 `CustomChartCanvas`）於 slot，共用 chrome 收斂到兩個 shell。
- 細節統一（對 mermaid 幾乎無感）：預覽 `min-h` 220、切換鈕 `text-red-400`、清掉 cancel 的 `enable:` typo class；產生鈕 icon 一律 `Sparkles`（custom 原 `Send` → `Sparkles`）。
- ✅ `tsc` + `eslint` 通過（含補上 shell 選填 props 的 default 值以符合 `react/require-default-props`）。
- 待人工 QA：mermaid 五類型工具/標題/產生/採用/pie/縮放/渲染錯誤，custom 四類型 + 矩陣工具，兩者版面與改動前一致。

**Phase 4 — 清理 ✅ 完成 (2026-07-21)**
- ✅ **T3 z-index**：`ChartShell` 於 `handleOpenAiModal` 開 AI 前先 `setIsFullscreen(false)`，避免全螢幕 backdrop（`z-9999`）蓋住 Modal（`z-8888`）；移除該 ToDo 註解。
- ✅ **T1（最終定案：不 gate Sparkles）**：先前一度以 `CUSTOM_CHART_AI_ENABLED` 隱整個自訂編輯器，後依產品決策**改回不 gate**——自訂圖表 Sparkles 恆顯示、編輯器恆掛載（旗標常數已移除）。改以「無常用工具時只顯示 AI 指令」處理未完成度（見下）。`ChartShell.openAiModal` 維持選填（未提供才不顯示按鈕）。
- ✅ **控制台無工具模式**：`ChartEditorControlShell` 新增 `hasTools`；為 `false` 時去掉「常用工具 / AI 指令」分頁，左欄只顯示 AI 指令。custom `hasTools = isMatrix || isTornado`（histogram/boxplot 目前無工具 → 只顯示 AI 指令）；mermaid `hasTools = isShowTools`。
- ✅ 死碼檢查：四個自訂編輯器模組 + canvas 皆仍被引用（旗標關閉是條件掛載，非死碼），無檔案可刪。
- ✅ 文件更新：本計畫狀態、§11 決策點、§12 ToDo 表。
- 🟡 **T4（`ChartShell` 每實例各綁 window wheel 監聽）**：與本合併弱相關，未處理，續留 ToDo 追蹤（見 §12-T4）。
- 待人工 QA：確認自訂圖表在旗標關閉下不顯示 AI 入口；mermaid 全螢幕點 AI 會正確退出全螢幕並開啟編輯器。

> 每個 Phase 結束皆以 scoped `tsc`（+ 可用時 `eslint`）+ 人工 QA 檢查表驗證；各 Phase 可獨立合併、可回退。

---

## 7. 風險與緩解

- **mermaid 回歸**（最高風險）：async 預覽、pie→DonutChart、zoom、渲染錯誤態、abort、後端產生、標題動作、關閉警示。→ Phase 1 先遷 mermaid 且**要求零行為差異**，附人工 QA 檢查表；adapter 的 `renderPreview` 直接沿用現有 mermaid 預覽元件，不重寫。
- **型別滲透**：`MermaidChartType | CustomChartType` 若流入通用元件會很髒。→ 用泛型 `TAction` + adapter 封裝，通用元件**只認 `string` chart 與 `TAction`**，不認 chartType 聯集。
- **mock 進生產**：custom 的產生與多數工具尚未實作。→ 沿用現有 ToDo：以 feature flag 隱藏 mock 的「產生」與未完成工具，adapter `isMock` 控制徽章與行為。
- **i18n 分歧**：兩套 key 命名不同。→ 見 §8，先保留兩套、由 adapter 提供已 `t()` 過的字串，不在通用元件內硬編 key。
- **範圍蔓延**：不要在合併時順手補齊 tornado/histogram/boxplot 工具。→ 合併只搬移現有能力；新工具是**合併後**的獨立工作。
- **堆疊順序（z-index）**：`ChartShell` 全螢幕 backdrop 為 `z-9999`，高於 AI Modal 的 `z-8888`；全螢幕下開 AI 助手會被 backdrop 蓋住（見 §12-T3）。→ 合併後由通用 modal 統一 z-index（需 > 全螢幕 backdrop），並納入人工 QA。

---

## 8. i18n 策略（已決議：採方案 A）

- **A（採用，低風險）**：通用元件不持有 t-key；adapter 傳入「已翻譯字串」（headerTitle、labels、examples…）。mermaid 用 `chart.mermaid.ai_editor.*`、custom 用 `chart.custom_chart.*`，兩套 key 維持不動。
- **B（不採用，較乾淨但較大動）**：新增共用命名空間 `chart.ai_editor.*`，兩者共用；需搬移既有 key 與所有語系檔，回歸面較大。留作日後選項。

---

## 9. 驗證策略

- **決定論單元測試**：`applyCustomChartAction`（matrix 現有行為）與 `applyChartAction` 的 apply 結果不因重構而變（可對既有 DSL 做 snapshot 比對）。
- **scoped `tsc`**：每階段對受影響檔案型別檢查（沙箱可跑；Jest/ESLint 不行）。
- **人工 QA 檢查表**（無法自動化的互動）：
  - mermaid：五種圖工具、標題編輯、產生（成功/失敗/中止）、採用、關閉警示、pie 預覽、渲染錯誤態。
  - custom：matrix 六種工具即時預覽、ROW/COLUMN 切換、前後對比、mock 產生提示、下載/全螢幕不受影響。

---

## 10. 建議順序與工作量

Phase 0（半天）→ Phase 1（1–1.5 天，含 mermaid QA）→ Phase 2（0.5–1 天）→ Phase 3（1 天，選做，可延後）→ Phase 4（0.5 天）。

Phase 1、2 完成即達成「單一通用 modal + 兩 adapter」的主要目標；Phase 3 是進一步消除左右欄重複，可視情況延後。

---

## 11. 決策點（皆已定案）

1. ✅ i18n 採 **A**（保留兩套 key、adapter 傳已翻譯字串）。
2. ✅ 遷移後：`custom_chart_ai_modal.tsx` **刪除**；`mermaid_ai_modal.tsx` 保留為**薄包裝**（對外 API 不變）。
3. ✅ **納入 Phase 3**（收斂 control/preview 子元件為兩個 shell）——已完成。
4. ✅ mock 產生**不以 feature flag 隱藏**（最終定案）：Sparkles 恆顯示；改以「無常用工具時左欄只顯示 AI 指令、去分頁」處理未完成度。旗標常數已移除。

---

## 12. 現有程式碼內 ToDo 納管

合併時一併處理散落在圖表區的 `// ToDo:` 註解，避免另開清理循環。每項對應處置階段如下（處理後即移除原註解）：

| # | 位置 | 內容摘要 | 與合併關係 | 處置 |
|---|---|---|---|---|
| T1 | ~~`custom_chart_ai_modal.tsx:56`~~（檔案已刪，改由 custom adapter） | 本 Modal 為 mock：「產生」為佔位，串接後端前以 feature flag 隱藏 | 直接相關：合併後由 adapter `isMock` 承接 | ✅ **最終定案：不 gate**。曾以 `CUSTOM_CHART_AI_ENABLED` 隱整個編輯器，後依產品決策改回不 gate（Sparkles 恆顯示、常數已移除）。未完成度改以「無工具時只顯示 AI 指令」呈現；adapter `isMock` 仍顯示 Mock 徽章。 |
| T2 | `custom_chart.tsx:18` (Luphia) | switch 分派用的 `ExportFileName`（及 `PreviewDirective`）enum 宜集中至 `src/constants/` | 間接：屬圖表區規範債 | ✅ **Phase 0 完成**：`ExportFileName`→`custom_chart.ts` 的 `CustomChartExportName`；`PreviewDirective`→新 `chart_ui.ts`（mermaid/custom 共用）。ToDo 已移除。 |
| T3 | `chart_shell.tsx` (Luphia) | 全螢幕 backdrop `z-9999` 高於 AI Modal `z-8888`，全螢幕下點 AI 助手被蓋住 | 直接相關：合併後通用 modal 的 z-index 一致性 | ✅ **Phase 4 完成**：`ChartShell.handleOpenAiModal` 於開 AI 前 `setIsFullscreen(false)`，避免疊放衝突；ToDo 已移除。 |
| T4 | `chart_shell.tsx:74` (Luphia) | 每個 `ChartShell` 各自綁 `window` wheel 監聽，多圖表報告頁會有 N 個 handler | 相鄰技術債（非合併必需） | 🟡 **未處理（保留 ToDo）**：與本合併弱相關，未在 Phase 4 動；日後改綁 viewport 或共用單一監聽時再處理。 |

註：T1、T2、T3 已於各 Phase 完成；T4 屬 `ChartShell` 效能債，與本合併弱相關，續留原 ToDo 追蹤。
