import type { NextApiRequest, NextApiResponse } from 'next';
import { IAccount } from '@/interfaces/accounting_account';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse, isParamNumeric, timestampInSeconds } from '@/lib/utils/common';
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_START_AT } from '@/constants/config';
import { AccountType } from '@/constants/account';
import { convertStringToAccountType, isAccountType } from '@/lib/utils/type_guard/account';
import { checkAdmin } from '@/lib/utils/auth_check';
import {
  findManyAccountsInPrisma,
  findFirstAccountInPrisma,
  findLatestSubAccountInPrisma,
} from '@/lib/utils/repo/account.repo';
import { formatAccounts } from '@/lib/utils/formatter/account.formatter';
import prisma from '@/client';
import { Account } from '@prisma/client';

function formatCompanyIdAccountId(companyId: unknown, accountId: string | string[] | undefined) {
  const isCompanyIdValid = !Number.isNaN(Number(companyId));
  const isAccountIdValid = isParamNumeric(accountId);

  if (!(isCompanyIdValid && isAccountIdValid)) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const companyIdNumber = Number(companyId);
  const accountIdNumber = Number(accountId);
  return {
    companyIdNumber,
    accountIdNumber,
  };
}

export function isTypeValid(type: string | string[] | undefined): type is AccountType | undefined {
  if (Array.isArray(type)) {
    return false;
  }

  if (!type) {
    return true;
  }

  return isAccountType(type);
}

export function isLiquidityValid(
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

export function isPageValid(page: string | string[] | undefined): page is string | undefined {
  if (Array.isArray(page)) {
    return false;
  }

  if (!page) {
    return true;
  }

  return isParamNumeric(page);
}

export function isLimitValid(limit: string | string[] | undefined): limit is string | undefined {
  if (Array.isArray(limit)) {
    return false;
  }

  if (!limit) {
    return true;
  }

  return isParamNumeric(limit);
}

export function formatParams(
  companyId: unknown,
  type: string | string[] | undefined,
  liquidity: string | string[] | undefined,
  page: string | string[] | undefined,
  limit: string | string[] | undefined
) {
  // ToDo: (20240613 - Murky) - need to move to type guard
  const isCompanyIdValid = !companyId || typeof companyId === 'number';
  const typeIsValid = isTypeValid(type);
  const liquidityIsValid = isLiquidityValid(liquidity);
  const pageIsValid = isPageValid(page);
  const limitIsValid = isLimitValid(limit);

  if (!(isCompanyIdValid && typeIsValid && liquidityIsValid && pageIsValid && limitIsValid)) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const typeEnum = type ? convertStringToAccountType(type) : undefined;
  const liquidityBoolean = liquidity ? liquidity === 'true' : undefined;
  const pageNumber = Number(page) || DEFAULT_PAGE_START_AT;
  const limitNumber = Number(limit) || DEFAULT_PAGE_LIMIT;
  const companyIdNumber = Number(companyId);

  return {
    companyIdNumber,
    typeEnum,
    liquidityBoolean,
    pageNumber,
    limitNumber,
  };
}

export async function handleGetRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAccount[]>>
) {
  const { type, liquidity, page, limit } = req.query;
  const session = await checkAdmin(req, res);
  const { companyId } = session;

  const { companyIdNumber, typeEnum, liquidityBoolean, pageNumber, limitNumber } = formatParams(
    companyId,
    type,
    liquidity,
    page,
    limit
  );

  // Info (20240701 - Murky) - User can only get accounts that are for user
  const onlyForUser = true;
  const rawAccounts = await findManyAccountsInPrisma(
    companyIdNumber,
    onlyForUser,
    pageNumber,
    limitNumber,
    typeEnum,
    liquidityBoolean,
    false
  );
  const accounts = formatAccounts(rawAccounts);
  const { httpCode, result } = formatApiResponse<IAccount[]>(STATUS_MESSAGE.SUCCESS_GET, accounts);
  return {
    httpCode,
    result,
  };
}

function setNewCode(parentAccount: Account, latestSubAccount: Account | null) {
  const parentCode = parentAccount.code;
  let newCode = '';
  if (latestSubAccount) {
    const latestSubAccountCodeParts = latestSubAccount.code.split('-');
    if (latestSubAccountCodeParts.length > 1) {
      const latestSubAccountNumber = Number(latestSubAccountCodeParts.pop());
      newCode = `${parentCode}-${latestSubAccountNumber + 1}`;
    }
  } else {
    newCode = `${parentCode}-1`;
  }
  return newCode;
}

export async function handlePostRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAccount[]>>
) {
  const { companyId } = await checkAdmin(req, res);
  const { accountId, name } = req.body;
  const { companyIdNumber, accountIdNumber } = formatCompanyIdAccountId(companyId, accountId);
  const parentAccount = await findFirstAccountInPrisma(accountIdNumber, companyIdNumber);
  const time = new Date().getTime();
  const timeInSeconds = timestampInSeconds(time);
  if (!parentAccount) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }
  const latestSubAccount = await findLatestSubAccountInPrisma(companyIdNumber, parentAccount);
  const newCode = setNewCode(parentAccount, latestSubAccount);
  const newOwnAccount = {
    companyId: companyIdNumber,
    system: parentAccount.system,
    type: parentAccount.type,
    debit: parentAccount.debit,
    liquidity: parentAccount.liquidity,
    code: newCode,
    name: String(name),
    forUser: true,
    parentCode: parentAccount.code,
    rootCode: parentAccount.rootCode,
    createdAt: timeInSeconds,
    updatedAt: timeInSeconds,
    level: parentAccount.level + 1,
  };
  const savedNewOwnAccount = await prisma.account.create({
    data: newOwnAccount,
  });
  const { httpCode, result } = formatApiResponse<IAccount>(
    STATUS_MESSAGE.CREATED,
    savedNewOwnAccount
  );
  return {
    httpCode,
    result,
  };
}

export function handleErrorResponse(res: NextApiResponse, message: string) {
  const { httpCode, result } = formatApiResponse<IAccount[]>(message, {} as IAccount[]);
  return {
    httpCode,
    result,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAccount[] | IAccount>>
) {
  try {
    if (req.method === 'GET') {
      const { httpCode, result } = await handleGetRequest(req, res);
      res.status(httpCode).json(result);
    } else if (req.method === 'POST') {
      const { httpCode, result } = await handlePostRequest(req, res);
      res.status(httpCode).json(result);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = handleErrorResponse(res, error.message);
    res.status(httpCode).json(result);
  }
}
