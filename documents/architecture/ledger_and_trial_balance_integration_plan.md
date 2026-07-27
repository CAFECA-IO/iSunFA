# 分類帳 (Ledger) 與 試算表 (Trial Balance) 整合施行計劃

> **Date**: 2026-07-24
> **Author**: Julian
> **Category**: 系統架構與藍圖 (Architecture & Blueprint) — 功能整合計畫
> **Status**: 後端 (Phase 0–5) 完成；部分語意待產品決策；前端 (Phase 6) 未動工
> **Scope**: 於既有會計基盤上新增兩支唯讀報表（試算表、分類帳）之產生器、API route、CSV 匯出、validator 與測試
> **Tags**: `Financial Reporting`, `Tree Traversal`, `Ledger`, `Trial Balance`

---

## 1. 背景與定位

舊版 iSunFA 曾有完整的 Ledger / Trial Balance 功能（保留於 clone repo commit `91c9ce242`），採 Pages Router 舊架構。本計畫將其**計算語意**移植至目前 `workspace/iSunFA` 的 App Router 新架構。

經確認：本專案**會計基盤已完整存在**（`AccountBook` / `Voucher` / `VoucherLine` / `AccountingAccount` 等 49 個 Prisma 模型），且 `account_book/[account_book_id]/` 之下已有 `voucher`、`accounting_account`、`journal`、`report` 等成熟端點，並已建立標準的**報表引擎慣例**（`src/lib/report/*_generator.ts` 純函式 + `AccountUtil` + `MoneyUtil`）。**原本僅 `ledger` 與 `trial_balance` 尚未實作。**

因此本計畫的實質是：**沿用既有報表引擎慣例，新增兩支唯讀報表產生器與端點**，而非新建基盤。分類帳與試算表共用同一資料源（`Voucher` + `VoucherLine` + COA 字典），一次到位。

---

## 2. 交付狀態總覽

| 階段 | 內容 | 狀態 |
|---|---|---|
| 0 | 對齊與設計、常數建置 | ✅ 完成 |
| 1 | 報表資料源（確認純重用，無新增 repo） | ✅ 完成 |
| 2 | 試算表 generator + validator + API | ✅ 完成 |
| 3 | 分類帳 generator + validator + API | ✅ 完成 |
| 4 | 試算表 / 分類帳 CSV 匯出 | ✅ 完成 |
| 5 | 測試強化 + 獨立對抗性複核 + 修正 | ✅ 完成 |
| — | 待產品決策事項（C2 / M3 / M4） | ⏳ 待確認 |
| 6 | 前端 UI（傳票頁新增 tab） | 🚧 進行中：分類帳 tab 已完成（見 §12.8）；試算表 tab 待實作 |

詳細實作歷程見 §9；待決策事項見 §8。

---

## 3. 必須遵守的既有規範

| 規範來源 | 對本功能的約束 |
|---|---|
| `coding_guidelines.md` §1 三層架構 | API route 僅端口；報表運算為純函式產生器；DB 只在 Repository。 |
| `coding_guidelines.md` §2 型別安全 | 零 `any`；DTO/型別置於 `src/interfaces`；Zod 一律在 `src/validators/` 並由 `index.ts` 匯出，route 只 `safeParse`。 |
| `coding_guidelines.md` §3 Clean Code | 全 `@/` 絕對路徑；狀態字串一律進 `src/constants/`（禁魔法字串）；註解走 `annotation.md` 格式。 |
| `coding_guidelines.md` §5 Fail Fast | 產生器對違反會計恆等式（借貸不平衡）與資料整合性缺失即 `throw`。 |
| `annotation.md` | 註解僅 `Info:` / `ToDo:` / `Deprecated:`，格式 `// 類型: (YYYYMMDD - 作者) 訊息`。 |
| `numerical_precision_guideline.md` §2 | 報表/財會領域全面使用 `MoneyUtil`(Decimal.js)；生 `BigInt` 只限 Web3 領域，報表內嚴禁。 |
| `numerical_precision_guideline.md` §3 | 嚴禁手動 `Number(amount)` 或手動把 `BigInt` 轉字串；靠全域 `BigInt.prototype.toJSON` 序列化盾。 |
| `01_tree_traversal_reporting_engine.md` | 絕對禁止 `startsWith` / 科目代碼前綴分類；一律用 `AccountUtil` 沿 `parentCode` 父指標樹狀溯源。 |
| `03_suspense_and_quarantine_guardrails.md` | 報表**不得**只取 `isVerified = true`；懸記/未核對分錄須納入，否則試算表借貸失衡。 |
| `04_cross_report_metrics_engine.md` | 單一報表引擎不跨表通靈；除法先擋分母為零，禁 `Infinity`/`NaN`。 |
| `domain_models.md` / ADR 005 | 所有查詢以 `accountBookId` 為租戶隔離根；嚴禁綁 `Company`。 |
| ADR 009 (SoD) | 報表為唯讀 Consumer：不寫 DB、不重算沖銷/匯率/稅務，只讀已洗淨資料再彙總。 |

---

## 4. 兩功能邏輯摘要

**試算表 (Trial Balance)**：科目層級呈現**期初 / 期中 / 期末**三時點的借方、貸方發生額，含子科目上捲（rollup）與借貸平衡驗證。分界點 `startDate` 之前為期初、`[startDate, endDate]` 為期中、兩者相加為期末。科目歸類與上捲一律透過 COA 字典的 `parentCode` 父指標（`AccountUtil`），不得用代碼前綴。

**分類帳 (Ledger)**：逐筆交易明細，依科目累計 running balance（借正貸負）；可依科目代碼區間與帳別（總帳 / 明細 / 全部）篩選。帳別以 COA「是否為葉節點」判定，不得以代碼是否含 `-` 硬判。

---

## 5. 架構與資料流（實作版）

兩支清單 route 皆比照既有 `.../report/route.ts` 與 `.../dashboard/route.ts` 慣例，於 route 內完成組裝，產生器維持純函式：

```
GET .../account_book/:id/{trial_balance|ledger}
  1. getIdentityFromDeWT(authHeader)                         // 身分；失敗 → NF_USER
  2. accountBookRepo.getAccountBookById(id)                  // 存在檢查；失敗 → NF_ACCOUNT_BOOK
  3. teamRepo.getTeamMember(sessionUser.id, teamId)          // 租戶權限；失敗 → AUTH_PERMISSION_DENIED
  4. {TrialBalance|Ledger}QuerySchema.safeParse(query)       // 驗證；失敗 → VA_QUERY_PARAMETER_IS_REQUIRED
  5. voucherRepo.getVouchersByFilter({ accountBookId, hideDeleted:true, startDate?, endDate? })
       // 取期間全量 IVoucher[]（含 lineItems.lines / tradingDate / isVerified）；不分頁、不濾 isVerified
  6. accountingAccountService.getAccountingAccounts(id)      // 完整 COA 字典（標準+自訂），供樹狀上捲/葉判定
  7. generate{TrialBalance|Ledger}(vouchers, dictionary, options)   // 純函式：MoneyUtil + AccountUtil；Fail-Fast
  8. 於「報表列層」分頁（試算表以科目、分類帳以逐筆），再 jsonOk(...)
```

**要點**：
- 產生器接收 `IVoucher[]`（非平坦化 lines），因 `IVoucherLineUI` 不帶傳票日期/識別，而期間切割與 running balance 需 `voucher.tradingDate`。
- 分頁必須在報表列層，不可下推至 `getVouchersByFilter` 的傳票層分頁。
- 產生器一律放 `src/lib/report/`，與 `balance_sheet_generator.ts` 等同層同風格。
- CSV 匯出 route 比照 `.../voucher/export/route.ts`：`fileOk` + UTF-8 BOM，全量不分頁。

---

## 6. 已交付檔案清單

| 動作 | 檔案 | 說明 |
|---|---|---|
| 修改 | `src/constants/sort.ts` | 新增 `TrialBalanceSorting`、`LedgerSorting`（沿用 `VoucherSorting` 的 `field_direction` 慣例） |
| 新增 | `src/constants/ledger.ts` | `LabelType`（GENERAL/DETAILED/ALL） |
| 新增 | `src/interfaces/trial_balance.ts` | `ITrialBalanceItem` / `ITrialBalanceTotal` / `ITrialBalance` / `ITrialBalanceOptions`（金額皆字串） |
| 新增 | `src/interfaces/ledger.ts` | `ILedgerItem` / `ILedgerTotal` / `ILedger` / `ILedgerOptions` |
| 新增 | `src/lib/report/trial_balance_generator.ts` | 試算表純函式產生器 + `getDefault401Period()` |
| 新增 | `src/lib/report/ledger_generator.ts` | 分類帳純函式產生器 |
| 新增 | `src/lib/report/trial_balance_csv.ts` | 試算表 CSV 建構器（樹狀攤平 + 合計） |
| 新增 | `src/lib/report/ledger_csv.ts` | 分類帳 CSV 建構器 |
| 新增 | `src/validators/trial_balance.ts`、`src/validators/ledger.ts`（+ `index.ts` 匯出） | Zod 驗證（含嚴格日期） |
| 新增 | `.../account_book/[account_book_id]/trial_balance/route.ts`、`.../export/route.ts` | GET 清單 + CSV |
| 新增 | `.../account_book/[account_book_id]/ledger/route.ts`、`.../export/route.ts` | GET 清單 + CSV |
| 新增 | `src/lib/report/__tests__/{trial_balance,ledger}_generator.test.ts`、`{trial_balance,ledger}_csv.test.ts` | 單元測試 |

> **不需要** Prisma migration（會計模型已存在）；亦**未新增** Repository 程式碼（純重用 `getVouchersByFilter` 與 `accountingAccountService.getAccountingAccounts`）。若日後為查詢效能新增索引（如 `Voucher.tradingDate`），另開 migration 並同步本文件。

---

## 7. 關鍵設計決定（舊 → 新）

1. **精度**：舊 `DecimalOperations`(字串) → 新一律 `MoneyUtil`(Decimal.js)；輸出為 Decimal `toString()` 字串；報表內不使用生 `BigInt`。
2. **序列化**：不手動 `Number()` / 不手動把 `BigInt` 轉字串；交由全域 `BigInt.prototype.toJSON` 盾。
3. **科目歸類/上捲**：舊 `parentId`/`rootId` FK → 走 COA 字典 `parentCode` 父指標（`AccountUtil.getAccount`）。嚴禁 `startsWith`/前綴。
4. **懸記/未核對**：不過濾 `isVerified`，全數納入以維持借貸平衡。
5. **產生器輸入**：接收 `IVoucher[]`（保留 `tradingDate` 與傳票識別），而非平坦化 lines。
6. **期間**：`Voucher.tradingDate` 為 epoch 秒；`getDefault401Period()` 沿用台灣兩月一期邏輯，回傳 Date 邊界。
7. **傳票編號**：Schema 無 `Voucher.no`，分類帳 `voucherNumber` 暫以 `voucher.id` 呈現（決策：日後導入正式編號欄位再替換）。
8. **幣別**：取 `accountBook.currency`（新專案無獨立 `AccountingSetting.currency`）。
9. **COA 字典**：`accountingAccountService.getAccountingAccounts` 依 `accountBook.country` 選 `ACCOUNTS[country] || ACCOUNTS.TW` 並合併自訂科目。
10. **權限**：比照 `dashboard/route.ts` 以 `teamRepo.getTeamMember` 做團隊成員檢查（達成租戶隔離）。
11. **App Router**：動態段 `{ params }: { params: Promise<{ account_book_id: string }> }`，需 `await params`。

---

## 8. 待決策事項（未實作，需產品確認）

| 代號 | 事項 | 現況 | 建議 |
|---|---|---|---|
| ~~**C2**~~ | ~~分類帳 `LabelType.GENERAL`（總分類帳）語意~~ | **已定案並實作（2026-07-24）** | **採「上捲彙總」**：GENERAL 將葉節點過帳沿 `parentCode` 歸屬至其父（總帳）科目，逐筆呈現、running balance 以父科目累計；借貸總額與 ALL 一致。（DETAILED=僅葉節點、ALL=不過濾不上捲）已補測試（離線 8 項全 PASS） |
| **M3** | 分類帳 running balance 未含期初 (B/F) 餘額 | 目前為期間相對餘額 | 導入開帳以來累計之期初餘額（與現金流量表同屬 Roadmap） |
| ~~**M4**~~ | ~~試算表六欄用語~~ | **已定案（2026-07-24）** | **沿用舊版用語，維持「期初/期中/期末 借方/貸方餘額」字樣**（現況已符合，無需改碼） |
| **M6** | `AccountUtil.dictionaryCache` 以陣列參考為鍵，每請求新陣列致快取不命中 | 既有 `AccountUtil` 議題，非本功能引入 | 改以帳本/國別為快取鍵（於 AccountUtil 層處理） |

---

## 9. 實作歷程（Changelog）

- **Phase 0（對齊與設計）**：新增 `TrialBalanceSorting` / `LedgerSorting` / `LabelType` 常數；確認報表引擎慣例與 COA 字典來源；釐清產生器須接收 `IVoucher[]`、`amount` 為聯集型別須經 `MoneyUtil`、傳票編號採 `voucher.id`。
- **Phase 1（資料源）**：確認 `voucherRepo.getVouchersByFilter`（不帶 page/limit、不濾 isVerified）＋ `accountingAccountService.getAccountingAccounts`（完整字典）即足夠，**無需新增 Repository 程式碼**；分頁改在報表列層。
- **Phase 2（試算表）**：實作 interfaces / generator / validator / route。三期間切割、`parentCode` 樹狀上捲、總計由葉節點加總避免重複、Fail-Fast 借貸平衡。
- **Phase 3（分類帳）**：實作 interfaces / generator / validator / route。科目區間 + 帳別（葉節點判定）過濾、固定順序累計 running balance（決定論）、顯示排序另行套用。
- **Phase 4（CSV 匯出）**：`trial_balance_csv.ts` / `ledger_csv.ts` 純函式 + 兩支 export route（`fileOk` + BOM，全量）。RFC 4180 雙引號跳脫。
- **Phase 5（測試與獨立驗證）**：擴充單元測試（空期間、邊界日、前綴陷阱、排序、多科目餘額獨立、科目區間）；經 subagent 對抗性複核後修正：
  - **C1（CRITICAL，已修）**：四支 route 補上 `teamRepo.getTeamMember` 團隊成員檢查，杜絕跨租戶資料外洩。
  - **M2（已修）**：決定論護欄錯誤由 `IS_DB_FAILED` 改回 `VA_INVALID_INPUT_DATA`，保留審計訊號。
  - **M5（已修）**：`startDate/endDate` 加嚴格日期驗證（`Date.parse` refine）。
  - **M7（已修）**：CSV 文字欄位加公式注入中和（`= + - @` 前置 `'`，金額欄不套用以保負數）；列分隔改為 CRLF。
- **C2 改良（2026-07-24，已實作）**：分類帳 `GENERAL` 由「純過濾（近乎空）」改為「上捲彙總」——葉節點過帳沿 `parentCode` 歸屬至父（總帳）科目，逐筆呈現、餘額於父科目累計、借貸總額與 ALL 一致。更新 `ledger_generator.ts`（新增 `resolveLabel`）與單元測試，離線 harness 8 項全 PASS。

---

## 10. 測試與驗證

- **單元測試**（`src/lib/report/__tests__/`）：試算表/分類帳 generator 與兩支 CSV builder，涵蓋三期間切割、樹狀上捲、running balance、`MoneyUtil` 精度、含懸記平衡、前綴陷阱（`1410` 依 `parentCode` 上捲至 `11XX`）、排序、CSV 表頭/攤平/跳脫/合計。
- **離線驗證**：本沙箱離線無法執行 Next SWC / Jest，另以 TypeScript transpile harness 離線驗證全數 PASS（generator + CSV + 邊界 + 硬化）。Jest 測試檔本身可於 CI / 開發環境直接執行。
- **靜態檢查**：所有新增/修改檔 ESLint 零警告、`tsc --noEmit` 零錯誤。
- **會計正確性**：試算表三期間借貸總額各自相等；分類帳每科目末列 balance = 該科目借貸淨額；不平衡輸入被 Fail-Fast 攔截。
- **獨立審查**：由 subagent 做計算正確性與合規性的對抗性複核（結果與修正見 §9 Phase 5）。
- **整合測試（待補）**：`integration_test_guide.md` 的 Supertest 整合測試需正式測試伺服器與 DB，於 CI 補齊；建議案例：租戶隔離（非成員 403）、含懸記帳本平衡、CSV 下載內容比對。

---

## 11. 期程估算（後端，實際對照）

| 階段 | 內容 | 原估 |
|---|---|---|
| 0 | 對齊與設計 | 0.5 天 |
| 1 | 資料源確認 | 0.5–1 天 |
| 2 | 試算表 | 2–3 天 |
| 3 | 分類帳 | 1.5–2 天 |
| 4 | CSV 匯出 | 1 天 |
| 5 | 測試與驗證 | 1.5–2 天 |
| **後端合計** | | **約 7–9.5 天** |
| 6（後續） | 前端 UI | +4–7 天（另行估算） |

---

## 13. 試算表歸屬調整：改列入「報表編制」（2026-07-27，打掉重做）

**決策**：試算表在會計上屬「報表」而非帳簿操作，故從原先「傳票頁 tab」方案改為**「報表編制 (財務報表)」的一個 `ReportType`**，與資產負債表/損益表/現金流量表同一流程（`ReportType` + `ReportPeriod` + PDF 列印）。分類帳仍維持在傳票頁 tab（屬帳簿）。

**打掉（刪除）**：獨立的試算表 API 與 CSV 一式——
`.../trial_balance/route.ts`、`.../trial_balance/export/route.ts`、`src/lib/report/trial_balance_csv.ts`（+ 測試）、`src/validators/trial_balance.ts`（+ `validators/index.ts` 匯出）。報表編制以 PDF 輸出，故不需 CSV 端點。

**保留（報表引擎）**：`src/lib/report/trial_balance_generator.ts`（+ 測試）、`src/interfaces/trial_balance.ts`、`TrialBalanceSorting`（產生器預設排序用）。

**重做（納入報表編制）**：
- `constants/financial_report.ts`：啟用 `ReportType.TRIAL_BALANCE`。
- `.../report/route.ts`：試算表比照資產負債表自開帳起算（不限 gte）；取完整 COA 字典；`getReportData` 新增 `TRIAL_BALANCE` → `generateTrialBalance(vouchers, dictionary, { startDate: 期間起始, endDate: 期間截止, currencyAlias })`。回傳沿用 `{ report, unverifiedItems }`。
- `report_view.tsx`：`getReportTitle` 與 `renderReportView` 新增 `TRIAL_BALANCE` → `<TrialBalanceView period year onUnverifiedItemsChange/>`；報表種類下拉自動出現「試算表」。
- 新增 `src/components/user/financial_report/trial_balance_view.tsx`：期初/期中/期末×借貸六欄 + 科目樹狀縮排 + 合計列，載入/空狀態沿用 `report_placeholders`，未核對分錄回報側欄，PDF 由既有 `report-content-to-print` 列印。
- i18n 5 語系：新增 `report_view.types.trial_balance` 與 `trial_balance_view` 命名空間（`i18n/{lang}.ts` 註冊）。

**驗證**：ESLint 零警告、`tsc` 於本功能檔零錯誤、無殘留對已刪檔的引用；產生器邏輯不變（先前離線測試仍有效）。期間語意：`ReportPeriod`（年+季/全年）的起始日作為期初/期中分界、截止日作為累計截止。

---

## 13.5 試算表 ⇄ 分類帳 超連結（Drill-down，規劃中）

### 目標情境
會計師於「報表編制 ➔ 試算表」看到某科目（例：`1103 銀行存款`）餘額異常時，**點擊該科目的代碼或名稱**，系統即跳轉至「傳票管理 ➔ 分類帳」並自動篩選出該科目明細，一鍵溯源。

### 連結機制（依節點型態分流）
`TrialBalanceView` 的科目「代碼 / 名稱」改為可點擊，並**依節點是否為「明確科目編號」分兩種連結**（因集計根如 `1XXX`/`11XX` 並非可過帳科目，用 `&code=` 會查無分錄）：

- **明確科目編號（全數字，如 `1170`、`1101`）→ `&code=`**：
  `/voucher?tab=ledger&code={code}&labelType={general|all}`
  - `labelType`：有子科目（父科目）→ `general`（分類帳以上捲彙總、以父科目 `code` 標示，故 `keyword={code}` 命中）；葉節點 → `all`。
- **集計根 / 類別節點（含非數字如 `1XXX`、`11XX`）→ `&accountType=`**：
  `/voucher?tab=ledger&accountType={AccountType}`
  - 例：點「1XXX 資產」→ `accountType=asset`，分類帳顯示所有資產類科目之明細。
  - 判斷：`/^\d+$/.test(code)` 為明確編號；否則視為集計根。集計根若 `accountType` 為空則退回 `&code=`。

**目的地（分類帳）**：`LedgerView` 於掛載時讀取 URL query（`code`→`keyword` 初值、`labelType`、`accountType`），自動觸發查詢。`accountType` 為 deep-link 專用篩選（於產出列後以 `item.accountType` 比對），後端 `LedgerQuerySchema`/`generateLedger`/三支 route 皆已支援。

（可選）帶入期間：將報表所選 `ReportPeriod` 換算為 `startDate/endDate` 一併帶入；未帶則分類帳顯示全部。

### 需要的改動
1. `TrialBalanceView`：科目代碼/名稱包成 `next/link` 或 `router.push`，組出上述 query（利用 `item.subAccounts.length` 判斷父/葉決定 `labelType`）。
2. `LedgerView`：以 `useSearchParams` 讀取 `code`（→ `keyword` 初值）、`labelType`、`startDate/endDate`（若有）作為初始篩選狀態；沿用既有 debounce/查詢流程。
3. 路由層：`/voucher` 已支援 `?tab=`；新增 `code`/`labelType` 僅為前端讀取，無需後端改動（分類帳 API 已支援 `keyword`/`labelType`/日期）。
4. i18n：科目連結的 `title`/`aria-label`（如「檢視 {code} 的分類帳」）5 語系。

### 注意事項
- **關鍵字 vs 精確比對**：`keyword` 為 `contains` 比對；以科目編號查詢通常足夠精確，但如 `110` 會命中 `1101/1103…`。若需嚴格單一科目，未來可於分類帳 API 增加「精確科目代碼」參數，deep-link 優先使用之。
- **父科目**：務必帶 `labelType=general`，否則父科目（無直接過帳）在 `all` 下會查無資料。
- **回流體驗**：分類帳頁可提供「返回試算表」或麵包屑，惟非必要；瀏覽器上一頁即可。

### 驗收
- 於試算表點擊 `1103` → 進入 `/voucher?tab=ledger`，關鍵字已帶入 `1103`、清單即為該科目明細；點擊父科目 → 以總帳（上捲）呈現。
- 深層連結可直接分享（重整後篩選仍在）。

---

## 12. Phase 6：前端 UI 施行計劃（分類帳）

### 12.1 決策與方針

經討論確定：**分類帳與試算表以 tab 形式併入既有「傳票」頁**（`VoucherMainView`），而非另開獨立路由。理由：傳票頁本就採 `?tab=` 模式（現有「傳票管理 / 會計科目管理」兩 tab），三者同源於傳票資料、共用帳本與日期脈絡，合併符合既有慣例且集中入口。

- **路由**：沿用既有 `?tab=` 機制 → `/voucher?tab=ledger`、`/voucher?tab=trial_balance`（可深層連結）。
- **前提條件**（避免語意錯位）：
  1. 頁面標題/副標**隨 active tab 動態切換**（現為靜態「智能傳票管理」）。
  2. 每個 tab 各自 render **獨立唯讀 view 元件**；報表邏輯不滲入傳票 CRUD 元件。
  3. 匯出按鈕**統一走擴充後的 `ExportSettingsModal`**：於 `ExportType` 新增 `LEDGER`（後續 `TRIAL_BALANCE`），把現有 `type === VOUCHER ? … : …` 三元式重構為 **type→設定（端點/檔名/欄位/i18n）對照表**；報表型別隱藏「包含未核對」選項（報表本就全納入）。

### 12.1a 需搭配的後端小幅擴充（因 UI 調整而生）

1. **分類帳關鍵字搜尋**：`LedgerQuerySchema`、`ledger/route.ts`、`ledger_generator.ts` 新增 `keyword`；於產生器**產出列後**依 `code / accountingTitle / particulars / voucherNumber` 過濾（running balance 仍以全量計算，總額取顯示列）。`getVouchersByFilter` 已支援 voucher 層 `keyword`，但為涵蓋科目名稱採產生器層過濾。
2. **分類帳匯出筆數**：新增 `.../ledger/export/count/route.ts` 回傳 `{ count }`，供 `ExportSettingsModal` 預覽筆數；`ledger/export` 亦接受 `keyword` 使匯出與畫面一致。
3. 移除 UI 的科目區間後，後端 `startAccountNo/endAccountNo` 仍保留為可選參數（未使用、不影響）。

### 12.2 檔案清單（新增 / 修改）

| 動作 | 檔案 | 說明 |
|---|---|---|
| 修改 | `src/components/user/voucher/voucher_main_view.tsx` | `VoucherTab` enum 增 `LEDGER`、`TRIAL_BALANCE`；tab bar 由 2 欄改 4 欄；標題/副標/匯出行為依 active tab 切換；render 對應 view |
| 新增 | `src/components/user/ledger/ledger_view.tsx` | 分類帳唯讀視圖：日期區間 + 帳別(LabelType) + **關鍵字搜尋** + 排序(LedgerSorting) + `Pagination` + 匯出（開 `ExportSettingsModal`） |
| 新增 | `src/components/user/trial_balance/trial_balance_view.tsx` | 試算表唯讀視圖：日期區間 + 排序(TrialBalanceSorting) + 樹狀表格（子科目展開/收合）+ `Pagination` + 匯出 |
| 修改 | `src/components/user/common/export_settings_modal.tsx` | `ExportType` 增 `LEDGER`；三元式重構為 type→設定對照表；報表型別隱藏「包含未核對」；接關鍵字 |
| 修改 | `src/app/api/v1/user/account_book/[account_book_id]/ledger/{route,export/route}.ts`、`src/validators/ledger.ts`、`src/lib/report/ledger_generator.ts` | 新增 `keyword` 篩選（見 §12.1a） |
| 新增 | `src/app/api/v1/user/account_book/[account_book_id]/ledger/export/count/route.ts` | 回傳 `{ count }` 供匯出筆數預覽 |
| 修改（或新增）| `src/i18n/locales/{en,zh_tw,zh_cn,ja,ko}/voucher.ts` | 新增 tab 標籤、各 tab 標題/副標、報表欄位表頭、篩選器、空狀態等文案（5 語系） |
| 重用 | `src/components/common/date_range_picker.tsx` | 直接重用（props：`startDate`/`endDate`/setter） |
| 重用 | `src/components/common/pagination.tsx` | props：`{ currentPage, totalPages, onPageChange }` |

> 型別直接 import 後端已交付之 `ITrialBalance`/`ITrialBalanceItem`、`ILedger`/`ILedgerItem`（`@/interfaces/*`）作為 API 回應型別，前後端契約一致。

### 12.3 資料串接

- 沿用 `voucher_table_section.tsx` 相同慣例：`fetch("/api/v1/user/account_book/{id}/{ledger|trial_balance}?...")` → 解析 `IApiResponse`。
- 金額為 Decimal 字串，**顯示時**以 `MoneyUtil.format`/`formatDynamic` 加千分位（渲染層才轉換，符合精度規範）。
- 分頁使用共用 `Pagination` 元件（`currentPage/totalPages/onPageChange`），資料取自後端 `page/pageSize/totalCount/totalPages`；`note.total`、`note.currencyAlias` 顯示於合計列/頁尾。
- 篩選狀態（日期、帳別、關鍵字、排序、頁碼）以 `useState` 管理，變更即重新請求（關鍵字建議 debounce，比照 `voucher_table_section` 的 `debouncedKeyWord`）。

### 12.4 各 tab 視圖重點

- **試算表 tab**：日期區間（分界/截止）；表格六欄（期初/期中/期末 × 借/貸）+ 科目編號/名稱；子科目以樹狀縮排、可展開收合（對應 `subAccounts`）；末列顯示合計並標示借貸平衡；CSV 下載鈕呼叫 `.../trial_balance/export`。
- **分類帳 tab**：日期區間（必填）；帳別切換（全部/總帳/明細）；**關鍵字搜尋**（科目編號/名稱、摘要、傳票編號，debounce）；排序（科目/日期）；依科目分組逐筆列出 傳票編號/日期/類型/摘要/借/貸/餘額；`Pagination`；頁尾借貸總額；匯出經 `ExportSettingsModal`。（**不含**科目區間）

### 12.5 驗收

- 兩 tab 可由 `?tab=` 深層連結進入；標題/副標隨 tab 正確切換。
- 報表為唯讀（無編輯/刪除入口）；串接正確、分頁正常、CSV 可下載。
- i18n 5 語系齊備；RWD（含 `mobile_tab`）正常。
- ESLint 零警告、`tsc --noEmit` 零錯誤；比照 `balance_sheet` 前端風格。

### 12.6 注意事項

- **標題語意**：務必動態化，避免「試算表」顯示在「智能傳票管理」標題下。
- **試算表金額用語（M4，已定案）**：沿用舊版「期初/期中/期末 借方/貸方餘額」字樣，前端表頭與後端一致，無需再議。
- **分類帳 GENERAL（C2，已定案並實作）**：GENERAL 已採「上捲彙總」，前端「總帳」tab 可直接顯示彙總後之總帳科目，三個帳別（全部/總帳/明細）皆可開放。

### 12.8 分類帳 tab 完成紀錄（2026-07-24）

**後端小擴充（已實作）**
- 分類帳 `keyword`：`ILedgerOptions`/`LedgerQuerySchema`/`ledger route`/`ledger/export`/新 `ledger/export/count` 皆接 `keyword`；`ledger_generator` 於產出列後依 `code/accountingTitle/particulars/voucherNumber` 過濾，running balance 仍全量計算、總額取顯示列。單元測試 + 離線 harness 全 PASS。
- 新增 `.../ledger/export/count/route.ts` 回傳 `{ count }`。

**ExportSettingsModal 擴充（已實作）**
- `ExportType` 增 `LEDGER`；三元式重構為 `EXPORT_CONFIG` 對照表（端點/檔名/i18n/showUnverified）；新增 `initialStartDate`/`initialEndDate`/`extraParams` props；報表型別隱藏「包含未核對」。5 語系 common 新增 `title_ledger`/`desc_ledger`/`stat_title_ledger`/`unit_ledger`/`failed_ledger`。

**前端（已實作）**
- `src/components/user/ledger/ledger_view.tsx`：日期區間 + 帳別(全部/總帳/明細) + 關鍵字(debounce) + 排序；依科目分組表格；`Pagination`；借貸總額卡；匯出經 `ExportSettingsModal`（type=LEDGER，帶入日期與 extraParams）。金額 `MoneyUtil.format`（渲染層）。
- `voucher_main_view.tsx`：`VoucherTab` 增 `LEDGER`、tab bar 改 3 欄、報表 tab 隱藏傳票 header（分類帳自帶標題/匯出）。
- i18n 5 語系新增 `voucher.tab.ledger`、`voucher.main_view.title_ledger/subtitle_ledger`、`voucher.ledger.*`。

**驗證**：新增/修改檔 ESLint 零警告、`tsc --noEmit` 於本功能檔零錯誤（專案既有他處錯誤與本功能無關）。因離線無法跑 Next dev/Jest，未做瀏覽器實測，建議於開發環境做一次 UI 驗收。

**UI 整併與樣式（2026-07-27）**
- 匯出改為**單一共用 `ExportSettingsModal`**（置於 `VoucherMainView`）：依 active tab 決定 `type`（VOUCHER/LEDGER）與帶入條件；`LedgerView` 透過 `onExportParamsChange` 上報目前篩選（日期/keyword/labelType/sorting），並移除自身 header/匯出鈕/Modal（header 已整併至 `VoucherMainView`，標題/副標/匯出文字隨 tab 動態切換）。
- `LedgerView` 表格樣式比照 `VoucherTableSection`：白底 toolbar、`bg-slate-100` 大寫表頭、科目代碼 pill、交易類型徽章、金額右對齊且 0 顯示「−」、科目群組標題、合計列、`numberWithCommas`。

**行為調整（2026-07-27）**
- 分類帳日期改為**可選**：未選日期時比照傳票管理**顯示全部**（validator `startDate/endDate` optional；list/export/count route 未帶日期即不加 `tradingDate` 條件；`ledger_view` 移除日期必填 gate 與「請選日期」空狀態、匯出鈕不再 disabled）。
- 全功能檔註解時間戳統一為 `20260727`。

**待辦**：試算表 tab（`trial_balance_view.tsx` + `ExportType.TRIAL_BALANCE` + `?tab=trial_balance`）。

### 12.7 期程估算

| 項目 | 估時 |
|---|---|
| 後端小幅擴充（分類帳 keyword + export/count） | 0.5 天 |
| `ExportSettingsModal` 擴充（type 對照表 + LEDGER） | 0.5 天 |
| voucher_main_view tab 擴充 + 標題動態化 | 0.5 天 |
| 試算表 view（含樹狀表格） | 2–3 天 |
| 分類帳 view（帳別/關鍵字/分頁/匯出） | 2–3 天 |
| i18n 5 語系 + RWD + 驗收 | 1–1.5 天 |
| **前端合計** | **約 7–9 天** |

> 依賴：建議先解決 §8 之 C2（總帳語意）與 M4（金額字樣），以免前端返工。
