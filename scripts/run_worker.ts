/**
 * Info: (20260812 - Luphia) 這個入口已拆成兩個節點，本檔只負責**大聲**告知。
 *
 * 拆分理由見 `scripts/run_compute_node.ts` 的檔頭：mission 管線處理使用者上傳的
 * 內容且不該連資料庫，而 tracker / cron / recorder 的工作就是寫庫。兩者放在同一個
 * 行程裡，「Executor 沒有資料庫權限」在部署層面就只是一句話。
 *
 * ## 為什麼是退出而不是「兩個都跑」
 *
 * 讓這支繼續跑兩邊，等於拆分對既有部署完全沒有效果 —— 而那些部署正是隔離最需要
 * 生效的地方。反過來，讓它只跑其中一半（例如只跑維運）會讓 mission 管線
 * **靜默停止處理**，那是最糟的一種：沒有錯誤、只有任務不再前進。
 *
 * 所以這裡 fail fast：升級後第一次啟動就會看到該改什麼。這是刻意的破壞性變更。
 */
const MESSAGE = `
[Worker] 'npm run worker' has been split into two nodes.

  npm run worker:compute   external compute node — mission pipeline (planner /
                           executor / commitor / closer). Reads .env.worker only.
                           Must NOT have database access.

  npm run worker:ops       internal maintenance node — transaction tracker,
                           issue pipeline, exchange rate, amortization, wallet
                           guardian, subscription expiry / renewal. Needs the
                           database and uses the system .env.

Run both (they are independent processes). ecosystem.config.json already declares
them as two pm2 apps; if you start the worker by hand, start both.

Why: documents/architecture/async_workers/00_async_worker_overview.md requires the
compute node to have no database access — that guarantee only becomes real once the
database-writing jobs live in a different process.
`;

console.error(MESSAGE);
process.exit(1);
