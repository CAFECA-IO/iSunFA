# 💻 iSunFA 團隊協作與程式碼最佳實踐 (Coding Guidelines)

> **Date**: 2026-05-10
> **Author**: Tzuhan
> **Context**: 為了維持 iSunFA 作為企業級（四大會計師查帳標準）財務與 ESG 混合審計系統的穩定性與可維護性，全體工程師與 AI 協作者必須嚴格遵守以下 Clean Code 準則與架構規範。

---

## 🏗️ 1. 架構分層原則 (Layered Architecture)

我們堅守嚴格的三層式架構，確保職責單一化 (Single Responsibility Principle)：

1. **API (Controllers)**：**單純的端口。**
   - **職責**：只負責接收 Request、透過 Validator 驗證資料格式、呼叫對應的 Service，以及回傳格式化的 HTTP Response。
   - **禁忌**：絕對不包含任何業務邏輯 (Business Logic) 或資料庫操作。
2. **Service (Business Logic)**：**系統的大腦。**
   - **職責**：負責核心業務流程（如：傳票立帳、碳排計算、混合決策管線）。它負責協調多個 Repo，並執行防呆與勾稽檢查。
3. **Repository (Data Access)**：**唯一的資料庫出入口。**
   - **職責**：唯一可以直接與 DB (Prisma) 互動的層級。負責封裝複雜的查詢邏輯，提供乾淨的資料給 Service。
   - **禁忌**：不處理任何業務邏輯。

---

## 🛡️ 2. TypeScript 與型別安全 (Strict Type Safety)

對於會計與審計系統，型別安全就是資安。

1. **嚴禁使用 `any`**：
   我們對 `any` 採取零容忍態度。若面對外部 API 傳入的不可預知資料，請**有條件地使用 `unknown`**，並在使用前透過 Type Guards (型別防護 / Zod) 縮小並確認其型別。
2. **不厭其煩的型別定義**：
   所有的 Payload、DTO、以及內部流轉的資料結構，都必須在 `src/interfaces` 或是該模組下定義嚴謹的 `interface` 或 `type`。
3. **高精度數值處理 (Precision First)**：
   處理財務金額與碳排當量時，嚴禁使用原生的 `number` 進行浮點數加減乘除。必須使用 `Prisma.Decimal` 或 `BigInt` 以確保零誤差。

---

## 🧹 3. Clean Code 與程式碼品味 (Code Hygiene)

1. **嚴格遵守 ESLint 規範**：所有的警告與錯誤都必須在 Commit 前解決，CI/CD 管線將阻擋不合規的程式碼。若在開發期間需要暫時關閉 ESLint (`eslint-disable-next-line`)，必須在其上方強制加上 `// Deprecated: (date - author) remove eslint-disable` 註解。
2. **具名與具時間戳的註解標籤 (Mandatory Annotation Standard)**：
   **這是本專案的鐵律：寫上註解都需要寫上作者與日期。**
   為了極大化程式碼的「可溯源性」，所有註解都必須嚴格遵循 `documents/work_guidelines/annotation.md` 的規範。系統僅允許以下三種類型的標準註解：
   - **`Info:`** 用於留下修改軌跡、解釋複雜業務邏輯。
   - **`ToDo:`** 用於標記待辦事項（Release 前必須全數清空）。
   - **`Deprecated:`** 用於標記即將廢棄或需要移除的暫時性程式碼（如暫時關閉的 ESLint）。

   **格式範例**：

   ```typescript
   // Info: (20260420 - Luphia) Read mission data
   // ToDo: (20260510 - Julian) 記得加上 Error 處理
   // Deprecated: (20260511 - Tzuhan) [start] 舊版邏輯
   ```

3. **絕對路徑引入 (Path Aliasing)**：
   全面使用 `@/` 進行模組引入 (例如 `import { ChatService } from "@/services/chat.service";`)。嚴禁使用過深的相對路徑 (如 `../../../../`)，以提升重構時的安全性與可讀性。

---

## 🔄 4. Git Flow 與版本控管 (Version Control)

1. **保護 `develop` 分支的絕對純潔**：
   嚴禁開發者使用較舊的改動（Stale Code）強行覆蓋 `develop` 分支的更新。在發起 Merge Request 之前，**必須**先 Pull 或 Rebase 最新的 `develop`，並在本地端解決所有衝突。
2. **功能分支獨立 (Feature Branching)**：
   所有的開發都必須在 `feature/` 或 `epic/` 分支進行。

---

## 🚧 5. 防禦性編程與錯誤處理 (Defensive Programming)

1. **提早報錯 (Fail Fast) 策略**：
   猶如財務的 `A = L + E` 或 ESG 的「質量守恆定律」，所有違反底層物理與數學邏輯的輸入，必須在最外層或 Service 一開頭就 `throw Error` 凍結，絕不能讓髒資料進入資料庫。
2. **明確的異常隔離**：
   Service 層必須攔截並包裝錯誤，不讓原始的資料庫錯誤（如 Prisma 的 Unique Constraint 錯誤代碼）直接噴到 API 層回傳給前端。
3. **非同步任務的優雅退場**：
   背景 Worker 在執行重試邏輯時，若達到錯誤上限（例如產生了 3 個 `failed_*.md`），必須建立明確的放棄標記（如 `giveup.md`）或進入死信佇列 (DLQ)，避免無窮迴圈耗盡系統資源。
