# ADR 006: 廢棄靜態廠商映射，實作動態 AI 係數檢索與計算管線 (Dynamic AI-RAG ESG Pipeline)

> **Date**: 2026-05-22
> **Author**: Tzuhan
> **Status**: Accepted (Pending implementation in Sprint 2)
> **核心目標**: 徹底解決大型集團（如統一集團）因多元業務所導致的靜態統編碳排分類錯誤，將碳盤查從「廠商死綁」進化為「明細動態推論」。

---

## 1. 架構痛點與決定論的侷限

在早期的 Sprint 1 中，我們實作了 `EmissionFactorRegistry` 作為 ESG 專屬的決定論攔截器。該機制試圖將佔據企業 80% 碳排的高頻廠商（如：台電、中油）寫死在 TypeScript 字典中，達成 O(1) 的統編命中率，以此降低 AI 幻覺。

然而，在真實的大型企業集團場景中，此做法存在致命缺陷：
**企業的業務型態與採購項目並非單一。**
若我們強制將「統一集團」這種具備多元業務的巨獸，死板地綁定在單一的「農業與食品」係數上，當他們開出「物流配送」、「包裝耗材」等截然不同的憑證時，系統會因為強綁統編而引發極為嚴重的碳排錯估。

因此，** Tzuhan 決議廢棄靜態映射的攔截機制**。讓 AI 回歸「讀取憑證明細 -> 判斷活動本質」才是確保資料準確度的正途。

---

## 2. 解決方案：動態兩回合檢索 (Two-Turn RAG)

我們將徹底拔除危險的統編硬編碼，改由 AI 直接負責**「從日記帳推論活動」** -> **「檢索並挑選精確係數」** -> **「萃取正確單位與數量」** -> **「Skill 內計算碳排」** 的完整流程。

### 2.1 修改範圍：EsgParsingSkill
將原先單次的 AI 呼叫，重構為 **Two-Turn RAG (檢索增強生成)** 架構，並在 Skill 內部完成計算。

- **Turn 1 (意圖與關鍵字萃取)**：
  - 給予 AI 憑證日記帳內容，要求 AI 推斷 `fallbackCategory` (大類) 與 `searchKeywords` (如：`["紙箱", "包裝"]`)。
  - **移除**原先對 `VendorRegistry.matchEsg` 的依賴與攔截。
- **Turn 2 (係數過濾與精準挑選)**：
  - Skill 內部將 AI 給出的 `fallbackCategory` 或 `searchKeywords` 拿去過濾 `ALL_COEFFICIENTS` 靜態庫（或呼叫 `EmissionFactorRepo`），篩選出最匹配的 Top 20 候選係數。
  - 將這 Top 20 候選係數（包含 ID、名稱、單位、數值）提供給 AI，要求 AI **「精準挑選唯一的 coefficientId」**，並根據該係數的單位（如 `TWD` 或 `KG`），從憑證中萃取出對應的 `amount`。
- **Skill 內計算 (Calculation Logic)**：
  - 取得 AI 挑選的 `coefficientId` 與數量 `amount` 後，Skill 內部直接透過 `amount * coefficient.emissionFactor` 計算出總碳排量 (`emissions`)。
  - 將完整的結果打包為 JSON (包含 `emissions`, `coefficientId`, `scope` 等) 進行回傳。

### 2.2 修改範圍：同步儲存層 (document_sync.repo.ts)
由於計算邏輯與係數挑選已經移交給 `EsgParsingSkill`，我們大幅簡化同步層的職責。

- **移除**：`EmissionFactorRegistry.matchCategory` 廠商靜態攔截邏輯。
- **移除**：`EmissionFactorRepo.findFallbackCoefficient` 大類最大值兜底邏輯（不再使用保守的「最大值粗估」，而是絕對依賴 AI 挑選的精確 ID）。
- **保留**：保留量綱防呆檢查 (`getDimension`)，確保 AI 如果選錯單位（例如憑證是公升，但係數是度數），依然能被系統無情阻斷跨量綱相乘，強制降級為懸記。

---

## 3. 架構權衡與風險提示

這項重構將會徹底改變我們處理 ESG 憑證的底層邏輯：
1. **O(1) 攔截失效**：原先針對「中華電信、中油」等高頻廠商的極速 O(1) 攔截將不復存在，改由 AI 每次動態查詢並挑選「電費」或「汽油」係數。
2. **Token 消耗微幅上升**：將包含 1300 筆資料的 `ALL_COEFFICIENTS` 切割並透過 RAG 提供給 Gemini（每次塞入 Top 20），會微幅增加 Token 消耗。但這換來的是 **100% 貼合集團多元業務的絕對精準度**，此投資在查帳準確性上是完全值得的。
