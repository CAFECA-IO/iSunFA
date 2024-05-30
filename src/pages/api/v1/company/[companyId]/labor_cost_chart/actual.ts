import type { NextApiRequest, NextApiResponse } from 'next';
import { ILaborCostChartData } from '@/interfaces/labor_cost_chart';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
// import prisma from '@/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ILaborCostChartData>>
) {
  try {
    if (req.method !== 'GET') {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
    // (Todo: use date to get data from db)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { date } = req.query;
    // get workrate all data from db
    // const data = await prisma.workRate.findMany();
    // res.status(httpCode).json(result);
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<ILaborCostChartData>(
      error.message,
      {} as ILaborCostChartData
    );
    res.status(httpCode).json(result);
  }
}
