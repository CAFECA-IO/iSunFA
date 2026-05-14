# 實作與技術債：01. 憑證上傳至日記帳 (Receipt to Journal)

> **Date**: 2026-05-10
> **Author**: Tzuhan

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

### 🚨 2.1 ✅ 已拆除：喪失防幻覺約束與 AI 腦補地雷 (Loss of Anti-Hallucination Sandbox)

原本在 `vision.accounting.service.ts` 中，為了達到 100% 事實對應，系統被設計為必須在 `temperature: 0.1` 的極低溫度下運行，且有嚴格的 3-Phase 隔離。
但目前的實作為了方便整合，將其放入了通用的 Worker Pipeline (`certificate_analysis.generator.ts`) 中。通用 Worker 缺乏對特定會計場景的極端約束，加上過去 Prompt 要求 AI 寫「企業活動故事」，這直接觸發大語言模型 (LLM) 的幻覺本能。為了讓故事通順，AI 會自動捏造（腦補）發票上不存在的人事時地物，這在 Big 4 查帳與「零捏造鐵律」下是致命傷。
**現已拆彈**：我們已移除 `journal.ts` 中的故事敘述指令，改採「分析師模式 (Analyst Mode)」。在第一階段僅萃取供應商、日期、金額等特徵，待結算後再交由 AI 依據真理數據進行分析。

### 🚨 2.2 缺乏防呆快取機制 (Missing Hash-based Caching)

目前只要使用者重複上傳相同憑證，系統就會無條件重新打給 Gemini 消耗 Token。
作為企業級架構，第一道防線必須是在影像進入 AI 前計算 File Hash。若影像相同且過去解析的 `confidence` 足夠高，應直接調用資料庫內的客觀紀錄，確保系統「冪等性 (Idempotency)」並極小化營運成本。

### 🚨 2.3 脆弱的 JSON 正規表達式擷取 (Fragile Regex JSON Extraction)

在目前的實作中，當 AI 回傳結果且 `JSON.parse` 失敗時，系統依賴 `/\{[\s\S]*\}/` 進行 Fallback 擷取。這是一個巨大的技術債。若 AI 的 Markdown 中包含多個獨立的 JSON 區塊，此 Regex 會將中間的純文字一併包入，產生絕對無法 Parse 的無效字串，導致該筆憑證靜默遺失 (Silent Data Loss)。Roadmap v2 已明文規定廢除此作法。

## 3. Deloitte 級別重構目標 (Refactoring Towards Audit-Ready)

1. **復活嚴格沙盒 (Revive Rigid Sandbox)**：將 `JOURNAL_PARSING` 任務從通用 Worker 剝離，或在 Task Generator 內實作強制的 LLM 參數覆寫 (`temperature: 0.0` ~ `0.1`)。
2. **零捏造斷言 (Zero Invention Assertion)**：在程式碼層級新增檢查機制，如果 `confidence < 80` 且憑證含有不可辨識區塊，系統必須拒絕生成完整故事，並直接送入「人工覆核 (Human-in-the-Loop)」佇列，寧可顯示 `N/A` 也不准 AI 填寫假資料。
3. **✅ 已完成：全面升級結構化輸出與後端重組**：徹底廢除「寫故事」。改為要求 AI 輸出精簡的 Key-Value 特徵 (JSON)。在後端 (`document_sync.repo.ts`) 再由系統自動將客觀數字重組為條理分明的 Markdown 格式寫入資料庫，兼顧安全與可讀性。
4. **✅ 已完成：外幣萃取邏輯**：若發票包含外幣資訊，AI 會將這些外幣細節（原幣金額與匯率）如實記錄在它該在的 `text` 或 `aiNote` 裡，透過 Chain of Thought 自然呈現，避免為了特例而污染核心資料庫的 Schema。
