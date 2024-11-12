import prisma from '@/client';
import { getTimestampNow } from '@/lib/utils/common';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { SortOrder } from '@/constants/sort';
import { loggerError } from '@/lib/utils/logger_back';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { ILedgerPayload } from '@/interfaces/ledger';
import { PUBLIC_COMPANY_ID } from '@/constants/company';
import { VoucherType } from '@/constants/account';
import { buildAccountForestForUser } from '@/lib/utils/account/common';
import { LabelType } from '@/constants/ledger';
import { ledgerListSchema } from '@/lib/utils/zod_schema/ledger';
import { z } from 'zod';

type ListLedgerParams = z.infer<typeof ledgerListSchema.input.querySchema>;

interface ILedgerItemForCalculation {
  id: number;
  accountId: number;
  voucherDate: number;
  no: string;
  accountingTitle: string;
  voucherNumber: string;
  particulars: string;
  debitAmount: number;
  creditAmount: number;
  balance: number;
  voucherType: VoucherType;
  createdAt: number;
  updatedAt: number;
}

const commonQueryConditions = {
  deletedAt: null,
};

const commonVoucherConditions = (startTimestamp: number, endTimestamp: number) => ({
  ...commonQueryConditions,
  date: {
    gte: startTimestamp,
    lte: endTimestamp,
  },
});

export async function listLedger(params: ListLedgerParams): Promise<ILedgerPayload | null> {
  const {
    companyId,
    startDate = 0,
    endDate,
    startAccountNo,
    endAccountNo,
    labelType = LabelType.GENERAL,
    page = DEFAULT_PAGE_NUMBER,
    pageSize = DEFAULT_PAGE_LIMIT,
  } = params;

  const pageNumber = page;

  let ledgerPayload: ILedgerPayload | null = null;

  try {
    if (pageNumber < 1) {
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    }

    // Info: (20241112 - Shirley) 1. 取得會計設定的貨幣別
    const accountingSettingData = await prisma.accountingSetting.findFirst({
      where: { id: companyId },
    });

    let currencyAlias = 'TWD';
    if (accountingSettingData) {
      currencyAlias = accountingSettingData.currency || 'TWD';
    }

    // Info: (20241112 - Shirley) 2. 取得符合條件的會計科目
    const accountsQuery = {
      where: {
        ...commonQueryConditions,
        OR: [{ companyId }, { companyId: PUBLIC_COMPANY_ID }],
        ...(startAccountNo && endAccountNo
          ? {
              AND: [
                {
                  code: {
                    gte: startAccountNo,
                  },
                },
                {
                  code: {
                    lte: endAccountNo,
                  },
                },
              ],
            }
          : {}),
        forUser: true,
      },
      include: {
        lineItem: {
          where: {
            ...commonQueryConditions,
            voucher: commonVoucherConditions(startDate, endDate),
          },
          include: {
            voucher: true,
          },
        },
      },
    };

    const accounts = await prisma.account.findMany(accountsQuery);

    // Info: (20241112 - Shirley) 根據 labelType 過濾會計科目
    let filteredAccounts = accounts;
    if (labelType === LabelType.GENERAL) {
      filteredAccounts = accounts.filter((account) => !account.code.includes('-'));
    } else if (labelType === LabelType.DETAILED) {
      filteredAccounts = accounts.filter((account) => account.code.includes('-'));
    }

    const allVoucherData = await prisma.voucher.findMany({
      where: {
        ...commonVoucherConditions(startDate, endDate),
        companyId,
      },
      select: {
        id: true,
      },
      orderBy: [{ id: 'asc' }, { createdAt: 'asc' }],
    });

    const allVoucherIds = allVoucherData.map((voucher) => voucher.id);

    const additionalLineItems = await prisma.lineItem.findMany({
      where: {
        ...commonQueryConditions,
        voucherId: { in: allVoucherIds },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        voucher: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const sortedAccounts = buildAccountForestForUser(filteredAccounts);

    const newSortedAccounts = sortedAccounts.map((account) => {
      return {
        ...account,
        lineItem: additionalLineItems.filter((lineItem) => {
          return lineItem.accountId === account.id;
        }),
      };
    });

    // Info: (20241112 - Shirley) 3. 整理分類帳資料
    const ledgerItems: ILedgerItemForCalculation[] = [];
    let balance = 0;
    let totalDebitAmount = 0;
    let totalCreditAmount = 0;

    newSortedAccounts.forEach((account) => {
      account.lineItem.forEach((item) => {
        if (item.debit) {
          balance += item.amount;
          totalDebitAmount += item.amount;
        } else {
          balance -= item.amount;
          totalCreditAmount += item.amount;
        }

        ledgerItems.push({
          accountId: account.id,

          id: item.id,
          voucherDate: item.voucher.date,
          no: account.code,
          accountingTitle: account.name,
          voucherNumber: item.voucher.no,
          voucherType: item.voucher.type as VoucherType,

          particulars: item.description,
          debitAmount: item.debit ? item.amount : 0,
          creditAmount: item.debit ? 0 : item.amount,
          balance,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        });
      });
    });

    // Info: (20241112 - Shirley) 4. 排序
    ledgerItems.sort((a, b) => a.accountId - b.accountId);

    // Info: (20241112 - Shirley) 5. 分頁處理
    const paginatedData = ledgerItems.map(({ accountId, ...rest }) => rest);

    const totalCount = ledgerItems.length;
    const totalPages = 1;
    const hasNextPage = false;
    const hasPreviousPage = false;

    const now = getTimestampNow();

    ledgerPayload = {
      currencyAlias,
      items: {
        data: paginatedData,
        page: pageNumber,
        totalPages,
        totalCount,
        pageSize,
        hasNextPage,
        hasPreviousPage,
        sort: [
          {
            sortBy: 'voucherDate',
            sortOrder: SortOrder.ASC,
          },
        ],
      },
      total: {
        totalDebitAmount,
        totalCreditAmount,
        createdAt: now,
        updatedAt: now,
      },
    };
  } catch (error) {
    const logError = loggerError(0, 'listLedger in ledger.repo.ts failed', error as Error);
    logError.error('Prisma related listLedger in ledger.repo.ts failed');
  }

  return ledgerPayload;
}
