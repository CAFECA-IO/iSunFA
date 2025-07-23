export interface IPaySlipRecord {
  id: string;
  payPeriod: {
    month: string;
    year: string;
  };
}

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
    payPeriod: { month: 'July', year: '2025' },
    fromEmail: 'XYZ@wfe.efwe',
    netPay: 50000,
  },
  {
    id: '2',
    payPeriod: { month: 'August', year: '2025' },
    fromEmail: 'ABC@fwe.fe',
    netPay: 60000,
  },
];

export const dummySentData: ISentRecord[] = [
  {
    id: '1',
    payPeriod: { month: 'July', year: '2025' },
    toEmail: 'ASDF@dfwf.efw',
    issuedDate: 1725120000,
  },
  {
    id: '2',
    payPeriod: { month: 'August', year: '2025' },
    toEmail: 'QWER@dfwf.efw',
    issuedDate: 1727808000,
  },
];
