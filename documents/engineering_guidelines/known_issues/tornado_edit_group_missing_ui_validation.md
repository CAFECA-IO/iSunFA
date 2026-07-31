# 🐛 已知缺陷：龍捲風圖「編輯數列分組」缺少 UI 層驗證，數列名含分隔符時靜默半套失敗

- 版本：v1.0（2026-07-31，Julian）
- 狀態：**Open — 未修復**
- 嚴重度：低—中（觸發條件罕見，但屬使用者可見的靜默失敗，且對既有內容有功能回歸）
- 發現脈絡：PR #6585（龍捲風圖標題列配對分隔符文法）第二輪 review

---

## 摘要

PR #6585 導入新標題列文法 `左數列 <-> 右數列` 後，數列名稱本身**不得含配對分隔符**（`<->` / `↔`），否則會串成無法 round-trip 的字串。該 PR 已於 `custom_tornado_editor.ts` 的 `EDIT_GROUP` 套用路徑加上邊界防護，資料層面正確。

但 **UI 層完全沒有對應驗證**，導致使用者輸入這類名稱時：動作照常送出、清單上顯示「已改名」、套用後顏色生效但名稱沒變，**全程無任何錯誤提示**。

---

## 完整路徑

**1. UI 未擋** — `src/components/chart/tornado_tools_submenu.tsx`（`EditGroupPanel`）

```typescript
const isSubmitDisabled =
  leftTitleInput.trim() === "" ||
  rightTitleInput.trim() === "" ||
  isUnchanged;
```

只檢查「非空」與「有變更」，未檢查是否含分隔符。

**2. 動作描述誤導使用者** — 同檔 `handleSubmit`

```typescript
description: t(`${TORNADO_I18N_PREFIX}.action_edit_group`, {
  left: leftTitleInput.trim(),
  right: rightTitleInput.trim(),
}),
```

對應文案 `action_edit_group: "編輯數列分組「{{left}} / {{right}}」"`，**明白告訴使用者名稱將被改成 X / Y**。

**3. 套用時靜默略過** — `src/lib/utils/custom_tornado_editor.ts`（`applyTornadoActions`）

```typescript
if (
  !containsPairSeparator(leftSeries) &&
  !containsPairSeparator(rightSeries)
) {
  applyGroupHeader(materialized, leftSeries, rightSeries);
}
```

標頭被略過，但**同一個動作的顏色設定照常寫入**（`setConfigLine` 在此判斷之前執行）。

### 使用者實際體驗

輸入左數列 `A↔B`、右數列 `C`，並順便改個顏色 → 待套用清單顯示「編輯數列分組「A↔B / C」」→ 按下套用 → **顏色變了、名稱沒變、沒有任何訊息**。

---

## 連帶影響：對既有內容的功能回歸

Legacy 三欄格式的標題列（`項目, A↔B, C`）中，數列名含 `↔` 是**合法且目前顯示正常**的——parser 讀得出來，圖例正確顯示。

但這類圖表現在**無法再透過 `EDIT_GROUP` 更新標頭**：防護會一律略過改寫。使用者會發現這張圖的數列名稱改不動，卻不知道原因。

---

## 為何值得修

本缺陷的形態，正是 PR #6585 一路在消滅的「靜默不一致」——只是從資料層搬到了 UI 層。防護本身沒錯（不讓髒資料進 DSL 是對的），問題在於 `CLAUDE.md` §6 要求「在最外層就 `throw Error` 凍結」，而目前護欄只存在於第二層的 editor，**第一層的 UI 完全沒擋**，使用者因此得不到任何回饋。

---

## 建議修復方向

### 主要：UI 層前置驗證（成本低，建議優先）

在 `EditGroupPanel` 加入分隔符檢查，含分隔符時 disable 送出並顯示提示：

```typescript
// Info: (YYYYMMDD - 作者) 數列名含配對分隔符會產生無法 round-trip 的標題列，於輸入當下即擋下
const hasSeparator = (name: string): boolean =>
  CUSTOM_CHART_PAIR_SEPARATORS.some((sep) => name.includes(sep));

const isSeparatorInvalid =
  hasSeparator(leftTitleInput) || hasSeparator(rightTitleInput);
const isSubmitDisabled =
  leftTitleInput.trim() === "" ||
  rightTitleInput.trim() === "" ||
  isSeparatorInvalid ||
  isUnchanged;
```

需一併處理：

1. 新增錯誤文案 i18n key（如 `chart.mermaid.ai_editor.tornado.series_name_separator_error`），**五語系（en / ja / ko / zh_cn / zh_tw）皆須補齊**，維持既有的 key 對稱性
2. 分隔符來源用 `CUSTOM_CHART_PAIR_SEPARATORS`，不得硬寫 `"<->"`（§3 拒絕魔法字串）
3. 提示文字需說明「數列名稱不可包含 `<->` 或 `↔`」，讓使用者知道怎麼改

### 次要：讓套用結果可被呼叫端得知

即使 UI 擋住了，`applyTornadoActions` 目前仍無法回報「哪些動作被略過」。若日後有其他呼叫端（如 AI 生成的動作批次），一樣會靜默失敗。可考慮讓其回傳套用結果摘要，而非僅回傳字串。此項屬架構調整，可獨立評估。

### 不建議的做法

- **改為自動跳脫／取代分隔符**：會默默竄改使用者輸入的名稱，違反零捏造
- **放寬 parser 接受三段標題列**：歧義會回來，等於推翻 PR #6585 的整個立論

---

## 驗證方式

修復後應涵蓋：

- `EditGroupPanel` 於左／右任一名稱含 `<->`、`↔`、`↔️` 時，送出鈕為 disabled 且顯示提示
- 名稱不含分隔符時行為不變（既有測試須維持全綠）
- i18n 五語系 key 數量對稱

現有的資料層防護測試（`custom_tornado_editor.test.ts` 的「數列名含%s時略過標頭改寫，不產生壞掉的 DSL」）應保留——UI 擋下後，editor 的防護仍是第二道防線。

---

## 相關檔案

- `src/components/chart/tornado_tools_submenu.tsx` — `EditGroupPanel`（`isSubmitDisabled`、`handleSubmit`）
- `src/lib/utils/custom_tornado_editor.ts` — `containsPairSeparator`、`applyTornadoActions` 的 `EDIT_GROUP` 分支
- `src/constants/custom_chart.ts` — `CUSTOM_CHART_PAIR_SEPARATORS`
- `src/i18n/locales/*/chart.ts` — `action_edit_group` 文案與待新增的錯誤提示
- `documents/architecture/custom_chart_dsl.md` §4.2 — 數列名不得含分隔符的規格說明
