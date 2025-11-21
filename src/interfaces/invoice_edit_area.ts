import { ILineItemsInfo } from '@/interfaces/voucher';

export interface ITaxInfo {
  invoiceNo: string | null;
  issueDate: number | null;
  tradingPartner: {
    name: string | null;
    taxId: string | null;
  };
  taxType: string | null;
  taxRate: number | null;
  salesAmount: number | null;
  tax: number | null;
}

export interface IInvoiceData {
  id: string;
  imageUrl: string;
  taxInfo: ITaxInfo;
  voucherInfo: {
    lineItemsInfo: ILineItemsInfo[];
  };
  unread: boolean;
}
