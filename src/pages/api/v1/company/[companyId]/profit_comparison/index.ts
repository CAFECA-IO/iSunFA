import type { NextApiRequest, NextApiResponse } from 'next';
import { IProjectROIComparisonChartDataWithPagination } from '@/interfaces/project_roi_comparison_chart';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { isTimestamp } from '@/lib/utils/type_guard/date';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { Prisma } from '@prisma/client';
import { getSession } from '@/lib/utils/session';
import { AuthFunctionsKeys } from '@/interfaces/auth';
import { getProjectLists, getIncomeExpenses } from '@/lib/utils/repo/profit_comparison.repo';

async function matchProjectListsAndIncomeExpenses(
  projectLists: {
    id: number;
    name: string;
  }[],
  incomeExpensesLists: (Prisma.PickEnumerable<
    Prisma.IncomeExpenseGroupByOutputType,
    'projectId'[]
  > & {
    _sum: {
      income: number | null;
      expense: number | null;
    };
  })[]
) {
  const categories: string[] = [];
  const income: number[] = [];
  const expense: number[] = [];

  projectLists.forEach((project) => {
    const match = incomeExpensesLists.find(
      (incomeExpense) => incomeExpense.projectId === project.id
    );
    if (match) {
      categories.push(project.name);
      // Info: (20240527 - Gibbs) add eslint-disable-next-line no-underscore-dangle for prisma groupBy function
      // eslint-disable-next-line no-underscore-dangle
      income.push(match._sum.income!);
      // Info: (20240527 - Gibbs) add eslint-disable-next-line no-underscore-dangle for prisma groupBy function
      // eslint-disable-next-line no-underscore-dangle
      expense.push(match._sum.expense!);
    }
  });
  return { categories, income, expense };
}

async function checkEmpty(categories: string[]) {
  return categories.length === 0;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IProjectROIComparisonChartDataWithPagination>>
) {
  const { startDate, endDate, currentPage = 1, itemsPerPage = 10 } = req.query;
  try {
    if (
      startDate &&
      endDate &&
      currentPage &&
      itemsPerPage &&
      isTimestamp(startDate as string) &&
      isTimestamp(endDate as string)
    ) {
      const session = await getSession(req, res);
      const { userId, companyId } = session;
      const isAuth = await checkAuthorization([AuthFunctionsKeys.admin], { userId, companyId });
      if (!isAuth) {
        throw new Error(STATUS_MESSAGE.FORBIDDEN);
      }
      const startDateTimeStampToNumber = Number(startDate);
      const endDateTimeStampToNumber = Number(endDate);
      const projectLists = await getProjectLists(companyId);
      const incomeExpensesLists = await getIncomeExpenses(
        startDateTimeStampToNumber,
        endDateTimeStampToNumber,
        companyId
      );
      const { categories, income, expense } = await matchProjectListsAndIncomeExpenses(
        projectLists,
        incomeExpensesLists
      );
      const isEmpty = await checkEmpty(categories);
      const { httpCode, result } = formatApiResponse<IProjectROIComparisonChartDataWithPagination>(
        STATUS_MESSAGE.SUCCESS_GET,
        {
          startDate: startDateTimeStampToNumber,
          endDate: endDateTimeStampToNumber,
          categories,
          series: [income, expense],
          currentPage: Number(currentPage),
          totalPages: Math.ceil(categories.length / Number(itemsPerPage)),
          empty: isEmpty,
        }
      );
      res.status(httpCode).json(result);
    }
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IProjectROIComparisonChartDataWithPagination>(
      error.message,
      {} as IProjectROIComparisonChartDataWithPagination
    );
    res.status(httpCode).json(result);
  }
}
