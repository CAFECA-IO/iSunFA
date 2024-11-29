import prisma from '@/client';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { loggerError } from '@/lib/utils/logger_back';
import { ITrialBalancePayload } from '@/interfaces/trial_balance';
import { STATUS_MESSAGE } from '@/constants/status_code';
import {
  convertAccountBookJsonToTrialBalanceItem,
  parseSortOption,
} from '@/lib/utils/trial_balance';
import { DEFAULT_SORT_OPTIONS } from '@/constants/trial_balance';
import { formatPaginatedTrialBalance } from '@/lib/utils/formatter/trial_balance.formatter';
import { getAccountBook } from '@/lib/utils/repo/account_book.repo';

interface ListTrialBalanceParams {
  companyId: number;
  startDate: number;
  endDate: number;
  sortOption?: string;
  page?: number;
  pageSize?: number;
}

export async function listTrialBalance(
  params: ListTrialBalanceParams
): Promise<ITrialBalancePayload | null> {
  const {
    companyId,
    startDate,
    endDate,
    sortOption,
    page = DEFAULT_PAGE_NUMBER,
    pageSize = DEFAULT_PAGE_LIMIT,
  } = params;

  const pageNumber = page;
  let trialBalancePayload: ITrialBalancePayload | null = null;

  try {
    if (pageNumber < 1) {
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    }

    const parsedSortOption = parseSortOption(DEFAULT_SORT_OPTIONS, sortOption);

    const accountingSettingData = await prisma.accountingSetting.findFirst({
      where: { companyId },
    });

    let currencyAlias = 'TWD';

    if (accountingSettingData) {
      currencyAlias = accountingSettingData.currency || 'TWD';
    }

    const beginningAccountBook = await getAccountBook(companyId, 0, startDate);
    const midtermAccountBook = await getAccountBook(companyId, startDate, endDate);
    const endingAccountBook = await getAccountBook(companyId, 0, endDate);

    const beginningAccountBookJSON = beginningAccountBook.toJSON();
    const midtermAccountBookJSON = midtermAccountBook.toJSON();
    const endingAccountBookJSON = endingAccountBook.toJSON();

    const trialBalanceData = convertAccountBookJsonToTrialBalanceItem(
      beginningAccountBookJSON,
      midtermAccountBookJSON,
      endingAccountBookJSON,
      parsedSortOption
    );

    const paginatedTrialBalance = formatPaginatedTrialBalance(
      trialBalanceData.items,
      parsedSortOption,
      pageNumber,
      pageSize
    );

    trialBalancePayload = {
      currencyAlias,
      items: paginatedTrialBalance,
      total: trialBalanceData.total,
    };
  } catch (error) {
    const logError = loggerError(
      0,
      'listTrialBalance in trial_balance.repo.ts failed',
      error as Error
    );
    logError.error('Prisma related listTrialBalance in trial_balance.repo.ts failed');
  }

  return trialBalancePayload;
}
