import prisma from '@/client';

import { InvoiceType } from '@/constants/invoice';
import loggerBack, { loggerError } from '@/lib/utils/logger_back';
import { ICertificate, PostCertificateResponse } from '@/interfaces/certificate';
import { SortBy, SortOrder } from '@/constants/sort';
import { getTimestampNow, pageToOffset } from '@/lib/utils/common';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { InvoiceTabs } from '@/constants/invoice_rc2';
import { IPaginatedData } from '@/interfaces/pagination';
import { DefaultValue } from '@/constants/default_value';
import { Prisma } from '@prisma/client';

/**
 * Info: (20250422 - Tzuhan) 補上每一筆 Certificate 的 `incomplete` 屬性（從原本的 DB 回傳中推導）
 */
export function mapCertificateWithIncomplete(certificate: ICertificate): ICertificate {
  const incomplete = true;
  return {
    ...certificate,
    incomplete,
  };
}

export function mapCertificatesWithIncomplete(certificates: ICertificate[]): ICertificate[] {
  return certificates.map(mapCertificateWithIncomplete);
}

/**
 * Info: (20250422 - Tzuhan) 套用至實際 API 回傳格式轉換
 */
export function transformWithIncomplete(certificates: ICertificate[]): ICertificate[] {
  return mapCertificatesWithIncomplete(certificates);
}

/**
 * Info: (20250422 - Tzuhan) 回傳 incomplete summary 統計數量（依據 tab）
 */
export function summarizeIncompleteCertificates(certificates: ICertificate[]): {
  withVoucher: number;
  withoutVoucher: number;
} {
  return certificates.reduce(
    (acc, cert) => {
      if (!cert.incomplete) return acc;
      const hasVoucher = !!cert.voucherId;
      if (hasVoucher) {
        acc.withVoucher += 1;
      } else {
        acc.withoutVoucher += 1;
      }
      return acc;
    },
    { withVoucher: 0, withoutVoucher: 0 }
  );
}

export async function countMissingCertificate(accountBookId: number) {
  const missingCertificatesCount = await prisma.voucher.count({
    where: {
      accountBookId,
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
  accountBookId: number;
  uploaderId: number;
  fileId: number;
  aiResultId?: string;
}) {
  const { nowInSecond, accountBookId, uploaderId, fileId, aiResultId } = options;

  let certificate: PostCertificateResponse | null = null;

  try {
    certificate = await prisma.certificate.create({
      data: {
        accountBook: {
          connect: {
            id: accountBookId,
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
        file: {
          include: {
            thumbnail: true, // Info: (20250513 - Shirley) 包含縮圖資訊
          },
        },
        // invoices: {
        //   include: {
        //     counterParty: true,
        //   },
        // },
        invoices: true, // TODO: (20250113 - Shirley) 在 invoice db schema 更改之後，counterParty 的 fkey 被拿掉
        uploader: {
          include: {
            imageFile: true,
          },
        },
      },
    });
  } catch (error) {
    loggerBack.error(`createCertificateWithEmptyInvoice: ${JSON.stringify(error, null, 2)}`);
  }

  return certificate;
}

export async function getOneCertificateById(
  certificateId: number,
  optional?: {
    isDeleted?: boolean;
  }
): Promise<PostCertificateResponse | null> {
  let certificate: PostCertificateResponse | null = null;
  const { isDeleted } = optional || {};
  try {
    certificate = await prisma.certificate.findUnique({
      where: {
        id: certificateId,
        deletedAt: isDeleted ? { not: null } : isDeleted === false ? null : undefined,
      },
      include: {
        voucherCertificates: {
          include: {
            voucher: true,
          },
        },
        file: {
          include: {
            thumbnail: true, // Info: (20250513 - Shirley) 包含縮圖資訊
          },
        },
        // invoices: {
        //   include: {
        //     counterParty: true,
        //   },
        // },
        invoices: true, // TODO: (20250113 - Shirley) 在 invoice db schema 更改之後，counterParty 的 fkey 被拿掉
        uploader: {
          include: {
            imageFile: true,
          },
        },
      },
    });
  } catch (error) {
    loggerBack.error(`getOneCertificateById: ${JSON.stringify(error, null, 2)}`);
  }

  return certificate;
}

export async function getCertificatesV2(options: {
  accountBookId: number;
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
    accountBookId,
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
      return [];
    }

    switch (invoiceTab) {
      case InvoiceTabs.WITH_VOUCHER:
        return [
          {
            voucherCertificates: {
              some: {
                deletedAt: null,
              },
            },
          },
        ];
      case InvoiceTabs.WITHOUT_VOUCHER:
        return [
          {
            voucherCertificates: {
              every: {
                deletedAt: {
                  not: null,
                },
              },
            },
          },
          {
            voucherCertificates: {
              none: {},
            },
          },
        ];

      default:
        return [];
    }
  }

  // Info: (20241121 - Murky) payable 和 receivable 如果要再搜尋中處理的話要用rowQuery, 所以這邊先用filter的
  const where: Prisma.CertificateWhereInput = {
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
    accountBookId,
    deletedAt: isDeleted ? { not: null } : isDeleted === false ? null : undefined,
    AND: [
      {
        OR: getVoucherCertificateRelation(tab),
      },
      {
        OR: [
          // Info: (20250109 - tzuhan) 當 type 有具體值時，僅匹配 type 且排除 invoice 為空
          ...(type && type !== InvoiceType.ALL
            ? [
                {
                  invoices: {
                    some: {
                      type,
                    },
                  },
                },
              ]
            : [
                // Info: (20250109 - tzuhan) 否則，匹配所有相關聯或無關聯的 certificates
                {
                  invoices: {
                    some: {}, // Info: (20250109 - tzuhan) 有任何關聯的 invoices
                  },
                },
                {
                  invoices: {
                    none: {}, // Info: (20241129 - Murky) 沒有任何關聯的 `invoices`
                  },
                },
              ]),
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
          where: {
            deletedAt: null,
          },
          include: {
            voucher: true,
          },
        },
        file: {
          include: {
            thumbnail: true, // Info: (20250513 - Shirley) 包含縮圖資訊
          },
        },
        // invoices: {
        //   include: {
        //     counterParty: true,
        //   },
        // },
        invoices: true, // TODO: (20250113 - Shirley) 在 invoice db schema 更改之後，counterParty 的 fkey 被拿掉
        uploader: {
          include: {
            imageFile: true,
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

  const hasNextPage = certificates.length > pageSize;
  const hasPreviousPage = page > DEFAULT_PAGE_NUMBER; // Info: (20241121 - Murky) DEFAULT_PAGE_NUMBER = 1;

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

export async function listCertificateWithoutInvoice() {
  const certificates = await prisma.certificate.findMany({
    where: {
      invoices: {
        none: {},
      },
    },
    select: {
      id: true,
      accountBookId: true,
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
      accountBookId: true,
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

export async function deleteMultipleCertificates(options: {
  certificateIds: number[];
  nowInSecond: number;
}): Promise<number[]> {
  const { certificateIds, nowInSecond } = options;
  const certificateUpdateWhere: Prisma.CertificateWhereInput = {
    id: {
      in: certificateIds,
    },
  };

  const [updateIdResults] = await prisma.$transaction([
    prisma.certificate.findMany({
      where: certificateUpdateWhere,
      select: {
        id: true,
      },
    }),

    prisma.voucherCertificate.deleteMany({
      where: {
        certificateId: {
          in: certificateIds,
        },
      },
    }),
    prisma.invoice.updateMany({
      where: {
        certificateId: {
          in: certificateIds,
        },
      },
      data: {
        updatedAt: nowInSecond,
        deletedAt: nowInSecond,
      },
    }),
    prisma.certificate.updateMany({
      where: certificateUpdateWhere,
      data: {
        deletedAt: nowInSecond,
        updatedAt: nowInSecond,
      },
    }),
  ]);
  const deletedIds = updateIdResults.map((result) => result.id);
  return deletedIds;
}

export async function getAllFilteredInvoice(options: {
  accountBookId: number;
  startDate?: number;
  endDate?: number;
  searchQuery?: string;
  type?: InvoiceType;
  tab?: InvoiceTabs;
  isDeleted?: boolean;
}) {
  const { accountBookId, startDate, endDate, searchQuery, type, tab, isDeleted } = options;

  function getVoucherCertificateRelation(invoiceTab: InvoiceTabs | undefined) {
    if (!invoiceTab) {
      return [];
    }

    switch (invoiceTab) {
      case InvoiceTabs.WITH_VOUCHER:
        return [
          {
            voucherCertificates: {
              some: {
                deletedAt: null,
              },
            },
          },
        ];
      case InvoiceTabs.WITHOUT_VOUCHER:
        return [
          {
            voucherCertificates: {
              every: {
                deletedAt: {
                  not: null,
                },
              },
            },
          },
          {
            voucherCertificates: {
              none: {},
            },
          },
        ];

      default:
        return [];
    }
  }

  const where: Prisma.CertificateWhereInput = {
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
    accountBookId,
    deletedAt: isDeleted ? { not: null } : isDeleted === false ? null : undefined,
    AND: [
      {
        OR: getVoucherCertificateRelation(tab),
      },
      {
        OR: [
          ...(type && type !== InvoiceType.ALL
            ? [
                {
                  invoices: {
                    some: {
                      type,
                    },
                  },
                },
              ]
            : [
                {
                  invoices: {
                    some: {},
                  },
                },
                {
                  invoices: {
                    none: {},
                  },
                },
              ]),
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

  const result = await prisma.certificate.findMany({
    where,
    select: {
      invoices: {
        select: {
          totalPrice: true,
        },
      },
    },
  });

  return result;
}
