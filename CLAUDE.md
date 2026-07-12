# CLAUDE.md — iSunFA 開發鐵律

> iSunFA 是挑戰四大會計師 (Big 4) 查帳標準的企業級「財務 + ESG 碳盤查」混合審計系統。
> 核心哲學：**零捏造 (Zero Fabrication)** 與 **決定論防護 (Deterministic Guardrails)**。
> 撰寫或修改任何程式碼前，務必遵守以下規範。完整說明見 `documents/`。

---

## 1. 架構分層（三層式，單向依賴）

嚴格遵守 **API → Service → Repository**，職責單一：

- **API (Controllers / `route.ts`)**：純端口。只做「接收 Request → 呼叫 Validator → 呼叫 Service → 回傳格式化 HTTP Response」。**絕不含業務邏輯或 DB 操作**。
- **Service**：系統大腦。核心業務流程（傳票立帳、碳排計算、混合決策管線），協調多個 Repo 並執行防呆與勾稽。
- **Repository**：唯一能碰 Prisma/DB 的層級。進 Repo 前 Payload 必須通過 Schema 驗證。**不處理業務邏輯**。

## 2. TypeScript 型別安全（型別安全就是資安）

- **零容忍 `any`**：外部不可預知資料用 `unknown` + Type Guard / Zod 縮小型別後才使用。
- 所有 Payload / DTO / 內部資料結構都要在 `src/interfaces`（或該模組下）定義嚴謹的 `interface` / `type`。
- **Validator 集中化**：Zod Schema 嚴禁寫在 `route.ts`，一律抽到 `src/validators/` 並由 `src/validators/index.ts` 集中導出；API 層只呼叫 `Schema.safeParse(body)`。
- **高精度數值 (Precision First)**：財務金額與碳排當量嚴禁用原生 `number` 做浮點加減乘除，必須用 `Prisma.Decimal` 或 `BigInt` 以確保零誤差。

## 3. Clean Code 與程式碼品味

- **ESLint**：警告與錯誤必須在 commit 前清乾淨，CI/CD 會擋。
- **絕對路徑**：全面使用 `@/`（如 `import { ChatService } from "@/services/chat.service";`），禁止 `../../../` 深層相對路徑。
- **拒絕魔法字串**：任何用於 if/switch 判斷或狀態比對的字串，必須抽到 `src/constants/`（`enums.ts`、`status.ts`、`error_dictionary.ts` 等）定義成 `enum` 或唯讀 `const`，並同步記錄於架構文件。
- **停看聽 (Inspect Before Use)**：呼叫任何現有函式 / API 工具（如 `jsonFail`）前，務必先看其原始定義；嚴禁憑直覺塞參數或捏造未定義列舉值（如非 `ApiCode` 的 HTTP Status）。

## 4. 註解鐵律（強制時間戳 + 作者）

只允許三種標籤，格式為 `// 類型: (YYYYMMDD - 作者) 訊息`：

```typescript
// Info: (20260420 - Luphia) Read mission data
// ToDo: (20260510 - Julian) 記得加上 Error 處理
// Deprecated: (20260511 - Tzuhan) [start] 舊版邏輯
```

- **`Info:`** — 修改軌跡、解釋複雜業務邏輯。
- **`ToDo:`** — 待辦事項，**Release 前必須全數清空**。
- **`Deprecated:`** — 即將廢棄的暫時性程式碼，**Release 前必須移除**；多行用 `[start]` … `// Deprecated: [end]` 包夾。
- 多行註解用 `/** ... */`；JSX 內用 `{/* Info: (date - author) ... */}`。
- 暫時關閉 ESLint 只能用 `eslint-disable-next-line`，且上方必須加 `// Deprecated: (date - author) remove eslint-disable`。

## 5. Git Flow

- **保護 `develop` 分支純潔**：發 MR 前必須先 pull / rebase 最新 `develop` 並在本地解完衝突，嚴禁用 stale code 覆蓋。
- 所有開發都在 `feature/` 或 `epic/` 分支進行。

## 6. 防禦性編程（Fail Fast）

- 違反底層數學 / 物理邏輯的輸入（財務恆等式 `A = L + E`、ESG 質量守恆 `期初 + 採購 = 消耗 + 期末`）必須在最外層或 Service 開頭就 `throw Error` 凍結，絕不讓髒資料進 DB。
- Service 層要攔截並包裝錯誤，不讓原始 Prisma 錯誤（如 Unique Constraint 代碼）直接噴到前端。
- 背景 Worker 重試達上限（如 3 個 `failed_*.md`）必須建立 `giveup.md` 或進死信佇列 (DLQ)，避免無窮迴圈耗盡資源。

## 7. AI / LLM 協作邊界

- LLM 只當「視力極佳的字串萃取器」：負責語意理解與非結構化轉結構化。
- **嚴禁 LLM 算數學、做邏輯判斷、當事實資料庫**。所有計算與判斷收斂到 TypeScript 確定性規則引擎。
- 資料萃取任務 Temperature = 0；用 Schema `enum` / `responseSchema` 約束輸出，禁止自由格式 + Regex 硬抓。
- 永遠不直接採信 LLM 數值，必須與後端護欄交叉驗證（借貸平衡、物理質量守恆）。

## 8. 關鍵領域模型（勿混淆）

- **`Company`**：唯讀公開資料字典（從 TWSE 爬取），只供「向外看」的爬蟲 / Benchmark。**嚴禁**掛任何內部業務資料。
- **`AccountBook`**：系統真正的租戶帳本，所有 `Journal` / `Voucher` / `EsgRecord` 等都必須透過 `accountBookId` 綁定於此，是業務的 Root Node。
- E2E 測試帳本 `AccountBook.id` 一律以 `e2e-book-` 前綴。

---

> 延伸閱讀：`documents/readme.md`（知識庫導覽）、`documents/engineering_guidelines/`、`documents/architecture/`（含 11 份 ADR）、`documents/architecture/async_workers/`（8 大守護行程管線）。
