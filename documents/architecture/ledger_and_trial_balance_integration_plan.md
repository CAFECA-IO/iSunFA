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
| 6 | 前端 UI | ⛔ 未動工（本次不含） |

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
| **C2** | 分類帳 `LabelType.GENERAL`（總帳）語意 | 目前僅保留非葉科目；因過帳多落在葉節點，GENERAL 幾乎為空 | 將葉科目過帳上捲至其總帳（父）科目彙總呈現；語意確認後實作 |
| **M3** | 分類帳 running balance 未含期初 (B/F) 餘額 | 目前為期間相對餘額 | 導入開帳以來累計之期初餘額（與現金流量表同屬 Roadmap） |
| **M4** | 試算表六欄為「發生額累計」而非「淨餘額」 | 與舊版設計一致；CSV 表頭用「餘額」字樣 | 確認是否改為淨額呈現或調整表頭字樣 |
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

## 12. 後續（Phase 6：前端 UI，本次不含）

- App Router 頁面 `src/app/user/account_book/[account_book_id]/{trial_balance,ledger}/page.tsx`。
- i18n（`src/i18n/locales/*`）、日期/科目選擇器、清單/列印/CSV 下載。
- 串接本文件已交付之 GET 清單與 export 端點。
