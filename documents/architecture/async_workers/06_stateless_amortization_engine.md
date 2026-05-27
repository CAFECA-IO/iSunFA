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
