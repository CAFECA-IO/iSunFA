# 部署檢查表：通知模組 (2026 Q3)

> **Author**: Julian ｜ **Version**: 3.0 ｜ **Last Updated**: 2026-08-25
> **設計書**：[計畫書](../architecture/notification_module_plan.md)（§6 是上線前的待辦清單）｜**決策**：[ADR 025](../architecture/decisions/025_notification_addressing_and_dedupe.md)

**本專案沒有 migrations 目錄。** schema 以 `prisma db push` 套用，欄位新增與資料回填是分開的兩件事，而**順序做錯不會噴錯，只會安靜地讓功能停擺**。

---

## 1. 這次新增的 schema

**一張新表、一個既有表的新欄位、零個新 enum、零個新 env、零個媒體資產。**

| 物件 | 說明 |
|---|---|
| `notification` | 事件型通知 + 入庫的待辦型。初始 0 筆 |
| `team_invitation.invitee_email_key` | **既有表的新欄位**（可空）。`invitee_email` 的正規化投影，讓「以已驗證的信箱反查待接受邀請」查得動索引。**需要回填**，見 §2.2 |
| `@@index([inviteeEmailKey, status])` | 上面那支查詢一定同時帶 status |
| `notification.dedupe_key` UNIQUE（**可空**） | 少了它，worker 三輪重試會產生三則「您的報告已完成」。**必須 nullable** —— 不需去重的通知不帶鍵，而 Postgres 唯一約束允許多個 null |
| `@@index([userId, readAt])` | 未讀計數（`groupBy`）走這個 |
| `@@index([userId, createdAt])` | 清單（新到舊）走這個 |
| `User.notifications` 反向關聯 | 無 DDL，外鍵在 `notification` 這一側 |

`type` 是 `String`，所以**日後新增一種通知型別完全不需要 `db push`**。

**待辦型的團隊邀請不入庫**（ADR 025 §1）—— 上線不會有任何「把既有邀請補成通知」的資料動作。

---

## 2. 回填

### 2.1 `notification` 不需要回填

初始 0 筆，而**「沒有通知」是正確的初始狀態，不是待填**。

**不要為既有的歷史分析補發通知。** 那些分析早就完成、使用者早就看過結果，補發會在鈴鐺上一次倒出幾十則指向幾個月前的東西 —— 而 `dedupeKey` 讓補發**只發生一次**，這個錯誤不可逆。

### 2.2 `invitee_email_key` 需要回填

```bash
npx tsx scripts/backfill_invitee_email_key.ts            # 預演
npx tsx scripts/backfill_invitee_email_key.ts --commit
```

**做錯順序不會壞，只會晚一點生效** —— 這在本專案罕見，值得寫下來。新欄位是 NULL 時查詢就是查不到，行為與回填前完全一樣：既有的 email 邀請暫時不出現在鈴鐺與團隊頁上，不會出錯、不會漏資料、不會誤發。所以 `db push` 與回填的先後不影響正確性。

**腳本會對 `pending_key` 做自我驗證。** PENDING 的 email 邀請，`pending_key` 就是 `{teamId}:mail:{canonical}`，所以重算的結果必須等於它的後綴。對不上代表正規化規則在某個時間點分岔了 —— 那時腳本會**整批中止**、列出不一致的列、exit code 非 0。

不是「跳過那幾列、其餘照寫」：對不上代表 `canonicalizeEmailForKey` 的行為與寫 `pending_key` 當時不同，那麼其他列算出來的值**也不可信**，它們只是剛好沒踩到有差異的那部分規則（子地址、Gmail 點號）。看到中止就去查那支函式，不要繞過。

### 2.1 `request_wallet_upgrades.ts`：跑之前「無法判定」必須是 0

腳本對每位使用者的錢包 `eth_call supportsInterface(0x150b7a02)`，探針是三態：

| 情況 | 判定 |
|---|---|
| 鏈上回 true | 已具備接收能力，不發；且**收掉**還掛著的待辦 |
| 合約 revert（`ContractFunctionRevertedError` 或 RPC 層的 `ExecutionRevertedError`） | false，發 |
| 位址上沒有程式碼、回 `0x`（`ContractFunctionZeroDataError`） | false，發 |
| 其他任何錯誤 | **無法判定** —— 這輪不發也不收，計入失敗清單，exit code 非 0 |

> ⚠️ 沒有 `supportsInterface` 的 V1 錢包走的是 **`ExecutionRevertedError`**（節點只回一句 `execution reverted`，沒有 revert data），不是 `ContractFunctionRevertedError`。只接後者的話，正常的 V1 錢包會被誤判成「無法判定」而整批不發。

```bash
npx tsx scripts/request_wallet_upgrades.ts        # 預設預演，不寫入
```

三個數字要等於掃描人數。**「無法判定」不是 0 就不要加 `--commit`** —— 那代表正式機連不到 RPC，而這是一次性的 rollout 通知，`dedupeKey` 是永久唯一鍵，**發錯收不回來**。

失敗的方向是刻意選的：RPC 掛掉時整批失敗而不是整批誤發。沒發出去的下次重跑就補上了。

---

## 3. 套用順序

```bash
git pull
npx prisma db push          # 純新增，不需要 --accept-data-loss
npx prisma generate         # 先做一次可讓 db push 的問題與 build 的問題分開
npx tsc --noEmit
npm run test
npm run test:no-dotenv
npm run build
pm2 restart isunfa
pm2 restart isunfa-worker   # ← 兩個都要，見 §5.1

npx tsx scripts/backfill_invitee_email_key.ts            # 預演，看數字
npx tsx scripts/backfill_invitee_email_key.ts --commit   # 見 §2.2
```

回填排在重啟之後是刻意的：它不影響服務起不起得來，而排在前面只會讓一個「晚做也沒關係」的步驟卡住部署。

### 3.1 `db push` 之後的驗證

```sql
-- ① 表在（只有一張）
SELECT tablename FROM pg_tables WHERE tablename = 'notification';

-- ② 7 欄，且 dedupe_key 與 read_at 是 nullable
SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
 WHERE table_name = 'notification' ORDER BY ordinal_position;
-- 期望：id, user_id, type, payload, dedupe_key, read_at, created_at

-- ③ 唯一鍵與兩個索引都在
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'notification';
-- 期望：pkey + dedupe_key UNIQUE + (user_id, read_at) + (user_id, created_at)

-- ④ 邀請表的新欄位與索引都在
SELECT column_name, is_nullable FROM information_schema.columns
 WHERE table_name = 'team_invitation' AND column_name = 'invitee_email_key';
-- 期望：1 列，is_nullable = YES
SELECT indexname FROM pg_indexes
 WHERE tablename = 'team_invitation' AND indexdef LIKE '%invitee_email_key%';
```

回填之後再驗一次（`--commit` 跑完才有意義）：

```sql
-- ⑤ 該有值的都有了：PENDING 的 email 邀請不該還剩 NULL
SELECT count(*) FROM team_invitation
 WHERE status = 'PENDING' AND invitee_email IS NOT NULL AND invitee_email_key IS NULL;
-- 期望：0
```

---

## 4. 不要碰的東西

| 不要碰 | 為什麼 |
|---|---|
| `.env` / `.env.example` | `NOTIFICATION_RL_*` 只讀 `process.env`、有程式碼保底值、**不進 `.env.example`** —— 那裡的每個鍵都被視為必填，加進去會讓既有部署重啟後掉進「尚未初始化」狀態，**而該狀態下的部署精靈路徑沒有身分驗證** |
| `system_setting`（DB） | **絕不要用 SQL 直接改** —— manifest digest 失配會讓快照轉 `UNTRUSTED`，而該狀態下 `get()` 對**每一個**設定丟錯，OAuth、LLM、SMTP 一起停掉 |
| `AuditLog` | 通知是投遞不是軌跡（ADR 025 §0） |
| `team_invitation` | 待辦型是活算的，邀請表不需要任何配合欄位 |

---

## 5. 做錯會發生什麼

### 5.1 🔴 只重啟 `isunfa`，沒重啟 `isunfa-worker`（完全不報錯）

**本次部署最可能發生、也最難查的一種。** `scripts/run_worker.ts` 的 `IssueRecorder` 迴圈是分析完成／失敗通知的**唯一發射點**。

**症狀**：網站正常、鈴鐺正常、面板顯示「目前沒有通知」。分析照樣完成、`Analysis.result` 照樣寫入、`Order.status` 照樣變 `COMPLETED`。**一則通知都沒有產生，而任何地方都沒有錯誤。** 使用者不會抱怨 —— 沒有人會抱怨一件他不知道應該發生的事。

**為什麼難查**：所有你會去看的東西都是正常的。`notification` 是空的，但你剛上線，空的看起來很正常。

```bash
pm2 describe isunfa-worker | grep -E 'restart time|uptime'   # uptime 必須晚於部署時間
pm2 logs isunfa-worker --lines 50 | grep MissionRecorder     # 要看得到 tick
```

### 5.2 🔴 錢包升級待辦被誤標已讀（不報錯，且不可逆）

D1 已修（已讀排除待辦型），但**部署面的殘留風險仍在**：若正式機資料庫裡已經有被誤標已讀的 `WALLET_UPGRADE`，那些人不會再收到提醒 —— 重跑腳本會撞 `P2002` 回報「先前已發過」。

```sql
-- 應為 0；不是 0 就代表有人的 rollout 通知已經失效
SELECT count(*) FROM notification
 WHERE type = 'WALLET_UPGRADE' AND read_at IS NOT NULL;
```

補救要把那些列**刪除**（不是把 `read_at` 設回 null 就好也可以，但刪除更乾淨），並先確認哪些人真的還沒升級 —— 不是全部一起處理。

### 5.3 ⚠️ 無效的樣式 class（`tsc` 與 `lint` 全綠）

`@theme` 沒有定義的名字會產出一個不生效的 class，而型別檢查與 lint 都不會抱怨（D3 的成因）。**這是唯一一個在 staging 上用眼睛就會發現的缺陷**，前提是有人真的去點開面板。列入上線後的目視檢查。

### 5.4 ⚠️ `dedupe_key` 被建成 NOT NULL

不帶去重鍵的通知寫不進去。目前每一種都帶鍵，所以今天不會發生 —— 但新增一種不需去重的型別時會，而症狀是「那一種通知從來沒出現過」，看起來像 §5.1。§3.1 的驗證 ② 就是為這個而存在。

### 5.5 ⚠️ 把限流閾值寫進 `.env.example`

見 §4。並且要主動去登記：`src/__tests__/env_example_contract.test.ts` 的 `RATE_LIMIT_KEYS` 是一份**手抄的**清單，`NOTIFICATION_RL_*` 要加進去，否則這道保護對新鍵不生效 —— 而它是唯一會抓到這個錯的東西。

（順帶：`INVITE_RL_*` 目前不在那份清單裡 —— 既有缺口，值得回報。）

---

## 6. 回滾

**回滾程式碼不需要回滾 schema。** `notification` 表在沒有程式讀寫它時是惰性的；`team_invitation.invitee_email_key` 是**可空的新欄位**，舊版程式完全不認得它，寫入時留 NULL 也不會有人抱怨。兩者都是純新增，`pm2 restart` 回舊版即可。

（這與[假勤那份](deploy_checklist_leave_overtime_2026q3.md)**相反** —— 那次移除了欄位與 enum，所以那個結論在那裡不成立。這裡成立，是因為這次是純新增。）

若要連 schema 一起清掉：`DROP TABLE IF EXISTS notification;`（沒有 enum 要 drop、沒有外鍵指向它）。**先確認內容可拋棄** —— 上線一段時間後，那裡面有使用者還沒看過的通知。

`invitee_email_key` 可以留著不動：它是衍生值，留著無害。真要清除的話 `ALTER TABLE team_invitation DROP COLUMN invitee_email_key;` —— 但下次上線又要回填一次。

---

## 7. 上線後 24 小時的觀測

```sql
-- ① 依 type 每小時筆數：某一型掉到 0 = 那條發射點斷了
SELECT date_trunc('hour', created_at) AS h, type, count(*)
  FROM notification GROUP BY 1, 2 ORDER BY 1 DESC;

-- ② dedupe_key 不該有重複（有的話唯一鍵沒建起來）
SELECT dedupe_key, count(*) FROM notification
 WHERE dedupe_key IS NOT NULL GROUP BY 1 HAVING count(*) > 1;

-- ③ 不該全部未讀（代表沒有人在讀，或已讀路徑壞了）
SELECT read_at IS NULL AS unread, count(*) FROM notification GROUP BY 1;

-- ④ D1 的偵測：待辦型被標記已讀的筆數，永遠應為 0
SELECT count(*) FROM notification
 WHERE type = 'WALLET_UPGRADE' AND read_at IS NOT NULL;

-- ⑤ D4 的觸發條件：有沒有人的未讀超過 30
SELECT user_id, count(*) FROM notification WHERE read_at IS NULL
 GROUP BY 1 HAVING count(*) > 30;
```

非 SQL 的三項：

- [ ] `pm2 describe isunfa-worker` 的 uptime 晚於部署時間（§5.1）
- [ ] **用眼睛點開一次通知面板**，確認有背景色與邊框（§5.3）
- [ ] 開三個獨立視窗，確認一則新通知只響一次

---

## 8. 送審前的逐項確認

| # | 項目 |
|---|---|
| 1 | 每一條新測試都改壞過被測行為、確認會紅（**唯一不能跳的一步**） |
| 2 | repo 替身真的有狀態：標記已讀之後查詢真的少那些列；同 `dedupeKey` 第二次真的回 `null`；`take` 真的截斷 |
| 3 | `npm run test:no-dotenv` 綠，**且是在推送之前跑的** |
| 4 | 「查無資料」路徑有覆蓋：零通知、零邀請、`address` 為空 |
| 5 | 兩個 rate limit bucket 有守門測試，且 `NOTIFICATION_RL_*` 已加進 `env_example_contract.test.ts` |
| 6 | 錯誤碼 code 字串已對 `base`／`develop`／`branch` 做過**三方比對**（算交集，不是讀 diff） |
| 7 | 新增的 i18n key 五語系齊全，且測試驗的是**元件實際會讀的每一個鍵** |
| 8 | 秘密沒有出現在 `href`、URL、log、錯誤訊息裡 |
| 9 | 本檢查表的欄位名、表名、API 路徑與程式一致 |
| 10 | 設計書與實作一致；不一致時改的是**錯的那一邊** |
| 11 | 每條驗收判準問過「缺陷發生時它會不會照樣通過？」 |
| 12 | PR 沒有混入不相關的東西（`forge_out/` 是別的事） |
