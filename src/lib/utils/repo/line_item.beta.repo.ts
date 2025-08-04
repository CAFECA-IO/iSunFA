import prisma from '@/client';
import { AccountType } from '@/constants/account';
import { Prisma } from '@prisma/client';
import {
  getTimestampNow,
  pageToOffset,
  setTimestampToDayEnd,
  setTimestampToDayStart,
} from '@/lib/utils/common';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { SortBy } from '@/constants/journal';
import { SortOrder, SortBy as BetaSortBy } from '@/constants/sort';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { IGetLineItemByAccount, ILineItem, ILineItemIncludeAccount } from '@/interfaces/line_item';
import { IPaginatedData } from '@/interfaces/pagination';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { loggerError } from '@/lib/utils/logger_back';
import { DefaultValue } from '@/constants/default_value';

/**
 * list invoices, return paginated data
 * @param {number} accountBookId company id to find invoices (type: number)
 * @param {AccountType} type of account that line item belongs to (type: AccountType)
 * @param {number} startDate start date in second, will be use to search invoices (type: number)
 * @param {number} endDate  end date in second, will be use to search invoices (type: number)
 * @param {number} page (optional) page number, default is 1  (type: number)
 * @param {number} pageSize (optional) how many records per page, default is 10 (type: number)
 * @param {SortBy} sortBy (optional) sort by field, default is created at, check constants/journal.ts for more details (type: SortBy)
 * @param {SortOrder} sortOrder (optional) sort order, default is newest first, check constants/journal.ts for more details (type: SortOrder)
 * @param {string | undefined} searchQuery (optional) search query, it search in description, account code and account name (type: string | undefined)
 * @param {boolean | undefined} isDeleted (optional) 1. true: only deleted 2. false: only not deleted 3. undefined: all lineItems (type: boolean | undefined)
 * @returns { Promise<IPaginatedData<ILineItemIncludeAccount[]>>} return paginated data of line items
 */
export async function listLineItems({
  accountBookId,
  type,
  startDate,
  endDate,
  page = DEFAULT_PAGE_NUMBER,
  pageSize = DEFAULT_PAGE_LIMIT,
  sortBy = SortBy.CREATED_AT,
  sortOrder = SortOrder.DESC,
  searchQuery = undefined,
  isDeleted = undefined,
}: {
  accountBookId: number;
  type: AccountType;
  startDate: number;
  endDate: number;
  page: number;
  pageSize: number;
  sortBy: SortBy;
  sortOrder: SortOrder;
  searchQuery?: string;
  isDeleted?: boolean;
}): Promise<IPaginatedData<ILineItemIncludeAccount[]>> {
  let lineItems: ILineItemIncludeAccount[] = [];

  const startDateInSecond = setTimestampToDayStart(startDate);
  const endDateInSecond = setTimestampToDayEnd(endDate);

  const deletedAtQuery: Prisma.LineItemWhereInput = isDeleted
    ? { AND: [{ deletedAt: { not: null } }, { deletedAt: { not: 0 } }] }
    : isDeleted === false
      ? { OR: [{ deletedAt: { equals: 0 } }, { deletedAt: { equals: null } }] }
      : {
          OR: [{ deletedAt: { equals: undefined } }],
        };

  const searchQueryArray: Prisma.LineItemWhereInput = {
    OR: [
      { description: { contains: searchQuery, mode: 'insensitive' } },
      { account: { code: { contains: searchQuery, mode: 'insensitive' } } },
      { account: { name: { contains: searchQuery, mode: 'insensitive' } } },
    ],
  };

  const where: Prisma.LineItemWhereInput = {
    account: {
      type,
    },
    voucher: {
      accountBookId,
      date: {
        gte: startDateInSecond,
        lte: endDateInSecond,
      },
    },
    AND: [deletedAtQuery, searchQueryArray],
  };

  const include: Prisma.LineItemInclude = {
    account: true,
  };

  const totalCount = await prisma.lineItem.count({ where });

  const totalPages = Math.ceil(totalCount / pageSize);

  if (totalPages > 0 && (page < 1 || page > totalPages)) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const orderBy =
    sortBy === SortBy.PAYMENT_PRICE
      ? { invoice: { payment: { price: sortOrder } } }
      : { [sortBy]: sortOrder };

  const skip = pageToOffset(page, pageSize);

  const findManyArgs = {
    where,
    orderBy,
    include,
    take: pageSize + 1,
    skip,
  };

  try {
    lineItems = await prisma.lineItem.findMany(findManyArgs);
  } catch (_error) {
    const error = _error as Error;
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'Find many line items in listLineItems failed',
      errorMessage: error.message,
    });
  }

  const hasNextPage = lineItems.length > pageSize;
  const hasPreviousPage = page > 1;

  if (lineItems.length > pageSize) {
    lineItems.pop();
  }

  const sort: {
    sortBy: string; // Info: (20240812 - Murky) 排序欄位的鍵
    sortOrder: string; // Info: (20240812 - Murky) 排序欄位的值
  }[] = [{ sortBy, sortOrder }];

  const paginatedLineItemList = {
    data: lineItems,
    page,
    totalPages,
    totalCount,
    pageSize,
    hasNextPage,
    hasPreviousPage,
    sort,
  };
  return paginatedLineItemList;
}

/** Info: (20240812 - Murky)
 * Create line item record by ILineItem and connect to voucher by voucherId
 * @param {number} voucherId voucher id that line item will be connected to (type: number)
 * @param {ILineItem} lineItem line item data that will be created (type: ILineItem)
 * @returns {Promise<ILineItemIncludeAccount | null>} return line item record or null if failed
 */
export async function createLineItem({
  voucherId,
  lineItem,
}: {
  voucherId: number;
  lineItem: ILineItem;
}): Promise<ILineItemIncludeAccount | null> {
  let result: ILineItemIncludeAccount | null = null;
  const nowInSecond = getTimestampNow();

  const accountConnect: Prisma.AccountCreateNestedOneWithoutLineItemInput = {
    connect: {
      id: lineItem.accountId,
    },
  };

  const voucherConnect: Prisma.VoucherCreateNestedOneWithoutLineItemsInput = {
    connect: {
      id: voucherId,
    },
  };

  const data: Prisma.LineItemCreateInput = {
    amount: lineItem.amount,
    description: lineItem.description,
    debit: lineItem.debit,
    account: accountConnect,
    voucher: voucherConnect,
    createdAt: nowInSecond,
    updatedAt: nowInSecond,
  };

  const include: Prisma.LineItemInclude = {
    account: true,
  };

  const lineItemCreateArgs = {
    data,
    include,
  };

  try {
    result = await prisma.lineItem.create(lineItemCreateArgs);
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'Create line item in createLineItem failed',
      errorMessage: (error as Error).message,
    });
  }

  return result;
}

/** Info: (20240812 - Murky)
 * Update line item record (identify by lineItemId) by ILineItem and connect to voucher by voucherId
 * @param {number} lineItemId line item id that will be updated (type: number)
 * @param {number} voucherId voucher id that line item will be connected to (type: number)
 * @param {ILineItem} lineItem line item data that will be updated to lineItemId provided (type: ILineItem)
 * @returns {Promise<ILineItemIncludeAccount | null>} return line item record or null if failed
 */
export async function updateLineItem({
  lineItemId,
  voucherId,
  lineItem,
}: {
  lineItemId: number;
  voucherId: number;
  lineItem: ILineItem;
}): Promise<ILineItemIncludeAccount | null> {
  let result: ILineItemIncludeAccount | null = null;
  const nowInSecond = getTimestampNow();

  const accountConnect: Prisma.AccountUpdateOneRequiredWithoutLineItemNestedInput = {
    connect: {
      id: lineItem.accountId,
    },
  };

  const voucherConnect: Prisma.VoucherUpdateOneRequiredWithoutLineItemsNestedInput = {
    connect: {
      id: voucherId,
    },
  };

  const where: Prisma.LineItemWhereUniqueInput = {
    id: lineItemId,
  };

  const data: Prisma.LineItemUpdateInput = {
    amount: lineItem.amount,
    description: lineItem.description,
    debit: lineItem.debit,
    account: accountConnect,
    voucher: voucherConnect,
    updatedAt: nowInSecond,
  };

  const include: Prisma.LineItemInclude = {
    account: true,
  };

  const lineItemUpdateArgs = {
    where,
    data,
    include,
  };

  try {
    result = await prisma.lineItem.update(lineItemUpdateArgs);
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'Update line item in updateLineItem failed',
      errorMessage: (error as Error).message,
    });
  }

  return result;
}

export async function deleteLineItem(lineItemId: number): Promise<ILineItemIncludeAccount | null> {
  let result: ILineItemIncludeAccount | null = null;
  const nowInSecond = getTimestampNow();

  const where: Prisma.LineItemWhereUniqueInput = {
    id: lineItemId,
  };

  const data: Prisma.LineItemUpdateInput = {
    updatedAt: nowInSecond,
    deletedAt: nowInSecond,
  };

  const include: Prisma.LineItemInclude = {
    account: true,
  };

  const lineItemUpdateArgs = {
    where,
    data,
    include,
  };

  try {
    result = await prisma.lineItem.update(lineItemUpdateArgs);
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'Soft delete line item in deleteLineItem failed',
      errorMessage: (error as Error).message,
    });
  }

  return result;
}

export async function listLineItemsByAccount({
  accountId,
  accountBookId,
  startDate,
  endDate,
  page = DEFAULT_PAGE_NUMBER,
  pageSize = DEFAULT_PAGE_LIMIT,
  sortOption = [],
  searchQuery = undefined,
  isDeleted = undefined,
}: {
  accountId: number;
  accountBookId: number;
  startDate: number;
  endDate: number;
  page?: number;
  pageSize?: number;
  sortOption: { sortBy: BetaSortBy; sortOrder: SortOrder }[];
  searchQuery?: string;
  isDeleted?: boolean;
}): Promise<IPaginatedData<IGetLineItemByAccount[]>> {
  let lineItems: IGetLineItemByAccount[] = [];

  const startDateInSecond = setTimestampToDayStart(startDate);
  const endDateInSecond = setTimestampToDayEnd(endDate);

  const deletedAtQuery: Prisma.LineItemWhereInput = isDeleted
    ? { AND: [{ deletedAt: { not: null } }, { deletedAt: { not: 0 } }] }
    : isDeleted === false
      ? { OR: [{ deletedAt: { equals: 0 } }, { deletedAt: { equals: null } }] }
      : {
          OR: [{ deletedAt: { equals: undefined } }],
        };

  const searchQueryArray: Prisma.LineItemWhereInput = {
    OR: [
      { description: { contains: searchQuery, mode: 'insensitive' } },
      // { account: { code: { contains: searchQuery, mode: 'insensitive' } } },
      // { account: { name: { contains: searchQuery, mode: 'insensitive' } } },
      { voucher: { no: { contains: searchQuery, mode: 'insensitive' } } },
    ],
  };

  const where: Prisma.LineItemWhereInput = {
    account: {
      id: accountId,
    },
    voucher: {
      accountBookId,
      date: {
        gte: startDateInSecond,
        lte: endDateInSecond,
      },
    },
    AND: [deletedAtQuery, searchQueryArray],
  };

  const totalCount = await prisma.lineItem.count({ where });

  const totalPages = Math.ceil(totalCount / pageSize);

  if (totalPages > 0 && (page < 1 || page > totalPages)) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  // Deprecate: (20241113 - Murky) incomplete
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderBy = sortOption.reduce((acc: { [key: string]: any }, { sortBy, sortOrder }) => {
    switch (sortBy) {
      case BetaSortBy.DATE:
        acc.voucher = acc.voucher || {};
        acc.voucher = {
          ...acc.voucher,
          date: sortOrder,
        };
        break;
      case BetaSortBy.AMOUNT:
        acc.amount = sortOrder;
        break;
      case BetaSortBy.DATE_CREATED:
        acc.createdAt = sortOrder;
        break;
      case BetaSortBy.DATE_UPDATED:
        acc.updatedAt = sortOrder;
        break;
      case BetaSortBy.VOUCHER_NUMBER:
        acc.voucher = acc.voucher || {};
        acc.voucher = {
          ...acc.voucher,
          no: sortOrder,
        };
        break;
      default:
        break;
    }
    return acc;
  }, {});
  const skip = pageToOffset(page, pageSize);

  try {
    /**
     * Info: (20241113 - Murky)
     * @describe get lineItems and its reversed lineItem by account Id
     */
    lineItems = await prisma.lineItem.findMany({
      where,
      orderBy,
      include: {
        account: true,
        voucher: {
          include: {
            originalVouchers: {
              include: {
                resultVoucher: {
                  include: {
                    lineItems: {
                      where: {
                        account: {
                          id: accountId,
                        },
                      },
                      include: {
                        account: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      take: pageSize + 1,
      skip,
    });
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'Find many line items in listLineItems failed',
      errorMessage: (error as Error).message,
    });
  }

  const hasNextPage = lineItems.length > pageSize;
  const hasPreviousPage = page > 1;

  if (lineItems.length > pageSize) {
    lineItems.pop();
  }

  // const sort: {
  //   sortBy: string; // Info: (20240812 - Murky) 排序欄位的鍵
  //   sortOrder: string; // Info: (20240812 - Murky) 排序欄位的值
  // }[] = [{ sortBy, sortOrder }];

  const paginatedLineItemList = {
    data: lineItems,
    page,
    totalPages,
    totalCount,
    pageSize,
    hasNextPage,
    hasPreviousPage,
    sort: sortOption,
  };
  return paginatedLineItemList;
}
