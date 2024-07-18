import type { NextApiRequest, NextApiResponse } from 'next';
import { IPaginatedPendingReportItem, IPendingReportItem } from '@/interfaces/report_item';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse, isParamNumeric, isParamString } from '@/lib/utils/common';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { ReportStatusType } from '@/constants/report';
import { findManyReports } from '@/lib/utils/repo/report.repo';
import { formatIPendingReportItem } from '@/lib/utils/formatter/report.formatter';
import { getSession } from '@/lib/utils/session';

export function formatTargetPageFromQuery(targetPage: string | string[] | undefined) {
  let targetPageNumber = DEFAULT_PAGE_NUMBER;

  if (isParamNumeric(targetPage)) {
    targetPageNumber = parseInt(targetPage as string, 10);
  }
  return targetPageNumber;
}

export function formatPageSizeFromQuery(pageSize: string | string[] | undefined) {
  let pageSizeNumber = DEFAULT_PAGE_LIMIT;

  if (isParamNumeric(pageSize)) {
    pageSizeNumber = parseInt(pageSize as string, 10);
  }
  return pageSizeNumber;
}

export function formatSortByFromQuery(sortBy: string | string[] | undefined) {
  let sortByString: 'createdAt' | 'name' | 'type' | 'reportType' | 'status' = 'createdAt';
  const allowSortBy = ['createdAt', 'name', 'type', 'reportType', 'status'];
  if (isParamString(sortBy) && allowSortBy.includes(sortBy as string)) {
    sortByString = sortBy as 'createdAt' | 'name' | 'type' | 'reportType' | 'status';
  }
  return sortByString;
}

export function formatSortOrderFromQuery(sortOrder: string | string[] | undefined) {
  let sortOrderString: 'desc' | 'asc' = 'desc';

  if (isParamString(sortOrder)) {
    sortOrderString = sortOrder === 'asc' ? 'asc' : 'desc';
  }
  return sortOrderString;
}

export function formatDateInSecondFromQuery(dateInSecond: string | string[] | undefined) {
  let dateInSecondNumber: number | undefined;

  if (isParamNumeric(dateInSecond)) {
    dateInSecondNumber = parseInt(dateInSecond as string, 10);
  }
  return dateInSecondNumber;
}

export function formatSearchQueryFromQuery(searchQuery: string | string[] | undefined) {
  let searchQueryString: string | undefined;

  if (isParamString(searchQuery)) {
    searchQueryString = searchQuery as string;
  }
  return searchQueryString;
}

export function formatGetRequestQuery(req: NextApiRequest) {
  const { targetPage, pageSize, sortBy, sortOrder, startDateInSecond, endDateInSecond, searchQuery } = req.query;

  const statusString = ReportStatusType.PENDING;
  const targetPageNumber = formatTargetPageFromQuery(targetPage);
  const pageSizeNumber = formatPageSizeFromQuery(pageSize);
  const sortByString = formatSortByFromQuery(sortBy);
  const sortOrderString = formatSortOrderFromQuery(sortOrder);
  const startDateInSecondFromQuery = formatDateInSecondFromQuery(startDateInSecond);
  const endDateInSecondFromQuery = formatDateInSecondFromQuery(endDateInSecond);
  const searchQueryString = formatSearchQueryFromQuery(searchQuery);
  return { statusString, targetPageNumber, pageSizeNumber, sortByString, sortOrderString, startDateInSecondFromQuery, endDateInSecondFromQuery, searchQueryString };
}

export async function handleGetRequest(companyId: number, req: NextApiRequest): Promise<IPaginatedPendingReportItem> {
  const { targetPageNumber, pageSizeNumber, sortByString, sortOrderString, startDateInSecondFromQuery, endDateInSecondFromQuery, searchQueryString } = formatGetRequestQuery(req);
  const pendingData = await findManyReports(companyId, ReportStatusType.PENDING, targetPageNumber, pageSizeNumber, sortByString, sortOrderString, startDateInSecondFromQuery, endDateInSecondFromQuery, searchQueryString);
  const pendingReportItems: IPendingReportItem[] = pendingData.data.map((data) => {
    return formatIPendingReportItem(data);
  });

  const paginatedPendingReportItem: IPaginatedPendingReportItem = {
    data: pendingReportItems,
    page: pendingData.page,
    totalPages: pendingData.totalPages
  };
  return paginatedPendingReportItem;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData< IPaginatedPendingReportItem | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPaginatedPendingReportItem | null = null;
  try {
    const session = await getSession(req, res);
    const { companyId } = session;

    // ToDo: (20240703 - Murky) Need to check Auth
    switch (req.method) {
      case 'GET': {
        payload = await handleGetRequest(companyId, req);
        statusMessage = STATUS_MESSAGE.CREATED;
        break;
      }
      default: {
        break;
      }
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
  }
  const { httpCode, result } = formatApiResponse<IPaginatedPendingReportItem | null>(statusMessage, payload);
  res.status(httpCode).json(result);
}
