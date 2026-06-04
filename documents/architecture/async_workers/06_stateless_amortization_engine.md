# 009. 無資料庫狀態 (Stateless) 的攤銷折舊引擎設計

> **Date**: 2026-05-27
> **Status**: Done (2026-05-27)
> **Category**: Accounting Engine & Async Workers

## 背景與問題 (Background)
我們已經實作了 `AmortizationAutomationWorker` 並且成功部署在常駐系統中。
然而，目前折舊與攤銷排程仍依賴於資料庫的 State (例如追蹤已攤銷期數、剩餘金額等)，如果未來我們希望能橫向擴展 (Horizontal Scale) 攤銷計算，或是完全符合 Web3/Zero-DB I/O 守護行程 (Daemon) 的無狀態精神，我們需要重新設計攤銷引擎，使其能透過 Deterministic 數學公式推導，而不是維護一個有狀態的折舊表。

## 決議與實作 (Resolution & Implementation)
該任務已於 2026-05-27 完成實作。

實作細節如下：
1. **無狀態決定論推導 (Stateless Deterministic Calculation)**：將核心攤銷邏輯升級為 `calculateStatelessAmortizationForMonth`，該引擎不再依賴資料庫去遞減並讀取 `amortizedAmount` 餘額。而是根據「購入日期」、「預計使用年限」與「報表當下日期」，利用純粹的數學動態迴圈，推導出該資產過去累積的攤銷額 (Accumulated Amortization) 與本期應攤銷費 (Amortization Expense)。即使是最後一期的尾差配平 (Plug) 也能依靠純數學的動態累積額計算，不需要依賴 DB。
2. **零捏造 (Zero Hallucination)**：該設計可以杜絕多重 Worker 同時扣減資料庫餘額導致的 Race Condition（競爭條件）。
3. **無縫接軌**：現有的 `processAmortization` 必須被重構，轉移為純粹的函式，並可由 Orchestrator 直接攔截與拋轉，不再依賴輪詢。

## CPA 視角：潛在的查核風險與實務挑戰

雖然無狀態引擎很強大，但身為 CPA，我們在評估這種系統的內控時，會特別關注以下「痛點」：

| 查核關注點 | CPA 的擔憂與風險 | 系統應有的配套設計 (ITGC/ITAC) |
| --- | --- | --- |
| **1. 複雜的資產異動** | 發生「資產減損（Impairment）」、「後續資本支出（CAPEX）」或「部分報廢」時，單靠一個簡單公式算不出來。 | 系統必須搭配**「事件溯源（Event Sourcing）」**架構。也就是資料庫不存折舊餘額，但必須「嚴格且不可篡改地記錄該資產生命週期中的所有異動事件」。引擎是根據「事件時間軸」來分段計算。 |
| **2. 系統邏輯的黑盒子** | 既然數字都是即時算出來的，如果「引擎底層的程式碼（公式）」寫錯了，所有的財報數字都會集體出錯。 | **IT 一般控制（ITGC）變得極度重要。** CPA 必須確保該引擎的「程式碼異動管理（Change Management）」非常嚴格。任何公式的修改都必須經過嚴密的 UAT 測試與授權。 |
| **3. 歷史財報的鎖定** | 財報一旦發布，過去的數字就不能變（除非重編）。無狀態引擎如果輸入參數被改了，再去查過去的日期，數字可能會變動，破壞財報的穩定性。 | 系統必須有**關帳機制（Period Close / Freeze）**。確保在關帳日前的原始參數與事件被「鎖定（Locked）」，不允許任何追溯修改，或是強制任何修改都必須以「當期調整（Catch-up adjustment）」的方式呈現。 |

### ⚠️ 當前實作的技術債與防禦限制 (Current Limitations)

在盤點了上述 CPA 視角後，我們必須誠實宣告：目前的 `calculateStatelessAmortizationForMonth` **確實會遇到上述的盲點 1 與 3**。

目前我們的引擎底層是一個 `while` 迴圈，從 `startDate` 一路推算到當下，且僅接受單一靜態的 `totalAmount` 參數。這意味著：
- **如果發生減損 (Impairment)**：一旦修改了 DB 中的 `totalAmount`，無狀態引擎在下個月重新推算時，會以「新的」總額套用到過去所有的歷史月份，導致歷史累積攤銷額被錯誤地改寫。
- **如果缺乏期末關帳 (Period Freeze)**：因為每次查詢都是從頭推導，若系統允許工程師或後台管理員任意竄改早期的 `startDate` 或金額，過去已發布財報的數字將會瞬間且無痕地崩壞。

**🛡️ 目前系統的臨時護欄 (Temporary Guardrails)：**
為了避免這些致命盲點發生，當前版本的系統實施了極度嚴格的**「強制不可變性 (Strict Immutability)」**：
1. 一旦憑證 (Voucher) 建立並轉化為攤銷排程後，其 `totalAmount`, `startDate`, 與 `endDate` 在資料庫層級即被視為**絕對唯讀 (Immutable)**。
2. 系統**完全封鎖**且不提供任何「修改資產餘額」、「追加資本支出 (CAPEX)」或「資產減損」的 UI 操作或 API 端點。
3. 若企業真的發生減損或需沖銷，目前只能透過建立一筆全新的反向傳票 (Reverse Journal Entry) 來手動調整，以物理隔離的方式避免干擾無狀態引擎的推算。

**🚀 未來藍圖 (Roadmap)：**
為了徹底解決此問題並解鎖資產異動功能，下一代引擎必須升級為支援 **Event Sourcing (事件溯源)** 的架構。`calculateStatelessAmortizationForMonth` 不能只吃單一參數，而是必須接收一個 `Event[]` (事件陣列)，讓迴圈在推算歷史月份時，能動態套用當時該月份生效的歷史參數；同時搭配 `ClosedPeriod` 資料表來確保關帳後的數字絕對鎖定。
