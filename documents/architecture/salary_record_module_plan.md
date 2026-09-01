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

> **這一節是 20260831 動工前的快照**，保留它是為了解釋後面的設計為什麼長這樣。
> 裡面的行號、檔案與數字都停在那一刻 —— 例如 `employee_list.tsx` 後來被移除（§8.5）。
> 要看今天的樣子請往下讀 §8。

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
- `basic_info_form.tsx` 的員工選單被 `&& false` 硬性關閉；
  `salary_result_section.tsx` 的「寄出薪資單」按鈕整段被註解。

### 1.2 後端

- **schema 完全沒有薪資 model**（ADR 020 §1 已確認）。HR `Employee` 系列存在且完整。
- 帳本是 `AccountBook`（`prisma/schema.prisma:811`），權限鏈 `User →(TeamMember)→ Team → AccountBook`。
- 授權收斂點**已存在**：`assertAccountBookMember(accountBookId, userId)`
  （`src/services/account_book_access.guard.ts`），附帶 `mapServiceError()`。
  **注意它只回答「是不是成員」，不分角色** —— `OWNER / EDITOR / VIEWER` 一視同仁。
  薪資模組另外掛一層角色矩陣（見 §6.3 與 §13 第 3 點）。
- 登入一律走 `Authorization: Bearer <DeWT>` → `getIdentityFromDeWT(authHeader)`（`src/lib/auth/dewt.ts:101`）。
  **沒有 cookie session**。
- 帳本清單端點**已存在**：`GET /api/v1/user/account_book`（回登入者可存取的帳本）。
- 專案**沒有 `prisma/migrations/`**，schema 一律 `prisma db push` + `prisma generate`。

### 1.3 一個陷阱，與一個已經做好的東西

**陷阱：不要用 `attendanceIdentityService.resolveEmployee()` 當授權閘。**
HR 模組的 route 用它把登入者換成 `Employee`，但它在「這個帳本沒有你的員工檔」時
丟 `NF_EMPLOYEE_FOR_USER`（404）。
薪資計算機的使用者是帳本的**團隊成員**（老闆／會計），不必是 HR 員工檔上的人。
本模組一律走團隊成員身分（`assertSalaryAccountBookAccess()`，內部用
`resolveAccountBookMembership()` 拿到角色再比對 `SALARY_ACCESS_ROLES`）。

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

採 JSON 的理由：`ISalaryCalculatorOptions`（21 欄）與 `ISalaryCalculatorResult`（33 欄）
是**計算引擎的契約**，會隨法規年度演進；把它攤成 69 個欄位等於把引擎契約焊進 DB schema，
而這個專案沒有 migrations，每次演進都要手寫回填 SQL。

**繞過精度守衛的代價用兩道措施補**：

1. 真正需要拿去排序／篩選／對帳的三個金額，**抽成 `BigInt` 純量欄位**
   （`totalPayment`、`totalSalaryTaxable`、`totalEmployerCost`），走守衛。
2. JSON 入庫前一律過 Zod schema（`salaryRecordSnapshotSchema`），
   欄位數、型別、整數性全部驗過才寫（§3.3、§5）。

### 2.3 為什麼輕量員工表要用 soft delete（與 HR Employee 相反）

`Department` / `JobTitle` / `Employee` 都沒有 `deletedAt`（改用狀態欄位）。
本表刻意不同：員工名單上有刪除按鈕（現在在 `employee_list_modal.tsx` 的每一列），
而薪資紀錄是對外憑據，
員工被刪掉不能讓歷史紀錄一起消失或變成孤兒。
`code_review_checklist.md §3.4` 要求「硬刪 vs 改狀態」的選擇必須明說 —— 這就是那段說明。

**衍生問題**：唯一鍵配 soft delete，會導致「刪掉的員工，同一個身分無法重新加入」。
Prisma 表達不了 partial unique index，依 `code_review_checklist.md §5.3` 的指引，
用 **nullable 唯一欄位**替代：

- `number String` — 員工編號，身分鍵，一律保留
- `activeNumber String?` — 在存活期間等於 `number`，soft delete 時設為 `null`
- `@@unique([accountBookId, activeNumber])`

寫入路徑集中在 repository，不讓 service 自己維護這組不變式（配 §8.2 的不變式測試）。

**身分鍵為什麼是編號不是 Email**（PR 4 修正）：第一版用 Email。但同一個人可以換
Email，而公司內部本來就用編號指涉員工；更實際的是不少中小企業的員工根本沒有公司
Email，用 Email 當必填會擋住整批人。於是 `number` 改為必填、`email` 改為可空。

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
| `.../salary_calculator/pay_slip` | 是 | `UserLayout` | 我的薪資單（內容仍為 dummy，見 §12） |
| `.../salary_calculator/records` | 是 | `UserLayout` | 薪資紀錄查閱（PR 4 才建立） |

`/salary_calculator/pay_slip` 與 `/salary_calculator/employee_list` 從公開側**搬走**
（不是刪功能）：它們的導覽連結本來就被註解（`calculator_header.tsx:50-65`），
只能靠直接打網址進入，而兩者都需要一本帳才有意義。

> **後續（PR 5）**：員工列表**頁**接著被整個移除，管理功能併進計算機的挑人彈窗
> `employee_list_modal.tsx`。搬走的是 `pay_slip`，員工列表是搬走之後又拆掉。
> 詳見 §8.5。
`src/app/sitemap.ts` 裡對應的兩條也要移除 —— 留著等於對搜尋引擎宣告兩個 404。

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
  id   String @id @default(uuid())
  name String

  // Info: (20260831 - Julian) 員工編號：帳本內的身分鍵，必填
  number String @map("employee_number")

  // Info: (20260831 - Julian) 顯示與寄送用，可空（不少員工沒有公司 Email）
  email String? @map("email")

  /**
   * Info: (20260831 - Julian) 帳本內「存活中」員工的編號唯一性。
   * Prisma 表達不了 partial unique index，依 code_review_checklist §5.3
   * 改用 nullable 唯一欄位：存活時等於 number，soft delete 時設為 null，
   * 好讓同一個編號之後能重新啟用。維護點只在 repository。
   */
  activeNumber String? @map("active_number")

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

  @@unique([accountBookId, activeNumber])
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
   * 形狀分別是 ISalaryCalculatorOptions（21 欄）與 ISalaryCalculatorUI，
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
  number: string;
  email?: string;
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

**同時要處理的既有型別債**：`src/interfaces/employees.ts` 的 `IEmployeeForCalc.id` 是 `number`，
與 uuid 對不上。`employee_list_modal.tsx` / `employee_action_modal.tsx`
改接 `ISalaryCalculatorEmployee` 後，`IEmployeeForCalc` 與 `dummyEmployeeForCalc` 一併移除（已完成）。

`calculatorVersion` 的來源：新增 `SALARY_CALCULATOR_VERSION` 到
`src/constants/salary_calculator.ts`，格式 `"2026.1"`（級距表年度 + 引擎修訂號），
改動 `src/constants/salary_levels/` 或 `salary_calculator.ts` 時同步 bump。

---

## 5. Validator（`src/validators/salary_record.ts`）

CLAUDE.md §2：Zod schema 嚴禁寫在 `route.ts`，一律放 `src/validators/` 並由 `index.ts` re-export。

```ts
export const salaryCalculatorEmployeeWriteSchema = z.object({
  name: z.string().trim().min(1).max(100),
  number: z.string().trim().min(1).max(50),
  email: z.string().email().max(254).optional(),
  baseSalary: z.number().int().nonnegative(),
  mealAllowance: z.number().int().nonnegative(),
});

// Info: (20260831 - Julian) 快照是 Json 欄位，DB 不會替我們檢查形狀，
// 因此這裡逐欄釘死 —— 這是 Json 欄位唯一的守門人。
export const salaryCalculatorOptionsSchema = z.object({ /* 21 欄逐一列出 */ });
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
  year: z.coerce.number().int().min(SALARY_RECORD_MIN_YEAR).max(2100).optional(),
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
- `createEmployee(...)` / `updateEmployee(...)` — 同步維護 `activeNumber = number`
- `softDeleteEmployee(...)` — 同時設 `deletedAt = new Date()` 與 `activeNumber = null`
- `transformToFrontendFormat()` — `BigInt → number`（薪資是整數元，
  用 `MoneyUtil.toDecimal(v).toNumber()`，不用裸 `Number()`）

### 6.2 `src/repositories/salary_record.repo.ts`

- `upsertRecord({...})` — 用 `prisma.salaryRecord.upsert` 搭
  `@@unique([accountBookId, employeeId, year, month])` 的複合鍵，這是 D3「重存即覆寫」的落地點
- `listRecords(options)` — 一次 `Promise.all` 做三件事：`findMany`（`skip`/`take` 手刻）、
  `count`，以及期間下拉的選項來源 `groupBy(['year','month'])`。
  沒有獨立的 `countRecords`
- `getRecordById(accountBookId, id)`
- `deleteRecord(accountBookId, id)`

回應形狀採 `ILedgerPageResult` 那一套（`data / page / pageSize / totalCount / totalPages`），
它是專案裡最近新寫、且明說「與 route 回應結構一致」的分頁形狀，
再加上本模組獨有的第六個欄位 `periods`。

`periods` 是「這本帳實際存在紀錄的年月」，供期間篩選的下拉使用。
它的 `where` **只看 `accountBookId`、不套其他篩選條件** —— 套了的話，
選定一個期間之後選單裡就只剩它自己，使用者換不回去也看不到還有哪些月份。
不從當前這一頁推導、也不用「現在往前推 N 個月」硬湊：兩者都會讓
「紀錄在第 3 頁」或「三年前的那一筆」變成選不到、因此篩不到的資料。

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

**授權不在 service 內做**，統一在 route 呼叫 `assertSalaryAccountBookAccess()`
（`src/services/salary_record.service.ts`），與現有寫法一致。

它比既有的 `assertAccountBookMember()` 多問一個問題：**這個角色可不可以做這件事**。
八支 route 各自傳入 `SalaryAccess.READ` 或 `SalaryAccess.WRITE`（沒有預設值 ——
漏填會編譯失敗，而不是靜靜落到寬鬆的那一邊），實際的角色清單只有一份，
在 `src/constants/salary_access.ts` 的 `SALARY_ACCESS_ROLES`：

| 層級 | 角色 | 涵蓋端點 |
|---|---|---|
| `READ` | `OWNER` / `EDITOR` / `VIEWER` | `GET employee`、`GET record`、`GET record/:id` |
| `WRITE` | `OWNER` / `EDITOR` | `POST employee`、`PUT/DELETE employee/:id`、`POST record`、`DELETE record/:id` |

讀取範圍是維持現狀而非新決定，見 §13 第 3 點。

### 6.4 錯誤字典（`src/lib/utils/error_dictionary.ts`）

新增四筆，編號接續各前綴目前最大值（送 PR 前確認）：

| 常數 | 前綴 | status |
|---|---|---|
| `NF_SALARY_CALCULATOR_EMPLOYEE` | NF | `NOT_FOUND` |
| `NF_SALARY_RECORD` | NF | `NOT_FOUND` |
| `CF_SALARY_EMPLOYEE_NUMBER_TAKEN` | CF | `CONFLICT` |
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
| GET | `/record` | `READ` | 薪資紀錄列表（可篩 employeeId / year / month / keyword，分頁；另回傳 `periods` 供期間下拉） |
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
    await assertSalaryAccountBookAccess(
      accountBookId,
      sessionUser.id,
      SalaryAccess.WRITE,
    );

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

`resolveAccountBookMembership` 丟的是裸 `Error`（不是 `AppError`），
所以 catch 要先過一次 `mapServiceError(error)` 再包 —— 實作上採「在 service 層改丟
`AppError`」：`salary_record.service.ts` 的 `assertSalaryAccountBookAccess()`
把 `SERVICE_ERROR.*` 轉成 `AppError`，讓 route 的 catch 維持與其他 route 一字不差。
角色不足時它直接丟 `AppError(AUTH_PERMISSION_DENIED)`，並在 catch 裡原樣往上 ——
再包一層會把 403 變成 500。

---

## 8. 前端

### 8.1 路由與頁面組裝

新增：

```
src/app/user/account_book/[account_book_id]/salary_calculator/layout.tsx
src/app/user/account_book/[account_book_id]/salary_calculator/page.tsx
src/app/user/account_book/[account_book_id]/salary_calculator/pay_slip/page.tsx
src/app/user/account_book/[account_book_id]/salary_calculator/records/page.tsx
```

刪除：`src/app/salary_calculator/pay_slip/`、`src/app/salary_calculator/employee_list/`，
並從 `src/app/sitemap.ts` 移除對應的兩條（理由見 §2.4）。
`records` 頁在 PR 4 才建立 —— 在薪資紀錄 API 接上之前，那個路由沒有內容可顯示。

三個 page body（計算機、薪資紀錄、薪資單）的外框長得一模一樣
（`<main>` + `<CalculatorHeader />` + 內容），因此抽成共用的
`salary_calculator_shell.tsx`：公開版出整頁外框與 `CalculatorHeader`，
帳本版只出內容（`UserLayout` 已經提供 `UserHeader` / `UserFooter` / `<main>`，
再包一層會產生巢狀 `<main>`，BrandLogo 與語言選擇器也會出現兩次）。

**本模組的 `layout.tsx` 不做登入閘，只提供 context。**
帳本版的登入閘來自 `src/app/user/layout.tsx`，
帳本 id 的解析（含 `"default"`）來自 `src/app/user/account_book/[account_book_id]/layout.tsx`，
兩者都已存在，這一層不重複。

> **這支 layout 是後來補的（PR 5）。** 原本三支 page 各自包一層 `CalculatorProvider` ——
> 同一份程式碼、三個互不相干的實例。薪資紀錄頁的「載回計算機」把快照寫進紀錄頁那一顆，
> 而 `router.push` 導到計算機頁時那一顆隨頁面卸載，計算機頁掛的是全新的預設值：
> 按鈕按下去毫無反應，也不噴任何錯誤。
> App Router 的 layout 在同層路由之間切換時不會重新掛載，provider 提到這一層之後
> state 才跨得過那次導頁。`salary_provider_scope.test.ts` 把它釘住。

每支 page 只做兩件事，照 `/user/account_book/[account_book_id]/dashboard/page.tsx` 的形狀：

```tsx
export default async function SalaryCalculatorPage({
  params,
}: {
  // Info: (20260831 - Julian) 鍵名必須逐字等於資料夾名（route_params_contract.test.ts 會掃）
  params: Promise<{ account_book_id: string }>;
}) {
  const { account_book_id: accountBookId } = await params;

  // Info: (20260901 - Julian) provider 在 layout.tsx，page 不可以再包一層（會蓋掉外層那顆）
  return <SalaryCalculatorPageBody accountBookId={accountBookId} />;
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

位置：`salary_calculator_page_body.tsx`，條件 `accountBookId === null && user`。
（原本規劃放在 `salary_result_section.tsx`，實作時移到 page body。）
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
3. **這次試算的內容不會帶過去** —— 跨路由搬 34 個表單欄位（`ISalaryCalculatorFormState`，
   與引擎輸入 `ISalaryCalculatorOptions` 的 21 欄不是同一組）要序列化進 query
   或 sessionStorage，是另一個議題，本次不做（列在 §12）

### 8.3 儲存按鈕（帳本版）

位置：`salary_result_section.tsx`，條件 `accountBookId !== null`，
放在既有「下載 PNG」按鈕旁 —— 也就是那段被註解的「寄出薪資單」按鈕（L102–111）的位置，
但**不要**順手把它打開，那超出本次範圍。

因為已經在 `AuthGuard` 底下、帳本 id 由路由保證存在，
「未登入 → 開 AuthModal」「已登入但沒帳本 → disabled」兩個分支不需要存在。
實際的按鈕狀態有三種：

- **disabled** —— 姓名未填，或四個步驟沒有全部完成。灰掉時底下要寫一行說明還缺什麼
  （`calculator.button.disabled_hint`），否則使用者只會看到一顆不能按的按鈕。
  下載鈕吃同一個條件：半成品的薪資單不該被下載，更不該被存成正式紀錄。
- **忙碌** —— 涵蓋「探有沒有既有紀錄」的 GET 與儲存的 POST 兩段
  （`isPreparing || isSaving`）。只蓋後者的話，選完員工到真的送出之間會有一段
  完全沒有反應的空白。
- **可按**。

**沒有儲存 Modal。** 按下去就存完，成功後在按鈕下方就地顯示綠色回饋列，
不導頁、不跳 Modal —— 使用者多半還要繼續調數字存下一個月。
員工與年月在 Step 1 就填過了，再問一次等於要求他把剛做過的事做第二遍。

Modal 降級成 `save_record_dialogs.tsx` 裡的兩個**例外**（不是 `save_salary_record_modal.tsx`）：

- `OverwriteConfirmModal` —— 同員工同年月已有紀錄。一句話 + 兩顆按鈕，不是表單。
  先打 GET 探一筆而不是「存了再說」：唯一鍵是重存即覆寫（D3），而薪資單是對外憑據。
- `UnlinkedEmployeeModal` —— 姓名是手打的、沒有對應員工。三條路：直接新增並儲存、
  從員工列表選一位（選完就直接存，不必再按一次儲存）、或者當編號已經有人在用時，
  改存給編號原本的那位員工／回 Step 1 修改編號。
  編號撞號會先從已載入的名單問出答案，在按下去之前就把人指出來，
  而不是讓後端回 409 之後才解釋；名單可能過期，所以仍然要接住那個 409。

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

### 8.5 員工名單接真 API

> **PR 4 的規劃是「員工列表頁接真 API」，PR 5 把那一頁整個移除了。**
> 理由：員工列表頁與薪資紀錄頁看的是同一批人，只是一個以「人」為單位、
> 一個以「人 × 月份」為單位。名單本身放在挑人的地方就夠了，不值得一個獨立頁面。
> 以下描述的是移除之後的現況。

`employee_list_modal.tsx`（Step 1 姓名欄旁的挑人彈窗，儲存流程的「從列表選」也用它）
是員工名單**唯一**的入口，兼管理：

- 列表打 `GET /employee`（經 `use_salary_employees.ts`，與其他呼叫端共用同一份名單）
- 關鍵字過濾（前端，比對姓名與編號 —— 名單不分頁，數十人的量級一次取回再過濾就夠）
- 每一列有編輯與刪除，工具列有新增，都沿用既有的 `employee_action_modal.tsx`
  與 `remove_employee_modal.tsx`，沒有新的對話框
- 兩種空狀態分開處理：「一位員工都沒有」給一條建立第一位的路，
  「搜尋不到」留一條清除搜尋的路

不併進來的話，員工建立之後就再也改不動 —— 名字打錯、本薪調整都只能進資料庫，
而 `PUT` / `DELETE` 兩支 API 會變成沒有入口的死碼。

`employee_action_modal.tsx`：原本新增/編輯只有 `console.log` → 接 `POST` / `PUT`，
編號撞號指回欄位而不是丟通用錯誤，並修掉「編輯模式仍顯示『新增員工』文案」的 bug。

`basic_info_form.tsx` 的 `&& false` 移除，讓選單重新可用 ——
但這個元件只在帳本版有帳本 id，所以改成 `accountBookId !== null && (`。

### 8.6 薪資紀錄查閱頁

`/user/account_book/[account_book_id]/salary_calculator/records`：

- 列表欄位：給付期間、員工（姓名 + 編號）、實發金額、扣繳憑單金額、操作
  （原規劃有「建立時間」，實作時拿掉 —— 對查閱薪資單的人沒有意義）
- 用專案共用的 `@/components/common/data_table`，分頁由它內部的
  `@/components/common/pagination` 負責，不自己畫上下頁
- 篩選一排（手機垂直堆疊）：關鍵字、員工、給付期間
  - **關鍵字做在伺服器端**（比對員工姓名與編號，300ms debounce）。
    列表是分頁的，前端過濾只會濾掉當前那 20 筆 —— 要找的人在第 3 頁就會得到「查無資料」。
    走員工關聯過濾而不是把姓名冗餘存進 `salary_record`：員工改名之後，
    冗餘欄位會變成「用舊名字才搜得到、畫面上卻顯示新名字」。
  - **年與月合併成一個「給付期間」下拉**（值 `YYYY-M`）。實務上沒有
    「所有年度的 8 月」這種需求，拆成兩個下拉只是多點一次，還能選出必定沒有資料的組合。
    選項來自回應的 `periods`（見 §6.2），所以不會出現選了也沒資料的期間。
- 「還沒有紀錄」與「這組條件找不到」是兩種空狀態，不能共用一句話 ——
  後者會讓正在搜尋的人以為資料掉了
- 點列開 `ViewPaySlipModal`，把 `resultSnapshot` 直接餵給既有的 `<PaySlip>` ——
  **那個元件完全不用改**（它本來就吃 `resultData: ISalaryCalculatorUI` prop）
- 「載回計算機」按鈕 → 呼叫 §8.7 的批次載入後導向同帳本的計算機頁

> **實作時走了相反的路。** 原規劃是「`UserHeader` 的導覽加薪資計算機的入口，
> 沿用該元件現有的選單結構，不另建導覽」。實際上 `UserHeader` 沒有動，
> 改成新增 `account_book_calculator_nav.tsx`，掛在 `salary_calculator_shell.tsx`
> 的帳本版分支上，兩個頁面（計算機／薪資紀錄）共用一列。
>
> 原因是「計算說明」：帳本版不渲染 `CalculatorHeader`，而計算說明原本掛在那顆 header 上 ——
> 不補回來的話，解釋每個數字怎麼來的唯一入口在帳本版就消失了。
> 既然要有一列，頁面切換就一起放進來。分頁圖示取自 `PUBLIC_MODULES` 的
> `Wallet`（`HeaderNav` 就是拿那一份渲染的），免得同一個模組在兩個地方長得不一樣。

### 8.7 Context 新增的東西

`calculator_context.tsx` 新增：

```ts
// Info: (20260831 - Julian) 從薪資紀錄載回計算機。
// 是 getSalaryCalculatorOptions() 的反函式，兩者必須成對維護；
// §9 的 round-trip 測試就是釘這件事。
loadFromSnapshot: (input: ISalaryCalculatorOptions) => void;

// Info: (20260831 - Julian) 「按下儲存會存到誰身上」。從員工列表選人時設，手改姓名時清掉
selectedEmployeeId: string | null;
linkEmployee: (employee: ISalaryCalculatorEmployee) => void;
unlinkEmployee: () => void;
```

表單狀態 ↔ 引擎輸入的**映射本身不在 context**，抽到
`src/lib/utils/salary_calculator_snapshot.ts` 的 `toCalculatorOptions` /
`fromCalculatorOptions` 兩支純函式。留在 context 裡就只有 render React 才驗得到，
而本專案不 render React（§9）。

呼叫端要注意兩件事（兩個都踩過）：

- **`linkEmployee` 會把本薪與伙食費設成該員工「現在」的值**，
  而 `loadFromSnapshot` 灌的是紀錄「當時」的值。薪資紀錄的「載回計算機」
  必須**先連結、後灌快照**，否則載回三個月前的紀錄會靜靜換成今天的本薪。
- **`linkEmployee` 是 setState**，同一個 tick 內讀 `selectedEmployeeId` 還是舊值。
  「從員工列表選完就直接儲存」那條路要把員工**直接當參數傳**，不能回頭讀 context。

### 8.7.1 本模組新增的其他前端檔案

規劃時沒有列出、但實作後存在的檔案（避免下一個人以為它們是別的模組的）：

| 檔案 | 作用 |
|---|---|
| `hooks/use_salary_employees.ts` | 帳本底下的員工名單，挑人彈窗與儲存流程共用同一份 |
| `hooks/use_salary_record_save.ts` | 「先探再存」：`findExisting` + `save` + `clearSaved` |
| `lib/utils/salary_calculator_snapshot.ts` | 表單狀態 ↔ 引擎輸入的雙向映射（§8.7） |
| `lib/utils/pay_slip_download.ts` | 薪資單存成 PNG。尺寸取 `scrollWidth`/`scrollHeight` 而不是 `html-to-image` 預設的 `clientHeight`，否則捲動區外的內容會被裁掉 |
| `components/salary_calculator/account_book_calculator_nav.tsx` | 帳本版的分頁列與計算說明入口（§8.6） |
| `components/salary_calculator/save_record_dialogs.tsx` | 儲存路徑上的兩個例外對話框（§8.3） |
| `components/salary_calculator/remove_employee_modal.tsx` | 移除員工確認，含「薪資紀錄會保留」的說明 |
| `constants/salary_calculator.ts` 的 `SALARY_RECORD_MIN_YEAR` | 年度下限，validator 三處與薪資紀錄頁共用 |
| `constants/salary_calculator.ts` 的 `EMPLOYEE_NUMBER_INPUT_ID` | Step 1 編號欄的 DOM id。儲存流程在編號撞號時要把使用者送回那個欄位，兩個檔案共用一個字面值遲早有一邊改掉，而症狀是按鈕沒反應且不噴錯 |

### 8.8 i18n

五個語系（`en` / `ja` / `ko` / `zh_cn` / `zh_tw`）的 `calculator.ts` 各加三個區塊：
`calculator.account_book_entry.*`（§8.2 的按鈕與三段說明）、
`calculator.save_record.*`、`calculator.records.*`。
命名沿用既有的 `calculator.<區塊>.<欄位>` snake_case 兩層結構，插值用 `{{var}}`。

**順手修掉既有的 i18n 壞 key**（獨立 commit，與本模組無關但都在動到的檔案附近）：

- `resending_pay_slip_modal.tsx` 用 `calculator.MESSAGE.RESEND_PAY_SLIP_*`（8 個），字典是 `calculator.message.re_send_pay_slip_*` ✅ 20260901
- `pay_slip_sent_tab.tsx` 用 `payslip_issued_date`，字典是 `pay_slip_issued_date` ✅ 20260901
- `pay_slip_received_tab.tsx` 表頭 `Action` 硬編碼英文 ✅ 20260901（改用 `calculator.my_pay_slip.action`）

**同時把守門機制補上**：`attendance_i18n_keys.test.ts` 的 regex 原本寫死
`hr_management\.` 一個命名空間，`calculator.*` 完全不在守備範圍 ——
掃描根是整個 `src` 沒錯，但問的問題只涵蓋一個模組（checklist §1.1 在字典側的化身）。
已改名為 `i18n_keys.test.ts` 並參數化成 `NAMESPACES` 登記表，
加入 `calculator` 之後立刻抓到上面全部 9 條，以及一個沒登記的動態鍵群
與一個四語系空值（`joined_this_month_2`，屬刻意留空，已登記在例外清單）。

---

## 9. 測試計劃

專案 `testEnvironment: "node"`，**沒有任何一支測試 render React**，
且**不在單元測試裡 mock Prisma**（用手寫的假 repository 注入 service）。

| 測試檔 | 型別 | 釘住什麼 |
|---|---|---|
| `salary_snapshot_roundtrip.tz.test.ts` | 純函式 | `toCalculatorOptions()` ↔ `fromCalculatorOptions()`（`lib/utils/salary_calculator_snapshot.ts`）來回不失真，`ISalaryCalculatorFormState` 的欄位一個不漏（用 `Object.keys` 對拍，新增欄位忘了接就會紅）。**檔名帶 `.tz`**：其中「離職日回得來、不會退一天」那一條在 UTC 與 UTC+8 都分不出 `getDate()` 與 `getUTCDate()`，必須由 `scripts/jest_tz.mjs` 釘在 `America/New_York` 再跑一次才驗得到（checklist §1.3） |
| `salary_record_service.test.ts` | service | 覆寫語意（同員工同年月只留一筆）、跨帳本員工被拒（`NF_SALARY_CALCULATOR_EMPLOYEE`）、讀取與刪除的跨租戶隔離、找不到紀錄回 404、員工編號撞號回 409、非整數金額 fail fast |
| `salary_provider_scope.test.ts` | 掃描 | 帳本版三個頁面共用同一個 `CalculatorProvider`：`layout.tsx` 真的把 `children` 包起來（光 import 不算），且三支 page 都沒有自己再包一顆（包了會蓋掉外層那顆，等於沒修）|
| `amount_input.test.ts` | 純函式 | 金額輸入框的游標與格式化（先於 PR 1 落地，`4d6a23a83`）|
| `salary_employee_invariant.test.ts` | 不變式 | `activeNumber` 與 `deletedAt` 的配對：存活時 `activeNumber === number`、刪除時為 `null`（§2.3） |
| `salary_route_wiring.test.ts` | route | 照抄 `leave_route_wiring.test.ts`：無票回 401、限流兩行都在且回 429 時 service 呼叫次數沒增加、`params` 鍵名是 `account_book_id`、`userId` 來自 DeWT 而非 request body、八支端點每一支都過授權閘；另外釘住身分鍵改動：缺員工編號回 400、沒有 Email 也建得起來。**20260901 起三條主要斷言都以 `ENDPOINTS` 表走完八支**（先前 401 走八支、授權只驗 2 支、限流只驗 1 支 —— 把 `employee/route.ts` 兩處 `if (limited) return limited;` 註解掉全綠），並加驗每一支向授權閘要求的 `SalaryAccess` 層級 |
| `salary_access_roles.test.ts` | 純函式 | 薪資模組的角色矩陣：`VIEWER` 不能寫、`OWNER`/`EDITOR` 可以寫、表外的角色（含已停用的 `ADMIN` 殘列、空字串、`null`）一律擋、寫入集合是讀取的子集 |
| `salary_repo.e2e.test.ts` | e2e（真資料庫） | 兩支 repository 的 `where` 子句與唯一索引：租戶過濾（別本帳拿對的 uuid 也讀不到／改不動／刪不掉）、`deletedAt` 過濾（軟刪後那一列還在但查不到）、`activeNumber` 讓出與同編號重新加入（部分唯一索引，只有 Postgres 答得出來）、upsert 覆寫不新增列且不動 `createdByUserId`、分頁 `skip`/`take`、關鍵字比對不跨帳本。**這 486 行先前零測試**：七處防線同時拿掉，原有測試全綠 —— 因為假 repo 用 `${accountBookId}\|${id}` 當 key，天生就是隔離的（checklist §1.8） |
| `i18n_keys.test.ts` | 掃描（既有，本次擴充） | 原名 `attendance_i18n_keys.test.ts`，regex 寫死 `hr_management.` 一個命名空間。改成 `NAMESPACES` 登記表並加入 `calculator` 之後，立刻抓到 9 個既有壞 key（§8.8） |
| `salary_schema_defaults.test.ts` | 掃描 | 讀 `prisma/schema.prisma` 原文，釘住 `mealAllowance @default(0)` 等預設值（checklist §1.12：沒有 migrations 時的唯一例外） |
| `app_route_auth_guard.test.ts` | 既有 | **不需修改**：`user` 已在 `GUARDED_ROOTS`、`salary_calculator` 已在 `PUBLIC_ROOTS`。本模組後來確實新增了一支巢狀的 `salary_calculator/layout.tsx`（§8.1），但那支測試只掃 `src/app/` 的第一層路由根，掃不到巢狀 layout。若有人替公開側加了 `src/app/salary_calculator/layout.tsx`，這支會紅 —— 那是預期的護欄 |
| `route_params_contract.test.ts` | 既有 | **不需修改**，但新增的三支 page 與八支 route 都會被它掃：`params` 的鍵名必須是 `account_book_id`，不能寫成 `accountBookId` |

送審前必跑（`code_review_checklist.md:364`）：

```bash
npx tsc --noEmit
npm run test          # Info: 內含 npm run test:tz，會跑到 *.tz.test.ts
npm run test:e2e      # Info: 需要真資料庫，CI 於 test 之後另跑一步
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

## 11. 實作順序（規劃四個 PR，實際落地五個）

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
  （計算機、員工列表、薪資單）—— 員工列表頁在 PR 5 被移除，見下
- 刪除 `/salary_calculator/pay_slip/`、`/salary_calculator/employee_list/`
  與 `src/app/sitemap.ts` 對應的兩條
- 新增 `salary_calculator_shell.tsx`，三個 page body 共用
- `SalaryCalculatorPageBody` 加 `accountBookId` prop，公開版傳 `null`
- `src/constants/url.ts` 拆兩組常數（公開常數 + `salaryCalculatorUrlOf`）
- 公開頁的「到帳本版」入口與說明文案
- i18n 五語系（`account_book_entry`）

> `salary_calculator_api.ts` 移到 PR 4：在員工列表接上 API 之前它沒有消費者，
> 先建等於留一個沒人用的常數檔。

> 這個 PR 之後，帳本版與公開版渲染的是**同一份**計算機，功能完全一樣；
> 差別只有外框與那顆入口按鈕。分成獨立 PR 是為了讓路由改動可以單獨 review 與回退。

### PR 4 — 員工列表與儲存查閱

> **實作時的方向修正（20260831）**：第一版把儲存做成一張獨立表單，會再問一次員工與年月 ——
> 而那兩件事使用者在 Step 1 就填過了。改成「計算機是主場」：
> 連結員工在 Step 1（`selectedEmployeeId`），按下儲存直接用畫面上的年月存，
> Modal 降級成兩個例外（覆蓋確認、未連結員工）。設計稿與 §8.3 以此為準。

- 新增 `salary_calculator_api.ts`
- 新增 `/user/account_book/[account_book_id]/salary_calculator/records` 頁
- `employee_list.tsx` / `employee_action_modal.tsx` / `employee_list_modal.tsx` 接 API
- 移除 `IEmployeeForCalc`、`dummyEmployeeForCalc`、`basic_info_form.tsx` 的 `&& false`
- Context 的 `loadFromSnapshot()` + `salary_snapshot_roundtrip.tz.test.ts`
- 儲存按鈕 + `save_record_dialogs.tsx`（規劃時寫的是 `save_salary_record_modal.tsx`，
  方向修正後不是一張表單而是兩個例外對話框）
- ~~`UserHeader` 導覽入口~~ → 改成 `account_book_calculator_nav.tsx`（理由見 §8.6）
- i18n 五語系（`save_record`、`records`）
- PR 4 進行中另外改了**身分鍵**：員工編號取代 Email 成為帳本內的唯一鍵
  （`number` 必填、`email` 可空、`activeNumber`）。理由與 schema 差異見 §2.3 與部署檢查表 §1.1

### PR 5 — 收斂與修正（規劃時沒有，實際做了）

這個 PR 沒有在原計劃裡，是上線前試用之後的一輪收斂。**不動 schema。**

- **移除員工列表頁**（`employee_list/page.tsx`、`employee_list.tsx`、
  `employee_list_page_body.tsx`、`salaryCalculatorUrlOf().EMPLOYEE_LIST`）。
  管理功能併進挑人彈窗 `employee_list_modal.tsx`（§8.5）
- 薪資紀錄頁：伺服器端關鍵字搜尋、年月合併成「給付期間」、回應新增 `periods`、
  改用共用的 `data_table` 與 `pagination`（§8.6、§6.2）
- **`CalculatorProvider` 提到 `layout.tsx`**（§8.1）—— 原本三支 page 各包一顆，
  「載回計算機」寫進去的 state 導頁時就沒了。新增 `salary_provider_scope.test.ts` 釘住
- 修復預覽薪資單：捲不動（PaySlip 在 flex 欄裡被壓縮再用自己的 `overflow-hidden` 裁掉）、
  下載的 PNG 被切斷（`html-to-image` 的畫布尺寸取 `clientHeight` 而不是內容高度）、
  以及多個只有 `className="w-full"` 的裸按鈕
- 儲存流程：從列表選完員工就直接儲存；編號撞號改成事前偵測 + 接住 409（§8.3）

---

## 12. 明確不在本次範圍

- 薪資單寄送／重寄（`sending_pay_slip_modal.tsx`、`resending_pay_slip_modal.tsx` 目前是
  `console.log` + `setTimeout`，維持現狀）
- `my_pay_slip_page_body.tsx` 的收/發件匣接真 API
- `EmployeeHrFunction` 加 `PAYROLL` 值、與 HR `Employee` 的實際合併（ADR 020 正式模組的事）
- 薪資項目的「經常性給與」旗標、「取平均工資」查詢（ADR 020 §4.2 / §4.3）
- 薪資紀錄的 PII 加密與**薪資欄位的分級決策**（ADR 018 目前未涵蓋薪資）—— 見 §13
- **把公開版的試算內容帶進帳本版**（跨路由搬 34 個輸入欄位）。需要序列化進 query 或 sessionStorage，
  且要處理「帶過去的值與帳本裡的員工本薪不一致」的取捨 —— 是獨立議題，§8.2 的說明文案會誠實告知不會帶

---

## 13. 待確認風險

1. **薪資欄位的分級尚未拍板；快照與金額欄位先明文入庫（20260831 決議「先明文，上線前再決定」）。**

   **先更正一件事：ADR 018 並沒有把薪資列為高敏感 PII。**
   逐字查過 `018_hr_pii_data_classification.md`：三個 Tier 的欄位清單裡
   （Tier 1 身分證／銀行帳號、Tier 2 生日／地址／電話／個人信箱／打卡座標、
   Tier 3 員工編號／公司信箱／姓名⋯⋯）**沒有任何薪資欄位**；全文提到「薪資」只有一次，
   在第 25 行，說的是「13 張表⋯⋯也成為後續**薪資**、考勤、績效模組抄襲的樣板」。
   也就是說 ADR 018 是**樣板**，不是已經涵蓋薪資的裁決。
   （這句錯誤歸因原本被抄進本文件、部署檢查表與 PR 描述共三處，2026-09-01 一併更正。）

   所以真正要做的不是「照 ADR 018 執行」，而是**替薪資補一段分級決策** ——
   形式比照 ADR 018 的「補充決策（2026-08-14 review）：打卡座標列入 Tier 2」那一段。

   **拍板時的參考點（強度排序目前是反的）**：`HrPiiTable` 已有 6 張表，其中
   `LeaveRequest.reasonCipher`（請假事由）被評為 Tier 2 並加密。請假事由要加密，
   而投保級距、本薪、各項扣除、實發金額明文 —— 這個排序需要被明確地選擇，不是預設。

   **明文的範圍不只快照兩欄**（護欄要用輸入空間描述，checklist §2.5）：
   - `SalaryRecord.inputSnapshot` / `resultSnapshot`（Json）
   - `SalaryRecord.totalPayment` / `totalSalaryTaxable` / `totalEmployerCost`（BigInt 純量）
   - **`SalaryCalculatorEmployee.baseSalary` / `mealAllowance`（BigInt 純量）** ——
     這兩欄也是明文薪資，而且是純量、比 Json 更好查

   目前靠 `accountBookId` 租戶隔離與 `assertSalaryAccountBookAccess` 授權把關。

   理由是這樣可逆：目前沒有正式資料，schema 又走 `prisma db push`，
   日後要轉成 `*Cipher` + `piiKeyVersion` 只是改欄位與 repository 的一層編解碼。
   但要注意 §2.2 抽出來的三個金額欄位**不是不受影響**：它們是排序與篩選的維度，
   一旦加密就排不了序也篩不了，那是分級決策要一併回答的取捨
   （同 ADR 018 對 `leavePolicyId`「加密後行事曆與統計都查不了」的處理）。

   **這是部署檢查表的阻擋項**：正式上線前必須由 Luphia 或安全負責人拍板。
   若判定要加密，同時要確認 `SalaryRecord` 與 `SalaryCalculatorEmployee` 是否納入
   `HrPiiTable`（`src/constants/hr_pii.ts`、`src/repositories/hr_pii_invariant.ts`）
   —— 那會要求 `id` 不得有 `@default`。

2. **是否要寫 `AuditLog`；以及 `createdByUserId` 目前沒有任何讀者。**
   `AuditLog` model（`prisma/schema.prisma:902`）有 `dataType: EMPLOYEE_PII` / `action: READ`。
   薪資紀錄的讀取是否要留稽核軌跡，取決於第 1 點的結論。

   **另一半是寫入側。** 全 repo grep `createdByUserId`：它只出現在 repository 的
   寫入路徑與 schema 掃描測試裡 —— 不在 `ISalaryRecordSummary` / `ISalaryRecordDetail`、
   不在任何 API 回應、不在任何畫面、不在任何告警。覆寫時刻意不更新它
   （理由成立：那一欄記的是來源），但也沒有 `updatedByUserId`。
   加上薪資紀錄**不做軟刪**，「這筆薪資是誰改的／誰刪的」目前無法回答。
   checklist §3.5：稽核欄位沒有讀者，稽核價值就是零。

   兩條路擇一，與第 1 點一起拍板：
   - 給它讀者：明細回應帶 `createdBy`，畫面上顯示，可見範圍比照
     `SALARY_ACCESS_ROLES`（或更緊）；
   - 或連同本點一起改寫 `AuditLog`，並補 `updatedByUserId` / 刪除軌跡。

3. **薪資模組的角色範圍：寫入已收斂，讀取待拍板（20260901）。**
   八支端點原本只掛「是不是帳本所屬團隊的成員」，`OWNER / EDITOR / VIEWER`
   一視同仁 —— 亦即受邀當 `VIEWER` 的外部顧問可以讀寫刪全公司薪資。
   已改為 `src/constants/salary_access.ts` 的 `SALARY_ACCESS_ROLES`：
   寫入限 `OWNER / EDITOR`（會計、記帳士通常是 `EDITOR`，收到 `OWNER` 一人
   會把這個模組要服務的人擋在門外），讀取維持全體成員 —— **後者是維持現狀，
   不是一個新決定**，要與第 1 點的資料分級一起拍板。屆時改的是那一張表，
   不是八支 route。

4. **`calculatorVersion` 的 bump 紀律靠人。**
   忘了 bump 不會有任何症狀，直到某天要回答「這張薪資單是哪一版算的」才發現對不上。
   可考慮加一支掃描測試：`src/constants/salary_levels/` 有異動時要求 `SALARY_CALCULATOR_VERSION` 一併變 ——
   但那需要比對 git diff，非本次範圍，先靠 code review。
