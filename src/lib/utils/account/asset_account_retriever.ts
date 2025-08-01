import { AccountType, EquityType } from '@/constants/account';
import { ReportSheetType } from '@/constants/report';
import { SortOrder } from '@/constants/sort';
import { AbstractAccountRetriever } from '@/lib/utils/account/abstract_account_retriever';

export class AssetAccountRetriever extends AbstractAccountRetriever {
  constructor(
    accountBookId: number,
    includeDefaultAccount?: boolean,
    liquidity?: boolean,
    type?: AccountType,
    reportType?: ReportSheetType,
    equityType?: EquityType,
    forUser?: boolean,
    page?: number,
    limit?: number,
    sortBy?: 'code' | 'createdAt',
    sortOrder?: SortOrder.ASC | SortOrder.DESC,
    searchKey?: string,
    isDeleted?: boolean
  ) {
    super({
      accountBookId,
      includeDefaultAccount,
      liquidity,
      type: AccountType.ASSET,
      reportType: undefined,
      equityType: undefined,
      forUser,
      page,
      limit,
      sortBy,
      sortOrder,
      searchKey,
      isDeleted,
    });
  }
}
