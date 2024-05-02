import type { NextApiRequest, NextApiResponse } from 'next';
import version from '@/lib/version';

type ResponseData = {
  code: number;
  account: string;
};

type ApiResponse = {
  powerby: string;
  success: boolean;
  code: string;
  message: string;
  payload: ResponseData[] | null;
};

const responseDataArray: ResponseData[] = [
  {
    code: 1103,
    account: '銀行存款',
  },
  {
    code: 1104,
    account: '現金',
  },
  {
    code: 1105,
    account: '應收帳款',
  },
  {
    code: 1106,
    account: '預付款項',
  },
  {
    code: 1107,
    account: '存貨',
  },
];

const responseDataArray2: ResponseData[] = [
  {
    code: 1103,
    account: '銀行存款',
  },
];

export default function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  const { code, account } = req.query;
  if (code || account) {
    const apiResponse: ApiResponse = {
      powerby: 'iSunFA v' + version,
      success: true,
      code: '200',
      message: 'request successful',
      payload: responseDataArray2,
    };
    res.status(200).json(apiResponse);
  } else {
    const apiResponse: ApiResponse = {
      powerby: 'iSunFA v' + version,
      success: true,
      code: '200',
      message: 'request successful',
      payload: responseDataArray,
    };
    res.status(200).json(apiResponse);
  }
}
