import type { NextApiRequest, NextApiResponse } from 'next';
import { IResponseData } from '@/interfaces/response_data';
import {
  formatApiResponse,
  getTimestampOfFirstDateOfThisYear,
  isParamNumeric,
  isParamString,
  timestampInSeconds,
} from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IAccountForSheetDisplay } from '@/interfaces/accounting_account';
import { getSession } from '@/lib/utils/session';
import { AccountSheetAccountTypeMap, AccountSheetType, AccountType } from '@/constants/account';
import {
  convertStringToAccountSheetType,
  isAccountSheetType,
} from '@/lib/utils/type_guard/account';
import { getSumOfLineItemsGroupByAccountInPrisma } from '@/lib/utils/repo/line_item.repo';
import {
  buildAccountForest,
  mappingAccountToSheetDisplay,
  transformForestToMap,
  transformLineItemsFromDBToMap,
  updateAccountAmounts,
} from '@/lib/utils/account';
import { findManyAccountsInPrisma } from '@/lib/utils/repo/account.repo';
import balanceSheetMapping from '@/constants/account_sheet_mapping/balance_sheet_mapping.json';

export function formatGetRequestQuery(req: NextApiRequest) {
  const { startDate, endDate, sheet } = req.query;

  const today = new Date();
  const todayInTimestamp = today.getTime();

  let startDateInSecond = getTimestampOfFirstDateOfThisYear();
  let endDateInSecond = timestampInSeconds(todayInTimestamp);
  let accountSheet = AccountSheetType.BALANCE_SHEET;

  if (startDate && isParamNumeric(startDate)) {
    const startDateInSecondString = parseInt(startDate as string, 10);
    startDateInSecond = timestampInSeconds(startDateInSecondString);
  }

  if (endDate && isParamNumeric(endDate)) {
    const endDateInSecondString = parseInt(endDate as string, 10);
    endDateInSecond = timestampInSeconds(endDateInSecondString);
  }

  if (isParamString(sheet) && isAccountSheetType(sheet)) {
    accountSheet = convertStringToAccountSheetType(sheet);
  }
  return { startDateInSecond, endDateInSecond, accountSheet };
}

export async function buildAccountForestFromDB(companyId: number, accountType: AccountType) {
  const onlyForUser = false;
  const page = 1;
  const limit = Number.MAX_SAFE_INTEGER;
  const liquidity = undefined;
  const selectDeleted = false;
  const accounts = await findManyAccountsInPrisma(
    companyId,
    onlyForUser,
    page,
    limit,
    accountType,
    liquidity,
    selectDeleted
  );
  const forest = buildAccountForest(accounts);
  return forest;
}

export async function getAccountForestByAccountSheet(
  companyId: number,
  accountSheet: AccountSheetType
) {
  const accountTypes = AccountSheetAccountTypeMap[accountSheet];
  const forestArray = await Promise.all(
    accountTypes.map((type) => buildAccountForestFromDB(companyId, type))
  );

  const forest = forestArray.flat(1);
  return forest;
}

export async function getAllLineItemsByAccountSheet(
  companyId: number,
  startDateInSecond: number,
  endDateInSecond: number,
  accountSheet: AccountSheetType
) {
  const accountTypes = AccountSheetAccountTypeMap[accountSheet];
  const lineItemsFromDBArray = await Promise.all(
    accountTypes.map((type) => getSumOfLineItemsGroupByAccountInPrisma(companyId, type, startDateInSecond, endDateInSecond))
  );

  const lineItemsFromDB = lineItemsFromDBArray.flat();
  return lineItemsFromDB;
}

export async function handleGetRequest(
  companyId: number,
  req: NextApiRequest
): Promise<IAccountForSheetDisplay[]> {
  const { startDateInSecond, endDateInSecond, accountSheet } = formatGetRequestQuery(req);
  const lineItemsFromDB = await getAllLineItemsByAccountSheet(
    companyId,
    startDateInSecond,
    endDateInSecond,
    accountSheet
  );
  const lineItemsMap = transformLineItemsFromDBToMap(lineItemsFromDB);
  const accountForest = await getAccountForestByAccountSheet(companyId, accountSheet);
  const updatedAccountForest = updateAccountAmounts(accountForest, lineItemsMap);
  const accountMap = transformForestToMap(updatedAccountForest);
  const sheetDisplay = mappingAccountToSheetDisplay(accountMap, balanceSheetMapping);
  return sheetDisplay;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAccountForSheetDisplay[]>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccountForSheetDisplay[] = [];
  try {
    const session = await getSession(req, res);
    const { companyId } = session;

    // ToDo: (20240703 - Murky) Need to check Auth
    switch (req.method) {
      case 'GET': {
        payload = await handleGetRequest(companyId, req);
        statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
        break;
      }
      default: {
        break;
      }
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
  }
  const { httpCode, result } = formatApiResponse<IAccountForSheetDisplay[]>(statusMessage, payload);
  res.status(httpCode).json(result);
}
