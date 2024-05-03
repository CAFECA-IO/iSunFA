import { EventType, PaymentPeriodType, PaymentStatusType } from './account';

export interface IInvoiceData {
  date: {
    start_date: number; // timestamp
    end_date: number; // timestamp
  };
  eventType: EventType;
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

export interface IInvoiceWithPaymentMethod extends IInvoiceData {
  payment: IInvoiceData['payment'] & {
    paymentMethod: string;
    paymentPeriod: PaymentPeriodType;
    installmentPeriod: number;
    paymentStatus: PaymentStatusType;
    alreadyPaidAmount: number;
  };
}
