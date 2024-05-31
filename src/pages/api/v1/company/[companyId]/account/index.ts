// import type { NextApiRequest, NextApiResponse } from 'next';
// import {
//   IAccount
// } from '@/interfaces/accounting_account';
// import { IResponseData } from '@/interfaces/response_data';
// import { STATUS_MESSAGE } from '@/constants/status_code';
// import { formatApiResponse, isParamNumeric, isParamString } from '@/lib/utils/common';
// import prisma from '@/client';
// import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_OFFSET } from '@/constants/config';
// import type { account } from '@prisma/client';

// const responseData: IAccount = {
//   id: 1,
//   type: 'asset',
//   liquidity: true,
//   account: 'cash',
//   code: '1103-1',
//   name: 'Taiwan Bank',
// };


// async function _findManyAccountsInPrisma(offset: number = DEFAULT_PAGE_OFFSET, limit: number = DEFAULT_PAGE_LIMIT) {
//   const accounts = await prisma.account.findMany({
//     skip: offset,
//     take: limit,
//   });

//   return accounts;
// }

// function _formatAccounts(accounts: account[]): IAccount[] {
//   return accounts.map((account) => {
//     return {
//       id: account.id,
//       type: account.type,
//       liquidity: account.liquidity,
//       account: account.account,
//       code: account.code,
//       name: account.name,
//     };
//   });
// }


// function _isTypeValid(type: string | string[] | undefined) {

// }

// function _isGetRequestParamsValid (
//   companyId: string | string[] | undefined,
//   type: string | string[] | undefined,
//   liquidity: string | string[] | undefined,
//   page: string | string[] | undefined,
//   limit: string | string[] | undefined
// ) {
//   const isCompanyIdValid = isParamNumeric(companyId);
//   let isTypeValid = true;
//   if (type) {
//     isTypeValid = isParamString(type);
//   }

// }

// function _handleGetRequest(req: NextApiRequest, res: NextApiResponse<IResponseData<IAccount[]>>) {}

// function _handleErrorResponse(res: NextApiResponse, message: string) {
//   const { httpCode, result } = formatApiResponse<IAccount[]>(
//     message,
//     {} as IAccount[]
//   );
//   res.status(httpCode).json(result);
// }

// export default function handler(
//   req: NextApiRequest,
//   res: NextApiResponse<IResponseData<IAccount[]>>
// ) {
//   try {
//     if (req.method === 'GET') {
//       const { type, liquidity } = req.query;
//       if (type && liquidity) {
//         if (
//           (type !== 'asset' && type !== 'liability' && type !== 'equity') ||
//           (liquidity !== 'current' && liquidity !== 'non-current' && liquidity !== 'na')
//         ) {
//           throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
//         }
//         const { httpCode, result } = formatApiResponse<AccountingAccountOrEmpty[]>(
//           STATUS_MESSAGE.SUCCESS_GET,
//           responseDataArray
//         );
//         res.status(httpCode).json(result);
//       } else {
//         throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
//       }
//     }
//     if (req.method === 'POST') {
//       const { type, liquidity, account, code, name } = req.body;
//       if (type && liquidity && account && code && name) {
//         if (
//           (type !== 'asset' && type !== 'liability' && type !== 'equity') ||
//           (liquidity !== 'current' && liquidity !== 'non-current' && liquidity !== 'na')
//         ) {
//           throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
//         }
//         const { httpCode, result } = formatApiResponse<DetailAccountingAccountOrEmpty>(
//           STATUS_MESSAGE.CREATED,
//           responseData
//         );
//         res.status(httpCode).json(result);
//       }
//       throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
//     }
//   } catch (_error) {
//     const error = _error as Error;
//     _handleErrorResponse(res, error.message);
//   }
// }
