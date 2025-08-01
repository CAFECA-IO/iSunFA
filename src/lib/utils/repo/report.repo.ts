import prisma from '@/client';
import { ReportSheetType, ReportStatusType, ReportType } from '@/constants/report';
// import { IAccountReadyForFrontend } from '@/interfaces/accounting_account'; // Info: (20240729 - Murky)
import { LeaveStatus, Prisma, PrismaClient, Report } from '@prisma/client';
import { getTimestampNow, pageToOffset } from '@/lib/utils/common';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IReportIncludeCompanyProject } from '@/interfaces/report';
import { SortOrder } from '@/constants/sort';
import { loggerError } from '@/lib/utils/logger_back';
import { DefaultValue } from '@/constants/default_value';

export async function findFirstReportByFromTo(
  accountBookId: number,
  fromInSecond: number,
  toInSecond: number,
  reportSheetType: ReportSheetType
) {
  let report: Report | null = null;

  try {
    report = await prisma.report.findFirst({
      where: {
        accountBookId,
        from: fromInSecond,
        to: toInSecond,
        reportType: reportSheetType,
      },
    });
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'find first report by from to in findFirstReportByFromTo failed',
      errorMessage: (error as Error).message,
    });
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
        accountBook: true,
        project: true,
      },
    });
  } catch (error) {
    report = null;
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'find unique report by id in findUniqueReportById failed',
      errorMessage: (error as Error).message,
    });
  }

  return report;
}

export async function getReportIdByFromTo(
  accountBookId: number,
  fromInSecond: number,
  toInSecond: number,
  reportSheetType: ReportSheetType
) {
  let report: { id: number } | null = null;

  try {
    report = await prisma.report.findFirst({
      where: {
        accountBookId,
        from: fromInSecond,
        to: toInSecond,
        reportType: reportSheetType,
      },
      select: {
        id: true,
      },
    });
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'get report id by from to in getReportIdByFromTo failed',
      errorMessage: (error as Error).message,
    });
  }

  return report?.id;
}

export async function createReport(
  accountBookId: number,
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
        accountBookId,
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
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'create report in createReport failed',
      errorMessage: (error as Error).message,
    });
  }

  return report;
}

export async function findManyReports(
  accountBookId: number,
  status: ReportStatusType = ReportStatusType.PENDING,
  targetPage: number = DEFAULT_PAGE_NUMBER,
  pageSize: number = DEFAULT_PAGE_LIMIT,
  sortBy: 'createdAt' | 'name' | 'type' | 'reportType' | 'status' = 'createdAt',
  sortOrder: SortOrder.ASC | SortOrder.DESC = SortOrder.DESC,
  startDateInSecond?: number,
  endDateInSecond?: number,
  searchQuery?: string
) {
  let reports: IReportIncludeCompanyProject[] = [];
  const where: Prisma.ReportWhereInput = {
    id: {
      gte: 10000000, // Info
    },
    accountBookId,
    status,
    AND: [
      // { from: { gte: startDateInSecond } }, // Info: (20240719 - Jacky)
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
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'find many reports in findManyReports failed',
      errorMessage: (error as Error).message,
    });
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

// Info: (20250703 - Julian) 從 userId 獲取帳本資訊
export const getReportByUserId = async (
  options: { userId: number },
  tx: Prisma.TransactionClient | PrismaClient = prisma
) => {
  if (!options.userId) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_DATA);
  }

  try {
    // Info: (20250703 - Julian) Step 1: 取得 user 擁有的 team
    const teams = await tx.teamMember.findMany({
      where: {
        userId: options.userId,
        status: LeaveStatus.IN_TEAM,
      },
      select: { teamId: true },
    });
    // Info: (20250703 - Julian) 抽取 teamId
    const teamIds = teams.map((team) => team.teamId);

    // Info: (20250703 - Julian) Step 2: 再從 team 取得 accountBook
    const accountBooks = await tx.accountBook.findMany({
      where: {
        teamId: {
          in: teamIds,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });
    // Info: (20250704 - Julian) 抽取 accountBook id
    const accountBookIds = accountBooks.map((accountBook) => accountBook.id);

    // Info: (20250704 - Julian) Step 3: 最後從 accountBook 取得 report id
    const reports = await tx.report.findMany({
      where: {
        accountBookId: {
          in: accountBookIds,
        },
      },
      select: {
        id: true,
        reportType: true,
        accountBookId: true,
      },
    });

    // Info: (20250704 - Julian) Step 4: 整理成指定格式
    const reportLinks = accountBookIds
      .map((accountBook) => {
        const balanceReport = reports.find(
          (report) =>
            report.accountBookId === accountBook &&
            report.reportType === ReportSheetType.BALANCE_SHEET
        );
        const cashFlowReport = reports.find(
          (report) =>
            report.accountBookId === accountBook &&
            report.reportType === ReportSheetType.CASH_FLOW_STATEMENT
        );
        const comprehensiveIncomeReport = reports.find(
          (report) =>
            report.accountBookId === accountBook &&
            report.reportType === ReportSheetType.INCOME_STATEMENT
        );

        return {
          name: accountBooks.find((ab) => ab.id === accountBook)?.name || '',
          balance: balanceReport
            ? `https://isunfa.tw/embed/view/${balanceReport.id}?report_type=balance`
            : '',
          cashFlow: cashFlowReport
            ? `https://isunfa.tw/embed/view/${cashFlowReport.id}?report_type=cash-flow`
            : '',
          comprehensiveIncome: comprehensiveIncomeReport
            ? `https://isunfa.tw/embed/view/${comprehensiveIncomeReport.id}?report_type=comprehensive-income`
            : '',
        };
      })
      .filter((report) => {
        // Info: (20250704 - Julian) 過濾掉沒有報表的帳本
        return report.balance || report.cashFlow || report.comprehensiveIncome;
      });

    return reportLinks;
  } catch (error) {
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }
};
