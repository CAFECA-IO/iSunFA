# 部署檢查表：假勤系統（Leave & Overtime）

- 版本：v1.0（2026-08-19，Julian）
- 適用：`feature/develop_time_and_attendance` 帶進的假勤 schema 變更與 demo 資料
- 依據：`code_review_checklist.md` §5.3「改 schema 的 PR 一律在部署檢查表寫下：新增了哪些欄位、需要哪支回填、以及做錯順序的症狀」

> ⚠️ **這一份與簽到系統那一份最重要的差別：schema 變更不是純新增。**
>
> `deploy_checklist_attendance_2026q3.md` §6 寫著「schema 是純新增，**回滾程式碼不需要回滾 schema**」。
> 那句話在它自己的範圍內是對的，但**本次變更推翻了它** —— 本次移除了四個欄位與一整個 enum，
> 並對兩張**既有**表加了 8 個必填欄位。照那句話回滾，回滾之後的程式碼會對著一張
> 少了 `leave_type` 的表跑。
>
> 該檔 §6 已加註指向本檔。兩份都留著：那句話是**當時**成立的判斷，
> 刪掉它會讓「為什麼後來要寫這一份」失去對照。

> **本專案沒有 `prisma/migrations/`。** schema 以 `prisma db push` 套用 ——
> 在一個有資料但沒有 migration 歷史的 DB 上跑 `migrate dev`，Prisma 會要求 baseline
> 或直接提議 reset，比它要解決的問題更麻煩。
>
> 計畫書 §19.5 曾經寫成 `migrate dev`（§19.4 已更正過一次，而錯誤在下一小節復活）。
> **那一處已於 2026-08-19 改回 `db push`。** 之所以在這裡再寫一次：
> 復活的那一份正是部署者會照做的那一份。

---

## 一、這次動了什麼

### 新增 15 張表

`LeavePolicy`、`LeaveAccrualTier`、`LeaveApprovalRule`、`LeaveApprovalRuleStep`、`LeaveApprovalStep`、
`LeaveGrant`、`LeaveLedgerEntry`、`LeaveBalance`、`LeaveCashOutEvent`、
`LeaveConcurrencyRule`、`LeaveConcurrencyWarning`、
`OvertimePolicy`、`OvertimeRequest`、`OvertimeSegment`、`EmployeeHrFunctionAssignment`

### 新增 19 個 enum

`LeaveAccrualMethod`、`LeaveCycleBasis`、`LeaveQuotaMode`、`LeaveUnitBasis`、`LeaveRoundingMode`、
`LeaveProofRequirement`、`LeaveDaySegment`、`LeaveApprovalNodeKind`、`LeaveApprovalStepStatus`、
`LeaveGrantSource`、`LeaveLedgerEntryType`、`LeaveCashOutReason`、`LeaveConcurrencyAction`、
`OvertimeFilingType`、`OvertimeCompensationMode`、`OvertimeEvidenceBasis`、
`OvertimePremiumTier`、`OvertimeRequestStatus`、`EmployeeHrFunction`

### 移除 1 個 enum：`LeaveType` ⚠️

假別由型別降級為資料（ADR 021）。`enum LeaveType` 整個移除，七個值成為
`LeavePolicy` 的 13 個 seed 初始列。

**沒有相容期** —— enum 一從 schema 移除，所有引用點同時編譯失敗。
那是刻意的：留著它等於同時存在兩套假別來源（計畫書 §19.5）。

### 改了 3 張既有表

| 表 | 移除 | 新增（NOT NULL 且**無** default） | 新增（可空或有 default） |
|---|---|---|---|
| `leave_request` | `leave_type`、`reason`、`decided_by_employee_id`、`decided_at` | `leave_policy_id`、`reason_cipher`、`pii_key_version`、`total_minutes`、`total_days` | `pii_algorithm`（default）、`proof_document_id`（可空）、`concurrency_warned`（default） |
| `leave_day` | — | `minutes`、`day_equivalent_minutes`、`entitlement_engine_version` | `segment`（default `FULL`）、`start_minute`／`end_minute`（可空） |
| `employee_shift_day` 的 `WorkDayType` | — | — | 新增列舉值 `SUSPENDED` |

### 移除五張表 `id` 的 `@default(uuid())` ⚠️ 不影響資料庫

`Employee`、`Dependent`、`BankAccount`、`EmergencyContact`、`LeaveRequest` ——
它們都在 `HrPiiTable` 名單上，而那些表的 id 是 PII 加密 AAD 的一部分
（`${table}:${recordId}:${field}:${keyVersion}`），必須由應用層 `randomUUID()`
先產生（review B11，慣例見 `deploy_checklist_attendance_2026q3.md` §3）。

**這一項不需要任何資料庫動作**：`@default(uuid())` 是 Prisma **在客戶端**填的值，
不是資料庫的 DEFAULT 約束。移除它只改變「Prisma 會不會替你填 id」，
既有列與資料庫結構完全不動。

**但它會改變型別**：`prisma generate` 之後，這五張表的 `create` 會要求你自己給 `id`。
漏給的地方在 `tsc --noEmit` 就會紅，不會留到執行期。

**必填且無 default 的欄位合計 8 個**（計畫書 §19.4 曾寫「七個」，已於 2026-08-19 更正）。
這 8 個就是下面第二節「做錯順序的症狀」的全部來源：它們碰到既有列一定會中止。

`account_book` / `employee` / `department` 只多了反向關聯（不是資料庫欄位），不需要任何處置。

---

## 二、順序（照做，不要換）

```bash
# 0. 先清掉會擋住必填欄位的既有假單列。
#    只有 demo 帳本有這種列；正式環境若已有真實假單，**停下來**，見第四節。
npx prisma db execute --schema prisma/schema.prisma --stdin <<'SQL'
DELETE FROM leave_request WHERE account_book_id = 'demo-book-public-works';
SQL

# 1. 套 schema
npx prisma db push

# 2. 產生 client（型別要跟著新表走，否則 build 會失敗）
npx prisma generate

# 3. 重種 demo 資料。**不可省略**，理由見下
npx tsx scripts/seed/seed_attendance_demo.ts
npx tsx scripts/seed/seed_leave_overtime_demo.ts
```

### 做錯順序的症狀

| 漏做／做反 | 症狀 |
|---|---|
| 跳過第 0 步直接 `db push` | push **中止**並列出那 8 個欄位。這一個會噴錯，是這張表裡最好的情況 |
| 用 `--force-reset` 抄近路 | 整個資料庫被清空，**包含 `employee`** —— 那張表在正式環境有真實個資 |
| 跳過第 2 步 | `next build` 失敗（型別找不到新表）。也會噴錯 |
| **跳過第 3 步** | **不會噴錯。** `employee_shift_day` 仍有被投影成 `LEAVE` 的列，而它們的假單已被第 0 步刪掉 —— 孤兒投影不違反任何約束，現場頁會出現「有人在放假卻查不到是誰」 |
| 只跑 `seed_attendance_demo.ts`、漏跑 `seed_leave_overtime_demo.ts` | **不會噴錯。** 假別、簽核規則、加班政策都在，但一張假單與加班單都沒有 —— 看起來像功能沒做完 |
| 先跑 `seed_leave_overtime_demo.ts` | 它會**自己中止**並說「請先執行 `seed_attendance_demo.ts`」（它依賴假別與員工）。刻意做成中止而不是靜默略過 |

最後兩列是這張表存在的理由：**它們安靜。**

---

## 三、不需要回填

三個新的必填欄位看起來像需要回填，實際不需要，理由各不相同：

- **`leave_request.reason_cipher`**：舊的 `reason` 是明文。ADR 018 把它列為 Tier 2，
  必須以 AAD 綁定 `(表, 欄, 列 id)` 加密。**不寫遷移把明文搬進密文欄** ——
  依計畫書 §14.2「不遷移，重種」：現存假勤資料只在 demo 帳本。
  正式環境若已有真實假單，那是另一件事（第四節）。
- **`leave_day.entitlement_engine_version`**：它記的是「這一列當初是依哪一版規則算出來的」。
  對舊資料回填一個版本號等於宣稱那些數字是用這一版算的 —— 而它們根本沒有經過引擎。
- **`leave_request.total_days`**：Decimal。回填必須經過 `exactDaysToDecimalString`
  而不是 `String(number)`（review B5），而那需要班別長度 —— 舊列沒有 `day_equivalent_minutes`。

**需要一支才會有值、但不是回填的**：`LeaveGrant` / `LeaveBalance` 一開始是空的。
額度由 `leaveBalanceService.accrueForEmployee` 授予，demo 的 seed 已代跑。

正式環境上線後應由每日 Worker 補跑，而**那支 Worker 尚未存在**
（ADR 022 §8.2 的待辦第 2 項）。在它掛上去之前，額度不會自己長出來 ——
症狀是每個人的餘額都是 0，而畫面上看起來像「這個人今年還沒有特休」。
上線後若不打算立刻掛 Worker，至少要手動對每一位員工跑一次 L33
（`POST .../hr/leave/balance/accrue`，限 `HR_ADMIN`）。

---

## 四、正式環境若已有真實假單，停下來

本次變更假設「現存假勤資料只在 demo 帳本」。那個假設在 2026-08 成立，**但它會過期**。

上線前先問資料庫：

```sql
SELECT account_book_id, count(*)
FROM leave_request
WHERE account_book_id <> 'demo-book-public-works'
GROUP BY account_book_id;
```

有任何一列 → **不要照第二節做**。那需要一支資料遷移，而它至少要處理三件事：
每一張舊假單要對到哪一個 `LeavePolicy`、明文 `reason` 要以正確的 AAD 加密、
`total_minutes` / `total_days` 要依當時的班別重算。三件都沒有寫。

---

## 五、環境變數

| 鍵 | 用途 | 缺了會怎樣 |
|---|---|---|
| `HR_PII_KEY_V1` | 假單事由的 Tier 2 加密（ADR 018） | 送出假單直接失敗。**不是可選的** |
| `LEAVE_RL_WRITE_PER_MINUTE` / `_PER_DAY` | 假勤寫入的限流窗口 | 有預設值（30／500），可不設 |

> `validateEnvDetailed()` 把 `.env.example` 裡出現的每一個鍵都當成**必填**：
> 某個鍵在 example 有、在部署的 `.env` 沒有，系統就進入「尚未初始化」，
> 部署精靈重新開啟 —— **而那條路徑在該狀態下沒有身分驗證。**
> 新增選填 env 請一併登記到 `src/__tests__/env_example_contract.test.ts` 的 `OPTIONAL_KEYS`。

---

## 六、回滾

**這一節與簽到系統那一份不同，請不要沿用它的結論。**

schema **不是**純新增，因此：

| 情境 | 做法 |
|---|---|
| 只回滾程式碼、不回滾 schema | **不行。** 舊程式碼讀 `leave_request.leave_type`，那一欄已經不存在 —— 症狀是每一支假單端點 500 |
| 連 schema 一起回滾 | 把 `prisma/schema.prisma` 切回舊版後 `db push`。**8 個必填欄位與 4 個被移除的欄位會反向重演一次**：新表被刪、`leave_type` 以 NOT NULL 加回來而既有列填不出值 → 先清 `leave_request` 再 push |
| 只想停用功能、不動資料庫 | 走這一條。15 張新表留在資料庫裡不影響任何既有功能，把假勤的入口從側邊欄拿掉即可 |

第三條是預設建議：**回滾 schema 的代價高於留著它。**

清 demo 資料的順序是外鍵的反向拓樸（兩支 seed 的清理段已按此順序寫好）：
先解開 `department.manager_id`，再刪 `leave_request`（`leave_day` / `leave_recall` /
`leave_approval_step` 隨 Cascade 走）、`overtime_request`（`overtime_segment` 隨之）、
`leave_grant`（`leave_ledger_entry` 隨之）、`leave_balance`、`leave_policy`、
`attendance_punch`、`employee_shift_day`、`shift_pattern`、`work_location`，最後才是 `employee`。

**不要用 `TRUNCATE ... CASCADE` 抄近路**：它會連 `employee` 一起清掉。

---

> 相關文件：`documents/architecture/leave_and_overtime_module_plan.md`（完整設計，§19 為套用步驟）、
> `documents/architecture/decisions/021_leave_policy_as_data_and_accrual_cycle.md`（假別降級為資料）、
> `documents/architecture/decisions/022_leave_entitlement_append_only_ledger.md`（額度帳本）、
> `documents/engineering_guidelines/deploy_checklist_attendance_2026q3.md`（前一份，§6 的結論已被本次推翻）。
