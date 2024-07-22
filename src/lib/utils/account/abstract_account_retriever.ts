import { AccountType, EquityType } from "@/constants/account";
import { DEFAULT_PAGE_LIMIT } from "@/constants/config";
import { DEFAULT_PAGE_NUMBER } from "@/constants/display";
import { ReportSheetType } from "@/constants/report";
import { IPaginatedAccount } from "@/interfaces/accounting_account";
import { findManyAccountsInPrisma } from "@/lib/utils/repo/account.repo";

type constructorArgs = {
    companyId: number;
    includeDefaultAccount: boolean,
    liquidity?: boolean;
    type?: AccountType;
    reportType?: ReportSheetType;
    equityType?: EquityType;
    forUser?: boolean;
    page?: number;
    limit?: number;
    sortBy?: 'code' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
}

export abstract class AbstractAccountRetriever {
    protected companyId: number;

    protected includeDefaultAccount: boolean;

    protected liquidity: boolean | undefined;

    protected type: AccountType | undefined;

    protected reportType: ReportSheetType | undefined;

    protected equityType: EquityType | undefined;

    protected forUser: boolean | undefined;

    protected page: number = DEFAULT_PAGE_NUMBER;

    protected limit: number = DEFAULT_PAGE_LIMIT;

    protected sortBy: 'code' | 'createdAt' = 'code';

    protected sortOrder: 'asc' | 'desc' = 'asc';

    constructor({
        companyId,
        includeDefaultAccount,
        liquidity,
        type,
        reportType,
        equityType,
        forUser,
        page,
        limit,
        sortBy,
        sortOrder
    }: constructorArgs) {
        this.companyId = companyId;
        this.includeDefaultAccount = includeDefaultAccount;
        this.liquidity = liquidity;
        this.type = type;
        this.reportType = reportType;
        this.equityType = equityType;
        this.forUser = forUser;
        this.page = page || this.page;
        this.limit = limit || this.limit;
        this.sortBy = sortBy || this.sortBy;
        this.sortOrder = sortOrder || this.sortOrder;
    }

    public async getAccounts(): Promise<IPaginatedAccount> {
        const accounts = await findManyAccountsInPrisma({
            companyId: this.companyId,
            includeDefaultAccount: this.includeDefaultAccount,
            liquidity: this.liquidity,
            type: this.type,
            reportType: this.reportType,
            equityType: this.equityType,
            forUser: this.forUser,
            page: this.page,
            limit: this.limit,
            sortBy: this.sortBy,
            sortOrder: this.sortOrder
        });
        return {
            data: accounts.data,
            page: accounts.page,
            totalPages: accounts.totalPage,
        };
    }
}
