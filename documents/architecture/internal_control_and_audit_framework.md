# 🛡️ iSunFA 內部控制與系統自動控制說明書 (ITAC)

> **Date**: 2026-05-10
> **Author**: Tzuhan

> **Document Status**: Draft (For Big 4 Audit Review)
> **Framework**: COSO Internal Control - Integrated Framework

本文件定義 iSunFA 系統如何對齊 COSO 內部控制框架，確保財報與 ESG 數據產出的完整性、準確性與不可竄改性。

## 1. COSO 框架對應 (COSO Mapping)

| COSO 要素      | iSunFA 系統狀態                                                                                                       |
| :------------- | :-------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| **控制環境**   | **[現有實作]** 系統已實作 Web3 錢包概念與 FIDO2 (`credentialId`, `address`)，達成真正的無密碼 (Passwordless) 架構與實體級防盜。 |
| **風險評估**   | **[現有實作]** 導入「混合決策管線」與 `ANTI_HALLUCINATION_RULES`。                                                    |
| **控制活動**   | **[現有實作]** TypeScript 決定論分錄與 `generationSource` 審計標籤。**[已修正架構]** 強制結算斷言，允許部份揭露容錯，並確保所有借貸差額 100% 流向懸記科目 (Suspense Account)。 |
| **資訊與溝通** | **[現有實作]** 過程 (`aiNote`) 寫入 `execution_log.json`。**[Antigravity 推薦規劃]** 錨定至區塊鏈 Hash-Chained Logs。 |
| **監督作業**   | **[現有實作]** DLQ 機制自動攔截失敗次數 `>= 3` 的任務 (`giveup.md`)。                                                 |

## 2. 人工覆核規範 (Human-in-the-Loop, HITL)

**[現有實作]**：
系統目前會將錯誤次數過多的任務停留在 `failed_*.md` 或寫入 `giveup.md`，不再自動重試。AI 也會依據 Prompt 產出 `confidence` 分數。

**[Antigravity 推薦規劃 (尚未實作)]**：
當 `confidence < 80` 或系統觸發異常時：

1. **任務凍結**：禁止寫入總帳。
2. **權限隔離**：初階操作員僅能補登資訊，必須經過具備 CPA / 主管憑證的多簽錢包 (Multi-Sig) 進行二次簽核後，方可解凍。

## 3. 重大性門檻 (Materiality Definition)

**[Antigravity 推薦規劃 (尚未實作)]**：

- **財務面**：若 AI 解析總金額與明細加總存在 `<= 1 TWD` 的尾數進位差異，系統可自動拋轉至「雜項支出/收入」。
- **ESG 面**：若該筆排放源佔總排放量 `< 1%` 且難以取得精確係數，允許採用產業平均係數。
