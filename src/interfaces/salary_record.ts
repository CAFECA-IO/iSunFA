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
}
