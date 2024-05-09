import type { NextApiRequest, NextApiResponse } from 'next';
import { IAccountPublic } from '@/interfaces/account_public';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_CODE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';

const responseDataArray: IAccountPublic[] = [
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

const responseDataArray2: IAccountPublic[] = [
  {
    code: 1103,
    account: '銀行存款',
  },
];

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAccountPublic[]>>
) {
  const { code, account } = req.query;
  if (code || account) {
    const { httpCode, result } = formatApiResponse<IAccountPublic[]>(
      STATUS_CODE.SUCCESS_GET,
      responseDataArray2
    );
    res.status(httpCode).json(result);
  } else {
    const { httpCode, result } = formatApiResponse<IAccountPublic[]>(
      STATUS_CODE.SUCCESS_GET,
      responseDataArray
    );
    res.status(httpCode).json(result);
  }
}
