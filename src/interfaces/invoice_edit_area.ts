import { Prisma } from '@prisma/client';
import { ILineItemsInfo } from '@/interfaces/voucher';

export interface ITaxInfo {
  invoiceNo: string | null;
  issueDate: number | null;
  tradingPartner: {
    name: string | null;
    taxId: string | null;
  };
  taxType: string | null;
  taxRate: Prisma.Decimal | null;
  salesAmount: Prisma.Decimal | null;
  tax: Prisma.Decimal | null;
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
