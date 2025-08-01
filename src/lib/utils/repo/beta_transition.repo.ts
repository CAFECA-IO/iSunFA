import prisma from '@/client';
import { EventType, ProgressStatus } from '@/constants/account';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { InvoiceType } from '@/constants/invoice';
import { JOURNAL_EVENT, SortBy } from '@/constants/journal';
import { SortOrder } from '@/constants/sort';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IInvoice } from '@/interfaces/invoice';
import {
  Prisma,
  InvoiceVoucherJournal,
  Account,
  Journal,
  Invoice,
  Voucher,
  LineItem,
  Ocr,
  Certificate,
  File,
} from '@prisma/client';
import { calculateTotalPages, timestampInSeconds } from '@/lib/utils/common';
import { loggerError } from '@/lib/utils/logger_back';
import { getLatestVoucherNoInPrisma } from '@/lib/utils/repo/voucher.repo';
import { DefaultValue } from '@/constants/default_value';

export async function listInvoiceVoucherJournal(
  accountBookId: number,
  journalEvent?: JOURNAL_EVENT,
  eventType: string | undefined = undefined,
  page: number = 1,
  pageSize: number = DEFAULT_PAGE_LIMIT,
  sortBy: SortBy = SortBy.CREATED_AT,
  sortOrder: SortOrder = SortOrder.DESC,
  startDateInSecond?: number,
  endDateInSecond?: number,
  searchQuery?: string
) {
  try {
    const where: Prisma.InvoiceVoucherJournalWhereInput = {
      voucher: {
        accountBookId,
        type: eventType,
        status: journalEvent,
        date: {
          gte: startDateInSecond,
          lte: endDateInSecond,
        },
      },

      AND: [
        { OR: [{ deletedAt: 0 }, { deletedAt: null }] },
        {
          OR: [
            { vendorOrSupplier: { contains: searchQuery, mode: 'insensitive' } },
            { description: { contains: searchQuery, mode: 'insensitive' } },
            { voucher: { no: { contains: searchQuery, mode: 'insensitive' } } },
          ],
        },
      ],
    };

    const totalCount = await prisma.invoiceVoucherJournal.count({ where });
    const totalPages = calculateTotalPages(totalCount, pageSize);

    if (totalPages > 0 && (page < 1 || page > totalPages)) {
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    }

    const orderBy =
      sortBy === SortBy.PAYMENT_PRICE
        ? { invoice: { totalPrice: sortOrder } }
        : { [sortBy]: sortOrder };

    const include = {
      journal: true,
      invoice: true,
      voucher: { include: { lineItems: { include: { account: true } } } },
    };

    const skip = (page - 1) * pageSize;

    const findManyArgs = {
      where,
      orderBy,
      include,
      take: pageSize + 1,
      skip,
    };

    const journalList = await prisma.invoiceVoucherJournal.findMany(findManyArgs);

    const hasNextPage = journalList.length > pageSize;
    const hasPreviousPage = page > 1;

    if (journalList.length > pageSize) {
      journalList.pop();
    }

    const sort: {
      sortBy: string;
      sortOrder: string;
    }[] = [{ sortBy, sortOrder }];

    const paginatedJournalList = {
      data: journalList,
      page,
      totalPages,
      totalCount,
      pageSize,
      hasNextPage,
      hasPreviousPage,
      sort,
    };

    return paginatedJournalList;
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'listInvoiceVoucherJournal failed',
      errorMessage: error as Error,
    });
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }
}

export async function getInvoiceVoucherJournalByInvoiceId(
  accountBookId: number,
  invoiceId: number
): Promise<
  InvoiceVoucherJournal & {
    journal: Journal | null;
    invoice: (Invoice & { certificate: Certificate & { file: File } }) | null;
    voucher: (Voucher & { lineItems: (LineItem & { account: Account })[] }) | null;
  }
> {
  const where: Prisma.InvoiceVoucherJournalWhereInput = {
    invoiceId,
    voucher: {
      accountBookId,
    },
  };
  const include = {
    journal: true,
    invoice: { include: { certificate: { include: { file: true } } } },
    voucher: { include: { lineItems: { include: { account: true } } } },
  };
  const invoiceVoucherJournal = await prisma.invoiceVoucherJournal.findFirst({ where, include });
  if (!invoiceVoucherJournal) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }
  return invoiceVoucherJournal;
}

export async function getInvoiceVoucherJournalByJournalId(journalId: number): Promise<
  | (InvoiceVoucherJournal & {
      journal: Journal | null;
      invoice: (Invoice & { certificate: Certificate & { file: File } }) | null;
      voucher: (Voucher & { lineItems: (LineItem & { account: Account })[] }) | null;
    })
  | null
> {
  const where: Prisma.InvoiceVoucherJournalWhereInput = {
    journalId,
  };
  const include = {
    journal: true,
    invoice: { include: { certificate: { include: { file: true } } } },
    voucher: { include: { lineItems: { include: { account: true } } } },
  };
  const invoiceVoucherJournal = await prisma.invoiceVoucherJournal.findFirst({
    where,
    include,
  });
  return invoiceVoucherJournal;
}

export async function createInvoice(
  formattedInvoice: IInvoice,
  accountBookId: number,
  imageFileId: number = 555
) {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const file = await prisma.file.findUnique({
    where: {
      id: imageFileId,
    },
  });
  let certificate: Certificate | null;
  certificate = await prisma.certificate.findUnique({
    where: {
      fileId: file?.id,
    },
  });
  if (!certificate) {
    certificate = await prisma.certificate.create({
      data: {
        uploaderId: 555,
        accountBookId,
        fileId: imageFileId,
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
      },
    });
  }
  // Info: (20240916 - Jacky) default invoice type is PURCHASE_TRIPLICATE_AND_ELECTRONIC
  let invoiceType = InvoiceType.PURCHASE_TRIPLICATE_AND_ELECTRONIC;
  // Info: (20240916 - Jacky) if eventType is INCOME, then invoice type is SALES_TRIPLICATE_INVOICE
  if (formattedInvoice.eventType === EventType.INCOME) {
    invoiceType = InvoiceType.SALES_TRIPLICATE_INVOICE;
  }
  const data: Prisma.InvoiceCreateInput = {
    date: formattedInvoice.date,
    inputOrOutput: 'output',
    no: 'no',
    currencyAlias: 'TWD',
    priceBeforeTax:
      formattedInvoice.payment.price -
      formattedInvoice.payment.price * (formattedInvoice.payment.taxPercentage / 100),
    taxType: 'taxable',
    deductible: true,
    taxRatio: formattedInvoice.payment.taxPercentage,
    taxPrice: formattedInvoice.payment.price * (formattedInvoice.payment.taxPercentage / 100),
    totalPrice: formattedInvoice.payment.price,
    type: invoiceType,
    certificate: { connect: { id: certificate.id } },
    createdAt: nowTimestamp,
    updatedAt: nowTimestamp,
  };

  let invoice: Invoice;

  try {
    invoice = await prisma.invoice.create({
      data,
    });
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'Create invoice in createInvoice failed',
      errorMessage: error as Error,
    });
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }

  return invoice;
}

export async function createVoucher(
  voucherNo: string,
  accountBookId: number,
  date: number,
  type: EventType
) {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const data: Prisma.VoucherCreateInput = {
    accountBook: {
      connect: {
        id: accountBookId,
      },
    },
    date,
    issuer: {
      connect: {
        id: 1000, // ToDo: (20241011 - Jacky) need to change to real issuer id
      },
    },
    counterparty: {
      connect: {
        id: 555, // ToDo: (20241011 - Jacky) need to change to real counterparty id
      },
    },
    no: voucherNo,
    status: JOURNAL_EVENT.UPLOADED,
    createdAt: nowTimestamp,
    updatedAt: nowTimestamp,
    type,
  };

  let voucher: Voucher;

  try {
    voucher = await prisma.voucher.create({
      data,
    });
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'Create voucher in createVoucher failed',
      errorMessage: error as Error,
    });
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }

  return voucher;
}

export async function createInvoiceVoucherJournal(
  journalId: number,
  invoiceId: number,
  paymentReason: string,
  description: string,
  vendorOrSupplier: string,
  voucherId?: number
) {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const data: Prisma.InvoiceVoucherJournalCreateInput = {
    journal: {
      connect: {
        id: journalId,
      },
    },
    invoice: {
      connect: {
        id: invoiceId,
      },
    },
    voucher: voucherId
      ? {
          connect: {
            id: voucherId,
          },
        }
      : undefined,
    description,
    vendorOrSupplier,
    paymentReason,
    createdAt: nowTimestamp,
    updatedAt: nowTimestamp,
  };

  let invoiceVoucherJournal: InvoiceVoucherJournal;

  try {
    invoiceVoucherJournal = await prisma.invoiceVoucherJournal.create({
      data,
    });
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'Create invoice voucher journal in createInvoiceVoucherJournal failed',
      errorMessage: error as Error,
    });
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }

  return invoiceVoucherJournal;
}

export async function deleteInvoiceVoucherJournal(journalId: number, accountBookId: number) {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const journal = await prisma.invoiceVoucherJournal.findFirst({
    where: {
      journalId,
      voucher: {
        accountBookId,
      },
    },
  });
  if (!journal) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }
  const deletedInvoiceVoucherJournal = await prisma.invoiceVoucherJournal.update({
    where: {
      id: journal.id,
    },
    data: {
      deletedAt: nowTimestamp,
      invoice: {
        update: {
          deletedAt: nowTimestamp,
        },
      },
      voucher: {
        update: {
          deletedAt: nowTimestamp,
        },
      },
      journal: {
        update: {
          deletedAt: nowTimestamp,
        },
      },
    },
    include: {
      journal: true,
      invoice: { include: { certificate: { include: { file: true } } } },
      voucher: { include: { lineItems: { include: { account: true } } } },
    },
  });
  return deletedInvoiceVoucherJournal;
}

export async function updateInvoice(formattedInvoice: IInvoice) {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const invoiceVoucherJournal = await getInvoiceVoucherJournalByJournalId(
    formattedInvoice.journalId || 0
  );
  if (!invoiceVoucherJournal || !invoiceVoucherJournal.invoice) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }
  // Info: (20240916 - Jacky) default invoice type is PURCHASE_TRIPLICATE_AND_ELECTRONIC
  let invoiceType = InvoiceType.PURCHASE_TRIPLICATE_AND_ELECTRONIC;
  // Info: (20240916 - Jacky) if eventType is INCOME, then invoice type is SALES_TRIPLICATE_INVOICE
  if (formattedInvoice.eventType === EventType.INCOME) {
    invoiceType = InvoiceType.SALES_TRIPLICATE_INVOICE;
  }
  await prisma.invoiceVoucherJournal.update({
    where: {
      id: invoiceVoucherJournal.id,
    },
    data: {
      invoice: {
        update: {
          date: formattedInvoice.date,
          inputOrOutput: 'output',
          no: 'no',
          currencyAlias: 'TWD',
          priceBeforeTax:
            formattedInvoice.payment.price -
            formattedInvoice.payment.price * (formattedInvoice.payment.taxPercentage / 100),
          taxType: 'taxable',
          deductible: true,
          taxRatio: formattedInvoice.payment.taxPercentage,
          taxPrice: formattedInvoice.payment.price * (formattedInvoice.payment.taxPercentage / 100),
          totalPrice: formattedInvoice.payment.price,
          type: invoiceType,
          updatedAt: nowTimestamp,
        },
      },
    },
    include: {
      journal: true,
      invoice: true,
      voucher: { include: { lineItems: { include: { account: true } } } },
    },
  });
  return invoiceVoucherJournal.invoiceId;
}

export async function updateJournal(
  journalId: number,
  aichResultId: string,
  projectId: number,
  contractId: number
) {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const invoiceVoucherJournal = await getInvoiceVoucherJournalByJournalId(journalId || 0);
  const updatedInvoiceVoucherJournal = await prisma.invoiceVoucherJournal.update({
    where: {
      id: invoiceVoucherJournal?.id || 0,
    },
    data: {
      journal: {
        update: {
          aichResultId,
          projectId,
          contractId,
          updatedAt: nowTimestamp,
        },
      },
    },
    include: {
      journal: true,
      invoice: true,
      voucher: { include: { lineItems: { include: { account: true } } } },
    },
  });
  return updatedInvoiceVoucherJournal.journalId;
}

export async function handlePrismaUpdateLogic(formattedInvoice: IInvoice, aichResultId: string) {
  const { journalId, projectId, contractId } = formattedInvoice;
  if (!journalId) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_TYPE);
  }

  let journalIdBeUpdated: number = -1;
  try {
    const journalInDB = await getInvoiceVoucherJournalByJournalId(journalId);

    if (!journalInDB || !journalInDB.invoice) {
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }

    const invoiceIdToBeUpdated = journalInDB.invoice.id;

    if (!invoiceIdToBeUpdated) {
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }

    const invoiceBeUpdated = await updateInvoice(formattedInvoice);

    if (invoiceBeUpdated === -1) {
      throw new Error(STATUS_MESSAGE.DATABASE_UPDATE_FAILED_ERROR);
    }

    journalIdBeUpdated = await updateJournal(
      journalId,
      aichResultId,
      projectId || 0,
      contractId || 0
    );
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'handlePrismaUpdateLogic failed',
      errorMessage: error as Error,
    });
  }

  return journalIdBeUpdated;
}

export async function findUniqueOcrInPrisma(ocrId: number | undefined): Promise<{
  id: number;
  imageFileId: number;
} | null> {
  if (!ocrId) {
    return null;
  }
  let ocrIdInDB: {
    id: number;
    imageFileId: number;
  } | null;

  try {
    ocrIdInDB = await prisma.ocr.findUnique({
      where: {
        id: ocrId,
        OR: [{ deletedAt: 0 }, { deletedAt: null }],
      },
      select: {
        id: true,
        imageFileId: true,
      },
    });
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'find unique ocr in findUniqueOcrInPrisma failed',
      errorMessage: error as Error,
    });
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }
  return ocrIdInDB;
}

export async function updateOcrStatusInPrisma(ocrId: number, status: ProgressStatus) {
  const now = Date.now();
  const updatedAt = timestampInSeconds(now);

  let ocr: Ocr;

  try {
    ocr = await prisma.ocr.update({
      where: {
        id: ocrId,
      },
      data: {
        status,
        updatedAt,
      },
    });
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'update ocr status in updateOcrStatusInPrisma failed',
      errorMessage: error as Error,
    });
    throw new Error(STATUS_MESSAGE.DATABASE_UPDATE_FAILED_ERROR);
  }

  return ocr;
}

export async function createJournalInPrisma(
  projectId: number | null,
  aichResultId: string,
  contractId: number | null,
  accountBookId: number,
  event: JOURNAL_EVENT = JOURNAL_EVENT.UPLOADED
) {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const data: Prisma.JournalCreateInput = {
    accountBook: {
      connect: {
        id: accountBookId,
      },
    },
    aichResultId,
    event,
    createdAt: nowTimestamp,
    updatedAt: nowTimestamp,
  };

  if (projectId !== null) {
    data.project = {
      connect: {
        id: projectId,
      },
    };
  }

  if (contractId !== null) {
    data.contract = {
      connect: {
        id: contractId,
      },
    };
  }

  let journal: {
    id: number;
  };

  try {
    journal = await prisma.journal.create({
      data,
      select: {
        id: true,
      },
    });
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'create journal in createJournalInPrisma failed',
      errorMessage: error as Error,
    });
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }

  return journal.id;
}

export async function handlePrismaSavingLogic(
  formattedInvoice: IInvoice,
  aichResultId: string,
  accountBookId: number,
  ocrId: number | undefined
) {
  try {
    const { projectId, contractId, eventType, paymentReason, description, vendorOrSupplier } =
      formattedInvoice;

    let journalIdBeCreated: number = -1;

    try {
      const ocrIdInDB = await findUniqueOcrInPrisma(ocrId);

      journalIdBeCreated = await createJournalInPrisma(
        projectId,
        aichResultId,
        contractId,
        accountBookId
      );

      const createdInvoice = await createInvoice(
        formattedInvoice,
        accountBookId,
        ocrIdInDB?.imageFileId
      );

      const newVoucherNo = await getLatestVoucherNoInPrisma(accountBookId);

      const createdVoucher = await createVoucher(
        newVoucherNo,
        accountBookId,
        formattedInvoice.date,
        eventType
      );

      if (createdInvoice.certificateId !== 555) {
        await prisma.voucherCertificate.create({
          data: {
            voucher: {
              connect: {
                id: createdVoucher.id,
              },
            },
            certificate: {
              connect: {
                id: createdInvoice.certificateId,
              },
            },
            createdAt: createdInvoice.createdAt,
            updatedAt: createdInvoice.updatedAt,
          },
        });
      }

      await createInvoiceVoucherJournal(
        journalIdBeCreated,
        createdInvoice.id,
        paymentReason,
        description,
        vendorOrSupplier,
        createdVoucher.id
      );

      // Info: (20240524 - Murky) 更新ocr的狀態, 等到其他db操作都沒有錯誤後才更新
      if (ocrIdInDB?.id) {
        await updateOcrStatusInPrisma(ocrIdInDB.id, ProgressStatus.HAS_BEEN_USED);
      }
    } catch (error) {
      loggerError({
        userId: DefaultValue.USER_ID.SYSTEM,
        errorType: 'handlePrismaSavingLogic failed',
        errorMessage: error as Error,
      });
    }

    return journalIdBeCreated;
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'handlePrismaSavingLogic failed',
      errorMessage: error as Error,
    });
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }
}

export async function listInvoiceVoucherJournalFor401(
  accountBookId: number,
  startDateInSecond: number,
  endDateInSecond: number
) {
  const where: Prisma.InvoiceVoucherJournalWhereInput = {
    voucher: {
      accountBookId,
      status: JOURNAL_EVENT.UPLOADED,
      date: {
        gte: startDateInSecond,
        lte: endDateInSecond,
      },
    },
    AND: [
      { OR: [{ deletedAt: 0 }, { deletedAt: null }] },
      // Info: (20241015 - Murky) 401 use lineItem to determine input and output tax
      // { invoice: { date: { gte: startDateInSecond, lte: endDateInSecond } } },
    ],
  };
  const include = {
    journal: true,
    invoice: true,
    voucher: { include: { lineItems: { include: { account: true } } } },
  };
  const journalList = await prisma.invoiceVoucherJournal.findMany({
    where,
    include,
  });
  return journalList;
}
