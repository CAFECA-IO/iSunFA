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
| `team_member` | 新增 `joined_by_invitation_id`（FK → team_invitation，`ON DELETE SET NULL`）＋ `@@index([team_id, joined_by_invitation_id])` | 低；既有列為 NULL，**刻意不回填**——NULL 的語意是「這段成員資格不是邀請來的」，而歷史列無從得知是哪一封（猜一封比留空更糟）。代價是舊成員不顯示「信箱不符」標記，而他們現在也不顯示 |
| `faith_memory`（新表） | 費思長期記憶：密文欄位、`expires_at`、`(user_id, team_id)` 唯一鍵 | 低；新表無既有資料 |
| `faith_memory_deletion_log`（新表） | 記憶刪除的稽核列（不含內容） | 低；新表無既有資料 |
| `team_subscription` | 新增 `seats`（預設 1）、`unit_price`（預設 0） | 低，但**必須接著做 3.1** |
| `team_subscription` | 新增 `pending_plan_id`（可為 NULL，2026-08-20 降級排程） | 低；既有列為 NULL＝沒有排程中的變更，**不需要回填** |
| `team_subscription` | 新增 `nft_token_id`、`nft_owner_address`、`nft_fingerprint`、`nft_synced_at`、`nft_sync_attempts`（預設 0）、`nft_sync_error`（2026-08-19，訂閱會員卡） | 低；既有列 `nft_synced_at` 為 NULL，而 NULL 的語意正是「待同步」——**因此不需要回填**，worker 會自己補上（見 3.6） |
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

> **稽核結果（2026-08-18，維護者確認）**：review 第三～五輪反覆追問的一件事——這支腳本若在「收據狀態尚未被檢查」的期間跑過，reverted 的鑄造會被回報成成功，留下「離鏈已歸零、鏈上沒有」的資料。**已確認沒有這種資料**：該情形不存在，不需要補償作業。
>
> 收據確認本身已於本 PR 補上（`confirmTransaction`，三條金流的共用鑄造路徑都經過它），因此**日後再跑這支腳本不會重現那個風險**。

### 3.3 回填邀請的 `pending_key` — **必做，且要快**

```bash
npx tsx scripts/backfill_pending_invite_key.ts          # 預演（含重複偵測）
npx tsx scripts/backfill_pending_invite_key.ts --commit # 實際寫入
```

**不跑的後果**：舊的複合唯一鍵已被移除，而新的 `pending_key` 在既有列上是 NULL，於是**既有的待接受邀請暫時沒有 DB 層的併發防護**——兩位管理員同時邀請同一個對象時，應用層的「是否已有 PENDING 邀請」兩邊都會通過，各建一列、各扣一次席次費用。

腳本只碰 `status = 'PENDING'` 且 `pending_key IS NULL` 的列。**非 PENDING 的列刻意保持 NULL**，那正是這次改動的重點：歷史列不該被唯一鍵約束，否則「離職後再邀請同一個人」會在接受的那一刻撞鍵、永遠加不進來，而席次費已經扣了。

### 3.3b 重新封裝費思記憶的密文（AAD） — **有既有記憶列的環境必做，且要在開放對話之前**

```bash
npx tsx scripts/backfill_faith_memory_aad.ts          # 預演，只統計不寫入
npx tsx scripts/backfill_faith_memory_aad.ts --commit # 實際重新封裝
```

**不跑的後果**：AAD 綁定（PR #6652 第三輪 C-5）之後，讀取會帶 `faith-memory:{userId}:{teamId}` 當 AAD，而**在那之前封裝的密文沒有 AAD**——GCM 驗證必定失敗。症狀不是報錯，是安靜的資料遺失：

```
解不開 → 回 items: [] → 使用者下一句話 → 合併結果只有新條目 → upsert 覆寫
```

也就是每一位在改動前累積過偏好的使用者，都會在**他下一次對話時**失去那些偏好。因此這支的執行時機是「schema 套用之後、開放使用者對話之前」——晚跑一步，已經對話過的那些人救不回來（重新封裝需要明文，而明文已經被覆蓋掉了）。

程式端另有一道防線但**不能取代這支**：覆寫讀不出來的密文時會寫入 `FaithMemoryDeletionLog`（`reason = CIPHERTEXT_UNREADABLE`）並 `logger.warn`。那是「記錄損失」，不是「避免損失」。

先跑預演看 `resealed` 的數字：

- `resealed = 0`、`already = 0`、`total = 0` → 這個環境沒有記憶列，不必做（**本機開發環境實測為 0**；其他環境請各自跑一次預演確認，不要沿用這個結論）。
- `unreadable` 非空 → **停下來看**。兩種方式都解不開代表問題不在 AAD，先確認 `SECRET_VAULT_MASTER_KEY` 是不是這個環境當初封裝時用的那一把。腳本刻意不動這些列。

腳本冪等：已是 AAD 版本的列算進 `already` 並跳過。正確性由 `src/__tests__/e2e/faith_memory_aad_backfill.e2e.test.ts` 對真資料庫驗證（建一列舊格式 → 預演不寫入 → `--commit` → 讀回原本的偏好 → 重跑為 `already`）。

### 3.3c 重算既有的信箱比對結果 — **有既有邀請紀錄的環境建議做**

```bash
npx tsx scripts/backfill_invite_email_match.ts          # 預演，只統計不寫入
npx tsx scripts/backfill_invite_email_match.ts --commit # 實際更新
```

**為什麼**：比對規則於 2026-08-18 改為「同一個收件匣」（去子地址、Gmail 系列去點號）。在那之前，邀請寄到 `alice+isunfa@gmail.com`、本人以已驗證的 `alice@gmail.com` 接受，會被記成 `MISMATCHED`——而那個訊號現在會出現在告警與成員卡片上。**會誤報的稽核訊號比沒有訊號更糟**：看過幾次之後沒有人會再認真看它。

**只往一個方向改**（`MISMATCHED` → `MATCHED`）：重算用的是**現在**的第三方綁定，而使用者可能在加入之後才綁定或解除某個信箱。把當時記為 `MATCHED` 的列改成 `MISMATCHED` 等於憑今天的狀態否定一筆當時可能正確的紀錄。

不跑的後果只是誤報留著，不影響任何功能——因此列為「建議」而非「必做」。

### 3.4c 團隊 ADMIN 角色取消的回填（2026-08-19，**有 ADMIN 成員的環境必做**）

**順序：先部署程式，再跑回填。** 這一點有實質差別 ——

| 順序 | 結果 |
|---|---|
| 部署 → 回填 | 新程式已不可能再產生 ADMIN，回填一次就收斂 |
| 回填 → 部署 | 舊碼的閘還是 `OWNER \|\| ADMIN`、可授予角色的陣列還含 ADMIN，兩者之間任何一次邀請或改角色都能**再造出 ADMIN 列**，而不會有人再跑一次回填 |

```bash
# 1. 程式部署完成之後才跑
npx tsx scripts/backfill_remove_team_admin.ts          # 預演，只列出不寫入
npx tsx scripts/backfill_remove_team_admin.ts --commit # 成員與 PENDING 邀請降為 EDITOR

# 2. 跑完再驗一次：兩個數字都必須是 0
npx tsx scripts/backfill_remove_team_admin.ts
```

第 2 步不是多餘的：`--commit` 的輸出只說「已更新 N 筆」，而「還剩幾筆」要再跑一次預演才看得到。若不是 0，代表回填與部署之間又長出了新的 ADMIN 列（見上表）。

**只改 PENDING 的邀請列**：已接受／已拒絕／已撤回的歷史列保持原樣。那是「這個人當初以什麼身分加入」的唯一紀錄（`TeamMember.joinedByInvitationId` 指向它），改掉之後 OWNER 事後查不出該補權限給誰 —— 而下面那句「由 OWNER 個別調整」正是依賴這個資訊。這與 §3.3／§3.3c 對歷史列的原則一致。

**不跑的後果不是報錯，是「角色對不上」**：`role` 是字串欄位，殘留的 `"ADMIN"` 列不會讓任何查詢失敗——權限判斷一律 false（fail-closed，安全），但畫面上那個成員的角色標籤是空的，管理者看不出他是什麼。**尚未接受的邀請**若指定 ADMIN 角色也要一起改，否則它被接受時會照著寫回一個沒有角色的成員。

**降為 EDITOR 而不是 OWNER**：OWNER 是持卡人，升級等於在沒有人同意的情況下多發一位可以動錢的人，而且「最後一位 OWNER」的保護會讓事後降級更麻煩。降級的錯是權限不夠，由 OWNER 個別補回即可。

⚠️ 這些成員會**失去管理權**：邀請、成員管理、錢包與訂閱操作，**以及碳盤查會話的封存權**（`DELETE_CAPABLE_ROLES` 由 `["OWNER","ADMIN"]` 改為 `["OWNER"]`）。最後那一項容易被漏掉 —— 前 ADMIN 封存過的會話，事後只有 OWNER 或建立者救得回來。上線前應通知各團隊的 OWNER。本機開發環境實測為 0 筆；其他環境請各自跑一次預演確認。

### 3.4 設定寄信與網站網址 — **email 邀請上線前必做**

後台系統設定（ADR 017，可線上調整、不需重啟）：

| 設定鍵 | 說明 |
|---|---|
| `SMTP_HOST` / `SMTP_PORT` | 寄信主機；`SMTP_PORT` 未填時預設 587（STARTTLS），填 465 時自動改用隱式 TLS |
| `SMTP_USER` / `SMTP_PASSWORD` | 認證；`SMTP_PASSWORD` 為 secret，寫入後不再回讀 |
| `SMTP_FROM` | 寄件者，可填 `iSunFA <no-reply@example.com>` |
| `APP_BASE_URL` | 邀請信中連結的網域，例如 `https://isunfa.com` |

**未設定的後果是明確的，不是安靜的**：email 邀請會回 `TW000018` 並且**不建立邀請、不扣款**。這是刻意的——反過來（建立邀請、收了席次費，信卻沒寄出）會讓團隊付錢買到一個受邀者永遠不知情的席次。

**2026-08-18（第三輪 D）三件部署須知**：

1. **舊格式的邀請連結會失效**。連結由 `/invite/<token>` 改為 `/invite#<token>`，且三支 API 改為 `POST /api/v1/invite/{resolve,accept,decline}`（token 置於請求本文）。測試環境若已寄出舊格式的信，那些連結會 404，需重新邀請。正式環境尚未上線此功能，無既有連結。
2. **schema 新增 `team_invitation.revoked_by_user_id` / `revoked_at`**，`status` 新增 `REVOKED`。撤回改為改狀態，仍會清空 `token_hash` 與 `pending_key`（連結失效、唯一鍵讓出）。
3. **`TRUSTED_PROXY_DEPTH`（選填，預設 1）**：`x-forwarded-for` 由左往右附加，因此取的是**由右往左數第 N 段**，N = 我們自己前面有幾層代理。只有一層 nginx → 1（預設）；前面還有 CDN → 2。設錯（0／負數／非數字）會退回預設。**若哪天前面多一層代理而沒調這個值，限流會以上游的位址為維度**——所有流量看起來像同一個來源。
4. **限流新增 `INVITE_TOKEN` 桶**（20/分、200/日）。可用 `INVITE_RL_PER_MINUTE` / `INVITE_RL_PER_DAY` 覆寫，**不要寫進 `.env.example`**——那個檔案裡的每一個鍵都被視為必填，加進去會讓既有部署下次重啟掉進「尚未初始化」狀態（見 `env_example_contract.test.ts`）。

⚠️ `APP_BASE_URL` 填錯不會有任何錯誤訊息，信會照寄，只是連結點不開。上線後請**實際寄一封給自己**，點開確認落在 `/invite#<token>` 而不是 404（2026-08-18 起 token 放在 fragment，見邀請設計書 §5.2）。

### 3.4b 邀請量的兩道上限（2026-08-19，**選做**）

免費版人數上限移除之後，寄信量失去所有界線（免費團隊不收席次費，而每一封 email 邀請都是真的寄出去的信）。新增三層界線，**全部有程式內的保底值，不設定也會生效**：

| 層 | 維度 | 預設 | 可調整處 |
|---|---|---|---|
| 限流 | 操作者（OWNER / ADMIN） | 10 / 分、100 / 日 | env `INVITE_SEND_RL_PER_MINUTE` / `INVITE_SEND_RL_PER_DAY`（**不要寫進 `.env.example`**，那裡的鍵一律視為必填） |
| 同時未接受的邀請數 | 團隊（**僅免費方案**） | 20 | 系統設定 `TEAM_PENDING_INVITE_LIMIT` |
| 每日寄送數（滾動 24 小時） | 團隊（**僅免費方案**） | 50 | 系統設定 `TEAM_INVITE_DAILY_LIMIT` |
| 寄送冷卻 | 團隊（**僅免費方案**） | 60 秒 | 系統設定 `TEAM_INVITE_COOLDOWN_SECONDS` |
| 免費團隊數 | **使用者** | 1（僅擁有的團隊，付費團隊不限） | 無設定，見 `assertCanOwnAnotherFreeTeam` |

各層分工不同，缺一就有繞法：

- **限流**擋單人狂點（一瞬間打很多次）
- **冷卻**擋穩定地一直寄 —— 每分鐘一封在限流眼中完全正常，永遠不會超限

⚠️ **三道團隊層的量控只對免費方案生效**（產品決定 2026-08-19）。它們存在的理由是「免費團隊不收席次費，寄信量沒有經濟上的煞車」；付費團隊每加一席都在付錢，那本身就是煞車，而三道對他們的代價是實際的 —— 60 席的公司一次邀 60 位員工會在第 21 封被擋，每分鐘一封更要花一小時，而那些席次的錢已經付了。

付費團隊剩下的界線是**每操作者的限流**（10/分、100/日）。那一層是 process 記憶體的實作：多實例各自計數、重啟歸零，因此它擋得住「一個人狂點」，擋不住「總量」。**這是明知而為的取捨** —— 付費團隊的濫用成本由席次費與金流紀錄承擔。若日後付費帳號被盜並用於大量寄信，補救的方向是加一道 per-user 的跨團隊日上限，而不是把這三道改回一律套用（那會再次擋住正常的大型導入）。

訂閱過期或被取消一律視為免費方案，否則「讓訂閱過期」就成了免除這三道的方法。
- **同時未接受數**擋「一次撒出幾百封」
- **每日寄送數**擋「撤回再邀、撤回再邀」的迴圈（只看同時數的話，那個迴圈可以無限寄信而同時數永遠是 1）
- **免費團隊數**擋「一個帳號建十個免費團隊、各拿一份額度」—— 前面四層都是 per-team 或 per-operator，而建立團隊先前沒有任何上限

⚠️ **既有資料的影響**：`assertCanOwnAnotherFreeTeam` 只在**建立新團隊**時檢查，不會回頭處理既有帳號已經擁有的多個免費團隊 —— 那些團隊照常運作，只是無法再開新的。刻意不做回填：把既有團隊刪掉或降級都是破壞性的，而它們的存在本身不是缺陷。

設定值讀不到或驗簽失敗時**退回保底值而不是放行**：一次設定異常不該讓上限消失。

### 3.5 免費版人數上限已移除（2026-08-19）— **有既有設定列的環境需要一個動作**

免費版人數上限（`FREE_PLAN_MAX_MEMBERS`）已於 2026-08-19 取消：免費方案的額度改為**全隊共用一份**，加人不再產生額度，上限失去存在的理由。程式碼已無任何讀者。

**這個系統設定鍵刻意保留為 deprecated，不要直接刪。**

`systemSettingService.loadSnapshot()` 遇到 `SYSTEM_SETTING_DEFINITIONS` 裡沒有的 DB 列，會把**整組設定**判為 `UNTRUSTED`，而該狀態下 `get()` 對每一個設定丟錯——OAuth、LLM、SMTP 會一起停掉。也就是說「順手刪掉定義」會讓任何曾經設過這個值的環境在部署當下全站失能。

移除的順序（兩階段，第二階段是另一個 PR）：

1. 由**後台設定頁**移除該列（走 `applySigned`，會重新計算並簽章 manifest）。
   ⚠️ **不要用 SQL 刪**：digest 會失配，症狀與上面完全一樣（整組 UNTRUSTED）。
2. 確認**所有環境**都沒有這一列之後，才能刪掉 `SystemSettingKey.FREE_PLAN_MAX_MEMBERS`、它的定義與 fallback。

沒有設過這個值的環境（DB 沒有那一列）不需要任何動作。

---

### 3.6 訂閱會員卡的首次同步（2026-08-19）— **不需要回填，但要確認 worker 在跑**

既有付費訂閱在 schema 套用後 `nft_synced_at` 皆為 NULL，也就是全部處於「待同步」。`SubscriptionCardSync` 迴圈（`scripts/run_worker.ts`，每分鐘一輪、每輪 20 個團隊）會依序為它們鑄卡，因此**沒有回填腳本，也不該有**——鑄卡是鏈上寫入，需要重試、需要冪等，那正是 worker 的形狀。

上線後要確認的三件事：

- [ ] **worker 有在跑**：`npx tsx scripts/run_worker.ts` 的 log 應出現 `SubscriptionCardSync` 與「訂閱卡同步完成」，且 `remaining` 逐輪下降。
- [ ] **合約位址已設定**：`NEXT_PUBLIC_DYNAMIC_KYC_MEMBERSHIP_ADDRESS`。沒設定時 worker 會每輪印一行「鏈上環境未備妥，本輪不同步訂閱卡」並**整輪跳過**（不會燒掉任何團隊的重試額度），但卡片永遠不會出現。
  （2026-08-21 更正：方案顯示已改為純 DB，這個位址**只**影響卡片鑄造，與任何畫面無關。沒設定時 worker 每輪跳過並留 log，卡片不會出現，其他一切照常。）
- [ ] **管理員錢包有 `DEFAULT_ADMIN_ROLE`**：`mintCard` / `setTokenURI` 都是該角色專屬。缺角色的症狀是每個團隊各失敗 5 次後停手，`team_subscription.nft_sync_error` 會留下 revert 原因。

積壓與放棄的觀察點（都在同一行 log 裡）：`givenUp > 0` 表示有團隊已達重試上限，需要人看 `nft_sync_error`；修好原因（解黑名單、補角色）後把該列的 `nft_sync_attempts` 歸零即可自動接續。

**降級與續期不需要任何動作**：訂閱資料的每一條變更路徑都會把 `nft_synced_at` 設回 NULL，worker 下一輪就換 URI。

---


### 3.7 降級改為期末生效（2026-08-20）— **不需要回填，但要看一件事**

降級不再期中生效（《退款政策》§2.1、設計書 §7.1）。既有列的 `pending_plan_id` 為 NULL，語意就是「沒有排程中的變更」，因此沒有回填。

**要看的是部署前已經被立即降級的團隊**：舊行為會把 `plan_id` 直接改成 `free` 並把 `unit_price` 歸零，那些列已經降完了，**無法從資料回推「他當初付到哪一天」**（週期欄位仍是原週期，但 `plan_id` 已是 free）。若有客訴，只能以訂單紀錄（`BILLING_SUBSCRIBE` 的 `created_at` 與週期）人工判斷補償。查詢方式：

```sql
SELECT team_id, plan_id, status, current_period_end, unit_price
FROM team_subscription
WHERE plan_id = 'free' AND current_period_end > NOW();
```

有列＝這些團隊在「已付費期間內」被降為免費版（舊行為造成）。數量通常是 0（此功能上線後才會有人用到降級）。

### 3.8 回填 `billing_interval`（2026-08-21）— **有付費訂閱的環境必做，且要在開放加人之前**

`team_subscription.billing_interval` 是新欄位，**可為 NULL 且刻意不給預設值**（review #6687 三輪）：本專案沒有 migrations 目錄，`db push` 之後既有列一律是 NULL。期中加人的補收分母讀這一欄（一期的天數），NULL 會被守門擋下（`TW000029`），**那些付費團隊在回填之前加不了人**——這是刻意選的失敗方向：若給預設值 `month`，年繳列會拿到一個完全合法、只是錯的值，守門看不見它，補收分母變成 30 天而不是 365（**多收約 12 倍**，且 5 席以上剛好撞不到 2 倍上限）。寧可擋下，不要對綁定的卡多收。

因此這一項的急迫性是「回填之前付費團隊不能加人」，不是「回填之前會算錯錢」。正確值存在每列最後一張訂單的 `data.billingInterval`，回填腳本從那裡讀：

```
npx tsx scripts/backfill_billing_interval.ts          # 檢視（dry-run）
npx tsx scripts/backfill_billing_interval.ts --apply  # 套用
```

「無法判定」的列（訂單讀不到週期）腳本會列出、不猜——人工核對後手動更新；在補上之前那個團隊加不了人，但不會算錯錢。跑完再跑一次 dry-run 應為 0 列待修、0 列無法判定。

```sql
-- 驗證：付費訂閱不該有 NULL 週期
SELECT team_id, plan_id FROM team_subscription
WHERE plan_id <> 'free' AND billing_interval IS NULL;
```

### 3.9 檢查卡在 PAID 的續訂訂單（2026-08-21）— **上線前先查，那些人正在寬限期倒數**

「扣款成功、套用失敗」的續訂訂單停在 `PAID`，修正前的 worker 永遠跳過它們，三天後降級免費版（review #6687 二輪阻擋-2）。部署這版之後 worker 會自動補套用，但**部署前**先查有多少人已經中招、有沒有已經被降級的：

```sql
-- 還來得及自動補救的（部署後第一輪 worker 會處理）
SELECT o.id, o.user_id, o.created_at FROM "order" o
WHERE o.type = 'BILLING_SUBSCRIBE' AND o.status = 'PAID'
  AND o.idempotency_key LIKE 'renew:%';

-- 已經降級的（付了錢、拿到免費版）：需要人工補償
-- （續訂訂單的 data.teamId 是頂層欄位，用它 join；不要用 epoch 重組冪等鍵——
--   period_start 帶毫秒時會對不上）
SELECT ts.team_id, ts.plan_id, ts.status, o.id AS order_id, o.created_at
FROM "order" o
JOIN team_subscription ts ON ts.team_id = o.data->>'teamId'
WHERE o.status = 'PAID' AND o.idempotency_key LIKE 'renew:%'
  AND ts.plan_id = 'free';
```

### 3.10 清掉舊的 `pending_plan_id = 'free'`（2026-08-21）— **有排程降級紀錄的環境要做**

裁定後「不再付錢」只關 `auto_renew`，不寫排程欄位（設計書 §7.1.6）。部署前若有人已用舊行為排程過降到免費版，那些列會留著 `pending_plan_id = 'free'`：續訂 cron 讀不到它們（`auto_renew` 已是 false），但**團隊錢包面板會顯示「已排定於 X 起改為免費版」**，而新的正確說法是「自動續訂已關閉」。兩者結果相同，只是措辭不同——不影響金流，可從容處理：

```sql
-- 檢視
SELECT team_id, plan_id, auto_renew, current_period_end
FROM team_subscription WHERE pending_plan_id = 'free';

-- 清理（auto_renew 應該已是 false；若不是，那一列是舊行為的殘缺狀態，要一併關掉）
UPDATE team_subscription SET pending_plan_id = NULL, auto_renew = false
WHERE pending_plan_id = 'free';
```

### 3.11 可中斷任務的書籤表（2026-08-26）— **`db push` 即可，不需要回填**

`resumable_job` 是新表（PR #6717，設計見 `architecture/resumable_credit_jobs.md`）。**不需要回填**：沒有書籤就等於「沒有未完成的任務」，而那對既有資料是對的答案。

上線後要看兩件事，兩者都在 worker 的 log 裡（`ResumableJobScan`）：

- **`unknown` 持續不為 0**：那些暫停中的任務**永遠不會**被翻成「可以繼續」。目前只有兩個成因會落在這裡——沒有付費團隊（無帳本會話，那條路本來就不由額度翻面）與認不出的任務型別（部署了新型別卻沒在 `JOB_SPEND_MODE` 宣告）。後者是缺件，要修。
- **`released` 永遠是 0 而 `stillShort` 一直有數字**：判準可能又與扣款端分岔了（見設計書 §5.1——足額判準對免費／團隊方案永遠是 false，那個缺陷讓整套機制在上線後三天都沒有人發現）。

```sql
-- 暫停中的任務（含停多久）
SELECT type, status, pause_reason, paused_at, total_steps, completed_steps
FROM resumable_job WHERE status IN ('PAUSED', 'RESUMABLE')
ORDER BY paused_at;

-- 缺件：認不出的型別或沒有付費團隊
SELECT id, type, team_id FROM resumable_job
WHERE status = 'PAUSED' AND (team_id IS NULL OR type <> 'CARBON_REPORT_IMPORT');
```

**新增任務型別時的義務**：在 `JOB_SPEND_MODE` 宣告它的扣點模式（封頂放行／足額），並在 Service 的 `assertResourceOwnedBy` 補上它的所有權規則——後者是 exhaustive switch，漏了會是 TypeScript 錯誤；前者漏了會讓那種任務永遠停在 `unknown`。

---

## 4. 部署後驗證

- [ ] 既有付費團隊可以新增成員，且補收金額 = 單價 × 剩餘時間 ÷ **一期長度**（月 30／年 365 天；不是 ÷ 期初到期末的跨距——展延後那可能是好幾期）
- [ ] 剩餘超過 30 天的付費團隊按**同方案**「延長方案」：付款前顯示「暫不開放購買延長」的說明，送出則被 `TW000028` 擋下；剩餘 30 天內照常建單
- [ ] 同一個團隊按**升級**（換較高方案）：不受 30 天閘門限制，付款前顯示「舊方案剩餘期間將按已付金額折抵為新方案天數」；付款後 `current_period_end` = 今天 + 一期 + 折抵天數（年繳團隊剩 335 天升月繳企業 ≈ 今天 + 30 + 78.7 天）
- [ ] 展延或折抵之後跨距超過一期的團隊仍可加人（上限已按跨距縮放，不會誤擋 `TW000016`）
- [ ] 智能溫盤：把額度調到只夠跑三、四份，匯入一份 11 章的報告 → 畫面說「點數已用完，還沒開始解析：…」而**不是**「章節解析失敗」；伺服器只收到「成功份數 + 1」次請求，不是 14 次
- [ ] 補上點數後按「接著匯入」→ 只送剩下的那幾份（已完成的章不會重跑、不會再扣點）
- [ ] 未綁帳本的會話匯入 PDF → 在送出前就被擋下並說明要先綁帳本（一次呼叫都不發）
- [ ] worker log 的 `ResumableJobScan`：`unknown` 不應持續累積；`released` 在額度重置後應該出現非 0
- [ ] 寬限期（PAST_DUE）的團隊按「降級為免費版」：立即生效（`plan_id` = free、`auto_renew` = false），續訂 worker 下一輪不再對它扣款
- [ ] 訂閱中的團隊按「降級為免費版」：`auto_renew` 轉 false、`pending_plan_id` 保持 NULL、`plan_id` 與週期**不變**；團隊錢包面板出現「自動續訂已關閉…轉為免費版」與「維持目前方案」按鈕（僅 OWNER 看得到），按下後 `auto_renew` 回 true
- [ ] 降轉到較低付費方案：`pending_plan_id` 寫入且 `auto_renew` 維持 true；期末續訂 cron 以新方案計價（面板顯示「已排定於 X 起改為 Y」）
- [ ] 成員的個人點數餘額顯示正確（遷移後應等於原分配餘額 + 原有個人點數）
- [ ] 額度用盡時的 402 提示：一般情況顯示倒數；單筆超過視窗上限時**不顯示倒數**、改提示升級或改用個人點數
- [ ] 收據只取得到自己的訂單（換一個 `order_id` 應回 404）
- [ ] 付費團隊的 OWNER 登入後，右上角徽章顯示團隊版／企業版（不是免費版），且方案頁的「目前方案」標在對應那一格
- [ ] 該 OWNER 的錢包在一分鐘內出現一張訂閱會員卡 NFT，`team_subscription.nft_token_id` 有值
- [ ] ~~`/auth/me` 的 `planSource`~~ **已取消**（2026-08-21 裁定：方案一律讀 DB、零 RPC，沒有第二個來源就沒有「來源」欄位）。改驗：付費團隊 OWNER 的徽章與方案頁**只由 DB 決定**，與鑄卡進度無關
- [ ] worker log 的 `walletNotReady` 數字符合預期（= 尚未升級錢包的付費團隊數；那不是錯誤，是 ADR 021 的常態混合狀態）。`npx tsx scripts/list_card_sync_giveups.ts` 應為空——有列就是探針以外的失敗，需要人看
- [ ] 方案頁的三個價格與 `plan.service.listPlans()` 一致（改價後只要改常數，四處讀者已收斂為一處）
- [ ] 後台發放點數連點兩下只入帳一次
- [ ] 免費版團隊可以邀請成員（不再有人數上限），且方案頁顯示「團隊人數不限」
- [ ] 同一位管理員連續邀請超過 10 次／分鐘時回 429；團隊累積 20 封未接受邀請時回 TW000023
- [ ] 免費版團隊的兩位成員共用同一份額度：一位用掉之後，另一位的可用量跟著減少
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

## 4.9 與 develop 合併時（第五輪 B 段）

develop 已併入 attendance/HR 模組（PR #6651，37 個 commit），**8 個檔案雙方都改到**。合併前後各要處理一件事：

| 項目 | 處置 |
|---|---|
| **錯誤碼撞號** | 本分支的 `NF_TEAM` 原為 `NF000017`，與 develop 的 `NF_EMPLOYEE_FOR_USER` 相同——後者刻意不回 403 以免洩漏「這個信箱在系統裡有員工檔」，若前端把它映射成「團隊不存在」，那個保護就失效。**已於本分支改為 `NF000024`**。另有三組是本分支自己的重複（`VA000041`／`TW000010`／`TW000011`），一併改掉；`error_dictionary_codes.test.ts` 從此擋住同檔重複 |
| **`enforceCarbonRateLimit` 別名** | develop 保留別名 + 16 支呼叫端；本分支已全數遷移並刪除別名。**合併取本分支這一側**——那正是 develop 那條 ToDo 要做的事。已逐檔確認 develop 引用舊名的檔案在此都已遷移 |
| **`RATE_LIMIT_RULES`** | 是 total `Record`：develop 加 `ATTENDANCE_*`、本分支加 `INVITE_TOKEN*`，**名稱無碰撞但兩邊的項目都要保留**，只收一半 `tsc` 會報缺鍵（會爆、不會靜默） |
| **schema** | 雙方各加 model（develop 6 個 + 6 enum、本分支 `FaithMemory` / `FaithMemoryDeletionLog`），無同名衝突，但 `prisma db push` 會**一次套用兩個模組**。本檔第 3 節的回填順序與 `deploy_checklist_attendance_2026q3.md`（develop）的步驟屬同一次部署，兩份都要跑；**合併後請在對方那份補上指回本檔的連結**（本分支看不到那個檔案，只能單邊指過去） |

---

## 5. 已知落差（上線後仍存在，非本次可解）

| 項目 | 狀態 |
|---|---|
| 邀請寄送未設 rate limit | 護欄為 OWNER/ADMIN 權限 + 每次邀請的 FIDO2 簽章 + 單期補收上限（TW000016）；濫用的金額上限已封住，寄信量未封 |
| 硬退信（bounce）不自動撤回邀請 | 信箱打錯時，該席次會被一封永遠不會被接受的邀請佔到逾期（7 天）或管理員手動撤回為止 |
| 費思記憶：團隊解散 / 帳戶終止時的**即時**硬刪除 | 未實作，目前一律依 90 天到期處理；條款 §3.7「以較早屆至者為準」尚有落差 |
| 費思記憶：90 天起算點為「系統發現終止之日」而非終止日 | 刻意的保守偏差，保留期只會更長不會更短（規範 §2.2） |
| 方案頁承諾值與實際額度的倍數不一致 | free 1.14×、付費 2.14×；刻意保守但倍數不齊，屬定價文案決定 |
| ~~結算時的 `burn` 無用戶當下簽章屬刻意的信任模型變更~~ | **這條記載是錯的（2026-08-18 更正）**：條款 §3.3 承諾的正好相反——「該項扣除需經您以帳戶憑證（如 Passkey）簽章確認（第三方登入之託管帳戶由系統代為簽署）」。無簽章的平台側 burn 從來不是被載明的設計，而是一個沒有人擋下來的實作選擇；它也從來沒有成功過（見下一列） |
| **收回分配點數做不到** | 點數在成員自己的鏈上錢包裡，而**移出那個錢包必須有持有人簽章**；收回的對象正是不會去簽的那個人。（更正：先前這列寫「合約層面做不到、要恢復須改合約並重新部署」——那個因果是錯的，見下方「扣費第二層」列。補一個平台可呼叫的 `burn(address, uint256)` 不是解法，它與 §3.3 的簽章承諾相反。）條款 §3.5 已於 2026-08-18 改為「分配後不可收回」、UI 入口已移除；**API 仍在但已明確停用**（回 `TW000020`，擋在動任何餘額之前）。**成員移除**因此改為沖銷（歸零不回池、負的 `ADJUST` 分錄）：原本它會把餘額加回池，而那筆錢已經在成員的鏈上錢包裡，等於同一筆價值存在兩份 |
| **扣費第二層（成員個人鏈上點數）已停用** | `chargeChainCredits` 走平台側 burn，合約沒有那個函式（`ABIS.CREDIT_POINT` 卻宣告了）→ 扣款必定失敗。先前是 fail-**open**（餘額算進放行、扣款失敗、成本追補到團隊額度），已於 2026-08-18 改為 fail-closed：不計入放行、不嘗試扣款、402 也不再顯示那筆餘額。**後果：成員自購或團隊分配的鏈上點數目前無法用於「額度不足的差額」**，額度用罄即 402（其他功能不受影響，見下列） |
| 恢復第二層的方向（**2026-08-18 更正**） | 先前這列寫「先改合約加 `burn(address,uint256)` 並重新部署」。**那是錯的補救方向。**扣成員個人點數不需要動合約，產品裡已經在做，用的是持有人簽章而非平台權限：`ensurePersonalCreditCharge()` 建待付訂單 → 402 → `useOrderTransaction` 走 `prepareTransferUserOp`，由成員的智慧錢包把點數 `transfer` 給 `MEMBERSHIP_SYSTEM`（託管帳戶由伺服器代簽）→ 重送同一則（冪等鍵不變）即放行。**顧問分析、上傳、無帳本的碳盤查／費思會話都走這條**，所以「個人點數用不掉」並不成立——缺的只是這一層沒接上。改用它會連帶拿到訂單即分錄、冪等鍵、失敗鑄回退款（A-1 要的那些）。**產品已拍板（2026-08-18）：額度不足時整則走個人點數**——預估成本超過剩餘額度時，該則整筆由個人點數支付、團隊額度不動，與無帳本那條同一個模型（保守預估、一次收足、不退差額），不做切帳（`SPEND_SOURCE.MIXED` 的複雜度只換到省下一小段額度，而切了仍要估算）。**實作是獨立的一票，尚未進行**；`isChainCreditSpendable()` 仍是唯一的開關，目前回 false |
| **第二層停用期間一併失效的行為** | 集中列在 `isChainCreditSpendable()` 的註解裡（2026-08-18 補，第四輪 B-2），並由 `spend_second_layer_inert.test.ts` 釘住，清單與程式碼不一致時會紅。分三類：**A** 因旗標而不可達（`chargeChainCredits`、`SPEND_SOURCE.MIXED` 的結算回傳、402 的 `USE_PERSONAL_WALLET` 選項）；**B** 因 2026-08-14 分配上鏈而不可達、與旗標無關（`splitSpend` 的 wallet 腳、`consumeAllocation`）；**C** 看似死碼但**不可刪**——舊預扣的退款路徑（`splitRefund`、`refundAllocationPartial`、`records.walletHeld/walletRefunded`）。C 類刪掉不會有任何測試變紅，但會讓改制前尚未結算的冪等鍵永遠退不了款 |
| **20260813「物流碳足跡優先扣分配點數」的拍板已不成立** | 逐功能扣款順序（`FEATURE_SPEND_PRIORITY` / `resolveSpendPriority`）於 **2026-08-14 分配上鏈時移除**——分配變成成員的個人資產之後，「先扣分配、後扣額度」這個排序失去意義（先花成員的錢再用團隊額度，沒有情境說得通）。**這與第二層停用無關**：翻回 `isChainCreditSpendable()` 不會讓那個拍板復活，要它復活得重新設計逐功能的扣款順序。產品端需知道該決定目前沒有生效 |
| ~~遷移腳本是否曾在收據未確認的期間跑過~~ | **已於 2026-08-18 確認沒有殘留資料**（維護者查證），且收據確認已補上，日後不再重現。此列保留為紀錄 |
| 十餘處鏈上操作仍未確認 `receipt.status` | 集中在 setup、issue、mission、bundler、amortization——不在本 PR 範圍。金流路徑（鑄造、銷毀）已修，其餘以測試的例外清單管理，清單只能變短 |
| `ABIS.CREDIT_POINT` 與部署的合約不一致 | ABI 宣告了 `burn(address,uint256)`、`forcedTransfer`、`freezePartialTokens`、`setAddressFrozen` 等，合約裡一個都沒有。目前只有 burn 這條路徑實際被呼叫（且已知會失敗），其餘未使用。**這份 ABI 是整條彎路的起點**：它讓「平台可以直接扣成員錢包」看起來成立，於是第二層沒去用旁邊那條已經在跑的持有人簽章路徑。**已於 2026-08-18 加上比對測試**（`abi_contract_parity.test.ts`）：把 `src/config/contracts.ts` 每個 ABI 的函式宣告比對對應的 `contracts/*.sol`（含繼承鏈與 `public` 狀態變數 getter），已知落差登記在 `KNOWN_GAPS` 且清單只能變短。目前登記 16 條落差：CREDIT_POINT 13、SCW 1（`isValidSignature`，Fido2Account 沒實作 ERC-1271）、SCW_FACTORY 2（公司帳戶尚未上鏈）。**修 ABI 本身是另一件事**——刪掉宣告會讓 `token.service` 的 `forcedTransfer()`（無呼叫端）與 `burn()`（已被旗標擋住）失去型別依據，屬清理範圍 |

---

## 6. 回退

程式可直接回退（schema 的新增欄位對舊版程式無害，舊版不會讀它們）。**但已經上鏈的分配點數無法回退**——`migrate_allocations_onchain.ts` 跑完之後，那些點數已經在成員的錢包裡，回到舊版程式會變成「離鏈餘額為 0 且舊管線讀不到鏈上餘額」，等於成員的點數在舊版上完全不可用。

因此回退的判斷點是 **3.2 是否已執行**：

- 未執行 → 可安全回退
- 已執行 → 只能向前修，不要回退
