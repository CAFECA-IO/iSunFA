import type { NextApiRequest, NextApiResponse } from 'next';
import version from '@/lib/version';
import { RESPONSE_STATUS_CODE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { HttpMethod } from '@/constants/api_connection';
import { IFinancialReportsProgreseStatusResponse } from '@/interfaces/report';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IFinancialReportsProgreseStatusResponse[] | null>>
) {
  const { companyId } = req.query;
  if (req.method !== HttpMethod.GET) {
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
    powerby: `ISunFa api ${version}`,
    success: true,
    code: String(RESPONSE_STATUS_CODE.success),
    message: `Get financial report progress status of company id:${companyId} return successfully`,
    payload: [],
  });
}
