import type { NextApiRequest, NextApiResponse } from 'next';
import version from '@/lib/version';
import { ISalary, ISalaryRequest } from '@/interfaces/salary';
import { IResponseData } from '@/interfaces/response_data';

export default function handler(req: NextApiRequest, res: NextApiResponse<IResponseData<ISalary>>) {
  if (req.method === 'POST') {
    const { employeeId } = req.query;
    if (!employeeId) {
      res.status(400).json({
        powerby: 'iSunFA v' + version,
        success: false,
        code: '400',
        message: 'create salary bookkeeping failed',
        payload: {},
      });
      return;
    }
    const { description, start_date: startDate, end_date: endDate }: ISalaryRequest = req.body;
    if (!description || !startDate || !endDate) {
      res.status(400).json({
        powerby: 'iSunFA v' + version,
        success: false,
        code: '400',
        message: 'create salary bookkeeping failed',
        payload: {},
      });
      return;
    }
    res.status(200).json({
      powerby: 'iSunFA v' + version,
      success: true,
      code: '200',
      message: 'create salary bookkeeping successful',
      payload: {},
    });
  }
}
