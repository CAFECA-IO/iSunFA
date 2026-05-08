# 實作與技術債：01. 憑證上傳至日記帳 (Receipt to Journal)

> **CPA 查核視角 (Audit Lens)**：
> 日記帳 (Journal) 是所有財報的起源，也就是「原始憑證」轉化為「文字紀錄」的第一道關卡。此階段的底線是「零捏造 (Zero Invention)」，客戶揭露多少憑證，系統就只產出多少事實，確保後續查帳時的人事時地物能 100% 溯源。

## 1. 模組實作現況 (Current Implementation)

**觸發點**：使用者上傳憑證影像或檔案，觸發 `certificate_analysis.generator.ts`。
**處理邏輯**：
系統呼叫 `src/constants/prompts/journal.ts` 中的 `getJournalPrompt`。此 Prompt 將 AI 定位為「純粹的資料萃取器」，要求 AI 以 Markdown 格式輸出一段完整的企業活動故事：
- **事件摘要**：描述這張憑證背後的企業活動（人事時地物）。
- **憑證資訊**：條列憑證上的所有客觀數字與文字。
- **其他備註**：標示出是否有偽造痕跡、數據不合常理的地方。
- **產出格式**：回傳 JSON (`tradingDate`, `text`, `confidence`, `aiNote`)。

## 2. 存在之技術債與架構地雷 (Technical Debts & Gotchas)

### 🚨 2.1 喪失防幻覺約束 (Loss of Anti-Hallucination Sandbox)
原本在 `vision.accounting.service.ts` 中，為了達到 100% 事實對應，系統被設計為必須在 `temperature: 0.1` 的極低溫度下運行，且有嚴格的 3-Phase 隔離。
但目前的實作為了方便整合，將其放入了通用的 Worker Pipeline (`certificate_analysis.generator.ts`) 中。通用 Worker 缺乏對特定會計場景的極端約束，可能導致 AI 在處理「模糊憑證」時，為了讓「故事（人事時地物）」通順而自動**腦補（捏造）**缺漏的細節，這在 Big 4 查帳時是致命傷。

### 🚨 2.2 缺乏防呆快取機制 (Missing Hash-based Caching)
目前只要使用者重複上傳相同憑證，系統就會無條件重新打給 Gemini 消耗 Token。
作為企業級架構，第一道防線必須是在影像進入 AI 前計算 File Hash。若影像相同且過去解析的 `confidence` 足夠高，應直接調用資料庫內的客觀紀錄，確保系統「冪等性 (Idempotency)」並極小化營運成本。

## 3. Deloitte 級別重構目標 (Refactoring Towards Audit-Ready)

1. **復活嚴格沙盒 (Revive Rigid Sandbox)**：將 `JOURNAL_PARSING` 任務從通用 Worker 剝離，或在 Task Generator 內實作強制的 LLM 參數覆寫 (`temperature: 0.0` ~ `0.1`)。
2. **零捏造斷言 (Zero Invention Assertion)**：在程式碼層級新增檢查機制，如果 `confidence < 80` 且憑證含有不可辨識區塊，系統必須拒絕生成完整故事，並直接送入「人工覆核 (Human-in-the-Loop)」佇列，寧可顯示 `N/A` 也不准 AI 填寫假資料。
