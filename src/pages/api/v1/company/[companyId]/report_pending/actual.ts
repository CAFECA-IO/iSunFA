import type { NextApiRequest, NextApiResponse } from 'next';
import { IPendingReportItem } from '@/interfaces/report_item';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import prisma from '@/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IPendingReportItem[] | IPendingReportItem>>
) {
  try {
    if (req.method !== 'GET') {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
    const pendingReportItems: IPendingReportItem[] = [];
    const pendingReportsData = await prisma.report.findMany({
      where: {
        status: 'pending',
      },
    });
    if (pendingReportsData.length > 0) {
      pendingReportsData.forEach((report) => {
        const pendingReport = {
          id: (report.id).toString(),
          name: report.name,
          createdTimestamp: report.createdAt,
          period: {
            startTimestamp: report.from,
            endTimestamp: report.to,
          },
          type: report.type,
          reportType: report.reportType,
          paused: report.paused,
          remainingSeconds: report.remainingSeconds,
        };
        pendingReportItems.push(pendingReport as IPendingReportItem);
      });
    }
    const { httpCode, result } = formatApiResponse<IPendingReportItem[]>(
      STATUS_MESSAGE.SUCCESS_GET,
      pendingReportItems
    );
    res.status(httpCode).json(result);
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IPendingReportItem>(
      error.message,
      {} as IPendingReportItem
    );
    res.status(httpCode).json(result);
  }
}
