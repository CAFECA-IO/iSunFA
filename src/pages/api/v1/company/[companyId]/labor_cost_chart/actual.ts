import type { NextApiRequest, NextApiResponse } from 'next';
import { ILaborCostChartData, DUMMY_LABOR_COST_CHART_DATA } from '@/interfaces/labor_cost_chart';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import prisma from '@/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ILaborCostChartData>>
) {
  try {
    if (req.method !== 'GET') {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
    const { date } = req.query;
    console.log("h111111i");
    // get workrate all data from db
    const data = await prisma.workRate.findMany();
    console.log(data);
    res.status(httpCode).json(result);
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<ILaborCostChartData>(
      error.message,
      {} as ILaborCostChartData
    );
    res.status(httpCode).json(result);
  }
}
