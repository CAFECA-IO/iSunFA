import type { NextApiRequest, NextApiResponse } from 'next';
import {
  AccountingAccountOrEmpty,
  DetailAccountingAccountOrEmpty,
} from '@/interfaces/accounting_account';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';

const responseDataArray: AccountingAccountOrEmpty[] = [
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

const responseData: DetailAccountingAccountOrEmpty = {
  id: 1,
  type: 'asset',
  liquidity: 'current',
  account: 'cash',
  code: '1103-1',
  name: 'Taiwan Bank',
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<AccountingAccountOrEmpty[] | DetailAccountingAccountOrEmpty>>
) {
  try {
    if (req.method === 'GET') {
      const { type, liquidity } = req.query;
      if (type && liquidity) {
        if (
          (type !== 'asset' && type !== 'liability' && type !== 'equity') ||
          (liquidity !== 'current' && liquidity !== 'non-current' && liquidity !== 'na')
        ) {
          throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
        }
        const { httpCode, result } = formatApiResponse<AccountingAccountOrEmpty[]>(
          STATUS_MESSAGE.SUCCESS_GET,
          responseDataArray
        );
        res.status(httpCode).json(result);
      } else {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }
    }
    if (req.method === 'POST') {
      const { type, liquidity, account, code, name } = req.body;
      if (type && liquidity && account && code && name) {
        if (
          (type !== 'asset' && type !== 'liability' && type !== 'equity') ||
          (liquidity !== 'current' && liquidity !== 'non-current' && liquidity !== 'na')
        ) {
          throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
        }
        const { httpCode, result } = formatApiResponse<DetailAccountingAccountOrEmpty>(
          STATUS_MESSAGE.CREATED,
          responseData
        );
        res.status(httpCode).json(result);
      }
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<
      AccountingAccountOrEmpty[] | DetailAccountingAccountOrEmpty
    >(error.message, {} as AccountingAccountOrEmpty[] | DetailAccountingAccountOrEmpty);
    res.status(httpCode).json(result);
  }
}
