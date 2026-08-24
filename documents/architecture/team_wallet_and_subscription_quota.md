# 團隊錢包與訂閱額度消耗系統 (Team Wallet & Subscription Quota) 設計書

> **Date**: August 2026
> **Author**: Luphia
> **Version**: 1.28 (Draft) — 1.1 新增 §5.3 費思計費；1.2–1.4 費率迭代；1.5 拍板費率與點值下限；1.6 拍板 C 案混合制（離鏈營運 + 每日 merkle 鏈上錨定，Phase 2 為 1:1 backing）；1.7 §5.3 拍板「選定帳本後才能使用費思」，計費團隊由 `AccountBook.teamId` 推導，client 不再自報 `teamId`；1.8 新增 §5.4 拆帳與封頂預扣（有餘額就放行、額度用光才扣錢包）；1.9 新增 §5.5 碳盤查計費；1.10 碳盤查四條 LLM 路徑接上（1.19 補上第五條：段落草稿）；1.11 無帳本會話改扣個人鏈上點數（建單 → 402 → 付款 → 重送）；1.12 §5.4 新增逐功能扣款順序，物流碳足跡優先扣分配點數；1.13 新增 §5.6 多團隊成員的支付歸屬；1.14 §5.6 六個付款呼叫點統一至 useAnalysisPayment；1.15 §5.4 訂單類扣款禁用封頂（`allowPartial` 必填），付款前以所選來源的可用額度攔阻並停用支付鈕；1.16 新增 §6.1.1 訂閱／購點的歸屬對象入口，訂單 `teamId` 改為頂層欄位，履行失敗改記 MINT_FAILED；1.17 訂閱改為席次計價、期中加人比例補收；1.18 新增 §5.4.1 重放／重試／退款守恆，個人點數路徑補上失敗退款；1.19 新增 §5.5.1 段落草稿為第五條計費路徑，並加上覆蓋契約測試；1.20 新增 §5.4.2 訂閱不發點數，額度為全團隊共用；1.20a 同日拍板改為逐成員（一人一池），修正 1.20 的敘述；1.21 §6.2 分配 / 收回改為鏈上鑄造與銷毀；1.22 修正金流成功判準（HTTP ok 且業務碼 S0000）、付費訂閱缺單價時拒絕加席並提供回填腳本；1.23 扣費第二層改讀成員鏈上點數、席次補收加上單期上限與冪等、免費版新增人數上限；1.24 收據限本人取用、免費版人數上限於方案頁標示；1.25 額度讀寫改為 advisory lock 序列化、訂單冪等鍵升格為唯一欄位；1.26 追補改記進結算當下的視窗；1.27 402 區分「等重置會好」與「單筆超過視窗上限」，checkout 以白名單限制可付款的訂單型別；**1.28 免費方案的額度改回全隊共用一份，免費版人數上限移除**
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

  ⚠️ 2026-08-13 起步驟 1 與 2 改為**拆帳**而非二選一：額度剩餘先用光、差額才扣分配點數，
     且可用餘額不足全額時預扣封頂放行（見 §5.4）。步驟 3 的 402 僅在兩者同時見底時觸發。
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
> 即：**在定價規則下，維持 `gemini-2.5-pro` 亦有正毛利，模型降級從生存條件變為毛利優化選項**（改 Gemini 2.5 Flash 級成本 ~NT$0.21/輪，毛利可推至 90%+；費思為無記憶 one-shot 常識問答，降級可行性高，列 P3 一併評估）。guardrails（§5.3）仍為計費前提——上表的成本上界依賴 `maxOutputTokens` 存在（thinking token 與輸出共用此額度）。
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
3. 設 `maxOutputTokens = 4096`（含 thinking）+ `timeoutMs = 45s`（對齊 `LLM_SYNC_TIMEOUT_MS`）。

   > Info: (20260814 - Luphia) **`thinkingBudget` 未實作，且不影響成本上界**：thinking token 與正式輸出共用 `maxOutputTokens`（見 `src/constants/llm.ts` 的實測註解），因此單輪成本的天花板由 `maxOutputTokens` 一項就守住了。`thinkingBudget` 只改變「這個額度裡有多少可以拿去思考」，屬品質調校而非計費前提。原文把它列為 guardrail 之一是誤植（PR #6652 review D）。
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

> ⚠️ 這張表成立的前提是 guardrails 已上：若不設 `maxOutputTokens`，實測 thinking 模型單輪輸出可達 8,000+ tokens，成本翻倍、預扣上界不存在，計量計費直接失效。**guardrails 不是優化，是計費的一部分。**

**換算成用戶體感**（典型一輪 ≈ 3 點，對照 §4.1 額度）：

| 方案 | 每 5 小時約可對話 | 每週約可對話 |
|---|---|---|
| free | ~3 輪 | ~13 輪 |
| team | ~33 輪 | ~250 輪 |
| business | ~330 輪 | ~2,500 輪 |

數字若與產品期望的體感不符，優先調 §4.1 的方案額度 env，其次才動費率。

### 5.4 拆帳與封頂預扣（產品拍板 2026-08-13）

原本的管線是「單一來源、全額或不放行」：預扣塞不進訂閱額度就整筆改扣分配點數，兩者都不夠即 402。實測後果是**剩餘 3 點的用戶被一筆預扣 5 點的訊息完全擋死**，而錢包頁的儀表同時顯示「每 5 小時額度剩 30%」——兩個畫面都沒說錯，但對用戶而言就是壞的，而且那 3 點額度會在視窗重置時直接作廢。

新規則三條：

| # | 規則 | 理由 |
|---|---|---|
| 1 | **有餘額就放行**：`訂閱額度剩餘 + 分配點數 > 0` 即可送出，402 只在兩者同時見底時丟出 | 「還有點數卻不能用」無法對用戶解釋 |
| 2 | **拆帳**：訂閱額度先用光，差額才扣錢包（來源標記 `MIXED`） | 額度會週期性重置歸零，錢包點數是買來的；先用會過期的那一份 |
| 2b | **逐功能可反轉順序**（`FEATURE_SPEND_PRIORITY`）：物流碳足跡優先扣**分配點數** | 物流查詢低頻、單價固定（5 點）；對話類高頻且吃 5 小時視窗。讓物流去吃視窗額度，會讓同團隊的對話在尖峰被幾筆查詢擠掉。順序只改變「先動哪一邊」，不改總額與封頂行為 |
| 3 | **封頂預扣**：可用餘額不足全額時，預扣封頂到餘額；結算時的差額**追補到訂閱額度**（鍵 `topup:{原鍵}`），**絕不追扣錢包** | 額度是軟限制，§5.1 早已容許最後一筆超額；錢包是硬限制，零容忍負餘額。追補同時是防濫用關鍵——不記這筆，用戶就能靠「只剩 1 點」無限發長訊息 |

執行順序（`spend.service.ts`）刻意是**先扣錢包、後寫額度**：錢包是唯一可能條件失敗的一方（併發下餘額被扣走），放第一步能讓最常見的失敗路徑停在「什麼都還沒動」，不需要補償。額度寫入失敗才回頭沖銷錢包。

退差額則**先退錢包**再退額度（`splitRefund`）：分配點數是資產，額度到期即歸零，退回額度對用戶幾乎沒有價值。失敗補償（`refundCredits`）兩邊都要沖銷——只沖一邊會留下「錢包扣了但功能失敗」的懸帳，而那一半正是用戶花錢買的。

未列於 `FEATURE_SPEND_PRIORITY` 的功能一律 `QUOTA_FIRST`——新增功能預設沿用對用戶有利的順序，要改成 `ALLOCATION_FIRST` 必須明寫，避免悄悄多花用戶買來的點數。順序由 `featureCode` 決定，因此物流碳足跡以專屬代碼 `LOGISTICS_CARBON` 記帳（自訂單的 `data.category` 判定），全部記成 `AI_ANALYSIS` 就分不出來也對不了帳。

**封頂只適用於按用量計量的功能**（費思、碳盤查）。固定價格的消費——分析報告、物流查詢等**訂單類**扣款——必須傳 `allowPartial: false`（`ISpendParams`，**必填、無預設值**：兩種答案各自都會在對方的情境釀成帳務錯誤，沒有一個安全的預設可選，新增呼叫點必須先確認有沒有結算步驟）：它們沒有結算步驟，封頂會讓一張 5 點的訂單以 1 點成交，而沒有任何流程會回頭補收那 4 點。那是帳務上的漏，不是體貼。因此訂單類在餘額不足時整筆擋下，回 402。

相對地，前端在**按下支付之前**就要知道付不付得起：`useAnalysisPayment` 回傳所選團隊的可用額度（雙視窗剩餘的較小值 + 分配點數），`PaymentConfirmModal` 依當前來源（團隊／個人）比對金額，不足即顯示「點數不足」並停用支付鈕；個人來源在提示內附加購入口。讓用戶按下去、建了一張單、再收到 402，等於要他自己試錯，還在資料庫留下待處理訂單。

> 純函式層在 `src/lib/quota/spend_split.ts`（`resolveQuotaAvailable` / `splitSpend` / `splitRefund`），不碰 DB 與時鐘，可單測；`ISpendResult` 增列 `quotaAmount` / `allocationAmount` 拆帳明細，`ISettleResult` 增列 `toppedUp`。

#### 5.4.2 訂閱不發點數，額度是全團隊共用（2026-08-14 釐清）

兩個容易被誤解、且先前確實在畫面上說錯的點：

**一、訂閱不發任何錢包點數。** 三條履行路徑（webhook、綁卡直扣、續訂 cron）都只寫 `TeamSubscription`，不 mint 鏈上點數、也不入團隊池。付款畫面原本沿用購點文案顯示「獲得點數 1,500 點／有效 30 日」——那筆點數從未存在，而「30 日效期」全 repo 也沒有任何實作。現已改為說明額度視窗，訂單的 `credits` 一律帶 0，收據品項也改為描述方案與席次（`buildReceiptItemDescription`）。

**二、額度是「每成員」而非「每團隊」**（產品拍板 2026-08-14）。`sumWindowUsage` 以 `teamId + userId` 聚合，`TeamQuotaUsage.userId` 從純稽核欄位升格為聚合鍵。

改動前是全隊共用一池、先用先得——一位成員可以在一個視窗內用光整隊的額度，其他人直到重置前一律 402；而價格已改為隨席次線性上升，等於「人愈多、每個人分到的愈少、單價愈貴」。改為一人一池後，席次費買到的就是這個人自己的額度：

| 方案 | 每成員每 5 小時 | 每成員每週 | ≈ 每成員每 30 天 |
|---|---|---|---|
| free | 10 | 40 | ~171 |
| team | 100 | 750 | ~3,214 |
| business | 1,000 | 7,500 | ~32,143 |

每點成本因此與團隊規模脫鉤：團隊版 840 ÷ 3,214 ≈ **0.26 元/點**（不論幾席），企業版 2,940 ÷ 32,143 ≈ **0.09 元/點**；對照點數包 0.50–1.00 元/點。

> 對照組：`TeamWalletAllocation`（teamId + userId）本來就是逐成員的分配點數，與額度兩層並存——額度會週期重置、分配點數不會。

##### 2026-08-19 修訂：免費方案改回全隊共用一份（產品決定）

一人一池的對價是**席次費**：上面那句「席次費買到的就是這個人自己的額度」只對付費方案成立。免費方案沒有席次費，一人一池因此沒有對價依據——而它正是「20 人的免費團隊 ＝ 每週 800 點的模型用量、月費零」這個洞的來源，也是 2026-08-14 之後必須加上「免費版人數上限」的原因。

| 方案 | 額度範圍 | 加人的效果 | 人數上限 |
|---|---|---|---|
| free | **全隊共用一份**（每 5 小時 10 點、每週 40 點） | 不產生額度 | **無**（已移除） |
| team / business | 每位成員各自一份 | 每席各一份（席次費已收） | 由「席次 × 單價」自然封頂 |

實作要點（三處必須一起換，少一處就等於沒換）：

1. **聚合範圍**：`sumTeamWindowUsageInTx`（`where` 不含 `userId`）。
2. **鎖的粒度**：`withTeamQuotaLock`（`pg_advisory_xact_lock(hashtext(teamId), hashtext(teamId))`）。兩位成員各持自己的鎖時會同時讀到同一個 used、各自放行，超額幅度變成併發數 × 單筆，而 §5.1 容許的是一筆。
3. **畫面**：免費方案的「我的額度」用量顯示**全隊**的，全隊合計**不乘人數**。少了這一步，畫面會說「還有 80%」而送出訊息時被同事用掉的量擋下來。

> ⚠️ 已知取捨：**先用先得回來了**——一位成員可以在一個視窗內用光全隊的 40 點。這正是 2026-08-14 拍板要消滅的行為，但它消滅的理由是「付了席次費卻分不到」；免費版沒有付費，因此可接受，**但必須在方案頁與條款講明**，否則使用者會以為是缺陷。
>
> ⚠️ 鎖的窄縫：方案在視窗中途變更（升級生效、訂閱到期）時，同一團隊可能同時存在「持團隊鎖」與「持成員鎖」的請求，那個瞬間最壞情況是一筆超額——與 §5.1 已容忍的「最後一筆超額」同級，刻意不為它加第二把鎖。

#### 5.5.1 計費覆蓋：五條 LLM 路徑（2026-08-14 更正）

原文寫「四條 LLM 路徑全數接上」，實際上是**五條**——段落草稿與修訂（`chat/carbon/draft`）漏接了近一個月。它底下確實會呼叫 `recordLlmUsage`，但不在任何 `runWithUsageCapture` 範圍內，用量被 `usage_scope` 的 `if (!scope) return` 吞掉：成本照付、額度不扣，而條款寫的是「各項人工智慧作業均依實際使用量計費」。這是條款層級的不實陳述，不只是漏計費。

| 路徑 | 端點 | 冪等鍵前綴 |
|---|---|---|
| 對話 | `chat/carbon` | `carbon-chat:` |
| 附件萃取 | `chat/carbon`（管線第二段） | `carbon-attachment:` |
| 報告匯入 | `chat/carbon/import` | `carbon-import:` |
| 結構圖 | `chat/carbon/diagram` | `carbon-diagram:` |
| **段落草稿 / 修訂** | `chat/carbon/draft` | `carbon-draft:` |

AsyncLocalStorage 解決的是管線**內部**的傳遞；「把管線包起來」這一步仍然要有人記得做。因此新增 `carbon_billing_coverage.test.ts`：碳盤查端點只要引用了 LLM service 卻沒接 `runBilledCarbonTask` 就會紅，並同時守住「模型呼叫只從 `ChatService` 出去」這條（`business_monitor` 為已知例外，背景監控不計費）。

#### 5.4.7 402 的兩種成因與 checkout 的訂單型別白名單（2026-08-15，第二輪 C-5 / C-10）

**402 要說得出是哪一種不足**（C-5）。固定價格的消費（分析報告、物流查詢）失敗時，原因常常不是「這段時間用得太多」，而是**這張單本來就比整個視窗的額度貴**——免費版每 5 小時 10 點，而一張 AI 分析報告要 50 點。兩者共用同一個 402，畫面一律顯示「將於 X 重置」，等於請用戶去等一件不會發生的事。

payload 因此新增 `exceedsWindowLimit`（`cost > limit5h || cost > limitWeek`）：

| 情況 | options | 畫面 |
|---|---|---|
| 額度用罄（等重置會好） | `WAIT_RESET` + `USE_PERSONAL_WALLET` | 倒數與重置時間 |
| 單筆超過視窗上限 | `USE_PERSONAL_WALLET` + `UPGRADE_PLAN` | 說明原因，**不顯示倒數** |

型別守衛要求該欄位必須存在——缺了它而預設「等重置就會好」，正是這條 finding 要修掉的誤導。

**checkout 只接受用戶會互動付款的訂單型別**（C-10）。該端點的結尾是「鑄造個人點數」的 fallback，任何沒被前面分流攔下的型別都會落到那裡：席次補收中途失敗留下的 PENDING 訂單，使用者拿 orderId 打進來就會**再刷一次卡、鑄 0 點、席次也不增加**。改以白名單（`CHECKOUT_PAYABLE_ORDER_TYPES`）限制，新增型別必須明確歸類；伺服器自行發起的扣款（席次補收、自動續訂、後台發放）不在其中。

#### 5.4.6 額度讀寫的原子性與訂單冪等（2026-08-15，PR #6652 第二輪 C-6 / C-9 / B-3）

**額度：advisory lock 序列化。** 「先 SUM 再寫入」中間沒有互斥，併發的 N 個請求會讀到同一個 used、各自判斷「還有額度」、各寫一筆——超額幅度是 **併發數 × 單筆**，而 §5.1 容許的是「最後一筆超額」，指的是一筆。現以 `pg_advisory_xact_lock(hashtext(teamId), hashtext(userId))` 在交易內序列化同一成員的讀寫（`withMemberQuotaLock`）。

- 鎖的粒度是 (teamId, userId)：不同成員互不阻塞，同一成員的併發本來就只該有一個贏。
- 用 advisory lock 而非資料列鎖：要鎖的是「這個成員在這個視窗的用量總和」，那不是任何一列。
- 鏈上餘額的讀取刻意留在鎖**外**——那是一次 RPC，握著鎖等網路會把同一成員的其他請求一起拖住。

**追補記進結算當下的視窗**（C-7）。原本沿用預扣那一列的視窗 key，而匯入單章實測 87 秒、結構圖近 90 秒——跨過 5 小時邊界是常態。寫回舊視窗等於寫進一個已經過期的桶：`sumWindowUsage` 只看當前視窗，那筆超額完全不影響後續額度，「防止用戶靠只剩 1 點無限發長訊息」的作用歸零。結算時間由呼叫端另外注入（`settledAtSec`），維持視窗數學的決定論。

> 退款（`settle:`）方向相反，仍寫回**原視窗**：那是把當初多扣的還回去，記在原處才能讓該視窗的 SUM 與實際用量一致。兩者的差別是刻意的。

**訂單冪等鍵升格為唯一欄位。** 原本只寫在 `data.idempotencyKey`（JSON path），資料庫層擋不住任何東西：「先查有沒有、沒有就建一張」在並發下兩邊都會通過。現為 `Order.idempotencyKey @unique`，第二筆在 DB 層直接失敗（P2002），呼叫端翻譯成「重放」。讀取時先查欄位、再回頭找 JSON path，改版前的訂單不會因此被當成沒扣過。

- **席次補收**（B-3）：鍵為 `invite:{teamId}:{address}` / `add-member:{teamId}:{userId}`；`TeamInvitation` 另加 `@@unique([teamId, inviteeAddress, status])`，擋下兩位管理員同時邀請同一位址。帶 status 是因為受邀者被移出後應可再次邀請（舊列 ACCEPTED、新列 PENDING）。
- **後台發放點數**（C-9）：原本的鍵是 `admin-issue:{剛建立的 order.id}`，對重複點擊的保護是 0。改為 `admin-issue:{operator}:{teamId}:{amount}:{分鐘桶}`，訂單與入帳共用同一把鍵。

#### 5.4.4 扣費第二層改為成員的鏈上點數（2026-08-14，PR #6652 第二輪 A-1）

分配改為鑄到成員錢包之後（§6.2），扣費管線的第二層若仍讀離鏈的 `TeamWalletAllocation`，遷移一跑就永遠是 0——成員手上有 1,000 點，系統卻說他有 0 點並叫他去買。第二層因此改讀**成員自己的鏈上餘額**。

| 面向 | 規則 |
|---|---|
| 放行判準 | `訂閱額度剩餘 + 成員鏈上點數 > 0`（402 的第二層餘額也改報鏈上點數，畫面不再說謊） |
| 預扣 | **只從訂閱額度扣**，鏈上餘額僅參與「放不放行」的判斷 |
| 結算 | 差額（預扣被額度封頂的部分）優先自成員錢包 `burn` 一次扣清；扣不到才退回原本的「追補訂閱額度」 |
| 交易次數 | 高頻的額度消費仍完全離鏈；一次溢出消費**最多一筆**鏈上交易（不做預扣—退還的兩段式） |
| 固定價格訂單 | 不變：額度不足即 402，由前端切換到個人點數（既有的簽章付款路徑） |
| 逐功能扣款順序 | `FEATURE_SPEND_PRIORITY` 已移除——它排序的第二層現在是**成員的個人資產**，順序固定為「先團隊額度、後個人點數」 |

> ⚠️ **信任模型變更**：結算時的 `burn` 由伺服器以 agent 權限執行，沒有用戶當下的簽章。範圍限於已經發生的用量、每筆都有 txHash 可查，但這一點必須寫進服務條款（§3.3 / §3.5 已同步修訂）。

#### 5.4.5 席次補收的護欄與免費版人數上限（2026-08-14，PR #6652 第二輪 B-2 / B-4）

- **單期補收上限**：邀請開放 OWNER / ADMIN，但補收扣的是訂閱那張卡（持卡人是 OWNER），且屬 merchant-initiated。上限取「當期訂閱費的 2 倍」，超過即拒絕並記錄——正常擴編遠低於它，異常的批次邀請會撞上。
- **冪等鍵**：`invite:{teamId}:{address}` / `add-member:{teamId}:{userId}`。建立邀請失敗後客戶端重試時，這是唯一擋得住重複扣款的東西。
- **位址格式驗證**：原本只驗 `typeof === "string"`，任意字串都能觸發一次補收。
- **已扣款卻建不出邀請**：標記訂單為「已收款未履行」並寫入原因，不留靜默的懸帳。
- ~~**免費版人數上限**（`FREE_PLAN_MAX_MEMBERS` 系統設定）~~ → **已於 2026-08-19 移除**。它存在的理由是「額度逐成員化後免費版沒有封頂」，而免費方案的額度已改回**全隊共用一份**（見 §5.4.2 的 2026-08-19 修訂）——加人不再產生額度，上限、邀請端與接受端的兩道防線、以及方案頁的人數標示因此一併移除。方案頁改為標示「團隊人數不限，額度全隊共用」。系統設定鍵**刻意保留為 deprecated**：`loadSnapshot` 遇到未知鍵會把整組設定判為 UNTRUSTED（該狀態下每一個設定都丟錯），直接刪定義會讓曾設過該值的環境在部署當下全站失能，移除順序見部署檢查表 §3.5。
- **收據限本人取用**（2026-08-15，第二輪 §E）：`getOrCreateReceipt` 的 `userId` 改為必填，訂單以 `{ id, userId }` 查詢，且**先驗擁有者再取收據**。原本只憑 orderId 查詢而端點只檢查登入，任何登入者換一個 `order_id` 就能取得他人收據（金額、買方姓名、buyerId）。查無與無權一律回同一個 404，不讓回應差異透露訂單是否存在。

#### 5.4.3 金流成功的判準與席次單價的前提（2026-08-14，PR #6652 第二輪）

**成功＝HTTP ok 且業務碼 `S0000`。** 原本寫成「業務碼不是成功 **且** HTTP 不 ok」才算失敗——要兩個失敗訊號同時出現。金流商以 HTTP 200 回覆業務層失敗是常見做法，那時整個條件為 false，於是卡片被拒會走完成功路徑：開收據、訂單 COMPLETED、席次照加、續訂照展延，而錢一毛沒收到（續訂更會因為狀態轉回 ACTIVE 而永遠不再進入寬限期降級）。`code` 缺漏時一律視為失敗並記錄——無法確認收到錢就不能宣稱收到。兩處（`team_billing.service` 與 checkout 路徑）都已修正。

**`unit_price` 為 0 的付費訂閱是資料異常，不是零元零頭。** 該欄位是新增的，預設 0，而本專案沒有 migrations 目錄（schema 由部署流程套用），因此部署當下所有既有訂閱都是 0。若照零元路徑放行，整個計費週期內加人全部免費、不建單、不寫 log，而「沒卡不准加人」的防線在零元分支之後才檢查也會一併失效。現改為拒絕並記錄（`TW000015`），零元只保留「期末剩餘時間的零頭」這個正當情形。部署時須執行 `scripts/backfill_subscription_seats.ts` 回填 `seats` 與 `unit_price`。

#### 5.4.1 重放、重試與退款守恆（2026-08-14，PR #6652 review）

三條規則補在同一處，因為它們是同一個誤解的三種後果：**冪等鍵保護的是「扣款」，不是「工作」**。

| 規則 | 為什麼 |
|---|---|
| `ISpendResult.replayed` externalises 重放 | 早退只回傳成功、呼叫端照常跑 LLM，同一把鍵重送 N 次＝1 次扣款 + N 次模型呼叫。碳盤查與費思都改為**重放不重跑**，回 `TW000013` |
| 已全額退還者視為**重試**，改用 `{原鍵}#retry{n}` 重新扣款 | 沿用原鍵會撞 `createUsage` 的 unique 衝突而被默默吞掉——不扣款卻照跑。重試上限 20 輪 |
| 退款守恆：只退「尚未退還的部分」 | 結算退差額用 `settle:`、失敗補償用 `refund:`，兩把鍵各自只擋自己重複；先部分退再全額退會憑空多退（預扣 6、已退 2、再退 6 → 淨 −2）。守恆同時實作於 service 與 `team_wallet.repo`（repo 層扣掉既有 REFUND 分錄），因為「記得多讀幾把鍵」下一個呼叫端還是會忘 |

> 結算與退款一律使用 `spendCredits` **回傳的** `idempotencyKey`（重試時是衍生鍵），不能用呼叫端原本那把。

**個人點數路徑的失敗補償**：`runBilledCarbonTask` 的無帳本分支是「先收款再服務」，因此工作失敗時以伺服器代簽鑄回點數（`refundPersonalCreditCharge`）。鑄回失敗不丟錯（原始工作錯誤對用戶更重要），但會在訂單寫下 `refundOwed` 並記錄——讓它成為看得見的欠款，而不是靜靜消失。

### 5.5 碳盤查（智能碳盤）計費（產品拍板 2026-08-13）

碳盤查與費思打同一個模型、同一種成本，因此**沿用同一套規則與同一份費率設定**（`FaithBillingSetting`，1,000 tokens = 1 點）：token 計量、預扣—結算、失敗全額退還。分兩套費率只會在後台調參時忘記其中一邊。

| 面向 | 規則 |
|---|---|
| **計費團隊** | 由會話綁定的帳本推導：`Chatroom.accountBookId` → `AccountBook.teamId`，與費思同一條路徑（`assertAccountBookMember` 驗權），client 不自報 teamId |
| **冪等鍵** | `carbon-chat:{userId}:{clientMessageId}`，前端每則訊息帶一次性 id；重試與雙擊不重複扣點 |
| **預扣** | `estimateFaithHoldCredits(輸入字元數, 有無附件, 設定)`，與費思同一函式 |
| **結算** | 以 SDK `usageMetadata.totalTokenCount` 為準；**SDK 未回報時收斂為最低 1 點**，不憑空推估（推估的數字在點數歷程裡無法查證） |
| **失敗** | 工作拋錯即全額退還預扣（§5.2） |
| **額度不足** | `spendCredits` 上拋 402，**LLM 不會被呼叫**——先確定付得起再花錢 |

實作上以 `runBilledCarbonTask()`（`src/services/carbon_billing.service.ts`）包住任何一次碳盤查的 LLM 工作，呼叫端只需提供 `channel`、冪等鍵、輸入量與 `run()`。

**用量以捕捉範圍累加，而非逐層回傳**（`src/lib/llm/usage_scope.ts`）：重成本路徑都是 fan-out——匯入一次可 fan-out 到十餘次 LLM 呼叫。逐層回傳 usage 等於把萃取、草稿、匯入、結構圖四條服務的簽名全部改一遍，而且**只要有人新增一個呼叫忘了往上傳，那次用量就靜靜地不計費**。改以 `AsyncLocalStorage`：`ChatService.invokeGuarded`（所有 LLM 呼叫的唯一入口）每次成功後把用量記進當前範圍，計費層包住整條管線即可拿到總量——新增的呼叫自動被涵蓋，**預設計費而不是預設漏計**。範圍外（executor、背景 worker）為 no-op，零影響。

#### 上線範圍

| 路徑 | 冪等鍵前綴 | 預扣估算依據 | 狀態 |
|---|---|---|---|
| 對話 `POST /chat/carbon` | `carbon-chat:` | 送給 AI 的歷史字元數 | ✅ |
| 附件萃取 → 段落草稿（同一支請求內） | `carbon-attachment:` | 附件位元組總和 | ✅ |
| 報告匯入 `POST /chat/carbon/import`（三模式共用） | `carbon-import:` | 來源檔位元組數 | ✅ |
| 結構圖 `POST /chat/carbon/diagram` | `carbon-diagram:` | 段落內容長度 | ✅ |
| 碳排計算 `POST /chat/carbon/calculate` | — | — | ➖ **不需計費** |

**碳排計算為何不計費**：`CarbonCalculationService.computeLedger()` 是**決定論規則引擎，完全沒有 LLM 呼叫**（CLAUDE.md §7：計算收斂到 TypeScript）。它的成本是 CPU 不是 token，按 token 計費無從計起。這不是遺漏，是它本來就不該在這張表上。

附件與匯入各自獨立計一筆而非併入對話：它們是 fan-out 管線（萃取 1 次 + 每段草稿各 1 次；匯入逐章逐節），與對話共用一把鍵會讓兩者用量混在同一筆而無法分辨；預扣依據也不同——那兩條的輸入量來自檔案，不是訊息長度。

#### 無帳本會話：改扣個人鏈上點數（產品拍板 2026-08-13）

`Chatroom.accountBookId` 可為 null（舊的個人會話）。沒有帳本就沒有計費團隊，但**不因此擋下用戶**——改由他自己的點數付。

個人點數只存在鏈上（§2 事實 2），扣款必須有 WebAuthn 簽章，因此**無法在同一次 HTTP 請求內同步完成**。流程拆成兩段：

```
1. 伺服器以冪等鍵建立（或找回）一張待付訂單 → 402 TW_PERSONAL_PAYMENT_REQUIRED，payload 帶 orderId
2. 前端以既有 useOrderTransaction 的 payExistingOrder() 付款
   ├─ 託管帳號（第三方登入）：簽章由伺服器代行 → 體感就是直接扣
   └─ passkey 帳號：提示裝置簽章一次
3. 前端以**相同的 clientMessageId** 重送 → 冪等鍵不變 → 找回已付訂單 → 工作放行執行
```

三個刻意的選擇：

- **先收款再服務**。反過來做等於允許賴帳，而鏈上扣不到就沒有任何強制力。
- **以冪等鍵找回既有訂單，不重複建單**。否則用戶重送幾次就會堆出一串幽靈待付訂單，而他只想付一次。
- **這條路徑不做預扣—結算**，以預扣估算（輸入估算 + 回覆上限）一次收足。鏈上退差額要再一筆交易與簽章，成本高於差額本身。因此個人點數路徑屬**保守計價**——綁定帳本即可改走團隊額度管線，享實耗結算與退差額。這個差別是引導綁帳本的正當理由，不是懲罰，但**須於介面說明**，否則用戶會覺得同一句話在兩種情境下價格不同。

實作：`src/services/personal_credit.service.ts`（建單與冪等查找、`PersonalPaymentRequiredError`）、`src/lib/utils/billing_response.ts`（兩種計費失敗的統一 payload 映射，含保活式串流端點專用版本）、`use_order_transaction.payExistingOrder()`（自既有付款流程抽出，行為不變）。

> ⚠️ 目前只有**對話**路徑接上「付款後自動重送」。匯入與結構圖在無帳本會話下會收到同一個 402，但前端尚未接付款流程——那兩條的入口本來就在已綁帳本的報告編輯情境，實際遇到的機率低，仍列為待補。

#### 開放問題

1. ~~**無帳本的個人會話**~~ → **已拍板（2026-08-13）：無帳本會話改扣用戶自己的鏈上點數**（見下節）。既有會話因此不會被擋死，也不再有不計費的用量。
2. **附件與匯入的預扣估算**：這兩條路徑的輸入量不是「訊息字元數」，預扣公式需另訂（例如以附件位元組數或章節字數估算），否則封頂預扣會頻繁觸發追補。
3. **費率命名**：設定表名為 `FaithBillingSetting` 卻同時服務碳盤查，語意已不精確；改名需 migration，列入後續整理。

### 5.6 多團隊成員的支付歸屬（產品拍板 2026-08-13）

一位用戶可同時被多個團隊邀請（事務所顧問服務多家客戶是常態）。這帶出兩個必須分開回答的問題。

#### 問題一：訂閱費會不會重複付？

**不會重複，但每個團隊各付一席**——同一人被 3 個團隊邀請，3 個團隊各為他付一席月費。

席次買的不是「這個人」，而是**這個人在該團隊裡的工作位置**：他在 A 團隊用的是 A 的帳本、A 的額度、A 的資料，與 B 團隊完全隔離（連費思的長期記憶都是 `(userId, teamId)` 隔離，見費思記憶規範 §3.1）。若改成「一人只計一席、多團隊共用」，等於讓後加入的團隊白用前一個團隊付的錢，而且無從決定該由誰付。

> ⚠️ 這點**必須在條款與方案頁講明**，否則用戶會直覺認為「我一個人只該被算一次」。

#### 問題二：他操作時，扣哪個團隊的額度？

原則：**由操作情境決定，不由用戶挑**——但情境並非總是存在。

| 情境 | 有無帳本 | 扣款歸屬 |
|---|---|---|
| 費思對話 | 有（選定帳本才能用） | 帳本所屬團隊，**不可覆寫** |
| 碳盤查（對話 / 附件 / 匯入 / 結構圖） | 有（會話綁帳本） | 會話帳本所屬團隊；無帳本會話扣個人鏈上點數（§5.5） |
| AI 分析、物流碳足跡 | **無**（訂單不帶 `accountBookId`） | 見下 |

無帳本情境的規則（本節新增）：

1. **只屬於一個團隊** → server 自動以該團隊扣抵，不需詢問，也不接受指定別的團隊。
2. **屬於多個團隊** → 必須**明確指定**付款團隊（UI 顯式選擇，非預設值），server 驗證成員資格後扣抵並記錄於訂單。歧義不該由系統猜：猜錯的後果是某個團隊莫名其妙被扣了額度。
3. **不想用團隊額度** → 走既有個人鏈上點數簽章流程。

實作上 `POST /order/[order_id]/team_quota_payment` 的 `teamId` 改為**選填**：省略時由 server 解析（唯一團隊才成立），多團隊而未指定即回 `TW_TEAM_AMBIGUOUS`，讓前端知道要出選單而不是隨便挑一個。授權面本來就安全（`spendCredits` 會驗成員資格），這裡治的是**歸屬歧義**。

前端由 `useTeamQuotaPayment()`（建單 → 扣抵，**免簽章**）與 `PaymentSourceSelector`（付款來源與團隊選單）承接：

- 沒有任何團隊 → 選擇器不出現，行為與此前完全相同（走個人鏈上點數）。
- 只有一個團隊 → 顯示團隊名稱但不給選單；送出時不帶 `teamId`，由 server 解析。多問一步只為消除歧義，不該讓每個人每次都選一遍。
- 多個團隊 → 出選單；未選而送出時 server 回 `TW_TEAM_AMBIGUOUS`，選擇器隨即標紅並說明「為什麼要選」——不說的話用戶會覺得系統在刁難，說了他才知道這關係到哪個團隊被扣額度。

#### 統一的付款入口（2026-08-13）

系統裡有 **6 個付款呼叫點**，原本各自接一次 `useOrderTransaction` + `PaymentConfirmModal`。後果是「支援團隊額度」變成每個站點都要記得補的事——里程試算就是漏掉的那一個，直到使用者回報才發現。

改以 `useAnalysisPayment()`（`src/hooks/use_analysis_payment.tsx`）作為單一入口，它是 `useOrderTransaction` 的**同介面替換品**：

| 原本 | 統一後 |
|---|---|
| `executeOrderTransaction(payload, cost, onPaid)` | `pay(payload, cost, onPaid)`（簽名相同） |
| 各站自行實作來源選擇 | `paymentSourceNode` 塞進 modal 的 `extraContent` |
| `resetTransaction()` | `reset()` |

因此每個站點的遷移是三行改動，而「兩種付款來源」從此是**模組的性質**，不是各站的功課。已遷移：物流分析、里程試算、AI 諮詢室、AI 分析報告、憑證掃描、憑證上傳。

團隊路徑的狀態映射成既有 modal 認得的 `PaymentStatus`，各站的 modal 一行都不用改；`needs_team` 刻意映射為 `idle`——「還沒選團隊」不是付款失敗，畫面要維持可操作。`useJournalAnalysis` 的付款函式型別也一併放寬（`transactionHash` 與簽章欄位改選填）：團隊額度是離鏈扣抵，沒有鏈上交易，硬性要求那些欄位會讓這條路徑在型別上就過不去。

規則由 `analysis_payment_contract` 測試釘住：任何直接使用 `useOrderTransaction()` 的畫面、或解構了 `paymentSourceNode` 卻沒渲染的站點，都會讓 CI 紅字（已驗證兩者都會失敗）。

#### 分配點數不跨團隊

`TeamWalletAllocation` 的鍵是 `(teamId, userId)`：同一人在 A 團隊有 500 點、在 B 團隊有 0 點時，於 B 的操作**不會**動用 A 的餘額。點數是團隊資產，管理者分配給成員是在自己團隊內的授權，不是給那個人的錢。

---

## 6. 團隊錢包購買與分配

### 6.1 購買（OWNER / ADMIN）

重用既有 OEN 金流骨架，只新增訂單型別：

1. `POST /api/v1/user/team/[team_id]/wallet/purchase`：body 帶 `creditPlanId`（沿用 `src/config/credit_plans.ts` tier1–6）→ 建 `Order`，`type = ORDER_TYPE.BILLING_TEAM_POINT`（**新常數**），`data` 內含 `teamId` + `credits`。
2. 走既有 `payment_method/[id]/checkout`（已綁卡免跳轉）或 OEN checkout-token 流程。
3. OEN webhook → `processOenPayment()` 的 `$transaction` 內**分流**：`type === BILLING_TEAM_POINT` 時不 mint 鏈上點數，改為 `TeamWallet.unallocatedBalance += credits` + Ledger(PURCHASE, orderId)。冪等鍵 = `purchase:{orderId}`，webhook 重送不重複入帳。

#### 6.1.1 入口與訂單歸屬（2026-08-14 補）

上述端點寫好之後，有很長一段時間**沒有任何前端呼叫**——團隊訂閱與團隊購點在畫面上不存在，而定價頁的訂閱悄悄走成了另一條路：`onSelectSubscription` 打通用的 `POST /api/v1/user/order`，型別是 `OEN_PAYMENT`、訂單裡沒有 teamId，履行時落到「鑄造個人點數」的 fallback。結果是用戶付了訂閱費、拿到等值個人點數、團隊方案一秒都沒生效，而畫面顯示付款成功。

現在定價頁的訂閱與點數包都必須先選歸屬對象（`usePurchaseTarget` + `PurchaseTargetSelector`）：

| 消費 | 可選對象 | 權限 | 建單端點 |
|---|---|---|---|
| 團隊訂閱（team / business） | 只有團隊 | OWNER | `PUT /team/{id}/subscription` |
| 點數包（tier1–6） | 個人或團隊 | 團隊需 OWNER / ADMIN | 個人：`POST /user/order`；團隊：`POST /team/{id}/wallet/purchase` |
| 客製方案（on_premise、iso*、carbon_label） | 不適用 | — | 匯款，由業務接手 |

未選定對象時支付鈕停用並說明原因（不是擁有者、還沒有團隊、尚未選擇）——沒有歸屬的訂單付得掉卻履行不了，而錢已經收了。規則收斂於 `src/lib/purchase/purchase_target.ts`（純函式、可單測）。

**訂閱金額為「單價 × 席次」**（2026-08-14，規範 P2）：`changeTeamSubscription` 於 server 端取團隊人數計算，訂單以頂層 `seats` / `unitPrice` 帶入履行路徑並寫進 `TeamSubscription`；續訂依當下人數重算。期中加人由 `chargeSeatAddition` 以綁定卡即時比例補收（訂單型別 `BILLING_SEAT_ADDITION`），**先扣款成功才建立邀請**。細節見[席次計費規範](team_seat_billing_and_email_invitation.md)。

**訂單欄位位置是硬性規定**：`teamId` 必須以**頂層欄位**傳給 `generatePaymentOrder`。該函式把整包 params 展開成 `order.data`，放進 `params.data` 的欄位會沉到 `order.data.data` 底下，而兩條履行路徑讀的都是 `order.data.teamId`。這正是先前兩支團隊端點即使被呼叫也履行不了的原因（`src/__tests__/team_order_payload.test.ts` 守住這件事）。

**履行失敗不再靜默**：缺 teamId / 缺 planId / 入池被拒時，訂單推進到 `MINT_FAILED` 並在 `data.error` 寫明原因，前端訂單查詢與後台訂單管理都認得。webhook 內刻意不 throw——交易回滾會連收款紀錄一起抹掉，金流商還會重送，錢收了卻查無此事比履行失敗更難處理。

### 6.2 分配 / 收回（OWNER / ADMIN）

> **2026-08-14 修訂（產品拍板）：分配即鑄到成員的區塊鏈錢包。**
> 「團隊分配給成員的點數」這個概念取消——分配出去的就是成員的個人點數，
> 在任何情境都能用，不限於該團隊。詳見 [ADR 015 的 2026-08-14 修訂段](decisions/015_offchain_team_wallet_ledger.md)。
>
> - **ALLOCATE**：池條件扣款（DB）→ 鑄到成員位址（鏈上）→ 回填 `txHash`；鑄造明確失敗即寫反向 `ADJUST` 補回池。成員沒有錢包位址時當場拒絕（`TW000014`），不會出現「扣了池卻沒人收到」。
> - **REVOKE**：銷毀成員錢包中的點數（鏈上）→ 回補池。**上限為 `Σ ALLOCATE − Σ REVOKE`**——鏈上分不出哪些是團隊給的、哪些是成員自費買的，沒有這道上限就等於允許團隊銷毀他人資產。成員已花掉的部分收不回來。
> - **成員移除**：**沖銷**分配餘額（2026-08-18 修訂）——歸零但**不回池**，分錄為負的 `ADJUST`。收回做不到（點數在成員自己的鏈上錢包裡，移出必須有持有人簽章，而被移除的成員不會去簽；2026-08-18 更正：不是「合約層面做不到」——扣款以持有人簽章就做得到），而加回池等於同一筆價值存在兩份（成員錢包裡的鏈上點數 + 團隊可再鑄一次的額度）。舊的離鏈餘額走同一條路。
> - **消費路徑不變**：仍然完全離鏈。上鏈的只有分配 / 收回這兩個低頻的管理操作。
>
> 遷移：`scripts/migrate_allocations_onchain.ts`（鑄造成功才歸零，冪等，預設預演）。

#### 6.2.1 原始設計（改版前，舊資料仍適用）



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

> **2026-08-19 修訂：團隊 ADMIN 角色已取消。** 理由是結構性的——ADMIN 握有「會花 OWNER 的錢」的權限卻不是持卡人：邀請成員會即時向訂閱那張卡補收席次費用，而那是 merchant-initiated 交易、沒有持卡人當下的授權。先前為此加的兩道補丁（單期補收總額上限 TW000016、只有 OWNER 能授予 OWNER）都是在補同一個洞。既有的 ADMIN 成員由 `scripts/backfill_remove_team_admin.ts` **降為 EDITOR**（降級而非升級：失去權限可由 OWNER 個別補回，多發權限收不回來）。

| 操作 | OWNER | EDITOR / VIEWER |
|---|---|---|
| 變更訂閱方案 | ✅ | ❌ |
| 購買團隊點數 | ✅ | ❌ |
| 分配點數 | ✅ | ❌ |
| 邀請 / 移除成員、變更角色 | ✅ | ❌ |
| 查看錢包全貌與 Ledger | ✅ | 僅見自己的分配餘額與額度狀態 |
| 消耗額度 | ✅ | ✅ |
| 編輯帳本內容 | ✅ | EDITOR ✅ / VIEWER ❌ |

授權檢查抽成 `src/services/team_wallet_access.guard.ts`（沿用 `account_book_access.guard.ts` 慣例），API 層不寫角色判斷。

### 6.5 訂閱的鏈上鏡像：會員卡 NFT（2026-08-19）

**症狀**：訂閱付款完成、`TeamSubscription` 也寫進去了，但（一）鏈上沒有任何憑證，（二）畫面右上角與方案頁都還顯示「免費版」。

兩件事的成因不同，一起修但要分開理解。

#### 6.5.1 方案一律讀 DB；「鏈上為準」只涵蓋會員卡本身（產品裁定 2026-08-21）

> 本節曾寫「顯示以鏈上為準、DB 為快取」（2026-08-19 – 08-20 的三個版本），已由產品裁定**更正**：「鏈上為準」的範圍只有**會員卡本身的狀態**（卡片是否存在、metadata、持有人）；金流交易只存在 DB，**付款完成即視為會員卡有效，不論鏈上是否已完成鑄造**。任何「鏈上沒有卡 ⇒ 沒有方案」的推論都是錯的。

錯誤推論的代價已經實際發生過（review #6687 阻擋級）：`mintCard` 用 `_safeMint`，而現有的每一個 SCW 都沒有 `onERC721Received`——鑄卡對所有使用者必定 revert；顯示又採信鏈上，於是重試用盡後**付費客戶被顯示成免費版**，這正是整個 PR 開頭要修的症狀。

| 入口 | 用途 | 來源 |
|---|---|---|
| `getUserPlan()` | 徽章、方案頁的「目前方案」 | **純 DB**（一次查詢，零 RPC） |
| `getTeamEntitlement()` | 扣費、席次補收、額度、記憶保留 | 純 DB，fail-closed |

隨裁定移除的東西：`reconcilePlan` / `isChainCopyStale` / `resolveChainCardPlan` / `PLAN_SOURCE`（沒有第二個來源，就沒有東西要對帳）、`/auth/me` 的 `planSource` 欄位、顯示路徑的整條鏈上讀取與它的逾時保護。守住它的兩道測試：`plan_service_chain.test.ts` 把 viem mock 成炸彈（顯示路徑打任何 RPC 當場紅）、掃描測試釘住 `plan.service` 不 import 鏈上讀取。

卡片仍然照鑄（worker），但定位是**純鏡像**：它的存在與否、新舊與否，都不影響任何顯示或權益。

#### 6.5.2 為什麼是背景同步

履行訂閱在付款交易裡完成（webhook 路徑 `processOenPayment` 原子套用、綁卡路徑 `fulfillTeamSubscriptionOrder`）。把鏈上寫入放進那條路徑有兩個代價，兩個都不能接受：

- **失敗會污染付款結果**：錢已經收了，鑄卡失敗若讓履行拋錯，使用者看到「付款失敗」卻已被扣款。
- **成功也要等**：確認一筆交易是數秒等級，那段時間掛在使用者的付款請求上。

因此訂閱一經變更就在 `TeamSubscription` 留下待辦（`nft_synced_at = NULL`），由 worker（`SubscriptionCardSync`，每分鐘）補上。卡片晚一分鐘出現不影響任何權益。

#### 6.5.3 冪等與重試

| 機制 | 欄位 | 少了它會怎樣 |
|---|---|---|
| 內容指紋 | `nft_fingerprint`（`plan:periodEnd:seats`） | worker 每分鐘重鑄一張。合約沒有 burn，於是同一個訂閱在鏈上留下多張都看起來有效的卡 |
| 卡號 | `nft_token_id` | 續期時無從判斷「鑄新的」還是「換 URI」 |
| 重試上限 | `nft_sync_attempts`（上限 5）＋ `nft_sync_error` | 永久性失敗（地址被列入黑名單、管理員錢包缺角色）會每分鐘燒一次 gas 估算 |

- **鑄造前的三道前置**（2026-08-21，review #6687 阻擋級 / 高-1 / 高-3）：（一）**探針** `supportsInterface(0x150b7a02)`——現有 SCW 沒有 `onERC721Received`，`_safeMint` 必定 revert；探針 false 時跳過、不算失敗、不燒重試（`walletNotReady` 計數），錢包升級（ADR 021）完成的下一輪自動開始鑄造。（二）**認養**——鑄之前先以事件掃描找這個團隊的既有卡，找到就認領而不再鑄（「鏈上成功、DB 沒寫成」的中斷會留下 DB 不知道的卡，而合約沒有 burn）。（三）**認領**——以 `nftSyncAttempts` 當樂觀鎖（`updateMany where attempts = 觀察值`），兩個 worker 同列只有一個搶得到。候選排序改為**付費優先、新到舊**（原本的 `updatedAt asc` 在首次上線時正好把剛付費的人排到整批積壓的最後面）。
- `tokenId` **只認收據裡的 `Transfer(from=0x0, to=持卡人)` 事件**，不用 `simulateContract` 的回傳值：後者是模擬當下的 `_nextTokenId`，中間有人鑄一張就偏一號，而 `setTokenURI` 只檢查 `_requireOwned`——偏一號會把**別人那張卡**的 metadata 覆寫掉。找不到事件時當失敗重試，不寫一個猜的卡號。
- 鏈上環境未備妥（本機、未部署合約）時**整輪停手**，不逐列記失敗：否則每個團隊的重試額度都會被一個與它們無關的原因燒完。
- 降級（到期、PAST_DUE、改回 free）會換 URI 把卡片標成非有效；**不重鑄、不銷毀**（合約沒有 burn）。換 OWNER 不搬卡——卡片鑄出後只有持有人能轉，平台再鑄一張等於憑空多一份有效憑證（開放問題見 §10）。
- metadata 以 `data:application/json;base64,` 自帶內容，不上 IPFS：為了一段 200 位元組的 JSON 增加一整條會失敗、會逾時的外部依賴不值得。

#### 6.5.4 方案顯示（`GET /auth/me`）

`/auth/me` 原本**一個 plan 欄位都沒回**（唯一痕跡是一段被註解掉的鏈上讀取），因此前端 `user.plan` 永遠 undefined，畫面一律 fallback 成免費版。現改由 `plan.service.getUserPlan()` 回：

| 欄位 | 內容 | 用途 |
|---|---|---|
| `plan` | 擁有的團隊中**最高**的有效方案（純 DB 折算） | 右上角徽章 |
| `ownedPlans` | 擁有的每個團隊的有效方案（逐團事實） | 方案頁的「目前方案」標記 |

> `planSource` 欄位已隨 2026-08-21 裁定移除（§6.5.1）：方案只有一個來源（DB），沒有「來源」要分辨。

**同一件事有兩個對外入口，兩邊都要說得出依據**（2026-08-20 self-review；2026-08-21 更新）：`GET /auth/me` 的 `plan` 是**顯示**答案，`GET /subscription` 的 `planId` 是**權益**答案——裁定後兩邊都是純 DB 折算（`resolveEffectivePlanId`），同一份資料、同一個判準，**不再可能不同**。`/subscription` 仍回 `cardSyncPending`：那說的是鏈上「憑證」的同步進度，與方案答案無關。

**方案目錄也集中在同一個 service**：`listPlans()` 是「有哪些方案、各自的價格／月配點／儲存／額度」的唯一讀者，`getPlanUnitPrice()` 是收費金額的唯一出口。在此之前價格常數有四處讀者（方案卡、付款容器、建單、續訂 worker），而「改價漏掉其中一處」不會有任何測試發現——症狀是使用者看到一個價格、卡被扣另一個。掃描測試（`subscription_plan_display_wiring.test.ts`）現在擋著：除了常數定義處與 `plan.service`，沒有檔案讀得到那些常數。

純規則（折算、比較、對帳）在 `src/lib/subscription/plan_rules.ts`，只依賴 constants（方案頁的 client component 會匯入它）。原本 `resolvePlanId` / `resolveEffectivePlanId` 住在 `spend.service`，那讓「什麼是有效方案」有兩個門。

- 範圍是**擁有（OWNER）的團隊**，不是所有參與的團隊：訂閱只有 OWNER 能買，「我的方案」問的是「我付費買到什麼」。若採所有參與的團隊，一位免費戶被邀進別人的團隊版就會看到自己是團隊版，而方案頁那一格的購買鈕會因此停用——他反而買不了。
- 方案頁的標記規則是**全體一致才標**（`resolveUnanimousPlan`），不是取最高：那個標記會停用購買鈕，照最高標會讓「擁有一個免費團隊 + 一個團隊版團隊」的人再也無法為前者訂閱團隊版。
- 有效方案一律經 `resolveEffectivePlanId`：過期、PAST_DUE 都折算成 free，與扣費側同一個判準。畫面說團隊版而額度按免費版扣，比顯示免費版更糟。
- 查詢失敗**不讓登入壞掉**：退成免費版顯示並留 log。`/auth/me` 是所有畫面的前置條件，讓徽章用的查詢把整個 session 拖下去，代價與收益不成比例。

診斷用（唯讀）：`npx tsx scripts/diagnose_subscription_state.ts --address 0x…` 會分開印出「DB 的訂閱原值 / 折算後的有效方案 / 鏈上卡片狀態 / 最近的訂閱訂單」——「畫面顯示免費版」有兩個成因（顯示端沒接線、或履行端沒套用訂閱），這支讓兩者不會被混為一談。

---

## 7. API 一覽（App Router，`src/app/api/v1/user/team/[team_id]/` 下）

| Method + Path | 用途 | 權限 |
|---|---|---|
| `GET /subscription` | 方案、計費週期、雙視窗剩餘額度與 `resetAt`、`faithTokensPerCredit` 費率（供未來揭露介面用，§5.3） | 成員 |
| `PUT /subscription` | 變更方案：**升級**建 `BILLING_SUBSCRIBE` 訂單立即生效；**降級**只排程（`pendingPlanId`），當期屆滿才生效（§7.1） | OWNER |
| `GET /wallet` | 池餘額 + 自己的分配餘額（管理者另含全員分配總表） | 成員 |
| `POST /wallet/purchase` | 購買點數入池 | OWNER / ADMIN |
| `GET /wallet/allocations` | 全員分配清單 | OWNER / ADMIN |
| `POST /wallet/allocations` | 分配 / 收回 | OWNER / ADMIN |
| `GET /wallet/ledger` | 流水帳（分頁，`sortSpecSchema`） | OWNER / ADMIN |

### 7.1 降級不期中生效（2026-08-20 修正）

**先前的行為與對外承諾相反。** `PUT /subscription` 對 free 是「免付款直接降級」——當場把 `planId` 改成 free，額度立刻掉到免費版；而《退款政策》§2.1 寫的是「一旦取消或降級，您的變更將於當前結算週期結束後自動生效」，並明言不按比例退費。**收了整期的錢、當場收回權益**，兩者不能並存，而承諾的那一側才是對的。付費→付費的降級更糟：走建單路徑會再收一次錢，並把週期從當下重新起算。

| 變更 | 生效時點 | 收費 | 實作 |
|---|---|---|---|
| 升級（含同方案續購／改計費週期） | 立即 | 立即建單 | 原路徑不變 |
| 降級為較低的付費方案 | 當期屆滿 | 不收費；期末續訂以新方案計價 | `pendingPlanId` + `autoRenew` 維持 true，續訂 worker 讀 `pendingPlanId` |
| 降級為 free | 當期屆滿 | 不收費 | `pendingPlanId = free` + `autoRenew = false`，期末由 `expireOverdue` 落地 |
| 取消排程（改回原方案） | 立即 | 不收費 | `cancelPendingPlanChange`（一併恢復 `autoRenew`）。**以「不帶 `paymentMethodId`」表達**——帶了就是購買 |

- **判準只有一個**：`isPlanDowngrade`（`PLAN_RANK` 比較，`src/constants/subscription_quota.ts`）。散在服務層各判一次的話，遲早有一條路徑讓降級立即生效。
- **`GET /subscription` 揭露 `pendingPlanId` / `pendingEffectiveAt`**：當期 `planId` 仍是原方案，使用者需要看得出「我按過降級了」——否則按下去畫面沒變，他會再按一次，而那一次會被當成升級（建單、收整期的錢）。
- **排程在週期邊界被清掉**：`applyTeamSubscriptionInTx`（新週期套用）、`expireOverdue`（降到 free）、`downgradeToFree`（寬限期用盡）三處都清 `pendingPlanId`。留著的話下一期會再降一次。
#### 7.1.1 重複訂閱：擋重複扣款，不擋重複購買（2026-08-20 self-review）

分析「狀態會不會讓使用者不能再訂閱」時發現**兩個方向都錯**：合法的再次購買被 UI 擋住，而真正該防的重複扣款沒有防。

| 問題 | 原因 | 修法 |
|---|---|---|
| 同方案的購買鈕被停用 → 改計費週期、提早延長都做不到 | `disabled={isCurrentPlan}` | 目前方案**只標記、不停用**（按鈕文案改為「延長方案」） |
| 鏈上卡片虛高時買不回正確方案 | 購買閘吃的是**顯示**答案（當時顯示以鏈上為準；2026-08-21 起顯示已改純 DB，此情境不再存在） | 同上；停用一個購買鈕的代價比多一次確認高得多 |
| 雙擊／雙分頁 = 兩張可付的訂單 | 訂閱建單沒有任何冪等保護（席次補收有） | 同方案同週期已有**未付**訂單（PENDING / PAYING）就沿用同一張；已付的代表再買一期，建新單 |
| 續訂扣款成功但套用失敗 → 下一輪再扣一次 | 續訂建單沒有冪等鍵 | 鍵綁「正在到期的那一期」（`renew:{teamId}:p{periodStart}`）；訂單已 **PAID / COMPLETED**（錢已收到）就補套用不再扣款（PAID 是「扣款成功、套用失敗」的實際狀態——COMPLETED 要到套用成功後才寫上，review #6687 二輪阻擋-2），PENDING / PAYING 才是請款中，跳過 |
| 付兩次只得一期；提早續購吃掉剩餘天數 | 履行一律 `now → now + 週期`，`upsert` 覆寫 | **展延**：當期未結束時期末往後加，期初不動 |

**「取消排程」與「延長期間」用有沒有帶付款方式分辨**（2026-08-20）：兩者送進來的方案與週期完全一樣（都是當期的）。先前只比對這兩個值，於是購買流程按下「延長方案」會走進取消分支並回 `orderId: null`，而付款畫面拿著 null 繼續往下走——方案卡改為可按之後才會踩到。帶了付款方式就是「我要買」：取消排程**並**建單。

購買會取代排程這件事**在付款前就要說**：升級的排程是在履行時由 `applyTeamSubscriptionInTx` 清掉的，因此建單回應帶 `supersedesPendingPlanId`（現在式，那一刻還沒取消），而歸屬選擇器在付款前顯示「已排定於 X 降級為 Y；本次購買完成後將取消該降級」。

#### 7.1.2 第二輪 self-review（2026-08-20）

| 問題 | 症狀 | 修法 |
|---|---|---|
| 降級走購買流程回 `orderId: null` | 付款畫面把它當訂單用 → `completeCheckout(null, undefined)` 簽章失敗。**排程已寫入 DB，而使用者看到付款錯誤** | `orderCreator` 改回**可辨識聯集**（`kind: "order" \| "scheduled"`），付款畫面分流到 `PaymentStep.scheduled`（沒有金額的一頁）。根因是型別把 `orderId` 宣告成 `string` 而伺服器回 null——**契約說謊，編譯器就幫不上忙** |
| 扣款失敗後冪等鍵仍被佔著 | `order.idempotency_key` 是唯一欄位，而失敗的訂單留著它。續訂：下一輪建新單撞 P2002，每小時噴錯、永遠續不上，直到寬限用盡降級 free。席次：P2002 被當成「重放」吞掉 → 回 `charged: false` → **邀請照樣寄出，席次沒付錢** | 兩處在扣款失敗時 `releaseIdempotencyKey`（`data.idempotencyKey` 留著供稽核）。成功的訂單仍握著鍵，「同一期不重複扣款」的保護不變 |
| 沿用未付訂單時金額可能過期 | 那張單是幾小時前建的，`amount` 是當時的席次數算的 → 少收一個席次期 | 只在金額相符時沿用；不符就取消舊單（否則它仍可從別的分頁付掉）並建新單 |

#### 7.1.3 第三輪 self-review（2026-08-20）

**展延讓「重複履行」從無害變成有害。** 之前兩次履行都算成 `now → now + 週期`，結果一樣；改成展延之後同一件事就是多送一期。因此 `applyTeamSubscriptionInTx` 加一道 `latestOrderId === orderId` 的守門（同一張訂單只履行一次）。

**上游目前擋得住，這裡不假裝是唯一防線**（三條都查過）：webhook 的履行段整段掛在 `order.status === PENDING` 之下（重複投遞根本進不來，TypeScript 也證實了——加在裡面的守門會被判為不可能成立）、checkout 進來就先要求 PENDING、續訂則由冪等鍵的唯一約束把兩個 worker 序列化。這道守門的價值是「往後也擋得住」：`applyTeamSubscription` 是公開方法，而重複履行的代價已經不再是零。

展延的期初刻意不動（改成今天會讓歷史期間憑空消失）。當期已結束（續訂、過期後重新訂閱）則從現在起算：中間沒有權益的空窗不該追認為已付費期間。
> **更正（2026-08-21，review #6687 二輪高-1）**：本段原以「分母只會變大」論證期初不動是安全的——方向錯了：分母變大就是**收得更少**。展延後 `periodEnd − periodStart` 是好幾期，用它當補收分母會把金額除以期數。比例補收的分母已改為**一個計費週期的長度**（`BILLING_INTERVAL_DAYS`，週期快照存於 `TeamSubscription.billingInterval`，既有列以 `scripts/backfill_billing_interval.ts` 回填），剩餘超過一期照實收超過一期（見 §7.1.4 的閘門保證上界）。

條款同步：服務條款 §3.6 加上「提前續購（展延）」一項，明示剩餘天數不會消失。

- **附帶效果（不是巧合）**：鏈上訂閱憑證因此不會多報。卡片的 `plan` 與 `period_end` 只在週期邊界改變，而那正是離鏈資料也改變的時點——期中降級曾是唯一會讓「鏈上說付費、實際已降級」出現的路徑（§6.5.3 的已知缺口，於此消失）。

#### 7.1.4 review #6687 二輪：金流那半的四項修正（2026-08-21）

**展延閘門（阻擋-1，產品裁定 2026-08-21）：當期剩餘 30 天內才能購買**同方案的**延長**（`SUBSCRIPTION_EXTENSION_WINDOW_DAYS`，`TW_SUBSCRIPTION_EXTENSION_TOO_EARLY`）。這是預付上限的取捨——不讓使用者一次疊上好幾年（那筆錢在平台帳上是長期負債，而退款政策不退費）。

> **更正（2026-08-21 第三輪，產品裁定）**：閘門原本連**換方案**一起擋，副作用是年繳戶在前 335 天完全不能升級——而升級是客戶主動要多付錢的操作，擋掉它的成本比價差高。換方案已改由履行端的「折抵剩餘價值」處理（見 §7.1.5），**不再受時間閘門限制**。

**續訂補套用的判準是「錢已收到」（阻擋-2）**：「扣款成功、套用失敗」留下的訂單狀態是 **`PAID`**（`completePaymentTransactionAndOrder` 在扣款成功時寫 PAID 開收據；`COMPLETED` 要到套用成功後才寫上），原本只認 COMPLETED 的補套用分支永遠不會成立，PAID 被當成「還沒定案」每小時跳過，三天後降級免費版——使用者付了錢，最終得到免費版。已改為 `PAID | COMPLETED` 都補套用（補完寫 COMPLETED），只有 `PENDING / PAYING` 是請款中。

**排程的取消移到履行（阻擋-3）**：「延長方案」原本在**建單前**就把降級排程取消（`autoRenew` 一併重開），而那筆訂單可能沒付掉（關掉付款畫面、卡被拒）——排程消失、期末照原方案續扣。現在帶付款方式的路徑**不就地取消**：排程由履行（`applyTeamSubscriptionInTx` 的 `pendingPlanId: null`）在付款成功時清掉，與升級同一條規則；付款前的揭露「本次購買完成後，該降級將取消」因此與實作一致。

**寬限期的降級立即生效（高-2，產品裁定 2026-08-21）**：PAST_DUE 時使用者按「降級為免費版」原本什麼都不做卻回報成功（判斷用了折算後的 free），續訂 worker 下一小時照樣扣款。現在用 DB 原值分辨：DB 是付費方案而折算成 free（＝寬限期）就地 `downgradeToFree`——寬限期內本來就沒有付費權益，立即落地最誠實，`autoRenew` 隨之關閉。同一個成因的變化型（寬限期內按 free 撞上「取消排程」分支、把 autoRenew 重新打開）由取消分支的 `planId !== free` 守門擋下。

#### 7.1.6 降級是「時間到不付錢」的自然結果（2026-08-21 產品裁定）

> 產品原話：「為何要降級與取消降級？降級是時間到不付錢的自然結果。」

在此之前「降到免費版」會寫 `pendingPlanId = 'free'` 並關閉 `autoRenew`——**兩個欄位表達同一件事**，而其中一個（排程欄位）沒有任何地方真的需要它：`markOverdueForRenewal` 只撈 `autoRenew = true`，期末落地一律由 `expireOverdue` 完成。裁定後收斂成三個動作，各自一支 Repo 方法：

| 使用者的動作 | 實際發生什麼 | Repo |
|---|---|---|
| **買**（含升級） | 建單付款；履行時折抵舊期剩餘價值（§7.1.5） | `applyTeamSubscription` |
| **不再付錢**（選免費版） | 只關 `autoRenew`，並清掉任何降轉排程。當期權益維持到期末，期末由 `expireOverdue` 落地為 free | `cancelAutoRenew` |
| **下一期改付較少**（降轉到較低付費方案） | 只寫 `pendingPlanId`，維持 `autoRenew`；期末續訂 cron 以新方案計價 | `schedulePlanChange` |
| **維持目前方案**（收回上面兩種） | 清 `pendingPlanId` ＋ 開 `autoRenew` | `resumeSubscription` |

三件連帶的事：

- **`cancelAutoRenew` 一併清排程**：已排定「期末降轉團隊版」的人又選了免費版時，留著那個 `pendingPlanId` 會讓面板顯示「將改為團隊版」——而他選的是免費版。`expireOverdue` 雖然會在期末清掉它，但那之前整段期間畫面都在說一件使用者沒有選的事。
- **`autoRenew` 進入 `PUT` 的回應**：「期末轉為免費版」那種狀態在 DB 裡沒有排程欄位，因此回應不能回一個 `pendingPlanId: 'free'`——那會讓 `PUT` 與 `GET /subscription` 對同一件事給出兩個答案。畫面靠 `autoRenew: false` 說話（付款完成頁三句話分流）。
- **取消入口**：`changeTeamSubscription` 用「有沒有帶 `paymentMethodId`」分辨「維持目前方案」與「我要買」，而在此之前**全站唯一的 PUT 呼叫點**在購買流程裡、參數必填——服務條款 §3.6 承諾的「生效前可隨時改回原方案」一次都走不到，使用者只能再付一期來取消（剩餘超過 30 天時連那條路都被展延閘門擋住）。團隊錢包面板因此新增「將要離開目前方案」的狀態列與「維持目前方案」按鈕（OWNER 專屬，與 server 端同判準），送不帶付款方式的 `PUT`。守門是掃描測試——service 的取消分支自己永遠是綠的，只有掃前端原始碼才問得出「有沒有一個不帶付款方式的呼叫點」。

#### 7.1.7 review #6687 四輪：三條顯示層修正（2026-08-24）

**免費版團隊不該被說成「將要離開付費方案」（高-1）**：`GET /subscription` 對沒有訂閱列的團隊回 `autoRenew: false`（沒有訂閱就談不上自動續訂）與 `currentPeriodEnd: 0`，而面板只看那兩欄——於是每一個從未訂閱過的團隊都顯示「當期到 1970/1/1 後轉為免費版」，旁邊那顆「維持目前方案」按下去什麼都不會發生（server 對免費列不寫資料）。判斷抽成 `resolveLeavingPlan`（純函式、逐條測試），第一道就是「有效方案是免費版 → 什麼都不說」。**先前守它的掃描測試對這個缺陷永遠是綠的**——它斷言的是「`!subscription.autoRenew` 這個字串在檔案裡」，而那個字串本身就是缺陷（檢查表 §1.11）。

**「買一期會把關掉的自動續訂重新打開」要在付款前說（中-1）**：履行（`applyTeamSubscriptionInTx`）一律寫 `autoRenew: true` 並清 `pendingPlanId`。狀態機收斂（§7.1.6）之前「期末轉免費版」是 `pendingPlanId = 'free'`，所以它會觸發「本次購買完成後，該降級將取消」那句；收斂之後那個狀態改由 `autoRenew = false` 表達，而那句揭露只看 `pendingPlanId`——於是降轉還會說、期末轉免費版不再說，而兩者在產品上是同一件事。揭露條件改成「有排程 **或** 已關閉續訂」，並補一句 `resume_autorenew_note`。

**「維持目前方案」帶回真實的計費週期（低-1）**：面板的 PUT 曾寫死 `"month"`。今天無害（那條分支不讀這個欄位），但那是一個在請求裡說謊的參數，而這個欄位過去曾參與判斷。`GET /subscription` 因此新增 `billingInterval`（沒有訂閱列或尚未回填時回月繳；真正需要精確值的席次補收讀 DB 原值並在 NULL 時擋下，不吃這個預設）。

#### 7.1.5 換方案＝折抵剩餘價值（2026-08-21 產品裁定，**禁止造成用戶損失的設計**）

期間的三條規則收斂到純函式 `src/lib/billing/subscription_period.ts`（`resolveNextPeriod`）：

| 情形 | 期間怎麼算 | 為什麼 |
|---|---|---|
| 沒有訂閱／當期已結束 | 自現在起算一期 | 中間沒有權益的空窗不該追認為已付費期間 |
| **同方案**再買一期（含改計費週期） | 期末往後加一期，期初不動 | 付兩次＝兩期；服務等級沒變，剩餘的 N 天本來就是 N 天的同一個方案 |
| **換方案**（升級） | 自現在起算一期，**再加上舊期剩餘價值折抵的天數** | 見下 |

換方案有三種可能的做法，只有一種站得住：

| 做法 | 年繳團隊版第 180 天升年繳企業版 | 問題 |
|---|---|---|
| 作廢剩餘天數（自現在重算） | 付 29,400 得 365 天，**沒收 4,258 元** | 退款政策 §2.2 原則不退費，作廢等於沒收；第 1 天升級會沒收年費的 99.7%（8,377 元）。**產品裁定禁止造成用戶損失的設計**，出局 |
| 剩餘天數 1:1 當新方案天數（本 PR 二輪之前） | 付 29,400 得 550 天（平台白送 10,644 元） | 使用者不吃虧，但平台把高階服務免費送出去；跨週期更誇張（年繳團隊剩 335 天升月繳企業＝白送 25,120 元）。這就是 review 二輪阻擋-1 |
| **按已付價值折抵天數**（採用） | 付 29,400 得 **417.9 天**（剩餘 4,258 元換 52.9 天） | 使用者付過的錢一分不作廢，平台也不再免費送 |

折抵公式：`剩餘時間 × 舊單價 × 新期天數 ÷ (舊期天數 × 新單價)`，一次乘除、走 Decimal、無條件捨去（不先算日單價——年繳的 8,400/365 = 23.0136… 先四捨五入會少折抵使用者已付的價值）。期初在換方案時改成現在（那是一份新合約：新方案、新單價快照），同方案續購維持原期初。

兩個邊界值得記：

- **免費版升級付費**：舊方案沒付過錢（單價 0）→ 折抵 0 是**正確答案**，不是資料異常。回 1:1 會讓免費戶白拿一段付費期間。
- **舊列的 `billing_interval` 為 NULL**（尚未回填）：換算不出日單價。Service 層在**建單前**擋下（`TW_SEAT_BILLING_INTERVAL_MISSING`）；履行端的退路是「剩餘期間 1:1 沿用」——寧可平台吃虧，也不可沒收使用者已付的期間。

**席次補收上限跟著跨距縮放**：`unitPrice` 是一期的價格，而當期跨距可以是好幾期（展延或折抵之後）。跨距 3.8 期的當期若沿用「2 × 一期」的上限，合法的加人會被誤擋，而使用者只會看到一個指向「連刷」的錯誤訊息。上限改為 `單價 × 已付席次 × 2 × 跨距期數`（至少 1 期）——縮放而不是取消：上限防的是「ADMIN 替 OWNER 的卡連刷」，那個風險與期間長度成正比。

付款頁的揭露三句話走三條路：換方案講「舊方案剩餘期間不會消失，將按已付金額折抵為新方案的天數」；同方案剩餘 > 30 天講「暫不開放購買同方案的延長，升級不受此限」；同方案窗內講「自當期屆滿日累加」。

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
| **P2** | 錢包購買（OEN 分流）、分配 API（收回已停用，見 §條款 3.5）、成員移除自動沖銷 | E2E：購買 → 入池 → 分配 → 消耗 → 移除成員沖銷，Ledger 守恆式成立（E2E 帳本用 `e2e-book-` 前綴） |
| **P3** | 計費功能接入管線（AI 分析先行，**費思對話含 §5.3 四項 guardrails** 次之，碳盤查對話再次之）、402 fallback 到既有個人錢包簽章流程 | 額度內操作零簽章；用罄後三條出路皆可走通；費思結算誤差 = 0（settle 以 `usageMetadata` 為準） |
| **P4** | 前端（額度儀表、重置倒數、錢包管理頁、分配 UI、**訂閱方案頁標註費思費率**）、勾稽 / 續訂 Workers、**C 案 Phase 1 merkle 錨定**（`ledger_anchor.sol` 部署 + Worker 錨定步驟） | 勾稽 Worker 對壞帳注入測試能凍結錢包並告警；定價頁費率數字與 env 同源；**任一日的 Ledger 可由 DB 重算 root 並與鏈上 event 比對一致** |
| **P4 進度**（2026-08-07，全數交付 ✅） | WalletGuardian（守恆勾稽 + 凍結告警 + merkle 錨定，壞帳不上鏈）、SubscriptionExpiry + SubscriptionRenewal（到期降級、autoRenew 以綁定卡自動扣款續訂、逾 3 天寬限降級 free）、`ledger_anchor.sol` + deploy_contract 部署整合、`resolveEffectivePlanId` fail-closed 防線、團隊管理頁錢包面板（額度百分比儀表 + 成員卡片分配/收回 + 導購連結）。營運前置：跑 `npm run deploy_contract` 產出 `NEXT_PUBLIC_LEDGER_ANCHOR_ADDRESS`（未配置時錨定留 FAILED 自動重試，不阻斷營運） | — |
| **P5**（展望） | 個人錢包「免簽授權額度」：使用者一次性簽署授權每期上限，管線第 3 層自動代扣。**C 案 Phase 2**：團隊購點 1:1 mint 至 per-team 隔離地址 + 每日批次結算 burn（**硬性前置：金鑰治理——冷熱分離 + multisig + 獨立 `OPERATOR_ROLE`**，見 ADR 015） | — |

---

## 10. 開放問題（實作前需產品拍板）

1. 各方案的正式額度數字（§4.1 為程式碼預設值；正式值寫入 `SubscriptionPlanQuota` 設定表，需後台介面或 seed 腳本寫入）。
2. 團隊點數是否設**有效期**（現設計為永久有效；若要到期，Ledger 已預留 `ADJUST` 型別 + 到期 Worker 即可擴充）。
3. `free` 方案是否允許購買團隊點數（現設計：允許，額度與錢包互相獨立）。
4. ~~訂閱降級時當期已消耗超過新方案週額~~ → **2026-08-20 起不再存在**：降級於當期屆滿才生效（§7.1），當期額度一律按原方案計，因此沒有「已消耗超過新方案週額」這個狀態。
5. ~~團隊解散時池內剩餘點數的退費政策~~ → **已拍板（2026-08-07）：解散／終止訂閱時剩餘點數全數失效不退還，解散前強制提示剩餘點數並取得確認**（見 §6.3；服務條款 §3.5 與退款政策 §3.1 已同步起草）。
6. ~~費思費率~~ → **已拍板（2026-08-07）：`FAITH_TOKENS_PER_CREDIT = 1_000`；點值 TWD 0.1 為成本基準下限，點數售價須 ≥ 3 倍（NT$0.3/點），現行售價已符合**（見 §5.3）。剩餘待評估（非阻塞）：費思是否改用 Flash 級模型將毛利自 59–79% 推至 90%+，列 P3 一併評估。
   ~~AI 諮詢室是否也改為 token 計量~~ → **已拍板（2026-08-07）：AI 諮詢室維持固定 5 點，不改。**
7. **團隊換 OWNER 時那張訂閱會員卡怎麼辦**（2026-08-19 提出，見 §6.5.3）。現行行為：卡片留在原持有人手上，平台不重鑄也不轉移——卡片鑄出後只有持有人自己能轉（`_update` 只擋黑名單），而平台再鑄一張等於憑空多一份有效憑證。可能的方向有三個（請新 OWNER 自行接受轉移、把卡片改為不可轉移的憑證、或接受「卡片屬於當初付款的人」這個語意），三者都牽動合約或條款，因此不在本次範圍。
