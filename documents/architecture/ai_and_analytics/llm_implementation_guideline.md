# 🧠 iSunFA LLM 實作規範與邊界防護指南 (LLM Implementation Guidelines)

> **Date**: 2026-05-10
> **Author**: Tzuhan
> **Context**: 本規範定義了大型語言模型 (LLM, 如 Gemini) 在 iSunFA 企業級混合審計系統中的「職責邊界」。核心原則為：**「沒有完美的工具，只有最適合的場景」**。我們必須將 LLM 定位為一個「基於機率的語意理解器」，而非「確定性的計算機」。本文件明訂了如何透過架構設計將幻覺降至極限。

---

## 🏛️ 第一章：LLM 的能力邊界 (Sweet Spots & Anti-Patterns)

### 🟢 LLM 適合做什麼？（Sweet Spots）

LLM 的強項在於「處理非結構化的自然語言」。只要任務的核心是「語言轉換」或「模式匹配」，它就能做得極好：

1. **語意理解與摘要**：從複雜的發票、合約中提取關鍵欄位。
2. **非結構化轉結構化**：將雜亂的文字精準提取出人事地物，並輸出成嚴格的 JSON 格式供後端系統對接。
3. **跨語系與風格翻譯**：不僅是中英互譯，還包含將「非結構化憑證」翻譯成「標準會計語言」。

### 🛑 LLM 不適合做什麼？（Anti-Patterns）

在 `src/constants/prompts` 與任何非同步 Worker 中，嚴格禁止以下實作，因為會計審計需要的是**確定性 (Determinism)**：

1. **嚴禁精確的數學計算 (No Math)**：
   - **原因**：LLM 是用預測下一個字的方式在算數，面對大數值出錯率極高。
   - **規範**：LLM 只負責「萃取」字面數字。稅額加總、碳排當量乘法，必須全交由 TypeScript 後端透過高精度 (`Prisma.Decimal`, `BigInt`) 重新運算。
2. **嚴密邏輯推演與規則判斷 (No Logic Judgments)**：
   - **原因**：LLM 缺乏真正的演繹推理能力。當 Prompt 寫滿「若 A 且 B 但非 C...」，只要情境稍微偏移，邏輯鍊必定崩潰。
   - **規範**：將 AI 徹底降級為「視力極佳的字串萃取器」。所有判斷必須收斂到 TypeScript 的 If-Else 規則引擎（如混合決策管線 Stage 2）。
3. **當作動態的事實資料庫**：
   - **原因**：LLM 的知識有時間差，且容易為了滿足提問而「編造」答案（如編造不存在的會計科目或最新碳排係數）。
4. **嚴格廢除自由格式的輸出 (No Free-form Parsing)**：
   - **規範**：嚴禁要求 AI「輸出 JSON 字串」然後用 Regex 硬抓。系統即將全面升級啟用 `responseMimeType: "application/json"` 或嚴格定義 `responseSchema` (已列入 Sprint 1 優先重構任務)。

---

## 🛡️ 第二章：如何透過架構「完全」避免 AI 幻覺

身為企業級軟體，我們認知到「單憑生成式模型無法 100% 避免幻覺」。但我們可以透過以下工程手段，將幻覺逼近於 0：

1. **讓 LLM 當大腦，不要當手腳 (Function Calling)**：
   LLM 負責理解意圖，然後呼叫外部 API (如資料庫查表、數學計算工具) 執行確定性任務。
2. **導入 RAG (檢索增強生成)**：
   解決「事實性幻覺」。先透過 Vector DB 找出標準答案（如該廠商歷史的 Golden JSON），再連同問題一起餵給 LLM，並強制規定：「只能根據提供文件回答」。
3. **嚴格的 Prompt Engineering 制約**：
   - **降溫 (Temperature = 0)**：在所有非創意的資料萃取任務中，鎖死 Temperature，最大程度降低隨機性。
   - **思維鏈 (Chain of Thought, CoT)**：強迫模型在輸出最終 JSON 前，先在 `aiNote` 寫下推理過程，減少邏輯跳躍。
4. **建立護欄機制 (Guardrails & Validation)**：
   永遠不要直接採信 LLM 的萃取數值，必須與後端確定性系統進行交叉比對：
   - **格式校驗**：若 Schema 解析失敗，自動觸發重試機制或丟入死信佇列 (DLQ)。
   - **財務恆等式護欄 (Financial Articulation)**：後端程式必須強制覆核 AI 輸出的分錄「借貸總和是否絕對平衡 (A = L + E)」。
   - **物理質量守恆護欄 (Physical Mass Conservation)**：在計算 Scope 3 供應鏈碳排時，將萃取出的「消耗重量」與 ERP 系統進行物理比對：`期初庫存 + 本期採購 = 消耗重量 + 期末庫存`。若 AI 幻覺出超過實體上限的數值，系統立刻報錯凍結，達成「零捏造」。

---

## 🧱 第三章：iSunFA 混合決策管線實作 (The Hybrid Deterministic Pipeline)

基於上述哲學，我們的憑證解析流程 (`mission.executor.service.ts`) 必須採行「混合決策管線」，並嚴格執行以下三個維度的防呆：

### 1. 物理枷鎖：Schema Enum 強制約束 (Schema Enum Binding)
- **原則**：永遠不要依賴 Prompt 要求 AI 輸出特定字串。必須在 JSON Schema 中啟用 `enum: ["A", "B"]` 並設定 `format: "enum"`。
- **實踐**：如 `documentType` 與 `tradingType`，直接從底層 API 封鎖 AI 創造中文狀態碼（如「繳費結果通知」）的可能性，確保能與後端的精確比對無縫接軌。

### 2. 階段式攔截與混合覆寫 (Stage Orchestration)
我們的管線不再是死板的全有或全無，而是根據確定性高低進行混合編排：
- **🟢 Stage 1 (AI 單純萃取)**：只要求 AI 忠實萃取客觀數值與 Enum 特徵：`{"vendor": "中華電信", "documentType": "BILL_NOTICE", "tradingType": "OUTCOME"}`。
- **🔵 Stage 2 (TypeScript 決定論分流)**：後端程式碼維護「黃金廠商映射表 (`VendorRegistry`)」。透過精確比對，直接給出絕對穩定的會計分錄與 ESG 範疇（如 `SCOPE_3`）。
- **🟠 Stage 3 (AI Fallback / Hybrid Override)**：
  - **純 Fallback**：當 Stage 2 查無此廠商時，全權交由 AI 推論。
  - **混合決策 (HYBRID_STAGE_2_AND_3)**：當 Stage 2 認定範疇與活動，但缺乏動態資料（如碳排係數）時，系統不會阻斷 AI。系統會將 Stage 2 的決定論指引強行注入 Prompt，讓 AI 專心估算係數；並在 AI 產出結果後，**強制用 Stage 2 的規則覆寫 AI 輸出的範疇與活動**，達到「規則引擎鎖死框架，AI 負責推估細節」的完美平衡。

---

## 📝 第四章：Prompt Engineering 實作規範

當必須寫 Prompt (如 Stage 1 或 Stage 3) 時，請遵守四大規範：

1. **強制英文撰寫 Prompt (English-First Prompting)**：
   - **鐵律**：所有的指令、防呆規則、Schema 定義**必須以全英文撰寫**。
   - **原因**：LLM 在英文語境下的「指令遵循能力」遠高於中文。在 Prompt 尾端加上 `Output your notes in Traditional Chinese` 即可兼顧穩定與易讀性。
   - **例外條款 (Schema Description Localization)**：雖然 System Prompt 與核心邏輯指令必須為英文，但在定義處理「高度在地化單據（如台灣統一發票）」的 `responseSchema` 時，其欄位的 `description` 允許使用繁體中文。此舉是為了消除模型在 OCR 萃取時的「跨語系對齊損耗 (Alignment Loss)」，確保如「排放係數值」等特定專有名詞的擷取精準度。
2. **防幻覺規則模組化 (Modular Rules)**：
   防呆規則 (如 `ANTI_HALLUCINATION_RULES`) 必須獨立為變數安插於頂部，以利後續「封閉迴圈校正管線」自動覆寫。
3. **優先使用 Few-Shot 判例注入**：
   與其寫很長的 If-Else 規則 (Zero-shot)，不如直接夾帶 3 組「正確的輸入與輸出範例 (Few-shot)」。
4. **拒絕發明未知科目**：
   必須附上 `accountingCode` 字典，並嚴格警告 AI 只能從中挑選。

5. **自我對抗與反思機制 (Self-Consistency / Self-Reflection)**：
   - 針對高風險的 Stage 3 任務（如 ESG 排放係數盲猜），必須導入自我對抗。讓模型產出初步結果後，由另一組 Prompt 進行是非題覆核：「模型 A 說碳排是 100 噸，請推演是否合理？」。不合理則退回 (此進階防護已排入 Roadmap Sprint 3)。
