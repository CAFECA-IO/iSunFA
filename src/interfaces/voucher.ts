import { IAccount, mockAccounts } from "@/constants/accounts";

export enum TradingType {
  INCOME = "income",
  OUTCOME = "outcome",
  TRANSFER = "transfer",
}

export interface IVoucherLine {
  id: string;
  accounting: IAccount;
  particular: string;
  amount: number;
  isDebit: boolean;
}

export interface IVoucherLineUI {
  id: string;
  accounting: IAccount | null;
  particular: string;
  amount: number;
  isDebit: boolean | null;
}

export interface IVoucher {
  id: string;
  tradingDate: number;
  tradingType: TradingType;
  note: string;
  isDeleted: boolean;
  fileId: string;
  file?: {
    id: string;
    hash: string;
    fileName: string;
  };
  lineItems: {
    lines: IVoucherLineUI[];
    totalAmount: number;
  };
  issuerName: string;
}

export const mockVouchers: IVoucher[] = [
  {
    id: "1",
    tradingDate: 1703420984,
    tradingType: TradingType.INCOME,
    lineItems: {
      lines: [
        {
          id: "1",
          accounting: mockAccounts[0],
          particular: "Sales Revenue",
          amount: 1785000,
          isDebit: false,
        },
        {
          id: "2",
          accounting: mockAccounts[1],
          particular: "Cash on hand",
          amount: 1785000,
          isDebit: true,
        },
      ],
      totalAmount: 1785000,
    },
    note: "One line note",
    isDeleted: false,
    fileId: "1",
    issuerName: "Jodie",
  },
  {
    id: "2",
    tradingDate: 1738882361,
    tradingType: TradingType.OUTCOME,
    lineItems: {
      lines: [
        {
          id: "1",
          accounting: mockAccounts[0],
          particular: "Sales Revenue",
          amount: 162000,
          isDebit: false,
        },
        {
          id: "2",
          accounting: mockAccounts[1],
          particular: "Cash on hand",
          amount: 162000,
          isDebit: true,
        },
      ],
      totalAmount: 162000,
    },
    note: "",
    isDeleted: false,
    fileId: "1",
    issuerName: "Walter",
  },
  {
    id: "3",
    tradingDate: 1723378219,
    tradingType: TradingType.TRANSFER,
    lineItems: {
      lines: [
        {
          id: "1",
          accounting: mockAccounts[0],
          particular: "Sales Revenue",
          amount: 63000,
          isDebit: false,
        },
        {
          id: "2",
          accounting: mockAccounts[1],
          particular: "Cash on hand",
          amount: 60000,
          isDebit: true,
        },

        {
          id: "3",
          accounting: mockAccounts[1],
          particular: "Cash on hand",
          amount: 3000,
          isDebit: true,
        },
      ],
      totalAmount: 63000,
    },
    note: "Save money to Tai shin bank",
    isDeleted: false,
    fileId: "1",
    issuerName: "Silvia",
  },
  {
    id: "4",
    tradingDate: 1718238194,
    tradingType: TradingType.TRANSFER,
    lineItems: {
      lines: [
        {
          id: "1",
          accounting: mockAccounts[0],
          particular: "Sales Revenue",
          amount: 75000,
          isDebit: false,
        },
        {
          id: "2",
          accounting: mockAccounts[1],
          particular: "Cash on hand",
          amount: 75000,
          isDebit: true,
        },
      ],
      totalAmount: 75000,
    },
    note: "Sale a printer",
    isDeleted: true,
    fileId: "1",
    issuerName: "Debby",
  },
  {
    id: "5",
    tradingDate: 1728461814,
    tradingType: TradingType.OUTCOME,
    lineItems: {
      lines: [
        {
          id: "1",
          accounting: mockAccounts[0],
          particular: "Sales Revenue",
          amount: 800,
          isDebit: false,
        },
        {
          id: "2",
          accounting: mockAccounts[1],
          particular: "Cash on hand",
          amount: 200,
          isDebit: true,
        },
        {
          id: "3",
          accounting: mockAccounts[1],
          particular: "Cash on hand",
          amount: 600,
          isDebit: true,
        },
      ],
      totalAmount: 800,
    },
    note: "This is where you can put note",
    isDeleted: true,
    fileId: "1",
    issuerName: "Chris",
  },
  {
    id: "6",
    tradingDate: 1774538283,
    tradingType: TradingType.INCOME,
    lineItems: {
      lines: [
        {
          id: "1",
          accounting: mockAccounts[0],
          particular: "Sales Revenue",
          amount: 85000,
          isDebit: false,
        },
        {
          id: "2",
          accounting: mockAccounts[1],
          particular: "Cash on hand",
          amount: 85000,
          isDebit: true,
        },
      ],
      totalAmount: 85000,
    },
    note: "",
    isDeleted: false,
    fileId: "1",
    issuerName: "Xavier",
  },
];
