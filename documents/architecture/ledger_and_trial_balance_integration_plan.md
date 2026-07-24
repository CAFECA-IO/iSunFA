# 分類帳 (Ledger) 與 試算表 (Trial Balance) 整合施行計劃

> **Date**: 2026-07-24
> **Author**: Julian
> **Category**: 系統架構與藍圖 (Architecture & Blueprint) — 功能整合計畫
> **Status**: Draft（規劃中，尚未動工）
> **Scope**: 於既有會計基盤上新增兩支唯讀報表：`src/lib/report/trial_balance_generator.ts`、`src/lib/report/ledger_generator.ts` 及對應 API route、validator、測試
> **Tags**: `Financial Reporting`, `Tree Traversal`, `Ledger`, `Trial Balance`

---

## 0. 背景與定位

舊版 iSunFA 曾有完整的 Ledger / Trial Balance 功能（保留於 clone repo commit `91c9ce242`），但採 Pages Router 舊架構。本計畫將其**計算語意**移植到目前 `workspace/iSunFA` 的新架構。

經確認：本專案**會計基盤已完整存在**（`AccountBook` / `Voucher` / `VoucherLine` / `AccountingAccount` 等 49 個 Prisma 模型），且 `account_book/[account_book_id]/` 之下已有 `voucher`、`accounting_account`、`journal`、`report` 等成熟端點，並已建立標準的**報表引擎慣例**（`src/lib/report/*_generator.ts` 純函式 + `AccountUtil.isDescendantOf` + `MoneyUtil`）。**唯獨 `ledger` 與 `trial_balance` 尚未實作。**

因此本計畫的實質是：**沿用既有報表引擎慣例，新增兩支唯讀報表產生器與端點**，而非新建基盤或另立一套架構。分類帳與試算表共用同一資料源（`VoucherLine` + `AccountingAccount`），一次到位。

> 本計畫嚴格對齊 `documents/` 既有規範，關鍵合規對應見 §7。

---

## 1. 必須遵守的既有規範（摘要）

| 規範來源 | 對本計畫的約束 |
|---|---|
| `coding_guidelines.md` §1 三層架構 | API route 僅端口；報表運算為純函式產生器；DB 只在 Repository。 |
| `coding_guidelines.md` §2 型別安全 | 零 `any`；DTO/型別置於 `src/interfaces`；Zod 一律在 `src/validators/` 並由 `index.ts` 匯出，route 只 `safeParse`。 |
| `coding_guidelines.md` §3 Clean Code | 全 `@/` 絕對路徑；狀態字串一律進 `src/constants/`（禁魔法字串）；註解走 `annotation.md` 格式。 |
| `coding_guidelines.md` §5 Fail Fast | Service/產生器開頭與結尾做借貸平衡稽核，不平衡即 `throw`。 |
| `annotation.md` | 註解僅 `Info:` / `ToDo:` / `Deprecated:`，格式 `// 類型: (YYYYMMDD - 作者) 訊息`。 |
| `numerical_precision_guideline.md` §2 | **報表/財會領域全面使用 `MoneyUtil`(Decimal.js)**；生 `BigInt` 只限 Web3 領域，報表內嚴禁。 |
| `numerical_precision_guideline.md` §3 | **嚴禁手動 `Number(amount)` 或手動把 `BigInt` 轉字串**；已有全域 `BigInt.prototype.toJSON` 序列化盾，序列化自動處理。 |
| `01_tree_traversal_reporting_engine.md` | **絕對禁止 `startsWith` / 科目代碼前綴 / `parentCode` 字串比對做分類**；一律用 `AccountUtil.isDescendantOf(code, SystemAccountNodes.*)` 樹狀溯源。 |
| `03_suspense_and_quarantine_guardrails.md` | 報表**不得**只取 `isVerified = true`；懸記/未核對分錄須納入（否則試算表借貸失衡），並保留 `isVerified` / `generationSource` 供 CPA 過濾。 |
| `04_cross_report_metrics_engine.md` | 單一報表引擎不得跨表通靈；無法計算時回傳 `null`；任何除法先擋分母為零，禁 `Infinity`/`NaN`。 |
| `domain_models.md` / ADR 005 | 所有查詢以 `accountBookId` 為租戶隔離根；嚴禁綁 `Company`。 |
| ADR 009 (SoD) | 報表為唯讀 Consumer：**不得寫 DB、不得重算沖銷/匯率/稅務/切結**，只讀已洗淨資料再彙總。 |

---

## 2. 兩功能邏輯摘要（移植對象）

**試算表**：科目層級呈現期初 / 期中 / 期末的借貸餘額彙總，含子科目上捲（rollup）與借貸平衡驗證。分類階層與上捲一律透過 `AccountUtil` 樹狀溯源與 COA metadata（`TW_ACCOUNTS`），**不得用代碼前綴**。

**分類帳**：逐筆交易明細，依科目排序累計 running balance；可依科目區間與帳別（總帳/明細/全部）篩選。帳別判斷若涉及「是否末層科目」，須以 COA metadata（`level` / `AccountUtil`）判定，不得以代碼是否含 `-` 硬判。

---

## 3. 資料流與架構（對齊既有 report route）

既有 `.../report/route.ts` 的既定模式（直接照抄）：

```
DeWT 認證 (getIdentityFromDeWT)
  → webAuthnRepo.findUserByAddress
  → accountBookRepo.getAccountBookById   // 租戶隔離 + 存在檢查
  → validators/*.safeParse(query)
  → voucherRepo.getVouchersByFilter({ accountBookId, hideDeleted:true, startDate?, endDate? })
       // Info: 依既有慣例「取消 isVerified 限制」，未核對分錄一併納入
  → lineItems = vouchers.flatMap(v => v.lineItems.lines)   // IVoucherLineUI[]
  → generateTrialBalance(lineItems, ...) / generateLedger(lineItems, options)  // 純函式，MoneyUtil + AccountUtil
  → jsonOk(payload)                                        // BigInt 由全域 toJSON 盾自動序列化
```

產生器一律放 `src/lib/report/`，與 `balance_sheet_generator.ts` 等同層、同風格（`MoneyUtil.toDecimal(...)` 累加、`AccountUtil.isDescendantOf(code, SystemAccountNodes.*)` 分類）。

---

## 4. 分階段施行計劃（後端）

### 階段 0：對齊與設計（0.5 天）
- 精讀 `src/lib/report/balance_sheet_generator.ts`、`income_statement_generator.ts`、`.../report/route.ts`、`AccountUtil`、`SystemAccountNodes`、`TW_ACCOUNTS`、`IVoucherLineUI`。
- 於 `src/constants/sort.ts` 新增 `TrialBalanceSorting`、`LedgerSorting`；於 `src/constants/`（如 `ledger.ts`）定義 `LabelType`（GENERAL/DETAILED/ALL）列舉（禁魔法字串）。
- 確認 `SystemAccountNodes` 是否已備妥試算表需要的根節點；若缺，補入 metadata（不得以前綴替代）。

### 階段 1：Repository 資料源（0.5–1 天）
- **優先重用** `voucherRepo.getVouchersByFilter`（已支援 `accountBookId` / `hideDeleted` / `startDate` / `endDate`）＋ `flatMap` 取得 `IVoucherLineUI[]`。
- 若查詢語意需擴充（如僅需 lines 的輕量投影），於 `voucherRepo` 增補薄方法，維持「Repository 不含業務邏輯」。
- 會計科目 metadata 由既有 COA 常數 / `accountingAccountRepo.getCustomAccountsByAccountBookId`（自訂科目）合併既有系統 COA 取得。
- **驗收**：以現有帳本資料取回 lines，`accountBookId` 隔離、`deletedAt` 過濾正確，且**未過濾 `isVerified`**。

### 階段 2：試算表產生器 + validator + API（2–3 天）
- `src/lib/report/trial_balance_generator.ts`（純函式）：三段切割合併、以 `AccountUtil` + COA metadata 做科目歸類與子科目上捲、全程 `MoneyUtil` 累加、輸出借貸總額。開頭/結尾以 `A=L+E` 精神做借貸平衡稽核，不平衡 `throw`（Fail Fast）。
- `src/validators/trial_balance.ts`（+ `index.ts` 匯出）：`startDate?`、`endDate?`、`sortOption?`、`page`、`pageSize`。
- `src/interfaces/trial_balance.ts`：DTO（金額欄位以 `string` 呈現，經 `MoneyUtil.format`）。
- `src/app/api/v1/user/account_book/[account_book_id]/trial_balance/route.ts`：`GET`，照 §3 流程。
- **驗收**：期末借貸總額相等；含懸記分錄仍平衡；子科目上捲用樹狀溯源而非前綴。

### 階段 3：分類帳產生器 + validator + API（1.5–2 天）
- `src/lib/report/ledger_generator.ts`：科目區間 / 帳別過濾（帳別以 metadata 判定末層）、依科目 + `tradingDate` 排序、`MoneyUtil` 逐筆累計 balance、`calculateTotals`。
- `src/validators/ledger.ts`：`startDate`、`endDate`、`startAccountNo?`、`endAccountNo?`、`labelType?`、`page?`、`pageSize?`。
- `src/interfaces/ledger.ts`、route `.../ledger/route.ts`（`GET`）。
- **驗收**：區間 / 帳別篩選正確；每科目末列 balance = 借貸淨額；金額零誤差。

### 階段 4：CSV 匯出（1 天）
- 仿 `.../voucher/export/route.ts` 新增 `.../trial_balance/export/route.ts`、`.../ledger/export/route.ts`（`POST`），重用產生器結果 + 中文表頭（試算表 8 欄、分類帳 9 欄），金額 `MoneyUtil.format`。
- **驗收**：欄位與數值與清單 API 一致。

### 階段 5：測試與驗證（1.5–2 天）
- 於 `src/lib/report/__tests__/` 加單元測試（比照 `balance_sheet_generator.test.ts`）：三段切割、樹狀上捲、running balance、`MoneyUtil` 精度、含懸記時的借貸平衡、邊界科目（`1410`/`1510`/`1780` 前綴陷阱）。
- 整合測試比照 `integration_test_guide.md`（Supertest + Cookie/Session）。
- **驗收**：測試綠燈；ESLint 零警告；以 subagent 做計算正確性與平衡性的獨立對抗性複核。

### （後續，本次不含）階段 6：前端 UI
- App Router 頁面 `src/app/user/account_book/[account_book_id]/{trial_balance,ledger}/page.tsx`、i18n（`src/i18n/locales/*`）、日期/科目選擇器、清單/列印/匯出。

---

## 5. 檔案清單（新增 / 修改）

| 動作 | 檔案 | 說明 |
|---|---|---|
| 修改 | `src/constants/sort.ts` | 新增 `TrialBalanceSorting`、`LedgerSorting` |
| 新增 | `src/constants/ledger.ts` | `LabelType` 列舉 |
| ~~修改~~ | ~~`src/repositories/voucher.repo.ts`~~ | **不需要**：純重用 `getVouchersByFilter`（見 §10.6） |
| 新增 | `src/lib/report/trial_balance_generator.ts` | 試算表純函式產生器（`MoneyUtil` + `AccountUtil`） |
| 新增 | `src/lib/report/ledger_generator.ts` | 分類帳純函式產生器 |
| 新增 | `src/validators/trial_balance.ts`、`ledger.ts`（+ `index.ts` 匯出） | Zod 驗證 |
| 新增 | `src/interfaces/trial_balance.ts`、`ledger.ts` | DTO/型別（金額為 `string`） |
| 新增 | `.../account_book/[account_book_id]/trial_balance/route.ts`、`.../export/route.ts` | GET + CSV |
| 新增 | `.../account_book/[account_book_id]/ledger/route.ts`、`.../export/route.ts` | GET + CSV |
| 新增 | `src/lib/report/__tests__/{trial_balance,ledger}_generator.test.ts` | 單元測試 |

> **不需要** Prisma migration（會計模型已存在）。若為報表查詢新增索引（如 `Voucher.tradingDate`），另開 migration 並於本文件與 schema 同步記錄。

---

## 6. 關鍵移植調整（舊 → 新，且合規）

1. **精度**：舊版字串 + `DecimalOperations` → 新版報表領域一律 `MoneyUtil`（Decimal.js）。**不使用生 `BigInt` 運算於報表**（生 BigInt 僅限 Web3 領域）。
2. **序列化**：不手動 `Number()`／不手動把 `BigInt` 轉字串；交由全域 `BigInt.prototype.toJSON` 盾。
3. **科目歸類/上捲**：舊 `parentId`/`rootId` FK → 一律走 `AccountUtil.isDescendantOf` + `SystemAccountNodes` + COA metadata。**嚴禁** `startsWith` 或 `parentCode` 字串前綴分類。
4. **懸記/未核對**：**不過濾** `isVerified`，全數納入以維持借貸平衡；於輸出保留 `isVerified` / `generationSource` 供稽核過濾。
5. **期間**：`Voucher.tradingDate` 為 `DateTime`；`getCurrent401Period()`（若沿用）須回 DateTime 邊界並保台灣兩月一期邏輯。
6. **幣別**：取 `accountBook.currency`（新專案無獨立 `AccountingSetting.currency`）。
7. **唯讀 SoD**：報表不得寫 DB、不得重算沖銷/匯率/稅務；只讀已洗淨的 `VoucherLine` 再彙總。
8. **App Router**：動態段 `{ params }: { params: Promise<{ account_book_id: string }> }`，需 `await params`。

---

## 7. 合規性自檢 (Compliance Checklist)

- [x] 三層架構：route 端口化、產生器純函式、DB 僅 Repository。（`coding_guidelines` §1）
- [x] Validator 於 `src/validators/` + `index.ts`，route 只 `safeParse`。（§2）
- [x] 零 `any`、DTO 於 `src/interfaces`。（§2）
- [x] 金額全程 `MoneyUtil`；報表內不使用生 `BigInt`。（`numerical_precision` §2）
- [x] 不手動 `Number()`／`BigInt`→字串；靠全域序列化盾。（§3）
- [x] 科目分類/上捲用 `AccountUtil.isDescendantOf` + `SystemAccountNodes`；零 `startsWith`／前綴。（doc 01）
- [x] 報表納入未核對分錄並保留 `isVerified`/`generationSource`。（doc 03）
- [x] 查詢以 `accountBookId` 隔離，不綁 `Company`。（`domain_models` / ADR 005）
- [x] 唯讀 Consumer：不寫 DB、不重算洗淨邏輯。（ADR 009）
- [x] 除法先擋分母為零，無法計算回 `null`；不跨表通靈。（doc 04）
- [x] 註解格式 `// 類型: (YYYYMMDD - 作者)`；`@/` 絕對路徑；狀態字串進 `src/constants/`。（`annotation` / §3）
- [x] Fail Fast：借貸不平衡即 `throw`。（§5）
- [x] 測試比照 `src/lib/report/__tests__/` 與 `integration_test_guide.md`。

---

## 8. 風險與注意事項

- **邊界科目前綴陷阱**（`1410`/`1510`/`1780`）：務必以樹狀溯源測試覆蓋，杜絕任何前綴回歸。
- **`SystemAccountNodes` 完整性**：試算表所需的根節點若未定義，需補 metadata，不得以前綴替代。
- **查詢效能**：大量分錄時以 `tradingDate` + `accountBookId` 於 DB 端過濾，避免全量載入；必要時加索引。
- **含懸記時的平衡**：懸記分錄使試算表仍應平衡；測試須明確涵蓋 `isVerified = false` 案例。
- **權限一致性**：完全比照現有 voucher/report 端點作法，不自創規則。

---

## 9. 期程估算（後端，單人）

| 階段 | 內容 | 估時 |
|---|---|---|
| 0 | 對齊與設計 | 0.5 天 |
| 1 | Repository 資料源 | 0.5–1 天 |
| 2 | 試算表產生器 + API | 2–3 天 |
| 3 | 分類帳產生器 + API | 1.5–2 天 |
| 4 | CSV 匯出 | 1 天 |
| 5 | 測試與驗證 | 1.5–2 天 |
| **合計（後端）** | | **約 7–9.5 天** |
| （後續）前端 UI | 另行估算 | +4–7 天 |

---

## 10.5 Phase 0 對齊結論（2026-07-24，已實作）

已完成研讀與常數建置，結論如下：

**已建立**
- `src/constants/sort.ts`：新增 `TrialBalanceSorting`、`LedgerSorting`（沿用 `VoucherSorting` 的 `field_direction` 慣例）。
- `src/constants/ledger.ts`：新增 `LabelType`（GENERAL/DETAILED/ALL）。
- 兩檔 ESLint 零警告。

**慣例確認**
- 報表產生器為 `src/lib/report/*_generator.ts` 純函式；route 以 `voucherRepo.getVouchersByFilter({ accountBookId, hideDeleted:true, ... })` 取資料後呼叫產生器。
- 分類/上捲用 `AccountUtil.isDescendantOf(targetCode, rootCode, dictionary)`（`@/lib/utils/account_util`），其沿 `parentCode` **向上遍歷父指標**（非字串前綴），完全合規。
- COA 字典：`ACCOUNTS[country]`（`@/constants/accounts`，如 `TW_ACCOUNTS: IAccount[]`，欄位 `code/name/type/level/parentCode/isDebit`）。租戶自訂科目需以 `accountingAccountRepo.getCustomAccountsByAccountBookId` 合併進字典，子科目才會納入樹。
- `SystemAccountNodes` 已備 資產/負債/權益/收入/成本/費用 等根節點，對試算表分類充分；試算表上捲主要依賴 COA 字典 + `parentCode` adjacency（皆已存在），**無需新增根節點**。若未來分組需缺項，補 metadata，不得以前綴替代。

**設計修正（影響階段 2/3，需納入）**
1. `IVoucherLineUI`（`{ id, accountingCode, accounting, particular, amount, isDebit }`）**不帶** 傳票日期與傳票識別；平坦化 `lineItems`（資產負債表用法）會遺失傳票脈絡。故 **試算表與分類帳的產生器須接收 `IVoucher[]`（或 {voucher, line} 配對）**，以取得 `voucher.tradingDate`（期間切割 / running balance 排序）與傳票識別。此點與 §3 資料流不同，以本結論為準。
2. Schema 無 `Voucher.no`（傳票編號）欄位；分類帳 CSV「傳票編號」需以 `voucher.id` 或衍生流水號呈現（**決策點**，建議先用 `voucher.id`）。
3. `IVoucherLineUI.amount` 為 `number | bigint | string` 聯集；所有讀取一律 `MoneyUtil.toDecimal()` 過水，禁止直接運算。
4. COA 字典選擇依 `accountBook.currency` / 國別對應 `ACCOUNTS`；查詢仍以 `accountBookId` 隔離。

## 10.6 Phase 1 對齊結論（2026-07-24，已確認）

**結論：報表所需資料源皆已存在且可直接重用，無需新增 Repository 程式碼。**

- **傳票 / 分錄**：重用 `voucherRepo.getVouchersByFilter({ accountBookId, hideDeleted: true, startDate?, endDate? })`，回傳 `IVoucher[]`（含 `lineItems.lines`、`tradingDate`、`isVerified`）。
  - **不傳 `page` / `limit`**：`getVouchersByFilter` 的分頁作用在**傳票層**；試算表/分類帳必須先取期間全量傳票，於**報表列層**（試算表以科目、分類帳以逐筆）產生後再分頁。
  - 不傳 `verifyStatus` → 未核對分錄一併納入（符合懸記守則）；`hideDeleted: true` 過濾軟刪除；`accountBookId` 達成租戶隔離。
- **COA 字典**：重用 `accountingAccountService.getAccountingAccounts(accountBookId)`（**不帶 search/type**，取完整字典），回傳 `IAccountingAccount[]`（`extends IAccount`，含 `code/parentCode/level/isDebit`），可直接作為 `AccountUtil.isDescendantOf(target, root, dictionary)` 的字典。內部已依 `accountBook.country` 選 `ACCOUNTS[country] || ACCOUNTS.TW` 並合併自訂科目，故自訂子科目可正確參與樹狀上捲。
- 資料流的組裝（auth → accountBook → 取傳票 → 取 COA 字典 → 呼叫產生器）比照既有 `.../report/route.ts` 於 route 內完成，產生器維持純函式。

> 據此，§5 檔案清單中「修改 `voucher.repo.ts`」一項改為 **不需要**（純重用）。

---

## 10.7 Phase 2 完成紀錄（2026-07-24，試算表後端）

**已建立**
- `src/interfaces/trial_balance.ts`：`ITrialBalanceItem` / `ITrialBalanceTotal` / `ITrialBalance` / `ITrialBalanceOptions`（金額皆字串）。
- `src/lib/report/trial_balance_generator.ts`：純函式 `generateTrialBalance(vouchers, dictionary, options)` 與 `getDefault401Period()`。
  - 全程 `MoneyUtil`/`Decimal`；沿 `parentCode` 父指標樹狀上捲（`AccountUtil.getAccount`，無 startsWith）；納入未核對分錄；Fail-Fast 借貸平衡；缺代碼/方向即阻斷。
  - 總計由葉節點加總，避免上捲父節點重複計算。
- `src/validators/trial_balance.ts`（+ `index.ts` 匯出）：`startDate?/endDate?/sorting?/page/pageSize`。
- `src/app/api/v1/user/account_book/[account_book_id]/trial_balance/route.ts`：`GET`，重用 `voucherRepo.getVouchersByFilter`（不分頁、不濾 isVerified）+ `accountingAccountService.getAccountingAccounts`（完整 COA 字典），科目列層分頁。

**驗證**
- ESLint 零警告；`tsc --noEmit` 於新檔零錯誤。
- 產生器單元測試 `src/lib/report/__tests__/trial_balance_generator.test.ts`（Jest；本沙箱因離線無法跑 Next SWC，另以 TypeScript transpile harness 離線驗證 11 項全數 PASS：三期間平衡、樹狀上捲、ending=beginning+midterm、不平衡拋錯、缺代碼拋錯）。

**待辦（後續階段）**
- 期間預設 `getDefault401Period` 以系統當下時間計算，未來若需依帳本會計年度調整再議。
- CSV 匯出（階段 4）與前端（階段 6）尚未實作。

---

## 10.8 Phase 3 完成紀錄（2026-07-24，分類帳後端）

**已建立**
- `src/interfaces/ledger.ts`：`ILedgerItem` / `ILedgerTotal` / `ILedger` / `ILedgerOptions`。
- `src/lib/report/ledger_generator.ts`：純函式 `generateLedger(vouchers, dictionary, options)`。
  - 科目區間為使用者指定的字典序範圍；帳別 (labelType) 以 COA「是否為葉節點」判定（DETAILED=葉、GENERAL=具子科目），**非** `-`/前綴。
  - running balance 於固定 (科目→日期→傳票) 標準順序累計以確保決定論，顯示排序另行套用；全程 `MoneyUtil`。
  - `voucherNumber` 暫以 `voucher.id` 呈現（Schema 無獨立傳票編號）。
- `src/validators/ledger.ts`（+ `index.ts` 匯出）：`startDate/endDate`（必填）、`startAccountNo?/endAccountNo?/labelType/sorting?/page/pageSize`。
- `src/app/api/v1/user/account_book/[account_book_id]/ledger/route.ts`：`GET`，明細列層分頁，資料源與權限比照 report route。

**驗證**
- ESLint 零警告；`tsc --noEmit` 於新檔零錯誤。
- 單元測試 `src/lib/report/__tests__/ledger_generator.test.ts`（Jest）；並以離線 transpile harness 驗證 6 項全數 PASS：ALL 4 列、running balance（1000→600）、借貸總額 1400=1400、DETAILED 全葉保留、GENERAL 為空、科目區間過濾。

**待辦**：CSV 匯出（階段 4）、前端（階段 6）。若日後導入正式傳票編號欄位，`voucherNumber` 需改採該欄位。

---

## 10.9 Phase 4 完成紀錄（2026-07-24，CSV 匯出）

**已建立**
- `src/lib/report/trial_balance_csv.ts`：`buildTrialBalanceCsv(trialBalance)` 純函式，樹狀科目深度優先攤平 + 合計列，8 欄中英雙語表頭。
- `src/lib/report/ledger_csv.ts`：`buildLedgerCsv(ledger)` 純函式，9 欄 + 合計列，日期以 `timestampToString().dateWithDash` 轉 YYYY-MM-DD。
- `.../trial_balance/export/route.ts`、`.../ledger/export/route.ts`：`GET`，比照既有 voucher/export（`fileOk` + UTF-8 BOM `﻿`），全量匯出（不分頁），資料源與權限比照清單端點。
- CSV 欄位以 RFC 4180 雙引號包夾、內部 `"` 跳脫為 `""`（與 `export.service.ts` 一致）。

**驗證**
- ESLint 零警告；`tsc --noEmit` 於新檔零錯誤。
- 離線 harness 驗證 8 項全數 PASS：TB 8 欄表頭 / 父子攤平 / 合計列 / 引號跳脫；Ledger 9 欄 / 日期格式 / 含逗號欄位加引號 / 合計列。

**待辦**：前端（階段 6）。CSV 目前以 `GET` 提供（與 voucher/export 一致）；若日後需大量欄位選擇，再比照 export.service 擴充。

---

## 10.10 Phase 5 完成紀錄（2026-07-24，測試與獨立驗證）

**單元測試擴充**（`src/lib/report/__tests__/`）
- `trial_balance_generator.test.ts`：新增 空期間、邊界日（交易日=分界日歸期中）、前綴陷阱（1410 依 parentCode 上捲至 11XX，非以 "14" 前綴分類）、排序 ENDING_DEBIT_DESC。
- `ledger_generator.test.ts`：新增 空期間、多科目 running balance 互不干擾、DATE_DESC、單邊科目區間。
- 新增 `trial_balance_csv.test.ts`、`ledger_csv.test.ts`（表頭欄數、攤平、跳脫、合計、日期格式）。
- 離線 harness 驗證全數 PASS（generator 8 項 + CSV 8 項 + 邊界 8 項 + 硬化 7 項）。

**獨立對抗性複核（subagent）與修正**
- **C1（CRITICAL，已修）**：四支 route 原僅檢查帳本存在、未驗團隊成員 → 跨租戶資料外洩。已比照 `dashboard/route.ts` 加入 `teamRepo.getTeamMember(sessionUser.id, accountBook.teamId)`，失敗回 `AUTH_PERMISSION_DENIED`。
- **M2（已修）**：決定論護欄（借貸不平衡 / 資料整合性）錯誤原被 catch 成 `IS_DB_FAILED`，已改為回 `VA_INVALID_INPUT_DATA`，保留審計訊號。
- **M5（已修）**：`startDate/endDate` 加嚴格日期驗證（`Date.parse` refine），避免 NaN 造成期間靜默誤判。
- **M7（已修，硬化）**：CSV 文字欄位新增公式注入中和（`= + - @` 開頭前置 `'`），金額欄不套用以保負數；列分隔改為 RFC 4180 的 CRLF。

**待決策（未實作，需產品確認，見下）**
- **C2**：分類帳 `LabelType.GENERAL` 目前僅保留非葉科目；因過帳多在葉節點，GENERAL 幾乎為空。正解需將葉科目上捲至總帳科目彙總 — 語意待產品確認後再實作。
- **M3**：分類帳 running balance 未含期初 (B/F) 餘額，目前為期間相對餘額（與現金流量表同為 Roadmap 待辦）。
- **M4**：試算表六欄為「發生額累計」而非「淨餘額」，與舊版設計一致；CSV 表頭用「餘額」字樣，若產品要求淨額或改字樣需調整。
- **M6**：`AccountUtil.dictionaryCache` 以陣列參考為鍵，每請求新陣列導致快取不命中（既有 AccountUtil 議題，非本功能引入）。

---

## 10. 驗證計劃

- **單元**：三段切割、樹狀上捲、running balance、`calculateTotals`、`MoneyUtil` 精度、邊界科目前綴陷阱、含懸記平衡。
- **整合**：以現有帳本資料端到端呼叫兩支 API（Supertest）。
- **會計正確性**：試算表期末借貸相等；分類帳每科目末列 balance = 借貸淨額；符合 `A = L + E`。
- **決定論護欄**：不平衡輸入須被 `throw` 攔截（Fail Fast）。
- **獨立審查**：subagent 對計算與平衡性做對抗性複核。
- **回歸**：`prisma generate`、build、既有端點不受影響；ESLint 零警告。
