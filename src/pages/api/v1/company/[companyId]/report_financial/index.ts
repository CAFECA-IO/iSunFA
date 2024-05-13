import type { NextApiRequest, NextApiResponse } from 'next';
import version from '@/lib/version';
import {
  // IFinancialReport,
  IFinancialReportRequest,
  isFinancialReportType,
} from '@/interfaces/report';
import { IResponseData } from '@/interfaces/response_data';
import { IAccountResultStatus } from '@/interfaces/accounting_account';

// const mockFinancialReportUrl: IFinancialReport = 'http://www.google.com.br';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAccountResultStatus | null>>
) {
  const {
    type,
    language,
    start_date: startDate,
    end_date: endDate,
  }: IFinancialReportRequest = req.body;
  if (req.method !== 'POST' || !type || !language || !startDate || !endDate) {
    res.status(400).json({
      powerby: 'iSunFA v' + version,
      success: false,
      code: '400',
      message: 'bad request',
      payload: null,
    });
    return;
  }
  if (!isFinancialReportType(type)) {
    // if (type !== 'Balance Sheet' && type !== 'Income Statement' && type !== 'Cash Flow Statement') {
    res.status(400).json({
      powerby: 'iSunFA v' + version,
      success: false,
      code: '400',
      message: 'bad request',
      payload: null,
    });
    return;
  }
  res.status(200).json({
    powerby: 'iSunFA v' + version,
    success: true,
    code: '200',
    message: 'request successful',
    payload: {
      resultId: 'resultId',
      status: 'inProgress',
    },
  });
}
