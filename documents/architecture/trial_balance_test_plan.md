# 試算表測試規劃（Trial Balance Test Plan）

> 目標：以 **generator 純函式勾稽測試** 覆蓋試算表三大需求（科目彙總 + 試算表⇄分類帳一致、借貸絕對平衡、動態結轉與期間切換）。
> 前提：**不撰寫 API route handler 測試**（專案無此先例，不硬寫）；一切遵守 `documents/`。
> 撰寫者：Julian ／ 建立日：20260728 ／ 狀態：規劃中（待確認後實作）

---

## 1. 測試型態選擇與理由（遵守 documents/）

採 **`src/lib/report/__tests__/` 的純函式勾稽單元測試**，比照專案既有且落地的兩個範本：

- `trial_balance_generator.test.ts`：試算表產生器單元測試（彙總、平衡、邊界）。
- `three_statement_articulation.test.ts`：**單一真相來源（SSOT）傳票 → 無 Mock 餵多個真實引擎 → 斷言跨報表恆等式勾稽**。

**為何不採其他型態**：

| 型態 | 不採用原因 |
| --- | --- |
| API route handler 測試 | 專案無先例，依指示不硬寫。`report` route 的 DeWT/HTTP 屬封裝層，非計算正確性。 |
| SuperTest integration | `integration_test_guide.md` 的設施尚未落地，且範例為 Pages Router，與 App Router 不相容。 |
| 連 DB e2e | 需 Postgres；三需求本質為「引擎計算與跨報表勾稽」，generator 層即可完整覆蓋且可離線驗證、最穩定。 |

**共通原則**：

- **零 Mock**：同一組 SSOT 傳票直接餵真實 `generateTrialBalance` / `generateLedger`。
- **精度**：一律 `Decimal` / `BigInt` 字串比較，差異須**精準為 `0`**（遵 `numerical_precision_guideline.md`、ADR 003）。
- **真實 COA**：以 `getAccountByCode` 取真實 TW 科目（比照 `three_statement_articulation.test.ts`）。
- **樹狀溯源**：彙總依 `parentCode` 上捲（`AccountUtil`），非代碼前綴。

## 2. 測試檔規劃

- **保留** `trial_balance_generator.test.ts`（既有彙總/平衡/邊界基礎案例）。
- **新增** `src/lib/report/__tests__/trial_balance_articulation.test.ts`：專責本規劃的強化與勾稽案例（需求 1b 的試算表⇄分類帳交叉驗證特別適合獨立成檔）。
- 註：本規劃全程走 generator 層，**不新增亦不依賴連 DB 的 e2e 檔**（既有 `core_pipeline.e2e.test.ts` 不受影響）。

## 3. 需求對應之測試案例設計

### 需求 1 — 科目層級彙總 + 試算表⇄分類帳一致

**1a 子科目加總 == 主科目彙總**
- SSOT：對某主科目下多個子科目切入傳票（例：`1100` 下 `1101`、`1103`；並涵蓋多層 `1XXX > 11XX > 1100`）。
- 斷言：試算表樹狀 `parent.endingDebit == Σ(children.endingDebit)`（貸方同理），**逐層**成立，差異 `0`。

**1b 試算表期末餘額 == 分類帳最終行結餘**（跨引擎勾稽，核心新案例）
- 同一組 SSOT 傳票，同時餵 `generateTrialBalance` 與 `generateLedger`（`labelType = ALL` 或 `DETAILED`）。
- 對每個**葉科目**斷言：
  `TrialBalance.ending 淨額 (endingDebit − endingCredit)` == `Ledger 該科目最後一列 balance`（分類帳 balance 為借正貸負之 running balance）。
- 意義：兩支唯讀引擎對同源資料的獨立計算必須一致，等同「試算表溯源到分類帳逐筆」的自動勾稽。

### 需求 2 — 借貸絕對平衡（差異精準為 0）

**2a 基本平衡**：`total.endingDebit − total.endingCredit === 0`（`Decimal`）；期初/期中/期末三組皆平衡。
**2b 多類科目**：複合傳票涵蓋資產/負債/權益/收入/費用多類，仍平衡為 `0`。
**2c 精度邊界**：極端大數（`BigInt` 級，如 `9007199254740990`）與小數混合，差異仍**精準 `0`**（防浮點誤差；呼應 `core_pipeline.e2e.test.ts` 的極端數值精神）。

### 需求 3 — 動態結轉與期間切換（實帳戶期初承接）

**3a 期初承接上期期末**（會計恆等）
- SSOT：1 月與 2 月皆有傳票（含實帳戶 `1101` 資產、`2xxx` 負債、`3110` 權益）。
- 查 1 月：`{ startDate: 2026-01-01, endDate: 2026-01-31 }` → 取實帳戶 `ending`。
- 查 2 月起：`{ startDate: 2026-02-01, endDate: 2026-12-31 }` → 取同一實帳戶 `beginning`。
- 斷言：`2月.beginning === 1月.ending`（逐一實帳戶），差異 `0`——期初正確承接上期期末。

**3b 動態更新後仍平衡**
- 在 2 月新增一筆傳票後重算，斷言 `total` 借貸差異仍 `0`，且 `ending` 反映新增額（動態即時更新）。

**3c 會計嚴謹註記**
- 本測試在**同一會計年度內**期間切換，故各科目期初 = 交易日 < `startDate` 之累計；聚焦「實帳戶（資產/負債/權益）承接」以符合會計原則的表述。
- 跨會計年度的「虛帳戶（收入/費用/損益）結轉歸零」屬年結機制，`generateTrialBalance` 目前不做年結，列為**範圍外**（未來 Roadmap）。

## 4. 案例矩陣總覽

| 需求 | 案例 | 引擎 | 核心斷言 |
| --- | --- | --- | --- |
| 1a | 子和==父彙總 | TrialBalance | 逐層 `parent == Σchildren`，差 0 |
| 1b | 試算表⇄分類帳 | TrialBalance + Ledger | 葉科目 `TB.ending淨額 == Ledger.最終balance` |
| 2a/2b | 借貸平衡 | TrialBalance | `Debit − Credit === 0`（三期、多類科目） |
| 2c | 精度邊界 | TrialBalance | 極端大數/小數差異精準 0 |
| 3a | 期初承接 | TrialBalance | `2月.beginning == 1月.ending`（實帳戶） |
| 3b | 動態平衡 | TrialBalance | 新增後仍 `Debit−Credit===0` 且 ending 更新 |

## 5. 驗證策略

- **本機**：`npm test`（generator 測試不需 DB，直接可跑）。
- **離線 sandbox**：無法跑 Jest（Next SWC arm64 缺），但可用 transpile harness 以**真實引擎 + 真 `TW_ACCOUNTS`** 預驗每個案例的斷言數字（前輪已用此法驗證 generator 行為 11/11）。
- `eslint` / `tsc --noEmit` 須乾淨。

## 6. 待決策

- **實作範圍**：三需求全做，或先做需求 1b（試算表⇄分類帳勾稽，最具稽核價值）？

## 7. 範圍外（本規劃不含）

- API route handler（DeWT/HTTP/權限）測試 —— 無先例，不硬寫。
- `report` route 租戶隔離缺口 —— 屬 route 行為議題，另案討論。
- SuperTest integration —— 待設施落地。
