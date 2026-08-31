# 薪資紀錄模組實作計劃（Salary Record Module）

> 分支：`feature/salary_calculator`
> 撰寫：20260831 - Julian
> 相關：ADR 018（HR PII 分級）、ADR 020（資遣費估算，§4 已預先替薪資模組開規格）、
> `documents/architecture/time_attendance_module_plan.md`（本文格式與拆分方式的參考）

---

## 0. 需求與已定案決策

### 0.1 需求

1. 在薪資計算機新增員工列表，儲存員工的薪資紀錄，可查閱。
2. 因此計算機需要一顆「儲存」按鈕。
3. 薪資資料格式與計算機現有欄位一致，資料掛在**帳本（AccountBook）**之下。
4. 只有登入用戶可以使用；**未登入者現有功能完全不受影響**。

### 0.2 五項已定案的決策（本計劃以此為前提）

| # | 決策 | 選擇 |
|---|---|---|
| D1 | 員工資料源 | **新建輕量表 `SalaryCalculatorEmployee`**，另留 `employeeId?` 可選外鍵指向 HR `Employee`，供日後合併 |
| D2 | 紀錄內容 | **輸入 + 結果快照都存** |
| D3 | 唯一性 | **`(帳本, 員工, 年, 月)` 唯一，重存即覆寫** |
| D4 | 範圍 | **儲存 + 查閱最小閉環**；薪資單寄送／重寄維持現狀不動 |
| D5 | 路由 | **登入版與公開版拆成兩條路由**：公開 `/salary_calculator`、登入 `/user/account_book/[account_book_id]/salary_calculator`。已登入者開公開頁**不自動導走**，改在頁面上給一顆帶說明的入口 |

---

## 1. 現況盤點（實作前必須知道的事實）

### 1.1 前端

- 計算機的全部狀態在 `src/contexts/calculator_context.tsx`（752 行）。輸入欄位 **35 個**，
  分四步驟：基本資料（13）、本薪（4）、工時（13）、其他（8）。
- 計算是**純前端純函式**：`getSalaryCalculatorOptions()`（L282）打包成 `ISalaryCalculatorOptions`
  → `salaryCalculator()`（`src/lib/utils/salary_calculator.ts`，572 行）→ `getSalaryCalculatorResult()`（L346）
  映射成 `ISalaryCalculatorUI`。**沒有任何 API**。
- Context **沒有批次載入入口**，只有 35 個個別 setter 與一個 `resetFormHandler()`（L416）。
  「從紀錄載回計算機」必須新增批次入口。
- 現有頁面全是假資料：`employee_list.tsx` 用 `dummyEmployeeForCalc`、`my_pay_slip_page_body.tsx`
  用 `dummyReceivedData/dummySentData`、`employee_action_modal.tsx` 的新增/編輯只有 `console.log`。
- `basic_info_form.tsx` L210 的員工選單被 `&& false` 硬性關閉；
  `salary_result_section.tsx` L102–111 的「寄出薪資單」按鈕整段被註解。

### 1.2 後端

- **schema 完全沒有薪資 model**（ADR 020 §1 已確認）。HR `Employee` 系列存在且完整。
- 帳本是 `AccountBook`（`prisma/schema.prisma:811`），權限鏈 `User →(TeamMember)→ Team → AccountBook`。
- 授權收斂點**已存在**：`assertAccountBookMember(accountBookId, userId)`
  （`src/services/account_book_access.guard.ts:20`），附帶 `mapServiceError()`。
- 登入一律走 `Authorization: Bearer <DeWT>` → `getIdentityFromDeWT(authHeader)`（`src/lib/auth/dewt.ts:101`）。
  **沒有 cookie session**。
- 帳本清單端點**已存在**：`GET /api/v1/user/account_book`（回登入者可存取的帳本）。
- 專案**沒有 `prisma/migrations/`**，schema 一律 `prisma db push` + `prisma generate`。

### 1.3 一個陷阱，與一個已經做好的東西

**陷阱：不要用 `attendanceIdentityService.resolveEmployee()` 當授權閘。**
HR 模組的 route 用它把登入者換成 `Employee`，但它在「這個帳本沒有你的員工檔」時
丟 `NF_EMPLOYEE_FOR_USER`（404）。
薪資計算機的使用者是帳本的**團隊成員**（老闆／會計），不必是 HR 員工檔上的人。
本模組一律用 `assertAccountBookMember()`。

**已經做好的：`/user/account_book/default/<module>` 的帳本解析鏈。**

1. `src/app/user/account_book/[account_book_id]/layout.tsx:22` —— id 是 `"default"` 就渲染 `RedirectDefault`
2. `redirect_default.tsx:25` —— 導向 `/user/account_book?uri_query=<原本的後綴>`
3. `src/app/user/account_book/page.tsx:101` 讀 `uri_query`，`:234` 把它接在選中的帳本 id 後面
4. `src/components/landing_page/features.tsx:47` —— 首頁的功能卡片就是這樣連進各模組的

所以登入版計算機的入口只要是一個指向 `/user/account_book/default/salary_calculator` 的 `Link`。
帳本的選擇、記憶與切換**完全不用自己寫**（決策見 §2.4）。

### 1.4 精度現況

計算引擎內部全是原生 `number`，但**輸出前有 19 處 `Math.round`**
（`salary_calculator.ts:115,133,134,372,413,439,448,457,…`），實務上所有金額欄位都是整數元。
落地時仍必須 fail fast 驗證（見 §3.3），不能假設。

---

## 2. 架構決策

### 2.1 為什麼命名空間是 `salary_calculator` 而不是 `payroll`

ADR 020 §4 已經替**正式薪資模組**開好規格：以 `(employeeId, 年月)` 為鍵的薪資表、
每個薪資項目要有「是否為經常性給與」旗標、提供共用的「取平均工資」查詢。
本模組只是把計算機的試算結果存起來，**沒有**項目層級的經常性給與旗標，
也不打算成為資遣費計算的資料源。

因此 API 路徑用 `.../salary_calculator/...`，`payroll` 命名空間留給 ADR 020 的正式模組。
本模組的資料日後是它的**遷移來源**，不是它本身。

`prisma/schema.prisma:2125` 那條「`EmployeeHrFunction` 要加 `PAYROLL` 值」的 ToDo
屬於正式模組，**本次不動**。

### 2.2 為什麼快照用 JSON 而不是 69 個純量欄位

| | 69 個純量欄位 | JSON 快照（採用） |
|---|---|---|
| 精度守衛 | Database Boundary Guard 全涵蓋 | JSON 內的數字繞過守衛 |
| 可查詢／彙總 | 可以 | 不行（除非抽欄位） |
| schema 體積 | 兩張表 +69 欄 | 兩張表 +2 欄 |
| 演進成本 | 計算機每加一個欄位就要改 schema + 回填 | 型別改了就好 |

採 JSON 的理由：`ISalaryCalculatorOptions`（34 欄）與 `ISalaryCalculatorResult`（34 欄）
是**計算引擎的契約**，會隨法規年度演進；把它攤成 69 個欄位等於把引擎契約焊進 DB schema，
而這個專案沒有 migrations，每次演進都要手寫回填 SQL。

**繞過精度守衛的代價用兩道措施補**：

1. 真正需要拿去排序／篩選／對帳的三個金額，**抽成 `BigInt` 純量欄位**
   （`totalPayment`、`totalSalaryTaxable`、`totalEmployerCost`），走守衛。
2. JSON 入庫前一律過 Zod schema（`salaryRecordSnapshotSchema`），
   欄位數、型別、整數性全部驗過才寫（§3.3、§5）。

### 2.3 為什麼輕量員工表要用 soft delete（與 HR Employee 相反）

`Department` / `JobTitle` / `Employee` 都沒有 `deletedAt`（改用狀態欄位）。
本表刻意不同：`employee_list.tsx` 現在就有刪除按鈕，而薪資紀錄是對外憑據，
員工被刪掉不能讓歷史紀錄一起消失或變成孤兒。
`code_review_checklist.md §3.4` 要求「硬刪 vs 改狀態」的選擇必須明說 —— 這就是那段說明。

**衍生問題**：`@@unique([accountBookId, email])` 配 soft delete，
會導致「刪掉的員工，同 Email 無法重新加入」。
Prisma 表達不了 partial unique index，依 `code_review_checklist.md §5.3` 的指引，
用 **nullable 唯一欄位**替代：

- `email String` — 一律保留，顯示與寄送用
- `activeEmail String?` — 在存活期間等於 `email`，soft delete 時設為 `null`
- `@@unique([accountBookId, activeEmail])`

寫入路徑集中在 repository，不讓 service 自己維護這組不變式（配 §8.2 的不變式測試）。

### 2.4 路由拆分：公開版與登入版是兩條路由

本計劃的第一版是「單一路由 + 元件層登入閘 + 自製帳本選擇器」。
改成兩條路由之後，那三樣自製的東西全部不需要：

| 第一版要自己做的 | 兩條路由之後 |
|---|---|
| `SalaryAuthGate` 元件（抄 `AttendanceAuthGate` 三態） | `src/app/user/layout.tsx:24` 既有的 `AuthGuard` |
| `useSalaryAccountBook()` hook + localStorage 記憶 | `params.account_book_id`（`use_dashboard_data.ts:53` 的既有慣例） |
| `CalculatorHeader` 上的帳本切換器 | `/user/account_book/default/...` 解析鏈（§1.3） |
| 把 `salary_calculator` 移出 `PUBLIC_ROOTS` | **兩份清單都不用改**：`user` 本來就在 `GUARDED_ROOTS`、`salary_calculator` 本來就在 `PUBLIC_ROOTS` |

路由對照：

| 路由 | 需登入 | 外框 | 內容 |
|---|---|---|---|
| `/salary_calculator` | 否 | `CalculatorHeader` | 試算（現狀）＋ 登入者可見的「到帳本版」入口 |
| `/salary_calculator/operating_mechanism` | 否 | `CalculatorHeader` | 計算說明（純內容，留在公開側） |
| `/user/account_book/[account_book_id]/salary_calculator` | 是 | `UserLayout` | 試算 ＋ 儲存 |
| `.../salary_calculator/employee_list` | 是 | `UserLayout` | 員工列表 |
| `.../salary_calculator/records` | 是 | `UserLayout` | 薪資紀錄查閱 |

**刪除** `/salary_calculator/pay_slip` 與 `/salary_calculator/employee_list`：
它們的導覽連結本來就被註解（`calculator_header.tsx:50-65`），只能靠直接打網址進入，
內容全是 dummy —— 這是刪掉沒人在用的死路由，不是搬遷功能。

`src/constants/url.ts` 的四條常數隨之拆成兩組：公開側的兩條維持常數，
帳本側的三條改成 `salaryCalculatorUrlOf(accountBookId)` 函式
（帶路徑參數的一律用函式，照 `src/constants/leave_api.ts` 的形狀）。

#### 已登入者開公開頁，不自動導走

三個理由：

1. 自動導走得先解出帳本 id，等於又跑一次 default → 選擇頁；使用者只是想快速試算，
   卻被丟去選帳本。
2. 公開頁的連結會被分享出去；登入者點開之後被踢到另一個網址，很難解釋。
3. `/salary_calculator` 是可以做 SEO 的公開工具頁，redirect 會傷。

改成在公開頁上放一顆帶說明的入口（§8.2）。
這也讓需求第 4 點「未登入者只能使用現有功能」維持字面成立：
公開頁的**行為不因登入而改變**，只是多一個出口。

#### 唯一的重複風險是頁面組裝，不是路由

兩條路由都渲染同一個 `CalculatorProvider` + `SalaryCalculatorPageBody`，
唯一的差異是外框，以及一個從 page 往下傳的 `accountBookId: string | null`
（`null` = 公開試算模式）。

**不要在子元件內部各自 `useAuth()` 判斷** —— 那才會長成兩套要各自維護的頁面。
分岔點只有一個，就是那個 prop。

#### 副作用：FaithAgent

`src/app/user/account_book/[account_book_id]/layout.tsx:28` 會掛 `FaithAgent` 浮動按鈕，
所以帳本版計算機會自動多一顆。目前判定可接受（與該路由下其他模組一致）；
若不要，需在帳本 layout 加路徑排除 —— 那是帳本 layout 的改動，不在本模組範圍。

---

## 3. 資料層

### 3.1 Prisma schema（新增兩個 model）

加在 `prisma/schema.prisma` 的 HR 區塊之後。

```prisma
// Info: (20260831 - Julian) 薪資計算機的輕量員工名單。
// 與 HR `Employee` 分離：計算機只需要姓名/編號/Email/本薪/伙食費五個欄位，
// 而 `Employee` 的 employeeNo / gender / hireDate / phoneCipher 都是必填，
// 且 PII 要走 AES-256-GCM（ADR 018）—— 讓試算工具背上那套流程並不合理。
// `employeeId` 是日後與 HR 員工檔合併的接點，現階段一律為 null。
model SalaryCalculatorEmployee {
  id     String  @id @default(uuid())
  name   String
  number String? @map("employee_number")

  // Info: (20260831 - Julian) 顯示與寄送用，soft delete 後仍保留
  email String

  /**
   * Info: (20260831 - Julian) 帳本內「存活中」員工的 Email 唯一性。
   * Prisma 表達不了 partial unique index，依 code_review_checklist §5.3
   * 改用 nullable 唯一欄位：存活時等於 email，soft delete 時設為 null，
   * 好讓同一個 Email 之後能重新加入。維護點只在 repository。
   */
  activeEmail String? @map("active_email")

  baseSalary    BigInt @map("base_salary")
  mealAllowance BigInt @default(0) @map("meal_allowance")

  // Info: (20260831 - Julian) 隸屬的帳本 (租戶 Root Node)
  accountBookId String      @map("account_book_id")
  accountBook   AccountBook @relation(fields: [accountBookId], references: [id])

  // Info: (20260831 - Julian) 與 HR 員工檔的接點，未合併前為 null
  employeeId String?   @unique @map("employee_id")
  employee   Employee? @relation(fields: [employeeId], references: [id], onDelete: SetNull)

  salaryRecords SalaryRecord[]

  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  @@unique([accountBookId, activeEmail])
  @@index([accountBookId])
  @@map("salary_calculator_employee")
}

// Info: (20260831 - Julian) 一位員工在某個年月的薪資紀錄。
model SalaryRecord {
  id String @id @default(uuid())

  // Info: (20260831 - Julian) 給付期間。不用 timestamp，因為薪資的鍵本來就是年月
  year  Int
  month Int

  /**
   * Info: (20260831 - Julian) 輸入與結果的完整快照。
   * 形狀分別是 ISalaryCalculatorOptions（34 欄）與 ISalaryCalculatorUI，
   * 入庫前一律過 salaryRecordSnapshotSchema 驗證（決策見計劃書 §2.2）。
   */
  inputSnapshot  Json @map("input_snapshot")
  resultSnapshot Json @map("result_snapshot")

  // Info: (20260831 - Julian) 需要排序/篩選/對帳的三個金額抽成純量欄位，走精度守衛
  totalPayment       BigInt @map("total_payment")
  totalSalaryTaxable BigInt @map("total_salary_taxable")
  totalEmployerCost  BigInt @map("total_employer_cost")

  /**
   * Info: (20260831 - Julian) 產生這筆紀錄時的級距表年度與引擎版本。
   * 法規年度更新後，這一欄是「這張薪資單當初是用哪一版算的」的唯一依據。
   */
  calculatorVersion String @map("calculator_version")

  employeeId String                   @map("employee_id")
  employee   SalaryCalculatorEmployee @relation(fields: [employeeId], references: [id])

  accountBookId String      @map("account_book_id")
  accountBook   AccountBook @relation(fields: [accountBookId], references: [id])

  // Info: (20260831 - Julian) 誰按下的儲存
  createdByUserId String @map("created_by_user_id")
  createdBy       User   @relation(fields: [createdByUserId], references: [id])

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@unique([accountBookId, employeeId, year, month])
  @@index([accountBookId])
  @@index([employeeId])
  @@index([accountBookId, year, month])
  @@map("salary_record")
}
```

`AccountBook`、`Employee`、`User` 三個 model 各要加一行反向關聯：

```prisma
// AccountBook 內，接在 HR 區塊後
  // Info: (20260831 - Julian) 薪資計算機
  salaryCalculatorEmployees SalaryCalculatorEmployee[]
  salaryRecords             SalaryRecord[]

// Employee 內
  salaryCalculatorEmployee SalaryCalculatorEmployee?

// User 內
  createdSalaryRecords SalaryRecord[]
```

### 3.2 為什麼 `SalaryRecord` 不做 soft delete

紀錄是「這個月算出來的薪資」，刪掉就是刪掉，沒有「刪了還要看得到」的情境；
而覆寫（D3）本來就會蓋掉舊值。若日後需要改動軌跡，走 `AuditLog`
（`prisma/schema.prisma:902`）而不是在這張表堆版本 —— 這與 D3 的「唯一，重存即覆寫」是同一個決定。

### 3.3 落地時的 fail fast（CLAUDE.md §6）

抽成 `BigInt` 的三個金額，在 service 轉型前必須斷言為整數：

```ts
// Info: (20260831 - Julian) 引擎輸出的金額都經過 Math.round，但那是引擎的內部承諾。
// 非整數代表引擎改了而這裡沒跟上 —— 讓它在寫入前就爆，不要靜默 truncate。
const toWholeAmount = (value: number, field: string): bigint => {
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw new AppError(API_ERRORS.VA_SALARY_AMOUNT_NOT_INTEGER);
  }
  return BigInt(value);
};
```

---

## 4. 型別（`src/interfaces/`）

新增 `src/interfaces/salary_record.ts`：

```ts
// Info: (20260831 - Julian) 輕量員工（前端格式）
export interface ISalaryCalculatorEmployee {
  id: string;                 // uuid，取代 dummyEmployeeForCalc 的 number id
  name: string;
  number: string;
  email: string;
  baseSalary: number;
  mealAllowance: number;
}

// Info: (20260831 - Julian) 新增/編輯員工的輸入
export interface ISalaryCalculatorEmployeeWriteInput {
  name: string;
  number?: string;
  email: string;
  baseSalary: number;
  mealAllowance: number;
}

// Info: (20260831 - Julian) 薪資紀錄（列表用，不含快照，避免列表回傳肥大）
export interface ISalaryRecordSummary {
  id: string;
  year: number;
  month: number;
  employee: { id: string; name: string; number: string };
  totalPayment: number;
  totalSalaryTaxable: number;
  totalEmployerCost: number;
  calculatorVersion: string;
  createdAt: number;          // Unix 秒，沿用 IVoucher 的前端時間戳慣例
  updatedAt: number;
}

// Info: (20260831 - Julian) 薪資紀錄（詳細，含快照）
export interface ISalaryRecordDetail extends ISalaryRecordSummary {
  input: ISalaryCalculatorOptions;
  result: ISalaryCalculatorUI;
}

// Info: (20260831 - Julian) 儲存薪資紀錄的輸入
export interface ISalaryRecordWriteInput {
  employeeId: string;
  year: number;
  month: number;
  input: ISalaryCalculatorOptions;
  result: ISalaryCalculatorUI;
  calculatorVersion: string;
}
```

**同時要處理的既有型別債**：`src/interfaces/employees.ts:52` 的 `IEmployeeForCalc.id` 是 `number`，
與 uuid 對不上。`employee_list.tsx` / `employee_list_modal.tsx` / `employee_action_modal.tsx`
改接 `ISalaryCalculatorEmployee` 後，`IEmployeeForCalc` 與 `dummyEmployeeForCalc` 一併移除。

`calculatorVersion` 的來源：新增 `SALARY_CALCULATOR_VERSION` 到
`src/constants/salary_calculator.ts`，格式 `"2026.1"`（級距表年度 + 引擎修訂號），
改動 `src/constants/salary_levels/` 或 `salary_calculator.ts` 時同步 bump。

---

## 5. Validator（`src/validators/salary_record.ts`）

CLAUDE.md §2：Zod schema 嚴禁寫在 `route.ts`，一律放 `src/validators/` 並由 `index.ts` re-export。

```ts
export const salaryCalculatorEmployeeWriteSchema = z.object({
  name: z.string().trim().min(1).max(100),
  number: z.string().trim().max(50).optional(),
  email: z.string().trim().email(),
  baseSalary: z.number().int().nonnegative(),
  mealAllowance: z.number().int().nonnegative(),
});

// Info: (20260831 - Julian) 快照是 Json 欄位，DB 不會替我們檢查形狀，
// 因此這裡逐欄釘死 —— 這是 Json 欄位唯一的守門人。
export const salaryCalculatorOptionsSchema = z.object({ /* 34 欄逐一列出 */ });
export const salaryCalculatorUiSchema = z.object({ /* 四個區塊 + 兩個頂層金額 */ });

export const salaryRecordWriteSchema = z.object({
  employeeId: z.string().uuid(),
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
  input: salaryCalculatorOptionsSchema,
  result: salaryCalculatorUiSchema,
  calculatorVersion: z.string().min(1).max(20),
});

export const salaryRecordQuerySchema = z.object({
  employeeId: z.string().uuid().optional(),
  year: z.coerce.number().int().optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
```

`src/validators/index.ts` 加 `export * from "@/validators/salary_record";`。

---

## 6. Repository 與 Service

### 6.1 `src/repositories/salary_calculator_employee.repo.ts`

照 `voucher.repo.ts` 的形狀：`export interface I…Repository` + `class … implements …` + 檔尾單例。

- `listEmployees(accountBookId)` — `where.accountBookId` 是 where 物件的第一個 key，
  且一律 `deletedAt: null`
- `getEmployeeById(accountBookId, id)` — **帳本 id 一定要進 where**，
  不可以只用 id 查再比對（`route_params_contract.test.ts` 的成因就是這類跨租戶洩漏）
- `createEmployee(...)` / `updateEmployee(...)` — 同步維護 `activeEmail = email`
- `softDeleteEmployee(...)` — 同時設 `deletedAt = new Date()` 與 `activeEmail = null`
- `transformToFrontendFormat()` — `BigInt → number`（薪資是整數元，
  用 `MoneyUtil.toDecimal(v).toNumber()`，不用裸 `Number()`）

### 6.2 `src/repositories/salary_record.repo.ts`

- `upsertRecord({...})` — 用 `prisma.salaryRecord.upsert` 搭
  `@@unique([accountBookId, employeeId, year, month])` 的複合鍵，這是 D3「重存即覆寫」的落地點
- `listRecords(options)` / `countRecords(options)` — 手刻 `skip`/`take`（專案沒有共用分頁工具）
- `getRecordById(accountBookId, id)`
- `deleteRecord(accountBookId, id)`

回應形狀採 `ILedgerPageResult` 那一套（`data / page / pageSize / totalCount / totalPages`），
它是專案裡最近新寫、且明說「與 route 回應結構一致」的分頁形狀。

### 6.3 `src/services/salary_record.service.ts`

Constructor 注入兩個 repository（配合 §8 的假 repository 測試慣例），檔尾匯出單例。

```ts
export class SalaryRecordService {
  constructor(
    private readonly employeeRepo: ISalaryCalculatorEmployeeRepository,
    private readonly recordRepo: ISalaryRecordRepository,
  ) {}

  async save({ accountBookId, userId, input }: {...}) {
    // Info: (20260831 - Julian) 員工必須屬於同一本帳，否則就是跨租戶寫入
    const employee = await this.employeeRepo.getEmployeeById(accountBookId, input.employeeId);
    if (!employee) throw new AppError(API_ERRORS.NF_SALARY_CALCULATOR_EMPLOYEE);
    // 金額整數性斷言 → BigInt（§3.3）
    // upsert
  }
}
```

**授權不在 service 內做**，統一在 route 呼叫既有的 `assertAccountBookMember()`
（`src/services/account_book_access.guard.ts:20`），與現有寫法一致。

### 6.4 錯誤字典（`src/lib/utils/error_dictionary.ts`）

新增四筆，編號接續各前綴目前最大值（送 PR 前確認）：

| 常數 | 前綴 | status |
|---|---|---|
| `NF_SALARY_CALCULATOR_EMPLOYEE` | NF | `NOT_FOUND` |
| `NF_SALARY_RECORD` | NF | `NOT_FOUND` |
| `CF_SALARY_EMPLOYEE_EMAIL_DUPLICATED` | CF | `CONFLICT` |
| `VA_SALARY_AMOUNT_NOT_INTEGER` | VA | `VALIDATION_ERROR` |

### 6.5 限流（`src/constants/rate_limit.ts`）

新增 `SALARY_WRITE` 桶，理由與 `LEAVE_WRITE` 不與 `ATTENDANCE_WRITE` 共用相同：
既有的 `SAVE` 桶（60/min）是碳排報告 autosave 訂的，兩者成本屬性無關，共用會互相擠壓。

```ts
[RateLimitBucketEnum.SALARY_WRITE]: [
  { windowMs: MINUTE_MS, max: envInt("SALARY_RL_WRITE_PER_MINUTE", 30) },
  { windowMs: DAY_MS,    max: envInt("SALARY_RL_WRITE_PER_DAY", 300) },
],
```

讀取沿用 `READ`。

---

## 7. API 端點

路徑前綴：`/api/v1/user/account_book/[account_book_id]/salary_calculator`

| 方法 | 路徑 | 限流桶 | 說明 |
|---|---|---|---|
| GET | `/employee` | `READ` | 帳本內的員工列表（未刪除） |
| POST | `/employee` | `SALARY_WRITE` | 新增員工 |
| PUT | `/employee/[employee_id]` | `SALARY_WRITE` | 編輯員工 |
| DELETE | `/employee/[employee_id]` | `SALARY_WRITE` | soft delete |
| GET | `/record` | `READ` | 薪資紀錄列表（可篩 employeeId / year / month，分頁） |
| POST | `/record` | `SALARY_WRITE` | 儲存（upsert，D3 覆寫） |
| GET | `/record/[record_id]` | `READ` | 單筆詳細（含快照，供載回計算機） |
| DELETE | `/record/[record_id]` | `SALARY_WRITE` | 刪除 |

每支 route 的骨架**逐字照抄** `.../hr/leave/policy/route.ts` 的七步驟：

```ts
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ account_book_id: string }> },   // 鍵名必須逐字等於資料夾名
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    // Info: (20260831 - Julian) DeWT 驗證之後、業務邏輯之前（限流規範 §2）
    const limited = enforceRateLimit(sessionUser.address, RateLimitBucketEnum.SALARY_WRITE);
    if (limited) return limited;

    const body = await request.json();
    const parsed = salaryRecordWriteSchema.safeParse(body);
    if (!parsed.success) return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);

    const { account_book_id: accountBookId } = await params;
    await assertAccountBookMember(accountBookId, sessionUser.id);

    return jsonOk(
      await salaryRecordService.save({ accountBookId, userId: sessionUser.id, input: parsed.data }),
    );
  } catch (error) {
    if (error instanceof AppError) {
      return jsonFail({ code: error.apiCode, message: error.message, status: error.code });
    }
    logger.error("[API] salary record save failed", { message: (error as Error).message });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
```

`assertAccountBookMember` 丟的是裸 `Error`（不是 `AppError`），
所以 catch 要先過一次 `mapServiceError(error)` 再包，或在 service 層改丟 `AppError` ——
**建議後者**：在 `salary_record.service.ts` 內包一層 `assertMemberOrThrow()`，
把 `SERVICE_ERROR.*` 轉成 `AppError`，讓 route 的 catch 維持與其他 route 一字不差。

---

## 8. 前端

### 8.1 路由與頁面組裝

新增：

```
src/app/user/account_book/[account_book_id]/salary_calculator/page.tsx
src/app/user/account_book/[account_book_id]/salary_calculator/employee_list/page.tsx
src/app/user/account_book/[account_book_id]/salary_calculator/records/page.tsx
```

刪除：`src/app/salary_calculator/pay_slip/`、`src/app/salary_calculator/employee_list/`（理由見 §2.4）

**本模組不新增任何 `layout.tsx`。** 帳本版的登入閘來自 `src/app/user/layout.tsx:24`，
帳本 id 的解析來自 `src/app/user/account_book/[account_book_id]/layout.tsx:22`，兩者都已存在。

每支 page 只做三件事，照 `/user/account_book/[account_book_id]/dashboard/page.tsx` 的形狀：

```tsx
export default async function SalaryCalculatorPage({
  params,
}: {
  // Info: (20260831 - Julian) 鍵名必須逐字等於資料夾名（route_params_contract.test.ts 會掃）
  params: Promise<{ account_book_id: string }>;
}) {
  const { account_book_id: accountBookId } = await params;

  return (
    <CalculatorProvider>
      <SalaryCalculatorPageBody accountBookId={accountBookId} />
    </CalculatorProvider>
  );
}
```

公開版 `src/app/salary_calculator/page.tsx` 只改一行：`accountBookId={null}`。

`SalaryCalculatorPageBody` 新增唯一的分岔 prop：

```tsx
interface ISalaryCalculatorPageBodyProps {
  /**
   * Info: (20260831 - Julian) null = 公開試算模式（未登入，或登入者停在公開路由）。
   * 這是公開版與帳本版的**唯一**分岔點。
   * 子元件不要另外用 useAuth() 判斷 —— 兩個判斷來源遲早會不一致（計劃書 §2.4）。
   */
  accountBookId: string | null;
}
```

往下傳給 `SalaryResultSection`（儲存按鈕／入口按鈕）與 `BasicInfoForm`（員工選單）。

**外框**：帳本版由 `UserLayout` 提供 `UserHeader` / `UserFooter`，
**不渲染** `CalculatorHeader` —— 它自帶 BrandLogo、LanguageSelector、UserActions，
掛在 `/user/**` 底下會與 `UserHeader` 疊兩層。
`CalculatorHeader` 只留給公開版，其中被註解的導覽連結（L50–65）**不恢復**：
那兩個頁面已經搬到帳本路由下，公開側不該有入口。

### 8.2 公開頁的「到帳本版」入口

位置：`salary_result_section.tsx`，條件 `accountBookId === null && user`。
未登入時整塊不出現 —— 公開頁對未登入者維持一模一樣的行為（需求第 4 點）。

```tsx
{accountBookId === null && user && (
  <Link href={SALARY_CALCULATOR_ACCOUNT_BOOK_ENTRY}>
    {t("calculator.account_book_entry.button")}
  </Link>
)}
```

`src/constants/url.ts`：

```ts
// Info: (20260831 - Julian) default 會被帳本 layout 攔下來，導去帳本選擇頁再帶回同一個後綴
export const SALARY_CALCULATOR_ACCOUNT_BOOK_ENTRY =
  "/user/account_book/default/salary_calculator";
```

按鈕旁的說明文案要講清楚三件事（三個 i18n key），第三點尤其不能省：

1. 帳本版可以儲存薪資紀錄、管理員工列表
2. 需要先選一個帳本，資料會存在該帳本底下
3. **這次試算的內容不會帶過去** —— 跨路由搬 34 個輸入欄位要序列化進 query
   或 sessionStorage，是另一個議題，本次不做（列在 §12）

### 8.3 儲存按鈕（帳本版）

位置：`salary_result_section.tsx`，條件 `accountBookId !== null`，
放在既有「下載 PNG」按鈕旁 —— 也就是那段被註解的「寄出薪資單」按鈕（L102–111）的位置，
但**不要**順手把它打開，那超出本次範圍。

因為已經在 `AuthGuard` 底下、帳本 id 由路由保證存在，
按鈕只有**兩態**：可按 / 儲存中。
（第一版設計的「未登入 → 開 AuthModal」「已登入但沒帳本 → disabled」兩個分支，
連同 `AuthModal` 的引入一起消失。）

儲存 Modal（新 `save_salary_record_modal.tsx`）：

- 員工下拉（來自員工列表 API；可直接開 `EmployeeActionModal` 新增）
- 年／月預帶 context 的 `selectedYear` / `selectedMonth`
- 若該員工該年月**已有紀錄**，Modal 要明說「將覆蓋既有紀錄」（把 D3 攤在使用者眼前）

### 8.4 API 常數（`src/constants/salary_calculator_api.ts`）

照 `src/constants/leave_api.ts` 的形狀，但**不硬編碼 demo 帳本** ——
帳本 id 由呼叫端從路由參數傳入：

```ts
export const salaryCalculatorApiOf = (accountBookId: string) =>
  ({
    EMPLOYEE: `/api/v1/user/account_book/${accountBookId}/salary_calculator/employee`,
    RECORD: `/api/v1/user/account_book/${accountBookId}/salary_calculator/record`,
  }) as const;

export const salaryEmployeeItemApi = (accountBookId: string, employeeId: string): string =>
  `${salaryCalculatorApiOf(accountBookId).EMPLOYEE}/${employeeId}`;

export const salaryRecordItemApi = (accountBookId: string, recordId: string): string =>
  `${salaryCalculatorApiOf(accountBookId).RECORD}/${recordId}`;
```

這就是 HR 那四個 `*_api.ts` 的 `Deprecated` 標記所指向的解法（「帳本可切換時改成
`leaveApiOf(accountBookId)`，呼叫端從常數改為函式呼叫」），日後可回頭抄。

### 8.5 員工列表接真 API

`employee_list.tsx`（現在 L99 用 `dummyEmployeeForCalc`）：

- 列表改打 `GET /employee`
- L111–113 的 `keyword` state **目前完全沒有過濾作用**（L123 直接 map 全部）→ 一併補上
- L37–49 被註解成空函式的刪除 handler → 接 `DELETE`
- Pagination（L187–191 被註解）→ 接上分頁

`employee_action_modal.tsx`：L66–105 的 `console.log` → 接 `POST` / `PUT`，
順手修掉 L225「編輯模式仍顯示『新增員工』文案」的 bug。

`employee_list_modal.tsx`（計算機內選員工）改打同一支 API；
`basic_info_form.tsx:210` 的 `&& false` 移除，讓選單重新可用 ——
但這個元件只在帳本版有帳本 id，所以改成 `accountBookId !== null && (`。

### 8.6 薪資紀錄查閱頁

`/user/account_book/[account_book_id]/salary_calculator/records`：

- 列表欄位：年月、員工、實發金額、扣繳憑單金額、建立時間、操作
- 篩選：員工／年／月；分頁
- 點列開 `ViewPaySlipModal`，把 `resultSnapshot` 直接餵給既有的 `<PaySlip>` ——
  **那個元件完全不用改**（它本來就吃 `resultData: ISalaryCalculatorUI` prop）
- 「載回計算機」按鈕 → 呼叫 §8.7 的批次載入後導向同帳本的計算機頁

`UserHeader` 的導覽要加薪資計算機的入口（帳本版），
沿用該元件現有的選單結構，不另建導覽。

### 8.7 Context 新增批次載入入口

`calculator_context.tsx` 新增：

```ts
// Info: (20260831 - Julian) 從薪資紀錄載回計算機。
// 是 getSalaryCalculatorOptions()（L282）的反函式，兩者必須成對維護；
// §9 的 round-trip 測試就是釘這件事。
loadFromSnapshot: (input: ISalaryCalculatorOptions) => void;
```

### 8.8 i18n

五個語系（`en` / `ja` / `ko` / `zh_cn` / `zh_tw`）的 `calculator.ts` 各加三個區塊：
`calculator.account_book_entry.*`（§8.2 的按鈕與三段說明）、
`calculator.save_record.*`、`calculator.records.*`。
命名沿用既有的 `calculator.<區塊>.<欄位>` snake_case 兩層結構，插值用 `{{var}}`。

**順手修掉既有的 i18n 壞 key**（獨立 commit，與本模組無關但都在動到的檔案附近）：

- `resending_pay_slip_modal.tsx:71-103` 用 `calculator.MESSAGE.RESEND_PAY_SLIP_*`，字典是 `calculator.message.re_send_pay_slip_*`
- `pay_slip_sent_tab.tsx:123` 用 `payslip_issued_date`，字典是 `pay_slip_issued_date`
- `pay_slip_received_tab.tsx:142` 表頭 `Action` 硬編碼英文

---

## 9. 測試計劃

專案 `testEnvironment: "node"`，**沒有任何一支測試 render React**，
且**不在單元測試裡 mock Prisma**（用手寫的假 repository 注入 service）。

| 測試檔 | 型別 | 釘住什麼 |
|---|---|---|
| `salary_snapshot_roundtrip.test.ts` | 純函式 | `getSalaryCalculatorOptions()` ↔ `loadFromSnapshot()` 來回不失真，35 個欄位一個不漏（用 `Object.keys` 對拍，新增欄位忘了接就會紅） |
| `salary_record_service.test.ts` | service | 覆寫語意（同員工同年月只留一筆）、跨帳本員工被拒（`NF_SALARY_CALCULATOR_EMPLOYEE`）、非整數金額 fail fast |
| `salary_employee_invariant.test.ts` | 不變式 | `activeEmail` 與 `deletedAt` 的配對：存活時 `activeEmail === email`、刪除時為 `null`（§2.3） |
| `salary_route_wiring.test.ts` | route | 照抄 `leave_route_wiring.test.ts`：無票回 401、限流兩行都在且回 429 時 service 呼叫次數沒增加、`params` 鍵名是 `account_book_id`、`userId` 來自 DeWT 而非 request body |
| `salary_schema_defaults.test.ts` | 掃描 | 讀 `prisma/schema.prisma` 原文，釘住 `mealAllowance @default(0)` 等預設值（checklist §1.12：沒有 migrations 時的唯一例外） |
| `app_route_auth_guard.test.ts` | 既有 | **不需修改**：`user` 已在 `GUARDED_ROOTS`、`salary_calculator` 已在 `PUBLIC_ROOTS`，而本模組不新增任何 `layout.tsx`。若有人替公開側加了 `src/app/salary_calculator/layout.tsx`，這支會紅 —— 那是預期的護欄 |
| `route_params_contract.test.ts` | 既有 | **不需修改**，但新增的三支 page 與八支 route 都會被它掃：`params` 的鍵名必須是 `account_book_id`，不能寫成 `accountBookId` |

送審前必跑（`code_review_checklist.md:364`）：

```bash
npx tsc --noEmit
npm run test
npm run test:no-dotenv
```

> ⚠️ 已知環境問題：目前這台開發機跑 `jest` 會 `Bus error`（跑既有測試也一樣，與程式碼無關）。
> 若復現，在 CI 或另一台機器跑完整測試。

---

## 10. 部署

新增 `documents/engineering_guidelines/deploy_checklist_salary_record_2026q3.md`
（`code_review_checklist.md §5.3` 要求：改 schema 的 PR 一律要寫）：

```bash
# 1. 套用 schema（兩張全新的表，既有列上沒有必填欄位問題，不需要回填）
npx prisma db push
# 2. 型別改了一定要重新產 client
npx prisma generate
```

- 順序做錯的症狀：先 `generate` 後 `push` → runtime 找不到 `prisma.salaryRecord`
- 新增的環境變數（皆有 fallback，可不設）：`SALARY_RL_WRITE_PER_MINUTE`、`SALARY_RL_WRITE_PER_DAY`
- 每個 PR 用 `npm run version` bump 版號（checklist §6.2）

---

## 11. 實作順序（建議拆四個可獨立送審的 PR）

### PR 1 — 資料層與後端骨架
- `prisma/schema.prisma` 兩個 model + 三處反向關聯
- `src/interfaces/salary_record.ts`、`src/validators/salary_record.ts`
- 兩支 repository、`salary_record.service.ts`
- `error_dictionary.ts` 四個錯誤碼、`rate_limit.ts` 的 `SALARY_WRITE`
- `SALARY_CALCULATOR_VERSION` 常數
- 測試：`salary_record_service.test.ts`、`salary_employee_invariant.test.ts`、`salary_schema_defaults.test.ts`
- 部署檢查表

### PR 2 — API 端點
- 八支 route
- 測試：`salary_route_wiring.test.ts`

### PR 3 — 路由拆分
- 新增三支 `/user/account_book/[account_book_id]/salary_calculator/**` page
- 刪除 `/salary_calculator/pay_slip/`、`/salary_calculator/employee_list/`
- `SalaryCalculatorPageBody` 加 `accountBookId` prop，公開版傳 `null`
- `src/constants/url.ts` 拆兩組常數、新增 `salary_calculator_api.ts`
- 公開頁的「到帳本版」入口與說明文案
- i18n 五語系（`account_book_entry`）

> 這個 PR 之後，帳本版與公開版渲染的是**同一份**計算機，功能完全一樣；
> 差別只有外框與那顆入口按鈕。分成獨立 PR 是為了讓路由改動可以單獨 review 與回退。

### PR 4 — 員工列表與儲存查閱
- `employee_list.tsx` / `employee_action_modal.tsx` / `employee_list_modal.tsx` 接 API
- 移除 `IEmployeeForCalc`、`dummyEmployeeForCalc`、`basic_info_form.tsx:210` 的 `&& false`
- Context 的 `loadFromSnapshot()` + `salary_snapshot_roundtrip.test.ts`
- 儲存按鈕 + `save_salary_record_modal.tsx`
- `records` 頁面 + `UserHeader` 導覽入口
- i18n 五語系（`save_record`、`records`）

---

## 12. 明確不在本次範圍

- 薪資單寄送／重寄（`sending_pay_slip_modal.tsx`、`resending_pay_slip_modal.tsx` 目前是
  `console.log` + `setTimeout`，維持現狀）
- `my_pay_slip_page_body.tsx` 的收/發件匣接真 API
- `EmployeeHrFunction` 加 `PAYROLL` 值、與 HR `Employee` 的實際合併（ADR 020 正式模組的事）
- 薪資項目的「經常性給與」旗標、「取平均工資」查詢（ADR 020 §4.2 / §4.3）
- 薪資紀錄的 PII 加密（ADR 018）—— 見 §13
- **把公開版的試算內容帶進帳本版**（跨路由搬 34 個輸入欄位）。需要序列化進 query 或 sessionStorage，
  且要處理「帶過去的值與帳本裡的員工本薪不一致」的取捨 —— 是獨立議題，§8.2 的說明文案會誠實告知不會帶

---

## 13. 待確認風險

1. **薪資快照的加密：已決議「先明文，上線前再決定」（20260831）。**
   ADR 018 把薪資列為高敏感 PII，`Employee` 的電話／身分證／地址都是 `*Cipher` 欄位；
   本模組的 `inputSnapshot` / `resultSnapshot` 先存明文 Json，靠 `accountBookId` 租戶隔離
   與 `assertAccountBookMember` 授權把關。

   理由是這樣可逆：目前沒有正式資料，schema 又走 `prisma db push`，
   日後要轉成 `*Cipher` + `piiKeyVersion` 只是改兩個欄位與 repository 的一層編解碼，
   §2.2 抽出來的三個金額欄位本來就獨立、不受影響。

   **這是部署檢查表的阻擋項**：正式上線前必須由 Luphia 或安全負責人拍板。
   若判定要加密，同時要確認 `SalaryRecord` 是否納入 `HrPiiTable`
   （`src/repositories/hr_pii_invariant.ts`）—— 那會要求 `id` 不得有 `@default`。

2. **是否要寫 `AuditLog`。**
   `AuditLog` model（`prisma/schema.prisma:902`）有 `dataType: EMPLOYEE_PII` / `action: READ`。
   薪資紀錄的讀取是否要留稽核軌跡，取決於第 1 點的結論。

3. **`calculatorVersion` 的 bump 紀律靠人。**
   忘了 bump 不會有任何症狀，直到某天要回答「這張薪資單是哪一版算的」才發現對不上。
   可考慮加一支掃描測試：`src/constants/salary_levels/` 有異動時要求 `SALARY_CALCULATOR_VERSION` 一併變 ——
   但那需要比對 git diff，非本次範圍，先靠 code review。
