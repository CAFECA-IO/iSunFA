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
} from '@prisma/client';

import { STATUS_MESSAGE } from '@/constants/status_code';
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
import type { ICompanyEntity } from '@/interfaces/account_book';
import type { IEventEntity } from '@/interfaces/event';
import { IUserEntity } from '@/interfaces/user';
import { assert } from 'console';
import { EventType } from '@/constants/account';
import { PUBLIC_COUNTER_PARTY } from '@/constants/counterparty';
import { IAccountEntity } from '@/interfaces/accounting_account';
import { IAssociateLineItemEntity } from '@/interfaces/associate_line_item';
import { IAssociateVoucherEntity } from '@/interfaces/associate_voucher';
import { VoucherListTabV2 } from '@/constants/voucher';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { IPaginatedData } from '@/interfaces/pagination';
import { JOURNAL_EVENT } from '@/constants/journal';

import {
  AccountCodesOfAP,
  AccountCodesOfAPRegex,
  AccountCodesOfAR,
  AccountCodesOfARRegex,
} from '@/constants/asset';
import { DefaultValue } from '@/constants/default_value';
import { parseNoteData } from '@/lib/utils/parser/note_with_counterparty';

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

export async function findFirstAccountBelongsToCompanyInPrisma(id: string, companyId: number) {
  try {
    const result = await prisma.account.findFirst({
      where: {
        id: Number(id),
        OR: [
          {
            company: {
              id: companyId,
            },
          },
          {
            company: {
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
  companyId: number
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
      companyId
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
  companyId: number,
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
        companyId,
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
  companyId: number,
  startDateInSecond: number,
  endDateInSecond: number
) {
  try {
    const vouchers = await prisma.voucher.findMany({
      where: {
        companyId,
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
  companyId: number,
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
        companyId,
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

export async function countUnpostedVoucher(companyId: number) {
  const unpostedVoucherCount = await prisma.certificate.count({
    where: {
      companyId,
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
}: {
  nowInSecond: number;
  company: ICompanyEntity;
  originalVoucher: IVoucherEntity;
  issuer: IUserEntity;
  eventControlPanel: {
    revertEvent: IEventEntity | null;
    recurringEvent: IEventEntity | null;
    assetEvent: IEventEntity | null;
  };
  certificateIds: number[];
}) {
  // ToDo: (20241030 - Murky) Implement recurringEvent and assetEvent
  // const isRecurringEvent = !!recurringEvent;
  // const isAssetEvent = !!assetEvent;
  const isRevertEvent = !!revertEvent;

  // Info: (20241111 - Murky) 目前沒有event, 折舊在post voucher的時候執行
  const isAssetEvent = originalVoucher.asset.length > 0;

  const voucherCreated = await prisma.$transaction(async (tx) => {
    const originalVoucherNo = await getLatestVoucherNoInPrisma(company.id, {
      voucherDate: originalVoucher.date,
    });

    const originalVoucherInDB = await tx.voucher.create({
      data: {
        no: originalVoucherNo,
        date: originalVoucher.date,
        type: originalVoucher.type,
        note: originalVoucher.note,
        status: originalVoucher.status,
        editable: originalVoucher.editable,
        createdAt: nowInSecond,
        updatedAt: nowInSecond,
        deletedAt: null,
        company: {
          connect: {
            id: company.id,
          },
        },
        voucherCertificates: {
          create: certificateIds.map((certificateId) => ({
            certificate: {
              connect: {
                id: certificateId,
              },
            },
            createdAt: nowInSecond,
            updatedAt: nowInSecond,
          })),
        },
        issuer: {
          connect: {
            id: issuer.id,
          },
        },
        counterparty: {
          connect: {
            id: originalVoucher.counterPartyId,
          },
        },
        lineItems: {
          create: originalVoucher.lineItems.map((lineItem) => ({
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
      },
      include: {
        lineItems: true,
      },
    });

    if (isAssetEvent) {
      await Promise.all(
        originalVoucher.asset.map(async (asset) => {
          const assetVoucher = await tx.assetVoucher.create({
            data: {
              asset: {
                connect: {
                  id: asset.id,
                },
              },
              voucher: {
                connect: {
                  id: originalVoucherInDB.id,
                },
              },
              createdAt: nowInSecond,
              updatedAt: nowInSecond,
            },
          });
          return assetVoucher;
        })
      );
    }

    if (isRevertEvent) {
      const { associateVouchers } = revertEvent;

      assert(
        associateVouchers,
        'associateVouchers is not provided in postVoucherV2 in voucher.repo.ts'
      );

      assert(
        associateVouchers.length > 0,
        'associateVouchers is empty in postVoucherV2 in voucher.repo.ts'
      );

      await Promise.all(
        associateVouchers.map(async (associateVoucher) => {
          const { originalVoucher: original, resultVoucher } = associateVoucher;
          // const { resultVoucher } = associateVoucher;

          const originalLineItem = original.lineItems[0];

          // Info: (20241111 - Murky) Patch, 找出原始 voucher 被反轉的 lineItem
          const resultLineItem = originalVoucherInDB.lineItems.find((lineItem) => {
            const targetLineItem = resultVoucher.lineItems[0];
            return (
              lineItem.accountId === targetLineItem.accountId &&
              lineItem.debit === targetLineItem.debit &&
              lineItem.amount === targetLineItem.amount &&
              lineItem.description === targetLineItem.description
            );
          });

          assert(
            !!resultLineItem,
            'resultLineItem is not found in postVoucherV2 in voucher.repo.ts'
          );

          if (!resultLineItem) {
            throw new Error('resultLineItem is not found in postVoucherV2 in voucher.repo.ts');
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
                    connect: {
                      id: original.id,
                    },
                  },
                  resultVoucher: {
                    connect: {
                      id: originalVoucherInDB.id,
                    },
                  },
                  createdAt: nowInSecond,
                  updatedAt: nowInSecond,
                  associateLineItems: {
                    create: {
                      originalLineItem: {
                        connect: {
                          id: originalLineItem.id,
                        },
                      },
                      resultLineItem: {
                        connect: {
                          id: resultLineItem.id,
                        },
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
            include: {
              associateVouchers: true,
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
    counterPartyId?: number;
    voucherInfo: {
      type: EventType;
      note: string;
      voucherDate: number;
    };
    certificateOptions: {
      certificateIdsNeedToBeRemoved: number[];
      certificateIdsNeedToBeAdded: number[];
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
    counterPartyId = PUBLIC_COUNTER_PARTY.id,
    voucherInfo,
    certificateOptions,
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
          counterparty: {
            connect: {
              id: counterPartyId,
            },
          },
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
            'delete voucher certificate by voucher id in putVoucherWithoutCreateNew in voucher.repo.ts failed',
            error as Error
          );
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
            'delete asset voucher by voucher id in putVoucherWithoutCreateNew in voucher.repo.ts failed',
            error as Error
          );
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
            'create voucher certificate by voucher id in putVoucherWithoutCreateNew in voucher.repo.ts failed',
            error as Error
          );
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
            'create asset voucher by voucher id in putVoucherWithoutCreateNew in voucher.repo.ts failed',
            error as Error
          );
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
      'update voucher by voucher id in putVoucherWithoutCreateNew in voucher.repo.ts failed',
      { message: (error as Error).message, stack: (error as Error).stack }
    );
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
                UserCertificate: true,
              },
            },
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
  companyId: number;
}): Promise<IGetOneVoucherResponse | null> {
  let voucher: IGetOneVoucherResponse | null = null;
  const { voucherNo, companyId } = options;
  try {
    voucher = await prisma.voucher.findFirst({
      where: {
        no: voucherNo,
        companyId,
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
                UserCertificate: true,
              },
            },
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

export async function getManyVoucherV2(options: {
  companyId: number;
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
    companyId,
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
    companyId,
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
        UserVoucher: true,
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
        note: noteData.note ?? voucher.note ?? '',
        counterparty: {
          ...voucher.counterparty,
          name: voucher.counterparty.id === 555 ? noteData.name : voucher.counterparty.name,
          taxId: voucher.counterparty.id === 555 ? noteData.taxId : voucher.counterparty.taxId,
        },
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
  companyId: number;
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
    companyId,
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
    companyId,
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
        UserVoucher: true,
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

export async function getUnreadVoucherCount(options: {
  userId: number;
  tab: VoucherListTabV2;
  where: Prisma.VoucherWhereInput;
}) {
  const { userId, where, tab } = options;
  let unreadVoucherCount = 0;

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

  function generateOrCode(voucherListTab: VoucherListTabV2) {
    switch (voucherListTab) {
      case VoucherListTabV2.PAYMENT:
        return AccountCodesOfAP.map((code) => ({
          lineItems: {
            some: {
              account: {
                code: {
                  startsWith: code,
                },
              },
            },
          },
        }));
      case VoucherListTabV2.RECEIVING:
        return AccountCodesOfAR.map((code) => ({
          lineItems: {
            some: {
              account: {
                code: {
                  startsWith: code,
                },
              },
            },
          },
        }));
      case VoucherListTabV2.UPLOADED:
      case VoucherListTabV2.UPCOMING:
      default:
        return [];
    }
  }

  try {
    const orCondition = generateOrCode(tab);
    const isOrNeeded = orCondition.length > 0;
    const status = getStatusFilter(tab);
    const readVoucherCount = await prisma.voucher.count({
      where: {
        ...where,
        status,
        UserVoucher: {
          some: {
            userId,
            isRead: true,
          },
        },
        ...(isOrNeeded && { OR: orCondition }),
      },
    });

    const totalVoucherCount = await prisma.voucher.count({
      where: {
        ...where,
        status,
        ...(isOrNeeded && { OR: orCondition }),
      },
    });
    unreadVoucherCount = totalVoucherCount - readVoucherCount;
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'Count unread voucher in getUnreadVoucherCount failed',
      errorMessage: error as Error,
    });
  }

  return unreadVoucherCount;
}

export async function upsertUserReadVoucher(options: {
  voucherIds: number[];
  userId: number;
  nowInSecond: number;
}): Promise<void> {
  const alreadyInDBVoucherIds = await prisma.userVoucher.findMany({
    where: {
      userId: options.userId,
      voucherId: {
        in: options.voucherIds,
      },
    },
    select: {
      voucherId: true,
    },
  });
  const alreadyInDBVoucherIdsSet = new Set(
    alreadyInDBVoucherIds.map((voucher) => voucher.voucherId)
  );

  const notInDBVoucherIds = options.voucherIds.filter((voucherId) => {
    return !alreadyInDBVoucherIdsSet.has(voucherId);
  });

  const updateJob = prisma.userVoucher.updateMany({
    where: {
      userId: options.userId,
      voucherId: {
        in: Array.from(alreadyInDBVoucherIdsSet),
      },
      isRead: false,
    },
    data: {
      isRead: true,
      updatedAt: options.nowInSecond,
    },
  });

  const createJob = prisma.userVoucher.createMany({
    data: notInDBVoucherIds.map((voucherId) => ({
      userId: options.userId,
      voucherId,
      isRead: true,
      createdAt: options.nowInSecond,
      updatedAt: options.nowInSecond,
    })),
  });

  await Promise.all([updateJob, createJob]);
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
  companyId: number;
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
    companyId,
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

    const newVoucherNo = await getLatestVoucherNoInPrisma(companyId, {
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
        company: {
          connect: {
            id: companyId,
          },
        },
        issuer: {
          connect: {
            id: issuerId,
          },
        },
        counterparty: {
          connect: {
            id: voucherDeleteOtherEntity.counterPartyId,
          },
        },
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
