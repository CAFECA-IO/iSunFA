import prisma from '@/client';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { loggerError } from '@/lib/utils/logger_back';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { ILedgerItem, ILedgerPayload, ILedgerTotal } from '@/interfaces/ledger';
import { EVENT_TYPE_TO_VOUCHER_TYPE_MAP, EventType } from '@/constants/account';
import { LabelType } from '@/constants/ledger';
import { ledgerListSchema } from '@/lib/utils/zod_schema/ledger';
import { z } from 'zod';
import { DefaultValue } from '@/constants/default_value';
import { formatPaginatedLedger } from '@/lib/utils/formatter/ledger.formatter';

type ListLedgerParams = z.infer<typeof ledgerListSchema.input.querySchema>;

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

    // 1. 取得會計設定的貨幣別
    const accountingSettingData = await prisma.accountingSetting.findFirst({
      where: { companyId },
    });

    let currencyAlias = 'TWD';
    if (accountingSettingData) {
      currencyAlias = accountingSettingData.currency || 'TWD';
    }

    // 2. 取得範圍內的LineItem
    const lineItems = await prisma.lineItem.findMany({
      where: {
        voucher: {
          companyId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          deletedAt: null,
        },
        deletedAt: null,
      },
      include: {
        voucher: {
          select: {
            id: true,
            date: true,
            type: true,
            no: true,
          },
        },
        account: {
          select: {
            code: true,
            name: true,
            parentId: true,
          },
        },
      },
      orderBy: {
        voucher: {
          date: 'asc',
        },
      },
    });

    // 3. 篩選科目範圍
    let filteredLineItems = lineItems;
    if (startAccountNo || endAccountNo) {
      filteredLineItems = lineItems.filter((item) => {
        const no = item.account.code;
        if (startAccountNo && endAccountNo) {
          return no >= startAccountNo && no <= endAccountNo;
        } else if (startAccountNo) {
          return no >= startAccountNo;
        } else if (endAccountNo) {
          return no <= endAccountNo;
        }
        return true;
      });
    }

    // 4. 根據 labelType 篩選
    if (labelType !== LabelType.ALL) {
      filteredLineItems = filteredLineItems.filter((item) => {
        if (labelType === LabelType.GENERAL) {
          return !item.account.code.includes('-');
        } else if (labelType === LabelType.DETAILED) {
          return item.account.code.includes('-');
        }
        return true;
      });
    }

    // 5. 為每一個科目維護累加的balance
    const accountBalances: { [key: string]: number } = {};
    const processedLineItems: ILedgerItem[] = filteredLineItems
      .sort((a, b) => {
        // 先依照 account.code 排序
        const codeCompare = a.account.code.localeCompare(b.account.code);
        // 如果 account.code 相同，則依照 voucher date 排序
        if (codeCompare === 0) {
          return a.voucher.date - b.voucher.date;
        }
        return codeCompare;
      })
      // .sort((a, b) => a.account.code.localeCompare(b.account.code))
      .map((item) => {
        const accountKey = item.account.code;
        if (!accountBalances[accountKey]) {
          accountBalances[accountKey] = 0;
        }
        const debit = item.debit ? item.amount : 0;
        const credit = !item.debit ? item.amount : 0;
        const balanceChange = item.debit ? item.amount : -item.amount;
        accountBalances[accountKey] += balanceChange;

        return {
          id: item.id,
          accountId: item.accountId,
          voucherId: item.voucherId,
          voucherDate: item.voucher.date,
          no: item.account.code,
          accountingTitle: item.account.name,
          voucherNumber: item.voucher.no,
          voucherType:
            EVENT_TYPE_TO_VOUCHER_TYPE_MAP[item.voucher.type as EventType] || item.voucher.type,
          particulars: item.description,
          debitAmount: debit,
          creditAmount: credit,
          balance: accountBalances[accountKey],
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        };
      });

    // 6. 計算總額
    const sumUpData: ILedgerTotal = processedLineItems.reduce(
      (acc: ILedgerTotal, item: ILedgerItem) => {
        acc.totalDebitAmount += item.debitAmount;
        acc.totalCreditAmount += item.creditAmount;
        return acc;
      },
      {
        totalDebitAmount: 0,
        totalCreditAmount: 0,
        createdAt: 0,
        updatedAt: 0,
      }
    );

    // 7. 分頁處理
    const paginatedLedger = formatPaginatedLedger(processedLineItems, pageNumber, pageSize);

    ledgerPayload = {
      currencyAlias,
      items: paginatedLedger,
      total: sumUpData,
    };
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'listLedger in ledger.repo.ts failed',
      errorMessage: error as Error,
    });
  }

  return ledgerPayload;
}
