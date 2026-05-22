# ADR 007: 兩回合檢索生成架構之利弊與技術債分析 (Two-Turn RAG Trade-offs and Technical Debt)

> **Date**: 2026-05-22
> **Author**: Tzuhan
> **Status**: Accepted
> **核心目標**: 記錄廢除靜態廠商防線 (Vendor MDM) 並全面導入 Two-Turn RAG 架構後的架構權衡、盲點與潛在技術債。

---

## 1. 架構改動總結 (Architecture Shifts)

本次重構徹底解耦了資料庫同步層與 AI 解析層，並將原先寫死的靜態廠商字典，替換為動態的「本地向量檢索 + LLM 選擇題」架構：

1. **廢除靜態防線**：刪除了 `vendor_rules.ts` 與 `vendor_registry.ts`，放棄 O(1) 統編命中機制。
2. **導入本地 Retriever**：新增 `CoaVectorSearchService`，實作基於純 TypeScript 的 Bigram Cosine Similarity 演算法。
3. **實作 Two-Turn RAG**：將 `voucher_lines_parsing.ts` 與 `esg_parsing.ts` 改寫為兩回合流程：
   - **Turn 1**: 擷取發票 / 憑證明細。
   - **Vector Retrieval**: 本地演算抽出相似度最高的 Top 10 候選科目 / 碳排係數。
   - **Turn 2**: 發送第二次 Prompt，強制 AI 從 Top 10 中進行選擇題作答。
4. **Repo 退縮與零信任**：移除 `document_sync.repo.ts` 內所有的外部 API 呼叫，避免資料庫 Transaction 死鎖；並在 Prisma 新增 `generationSource` 以追蹤審計血緣。

---

## 2. 架構優點 (Advantages)

- **實質重於形式 (Substance over Form)**：不再以單一統編綁死科目（如統一超商可能開出雜項購置，也可能開出交際費），系統現在能動態依據「交易摘要的語意」映射至正確的會計科目。
- **杜絕 AI 幻覺 (Zero Hallucination)**：AI 被剝奪了自由填寫科目的權利。Turn 2 限制 AI 只能在我們提供的合法 10 個選項中抉擇，確保進入資料庫的代碼 100% 存在於系統字典中。
- **解鎖高併發吞吐量 (High Concurrency)**：移除 Repo 層的網路 I/O 阻塞後，`prisma.$transaction` 能在毫秒級完成，避免了大量並行處理文件時引發的 Connection Pool Exhaustion 與 Deadlocks。

---

## 3. 架構缺點 (Disadvantages)

- **營運成本 (API Cost) 倍增**：過去單張憑證僅需呼叫一次 LLM。改為 Two-Turn 後，Token 消耗量與 API 請求次數實質翻倍，在高印量情境下將顯著增加雲端成本。
- **處理延遲 (Latency) 上升**：多一次 LLM 網路來回，非同步 Worker 處理單張憑證的總耗時將會拉長。
- **使用者操作摩擦 (UX Friction)**：基於「零信任」原則，未來所有的系統產生分錄皆需要人類再次審核 (`isVerified: false`)，無法再「自動放行」，增加了會計師的點擊成本。

---

## 4. 盲點與潛在風險 (Blind Spots)

- **Top 10 候選的「強迫中獎」謬誤**：如果使用者的憑證摘要極度不精確或充滿錯字（例如：「ㄅ一ㄢˋ ㄉㄤ」），導致本地 Retriever 算出的 Top 10 根本不包含正確的「伙食費」科目。此時 Turn 2 的 AI 只能被迫在錯誤的選項中「挑一個比較合理的」，導致嚴重分類錯誤。

---

## 5. 技術債 (Technical Debt)

- **陽春版 Vector Search 的天花板**：當前 `CoaVectorSearchService` 的 Bigram 演算法極其陽春。當科目字典從幾百個擴展到「數以萬計的企業料號或 ESG 係數」時，運算效能與召回率 (Recall) 將會雙雙崩潰。未來必須導入標準 Embedding 模型 (如 `text-embedding-3-small`) 與真正的向量資料庫 (如 `pgvector`)。
- **缺乏中間狀態的容錯機制 (No Intermediate State)**：目前的兩回合流程是在單一執行緒中接續完成。若 Turn 1 成功，但 Turn 2 遇到 LLM API Rate Limit，整張憑證會直接標記為 Failed。系統缺乏在兩個 Turn 之間持久化狀態並進行細粒度重試 (Granular Retry) 的機制。未來需考慮引入 Message Queue 或是 Temporal 來管理 Saga Workflow。
