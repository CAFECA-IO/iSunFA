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

為了取一把金鑰而讓它連上主資料庫，等於把那個安全論證的前提拿掉。所以 Executor 以 `new ChatService(apiKey, { allowSystemSettings: false })` 明示不查設定；`llm_key_resolution.test.ts` 有兩支測試釘住「呼叫次數為 0」與「Executor 確實傳了那個旗標」。

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
