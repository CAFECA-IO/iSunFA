import { CurrencyType } from '@/constants/currency';
import { LabelType } from '@/constants/ledger';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IAccountBookLedgerJSON } from '@/interfaces/account_book_node';
import { getAllLineItemsInPrisma } from '@/lib/utils/repo/line_item.repo';
import { ILedgerItem, ILedgerTotal } from '@/interfaces/ledger';
import { getLedgerJSON } from '@/lib/utils/repo/account_book.repo';
import { getAccountingSettingByCompanyId } from '@/lib/utils/repo/accounting_setting.repo';
import { EventType, EVENT_TYPE_TO_VOUCHER_TYPE_MAP } from '@/constants/account';
import { ILineItemSimpleAccountVoucher } from '@/interfaces/line_item';

export const getLedgerFromAccountBook = async (
  companyId: number,
  startDate: number,
  endDate: number
): Promise<IAccountBookLedgerJSON[]> => {
  const ledger = await getLedgerJSON(companyId, startDate, endDate);
  return ledger;
};

export const filterLedgerByAccountNo = (
  ledgers: IAccountBookLedgerJSON[],
  startAccountNo?: string,
  endAccountNo?: string
): IAccountBookLedgerJSON[] => {
  if (!startAccountNo || !endAccountNo) {
    return ledgers;
  }
  // Info: (20241203 - Shirley) 依照字母排序，篩選出 account.no 在 startAccountNo 和 endAccountNo 之間的 ledger
  const sortedLedgers = ledgers.sort((a, b) => a.no.localeCompare(b.no));
  const filteredLedgers = sortedLedgers.filter((ledger) => {
    return ledger.no >= startAccountNo && ledger.no <= endAccountNo;
  });
  return filteredLedgers;
};

export const filterLedgerJSONByLabelType = (
  ledgerJSON: IAccountBookLedgerJSON[],
  labelType: LabelType
) => {
  const filteredLedgers = ledgerJSON.filter((ledger) => {
    if (labelType === LabelType.GENERAL) {
      return !ledger.no.toString().includes('-');
    } else if (labelType === LabelType.DETAILED) {
      return ledger.no.toString().includes('-');
    }
    return true;
  });
  return filteredLedgers;
};

export const filterLedgerItemsByLabelType = (ledgers: ILedgerItem[], labelType: LabelType) => {
  const filteredLedgers = ledgers.filter((ledger) => {
    if (labelType === LabelType.GENERAL) {
      return !ledger.no.toString().includes('-');
    } else if (labelType === LabelType.DETAILED) {
      return ledger.no.toString().includes('-');
    }
    return true;
  });
  return filteredLedgers;
};

export const convertLedgerJsonToCsvData = (
  ledgerJSON: IAccountBookLedgerJSON[],
  voucherMap: Map<
    number,
    {
      id: number;
      date: string;
      no: string;
      type: string;
    }
  >
) => {
  const csvData = ledgerJSON.map((ledger) => {
    const newLedger = {
      accountId: ledger.accountId,
      no: ledger.no,
      accountingTitle: ledger.accountingTitle,
      voucherNumber: voucherMap.get(ledger.voucherId)?.no,
      voucherDate: voucherMap.get(ledger.voucherId)?.date,
      particulars: ledger.description,
      debitAmount: ledger.debitAmount,
      creditAmount: ledger.creditAmount,
      balance: ledger.balance,
    };
    return newLedger;
  });
  return csvData;
};

/**
 * 驗證分頁參數是否有效
 */
export const validatePagination = (pageNumber: number): void => {
  if (pageNumber < 1) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }
};

/**
 * 獲取會計幣別設定
 */
export const fetchCurrencyAlias = async (companyId: number): Promise<CurrencyType> => {
  const accountingSettingData = await getAccountingSettingByCompanyId(companyId);
  return (accountingSettingData?.currency as CurrencyType) || CurrencyType.TWD;
};

/**
 * 獲取分錄明細
 */
export const fetchLineItems = async (
  companyId: number,
  startDate: number,
  endDate: number
): Promise<ILineItemSimpleAccountVoucher[]> => {
  const rs = await getAllLineItemsInPrisma(companyId, startDate, endDate, false);
  return rs;
};

/**
 * 根據科目範圍過濾分錄
 */
export const filterByAccountRange = (
  lineItems: ILineItemSimpleAccountVoucher[],
  startAccountNo?: string,
  endAccountNo?: string
): ILineItemSimpleAccountVoucher[] => {
  if (!startAccountNo && !endAccountNo) return lineItems;

  return lineItems.filter((item) => {
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
};

/**
 * 根據標籤類型過濾分錄
 */
export const filterByLabelType = (
  lineItems: ILineItemSimpleAccountVoucher[],
  labelType: LabelType
): ILineItemSimpleAccountVoucher[] => {
  if (labelType === LabelType.ALL) return lineItems;

  return lineItems.filter((item) => {
    const hasDash = item.account.code.includes('-');
    if (labelType === LabelType.GENERAL) {
      return !hasDash;
    } else if (labelType === LabelType.DETAILED) {
      return hasDash;
    }
    return true;
  });
};

/**
 * 排序並計算餘額變化
 */
export const sortAndCalculateBalances = (
  lineItems: ILineItemSimpleAccountVoucher[]
): ILedgerItem[] => {
  const accountBalances: { [key: string]: number } = {};

  return lineItems
    .sort((a, b) => {
      const codeCompare = a.account.code.localeCompare(b.account.code);
      if (codeCompare === 0) {
        return a.voucher.date - b.voucher.date;
      }
      return codeCompare;
    })
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
};

/**
 * 計算總額
 */
export const calculateTotals = (processedLineItems: ILedgerItem[]): ILedgerTotal => {
  return processedLineItems.reduce(
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
};
