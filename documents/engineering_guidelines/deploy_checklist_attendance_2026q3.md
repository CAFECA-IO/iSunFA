# 部署檢查表：簽到系統（Time & Attendance）

- 版本：v1.0（2026-08-17，Luphia）
- 適用：PR #6651（`feature/develop_checkin_system_demo`）帶進的 schema 變更與 demo 資料
- 依據：`code_review_checklist.md` §5.3「改 schema 的 PR 一律在部署檢查表寫下：新增了哪些欄位、需要哪支回填、以及做錯順序的症狀」

> ⚠️ **引用落點**（20260817 - Luphia）：`code_review_checklist.md` 與同類的
> `deploy_checklist_billing_2026q3.md` **目前還不在這個分支上** —— 它們隨
> `feature/faith_chat_quota_exhausted_notice` 進 develop。本檔與本次新增的程式碼註解
> 有多處引用「檢查清單 §X」，在那個分支合併之前查不到，合併之後就會對上。
>
> 寫下這一段而不是把引用刪掉：那份清單是這些決定的**理由來源**，
> 刪掉引用等於刪掉可追溯性；而留一個沒有落點的路徑「比沒有引用更糟，
> 因為它看起來查得到」（`documents/readme.md` 附錄的原話）。

> **本專案沒有 `migrations` 目錄。** schema 以 `prisma db push` 套用，
> 而「加欄位」與「填資料」是分開的兩件事 —— **順序做錯不會噴錯，只會安靜地讓功能停擺。**
> 這份文件存在的唯一理由是把那個「安靜」變成看得見的東西。

---

## 一、這次動了什麼

### 新增 7 張表

| 表 | 用途 | 特別注意 |
|---|---|---|
| `work_location` | 打卡地點與地理圍欄 | `@@unique([accountBookId, code])` |
| `shift_pattern` | 班別（六個 Int 分鐘欄位） | `@@unique([accountBookId, code])` |
| `employee_shift_day` | 逐日排班 | `@@unique([accountBookId, employeeId, workDate])` —— 擋重複匯入 |
| `attendance_punch` | 打卡（append-only、座標密文） | **`id` 沒有 `@default(uuid())`**，見下方第三節 |
| `leave_request` | 假單本體 | — |
| `leave_day` | 假單逐日展開 | `active_key` 是 partial unique index 的可攜寫法（nullable + `@unique`） |
| `leave_recall` | 銷假徵詢 | `pending_leave_day_id` 同上手法 |

### 新增 6 個 enum

`PunchType`、`PunchVerification`、`WorkDayType`、`LeaveType`、`LeaveRequestStatus`、`LeaveRecallStatus`。

### 改了 1 張既有表

| 表 | 欄位 | 型別 | 風險 |
|---|---|---|---|
| `employee` | `user_id` | `String?` `@unique`，`onDelete: SetNull` | **可空且無預設，因此 `db push` 對既有資料列是安全的**（不需要回填即可套用） |

---

## 二、順序（照做，不要換）

```bash
# 1. 套 schema。可空欄位 + 新表，對既有資料是純新增
npx prisma db push

# 2. 產生 client（型別要跟著新表走，否則 build 會失敗）
npx prisma generate

# 3. 只有 demo 環境才做：塞 demo 資料
#    需要 HR_PII_KEY_V1（打卡座標要加密）與 DEMO_SITE_A_LAT/_LNG（未設定會直接中止）
npx tsx scripts/seed/seed_attendance_demo.ts
```

### 做錯順序的症狀

| 錯誤 | 症狀 | 為什麼難查 |
|---|---|---|
| 跳過 1，直接跑 seed | `The table \`public.work_location\` does not exist` | 這個會噴錯，是最好的情況 |
| 做了 1 但沒做 2 | `npm run build` 失敗於 `Property 'attendancePunch' does not exist on type 'PrismaClient'` | 錯誤指向 `src/repositories/*.ts`，看起來像程式碼寫錯，實際上是 client 沒重產 |
| **做了 1、2 但沒設 `HR_PII_KEY_V1`** | seed 中止於 `HrPiiKeyError`；**若跳過 seed 直接用，第一次打卡會回 500** | 打卡失敗的畫面訊息是通用錯誤，而問題在伺服器設定不在定位 |
| **`DEMO_SITE_A_LAT` / `_LNG` 用地圖標註值而不是實測值** | 一切正常，seed 成功，但**主角站在現場打不了卡** | 沒有任何錯誤。校準程序見執行手冊 §2.2（必須用演示當天那台裝置、站在演示位置取 5 次中位數） |

---

## 三、`attendance_punch.id` 由應用層產生 —— 不要「順手」加上 `@default(uuid())`

`id` 是 PII 加密 AAD（`AttendancePunch:{id}:{field}:{keyVersion}`）的一部分，而加密發生在 `insert` **之前**，等不到資料庫產生 id。因此 schema 刻意沒有 `@default(uuid())`，由 `randomUUID()` 在 service 產生（ADR 018 §3）。

**若有人為了「跟其他表一致」補上 `@default(uuid())`**：走 repository 的路徑不受影響（它一律帶 id），但任何直接 `INSERT` 而不帶 id 的路徑會寫入一列 **AAD 與 id 不符的密文** —— 寫得進去，讀的時候驗章失敗並拋 `HrPiiDecryptError`，表現與「密文損毀」完全相同。那筆資料的明文只存在於那一列裡，無法重建。

---

## 四、不需要回填

**這次沒有任何回填腳本，而那是一個結論不是省略：**

- 7 張新表都是空表起步，沒有「舊資料要搬進來」的來源 —— 人事模組原本的頁面吃的是 `src/constants/mock_hr_*.ts` 的假資料，資料庫裡本來就沒有出勤紀錄。
- `employee.user_id` 可空，語意是「這位員工尚未登入過」。**空值是正確的初始狀態，不是待回填。** 首次以公司信箱登入時由 `attendance_identity.service` 自動綁定；沒有信箱的 passkey 帳號由 `scripts/seed/link_employee_user.ts` 手動綁。

---

## 五、環境變數

| 變數 | 必要性 | 說明 |
|---|---|---|
| `HR_PII_KEY_V1` | **打卡功能必要** | 座標加密。缺它 seed 中止、打卡回 500。已在 `.env.example` 以**註解**記載 |
| `HR_PII_BLIND_INDEX_PEPPER` | 人事必要 | 身分證盲索引，與本次無直接關係 |
| `DEMO_SITE_A_LAT` / `_LNG` / `_RADIUS`、`DEMO_EMAIL_EMP005` / `_EMP006` | 僅 demo seed | seed 的輸入參數，跑完即用完 |
| `ATTENDANCE_RL_PUNCH_PER_MINUTE` / `_PER_DAY`、`ATTENDANCE_RL_WRITE_*`、`ATTENDANCE_RL_EXPORT_*` | 選填 | 限流閾值，未設定時用程式內預設（5/40、30/500、6/60） |

> 🛑 **以上每一個都不得寫成 `.env.example` 的鍵值。**
> `validateEnvDetailed()` 把 `.env.example` 裡出現的每一個鍵都當成**必填**：某個鍵在 example 有、在部署的 `.env` 沒有，系統就進入「尚未初始化」，部署精靈重新開啟 —— **而那條路徑在該狀態下沒有身分驗證。**
> `src/__tests__/env_example_contract.test.ts` 擋著這件事，新增選填 env 請一併登記到該測試的 `OPTIONAL_KEYS`。

---

## 六、回滾

schema 是純新增，**回滾程式碼不需要回滾 schema** —— 7 張空表與 1 個可空欄位留在資料庫裡不影響任何既有功能。

若要清掉 demo 資料，順序是外鍵的反向拓樸（`seed_attendance_demo.ts` 的清理段已按此順序寫好）：先解開 `department.manager_id`，再刪 `leave_request`（`leave_day` / `leave_recall` 隨 Cascade 走）、`attendance_punch`、`employee_shift_day`、`shift_pattern`、`work_location`，最後才是 `employee`。

**不要用 `TRUNCATE ... CASCADE` 抄近路**：它會連 `employee` 一起清掉，而那張表在正式環境有真實個資。

---

> 相關文件：`documents/architecture/time_attendance_module_plan.md`（完整設計）、
> `documents/architecture/attendance_demo_runbook.md`（演示當天的執行手冊）、
> `documents/architecture/decisions/018_hr_pii_data_classification.md`（密文與 AAD）、
> `documents/engineering_guidelines/deploy_checklist_billing_2026q3.md`（同類文件的先例）。
