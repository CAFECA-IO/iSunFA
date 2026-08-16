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

### 1.1 檢查唯一約束是否與既有資料衝突 ⚠️

新增的兩個唯一約束在既有資料違反時**會套用失敗**，讓整個 schema 套用中止：

```sql
-- Info: 同一團隊、同一位址、同一狀態的重複邀請（新約束會擋）
SELECT team_id, invitee_address, status, COUNT(*)
FROM team_invitation
GROUP BY team_id, invitee_address, status
HAVING COUNT(*) > 1;
```

有結果就必須先處理（保留最新一列、其餘刪除或改狀態）。**這正是本 PR 修掉的並發 bug 留下的痕跡**，所以production 有殘留是合理的預期，不是異常。

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
| `team_invitation` | 新增唯一約束 `(team_id, invitee_address, status)` | **見 1.1** |
| `team_invitation` | 新增 `invitee_email`、`token_hash`（唯一）、`expires_at`，以及唯一約束 `(team_id, invitee_email, status)` | 低；既有資料三欄皆為 NULL，Postgres 允許多個 NULL |
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

### 3.3 設定寄信與網站網址 — **email 邀請上線前必做**

後台系統設定（ADR 017，可線上調整、不需重啟）：

| 設定鍵 | 說明 |
|---|---|
| `SMTP_HOST` / `SMTP_PORT` | 寄信主機；`SMTP_PORT` 未填時預設 587（STARTTLS），填 465 時自動改用隱式 TLS |
| `SMTP_USER` / `SMTP_PASSWORD` | 認證；`SMTP_PASSWORD` 為 secret，寫入後不再回讀 |
| `SMTP_FROM` | 寄件者，可填 `iSunFA <no-reply@example.com>` |
| `APP_BASE_URL` | 邀請信中連結的網域，例如 `https://isunfa.com` |

**未設定的後果是明確的，不是安靜的**：email 邀請會回 `TW000018` 並且**不建立邀請、不扣款**。這是刻意的——反過來（建立邀請、收了席次費，信卻沒寄出）會讓團隊付錢買到一個受邀者永遠不知情的席次。

⚠️ `APP_BASE_URL` 填錯不會有任何錯誤訊息，信會照寄，只是連結點不開。上線後請**實際寄一封給自己**，點開確認落在 `/invite/<token>` 而不是 404。

### 3.4 設定免費版人數上限（選做）

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

---

## 5. 已知落差（上線後仍存在，非本次可解）

| 項目 | 狀態 |
|---|---|
| 邀請寄送未設 rate limit | 護欄為 OWNER/ADMIN 權限 + 每次邀請的 FIDO2 簽章 + 單期補收上限（TW000016）；濫用的金額上限已封住，寄信量未封 |
| 硬退信（bounce）不自動撤回邀請 | 信箱打錯時，該席次會被一封永遠不會被接受的邀請佔到逾期（7 天）或管理員手動撤回為止 |
| 費思個人化記憶（條款已載明 90 天保留） | 未實作，v0.13.0 gate |
| 方案頁承諾值與實際額度的倍數不一致 | free 1.14×、付費 2.14×；刻意保守但倍數不齊，屬定價文案決定 |
| 結算時的 `burn` 無用戶當下簽章 | 刻意設計（條款 §3.3 / §3.5 已載明），屬信任模型變更 |

---

## 6. 回退

程式可直接回退（schema 的新增欄位對舊版程式無害，舊版不會讀它們）。**但已經上鏈的分配點數無法回退**——`migrate_allocations_onchain.ts` 跑完之後，那些點數已經在成員的錢包裡，回到舊版程式會變成「離鏈餘額為 0 且舊管線讀不到鏈上餘額」，等於成員的點數在舊版上完全不可用。

因此回退的判斷點是 **3.2 是否已執行**：

- 未執行 → 可安全回退
- 已執行 → 只能向前修，不要回退
