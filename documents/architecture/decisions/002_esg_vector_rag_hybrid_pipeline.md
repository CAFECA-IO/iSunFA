# ESG Vector RAG & Hybrid Deterministic Architecture (ESG 向量檢索與混合決定論架構)

> **Date**: 2026-05-19
> **Latest Update**: 2026-05-20
> **Author**: Tzuhan
> **Status**: Accepted (Pending Implementation in Sprint 1)
> **核心目標**: 解決環境部 15,000+ 筆碳排係數比對時的「Token 爆炸」與「AI 幻覺」問題，同時嚴守 Executor 的無狀態 (Stateless) 與零資料庫 I/O (Zero DB I/O) 原則。

---

## 🛑 1. 當前架構挑戰 (Architectural Challenges)

在進行 `VOUCHER_TO_ESG_RECORD` 階段解析時，系統必須將發票上的單據品項（如：「高鐵車票」、「辦公室租金」）映射至官方系統內建的標準碳排係數（Coefficient）。傳統做法面臨三大死穴：

1. **Token 成本與上下文崩潰 (Token Explosion)**
   若將 15,000 筆官方係數的 JSON 字典直接注入 LLM Prompt，不僅會直接撐爆 Context Window，且每次推論的 API 費用將飆升 50 倍以上。
2. **AI 幻覺引發外鍵崩潰 (UUID Hallucination)**
   LLM 本質上非決定性模型，強迫其輸出資料庫關聯鍵 (`coefficientId`) 極易產生虛假 UUID，寫入時將觸發 Postgres 的 Foreign Key Error，導致系統當機。
3. **無狀態破壞 (Stateless Violation)**
   若讓 Async Worker (Executor) 在執行時去連線 PostgreSQL 進行模糊搜尋，將直接破壞 `00_async_worker_overview.md` 中規定的「Shared-Nothing」與「斷開外部資料庫」之無限擴展性鐵律。

---

## 🎯 2. 架構突破：本機向量 RAG (Local Vector RAG)

在我們未來的產品藍圖中，整個系統的物理架構將明確劃分為兩大區塊：

1. **Issuer 端 (核心系統)**：包含前端 UI 與完整的 PostgreSQL 資料庫，負責最終資料落地、商業邏輯與報表呈現。
2. **Executor 端 (未來的「AI 費思」獨立產品)**：完全獨立、無狀態 (Stateless)，由各種 AI 技術（OCR、LLM 引擎、RAG 檢索）拼湊組合而成的智能處理大腦。

本套 ESG 解析與推估解決方案**必須 100% 實作於後者 (Executor 端)**。為解決上述兩難，我們導入 **「本機向量檢索 + 多選題 Prompt (Local Vector Search + Multiple-Choice Prompting)」** 架構。

### 階段 2.1：建置期靜態向量化 (Build-Time Vectorization)

官方係數屬於「極低頻更新」的唯讀靜態資料。

- 在打包 Executor Docker Image 時，透過輕量級嵌入模型（如 `all-MiniLM-L6-v2`），將 15,000 筆官方係數的 `name`、`description` 與 `source` 轉化為語義向量 (Embeddings)。
- 將這些向量封裝成單一的二進位檔案（`.bin`）或掛載為輕量級的 `SQLite-vss`，直接內建於 Executor 映像檔中。

### 階段 2.2：執行期本機檢索 (Runtime Local Retrieval)

當 Executor 執行 `ESG_PARSING` 任務，並擷取到客戶單據品項（例如：「高鐵-台北到高雄」）時：

1. **本機推論**：使用內建的嵌入模型，將「高鐵-台北到高雄」轉為向量。
2. **本機比對**：與靜態向量庫進行餘弦相似度 (Cosine Similarity) 運算。
3. **Top-K 提取**：瞬間 (O(1) 延遲且無網路 I/O) 撈出最相關的前 5 名係數（例如：陸上運輸-鐵路、大眾捷運等）。

### 階段 2.3：收斂決策 (Multiple-Choice Prompting)

將取得的 Top-5 係數放入 Prompt，大幅限縮 LLM 的思考發散空間：

> 「根據單據項目『高鐵-台北到高雄』，請在以下 5 個系統係數中挑選最合理的一個。只能回傳這 5 個選項的 ID，若皆不符合請回傳 null。」

**效益**：

- **Token 節省 99%**：從輸入 15,000 筆降為輸入 5 筆。
- **零幻覺 (Zero-Hallucination)**：AI 的輸出範圍被 100% 決定論地鎖死在提供的 5 個 ID 內，徹底消除產生假 UUID 的風險。

---

## 🛡️ 3. 雙軌混合管線 (Dual-Track Hybrid Pipeline)

除了解決「系統官方係數」的配對，架構亦同時防禦「用戶自定義係數」與「高頻標準品項」。

### 3.1 決定論防禦層 (EmissionFactorRegistry) [⚠️ Pending]

借鑑財務模組的 `VendorRegistry`，建立 ESG 專屬的決定論攔截器。
將佔據企業 80% 碳排的最常見 100 項高頻項目（如：台電電費、自來水、95無鉛汽油）寫死在 TypeScript 字典中。此類單據直接 $O(1)$ 命中，連 LLM 都不必呼叫。

### 3.2 租戶專屬自訂係數 (Tenant Custom Coefficients)

用戶人工建立或經由 CPA 覆核過的「自定義係數（Custom Coefficient）」，採用**動態注入**：

1. **Planner 注入**：`MissionPlanner` (API Server) 可連線 DB，在產生任務 JSON 時，將該租戶專屬的自定義係數陣列放入 `prerequisiteData`。
2. **Executor 讀取**：Executor 僅需讀取本地的 JSON 檔案（如果檔案過大，由 `DocumentHelper` 負責底層切塊傳輸）。
3. **優先比對**：Executor 在進行 Vector RAG 前，優先以精準比對 (Exact Match) 檢查 `prerequisiteData.coefficients`，達成租戶資料隔離與高效配對。

### 3.3 雙軌懸記與 AI 保守型估算 (Dual-Track Suspense & AI Conservative Speculation) [⚠️ Pending - Schema Disconnect]

若本機 RAG 的 Top-5 皆不符合，或相似度過低（Confidence < 70%），管線不應採取剛性死鎖（強制將 emissions 設為 0），以防前端大盤數據斷層；應改採「語義降級推測機制」：

1. **AI 語義降級歸類 (Semantic Fallback)**：禁止 AI 自己通靈數值！要求 Stage 3 AI 依據其通用知識，僅輸出一個最接近的「官方標準大類標籤」（例：回傳 fallbackCategory: "塑膠包材"）。
2. **後端保守原則查表與單位檢核 (Backend Max-Factor & Unit Guard)**：後端系統接收到大類標籤後，於資料庫查詢該類別，並執行 `MAX(factor)` 抓取「碳排係數最高」的官方項目（防低估/防漂綠）。
   - **[同量綱比較鐵律 (Dimensional Consistency Guard)]**: 後端在執行 `MAX(factor)` 之前，絕對禁止跨單位比較。必須先讀取 AI 萃取出的憑證 unit (如：金額、重量、體積)，並在 SQL 查詢中加上前置過濾條件 (如 `WHERE unit_type = '金額'`)。只能在物理量綱相同的係數池中取 `MAX(factor)` 進行乘法，若無同量綱係數，則必須強制懸記 (Suspense) 留白，不可強行計算。
3. **入庫與審計軌跡**：若單位換算成功，後端執行確定性乘法，綁定該「最高係數之真實 ID」，寫入資料庫並標記為：
   - `isVerified = false`
   - `generationSource = "AI_SPECULATIVE_STAGE_3"`
   - `aiNote` 記錄完整降級推測脈絡：「RAG 未命中。AI 降級歸類為 [塑膠包材]。系統自動套用該類別最高係數 [環境部ID: XXX] 以符合保守原則。等待人工確認。」

---

## 4. 架構決策：解析管線的分岔路 (ADR: Single-Pass vs Two-Pass Parsing)

**架構優勢與時序突破**：依據 [`00.1_mission_executor_architecture.md`](./00.1_mission_executor_architecture.md) 定義之「串聯執行管線 (Sequential Pipeline)」，Executor 於進入 `EsgParsingSkill` 前，已可藉由前置的 `JournalSkill` 取得 `journalText`（單據萃取文本）。此既有設計消除了「必須先進行一次 LLM 萃取才能跑 RAG」的時序限制，為管線注入型 RAG (Pipeline-Injected RAG) 提供了實作基礎。

為了兼顧敏捷開發與最終架構願景，我們採取 **「階段性演進 (Phased Rollout)」** 決策：

### 第一階段 (Sprint 1 收尾 - MVP)：強化的單次解析 (Single-Pass Semantic Fallback)

- **流程**：在本地 SQLite-vss 尚未就緒前，呼叫一次 Gemini 做 OCR 並進行「語義降級大類推測」。
- **強制移除 `newCoefficient`**：Schema 中**絕對不允許 AI 估算碳排係數數值**，這會引發嚴重的漂綠風險。
- **解法**：Schema 僅要求 AI 輸出 `fallbackCategory`（大類標籤），由 Node.js 後端執行 `MAX(factor)` 保守型預估，並寫入黃燈狀態 (`isVerified: false`)。

### 第二階段 (Sprint 2 開展)：管線注入型 RAG (Pipeline-Injected RAG)

- **流程**：本機向量庫就緒後，利用既有的 `journalText` 先在本機跑 Vector Search 撈出 Top-5。
- **解法**：將 Top-5 資訊（ID + 名稱描述）寫入 Prompt，並將 ID 動態注入 Schema 的 `enum`。若 AI 覺得 Top-5 皆不符合，才退回第一階段的 `fallbackCategory` 語義降級。
- **效益**：這在「不增加 LLM 呼叫次數」的前提下，把 15,000 筆大海撈針的 Token 成本降到極致，同時實現了零幻覺的精準 UUID 對應。

---

## 📊 5. 系統級效益總結 (Architectural ROI)

| 指標             | 傳統做法 (注入 15K 字典) | 本機 RAG + 混合決定論管線      | 改善幅度                 |
| :--------------- | :----------------------- | :----------------------------- | :----------------------- |
| **Token 消耗**   | ~100,000 Tokens / 任務   | < 500 Tokens / 任務            | 📉 **> 99%**             |
| **外部 DB 依賴** | 必須連線 PostgreSQL      | 零依賴 (本機 `.bin` + JSON)    | 🔐 **完全隔離**          |
| **AI 幻覺風險**  | 高 (易編造假 UUID)       | 極低 (僅能在 Top-5 中做選擇題) | 🛡️ **Audit-Grade 防禦**  |
| **漂綠風險**     | 高 (Prompt 指示填 0)     | 零 (強制 Suspense 留白)        | ⚖️ **符合 CPA 確信標準** |

這套架構在不改變 Executor 任何底層隔離政策的前提下，賦予了非同步任務節點強大的「語義檢索」能力，為 iSunFA 建立了無可取代的技術護城河。

---

## 🪞 附錄：Sprint 1 架構復盤與地雷掃除清單 (Architecture Post-Mortem & Refactoring Backlog)

本次 RAG 混合架構的誕生，源自於團隊在 Sprint 1 中對「四大架構地雷」的深刻反省。以下記錄這四個促使我們全面升級底層架構的痛點，以及我們對自身開發盲點的檢討。

### 📋 已完成重構清單：消除四大架構地雷

#### 🚨 地雷一：漂綠造假漏洞 (Greenwashing Vulnerability)

- **位置**：`document_sync.repo.ts` (L366)
- **舊視角問題**：為了防漂綠，過去認為遇到懸記時應「全面允許 `emissions` 為 `null`」。
- **新架構解法 (PLG + CPA)**：如果填 `null`，前端儀表板的碳排大盤會出現斷層，損害產品體驗 (PLG)。我們的升級解法是：**不填 0，也不填 null**。允許 AI 進行「語義降級歸類」，並由後端套用該大類的「最高碳排係數」算出數值。隨後打上 `isVerified = false` 與 `generationSource = "AI_SPECULATIVE_STAGE_3"` 的黃燈標籤。這完美兼顧了儀表板的連續性與防漂綠（保守原則）的底線。

#### 🚨 地雷二與三：錯把「審計軌跡」當作「UI 視圖資料」 (Misinterpreted Audit Trail)

- **位置**：`document_sync.repo.ts` 與 `esg_parsing.ts`
- **舊視角問題**：過去認為資料庫的 `aiNote` 不該存任何中英文推理字串，應該純粹解耦只存 Boolean，翻譯全交給前端。
- **新架構解法 (PLG + CPA)**：拔除前端的 `[[I18N...]]` 渲染標籤是對的，但 **`aiNote` 不是 UI 提示語，它是確信查帳軌跡 (Audit Trail) 的一部分！** 如果 AI 決定將「特規包材」降級歸類為「通用PE塑膠」，四大會計師查帳時必須看到這句「AI 的推論邏輯 (Chain of Thought)」。必須允許 AI 將推理脈絡如實寫入 `aiNote`，這不是破壞 MVC 架構，而是保留系統自動控制 (ITAC) 的數位證據。

#### 🚨 地雷四：對「AI 降級」的定義過度限縮 (Over-restricted AI Role)

- **位置**：`esg.ts` (L40-L68)
- **舊視角問題**：過去認為應徹底實施「AI 零發明政策」，AI 僅負責客觀文字萃取，把所有字典都從 Prompt 拔掉。
- **新架構解法 (PLG + CPA)**：這太過極端。我們不是「完全不給字典」，而是「不給 15,000 筆的巨集字典」。透過本機 RAG 找出 Top-5，我們將這 **5 個選項 (Micro-dictionary)** 丟進 Prompt 讓 AI 做選擇題。在皆未命中時，我們更授權 AI 動用常識進行「語義降級大類推測」。AI 的準確定位不是「純粹的 OCR 萃取機」，而是**「受限在安全框架內的決策推論引擎」**。

### 🧠 深度檢討：架構視野的躍升 (Architectural Evolution)

1. **跳脫「絕對剛性」的死胡同**：過去我們被「絕對不能有誤差、絕對不能讓 AI 猜測」的剛性思維綁架，導致系統只要遇到未知就強制報錯或填 null，嚴重犧牲了軟體的商業價值 (PLG)。
2. **擁抱「護欄內的彈性」**：透過這次重構，我們學會了優雅地把這些「推測值」圈禁在 `isVerified = false`（黃燈）與 `aiNote`（查帳軌跡）的護欄裡。系統既能流暢運作，又能隨時阻斷未經覆核的正式報告產出，順利向企業級 (Enterprise) 產品邁進！

---

### 🔎 Sprint 1 實作現況與斷層分析 (Implementation Gap Analysis)

> **稽核時間**: 2026-05-20

#### 1. 🔗 單次語意降級與保守型估算 (Max-Factor Guard)：前端嚴重斷鏈
- **實作現況 (後端 - 優秀)**：在 `document_sync.repo.ts` (L352-L381)，後端實作了非常完美的保守原則。只要收到 `fallbackCategory` (大類標籤)，就會執行 `orderBy: { emissionFactor: "desc" }` 抓取最大碳排係數，並在 L475 強制打上 `AI_SPECULATIVE_STAGE_3` 黃燈。
- **致命斷層 (前端 - 死碼)**：在 `src/services/vision.accounting.service.ts` (L195-L210) 的 Phase 3 ESG Prompt 中，**完全沒有定義 `fallbackCategory` 這個屬性**！目前的 JSON Schema 只要求 AI 輸出 `esgActivityType` 與 `esgAmount`。
- **審計風險**：因為 Prompt 沒要，AI 永遠不會輸出 `fallbackCategory`。這導致後端那套花費心力打造的「防漂綠最高係數降級機制」目前 100% 淪為**死碼 (Dead Code)**。一旦找不到精準係數，系統就會直接當機或亂給值。

#### 2. ⚖️ 物理量綱一致性防護 (Dimensional Guard)：實作完整且強悍
- **實作現況 (✅ Pass)**：在 `document_sync.repo.ts` (L411-L428)，明確實作了 `getDimension(docUnit) !== getDimension(coefUnit)` 的邏輯。
- **審計效益**：如果 AI 萃取的是「公升 (LITER)」，但對應到的係數是「度數 (KWH)」，系統會無情阻斷跨量綱相乘，強制打入懸記 (Suspense = true)。這是目前 ESG 管線中**唯一完全發揮作用**的亮點，成功防堵了荒謬的碳排入庫。

#### 3. 🛡️ 決定論防禦層 (EmissionFactorRegistry)：完全不存在
- **實作現況**：完全未實作。
- **致命斷層**：目前 codebase 只有針對財務的 `VendorRegistry`。ADR 002 Section 3.1 提到的「將佔據企業 80% 碳排的最常見 100 項高頻項目（如：台電電費、自來水）寫死在 TypeScript 字典中」的機制，目前在 codebase 中找不到任何蹤影。
- **審計風險**：連最標準、最不可能出錯的「台電電費」，現在都必須經過 AI 推論與全庫搜尋，白白浪費運算資源且增加不必要的幻覺風險。

#### 4. 🧠 本機向量檢索 (Local Vector RAG)：尚未進入開發階段
- **實作現況**：完全未實作 (但符合 Roadmap 預期，安排在 Phase 2)。
- **斷層狀況**：目前 Executor 內沒有 `SQLite-vss` 或 `.bin` 向量檔。
