# 已知缺陷：`/admin/settings` 的輪替與撤銷對 MissionExecutor 無效

- 發現：2026-08-12（Luphia，PR #6640 review 由 Julian 指出）
- 影響：`MissionExecutor` 及其他無主資料庫權限的節點
- 狀態：**設計上的取捨，非待修 bug** —— 但管理員的心智模型與事實相反，必須記載

## 現象

管理員在 `/admin/settings` 輪替或**撤銷** `GEMINI_API_KEY` 之後：

- Web 節點立刻生效（`systemSettingService.get()` 以資料庫為唯一事實來源）
- **`MissionExecutor` 不受影響** —— 它認的是部署環境裡的那份（`.env.setup` / `.env`）

也就是說「撤銷金鑰」之後，背景任務仍可能繼續呼叫 LLM。這與管理員在畫面上按下撤銷時的預期完全相反。

## 為什麼是這樣

`async_workers/00_async_worker_overview.md` 劃下的隔離：

> `MissionExecutor`（與其他所有負責 Web3 / AI 運算的外部節點）**絕對沒有存取主系統 PostgreSQL 資料庫的權限**。

那道隔離不是潔癖，是**防提示詞注入的基礎** —— Executor 處理使用者上傳的憑證內容，即使注入成功也必須穿不過實體網路邊界（ADR 009 的「單向黃金法則」建立在同一個前提上）。

為了取一把金鑰而讓它連上主資料庫，等於把那個安全論證的前提拿掉。依專案規則「一個設定只有一個來源」（ADR 017 §7 的規則章節），worker 有**自己的**設定檔 `.env.worker`：既不吃系統的 `.env`，也不讀資料庫。`run_worker.ts` 啟動時把它載進 `process.env`（在任何 service 被呼叫之前），Executor 則直接 `loadWorkerEnvConfig()`。範本見 `.env.worker.example`。

**為什麼不共用系統 `.env`**：那份裡有 `DATABASE_URL`、`SECRET_VAULT_MASTER_KEY`、`SUPER_ADMIN_*`。Executor 處理的是使用者上傳的憑證內容，而它連資料庫都不該連得到 —— 讓它持有信任根，等於把那道隔離的意義抵銷掉。共用一份 `.env` 是「順手」，不是「隔離」。

**找不到 `.env.worker` 時不 fallback 到系統 `.env`**：悄悄改用 web 那份會讓隔離在「剛好沒建檔」時失效，而那正是最不容易發現的情形。

**缺檔時的處置於 2026-09-14 改為 fail fast**（PR #6650 review 需修-8）：`run_compute_node` 與 `executor_worker` 找不到 `.env.worker` 直接 `process.exit(1)`。原本的立場「大聲記錄並繼續」是為了不讓**單一任務缺金鑰**停掉不需要 LLM 的任務——那條仍然成立（缺金鑰由需要 LLM 的 skill 在呼叫時失敗）；但**整份設定檔不存在**是另一件事：那代表這台機器沒部署好，續跑的結果是四個迴圈照常啟動、每筆任務在 ChatService 拋錯、累積三次拒絕後 closer 寫 `giveup.md`——付費分析被一個缺檔報銷，而 log 裡只有一行 warn。兩種缺席要走兩條通道（checklist §1.13）。

同一輪另外兩件結構性的收斂：運算節點啟動時**抹掉**繼承自 shell 的信任根鍵（`DATABASE_URL`、`SECRET_VAULT_MASTER_KEY`、`DEWT_PRIVATE_KEY_PEM`、`SUPER_ADMIN_*`；清單在 `constants/worker_node.ts`），「不吃系統 env」從此是程式碼的性質而不是檔案剛好不存在；`getPriorityEnvConfig()` 第三順位 fallback 到 `.env.worker`，讓 planner／commitor／closer 在純運算節點上取得 RPC 與 MissionBoard 位址（review 阻-1：先前它們回 `{}`、對 `undefined` address 每 10 秒拋錯，任務永遠不被領取），並在啟動時檢查兩個來源的 `MISSION_DIR` 一致（review 需修-7）。

> **2026-09-14 三輪 review 更正（FAITH 阻-3／需修-4／需修-7）**：上一段有兩處在 shipped 的部署形態下不成立，已改。
>
> 1. 「第三順位 fallback」從未生效：`ecosystem.config.json` 三個 pm2 app 共用 cwd，系統 `.env` 就在旁邊，planner／commitor／closer 拿到的仍是它。現在 `getPriorityEnvConfig()` 看**節點角色旗標**：compute 只解析 `.env.worker`（`selectPriorityEnvPath`），其餘照舊 `.env.setup` → `.env`，第三順位移除（它還會讓全新機器上的安裝精靈讀到 worker 檔）。副作用：executor 與其餘三支在 compute 角色下解析到同一個檔案，`MISSION_DIR` 一致性檢查沒有對象、已移除。
> 2. 「啟動時抹除」寫在入口檔的語句裡，而 `package.json` 是 `"type": "module"`——ESM 先求值整個靜態圖再跑那些語句，抹除發生在服務圖載完之後。現在三件事（旗標、抹除、載 `.env.worker`）收進 `lib/worker/compute_node_bootstrap`（副作用模組），兩個入口以**第一個 import** 載入，`worker_node_isolation.test.ts` 釘住這個位置。同一個模組把 fail fast 從「檔案有沒有鍵」改成「必要鍵的**值**非空」（`COMPUTE_NODE_REQUIRED_ENV_KEYS`），且只用 dotenv 一種載入機制——原本另一條「逐鍵寫 `process.env`」會讓檔內空值蓋掉 pm2／shell 給的值。

Executor 以 `new ChatService(apiKey, { allowSystemSettings: false })` 明示不查設定；`llm_key_resolution.test.ts` 有兩支測試釘住「呼叫次數為 0」與「Executor 確實傳了那個旗標」。

## 連帶的行為差異

- **模型名**：Executor 走 explicit 路徑，模型名取 `process.env.MODEL`，因此 `/admin/settings` 的 `LLM_MODEL` 對它同樣無效。
- **缺金鑰時**：節點環境沒有金鑰時不會在 `processNext` 拋錯（那會連不需要 LLM 的任務一起停掉），而是由需要 LLM 的 skill 在呼叫時拿到 key-missing 錯誤，該筆任務照既有重試 / `giveup` 機制記為失敗。

## 要真正消除這個落差，需要先回答

「Executor 到不到得了主資料庫？」目前文件說不行，而 `scripts/run_worker.ts` 同一個行程裡也跑 `order.tracker`、`wallet_audit.cron` 等明確需要資料庫的 `processNext` —— 「Executor 作為獨立外部節點」與「現在的 worker 行程」顯然不是同一件事。

在那個答案確定之前，**不要**為了讓設定生效而移除 `allowSystemSettings: false`：那會在最常見的部署形態下靜默恢復 DB 存取（照精靈流程設定的部署，金鑰簽章後已從 `.env.setup` 移入資料庫，節點環境裡本來就沒有 —— 於是 truthy 判斷必然落到查資料庫那條路）。

## 相關

- `documents/architecture/decisions/017_signed_system_settings_in_database.md`（§7 補充）
- `documents/architecture/async_workers/00_async_worker_overview.md`
- `src/services/mission.executor.service.ts`、`src/services/chat.service.ts`

## 已拆分（2026-08-12）：兩個節點

| 角色         | 啟動                     | 內容                                                                                                      | 設定來源      | 資料庫                 |
| ------------ | ------------------------ | --------------------------------------------------------------------------------------------------------- | ------------- | ---------------------- |
| 外部運算節點 | `npm run worker:compute` | MissionPlanner / Executor / Commitor / Closer（同一個 `MISSION_DIR` 上的檔案狀態機）                      | `.env.worker` | **目標為無**（見下）   |
| 內部維運節點 | `npm run worker:ops`     | TransactionTracker、IssueService、IssueValidator、IssueRecorder、匯率、攤提、錢包守恆勾稽、訂閱到期與續約 | 系統 `.env`   | 有（寫庫就是它的工作） |

`ecosystem.config.json` 已宣告成兩個 pm2 app（`isunfa-compute` / `isunfa-ops`）。`npm run worker` 保留為**會退出並印出指示**的入口 —— 讓它繼續跑兩邊等於拆分對既有部署無效，而讓它只跑一半會使 mission 管線**靜默停止**（沒有錯誤，只有任務不再前進）。

分類依據是逐一驗證過的執行期匯入圖，不是文件敘述。過程中發現五條「幽靈耦合」：那些檔案只用到 `document_parser_db_sync` 的**型別**卻寫成值匯入，於是把 `document_sync.repo → lib/prisma` 整條拉進運算節點的模組圖，已改為 `import type`。`chat.service` 對 `system_setting.service` 的匯入也改為動態（只有真的要查設定時才載入）。

### 拆分後仍存在的耦合：排放係數字典（✅ 已於 2026-09-07 解決）

運算節點曾有**兩處真實的資料庫查詢**，主題相同：

1. `voucher.pipeline.orchestrator` → `EmissionFactorRepo.getCoefficientById()`（`mission.executor.service` 的洗淨步驟會走到）
2. `skills/document/esg_parsing` → `EmissionFactorRepo.getAllGlobalCoefficients()`（經 `skills/index.ts` 被 Executor 取用）

當時列了三條出路：

| 出路                                          | 代價                                                                     |
| --------------------------------------------- | ------------------------------------------------------------------------ |
| **發包端預先把係數解析進 mission 檔（採用）** | 運算節點真正零資料庫；係數在任務排入時凍結，跨日長任務用的是排入當下的值 |
| 維運節點提供係數查詢 API                      | 維持隔離（跨界改成 HTTP，符合單向模型）；多一條內部端點與其認證          |
| 給運算節點唯讀的係數表權限                    | 最省事；但「沒有資料庫可達性」這個前提消失，而那正是防提示詞注入的基礎   |

**選了第一條（2026-09-07，Luphia），而且不是妥協**，理由有三：

1. **架構鎖死了通道**：本文件與 overview 的 shared-nothing 原則下，跨界通道只有 IPFS 與區塊鏈——「維運節點提供 API」違反單向模型（運算側反向呼叫可信網段），「唯讀權限」直接取消前提。原案寫「Planner 預先解析」，但 Planner 在運算側、自己就沒有 DB——實作上是 **MissionIssuer**（`issue.service`，維運側）在發包時嵌入 `prerequisiteData.globalCoefficients`，走 mission.json 既有的 IPFS 通道（`prerequisiteData.coefficients` 早已這樣載租戶自訂係數）。
2. **凍結是特性不是代價**：資金在發包同一時點託管（Escrow），同一份 mission 永遠以同一套係數計算——審計的可重放性正好要求這件事。係數字典是年度性參照資料，「跨日長任務用到舊值」的正確語意本來就是「用排入當下的值」。
3. **兩個消費端合併語意不變**：運算側的讀取端收斂在 `lib/worker/coefficient_snapshot`（零 prisma 純模組），合併順序（靜態先、快照蓋過）與先前 `getAllGlobalCoefficients` + 手工合併、`getCoefficientById` 的「靜態先、DB 後」逐字等價。快照缺席（通道上線前的舊 mission）落回靜態字典，不拋錯。

`src/__tests__/worker_node_isolation.test.ts` 的已知耦合清單自此為**空集合**——新增任何一條耦合都會變紅，而正確修法是走 mission 快照或維運節點。（歷史教訓保留：第一版掃描寫成「只找第一條路徑」時漏掉了 `esg_parsing` 那條，改成蒐集全部可達的匯入點才現形。）

### 尚未處理

- 其餘 worker 端服務仍透過 `getPriorityEnvConfig()` 讀系統 `.env`（`issue.service`、`issue.validator`、`issue.recorder`、`order.backfill`、`cron/amortization.worker`、`admin.blockchain`）。它們都在**維運**節點上，讀系統 `.env` 是正確的 —— 不需要改。
- `issue.recorder` 讀 `MISSION_DIR/<folder>/execution_log.json` 取 token 計數，那段在 `try {} catch {}` 內。拆成兩個節點（不共用磁碟）之後這個檔案讀不到，token 計數會落回結果載荷裡的值。**盡力而為的行為不變，但數字來源會變** —— 若要精確計數，需由運算節點把 log 併入結果載荷。
- ✅（2026-09-14 已解，PR #6650 review 需修-6）`issue.recorder` 原本靠讀 `MISSION_DIR/<folder>/giveup.md` 知道任務放棄——那是 closer 在**運算節點**磁碟上寫的，跨機部署後永遠讀不到，而 recorder 是全站唯一寫訂單終態的地方：訂單會永久卡 EXECUTING／PAID、沒有 DLQ。這條比上一條嚴重（承重而非 best-effort），當時漏記。現改為：檔案只當同機部署的快路徑，讀不到就從鏈上以**同一支判準**（`lib/worker/mission_board_verdict.isTaskGivenUp`：最新提交被拒且累計 ≥ `MISSION_GIVE_UP_REJECTION_THRESHOLD`）重推——closer 與 recorder 共用那支純函式與 ABI，兩邊不可能各寫一個 3。鏈讀失敗視為「尚無判決」（多等一輪）而非「已放棄」。

## 部署檢查（2026-09-14，PR #6650 review 二輪低-1）

拆成兩個節點之後，有三個設定缺席**不會有錯誤、只有靜默停擺**，部署或搬機後逐一核對：

- [ ] **維運節點**的系統 `.env` 有 `NEXT_PUBLIC_MISSION_BOARD_ADDRESS` 與 `NEXT_PUBLIC_RPC_URL`：recorder 靠鏈上判準把被放棄的任務收成訂單終態，位址缺席時它只會每輪印一行 error，訂單永遠留在 EXECUTING／PAID。
- [ ] **運算節點**的 `.env.worker` 三個必要鍵**有值**（`GEMINI_API_KEY`／`NEXT_PUBLIC_RPC_URL`／`NEXT_PUBLIC_MISSION_BOARD_ADDRESS`，清單在 `COMPUTE_NODE_REQUIRED_ENV_KEYS`）：缺檔或任一值為空都會在啟動時 exit(1)（2026-09-14 三輪 review 後判值不判鍵；`MISSION_DIR`／`MODEL` 有程式碼預設值）。看到 `[ComputeNodeBootstrap] … leaves required keys empty` 就是這一項。
- [ ] 運算節點的 shell 環境沒有 `DATABASE_URL`／`SECRET_VAULT_MASTER_KEY`／`DEWT_PRIVATE_KEY_PEM`／`SUPER_ADMIN_*`，**`.env.worker` 裡也沒有**（不要把系統 `.env` 整份複製過去）：bootstrap 會抹掉並印 error（兩種來源訊息不同），那一行出現就代表部署環境帶了不該帶的東西。
- [ ] 發包端 log 的「Global coefficient snapshot: N rows, B bytes per mission」：B 量的是 mission.json 的出貨形狀（indent-2），超過 `MISSION_GLOBAL_COEFFICIENT_SNAPSHOT_MAX_BYTES`（1 MB）時發包端**每 10 秒印一行 error 並停止發包**、訂單留在 PAID 不動（不燒 gas、不回滾重試；三輪 review 阻-1）——那行 error 要一直叫到有人把字典縮回去。現況靜態字典約 456 KB。

## 拆分前的狀況（保留作為脈絡）

`scripts/run_worker.ts` 在**同一個行程**裡跑 12 個迴圈，其中至少五個必須存取主資料庫：

- `TransactionTracker`（`order.tracker.service`）
- `WalletGuardian`（`cron/wallet_audit.cron`）
- 訂閱到期與續約（`cron/subscription_expiry.cron`、`cron/subscription_renewal.cron`）
- `IssueRecorder`（`issue.recorder.service`，寫回帳本是它的工作）
- `ExchangeRateSync`（`cron/exchange_rate.cron`）

也就是說「worker 不讀資料庫」在**目前的行程結構下不可能成立** —— 它對 `MissionExecutor` 與 mission 管線（純檔案狀態機）成立，對這些 cron／tracker 不成立。文件所述的「Executor 作為無資料庫權限的外部節點」與「現在的 worker 行程」不是同一件事。

要真正落實，需要把行程拆成兩種角色：

| 角色         | 內容                            | 設定來源      | 資料庫 |
| ------------ | ------------------------------- | ------------- | ------ |
| 外部運算節點 | `MissionExecutor`、mission 管線 | `.env.worker` | 無     |
| 內部維運節點 | tracker、cron、recorder         | 系統 `.env`   | 有     |

那是部署與架構決定（要多一個 pm2 app、多一份設定、以及決定 `MISSION_DIR` 如何在兩者間交換檔案），不在單次程式碼改動的範圍內。**在拆分完成之前，`.env.worker` 只涵蓋 Executor 用到的鍵**；其餘 worker 端服務仍透過 `getPriorityEnvConfig()` 讀系統 `.env`（`issue.service`、`mission.planner` / `commitor` / `closer`、`issue.validator`、`issue.recorder`、`order.backfill`、`cron/amortization.worker`、`admin.blockchain`）。

**不要**為了「讓 worker 完全不碰系統 `.env`」而把上述服務一次改掉：它們有幾支需要的正是資料庫連線，改完會直接停擺。
