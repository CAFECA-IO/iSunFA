import {
  ISalaryCalculatorOptions,
  ISalaryCalculatorUI,
} from "@/interfaces/salary_calculator";

/**
 * Info: (20260831 - Julian) 薪資計算機的員工名單與薪資紀錄（前端格式）。
 *
 * 與 Prisma model 的兩處差異，沿用 `IVoucher` 的既有慣例：
 * 金額的 `BigInt` 在這裡是 `number`（薪資是整數元，轉換在 repository），
 * 時間戳的 `DateTime` 在這裡是 Unix 秒。
 */

// Info: (20260831 - Julian) 輕量員工。id 是 uuid，取代舊的 IEmployeeForCalc（number id）
export interface ISalaryCalculatorEmployee {
  id: string;
  name: string;
  number: string;
  email: string;
  baseSalary: number;
  mealAllowance: number;
}

/**
 * Info: (20260831 - Julian) 新增／編輯員工的輸入。
 *
 * `number` 是身分（帳本內唯一），因此必填；`email` 只在寄薪資單時才需要，可省略。
 */
export interface ISalaryCalculatorEmployeeWriteInput {
  name: string;
  number: string;
  email?: string;
  baseSalary: number;
  mealAllowance: number;
}

/**
 * Info: (20260831 - Julian) 薪資紀錄的列表項目，**不含快照**。
 *
 * 快照兩個加起來近 70 個欄位，一頁 20 筆就是 1400 個數字。
 * 列表只需要看得出「哪個人、哪個月、領多少」，明細另有單筆端點。
 */
export interface ISalaryRecordSummary {
  id: string;
  year: number;
  month: number;
  employee: {
    id: string;
    name: string;
    number: string;
  };
  totalPayment: number;
  totalSalaryTaxable: number;
  totalEmployerCost: number;
  calculatorVersion: string;
  createdAt: number;
  updatedAt: number;
}

// Info: (20260831 - Julian) 單筆詳細，含快照，供「載回計算機」與檢視薪資單
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

// Info: (20260831 - Julian) 薪資紀錄的查詢條件
export interface ISalaryRecordQueryOptions {
  accountBookId: string;
  employeeId?: string;
  year?: number;
  month?: number;
  // Info: (20260901 - Julian) 比對員工姓名或編號，空字串視同沒有這個條件
  keyword?: string;
  page: number;
  pageSize: number;
}

/**
 * Info: (20260831 - Julian) 分頁回應。
 *
 * 形狀對齊 `ILedgerPageResult`（`src/interfaces/ledger.ts:46`）——
 * 專案沒有全站統一的分頁型別，而那一套是最近新寫、且明說「與 route 回應結構一致」的。
 */
export interface ISalaryRecordPageResult {
  data: ISalaryRecordSummary[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  /**
   * Info: (20260901 - Julian) 這本帳實際存在紀錄的年月，新到舊。
   *
   * 給期間篩選的下拉用。不從當前這一頁推導，也不用「現在往前推 N 個月」硬湊 ——
   * 兩者都會讓「紀錄在第 3 頁」或「三年前的那一筆」變成選不到、因此篩不到的資料。
   * 這份清單只看 `accountBookId`，不套其他篩選條件，所以選了一個期間之後
   * 其他期間仍然留在選單裡（否則選完就只剩自己，換不回去）。
   */
  periods: ISalaryRecordPeriod[];
}

// Info: (20260901 - Julian) 一個給付期間（年 + 月），供期間篩選使用
export interface ISalaryRecordPeriod {
  year: number;
  month: number;
}
