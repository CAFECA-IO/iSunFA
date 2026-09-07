# 團隊錢包被凍結（守恆勾稽異常）的處理程序

- **Date**: 2026-08-18
- **Author**: Luphia
- **關聯**: [ADR 015](../architecture/decisions/015_offchain_team_wallet_ledger.md)、`src/services/cron/wallet_audit.cron.ts`

---

## 症狀

團隊錢包頁出現：

> 團隊錢包已凍結（守恆勾稽異常），請聯繫客服處理。

凍結後**任何異動都被拒絕**（購點入池、分配、消費扣款、退款），因為那正是凍結的用意：不讓髒帳繼續流動。

## 誰會凍結錢包

全 repo 只有一個地方寫入 `FROZEN`：`teamWalletRepo.freezeWallet()`，而它只有一個呼叫端——`runWalletConservationAudit()`。判斷式是

```
Σ(PURCHASE + ADJUST + CONSUME + REFUND) = 池餘額 + Σ 分配餘額
```

不成立即凍結。`ALLOCATE` / `REVOKE` 不列入左側（它們是池與分配之間的內部搬動）。

> ⚠️ `runWalletConservationAudit()` 在 `src` 內**沒有任何呼叫端**（沒有 API route、沒有排程器、CI 也沒有）。因此每一次凍結都來自**手動執行**。而它預設是**全域**掃描：手動跑一次會凍結該環境裡每一個違反的錢包，不只你在看的那一個。

## 1. 先看差額從哪來（唯讀）

```bash
npx tsx scripts/diagnose_wallet_conservation.ts --team <teamId>
```

它把恆等式兩側拆開：左側逐型別小計、右側池餘額與分配餘額、差額，以及所有 `ALLOCATE` 分錄逐筆（時間、金額、有沒有 txHash）。

`ALLOCATE` 分錄的 `txHash` 為 null 代表「已扣池、尚未確認上鏈」——那是另一種要人工追查的狀態，不要與這裡的差額混為一談。

## 2. 已知成因：2026-08-18 之前的分配

分配改為鑄到成員自己的鏈上錢包之後（ADR 015 2026-08-14 修訂），`allocate()` 扣了池、寫了一筆被勾稽排除的 `ALLOCATE`，而**不再有分配列去承接**那筆餘額。於是右側少了分配金額、左側不動——**按一次「分配」就足以讓下一輪勾稽凍結錢包**。

判準：診斷輸出的差額**恰好等於** `Σ ALLOCATE − Σ REVOKE`。

修法已於 2026-08-18 進到 `allocate()`（每筆 `ALLOCATE` 配一筆負的 `ADJUST`，鍵為 `allocate-offchain-exit:{原鍵}`），因此**新的分配不會再產生差額**。存量要用下一步補平。

## 3. 修復並解凍

```bash
npx tsx scripts/repair_wallet_conservation.ts --team <teamId>            # 預演
npx tsx scripts/repair_wallet_conservation.ts --team <teamId> --commit   # 實際執行
```

順序是：補一筆負 `ADJUST`（鍵 `conservation-repair:{walletId}`）→ 重跑**該團隊**的勾稽（真的那一支）→ 只有零違反才解凍。

**它會拒絕處理的情況**（回非零結束碼，需人工判斷）：

| 情況 | 為什麼不自動處理 |
|---|---|
| 差額與未配對的 `ALLOCATE` 淨額**不相等** | 差額有別的成因。自動抹平會讓那個成因永遠查不到——而凍結的意義正是「有人動了不該動的東西」 |
| 這個錢包**已經修復過一次**又出現差額 | 存量問題只會有一筆。再出現代表現在還有一條活路徑在破壞守恆，或有人直接動了資料 |

拒絕時請帶著診斷輸出往下查：先確認是不是有人直接改過 DB（帳本 append-only，`UPDATE` / `DELETE` 都不該存在），再看有沒有新的路徑改了池餘額卻沒寫分錄。

## 4. 沒有 API 可以解凍

`reactivateWallet()` 只有修復腳本會呼叫，**刻意不接到任何 API**：解凍的前提是「恆等式已經成立」，而那個判斷要用真的勾稽跑一次，不是一個按鈕。畫面上寫「請聯繫客服處理」，客服的處置就是這份程序。

## 5. 驗證

```bash
npx tsx scripts/diagnose_wallet_conservation.ts --team <teamId>   # 差額應為 0
```

以及該團隊的錢包狀態回到 `ACTIVE`、頁面上的紅色橫幅消失。

---

## 相關測試

- `src/__tests__/e2e/wallet_conservation.e2e.test.ts`（真資料庫）：購點 → 真的 `allocate()` → 真的勾稽 → 零違反；並含「回到修法前的資料形狀會被凍結、補上出帳分錄後可解凍」的完整流程。
- `src/__tests__/conservation_repair.test.ts`：修復腳本**拒絕**的那一半（差一分就不動手、修過一次不再自動處理）。
- `src/__tests__/wallet_audit.test.ts`：勾稽本身與範圍限定。注意它把 repo 整包 mock 掉，因此**不能**用它證明「`allocate()` 寫進去的東西通得過勾稽」——那正是缺陷藏身的縫，只有上面那支 e2e 蓋得住。
