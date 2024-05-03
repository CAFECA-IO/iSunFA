import type { NextApiRequest, NextApiResponse } from 'next';
import version from '@/lib/version';
import { IAccountPublic } from '@/interfaces/account_public';
import { IResponseData } from '@/interfaces/response_data';

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
  res: NextApiResponse<IResponseData<IAccountPublic>>
) {
  const { code, account } = req.query;
  if (code || account) {
    const apiResponse: IResponseData<IAccountPublic> = {
      powerby: 'iSunFA v' + version,
      success: true,
      code: '200',
      message: 'request successful',
      payload: responseDataArray2,
    };
    res.status(200).json(apiResponse);
  } else {
    const apiResponse: IResponseData<IAccountPublic> = {
      powerby: 'iSunFA v' + version,
      success: true,
      code: '200',
      message: 'request successful',
      payload: responseDataArray,
    };
    res.status(200).json(apiResponse);
  }
}
