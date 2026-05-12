# iSunFA 核心領域模型與資料庫綱要指南 (Domain Models & Schema Guidelines)

> **Date**: 2026-05-12
> **Author**: Tzuhan
> **Context**: 本指南旨在釐清系統中容易混淆的核心領域實體 (Domain Entities)，並規範資料庫表 (Tables) 的使用場景與界限。

---

## 1. 公司與帳本的本質區別 (Company vs. AccountBook)

在開發 iSunFA 時，開發者常常會混淆 `Company` 與 `AccountBook`。雖然兩者在現實世界中都可能被稱為「公司」，但在系統架構與業務領域中，它們有著**完全不同且不可跨越**的定義與用途：

### 🏢 `Company` 表：全域外部觀察對象 (Global Observable Entities)

- **定位**：這是一份**唯讀的公開資料字典**。
- **資料來源**：主要由 `scripts/sync_companies.ts` 從台灣證券交易所 (TWSE) 的開放 API 定期爬取而來，包含所有上市櫃公司的統一編號、產業別、上市日期等資訊。
- **使用場景**：
  - 僅用於外部資料的爬蟲與搜集（例如 `ReportDownloadTask` 自動去各大平台下載這些公司的永續報告書 PDF 或是財報 JSON）。
  - 作為系統的全域參考資料，供外部分析、Benchmark 對比使用。
- **嚴格禁忌**：
  - **絕對不可以**將任何內部系統測試產生的業務資料（如傳票 `Voucher`、日記帳 `Journal`、碳排紀錄 `EsgRecord`）綁定在 `Company` 上！
  - 系統內任何模擬資料 (E2E Mock Data) 均不可與 `Company` 表扯上關係。

### 📓 `AccountBook` 表：系統租戶與企業私有帳本 (Tenant ledgers / Private Books)

- **定位**：這是 iSunFA 系統內**真正的資料歸口與業務承載實體**。
- **定義**：代表一個企業客戶（或是 E2E 測試虛擬出來的企業）在 iSunFA 系統內所開立的「會計帳本與 ESG 帳本」。
- **關聯性**：
  - 它是所有業務活動的 **Root Node**。
  - **所有**的憑證 (`Journal`)、傳票 (`Voucher`)、傳票分錄 (`VoucherLine`)、ESG 紀錄 (`EsgRecord`)、碳排放源 (`EmissionSource`)、自訂碳排係數 (`Coefficient`)，都必須且只可以透過 `accountBookId` (或是間接透過 `voucher` 等) 綁定至 `AccountBook`。
- **使用場景**：
  - 內部用戶的操作。
  - E2E 測試資料的生成與匯出（例如 `export_phase2_db.ts` 必須針對 `e2e-book-*` 開頭的 `AccountBook` 進行操作，而非 `Company`）。

> **💡 快速記憶法則：**
>
> - 如果你是要**「向外看」**（爬別人家的公開報告），請找 `Company`。
> - 如果你是要**「向內記」**（記自己的帳、算自己的碳排），請找 `AccountBook`。

---

## 2. 測試資料命名規範 (E2E Test Data Conventions)

為了防止測試資料污染生產環境資料，所有系統產生的測試用帳本 (`AccountBook`) 必須遵循嚴格的命名綴詞：

- `AccountBook.id` 必須以 `e2e-book-` 作為前綴。
- 這樣在清理環境或是執行匯出腳本時（如 `export_phase2_db.ts`），即可安全地依據此前綴過濾，而不會誤刪或誤拿使用者的真實帳本資料。
