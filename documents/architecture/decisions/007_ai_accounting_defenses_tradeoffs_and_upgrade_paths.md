# ADR 007: AI 會計防線、兩回合檢索權衡與未來升級路徑 (AI Accounting Defenses, Two-Turn RAG Trade-offs & Upgrade Paths)

> **Date**: 2026-05-22
> **Author**: Tzuhan
> **Status**: Accepted
> **核心目標**: 記錄在全面導入 AI 與 Two-Turn RAG 架構後，系統為確保「絕對會計安全性」所建立的核心防線 (Zero-Trust)、架構權衡 (Trade-offs)、盲點與未來的技術債償還計畫。

---

## 1. 架構改動與核心理念總結 (Architecture Shifts & Philosophy)

本次重構徹底解耦了資料庫同步層與 AI 解析層，並確立了以下最高指導原則：「**寧可懸記、絕不瞎猜；犧牲極小部分開發便利性，換取絕對會計安全性。**」

1. **廢除靜態防線**：刪除了 `vendor_rules.ts` 與 `vendor_registry.ts`，放棄 O(1) 統編命中機制。
2. **導入本地 Retriever**：新增 `CoaVectorSearchService`，實作基於純 TypeScript 的 Bigram Cosine Similarity 演算法。
3. **退回單回合萃取與嚴格懸記 (Single-Turn + Strict Suspense)**：因 Two-Turn RAG 會產生嚴重的會計科目幻覺 (如捏造 `1423-8`)，決議將傳票解析全面降級為單回合客觀萃取。後端採 `>0.85` Bigram 閥值把關，不合者一律退回系統懸記，寧可錯殺不放過。
4. **Repo 退縮與零信任**：移除 `document_sync.repo.ts` 內所有的外部 API 呼叫，避免資料庫 Transaction 死鎖；並在 Schema 新增審計血緣欄位。

---

## 2. 關於保留 `vendorTaxId` 的核心決策

曾有一度考慮將 `vendorTaxId` (廠商統編) 視為「死板的 Vendor MDM (強迫 O(1) 攔截會計科目)」的技術債而一併廢除。然而，經過架構仲裁，**此欄位被定義為系統的核心無價之寶，必須被永久保留**。

我們釐清了一個核心觀念：「**把統編拿來當作決定會計科目的防線是個地雷，但把統編記錄下來備查則是無價之寶。**」

`vendorTaxId` 在系統中具備三大不可取代的用途：
1. **報稅與進項抵扣 (Tax Reporting)**：在台灣稅法中，申報營業稅 (401/403 表) 必須明確記載對方廠商統編。若無此欄位，系統將無法產出合法報稅媒體檔，對會計軟體而言是致命傷。
2. **精準對帳與自動沖銷 (Reconciliation)**：未來進行批次沖銷 (Batch Reconcile) 時，統編是唯一可靠的主鍵 (Primary Key)。人類輸入的別名 (如「中華電信」、「CHT」) 會導致字串比對失敗，而統編能保證 100% 準確匹配應付帳款與銀行收據。
3. **ESG 供應鏈碳足跡 (Scope 3)**：進行價值鏈排放盤查時，必須精確識別碳排的供應商實體。統編確保我們不會將同一家供應商的碳排誤算成兩家獨立公司。

---

## 3. VoucherLine 零信任會計稽核防線 (Zero-Trust Audit Defense)

在 AI 時代的會計系統中，為了防止 AI 的幻覺 (Hallucination) 悄悄混入總帳，我們在 `VoucherLine` (傳票明細) 層級引入了「零信任」的防線，新增了兩個關鍵欄位：

### 3.1 `isVerified Boolean @default(false)`
- **預設不信任 AI (防禦性設計)**：過去系統預設相信解析結果，導致 AI 把買便當猜成設備資產。預設為 `false` 代表只要是系統或 AI 產生的分錄，在人類點擊確認前永遠是「待覆核」狀態。
- **細粒度稽核 (Line-level Audit)**：一張發票可能只有某一行明細猜錯，我們需要單行層級的驗證狀態。
- **Trade-offs**：增加 UI 介面複雜度，且會計人員需要更多操作 (可設計「全選覆核」減輕負擔)。

### 3.2 `generationSource String @default("AI_GENERATED")`
- **資料血緣追溯 (Data Lineage)**：查帳時必須知道是誰造成的錯誤：
  - `MANUAL_ENTRY`：人類手動輸入。
  - `SYSTEM_DETERMINISTIC`：規則引擎 100% 確定對應。
  - `SYSTEM_SUSPENSE`：系統強迫隔離的懸記。
  - `AI_SPECULATIVE`：AI 從候選名單推測。
- **為何不用 Enum 而用 String？**：避免被資料庫 Schema 綁死。未來若加入新引擎 (如 `CLAUDE_OPUS`)，只需在程式碼更新 Enum 字串，免去 Migration。
- **Trade-offs**：弱型別風險 (需靠 TypeScript Enum 把關)，且字串微幅增加 DB 儲存空間 (對現代 DB 開銷極小)。

---

## 4. 單回合 RAG 與嚴格懸記之利弊與盲點 (Trade-offs of Single-Turn + Strict Suspense)

### 4.1 架構優點 (Advantages)
- **實質重於形式 (Substance over Form)**：不再以單一統編綁死科目，系統能動態依據「交易摘要的語意」進行向量比對。
- **杜絕 AI 幻覺 (Zero Hallucination)**：徹底剝奪 AI 決定會計科目的權利，由後端 TypeScript 的 `CoaVectorSearchService.matchWithScore` 進行決定論閥值 (`>0.85`) 審核。不合格者直接打入 `1471` 或 `6288` 懸記隔離區，確保進入核心損益表的資料 100% 精準。
- **解鎖高併發吞吐量與降低成本**：移除 Turn 2 後，Token 消耗減半，API 延遲減半，且移除 Repo 層網路 I/O 阻塞，解鎖高併發處理。

### 4.2 架構缺點 (Disadvantages)
- **懸記率大幅飆升 (High Suspense Rate)**：Bigram 演算法閥值設為 0.85 極度嚴苛。只要發票上的摘要（如「Uber 車資」）與字典（如「交通費」）字面上不夠相近，系統就會判定為懸記，導致大量憑證需要 CPA 手動覆核。
- **無法處理語意近義詞**：Bigram 是字面相似度，不是 Embedding 語意相似度，因此「油資」與「燃料費」會被判定為不相關而打入懸記。

### 4.3 盲點與風險 (Blind Spots)
- **CPA 覆核疲勞 (Audit Fatigue)**：寧可錯殺不放過的策略會導致大量合法的憑證被標記為 `isVerified: false`，可能引發使用者的作業疲勞。需依賴未來的 Batch Reclassify UI 或是更進階的 Text-Embedding 演算法來紓解。

---

## 5. 未來技術債償還與升級路徑 (Technical Debt & Upgrade Paths)

### 5.1 EEIO 碳排係數管線升級
目前的 EEIO 係數管線使用的是「過渡期估算解法」，透過常數檔 (`mock_eeio_coefficients.ts`) 直接寫入帶有 `2024_MOCK_EEIO` 版本號的假資料，並強制標記 `source: "Internal_Proxy_Estimation_Based_On_Spend"`。
- **升級計畫**：未來應建立排程腳本 (`sync_eeio.ts`)，接上政府或國際權威機構的真實 API (如環境部 EEIO API 或 Ecoinvent)。
- **查核防線**：由 API 同步的係數將解除 `Internal_Proxy_Estimation` 的例外揭露警示，正式轉為 `isVerified: true` 的官方數據。

### 5.2 陽春版 Vector Search 的天花板與同義詞字典 (Synonym Dictionary)
當前 `CoaVectorSearchService` 的 Bigram 演算法極其陽春，缺乏真正的語意理解能力（例如無法將「預付會員」與「預付費用」連結）。為解決這個問題，我們目前採用「方案 A：同義詞字典」，在常數中寫死 `aliases: ["預付會員", "預付費用"]`。
- **升級計畫**：這些硬編碼的 Keyword Matching 缺乏擴充性。未來當科目字典從幾百個擴展到「數以萬計的企業料號或 ESG 係數」時，必須導入專屬的「Terminology Service (詞彙服務)」、標準 Embedding 模型 (如 `text-embedding-3-small`) 以及真正的向量資料庫 (如 `pgvector`)。這將允許從後台動態新增維護，徹底消除硬編碼帶來的技術債。

### 5.3 缺乏中間狀態的容錯機制 (No Intermediate State)
目前的兩回合流程是在單一執行緒中接續完成。若 Turn 1 成功，但 Turn 2 遇到 LLM API Rate Limit，整張憑證會直接標記為 Failed。
- **升級計畫**：系統缺乏在兩個 Turn 之間持久化狀態並進行細粒度重試 (Granular Retry) 的機制。未來需考慮引入 Message Queue 或是 Temporal 來管理 Saga Workflow。
