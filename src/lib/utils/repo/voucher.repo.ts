// ToDo: (20241011 - Jacky) Temporarily commnet the following code for the beta transition
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
import { PUBLIC_COMPANY_ID } from '@/constants/company';
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
import type { ICompanyEntity } from '@/interfaces/company';
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
              id: PUBLIC_COMPANY_ID,
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
  const missingCertificatesCount = await prisma.voucher.count({
    where: {
      companyId, // Info: (20241114 - Murky) 指定公司 ID
      NOT: {
        voucherCertificates: {
          some: {},
        },
      },
      company: {},
    },
  });

  return missingCertificatesCount;
}

export async function postVoucherV2({
  nowInSecond,
  company,
  originalVoucher,
  issuer,
  eventControlPanel: { revertEvent },
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
      error as Error
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
  const where: Prisma.VoucherWhereInput = {
    date: {
      gte: startDate,
      lte: endDate,
    },
    companyId,
    status: getStatusFilter(tab),
    type: type || undefined,
    deletedAt: isDeleted ? { not: null } : isDeleted === false ? null : undefined,
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
      },
    });

    switch (tab) {
      case VoucherListTabV2.PAYMENT:
        vouchers = vouchersFromPrisma.filter((voucher) => {
          return voucher.lineItems.some((lineItem) =>
            AccountCodesOfAPRegex.test(lineItem.account.code)
          );
        });
        break;
      case VoucherListTabV2.RECEIVING:
        vouchers = vouchersFromPrisma.filter((voucher) => {
          return voucher.lineItems.some((lineItem) =>
            AccountCodesOfARRegex.test(lineItem.account.code)
          );
        });
        break;
      default:
        vouchers = vouchersFromPrisma;
        break;
    }
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
    const newVoucherNo = await getLatestVoucherNoInPrisma(companyId, {
      voucherDate: voucherDeleteOtherEntity.date,
    });

    await tx.voucher.update({
      where: {
        id: deleteVersionOriginVoucher.id,
      },
      data: {
        deletedAt: nowInSecond,
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
                    id: newVoucher.lineItems[key].id, // Info: (20241120 - Murky) [Warning!] DB新創的id 可能根原本的id順序不同?
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
