import prisma from '@/client';
import { ReportSheetType, ReportStatusType, ReportType } from '@/constants/report';
import { IAccountForSheetDisplay } from '@/interfaces/accounting_account';
import { Prisma, Report } from '@prisma/client';
import { getTimestampNow, pageToOffset } from '@/lib/utils/common';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IReportIncludeProject } from '@/interfaces/report';

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
    // Deprecate: (20240710 - Murky) Debugging perpose
    // eslint-disable-next-line no-console
    console.error(error);
  }

  return report;
}

export async function findUniqueReportById(reportId: number) {
  let report: Report | null = null;

  try {
    report = await prisma.report.findUnique({
      where: {
        id: reportId,
      },
    });
  } catch (error) {
    report = null;
    // Deprecate: (20240710 - Murky) Debugging perpose
    // eslint-disable-next-line no-console
    console.error(error);
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
    // Deprecate: (20240710 - Murky) Debugging perpose
    // eslint-disable-next-line no-console
    console.error(error);
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
  content: IAccountForSheetDisplay[],
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
    // Deprecate: (20240710 - Murky) Debugging purpose
    // eslint-disable-next-line no-console
    console.error(error);
  }

  return report;
}

export async function findManyReports(
    companyId: number,
    status: ReportStatusType,
    targetPage: number = DEFAULT_PAGE_NUMBER,
    pageSize: number = DEFAULT_PAGE_LIMIT,
    sortBy: 'createdAt' | 'name' | 'type' | 'reportType' | 'status' = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
    startDateInSecond?: number,
    endDateInSecond?: number,
    searchQuery?: string
) {
    let reports: IReportIncludeProject[] = [];

    const where: Prisma.ReportWhereInput = {
        companyId,
        status,
        AND: [
            { from: { gte: startDateInSecond } },
            { to: { lte: endDateInSecond } },
        ],
        OR: searchQuery ? [
            { name: { contains: searchQuery, mode: 'insensitive' } },
            { type: { contains: searchQuery, mode: 'insensitive' } },
            { reportType: { contains: searchQuery, mode: 'insensitive' } },
            { status: { contains: searchQuery, mode: 'insensitive' } },
        ] : undefined,
    };

    const totalCount = await prisma.report.count({ where });
    const totalPages = Math.ceil(totalCount / pageSize);

    if (targetPage < 1) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    }

    const orderBy: Prisma.ReportOrderByWithRelationInput = { [sortBy]: sortOrder };

    const include: Prisma.ReportInclude = {
        project: true,
    };

    const skip = pageToOffset(targetPage, pageSize);

    const findManyArgs = {
        where,
        orderBy,
        include,
        skip,
        take: pageSize,
    };
    try {
        reports = await prisma.report.findMany(findManyArgs);
    } catch (error) {
        // Deprecate: (20240710 - Murky) Debugging purpose
        // eslint-disable-next-line no-console
        console.error(error);
    }

    const hasNextPage = reports.length > pageSize;
    const hasPreviousPage = targetPage > 1;

    if (hasNextPage) {
        reports.pop();
    }

    return {
        data: reports,
        page: targetPage,
        totalPages,
        totalCount,
        pageSize,
        hasNextPage,
        hasPreviousPage,
        sortOrder,
        sortBy
    };
}
