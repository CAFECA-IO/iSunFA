import { PaymentPeriodType, PaymentStatusType } from './account';

export interface IInvoice {
  id: string;
  date: {
    start_date: number; // timestamp
    end_date: number; // timestamp
  };
  eventType: string; // 'income' | 'payment' | 'transfer';
  paymentReason: string;
  description: string;
  venderOrSupplyer: string;
  payment: {
    price: number;
    hasTax: boolean;
    taxPercentage: number;
    hasFee: boolean;
    fee: number;
  };
}

export interface IInvoiceWithPaymentMethod extends IInvoice {
  payment: IInvoice['payment'] & {
    paymentMethod: string;
    paymentPeriod: PaymentPeriodType;
    installmentPeriod: number;
    paymentStatus: PaymentStatusType;
    alreadyPaidAmount: number;
  };
}
