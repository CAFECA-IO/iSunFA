# 團隊席次計費與 Email 邀請 (Team Seat Billing & Email Invitation) 規範

> **Date**: August 2026
> **Author**: Luphia
> **Version**: 1.2
> **Status**: Implemented — 產品拍板 2026-08-12；P1–P3 於 2026-08-14 實作，**P4（email 邀請）於 2026-08-15 實作**；P5（席次帳單明細）待排程
> **Target**: `src/services/order.service.ts`、`src/services/team_subscription.service.ts`、`src/repositories/team.repo.ts`、`src/app/api/v1/user/team/[team_id]/invitations/`、`src/services/mail.service.ts`（新）
> **關聯文件**：[團隊錢包與訂閱額度設計書](team_wallet_and_subscription_quota.md)、[費思個人化記憶規範](ai_and_analytics/faith_personal_memory.md)、[ADR 017 簽章式資料庫系統設定](decisions/017_signed_system_settings_in_database.md)
> **對外文件連動**：服務條款 §3.1 / §3.6、《隱私權政策》§1、訂閱方案頁

---

## 1. 產品拍板內容（2026-08-12）

| # | 決策 | 影響面 |
|---|---|---|
| 1 | **訂閱時必須選定團隊**：訂閱主體是團隊，不是個人 | 購買流程、Order、TeamSubscription |
| 2 | **依團隊人數（席次）收費**：現行方案價即**每席月費**（團隊版 NT$840/席/月、企業版 NT$2,940/席/月；年繳同比例） | 定價頁、金額計算、條款 §3.1 |
| 3 | **付費團隊邀請成員需支付額外月費**，於**當期依剩餘天數比例補收** | 邀請流程、金流、條款 §3.6 |
| 4 | **Email 邀請**：輸入 email 寄出邀請，受邀者點信中連結**註冊完成即自動加入團隊**（不需另一次 FIDO2 簽章） | 邀請 schema、註冊流程、寄信基礎設施、隱私政策 §1 |
| 5 | 寄信採 **SMTP + 系統設定**（DB 保管，同 ADR 017），不綁第三方寄信 API | 新增 `mail.service.ts` 與 SMTP 設定鍵 |

---

## 2. 現況與三個必須先解決的衝突

| # | 現況 | 衝突 / 缺口 |
|---|---|---|
| 1 | 方案頁與條款把計費單位寫成「**依 FIDO2 金鑰數量**收取訂閱費」（`pricing.plans.team.features.fido_tooltip`、條款 §3.1「包含無限 FIDO2 金鑰（依數量收取訂閱費）」） | 與「依人數收費」是**兩套模型**。金鑰是憑證、席次是人；一位成員可註冊多把金鑰。必須明確改為席次，並同步修訂方案頁與條款，否則同一份價目對外有兩種說法 |
| 2 | 邀請以 **wallet address** 為鍵（`TeamInvitation.inviteeAddress`），且接受邀請需受邀者 FIDO2 簽章 + 鏈上操作 | Email 邀請是新的識別方式與新的信任來源；schema、API、前端流程都要擴充。既有 address 邀請路徑保留（不破壞現有客戶） |
| 3 | **repo 完全沒有寄信能力**：無 nodemailer、無 SMTP 設定、`docker-compose.yml` 亦無 mail 服務 | 邀請信是本功能的前提，寄信是新的基礎設施依賴，且失敗必須可觀測（見 §5.4） |
| 4 | `TeamSubscription` 沒有席次概念（無 `seats` 欄位），`SUBSCRIPTION_PLAN_PRICE` 為整包月費 | 需要席次快照與單價快照（見 §3） |

---

## 3. 席次模型

### 3.1 席次的定義

**席次 = 該團隊「已佔用的成員位置」數**，計算式：

```
seats = 有效 TeamMember 數（含 OWNER） + PENDING 且未過期的邀請數
```

**PENDING 邀請計入席次**是刻意的：拍板內容第 3 項是「邀請時支付」，若邀請不佔席，就會出現「先邀 20 人、月底才付費」的缺口；更麻煩的是「入團當下才收費」會讓入團流程依賴一次可能失敗的扣款——那時人已經在門口，付款失敗要把他擋在外面或請出去，兩種收尾都很難看。**先付費、再開門**，遠比事後追款乾淨。

邀請被拒絕、撤回或過期 → 席次釋出（費用處理見開放問題 #1）。

### 3.2 金額計算（決定論、整數運算）

單價來源為方案價（未來可搬入 DB 設定，見開放問題 #4），**訂閱建立時把單價快照寫入 `TeamSubscription`**，避免日後調價回溯影響既有訂閱。

**期初 / 續訂**：
```
金額 = 每席單價 × seats
```

**期中新增席次（邀請）——按剩餘天數比例補收**：
```
remainingDays = ceil((currentPeriodEnd - now) / 1 day)   // 至少 1 天
periodDays    = round((currentPeriodEnd - currentPeriodStart) / 1 day)
補收金額      = floor(每席單價 × remainingDays / periodDays)
```

- **不用 365 天當分母**，用當期實際天數：月份長度不一、年繳跨閏年，寫死分母會讓 2 月加人比 1 月貴。
- **`floor` 不是 `round`**：比例計費的尾差一律**向對用戶有利的方向**捨去。這是刻意的取捨——多收一元要退，成本遠高於少收一元。
- 金額一律整數（TWD 無輔幣單位），運算用 `BigInt`；**嚴禁**用原生浮點算比例（CLAUDE.md §2）。若日後有小數幣別，改 `Prisma.Decimal`，不改回 `number`。
- `floor` 可能算出 0（期末最後一天加人）：此時**免收**，不設最低 1 元。為一天收整月的爭議價值遠高於那一元。

### 3.3 Schema 增量（草案）

```prisma
model TeamSubscription {
  // ...既有欄位

  // Info: (20260812 - Luphia) 當期席次快照（含 PENDING 邀請），續訂時以此計價
  seats Int @default(1)

  /**
   * Info: (20260812 - Luphia) 每席單價快照（**元**為單位的整數，TWD）。
   * 快照而非即時讀方案表：調價不得回溯既有訂閱，且帳單金額要能重算驗證。
   *
   * Info: (20260815 - Luphia) 實作為 `unitPrice Int @map("unit_price")`（PR #6652 第二輪 D）。
   * 草案原寫 `seatUnitPrice BigInt @map("seat_unit_price")`（分），與實作不符已更正：
   * 目前所有方案價格都是整數元，Int 不掉精度；若日後出現非整數元的定價，
   * 這裡與 `Order.amount`（BigInt）之間的型別落差要一併重新檢視。
   */
  unitPrice       Int    @map("unit_price")
  // Info: (20260815 - Luphia) 實作**未**建此欄：計費週期取自最後一張訂單的 data.billingInterval
  billingInterval String @map("billing_interval") // BILLING_INTERVAL 常數
}
```

席次變動需留軌跡（誰在何時因何事佔用 / 釋出一席、對應哪筆訂單），否則帳單對不起來：

```prisma
model TeamSeatChange {
  id           String   @id @default(uuid())
  teamId       String   @map("team_id")
  // Info: (20260812 - Luphia) ADD_INVITE | ADD_MEMBER | RELEASE_DECLINED | RELEASE_EXPIRED | RELEASE_REMOVED
  changeType   String   @map("change_type")
  seatsAfter   Int      @map("seats_after")
  invitationId String?  @map("invitation_id")
  memberUserId String?  @map("member_user_id")
  orderId      String?  @map("order_id")   // 比例補收的訂單（釋出時為 null）
  proratedAmount BigInt @default(0) @map("prorated_amount")
  operatorUserId String @map("operator_user_id")
  createdAt    DateTime @default(now()) @map("created_at")

  @@index([teamId, createdAt])
  @@map("team_seat_change")
}
```

`changeType` 為 `enum`（`src/constants/team_seat.ts`），不寫字面字串（CLAUDE.md §3）。

### 3.4 付款失敗即不邀請（fail closed）

邀請流程的順序**不可調換**：

```
1. 權限檢查（OWNER / ADMIN）+ 邀請者 FIDO2 簽章
   ↑ 簽章在此有雙重意義：授權邀請，也授權這筆比例補收的扣款
2. 計算比例補收金額（§3.2）
3. 扣款（重用 OEN 綁卡金流；金額 0 則跳過）
4. 扣款成功 → 建立 TeamInvitation（PENDING）+ 寫 TeamSeatChange + 寄邀請信
5. 扣款失敗 → 不建立邀請、不寄信，回傳明確錯誤（付款失敗，非權限問題）
```

免費版團隊：不計席次費，跳過步驟 2–3，但受**免費版人數上限**約束（開放問題 #2）——否則免費版可無限拉人共用同一份免費額度，額度設計（設計書 §4.1）會被繞過。

---

## 4. 訂閱時選定團隊

現行 `onSelectSubscription(planKey, title, billingInterval)` 沒有團隊參數，訂單也沒有 `teamId`。變更：

1. **前端**：方案頁「選擇方案」後先出現團隊選擇步驟（`GET /api/v1/user/team` 取可選團隊；僅 OWNER / ADMIN 可為團隊訂閱），未有團隊者引導先建立團隊。
2. **金額預覽**：選定團隊後即可算出 `seats × 單價`，付款前必須顯示「席次數 × 單價 = 總額」，不可只顯示方案單價——這是定型化契約的費用計算方式揭露。
3. **API**：訂閱訂單建立時帶 `teamId`，server 端重新計算金額（**不信任前端送來的總額**），並驗證操作者為該團隊 OWNER / ADMIN。
4. **一團隊一訂閱**：`TeamSubscription.teamId` 已是 `@unique`，重複訂閱應為「變更方案」而非新建。

---

## 5. Email 邀請流程

> **實作對照（2026-08-15）**：本節為規範原文，實作有四處刻意的偏離，均記於此免得日後把偏離當成 bug 修回去。
>
> | 規範 | 實作 | 理由 |
> |---|---|---|
> | token 用 base64url | 64 字元 hex | 同為 32 bytes 熵；hex 在信件與網址中不會被自動換行或跳脫，也不會出現 `-`/`_` 造成的誤讀 |
> | `SMTP_FROM_ADDRESS` / `SMTP_FROM_NAME` / `SMTP_SECURE` | `SMTP_FROM`（單一欄，可寫 `名稱 <a@b.c>`）、TLS 模式由連接埠推定（465 → 隱式 TLS） | 三個設定鍵有兩種組合會互相矛盾；由埠推定不會出現「填了 secure 卻連不上」的錯配 |
> | 寄信失敗保留邀請 + `resend` 端點 | 寄信失敗**刪除邀請**，不另設重寄端點 | 席次現在可重用（見 §7 落差表），刪掉邀請即讓位置空出來，重新邀請同一信箱走同一個冪等鍵、不會二次扣款——`resend` 要處理的情況因此不存在 |
> | 已登入者 email 與受邀 email 不同時提示確認 | 已登入者一律**手動按下「接受邀請」**才加入，且 API 不回傳受邀 email | 目的（不靜默把不相干的帳號加進團隊）以更少的資訊揭露達成；比對 email 需要把第三人的信箱回給任何持有連結的人 |
>
> **未實作**：邀請寄送的 rate limiter bucket（§5.3）。現行的護欄是 OWNER/ADMIN 權限 + 每次邀請的 FIDO2 簽章 + 單期補收上限（`TW000016`），濫用的成本上限已被封住；若日後出現以寄信量為目標的濫用再補。退信（bounce）處理見 §8 開放問題 #6，仍未拍板。
>
> **另補**：`DELETE /api/v1/user/team/{team_id}/invitations/{invite_id}` 供 OWNER / ADMIN 撤回尚未接受的邀請。沒有這支，打錯一個字寄出的邀請會佔住一個已付費的席次直到七天後逾期。
>
> **撤回留痕**（2026-08-18，第三輪 D）：狀態改 `REVOKED` 並記下 `revokedByUserId` / `revokedAt`，不再實刪除。原本實刪之後「曾經邀請過誰、由誰撤回」全部消失，而同一條路徑上的「拒絕」是改狀態——同一件事的兩個方向，稽核強度不該不一樣。`tokenHash` 與 `pendingKey` 一併清空（連結立即失效、唯一鍵讓出來以便重新邀請）。唯一仍該實刪的是**信寄不出去時的回滾**：一封沒寄出去的邀請不是歷史紀錄。
>
> **拒絕**（2026-08-16 補齊）：`POST /api/v1/invite/decline`（**免登入**，token 置於請求本文）與 `POST /api/v1/user/team/invitations/{invite_id}/decline`（位址邀請，需登入且限受邀者本人）。狀態改 `REJECTED`、清空 `tokenHash` 與 `pendingKey`，席次當場釋出。
>
> 兩處刻意的不對稱：**拒絕免登入而接受要登入**——加入團隊必須知道加的是誰，拒絕不需要，而受邀者多半還沒有帳號；要求他先註冊才能說「不用了」等於保證沒有人會用，那一席就佔到逾期為止。**拒絕不要求 FIDO2 而接受要**——接受會讓你成為握有他人帳務資料的成員，拒絕只是把位置還回去。代價是連結持有者可以替受邀者拒絕，但損失有上限且可回復（席次空出來、重邀不再收費）；反方向才是不可回復的。

### 5.1 Schema 增量

```prisma
model TeamInvitation {
  // ...既有欄位（inviteeAddress 改為 optional，保留既有 wallet 邀請路徑）

  // Info: (20260812 - Luphia) 受邀者 email（新路徑的識別鍵；屬個資，隱私政策 §1 已納入收集範圍）
  inviteeEmail String? @map("invitee_email")

  /**
   * Info: (20260812 - Luphia) 邀請 token 的 SHA-256 雜湊。明文只存在於寄出的那封信裡。
   * 只存雜湊的理由對稱：DB 外洩無法冒用連結，信箱外洩也無法反推 DB 內容。
   */
  tokenHash String? @unique @map("token_hash")

  // Info: (20260812 - Luphia) 邀請有效期（建議 7 天）。過期即釋出席次，避免長期佔位
  expiresAt DateTime? @map("expires_at")
}
```

`status` 實作為 `PENDING` / `ACCEPTED` / `REJECTED` / `REVOKED`（`TEAM_INVITATION_STATUS` 常數）。逾期不另設狀態——以 `expiresAt` 判定，避免「該轉狀態的背景任務沒跑」變成第二種真相。

> **修正（2026-08-18）：查無訂閱列＝免費版，不是「跳過檢查」。**
>
> `chargeSeatAddition` 原本第一行是 `if (!subscription) return { charged: false, … }`，而**新建的團隊沒有 `TeamSubscription` 列**（建團隊只寫 `Team` + `TeamMember`，訂閱列是訂閱時才建的）。也就是說每一個免費團隊都走這條早退，底下的免費版人數上限一次都沒有執行過。
>
> 症狀不只是「上限失效」：邀請照樣寄出、席次照樣佔住，而受邀者點連結時會撞上接受端的第二道防線（`assertFreePlanCapacityOnAccept`，那支對 null 訂閱是正確判成免費版的）——**信寄得出去，人永遠加不進來**。
>
> 現在把 null 交給 `resolveEffectivePlanId`（它已經回 `FREE`），讓「什麼是免費版」只有一個判斷點；付費路徑之前留一道 fail-fast 讓型別窄化有依據，而不是用 `!` 假裝訂閱列一定存在。

### 5.2 Token 與連結

- token = 32 bytes 密碼學隨機 → base64url（`crypto.randomBytes`，不用 `Math.random`）。
- 連結：`https://<host>/invite#<token>`（2026-08-18 修訂，見下）。
- **一次性**：接受後即標記 `ACCEPTED` 並讓 `tokenHash` 失效；重放同一連結回明確錯誤。
- 過期或狀態非 PENDING → 一律拒絕，不透露團隊名稱等資訊（避免 token 猜測探測團隊存在）。

> **修訂（2026-08-18，第三輪 D）：token 放在 URL fragment，不放在 path。**
>
> 原本是 `/invite/<token>`，也就是把一把有效七天的鑰匙放進 URL。URL 會進三個我們控制不到的地方：**access log**（伺服器與反向代理，通常保留數週、常被集中收容，而讀 log 的人遠多於能讀 DB 的人）、**瀏覽器歷史**、以及落地頁若有任何外連或第三方資源時的 **`Referer`** 標頭。
>
> `#` 之後的內容不會送給伺服器，因此前者與後者都消失；瀏覽器歷史仍會留，那是「信裡一條連結」的必然代價，且僅限收件者自己的機器。落地頁讀 `location.hash` 取出 token 後**立即以 `history.replaceState` 抹掉**，並把 token 放進 POST body 送回後端。
>
> API 因此改為三支固定路徑、token 由 body 帶入（`inviteTokenBodySchema` 驗長度與字元集）：
>
> | 端點 | 登入 | 限流維度 |
> |---|---|---|
> | `POST /api/v1/invite/resolve` | 免 | 來源 IP |
> | `POST /api/v1/invite/accept` | 需 | address |
> | `POST /api/v1/invite/decline` | 免 | 來源 IP |
>
> `resolve` 語意上該是 GET，這裡刻意用 POST：在「語意正確」與「秘密不落地」之間選後者。
>
> **真機驗證（2026-08-18，維護者）**：實際寄信確認過**郵件閘道不會改寫或丟掉 fragment**，連結點開後 `location.hash` 讀得到 token。這是這條修復唯一無法靠讀碼或測試確定的環節——部分企業閘道會重寫連結（安全掃描的常見作法），而重寫掉 `#` 之後的內容會讓每一封邀請都變成「連結無效」。已確認不受影響。
>
> **限流**（`RateLimitBucketEnum.INVITE_TOKEN`，20/分、200/日，可由 `INVITE_RL_PER_MINUTE` / `INVITE_RL_PER_DAY` 覆寫）。要防的不是猜 token（256-bit、DB 只存雜湊、失效與逾期回同一個 404，無 oracle），而是**免登入的 `decline`**：一次成功呼叫就讓一封邀請作廢、席次當場釋出。`decline` 另記呼叫者 IP 與 UA——那是這條路徑上唯一的線索，兩者都是用戶端可控的值，因此只記錄、不用於任何判斷。

### 5.3 註冊即入團

```
點擊連結 → /invite#<token>
  ├─ token 無效 / 過期 / 已使用 → 錯誤頁（不揭露團隊資訊）
  ├─ 未登入且未註冊 → 註冊流程（建立 passkey；**註冊不問 email**，見下方更正）
  │     └─ 註冊成功 → 以 token 建立 TeamMember（角色取邀請時指定）→ 進入團隊
  ├─ 未登入但已註冊 → 登入後同上
  └─ 已登入 → **手動按下「接受邀請」**才加入（不靜默加入；無法比對 email，見下方更正）
```

**驗證力來源**：token 持有。依拍板不再要求受邀者 FIDO2 簽章——受邀者是「被加入」，其風險由邀請方的簽章與付款承擔；受邀者本身不因加入而支出。**邀請方的簽章仍為必要**（§3.4 步驟 1）。

> **⚠️ 更正（2026-08-17）：email 是投遞地址，不是身分斷言。**
>
> 本節原本把驗證力寫成「token 持有 **+ email 收信權**」，而上面的流程圖寫著「註冊時 email 預填為受邀 email、不可改」與「登入者 email 與受邀 email 不同時提示確認」。**這三處都與實作不符，而且不是實作偷懶——是做不到**：
>
> `User` 沒有 email 欄位。email 只存在於第三方登入的綁定 `UserIdentity`（帶 `emailVerified`）。本站主要的註冊方式是 passkey，而 passkey 註冊流程從頭到尾沒有問過 email——沒有欄位可以預填，也沒有值可以比對。
>
> 因此實際成立的只有 **token 持有**。信寄到哪個信箱，與最後是誰拿著連結完成註冊，中間沒有任何系統性的連結；轉寄一封信就足以讓另一個人加入。這是這條路徑的信任模型，不是缺陷清單上的一項——要更強的保證，唯一的辦法是回到位址邀請（身分綁在錢包上）。
>
> 已做的是**如實記錄**（2026-08-17）：`TeamInvitation.acceptedByUserId` / `acceptedAt` 記下是哪個帳號用掉了這封邀請，`acceptedEmailMatch` 記下比對結果（`MATCHED` / `MISMATCHED` / `UNAVAILABLE`，位址邀請為 null）。**記錄不阻擋**——工作信箱收到邀請、用個人 Google 帳號登入是完全正常的行為。`UNAVAILABLE` 是常態而非異常，因為 passkey 帳號本來就沒有信箱。
>
> **判斷「是不是現在這段成員資格」用外鍵，不用時間戳**（2026-08-18 修正，第六輪）：`TeamMember.joinedByInvitationId` 記下這段成員資格的來源邀請，標記查詢因此是一次 join。先前以「邀請的 `acceptedAt` 不早於成員的 `createdAt`」推論，而那兩個值來自**兩個時鐘**——`acceptedAt` 是 app 在 route 一開始取的 `Date.now()`，`createdAt` 的預設是資料庫的 `CURRENT_TIMESTAMP`，中間隔著五次以上查詢（實測 +19ms）。結果是條件永遠不成立、**標記永遠不顯示**；而在 app 與 DB 時鐘有偏移的部署上又會零星出現，比永遠不出現更難查。
>
> **而記錄要有讀者**（2026-08-18）：`acceptedEmailMatch` 原本是純寫入欄位——沒有任何查詢、API 或畫面讀它，稽核價值等於零。現在有兩個讀者：接受時 `MISMATCHED` 會寫一筆 `logger.warn`（可接上監控），以及成員清單對**管理職**（OWNER / ADMIN）附上 `emailMismatch` 旗標並在成員卡片上標示。非管理職拿到的清單完全沒有這個欄位——不是 `false`，而是沒有這一欄：一個恆為 false 的欄位會讓前端把「沒有標記」讀成「已驗證相符」。

安全與濫用防護：

- 邀請寄送套用既有 rate limiter（新增 bucket），限制單一團隊 / 單一操作者的每小時邀請數；每封信都是一次對外寄信與一筆扣款。
- 同 email 重複邀請同團隊 → 去重，不重複佔席、不重複收費。
- 邀請信**不得夾帶**團隊業務資料，僅團隊名稱、邀請者顯示名與連結。
- email 大小寫與空白正規化後比對，避免 `A@x.com` / `a@x.com ` 佔兩席。

### 5.4 寄信基礎設施

新增 `src/services/mail.service.ts`（nodemailer），設定值走 DB 系統設定（ADR 017），密碼列 `isSecret: true`：

| 設定鍵 | 用途 | isSecret |
|---|---|---|
| `SMTP_HOST` / `SMTP_PORT` | 寄信主機 | ➖ |
| `SMTP_USER` / `SMTP_PASSWORD` | 認證 | 僅 PASSWORD ✅ |
| `SMTP_FROM_ADDRESS` / `SMTP_FROM_NAME` | 寄件者 | ➖ |
| `SMTP_SECURE` | TLS 模式 | ➖ |

- **寄信失敗不可靜默**：邀請已建立、席次已收費，信卻沒寄到，用戶端看起來是「邀請沒動作」。失敗須寫錯誤紀錄、於團隊管理頁顯示「重寄」動作，並保留 `resend` 端點（重寄不重複收費、不重新佔席）。
- 未設定 SMTP 時，邀請 API 應**明確失敗**（`IS_MAIL_NOT_CONFIGURED`），不可建立邀請後靜默不寄。
- 信件內容需多語系（依邀請者當下語系；受邀者語言未知）。

---

## 6. 對外文件連動（必須同步，否則價目對外有兩種說法）

| 文件 / 落點 | 現況 | 應改為 |
|---|---|---|
| 服務條款 §3.1 | 「包含無限 FIDO2 金鑰（依數量收取訂閱費）」 | 依**席次**（團隊成員數）收費；訂閱須選定團隊 |
| 服務條款 §3.6 | 僅述月繳 / 年繳與自動續訂 | 增訂席次變動之計費：期中加入按剩餘天數比例補收；移除成員不退費、下期起以新席次計 |
| 《隱私權政策》§1 | 收集範圍未含受邀者 email | 增列「您為邀請成員而提供之第三人電子郵件地址」，並說明僅用於寄送該次邀請 |
| 方案頁價格單位 | `NT$840 / 月繳` | `NT$840 / 席 / 月`，並於付款前顯示 `席次 × 單價 = 總額` |
| 方案頁 `fido_tooltip` | 「根據 fido2 金鑰數量收取訂閱費」 | 改為席次說明（五語系） |

> **產品指示（2026-08-12）：方案頁與條款一併先行改為席次計費**，與費思記憶採同一套「條款與文案先行、實作反推」的節奏。
>
> 上表各處的實際落點（2026-08-14 覆核修正）：條款 §3.1 / §3.6、隱私政策 §1、方案頁的席次說明段落（`price_multiply_note`）均已更新；`fido_tooltip` 是**整列刪除**而非改寫（金鑰數量與計費無關，留著只會誤導）；價格單位於 2026-08-14 才實際改為 `/ 席 / 月`（`per_seat_monthly`，付費方案適用，免費版維持月繳）——在此之前卡片仍顯示「月繳」，僅靠下方的席次說明補充。
>
> ✅ **落差已於 2026-08-14 消除**：P2（席次乘算、金額由 server 計算、付款前揭露 `席次 × 單價`）與 P3（比例補收純函式 + 邀請 fail-closed）皆已實作，方案頁標示與實收金額一致。

### 2.1 實作現況（2026-08-14）

| 規則 | 實作 |
|---|---|
| 訂閱金額 = 單價 × 席次 | `changeTeamSubscription` 於 server 端以 `teamRepo.countMembers` 取人數，`resolveSubscriptionAmount` 計算；前端只負責顯示 |
| 席次與單價快照 | `TeamSubscription.seats` / `unit_price`，由訂單頂層欄位帶入履行路徑（webhook 與 checkout 皆同） |
| 續訂重算 | `subscription_renewal.cron` 依**續訂當下**人數重算，離職席次自動停收 |
| 期中加人補收 | `chargeSeatAddition`：`單價 × 剩餘時間 / 整期 × 席次`，無條件捨去（零頭算給用戶） |
| 收費時點 | **發出邀請**時（`POST /invitations`）；直接加成員（`POST /members`）同樣補收，避免留下免費加席的後門 |
| fail-closed | 先扣款、成功才建立邀請；沒有可扣款的卡回 `TW000011`，扣款失敗回 `TW000012`，兩者都不建立邀請 |
| 零元補收 | 期末零頭算出 0 元時**只加席次、不建單**——為了幾塊錢打一次金流，失敗率與雜訊都比收到的錢多 |

**尚未實作（已知落差）**：

- ~~**邀請被拒或過期不釋出席次**~~ ——已於 2026-08-15 隨 P4 補齊（產品拍板 20260815）：席次的佔用者改為「成員 + 尚未失效的 PENDING 邀請」（`teamRepo.countPendingInvitations`），`chargeSeatAddition` 只在 `占用數 + 新增數 > 已付席次` 時補收差額，並以 `reusedPaidSeat` 回報。**錢仍然不退**（`subscription.seats` 不減），但空出來的位置可以用於邀請其他人員——「不退費」與「不能再用」是兩件事，後者沒有理由成立。
- **移除成員不即時減少席次**：同上，續訂時重算。與「剩餘點數不退還」（§6.3）一致，期中不退費。
- **`TeamSeatChange` 稽核表未建**：目前以 `BILLING_SEAT_ADDITION` 訂單作為席次異動的軌跡；P5 的帳單明細需要更細的紀錄時再補。
- **資料庫欄位需套用**：本專案無 migrations 目錄（schema 由部署流程套用），`team_subscription` 新增 `seats`、`unit_price` 兩欄需隨部署更新。

---

## 7. 分階段實作計畫

| 階段 | 內容 | 完成判準 |
|---|---|---|
| **P0**（本次） | 本規範 + 條款 §3.1 / §3.6 + 隱私政策 §1 + **方案頁文案（每席單價、席次說明、`fido_tooltip`，五語系）** + `FAITH_MEMORY_RETENTION_DAYS` 進 DB 設定 | 規範、條款與方案頁三者對席次的描述一致；保留天數可後台調整且畫面同步 |
| ~~**P1**~~（2026-08-14，部分） | Schema `seats` + 單價快照已完成；`TeamSeatChange` 與邀請 email/token 欄位隨 P4 再補 | 席次可查、可重算；既有 wallet 邀請不受影響 |
| ~~**P2**~~（2026-08-14） | 訂閱選團隊 + 席次計價 + 金額由 server 計算 | 前端送錯總額不影響實收；付款前揭露 `席次 × 單價` |
| ~~**P3**~~（2026-08-14） | 比例補收（純函式 + 單測）+ 邀請 fail-closed 順序 | 期末最後一天 / 期間異常 / 零席次的金額皆有測試；扣款失敗不建立邀請 |
| ~~**P4**~~（2026-08-15） | SMTP 設定 + `mail.service` + 邀請信 + `/invite#<token>` 註冊即入團 | 未設定 SMTP 時邀請明確失敗（TW000018）；token 一次性、過期釋出席次；重新邀請不重複收費（席次沿用） |
| **P5** | 團隊管理頁席次與帳單明細（誰佔席、何時佔、對應哪筆比例補收） | 管理者可自行核對席次費用，不需客服協助 |

> 與 v0.13.0 的關係：**費思記憶（另一份規範）已定為 v0.13.0 gate**；席次計費與 email 邀請的目標版本尚未拍板，建議至少 P1–P4 同版釋出——只上席次計價而沒有邀請流程，或反之，都會讓「邀請即收費」這條規則落不了地。

---

## 8. 開放問題（實作前需拍板）

1. **釋出席次是否退費**：成員被移除、邀請被拒或過期時，當期已收的比例費用是否退還或折抵下期？本規範暫定**不退費、下期起以新席次計**（與團隊錢包「剩餘點數不退還」的既有立場一致），但需產品與法務確認，並寫入條款 §3.6。
2. **免費版人數上限**：免費版不收席次費，但需上限以免繞過額度設計。建議 `FREE_PLAN_MAX_SEATS` 存 DB 系統設定（預設 3）。
3. **年繳期中加人的分母**：本規範用「當期實際天數」（年繳即 365/366）。若產品希望年繳加人只補收「整月數」，公式需改，且要說明得清楚，否則客訴難答。
4. **每席單價是否進 DB 設定**：目前為 `SUBSCRIPTION_PLAN_PRICE` 常數。若要後台調價，須同 ADR 017 搬入設定並保留訂閱建立時的單價快照（§3.2 已預留）。
5. **既有客戶遷移**：現有以「整包月費」計費的訂閱，續訂時改按席次會直接漲價（5 人團隊 840 → 4,200）。需要遷移方案與事前通知期，這是商務決策，不是技術決策。
6. **SMTP 退信（bounce）處理**：硬退信（信箱不存在）是否自動撤回邀請並釋出席次？
