# 薪資計算機員工檔擴充計畫（選好員工即自動匯入）

- 撰寫：20260902 - Julian
- 相關：`salary_record_module_plan.md`（本模組的母計畫）、ADR 018（HR PII 分級）、`code_review_checklist.md`
- 前置：PR #6737（`feature/salary_calculator`）必須先 merge —— 本計畫改的是同一批檔案

---

## 0. 需求與已拍板的三個決策

> 補齊員工和薪資資料的綁定欄位須擴充，目前只存到本薪和伙食費。
> 員工應同步薪資計算機的基本資料、基本薪資和其他項目，讓用戶選好員工姓名後就能自動匯入資料。

「同步」在這句話裡有三種讀法，已於 20260902 拍板：

| # | 問題 | 決定 |
|---|---|---|
| D1 | 「其他加給（應稅／免稅）」是固定職務加給還是當月獎金？ | **固定職務加給，存進員工** |
| D2 | 同步方向？ | **單向為主（員工 → 計算機）；儲存薪資紀錄時偵測差異，跳一個對話框問要不要回寫員工檔** |
| D3 | 選了員工之後，計算機上已填的內容？ | **全部覆蓋成員工的值**（只覆蓋員工檔上有的欄位，見 §1） |

D2 的「問一句」不是可有可無的裝飾：沒有它，這個功能就是「這個月臨時多報一個扶養人，永久改掉他的設定」，而且完全靜默。有它，則「改員工設定」始終是一個使用者按下去的動作。

---

## 1. 欄位分類：這是整份計畫的核心

`ISalaryCalculatorFormState` 有 **34 個欄位**，加上 context 另外持有的 `employmentType` 共 35 個。
分成三類，**分錯一格的代價不對稱**：

- 該存卻沒存 → 使用者每個月重打一次（吵，但看得見）
- **不該存卻存了 → 下個月選了員工就自動帶上個月的加班時數，畫面完全正常而薪水是錯的（靜默）**

所以下面這張表的第三欄是這個功能唯一真正的判準。

### 1.1 期間（2 個）— 不存

| 欄位 | 理由 |
|---|---|
| `selectedYear` / `selectedMonth` | 「算哪一個月」是這一次試算的問題，不是員工的屬性 |

### 1.2 員工常態屬性（16 個）— 存進員工檔

| 表單欄位 | 落地欄位 | 備註 |
|---|---|---|
| `baseSalary` | `base_salary` | **已有** |
| `mealAllowance` | `meal_allowance` | **已有** |
| `industryCategory` | `industry_code Int` | 引擎收的是 `job`（行業別代碼） |
| `taxResidencyStatus` | `is_foreign_worker Boolean` | 引擎收的是 `foreignWorker` 布林，不是列舉 |
| `employmentType` | `employment_type String` | 全職／兼職。**目前它沒有任何讀者**（review R6），這次順帶給它一個 |
| `payrollDaysBase` | `base_salary_30_days Boolean` | 引擎收的是 `baseSalary30Days` 布林 |
| `otherAllowanceWithTax` | `other_allowance_taxable BigInt` | D1 |
| `otherAllowanceWithoutTax` | `other_allowance_tax_free BigInt` | D1 |
| `isLaborInsurance` | `is_labor_insured Boolean` | |
| `isNHI` | `is_health_insured Boolean` | |
| `isLaborPension` | `is_pension_insured Boolean` | |
| `numberOfDependents` | `dependents_count Int` | |
| `voluntaryPensionContribution` | `voluntary_pension_rate Int` | **⚠️ 見 §2.2 —— 這一欄是費率不是金額** |
| `isJoined` + `dayOfJoining` | `hire_date DateTime?` | **⚠️ 見 §2.3 —— 兩個欄位收斂成一個真實日期** |
| `isLeft` + `dayOfLeaving` | `resign_date DateTime?` | 同上 |

**新增欄位共 13 個**（16 個屬性中 2 個已有，4 個到離職欄位收斂成 2 個）。

### 1.3 當月變動（16 個）— **絕對不存**

| 欄位 | 為什麼不能存 |
|---|---|
| 10 個加班時數（`oneAndOneThirdHoursForTaxable` … `twoAndTwoThirdsHoursForNonTax`） | 加班是當月事實。存了就會把上個月的加班費帶到這個月 |
| `leavePayoutHours` / `sickLeaveHours` / `personalLeaveHours` | 同上 |
| `nhiBackPremium`（健保加保費用） | 補收是一次性的 |
| `secondGenNhiTax`（二代健保） | 同上。**附帶發現**：這一欄在 context 有 state、有 snapshot 進出，但**沒有 setter 也沒有任何 UI**，實務上永遠是 0。屬既有缺陷，不在本計畫範圍，登記在 §9 |
| `otherAdjustments`（其他溢扣／補收） | 同上 |

檢核：2 + 16 + 16 = 34 ✅（`employmentType` 不在 form state 內，另計）

---

## 2. Schema 變更與三個型別陷阱

### 2.1 新增的 13 欄

```prisma
model SalaryCalculatorEmployee {
  // ...既有欄位...

  // Info: (20260902 - Julian) 選員工時自動匯入的常態屬性。
  // 只放「這個人一直都是這樣」的東西；當月變動（加班、請假、溢扣）一律不進這張表 —— 理由見計畫書 §1.3
  industryCode       Int     @default(42) @map("industry_code")
  isForeignWorker    Boolean @default(false) @map("is_foreign_worker")
  employmentType     String  @default("FULL_TIME") @map("employment_type")
  baseSalary30Days   Boolean @default(true) @map("base_salary_30_days")

  otherAllowanceTaxable BigInt @default(0) @map("other_allowance_taxable")
  otherAllowanceTaxFree BigInt @default(0) @map("other_allowance_tax_free")

  isLaborInsured  Boolean @default(true) @map("is_labor_insured")
  isHealthInsured Boolean @default(true) @map("is_health_insured")
  isPensionInsured Boolean @default(true) @map("is_pension_insured")

  dependentsCount Int @default(0) @map("dependents_count")

  // Info: (20260902 - Julian) 自提勞退**費率**，存百分點（0–6）。不是金額，見計畫書 §2.2
  voluntaryPensionRate Int @default(0) @map("voluntary_pension_rate")

  // Info: (20260902 - Julian) 完整日期，不是「當月第幾號」。見計畫書 §2.3
  hireDate   DateTime? @map("hire_date")
  resignDate DateTime? @map("resign_date")
}
```

**每一欄都有 `@default`，`hire_date` / `resign_date` 可空。** 本專案沒有 `prisma/migrations/`，
schema 走 `prisma db push` —— 加一個必填且無 default 的欄位會讓既有的員工列直接 push 失敗
（部署檢查表對假勤模組寫過同一件事）。既有員工套用後自動落在「本國籍、全職、三保都投、
0 扶養、0 自提、30 天基準、無其他加給」，那是計算機目前的預設值，**行為與現在完全相同**。

### 2.2 陷阱一：`voluntaryPensionContribution` 是費率，不是金額

`others_form.tsx:29` 的選項是 `Array.from({ length: 7 }, (_, i) => i * 0.01)` —— **0、0.01 … 0.06**，
而引擎那一側的欄位叫 `employeeBurdenPensionInsurance`（「個人自願提繳退休金」），名字讀起來像金額。

照著旁邊 12 欄的樣子寫成 `BigInt`，`BigInt(0.06)` 會直接丟 `RangeError`；
寫成 `BigInt(Math.round(0.06))` 則靜靜變成 **0** —— 使用者設了 6% 自提，存進去是 0，
下次載回來也是 0，而畫面上的單選鈕會顯示「0%」，看起來像使用者自己沒選。

**落地存 `Int` 百分點（0–6）**，轉換集中在一個地方：

```ts
// Info: (20260902 - Julian) 0.06（費率）↔ 6（百分點）。兩邊都只走這一對，不散在各處手乘 100
export const toPensionRatePercent = (rate: number): number => Math.round(rate * 100);
export const fromPensionRatePercent = (percent: number): number => percent / 100;
```

驗證：`z.number().int().min(0).max(6)`。**不要**用 `Float` —— 0.06 沒有精確的二進位表示，
而這個值會參與金額計算（precision guideline §1 的同一條理由）。

### 2.3 陷阱二：到職／離職日目前是「當月第幾號」，不是日期

`salary_calculator_snapshot.ts:36` 的寫法是：

```ts
const toTimestamp = (year, month, day) => new Date(`${year}-${month}-${day}`).getTime() / 1000;
employeeStartDate: form.isJoined ? toTimestamp(year, month, form.dayOfJoining) : undefined,
```

也就是說引擎只關心「**這一個月**裡有沒有中途到職，第幾號」。`isJoined` 是一個 UI 布林，
`dayOfJoining` 是 1–31，兩者都沒有真正的來源 —— 使用者每個月自己勾。

員工檔上要存的是**真實的到職日**（`2026-08-15`），載入時當場推導：

```ts
// Info: (20260902 - Julian) 到職日落在選定的年月裡，才是「這個月中途到職」
const isJoined =
  hireDate !== null &&
  hireDate.getUTCFullYear() === selectedYear &&
  hireDate.getUTCMonth() + 1 === selectedMonth;
const dayOfJoining = isJoined ? String(hireDate.getUTCDate()).padStart(2, "0") : "01";
```

**一律 `getUTC*`。** 寫入端組的是 `new Date("2026-08-15")`，那個字串被當成 UTC 午夜解析；
用 `getDate()` 在 UTC 以西的時區會退一天，而**在 UTC 與 UTC+8 都測不出來**。
本專案已有一整組 `*.tz.test.ts` 在守這類缺陷（`scripts/jest_tz.mjs` 釘 `America/New_York`），
這次的推導函式必須進那一組。

這一併修掉一個既有問題：今天使用者換一個月份，`isJoined`／`dayOfJoining` 原封不動 ——
八月中途到職的人，切到九月照樣算成九月中途到職。有了 `hireDate`，切月份時答案自己會對。

### 2.4 陷阱三：`employmentType` 用 String 還是 enum

`EmploymentType` 目前是 TS 端的 `enum { FULL_TIME = "Full-time", PART_TIME = "Part-time" }` ——
**值是顯示字串**，而 `basic_info_form.tsx:101` 是拿 enum 的**鍵**（`FULL_TIME`）小寫化去查 i18n。

落地存 `String` 並存**鍵**（`"FULL_TIME"`），不是值。存值的話，哪天有人把顯示字串改成
「全職」，資料庫裡就會同時存在兩種寫法而沒有任何東西會紅。
Prisma enum 也可以，但那需要動 `schema.prisma` 的 enum 區塊、與 develop 的衝突面更大，
而這一欄的值域只有兩個 —— 用 `String` + 一支 validator + 一條掃描測試（值域必須等於
`Object.keys(EmploymentType)`）成本更低、擋得住的東西一樣多。

---

## 3. 型別與介面

```ts
// src/interfaces/salary_record.ts

// Info: (20260902 - Julian) 員工檔上「會被自動匯入計算機」的那一組。
// 與 ISalaryCalculatorEmployee 的身分欄位（id/name/number/email）分開命名，
// 因為下面每一條路徑關心的都是這一組、不是那四個。
export interface ISalaryEmployeeProfile {
  baseSalary: number;
  mealAllowance: number;
  otherAllowanceTaxable: number;
  otherAllowanceTaxFree: number;
  industryCode: number;
  isForeignWorker: boolean;
  employmentType: string;
  baseSalary30Days: boolean;
  isLaborInsured: boolean;
  isHealthInsured: boolean;
  isPensionInsured: boolean;
  dependentsCount: number;
  voluntaryPensionRate: number;   // Info: 百分點 0–6
  hireDate: number | null;        // Info: Unix 秒，沿用 IVoucher 的前端時間戳慣例
  resignDate: number | null;
}

export interface ISalaryCalculatorEmployee extends ISalaryEmployeeProfile {
  id: string;
  name: string;
  number: string;
  email: string;
}

export type ISalaryCalculatorEmployeeWriteInput = ISalaryEmployeeProfile & {
  name: string;
  number: string;
  email?: string;
};
```

`ISalaryEmployeeProfile` 是這次的主角：載入、回寫、差異偵測三條路徑都以它為單位，
新增欄位時三邊會一起編譯失敗，不會有一邊忘了接。

---

## 4. 三條路徑的行為

### 4.1 載入（員工 → 計算機）— D3

新增 context 方法，取代目前 `linkEmployee` 只灌 5 個欄位的作法：

```ts
const linkEmployee = (employee: ISalaryCalculatorEmployee) => {
  // 身分（既有）
  setEmployeeName(employee.name); setEmployeeNumber(employee.number); setEmployeeEmail(employee.email);
  // 常態屬性（本次新增，14 個）
  applyEmployeeProfile(employee, { year: selectedYear, month: selectedMonth });
  setSelectedEmployeeId(employee.id);
};
```

**當月變動的 16 個欄位不動** —— 員工檔上根本沒有它們，所以「全部覆蓋」不會清掉使用者
剛打的加班時數。這一點要寫進註解，否則下一個人會以為 D3 是「整張表單重置」。

**⚠️ `loadBackHandler` 的順序陷阱被放大了 14 倍。** 薪資紀錄頁「載回計算機」目前是
先 `linkEmployee`（灌員工**現在**的值）再 `loadFromSnapshot`（灌紀錄**當時**的值），
順序不能倒 —— 快照必須贏。今天倒過來只會錯 2 個欄位（本薪、伙食費），
擴充後會錯 14 個，而且症狀一樣靜默。那個順序目前只靠一段註解守著，
本計畫要替它補一條判準（§7）。

### 4.2 回寫（計算機 → 員工）— D2

`salary_result_section` 按下「儲存薪資紀錄」時：

1. 以 `ISalaryEmployeeProfile` 為單位，比對計算機當下的值與 `employees` 裡那一列
2. 有差異 → 在既有的儲存流程**之前**插一個對話框，**逐條列出差了什麼**
   （「扶養人數 0 → 1」「勞退自提 0% → 6%」），不是一句「要不要更新員工資料」
3. 使用者選「更新員工檔並儲存」→ `PUT employee/:id` 後再存紀錄；
   選「只存這一次」→ 直接存紀錄，員工檔不動
4. 沒有差異 → 完全不出現，走原本的流程

比對要走一支純函式 `diffEmployeeProfile(current, employee): IProfileDiff[]`，
不是在 JSX 裡串 14 個 `!==`（checklist §1.11）。金額欄位比對前先過 `Math.round`：
表單的 `number` 與資料庫回來的 `BigInt → Number` 之間差一個 0.0000001 就會天天跳對話框。

**這個對話框與既有的「覆寫確認」「未連結員工」是三件不同的事**，順序要定死：
未連結 → 員工檔差異 → 覆寫確認 → 存。三個都可能同時成立。

### 4.3 新增員工時要帶上當下的值（**最容易漏掉的一條**）

`salary_result_section` 的「直接新增『某某』並儲存」目前只帶
`name / number / email / baseSalary / mealAllowance`。擴充後若不改：

> 使用者在計算機把 14 個欄位都設好 → 按儲存 → 選「直接新增員工」→
> 員工建立成功，但檔上全是**預設值** → 下個月選這個人 → D3 全部覆蓋 →
> **上個月設好的東西被預設值洗掉**

所以「直接新增」與員工列表彈窗的「新增員工」都要帶完整的 `ISalaryEmployeeProfile`。
這一條要有判準，不能只靠記得。

---

## 5. UI 變更

| 位置 | 變更 |
|---|---|
| `employee_action_modal.tsx` | 新增／編輯員工的表單從 5 欄擴到 19 欄。**分段**：身分（姓名／編號／Email）、薪資（本薪／伙食費／其他加給 ×2）、投保（三個開關／扶養人數／自提費率）、其他（行業別／稅務居民／僱用型態／基準天數／到職日／離職日）。一次擺 19 個輸入框會變成一張沒人想填的表單 |
| `basic_info_form.tsx` | 到職／離職的勾選與日期在**連結員工時唯讀**（值來自 `hireDate`／`resignDate`，旁邊標「來自員工資料」）。**未連結時仍可編輯** —— 公開版沒有帳本、沒有員工檔，無條件唯讀會讓那兩格永遠設不了，中途到職的試算就做不出來。決策 20260902 ✅ |
| `save_record_dialogs.tsx` | 新增 `ProfileDiffModal`（§4.2） |
| i18n | 五語系各新增約 25 個 key（14 個欄位標籤 + 對話框文案 + 差異描述） |

---

## 6. 相容性

- **既有員工列**：13 欄都有 `@default`，套用後行為與現在完全相同（§2.1）
- **既有薪資紀錄**：完全不受影響。快照存的是引擎輸入，本計畫不動 `ISalaryCalculatorOptions`
- **公開版計算機**：不受影響。它沒有帳本、沒有員工檔，`useSalaryEmployees` 收 `null` 不發請求
- **API 相容**：`GET employee` 的回應多 13 個欄位，`POST`/`PUT` 多 13 個必填欄位。
  **後者是破壞性變更** —— 目前沒有外部消費者，但要寫進部署檢查表

---

## 7. 測試計畫

| 測試檔 | 型別 | 釘住什麼 |
|---|---|---|
| `salary_employee_profile.test.ts` | 純函式 | **這次的主判準**：34 個表單欄位的三份分類清單恰好蓋滿且互不重疊、**16 個當月變動欄位一個都沒混進員工檔**、常態 16 → 員工檔 15 的對照沒有漏接；`diffEmployeeProfile` 逐欄列出 before/after，浮點誤差不算差異但差一塊錢要算。分類清單**手寫、不從程式碼推導** —— 推導的話有人把加班時數搬進去，兩邊同時變而測試全綠 |
| `salary_employee_profile.tz.test.ts` | 純函式（釘時區） | `hireDate` ↔ `isJoined`/`dayOfJoining` 的推導，含每月 1 號／31 號、跨月、跨年、只有離職日、NaN。**實跑 mutation**：三個 `getUTC*` 改成本地版本 → `TZ=UTC` 11 passed、`TZ=Asia/Taipei` 11 passed、`TZ=America/New_York` **7 failed** —— 檔名帶 `.tz` 不是形式 |
| `salary_pension_rate.test.ts` | 純函式 | 費率 ↔ 百分點的七個檔位逐格釘死（只驗來回的話，一對「都乘以 10」的函式也會全綠）；讀取路徑的異常值夾到合法檔位。**附帶更正**：0–6 這個值域裡 `i * 0.01 * 100` 其實是精確的，原本設想的「0.03 浮點漂移」不成立，該條已改成用一個 UI 產不出來的值去區分 `round` 與 `trunc` |
| `salary_repo.e2e.test.ts` | e2e（擴充既有） | 15 欄存進去原樣讀回來（create 的回傳、重新查詢、列表三邊一致）；`voluntary_pension_rate` 存 6 讀回來還是 6 且型別是 number 不是 bigint；`hire_date` 來回不差一天；更新會改到 15 欄而不只是金額；**既有列**（繞過 repository 只建必填欄位）讀出來是預設值不是 null |
| `salary_schema_defaults.test.ts` | 掃描（擴充既有） | 13 欄各自的 `@default` 都在 —— 少一個就會讓既有列 push 失敗 |
| `salary_route_wiring.test.ts` | route（擴充既有） | `POST`/`PUT employee` 的新必填欄位缺一個就回 400 |
| `salary_validators.test.ts` | 純函式（擴充既有） | `voluntaryPensionRate` 值域 0–6 且必須是整數；`employmentType` 值域等於 `Object.keys(EmploymentType)` |
| `salary_load_back_identity.test.ts` | 掃描（擴充既有） | `loadBackHandler` 的「先連結後灌快照」順序（§4.1）；「直接新增員工」帶的是完整 profile（§4.3） |

**每一條都要實跑 mutation 確認會紅**（checklist §7.2.1）。已實跑：

| mutation | 結果 |
|---|---|
| `dayInMonth` 的三個 `getUTC*` → `getFullYear`/`getMonth`/`getDate` | `TZ=UTC` 11 passed、`TZ=Asia/Taipei` 11 passed、**`TZ=America/New_York` 7 failed** ✅ |

待實跑（B 落地後或本 PR 收尾時）：

1. 把 `sickLeaveHours` 加進 `ISalaryEmployeeProfile` 與分類表 → 「當月變動一個都沒混進來」要紅
2. 「直接新增員工」改回只帶 5 個欄位 → 要紅（目前靠型別擋，但型別擋不住有人補一個 `DEFAULT_EMPLOYEE_PROFILE` 上去）
3. 拿掉任一欄的 `@default` → `salary_schema_defaults` 要紅

---

## 8. PR 切法

前置：**PR #6737 先 merge**。本計畫動的是同一批檔案，疊上去會讓兩支都難 review。

| PR | 內容 | 可獨立 merge |
|---|---|---|
| **A：資料層** | schema 13 欄 + repo + service + validator + API + `ISalaryEmployeeProfile` + 三支純函式與其測試 + e2e 擴充 + **兩個寫入呼叫端** | ✅ 沒有新 UI |
| **B：前端** | `linkEmployee` 擴充（載入）、`employee_action_modal` 19 欄表單、`ProfileDiffModal`（回寫）、五語系 | 依賴 A |

**實作時 A / B 的界線往 A 移了一格**（20260902）：原本打算把「直接新增員工」
與「編輯員工」留給 B，但 `ISalaryCalculatorEmployeeWriteInput` 整組必填之後，
那兩個呼叫端在 A 就會編譯失敗 —— 而讓它們編譯通過的**唯一正確做法**就是把值帶對：

- `employee_action_modal`：13 個沒有介面的欄位**原樣帶回去**（編輯取現值、新增取預設值）。
  少了這個，「改個名字」會順便把那個人的投保狀態、扶養人數、到職日全部重設。
- `salary_result_section` 的「直接新增並儲存」：帶 `getEmployeeProfile()`，也就是
  計算機當下的 15 個欄位。少了這個就是 §4.3 那個坑 —— 而那是一個**已知會靜默毀資料**的缺陷，
  不能用「下一支 PR 會修」帶過。

換句話說：型別把「這個功能不能做一半」變成了編譯期的事實。A 因此比原計畫多動兩個元件，
但**沒有新的輸入介面**，行為上只多了「新增員工時會帶上計算機當下的設定」這一項改善。

A 的 review 面仍是資料層 + 兩個很短的呼叫端，B 才是 UI。
review 一支 82 檔的 PR 是什麼下場，#6737 已經示範過（§7.2.10）。

---

## 9. 風險與待決事項

1. **PII 範圍從 7 欄擴到 20 欄，而分級決策仍未拍板。**
   母計畫 §13 第 1 點列的明文薪資欄位是 7 個；本計畫再加 `other_allowance_*` 兩個金額，
   以及扶養人數、投保狀態、到職／離職日 —— 後三者是**個人身分資訊**，不只是金額。
   `hire_date` 在 ADR 018 的 Tier 3（`Employee.hireDate` 明列不加密），但扶養人數與投保狀態
   在 ADR 018 裡**沒有出現過**。這一項要跟著母計畫 §13 一起拍板，**不要預設沿用**。

2. **到職／離職欄位：已決議改唯讀（20260902）。** ✅
   有了 `hireDate` 之後，計算機上那兩個欄位有兩種語意：「改這次試算」或「改這個人的到職日」。
   決議是**連結員工時唯讀**，員工列表是它們唯一的編輯入口。
   **未連結時維持可編輯**是這個決議的必要配套，不是打折 ——
   公開版計算機沒有員工檔，無條件唯讀會讓中途到職的試算做不出來。

   附帶效果：這一格順手修掉一個既有缺陷。原本 `isJoined` / `dayOfJoining` 是純 UI 狀態、
   沒有來源，使用者換一個月份它們原封不動 —— 八月中途到職的人切到九月照樣被算成
   九月中途到職，九月的薪水少算半個月。改成由完整日期推導之後，切月份時答案自己會對。

3. **`industryCode` 其實是帳本層級的屬性，不是員工層級。**
   同一家公司的員工行業別必然相同。放在員工上是為了與引擎的 `job` 對齊、改動最小，
   代價是新增 20 位員工要選 20 次同一個值。日後可上移到 `AccountBook`，
   屆時員工這一欄變成覆寫用的可空欄位。**本次不做，登記在此。**

4. **預設行業別 42 寫死在三個地方，而且其中一處是錯的。**
   `calculator_context.tsx:48` 是字面量 `42`、`salary_calculator_snapshot.ts:24` 是
   `DEFAULT_INDUSTRY_CODE = 42`、而 `interfaces/salary_calculator.ts:174` 的註解寫「預設 41」。
   本計畫要在 schema 上再寫一次 `@default(42)` —— **第四處**。
   建議 PR A 順手把常數收斂到 `src/constants/industry_category.ts` 一處，並修掉那句錯的註解。

5. **`secondGenNhiTax` 有 state、有快照進出，但沒有 setter 也沒有 UI。**
   實務上永遠是 0。屬既有缺陷（與 review R6 的 `employmentType` 同型），
   本計畫不處理 —— 它是當月變動欄位，不進員工檔。但既然被翻出來了就記在這裡：
   要嘛補 UI，要嘛從 form state 拿掉。

6. **`employment_type` 用 String 而非 Prisma enum 是一個取捨**（§2.4）。
   值域只有兩個、且已有掃描測試守著。若日後要加「工讀」「約聘」等第三種，
   建議屆時一併改成 Prisma enum。
