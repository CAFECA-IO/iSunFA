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
   - **邊界防護**：進入 Repository 前的 Payload 必須經過 Schema 驗證（如 Zod 或 Prisma 內建型別），阻擋髒資料污染資料庫。
   - **禁忌**：不處理任何業務邏輯。

### 1.1 唯一的例外：unit-of-work 方法

> **狀態**：✅ 已採納（2026-08-17，Luphia 裁定；源自 PR #6651 的 `attendance_demo_plan.md §7.4` 提案）。
> **待確認**：措辭請 @Tzuhan（本文件作者）複核。

Repository 可以持有 `$transaction` 的**回呼形式**（`$transaction(async (tx) => …)`），**條件是那個交易保護的是一組「少做任一步就會留下永久說謊的中間狀態」的跨表寫入**。

> **與陣列形式無關**：`$transaction([queryA, queryB])` 把多個**讀取**批次送出（例如分頁資料 + 總數，見 `talk.repo.listThreadsWithCounts`）不屬於本例外、也不需要它 —— 那只是批次查詢，沒有跨表寫入的不變式要守。本節談的只有回呼形式。

判準三條，**必須同時成立**：

1. **原子性只有資料庫給得起。** 把 `$transaction` 拉到 Service 會迫使 Service 拿到 Prisma 的 `tx` 物件 —— 那違反優先度更高的「只有 Repository 能碰 Prisma」。兩條規則衝突時，守住「唯一 DB 出入口」。
2. **中間狀態不可自我修復。** 少寫其中一張表之後，系統不會在下一次操作時自己回到一致 —— 它會安靜地維持一個矛盾的事實。
3. **方法本身不做「該不該做」的判斷。** 業務決策留在 Service；Repository 只保證「要做就一起做完」。方法命名要讓這件事看得出來（`resolveRecall` 而非 `acceptRecall`）。

**現存的唯一實例**：`src/repositories/leave.repo.ts` 的 `resolveRecall()` —— 同意銷假要一次改三張表（徵詢狀態、請假日退出生效、排班改回上班日），少任一步就會出現「這個人同時在請假又要上班」或「假被銷了但判定引擎看不到班」。

**不適用的情況**（看起來像但不是）：

- 「Service 覺得寫在一起比較方便」→ 方便不是判準。若少寫一步只會導致下次操作失敗（而不是留下說謊的資料），拆開兩次呼叫。
- 「想在 Repository 裡順手做業務判斷」→ 不變式與業務判斷是兩件事：`assertSchedulableDay` / `assertStorablePii` 是「這個組合寫進去就是壞資料」，可以留在 Repository；「這個人有沒有權限做這件事」不行。

### 1.2 這條例外上路時的既有狀態（2026-08-17 實測）

§7.4 的提案要求先確認一件事才可入規範：**條文一旦生效，既有程式碼會不會當天就有一批違例？**
不確認就寫進來，規則從第一天起就沒有約束力。

實測結果：**全 repo 的 `$transaction` 共 11 個檔案，全部已在 `src/repositories/` 底下，Service 層一處都沒有。**
其中唯一的讀取型用法是 `talk.repo.listThreadsWithCounts` 的陣列形式（分頁 + 總數），依上面的界定不受本節約束。

也就是說**這條例外描述的是既有實踐，不是新開的口子** —— 它把已經在做的事寫成有判準的規則。

> ToDo: (20260817 - Luphia) 尚未逐一核對那 11 檔是否都滿足上面三條判準（尤其是
> 「以領域動詞命名」與「註解列出所保證的不變式」）。已知 `payment.repo` 的
> `createPaymentTransactionAndUpdateOrder` 這類 `AAndB` 命名不符第 1 條的精神。
> 那是命名整理，不是行為變更，另案處理；本節不因此延後採納。

---

## 🛡️ 2. TypeScript 與型別安全 (Strict Type Safety)

對於會計與審計系統，型別安全就是資安。

1. **嚴禁使用 `any`**：
   我們對 `any` 採取零容忍態度。若面對外部 API 傳入的不可預知資料，請**有條件地使用 `unknown`**，並在使用前透過 Type Guards (型別防護 / Zod) 縮小並確認其型別。
2. **不厭其煩的型別定義**：
   所有的 Payload、DTO、以及內部流轉的資料結構，都必須在 `src/interfaces` 或是該模組下定義嚴謹的 `interface` 或 `type`。
3. **API Payload 驗證最佳實踐 (Centralized Validators)**：
   為保持 API Controller 的乾淨與職責單一，所有的 Request Payload 驗證邏輯 (Zod Schema) **嚴禁直接寫在 `route.ts` 內**。必須統一抽離至 `src/validators/` 目錄下定義，並透過 `src/validators/index.ts` 集中導出。API 層僅負責呼叫 `Schema.safeParse(body)`。
4. **高精度數值處理 (Precision First)**：
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
4. **拒絕魔法字串 (No Hardcoded / Magic Strings)**：
   對於任何需要「條件判斷 (if/switch)」或「狀態比對」的字串，**絕對禁止直接 Hardcode 在程式碼中進行比對（容易錯還難追查）**。必須統一抽離至 `src/constants/` 目錄或獨立的字典檔 (如 `enums.ts`, `error_dictionary.ts` 或是 `status.ts`)，定義成 `enum` 或是唯讀的 `const` 常數。所有攸關商業邏輯的狀態字串，也必須同步記錄於架構文件中，保持文件與代碼的一致性。
5. **套用函式前的「停看聽」(Inspect Before Use)**：
   不論是工程師還是 AI，在呼叫任何現有的系統函式、API 工具或是錯誤處理套件 (如 `jsonFail`) 時，**務必先去查看該函式或介面的原始定義 (Definition)**。嚴禁憑直覺盲目傳遞參數，或憑空捏造未定義的列舉值 (例如隨意塞入不屬於 `ApiCode` 的 HTTP Status)。使用前確認定義，才能守住系統的型別安全防線。

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
