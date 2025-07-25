import { ISalaryCalculator, defaultSalaryCalculatorResult } from '@/interfaces/calculator';

export interface IPaySlipRecord {
  id: string;
  payPeriod: number;
  paySlipData: ISalaryCalculator;
}

// ToDo: (20250725 - Julian) 還有優化空間
export interface IReceivedRecord extends IPaySlipRecord {
  fromEmail: string;
  netPay: number;
}

export interface ISentRecord extends IPaySlipRecord {
  toEmail: string;
  issuedDate: number;
}

export const dummyReceivedData: IReceivedRecord[] = [
  {
    id: '1',
    payPeriod: 1723012933,
    fromEmail: 'XYZ@wfe.efwe',
    netPay: 50000,
    paySlipData: defaultSalaryCalculatorResult,
  },
  {
    id: '2',
    payPeriod: 1725691200,
    fromEmail: 'ABC@fwe.fe',
    netPay: 60000,
    paySlipData: defaultSalaryCalculatorResult,
  },
];

export const dummySentData: ISentRecord[] = [
  {
    id: '1',
    payPeriod: 1728732974,
    toEmail: 'ASDF@dfwf.efw',
    issuedDate: 1725120000,
    paySlipData: defaultSalaryCalculatorResult,
  },
  {
    id: '2',
    payPeriod: 1754032975,
    toEmail: 'QWER@dfwf.efw',
    issuedDate: 1727808000,
    paySlipData: defaultSalaryCalculatorResult,
  },
];
