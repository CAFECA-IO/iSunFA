import {
  ISalaryCalculatorUI,
  defaultSalaryCalculatorResult,
} from "@/interfaces/salary_calculator";

export interface IPaySlipRecord {
  id: string;
  payPeriod: number;
  paySlipData: ISalaryCalculatorUI;
}

/**
 * ToDo: (20250725 - Julian) 還有優化空間
 *
 * Info: (20260904 - Julian) 「已寄出」那一半已接真資料，形狀改由
 * `ISalaryPaySlipDeliveryListItem` 提供，`ISentRecord` / `dummySentData` 隨之移除。
 *
 * 「已收到」這一半仍是假資料：它要成立需要先有「員工能登入本站」的概念，
 * 而 `SalaryCalculatorEmployee` 不是 `User`，沒有登入身分也沒有信箱驗證。
 * 那是比薪資單寄送大得多的題目（計畫書 §10.6）。
 */
export interface IReceivedRecord extends IPaySlipRecord {
  fromEmail: string;
  netPay: number;
}

export const dummyReceivedData: IReceivedRecord[] = [
  {
    id: "1",
    payPeriod: 1723012933,
    fromEmail: "XYZ@wfe.efwe",
    netPay: 50000,
    paySlipData: defaultSalaryCalculatorResult,
  },
  {
    id: "2",
    payPeriod: 1725691200,
    fromEmail: "ABC@fwe.fe",
    netPay: 60000,
    paySlipData: defaultSalaryCalculatorResult,
  },
];
