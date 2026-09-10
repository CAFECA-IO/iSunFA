# 部署檢查表 —— 薪資紀錄模組（2026 Q3）

> 對應：`documents/architecture/salary_record_module_plan.md`
> 撰寫：20260831 - Julian
> 涵蓋 PR 1（資料層與後端骨架）與 PR 4 的「員工編號成為身分鍵」schema 調整。
> API 端點（PR 2）、路由拆分（PR 3）與 PR 5（移除員工列表頁、薪資紀錄的篩選與視覺、
> 預覽薪資單修復）**都不改 schema**，不需要因為那些 PR 而補步驟。
> 但**版號 bump 每個 PR 都要做**（`code_review_checklist §6.2`）。
>
> **20260909 追記：這份檢查表在 §1.4 之前是不完整的。**
> 上面那句話原本接著寫「所以這份檢查表到今天仍然是完整的」——
> 那是 PR 5 當時的事實，而 `feature/enhance_employee_calculator_ui`
> 改了四處 schema、其中一處需要回填，那句話因此變成假的而沒有人動它。
> 這正是 `code_review_checklist §6`（文件與程式碼的一致性）那條原則的情況 ——
> 「**當事實與條文衝突時，改條文**」。而這裡要改的條文有個額外的性質：
> **一份逐 PR 累積的文件，「還是完整的」這種斷言會隨時間自己過期。**
> 所以這一版把那句話改成敘述當時的範圍，不再宣稱現在的完整性 ——
> 新的 schema 變更請比照 §1.4 往下加一節。

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
  於是**每一個人的每一個月都不算缺漏** —— 這個功能會靜靜地什麼都不報，
  而畫面看起來完全正常（沒有標示 = 沒有缺漏）。`now()` 對 `DateTime?` 完全合法、
  `db push` 會過、型別會過 —— `salary_schema_defaults.test.ts` 有一條在守，
  那是唯一問得到的地方。
- **兩欄的語意要對操作人員講清楚：起日是留停的第一天，`leave_end_date` 是
  回來上班的第一天（欄位標籤是「復職日」，不是「留停最後一天」）。**
  完整度警示只扣掉**完整落在區間裡**的月份 —— 起訖那兩個月有上班日，
  照樣要有薪資單，與到職月、離職月同一條規則。填成「留停最後一天」的話，
  復職那個月會被多扣掉一次，而那是一次**漏報**（該補的薪資單不會被標示）。
- **存的是日期區間，不是「留停中」的狀態欄。** 狀態欄答得出「他現在在留停嗎」，
  答不出「他八月在留停嗎」，而完整度警示問的正是後者（復職後狀態改回在職，
  那幾個月就會重新變成缺漏）。
- **已知限制：一個人只存得下一段留停。** 二度留停會覆蓋前一段，被覆蓋的那幾個月
  會重新被算成缺漏。要支援多段得另開一張表 —— 等真的有人二度留停再說。
- **API 是破壞性變更**：`POST` / `PUT .../salary_calculator/employee` 的 body
  再加 2 個必填欄位（`leaveStartDate` / `leaveEndDate`，可為 `null` 但不得省略）。
  省略的話會靜靜把已登記的留停清掉 —— 所以 schema 收的是必填而不是 optional。
  前端與 API 必須同時上線。

### 1.2.1.1 起算下限：帳本引入使用的月份（20260907 產品決策）

完整度的起算點是**「到職日」與「這本帳的資料從哪裡開始」兩者中較晚的那一個**，
而後者 = **建帳日（`AccountBook.created_at`）與這位員工最早一筆薪資紀錄的較早者**。
**不需要 schema 變更，也不需要回填。**

- **為什麼要有這道下限**：一位 2015 年到職的同仁，在一本 2026 年才建立的帳裡，
  只要有人替他補上到職日就會被算成缺一百三十幾個月。那些月份的薪水發生在
  這個系統之外，那份清單一個都補不了 —— 而一個補不完的清單，使用者只會
  學會忽略它，連同真正該補的那一個月一起。
- **為什麼是「較早者」，不是二選一**（review 阻擋-1，20260907）：兩個候選
  單獨拿出來都會**漏報**。
  - 只看**建帳日**：薪資紀錄的 `year` / `month` 是使用者自己選的
    （`salaryCalculatorOptionsSchema` 只夾在 2020–2100），**沒有任何一處把它
    綁在建帳日之後**。所以「九月建帳、把今年 1–8 月補進來」不是邊角，
    是導入時的正常路徑 —— 而那時 6 月漏建會回空陣列，完全不標示。
    初版寫著「帳本不存在的月份不可能有薪資單」，那句話在輸入空間裡是假的。
  - 只看**最早一筆紀錄**：一本 2025 全年都忘了建的帳，起點會落到 2026，
    於是 2025 整年靜靜消失。
  - 取較早者同時擋掉這兩種。第二個反例在它之下**行為完全相同** ——
    沒有紀錄時 `min()` 自然退回建帳日。
- **已知的殘留**（20260907，留待產品決定）：下限是**逐位員工**算的。
  導入時回填了九位同仁、第十位**一筆都沒建**的話，第十位的下限仍是建帳日，
  那段回填期間的缺漏不會被標示。改成「整本帳最早的一筆紀錄」可以蓋掉這個
  情境，但代價是**一筆很早的匯入紀錄會把全帳每一位的起點一起拉過去** ——
  那正是這道下限要消滅的噪音。要收掉這個殘留，比較穩的做法是那個
  可設定的「薪資起算年月」欄位（見下）。
- **帳本建立當月照算**，與到職月、離職月、留停起訖月同一條規則（那個月這本帳
  已經存在，建得出薪資單）。寫成「下個月才算」會讓月初建立的帳漏報一整個月。
- **驗收時的症狀**：一本剛建立的帳，即使員工到職日很早，缺漏也只會從建帳當月
  （或該員工最早那筆回填紀錄的月份，取較早）開始列。
  看到「缺 3 個月」而不是「缺 130 個月」是**對的**；
  而導入時回填了 1–8 月、漏掉 6 月的話，那一個月**必須**被標出來。
- **日後若要精準對齊「我們從 X 年 X 月開始用薪資功能」**：在 `AccountBook`
  加一個可設定的欄位，把 `missingSalaryPeriods` 的 `bookCreatedAt` 換成它即可，
  函式本身不必改。未設定時的 fallback 就是現在這個行為。
  注意那個欄位設得太晚會把真實缺漏藏起來，UI 上要講清楚。

### 1.2.1.2 上線前必看：完整度警示依賴 `hire_date`，而既有資料全是空的

`hire_date` 是 **PR A（20260902）** 才加上的可空欄位，**沒有回填腳本**，
唯一的填寫入口是員工編輯視窗（一位一位點）。而完整度警示是從到職日往後推的
—— 沒有到職日就算不出來。

> **注意那個入口曾經是壞的**（review #6777 阻擋項，已修）：員工編輯視窗的
> 留停 state 初值放了整個員工物件，送出時會把使用者剛填的到職日、扶養人數、
> 投保狀態全部還原 —— 儲存成功、沒有錯誤、橫幅原封不動。上線前請至少手動
> 走一次「補到職日 → 儲存 → 重開視窗確認那一格有值」。

**做錯順序的症狀**：功能上線、員工列表打開，畫面上一個標示都沒有。
那不是「資料很完整」，是「一位員工都算不出來」，而兩者長得一模一樣。

- **不需要 `db push`，也不需要停機** —— 這是資料補完，不是結構變更。
- 畫面會講：員工列表頁最上方有一條「N 位員工沒有到職日」的提示，
  旁邊是「只看這幾位」（`missing_hire_date_banner`）。使用者從看到問題到補完，
  路是通的，所以**不必**上線前一次補齊。
- 但**驗收時要看那條提示**，不是看有沒有標示：一本帳如果 N 等於員工總數，
  代表這本帳還沒有人開始補，此時「沒有缺漏標示」不構成任何結論。

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

## 1.4 PR D–G：調薪歷程、本薪純量欄、薪資紀錄軟刪除（20260908–09）

`feature/enhance_employee_calculator_ui` 一共動了 **4 處** schema。
前三處是新增，第四處是既有 enum 加一個值：

| #   | 變更                                                                         | 型別／預設           | 需要回填 |
| --- | ---------------------------------------------------------------------------- | -------------------- | -------- |
| 1   | 新表 `salary_employee_profile_change` ＋ 新 enum `SalaryProfileChangeAction` | —                    | 不需要   |
| 2   | `salary_record.base_salary_snapshot`                                         | `BigInt @default(0)` | **需要** |
| 3   | `salary_record.deleted_at`                                                   | `DateTime?`（可空）  | 不需要   |
| 4   | `AuditLogDataType` 加 `SALARY_RECORD`                                        | 既有 enum 加值       | 不需要   |

另外在 `user`、`account_book`、`salary_calculator_employee` 三個 model 加了
反向關聯宣告 —— 與 §1 同理，那是 Prisma 層的宣告，**不產生任何 DB 欄位**。

### 1.4.1 `base_salary_snapshot` 的 `@default(0)` 是**錯的值**，不是空值

這一欄是 `input_snapshot.baseSalaryTaxable` 的純量投影，讓薪資紀錄列表算得出
「這個月的本薪較上一筆多／少多少」。

給 `@default(0)` 的唯一理由是**讓 `db push` 過得去**：本專案沒有
`prisma/migrations/`，新增一個必填且無預設的欄位會讓既有的列直接 push 失敗
（與 §1.2.1「不得給 `@default`」是同一類的取捨，但結論相反 ——
那兩欄可空，這一欄不能）。

**而 `0` 會被讀進計算。** `attachBaseSalaryDeltas` 算的是

    delta = 這一筆.baseSalary - 前一筆.baseSalary

所以不跑回填的症狀分兩個階段，**而第一個階段看起來是好的**：

| 什麼時候                         | 畫面上                                                                                                                              |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **剛上線，還沒有人存新紀錄**     | 舊列全是 `0`，於是每一列都是 `0 - 0 = ±0`，最舊的那一列顯示「無前一筆」。**完全看不出異常** —— 它看起來就是「這本帳從來沒有人調薪」 |
| **有人存了上線後第一筆**         | 那一筆是真值、它的前一筆是 `0`，於是顯示「較上一筆 **+現值**」（本薪 44,000 的人顯示「較 8 月 +44,000」），看起來是一次巨額調薪     |
| 同一位員工有了第二筆上線後的紀錄 | 那一筆之後又正確了 —— 錯的數字只留在交界那一筆上，而且不會自己消失                                                                  |

**三個階段都沒有錯誤訊息**，API 回 200，tsc 與測試全綠。

> ⚠️ **所以這一項不能靠「上線後看一眼畫面」驗收。** 上線當天畫面是乾淨的，
> 假調薪要等到下一次發薪才長出來 —— 那時候已經不會有人聯想到部署少跑一步。
> 檢查方式只能是 SQL，見 §5。

順帶記一下**不會**發生的方向：「較上一筆 −現值」產生不出來。
要得到負值得有「這一筆是 0、前一筆是真值」，而 0 只出現在舊列、舊列永遠比較舊，
`upsertRecord` 又每次都寫真值 —— 所以缺 `0` 的那一邊必然是前一筆，差額只會是正的。

這是 `code_review_checklist §1.12` 點名的形狀：**合法但錯的預設值**。
它與「欄位不存在」不同，後者會噴錯，前者不會。

### 1.4.2 `deleted_at`：薪資紀錄從硬刪改成軟刪除

`salary_record` 原本刻意不做 soft delete（`salary_record_module_plan.md` §3.2）。
20260909 客戶確認**勞檢調閱的是工資清冊**，而清冊就是從這張表產生的（CSV 匯出），
勞基法 §23 II 要求它保存五年 —— 硬刪等於讓保存義務可以用一顆按鈕規避。

- **不需要回填**：既有的列 `deleted_at` 為 `null`，語意就是「存活中」。
- **不需要 `activeXxx`**：`@@unique([account_book_id, employee_id, year, month])`
  會被已刪的那一列佔住，但 `upsertRecord` 走的正是這個複合鍵 —— 它的 update
  分支把 `deleted_at` 設回 `null`，也就是「刪掉八月、重新存八月」會**復活**那一列。
  這與 §1.1 的 `active_number` 是兩種不同情況：員工編號由使用者輸入、可能換人使用，
  年月是系統決定的座標、只會是同一筆。
- **附帶影響**：`salary_pay_slip_delivery` 的 `onDelete: Cascade` 不再會被觸發，
  於是「刪掉薪資紀錄，寄送軌跡跟著消失」這件事沒有了 ——
  §7 回退那一節提到的刪除順序限制仍然成立（那是手動刪 model 的情況）。

### 1.4.3 `AuditLogDataType` 加值：這是既有 enum，會影響既有資料嗎

不會。PostgreSQL 的 enum 加值是相容操作，既有的 `audit_log` 列不受影響。
`dataId` 填 `SalaryRecord.id`，只在**刪除**時寫一列
（不記建立與覆寫 —— 那些的軌跡本來就在紀錄自己身上，每次儲存都寫一筆會把這張表沖爆）。

## 2.3 回填：`base_salary_snapshot`（20260909 新增，**必跑**）

這是這個模組**第一個需要回填的欄位** —— §2 那兩種情況都是「不需要回填」，
所以請不要沿用那一節的結論。

```bash
# 先看要動幾列，不寫入
npx tsx scripts/backfill_salary_record_base_salary.ts --dry-run

# 確認數字合理再跑
npx tsx scripts/backfill_salary_record_base_salary.ts
```

- **冪等**：只碰 `base_salary_snapshot = 0` 的列，重複跑不會有副作用。
- **跑完會印 `scanned / updated / skipped`。** `skipped` 不是 0 的話它會把那些
  `id` 列出來 —— 那代表那幾列的 `input_snapshot` 裡沒有
  `baseSalaryTaxable`（很舊的紀錄或手動塞的測試資料），需要人看一眼。
- **這支腳本就是這次改動的 migration 紀錄**，刻意留在版控裡。
  它的退場條件寫在檔頭：等到「不可能還有 `base_salary_snapshot = 0` 的正式列」
  之後才能刪。

**順序做錯的症狀。** 三種裡只有第一種是安靜的 ——
而安靜的那一種剛好是最可能發生的那一種（少做一步，不是做錯一步）：

| 做錯什麼                                   | 會不會噴錯 | 症狀                                                                                                                                              |
| ------------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **完全沒跑回填**                           | **不會**   | 上線當天畫面乾淨（每一列 `±0`）；下一次發薪存進去的那一筆會顯示「較上一筆 +現值」，看起來是一次巨額調薪。全程 API 回 200、測試全綠（詳見 §1.4.1） |
| 先跑回填再 `db push`（client 已 generate） | 會         | Postgres 噴 `column "base_salary_snapshot" does not exist`，一列都沒寫進去                                                                        |
| `db push` 了但沒 `generate`                | 會         | 腳本自己就是 TypeScript，`prisma.salaryRecord.update` 那一行 tsc 就過不了                                                                         |

換句話說：**後兩種會自己攔住你，第一種不會。** 檢查方式在 §5。

## 3. 部署步驟

```bash
# 1. 套用 schema
npx prisma db push

# 2. 型別改了一定要重新產 client
npx prisma generate

# 3. 回填 base_salary_snapshot（20260909 起必跑，見 §2.3）
npx tsx scripts/backfill_salary_record_base_salary.ts --dry-run
npx tsx scripts/backfill_salary_record_base_salary.ts
```

> ⚠️ **三步的順序不可調換，而且第 3 步沒跑不會有任何錯誤訊息。**
> 逐一的症狀列在 §2.3 那張表裡。

> ⚠️ **不要跑 `npx prisma format`。** 它會刪掉 `schema.prisma` 裡所有文件註解的
> 空 `*` 行（20260909 那次一口氣刪了 194 行、diff 膨脹成 697 行），
> 並重排與當次 PR 無關的 model —— 而那是全 repo 衝突面最高的檔案。
> 這段警告也寫在 `schema.prisma` 的檔頭。

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

- [ ] **確認 `base_salary_snapshot` 的回填真的跑過**（20260909 新增，見 §2.3）。

      這一條需要人工確認，而且**只能用 SQL 確認**。理由寫在 §1.4.1：
      沒跑回填是唯一不會噴錯的做錯方式，而且它上線當天連畫面都是乾淨的 ——
      錯的數字要等到下一次發薪才出現，那時候沒有人會聯想到部署少跑一步。

      ```sql
      -- 回填後應該只剩下腳本印出來的那幾列（inputSnapshot 取不到 baseSalaryTaxable），
      -- 以及本薪本來就是 0 的員工（少見但合法：只領津貼的部分工時）
      select count(*) from salary_record where base_salary_snapshot = 0;
      ```

      數字對不上腳本結尾那行 `skipped=N` 的話，**先不要上線** ——
      對不上的意思是「有列沒被掃到」，而那些列會在畫面上顯示成一次巨額調薪。

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
npm run test:tz         # `npm run test` 已經含這一步；單獨列是因為 20260908 起
                        # 有到職日等日期欄位，UTC 以外的時區跑過才算數
npm run test:no-dotenv
npm run test:e2e        # 真資料庫；20260909 起薪資那兩支才第一次真的跑得起來
npm run version         # 版號 bump（code_review_checklist §6.2）
```

## 7. 回退

**四張表**（`salary_calculator_employee`、`salary_record`、
`salary_pay_slip_delivery`、`salary_employee_profile_change`）
都沒有任何既有功能依賴，回退就是把 schema 的四個 model 與反向關聯刪掉，
重跑 `db push`。資料會一併消失 —— 若當時已經有正式薪資紀錄，先匯出。

> Info: (20260909 - Julian) 回退到 §1.4 之前的話，另外兩處也要拆：
> `salary_record` 的 `base_salary_snapshot` 與 `deleted_at`。
> **`deleted_at` 拆掉之前要先確認沒有任何已軟刪除的列** ——
> 直接刪欄位會讓那些列重新出現在清單與匯出裡，而那是使用者以為已經刪掉的紀錄。
> `AuditLogDataType` 的 `SALARY_RECORD` 可以留著（多一個沒人用的 enum 值無害），
> 硬要拆的話得先清掉引用它的 `audit_log` 列，否則 `db push` 會被擋。

**順序有兩個限制**：`salary_pay_slip_delivery` 以 `onDelete: Cascade` 指向
`salary_record`，所以要刪的話它必須**先**走；而
`salary_employee_profile_change` 以 `Restrict`（預設）指向
`salary_calculator_employee`，所以它也必須排在員工表之前。
反過來都會撞外鍵。

只回退 PR B（保留薪資紀錄、拿掉寄送功能）也是可以的：刪掉
`SalaryPaySlipDelivery` 這一個 model 與三處反向關聯即可，
另外三張表（`salary_calculator_employee`、`salary_record`、
`salary_employee_profile_change`）都不受影響。
