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

## 四之二、本輪 review 改了三個「已算過的答案」⚠️ 先看影響面

以下三項改的不是欄位形狀，而是**同一組事實會算出不同的數字**。既有列不會自動
變動，但下一次有人重新核准、或打開報表，看到的數字會與上線前不同。上線前先跑
這三段查詢，知道影響到誰。

### (1) 同日多張加班單的加成級距（M4）

級距先前依**核准順序**、現在依**時段先後**。已核准的分段不會被回頭改寫，
所以差異只會出現在「同一天有兩張以上加班單、且晚的那張先被核准」的既有列上。

```sql
-- 同日多張已核准加班單，且「開始較晚的那張，id 卻先被核准」
SELECT a.account_book_id, a.employee_id, a.work_date,
       count(*) AS requests_that_day
  FROM overtime_request a
  JOIN overtime_request b
    ON b.account_book_id = a.account_book_id
   AND b.employee_id     = a.employee_id
   AND b.work_date       = a.work_date
   AND b.id <> a.id
 WHERE a.status = 'APPROVED' AND b.status = 'APPROVED'
 GROUP BY a.account_book_id, a.employee_id, a.work_date
 HAVING count(*) > 1;
```

有列 → 那幾天的分段是依舊規則切的。**不要**自動重算：分段一旦落地就對應到
已發或待發的工資，重算屬於更正流程（尚未實作，見 ADR 024 §4.1 的 ToDo）。
把清單交給人資核對即可。

> ⚠️ 核對時要看的是**總額**，不是歸屬。舊規則依核准順序決定級距，
> 因此同日兩張單的 1/3 與 2/3 可能掛反（總額仍然對）。真正要找的是
> 「兩張單都拿 1/3」那種列 —— 它少付了一段 §24 I 的 2/3 加成：
>
> ```sql
> -- 同日有兩段以上加班、卻沒有任何一段是 BEYOND_2H
> SELECT r.account_book_id, r.employee_id, r.work_date,
>        sum(s.minutes) AS total_minutes
>   FROM overtime_request r
>   JOIN overtime_segment s ON s.overtime_request_id = r.id
>  WHERE r.status = 'APPROVED'
>  GROUP BY r.account_book_id, r.employee_id, r.work_date
>  HAVING sum(s.minutes) > 120
>     AND count(*) FILTER (WHERE s.tier = 'WEEKDAY_BEYOND_2H') = 0;
> ```
>
> 有列就是**少付**，要補發 —— 那與「掛反」不同，不能只是核對了事。

### (2) 滾動三個月窗的右端（M5）

月報表的窗先前以**月底**為錨、閘門以**當日**為錨，兩者的左端最多差 30 天。
現在報表的錨夾到今天。影響的是「當月」的報表數字，過去的月份不變。

```sql
-- 當月已核准且落在「舊報表窗看不到、新報表窗看得到」的那一段
SELECT account_book_id, employee_id, work_date, recognized_minutes
  FROM overtime_request
 WHERE status = 'APPROVED'
   AND work_date >= (date_trunc('month', CURRENT_DATE) - INTERVAL '3 months')::date
   AND work_date <  date_trunc('month', CURRENT_DATE)::date
 ORDER BY account_book_id, employee_id, work_date;
```

這些分鐘先前不在當月報表的「本季累計」裡、現在會在。方向是**數字變大**，
也就是「剩餘額度」變小 —— 那才是閘門一直以來看到的值。

### (3) 特休不再預設遞延（M6）

`DEFAULT_LEAVE_POLICY_SEED` 的 `ANNUAL.carryForwardMonths` 由 12 改為 **0**
（§38 IV 的法定預設是年度終結發給工資；遞延須逐個勞工協商同意）。

種子只在**建立新帳本**時套用，**既有帳本的那一列不會變**：

```sql
SELECT account_book_id, code, carry_forward_months
  FROM leave_policy
 WHERE code = 'ANNUAL' AND carry_forward_months <> 0;
```

有列 → 那些帳本仍是 12 個月遞延。要不要改成 0 是**該公司的決定**，不是這次
上線的一部分 —— 改了會讓那些員工的未休特休在年度終結轉為折現。
把清單交給人資，由他們逐帳本確認。

> ⚠️ 逐個勞工的協商記載（誰、哪一年、何時同意）目前**沒有欄位**。
> 在它補上之前，`carry_forward_months` 是整個假別的設定，調大就是全體一律遞延。
> 缺口已列入計畫書 §17。

---

## 四之三、第 6 輪 review 的 schema 與 API 變更 ⚠️ 要 `prisma db push`

### 新增四個欄位、移除一個

| 表 | 欄位 | 動作 | 為什麼 |
|---|---|---|---|
| `leave_approval_step` | `chain_version` | **新增，NOT NULL** | `LEAVE_APPROVAL_CHAIN_VERSION` 的註解寫著「並記於快照」，而它零引用（M15）。對照組 `leave_day.entitlement_engine_version` 與 `overtime_segment.engine_version` 都落地了 |
| `leave_approval_step` | `decided_by_employee_id` / `_no` / `_name` | 新增，nullable | `HR` 關改成任一位 `HR_ADMIN` 都接得了（M19），「應該簽的人」與「真的簽的人」會不一樣 |
| `leave_ledger_entry` | `actor_employee_no` / `actor_name` | 新增，nullable | `actor_employee_id` 是 `SetNull`，離職後帳本查不出操作者（M16） |
| `leave_approval_step` | `escalated_from_kind` | 新增，nullable | 上升的說明原本是一句開發者英文，直接印給使用者（M27）。既有列為 null —— **不回填**：把那句英文解析回節點型別是猜的，猜錯會在簽核紀錄上留下一個錯的事實 |
| `leave_request` | `proof_document_id` | **移除** | 零引用、無 `@relation`、無租戶檢查（M18）。見下方 |

### `chain_version` 是 NOT NULL —— 既有列要先回填

新欄位沒有 `@default`，因此 `db push` 對**已經有列**的 `leave_approval_step`
會失敗。正式環境目前沒有真實假單（見第四節那段查詢），demo 資料重種即可。
若查出來有列：

```sql
-- 既有的鏈都是第 1 版展開的（`LEAVE_APPROVAL_CHAIN_VERSION` 從未改過）
ALTER TABLE leave_approval_step ADD COLUMN chain_version INT;
UPDATE leave_approval_step SET chain_version = 1 WHERE chain_version IS NULL;
ALTER TABLE leave_approval_step ALTER COLUMN chain_version SET NOT NULL;
```

### `proof_document_id` 移除前先確認沒有值

```sql
SELECT count(*) FROM leave_request WHERE proof_document_id IS NOT NULL;
```

應為 0（全庫沒有任何一行程式寫過它）。不是 0 就**停下來**：那表示有一條
本文件不知道的寫入路徑。

### 額度帳本的操作者快照對既有列是 null

`actor_employee_no` / `actor_name` 只有新分錄才有。既有分錄仍然只有 id，
畫面上會顯示 live join 的結果（那個人還在的話）或空白。**不回填**：
「當時的姓名工號」已經遺失，補一個現在的姓名進去會讓快照這件事變成假的。

### API 形狀變了兩處，前端要跟

| 端點 | 欄位 | 舊 | 新 |
|---|---|---|---|
| `GET/POST/PUT .../hr/leave/policy[/:id]` | `paidRatio` | `number \| null` | **`string \| null`**（十進位字串，M20）。輸入端同步改收字串 |
| `GET .../hr/overtime/unapproved` | 回傳 | 單一報告 | 帶 `scope=team` 時回**陣列**（M23）。不帶時形狀不變 |

`paidRatio` 目前沒有任何前端元件在讀（`grep paidRatio src/**/*.tsx` 為空），
因此這一項不影響現有畫面；假別設定頁動工時照新形狀寫。

---

## 四之四、額度快取的每日勾稽 ⚠️ 這一支要真的排上去

`scripts/reconcile_leave_balances.ts`（本輪新增）。在它之前
`rebuildBalance` **零產品呼叫端**，連帶：

- `leave_balance.reconciled_at` 永遠 null —— 畫面答不出「上次對帳是什麼時候」
- `leave_balance.expiring_soon_minutes` 零寫入者 —— L7 額度卡對每一個人都顯示
  「即將到期 0 分鐘」，而真相是「沒有人算過」。特休屆期未休依 §38 IV 要折現

```
npx tsx scripts/reconcile_leave_balances.ts --dry-run     # 只比對不寫入，看有多少組分岔
npx tsx scripts/reconcile_leave_balances.ts               # 全部帳本，依帳本覆寫
```

`--dry-run` 有任何一組不一致時**以非零結束** —— 它是上線前的驗收，
而一個永遠 exit 0 的驗收在 CI 裡等於沒有跑。真跑時不算失敗
（那時候不一致已經被修好了，那是它的工作）。

> ⚠️ 2026-08-20 之前的 `--dry-run` 是**假的**：它 `continue` 掉整個比對，
> `mismatched` 永不遞增，結尾一律印「0 組不一致」。若你在那之前跑過它並
> 據此認定「沒有分岔」，那個結論沒有依據，請重跑一次。

**上線後第一次要手動跑一次**：既有的 `LeaveBalance` 列全都沒有算過
`expiring_soon_minutes`。之後由 Worker 接手 ——
`services/cron/leave_balance_reconcile.cron.ts` 已註冊在 `scripts/run_worker.ts`，
每小時一次。它是冪等的。

> 「即將到期」是相對於**今天**的量，因此非得有排程不可 —— 只在授予／扣減
> 時算的話，一批額度會在無人動它的日子裡靜靜過期，而畫面到最後一刻顯示 0。

---

## 四之五、`leave_concurrency_rule` 的既有列 ⚠️ 不查會讓整個部門請不了假

本輪 M2 補了 `assertConcurrencyRule`，而它掛在**讀取端**
（`findConcurrencyStatus`）—— 因為這張表在本模組沒有任何寫入路徑，
既有列只能由 SQL 進來，讀取是它唯一咬得到東西的地方。

後果要說清楚：**不合判準的既有列會從上線那一刻起讓假單試算與送出直接回 4xx**
（`VA000075`），而那道查詢是 `buildPlan` 的一部分 —— L17 試算與 L18 送出
兩支都走它。也就是說，那個部門的人**一張假單都送不出去**，
畫面上的訊息是「這個帳本裡有一條併休上限規則沒有說出可執行的上限」。

上線前先查。判準有五條，一次查完：

```sql
SELECT r.id, r.account_book_id, r.department_id, r.leave_policy_id,
       r.max_concurrent_employees, r.max_concurrent_ratio, r.action,
       p.employer_may_reject
  FROM leave_concurrency_rule r
  LEFT JOIN leave_policy p ON p.id = r.leave_policy_id
 WHERE
       -- (1) 兩欄皆空：讀取端舊碼的 `?? 0` 會讓上限變成 0 人
       (r.max_concurrent_employees IS NULL AND r.max_concurrent_ratio IS NULL)
       -- (2) 兩欄都填：兩個互相矛盾的上限，系統沒有依據判斷該信哪一個
    OR (r.max_concurrent_employees IS NOT NULL AND r.max_concurrent_ratio IS NOT NULL)
       -- (3) 人數為負
    OR (r.max_concurrent_employees < 0)
       -- (4) 比例非正數（0 與負數都會讓整個部門請不了假）
    OR (r.max_concurrent_ratio IS NOT NULL AND r.max_concurrent_ratio <= 0)
       -- (5) BLOCK 綁在「期日由勞工排定」的假別上（§38 II），永遠不會生效
    OR (r.action = 'BLOCK' AND r.leave_policy_id IS NOT NULL
        AND p.employer_may_reject = false);
```

沒有列 → 這一節跳過。有列的處置：

| 命中哪一條 | 怎麼修 |
|---|---|
| (1) | 決定它到底要限制什麼，補上人數或比例其中一個；**若那條規則本來就沒有用意，刪掉它** |
| (2) | 刪掉其中一欄。讀取端舊碼靜默偏好人數那一欄，因此「設定畫面上的比例看起來生效了卻沒有」—— 以人數為準通常就是現況 |
| (3) (4) | 補成正數，或刪掉 |
| (5) | 把 `action` 改成 `WARN`。**不要**改 `employer_may_reject` —— 那是法規屬性，不是設定 |

> 這張表沒有管理畫面（計畫書 §17 缺口 13），因此修法就是 SQL。
> 修完再跑一次上面那段查詢確認回空集合。

### 另外看一眼：上限剛好是 0

```sql
SELECT id, account_book_id, department_id, leave_policy_id, action
  FROM leave_concurrency_rule
 WHERE max_concurrent_employees = 0;
```

`0` **不會**被不變式擋下（它是一個說得出口的設定：「同時不得有人請假」），
但它的效果與上面第 (1) 條的缺陷一模一樣 —— `action = 'BLOCK'` 時
那個部門一張假單都送不出去，`WARN` 時每一張都跳警示。

差別在於前者是**有人這樣設定**、後者是**沒有人設定過**，而系統分不出來，
所以這一條只能靠人看。查出來有列就跟人資確認一次是不是本意。

> ⚠️ 正式環境目前預期是**沒有任何列**（本模組從未寫入過它）。查出來有列，
> 表示有一條本文件不知道的寫入路徑 —— 那件事本身要先弄清楚再上線。

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
