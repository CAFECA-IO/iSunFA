// import type { NextApiRequest, NextApiResponse } from 'next';
// import { DetailAccountingAccountOrEmpty } from '@/interfaces/accounting_account';
// import { IResponseData } from '@/interfaces/response_data';
// import { STATUS_MESSAGE } from '@/constants/status_code';
// import { formatApiResponse } from '@/lib/utils/common';

// const responseData: DetailAccountingAccountOrEmpty = {
//   id: 1,
//   type: 'asset',
//   liquidity: 'non-current',
//   account: 'cash',
//   code: '1103-2',
//   name: 'Sun Bank',
// };

// export default function handler(
//   req: NextApiRequest,
//   res: NextApiResponse<IResponseData<DetailAccountingAccountOrEmpty>>
// ) {
//   try {
//     if (req.method === 'PUT') {
//       const { accountId } = req.query;
//       const { type, liquidity, account, code, name } = req.body;
//       if (accountId && type && liquidity && account && code && name) {
//         const { httpCode, result } = formatApiResponse<DetailAccountingAccountOrEmpty>(
//           STATUS_MESSAGE.SUCCESS_UPDATE,
//           responseData
//         );
//         res.status(httpCode).json(result);
//         return;
//       }
//       throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
//     }
//     if (req.method === 'DELETE') {
//       const { accountId } = req.query;
//       if (accountId) {
//         const { httpCode, result } = formatApiResponse<DetailAccountingAccountOrEmpty>(
//           STATUS_MESSAGE.SUCCESS_DELETE,
//           null
//         );
//         res.status(httpCode).json(result);
//         return;
//       }
//       throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
//     }
//   } catch (_error) {
//     const error = _error as Error;
//     const { httpCode, result } = formatApiResponse<DetailAccountingAccountOrEmpty>(
//       error.message,
//       {} as DetailAccountingAccountOrEmpty
//     );
//     res.status(httpCode).json(result);
//   }
// }
