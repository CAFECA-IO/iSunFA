import type { NextApiRequest, NextApiResponse } from 'next';
import { IAccount } from '@/interfaces/accounting_account';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse, isParamNumeric, pageToOffset } from '@/lib/utils/common';
import prisma from '@/client';
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_OFFSET } from '@/constants/config';
import type { account } from '@prisma/client';
import { AccountType } from '@/constants/account';
import { convertStringToAccountType, isAccountType } from '@/lib/utils/type_guard/account';

async function _findManyAccountsInPrisma(
  page: number = DEFAULT_PAGE_OFFSET,
  limit: number = DEFAULT_PAGE_LIMIT,
  type?: AccountType,
  liquidity?: boolean
) {
  const offset = pageToOffset(page, limit);
  const accounts = await prisma.account.findMany({
    skip: offset,
    take: limit,
    where: {
      type,
      liquidity,
    },
  });

  return accounts;
}

function _formatAccounts(accounts: account[]): IAccount[] {
  return accounts.map((account) => {
    return {
      id: account.id,
      type: account.type,
      liquidity: account.liquidity,
      account: account.account,
      code: account.code,
      name: account.name,
    };
  });
}

function _isTypeValid(type: string | string[] | undefined): type is AccountType | undefined {
  if (Array.isArray(type)) {
    return false;
  }

  if (!type) {
    return true;
  }

  return isAccountType(type);
}

function _isLiquidityValid(
  liquidity: string | string[] | undefined
): liquidity is string | undefined {
  if (Array.isArray(liquidity)) {
    return false;
  }

  if (!liquidity) {
    return true;
  }

  return liquidity === 'true' || liquidity === 'false';
}

function _isPageValid(page: string | string[] | undefined): page is string | undefined {
  if (Array.isArray(page)) {
    return false;
  }

  if (!page) {
    return true;
  }

  return isParamNumeric(page);
}

function _isLimitValid(limit: string | string[] | undefined): limit is string | undefined {
  if (Array.isArray(limit)) {
    return false;
  }

  if (!limit) {
    return true;
  }

  return isParamNumeric(limit);
}

function _formatParams(
  companyId: string | string[] | undefined,
  type: string | string[] | undefined,
  liquidity: string | string[] | undefined,
  page: string | string[] | undefined,
  limit: string | string[] | undefined
) {
  const isCompanyIdValid = isParamNumeric(companyId);
  const isTypeValid = _isTypeValid(type);
  const isLiquidityValid = _isLiquidityValid(liquidity);
  const isPageValid = _isPageValid(page);
  const isLimitValid = _isLimitValid(limit);

  if (!(isCompanyIdValid && isTypeValid && isLiquidityValid && isPageValid && isLimitValid)) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const companyIdNumber = Number(companyId);
  const typeEnum = type ? convertStringToAccountType(type) : undefined;
  const liquidityBoolean = liquidity ? liquidity === 'true' : false;
  const pageNumber = Number(page) || DEFAULT_PAGE_OFFSET;
  const limitNumber = Number(limit) || DEFAULT_PAGE_LIMIT;

  return {
    companyIdNumber,
    typeEnum,
    liquidityBoolean,
    pageNumber,
    limitNumber,
  };
}

async function _handleGetRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAccount[]>>
) {
  const { companyId, type, liquidity, page, limit } = req.query;
  const { typeEnum, liquidityBoolean, pageNumber, limitNumber } = _formatParams(
    companyId,
    type,
    liquidity,
    page,
    limit
  );
  const rawAccounts = await _findManyAccountsInPrisma(
    pageNumber,
    limitNumber,
    typeEnum,
    liquidityBoolean
  );
  const accounts = _formatAccounts(rawAccounts);
  const { httpCode, result } = formatApiResponse<IAccount[]>(STATUS_MESSAGE.SUCCESS_GET, accounts);
  res.status(httpCode).json(result);
}

function _handleErrorResponse(res: NextApiResponse, message: string) {
  const { httpCode, result } = formatApiResponse<IAccount[]>(message, {} as IAccount[]);
  res.status(httpCode).json(result);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAccount[]>>
) {
  try {
    if (req.method === 'GET') {
      await _handleGetRequest(req, res);
    }
    if (req.method === 'POST') {
      // ToDo: (20240516 - Murky) - Not done
      // const { type, liquidity, account, code, name } = req.body;
      // if (type && liquidity && account && code && name) {
      //   if (
      //     (type !== 'asset' && type !== 'liability' && type !== 'equity') ||
      //     (liquidity !== 'current' && liquidity !== 'non-current' && liquidity !== 'na')
      //   ) {
      //     throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      //   }
      //   const { httpCode, result } = formatApiResponse<DetailAccountingAccountOrEmpty>(
      //     STATUS_MESSAGE.CREATED,
      //     responseData
      //   );
      //   res.status(httpCode).json(result);
      // }
      // throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    }
  } catch (_error) {
    const error = _error as Error;
    _handleErrorResponse(res, error.message);
  }
}
