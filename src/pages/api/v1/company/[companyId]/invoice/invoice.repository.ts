// Info (20240526 - Murky): Prisma

import prisma from "@/client";
import { STATUS_MESSAGE } from "@/constants/status_code";
import { IInvoice } from "@/interfaces/invoice";
import { IPayment } from "@/interfaces/payment";
import { timestampInSeconds } from "@/lib/utils/common";
import { Prisma } from "@prisma/client";

export async function findUniqueCompanyInPrisma(companyId: number) {
    let company: {
      id: number;
    } | null = null;

    try {
      company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true },
      });
    } catch (error) {
      // Info: (20240526 - Murky) Debugging purpose
      // eslint-disable-next-line no-console
      console.error(error);
      throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
    }

    if (!company) {
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }

    return company;
  }

export async function findUniqueJournalInPrisma(journalId: number) {
  let journal: {
    id: number;
    ocrId: number | null;
    invoiceId: number | null;
    projectId: number | null;
  } | null = null;

  try {
      journal = await prisma.journal.findUnique({
        where: { id: journalId },
        select: {
          id: true,
          ocrId: true,
          invoiceId: true,
          projectId: true,
        },
      });

      if (!journal) {
        // Depreciate: ( 20240605 - Murky ) Debugging purpose
        // eslint-disable-next-line no-console
        console.log(`Journal with id ${journalId} not found in findUniqueJournalInPrisma`);
        throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
      }
    } catch (error) {
      // Depreciate: ( 20240605 - Murky ) Debugging purpose
      // eslint-disable-next-line no-console
      console.error(error);
      throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }
  return journal;
}

export async function createPaymentInPrisma(paymentData: IPayment) {
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
      // Depreciate: ( 20240605 - Murky ) Debugging purpose
      // eslint-disable-next-line no-console
      console.error(error);
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

export async function findUniqueInvoiceInPrisma(invoiceId: number) {
  let invoice: {
    id: number;
    paymentId: number;
  } | null = null;

  try {
    invoice = await prisma.invoice.findUnique({
      where: {
        id: invoiceId,
      },
      select: {
        id: true,
        paymentId: true,
      },
    });

    if (!invoice) {
      // Depreciate: ( 20240605 - Murky ) Debugging purpose
      // eslint-disable-next-line no-console
      console.log(`Invoice with id ${invoiceId} not found in findUniqueInvoiceInPrisma`);
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }
  } catch (error) {
    // Depreciate: ( 20240605 - Murky ) Debugging purpose
    // eslint-disable-next-line no-console
    console.error(error);
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }
  return invoice;
}

export async function createInvoiceInPrisma(invoiceData: IInvoice, paymentId: number) {
  let invoice: {
    id: number;
  };

  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const invoiceCreatedDate = timestampInSeconds(invoiceData.date);
  try {
    invoice = await prisma.invoice.create({
      data: {
        date: invoiceCreatedDate,
        eventType: invoiceData.eventType,
        paymentReason: invoiceData.paymentReason,
        description: invoiceData.description,
        vendorOrSupplier: invoiceData.vendorOrSupplier,
        payment: {
          connect: {
            id: paymentId,
          },
        },
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
      },
      select: {
        id: true,
      }
    });
  } catch (error) {
    // Depreciate: ( 20240605 - Murky ) Debugging purpose
    // eslint-disable-next-line no-console
    console.error(error);
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }

  return invoice;
}

export async function createInvoiceAndPaymentInPrisma(invoiceData: IInvoice) {
  const paymentData = invoiceData.payment;

  let createdInvoiceId: number;
  try {
    createdInvoiceId = await prisma.$transaction(async () => {
      const payment = await createPaymentInPrisma(paymentData);
      const invoice = await createInvoiceInPrisma(invoiceData, payment.id);
      return invoice.id;
    });
  } catch (error) {
    // Depreciate ( 20240522 - Murky ) Debugging purpose
    // eslint-disable-next-line no-console
    console.error(error);
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }

  return createdInvoiceId;
}

export async function updateInvoiceInPrisma(invoiceId: number, paymentId: number, invoiceData: IInvoice) {
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
        payment: {
          connect: {
            id: paymentId,
          },
        },
      },
    });
  } catch (error) {
    // Depreciate: ( 20240605 - Murky ) Debugging purpose
    // eslint-disable-next-line no-console
    console.error(error);
    throw new Error(STATUS_MESSAGE.DATABASE_UPDATE_FAILED_ERROR);
  }

  return invoice;
}

export async function updateInvoiceAndPaymentInPrisma(
    invoiceIdToBeUpdated: number,
    invoiceData: IInvoice
  ) {
    const paymentData = invoiceData.payment;

    let updatedInvoiceId: number;

    try {
      updatedInvoiceId = await prisma.$transaction(async () => {
        const invoiceInDB = await findUniqueInvoiceInPrisma(invoiceIdToBeUpdated);

        if (!invoiceInDB) {
          throw new Error(STATUS_MESSAGE.DATABASE_UPDATE_FAILED_ERROR);
        }

        const payment = await updatePaymentInPrisma(invoiceInDB.paymentId, paymentData);
        const invoice = await updateInvoiceInPrisma(invoiceIdToBeUpdated, payment.id, invoiceData);

        return invoice.id;
      });
    } catch (error) {
      // Depreciate ( 20240522 - Murky ) Debugging purpose
      // eslint-disable-next-line no-console
      console.error(error);
      throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
    }
    return updatedInvoiceId;
  }

export async function createJournalInPrisma(
    invoiceId: number,
    projectId: number | null,
    aichResultId: string,
    contractId: number | null,
    companyId: number
  ) {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const data: Prisma.JournalCreateInput = {
    company: {
      connect: {
        id: companyId,
      },
    },
    invoice: {
      connect: {
        id: invoiceId,
      },
    },
    aichResultId,
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
    // Depreciate: ( 20240605 - Murky ) Debugging purpose
    // eslint-disable-next-line no-console
    console.error(error);
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }

  return journal.id;
}

export async function updateJournalInPrisma(
    journalId: number,
    invoiceId: number,
    aichResultId: string,
    projectId: number | null,
    contractId: number | null
  ) {
  const data: Prisma.JournalUpdateInput = {
    invoice: {
      connect: {
        id: invoiceId,
      },
    },
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
    // Depreciate: ( 20240605 - Murky ) Debugging purpose
    // eslint-disable-next-line no-console
    console.error(error);
    throw new Error(STATUS_MESSAGE.DATABASE_UPDATE_FAILED_ERROR);
  }

  return journal.id;
}

// Info (20240524 - Murky): Main logics
export async function handlePrismaSavingLogic(
  formattedInvoice: IInvoice,
  aichResultId: string,
  companyId: number
) {
  // ToDo: ( 20240522 - Murky ) 如果AICJ回傳的resultId已經存在於journal，會因為unique key而無法upsert，導致error
  try {
    const result = await prisma.$transaction(async () => {
      // Check if contractId exists if it's not null
      const { journalId, projectId, contractId } = formattedInvoice;

      let journalIdBeCreateOrUpdate: number;

      if (!journalId) {
        // Info Murky (20240416): 如果不存在journalId，則代表是新的invoice，需要新增
        const company = await findUniqueCompanyInPrisma(companyId);
        const invoiceId = await createInvoiceAndPaymentInPrisma(formattedInvoice);
        journalIdBeCreateOrUpdate = await createJournalInPrisma(
          invoiceId,
          projectId,
          aichResultId,
          contractId,
          company.id
        );
      } else {
        const journalInDB = await findUniqueJournalInPrisma(journalId);

        if (!journalInDB) {
          // Depreciate: ( 20240605 - Murky ) Debugging purpose
          // eslint-disable-next-line no-console
          console.log(`Journal with id ${journalId} not found`);
          throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
        }

        let invoiceId: number;

        if (!journalInDB.invoiceId) {
          // Info Murky (20240416): If 沒有invoiceId，代表是新的invoice，需要新增
          invoiceId = await createInvoiceAndPaymentInPrisma(formattedInvoice);
        } else {
          // Info Murky (20240416): If 有invoiceId，是之前傳錯要修改的invoice，需要更新
          invoiceId = await updateInvoiceAndPaymentInPrisma(journalInDB.invoiceId, formattedInvoice);
        }
        journalIdBeCreateOrUpdate = await updateJournalInPrisma(
          journalId,
          invoiceId,
          aichResultId,
          projectId,
          contractId
        );
      }

      return journalIdBeCreateOrUpdate;
    });

    return result;
  } catch (error) {
    // Depreciate ( 20240522 - Murky ) Debugging purpose
    // eslint-disable-next-line no-console
    console.error(error);
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }
}
