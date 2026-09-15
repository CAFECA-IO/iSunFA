# ADR 026: 節點邊界契約——Mission Envelope、參照資料 CID、私有 MISSION_DIR、訂單終態結算

- 狀態：Accepted（2026-09-15 四項決策拍板，見「決策紀錄」）
- 日期：2026-09-15
- 作者：Luphia
- 關聯：PR #6650（worker 節點拆分）四輪 review；`known_issues/executor_settings_isolation.md`；ADR 017（設定 DB＋簽章）；`async_workers/00_async_worker_overview.md`

## 背景：四個互相抵銷的需求

| | 需求 A | 需求 B | 現況為何兩者不能同時成立 |
|---|---|---|---|
| A | 運算節點與維運節點 shared-nothing，跨界只有 IPFS 與鏈 | 攤提分錄要入帳；recorder 要記 token | 攤提 worker（維運）把 `result.md` 寫進 MISSION_DIR 等運算側 commitor 撿；recorder 讀運算側的 `execution_log.json`。分機即斷。planner 對下載不到的任務 `break` 不推進 cursor，一個攤提任務讓全站規劃停擺 |
| B1 | 運算節點不讀 DB | admin 可持續擴充官方係數庫 | 字典整份凍進每一份 mission（456 KB × N，上界 1 MB）。庫長到 2.3 倍即全站拒發 |
| B2 | 運算節點不讀 DB | /admin/settings 撤銷金鑰立即生效 | 運算側金鑰在 `.env.worker`，撤銷不可達 |
| C | 零捏造：驗證端拒絕不完整結果 | 不得造成使用者損失 | 三次拒絕 → giveup → 訂單 FAILED，**沒有退款路徑** |
| D | 出貨的 `ecosystem.config.json` 三個 app 同機同 cwd | 文件要求運算節點分機、無 DB 可達 | 同機：功能全動、隔離是名義的；分機：A 斷、`STORAGE_DOMAIN` 缺就第一個任務卡死 |

這些不是 bug 的累積，是**邊界沒有被定義成契約**：MISSION_DIR、`process.env`、`getPriorityEnvConfig()`、係數字典各自是一條隱性通道，誰都能用，於是拆節點時每一條都斷一次。

## 原則

1. **一條跨界通道，一份契約**：節點之間只交換「內容定址的物件」（IPFS CID）與「鏈上狀態」。任何新需求要跨界，走 envelope 加欄位，不開新通道。
2. **私有即私有**：MISSION_DIR 是運算節點的私有工作區，維運側任何模組不得引用——由掃描測試守，不靠紀律。
3. **設定是型別，不是環境**：每種節點一個 zod schema、一支載入器；服務吃參數，不摸 `process.env`。
4. **參照資料版本化、內容定址**：字典、匯率、GWP 表都是「一個版本一個 CID」，mission 只帶引用；同 CID 永遠同內容，可快取、可重放。
5. **終態必有結算**：任何讓訂單進入 FAILED 的路徑，都要同時決定錢怎麼走；「失敗」不是一個狀態，是一個交易。
6. **fail-closed**：未宣告角色的行程拿不到 DB；未通過 schema 的設定起不來；未在 envelope 裡的資料運算側看不到。

## 決策

### S1. Mission Envelope：所有上板任務都有一份版本化的 `mission.json`

```ts
// src/interfaces/mission_envelope.ts（草稿）
interface IMissionEnvelope {
  schemaVersion: 2;                       // 舊 mission（v1，無此欄）由 loader 以 v1 規則讀
  category: ANALYSIS_CATEGORY;            // 既有
  issuedAt: string;                       // ISO；S5 的逾時判準用
  execution: {
    mode: "LLM" | "PRECOMPUTED";          // PRECOMPUTED：運算側只做確定性搬運與驗證，不呼叫 LLM
    plan?: IExecutorPlan;                 // 既有 plan.executor.json 的內容，由 issuer 端決定而非 planner 猜
  };
  referenceData: Record<string, IReferenceDataRef>;   // 見 S2；key 是資料集名稱，值是 CID＋schema 版
  payload: unknown;                       // category 專屬，各自 zod
  precomputedResult?: unknown;            // mode=PRECOMPUTED 時必填，就是最終 dbSyncPayload
  tenant?: { accountBookId: string; accountBook?: unknown };
}
```

- **唯一的發包端**：`MissionIssuer`（維運）。新增 `issueSystemMission({ category, payload, precomputedResult, referenceData })`，攤提 worker 改為呼叫它——不再碰檔案系統。上鏈的 `contentCid` 永遠是真的 IPFS CID。
- **執行模式由 envelope 宣告**：`PRECOMPUTED` 的任務，executor 走 `PrecomputedResultSkill`：讀 `precomputedResult` → 過 `VoucherPipelineOrchestrator` 的確定性檢查（借貸平衡等）→ 寫 `result.md`。零 LLM、零 token、零 `GEMINI_API_KEY` 依賴。未來任何「系統產生的確定性分錄」（折舊、匯兌重估、月結）都走這條，不必再碰 worker。
- planner 不再「猜」plan：envelope 帶 `execution.plan`，planner 只做下載＋落地；沒有 plan 的舊任務（v1）沿用現行推導。

### S2. 參照資料以 CID 引用，不內嵌

```ts
interface IReferenceDataRef { cid: string; schema: "global_coefficients@1" | "tenant_coefficients@1" | string; bytes: number; }
```

- 維運側 `ReferenceDataPublisher`：對每個資料集計算內容 hash，**有變才上傳**（IPFS 內容定址，同內容同 CID，重複上傳是 no-op）。字典 456 KB 每個版本上傳一次，不是每份 mission 一次；1 MB 上界改成「單一資料集上限」，與訂單筆數無關。
- 運算側 `reference_data.loader`：CID → 本機快取（`MISSION_DIR/.refcache/<cid>`，內容定址所以永不失效）→ 依 `schema` 名稱挑 zod schema 驗證（`emissionFactor` 必須是可解析的 Decimal 字串、`ghgFactors` 每值皆數字字串；壞一筆整份拒收並寫 `plan_failed`）。這同時關掉第四輪 #5。
- **合併優先序只有一支實作**：`buildCoefficientDictionary(static, global, tenant)` 留在 `lib/worker/coefficient_snapshot`；web／聊天機器人側的 `EmissionFactorRepo.getCoefficientById` 改為「取 DB 列（`accountBookId: null`）→ 丟進同一支 builder → 查」，不再自帶第二套順序（關掉第四輪 #2、#10 的分岔）。
- `esg_parsing` 候選集改吃 builder 的完整輸出（含租戶），關掉 #4；自訂係數自此會成為候選。
- 凍結語意不變：mission 帶的是 CID，該 mission 永遠用那個版本算——審計可重放；admin 更新字典只影響之後發的 mission。

### S3. MISSION_DIR 私有化；維運側只看鏈與 IPFS

- 規格句：**任何不在運算節點匯入圖內的模組，不得引用 `MISSION_DIR`／`DEFAULT_MISSION_DIR`。** 由 `worker_node_isolation.test.ts` 新增一條：維運節點匯入圖內 `DEFAULT_MISSION_DIR` 引用數 = 0。
- recorder 的 token 來源改為鏈上 `taskSubmissions[i].consumedTokens`（commitor 提交時已帶）；`execution_log.json` 讀取刪除。`giveup.md` 快路徑刪除，只留鏈上判準（少一種模式少一種分岔）。
- planner cursor：下載／處理失敗時保留 `taskDir`、寫 `plan_failed_<n>.md`、**推進 cursor**；另一支 `PlanRetryLoop` 以退避重試失敗目錄，達 `MISSION_PLAN_MAX_ATTEMPTS` 後停止重試（終態由 S5 從鏈上判定，不是本地檔案）。一個壞任務不再擋住後面的人。

### S4. 節點設定契約

```ts
// src/config/compute_node.config.ts
const ComputeNodeConfigSchema = z.object({
  GEMINI_API_KEY: z.string().optional(),      // 決策 1：選填；LLM 任務缺鍵時以 LLM_KEY_MISSING 本地失敗
  MODEL: z.string().default(DEFAULT_GEMINI_MODEL),
  MISSION_DIR: z.string().default(DEFAULT_MISSION_DIR),
  NEXT_PUBLIC_RPC_URL: z.string().url(),
  NEXT_PUBLIC_MISSION_BOARD_ADDRESS: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  STORAGE_DOMAIN: z.string().url(),           // 第四輪 #8：唯一跨界通道的座標，缺即全滅
});
export type IComputeNodeConfig = z.infer<typeof ComputeNodeConfigSchema>;
```

- `compute_node_bootstrap` 只做：設角色旗標 → 讀 `.env.worker` **解析結果**（`dotenv.parse`，不是 `process.env`）→ schema 驗證（失敗 exit 1，列出欄位與原因）→ 存進單例 `computeNodeConfig`。**不再寫入 `process.env`**：消費端一律 `getComputeNodeConfig()`，planner／commitor／closer／executor 全部改吃它，`getPriorityEnvConfig()` 從運算圖移除（掃描守：運算圖不得匯入 `env.service`）。第四輪 #1「查的與讀的不是同一份」在結構上消失。
- `.env.worker.example` 由 schema 產生（測試：example 的鍵集合 == schema 的鍵集合），新增設定不會再漏寫文件。
- 維運節點同形：`OpsNodeConfigSchema`，來源 `.env.setup → .env`（既有順序），bootstrap 設 `ISUNFA_WORKER_NODE_ROLE=ops`。
- **prisma fail-closed**：`lib/prisma` 只在角色 ∈ {`ops`, `web`} 時建池；未宣告即拋。web 由 Next `instrumentation.ts` 宣告 `web`。第五個節點類型必須正面宣告。
- **子行程 env 白名單**：`run_executor` 以 `{ ...pickOsPassthrough(process.env), ...serialize(computeNodeConfig) }` spawn，不再 `{ ...process.env }`。封鎖清單降級為保險；第四輪 #10 的 `POSTGRES_PASSWORD` 與任何未來新增的祕密，結構上進不來。

### S5. 訂單終態結算矩陣

recorder 是唯一寫終態的地方，維持；但每個終態要帶結算動作，且判準全部來自鏈上（S3）。

| 鏈上觀測 | 終態 | 結算 | 誰扛 |
|---|---|---|---|
| 最新提交核可 | COMPLETED | `settleSpend`（既有） | — |
| 提交被拒 ≥ 門檻（既有 `isTaskGivenUp`） | FAILED | `refundCredits({ idempotencyKey: "analysis:<orderId>" })`；個人鏈上付款走 `refund.adapter`（S5-b） | 平台 |
| Open 且 `issuedAt` 超過 `MISSION_PLAN_TIMEOUT`、`submissionCount = 0`（新純函式 `isTaskStranded`） | FAILED | 維運側先 `cancelTask`（合約允許：Open 且零提交，reward 退回 creator）→ 再退款 | 平台 |
| `TaskCanceled` 事件 | FAILED | 同上 | 平台 |

- S5-b 個人鏈上付款（ICP 轉金庫）的退款：`refund.adapter` 以金庫代簽轉回付款地址，鍵 `refund:<orderId>`（決策 2）。這條與 §5.4 一樣要先 grep 產品裡有沒有已在做的地方——`spend.service` 的 `refundCredits` 已涵蓋團隊額度與錢包兩軌，鏈上個人付款的反向路徑在 P4 開工時確認，缺的才新建。
- S5-c 退款的**可見性**（決策 2）：每一筆退款都要（1）發通知 `notifyOrderRefunded`（dedupeKey `order-refunded:<orderId>`，與 `notifyAnalysisFailed` 同一則或緊接其後，讓使用者在同一個地方看到「失敗」與「已退」）；（2）寫進訂單：`Order.refund`（`refundedAt`／`refundAmount`／`refundTxHash` 或 `refundLedgerId`／`reason` ∈ {GIVE_UP, PLAN_TIMEOUT, CANCELED}），`GET /order/:id` 與列表回傳，前端訂單頁顯示「已退款」與金額。沒有這兩件事的退款等於沒退——使用者只會記得「分析失敗、錢不見了」。
- 逾時與重試常數（決策 3）：`MISSION_PLAN_TIMEOUT_MS = 24h`、`MISSION_PLAN_MAX_ATTEMPTS = 5`、退避 1→2→4→8→16 分鐘。
- validator 維持嚴格（零捏造）。運算側在提交前多一道**本地**檢查：`VoucherPipelineOrchestrator` 回 `violations[]`（如 coefficientId 不在字典），executor 視為本地重試（不上鏈、不燒 gas、不計拒絕），達上限才提交讓 validator 拒——三次拒絕的成本從「三次上鏈」降為零，而 giveup 仍有退款兜底。

### S6. 部署契約

- `ecosystem.config.json` 拆為 `ecosystem.ops.config.json` 與 `ecosystem.compute.config.json`，各自 `cwd`、各自 `env_file`；文件明寫「同機只允許開發」。
- `scripts/verify_compute_node.ts`（在運算機上跑）：斷言 DB 主機 TCP **不可達**、`STORAGE_DOMAIN` 與 RPC 可達、`.env.worker` 過 schema、shell 無封鎖鍵。這是把 known_issues 的「部署檢查」清單變成一支會紅的腳本。

### S7. 規格即測試（守門清單）

| 規格句 | 測試 |
|---|---|
| 維運圖零 MISSION_DIR 引用 | isolation：ops 圖 `DEFAULT_MISSION_DIR` 引用數 = 0 |
| 運算圖零 prisma、零 `env.service`、零 `process.env` 讀取（bootstrap／config 模組除外） | isolation：三條上界＋既有下界 |
| 每個 `createTask` 的 cid 都來自 `MissionIssuer` | scan：`createTask` 呼叫點 toEqual 單一檔案 |
| example 鍵集合 == schema 鍵集合 | 純函式比對 |
| envelope v1/v2 loader 對 fixture 的行為 | 純函式，含壞形狀拒收 |
| `isTaskStranded`／`isTaskGivenUp` | 純函式表格 |
| 終態 → 結算動作成對 | recorder 的 e2e：造 giveup 訂單 → FAILED 且 `refund:` 分錄存在 |

## 分階段落地（每支 PR 都能獨立 review、獨立回滾）

| 階段 | 內容 | 解掉 | 依賴 |
|---|---|---|---|
| **P0（#6650 收尾）** | 修第四輪機械項 #1／#2／#4／#5／#6／#8／#9／#10；#3、#7 寫成 known_issues 指向本 ADR；合併 | — | — |
| **P1 設定契約** | S4 全部＋S6 的 verify 腳本 | D 的一半、#1／#8／#9／#10 的結構性版本 | 無 |
| **P2 參照資料 CID** | S2 全部 | B1、B3、#2／#4／#5 | P1（loader 讀 config） |
| **P3 Envelope 與私有 MISSION_DIR** | S1、S3、攤提改走 issuer、planner cursor | A、#7、D 的另一半 | P2（envelope 帶 referenceData） |
| **P4 終態結算** | S5 | C、#3 | P3（逾時判準需 `issuedAt`） |

B2（金鑰撤銷）不在任何階段——它是隔離的定義本身。處置是：`.env.worker` 的金鑰視為**部署祕密**，輪替流程寫進維運手冊（含 verify 腳本檢查金鑰年齡），並在 /admin/settings 的金鑰頁明示「不影響運算節點」。

## 決策紀錄（2026-09-15，Luphia 拍板）

1. **`GEMINI_API_KEY` 不再是啟動必要鍵**。S1 之後存在 `PRECOMPUTED` 任務，「不用 LLM 的運算節點」是合法形態；缺金鑰由需要 LLM 的 skill 在呼叫時以 `LLM_KEY_MISSING` 明確失敗（S5 的本地重試路徑），不在啟動期擋。P0 已落地：`COMPUTE_NODE_REQUIRED_ENV_KEYS` = `NEXT_PUBLIC_RPC_URL`／`NEXT_PUBLIC_MISSION_BOARD_ADDRESS`／`STORAGE_DOMAIN`。
2. **退款由平台代簽轉回**（個人鏈上付款走金庫代簽 `transfer` 回付款地址；團隊額度走既有 `refundCredits`）。**使用者必須收到退款通知**（`notification.service` 新增 `notifyOrderRefunded`，dedupeKey `order-refunded:<orderId>`），**訂單查詢必須看得到已退款資訊**（`Order` 新增 `refund` 子結構：`refundedAt`／`refundTxHash` 或 `refundLedgerId`／`refundAmount`／`reason`；`GET /order/:id` 與訂單列表回傳它）。開工前依 §5.4 先 grep 產品裡既有的鏈上反向轉帳路徑，缺的才新建。
3. **`MISSION_PLAN_TIMEOUT` = 24 小時；`MISSION_PLAN_MAX_ATTEMPTS` = 5**（退避 1→2→4→8→16 分鐘）。兩者都是 `src/constants/worker_node.ts` 的常數，並列入部署檢查表。
4. **先合併 #6650**：修四輪機械項（#1／#2／#4／#5／#6／#8／#10），#3／#7 記 `known_issues/executor_settings_isolation.md` 指向本 ADR；#9（prisma fail-closed）因涉及 web 啟動順序（Next 建置期會求值 `lib/prisma`），併入 P1 與設定契約一起做。合併後以本 ADR 開 epic，P1–P4 各一張 issue。
