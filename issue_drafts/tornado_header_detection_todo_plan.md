# 龍捲風圖標題列誤判 ToDo 處理計劃（v2：改用分隔符文法）

> ToDo: (20260721 - Luphia) 數列名稱為純數字（如 bare year 2019）時會被誤判為資料列，靜默產生錯誤的單筆長條而非報錯；考慮更嚴謹的 header 判定或加上警示
>
> 位置：`src/lib/utils/custom_chart_parser.ts:294`

---

## 一、問題本質：三欄式標題列的形狀與資料列先天衝突

現行判定（`custom_chart_parser.ts:296-299`）為「首列第 2、3 欄皆非數字 → 標題列」。以下兩種輸入在結構上**完全相同**，純語法無法分辨：

| | 首列 | 使用者意圖 |
|---|---|---|
| 情境 A | `折現率, 1250, 780` | 無標題列的資料 |
| 情境 B | `項目, 2019, 2020` | 標題列（數列名為年份） |

誤判時**雙重損害**：多出一根 category 為「項目」、值 2019/2020 的幽靈長條，同時 `leftSeries` / `rightSeries` 變 `undefined` 使圖例消失。全程 `ok === true`，不報錯。

### 關鍵洞察：問題出在「湊三欄」這件事本身

`custom_tornado_editor.ts:33` 的註解已經自承：

```typescript
// Info: (20260722 - Julian) 插入標頭列時的類別欄預設標籤（渲染層不顯示此欄，僅供 header 判定）
const DEFAULT_CATEGORY_HEADER = "項目";
```

標題列第 1 欄（`firstFields[0]`）**從未被 parser 讀取，也從未被渲染**。它存在的唯一理由是湊成三欄好讓判定成立——而那個三欄形狀正是與資料列衝突的根源。**這個欄位的存在理由，就是它造成缺陷的原因。**

### 現行做法是把文法缺陷推給 LLM 遵守

`src/constants/prompts/pdf_editor/mermaid_modification.ts:112`：

> Series names must be NON-numeric (use "FY2019" / "2019年" — NOT a bare "2019").

`documents/architecture/custom_chart_dsl.md:66` 亦有相同中文敘述。

這違反 §7「永遠不直接採信 LLM 數值」的精神：約束應該由 schema／文法保證，而不是靠 prompt 拜託模型配合。**文法上寫不出來，才是真正的護欄。**

---

## 二、方案：標題列改用分隔符文法

標題列格式由 `類別欄, 左數列, 右數列`（3 個 CSV 欄）改為：

```
悲觀結果 <-> 樂觀結果
```

即**單一 CSV 欄位，內含配對分隔符**。與資料列的 3 欄形狀在結構上完全互斥，判定不再依賴內容——`2019 <-> 2020` 也能正確識別為標題列。

### 沿用既有的 `CUSTOM_CHART_AXIS_SEPARATORS`

`src/constants/custom_chart.ts:178` 已定義：

```typescript
export const CUSTOM_CHART_AXIS_SEPARATORS: readonly string[] = ["↔", "<->"];
```

**無衝突**（已實測確認）：此常數目前只在 `parseAxis()` 使用，而 `parseAxis()` 只處理矩陣圖 `xaxis:` / `yaxis:` **設定列的值**；龍捲風圖的設定白名單為 `title` / `unit` / `mode` / `baseline` / `leftcolor` / `rightcolor`，**根本沒有軸設定鍵**。位置不同（設定值 vs 資料列）、圖表類型不同，兩者不會相遇。

沿用而非新造符號的好處：

- 語意一致——都是「一對事物的兩端」（軸的 min↔max、數列的左↔右）
- 免費獲得 `↔` 的相容性，使用者打全形箭號也能運作
- 可沿用 `parseAxis()` 既有的 VS16 變體處理（`↔️` 會先被正規化）

**待決定**：常數名稱含 `AXIS_` 但用途已擴大，建議更名為 `CUSTOM_CHART_PAIR_SEPARATORS`（會連帶改 `custom_matrix_editor.ts:38`），或另立同值常數。前者較乾淨，後者改動小。

**標準形式**：editor 寫入時一律用 `<->`（ASCII，避免編碼問題），解析時兩者皆接受。

### 判定規則（必須依欄數，不可依「含分隔符」）

```typescript
/**
 * Info: (20260731 - Julian)
 * 標題列判定的唯一來源：單一 CSV 欄位且含配對分隔符。
 * 必須以「欄數 === 1」為前提——若只檢查「含分隔符」，
 * 類別名稱含分隔符的資料列（如 "A<->B", 100, 200，解析為 3 欄）會被誤判為標題列。
 */
export const isTornadoHeaderLine = (fields: string[]): boolean =>
  fields.length === 1 &&
  CUSTOM_CHART_PAIR_SEPARATORS.some((sep) => fields[0].includes(sep));
```

因為以欄數為前提，判定與內容無關，`2019 <-> 2020` 不再有歧義。

### 邊界情況與建議處理

| 輸入 | 建議行為 |
|---|---|
| `A <-> B <-> C`（三段） | **fail fast** 拋 `MALFORMED_ROW`，不默默取前兩段 |
| `<-> 樂觀` / `悲觀 <->`（單邊空） | 允許，該側 `undefined`（維持數列名選填的既有語意） |
| 數列名含逗號 | 需引號包夾：`"悲觀, 保守" <-> 樂觀`；否則會被解析成 2 欄而非 1 欄，判定失敗 |
| 數列名含 `<->` 字面值 | 不支援（文件註明即可，實務上極罕見） |

---

## 三、向後相容：兩種格式並存（不可硬切）

既有圖表全是三欄格式，且散落於使用者文件的 markdown 內容中，**無法批次遷移**。若硬切，所有既有標題列都會變成資料列——這個回歸比現在的缺陷更嚴重，因為它打的是**全部**有標題列的圖表，而非只有數字數列名的那些。

因此：

| 首列形式 | 判定 | 歧義 |
|---|---|---|
| `悲觀 <-> 樂觀`（1 欄含分隔符） | **標題列**（權威、優先判定） | ✅ 無 |
| `項目, 悲觀, 樂觀`（3 欄，2/3 欄非數字） | 標題列（legacy 啟發式） | ⚠️ 保留現狀 |
| `項目, 2019, 2020`（3 欄，2/3 欄皆數字） | 資料列（legacy 啟發式） | ⚠️ 保留現狀，但已有逃生口 |

editor 一律**寫入新格式**，內容會隨使用者編輯自然遷移。舊格式的歧義僅殘留於未被編輯過的舊圖表，且使用者現在有明確可用的解法。

> 後續可評估將 legacy 三欄格式標記為 deprecated，但需先確認存量圖表已大致遷移完畢。

---

## 四、實作前必知：判定邏輯有兩份複本

| 位置 | 形式 |
|---|---|
| `custom_chart_parser.ts:296-299` | 內聯於 `buildTornado()` |
| `custom_tornado_editor.ts:87-90` | `isHeaderFields()`，被呼叫 2 次（`parseTornadoBars:120`、`parseTornadoData:145`） |

同一規則、三個呼叫點、兩份實作。**只改一邊的後果比現在的 bug 更嚴重**：parser 認定為資料列而 editor 認定為標題列時，`bars` 的 `lineIndex` 會錯位，編輯工具將改到錯的資料列——正是 PR #6570 review 反覆強調的索引穩定性問題。

本次要支援兩種格式，分歧風險加倍，因此**統一為單一來源是前置必做項**。

---

## 五、執行步驟

### 階段 0（前置，純重構、零行為變更）

1. 將標題列判定抽為單一匯出函式（暫置於 `custom_chart_parser.ts`），`custom_chart_parser.ts` 與 `custom_tornado_editor.ts` 的三個呼叫點全部改用
2. 此 commit 可獨立 review，風險最低

### 階段 1（新文法）

3. 常數更名 `CUSTOM_CHART_AXIS_SEPARATORS` → `CUSTOM_CHART_PAIR_SEPARATORS`（同步 `custom_matrix_editor.ts:38`、`parseAxis()`）
4. 判定函式改為「1 欄且含分隔符 → 新式標題列；否則回退 legacy 三欄啟發式」
5. `buildTornado()` 取數列名：新式取分隔符兩側，legacy 取 `firstFields[1]` / `[2]`
6. 三段以上（`A <-> B <-> C`）fail fast

### 階段 2（editor 同步）

7. `buildHeaderLine()` 改輸出 `${left} <-> ${right}`，不再寫入 `DEFAULT_CATEGORY_HEADER`
8. `DEFAULT_CATEGORY_HEADER` 可移除（其存在理由隨新文法消失）
9. `parseTornadoBars` / `parseTornadoData` 使用統一後的判定函式
10. EDIT_GROUP 的「無標頭時插入標頭列」路徑改寫新格式

### 階段 3（文件與 prompt 同步，不可遺漏）

11. `src/constants/prompts/pdf_editor/mermaid_modification.ts:107-130`：改寫 tornado 格式說明與 body example，**移除「Series names must be NON-numeric」的繞道指示**（文法已保證）
12. `src/constants/prompts/pdf_editor/report_generation.ts`：確認是否含格式範例需同步
13. `documents/architecture/custom_chart_dsl.md:61-69`：更新 4.2 節，說明新舊兩種標題列格式與遷移策略
14. **改寫 `custom_chart_parser.test.ts:122-132`**——該測試目前把缺陷當規格釘住（測試名稱說「should fail」，斷言卻是 `ok === true`，註解自承「這其實是一筆有效資料列」）

---

## 六、測試計劃

`custom_chart_parser.test.ts`：

- 新式標題列 `2019 <-> 2020` + 資料列 → `leftSeries === "2019"`、`rightSeries === "2020"`、`bars` 只含真正的資料列（**這題直接對應原始缺陷**）
- 全形 `↔` 與 `↔️`（含 VS16）皆可識別
- 單邊空 `<-> 樂觀` → `leftSeries === undefined`、`rightSeries === "樂觀"`
- 三段 `A <-> B <-> C` → `MALFORMED_ROW`
- 類別含分隔符的資料列 `"A<->B", 100, 200` → 判定為**資料列**（驗證欄數優先於內容）
- legacy 三欄格式 → 行為與現況完全一致（向後相容回歸）
- 新式標題列但無資料列 → `NO_DATA_ROWS`

`custom_tornado_editor.test.ts`（**最關鍵**）：

- 同一份 raw，`parseTornadoBars()` 的 `lineIndex` 必須與 `parseCustomChart()` 的 `bars` 一一對應，**新舊兩種格式都要驗**——固化 parser 與 editor 不得分歧的不變式
- EDIT_GROUP 對 legacy 三欄標題列的圖表執行後，輸出應為新格式（驗證遷移路徑）
- EDIT_GROUP 對無標題列的圖表執行後，插入的是新格式且不含 `DEFAULT_CATEGORY_HEADER`

---

## 七、建議提交方式

屬 PDF Editor 範圍，與 PR #6570 的直方圖主題不同，建議獨立分支：

```
fix(chart): disambiguate tornado header with pair-separator grammar
```

建議拆成三個 commit 依序 review：階段 0（純重構）→ 階段 1+2（文法與 editor）→ 階段 3（prompt 與文件）。
