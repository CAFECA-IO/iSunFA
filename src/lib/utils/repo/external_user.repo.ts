import prisma from '@/client';
import { LeaveStatus, Prisma, PrismaClient } from '@prisma/client';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { getTimestampNow } from '@/lib/utils/common';
import { IExternalUser } from '@/interfaces/external_user';
import { ReportSheetType } from '@/constants/report';

export const createExternalUser = async (
  options: IExternalUser,
  tx: Prisma.TransactionClient | PrismaClient = prisma
): Promise<IExternalUser> => {
  if (!options.userId || !options.externalId || !options.externalProvider) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_DATA);
  }
  const nowInSecond = getTimestampNow();
  const data = {
    userId: options.userId,
    externalId: options.externalId,
    externalProvider: options.externalProvider,
    createdAt: nowInSecond,
    updatedAt: nowInSecond,
  };

  try {
    const externalUser: IExternalUser = (await tx.externalUser.create({
      data,
    })) as IExternalUser;
    return externalUser;
  } catch (error) {
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }
};

export const getExternalUserByProviderAndUid = async (
  options: { externalProvider: string; externalId: string },
  tx: Prisma.TransactionClient | PrismaClient = prisma
) => {
  if (!options.externalId || !options.externalProvider) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_DATA);
  }

  try {
    const externalUser = await tx.externalUser.findFirst({
      where: {
        externalProvider: options.externalProvider,
        externalId: options.externalId,
      },
      include: {
        user: true,
      },
    });

    return externalUser;
  } catch (error) {
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }
};

// Info: (20250703 - Julian) 從 userId 獲取帳本資訊
export const getAccountBookByUserId = async (
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
    const accountBooks = await tx.company.findMany({
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
        companyId: {
          in: accountBookIds,
        },
      },
      select: {
        id: true,
        reportType: true,
        companyId: true,
      },
    });

    // Info: (20250704 - Julian) Step 4: 整理成指定格式
    const reportLinks = accountBookIds
      .map((accountBook) => {
        const balanceReport = reports.find(
          (report) =>
            report.companyId === accountBook && report.reportType === ReportSheetType.BALANCE_SHEET
        );
        const cashFlowReport = reports.find(
          (report) =>
            report.companyId === accountBook &&
            report.reportType === ReportSheetType.CASH_FLOW_STATEMENT
        );
        const comprehensiveIncomeReport = reports.find(
          (report) =>
            report.companyId === accountBook &&
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
