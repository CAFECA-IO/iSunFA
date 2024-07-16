import type { NextApiRequest, NextApiResponse } from 'next';
import { IReportOld } from '@/interfaces/report';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';
import prisma from '@/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IReportOld>>
) {
  try {
    if (req.method !== 'GET') {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
    const { reportId } = req.query;
    const reportIdNumber = Number(reportId);
    const reportInfo = await prisma.report.findUnique({
      where: {
        id: reportIdNumber,
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
    const { httpCode, result } = formatApiResponse<IReportOld>(
      STATUS_MESSAGE.SUCCESS_GET,
      responseReportInfo as IReportOld
    );
    res.status(httpCode).json(result);
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IReportOld>(error.message, {} as IReportOld);
    res.status(httpCode).json(result);
  }
}
