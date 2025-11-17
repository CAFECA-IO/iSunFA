import { TaxType } from '@/constants/invoice_rc2';
import { ILineItemsInfo } from '@/interfaces/voucher';

export interface ITaxInfo {
  invoiceNo: string;
  issueDate: number;
  tradingPartner: {
    name: string;
    taxId: string;
  };
  taxType: TaxType;
  taxRate: number;
  salesAmount: number;
  tax: number;
}

export interface IInvoiceData {
  id: string;
  imageUrl: string;
  taxInfo: ITaxInfo;
  voucherInfo: {
    lineItemsInfo: ILineItemsInfo[];
  };
}

export const mockInvoiceData: IInvoiceData = {
  id: 'inv-123456',
  imageUrl: '/images/demo_certifate.png',
  taxInfo: {
    invoiceNo: 'AB-12345678',
    issueDate: 1762109170,
    tradingPartner: {
      name: 'XYZ Corporation',
      taxId: '12345678',
    },
    taxType: TaxType.TAXABLE,
    taxRate: 0.05,
    salesAmount: 10000,
    tax: 500,
  },
  voucherInfo: {
    lineItemsInfo: [
      {
        lineItems: [
          {
            id: 1,
            account: {
              id: 1260,
              accountBookId: 1002,
              system: 'IFRS',
              type: 'asset',
              debit: true,
              liquidity: true,
              code: '1139',
              name: '避險之金融資產－流動',
              note: null,
              createdAt: 0,
              updatedAt: 0,
              deletedAt: null,
            },
            amount: '2002',
            description: 'Pen-0001',
            debit: false,
          },
          {
            id: 2,
            account: {
              id: 1260,
              accountBookId: 2342,
              system: 'IFRS',
              type: 'asset',
              debit: true,
              liquidity: true,
              code: '3242',
              name: '現金及約當現金',
              note: null,
              createdAt: 0,
              updatedAt: 0,
              deletedAt: null,
            },
            amount: '2002',
            description: '',
            debit: true,
          },
        ],
        sum: { debit: true, amount: '2002' },
      },
    ],
  },
};
