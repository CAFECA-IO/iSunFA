import type { NextApiRequest, NextApiResponse } from 'next';
import { IAccount } from '@/interfaces/accounting_account';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse, isParamNumeric, pageToOffset } from '@/lib/utils/common';
import prisma from '@/client';
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_OFFSET, DEFAULT_PAGE_START_AT } from '@/constants/config';
import type { Account } from '@prisma/client';
import { AccountType } from '@/constants/account';
import { convertStringToAccountType, isAccountType } from '@/lib/utils/type_guard/account';
import { checkAdmin } from '@/lib/utils/auth_check';
import { PUBLIC_COMPANY_ID } from '@/constants/company';

export async function findManyAccountsInPrisma(
  companyId: number,
  page: number = DEFAULT_PAGE_OFFSET,
  limit: number = DEFAULT_PAGE_LIMIT,
  type?: AccountType,
  liquidity?: boolean
) {
  try {
    const offset = pageToOffset(page, limit);
    const accounts = await prisma.account.findMany({
      skip: offset,
      take: limit,
      where: {
        type,
        liquidity,
        OR: [
          {
            companyId,
          },
          {
            companyId: PUBLIC_COMPANY_ID,
          },
        ]
      },
    });

    return accounts;
  } catch (error) {
    // Info (20240516 - Murky) - Debugging error
    // eslint-disable-next-line no-console
    console.error(error);
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }
}

export function formatAccounts(accounts: Account[]): IAccount[] {
  return accounts.map((account) => {
    return {
      id: account.id,
      companyId: account.companyId,
      system: account.system,
      type: account.type,
      liquidity: account.liquidity,
      debit: account.debit,
      code: account.code,
      name: account.name,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  });
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
  const rawAccounts = await findManyAccountsInPrisma(
    companyIdNumber,
    pageNumber,
    limitNumber,
    typeEnum,
    liquidityBoolean
  );
  const accounts = formatAccounts(rawAccounts);
  const { httpCode, result } = formatApiResponse<IAccount[]>(STATUS_MESSAGE.SUCCESS_GET, accounts);
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
  res: NextApiResponse<IResponseData<IAccount[]>>
) {
  try {
    if (req.method === 'GET') {
      const { httpCode, result } = await handleGetRequest(req, res);

      res.status(httpCode).json(result);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = handleErrorResponse(res, error.message);
    res.status(httpCode).json(result);
  }
}
