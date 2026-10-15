# ADR 026: 區塊鏈退役——個人點數與任務看板改以 DB 為唯一真相

> **Author**: Luphia ｜ **Version**: 1.0 ｜ **Status**: Accepted ｜ **Last Updated**: 2026-10-15

---

## 0. 一句話

自建鏈損毀，系統**執行期不再連任何鏈**。個人點數改為 `PointLedger`（append-only）＋ `User.pointBalance`（快取）；
MissionBoard 合約改為 `MissionTask` / `MissionSubmission` 兩張表；帳號位址改為鏈下推導；會員卡（NFT）以 DB 訂閱為準。
既有用戶的點數以 `npm run restore_points` 依 DB 紀錄重建。

---

## 1. 範圍

| 原本依賴鏈的功能 | 現在 |
| --- | --- |
| 個人點數餘額（CreditPoint `balanceOf`） | `User.pointBalance`，由 `PointLedger` 加總而來 |
| 發點（購點、後台發放、註冊獎勵、活動贈點、團隊分配、退款） | `point_ledger.service.creditPoints`，冪等鍵以來源命名 |
| 扣點（UserOp `transfer` → bundler → TxTracker） | `POST /api/v1/user/order/[order_id]/point_payment`：條件扣款＋ PENDING→PAID |
| 分析任務看板（MissionBoard 合約） | `MissionTask` / `MissionSubmission`，狀態機與合約一致 |
| Passkey 註冊（SCW factory + bundler 部署、鏈上 lazy sync） | `POST /api/v1/auth/register`；位址 `deriveAccountAddress(credentialId, pubKey)` |
| 託管帳號（OAuth）建帳 | 產生金鑰後以同一規則推導位址，不部署 |
| 訂閱會員卡 NFT | 移除；方案顯示與權益皆讀 `TeamSubscription` |
| 每日 merkle 錨定（LedgerAnchor 合約） | 仍計算並存 DB，狀態 `SEALED`（無 txHash） |
| 後台區塊鏈頁、部署精靈的鏈步驟、健康檢查的區塊高度 | 移除 |

`viem` / `ethers` 仍作為**純函式庫**使用（雜湊、位址格式、ABI 編碼）。
`src/__tests__/no_chain_runtime.test.ts` 掃描 `src` 與 `scripts`，任何會發出網路請求或簽交易的 API 重新出現就會紅。

## 2. 點數帳本規則

- `PointLedger` append-only；更正只寫反向分錄（`ADJUST` / `REFUND`）。
- 出帳以 `UPDATE ... WHERE point_balance >= amount` 條件更新，併發下不會負餘額；餘額不足回 `TW_PERSONAL_POINTS_INSUFFICIENT`（402）。
- 冪等鍵見 `src/constants/point_ledger.ts` 的 `POINT_LEDGER_KEY`，**線上流程與復原指令共用**：

| 來源 | 鍵 |
| --- | --- |
| 購點／後台發放／歷史簽到獎勵訂單 | `order-credit:<orderId>` |
| 消費訂單扣點 | `order-debit:<orderId>` |
| 消費訂單退點 | `order-refund:<orderId>` |
| 註冊獎勵（一人一次） | `registration:<userId>` |
| 活動贈點 | `campaign:<campaignRegistrationId>` |
| 團隊分配 | `team-allocate:<TeamWalletLedger.id>` |
| 舊分配上鏈遷移 | `team-migrate:<TeamWalletLedger.id>` |

- 分錄型別常數：`POINT_LEDGER_ENTRY_TYPE`；結果：`POINT_LEDGER_OUTCOME`；點數付款簽章標記：`POINT_PAYMENT_SIGNATURE`（`src/constants/point_payment.ts`）。

## 3. 扣點授權

條款 §3.3 承諾「扣除需經您以帳戶憑證簽章確認」：

- **Passkey 帳號**：送出 `USER_ACTION` challengeToken 與 WebAuthn assertion，伺服器以 `verifySignature` 驗證後才扣。
- **託管帳號**：私鑰本來就由伺服器保管、過去也是伺服器代簽，因此直接扣款。

## 4. 點數復原（`scripts/restore_points_from_db.ts`）

規則全文在 `src/services/point_recovery.service.ts`（純函式 `buildRecoveryPlan`，有逐條單測）。產品拍板（20261015）：

- 入帳：購點（含 `PAID` / `MINT_FAILED`——已收款即視為欠用戶）、後台發放、歷史簽到獎勵、註冊獎勵（無訂單者一律補 100）、活動贈點、團隊分配（未被 `allocate-failed:` 補償者，含鑄點未確認者）、退款（含 `refundOwed` 欠款）。
- 出帳：ICP 負數訂單、狀態 `PAID` / `EXECUTING` / `COMPLETED` / `FAILED`，排除團隊額度支付。
- 舊的 `PAYING`（鏈上付款在途）：無從確認，**不扣**，並終結為 `PAYMENT_FAILED`。
- 預設預演；`--commit` 才寫入；`--verify [--fix-cache]` 勾稽快取與帳本。

## 5. 任務看板

- 狀態值 `MISSION_TASK_STATUS` 與合約 `enum TaskStatus` 相同；reject 只標記該次提交。
- 工作資料夾由 `${合約位址}_${taskId}` 改為 `local_${taskId}`（`missionFolderName`）。舊鏈 taskId 從 0 起、DB 從 1 起，數字會撞；
  executor / commitor / closer 只處理新格式，recorder 只在舊格式資料夾上啟用 `mission contains` 反查，GC 會清掉舊資料夾。

## 6. 未處理（留待後續）

- 未使用的欄位：`TeamSubscription.nft*`、`TeamLedgerAnchor.txHash`、`User.identityAddress`。
- `contracts/`、hardhat 設定與相依套件仍在版控內（不參與執行期）。
- 既有部署 `.env` 內殘留的 `NEXT_PUBLIC_*_ADDRESS` / `NEXT_PUBLIC_RPC_URL` 無害，可擇期清除。
