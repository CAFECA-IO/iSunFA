import type { NextApiRequest, NextApiResponse } from 'next';
import { IReport } from '@/interfaces/report';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';
import prisma from '@/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IReport>>
) {
  try {
    if (req.method !== 'GET') {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
    const { reportId } = req.query;
    const reportIdNumber = Number(reportId);
    const reportInfo = await prisma.report.findUnique({
      where: {
        id: reportIdNumber as number,
      },
    });
    if (!reportInfo) {
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }
    const responseReportInfo = {
      reportTypesName: {
        id: reportInfo.reportType,
        name: reportInfo.name,
      },
      tokenContract: reportInfo.tokenContract,
      tokenId: reportInfo.tokenId,
      reportLink: reportInfo.reportLink,
    };
    const { httpCode, result } = formatApiResponse<IReport>(
      STATUS_MESSAGE.SUCCESS_GET,
      responseReportInfo as IReport
    );
    res.status(httpCode).json(result);
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IReport>(
      error.message,
      {} as IReport
    );
    res.status(httpCode).json(result);
  }
}
