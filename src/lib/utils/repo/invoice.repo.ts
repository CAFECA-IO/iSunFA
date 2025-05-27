import prisma from '@/client';
import { IInvoiceEntity } from '@/interfaces/invoice';
import { getTimestampNow, timestampInSeconds } from '@/lib/utils/common';
import { Prisma, Invoice, Certificate, Counterparty } from '@prisma/client';
import { loggerError } from '@/lib/utils/logger_back';
import { CurrencyType } from '@/constants/currency';
import { InvoiceTransactionDirection, InvoiceTaxType, InvoiceType } from '@/constants/invoice';
import { PostCertificateResponse } from '@/interfaces/certificate';
import { DefaultValue } from '@/constants/default_value';
import { parseCounterPartyFromNoInInvoice } from '@/lib/utils/counterparty';
import { PUBLIC_COUNTER_PARTY } from '@/constants/counterparty';

export async function postInvoiceV2(options: {
  accountBookId: number;
  nowInSecond: number;
  certificateId: number;
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
        // counterParty: {
        //   connect: {
        //     id: PUBLIC_COUNTER_PARTY.id,
        //   },
        // },
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
        // counterParty: true,
        certificate: {
          include: {
            voucherCertificates: {
              include: {
                voucher: true,
              },
            },
            file: true,
            uploader: {
              include: {
                imageFile: true,
              },
            },
          },
        },
      },
    });

    certificate = {
      ...invoiceFromPrisma.certificate,
      invoices: [
        {
          ...invoiceFromPrisma,
          // counterParty: invoiceFromPrisma.counterParty,
        },
      ],
    };
  } catch (_error) {
    const error = _error as Error;
    const errorInfo = {
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'Post Invoice V2 Error',
      errorMessage: error.message,
    };
    loggerError(errorInfo);
  }

  return certificate;
}

export async function putInvoiceV2(options: {
  accountBookId: number;
  nowInSecond: number;
  invoiceId: number;
  certificateId?: number;
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
        // counterParty: true,
        certificate: {
          include: {
            voucherCertificates: {
              include: {
                voucher: true,
              },
            },
            file: true,
            uploader: {
              include: {
                imageFile: true,
              },
            },
          },
        },
      },
    });

    certificate = {
      ...invoiceFromPrisma.certificate,
      invoices: [
        {
          ...invoiceFromPrisma,
          // counterParty: invoiceFromPrisma.counterParty,
        },
      ],
    };
  } catch (_error) {
    const error = _error as Error;
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'Put Invoice V2 Error',
      errorMessage: error,
    });
  }

  return certificate;
}

export async function getInvoiceByIdV2(id: number): Promise<
  | (Invoice & {
      certificate: Certificate;
      counterParty: Counterparty;
    })
  | null
> {
  let invoice:
    | (Invoice & {
        certificate: Certificate;
        counterParty: Counterparty;
      })
    | null = null;

  try {
    const invoiceFromPrisma = await prisma.invoice.findUnique({
      where: {
        id,
        OR: [{ deletedAt: 0 }, { deletedAt: null }],
      },
      include: {
        certificate: true,
        // counterParty: true,
      },
    });

    if (invoiceFromPrisma) {
      const partialInfo = parseCounterPartyFromNoInInvoice(
        invoiceFromPrisma.counterPartyInfo ?? ''
      );
      invoice = {
        ...invoiceFromPrisma,
        counterParty: {
          ...partialInfo,
          ...PUBLIC_COUNTER_PARTY,
          accountBookId: invoiceFromPrisma.certificate.accountBookId,
        },
      };
    }
  } catch (_error) {
    const error = _error as Error;
    const errorInfo = {
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'Get Invoice By Id V2 Error',
      errorMessage: error.message,
    };
    loggerError(errorInfo);
  }

  return invoice;
}

// Info: (20241107 - Jacky) Create a new Invoice
export async function createInvoice(
  certificateId: number,
  counterPartyInfo: string,
  // counterPartyId: number,
  name: string,
  inputOrOutput: string,
  date: number,
  no: string,
  currencyAlias: string,
  priceBeforeTax: number,
  taxType: string,
  taxRatio: number,
  taxPrice: number,
  totalPrice: number,
  type: string,
  deductible: boolean
) {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const newInvoice = await prisma.invoice.create({
    data: {
      certificateId,
      counterPartyInfo,
      // counterPartyId,
      name,
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
      createdAt: nowTimestamp,
      updatedAt: nowTimestamp,
    },
    include: {
      certificate: true,
      // counterParty: true,
    },
  });
  return newInvoice;
}

export async function createManyInvoice(invoicelist: IInvoiceEntity[]) {
  const newInvoices = await prisma.invoice.createMany({
    data: invoicelist,
  });
  return newInvoices;
}

// Info: (20241107 - Jacky) Get an Invoice by ID
export async function getInvoiceById(id: number) {
  let invoice = null;
  if (id > 0) {
    invoice = await prisma.invoice.findUnique({
      where: {
        id,
        OR: [{ deletedAt: 0 }, { deletedAt: null }],
      },
      include: {
        certificate: true,
        // counterParty: true,
      },
    });
  }
  return invoice;
}

// Info: (20241107 - Jacky) Update an Invoice
export async function updateInvoice(
  id: number,
  certificateId: number,
  counterPartyInfo: string,
  // counterPartyId: number,
  name: string,
  inputOrOutput: string,
  date: number,
  no: string,
  currencyAlias: string,
  priceBeforeTax: number,
  taxType: string,
  taxRatio: number,
  taxPrice: number,
  totalPrice: number,
  type: string,
  deductible: boolean
) {
  const nowInSecond = getTimestampNow();
  const updatedInvoice = await prisma.invoice.update({
    where: {
      id,
      deletedAt: null,
    },
    data: {
      certificateId,
      counterPartyInfo,
      // counterPartyId,
      name,
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
      certificate: true,
      // counterParty: true,
    },
  });
  return updatedInvoice;
}

// Info: (20241107 - Jacky) Soft delete an Invoice
export async function deleteInvoice(id: number) {
  const nowInSecond = getTimestampNow();
  const deletedInvoice = await prisma.invoice.update({
    where: {
      id,
      deletedAt: null,
    },
    data: {
      updatedAt: nowInSecond,
      deletedAt: nowInSecond,
    },
    include: {
      certificate: true,
      // counterParty: true,
    },
  });
  return deletedInvoice;
}

// Info: (20241107 - Jacky) Real delete for testing
export async function deleteInvoiceForTesting(id: number): Promise<Invoice> {
  const where: Prisma.InvoiceWhereUniqueInput = {
    id,
  };
  const deletedInvoice = await prisma.invoice.delete({
    where,
  });
  return deletedInvoice;
}
