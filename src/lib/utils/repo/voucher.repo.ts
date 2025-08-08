// ToDo: (20241011 - Jacky) Temporarily comment the following code for the beta transition
import {
  getTimestampNow,
  pageToOffset,
  timestampInMilliSeconds,
  timestampInSeconds,
} from '@/lib/utils/common';
import prisma from '@/client';
import {
  Prisma,
  Voucher as PrismaVoucher,
  AssociateLineItem as PrismaAssociateLineItem,
  LineItem as PrismaLineItem,
  Voucher,
} from '@prisma/client';

import { STATUS_CODE, STATUS_MESSAGE } from '@/constants/status_code';
import type { ILineItem, ILineItemEntity } from '@/interfaces/line_item';
import { PUBLIC_ACCOUNT_BOOK_ID } from '@/interfaces/account_book';
import { CASH_AND_CASH_EQUIVALENTS_CODE } from '@/constants/cash_flow/common_cash_flow';
import {
  IGetManyVoucherResponseButOne,
  IGetOneVoucherResponse,
  IVoucherDataForSavingToDB,
  IVoucherEntity,
  IVoucherFromPrismaIncludeJournalLineItems,
} from '@/interfaces/voucher';
import { SortBy, SortOrder } from '@/constants/sort';
import loggerBack, { loggerError } from '@/lib/utils/logger_back';
import type { IAccountBookWithoutTeamEntity } from '@/interfaces/account_book';
import type { IEventEntity } from '@/interfaces/event';
import { IUserEntity } from '@/interfaces/user';
import { assert } from 'console';
import { EventType } from '@/constants/account';
import { IAccountEntity } from '@/interfaces/accounting_account';
import { IAssociateLineItemEntity } from '@/interfaces/associate_line_item';
import { IAssociateVoucherEntity } from '@/interfaces/associate_voucher';
import { VoucherListTabV2 } from '@/constants/voucher';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { IPaginatedData } from '@/interfaces/pagination';
import { JOURNAL_EVENT } from '@/constants/journal';

import {
  // AccountCodesOfAP,
  AccountCodesOfAPRegex,
  // AccountCodesOfAR,
  AccountCodesOfARRegex,
} from '@/constants/asset';
import { DefaultValue } from '@/constants/default_value';
import { parseNoteData } from '@/lib/utils/parser/note_with_counterparty';
import { toPaginatedData } from '@/lib/utils/formatter/pagination.formatter';

interface DeepNestedLineItem extends PrismaLineItem {
  originalLineItem?: PrismaAssociateLineItem[];
}

export async function findUniqueJournalInvolveInvoicePaymentInPrisma(
  journalId: number | undefined
) {
  try {
    const result = await prisma.journal.findUnique({
      where: {
        id: journalId,
      },
      include: {
        invoiceVoucherJournals: {
          include: {
            invoice: true,
          },
        },
      },
    });

    return result;
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType:
        'find unique journal involve invoice payment in findUniqueJournalInvolveInvoicePaymentInPrisma failed',
      errorMessage: error as Error,
    });
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }
}

export async function findFirstAccountByNameInPrisma(accountName: string) {
  try {
    const result = await prisma.account.findFirst({
      where: {
        name: accountName,
      },
      select: {
        id: true,
      },
    });

    return result?.id || null;
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'find first account by name in findFirstAccountByNameInPrisma failed',
      errorMessage: error as Error,
    });
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }
}

export async function findFirstAccountBelongsToCompanyInPrisma(id: string, accountBookId: number) {
  try {
    const result = await prisma.account.findFirst({
      where: {
        id: Number(id),
        OR: [
          {
            accountBook: {
              id: accountBookId,
            },
          },
          {
            accountBook: {
              id: PUBLIC_ACCOUNT_BOOK_ID,
            },
          },
        ],
      },
    });

    return result;
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType:
        'find first account belongs to company in findFirstAccountBelongsToCompanyInPrisma failed',
      errorMessage: error as Error,
    });
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }
}

export async function findUniqueVoucherInPrisma(voucherId: number) {
  let voucherData: IVoucherFromPrismaIncludeJournalLineItems | null = null;
  try {
    voucherData = await prisma.voucher.findUnique({
      where: {
        id: voucherId,
      },
      include: {
        invoiceVoucherJournals: {
          include: {
            journal: true,
          },
        },
        lineItems: {
          include: {
            account: true,
          },
        },
      },
    });
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'find unique voucher in findUniqueVoucherInPrisma failed',
      errorMessage: error as Error,
    });
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }
  return voucherData;
}

export async function createLineItemInPrisma(
  lineItem: ILineItem,
  voucherId: number,
  accountBookId: number
) {
  try {
    if (!lineItem.accountId) {
      loggerBack.error(
        'lineItem.accountId is not provided in createLineItemInPrisma in voucher.repo.ts'
      );
      throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR);
    }

    const accountBelongsToCompany = await findFirstAccountBelongsToCompanyInPrisma(
      String(lineItem.accountId),
      accountBookId
    );

    if (!accountBelongsToCompany) {
      loggerBack.error(
        'Account does not belong to company in createLineItemInPrisma in voucher.repo.ts'
      );
      throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR);
    }

    const now = Date.now();
    const nowTimestamp = timestampInSeconds(now);
    const result = await prisma.lineItem.create({
      data: {
        amount: lineItem.amount,
        description: lineItem.description,
        debit: lineItem.debit,
        account: {
          connect: {
            id: lineItem.accountId,
          },
        },
        voucher: {
          connect: {
            id: voucherId,
          },
        },
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
      },
      select: {
        id: true,
      },
    });

    return result.id;
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'create line item in createLineItemInPrisma failed',
      errorMessage: error as Error,
    });
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }
}

export async function getLatestVoucherNoInPrisma(
  accountBookId: number,
  {
    voucherDate,
  }: {
    voucherDate?: number;
  } = {}
) {
  try {
    let result: { createdAt: number; no: string } | null = null;
    const baseDate = voucherDate ? new Date(timestampInMilliSeconds(voucherDate)) : new Date();
    const startOfDay = new Date(baseDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(baseDate);
    endOfDay.setHours(23, 59, 59, 999);

    result = await prisma.voucher.findFirst({
      where: {
        accountBookId,
        date: {
          gte: timestampInSeconds(startOfDay.getTime()),
          lte: timestampInSeconds(endOfDay.getTime()),
        },
      },
      orderBy: {
        no: SortOrder.DESC,
      },
      select: {
        no: true,
        createdAt: true,
      },
    });

    // Info: (20241114 - Murky) 格式化日期為 YYYYMMDD
    const formattedDate =
      `${startOfDay.getFullYear()}`.padStart(4, '0') +
      `${startOfDay.getMonth() + 1}`.padStart(2, '0') +
      `${startOfDay.getDate()}`.padStart(2, '0');

    const latestNo = result?.no.slice(-3) || '000'; // Info: (20241114 - Murky) 取最後三位數字作為流水號
    const newVoucherNo = String(Number(latestNo) + 1).padStart(3, '0');

    return `${formattedDate}${newVoucherNo}`;
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'get latest voucher no in getLatestVoucherNoInPrisma failed',
      errorMessage: error as Error,
    });
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }
}

// export async function createVoucherInPrisma(newVoucherNo: string, journalId: number) {
//   try {
//     const now = Date.now();
//     const nowTimestamp = timestampInSeconds(now);
//     const voucherData = await prisma.voucher.create({
//       data: {
//         no: newVoucherNo,
//         journal: {
//           connect: {
//             id: journalId,
//           },
//         },
//         createdAt: nowTimestamp,
//         updatedAt: nowTimestamp,
//       },
//       select: {
//         id: true,
//         lineItems: true,
//       },
//     });

//     return voucherData;
//   } catch (error) {
//     const logError = loggerError(
//       0,
//       'create voucher in createVoucherInPrisma failed',
//       error as Error
//     );
//     logError.error(
//       'Prisma related create voucher in createVoucherInPrisma in voucher.repo.ts failed'
//     );
//     throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
//   }
// }

// Info: (20240710 - Murky) Unefficient need to be refactor
export async function findManyVoucherWithCashInPrisma(
  accountBookId: number,
  startDateInSecond: number,
  endDateInSecond: number
) {
  try {
    const vouchers = await prisma.voucher.findMany({
      where: {
        accountBookId,
        date: {
          gte: startDateInSecond,
          lte: endDateInSecond,
        },
        lineItems: {
          some: {
            OR: CASH_AND_CASH_EQUIVALENTS_CODE.map((cashCode) => ({
              account: {
                code: {
                  startsWith: cashCode,
                },
              },
            })),
          },
        },
      },
      include: {
        lineItems: {
          include: {
            account: true,
          },
        },
      },
    });

    return vouchers;
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'find many voucher with cash in findManyVoucherWithCashInPrisma failed',
      errorMessage: error as Error,
    });
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }
}

// ToDo: (20241011 - Jacky) Temporarily commnet the following code for the beta transition
export async function updateVoucherByJournalIdInPrisma(
  journalId: number,
  accountBookId: number,
  voucherToUpdate: IVoucherDataForSavingToDB
) {
  const nowInSecond = getTimestampNow();

  let newVoucher: {
    id: number;
    createdAt: number;
    updatedAt: number;
    journalId: number;
    no: string;
    lineItems: {
      id: number;
      amount: number;
      description: string;
      debit: boolean;
      accountId: number;
      voucherId: number;
      createdAt: number;
      updatedAt: number;
    }[];
  } | null = null;

  newVoucher = await prisma.$transaction(async (prismaClient) => {
    const journalExists = await prismaClient.journal.findUnique({
      where: {
        id: journalId,
        accountBookId,
      },
      include: {
        invoiceVoucherJournals: {
          include: {
            voucher: {
              include: {
                lineItems: true,
              },
            },
          },
        },
      },
    });
    const voucherExists = journalExists?.invoiceVoucherJournals?.[0]?.voucher;

    // Info: (20240712 - Murky) If journal exists and voucher exists, update the voucher

    if (journalExists && voucherExists && voucherExists.id) {
      if (voucherExists.lineItems) {
        await prismaClient.lineItem.deleteMany({
          where: {
            voucherId: voucherExists.id,
          },
        });
      }

      await Promise.all(
        voucherToUpdate.lineItems.map(async (lineItem) => {
          await prismaClient.lineItem.create({
            data: {
              amount: lineItem.amount,
              description: lineItem.description,
              debit: lineItem.debit,
              account: {
                connect: {
                  id: lineItem.accountId,
                },
              },
              voucher: {
                connect: { id: voucherExists.id },
              },
              createdAt: nowInSecond,
              updatedAt: nowInSecond,
            },
          });
        })
      );
      const voucherBeUpdated = await prismaClient.voucher.update({
        where: {
          id: voucherExists.id,
        },
        data: {
          updatedAt: nowInSecond,
        },
        include: {
          lineItems: true,
        },
      });
      const newVoucherData = {
        ...voucherBeUpdated,
        journalId,
      };

      return newVoucherData;
    }

    return null;
  });

  return newVoucher;
}

export async function countUnpostedVoucher(accountBookId: number) {
  const unpostedVoucherCount = await prisma.certificate.count({
    where: {
      accountBookId,
      NOT: {
        voucherCertificates: {
          some: {},
        },
      },
    },
  });

  return unpostedVoucherCount;
}

export async function postVoucherV2({
  nowInSecond,
  company,
  originalVoucher,
  issuer,
  eventControlPanel: { revertEvent },
  certificateIds,
  invoiceRC2Ids,
}: {
  nowInSecond: number;
  company: IAccountBookWithoutTeamEntity;
  originalVoucher: IVoucherEntity;
  issuer: IUserEntity;
  eventControlPanel: {
    revertEvent: IEventEntity | null;
    recurringEvent: IEventEntity | null;
    assetEvent: IEventEntity | null;
  };
  certificateIds: number[];
  invoiceRC2Ids: number[];
}): Promise<Voucher> {
  const isRevertEvent = !!revertEvent;
  const isAssetEvent = originalVoucher.asset.length > 0;

  const voucherCreated = await prisma.$transaction(async (tx) => {
    const originalVoucherNo = await getLatestVoucherNoInPrisma(company.id, {
      voucherDate: originalVoucher.date,
    });

    if (!originalVoucher.lineItems.length) {
      loggerBack.info('Voucher must contain at least one line item');
      const error = new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR);
      error.name = STATUS_CODE.INTERNAL_SERVICE_ERROR;
      throw error;
    }

    if (originalVoucher.counterPartyId) {
      const exists = await prisma.counterparty.findUnique({
        where: { id: originalVoucher.counterPartyId },
      });
      if (!exists) {
        throw new Error(`⚠️ counterPartyId ${originalVoucher.counterPartyId} 不存在於資料庫中`);
      }
    }

    const voucherData: Prisma.VoucherCreateInput = {
      no: originalVoucherNo,
      date: originalVoucher.date,
      type: originalVoucher.type,
      note: originalVoucher.note,
      status: originalVoucher.status,
      editable: originalVoucher.editable,
      createdAt: nowInSecond,
      updatedAt: nowInSecond,
      accountBook: {
        connect: { id: company.id },
      },
      issuer: {
        connect: { id: issuer.id },
      },
      voucherCertificates:
        certificateIds.length > 0
          ? {
              create: certificateIds.map((certificateId) => ({
                certificate: {
                  connect: { id: certificateId },
                },
                createdAt: nowInSecond,
                updatedAt: nowInSecond,
              })),
            }
          : undefined,
      InvoiceRC2:
        invoiceRC2Ids && invoiceRC2Ids.length > 0
          ? {
              connect: invoiceRC2Ids.map((id) => ({ id })),
            }
          : undefined,
      counterparty: originalVoucher.counterPartyId
        ? { connect: { id: originalVoucher.counterPartyId } }
        : undefined,
      lineItems: {
        create: originalVoucher.lineItems.map((lineItem) => ({
          amount: lineItem.amount,
          description: lineItem.description,
          debit: lineItem.debit,
          account: {
            connect: { id: lineItem.accountId },
          },
          createdAt: nowInSecond,
          updatedAt: nowInSecond,
        })),
      },
    };

    const originalVoucherInDB = await tx.voucher.create({
      data: voucherData,
      include: { lineItems: true },
    });

    if (isAssetEvent) {
      await Promise.all(
        originalVoucher.asset.map((asset) =>
          tx.assetVoucher.create({
            data: {
              asset: { connect: { id: asset.id } },
              voucher: { connect: { id: originalVoucherInDB.id } },
              createdAt: nowInSecond,
              updatedAt: nowInSecond,
            },
          })
        )
      );
    }

    if (isRevertEvent) {
      const { associateVouchers } = revertEvent;
      assert(associateVouchers?.length, 'associateVouchers missing or empty');

      await Promise.all(
        associateVouchers.map(async ({ originalVoucher: original, resultVoucher }) => {
          const originalLineItem = original.lineItems[0];
          const resultLineItem = originalVoucherInDB.lineItems.find((li) => {
            const target = resultVoucher.lineItems[0];
            return (
              li.accountId === target.accountId &&
              li.debit === target.debit &&
              li.amount === target.amount &&
              li.description === target.description
            );
          });

          if (!resultLineItem) {
            loggerBack.error(
              `resultLineItem not found ${JSON.stringify({
                originalVoucherInDBLineItems: originalVoucherInDB.lineItems,
                target: resultVoucher.lineItems[0],
              })}`
            );
            const error = new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR);
            error.name = STATUS_CODE.INTERNAL_SERVICE_ERROR;
            throw error;
          }

          await tx.event.create({
            data: {
              eventType: revertEvent.eventType,
              frequency: revertEvent.frequency,
              startDate: revertEvent.startDate,
              endDate: revertEvent.endDate,
              daysOfWeek: revertEvent.daysOfWeek,
              monthsOfYear: revertEvent.monthsOfYear,
              createdAt: nowInSecond,
              updatedAt: nowInSecond,
              associateVouchers: {
                create: {
                  originalVoucher: {
                    connect: { id: original.id },
                  },
                  resultVoucher: {
                    connect: { id: originalVoucherInDB.id },
                  },
                  createdAt: nowInSecond,
                  updatedAt: nowInSecond,
                  associateLineItems: {
                    create: {
                      originalLineItem: {
                        connect: { id: originalLineItem.id },
                      },
                      resultLineItem: {
                        connect: { id: resultLineItem.id },
                      },
                      createdAt: nowInSecond,
                      updatedAt: nowInSecond,
                      debit: originalLineItem.debit,
                      amount: originalLineItem.amount,
                    },
                  },
                },
              },
            },
          });
        })
      );
    }
    return originalVoucherInDB;
  });
  return voucherCreated;
}

export async function putVoucherWithoutCreateNew(
  voucherId: number,
  options: {
    issuerId: number;
    counterPartyId?: number | null;
    voucherInfo: {
      type: EventType;
      note: string;
      voucherDate: number;
    };
    certificateOptions: {
      certificateIdsNeedToBeRemoved: number[];
      certificateIdsNeedToBeAdded: number[];
    };
    invoiceRC2Options: {
      invoiceRC2IdsNeedToBeRemoved: number[];
      invoiceRC2IdsNeedToBeAdded: number[];
    };
    assetOptions: {
      assetIdsNeedToBeRemoved: number[];
      assetIdsNeedToBeAdded: number[];
    };
    reverseRelationNeedToBeReplace: Map<
      string,
      {
        eventId: number;
        original: {
          eventId: number;
          lineItemIdBeReversed: number;
          lineItemReverseOther: ILineItemEntity;
          amount: number;
          voucherId: number;
        }[];
        new: {
          lineItemIdBeReversed: number;
          lineItemReverseOther: ILineItemEntity;
          amount: number;
          voucherId: number;
        }[];
      }
    >;
  }
) {
  const nowInSecond = getTimestampNow();
  const {
    issuerId,
    counterPartyId,
    voucherInfo,
    certificateOptions,
    invoiceRC2Options,
    assetOptions,
    reverseRelationNeedToBeReplace,
  } = options;

  let voucherUpdated: PrismaVoucher | null = null;
  try {
    voucherUpdated = await prisma.$transaction(async (tx) => {
      const voucher = await tx.voucher.update({
        where: {
          id: voucherId,
        },
        data: {
          issuer: {
            connect: {
              id: issuerId,
            },
          },
          counterparty: counterPartyId ? { connect: { id: counterPartyId } } : undefined,
          type: voucherInfo.type,
          note: voucherInfo.note,
          date: voucherInfo.voucherDate,
          updatedAt: nowInSecond,
        },
      });

      if (certificateOptions.certificateIdsNeedToBeRemoved.length > 0) {
        try {
          await tx.voucherCertificate.deleteMany({
            where: {
              voucherId,
              certificateId: {
                in: certificateOptions.certificateIdsNeedToBeRemoved,
              },
            },
          });
        } catch (error) {
          loggerBack.error(
            `delete voucher certificate by voucher id in putVoucherWithoutCreateNew in voucher.repo.ts failed`
          );
          loggerBack.error(error);
        }
      }

      if (invoiceRC2Options.invoiceRC2IdsNeedToBeRemoved.length > 0) {
        try {
          await tx.invoiceRC2.deleteMany({
            where: {
              id: {
                in: invoiceRC2Options.invoiceRC2IdsNeedToBeRemoved,
              },
              voucherId,
            },
          });
        } catch (error) {
          loggerBack.error(
            'delete invoice RC2 by voucher id in putVoucherWithoutCreateNew in voucher.repo.ts failed'
          );
          loggerBack.error(error);
        }
      }

      if (assetOptions.assetIdsNeedToBeRemoved.length > 0) {
        try {
          await tx.assetVoucher.deleteMany({
            where: {
              voucherId,
              assetId: {
                in: assetOptions.assetIdsNeedToBeRemoved,
              },
            },
          });
        } catch (error) {
          loggerBack.error(
            'delete asset voucher by voucher id in putVoucherWithoutCreateNew in voucher.repo.ts failed'
          );
          loggerBack.error(error);
        }
      }

      if (certificateOptions.certificateIdsNeedToBeAdded.length > 0) {
        try {
          await tx.voucherCertificate.createMany({
            data: certificateOptions.certificateIdsNeedToBeAdded.map((certificateId) => ({
              voucherId,
              certificateId,
              createdAt: nowInSecond,
              updatedAt: nowInSecond,
            })),
          });
        } catch (error) {
          loggerBack.error(
            'create voucher certificate by voucher id in putVoucherWithoutCreateNew in voucher.repo.ts failed'
          );
          loggerBack.error(error);
        }
      }

      if (invoiceRC2Options.invoiceRC2IdsNeedToBeAdded.length > 0) {
        try {
          await tx.invoiceRC2.updateMany({
            where: {
              id: {
                in: invoiceRC2Options.invoiceRC2IdsNeedToBeAdded,
              },
            },
            data: {
              voucherId,
              updatedAt: nowInSecond,
            },
          });
        } catch (error) {
          loggerBack.error('update invoiceRC2.voucherId in putVoucherWithoutCreateNew failed');
          loggerBack.error(error);
        }
      }

      if (assetOptions.assetIdsNeedToBeAdded.length > 0) {
        try {
          await tx.assetVoucher.createMany({
            data: assetOptions.assetIdsNeedToBeAdded.map((assetId) => ({
              voucherId,
              assetId,
              createdAt: nowInSecond,
              updatedAt: nowInSecond,
            })),
          });
        } catch (error) {
          loggerBack.error(
            'create asset voucher by voucher id in putVoucherWithoutCreateNew in voucher.repo.ts failed'
          );
          loggerBack.error(error);
        }
      }

      const reverseRelationList = reverseRelationNeedToBeReplace.values();

      const reverseJobs: Promise<Prisma.BatchPayload | unknown>[] = [];
      Array.from(reverseRelationList).forEach((reverseRelation) => {
        const { eventId, original, new: newRelations } = reverseRelation;
        const deleteAssociateLineItemJob = tx.associateLineItem.deleteMany({
          where: {
            OR: original.map((originalRelation) => ({
              originalLineItemId: originalRelation.lineItemIdBeReversed,
              resultLineItemId: originalRelation.lineItemReverseOther.id,
            })),
          },
        });

        const deleteAssociateVoucherJob = tx.associateVoucher.deleteMany({
          where: {
            OR: original.map((originalRelation) => ({
              originalVoucherId: originalRelation.voucherId,
              resultVoucherId: voucherId,
            })),
          },
        });

        reverseJobs.push(deleteAssociateLineItemJob, deleteAssociateVoucherJob);

        newRelations.forEach(async (newRelation) => {
          const createAssociateVoucherJob = tx.associateVoucher.create({
            data: {
              originalVoucher: {
                connect: {
                  id: newRelation.voucherId,
                },
              },
              resultVoucher: {
                connect: {
                  id: voucherId,
                },
              },
              event: {
                connect: {
                  id: eventId,
                },
              },
              createdAt: nowInSecond,
              updatedAt: nowInSecond,
              associateLineItems: {
                create: {
                  originalLineItem: {
                    connect: {
                      id: newRelation.lineItemIdBeReversed,
                    },
                  },
                  resultLineItem: {
                    connect: {
                      id: newRelation.lineItemReverseOther.id,
                    },
                  },
                  debit: newRelation.lineItemReverseOther.debit,
                  amount: newRelation.amount,
                  createdAt: nowInSecond,
                  updatedAt: nowInSecond,
                },
              },
            },
          });

          reverseJobs.push(createAssociateVoucherJob);
        });
      });
      await Promise.all(reverseJobs);

      return voucher;
    });
  } catch (error) {
    loggerBack.error(
      'update voucher by voucher id in putVoucherWithoutCreateNew in voucher.repo.ts failed'
    );
    loggerBack.error(error);
  }
  return voucherUpdated;
}

export async function getOneVoucherByIdWithoutInclude(voucherId: number) {
  try {
    const voucher = await prisma.voucher.findUnique({
      where: {
        id: voucherId,
      },
    });

    return voucher;
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'get one voucher by id without include in getOneVoucherByIdWithoutInclude failed',
      errorMessage: error as Error,
    });
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }
}

export async function getOneVoucherV2(voucherId: number): Promise<IGetOneVoucherResponse | null> {
  let voucher: IGetOneVoucherResponse | null = null;
  try {
    voucher = await prisma.voucher.findUnique({
      where: {
        id: voucherId,
      },
      include: {
        issuer: true,
        voucherCertificates: {
          // Info: (20241227 - Murky) 如果被刪除的certificate不要拿出來
          where: {
            OR: [
              {
                deletedAt: null,
              },
              {
                deletedAt: 0,
              },
            ],
          },
          include: {
            certificate: {
              include: {
                invoices: true,
                file: true,
              },
            },
          },
        },
        InvoiceRC2: {
          include: {
            file: {
              include: {
                thumbnail: true,
              },
            },
            voucher: true,
            uploader: true,
          },
        },
        counterparty: true,
        originalVouchers: {
          include: {
            event: true,
            resultVoucher: {
              include: {
                lineItems: {
                  include: {
                    account: true,
                  },
                },
              },
            },
          },
        },
        resultVouchers: {
          include: {
            event: true,
            originalVoucher: {
              include: {
                lineItems: {
                  include: {
                    account: true,
                  },
                },
              },
            },
          },
        },
        assetVouchers: {
          include: {
            asset: true,
          },
        },
        lineItems: {
          include: {
            account: true,
            originalLineItem: {
              // Info: (20241114 - Murky) 指的是這個lineItem是 original
              include: {
                resultLineItem: {
                  include: {
                    account: true,
                  },
                },
                associateVoucher: {
                  include: {
                    event: true,
                  },
                },
              },
            },
            resultLineItem: {
              // Info: (20241114 - Murky) 指的是這個lineItem是 result
              include: {
                originalLineItem: {
                  include: {
                    account: true,
                  },
                },
                associateVoucher: {
                  include: {
                    event: true,
                    originalVoucher: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'get accounting setting in getAccountingSetting failed',
      errorMessage: (error as Error).message,
    });
  }
  return voucher;
}

export async function getOneVoucherByVoucherNoV2(options: {
  voucherNo: string;
  accountBookId: number;
}): Promise<IGetOneVoucherResponse | null> {
  let voucher: IGetOneVoucherResponse | null = null;
  const { voucherNo, accountBookId } = options;
  try {
    voucher = await prisma.voucher.findFirst({
      where: {
        no: voucherNo,
        accountBookId,
      },
      include: {
        issuer: true,
        voucherCertificates: {
          // Info: (20241227 - Murky) 如果被刪除的certificate不要拿出來
          where: {
            OR: [
              {
                deletedAt: null,
              },
              {
                deletedAt: 0,
              },
            ],
          },
          include: {
            certificate: {
              include: {
                invoices: true,
                file: true,
              },
            },
          },
        },
        InvoiceRC2: {
          include: {
            file: {
              include: {
                thumbnail: true,
              },
            },
            voucher: true,
            uploader: true,
          },
        },
        counterparty: true,
        originalVouchers: {
          include: {
            event: true,
            resultVoucher: {
              include: {
                lineItems: {
                  include: {
                    account: true,
                  },
                },
              },
            },
          },
        },
        resultVouchers: {
          include: {
            event: true,
            originalVoucher: {
              include: {
                lineItems: {
                  include: {
                    account: true,
                  },
                },
              },
            },
          },
        },
        assetVouchers: {
          include: {
            asset: true,
          },
        },
        lineItems: {
          include: {
            account: true,
            originalLineItem: {
              // Info: (20241114 - Murky) 指的是這個lineItem是 original
              include: {
                resultLineItem: {
                  include: {
                    account: true,
                  },
                },
                associateVoucher: {
                  include: {
                    event: true,
                  },
                },
              },
            },
            resultLineItem: {
              // Info: (20241114 - Murky) 指的是這個lineItem是 result
              include: {
                originalLineItem: {
                  include: {
                    account: true,
                  },
                },
                associateVoucher: {
                  include: {
                    event: true,
                    originalVoucher: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'get accounting setting in getAccountingSetting failed',
      errorMessage: (error as Error).message,
    });
  }
  return voucher;
}

export function isFullyReversed(lineItem: DeepNestedLineItem): boolean {
  const reversedPairs = lineItem.originalLineItem ?? [];

  const totalReversedAmount = reversedPairs.reduce((sum, pair) => {
    return sum + pair.amount;
  }, 0);

  return totalReversedAmount >= lineItem.amount;
}

export function filterAvailableLineItems<T extends DeepNestedLineItem>(lineItems: T[]): T[] {
  return lineItems.filter((li) => !isFullyReversed(li));
}

/**
 * Info: (20250203 - Shirley) 建立排序條件列表
 * 根據傳入的排序選項建立對應的排序條件
 * 目前只處理日期排序，其他排序（Credit、Debit等）在程式碼中處理
 */
function createOrderByList(sortOptions: { sortBy: SortBy; sortOrder: SortOrder }[]) {
  const orderBy: { [key: string]: SortOrder }[] = [];
  sortOptions.forEach((sort) => {
    const { sortBy, sortOrder } = sort;
    switch (sortBy) {
      case SortBy.DATE:
        orderBy.push({
          date: sortOrder,
        });
        break;
      // Info: (20241120 - Murky) Credit和Debit等拿出去之後用程式碼排
      case SortBy.PERIOD:
      case SortBy.CREDIT:
      case SortBy.DEBIT:
      case SortBy.PAY_RECEIVE_TOTAL:
      case SortBy.PAY_RECEIVE_ALREADY_HAPPENED:
      case SortBy.PAY_RECEIVE_REMAIN:
      default:
        break;
    }
  });
  return orderBy;
}

export async function getManyVoucherV2(options: {
  accountBookId: number;
  startDate: number;
  endDate: number;
  page: number;
  pageSize: number;
  tab: VoucherListTabV2;
  sortOption: {
    sortBy: SortBy;
    sortOrder: SortOrder;
  }[];
  type?: EventType | undefined;
  searchQuery?: string | undefined;
  isDeleted?: boolean | undefined;
  hideReversedRelated?: boolean | undefined;
}): Promise<
  IPaginatedData<IGetManyVoucherResponseButOne[]> & {
    where: Prisma.VoucherWhereInput;
  }
> {
  const {
    accountBookId,
    startDate,
    endDate,
    page,
    pageSize,
    tab,
    sortOption,
    type,
    searchQuery,
    isDeleted,
    hideReversedRelated,
  } = options;
  // const { page, pageSize, sortOption, isDeleted } = options;
  let vouchers: IGetManyVoucherResponseButOne[] = [];

  function getStatusFilter(voucherListTab: VoucherListTabV2) {
    switch (voucherListTab) {
      case VoucherListTabV2.UPLOADED:
      case VoucherListTabV2.PAYMENT:
      case VoucherListTabV2.RECEIVING:
        return JOURNAL_EVENT.UPLOADED;
      case VoucherListTabV2.UPCOMING:
        return JOURNAL_EVENT.UPCOMING;

      default:
        return undefined;
    }
  }
  // Info: (20241121 - Murky) payable 和 receivable 如果要再搜尋中處理的話要用rowQuery, 所以這邊先用filter的
  /**
   * Info: (20250203 - Shirley) 建立查詢條件
   * 1. 基本條件：日期範圍、公司ID、傳票狀態、傳票類型、刪除狀態
   * 2. 反轉相關過濾：如果 hideReversedRelated 為 true，過濾掉與 delete event 相關的傳票
   * 3. 搜尋條件：使用 OR 組合多個欄位的模糊搜尋
   *    - 開立人名稱
   *    - 交易對象名稱或統一編號
   *    - 傳票備註
   *    - 傳票號碼
   *    - 會計科目名稱
   */
  const where: Prisma.VoucherWhereInput = {
    date: {
      gte: startDate,
      lte: endDate,
    },
    accountBookId,
    status: getStatusFilter(tab),
    type: type || undefined,
    deletedAt: isDeleted ? { not: null } : isDeleted === false ? null : undefined,
    AND: [
      // 1. Info: (20250203 - Shirley) 如果 `hideReversedRelated = true`，則過濾掉與 `delete` 事件相關的傳票
      ...(hideReversedRelated
        ? [
            {
              originalVouchers: {
                none: {
                  event: {
                    eventType: 'delete',
                  },
                },
              },
            },
            {
              resultVouchers: {
                none: {
                  event: {
                    eventType: 'delete',
                  },
                },
              },
            },
          ]
        : []),
      // 2. Info: (20250212 - Tzuhan) 如果 `tab = PAYMENT` 或 `tab = RECEIVING`，則過濾掉 `revert` 沖銷傳票
      ...(tab === VoucherListTabV2.PAYMENT || tab === VoucherListTabV2.RECEIVING
        ? [
            {
              resultVouchers: {
                none: {
                  event: {
                    eventType: 'revert',
                  },
                },
              },
            },
            {
              originalVouchers: {
                none: {
                  event: {
                    eventType: 'revert',
                  },
                },
              },
            },
          ]
        : []),
    ],
    OR: [
      {
        issuer: {
          name: {
            contains: searchQuery,
          },
        },
      },
      {
        counterparty: {
          OR: [
            {
              name: {
                contains: searchQuery,
              },
            },
            {
              taxId: {
                contains: searchQuery,
              },
            },
          ],
        },
      },
      {
        note: {
          contains: searchQuery,
        },
      },
      {
        no: {
          contains: searchQuery,
        },
      },
      {
        lineItems: {
          some: {
            OR: [
              {
                account: {
                  name: {
                    contains: searchQuery,
                  },
                },
              },
            ],
          },
        },
      },
    ],
  };

  let totalCount = 0;

  /**
   * Info: (20250203 - Shirley) 第一次查詢：計算總筆數
   * 使用相同的 where 條件計算符合條件的總筆數
   * 用於計算總頁數和分頁資訊
   */
  try {
    totalCount = await prisma.voucher.count({ where });
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'Count total count of voucher in getManyVoucherV2 failed',
      errorMessage: error as Error,
    });
  }

  const totalPages = Math.ceil(totalCount / pageSize);
  const offset = pageToOffset(page, pageSize);

  /**
   * Info: (20250203 - Shirley) 建立分頁查詢參數
   * 1. skip: 跳過前面幾筆
   * 2. take: 多取一筆用於判斷是否還有下一頁
   * 3. orderBy: 排序條件
   * 4. where: 上面建立的查詢條件
   */
  const findManyArgs = {
    skip: offset,
    take: pageSize + 1,
    orderBy: createOrderByList(sortOption),
    where,
  };

  /**
   * Info: (20250203 - Shirley) 第二次查詢：取得分頁資料
   * 1. 使用 findManyArgs 進行分頁查詢
   * 2. include 完整的關聯資料（lineItems, account, counterparty 等）
   * 3. 根據分頁類型（tab）進行額外的資料過濾：
   *    - PAYMENT: 只包含應付帳款相關的傳票
   *    - RECEIVING: 只包含應收帳款相關的傳票
   */
  try {
    const vouchersFromPrisma = await prisma.voucher.findMany({
      ...findManyArgs,
      include: {
        lineItems: {
          include: {
            account: true,
            originalLineItem: {
              // Info: (20241114 - Murky) 指的是這個lineItem是 original
              include: {
                resultLineItem: {
                  include: {
                    account: true,
                  },
                },
                associateVoucher: {
                  include: {
                    event: true,
                  },
                },
              },
            },
            resultLineItem: {
              // Info: (20241114 - Murky) 指的是這個lineItem是 result
              include: {
                originalLineItem: {
                  include: {
                    account: true,
                    originalLineItem: {
                      // Info: (20241114 - Murky) 指的是這個lineItem是 original
                      include: {
                        resultLineItem: {
                          include: {
                            account: true,
                          },
                        },
                        associateVoucher: {
                          include: {
                            event: true,
                          },
                        },
                      },
                    },
                  },
                },
                associateVoucher: {
                  include: {
                    event: true,
                    originalVoucher: true,
                  },
                },
              },
            },
          },
        },
        counterparty: true,
        issuer: {
          include: {
            imageFile: true,
          },
        },
        originalVouchers: {
          include: {
            event: true,
            resultVoucher: {
              include: {
                lineItems: {
                  include: {
                    account: true,
                  },
                },
              },
            },
          },
        },
        resultVouchers: {
          include: {
            event: true,
            originalVoucher: {
              include: {
                lineItems: {
                  include: {
                    account: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    switch (tab) {
      case VoucherListTabV2.PAYMENT:
        vouchers = vouchersFromPrisma.filter((voucher) =>
          voucher.lineItems.some((lineItem) => AccountCodesOfAPRegex.test(lineItem.account.code))
        );
        break;
      case VoucherListTabV2.RECEIVING:
        vouchers = vouchersFromPrisma.filter((voucher) =>
          voucher.lineItems.some((lineItem) => AccountCodesOfARRegex.test(lineItem.account.code))
        );
        break;
      default:
        vouchers = vouchersFromPrisma;
        break;
    }
    vouchers = vouchers.map((voucher) => {
      const noteData = parseNoteData(voucher.note ?? '');

      return {
        ...voucher,
        lineItems: filterAvailableLineItems(voucher.lineItems),
        note: noteData.note ?? voucher.note ?? '',
        counterparty: voucher.counterparty
          ? {
              ...voucher.counterparty,
              taxId: voucher.counterparty.taxId ?? '',
            }
          : null,
      };
    });
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'Find many vouchers failed in getManyVoucherV2',
      errorMessage: error as Error,
    });
  }

  /**
   * Info: (20250203 - Shirley) 處理分頁資訊
   * 1. hasNextPage: 如果取得的資料比要求的多，表示還有下一頁
   * 2. hasPreviousPage: 如果目前頁數大於 1，表示有上一頁
   * 3. 如果有下一頁，移除多取的那一筆資料
   */
  const hasNextPage = vouchers.length > pageSize;
  const hasPreviousPage = page > DEFAULT_PAGE_NUMBER;

  if (hasNextPage) {
    vouchers.pop();
  }

  const returnValue = {
    data: vouchers,
    page,
    pageSize,
    totalPages,
    totalCount,
    hasNextPage,
    hasPreviousPage,
    sort: sortOption,
    where,
  };
  return returnValue;
}

export async function getManyVoucherByAccountV2(options: {
  accountBookId: number;
  accountId: number;
  startDate: number;
  endDate: number;
  page: number;
  pageSize: number;
  sortOption: {
    sortBy: SortBy;
    sortOrder: SortOrder;
  }[];
  searchQuery?: string | undefined;
  isDeleted?: boolean | undefined;
}): Promise<IPaginatedData<IGetManyVoucherResponseButOne[]>> {
  const {
    accountBookId,
    accountId,
    startDate,
    endDate,
    page,
    pageSize,
    sortOption,
    searchQuery,
    isDeleted,
  } = options;
  // const { page, pageSize, sortOption, isDeleted } = options;
  let vouchers: IGetManyVoucherResponseButOne[] = [];

  // Info: (20241121 - Murky) payable 和 receivable 如果要再搜尋中處理的話要用rowQuery, 所以這邊先用filter的
  const where: Prisma.VoucherWhereInput = {
    date: {
      gte: startDate,
      lte: endDate,
    },
    accountBookId,
    status: JOURNAL_EVENT.UPLOADED,
    deletedAt: isDeleted ? { not: null } : isDeleted === false ? null : undefined,
    lineItems: {
      some: {
        OR: [
          {
            account: {
              id: accountId,
            },
          },
          {
            account: {
              parentId: accountId,
            },
          },
        ],
      },
    },
    OR: [
      {
        issuer: {
          name: {
            contains: searchQuery,
          },
        },
      },
      {
        counterparty: {
          OR: [
            {
              name: {
                contains: searchQuery,
              },
            },
            {
              taxId: {
                contains: searchQuery,
              },
            },
          ],
        },
      },
      {
        note: {
          contains: searchQuery,
        },
      },
      {
        no: {
          contains: searchQuery,
        },
      },
      {
        lineItems: {
          some: {
            OR: [
              // Info: (20241121 - Murky) 如果有需要搜尋再打開
              // {
              //   description: {
              //     contains: searchQuery,
              //   },
              // },
              {
                account: {
                  name: {
                    contains: searchQuery,
                  },
                },
              },
            ],
          },
        },
      },
    ],
  };

  let totalCount = 0;

  try {
    totalCount = await prisma.voucher.count({ where });
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'Count total count of voucher in getManyVoucherV2 failed',
      errorMessage: error as Error,
    });
  }

  const totalPages = Math.ceil(totalCount / pageSize);

  const offset = pageToOffset(page, pageSize);
  // const orderBy = { [sortBy]: sortOrder };

  const findManyArgs = {
    skip: offset,
    take: pageSize + 1,
    orderBy: createOrderByList(sortOption),
    where,
  };

  try {
    vouchers = await prisma.voucher.findMany({
      ...findManyArgs,
      include: {
        lineItems: {
          include: {
            account: true,
            originalLineItem: {
              // Info: (20241114 - Murky) 指的是這個lineItem是 original
              include: {
                resultLineItem: {
                  include: {
                    account: true,
                  },
                },
                associateVoucher: {
                  include: {
                    event: true,
                  },
                },
              },
            },
            resultLineItem: {
              // Info: (20241114 - Murky) 指的是這個lineItem是 result
              include: {
                originalLineItem: {
                  include: {
                    account: true,
                    originalLineItem: {
                      // Info: (20241114 - Murky) 指的是這個lineItem是 original
                      include: {
                        resultLineItem: {
                          include: {
                            account: true,
                          },
                        },
                        associateVoucher: {
                          include: {
                            event: true,
                          },
                        },
                      },
                    },
                  },
                },
                associateVoucher: {
                  include: {
                    event: true,
                    originalVoucher: true,
                  },
                },
              },
            },
          },
        },
        counterparty: true,
        issuer: {
          include: {
            imageFile: true,
          },
        },
        originalVouchers: {
          include: {
            event: true,
            resultVoucher: {
              include: {
                lineItems: {
                  include: {
                    account: true,
                  },
                },
              },
            },
          },
        },
        resultVouchers: {
          include: {
            event: true,
            originalVoucher: {
              include: {
                lineItems: {
                  include: {
                    account: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'Find many accounts in findManyAccountsInPrisma failed',
      errorMessage: error as Error,
    });
  }

  const hasNextPage = vouchers.length > pageSize;
  const hasPreviousPage = page > DEFAULT_PAGE_NUMBER; // 1;

  if (hasNextPage) {
    vouchers.pop();
  }

  const returnValue = {
    data: vouchers,
    page,
    pageSize,
    totalPages,
    totalCount,
    hasNextPage,
    hasPreviousPage,
    sort: sortOption,
    where,
  };

  return returnValue;
}

export async function getOneVoucherWithLineItemAndAccountV2(voucherId: number) {
  try {
    const voucher = await prisma.voucher.findUnique({
      where: {
        id: voucherId,
      },
      include: {
        lineItems: {
          include: {
            account: true,
          },
        },
      },
    });

    return voucher;
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType:
        'get one voucher with line item and account in getOneVoucherWithLineItemAndAccountV2 failed',
      errorMessage: error as Error,
    });
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }
}

/**
 * Info: (20241119 - Murky)
 * @todo 之後需要把create的邏輯拆分開來
 */
export async function deleteVoucherByCreateReverseVoucher(options: {
  nowInSecond: number;
  accountBookId: number;
  issuerId: number;
  voucherDeleteOtherEntity: IVoucherEntity;
  deleteVersionOriginVoucher: IVoucherEntity;
  deleteEvent: IEventEntity;
  deleteVersionReverseLineItemPairs: {
    originLineItem: ILineItemEntity & {
      account: IAccountEntity;
      resultLineItems: (IAssociateLineItemEntity & {
        associateVoucher: IAssociateVoucherEntity & {
          event: IEventEntity;
        };
        originalLineItem: ILineItemEntity & {
          account: IAccountEntity;
        };
      })[];
    };
    newDeleteReverseLineItem: ILineItemEntity & {
      account: IAccountEntity;
      resultLineItems: (IAssociateLineItemEntity & {
        associateVoucher: IAssociateVoucherEntity & {
          event: IEventEntity;
        };
        originalLineItem: ILineItemEntity & {
          account: IAccountEntity;
        };
      })[];
    };
  }[];
}) {
  const {
    nowInSecond,
    accountBookId,
    issuerId,
    voucherDeleteOtherEntity,
    deleteVersionOriginVoucher,
    deleteEvent,
    deleteVersionReverseLineItemPairs,
  } = options;

  const result = await prisma.$transaction(async (tx) => {
    const assetIds = voucherDeleteOtherEntity.asset?.map((a) => a.id) || [];

    // Info: (20250213 - Shirley) 刪除 asset
    if (assetIds.length > 0) {
      // Info: (20250213 - Shirley) 更新 asset_voucher 的 deleted_at
      await tx.assetVoucher.updateMany({
        where: {
          voucherId: deleteVersionOriginVoucher.id,
          deletedAt: null,
        },
        data: { deletedAt: nowInSecond },
      });

      // Info: (20250213 - Shirley) 更新 asset 的 deleted_at
      await tx.asset.updateMany({
        where: {
          id: {
            in: assetIds,
          },
          deletedAt: null,
        },
        data: { deletedAt: nowInSecond },
      });
    }

    // Info: (20250213 - Shirley) 更新 voucher_certificate 的 deletedAt
    const certificateIds = voucherDeleteOtherEntity.certificates?.map((c) => c.id) || [];
    if (certificateIds.length > 0) {
      await tx.voucherCertificate.updateMany({
        where: {
          voucherId: deleteVersionOriginVoucher.id,
          deletedAt: null,
        },
        data: { deletedAt: nowInSecond },
      });
    }

    const newVoucherNo = await getLatestVoucherNoInPrisma(accountBookId, {
      voucherDate: voucherDeleteOtherEntity.date,
    });

    await tx.voucher.update({
      where: {
        id: deleteVersionOriginVoucher.id,
      },
      data: {
        deletedAt: nowInSecond,
        voucherCertificates: {
          updateMany: {
            where: {
              voucherId: deleteVersionOriginVoucher.id,
            },
            data: {
              deletedAt: nowInSecond,
            },
          },
        },
      },
    });

    const newVoucher = await tx.voucher.create({
      data: {
        no: newVoucherNo,
        date: voucherDeleteOtherEntity.date,
        type: voucherDeleteOtherEntity.type,
        note: voucherDeleteOtherEntity.note,
        status: voucherDeleteOtherEntity.status,
        editable: voucherDeleteOtherEntity.editable,
        createdAt: nowInSecond,
        updatedAt: nowInSecond,
        deletedAt: null,
        accountBook: {
          connect: {
            id: accountBookId,
          },
        },
        issuer: {
          connect: {
            id: issuerId,
          },
        },
        counterparty: voucherDeleteOtherEntity.counterPartyId
          ? { connect: { id: voucherDeleteOtherEntity.counterPartyId } }
          : undefined,
        lineItems: {
          create: voucherDeleteOtherEntity.lineItems.map((lineItem) => ({
            amount: lineItem.amount,
            description: lineItem.description,
            debit: lineItem.debit,
            account: {
              connect: {
                id: lineItem.accountId,
              },
            },
            createdAt: nowInSecond,
            updatedAt: nowInSecond,
          })),
        },
        assetVouchers: {
          create: voucherDeleteOtherEntity.asset.map((asset) => ({
            asset: {
              connect: {
                id: asset.id,
              },
            },
            createdAt: nowInSecond,
            updatedAt: nowInSecond,
          })),
        },
      },
      include: {
        lineItems: true,
      },
    });

    const newDeletedEvent = await tx.event.create({
      data: {
        eventType: deleteEvent.eventType,
        frequency: deleteEvent.frequency,
        startDate: deleteEvent.startDate,
        endDate: deleteEvent.endDate,
        daysOfWeek: deleteEvent.daysOfWeek,
        monthsOfYear: deleteEvent.monthsOfYear,
        createdAt: nowInSecond,
        updatedAt: nowInSecond,
        associateVouchers: {
          create: {
            originalVoucher: {
              connect: {
                id: deleteVersionOriginVoucher.id,
              },
            },
            resultVoucher: {
              connect: {
                id: newVoucher.id,
              },
            },
            createdAt: nowInSecond,
            updatedAt: nowInSecond,
            associateLineItems: {
              create: deleteVersionReverseLineItemPairs.map((lineItemPair, key) => ({
                originalLineItem: {
                  connect: {
                    id: lineItemPair.originLineItem.id,
                  },
                },
                resultLineItem: {
                  connect: {
                    id: newVoucher.lineItems.sort((a, b) => b.id - a.id)[key].id, // Info: (20241120 - Murky) [Warning!] DB新創的id 可能根原本的id順序不同?
                  },
                },
                debit: lineItemPair.newDeleteReverseLineItem.debit,
                amount: lineItemPair.newDeleteReverseLineItem.amount,
                createdAt: nowInSecond,
                updatedAt: nowInSecond,
              })),
            },
          },
        },
      },
      include: {
        associateVouchers: {
          include: {
            associateLineItems: true,
          },
        },
      },
    });

    const transactionJobs: Promise<Prisma.BatchPayload | unknown>[] = [];
    const newAssociatedLineItems = newDeletedEvent.associateVouchers.reduce((acc, cur) => {
      cur.associateLineItems.forEach((lineItem) => {
        acc.push(lineItem);
      });
      return acc;
    }, [] as PrismaAssociateLineItem[]);

    deleteVersionReverseLineItemPairs.forEach((lineItemPair) => {
      const { newDeleteReverseLineItem } = lineItemPair;
      newDeleteReverseLineItem.resultLineItems.forEach((resultLineItem) => {
        const newResultLineItem = newAssociatedLineItems.find(
          (lineItem) => lineItem.originalLineItemId === resultLineItem.resultLineItemId
        );
        if (!newResultLineItem) {
          throw new Error(
            'newResultLineItemId is not found in deleteVoucherByCreateReverseVoucher in voucher.repo.ts'
          );
        }

        const createAssociateVoucherJob = tx.associateVoucher.create({
          data: {
            originalVoucher: {
              connect: {
                id: resultLineItem.associateVoucher.originalVoucherId,
              },
            },
            resultVoucher: {
              connect: {
                id: newVoucher.id,
              },
            },
            event: {
              connect: {
                id: resultLineItem.associateVoucher.eventId,
              },
            },
            createdAt: nowInSecond,
            updatedAt: nowInSecond,
            associateLineItems: {
              create: {
                originalLineItem: {
                  connect: {
                    id: resultLineItem.originalLineItemId,
                  },
                },
                resultLineItem: {
                  connect: {
                    id: newResultLineItem.resultLineItemId,
                  },
                },
                debit: resultLineItem.debit,
                amount: resultLineItem.amount,
                createdAt: nowInSecond,
                updatedAt: nowInSecond,
              },
            },
          },
        });
        transactionJobs.push(createAssociateVoucherJob);
      });
    });

    const invoiceRC2Ids = voucherDeleteOtherEntity.InvoiceRC2List?.map((i) => i.id) || [];

    if (invoiceRC2Ids.length > 0) {
      await tx.invoiceRC2.updateMany({
        where: {
          id: { in: invoiceRC2Ids },
        },
        data: {
          voucherId: newVoucher.id,
          updatedAt: nowInSecond,
        },
      });
    }

    await Promise.all(transactionJobs);

    return {
      voucherId: newVoucher.id,
      eventId: newDeletedEvent.id,
    };
  });
  return result;
}

export const findVouchersByVoucherIds = async (
  voucherIds: number[]
): Promise<{ id: number; date: number; no: string; type: string }[]> => {
  try {
    const vouchers = await prisma.voucher.findMany({
      where: {
        id: { in: voucherIds },
      },
    });
    return vouchers;
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'Find vouchers by voucher ids in findVouchersByVoucherIds failed',
      errorMessage: error as Error,
    });
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }
};

export const listBaifaVouchers = async (queryParams: {
  page?: number;
  pageSize?: number;
  startDate?: number;
  endDate?: number;
  searchQuery?: string;
  sortOption?: { sortBy: SortBy; sortOrder: SortOrder }[];
}): Promise<
  IPaginatedData<IGetManyVoucherResponseButOne[]> & {
    where: Prisma.VoucherWhereInput;
  }
> => {
  let modifyVouchers: IGetManyVoucherResponseButOne[] = [];
  const {
    page = 1,
    pageSize = 10,
    startDate = 0,
    endDate = Math.floor(Date.now() / 1000),
    searchQuery = '',
    sortOption = [{ sortBy: SortBy.CREATED_AT, sortOrder: SortOrder.DESC }],
  } = queryParams;

  const whereCondition: Prisma.VoucherWhereInput = {
    date: {
      gte: startDate,
      lte: endDate,
    },
    OR: [
      {
        issuer: {
          name: {
            contains: searchQuery,
          },
        },
      },
      {
        counterparty: {
          OR: [
            {
              name: {
                contains: searchQuery,
              },
            },
            {
              taxId: {
                contains: searchQuery,
              },
            },
          ],
        },
      },
      {
        note: {
          contains: searchQuery,
        },
      },
      {
        no: {
          contains: searchQuery,
        },
      },
      {
        lineItems: {
          some: {
            OR: [
              {
                account: {
                  name: {
                    contains: searchQuery,
                  },
                },
              },
            ],
          },
        },
      },
    ],
  };

  const [totalCount, vouchers] = await prisma.$transaction([
    prisma.voucher.count({ where: whereCondition }),
    prisma.voucher.findMany({
      where: whereCondition,
      include: {
        lineItems: {
          include: {
            account: true,
            originalLineItem: {
              include: {
                resultLineItem: {
                  include: {
                    account: true,
                  },
                },
                associateVoucher: {
                  include: {
                    event: true,
                  },
                },
              },
            },
            resultLineItem: {
              include: {
                originalLineItem: {
                  include: {
                    account: true,
                    originalLineItem: {
                      include: {
                        resultLineItem: {
                          include: {
                            account: true,
                          },
                        },
                        associateVoucher: {
                          include: {
                            event: true,
                          },
                        },
                      },
                    },
                  },
                },
                associateVoucher: {
                  include: {
                    event: true,
                    originalVoucher: true,
                  },
                },
              },
            },
          },
        },
        counterparty: true,
        issuer: {
          include: {
            imageFile: true,
          },
        },
        originalVouchers: {
          include: {
            event: true,
            resultVoucher: {
              include: {
                lineItems: {
                  include: {
                    account: true,
                  },
                },
              },
            },
          },
        },
        resultVouchers: {
          include: {
            event: true,
            originalVoucher: {
              include: {
                lineItems: {
                  include: {
                    account: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: createOrderByList(sortOption),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  modifyVouchers = vouchers.map((voucher) => {
    const noteData = parseNoteData(voucher.note ?? '');

    return {
      ...voucher,
      lineItems: filterAvailableLineItems(voucher.lineItems),
      note: noteData.note ?? voucher.note ?? '',
      counterparty: voucher.counterparty
        ? {
            ...voucher.counterparty,
            taxId: voucher.counterparty.taxId ?? '',
          }
        : null,
    };
  });
  return {
    ...toPaginatedData({
      data: modifyVouchers,
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
      sort: sortOption,
    }),
    where: whereCondition,
  };
};
