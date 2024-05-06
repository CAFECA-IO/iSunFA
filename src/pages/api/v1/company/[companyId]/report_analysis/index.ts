import type { NextApiRequest, NextApiResponse } from 'next';
import version from '@/lib/version';
import { IAnalysisReport, IAnalysisReportRequest } from '@/interfaces/report';
import { IResponseData } from '@/interfaces/response_data';

const mockAnalysisReportUrl: IAnalysisReport = 'http://www.google.com.br';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAnalysisReport>>
) {
  const {
    type,
    language,
    start_date: startDate,
    end_date: endDate,
  }: IAnalysisReportRequest = req.body;
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
  // Financial Performance / Cost Analysis / HR Utilization / Forecast Report
  if (
    type !== 'Financial Performance' &&
    type !== 'Cost Analysis' &&
    type !== 'HR Utilization' &&
    type !== 'Forecast Report'
  ) {
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
    payload: mockAnalysisReportUrl,
  });
}
