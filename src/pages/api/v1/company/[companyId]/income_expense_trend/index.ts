import type { NextApiRequest, NextApiResponse } from 'next';
import { IIncomeExpenseTrendChartData } from '@/interfaces/income_expense_trend_chart';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { MONTH_FULL_LIST_SHORT } from '@/constants/display';
import prisma from '@/client';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { getSession } from '@/lib/utils/session';
import { AuthFunctionsKeys } from '@/interfaces/auth';

async function makeSeriesAnnotations(
  totalIncome: number[],
  totalExpense: number[],
  totalProfit: number[]
) {
  const series = [
    {
      name: 'Income',
      data: totalIncome,
    },
    {
      name: 'Expense',
      data: totalExpense,
    },
    {
      name: 'Profit Status',
      data: totalProfit,
    },
  ];
  const annotations = [
    {
      name: 'Income',
      data: totalIncome.map((ele) => ({ absolute: ele })),
    },
    {
      name: 'Expense',
      data: totalExpense.map((ele) => ({ absolute: ele })),
    },
    {
      name: 'Profit Status',
      data: totalProfit.map((ele) => ({ absolute: ele })),
    },
  ];
  return { series, annotations };
}

async function getIncomeExpenseTrendChartData(
  period: string,
  companyId: number
): Promise<IIncomeExpenseTrendChartData> {
  // Info: (20240528 - Gibbs) use raw sql to get data from prisma cashflow groupBy year, month, sum income and expense
  const incomeExpenseData: {
    year: string;
    month: string;
    total_income: number;
    total_expense: number;
  }[] = await prisma.$queryRaw`
      SELECT 
      EXTRACT(YEAR FROM TO_TIMESTAMP("created_at")) AS year, 
      EXTRACT(MONTH FROM TO_TIMESTAMP("created_at")) AS month, 
      SUM(income) AS total_income, 
      SUM(expense) AS total_expense
      FROM 
          income_expense
      WHERE
          "company_id" = ${companyId}
      GROUP BY 
          1, 2
      ORDER BY 
          1 ASC, 2 ASC;`;
  const totalIncome: number[] = [];
  const totalExpense: number[] = [];
  const totalProfit: number[] = [];
  if (period === 'month') {
    const categories = MONTH_FULL_LIST_SHORT;
    // Info: (20240528 - Gibbs) use 0 if no data found in month
    categories.forEach((_, index) => {
      const targetYear = new Date().getFullYear();
      const data = incomeExpenseData.find(
        (ele) => Number(ele.year) === targetYear && Number(ele.month) === index + 1
      );
      if (data) {
        totalIncome.push(Number(data.total_income));
        totalExpense.push(Number(data.total_expense));
        totalProfit.push(Number(data.total_income) - Number(data.total_expense));
      } else {
        totalIncome.push(0);
        totalExpense.push(0);
        totalProfit.push(0);
      }
    });
    const { series, annotations } = await makeSeriesAnnotations(
      totalIncome,
      totalExpense,
      totalProfit
    );
    const emptyTotalIncome = totalIncome.every((ele) => ele === 0);
    const emptyTotalExpense = totalExpense.every((ele) => ele === 0);
    const empty = emptyTotalIncome && emptyTotalExpense;
    const IncomeExpenseTrendChartData: IIncomeExpenseTrendChartData = {
      categories,
      series,
      annotations,
      empty,
    };
    return IncomeExpenseTrendChartData;
  }
  if (period === 'year') {
    const categories: string[] = [];
    // Info: (20240528 - Gibbs) get only year data from incomeExpenseData
    incomeExpenseData.forEach((ele) => {
      const currentYear = ele.year.toString();
      if (!categories.includes(currentYear)) {
        categories.push(currentYear);
      }
    });
    // Info: (20240528 - Gibbs) calculate total income, expense, profit by year using incomeExpenseData
    incomeExpenseData.forEach((ele) => {
      const currentYear = ele.year.toString();
      const index = categories.indexOf(currentYear);
      totalIncome[index] = totalIncome[index]
        ? Number(totalIncome[index]) + Number(ele.total_income)
        : Number(ele.total_income);
      totalExpense[index] = totalExpense[index]
        ? Number(totalExpense[index]) + Number(ele.total_expense)
        : Number(ele.total_expense);
      totalProfit[index] = totalIncome[index] - totalExpense[index];
    });
    const { series, annotations } = await makeSeriesAnnotations(
      totalIncome,
      totalExpense,
      totalProfit
    );
    const empty = categories.length === 0;
    const IncomeExpenseTrendChartData: IIncomeExpenseTrendChartData = {
      categories,
      series,
      annotations,
      empty,
    };
    return IncomeExpenseTrendChartData;
  }
  return {} as IIncomeExpenseTrendChartData;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IIncomeExpenseTrendChartData>>
) {
  try {
    if (req.method !== 'GET') {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
    const session = await getSession(req);
    const { userId, companyId } = session;
    const isAuth = await checkAuthorization([AuthFunctionsKeys.admin], { userId, companyId });
    if (!isAuth) {
      throw new Error(STATUS_MESSAGE.FORBIDDEN);
    }
    const { period = 'month' } = req.query;
    const responseData = await getIncomeExpenseTrendChartData(period as string, companyId);
    const { httpCode, result } = formatApiResponse<IIncomeExpenseTrendChartData>(
      STATUS_MESSAGE.SUCCESS_GET,
      responseData
    );
    res.status(httpCode).json(result);
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IIncomeExpenseTrendChartData>(
      error.message,
      {} as IIncomeExpenseTrendChartData
    );
    res.status(httpCode).json(result);
  }
}
