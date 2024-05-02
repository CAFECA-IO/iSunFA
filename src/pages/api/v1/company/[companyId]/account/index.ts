import type { NextApiRequest, NextApiResponse } from 'next';
import version from '@/lib/version';

type ResponseData = {
  id: number;
  code: number;
  account: string;
  amount: number;
};

type AccountingAccount = {
  id: number;
  type: string;
  liquidity: string;
  account: string;
  code: string;
  name: string;
};

type ApiResponse = {
  powerby: string;
  success: boolean;
  code: string;
  message: string;
  payload: ResponseData[] | AccountingAccount[] | null;
};

const responseDataArray: ResponseData[] = [
  {
    id: 1,
    code: 1100,
    account: '現金及約當現金',
    amount: 30000,
  },
  {
    id: 2,
    code: 1310,
    account: '存貨',
    amount: 2200000,
  },
  {
    id: 3,
    code: 1180,
    account: '應收款項',
    amount: 530000,
  },
];

export default function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  if (req.method === 'GET') {
    const { type, liquidity } = req.query;
    if (type && liquidity) {
      if (
        (type !== 'asset' && type !== 'liability' && type !== 'equity') ||
        (liquidity !== 'current' && liquidity !== 'non-current' && liquidity !== 'na')
      ) {
        const apiResponse: ApiResponse = {
          powerby: 'iSunFA v' + version,
          success: false,
          code: '400',
          message: 'bad request',
          payload: null,
        };
        res.status(400).json(apiResponse);
        return;
      }
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
  if (req.method === 'POST') {
    const { type, liquidity, account, code, name } = req.body;
    if (type && liquidity && account && code && name) {
      if (
        (type !== 'asset' && type !== 'liability' && type !== 'equity') ||
        (liquidity !== 'current' && liquidity !== 'non-current' && liquidity !== 'na')
      ) {
        const apiResponse: ApiResponse = {
          powerby: 'iSunFA v' + version,
          success: false,
          code: '400',
          message: 'create failed',
          payload: null,
        };
        res.status(400).json(apiResponse);
      }
      res.status(200).json({
        powerby: 'iSunFA v' + version,
        success: true,
        code: '200',
        message: 'create successful',
        payload: [
          {
            id: 1,
            type,
            liquidity,
            account,
            code,
            name,
          },
        ],
      });
      return;
    }
    res.status(400).json({
      powerby: 'iSunFA v' + version,
      success: false,
      code: '400',
      message: 'create failed',
      payload: null,
    });
  }
}
