# 部署檢查表 —— 薪資紀錄模組（2026 Q3）

> 對應：`documents/architecture/salary_record_module_plan.md`
> 撰寫：20260831 - Julian
> 涵蓋 PR 1（資料層與後端骨架）。API 端點（PR 2）與前端（PR 3、PR 4）不改 schema，
> 但**版號 bump 每個 PR 都要做**（`code_review_checklist §6.2`）。

---

## 1. 這次改了什麼 schema

新增兩張表，**沒有動任何既有欄位**：

| 表 | 新增欄位（全部） |
|---|---|
| `salary_calculator_employee` | `id`, `name`, `employee_number`, `email`, `active_email`, `base_salary`, `meal_allowance`, `account_book_id`, `employee_id`, `created_at`, `updated_at`, `deleted_at` |
| `salary_record` | `id`, `year`, `month`, `input_snapshot`, `result_snapshot`, `total_payment`, `total_salary_taxable`, `total_employer_cost`, `calculator_version`, `employee_id`, `account_book_id`, `created_by_user_id`, `created_at`, `updated_at` |

另外在 `account_book`、`employee`、`user` 三個 model 加了反向關聯宣告 ——
那是 Prisma 層的宣告，**不產生任何 DB 欄位**。

## 2. 需不需要回填

**不需要。** 兩張表都是全新的，既有列上沒有新的必填欄位，
所以 `prisma db push` 不會因為「既有列填不出必填欄位」而中止。

這是本專案裡最單純的一種 schema 改動；下一個加欄位到既有表的人不會這麼幸運，
屆時要先寫回填再 push（`code_review_checklist §5.3`）。

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
