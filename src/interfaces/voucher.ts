export enum TradingType {
  INCOME = "income",
  OUTCOME = "outcome",
  TRANSFER = "transfer",
}

export interface IVoucher {
  id: string;
  tradingDate: number;
  invoiceDate?: number;
  hasRead?: boolean;
  tradingType: TradingType;
  sourceId: string;
  sourceName: string;
  reasonId: string;
  reasonName: string;
  partnerId: string;
  partnerName: string;
  amount: string;
  currency: string;
  businessTax?: boolean;
  fee?: boolean;
  note: string;
  fileId: string;
  file?: {
    id: string;
    hash: string;
    fileName: string;
  };
}

export const mockVouchers: IVoucher[] = [
  {
    id: "1",
    tradingDate: 1703420984,
    hasRead: true,
    tradingType: TradingType.INCOME,
    sourceId: "1101",
    sourceName: "Cash on hand",
    reasonId: "4110",
    reasonName: "Sales Revenue",
    partnerId: "59373022",
    partnerName: "PX Mart",
    amount: "1,785,000",
    currency: "TWD",
    note: "One line note",
    fileId: "1",
  },
  {
    id: "2",
    tradingDate: 1738882361,
    hasRead: true,
    tradingType: TradingType.OUTCOME,
    sourceId: "1101",
    sourceName: "Cash on hand",
    reasonId: "5111",
    reasonName: "Cost of Goods Sold",
    partnerId: "59373022",
    partnerName: "PX Mart",
    amount: "1,785,000",
    currency: "TWD",
    note: "",
    fileId: "1",
  },
  {
    id: "3",
    tradingDate: 1723378219,
    hasRead: false,
    tradingType: TradingType.TRANSFER,
    sourceId: "1101",
    sourceName: "Cash on hand",
    reasonId: "1104",
    reasonName: "Cash in banks",
    partnerId: "",
    partnerName: "",
    amount: "1,785,000",
    currency: "TWD",
    note: "Save money to Tai shin bank",
    fileId: "1",
  },
  {
    id: "4",
    tradingDate: 1718238194,
    hasRead: false,
    tradingType: TradingType.TRANSFER,
    sourceId: "1101",
    sourceName: "Cash on hand",
    reasonId: "4610",
    reasonName: "Service Revenue",
    partnerId: "59373022",
    partnerName: "PX Mart",
    amount: "1,785,000",
    currency: "TWD",
    note: "Sale a printer",
    fileId: "1",
  },
  {
    id: "5",
    tradingDate: 1728461814,
    hasRead: false,
    tradingType: TradingType.OUTCOME,
    sourceId: "1101",
    sourceName: "Cash on hand",
    reasonId: "5111",
    reasonName: "Cost of Goods Sold",
    partnerId: "59373022",
    partnerName: "PX Mart",
    amount: "1,785,000",
    currency: "TWD",
    note: "This is where you can put note",
    fileId: "1",
  },
  {
    id: "6",
    tradingDate: 1774538283,
    hasRead: false,
    tradingType: TradingType.INCOME,
    sourceId: "1101",
    sourceName: "Cash on hand",
    reasonId: "5111",
    reasonName: "Cost of Goods Sold",
    partnerId: "59373022",
    partnerName: "PX Mart",
    amount: "1,785,000",
    currency: "TWD",
    note: "",
    fileId: "1",
  },
];
