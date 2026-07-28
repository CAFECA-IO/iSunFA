# Ticket：分類帳／報表 route 下沉至 Service 層（架構分層重構）

> 類型：重構（Roadmap）／優先級：中高（架構債，且為既有遷移遺漏的根因）
> 建立日：20260728 ／ 提出者：Julian
> 狀態：待排期

---

## 1. 背景與違規事證

CLAUDE.md §1 明訂三層式單向依賴：**API（route）為純端口**，只做「接收 Request → 呼叫 Validator → 呼叫 Service → 格式化回傳」，**絕不含業務邏輯或 DB 操作**；**唯有 Service 能協調多個 Repository**。

本 branch 四支 route 全部違反此規範——直接 import repository 並在 API 層 orchestrate 業務邏輯：

| Route | 直接引用的 Repository |
| --- | --- |
| `ledger/route.ts:4-6` | `accountBookRepo` / `teamRepo` / `voucherRepo` |
| `ledger/export/route.ts:4-6` | 同上 |
| `ledger/export/count/route.ts:4-6` | 同上 |
| `report/route.ts:4,12-13` | `accountBookRepo` / `teamRepo` / `voucherRepo`（+ `esgRepo`） |

**根因論證**：前述三個已修復的 bug——(1) `report` route 缺租戶隔離、(2) `sorting` 未傳入、(3) 未驗證輸入——本質都是「業務邏輯散落 route、缺乏單一收斂點」導致的遷移遺漏。舊 `trial_balance/route.ts` 拆進 `report/route.ts` 時，因每支 route 各自手寫權限與 orchestration，任何一步漏抄都不會被型別或既有測試攔下。抽出 Service 建立單一收斂點，可從結構上杜絕此類回歸。

## 2. 現況：route 內散落的業務邏輯

以 `ledger/route.ts` 為例，單一 handler 內含：

1. 身分驗證（`getIdentityFromDeWT` → `NF_USER`）
2. 取帳本（`accountBookRepo.getAccountBookById` → `NF_ACCOUNT_BOOK`）
3. **租戶隔離**（`teamRepo.getTeamMember` → `AUTH_PERMISSION_DENIED`）
4. 參數驗證（`LedgerQuerySchema.safeParse`）
5. 取傳票（`voucherRepo.getVouchersByFilter`，含日期區間換算）
6. 取 COA 字典（`accountingAccountService.getAccountingAccounts`）
7. 呼叫 generator（`generateLedger`）
8. **分頁運算**（`slice` / `totalPages`）
9. 錯誤語意轉換（`Data Integrity` → `VA_INVALID_INPUT_DATA`；其餘 → `IS_DB_FAILED`）

`export` / `count` 除輸出型態不同（CSV／筆數）外，步驟 1–7、9 幾乎重複。`report/route.ts` 另有期間換算（`getTradingDateRange`）、5 種報表分派、`unverifiedItems` 彙整、ESG 分支。**同一段權限＋取數＋產表邏輯在四處各寫一份**。

## 3. 目標架構

```
route（純端口）
  → 驗 token 取得 sessionUser（端口職責：解析身分）
  → Schema.safeParse（呼叫 Validator）
  → service.method(accountBookId, sessionUser.id, query)   // 唯一入口
  → jsonOk / fileOk（格式化回傳）
  → catch → 錯誤語意轉換

LedgerService / ReportService（業務大腦）
  → 授權（帳本存在 + team 成員）  ← 單一收斂點
  → 取傳票 / 取 COA / 期間換算
  → 呼叫純函式 generator
  → 分頁 / 彙整 unverified

Repository（唯一碰 DB）
```

### 3.1 建議 Service 介面

```ts
// src/services/ledger.service.ts
class LedgerService {
  // Info: 授權 + 取數 + 產表 + 分頁，回傳分頁後的分類帳
  getLedger(accountBookId: string, userId: string, query: ILedgerQuery): Promise<ILedgerPageResult>;
  getLedgerCsv(accountBookId: string, userId: string, query: ILedgerQuery): Promise<{ filename: string; csv: string }>;
  getLedgerCount(accountBookId: string, userId: string, query: ILedgerQuery): Promise<number>;
}

// src/services/report.service.ts（或 trial_balance.service.ts，視是否連帶收斂 BS/IS/CF/ESG）
class ReportService {
  getReport(accountBookId: string, userId: string, query: IReportQuery): Promise<IReportResult>;
}
```

### 3.2 共用授權收斂點（關鍵）

抽一個 `AccountBookAccessGuard.assertMember(accountBookId, userId)`（或 Service 基底方法），內部完成「取帳本 → 不存在則 `NF_ACCOUNT_BOOK` → 非 team 成員則 `AUTH_PERMISSION_DENIED`」，回傳已驗證的 `accountBook`。**四支 route（及未來新報表）共用同一入口**，杜絕漏檢。以 Service 層拋出可對映錯誤碼的具名例外，由 route 的 catch 統一轉 `jsonFail`。

## 4. 遷移步驟（保持行為，分階段）

1. 定義結果型別（`ILedgerPageResult` / `IReportResult`）與 Service 例外（可映射至 `API_ERRORS`）。
2. 實作 `AccountBookAccessGuard`（授權收斂點）＋單元測試（成員／非成員／帳本不存在）。
3. 實作 `LedgerService`（含分頁、CSV、count 三方法），移植 route 現有邏輯，**行為逐字對齊**。
4. 實作 `ReportService`（期間換算、5 報表分派、unverified 彙整）。
5. 逐支改寫 route → 只留「驗 token → safeParse → 呼叫 service → 格式化 → catch 轉錯誤碼」；移除所有 `*Repo` import。
6. 迴歸驗證（見 §5）。

## 5. 驗證策略

- **generator 純函式測試不受影響**（`generateLedger` / `generateTrialBalance` 已有覆蓋），重構不動這層。
- 新增 **Service 單元測試**：授權三情境、分頁邊界、錯誤語意轉換（`Data Integrity` → `VA_INVALID_INPUT_DATA`）。
- 既有 `trial_balance.e2e`／勾稽測試改為經 Service 呼叫（若採 e2e 路線）。
- **契約不變**：route 的 URL、query、回傳 JSON 結構、錯誤碼一律不變 → 前端零改動。以現有回應快照比對確保等價。
- `eslint` / `tsc` 乾淨；`npm test` 綠。

## 6. 影響面與風險

- **影響檔**：4 支 route（改寫）＋新增 2–3 個 service／guard；前端與 validator **不變**。
- **風險**：
  - 錯誤語意需逐一保留（`NF_USER` 屬 token 端口、`NF_ACCOUNT_BOOK`／`AUTH_PERMISSION_DENIED` 屬授權、`VA_INVALID_INPUT_DATA` 屬資料整合性、`IS_DB_FAILED` 屬其餘）。
  - `getIdentityFromDeWT`（token 解析）留在 route，`userId` 傳入 service；授權（team 成員）下沉 service。界線需一致。
  - ESG 分支目前混在 `report` route，遷移時一併釐清是否併入 `ReportService`。

## 7. 排期建議

屬架構債，**建議獨立 MR**、不與功能開發混雜，並以「契約快照等價」為驗收門檻。可作為分類帳／試算表功能穩定後的收斂重構。
