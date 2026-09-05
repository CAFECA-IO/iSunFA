# 部署檢查表 —— 薪資紀錄模組（2026 Q3）

> 對應：`documents/architecture/salary_record_module_plan.md`
> 撰寫：20260831 - Julian
> 涵蓋 PR 1（資料層與後端骨架）與 PR 4 的「員工編號成為身分鍵」schema 調整。
> API 端點（PR 2）、路由拆分（PR 3）與 PR 5（移除員工列表頁、薪資紀錄的篩選與視覺、
> 預覽薪資單修復）**都不改 schema** —— 所以這份檢查表到今天仍然是完整的，
> 不需要因為那些 PR 而補步驟。
> 但**版號 bump 每個 PR 都要做**（`code_review_checklist §6.2`）。

---

## 1. 這次改了什麼 schema

新增兩張表，**沒有動任何既有欄位**：

| 表                           | 新增欄位（全部）                                                                                                                                                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `salary_calculator_employee` | `id`, `name`, `employee_number`, `email`, `active_number`, `base_salary`, `meal_allowance`, `account_book_id`, `employee_id`, `created_at`, `updated_at`, `deleted_at`                                                               |
| `salary_record`              | `id`, `year`, `month`, `input_snapshot`, `result_snapshot`, `total_payment`, `total_salary_taxable`, `total_employer_cost`, `calculator_version`, `employee_id`, `account_book_id`, `created_by_user_id`, `created_at`, `updated_at` |

另外在 `account_book`、`employee`、`user` 三個 model 加了反向關聯宣告 ——
那是 Prisma 層的宣告，**不產生任何 DB 欄位**。

## 1.1 PR 4 的身分鍵調整（後來改的）

PR 1 原本用 **Email** 當唯一鍵（`active_email` + `@@unique([account_book_id, active_email])`），
PR 4 改成用 **員工編號**。差異：

| 欄位              | PR 1                              | PR 4（現況）                           |
| ----------------- | --------------------------------- | -------------------------------------- |
| `employee_number` | 可空                              | **必填**                               |
| `email`           | 必填                              | **可空**                               |
| 部分唯一索引欄    | `active_email`                    | **`active_number`**                    |
| 複合唯一鍵        | `(account_book_id, active_email)` | **`(account_book_id, active_number)`** |

`active_number` 沿用同一套 nullable-unique 手法（`code_review_checklist §5.3`）：
在職時等於 `employee_number`，軟刪除時寫回 `null` 以釋放編號，
讓「同一本帳本內在職員工編號唯一、離職的不佔位」這件事由 DB 保證而不是由應用層。

## 2. 需不需要回填

**看這張表現在有沒有資料。**

- **還沒有任何 `salary_calculator_employee` 列**（預期情況 —— 這個模組還沒上線）：
  不需要回填，`prisma db push` 直接過。
- **已經有列**（例如在 staging 用 PR 1 的 schema 建過測試員工）：
  `employee_number` 從可空變必填，**`db push` 會中止**，
  症狀是 `column "employee_number" of relation "salary_calculator_employee" contains null values`。
  兩條路：先 `UPDATE salary_calculator_employee SET employee_number = ... WHERE employee_number IS NULL` 補值，
  或者確認那些列都是測試資料就整張清掉。
  `active_email` 欄會隨著改名一起消失，不需要另外處理。

`salary_record` 兩次都是全新的表，沒有回填問題。

## 2.1 索引現況（不是待辦，是提醒）

- 期間下拉的 `groupBy(['year','month'])` 與列表的排序都吃
  `salary_record` 的 `@@index([accountBookId])` 加上複合唯一鍵，現階段夠用。
- **薪資紀錄的關鍵字搜尋沒有支援索引**：它是對 `salary_calculator_employee`
  的 `name` / `number` 做 `contains`（關聯過濾）。以「一本帳數十位員工」的量級不是問題，
  但如果哪天單一帳本的員工數上千，這裡會是第一個變慢的查詢。

## 1.2 PR A：員工檔擴充 13 欄（20260902）

`salary_calculator_employee` 新增 13 個欄位，讓「選好員工就自動匯入計算機」有地方存：

| 欄位                       | 型別        | 預設          |
| -------------------------- | ----------- | ------------- |
| `industry_code`            | `Int`       | `42`          |
| `is_foreign_worker`        | `Boolean`   | `false`       |
| `employment_type`          | `String`    | `"FULL_TIME"` |
| `base_salary_30_days`      | `Boolean`   | `true`        |
| `other_allowance_taxable`  | `BigInt`    | `0`           |
| `other_allowance_tax_free` | `BigInt`    | `0`           |
| `is_labor_insured`         | `Boolean`   | `true`        |
| `is_health_insured`        | `Boolean`   | `true`        |
| `is_pension_insured`       | `Boolean`   | `true`        |
| `dependents_count`         | `Int`       | `0`           |
| `voluntary_pension_rate`   | `Int`       | `0`           |
| `hire_date`                | `DateTime?` | 無（可空）    |
| `resign_date`              | `DateTime?` | 無（可空）    |

- **純新增，不需要回填。** 11 欄都有 `@default`，兩個日期欄可空 ——
  既有員工列套用後落在「本國籍、全職、三保都投、0 扶養、0 自提、30 天基準、無其他加給」，
  那是計算機目前的預設值，**行為與現在完全相同**。
- **`voluntary_pension_rate` 是 `Int` 不是 `BigInt`**：它是費率的百分點（0–6），不是金額。
  旁邊四個金額欄都是 BigInt，而引擎那一側的欄位叫 `employeeBurdenPensionInsurance`
  （讀起來像金額）—— 改成 BigInt 的話 `BigInt(0.06)` 丟 RangeError、
  `BigInt(Math.round(0.06))` 靜靜變成 0。`salary_schema_defaults.test.ts` 有一條在守。
- **`hire_date` / `resign_date` 不得有 `@default`。** 給 `@default(now())` 的話，
  既有員工會全部變成「今天到職」，這個月的薪水全部按「當月中途到職」計算。
- **API 是破壞性變更**：`POST` / `PUT .../salary_calculator/employee` 的 body
  新增 15 個必填欄位（含既有的 `baseSalary` / `mealAllowance`）。
  目前沒有外部消費者，但前端與 API 必須同時上線。

## 1.2.1 PR C：留職停薪兩欄（20260905，#6774）

`salary_calculator_employee` 再加兩欄，讓「這個月該不該有薪資單」答得出來：

| 欄位               | 型別        | 預設       |
| ------------------ | ----------- | ---------- |
| `leave_start_date` | `DateTime?` | 無（可空） |
| `leave_end_date`   | `DateTime?` | 無（可空） |

- **純新增，不需要回填。** 兩欄可空，既有員工列套用後是「沒有留職停薪」，
  而完整度警示對他們的行為與現在相同。
- **不得給 `@default`。** 給 `@default(now())` 的話全體員工都變成「今天起留停」，
  於是**每一個人的每一個月都不算缺漏** —— 這個功能會靜靜地什麼都不報。
- **存的是日期區間，不是「留停中」的狀態欄。** 狀態欄答得出「他現在在留停嗎」，
  答不出「他八月在留停嗎」，而完整度警示問的正是後者（復職後狀態改回在職，
  那幾個月就會重新變成缺漏）。
- **已知限制：一個人只存得下一段留停。** 二度留停會覆蓋前一段，被覆蓋的那幾個月
  會重新被算成缺漏。要支援多段得另開一張表 —— 等真的有人二度留停再說。
- **API 是破壞性變更**：`POST` / `PUT .../salary_calculator/employee` 的 body
  再加 2 個必填欄位（`leaveStartDate` / `leaveEndDate`，可為 `null` 但不得省略）。
  省略的話會靜靜把已登記的留停清掉 —— 所以 schema 收的是必填而不是 optional。
  前端與 API 必須同時上線。

## 1.3 PR B：薪資單寄送紀錄（20260904）

新增一張表 `salary_pay_slip_delivery`，記錄每一次寄送 —— **成功與失敗都留列**。

| 欄位               | 型別                          | 說明                                                |
| ------------------ | ----------------------------- | --------------------------------------------------- |
| `id`               | `String @id @default(uuid())` |                                                     |
| `salary_record_id` | `String`                      | FK → `salary_record`，**`onDelete: Cascade`**       |
| `account_book_id`  | `String`                      | 租戶 Root Node，查詢一律以它為 `where` 的第一個 key |
| `recipient_email`  | `String`                      | **實際**收件信箱的快照，不 join 員工檔取現值        |
| `status`           | `String`                      | `SENT` / `FAILED`（`SALARY_DELIVERY_STATUS`）       |
| `failure_reason`   | `String?`                     | 失敗原因摘要，截斷至 500 字                         |
| `sent_by_user_id`  | `String`                      | FK → `user`，誰按下的寄送                           |
| `created_at`       | `DateTime @default(now())`    |                                                     |

索引：`@@index([account_book_id])`、`@@index([salary_record_id])`。
另有三條反向關聯（`User.sentPaySlipDeliveries`、`AccountBook.salaryPaySlipDeliveries`、
`SalaryRecord.paySlipDeliveries`），無 DDL 成本。

- **全新的表，不需要回填。** 初始 0 筆，套用後既有薪資紀錄一律顯示「未寄出」——
  那是正確的，因為在這之前確實沒有寄送過。
- **`recipient_email` 是快照不是關聯，這是刻意的。** 員工的 email 之後會被改，
  而查「這封三月的薪資單當初寄到哪」時，join 出來的是今天的信箱 ——
  那正是稽核最需要答案的那一格。**因此這一欄不可以改成 join。**
- **`onDelete: Cascade` 的代價要講明**：刪掉一筆薪資紀錄，它的寄送軌跡會跟著消失。
  不串接的話，既有的 `DELETE record/:id` 端點會在「寄過的紀錄」上撞外鍵而壞掉。
  接受這個取捨的理由是薪資紀錄本來就沒有「刪了還看得到」的設計；
  真要保留跨刪除的軌跡，該做的是 `AuditLog`（見 §5 的阻擋項），
  不是把這張表變成半個歷史表。
- **`status` 是 `String` 不是 enum**：與本專案其他狀態欄一致（值域由
  `src/constants/salary_delivery.ts` 的 `SALARY_DELIVERY_STATUS` 約束），
  日後新增 `RETRYING` 之類不需要 `db push`。

### 1.3.1 寄信設定：**不是 env，是 DB 系統設定**

`MAIL` 群組的六個鍵走 `/admin/settings`（ADR 017），**不要**寫進 `.env`。

- **已簽章的部署**（快照 `TRUSTED`）：`get()` 完全不讀 env，設定必須填在
  `/admin/settings` 的 MAIL 群組並用 passkey 簽章。填在 `.env` 會**完全沒有作用**，
  而畫面在 20260904 之前還會把被遮蔽的 env 值報成「僅存在於環境變數，儲存後才會受保護」
  —— 本 PR 一併修掉了那個顯示（`resolveSettingVisibility()`）。
- **沒設定時的行為是安全的**：寄送端點回 `TW_MAIL_NOT_CONFIGURED`（4xx），
  前端顯示「尚未設定寄信服務」，**且刻意不落地 `FAILED`** ——
  那不是一次寄送失敗，是功能還沒開。
- 因此「忘了設定寄信」不會壞掉任何既有功能，只是薪資單寄不出去。
  這一項可以在 `db push` 之後、實際要用之前再補。

### 1.3.2 正式機必須產得出中文 PDF

這是**整個功能最大的環境風險**，而且到目前為止**只在 macOS 開發機驗過**
（計畫書 §11.5 明講了這一點）。開發機本來就有中文字型，正式機的容器未必。

- 程式有守門：`assertCjkRenderable` 在出圖前檢查，測不到中文字型就丟錯，
  **不會產出一份滿是方框的薪資單**。所以失效方向是「寄不出去」而不是「寄出爛的」。
- 但那代表：正式機少了字型，這個功能上線即不可用，而且要到有人按下寄送才會發現。
- **上線後第一件事**：在正式環境對一筆測試資料實際寄一次，確認 PDF 的中文正常。
  容器需要 CJK 字型時，`Dockerfile` 要裝 `fonts-noto-cjk`
  （`.github/workflows/test.yaml` 的版面測試已經有同樣的處置可以參考）。

### 1.3.3 新增的環境變數（都可以不設）

| 變數                          | 預設 | 用途                                  |
| ----------------------------- | ---- | ------------------------------------- |
| `SALARY_RL_MAIL_PER_MINUTE`   | 5    | `SALARY_MAIL_SEND` 限流桶的每分鐘上限 |
| `SALARY_RL_MAIL_PER_DAY`      | 50   | 同上，每日上限                        |
| `SALARY_RL_EXPORT_PER_MINUTE` | 6    | `SALARY_EXPORT` 限流桶的每分鐘上限    |
| `SALARY_RL_EXPORT_PER_DAY`    | 60   | 同上，每日上限                        |

**都有 fallback，不要寫進 `.env.example`** —— 那份檔案裡的每一個鍵都被視為必填，
新增選填 env 會讓既有部署重啟後掉進「尚未初始化」（`env_example_contract.test.ts` 在守）。

## 2.2 行為變更：薪資寫入不再開放給 `VIEWER`（不是 schema，但會被使用者看到）

八支端點原本只驗「是不是帳本所屬團隊的成員」，`OWNER / EDITOR / VIEWER` 一視同仁。
20260901 起改為 `src/constants/salary_access.ts` 的 `SALARY_ACCESS_ROLES`：

| 層級    | 角色                          | 端點                                                                           |
| ------- | ----------------------------- | ------------------------------------------------------------------------------ |
| `READ`  | `OWNER` / `EDITOR` / `VIEWER` | `GET employee`、`GET record`、`GET record/:id`                                 |
| `WRITE` | `OWNER` / `EDITOR`            | `POST employee`、`PUT/DELETE employee/:id`、`POST record`、`DELETE record/:id` |

- **不需要資料遷移**：判斷是讀 `team_member.role` 當場算出來的，沒有新欄位。
- **會被看到的差異**：目前是 `VIEWER` 的人，上線後按「儲存薪資紀錄」或
  新增／編輯員工會收到 403。上線前確認沒有以 `VIEWER` 身分在跑薪資作業的帳號 ——
  有的話請 `OWNER` 把他改成 `EDITOR`，那是這個角色本來就該有的層級。
- **`ADMIN` 不在任何一張清單裡**：產品已於 20260819 取消 `ADMIN`，
  既有成員由 `scripts/backfill_remove_team_admin.ts` 降為 `EDITOR`。
  萬一資料庫裡還有殘留的 `ADMIN` 列，它讀寫都會被擋 —— 這是刻意的
  （表外一律擋，不是一律放行），但上線前值得先查一次還有沒有這種列。

## 3. 部署步驟

```bash
# 1. 套用 schema
npx prisma db push

# 2. 型別改了一定要重新產 client
npx prisma generate
```

**順序做錯的症狀**：先 `generate` 後 `push` —— client 有型別、資料庫沒有表，
第一次儲存薪資紀錄會噴 `relation "salary_record" does not exist`，
而 TypeScript 一路都是綠的。

**沒跑 `generate` 的症狀**：`src/repositories/salary_calculator_employee.repo.ts`
會出現 5 個 tsc error（`activeNumber` 不存在、`number` 被當成可空、`email` 被當成必填）。
那不是程式碼的問題，是 `src/generated` 還停在舊 schema —— 重新 `generate` 就會全綠。

> ⚠️ `prisma db push` 與 `prisma generate` 都要**在 macOS 本機**跑。
> Cowork 的 Linux VM 裡 `node_modules/@prisma/engines` 只有 `schema-engine-darwin-arm64`，
> 而 `binaries.prisma.sh` 被 egress 擋住（403），所以那台機器上 Prisma CLI 一律失敗。

## 4. 新增的環境變數

兩個都有 fallback，**可以不設**：

| 變數                         | 預設 | 用途                              |
| ---------------------------- | ---- | --------------------------------- |
| `SALARY_RL_WRITE_PER_MINUTE` | 30   | `SALARY_WRITE` 限流桶的每分鐘上限 |
| `SALARY_RL_WRITE_PER_DAY`    | 300  | 同上，每日上限                    |

PR B（薪資單寄送）另外新增四個，同樣都有 fallback —— 見 **§1.3.3**。
兩份清單刻意分開放在各自的 PR 段落底下，但**加新變數時兩邊都要看一眼**：
只更新其中一份的話，讀這一節的人會以為薪資模組只有兩個 env。

## 5. 上線前的阻擋項

- [ ] **替薪資欄位補一段資料分級決策**（計劃書 §13 第 1 點）。

      **注意：ADR 018 並未涵蓋薪資。** 它的三個 Tier 欄位清單裡沒有任何薪資欄位，
      全文提到「薪資」只有一次（第 25 行），說的是薪資模組將來要照這個樣板辦。
      所以這一項不是「照 ADR 018 執行」，而是**補一段新的分級決策** ——
      形式比照 ADR 018 的「補充決策（2026-08-14 review）：打卡座標列入 Tier 2」。
      **正式上線前必須由 Luphia 或安全負責人拍板。**

      拍板時的參考點：`HrPiiTable` 已有 6 張表，其中 `LeaveRequest.reasonCipher`
      （請假事由）被評為 Tier 2 並加密。請假事由要加密，而投保級距、本薪、
      各項扣除、實發金額明文 —— 這個強度排序需要被明確選擇，不是預設。

- [ ] **範圍：目前明文入庫的欄位共 20 個**（20260902 由 7 個擴大），不只快照那兩欄。- `salary_record.input_snapshot` / `result_snapshot`（Json）- `salary_record.total_payment` / `total_salary_taxable` / `total_employer_cost`（BigInt）- `salary_calculator_employee.base_salary` / `meal_allowance` /
      `other_allowance_taxable` / `other_allowance_tax_free`（BigInt 金額）- **`salary_calculator_employee` 的另外 9 欄不是金額，是個人身分資訊**：
      `dependents_count`（扶養人數）、`is_labor_insured` / `is_health_insured` /
      `is_pension_insured`（投保狀態）、`voluntary_pension_rate`、
      `is_foreign_worker`（外籍身分）、`employment_type`、
      `hire_date` / `resign_date`（到離職日）

      **這一段是分級決策要新增回答的部分。** ADR 018 的 Tier 3 明列
      `Employee.hireDate` 不加密，可以直接沿用；但**扶養人數、投保狀態、外籍身分
      在 ADR 018 裡從未出現過** —— 前兩者可反推家庭狀況與勞動身分，
      不要預設它們與金額同級，也不要預設它們無關緊要。

      目前靠 `account_book_id` 租戶隔離與 `assertSalaryAccountBookAccess` 授權把關。

- [ ] 若判定要加密：對應欄位改成 `*_cipher` + `pii_key_version`，並確認
      `SalaryRecord` 與 `SalaryCalculatorEmployee` 是否納入 `HrPiiTable`
      （`src/constants/hr_pii.ts`；`src/repositories/hr_pii_invariant.ts`
      會要求 `id` 不得有 `@default`）。
      三個金額欄位是列表的排序與篩選維度，加密後兩者都做不到 ——
      這個取捨要一併回答，不能預設「維持明文供查詢」。
- [ ] 若判定要加密，**在有任何正式資料之前**改完 —— 這是它現在可逆的唯一原因。

## 6. 送審前必跑

```bash
npx prisma generate     # 沒跑這一步，下面的 tsc 會找不到 prisma.salaryRecord
npx tsc --noEmit
npm run test
npm run test:no-dotenv
npm run version         # 版號 bump（code_review_checklist §6.2）
```

## 7. 回退

**三張表**（`salary_calculator_employee`、`salary_record`、`salary_pay_slip_delivery`）
都沒有任何既有功能依賴，回退就是把 schema 的三個 model 與反向關聯刪掉，
重跑 `db push`。資料會一併消失 —— 若當時已經有正式薪資紀錄，先匯出。

**順序有一個限制**：`salary_pay_slip_delivery` 以 `onDelete: Cascade` 指向
`salary_record`，所以要刪的話它必須**先**走。反過來會撞外鍵。

只回退 PR B（保留薪資紀錄、拿掉寄送功能）也是可以的：刪掉
`SalaryPaySlipDelivery` 這一個 model 與三處反向關聯即可，
`salary_record` 那兩張表不受影響。
