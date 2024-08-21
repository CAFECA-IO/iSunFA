import type { NextApiRequest, NextApiResponse } from 'next';
import { IAccount, IAccountQueryArgs, IPaginatedAccount } from '@/interfaces/accounting_account';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse, isParamNumeric, timestampInSeconds } from '@/lib/utils/common';
import { AccountType, EquityType } from '@/constants/account';
import {
  convertStringToAccountType,
  isAccountType,
  isEquityType,
} from '@/lib/utils/type_guard/account';
import { checkAuthorization } from '@/lib/utils/auth_check';
import {
  findFirstAccountInPrisma,
  findLatestSubAccountInPrisma,
} from '@/lib/utils/repo/account.repo';
import prisma from '@/client';
import { Account } from '@prisma/client';
import { ReportSheetType } from '@/constants/report';
import { convertStringToReportSheetType, isReportSheetType } from '@/lib/utils/type_guard/report';
import { getSession } from '@/lib/utils/session';
import AccountRetrieverFactory from '@/lib/utils/account/account_retriever_factory';
import { AuthFunctionsKeys } from '@/interfaces/auth';

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

function formatIncludeDefaultAccount(includeDefaultAccount: unknown): boolean | undefined {
  let formattedIncludeDefaultAccount: boolean | undefined;
  if (includeDefaultAccount && typeof includeDefaultAccount === 'string') {
    formattedIncludeDefaultAccount =
      includeDefaultAccount === 'true'
        ? true
        : includeDefaultAccount === 'false'
          ? false
          : undefined;
  }
  return formattedIncludeDefaultAccount;
}

function formatLiquidity(liquidity: unknown): boolean | undefined {
  let formattedLiquidity: boolean | undefined;
  if (liquidity && typeof liquidity === 'string') {
    formattedLiquidity = liquidity === 'true' ? true : liquidity === 'false' ? false : undefined;
  }
  return formattedLiquidity;
}

function formatType(type: unknown): AccountType | undefined {
  let formattedType: AccountType | undefined;
  if (type && typeof type === 'string' && isAccountType(type)) {
    formattedType = convertStringToAccountType(type);
  }
  return formattedType;
}

function formatReportType(reportType: unknown): ReportSheetType | undefined {
  let formattedReportType: ReportSheetType | undefined;
  if (reportType && typeof reportType === 'string' && isReportSheetType(reportType)) {
    formattedReportType = convertStringToReportSheetType(reportType);
  }
  return formattedReportType;
}

function formatEquityType(equityType: unknown): EquityType | undefined {
  let formattedEquityType: EquityType | undefined;
  if (equityType && typeof equityType === 'string' && isEquityType(equityType)) {
    formattedEquityType = equityType as EquityType;
  }
  return formattedEquityType;
}

function formatForUser(forUser: unknown): boolean | undefined {
  let formattedForUser: boolean | undefined;
  if (forUser && typeof forUser === 'string') {
    formattedForUser = forUser === 'true' ? true : forUser === 'false' ? false : undefined;
  }
  return formattedForUser;
}

function formatPageOrLimit(pageOrLimit: unknown): number | undefined {
  let formattedPageOrLimit: number | undefined;
  if (pageOrLimit && typeof pageOrLimit === 'string' && isParamNumeric(pageOrLimit)) {
    formattedPageOrLimit = Number(pageOrLimit);
  }
  return formattedPageOrLimit;
}

function formatSortBy(sortBy: unknown): 'code' | 'createdAt' | undefined {
  let formattedSortBy: 'code' | 'createdAt' | undefined;
  if (sortBy && typeof sortBy === 'string') {
    formattedSortBy = sortBy === 'code' || sortBy === 'createdAt' ? sortBy : undefined;
  }
  return formattedSortBy;
}

function formatSortOrder(sortOrder: unknown): 'asc' | 'desc' | undefined {
  let formattedSortOrder: 'asc' | 'desc' | undefined;
  if (sortOrder && typeof sortOrder === 'string') {
    formattedSortOrder = sortOrder === 'asc' || sortOrder === 'desc' ? sortOrder : undefined;
  }
  return formattedSortOrder;
}

function formatSearchKey(searchKey: unknown): string | undefined {
  let formattedSearchKey: string | undefined;
  if (searchKey && typeof searchKey === 'string') {
    formattedSearchKey = searchKey;
  }
  return formattedSearchKey;
}

function formatIsDeleted(isDeleted: unknown): boolean | undefined {
  let formattedIsDeleted: boolean | undefined;
  if (isDeleted && typeof isDeleted === 'string') {
    formattedIsDeleted = isDeleted === 'true' ? true : isDeleted === 'false' ? false : undefined;
  }
  return formattedIsDeleted;
}

export function formatGetQuery(companyId: number, req: NextApiRequest): IAccountQueryArgs {
  const {
    includeDefaultAccount,
    liquidity,
    type,
    reportType,
    equityType,
    forUser,
    page,
    limit,
    sortBy,
    sortOrder,
    searchKey,
    isDeleted,
  } = req.query;

  const formattedIncludeDefaultAccount = formatIncludeDefaultAccount(includeDefaultAccount);
  const formattedLiquidity = formatLiquidity(liquidity);
  const formattedType = formatType(type);
  const formattedReportType = formatReportType(reportType);
  const formattedEquityType = formatEquityType(equityType);
  const formattedForUser = formatForUser(forUser);
  const formattedPage = formatPageOrLimit(page);
  const formattedLimit = formatPageOrLimit(limit);
  const formattedSortBy = formatSortBy(sortBy);
  const formattedSortOrder = formatSortOrder(sortOrder);
  const formattedSearchKey = formatSearchKey(searchKey);
  const formattedIsDeleted = formatIsDeleted(isDeleted);
  return {
    companyId,
    includeDefaultAccount: formattedIncludeDefaultAccount,
    liquidity: formattedLiquidity,
    type: formattedType,
    reportType: formattedReportType,
    equityType: formattedEquityType,
    forUser: formattedForUser,
    page: formattedPage,
    limit: formattedLimit,
    sortBy: formattedSortBy,
    sortOrder: formattedSortOrder,
    searchKey: formattedSearchKey,
    isDeleted: formattedIsDeleted,
  };
}

export async function handleGetRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IPaginatedAccount | null>>
) {
  const { companyId } = await getSession(req, res);
  const formattedQuery = formatGetQuery(companyId, req);

  const accountRetriever = AccountRetrieverFactory.createRetriever(formattedQuery);
  let paginatedAccount: IPaginatedAccount | null = null;

  try {
    paginatedAccount = await accountRetriever.getAccounts();
  } catch (error) {
    // Deprecate (20240722 - Murky) - Debugging error
    // console.log('error', error);
  }

  return paginatedAccount;
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
  res: NextApiResponse<IResponseData<IAccount>>
) {
  const session = await getSession(req, res);
  const { userId, companyId } = session;
  const { accountId, name } = req.body;
  if (!userId) {
    throw new Error(STATUS_MESSAGE.UNAUTHORIZED_ACCESS);
  }
  const isAuth = await checkAuthorization([AuthFunctionsKeys.admin], { userId, companyId });
  if (!isAuth) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }
  const { companyIdNumber, accountIdNumber } = formatCompanyIdAccountId(companyId, accountId);
  const parentAccount = await findFirstAccountInPrisma(accountIdNumber, companyIdNumber);
  const time = new Date().getTime();
  const timeInSeconds = timestampInSeconds(time);
  if (!parentAccount) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }
  const latestSubAccount = await findLatestSubAccountInPrisma(parentAccount);
  const newCode = setNewCode(parentAccount, latestSubAccount);
  const newName = parentAccount.name + '-' + String(name);
  const newOwnAccount = {
    companyId: companyIdNumber,
    system: parentAccount.system,
    type: parentAccount.type,
    debit: parentAccount.debit,
    liquidity: parentAccount.liquidity,
    code: newCode,
    name: newName,
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
  return savedNewOwnAccount;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAccount | IPaginatedAccount | null>>
) {
  let payload: IAccount | IPaginatedAccount | null = null;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  try {
    switch (req.method) {
      case 'GET':
        payload = await handleGetRequest(req, res);
        statusMessage = STATUS_MESSAGE.SUCCESS;
        break;
      case 'POST':
        payload = await handlePostRequest(req, res);
        statusMessage = STATUS_MESSAGE.CREATED;
        break;
      default:
        throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    // Deprecate (20240722 - Murky) - Debugging error
    // console.log('error', error);
    statusMessage = error.message;
  }
  const { httpCode, result } = formatApiResponse<IAccount | IPaginatedAccount | null>(
    statusMessage,
    payload
  );
  res.status(httpCode).json(result);
}
