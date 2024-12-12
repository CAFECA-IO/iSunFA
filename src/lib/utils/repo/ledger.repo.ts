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
import {
  filterLedgerByAccountNo,
  filterLedgerItemsByLabelType,
  getLedgerFromAccountBook,
} from '@/lib/utils/ledger';
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

    // Info: (20241112 - Shirley) 1. 取得會計設定的貨幣別
    const accountingSettingData = await prisma.accountingSetting.findFirst({
      where: { id: companyId },
    });

    let currencyAlias = 'TWD';
    if (accountingSettingData) {
      currencyAlias = accountingSettingData.currency || 'TWD';
    }

    const ledgerJSON = await getLedgerFromAccountBook(companyId, startDate, endDate);
    const voucherIds = ledgerJSON.map((item) => item.voucherId);
    // Info: (20241203 - Shirley) use voucherIds to get voucher data in voucher table
    const vouchers = await prisma.voucher.findMany({
      where: {
        id: { in: voucherIds },
      },
      select: {
        id: true,
        date: true,
        type: true,
        no: true,
      },
    });

    const filteredLedgerByAccount = await filterLedgerByAccountNo(
      ledgerJSON,
      startAccountNo,
      endAccountNo
    );

    const combineAndTrimData: ILedgerItem[] = filteredLedgerByAccount.map((ledger) => {
      const { description: particulars, deletedAt, amount, debit, ...rest } = ledger;
      const voucherData = vouchers.find((voucher) => voucher.id === ledger.voucherId);
      const voucherDate = voucherData?.date ?? 0;
      const voucherNumber = voucherData?.no ?? '';
      const voucherType =
        EVENT_TYPE_TO_VOUCHER_TYPE_MAP[voucherData?.type as EventType] || voucherData?.type;
      return {
        ...rest,
        particulars,
        voucherDate,
        voucherType,
        voucherNumber,
      };
    });
    const filteredLedgerByLabelType = await filterLedgerItemsByLabelType(
      combineAndTrimData,
      labelType
    );

    const sumUpData = filteredLedgerByLabelType.reduce(
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

    const paginatedLedger = formatPaginatedLedger(filteredLedgerByLabelType, pageNumber, pageSize);

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

export const findVouchersByVoucherIds = async (
  voucherIds: number[]
): Promise<{ id: number; date: number; no: string; type: string }[]> => {
  const vouchers = await prisma.voucher.findMany({
    where: {
      id: { in: voucherIds },
    },
    select: {
      id: true,
      date: true,
      no: true,
      type: true,
    },
  });
  return vouchers;
};
