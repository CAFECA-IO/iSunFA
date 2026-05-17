# 🛡️ iSunFA 內部控制與系統自動控制說明書 (ITAC)

> **Date**: 2026-05-15
> **Author**: Tzuhan
> **Document Status**: Active (For Big 4 Audit Review)
> **Framework**: COSO Internal Control - Integrated Framework

本文件定義 iSunFA 系統如何對齊 COSO 內部控制框架，確保財報與 ESG 數據產出的完整性、準確性與不可竄改性。我們揚棄了傳統 Web2 繁瑣的「人工 Maker-Checker」流程，轉向基於智能合約的「自動化全鏈上稽核」。

## 1. COSO 框架對應 (COSO Mapping)

| COSO 要素      | iSunFA 系統自動控制實作 (Automated Controls)                                                                                                       |
| :------------- | :-------------------------------------------------------------------------------------------------------------------- |
| **控制環境**   | **[動態 KYC 與 無密碼架構]** 系統實作了 Web3 錢包與 FIDO2 (`credentialId`, `address`)，並透過 `Dynamic KYC Membership` 智能合約，達成實體級的防盜與業務身分解耦。 |
| **風險評估**   | **[混合決策管線]** 導入決定論邏輯與 `ANTI_HALLUCINATION_RULES`，嚴格將生成式 AI 限制於「萃取」行為，將算術與財務風險降至零。                                                    |
| **控制活動**   | **[去中心化資金信託 (Escrow)]** 任務的發包與撥款受到 `mission_board.sol` 的強制約束。唯有 Worker 上傳符合規範的 `resultCid` 並獲發起方 `approveSubmission`，資金才會釋放。 |
| **資訊與溝通** | **[非同步資料錨定]** 任務的 Input (`contentCid`) 與 Output (`resultCid`) 永久綁定並寫入智能合約，達成無法被 DBA 竄改的單一真相來源 (SSOT)。 |
| **監督作業**   | **[去中心化仲裁賽局]** 當 AI 解析信心度不足或發生錯誤，系統將觸發 `rejectSubmission` 與 `raiseDispute` 流程，確保所有的異常監督與仲裁都有區塊鏈軌跡。                                                 |

## 2. 異常處理與去中心化仲裁規範 (Dispute Arbitration)

系統徹底消滅了傳統的「主管二次簽核 (Human-in-the-Loop)」模式，改以 Web3 的爭議仲裁機制取代：

**[自動化防呆與仲裁流轉]**：
當 Executor 遇到 `confidence < 80`、LLM 解析異常，或觸發重大金額不平時：
1. **阻斷自動請款**：Worker 的產出將無法自動獲得 `approveSubmission`，任務狀態卡在 `PendingReview` 或直接被打入 DLQ (`giveup.md`)。
2. **進入爭議期**：發起方可呼叫 `rejectSubmission` 拒絕該次 AI 產出。此時進入 `DISPUTE_PERIOD`。
3. **區塊鏈公證仲裁**：無論最終是 Worker 認賠，還是交由系統管理員 (`DEFAULT_ADMIN_ROLE`) 介入呼叫 `resolveDispute` 進行人工仲裁，這個「人為介入糾錯」的動作本身就會成為一筆不可竄改的區塊鏈交易，滿足 Big 4 稽核對「系統外覆核軌跡」的極致要求。

## 3. 重大性門檻 (Materiality Definition)

**[系統自動化實作]**：

- **財務面**：若 AI 解析總金額與明細加總存在 `<= 1 TWD` 的尾數進位差異，系統將不觸發 Dispute 阻斷，而是依據「包容不完美揭露的財報容錯 (Partial Disclosure Tolerance)」原則，自動拋轉至「雜項支出/收入」或懸記科目，確保管線不中斷。
- **ESG 面**：若該筆排放源佔總排放量 `< 1%` 且難以取得精確係數，允許 Worker 採用產業平均係數並標註 `generationSource` 供事後審計。
