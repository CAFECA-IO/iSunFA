// Info: (20240807 - Murky) This repo is for beta version, meant to congregate all invoice repo related functions
import prisma from '@/client';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { IInvoiceBeta, IInvoiceIncludePaymentJournal } from '@/interfaces/invoice';
import {
  calculateTotalPages,
  getTimestampNow,
  pageToOffset,
  timestampInSeconds,
} from '@/lib/utils/common';
import { Prisma } from '@prisma/client';
import { IPaginatedData } from '@/interfaces/pagination';
import { SortBy } from '@/constants/journal';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { SortOrder } from '@/constants/sort';
/**
 * This function can find Unique Invoice by invoiceId, companyId is optional
 * @param {number} invoiceId you want to find
 * @param {number | undefined} companyId if you want to add more condition, use companyId, otherwise is undefined
 * @returns {Promise<IInvoiceIncludePaymentJournal | null>} return include payment and journal, will be null if not found or error
 */
export async function findUniqueInvoiceById(
  invoiceId: number,
  companyId?: number
): Promise<IInvoiceIncludePaymentJournal | null> {
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
      // Todo: (20240822 - Anna) [Beta] feat. Murky - 使用 logger
    }
  } catch (error) {
    // Todo: (20240822 - Anna) [Beta] feat. Murky - 使用 logger
  }
  return invoice;
}

/**
 * Create invoice by invoiceData, connect to paymentId and journalId, imageUrl is optional
 * @param {IInvoiceBeta} invoiceData Invoice Data to be created
 * @param {number} paymentId Payment Id to be connected
 * @param {number} journalId Journal Id to be connected
 * @param {string | undefined} imageUrl (Optional) Image(invoice) Url to be shown
 * @returns {Promise<IInvoiceIncludePaymentJournal | null>} return include payment and journal, will be null if not found or error
 */
export async function createInvoice(
  invoiceData: IInvoiceBeta,
  paymentId: number,
  journalId: number,
  imageUrl?: string
) {
  const nowInSecond = getTimestampNow();
  const invoiceCreatedDate = timestampInSeconds(invoiceData.date);

  let invoiceBeCreated: IInvoiceIncludePaymentJournal | null = null;

  const paymentConnect: Prisma.PaymentCreateNestedOneWithoutInvoiceInput = {
    connect: {
      id: paymentId,
    },
  };

  const journalConnect: Prisma.JournalCreateNestedOneWithoutInvoiceInput = {
    connect: {
      id: journalId,
    },
  };
  const dataToBeCreated: Prisma.InvoiceCreateInput = {
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
    createdAt: nowInSecond,
    updatedAt: nowInSecond,
    payment: paymentConnect,
    journal: journalConnect,
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

  const invoiceCreateArgs = {
    data: dataToBeCreated,
    include,
  };

  try {
    invoiceBeCreated = await prisma.invoice.create(invoiceCreateArgs);
  } catch (error) {
    // Todo: (20240822 - Anna) [Beta] feat. Murky - 使用 logger
  }

  return invoiceBeCreated;
}

/**
 * Update invoice by invoiceData, connect to paymentId and journalId and update imageUrl
 * @param {IInvoiceBeta} invoiceData Invoice Data to be created
 * @param {string | undefined} imageUrl (Optional) Image(invoice) Url to be shown
 * @param {number} paymentId (Optional) Payment Id to be connected
 * @param {number} journalId (Optional) Journal Id to be connected
 * @returns {Promise<IInvoiceIncludePaymentJournal | null>} return include payment and journal, will be null if not found or error
 */
export async function updateInvoice(
  invoiceId: number,
  invoiceData: IInvoiceBeta,
  imageUrl?: string,
  paymentId?: number,
  journalId?: number
) {
  const invoiceUpdatedDate = timestampInSeconds(invoiceData.date);

  let invoiceBeUpdated: IInvoiceIncludePaymentJournal | null = null;

  const paymentConnect: Prisma.PaymentUpdateOneRequiredWithoutInvoiceNestedInput = {
    connect: {
      id: paymentId,
    },
  };

  const journalConnect: Prisma.JournalUpdateOneRequiredWithoutInvoiceNestedInput = {
    connect: {
      id: journalId,
    },
  };

  const dataToBeUpdated: Prisma.InvoiceUpdateInput = {
    number: invoiceData.number,
    type: invoiceData.type,
    date: invoiceUpdatedDate,
    eventType: invoiceData.eventType,
    paymentReason: invoiceData.paymentReason,
    description: invoiceData.description,
    vendorTaxId: invoiceData.vendorTaxId,
    vendorOrSupplier: invoiceData.vendorOrSupplier,
    imageUrl,
    payment: paymentConnect,
    journal: journalConnect,
  };

  if (paymentId !== undefined) {
    dataToBeUpdated.payment = paymentConnect;
  }

  if (journalId !== undefined) {
    dataToBeUpdated.journal = journalConnect;
  }

  const include = {
    payment: true,
    journal: {
      include: {
        project: true,
        contract: true,
      },
    },
  };

  const invoiceUpdateArgs = {
    where: {
      id: invoiceId,
    },
    data: dataToBeUpdated,
    include,
  };

  try {
    invoiceBeUpdated = await prisma.invoice.update(invoiceUpdateArgs);
  } catch (error) {
    // Todo: (20240822 - Anna) [Beta] feat. Murky - 使用 logger
  }

  return invoiceBeUpdated;
}

/**
 * list invoices, return paginated data
 * @param {number} companyId company id to find invoices
 * @param {number} page (optional) page number, default is 1
 * @param {number} pageSize (optional) how many records per page, default is 10
 * @param {SortBy} sortBy (optional) sort by field, default is created at, check constants/journal.ts for more details
 * @param {SortOrder} sortOrder (optional) sort order, default is newest first, check constants/journal.ts for more details
 * @param {string} eventType (optional) event type
 * @param {number} startDateInSecond (optional) start date in second
 * @param {number} endDateInSecond (optional) end date in second
 * @param {string} searchQuery (optional) search query, it
 * @returns {Promise<IPaginatedData<IInvoiceIncludePaymentJournal[]>>} return paginated data of invoices
 */
export async function listInvoice({
  companyId,
  page = DEFAULT_PAGE_NUMBER,
  pageSize = DEFAULT_PAGE_NUMBER,
  sortBy = SortBy.CREATED_AT,
  sortOrder = SortOrder.DESC,
  eventType = undefined,
  startDateInSecond = undefined,
  endDateInSecond = undefined,
  searchQuery = undefined,
}: {
  companyId: number;
  page: number;
  pageSize: number;
  sortBy: SortBy;
  sortOrder: SortOrder;
  eventType?: string;
  startDateInSecond?: number;
  endDateInSecond?: number;
  searchQuery?: string;
}): Promise<IPaginatedData<IInvoiceIncludePaymentJournal[]>> {
  let invoices: IInvoiceIncludePaymentJournal[] = [];
  const where: Prisma.InvoiceWhereInput = {
    journal: {
      companyId,
    },
    eventType,
    createdAt: {
      gte: startDateInSecond,
      lte: endDateInSecond,
    },
    AND: [
      { OR: [{ deletedAt: 0 }, { deletedAt: null }] },
      {
        OR: [
          { number: { contains: searchQuery, mode: 'insensitive' } },
          { vendorTaxId: { contains: searchQuery, mode: 'insensitive' } },
          { vendorOrSupplier: { contains: searchQuery, mode: 'insensitive' } },
          { description: { contains: searchQuery, mode: 'insensitive' } },
        ],
      },
    ],
  };

  const totalCount = await prisma.invoice.count({ where });
  const totalPages = calculateTotalPages(totalCount, pageSize);

  if (totalPages > 0 && (page < 1 || page > totalPages)) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const orderBy =
    sortBy === SortBy.PAYMENT_PRICE
      ? { invoice: { payment: { price: sortOrder } } }
      : { [sortBy]: sortOrder };

  const include = {
    payment: true,
    journal: {
      include: {
        project: true,
        contract: true,
      },
    },
  };

  const skip = pageToOffset(page, pageSize);

  const findManyArgs = {
    where,
    orderBy,
    include,
    take: pageSize + 1,
    skip,
  };

  try {
    invoices = await prisma.invoice.findMany(findManyArgs);
  } catch (error) {
    // Todo: (20240822 - Anna) [Beta] feat. Murky - 使用 logger
  }

  const hasNextPage = invoices.length > pageSize;
  const hasPreviousPage = page > 1;

  if (invoices.length > pageSize) {
    invoices.pop(); // 移除多余的记录
  }

  const sort: {
    sortBy: string; // 排序欄位的鍵
    sortOrder: string; // 排序欄位的值
  }[] = [{ sortBy, sortOrder }];

  const paginatedInvoiceList = {
    data: invoices,
    page,
    totalPages,
    totalCount,
    pageSize,
    hasNextPage,
    hasPreviousPage,
    sort,
  };

  return paginatedInvoiceList;
}
