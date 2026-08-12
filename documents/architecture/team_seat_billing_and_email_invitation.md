# 團隊席次計費與 Email 邀請 (Team Seat Billing & Email Invitation) 規範

> **Date**: August 2026
> **Author**: Luphia
> **Version**: 1.0 (Draft)
> **Status**: Proposed — 產品拍板 2026-08-12，實作待排程
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

  // Info: 當期席次快照（含 PENDING 邀請），續訂時以此計價
  seats Int @default(1)

  /**
   * Info: 每席單價快照（分為單位的整數，TWD 即元）。
   * 快照而非即時讀方案表：調價不得回溯既有訂閱，且帳單金額要能重算驗證。
   */
  seatUnitPrice   BigInt @map("seat_unit_price")
  billingInterval String @map("billing_interval") // BILLING_INTERVAL 常數
}
```

席次變動需留軌跡（誰在何時因何事佔用 / 釋出一席、對應哪筆訂單），否則帳單對不起來：

```prisma
model TeamSeatChange {
  id           String   @id @default(uuid())
  teamId       String   @map("team_id")
  // Info: ADD_INVITE | ADD_MEMBER | RELEASE_DECLINED | RELEASE_EXPIRED | RELEASE_REMOVED
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

### 5.1 Schema 增量

```prisma
model TeamInvitation {
  // ...既有欄位（inviteeAddress 改為 optional，保留既有 wallet 邀請路徑）

  // Info: 受邀者 email（新路徑的識別鍵；屬個資，隱私政策 §1 已納入收集範圍）
  inviteeEmail String? @map("invitee_email")

  /**
   * Info: 邀請 token 的 SHA-256 雜湊。明文只存在於寄出的那封信裡。
   * 只存雜湊的理由對稱：DB 外洩無法冒用連結，信箱外洩也無法反推 DB 內容。
   */
  tokenHash String? @unique @map("token_hash")

  // Info: 邀請有效期（建議 7 天）。過期即釋出席次，避免長期佔位
  expiresAt DateTime? @map("expires_at")
}
```

`status` 增加 `EXPIRED` / `REVOKED`（`TEAM_INVITATION_STATUS` 常數）。

### 5.2 Token 與連結

- token = 32 bytes 密碼學隨機 → base64url（`crypto.randomBytes`，不用 `Math.random`）。
- 連結：`https://<host>/invite/<token>`。
- **一次性**：接受後即標記 `ACCEPTED` 並讓 `tokenHash` 失效；重放同一連結回明確錯誤。
- 過期或狀態非 PENDING → 一律拒絕，不透露團隊名稱等資訊（避免 token 猜測探測團隊存在）。

### 5.3 註冊即入團

```
點擊連結 → /invite/<token>
  ├─ token 無效 / 過期 / 已使用 → 錯誤頁（不揭露團隊資訊）
  ├─ 未登入且未註冊 → 註冊流程（建立 passkey；email 預填為受邀 email，不可改）
  │     └─ 註冊成功 → 以 token 建立 TeamMember（角色取邀請時指定）→ 進入團隊
  ├─ 未登入但已註冊 → 登入後同上
  └─ 已登入 → 直接加入（若登入者 email 與受邀 email 不同：明確提示並要求確認，不靜默加入他人帳號）
```

**驗證力來源**：token 持有 + email 收信權。依拍板不再要求受邀者 FIDO2 簽章——受邀者是「被加入」，其風險由邀請方的簽章與付款承擔；受邀者本身不因加入而支出。**邀請方的簽章仍為必要**（§3.4 步驟 1）。

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

> **產品指示（2026-08-12）：方案頁與條款一併先行改為席次計費**，與費思記憶採同一套「條款與文案先行、實作反推」的節奏。上表六處均已於同日更新（價格單位、`fido_tooltip`、席次說明段落、條款 §3.1 / §3.6、隱私政策 §1）。
>
> ⚠️ 因此在 P2–P3 完成前，**頁面標示的是本規範的模型，而非結帳實際行為**（現行結帳仍為整包月費、無席次乘算、無比例補收）。落差期間的處置：本分支未併入 production 前不對外可見；若需提前上線頁面，須先完成 P2（席次乘算與 server 端金額計算），否則價目牌與實收金額不一致。

---

## 7. 分階段實作計畫

| 階段 | 內容 | 完成判準 |
|---|---|---|
| **P0**（本次） | 本規範 + 條款 §3.1 / §3.6 + 隱私政策 §1 + **方案頁文案（每席單價、席次說明、`fido_tooltip`，五語系）** + `FAITH_MEMORY_RETENTION_DAYS` 進 DB 設定 | 規範、條款與方案頁三者對席次的描述一致；保留天數可後台調整且畫面同步 |
| **P1** | Schema（`seats`、單價快照、`TeamSeatChange`、邀請 email/token/expiresAt）+ migration | 席次可查、可重算；既有 wallet 邀請不受影響 |
| **P2** | 訂閱選團隊 + 席次計價 + 金額由 server 計算 | 前端送錯總額不影響實收；付款前揭露 `席次 × 單價` |
| **P3** | 比例補收（純函式 + 單測）+ 邀請 fail-closed 順序 | 閏年 / 月底 / 期末最後一天的金額皆有測試；扣款失敗不建立邀請 |
| **P4** | SMTP 設定 + `mail.service` + 邀請信 + `/invite/<token>` 註冊即入團 | 未設定 SMTP 時邀請明確失敗；token 一次性、過期釋出席次；重寄不重複收費 |
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
