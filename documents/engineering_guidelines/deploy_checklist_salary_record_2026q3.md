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

| 表 | 新增欄位（全部） |
|---|---|
| `salary_calculator_employee` | `id`, `name`, `employee_number`, `email`, `active_number`, `base_salary`, `meal_allowance`, `account_book_id`, `employee_id`, `created_at`, `updated_at`, `deleted_at` |
| `salary_record` | `id`, `year`, `month`, `input_snapshot`, `result_snapshot`, `total_payment`, `total_salary_taxable`, `total_employer_cost`, `calculator_version`, `employee_id`, `account_book_id`, `created_by_user_id`, `created_at`, `updated_at` |

另外在 `account_book`、`employee`、`user` 三個 model 加了反向關聯宣告 ——
那是 Prisma 層的宣告，**不產生任何 DB 欄位**。

## 1.1 PR 4 的身分鍵調整（後來改的）

PR 1 原本用 **Email** 當唯一鍵（`active_email` + `@@unique([account_book_id, active_email])`），
PR 4 改成用 **員工編號**。差異：

| 欄位 | PR 1 | PR 4（現況） |
|---|---|---|
| `employee_number` | 可空 | **必填** |
| `email` | 必填 | **可空** |
| 部分唯一索引欄 | `active_email` | **`active_number`** |
| 複合唯一鍵 | `(account_book_id, active_email)` | **`(account_book_id, active_number)`** |

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

| 變數 | 預設 | 用途 |
|---|---|---|
| `SALARY_RL_WRITE_PER_MINUTE` | 30 | `SALARY_WRITE` 限流桶的每分鐘上限 |
| `SALARY_RL_WRITE_PER_DAY` | 300 | 同上，每日上限 |

## 5. 上線前的阻擋項

- [ ] **薪資快照要不要加密入庫**（計劃書 §13 第 1 點）。
      目前 `input_snapshot` / `result_snapshot` 是明文 Json，靠 `account_book_id`
      租戶隔離與 `assertAccountBookMember` 授權把關。
      ADR 018 把薪資列為高敏感 PII，**正式上線前必須由 Luphia 或安全負責人拍板**。
      若判定要加密：兩欄改成 `*_cipher` + `pii_key_version`，
      三個金額欄位維持明文供查詢，並確認 `SalaryRecord` 是否納入 `HrPiiTable`
      （`src/repositories/hr_pii_invariant.ts` 會要求 `id` 不得有 `@default`）。
- [ ] 若上一點判定要加密，**在有任何正式資料之前**改完 —— 這是它現在可逆的唯一原因。

## 6. 送審前必跑

```bash
npx prisma generate     # 沒跑這一步，下面的 tsc 會找不到 prisma.salaryRecord
npx tsc --noEmit
npm run test
npm run test:no-dotenv
npm run version         # 版號 bump（code_review_checklist §6.2）
```

## 7. 回退

兩張表沒有任何既有功能依賴，回退就是把 schema 的兩個 model 與三處反向關聯刪掉，
重跑 `db push`。資料會一併消失 —— 若當時已經有正式薪資紀錄，先匯出。
