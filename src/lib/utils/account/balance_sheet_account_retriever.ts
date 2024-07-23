import { AccountType, EquityType } from "@/constants/account";
import { ReportSheetType } from "@/constants/report";
import { AbstractAccountRetriever } from "@/lib/utils/account/abstract_account_retriever";

export class BalanceSheetAccountRetriever extends AbstractAccountRetriever {
    constructor(
        companyId: number,
        includeDefaultAccount?: boolean,
        liquidity?: boolean,
        type?: AccountType,
        reportType?: ReportSheetType,
        equityType?: EquityType,
        forUser?: boolean,
        page?: number,
        limit?: number,
        sortBy?: 'code' | 'createdAt',
        sortOrder?: 'asc' | 'desc',
        searchKey?: string
    ) {
        super({
            companyId,
            includeDefaultAccount,
            liquidity,
            type: undefined,
            reportType: ReportSheetType.BALANCE_SHEET,
            equityType: undefined,
            forUser,
            page,
            limit,
            sortBy,
            sortOrder,
            searchKey
        });
    }
}
