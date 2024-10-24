import { CurrencyType } from '@/constants/currency';
import { InvoiceTaxType, InvoiceTransactionDirection, InvoiceType } from '@/constants/invoice';
import { IInvoice, IInvoiceEntity } from '@/interfaces/invoice';
import {
  convertStringToEventType,
  convertStringToPaymentPeriodType,
  convertStringToPaymentStatusType,
} from '@/lib/utils/type_guard/account';
import {
  Account,
  Certificate,
  File,
  Invoice as PrismaInvoice,
  InvoiceVoucherJournal,
  Journal,
  LineItem,
  Voucher,
} from '@prisma/client';
import { z } from 'zod';
import { FormatterError } from '@/lib/utils/error/formatter_error';

// ToDo: (20241009 - Jacky) This is a temporary function to format the invoice data from the database
// so that it can be used in the front-end. This function will be removed after the beta frontend is completed.
export function formatIInvoice(
  invoiceVoucherJournal: InvoiceVoucherJournal & {
    journal: Journal | null;
    invoice: (PrismaInvoice & { certificate: Certificate & { file: File } }) | null;
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

/**
 * Info: (20241024 - Murky)
 * @note counterParty is not parsed in this function
 */
export function parsePrismaInvoiceToInvoiceEntity(dto: PrismaInvoice): IInvoiceEntity {
  const invoiceEntitySchema = z.object({
    id: z.number(),
    certificateId: z.number(),
    counterPartyId: z.number(),
    inputOrOutput: z.nativeEnum(InvoiceTransactionDirection),
    date: z.number(),
    no: z.string(),
    currencyAlias: z.nativeEnum(CurrencyType),
    priceBeforeTax: z.number(),
    taxType: z.nativeEnum(InvoiceTaxType),
    taxRatio: z.number(),
    taxPrice: z.number(),
    totalPrice: z.number(),
    type: z.nativeEnum(InvoiceType),
    deductible: z.boolean(),
    createdAt: z.number(),
    updatedAt: z.number(),
    deletedAt: z.number().nullable(),
    counterParty: z.any().optional(),
  });

  const { data, success, error } = invoiceEntitySchema.safeParse(dto);

  if (!success) {
    throw new FormatterError('parsePrismaInvoiceToInvoiceEntity', {
      dto,
      zodErrorMessage: error.message,
      issues: error.issues,
    });
  }

  return data;
}
