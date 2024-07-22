import { AccountType, EquityType } from "@/constants/account";
import { ReportSheetType } from "@/constants/report";
import { AbstractAccountRetriever } from "@/lib/utils/account/abstract_account_retriever";

export class AssetAccountRetriever extends AbstractAccountRetriever {
    constructor(
        companyId: number,
        includeDefaultAccount: boolean,
        liquidity?: boolean,
        type?: AccountType,
        reportType?: ReportSheetType,
        equityType?: EquityType,
        forUser?: boolean,
        page?: number,
        limit?: number,
        sortBy?: 'code' | 'createdAt',
        sortOrder?: 'asc' | 'desc'
    ) {
        super({
            companyId,
            includeDefaultAccount,
            liquidity,
            type: AccountType.ASSET,
            reportType: undefined,
            equityType: undefined,
            forUser,
            page,
            limit,
            sortBy,
            sortOrder
        });
    }
}
