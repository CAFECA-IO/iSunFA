# 部署檢查表：計費子系統（PR #6652）

> **Date**: 2026-08-15
> **Author**: Luphia
> **適用範圍**: `feature/faith_chat_quota_exhausted_notice` 併入 develop / production 時
> **關聯文件**: [團隊錢包與訂閱額度設計書](../architecture/team_wallet_and_subscription_quota.md)、[ADR 015（2026-08-14 修訂）](../architecture/decisions/015_offchain_team_wallet_ledger.md)、[席次計費規範](../architecture/team_seat_billing_and_email_invitation.md)

---

## 為什麼需要這份文件

這條分支改動了扣費管線的資料形狀（新增欄位與唯一約束），並把兩件事的真相來源搬了家：

- 團隊分配給成員的點數 → 從離鏈帳本搬到**成員的區塊鏈錢包**
- 訂閱金額 → 從整包月費改為**席次 × 單價**，而單價是新欄位

本專案**沒有 migrations 目錄**（schema 由部署流程套用），因此欄位新增與資料回填是兩件分開的事，而它們之間有順序要求。順序做錯不會噴錯，只會安靜地讓某些功能停擺或讓某些點數暫時消失在畫面上——這份清單存在的目的就是讓那些事不要發生。

---

## 1. 部署前（可在上線前完成）

### 1.1 檢查重複的待接受邀請 ⚠️

邀請的唯一約束改成單欄的 `pending_key`（**只在 PENDING 期間有值**，接受後設回 NULL）。
新欄位在既有列上是 NULL，所以 schema 套用本身不會失敗；真正會失敗的是接下來的回填（3.3）：

```sql
-- Info: 同一團隊、同一對象的重複待接受邀請（回填時會撞 pending_key 唯一鍵）
SELECT team_id, COALESCE(invitee_email, LOWER(invitee_address)) AS target, COUNT(*)
FROM team_invitation
WHERE status = 'PENDING'
GROUP BY team_id, target
HAVING COUNT(*) > 1;
```

有結果就必須先處理（保留最新一列、其餘撤回）。**這正是本 PR 修掉的並發 bug 留下的痕跡**，所以 production 有殘留是合理的預期，不是異常。回填腳本會自行偵測並列出這些列、以非零碼結束，不會寫到一半才中斷。

> 為什麼不用 partial unique index（`WHERE status = 'PENDING'`）——那是 Postgres 的正解，但 Prisma schema 表達不出來，而本專案的 schema 以 `prisma db push` 套用，手動建的索引會在下一次 push 被 drift 掉（ADR 019 已踩過）。可為 NULL 的單欄唯一鍵是同一件事的等價寫法，而且寫在 schema 裡看得見。

`order.idempotency_key` 的唯一約束沒有這個風險：既有資料該欄為 NULL，而 Postgres 允許多個 NULL。

### 1.2 確認合約位址已設定

```
NEXT_PUBLIC_CREDIT_POINT_ADDRESS
```

**未設定的後果是安靜的**：`readChainCredits` 回 0（成員的個人點數在扣費時視為不存在）、收回點數回 `TW000009`。系統不會崩潰，只會表現得像「大家都沒有點數」。

---

## 2. 套用 Schema

| 資料表 | 變更 | 風險 |
|---|---|---|
| `order` | 新增 `idempotency_key`（唯一，可為 NULL） | 低 |
| `team_invitation` | 新增 `invitee_email`、`token_hash`（唯一）、`expires_at`、`pending_key`（唯一） | 低；既有資料四欄皆為 NULL，Postgres 允許多個 NULL |
| `team_invitation` | `invitee_address` 改為可為 NULL（email 邀請時對方還沒有位址） | 低；放寬約束不會與既有資料衝突 |
| `team_invitation` | **移除**舊的複合唯一鍵 `(team_id, invitee_*, status)`，改為 `@@index([team_id, status])` | 低；但移除後到 3.3 回填完成前，既有待接受邀請暫時沒有 DB 層併發防護 |
| `team_invitation` | 新增 `accepted_by_user_id`（FK → user）、`accepted_at`、`accepted_email_match` | 低；既有列皆為 NULL，**無回填需求**（歷史邀請無從得知接受者，留 NULL 比猜一個值誠實） |
| `faith_memory`（新表） | 費思長期記憶：密文欄位、`expires_at`、`(user_id, team_id)` 唯一鍵 | 低；新表無既有資料 |
| `faith_memory_deletion_log`（新表） | 記憶刪除的稽核列（不含內容） | 低；新表無既有資料 |
| `team_subscription` | 新增 `seats`（預設 1）、`unit_price`（預設 0） | 低，但**必須接著做 3.1** |
| `team_wallet_ledger` | 新增 `tx_hash`（可為 NULL） | 低 |
| `team_quota_usage` | 索引改為 `(team_id, user_id, window_key_5h)` 與 `(team_id, user_id, window_key_week)` | 低；舊索引可留可刪 |

---

## 3. 資料回填（順序有意義）

### 3.1 回填席次與單價 — **必做，且要快**

```bash
npx tsx scripts/backfill_subscription_seats.ts          # 預演
npx tsx scripts/backfill_subscription_seats.ts --commit # 實際寫入
```

**不跑的後果**：既有付費團隊的 `unit_price` 是預設值 0，而服務端會把「付費方案卻沒有單價」判定為資料異常並**拒絕加人**（`TW000015`）。也就是說，schema 一套用，所有既有付費團隊就無法新增成員，直到這支跑完為止。

> 這個行為是刻意的。上一版的行為是「單價 0 → 補收 0 元 → 席次照加、不建單、不寫 log」，於是年繳團隊接下來一整年加人全部免費且無人察覺。擋下來比默默放行好，但也因此**回填不是選項**。

腳本會標出「計費週期是推定而非取自訂單」的那幾筆（`REVIEW` 前綴），值得人工看一眼——單價推錯會讓整個週期的補收都是錯的。

### 3.2 把既有的分配點數鑄到成員錢包 — **必做，且要快**

```bash
npx tsx scripts/migrate_allocations_onchain.ts          # 預演
npx tsx scripts/migrate_allocations_onchain.ts --commit # 實際鑄造並歸零
```

**不跑的後果**：扣費管線的第二層已改讀**鏈上餘額**，不再讀離鏈的 `TeamWalletAllocation`。因此程式一上線，既有的分配餘額就無法被消費——成員畫面上會顯示 0 點，而那些點數還躺在資料庫裡。

腳本是**先鑄造成功才歸零**（反過來做，一次 RPC 失敗就是點數憑空消失），冪等鍵為 `migrate-allocation:{teamId}:{userId}`，重跑不會重複鑄造。有任何一筆失敗會以非零碼結束並列出清單，修好 RPC 後重跑即可。

### 3.3 回填邀請的 `pending_key` — **必做，且要快**

```bash
npx tsx scripts/backfill_pending_invite_key.ts          # 預演（含重複偵測）
npx tsx scripts/backfill_pending_invite_key.ts --commit # 實際寫入
```

**不跑的後果**：舊的複合唯一鍵已被移除，而新的 `pending_key` 在既有列上是 NULL，於是**既有的待接受邀請暫時沒有 DB 層的併發防護**——兩位管理員同時邀請同一個對象時，應用層的「是否已有 PENDING 邀請」兩邊都會通過，各建一列、各扣一次席次費用。

腳本只碰 `status = 'PENDING'` 且 `pending_key IS NULL` 的列。**非 PENDING 的列刻意保持 NULL**，那正是這次改動的重點：歷史列不該被唯一鍵約束，否則「離職後再邀請同一個人」會在接受的那一刻撞鍵、永遠加不進來，而席次費已經扣了。

### 3.4 設定寄信與網站網址 — **email 邀請上線前必做**

後台系統設定（ADR 017，可線上調整、不需重啟）：

| 設定鍵 | 說明 |
|---|---|
| `SMTP_HOST` / `SMTP_PORT` | 寄信主機；`SMTP_PORT` 未填時預設 587（STARTTLS），填 465 時自動改用隱式 TLS |
| `SMTP_USER` / `SMTP_PASSWORD` | 認證；`SMTP_PASSWORD` 為 secret，寫入後不再回讀 |
| `SMTP_FROM` | 寄件者，可填 `iSunFA <no-reply@example.com>` |
| `APP_BASE_URL` | 邀請信中連結的網域，例如 `https://isunfa.com` |

**未設定的後果是明確的，不是安靜的**：email 邀請會回 `TW000018` 並且**不建立邀請、不扣款**。這是刻意的——反過來（建立邀請、收了席次費，信卻沒寄出）會讓團隊付錢買到一個受邀者永遠不知情的席次。

⚠️ `APP_BASE_URL` 填錯不會有任何錯誤訊息，信會照寄，只是連結點不開。上線後請**實際寄一封給自己**，點開確認落在 `/invite/<token>` 而不是 404。

### 3.5 設定免費版人數上限（選做）

系統設定 `FREE_PLAN_MAX_MEMBERS`，未設定時使用程式內的 fail-safe 預設 **5**。

⚠️ 此值同時決定**方案頁的標示**與**加人時的擋門**，而服務條款 §3.1 寫的是「以方案頁標示為準」——調整設定即同步兩者，不需要改條文。

---

## 4. 部署後驗證

- [ ] 既有付費團隊可以新增成員，且補收金額 = 單價 × 剩餘天數 ÷ 整期
- [ ] 成員的個人點數餘額顯示正確（遷移後應等於原分配餘額 + 原有個人點數）
- [ ] 額度用盡時的 402 提示：一般情況顯示倒數；單筆超過視窗上限時**不顯示倒數**、改提示升級或改用個人點數
- [ ] 收據只取得到自己的訂單（換一個 `order_id` 應回 404）
- [ ] 後台發放點數連點兩下只入帳一次
- [ ] 免費版團隊達人數上限時，加人被擋下並顯示原因
- [ ] 以 email 邀請一位自己收得到的信箱：信有寄到、連結點得開、註冊完成即入團
- [ ] 撤回該邀請後再邀請另一個人：**不再收費**，且畫面明講「已使用既有席次」
- [ ] 同一條邀請連結點第二次：回「連結已失效」，不會重複加人
- [ ] 邀請一個人 → 接受 → 移除該成員 → **再邀請同一個信箱** → 可以接受成功（舊版會永遠失敗）
- [ ] 同一條連結在兩個瀏覽器同時接受：只有一個人進團隊，另一個看到「連結已失效」
- [ ] 在邀請頁按「我不加入這個團隊」（**不登入**）：連結當場失效，且該席次可立刻用於邀請他人
- [ ] 費思連續問兩句有前後關係的話：第二句答得出上文（任務短期記憶）
- [ ] 付費團隊對話中明示一個偏好 → 下一輪費思沿用；降級為免費版後**不再沿用**
- [ ] Worker 的 `FaithMemoryRetention` 有啟動且 log 無 `failed`
- [ ] 團隊頁的「全隊合計」只有 OWNER 看得到；ADMIN 與一般成員只看得到自己的額度

---

## 5. 已知落差（上線後仍存在，非本次可解）

| 項目 | 狀態 |
|---|---|
| 邀請寄送未設 rate limit | 護欄為 OWNER/ADMIN 權限 + 每次邀請的 FIDO2 簽章 + 單期補收上限（TW000016）；濫用的金額上限已封住，寄信量未封 |
| 硬退信（bounce）不自動撤回邀請 | 信箱打錯時，該席次會被一封永遠不會被接受的邀請佔到逾期（7 天）或管理員手動撤回為止 |
| 費思記憶：團隊解散 / 帳戶終止時的**即時**硬刪除 | 未實作，目前一律依 90 天到期處理；條款 §3.7「以較早屆至者為準」尚有落差 |
| 費思記憶：90 天起算點為「系統發現終止之日」而非終止日 | 刻意的保守偏差，保留期只會更長不會更短（規範 §2.2） |
| 方案頁承諾值與實際額度的倍數不一致 | free 1.14×、付費 2.14×；刻意保守但倍數不齊，屬定價文案決定 |
| 結算時的 `burn` 無用戶當下簽章 | 刻意設計（條款 §3.3 / §3.5 已載明），屬信任模型變更 |

---

## 6. 回退

程式可直接回退（schema 的新增欄位對舊版程式無害，舊版不會讀它們）。**但已經上鏈的分配點數無法回退**——`migrate_allocations_onchain.ts` 跑完之後，那些點數已經在成員的錢包裡，回到舊版程式會變成「離鏈餘額為 0 且舊管線讀不到鏈上餘額」，等於成員的點數在舊版上完全不可用。

因此回退的判斷點是 **3.2 是否已執行**：

- 未執行 → 可安全回退
- 已執行 → 只能向前修，不要回退
