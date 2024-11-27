import { CurrencyType } from '@/constants/currency';
import { InvoiceTransactionDirection, InvoiceTaxType, InvoiceType } from '@/constants/invoice';
import { PostCertificateResponse } from '@/interfaces/certificate';
import { loggerError } from '@/lib/utils/logger_back';
import prisma from '@/client';

export async function postInvoiceV2(options: {
  nowInSecond: number;
  certificateId: number;
  counterPartyId: number;
  inputOrOutput: InvoiceTransactionDirection;
  date: number;
  no: string;
  currencyAlias: CurrencyType;
  priceBeforeTax: number;
  taxType: InvoiceTaxType;
  taxRatio: number;
  taxPrice: number;
  totalPrice: number;
  type: InvoiceType;
  deductible: boolean;
}): Promise<PostCertificateResponse | null> {
  const {
    nowInSecond,
    certificateId,
    counterPartyId,
    inputOrOutput,
    date,
    no,
    currencyAlias,
    priceBeforeTax,
    taxType,
    taxRatio,
    taxPrice,
    totalPrice,
    type,
    deductible,
  } = options;

  let certificate: PostCertificateResponse | null = null;

  try {
    const invoiceFromPrisma = await prisma.invoice.create({
      data: {
        certificate: {
          connect: {
            id: certificateId,
          },
        },
        counterParty: {
          connect: {
            id: counterPartyId,
          },
        },
        inputOrOutput,
        date,
        no,
        currencyAlias,
        priceBeforeTax,
        taxType,
        taxRatio,
        taxPrice,
        totalPrice,
        type,
        deductible,
        updatedAt: nowInSecond,
        createdAt: nowInSecond,
      },
      include: {
        counterParty: true,
        certificate: {
          include: {
            voucherCertificates: {
              include: {
                voucher: true,
              },
            },
            file: true,
            UserCertificate: true,
            uploader: true,
          },
        },
      },
    });

    certificate = {
      ...invoiceFromPrisma.certificate,
      invoices: [
        {
          ...invoiceFromPrisma,
          counterParty: invoiceFromPrisma.counterParty,
        },
      ],
    };
  } catch (_error) {
    const error = _error as Error;
    const logger = loggerError(0, 'Put Invoice V2 Error', error);

    logger.error(error.message);
  }

  return certificate;
}

export async function putInvoiceV2(options: {
  nowInSecond: number;
  invoiceId: number;
  certificateId?: number;
  counterPartyId?: number;
  inputOrOutput?: InvoiceTransactionDirection;
  date?: number;
  no?: string;
  currencyAlias?: CurrencyType;
  priceBeforeTax?: number;
  taxType?: InvoiceTaxType;
  taxRatio?: number;
  taxPrice?: number;
  totalPrice?: number;
  type?: InvoiceType;
  deductible?: boolean;
}): Promise<PostCertificateResponse | null> {
  const {
    nowInSecond,
    invoiceId,
    certificateId,
    counterPartyId,
    inputOrOutput,
    date,
    no,
    currencyAlias,
    priceBeforeTax,
    taxType,
    taxRatio,
    taxPrice,
    totalPrice,
    type,
    deductible,
  } = options;

  let certificate: PostCertificateResponse | null = null;

  try {
    const invoiceFromPrisma = await prisma.invoice.update({
      where: {
        id: invoiceId,
      },
      data: {
        certificateId,
        counterPartyId,
        inputOrOutput,
        date,
        no,
        currencyAlias,
        priceBeforeTax,
        taxType,
        taxRatio,
        taxPrice,
        totalPrice,
        type,
        deductible,
        updatedAt: nowInSecond,
      },
      include: {
        counterParty: true,
        certificate: {
          include: {
            voucherCertificates: {
              include: {
                voucher: true,
              },
            },
            file: true,
            UserCertificate: true,
            uploader: true,
          },
        },
      },
    });

    certificate = {
      ...invoiceFromPrisma.certificate,
      invoices: [
        {
          ...invoiceFromPrisma,
          counterParty: invoiceFromPrisma.counterParty,
        },
      ],
    };
  } catch (_error) {
    const error = _error as Error;
    const logger = loggerError(0, 'Put Invoice V2 Error', error);

    logger.error(error.message);
  }

  return certificate;
}
