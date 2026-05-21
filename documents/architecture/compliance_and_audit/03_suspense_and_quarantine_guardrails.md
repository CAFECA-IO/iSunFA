# 知識庫文章 03: 不確定的隔離牆：財務雙軌懸記分流與 ESG 保守型推估的 ITAC 實務

> **Date**: 2026-05-20
> **Author**: Tzuhan
> **Category**: 數位審計知識庫 (Digital Audit Knowledge Base)
> **Tags**: `Suspense Fallback`, `Anti-Greenwashing`, `Hybrid Deterministic Pipeline`

## 1. 財務隔離區分流（指引未來開發）

在財務模組 (ADR 004) 中，當 Vector RAG 與統編攔截 (Tax ID Interceptor) 皆無法精準配對單據時，絕對禁止系統使用 Fuzzy Matching 強行猜測科目。
為了死守損益表淨利的真實性，我們規劃了兩道分流的「雙軌懸記與虛擬隔離區」：

### 防線 A：資產負債表 (BS) 懸記隔離區
- **情境**：單據性質完全未知（例如：銀行帳戶扣款但無憑證，連是否為「費用」都無法確定）。
- **處置路由**：強制將該筆款項掛載於 BS。借方預設寫入 `1471 暫付款`；貸方預設寫入 `2330 暫收款`。這道隔離牆確保了在性質未明前，損益表 (PL) 不會被垃圾數據污染。

### 防線 B：損益表 (PL) 虛擬隔離區
- **情境**：確認為營運費用，但系統無法分類（例如：發票載明「某某軟體訂閱」，但 RAG 沒撈到準確的軟體費代碼）。
- **處置路由**：若硬塞入 1471 會導致當期費用低估、淨利虛增。因此，系統將自動派發至專屬的「PL 虛擬科目隔離區」（預設為 `6288 管理費用 - 其他費用` 或 `7590 什項支出`），確保總費用正確，淨利不被虛增。

所有進入隔離區的分錄，必須強制打上 `isVerified = false` 與 `generationSource = "SYSTEM_SUSPENSE_FALLBACK"`，留待 CPA 於月底結帳時重分類。

## 2. ESG 保守型預估（Max-Factor Guard）

在 ESG 碳盤查模組 (ADR 002) 中，放任 AI 自行計算或編造碳排係數，等同於系統性的漂綠 (Greenwashing)。

我們在 `esg_report_generator.ts` (後端寫入層) 實作了防漂綠的 **保守型預估 (Max-Factor Guard)**：
1. **語意降級推測**：當 RAG 未命中精確係數時，AI 僅被授權輸出一個泛用的大類標籤（`fallbackCategory`，例如「塑膠包材」）。
2. **後端保守原則查表**：後端接收到 `fallbackCategory` 後，會在資料庫執行 `orderBy: { emissionFactor: "desc" }`，強制抓取該類別中「數值最高」的碳排係數進行計算。
3. **黃燈懸記**：寫入時強制標記 `generationSource = "AI_SPECULATIVE_STAGE_3"` 與 `isVerified = false`。這既保持了前端儀表板的連續性，又死守了審計的保守原則。

## 3. 量綱一致性防護鐵律 (Dimensional Consistency)

為了防堵「公升數乘上每度電碳排」這種荒謬的計算，系統在套用係數前，會執行嚴格的物理量綱防呆。
- `getDimension(docUnit) !== getDimension(coefUnit)`
- 只要量綱不符，系統寧可中斷計算將 `isSuspense` 設為 `true`，也絕不允許錯誤的碳排數字入庫上鏈。這是一道無法被繞過的物理真理護欄。
