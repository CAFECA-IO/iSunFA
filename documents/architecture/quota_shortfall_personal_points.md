# 額度不足時以個人點數支付（規格）

- **Date**: 2026-08-18
- **Author**: Luphia
- **狀態**: 規格待審 → 實作未開始
- **關聯**: [團隊錢包與訂閱額度設計書](team_wallet_and_subscription_quota.md) §5.4.4 / §5.5、[條款](../legal/terms_of_service.md) §3.3、PR #6652

---

## 1. 這份文件要解決什麼

條款 §3.3 承諾：

> 成員使用 AI 功能時，優先扣抵其訂閱額度；額度不足時得以個人點數支付，該項扣除需經您以帳戶憑證（如 Passkey）簽章確認（第三方登入之託管帳戶由系統代為簽署）。

**產品裡只有這一條路徑沒有做到。** 顧問分析、上傳、以及**無帳本**的碳盤查／費思會話都已經在扣個人點數（`ensurePersonalCreditCharge` 的兩段式訂單）。缺的是「有帳本、但團隊額度不足」的那個差額。

### 為什麼現在是關的

扣費第二層（`chargeChainCredits`）走的是**平台側 burn**：以代理帳號直接呼叫合約銷毀成員錢包裡的代幣。`CreditPoint` 沒有那個函式（只有 `burnAndUnlock(uint256)`，燒 `msg.sender` 自己的餘額），所以那條扣款從來沒有成功過，而先前的行為是 fail-**open**：餘額算進放行依據、扣款必定失敗、成本全部追補到**團隊額度**。已於 2026-08-18 改為 fail-closed（`isChainCreditSpendable()` 回 `false`）。

> ⚠️ 這件事一度被診斷為「合約層面做不到，要改合約加 `burn(address, uint256)` 並重新部署」。**那個因果與補救方向都是錯的**，而且方向恰好與條款相反：§3.3 承諾的是「扣除需經持有人簽章確認」，補一個平台可單方面呼叫的銷毀函式正是條款不允許的事。缺的不是鏈上能力，是這一層沒有接上旁邊那條已經在跑的持有人簽章路徑。更正紀錄見 `src/lib/quota/personal_chain_credits.ts`。

---

## 2. 產品拍板（2026-08-18）

**額度不足時，整則走個人點數。不切帳。**

預估成本超過剩餘額度時，該則訊息**整筆**由個人點數支付，團隊額度**不動**。

不切帳的理由：切了仍然要估算（差額同樣只有跑完才知道實際值），而 `SPEND_SOURCE.MIXED` 的複雜度只換到「省下一小段本來就要用掉的額度」。留著不用的那一小段額度會在下一則訊息用掉，不是損失。

計價沿用**無帳本那條路的模型**：保守預估（輸入估算 + 回覆上限）一次收足、**不退差額**。鏈上退差額要再一筆交易與簽章，成本高於差額本身。

---

## 3. 目標流程

```
成員送出一則訊息（有帳本）
  │
  ├─ 估算成本 estimateFaithHoldCredits(輸入, 附件, 計費設定)
  │
  ├─ 估算 ≦ 剩餘額度 → 現行團隊路徑（預扣 → 實耗結算 → 退差額），完全不變
  │
  └─ 估算 > 剩餘額度
       ├─ 先檢查視窗上限（見 §4.1）——超限就回原本的 429/402，個人點數不參與
       ├─ ensurePersonalCreditCharge({ userId, credits: 估算, idempotencyKey, category })
       │    ├─ 已付 → 放行執行，團隊額度不動、不寫團隊 Ledger 分錄
       │    └─ 未付 → 402 TW_PERSONAL_PAYMENT_REQUIRED，payload 帶 orderId 與 cost
       ├─ 前端以 useOrderTransaction.payExistingOrder() 付款
       │    ├─ 託管帳號：伺服器代簽 → 體感直接扣
       │    └─ passkey 帳號：裝置簽章一次
       └─ 前端以**相同的 clientMessageId** 重送 → 冪等鍵不變 → 訂單已 COMPLETED → 放行
```

付款的實際動作是**成員的智慧錢包把 CreditPoint `transfer` 給 `MEMBERSHIP_SYSTEM`**（`prepareTransferUserOp`），不是銷毀。合約不必動。

工作失敗時退款走 `refundPersonalCreditCharge`（伺服器代簽的鑄回，不需用戶再簽），失敗則在訂單上留 `refundOwed` 與 log——讓它是一筆**看得見的欠款**而不是靜靜消失。

---

## 4. 必須守住的邊界

### 4.1 個人點數**不得**繞過視窗上限

`buildQuotaExceededOptions(exceedsWindowLimit)` 目前區分兩種 402 成因：

| 成因 | 語意 | 個人點數該不該解除 |
|---|---|---|
| 額度用盡 | 這個團隊這期買的量用完了 | **該**（條款 §3.3 就是講這個） |
| 5 小時／週視窗上限 | 防濫用的速率限制 | **不該** |

視窗上限是防濫用機制，能用錢繞過就等於沒有。實作上判斷順序必須是**先視窗、後額度**：超過視窗上限時直接回原本的回應，不進個人點數路徑、不建訂單。

> 這一條特別容易在實作時弄反，因為兩者共用同一個 402 出口。測試要有一條專門釘住「視窗超限時不得出現 orderId」。

### 4.2 團隊額度與團隊帳本都不得被動到

整則走個人點數時：`TeamQuotaUsage` 不增加、不寫 `TeamWalletLedger` 的 `CONSUME` 分錄。那筆消費的紀錄是**訂單**（`ORDER_TYPE.ANALYSIS`、負數金額、`data.category`），與無帳本那條一致。

否則會出現「成員自己付了錢，團隊的額度也少了」——同一筆消費收兩次。

### 4.3 冪等鍵要含 teamId

建議形狀：`faith-shortfall:{teamId}:{userId}:{clientMessageId}`。

`clientMessageId` 由前端產生，同一個成員在兩個團隊的會話裡理論上可能撞號；而撞號的後果是「A 團隊的訊息用掉了 B 團隊會話的付款」。含 teamId 之後，最壞情況退化為同一團隊同一則的重送，那正是冪等要的行為。

### 4.4 餘額不足與「沒有錢包」是兩件事

- 錢包裡點數不足 → 402 帶 orderId（訂單建得起來），前端要能引導**購點**再付款。
- 成員沒有鏈上錢包（沒有 `address`）→ 不建訂單，回「請升級方案」那條路。建一張永遠付不掉的訂單比擋下來更糟。

### 4.5 先收款再服務

沿用無帳本那條的順序。反過來做等於允許賴帳，而鏈上扣不到就沒有任何強制力。代價是工作失敗要退款（§3 已含）。

---

## 5. 會動到的程式

| 檔案 | 改動 |
|---|---|
| `src/services/spend.service.ts` | 放行判斷分岔（估算 vs 剩餘額度）；`buildQuotaExceededOptions` 恢復 `USE_PERSONAL_WALLET`；402 payload 帶 `orderId` |
| `src/lib/quota/personal_chain_credits.ts` | `isChainCreditSpendable()` 改為以「這條路徑是否已接上」為語意（或直接移除該旗標，改由新路徑取代）；`chargeChainCredits` 刪除——它的前提是錯的 |
| `src/services/personal_credit.service.ts` | 可直接重用；`category` 需要一個新的 `BILLABLE_FEATURE_CODE` 以便點數歷程分得出來 |
| `src/constants/status.ts` / `enums.ts` | 新的 category 常數（不寫魔法字串） |
| 前端費思對話 | 已有「付款後自動重送」的流程（無帳本路徑），此處要能吃到同一個 402 形狀 |

`chargeChainCredits` 刪除時要一併處理 `personal_chain_credits.ts` 註解裡登記的 A／B／C 三類不可達程式碼（`spend_second_layer_inert.test.ts` 釘住那份清單，改動會紅——這是刻意的）。**C 類不可刪**：那是改制前尚未結算的舊冪等鍵的退款路徑。

---

## 6. 測試計畫

1. **估算 ≦ 剩餘額度** → 走團隊路徑，不建任何訂單（迴歸：現行行為不變）。
2. **估算 > 剩餘額度** → 回 402、payload 有 orderId、`TeamQuotaUsage` 沒有增加、沒有 `CONSUME` 分錄。
3. **付款後重送** → 同一個冪等鍵找回已付訂單 → 放行、且**仍然**不動團隊額度。
4. **視窗上限超限** → 回原本的回應，**不得**有 orderId（§4.1）。
5. **成員無鏈上位址** → 不建訂單。
6. **工作失敗** → 觸發鑄回退款；鑄回失敗時訂單留下 `refundOwed`。
7. **e2e（真資料庫）**：兩個團隊、同一個 `clientMessageId` → 兩張獨立訂單（§4.3）。
8. 每一條都要實跑 mutation 確認會紅；特別是第 4 條（把判斷順序調換）與第 2 條（把 `TeamQuotaUsage` 的增加留著）。

---

## 7. 不在範圍

- **切帳（`SPEND_SOURCE.MIXED`）**：已拍板不做。
- **鏈上退差額**：不做，保守計價的代價，須於介面說明。
- **改合約**：不需要，也不該（§1 的更正段）。
- **`token.service` 裡那六支以 inline ABI 呼叫不存在函式的服務函式**：另一票清理。

---

## 8. 條款對照

實作完成後 §3.3 與實作一致，**不需要修改條款**。目前的落差是實作缺口，不是不實敘述——這一點在 2026-08-18 一度被判斷為「條款需要加註免責」，那會為了掩蓋實作缺口而弱化一句正確的承諾。
