import prisma from '@/client';

import { InvoiceType } from '@/constants/invoice';
import loggerBack, { loggerError } from '@/lib/utils/logger_back';
import { PostCertificateResponse } from '@/interfaces/certificate';
import { SortBy, SortOrder } from '@/constants/sort';
import { Prisma } from '@prisma/client';
import { getTimestampNow, pageToOffset } from '@/lib/utils/common';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { InvoiceTabs } from '@/constants/certificate';
import { IPaginatedData } from '@/interfaces/pagination';
import { DefaultValue } from '@/constants/default_value';

export async function countMissingCertificate(companyId: number) {
  const missingCertificatesCount = await prisma.certificate.count({
    where: {
      companyId, // 指定公司 ID
      NOT: {
        voucherCertificates: {
          some: {},
        },
      },
    },
  });

  return missingCertificatesCount;
}

export async function getOneCertificateByIdWithoutInclude(certificateId: number) {
  const certificate = await prisma.certificate.findUnique({
    where: {
      id: certificateId,
    },
  });

  return certificate;
}

export async function createCertificateWithEmptyInvoice(options: {
  nowInSecond: number;
  companyId: number;
  uploaderId: number;
  fileId: number;
  aiResultId?: string;
}) {
  const { nowInSecond, companyId, uploaderId, fileId, aiResultId } = options;

  let certificate: PostCertificateResponse | null = null;

  try {
    certificate = await prisma.certificate.create({
      data: {
        company: {
          connect: {
            id: companyId,
          },
        },
        uploader: {
          connect: {
            id: uploaderId,
          },
        },
        file: {
          connect: {
            id: fileId,
          },
        },
        aiResultId,
        createdAt: nowInSecond,
        updatedAt: nowInSecond,
        deletedAt: null,
        // invoices: {
        //   create: {
        //     counterParty: {
        //       connect: {
        //         id: PUBLIC_COUNTER_PARTY.id,
        //       },
        //     },
        //     name: '',
        //     inputOrOutput: InvoiceTransactionDirection.INPUT,
        //     date: nowInSecond,
        //     no: '',
        //     currencyAlias: CurrencyType.TWD,
        //     priceBeforeTax: 0,
        //     taxType: InvoiceTaxType.TAXABLE,
        //     taxRatio: 0,
        //     taxPrice: 0,
        //     totalPrice: 0,
        //     type: InvoiceType.PURCHASE_TRIPLICATE_AND_ELECTRONIC,
        //     deductible: false,
        //     createdAt: nowInSecond,
        //     updatedAt: nowInSecond,
        //     deletedAt: null,
        //   },
        // },
      },
      include: {
        voucherCertificates: {
          include: {
            voucher: true,
          },
        },
        file: true,
        UserCertificate: true,
        invoices: {
          include: {
            counterParty: true,
          },
        },
        uploader: true,
      },
    });
  } catch (error) {
    loggerBack.error(`createCertificateWithEmptyInvoice: ${JSON.stringify(error, null, 2)}`);
  }

  return certificate;
}

export async function getCertificatesV2(options: {
  companyId: number;
  page: number;
  pageSize: number;
  sortOption: {
    // Info: (20241126 - Murky) 畫面沒有特定要sort哪些值
    sortBy: SortBy;
    sortOrder: SortOrder;
  }[];
  startDate?: number;
  endDate?: number;
  searchQuery?: string | undefined;
  isDeleted?: boolean | undefined;
  type?: InvoiceType | undefined;
  tab?: InvoiceTabs;
}): Promise<
  IPaginatedData<PostCertificateResponse[]> & {
    where: Prisma.CertificateWhereInput;
  }
> {
  const {
    tab,
    companyId,
    startDate,
    endDate,
    page,
    pageSize,
    sortOption,
    searchQuery,
    isDeleted,
    type,
  } = options;
  // const { page, pageSize, sortOption, isDeleted } = options;
  let certificates: PostCertificateResponse[] = [];

  function getVoucherCertificateRelation(invoiceTab: InvoiceTabs | undefined) {
    if (!invoiceTab) {
      return undefined;
    }

    switch (invoiceTab) {
      case InvoiceTabs.WITH_VOUCHER:
        return {
          some: {},
        };
      case InvoiceTabs.WITHOUT_VOUCHER:
        return {
          none: {},
        };
      default:
        return undefined;
    }
  }

  // Info: (20241121 - Murky) payable 和 receivable 如果要再搜尋中處理的話要用rowQuery, 所以這邊先用filter的
  const where: Prisma.CertificateWhereInput = {
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
    companyId,
    deletedAt: isDeleted ? { not: null } : isDeleted === false ? null : undefined,
    voucherCertificates: getVoucherCertificateRelation(tab),
    AND: [
      {
        OR: [
          {
            invoices: {
              some: {
                type, // 如果有符合的 `type`
              },
            },
          },
          {
            invoices: {
              none: {}, // 沒有任何關聯的 `invoices`
            },
          },
        ],
      },
      {
        OR: [
          {
            file: {
              name: {
                contains: searchQuery,
              },
            },
          },
          {
            invoices: {
              some: {
                name: {
                  contains: searchQuery,
                },
                no: {
                  contains: searchQuery,
                },
              },
            },
          },
        ],
      },
    ],
  };

  let totalCount = 0;

  try {
    totalCount = await prisma.certificate.count({ where });
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
        case SortBy.DATE_CREATED:
          orderBy.push({
            createdAt: sortOrder,
          });
          break;
        case SortBy.DATE_UPDATED:
          orderBy.push({
            updatedAt: sortOrder,
          });
          break;
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
    certificates = await prisma.certificate.findMany({
      ...findManyArgs,
      include: {
        voucherCertificates: {
          include: {
            voucher: true,
          },
        },
        file: true,
        UserCertificate: true,
        invoices: {
          include: {
            counterParty: true,
          },
        },
        uploader: true,
      },
    });
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'Find many accounts in findManyAccountsInPrisma failed',
      errorMessage: error as Error,
    });
  }

  const hasNextPage = certificates.length > pageSize;
  const hasPreviousPage = page > DEFAULT_PAGE_NUMBER; // 1;

  if (hasNextPage) {
    certificates.pop();
  }

  const returnValue = {
    data: certificates,
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

export async function getUnreadCertificateCount(options: {
  userId: number;
  tab: InvoiceTabs;
  where: Prisma.CertificateWhereInput;
}) {
  const { userId, where, tab } = options;
  let unreadCertificateCount = 0;

  function getVoucherCertificateRelation(invoiceTab: InvoiceTabs) {
    switch (invoiceTab) {
      case InvoiceTabs.WITH_VOUCHER:
        return {
          some: {},
        };
      case InvoiceTabs.WITHOUT_VOUCHER:
        return {
          none: {},
        };
      default:
        return undefined;
    }
  }

  try {
    const readCertificateCount = await prisma.certificate.count({
      where: {
        ...where,
        voucherCertificates: getVoucherCertificateRelation(tab),
        UserCertificate: {
          some: {
            userId,
            isRead: true,
          },
        },
      },
    });

    const totalCertificateCount = await prisma.certificate.count({
      where: {
        ...where,
        voucherCertificates: getVoucherCertificateRelation(tab),
      },
    });
    unreadCertificateCount = totalCertificateCount - readCertificateCount;
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'Count unread voucher in getUnreadVoucherCount failed',
      errorMessage: error as Error,
    });
  }

  return unreadCertificateCount;
}

export async function upsertUserReadCertificates(options: {
  certificateIds: number[];
  userId: number;
  nowInSecond: number;
}): Promise<void> {
  const alreadyInDBCertificateIds = await prisma.userCertificate.findMany({
    where: {
      userId: options.userId,
      certificateId: {
        in: options.certificateIds,
      },
    },
    select: {
      certificateId: true,
    },
  });
  const alreadyInDBCertificateIdsSet = new Set(
    alreadyInDBCertificateIds.map((certificate) => certificate.certificateId)
  );

  const notInDBCertificateIds = options.certificateIds.filter((certificateId) => {
    return !alreadyInDBCertificateIdsSet.has(certificateId);
  });

  const updateJob = prisma.userCertificate.updateMany({
    where: {
      userId: options.userId,
      certificateId: {
        in: Array.from(alreadyInDBCertificateIdsSet),
      },
      isRead: false,
    },
    data: {
      isRead: true,
      updatedAt: options.nowInSecond,
    },
  });

  const createJob = prisma.userCertificate.createMany({
    data: notInDBCertificateIds.map((certificateId) => ({
      userId: options.userId,
      certificateId,
      isRead: true,
      createdAt: options.nowInSecond,
      updatedAt: options.nowInSecond,
    })),
  });

  await Promise.all([updateJob, createJob]);
}

export async function listCertificateWithoutInvoice() {
  const certificates = await prisma.certificate.findMany({
    where: {
      invoices: {
        none: {},
      },
    },
    select: {
      id: true,
      companyId: true,
      fileId: true,
    },
  });

  return certificates;
}

export async function listCertificateWithResultId() {
  const certificates = await prisma.certificate.findMany({
    where: {
      aiResultId: {
        notIn: ['', '0', 'done'],
      },
    },
    select: {
      id: true,
      companyId: true,
      aiResultId: true,
    },
  });

  return certificates;
}

export async function updateCertificateAiResultId(certificateId: number, aiResultId: string) {
  const nowInSecond = getTimestampNow();
  const certificate = await prisma.certificate.update({
    where: {
      id: certificateId,
    },
    data: {
      aiResultId,
      updatedAt: nowInSecond,
    },
  });

  return certificate;
}
