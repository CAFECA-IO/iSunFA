# 團隊錢包與訂閱額度消耗系統 (Team Wallet & Subscription Quota) 設計書

> **Date**: August 2026
> **Author**: Luphia
> **Version**: 1.7 (Draft) — 1.1 新增 §5.3 費思計費；1.2–1.4 費率迭代；1.5 拍板費率與點值下限；1.6 拍板 C 案混合制（離鏈營運 + 每日 merkle 鏈上錨定，Phase 2 為 1:1 backing）；1.7 §5.3 拍板「選定帳本後才能使用費思」，計費團隊由 `AccountBook.teamId` 推導，client 不再自報 `teamId`
> **Status**: Proposed
> **Branch**: `feature/team_wallet_subscription_quota`
> **關聯 ADR**: [ADR 015: 離鏈團隊錢包帳本](decisions/015_offchain_team_wallet_ledger.md)

---

## 1. 目標與需求摘要

讓「團隊」成為計費主體，用戶日常操作**不再需要每次簽署付款**：

1. **團隊訂閱額度**：團隊依訂閱方案 (free / team / business) 取得訂閱額度，成員操作（AI 分析、碳盤查對話等計費功能）時自動消耗，免簽章。
2. **雙視窗限額**：訂閱額度分「**每 5 小時可用額度**」與「**每週可用額度**」兩層，任一層用罄即擋下。
3. **額度用罄的三條出路**：
   - 等待視窗重置（API 回傳明確的 `resetAt` 時間，前端提示倒數）；
   - 消耗「團隊管理者分配給我的團隊點數」（免簽章，自動 fallback）；
   - 消耗「自己的鏈上錢包點數」（走既有 `blockchain_payment` 簽章流程）。
4. **團隊錢包**：OWNER / ADMIN 可用既有金流（OEN 綁卡扣款）購買點數存入團隊帳戶，並**自由分配 / 收回**給團隊成員。

### 非目標 (Non-Goals)

- 不改動個人鏈上點數 (ERC-20 `CreditPoint`) 的既有購買、簽到、mint 流程。
- 不在本期實作「個人錢包免簽授權額度 (pre-authorized allowance)」——列為 Phase 5 展望。
- 不處理 Enterprise / On-Premise 計費（`BILLING_ON_PREMISE`、`BILLING_SOLUTION` 維持現狀）。

---

## 2. 現況盤點（設計前提）

實作前必須認知的四個既有事實（2026-08 盤點）：

| # | 現況 | 對本設計的影響 |
|---|---|---|
| 1 | `Team` model（`prisma/schema.prisma:67`）**沒有任何 plan / subscription / quota 欄位**，訂閱是 per-user 概念 | 需新增 `TeamSubscription`，把方案掛回 Team |
| 2 | 點數餘額**只存在鏈上**（`CreditPoint` 合約），DB 只有 `Order` 流水；每次扣點需 WebAuthn 簽章 + ERC-4337 UserOp（`src/app/api/v1/user/order/[order_id]/blockchain_payment/route.ts`） | 「免簽章」需求註定團隊額度必須**離鏈**記帳，見 ADR 015 |
| 3 | 方案定義有三套互不對應的常數：`src/constants/plans.ts`（personal/free/team/business）、`src/constants/price.ts`（`SUBSCRIPTION_PLAN_PRICE` / `SUBSCRIPTION_PLAN_CREDITS`）、`src/config/credit_plans.ts`（tier1–6 點數包） | 本設計以 `plans.ts` 的 `PLAN` 為唯一方案 ID 來源，數值收斂到新檔 `src/constants/subscription_quota.ts` |
| 4 | 既有限流 `SlidingWindowRateLimiter`（`src/lib/rate_limiter.ts`）是**單機 in-memory**，多實例會放大限額 | 訂閱額度是計費行為，不能沿用 in-memory；必須以 **DB 為準的決定論帳本**（`TeamQuotaUsage`） |

另外兩個要順手補上的既有缺陷：`TeamMember` 缺 `@@unique([teamId, userId])`；新增 `ApiCode` 時 `httpStatusOf()` 不會被 tsc 提醒（見 [已知缺陷](../engineering_guidelines/known_issues/api_http_status_dual_mapping.md)），本功能新增的錯誤碼**必須同步補 case**，否則額度超限會回 500 而非 402/429。

---

## 3. 領域模型

```
Team ──1:1── TeamSubscription        (方案、計費週期)
  │
  ├──1:1── TeamWallet                (未分配點數池 unallocatedBalance)
  │            │
  │            └──1:N── TeamWalletLedger   (append-only 流水，含 balanceAfter 勾稽)
  │
  ├──1:N── TeamWalletAllocation      (成員已分配餘額，@@unique([teamId, userId]))
  │
  └──1:N── TeamQuotaUsage            (訂閱額度消耗流水，5h / week 視窗聚合用)
```

**點數守恆恆等式**（呼應 CLAUDE.md §6 質量守恆，由每日勾稽 Worker 驗證）：

```
累計購入(PURCHASE) + 累計調整(ADJUST) - 累計消耗(CONSUME) + 累計退還(REFUND)
  = TeamWallet.unallocatedBalance + Σ TeamWalletAllocation.balance
```

違反此式 → 凍結該團隊錢包（`TeamWallet.status = FROZEN`）並發告警，絕不讓髒帳繼續流動。

**鏈上錨定（C 案 Phase 1，已拍板 2026-08-07，詳見 ADR 015）**：每日勾稽**通過後**，同一 Worker 對當日 `TeamWalletLedger` 增量計算 merkle root（leaf = `keccak256(id ‖ teamWalletId ‖ entryType ‖ amount ‖ balanceAfter ‖ idempotencyKey ‖ createdAt)`），以 `root_n = keccak256(root_{n-1} ‖ merkleRoot(day_n))` 鏈式累積後，寫入極簡 `LedgerAnchor` 合約（僅 event + 獨立 `ANCHOR_ROLE`）。root 與 txHash 回寫 `TeamLedgerAnchor` 表；錨定失敗重試 3 次進 DLQ，不阻斷錢包營運。

```prisma
// Info: (20260807 - Luphia) C 案 Phase 1：每日 Ledger merkle root 鏈上錨定紀錄
model TeamLedgerAnchor {
  id            String   @id @default(uuid())
  anchorDate    DateTime @unique @map("anchor_date") // 錨定的營業日（UTC+8 日界）
  entryCount    Int      @map("entry_count") // 當日 Ledger 筆數
  dayMerkleRoot String   @map("day_merkle_root")
  chainedRoot   String   @map("chained_root") // keccak256(前日 chainedRoot ‖ dayMerkleRoot)
  txHash        String?  @map("tx_hash")
  status        String   @default("PENDING") // PENDING / ANCHORED / FAILED
  createdAt     DateTime @default(now()) @map("created_at")

  @@map("team_ledger_anchor")
}
```

### 3.1 Prisma Schema 增量

```prisma
// Info: (20260807 - Luphia) 團隊訂閱：方案與計費週期掛在 Team 上，取代 per-user 訂閱概念
model TeamSubscription {
  id                 String   @id @default(uuid())
  teamId             String   @unique @map("team_id")
  planId             String   @default("free") @map("plan_id") // PLAN 常數 (free/team/business)
  status             String   @default("ACTIVE") // TEAM_SUBSCRIPTION_STATUS 常數
  currentPeriodStart DateTime @map("current_period_start")
  currentPeriodEnd   DateTime @map("current_period_end")
  autoRenew          Boolean  @default(true) @map("auto_renew")
  latestOrderId      String?  @map("latest_order_id")
  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt @map("updated_at")

  team Team @relation(fields: [teamId], references: [id])

  @@map("team_subscription")
}

// Info: (20260807 - Luphia) 團隊錢包：未分配點數池；餘額離鏈，以 BigInt 保證零誤差
model TeamWallet {
  id                 String   @id @default(uuid())
  teamId             String   @unique @map("team_id")
  unallocatedBalance BigInt   @default(0) @map("unallocated_balance")
  status             String   @default("ACTIVE") // TEAM_WALLET_STATUS: ACTIVE / FROZEN
  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt @map("updated_at")

  team    Team               @relation(fields: [teamId], references: [id])
  ledgers TeamWalletLedger[]

  @@map("team_wallet")
}

// Info: (20260807 - Luphia) 成員已分配餘額：管理者從池中撥給成員的可用點數
model TeamWalletAllocation {
  id        String   @id @default(uuid())
  teamId    String   @map("team_id")
  userId    String   @map("user_id")
  balance   BigInt   @default(0)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  team Team @relation(fields: [teamId], references: [id])
  user User @relation(fields: [userId], references: [id])

  @@unique([teamId, userId])
  @@map("team_wallet_allocation")
}

// Info: (20260807 - Luphia) append-only 流水帳：每筆異動都記期末餘額，供守恆勾稽與對帳
model TeamWalletLedger {
  id                     String   @id @default(uuid())
  teamWalletId           String   @map("team_wallet_id")
  entryType              String   @map("entry_type") // TEAM_WALLET_ENTRY_TYPE 常數
  amount                 BigInt   // 有號數：入帳為正、出帳為負
  poolBalanceAfter       BigInt?  @map("pool_balance_after")
  allocationBalanceAfter BigInt?  @map("allocation_balance_after")
  targetUserId           String?  @map("target_user_id") // 分配 / 收回 / 消耗的成員
  operatorUserId         String   @map("operator_user_id")
  orderId                String?  @map("order_id") // PURCHASE 對應的 Order
  featureCode            String?  @map("feature_code") // CONSUME 對應的計費功能
  idempotencyKey         String   @unique @map("idempotency_key")
  createdAt              DateTime @default(now()) @map("created_at")

  teamWallet TeamWallet @relation(fields: [teamWalletId], references: [id])

  @@index([teamWalletId, createdAt])
  @@map("team_wallet_ledger")
}

// Info: (20260807 - Luphia) 訂閱額度消耗流水：以固定視窗 key 聚合，DB 為準（多實例安全）
model TeamQuotaUsage {
  id            String   @id @default(uuid())
  teamId        String   @map("team_id")
  userId        String   @map("user_id")
  featureCode   String   @map("feature_code")
  amount        BigInt
  windowKey5h   Int      @map("window_key_5h")
  windowKeyWeek Int      @map("window_key_week")
  createdAt     DateTime @default(now()) @map("created_at")

  team Team @relation(fields: [teamId], references: [id])

  @@index([teamId, windowKey5h])
  @@index([teamId, windowKeyWeek])
  @@map("team_quota_usage")
}
```

同一支 migration 順帶補：`TeamMember` 加 `@@unique([teamId, userId])`（先跑資料清重）。

---

## 4. 額度視窗演算法（決定論、純函式、可單測）

採**固定視窗 (fixed window)** 而非滑動視窗：使用者需要一個明確可顯示的「重置時間」，固定視窗的 `resetAt` 是確定值；滑動視窗的恢復時間隨消耗分佈連續變動，UX 上無法給出單一倒數。

```typescript
// Info: (20260807 - Luphia) 純函式，不碰 DB、不碰 Date.now()，時間一律由呼叫端注入
export const FIVE_HOURS_SEC = 5 * 60 * 60; // 18000
export const WEEK_SEC = 7 * 24 * 60 * 60; // 604800
// Info: (20260807 - Luphia) 2026-01-05 (一) 00:00 Asia/Taipei 的 epoch 秒，週視窗錨點
export const WEEK_ANCHOR_EPOCH_SEC = 1767542400;

export function getWindowKey5h(nowSec: number): number {
  return Math.floor(nowSec / FIVE_HOURS_SEC);
}
export function getWindowKeyWeek(nowSec: number): number {
  return Math.floor((nowSec - WEEK_ANCHOR_EPOCH_SEC) / WEEK_SEC);
}
export function getResetAt5h(nowSec: number): number {
  return (getWindowKey5h(nowSec) + 1) * FIVE_HOURS_SEC;
}
export function getResetAtWeek(nowSec: number): number {
  return WEEK_ANCHOR_EPOCH_SEC + (getWindowKeyWeek(nowSec) + 1) * WEEK_SEC;
}
```

**用量計算**：`SUM(TeamQuotaUsage.amount) WHERE teamId = ? AND windowKey5h = ?`（週視窗同理）。以 DB 聚合為準，天生多實例一致；量大時可加每視窗一列的 counter 快取表，但 Phase 1 直接 SUM + 複合索引即可（單團隊單視窗列數 = 操作次數，量級無虞）。

### 4.1 方案額度設定

額度為**系統設定值，保存於 DB 的 `SubscriptionPlanQuota` 表**（每方案一列，具型別欄位 `per5h` / `perWeek`），可由後台調整、留 `updatedAt` 變更軌跡、多實例一致。額度單位與 `ANALYSIS_BASE_COSTS` 同為 credit。

> ⚠️ **嚴禁改為 env 覆寫**（2026-08-09 修正原設計）：額度屬營運設定而非部署參數；
> 且非 `NEXT_PUBLIC_` 的環境變數在 client bundle 讀不到，會使 server 與 client 算出不同結果（hydration mismatch）。
> 定價頁的額度倍數一律於 server component 讀 DB 算好後，以 props 傳入 client component。

| 方案 | 每 5 小時 | 每週 | 依據（`SUBSCRIPTION_PLAN_CREDITS` 月額 ÷ 4 ≈ 週額；週額 ÷ 8 ≈ 5h 突發上限） |
|---|---|---|---|
| `free` | 10 | 40 | 月額 150 |
| `team` | 100 | 750 | 月額 3,000 |
| `business` | 1,000 | 7,500 | 月額 30,000 |

```typescript
// Info: 僅為查無設定列時的 fail-safe 預設值；正式值寫入 SubscriptionPlanQuota 設定表
export const DEFAULT_SUBSCRIPTION_QUOTA_BY_PLAN: Record<TeamPlanId, ISubscriptionQuota> = {
  [TEAM_PLAN.FREE]: { per5h: 10, perWeek: 40 },
  [TEAM_PLAN.TEAM]: { per5h: 100, perWeek: 750 },
  [TEAM_PLAN.BUSINESS]: { per5h: 1000, perWeek: 7500 },
};
```

> 上表為程式碼預設值；正式值由後台寫入設定表，不需改 code、不需重新部署。

---

## 5. 扣費管線 (Consumption Pipeline)

**單一入口**：`spend.service.ts` 的 `spendCredits()`。所有計費功能（AI 分析、碳盤查對話…）一律經此管線，禁止各功能自行扣帳。

```
spendCredits(identity, teamId, featureCode, cost, idempotencyKey)
  │
  ├─ 0. Guard: 呼叫者是該 team 的有效成員（team.repo）；cost > 0（Fail Fast）
  │
  ├─ 1. 訂閱額度（免簽章）
  │     usage5h + cost ≤ plan.per5h 且 usageWeek + cost ≤ plan.perWeek
  │     → INSERT TeamQuotaUsage，放行。回 { source: "SUBSCRIPTION_QUOTA" }
  │
  ├─ 2. 成員分配點數（免簽章，自動 fallback）
  │     TeamWalletAllocation.balance ≥ cost
  │     → $transaction: 條件扣款 + Ledger(CONSUME)。回 { source: "TEAM_ALLOCATION" }
  │
  └─ 3. 皆不足 → throw QuotaExceededError（Service 層攔截包裝，不噴 Prisma 原始錯誤）
        API 回 402，payload 附三條出路所需的全部資訊：
        {
          "code": "TEAM_QUOTA_EXCEEDED",
          "data": {
            "exceeded": "PER_5H" | "PER_WEEK",
            "quota5h":   { "limit": "100", "used": "100", "resetAt": 1786518000 },
            "quotaWeek": { "limit": "750", "used": "312", "resetAt": 1786723200 },
            "allocationBalance": "0",
            "options": ["WAIT_RESET", "USE_PERSONAL_WALLET"]
          }
        }
```

- 前端收到 402 → 顯示「額度已用完，將於 `resetAt` 重置」倒數，並提供「改用個人錢包點數」按鈕 → 走**既有** `generateAnalysisOrder()` + `blockchain_payment`（WebAuthn 簽章）流程，本設計不動它。
- 金額一律 `BigInt`，API 傳輸用字串（沿用 `src/validators/common.ts` 的 `bigIntStringSchema`）。
- `idempotencyKey` 由呼叫端以業務主鍵組成（如 `analysis:{orderId}`、`carbon-chat:{messageId}`），重試不重複扣款。

### 5.1 併發與一致性

- 步驟 2 的扣款在單一 `prisma.$transaction` 內用**條件更新**做樂觀防護：
  `UPDATE team_wallet_allocation SET balance = balance - $cost WHERE id = $id AND balance >= $cost`，
  `updateMany().count === 0` 即代表併發下餘額不足 → Fail Fast，絕不出現負餘額。
- 步驟 1 的視窗檢查允許**最後一筆輕微超額**（check 與 insert 之間的競態最多多放行併發中的幾筆），這是額度（軟限制）而非金錢，可接受；Ledger 類（步驟 2）零容忍。
- 所有 Ledger 寫入記錄 `poolBalanceAfter` / `allocationBalanceAfter`，勾稽 Worker 逐日驗證守恆恆等式。

### 5.2 失敗補償

計費功能在扣款後執行失敗（如 LLM 管線 giveup）→ 由該功能的 Worker 呼叫 `refundCredits(idempotencyKey)`：

- 來源是 `SUBSCRIPTION_QUOTA` → 寫一筆負向 `TeamQuotaUsage`（同視窗 key）；
- 來源是 `TEAM_ALLOCATION` → `$transaction` 回補餘額 + Ledger(REFUND)。
- 補償本身重試 3 次仍失敗 → 依 CLAUDE.md §6 落 DLQ（`giveup.md`），人工介入，不做無窮迴圈。

### 5.3 費思 (Faith) 對話功能計費機制

#### 現況（2026-08 盤點，計費前必須先補的四個洞）

費思（`src/components/user/faith_agent.tsx` → `POST /api/v1/chat` → `src/skills/chat/direct_chat.ts`）目前：

| # | 缺口 | 事實 |
|---|---|---|
| 1 | **零計費、零認證、零限流** | `src/app/api/v1/chat/route.ts` 全檔 22 行，無 DeWT auth、無扣點、無 server-side rate limit；唯一防線是前端 `localStorage` 的訪客 5 次限制（清掉即繞過，登入用戶完全不限） |
| 2 | **零記帳** | `direct_chat.ts` 呼叫 `generateRawWithImages()` 時未帶 `taskKey`，`invokeGuarded`（`chat.service.ts:333`）的 `usageMetadata` 解析被跳過——token 用量連 log 都沒有 |
| 3 | **零成本上限** | 未設 `maxOutputTokens`、未設 `thinkingBudget`、未設 timeout，跑在 `gemini-2.5-pro`（thinking 模型）。實測（`src/constants/llm.ts:62-72`）thinking 可吃掉 30%–100% 的輸出額度 |
| 4 | **定價不一致** | 功能幾乎相同的 AI 諮詢室收 5 點（`ANALYSIS_BASE_COSTS.AI_CONSULTING`）並有完整 token 帳；費思免費無限 |

#### 使用前提：必須先選定帳本（產品拍板 2026-08-12）

> **費思僅在「已選定帳本」的情境下可用，計費團隊由該帳本決定。**

| 面向 | 規則 |
|---|---|
| **入口** | `FaithAgent` 掛載點自 `src/app/user/layout.tsx` 移至 `src/app/user/account_book/[account_book_id]/layout.tsx`。未選帳本的頁面（`/user/main`、`/user/team`、`/user/billing`、帳本選擇頁…）**不出現**浮動鈕——不是點了才說不能用，而是沒有入口 |
| **API 契約** | `POST /api/v1/chat` 收 **`accountBookId`**，不再收 `teamId`。Server 端經 `assertAccountBookMember()`（`account_book_access.guard.ts`，既有授權收斂點）驗證帳本存在且呼叫者為該帳本所屬團隊成員，再以 `AccountBook.teamId` 作為扣費團隊 |
| **訪客試用** | 未登入或未帶 `accountBookId` → 維持既有試用路徑（不進計費管線、server-side IP 限流），語意不變 |

**為什麼是帳本而不是團隊：**

1. **計費歸屬必須決定論**：一位用戶可屬多個團隊（`TeamMember` 為多對多）。前端若以「取第一個所屬團隊」推導計費主體，同一句話會依團隊清單排序扣到不同團隊的額度——用戶看不出、管理者對不上帳。帳本是用戶操作時**唯一明確**的工作情境。
2. **計費主體不可由 client 自報**：`teamId` 由前端送出，等於讓瀏覽器選擇「由誰付錢」；改由 server 從帳本推導後，越權自然被 `assertAccountBookMember()` 擋下（映射 `NF_ACCOUNT_BOOK` / `AUTH_PERMISSION_DENIED`），與報表 / 分類帳共用同一道授權，杜絕遷移遺漏。
3. **映射已存在**：`AccountBook.teamId`（`prisma/schema.prisma:586`）是既有的唯一歸屬欄位，無需新增欄位或推導規則。與領域模型鐵律（CLAUDE.md §8）一致：`AccountBook` 是業務的 Root Node，計費掛在它下面而非掛在 `Company`。

> ⚠️ 連帶影響：費思成為**帳本情境內**的功能，等於「先有帳本才有 AI 對話」。此為產品拍板結果；若日後要在無帳本情境（如首頁試用、帳本選擇頁）提供費思，須先回答「這一輪算誰的額度」，而不是把 `teamId` 交還給前端自報。

> 📎 個人化記憶（付費訂閱權益，服務條款 §3.7）另立規範：[費思個人化記憶](ai_and_analytics/faith_personal_memory.md)。與本節計費直接相關的一點是——**記憶注入會抬高 input tokens，故預扣估算必須加計注入上界**，否則 `hold` 不再是成本上界，§5.3 的「只退不補」不變式即破裂（見該文 §5）。記憶功能須於 v0.13.0 釋出前完成。

#### 計費模型：token 計量，預扣—結算

費思與 AI 諮詢室不同：諮詢室是單發任務，**維持既有固定 5 點不改**（產品拍板 2026-08-07）；費思是不定長度的多輪對話，**按 token 計量**才公平。規則：

> **產品拍板（2026-08-07）：每 1,000 tokens（input + thinking + output 合計）扣 1 點，無條件進位，每輪最低 1 點。**
> 費率與成本上界為**系統設定值，保存於 DB 的 `FaithBillingSetting` 表**（單列設定，欄位 `tokensPerCredit` / `maxOutputTokens` / `imageInputTokenEstimate`），可由後台調整、留變更軌跡；`DEFAULT_FAITH_BILLING` 僅為查無設定列時的 fail-safe 預設。**嚴禁改回 env 覆寫**（2026-08-09 修正，同 §4.1）。
> **點值定價規則：1 點 = TWD 0.1 為成本基準下限，任何點數售價必須高於此基準 3 倍以上（即 ≥ NT$0.3/點）**——`credit_plans.ts` 現行售價 NT$0.5–1.0/點 已符合，無需調整。
>
> **費率定位**：計量門檻低於典型單輪（~3,150 tokens），**token 計量真實生效**：典型一輪扣 4 點、上限一輪 7 點。以售價下限 NT$0.3/點 計，營收 ≈ US$9.4/M tokens，已高於現用 Gemini 2.5 Pro 的混合成本（~$8.4/M）：
>
> | 售價 | 典型一輪營收（4 點） | vs Pro 成本 NT$0.83/輪 | 毛利 |
> |---|---|---|---|
> | 下限 NT$0.3/點 | NT$1.2 | — | ~31% |
> | 現行 NT$0.5–1.0/點 | NT$2.0–4.0 | — | 59%–79% |
>
> 即：**在定價規則下，維持 `gemini-2.5-pro` 亦有正毛利，模型降級從生存條件變為毛利優化選項**（改 Gemini 2.5 Flash 級成本 ~NT$0.21/輪，毛利可推至 90%+；費思為無記憶 one-shot 常識問答，降級可行性高，列 P3 一併評估）。guardrails（§5.3 四項）仍為計費前提——上表的成本上界依賴 `maxOutputTokens` / `thinkingBudget` 存在。
>
> 體感（典型一輪 4 點，對照 §4.1 額度）：free 每週約 10 輪、team 約 190 輪、business 約 1,900 輪。
>
> ~~**定價揭露（產品要求 2026-08-07）：費率必須標註在訂閱方案內。**~~
> **產品改版（2026-08-09）：訂閱方案頁不再揭露費率與 token 計算方式**，各方案功能列僅列出「費思人工智能代理人」；為此新建的 `GET /api/v1/pricing/meta` 端點隨之移除（零消費端）。落點與規則調整為：
> 1. **條款不載明費率數字**（2026-08-09 決定）：費率為可由後台調整的系統設定，寫死在條款會在調整後立即失準，故服務條款 §3.4 僅載明「依 tokens 用量計費、無條件進位、每則最低 1 點，費率以本服務內公告為準」，並保留扣點明細可於點數歷程查驗之承諾。
>    ⚠️ **待辦：費率的「服務內公告」尚無正式落點**——方案頁已於同日移除費率標註，故目前費率的具體數字僅存在於 DB 設定與 API 回應（`GET /subscription` 的 `faithTokensPerCredit`），對外沒有任何頁面呈現。上線前須由產品與法務指定公告位置（如點數說明頁），否則條款所指之公告不存在。
> 2. **數字不得寫死**：`GET .../team/[team_id]/subscription` 仍回傳 `faithTokensPerCredit`（讀自 env 常數），供未來需揭露費率的介面插值使用——調費率只動 env，避免「標示與實扣不符」。
> 3. 額度用罄的 402 提示與扣點明細（Ledger / point_history）同樣顯示費率與本輪實耗 tokens，對用戶可驗證（零捏造原則的 UX 延伸）。
> 4. **服務條款同步修訂（已起草，待法務確認）**：`documents/legal/terms_of_service.md`（前端 `/terms` 頁直接讀此檔）新增 §3.3 訂閱額度、§3.5 團隊錢包與點數分配，並於 §3.4 扣點標準加入費思費率；文件頂部留 `ToDo` 註記，Release 前由法務確認並更新生效日期。《退款政策》尚未涵蓋團隊錢包剩餘點數（開放問題 #5），需一併補。
>
> 以下為 v1.1 的工程建議值分析——費率同為 1 點 = 1,000 tokens，以實際售價 NT$0.5–1.0/點 計算毛利，與拍板後規則一致，保留作為調價依據：

計費以 Gemini 回傳的 `usageMetadata.totalTokenCount` 為準（決定論來源，非 LLM 自報），但 token 數只有呼叫**後**才知道，而分配點數帳本（§5.1）零容忍負餘額，因此採**預扣—結算**：

```
1. 預扣 (hold)：holdCredits = max(1, ceil((inputEstimate + maxOutputTokens) / FAITH_TOKENS_PER_CREDIT))
   inputEstimate 用字元數/3 估算即可（hold 只是暫時上界，不需精準，不多打 countTokens API）
   → 走 spendCredits() 管線（§5），idempotencyKey = `faith:{messageId}`
2. 呼叫 LLM（強制 guardrails，見下）
3. 結算 (settle)：actualCredits = max(1, ceil(usageMetadata.totalTokenCount / FAITH_TOKENS_PER_CREDIT))
   → refundCredits() 退還 holdCredits - actualCredits（§5.2 既有補償路徑）
4. LLM 呼叫失敗 → 全額退還，不計最低 1 點
```

**計費前提 guardrails**（沒有上界就沒有可預扣的上界，四項缺一不可）：

1. `route.ts` 補 DeWT 認證 + **帳本 context**（`accountBookId` → `AccountBook.teamId`，見上節「使用前提」；未登入或未帶帳本的訪客維持前端試用，不進計費管線、加 server-side IP 限流）。
2. `direct_chat.ts` 帶 `taskKey`（`LlmTaskKeyEnum` 新增 `FAITH_CHAT`），啟用 `usageMetadata` 記帳，並把每輪用量寫入 `TeamQuotaUsage.featureCode = FEATURE_CODE.FAITH_CHAT`。
3. 設 `maxOutputTokens = 4096`（含 thinking）+ `thinkingBudget = 2048` + `timeoutMs = 45s`（對齊 `LLM_SYNC_TIMEOUT_MS`）。
4. `chat_input.tsx` 補附件大小上限（現況不擋大檔，圖片 token 由 Gemini 按解析度計，等於敞開的成本口）。

#### 估價依據：多少 tokens 扣一點？

**成本端**（Gemini 2.5 Pro，≤200K context 級距，1 USD ≈ 32 TWD）：input $1.25/M tokens、output（**含 thinking**）$10/M tokens。

**單輪 token 組成**（費思是無記憶 one-shot，系統 prompt 150–600 tokens，不帶歷史、無 RAG）：

| 情境 | input | thinking + output | 合計 tokens | LLM 成本 |
|---|---|---|---|---|
| 典型文字問答（套 guardrails 後） | ~650 | ~2,500 | ~3,150 | ≈ NT$0.83 |
| 上限（帶圖 + 打滿 4,096 輸出） | ~2,000 | 4,096 | ~6,100 | ≈ NT$1.39 |

**收入端**：1 點售價 NT$0.5–1.0（`src/config/credit_plans.ts` tier6–tier1）。

**費率敏感度**（以最保守的 tier6 NT$0.5/點 計毛利）：

| 費率 | 每點成本（輸出佔比最高時 ≈ NT$0.32/千 tokens） | tier6 毛利 | 典型一輪扣點 | 判定 |
|---|---|---|---|---|
| 1 點 = 500 tokens | ~NT$0.16 | ~68% | 7 點 | 毛利佳，但一輪比 AI 諮詢室（5 點）還貴，體感差 |
| **1 點 = 1,000 tokens** | **~NT$0.26–0.32** | **36%–48%**（tier1 達 68%–74%） | **4 點** | ✅ **建議值**：最低階仍有毛利，典型一輪 2–4 點、上限 7 點，與諮詢室 5 點同量級 |
| 1 點 = 2,000 tokens | ~NT$0.53–0.64 | **負毛利** | 2 點 | ❌ tier5/6 賣一點虧一點 |

> ⚠️ 這張表成立的前提是 guardrails 已上：若不設 `maxOutputTokens` / `thinkingBudget`，實測 thinking 模型單輪輸出可達 8,000+ tokens，成本翻倍、預扣上界不存在，計量計費直接失效。**guardrails 不是優化，是計費的一部分。**

**換算成用戶體感**（典型一輪 ≈ 3 點，對照 §4.1 額度）：

| 方案 | 每 5 小時約可對話 | 每週約可對話 |
|---|---|---|
| free | ~3 輪 | ~13 輪 |
| team | ~33 輪 | ~250 輪 |
| business | ~330 輪 | ~2,500 輪 |

數字若與產品期望的體感不符，優先調 §4.1 的方案額度 env，其次才動費率。

---

## 6. 團隊錢包購買與分配

### 6.1 購買（OWNER / ADMIN）

重用既有 OEN 金流骨架，只新增訂單型別：

1. `POST /api/v1/user/team/[team_id]/wallet/purchase`：body 帶 `creditPlanId`（沿用 `src/config/credit_plans.ts` tier1–6）→ 建 `Order`，`type = ORDER_TYPE.BILLING_TEAM_POINT`（**新常數**），`data` 內含 `teamId` + `credits`。
2. 走既有 `payment_method/[id]/checkout`（已綁卡免跳轉）或 OEN checkout-token 流程。
3. OEN webhook → `processOenPayment()` 的 `$transaction` 內**分流**：`type === BILLING_TEAM_POINT` 時不 mint 鏈上點數，改為 `TeamWallet.unallocatedBalance += credits` + Ledger(PURCHASE, orderId)。冪等鍵 = `purchase:{orderId}`，webhook 重送不重複入帳。

### 6.2 分配 / 收回（OWNER / ADMIN）

`POST /api/v1/user/team/[team_id]/wallet/allocations`
body：`{ userId, amount(bigIntString), direction: "ALLOCATE" | "REVOKE" }`

- ALLOCATE：`$transaction`｛池條件扣款 → allocation upsert 加點 → Ledger(ALLOCATE)｝
- REVOKE：`$transaction`｛allocation 條件扣款 → 池加點 → Ledger(REVOKE)｝
- 目標必須是**現任**有效成員；成員被移出團隊時，由移除流程自動 REVOKE 其剩餘分配回池（掛在既有 `members/[member_id]` DELETE 流程內）。

### 6.3 團隊解散與訂閱終止（已拍板 2026-08-07：剩餘點數不退還）

- **前置提示（強制）**：解散團隊或終止訂閱的操作流程中，前端必須先呼叫 `GET /wallet` 取得剩餘點數（池 + 全員分配總額），在確認 Modal 中**明確顯示「剩餘 N 點將全數失效，不予退還」**，用戶確認後才送出；剩餘點數 > 0 時後端亦強制要求 `acknowledgeForfeiture: true` 參數，未帶即拒絕（防繞過 UI 直打 API）。
- **帳務處理**：解散時以單一 `$transaction` 對池與所有分配寫入負向 `Ledger(ADJUST)` 分錄歸零（附 `featureCode = TEAM_DISSOLVED`），錢包狀態改 `CLOSED`——**餘額歸零走反向分錄而非 UPDATE 抹除**，守恆恆等式與稽核軌跡完整保留。
- 條款依據：服務條款 §3.5、退款政策 §3.1（皆已起草）。

### 6.4 權限矩陣

| 操作 | OWNER | ADMIN | EDITOR / VIEWER |
|---|---|---|---|
| 變更訂閱方案 | ✅ | ❌ | ❌ |
| 購買團隊點數 | ✅ | ✅ | ❌ |
| 分配 / 收回點數 | ✅ | ✅ | ❌ |
| 查看錢包全貌與 Ledger | ✅ | ✅ | 僅見自己的分配餘額與額度狀態 |
| 消耗額度 / 分配點數 | ✅ | ✅ | ✅ |

授權檢查抽成 `src/services/team_wallet_access.guard.ts`（沿用 `account_book_access.guard.ts` 慣例），API 層不寫角色判斷。

---

## 7. API 一覽（App Router，`src/app/api/v1/user/team/[team_id]/` 下）

| Method + Path | 用途 | 權限 |
|---|---|---|
| `GET /subscription` | 方案、計費週期、雙視窗剩餘額度與 `resetAt`、`faithTokensPerCredit` 費率（供未來揭露介面用，§5.3） | 成員 |
| `PUT /subscription` | 變更方案（建 `BILLING_SUBSCRIBE` 訂單，`data.teamId`） | OWNER |
| `GET /wallet` | 池餘額 + 自己的分配餘額（管理者另含全員分配總表） | 成員 |
| `POST /wallet/purchase` | 購買點數入池 | OWNER / ADMIN |
| `GET /wallet/allocations` | 全員分配清單 | OWNER / ADMIN |
| `POST /wallet/allocations` | 分配 / 收回 | OWNER / ADMIN |
| `GET /wallet/ledger` | 流水帳（分頁，`sortSpecSchema`） | OWNER / ADMIN |

慣例遵循：`getIdentityFromDeWT` 取身分 → guard → service → `jsonOk` / `jsonFail(API_ERRORS.XXX)`；Zod schema 全部放 `src/validators/team_wallet.ts` 並在 `src/validators/index.ts` re-export。

**新增錯誤碼**（`src/constants/error_dictionary.ts`，命名依既有 `ApiCode` 規則）：
`TEAM_QUOTA_EXCEEDED`(402)、`TEAM_WALLET_INSUFFICIENT`(402)、`TEAM_ALLOCATION_INSUFFICIENT`(402)、`TEAM_WALLET_FORBIDDEN`(403)、`TEAM_WALLET_FROZEN`(409)、`TEAM_SUBSCRIPTION_NOT_FOUND`(404)。
⚠️ **同步修 `httpStatusOf()`**：現況缺 case 會讓新錯誤碼回 500（已知缺陷 #1），本功能的 402/409 必須補上。

---

## 8. 檔案清單（三層架構對照）

| 層 | 新增檔案 |
|---|---|
| Constants | `src/constants/subscription_quota.ts`（視窗常數 + 方案額度 + `TEAM_WALLET_ENTRY_TYPE` / `TEAM_WALLET_STATUS` / `TEAM_SUBSCRIPTION_STATUS` / `SPEND_SOURCE` / `FEATURE_CODE`） |
| Interfaces | `src/interfaces/team_wallet.ts`（`ITeamWalletView` / `IAllocationView` / `IQuotaStatus` / `ISpendResult` / `ILedgerEntry`，金額一律 string） |
| Validators | `src/validators/team_wallet.ts` + `index.ts` re-export |
| Lib（純函式） | `src/lib/quota/window.ts`（§4 視窗數學，100% 單測覆蓋） |
| Repositories | `src/repositories/team_subscription.repo.ts`、`team_wallet.repo.ts`、`team_quota_usage.repo.ts` |
| Services | `src/services/team_subscription.service.ts`、`team_wallet.service.ts`、`spend.service.ts`、`team_wallet_access.guard.ts` |
| API | §7 的 7 支 `route.ts` |
| Workers | `src/workers`（依 `documents/architecture/async_workers/` 慣例）：`wallet_conservation_audit`（每日守恆勾稽 + **C 案 merkle 錨定**）、`subscription_renewal`（週期續訂 / 到期降級 free） |
| Contracts | `contracts/ledger_anchor.sol`（極簡錨定合約：`event AnchorCommitted(uint256 day, bytes32 root)` + 獨立 `ANCHOR_ROLE`，不持有任何資產） |
| 修改 | `prisma/schema.prisma`、`src/constants/status.ts`（`ORDER_TYPE.BILLING_TEAM_POINT`）、`src/repositories/payment.repo.ts`（webhook 分流）、`httpStatusOf()`、各計費功能入口改呼叫 `spendCredits()` |
| 修改（費思接入，§5.3） | `src/app/api/v1/chat/route.ts`（DeWT auth + 預扣—結算）、`src/skills/chat/direct_chat.ts`（帶 `taskKey` + guardrails）、`src/constants/llm.ts`（`LlmTaskKeyEnum.FAITH_CHAT`、`FAITH_TOKENS_PER_CREDIT`）、`src/components/chat/chat_input.tsx`（附件大小上限） |
| 修改（方案功能列，§5.3） | `src/app/(landing)/pricing/subscription/subscription_content.tsx`（功能列僅列「費思人工智能代理人」，不揭露費率；月配點文案亦移除）、`src/i18n/locales/*/`（五語系文案） |
| 修改（法務文件，§5.3 / §6.3） | `documents/legal/terms_of_service.md`（§3.3 訂閱額度、§3.4 費思扣點標準、§3.5 團隊錢包與解散不退還，已起草待法務確認）、`documents/legal/refund_policy.md`（§3.1 團隊錢包點數不退款與解散失效條款，已起草待法務確認） |

---

## 9. 分階段實作計畫

| Phase | 內容 | 驗收 |
|---|---|---|
| **P0** | Prisma migration（5 個新 model + TeamMember unique）、constants、interfaces、`window.ts` 純函式 | migration 可重放；視窗函式單測（含視窗邊界、週錨點、閏秒無關性） |
| **P1** | Repos + `spendCredits()` 管線 + 402 錯誤碼 + `httpStatusOf()` 修補 | 併發 100 req 壓測無負餘額；冪等重試不重複扣款 |
| **P2** | 錢包購買（OEN 分流）、分配 / 收回 API、成員移除自動 REVOKE | E2E：購買 → 入池 → 分配 → 消耗 → 收回，Ledger 守恆式成立（E2E 帳本用 `e2e-book-` 前綴） |
| **P3** | 計費功能接入管線（AI 分析先行，**費思對話含 §5.3 四項 guardrails** 次之，碳盤查對話再次之）、402 fallback 到既有個人錢包簽章流程 | 額度內操作零簽章；用罄後三條出路皆可走通；費思結算誤差 = 0（settle 以 `usageMetadata` 為準） |
| **P4** | 前端（額度儀表、重置倒數、錢包管理頁、分配 UI、**訂閱方案頁標註費思費率**）、勾稽 / 續訂 Workers、**C 案 Phase 1 merkle 錨定**（`ledger_anchor.sol` 部署 + Worker 錨定步驟） | 勾稽 Worker 對壞帳注入測試能凍結錢包並告警；定價頁費率數字與 env 同源；**任一日的 Ledger 可由 DB 重算 root 並與鏈上 event 比對一致** |
| **P4 進度**（2026-08-07，全數交付 ✅） | WalletGuardian（守恆勾稽 + 凍結告警 + merkle 錨定，壞帳不上鏈）、SubscriptionExpiry + SubscriptionRenewal（到期降級、autoRenew 以綁定卡自動扣款續訂、逾 3 天寬限降級 free）、`ledger_anchor.sol` + deploy_contract 部署整合、`resolveEffectivePlanId` fail-closed 防線、團隊管理頁錢包面板（額度百分比儀表 + 成員卡片分配/收回 + 導購連結）。營運前置：跑 `npm run deploy_contract` 產出 `NEXT_PUBLIC_LEDGER_ANCHOR_ADDRESS`（未配置時錨定留 FAILED 自動重試，不阻斷營運） | — |
| **P5**（展望） | 個人錢包「免簽授權額度」：使用者一次性簽署授權每期上限，管線第 3 層自動代扣。**C 案 Phase 2**：團隊購點 1:1 mint 至 per-team 隔離地址 + 每日批次結算 burn（**硬性前置：金鑰治理——冷熱分離 + multisig + 獨立 `OPERATOR_ROLE`**，見 ADR 015） | — |

---

## 10. 開放問題（實作前需產品拍板）

1. 各方案的正式額度數字（§4.1 為程式碼預設值；正式值寫入 `SubscriptionPlanQuota` 設定表，需後台介面或 seed 腳本寫入）。
2. 團隊點數是否設**有效期**（現設計為永久有效；若要到期，Ledger 已預留 `ADJUST` 型別 + 到期 Worker 即可擴充）。
3. `free` 方案是否允許購買團隊點數（現設計：允許，額度與錢包互相獨立）。
4. 訂閱降級時當期已消耗超過新方案週額 → 現設計：立即按新額度擋下，不追溯扣款。
5. ~~團隊解散時池內剩餘點數的退費政策~~ → **已拍板（2026-08-07）：解散／終止訂閱時剩餘點數全數失效不退還，解散前強制提示剩餘點數並取得確認**（見 §6.3；服務條款 §3.5 與退款政策 §3.1 已同步起草）。
6. ~~費思費率~~ → **已拍板（2026-08-07）：`FAITH_TOKENS_PER_CREDIT = 1_000`；點值 TWD 0.1 為成本基準下限，點數售價須 ≥ 3 倍（NT$0.3/點），現行售價已符合**（見 §5.3）。剩餘待評估（非阻塞）：費思是否改用 Flash 級模型將毛利自 59–79% 推至 90%+，列 P3 一併評估。
   ~~AI 諮詢室是否也改為 token 計量~~ → **已拍板（2026-08-07）：AI 諮詢室維持固定 5 點，不改。**
