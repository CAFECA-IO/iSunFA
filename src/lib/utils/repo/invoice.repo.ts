// Info (20240526 - Murky): Prisma

import prisma from '@/client';
import { ProgressStatus } from '@/constants/account';
import { JOURNAL_EVENT } from '@/constants/journal';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IInvoice, IInvoiceBeta, IInvoiceIncludePaymentJournal } from '@/interfaces/invoice';
import { IPayment, IPaymentBeta } from '@/interfaces/payment';
import { timestampInSeconds } from '@/lib/utils/common';
import { Ocr, Prisma } from '@prisma/client';

export async function findUniqueOcrInPrisma(ocrId: number | undefined): Promise<{
  id: number;
  imageUrl: string;
} | null> {
  if (!ocrId) {
    return null;
  }
  let ocrIdInDB: {
    id: number;
    imageUrl: string;
  } | null;

  try {
    ocrIdInDB = await prisma.ocr.findUnique({
      where: {
        id: ocrId,
        OR: [{ deletedAt: 0 }, { deletedAt: null }],
      },
      select: {
        id: true,
        imageUrl: true,
      },
    });
  } catch (error) {
    // Deprecated: (20240605 - Murky) Debugging purpose
    // eslint-disable-next-line no-console
    console.log(error);
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
    // Deprecated: (20240605 - Murky) Debugging purpose
    // eslint-disable-next-line no-console
    console.log(error);
    throw new Error(STATUS_MESSAGE.DATABASE_UPDATE_FAILED_ERROR);
  }

  return ocr;
}

export async function findUniqueCompanyInPrisma(companyId: number) {
  let company: {
    id: number;
  } | null = null;

  try {
    company = await prisma.company.findUnique({
      where: { id: companyId, OR: [{ deletedAt: 0 }, { deletedAt: null }] },
      select: { id: true },
    });
  } catch (error) {
    // Info: (20240526 - Murky) Debugging purpose
    // eslint-disable-next-line no-console
    console.log(error);
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }

  if (!company) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }

  return company;
}

export async function findUniqueJournalInPrisma(journalId: number, companyId?: number) {
  let journal: {
    id: number;
    projectId: number | null;
    invoice: {
      id: number;
    } | null;
  } | null;

  try {
    journal = await prisma.journal.findUnique({
      where: { id: journalId, companyId, OR: [{ deletedAt: 0 }, { deletedAt: null }] },
      select: {
        id: true,
        projectId: true,
        invoice: {
          select: {
            id: true,
          },
        },
      },
    });
  } catch (error) {
    // Deprecated: (20240605 - Murky) Debugging purpose
    // eslint-disable-next-line no-console
    console.log(error);
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }
  return journal;
}

export async function createPaymentInPrisma(paymentData: IPaymentBeta) {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  let payment: {
    id: number;
  };

  try {
    payment = await prisma.payment.create({
      data: {
        ...paymentData,
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
      },
      select: {
        id: true,
      },
    });
  } catch (error) {
    // Deprecated: (20240605 - Murky) Debugging purpose
    // eslint-disable-next-line no-console
    console.log(error);
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }
  return payment;
}

export async function updatePaymentInPrisma(paymentId: number, paymentData: IPayment) {
  const now = Date.now();
  const updatedAt = timestampInSeconds(now);
  const payment = await prisma.payment.update({
    where: {
      id: paymentId,
    },
    data: {
      ...paymentData,
      updatedAt,
    },
    select: {
      id: true,
    },
  });
  return payment;
}

export async function findUniqueInvoiceInPrisma(invoiceId: number, companyId?: number) {
  let invoice: IInvoiceIncludePaymentJournal | null = null;

  const where: Prisma.InvoiceWhereUniqueInput = {
    id: invoiceId,
    journal: {
      companyId,
    },
  };

  const include = {
    payment: true,
    journal: {
      include: {
        project: true,
        contract: true,
      },
    },
  };

  try {
    invoice = await prisma.invoice.findUnique({
      where,
      include,
    });

    if (!invoice) {
      // Deprecated: (20240605 - Murky) Debugging purpose
      // eslint-disable-next-line no-console
      console.log(`Invoice with id ${invoiceId} not found in findUniqueInvoiceInPrisma`);
    }
  } catch (error) {
    // Deprecated: (20240605 - Murky) Debugging purpose
    // eslint-disable-next-line no-console
    console.log(error);
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }
  return invoice;
}

export async function createInvoiceInPrisma(
  invoiceData: IInvoiceBeta,
  paymentId: number,
  journalId: number,
  imageUrl: string | undefined
) {
  let invoice: {
    id: number;
  };

  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const invoiceCreatedDate = timestampInSeconds(invoiceData.date);
  try {
    invoice = await prisma.invoice.create({
      data: {
        number: invoiceData.number,
        type: invoiceData.type,
        date: invoiceCreatedDate,
        eventType: invoiceData.eventType,
        paymentReason: invoiceData.paymentReason,
        description: invoiceData.description,
        vendorTaxId: invoiceData.vendorTaxId,
        vendorOrSupplier: invoiceData.vendorOrSupplier,
        deductible: invoiceData.deductible,
        imageUrl,
        payment: {
          connect: {
            id: paymentId,
          },
        },
        journal: {
          connect: {
            id: journalId,
          },
        },
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
      },
      select: {
        id: true,
      },
    });
  } catch (error) {
    // Deprecated: (20240605 - Murky) Debugging purpose
    // eslint-disable-next-line no-console
    console.log(error);
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }

  return invoice;
}

export async function createInvoiceAndPaymentInPrisma(
  invoiceData: IInvoiceBeta,
  journalId: number,
  imageUrl: string | undefined
) {
  const paymentData = invoiceData.payment;
  // Info (20240807 - Jacky): 這邊是為了讓payment的taxPrice可以被存入prisma
  const taxPrice = paymentData.price * paymentData.taxPercentage;
  const paymentDataBeta = { ...paymentData, taxPrice };

  let createdInvoiceId: number;
  try {
    createdInvoiceId = await prisma.$transaction(async () => {
      const payment = await createPaymentInPrisma(paymentDataBeta);
      const invoice = await createInvoiceInPrisma(invoiceData, payment.id, journalId, imageUrl);
      return invoice.id;
    });
  } catch (error) {
    // Deprecated: (20240522 - Murky) Debugging purpose
    // eslint-disable-next-line no-console
    console.log(error);
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }

  return createdInvoiceId;
}

export async function updateInvoiceInPrisma(
  invoiceId: number,
  paymentId: number,
  invoiceData: IInvoice,
  journalId: number,
  imageUrl: string | undefined
) {
  let invoice: {
    id: number;
  };

  const now = Date.now();
  const updatedAt = timestampInSeconds(now);
  const invoiceCreatedDate = timestampInSeconds(invoiceData.date);

  try {
    invoice = await prisma.invoice.update({
      where: {
        id: invoiceId,
      },
      data: {
        date: invoiceCreatedDate,
        eventType: invoiceData.eventType,
        paymentReason: invoiceData.paymentReason,
        description: invoiceData.description,
        vendorOrSupplier: invoiceData.vendorOrSupplier,
        updatedAt,
        imageUrl,
        payment: {
          connect: {
            id: paymentId,
          },
        },
        journal: {
          connect: {
            id: journalId,
          },
        },
      },
    });
  } catch (error) {
    // Deprecated: (20240605 - Murky) Debugging purpose
    // eslint-disable-next-line no-console
    console.log(error);
    throw new Error(STATUS_MESSAGE.DATABASE_UPDATE_FAILED_ERROR);
  }

  return invoice;
}

export async function updateInvoiceAndPaymentInPrisma(
  invoiceIdToBeUpdated: number,
  invoiceData: IInvoice,
  journalId: number,
  imageUrl?: string
) {
  const paymentData = invoiceData.payment;

  let updatedInvoiceId: number = -1;

  try {
    const invoiceInDB = await findUniqueInvoiceInPrisma(invoiceIdToBeUpdated);

    if (!invoiceInDB) {
      throw new Error(STATUS_MESSAGE.DATABASE_UPDATE_FAILED_ERROR);
    }

    const payment = await updatePaymentInPrisma(invoiceInDB.paymentId, paymentData);
    const invoice = await updateInvoiceInPrisma(
      invoiceIdToBeUpdated,
      payment.id,
      invoiceData,
      journalId,
      imageUrl
    );

    updatedInvoiceId = invoice.id;
  } catch (error) {
    // Deprecated: (20240522 - Murky) Debugging purpose
    // eslint-disable-next-line no-console
    console.log(error);
  }
  return updatedInvoiceId;
}

export async function createJournalInPrisma(
  projectId: number | null,
  aichResultId: string,
  contractId: number | null,
  companyId: number,
  event: JOURNAL_EVENT = JOURNAL_EVENT.UPLOADED
) {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const data: Prisma.JournalCreateInput = {
    company: {
      connect: {
        id: companyId,
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
    // Deprecated: (20240605 - Murky) Debugging purpose
    // eslint-disable-next-line no-console
    console.log(error);
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }

  return journal.id;
}

export async function updateJournalInPrisma(
  journalId: number,
  aichResultId: string,
  projectId: number | null,
  contractId: number | null
) {
  const data: Prisma.JournalUpdateInput = {
    aichResultId,
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
    journal = await prisma.journal.update({
      where: {
        id: journalId,
      },
      data,
      select: {
        id: true,
      },
    });
  } catch (error) {
    // Deprecated: (20240605 - Murky) Debugging purpose
    // eslint-disable-next-line no-console
    console.log(error);
    throw new Error(STATUS_MESSAGE.DATABASE_UPDATE_FAILED_ERROR);
  }

  return journal.id;
}

// Info: (20240524 - Murky) Main logics
export async function handlePrismaSavingLogic(
  formattedInvoice: IInvoiceBeta,
  aichResultId: string,
  companyId: number,
  ocrId: number | undefined
) {
  // ToDo: (20240522 - Murky) 如果AICJ回傳的resultId已經存在於journal，會因為unique key而無法upsert，導致error
  try {
    const { projectId, contractId } = formattedInvoice;

    let journalIdBeCreated: number = -1;

    try {
      const ocrIdInDB = await findUniqueOcrInPrisma(ocrId);

      const company = await findUniqueCompanyInPrisma(companyId);

      journalIdBeCreated = await createJournalInPrisma(
        projectId,
        aichResultId,
        contractId,
        company.id
      );

      await createInvoiceAndPaymentInPrisma(
        formattedInvoice,
        journalIdBeCreated,
        ocrIdInDB?.imageUrl
      );

      // Info: (20240524 - Murky) 更新ocr的狀態, 等到其他db操作都沒有錯誤後才更新
      if (ocrIdInDB?.id) {
        await updateOcrStatusInPrisma(ocrIdInDB.id, ProgressStatus.HAS_BEEN_USED);
      }
    } catch (error) {
      // Deprecated: (20240522 - Murky) Debugging purpose
      // eslint-disable-next-line no-console
      console.log(error);
    }

    return journalIdBeCreated;
  } catch (error) {
    // Deprecated: (20240522 - Murky) Debugging purpose
    // eslint-disable-next-line no-console
    console.log(error);
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }
}

export async function handlePrismaUpdateLogic(
  formattedInvoice: IInvoice,
  aichResultId: string,
  companyId: number
) {
  const { journalId, projectId, contractId } = formattedInvoice;
  if (!journalId) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_TYPE);
  }

  let journalIdBeUpdated: number = -1;
  try {
    const journalInDB = await findUniqueJournalInPrisma(journalId, companyId);

    if (!journalInDB || !journalInDB.invoice) {
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }

    const invoiceIdToBeUpdated = journalInDB.invoice.id;

    if (!invoiceIdToBeUpdated) {
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }

    const invoiceBeUpdated = await updateInvoiceAndPaymentInPrisma(
      invoiceIdToBeUpdated,
      formattedInvoice,
      journalId
    );

    if (invoiceBeUpdated === -1) {
      throw new Error(STATUS_MESSAGE.DATABASE_UPDATE_FAILED_ERROR);
    }

    journalIdBeUpdated = await updateJournalInPrisma(
      journalId,
      aichResultId,
      projectId,
      contractId
    );
  } catch (error) {
    // Deprecated: (20240522 - Murky) Debugging purpose
    // eslint-disable-next-line no-console
    console.log(error);
  }

  return journalIdBeUpdated;
}
