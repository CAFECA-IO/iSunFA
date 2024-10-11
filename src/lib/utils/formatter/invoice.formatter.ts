import { IInvoice } from '@/interfaces/invoice';
import {
  convertStringToEventType,
  convertStringToPaymentPeriodType,
  convertStringToPaymentStatusType,
} from '@/lib/utils/type_guard/account';
import {
  Account,
  Certificate,
  File,
  Invoice,
  InvoiceVoucherJournal,
  Journal,
  LineItem,
  Voucher,
} from '@prisma/client';

// ToDo: (20241009 - Jacky) This is a temporary function to format the invoice data from the database
// so that it can be used in the front-end. This function will be removed after the beta frontend is completed.
export function formatIInvoice(
  invoiceVoucherJournal: InvoiceVoucherJournal & {
    journal: Journal | null;
    invoice: (Invoice & { certificate: Certificate & { file: File } }) | null;
    voucher: (Voucher & { lineItems: (LineItem & { account: Account })[] }) | null;
  }
): IInvoice {
  const invoice: IInvoice = {
    journalId: invoiceVoucherJournal.journalId,
    date: invoiceVoucherJournal.invoice?.date || invoiceVoucherJournal.createdAt,
    eventType: convertStringToEventType(
      invoiceVoucherJournal.voucher?.type || 'journal:EVENT_TYPE.INVOICE'
    ),
    paymentReason: invoiceVoucherJournal.paymentReason,
    description: invoiceVoucherJournal.description,
    vendorOrSupplier: invoiceVoucherJournal.vendorOrSupplier,
    projectId: 0,
    project: null,
    contractId: 0,
    contract: null,
    payment: {
      isRevenue: true,
      price: invoiceVoucherJournal.invoice?.totalPrice || 0,
      hasTax: invoiceVoucherJournal.invoice?.taxType !== 'tax free',
      taxPercentage: invoiceVoucherJournal.invoice?.taxRatio || 0,
      hasFee: false,
      fee: 0,
      method: 'journal:PAYMENT_METHOD.CASH',
      period: convertStringToPaymentPeriodType('atOnce'),
      installmentPeriod: 0,
      alreadyPaid: 0,
      status: convertStringToPaymentStatusType('paid'),
      progress: 0,
    },
  };
  return invoice;
}
