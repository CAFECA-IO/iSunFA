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

**找不到 `.env.worker` 時不 fallback 到系統 `.env`**：`run_worker` 會大聲記錄一筆 error 並繼續（不 `process.exit`，理由見下節），Executor 則在真正需要金鑰時失敗。悄悄改用 web 那份會讓隔離在「剛好沒建檔」時失效，而那正是最不容易發現的情形。

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

### 拆分後仍存在的耦合：排放係數字典

運算節點還有**兩處真實的資料庫查詢**，主題相同：

1. `voucher.pipeline.orchestrator` → `EmissionFactorRepo.getCoefficientById()`（第 124、173 行；`mission.executor.service:521` 會走到）
2. `skills/document/esg_parsing` → `EmissionFactorRepo.getAllGlobalCoefficients()`（第 166 行；經 `skills/index.ts` 被 Executor 取用）

所以 `00_async_worker_overview.md` 那句「絕對沒有存取主資料庫的權限」目前是**目標而非事實**，而且不是匯入寫法的意外 —— 是兩次真正的查詢。三條可能的出路：

| 出路                                | 代價                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------ |
| Planner 預先把係數解析進 mission 檔 | 運算節點真正零資料庫；但係數在任務排入時就凍結，跨日的長任務可能用到舊值 |
| 維運節點提供係數查詢 API            | 維持隔離（跨界改成 HTTP，符合單向模型）；多一條內部端點與其認證          |
| 給運算節點唯讀的係數表權限          | 最省事；但「沒有資料庫可達性」這個前提消失，而那正是防提示詞注入的基礎   |

`src/__tests__/worker_node_isolation.test.ts` 以集合比對把這兩條清單化 —— **新增任何一條耦合都會變紅**，已知的兩條不會讓測試長期紅著。第一版寫成「只找第一條路徑」時漏掉了 `esg_parsing` 那條，改成蒐集全部可達的匯入點才現形。

### 尚未處理

- 其餘 worker 端服務仍透過 `getPriorityEnvConfig()` 讀系統 `.env`（`issue.service`、`issue.validator`、`issue.recorder`、`order.backfill`、`cron/amortization.worker`、`admin.blockchain`）。它們都在**維運**節點上，讀系統 `.env` 是正確的 —— 不需要改。
- `issue.recorder` 讀 `MISSION_DIR/<folder>/execution_log.json` 取 token 計數，那段在 `try {} catch {}` 內。拆成兩個節點（不共用磁碟）之後這個檔案讀不到，token 計數會落回結果載荷裡的值。**盡力而為的行為不變，但數字來源會變** —— 若要精確計數，需由運算節點把 log 併入結果載荷。

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
