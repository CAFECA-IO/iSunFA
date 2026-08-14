# ADR 015: 離鏈團隊錢包帳本 (Off-chain Team Wallet Ledger)

> **Date**: 2026-08-07（2026-08-14 修訂：成員分配改為鏈上）
> **Author**: Luphia
> **Status**: Accepted（分配部分已於 2026-08-14 修訂，見「2026-08-14 修訂」）
> **關聯設計書**: [團隊錢包與訂閱額度消耗系統](../team_wallet_and_subscription_quota.md)

---

## Context（脈絡）

「團隊錢包 + 訂閱額度」功能的核心需求是**用戶操作免逐次簽署付款**。而系統現況是：

1. 個人點數餘額**只存在鏈上**（ERC-20 `CreditPoint`），每次扣點需 WebAuthn 簽章 + ERC-4337 UserOp 經 bundler 上鏈（`src/app/api/v1/user/order/[order_id]/blockchain_payment/route.ts`）。逐操作簽章正是本功能要移除的摩擦。
2. `SubscriptionManager` 合約（`contracts/subscription_manager.sol`）雖已部署並在 `src/config/contracts.ts` 註冊地址，但 **`src/` 內沒有任何 TS 程式碼呼叫它**——它的 `SubscriptionData` 是 per-address 結構，也沒有「團隊池 + 成員分配」的概念，要支援本功能必須改合約重新部署。
3. 額度（每 5 小時 / 每週）是高頻讀寫的計量行為，上鏈的延遲（bundler 往返）與 gas 成本都不合理。

可選方案：

- **A. 全鏈上**：改寫 `SubscriptionManager` 支援 team pool + delegation，操作時由後端持 relayer key 代扣。
- **B. 全離鏈**：團隊錢包與額度以 PostgreSQL 決定論帳本記帳；個人鏈上錢包維持原樣，只作為額度用罄後的 fallback。
- **C. 混合**：離鏈記帳 + 週期性批次結算上鏈（merkle root 或彙總 burn）。
- **D. 管理員錢包託管制**（2026-08-07 補充評估）：團隊點數上鏈為 ICP，全數由系統管理員錢包託管並代簽所有操作（三種形態：D1 omnibus 混同帳戶 / D2 每團隊隔離託管地址 / D3 TeamWalletVault 合約 + `OPERATOR_ROLE`）。

## Decision（決策）

~~採 B（全離鏈），並預留 C 的升級路徑~~ → **2026-08-07 拍板：採 C（混合制）**——離鏈決定論帳本為營運層，鏈上錨定為完整性層，分兩階段：

**營運層（沿用 B 案設計，不變）**：
- 團隊點數池 (`TeamWallet`)、~~成員分配 (`TeamWalletAllocation`)~~、訂閱額度用量 (`TeamQuotaUsage`) 全部落在 DB，以 `BigInt` 記帳。
  > **2026-08-14 修訂**：成員分配**不再落在 DB**，改為直接鑄到成員自己的區塊鏈錢包（見文末修訂段）。池與額度維持離鏈。
- 帳本為 **append-only Ledger**（`TeamWalletLedger`），每筆記 `balanceAfter` 與 `idempotencyKey @unique`；每日 Worker 驗證守恆恆等式 `購入 + 調整 - 消耗 + 退還 = 池餘額 + Σ 分配餘額`，違反即凍結錢包。
- 個人鏈上點數的購買 / mint / 簽章扣點流程**完全不動**，作為管線第三層 fallback。
- `SubscriptionManager` 合約維持現狀（本來就未接線），不因本功能改動或棄用。

**完整性層（C 案錨定，兩階段）**：
- **Phase 1（本期，隨功能 P4 交付）— 輕量 merkle 錨定**：每日勾稽 Worker 驗證守恆**通過後**，對當日 `TeamWalletLedger` 增量計算 merkle root，並以鏈式累積 `root_n = keccak256(root_{n-1} ‖ merkleRoot(day_n))` 綁定歷史，由 relayer key 寫入極簡 `LedgerAnchor` 合約（僅 `event AnchorCommitted(uint256 day, bytes32 root)` + 獨立 `ANCHOR_ROLE`）。錨定結果（root、txHash）回寫 DB 供對帳；錨定失敗重試 3 次後進 DLQ，**不阻斷錢包營運**。
- **Phase 2（後續獨立立項）— 1:1 backing**：團隊購點時 mint 等額 ICP 至 per-team 隔離託管地址，消耗以每日批次結算 burn，鏈上可驗各團隊餘額總量。
- **前置條件的區分**：Phase 1 的 key 淪陷風險僅及於「錨定完整性」（最壞情況是寫入垃圾 root，可由 DB 重算揭穿），不及資金，故不被金鑰治理阻塞；**Phase 2 涉及託管客戶資金，必須先完成治理冷鑰／relayer 熱鑰分離 + multisig + 獨立可撤銷限額的 `OPERATOR_ROLE`**（見下方 D 案評估）。

### D 案評估紀錄（2026-08-07，維持不採用，降維併入 C 案）

D 案能買到「單一點數體系」與「第三方可驗的鏈上流水」（D3 最完整），但有四個硬成本，經 2026-08-07 合約稽核後判定現階段不可採：

1. **信任模型反轉**：現行合約最好的安全性質是「admin key 拿不走用戶餘額」（CreditPoint 無 forced transfer、AA 錢包只認 Passkey 簽章）。D 案下 admin key 直接持有全體團隊資金，而該 key 目前是單一 env 熱鑰（`ISUNCOIN_PRIVATE_KEY`）兼日常 relayer，無 multisig、無角色分離——key 淪陷從「取得治理權」變成「客戶資金全損」。D2 的地址隔離對同一把 key 毫無緩解。
2. **ISC 資本占用**：`collateralizedMint` 每鑄 1 點須鎖等比例 ISC 抵押，團隊購點上鏈等於逐點凍結庫房資本；離鏈帳本無此成本。
3. **離鏈系統無可替代**：雙視窗額度、冪等、預扣—結算、費思 token 計量皆不適合上鏈——D 案是「離鏈帳本 + 額外一層鏈上代簽」，非替代方案。
4. **吞吐與法遵**：單 key nonce 序列化所有團隊操作；「代客保管可流通資產」可能觸及儲值／信託履約保證之監理討論（待法務）。

**決議**：取 D 案的可驗性、不取其託管風險——併入 C 案（已拍板，見上方 Decision），兩個劑量：(i) 輕量版（本期 Phase 1）：每日勾稽通過後將 `TeamWalletLedger` merkle root 錨定上鏈；(ii) 完整版（Phase 2）：購點時 1:1 mint 至 per-team 隔離地址、消耗以每日批次結算 burn。金鑰治理（冷熱分離 + multisig + 獨立 `OPERATOR_ROLE`）為 **Phase 2 的硬性前置條件**；Phase 1 錨定僅涉完整性、不涉資金，不受此阻塞。

## Rationale（理由）

1. **免簽章是硬需求**：A 案即使用 relayer 代扣，仍引入 relayer key 託管與 gas 營運成本，且把高頻計量寫上鏈違反常識；B 案在 DeWT 認證邊界內即可完成授權。
2. **審計性不降級**：本專案的信任基礎是「決定論防護 + 零捏造」，append-only ledger + 期末餘額勾稽 + 守恆 Worker 提供與會計傳票同級的可稽核性，這正是系統既有強項（對照財務恆等式 A = L + E 的防護模式）。
3. **一致性要求**：既有 `SlidingWindowRateLimiter` 是單機 in-memory，多實例會放大限額——對限流可容忍，對計費不可。DB 帳本天生多實例一致。
4. **合約零依賴**：`SubscriptionManager` 從未接線，選 B 不產生任何棄用成本。

## Consequences（後果）

**正面**：
- 額度消耗零簽章、零 gas、單次 DB transaction 延遲。
- 團隊點數的購買沿用既有 OEN 金流與 `Order` 流水，`processOenPayment()` 只需按 `ORDER_TYPE.BILLING_TEAM_POINT` 分流。
- E2E 測試不需鏈上環境即可覆蓋完整購買→分配→消耗→退款路徑。

**負面 / 承擔**：
- 系統從此存在**兩套點數體系**：鏈上個人點（`CreditPoint`）與離鏈團隊點，**兩者不可互轉**（初版）。前端與文件必須明確區分命名，避免用戶混淆。
- 營運層的信任錨仍是 DB 與勾稽 Worker；Phase 1 的每日 merkle 錨定提供「事後不可竄改」的完整性證明（任何人可由 DB 重算 root 與鏈上比對），但**即時**餘額正確性仍依賴離鏈防護——各團隊餘額的鏈上可驗要等 Phase 2 的 1:1 backing。
- 錨定粒度為「日」：當日內的竄改若在錨定前完成且能同時偽造守恆式，理論上不可偵測；緩解依賴 DB 權限管控與 append-only code review（同下一條）。
- `TeamWalletLedger` 為 append-only，任何更正只能以反向分錄（`ADJUST` / `REFUND`）表達，禁止 UPDATE / DELETE——需以 code review 與 DB 權限雙重把關。

---

## 2026-08-14 修訂：成員分配改為鏈上（產品拍板）

### 改了什麼

「團隊分配給成員的點數」這個概念**取消**。分配（ALLOCATE）不再寫離鏈的 `TeamWalletAllocation`，而是把等額點數**鑄到成員自己的區塊鏈錢包**（`issuePurchasedPointsToMember`）；從那一刻起它就是成員的個人點數，與他自費購買的沒有分別，可在任何情境使用，不限於該團隊。

收回（REVOKE）相應改為**銷毀成員錢包中的點數**（`burn`）再回補團隊池。

### 為什麼

原設計的分配餘額是「只能在這個團隊裡花」的第二套餘額。用戶看到的卻是同一個「我的點數」，而系統裡有兩本帳、兩套規則（一套會過期重置、一套不會；一套鏈上、一套離鏈）。拍板的方向是讓「給出去的就是他的」——語意與資產歸屬一致，用戶不必理解兩種點數的差別。

### 取捨（明知而為）

| 面向 | 影響 |
|---|---|
| **收回權** | 從「隨時可收回」變成「上限為淨分配量，且成員已花掉的收不回」。點數在他的錢包裡，這是必然結果 |
| **自費點數的保護** | 鏈上分不出哪些是團隊給的、哪些是自己買的，因此收回**以 `Σ ALLOCATE − Σ REVOKE` 為上限**（`sumNetAllocatedToMember`）。沒有這道上限，團隊就能銷毀成員自己買的點數 |
| **原子性** | 池的扣款在 DB、鑄造在鏈上，無法放進同一個交易。順序為「先扣池（可條件失敗）→ 再鑄」，鑄造明確失敗即寫反向 `ADJUST` 分錄補回池；`txHash` 為 null 的 `ALLOCATE` 分錄代表「已扣池、尚未確認上鏈」，是需要人工追查的可稽核狀態 |
| **成員移除** | 不再自動收回。點數已是成員資產，移除時銷毀等於沒收；要收回請在移除前明確執行 REVOKE。舊的離鏈餘額仍照原規則回池 |
| **守恆恆等式** | 原式 `購入 + 調整 − 消耗 + 退還 = 池餘額 + Σ 分配餘額` 的右側第二項對新資料恆為 0；分配後的點數改由鏈上餘額承載，離鏈帳本只保證「池 + 已鑄出量」對得起來 |
| **成本** | 每次分配 / 收回各一筆鏈上交易（gas + 延遲）。這是低頻的管理操作，與高頻的消費路徑無關——**消費仍然完全離鏈**，ADR 015 對營運效率的核心主張不受影響 |

### 遷移

`scripts/migrate_allocations_onchain.ts`：把既有的 `TeamWalletAllocation` 餘額逐筆鑄到成員錢包並歸零，冪等鍵 `migrate-allocation:{teamId}:{userId}`，預設為預演、需 `--commit` 才實際執行。**鑄造成功才歸零**——反過來做，一次 RPC 失敗就是點數憑空消失。

遷移完成前，舊餘額仍可依原規則在團隊情境消費（扣費管線的分配層不變），新分配則一律走鏈上。
