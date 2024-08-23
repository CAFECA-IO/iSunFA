import prisma from '@/client';
import { ReportSheetType, ReportStatusType, ReportType } from '@/constants/report';
// import { IAccountReadyForFrontend } from '@/interfaces/accounting_account';
import { Prisma, Report } from '@prisma/client';
import { getTimestampNow, pageToOffset } from '@/lib/utils/common';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IReportIncludeCompanyProject } from '@/interfaces/report';

export async function findFirstReportByFromTo(
  companyId: number,
  fromInSecond: number,
  toInSecond: number,
  reportSheetType: ReportSheetType
) {
  let report: Report | null = null;

  try {
    report = await prisma.report.findFirst({
      where: {
        companyId,
        from: fromInSecond,
        to: toInSecond,
        reportType: reportSheetType,
      },
    });
  } catch (error) {
    // Todo: (20240822 - Anna) [Beta] feat. Murky - 使用 logger
  }

  return report;
}

export async function findUniqueReportById(reportId: number) {
  let report: IReportIncludeCompanyProject | null = null;

  try {
    report = await prisma.report.findUnique({
      where: {
        id: reportId,
        OR: [{ deletedAt: 0 }, { deletedAt: null }],
      },
      include: {
        company: true,
        project: true,
      },
    });
  } catch (error) {
    report = null;
    // Todo: (20240822 - Anna) [Beta] feat. Murky - 使用 logger
  }

  return report;
}

export async function getReportIdByFromTo(
  companyId: number,
  fromInSecond: number,
  toInSecond: number,
  reportSheetType: ReportSheetType
) {
  let report: { id: number } | null = null;

  try {
    report = await prisma.report.findFirst({
      where: {
        companyId,
        from: fromInSecond,
        to: toInSecond,
        reportType: reportSheetType,
      },
      select: {
        id: true,
      },
    });
  } catch (error) {
    // Todo: (20240822 - Anna) [Beta] feat. Murky - 使用 logger
  }

  return report?.id;
}

export async function createReport(
  companyId: number,
  projectId: number | null,
  name: string,
  fromInSecond: number,
  toInSecond: number,
  reportType: ReportType,
  reportSheetType: ReportSheetType,
  content: object,
  status: ReportStatusType
) {
  const nowInSecond = getTimestampNow();
  let report: Report | null = null;

  try {
    report = await prisma.report.create({
      data: {
        companyId,
        projectId,
        name,
        from: fromInSecond,
        to: toInSecond,
        type: reportType,
        reportType: reportSheetType,
        content: JSON.stringify(content),
        status,
        createdAt: nowInSecond,
        updatedAt: nowInSecond,
      },
    });
  } catch (error) {
    // Todo: (20240822 - Anna) [Beta] feat. Murky - 使用 logger
  }

  return report;
}

export async function findManyReports(
  companyId: number,
  status: ReportStatusType = ReportStatusType.PENDING,
  targetPage: number = DEFAULT_PAGE_NUMBER,
  pageSize: number = DEFAULT_PAGE_LIMIT,
  sortBy: 'createdAt' | 'name' | 'type' | 'reportType' | 'status' = 'createdAt',
  sortOrder: 'asc' | 'desc' = 'desc',
  startDateInSecond?: number,
  endDateInSecond?: number,
  searchQuery?: string
) {
  let reports: IReportIncludeCompanyProject[] = [];
  const where: Prisma.ReportWhereInput = {
    id: {
      gte: 10000000, // Info
    },
    companyId,
    status,
    AND: [
      // { from: { gte: startDateInSecond } },
      { to: { lte: endDateInSecond } },
      { OR: [{ deletedAt: 0 }, { deletedAt: null }] },
      {
        OR: [
          { name: { contains: searchQuery, mode: 'insensitive' } },
          { type: { contains: searchQuery, mode: 'insensitive' } },
          { reportType: { contains: searchQuery, mode: 'insensitive' } },
        ],
      },
    ],
  };

  const orderBy: Prisma.ReportOrderByWithRelationInput = { [sortBy]: sortOrder };

  const include: Prisma.ReportInclude = {
    project: true,
  };

  const findManyArgs = {
    where,
    orderBy,
    include,
  };
  try {
    reports = await prisma.report.findMany(findManyArgs);
  } catch (error) {
    // Todo: (20240822 - Anna) [Beta] feat. Murky - 使用 logger
  }

  const filteredReports = reports.filter((report) => {
    if (report.reportType !== ReportSheetType.BALANCE_SHEET && startDateInSecond !== undefined) {
      return report.from >= startDateInSecond;
    }
    return true;
  });

  const totalCount = filteredReports.length;
  const totalPages = Math.ceil(totalCount / pageSize);

  if (targetPage < 1) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const skip = pageToOffset(targetPage, pageSize);

  const paginatedReports = filteredReports.slice(skip, skip + pageSize);

  const hasNextPage = skip + pageSize < totalCount;
  const hasPreviousPage = targetPage > 1;

  return {
    data: paginatedReports,
    page: targetPage,
    totalPages,
    totalCount,
    pageSize,
    hasNextPage,
    hasPreviousPage,
    sortOrder,
    sortBy,
  };
}
