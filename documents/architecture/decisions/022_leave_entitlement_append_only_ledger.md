# 架構決策紀錄 (ADR) 022: Append-Only Ledger with Batch Grants for Leave Entitlement (假勤額度採 append-only 帳本與批次授予)

> **Date**: 2026-08-17
> **Author**: Julian
> **Status**: ✅ Accepted
> **核心目標**: 讓「他還剩幾天假」永遠可以由授予與扣減重算出來，並讓「這一批額度什麼時候到期、來自哪一段加班」這兩個法定必答題有欄位可答。
> **關聯**: [假勤模組開發計畫書 §4 D2、D3、D12](../leave_and_overtime_module_plan.md)、[ADR 015 離鏈團隊錢包帳本](015_offchain_team_wallet_ledger.md)、[ADR 010 無狀態攤銷引擎](010_immutable_pipeline_and_stateless_workers.md)、[出勤模組 §D10](../time_attendance_module_plan.md)
> **進度**: 見計畫書 [§17.1](../leave_and_overtime_module_plan.md)（本文件不記進度）

---

## 🛑 1. 當前架構挑戰 (Context)

假勤額度最直覺的模型是一張表一個數字（`LeaveBalance { employeeId, leaveType, remainingDays }`）。它能回答「他還剩幾天」，而那正是需求字面上要的。但它答不出下面四題，而這四題全部有法源：

| 問題 | 法源 | 為何餘額欄位答不出 |
|---|---|---|
| 這幾天是怎麼變成這樣的？ | 勞動檢查的標準問法 | 餘額只有現值，沒有過程 |
| 哪幾天今年底會過期？哪幾天已經是遞延來的？ | §38 IV（未休發工資、得協商遞延一年） | 到期日是**批次**的性質，不是餘額的性質 |
| 這 3 小時補休來自哪一個加成級距？ | §32-1（屆期未休依**當日工資計算標準**發給） | 合併成一個數字的那一刻，級距資訊就被銷毀了 |
| 這筆調整是誰改的、為什麼？ | 個資法與內控 | `UPDATE` 覆蓋掉了前值 |

第三題是硬傷。一次 3 小時的平日加班會跨越 §24 的兩個級距（前 2 小時加給 1/3、第 3 小時加給 2/3）。若補休帳上只有「3 小時」，補休期限屆滿要折現時，系統算不出該用哪個倍率 —— 而 §32-1 明文要求依當日的工資計算標準發給。

---

## 🎯 2. 決策：`LeaveGrant`（批次，不可變）+ `LeaveLedgerEntry`（append-only）+ `LeaveBalance`（派生快取）

### 2.1 三層各自的職責

```
LeaveGrant        一次授予。不可變。帶到期日、法定面額、換算依據、來源。
    │  1..n
    ▼
LeaveLedgerEntry  append-only 異動。有號 delta、扣後餘額、冪等鍵。永不 update、永不 delete。
    │  Σ
    ▼
LeaveBalance      派生快取。可由帳本完整重建，每日勾稽。
```

### 2.2 先例：這不是新發明

ADR 015 對團隊錢包做的是同一件事：`TeamWalletLedger` append-only、有號 `amount`、`poolBalanceAfter`、`idempotencyKey @unique`、每日 Worker 驗證守恆式。本 ADR 沿用同一套手法，包括欄位命名的直覺。

差別只有一處：團隊錢包的守恆式只需在總量上成立；假勤的 `Σ(deltaMinutes) = LeaveBalance.remainingMinutes` **必須逐 `LeaveGrant` 成立** —— 因為 FIFO 扣減需要知道每一批各剩多少。

### 2.3 `LeaveBalance` 的三規矩

完全比照出勤模組 §D10 對 `AttendancePresence` 立下的三條：

1. **只在寫入異動的同一個 `$transaction` 內更新。** 不允許有一條「先寫帳本、稍後再算餘額」的路徑 —— 那條路徑上的任何中斷都會留下一個對不上的餘額。
2. **可由 `rebuildBalance(employeeId, policyId)` 完整重建。** 這不是災難復原工具，是**日常可執行**的驗證手段。不能重建的快取就不是快取，是第二個真相。
3. **每日 Worker 勾稽。** 不符時以帳本為準、覆寫快取、`logger.error` 告警，並在 `LeaveBalance.reconciledAt` 留下時點。

`reconciledAt` 可為 null，語意是「從未勾稽過」—— 與「勾稽過且相符」是兩件事。這個區分沿用 `AttendancePresence.STALE` 的精神：**不知道**不等於**沒問題**。

> ⚠️ 第 3 條的 Worker **尚未存在**，因此 `reconciledAt` 目前永遠是 null。
> 三條規矩寫成並列的現在式，讀起來像三件都在跑 —— 實況與症狀見計畫書 §17.1。

### 2.4 撤銷是寫反向分錄，不是刪列

駁回、撤回、銷假、人工調整全部寫 `LeaveLedgerEntry(entryType = RESTORE | ADJUST)`，`deltaMinutes` 為正。

理由同 `LeaveDay` 銷假時把 `activeKey` 設回 null 而不刪列：刪掉的話「他曾經請過、後來被銷了」這個事實就消失了，而那正是主管機關會查的東西。

---

## 🎯 3. 決策：帳本的單位是分鐘（`Int`），「日」只出現在授予與折現兩個端點

### 3.1 為什麼不能用「日」當帳本單位

法規以「日」表達（特休 3 日、事假 14 日），所以第一直覺是 `Decimal` 存日。但需求要求最小請假單位可以是**半小時**，而半小時在 6 小時班別上是 1/12 日 = 0.08333…，**無限小數**。

`Decimal` 有精度上限，無限小數必然捨入，捨入必然累積，累積必然讓 §2.3 的守恆勾稽出現非零差額。**而一條允許誤差的守恆式，就不再是守恆式了** —— 它變成一個需要人判斷「這個差額算不算大」的告警，然後很快就沒有人在看。

### 3.2 決策內容

- `LeaveLedgerEntry.deltaMinutes` 為 **`Int`**。整數運算，守恆恆成立。這是唯一真相。
- **授予端點**：`LeaveGrant` 同時記 `grantedDays`（`Decimal`，法定面額，如 `7`）與 `dayEquivalentMinutes`（授予當下的日約當分鐘，如 `480`），`grantedMinutes = 7 × 480 = 3360`。三個欄位皆不可變。任何人事後都能驗算這 3360 分鐘的來歷。
- **請假扣減**：逐日換算。`LeaveDay.dayEquivalentMinutes` 取自**該日排班的班別**，因此換算依據是逐日固化的，不是一個會隨人事異動飄移的全域參數。
- **折現端點**：`折現日數 = 剩餘分鐘 ÷ 折現當下的日約當分鐘`（`Decimal`），寫入 `LeaveCashOutEvent`。

> 「日數」在**運算過程中**另有一套精確有理數型別（`IExactDays`，全程 `bigint`），
> `Decimal` 只是落地型別 —— 適用域、與 `Decimal` 的邊界、以及為什麼不用
> `MoneyUtil`，見 [數值精度指南 §5](../../engineering_guidelines/numerical_precision_guideline.md)。

### 3.3 兩端不一致的誠實揭露

班別變更會讓「剩餘分鐘換回日數」與當初授予的日數不一致：8 小時班授予的 3 日 = 1440 分鐘，改到 6 小時班後重新換算是 4 日。

**這在法律上本來就是有爭議的情形**，不是系統造成的。系統該做的不是選一邊假裝沒事，而是把兩端的換算依據都記下來。因此 `LeaveCashOutEvent` 同時帶 `grantDayEquivalentMinutes` 與 `cashOutDayEquivalentMinutes` 兩個值，而不是只留一個算好的日數。

### 3.4 與出勤模組的一致性

出勤模組 §D8 明文決定「分鐘與公尺為整數計數、非金融量，**不用** `Prisma.Decimal`」。本 ADR 完全一致：`Decimal` 只出現在 `grantedDays`、折現日數與 `paidRatio` —— 這三個都會**直接乘上工資變成錢**，正是 CLAUDE.md §2 所指的適用範圍。

---

## 🎯 4. 決策：扣減採 FIFO by `expiresOn`

同一個假別可能同時有數批額度：今年度的、去年遞延來的、人工補發的、加班換來的。扣減順序必須是決定性的，否則同一次請假在不同時刻執行會得到不同結果。

**順序：`expiresOn` 由早至晚；同到期日者以 `createdAt` 由早至晚。**

選 FIFO by 到期日而非 by 建立日的理由：

1. **對勞工有利。** 先扣快過期的，過期作廢的量最小化。
2. **它是唯一能讓「還剩幾天不會過期」有確定答案的順序。** 任何其他順序下，這個問題的答案都取決於「接下來會怎麼請」，也就是答不出來。

`allocateConsumption()` 為純函數。跨批次扣減會產生多筆 `LeaveLedgerEntry`，各自指向自己的 `LeaveGrant` —— 這也是 `LeaveLedgerEntry.leaveGrantId` 必填而非可空的原因：**一筆不知道從哪一批扣的異動，等於沒有記錄。**

---

## 🎯 5. 決策：補休一段一批，`overtimeSegmentId` 留在 `LeaveGrant` 而不拆表

補休（`LeaveGrantSource.OVERTIME_CONVERSION`）的每一批對應加班的**一個加成分段**，`overtimeSegmentId @unique` 指回 `OvertimeSegment`。

### 5.1 為什麼一段一批

一次 3 小時平日加班 = 2 小時 `WEEKDAY_FIRST_2H` + 1 小時 `WEEKDAY_BEYOND_2H`。若合併為一批 3 小時的補休，屆期折現時 §32-1 要求的「當日工資計算標準」就無從還原。

**注意換算比例**：§32-1 是「依勞工工作之時數計算補休時數」，**1:1，不乘加成倍率**。倍率只在折現時才回來。直覺會想「加班 1 小時、加給 1/3、所以補休 1.33 小時」，那是錯的。

### 5.2 為什麼不拆成 `CompensatoryGrant` 獨立表

`overtimeSegmentId` 是一個「只對某一種 `source` 有意義」的可空欄位，表面上與 ADR 019 的 `ProcessTask` 同型。但判準是 **ADR 019 §1 的那張表：拆完之後非法狀態的總量有沒有變少。**

拆表在這裡會**弄丟一件事**：`LeaveBalance` 的唯一鍵與 FIFO 扣減都跨越「額度來自年資」與「額度來自加班」的區別 —— 對請假的人來說補休和特休是兩個假別（`leavePolicyId` 不同），但對帳本結構來說它們是同一種東西。拆成兩張表就得寫兩套 `allocateConsumption`、兩套勾稽 Worker、兩套重建函式，而它們的邏輯完全相同。

**維持單表**，由 `assertGrantSource` 擋在 repository：

- `source === OVERTIME_CONVERSION` ⟺ `overtimeSegmentId !== null`（雙向）
- `source === OVERTIME_CONVERSION` 時 `grantedMinutes` 必須等於該 segment 的 `minutes`（1:1 的結構性保證，而不是只寫在註解裡）
- `grantedMinutes` 必須是 `grantedDays × dayEquivalentMinutes` 的**上取整**。這條用**定義**驗（`(m−1)×den < num×eq ≤ m×den`，全程 `bigint`）而不是重算同一個式子 —— 不變式若與被驗的實作共用程式碼，它驗的就是「這支函式跟自己一致」。

---

## 🎯 6. 冪等：授予 Worker 必須可以重跑

`deriveGrantSchedule()` 是純函數且**冪等** —— 給同一個員工、同一份設定、同一個時點，永遠算出同一組批次。每日授予 Worker 因此可以無害重跑。

冪等鍵 `grant:<employeeId>:<policyId>:<cycleStartDate>`，手法同 ADR 010 對攤銷引擎的處置。差別是那裡的唯一性由智能合約提供，這裡由 `LeaveLedgerEntry.idempotencyKey @unique` 提供 —— 對一個不上鏈的租戶內部帳本而言，那已經足夠。

---

## ⚖️ 7. 取捨與代價

| 代價 | 說明 | 為何接受 |
|---|---|---|
| 資料量 | 每人每假別每年至少 1 批 + 每次請假 1..n 筆異動 | 1000 人的帳本一年約 10 萬列。對照 `AttendancePunch` 的 50 萬列／年，這不是新問題 |
| 查詢複雜度 | 「剩幾天」要讀快取，快取要勾稽 | 這正是 `LeaveBalance` 存在的理由。日常查詢讀快取，稽核查詢讀帳本 |
| 兩端換算不一致 | §3.3 | 記下兩端依據，讓爭議可查；假裝一致才是不誠實 |
| `Decimal` 與 `Int` 並存 | 讀者需理解為何兩種都在 | 判準是「會不會乘上工資變成錢」 |

---

## 🚧 8. 後果

1. **`leave_ledger_conservation.test.ts` 是本模組的紅線之一**（另一條是 ADR 021 的 `no_code_branching`）。它必須驗證四件事：逐批守恆、總量守恆、`rebuildBalance` 冪等、重建結果與快取**逐欄**相同。
   以記憶體替身跑真正的 `leave_ledger` 函式，**不模擬列鎖與交易隔離**（那是 T10 的事，需要真的 PostgreSQL）。為此 `sumLedgerMinutes` / `writeBalance` / `rebuildBalanceWithin` 放在 `leave_ledger.ts` 而不是 `leave_grant.repo.ts`：後者 import `@/lib/prisma`，會把一個吃 `DATABASE_URL` 的連線池拉進 jest，而一條因為環境變數而跑不起來的紅線，與沒有紅線是同一件事。
2. **每日勾稽 Worker 掛 `scripts/run_worker.ts`**，比照出勤模組 `startServiceLoop("AttendanceEvaluator", ..., HOUR_MS)` 的慣例，新增 `startServiceLoop("LeaveEntitlementReconciler", ..., DAY_MS)`。它一支扛著勾稽、授予、到期三件事。
3. **`LeaveGrant.grantedMinutes` 的取整方向**：`grantedDays × dayEquivalentMinutes` 在比例給假時會產生小數分鐘（`3.5 日 × 465 分 = 1627.5`）。定為無條件進位（對勞工有利），須與 ADR 021 §3.2 的捨入方向一併由法務確認。
4. **與薪資模組的接口尚未存在**：`LeaveCashOutEvent` 只到「事件」為止，無金額。處置同 ADR 020 —— 留明確接口，不猜。
5. **`entryType = EXPIRE` 的觸發時機**：批次到期當日由 Worker 產生負向分錄。⚠️ 若該假別 `cashOutOnExpiry = true`（特休、補休），必須**先產 `LeaveCashOutEvent` 再 `EXPIRE`**，順序不可顛倒 —— 顛倒的話那筆額度會先歸零，折現事件就算不出分鐘數。
