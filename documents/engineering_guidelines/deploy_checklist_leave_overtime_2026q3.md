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

### 新增 16 張表

`LeavePolicy`、`LeaveAccrualTier`、`LeaveApprovalRule`、`LeaveApprovalRuleStep`、`LeaveApprovalStep`、
`LeaveGrant`、`LeaveLedgerEntry`、`LeaveBalance`、`LeaveCashOutEvent`、
`LeaveConcurrencyRule`、`LeaveConcurrencyWarning`、
`OvertimePolicy`、`OvertimeRequest`、`OvertimeSegment`、`EmployeeHrFunctionAssignment`、
`OvertimeEmergencyDeclaration`

> `OvertimeEmergencyDeclaration` 是本輪 review 才補上的（§32 IV 認定與撤回的歷史）。
> 它是**純新增**、沒有既有列要回填，且沒有任何既有查詢讀它 ——
> 在本文件其餘各節的意義上，它不改變任何結論。
>
> 唯一要注意的是**順序**：它對 `overtime_request` 有 `onDelete: Cascade` 的外鍵，
> 因此下面第六節「清 demo 資料」的拓樸不變（刪 `overtime_request` 時它會跟著走），
> 但**回滾 schema** 時要先刪它再刪 `overtime_request`。

> **開發機才會踩到的一個狀態**：這張表加進來之前，`declareEmergency` 只翻
> `OvertimeRequest.isEmergency` 的旗標、不寫歷史列。若某台開發機在那之前
> 做過一次 §32 IV 認定，那張單現在是「旗標為 true、歷史表沒有對應列」——
> 而 `revokeEmergency` 會以不變式錯誤擋下（放行等於撤回一份沒有痕跡的認定）。
>
> 正式環境不會有這種列（本 PR 才第一次上線 §32 IV 認定）。開發機撞到的處置：
>
> ```sql
> -- 先看有沒有
> SELECT r.id FROM overtime_request r
>   LEFT JOIN overtime_emergency_declaration d ON d.overtime_request_id = r.id
>  WHERE r.is_emergency = true AND d.id IS NULL;
> -- 有的話把旗標與三個現況欄位一起清掉，再用畫面重新認定一次
> UPDATE overtime_request SET is_emergency = false, emergency_report_url = NULL,
>        emergency_reported_at = NULL, emergency_declared_by_employee_id = NULL
>  WHERE id IN (...);
> ```

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
| `employee_shift_day` | — | — | 新增列舉值 `SUSPENDED`（`WorkDayType`）、新增欄位 `planned_work_minutes`（可空）⚠️ 見下 |

#### ⚠️ `employee_shift_day.planned_work_minutes` 補不回來

它記的是「那一天原本應該工作幾分鐘」，只有**非上班日**才需要（上班日讀
`shift_pattern.required_work_minutes`）。可空，因此 `db push` 不會中止 ——
但**既有列一律是 null，而且沒有辦法回填**：回填需要「當時的班別」，
而那正是已經遺失的東西（`schema.prisma` 的 ToDo 已寫下這件事）。

後果不是報錯，是 `overtime_request_context.repo.ts:312` 的
`shiftPattern?.requiredWorkMinutes ?? plannedWorkMinutes ?? 0` 對那些日子
取到 **0** —— 而 0 會讓那一天的加班上限計算把它當成「不需要工作的日子」。

- **demo 資料**：重種即可（第二節第 3 步已含）。
- **正式資料**：須由 HR 逐筆確認，或接受「上線前的非上班日在加班統計裡以 0 計」。
  這是一個要**明確決定**的事，不是可以略過的欄位。

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
（`POST .../hr/leave/balance/accrue`，限 `HR_ADMIN`）——
**但在正式帳本上這一步做不到，先看下一節。**

### ⚠️ `leave_balance.expiring_soon_minutes` 與 `reconciled_at` 需要那支 Worker

`expiring_soon_minutes` 的**計算已於 2026-08-20 補上**（`rebuildBalanceWithin`
一併重算，判準是「還沒過期、且 30 天內到期的批次餘額合計」）——
但 `rebuildBalance` **目前沒有任何產品程式碼呼叫**，呼叫它的是那支還不存在的
每日勾稽 Worker（ADR 022 §8.2）。

因此上線當下這兩欄的實況是：

| 欄 | 上線當下 | 補救 |
|---|---|---|
| `expiring_soon_minutes` | 授予時寫 0，之後沒有人重算 —— 餘額卡的「即將到期」對每個人都是 0 | Worker 掛上去即活；在那之前可手動對每人呼叫一次重建 |
| `reconciled_at` | 永遠 null。依 ADR 022 §2.3 的語意，那是「**從未勾稽過**」，不是「沒問題」 | 同上 |

**畫面要說得出這個差別。** 一個永遠顯示 0 的到期提醒，比沒有那個提醒更糟；
一個把 null 畫成空白的「最近勾稽」欄位，讀的人會以為勾稽過了。
上線前**明確選一個**：

1. 兩欄都隱藏，直到 Worker 掛上去。
2. 顯示，但標成「尚未計算」／「從未勾稽」。

---

## 三之二、正式帳本的 bootstrap 死結 ⚠️ 這一節可能擋住整次上線

**在一個全新的正式帳本上，人事功能完全設定不起來。**

假勤模組的每一支設定端點都要求操作者具 `HR_ADMIN` 職能
（假別設定 L2–L6、簽核規則、加班政策、額度調整 L9、額度授予 L33）。
`HR_ADMIN` 記在 `EmployeeHrFunctionAssignment` —— **本次新增的 15 張表之一，
上線當下是空的**。

而**沒有任何端點可以指派職能**：`employeeHrFunctionRepo.grant()` 存在，
但 `grep -rln "employeeHrFunctionRepo" src/app/` 是空的。
第一位 `HR_ADMIN` 因此在產品裡生不出來，於是：

```
要設定假別 → 需要 HR_ADMIN
要有 HR_ADMIN → 需要有人指派
要指派 → 需要一支不存在的端點
```

demo 帳本沒有這個問題，因為 `seed_attendance_demo.ts` 直接寫進去了。
**上一節那句「手動對每一位員工跑一次 L33」在正式帳本上正是這個死結的受害者**
—— 它要求 `HR_ADMIN`，而那時一位都沒有。

### 解法：先跑 bootstrap 腳本

```bash
# 在第二節的第 2 步（prisma generate）之後、任何設定動作之前
npx tsx scripts/bootstrap_hr_admin.ts <account_book_id> <employee_no>
```

它走 `employeeHrFunctionRepo.grant()`（因此不變式照跑、授予紀錄留得下來），
**只在該帳本尚無任何 `HR_ADMIN` 時才動作** —— 第二次執行會拒絕，
避免它變成一條繞過職責分離的長期後門。

指派之後的第二位以後的人事，應由第一位 `HR_ADMIN` 透過產品指派 ——
**而那支端點還沒有做**。
ToDo: (20260820 - Julian) 人事職能的指派端點與畫面（甲-1 的最後一段）。
在它落地之前，換人只能再跑一次這支腳本（先撤銷舊的）。

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
| 只想停用功能、不動資料庫 | 走這一條。16 張新表留在資料庫裡不影響任何既有功能，把假勤的入口從側邊欄拿掉即可 |

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
