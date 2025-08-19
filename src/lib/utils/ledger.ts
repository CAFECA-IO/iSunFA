import { LabelType } from '@/constants/ledger';
import { getAllLineItemsInPrisma } from '@/lib/utils/repo/line_item.repo';
import { ILedgerItem, ILedgerTotal } from '@/interfaces/ledger';
import { EventType, EVENT_TYPE_TO_VOUCHER_TYPE_MAP, VoucherType } from '@/constants/account';
import { ILineItemSimpleAccountVoucher } from '@/interfaces/line_item';

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

export const convertLedgerItemToCsvData = (
  ledgerItems: ILedgerItem[],
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
  const csvData = ledgerItems.map((item) => {
    return {
      accountId: item.accountId,
      no: item.no,
      accountingTitle: item.accountingTitle,
      voucherNumber: voucherMap.get(item.voucherId)?.no,
      voucherDate: voucherMap.get(item.voucherId)?.date,
      particulars: item.particulars,
      debitAmount: item.debitAmount,
      creditAmount: item.creditAmount,
      balance: item.balance,
    };
  });
  return csvData;
};

/** Info: (20241224 - Shirley)
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

/** Info: (20241224 - Shirley)
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

/** Info: (20241224 - Shirley)
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

/** Info: (20241224 - Shirley)
 * 排序並計算餘額變化
 */
export const sortAndCalculateBalances = (
  lineItems: ILineItemSimpleAccountVoucher[]
): ILedgerItem[] => {
  const accountBalances: { [key: string]: number } = {};

  const output = lineItems
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
      const amountNumber =
        typeof item.amount === 'string' ? parseFloat(item.amount) : item.amount.toNumber();
      const debit = item.debit ? amountNumber : 0;
      const credit = !item.debit ? amountNumber : 0;
      const balanceChange = item.debit ? amountNumber : -amountNumber;
      accountBalances[accountKey] += balanceChange;

      /* Info: (20250115 - Luphia) convert item.vaucher.type to VoucherType
       * 1. itee.voucher.type might be EventType
       * 2. item.voucher.type might be VoucherType
       * 3. item.voucher.type might be string or undefined
       */
      const voucherType = (EVENT_TYPE_TO_VOUCHER_TYPE_MAP[item.voucher.type as EventType] ||
        item.voucher.type) as VoucherType;

      return {
        id: item.id,
        accountId: item.accountId,
        voucherId: item.voucherId,
        voucherDate: item.voucher.date,
        no: item.account.code,
        accountingTitle: item.account.name,
        voucherNumber: item.voucher.no,
        voucherType,
        particulars: item.description,
        debitAmount: debit,
        creditAmount: credit,
        balance: accountBalances[accountKey],
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    });
  return output;
};

/** Info: (20241224 - Shirley)
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
