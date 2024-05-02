import type { NextApiRequest, NextApiResponse } from 'next';
import version from '@/lib/version';

type ResponseData = string;

type ApiResponse = {
  powerby: string;
  success: boolean;
  code: string;
  message: string;
  payload: ResponseData[] | null;
};

const responseDataArray: ResponseData[] = [
  'Marketing',
  'Accounting',
  'Human Resource',
  'UI/UX',
  'PM',
  'Develop',
];

export default function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  if (req.method === 'GET') {
    const apiResponse: ApiResponse = {
      powerby: 'iSunFA v' + version,
      success: true,
      code: '200',
      message: 'request successful',
      payload: responseDataArray,
    };
    res.status(200).json(apiResponse);
  } else {
    const apiResponse: ApiResponse = {
      powerby: 'iSunFA v' + version,
      success: false,
      code: '400',
      message: 'bad request',
      payload: null,
    };
    res.status(400).json(apiResponse);
  }
}
