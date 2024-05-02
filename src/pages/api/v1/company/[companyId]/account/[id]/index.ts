import type { NextApiRequest, NextApiResponse } from 'next';
import version from '@/lib/version';

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
  payload?: AccountingAccount[] | null;
};

export default function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  if (req.method === 'PUT') {
    const { id } = req.query;
    const { type, liquidity, account, code, name } = req.body;
    if (id && type && liquidity && account && code && name) {
      res.status(200).json({
        powerby: 'iSunFA v' + version,
        success: true,
        code: '200',
        message: 'update successful',
        payload: [
          {
            id: parseInt(id as string, 10),
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
      message: 'update failed',
      payload: null,
    });
  }
  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (id) {
      res.status(200).json({
        powerby: 'iSunFA v' + version,
        success: true,
        code: '200',
        message: 'delete successful',
      });
      return;
    }
    res.status(400).json({
      powerby: 'iSunFA v' + version,
      success: false,
      code: '400',
      message: 'delete failed',
    });
  }
}
