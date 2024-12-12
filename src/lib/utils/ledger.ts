import { LabelType } from '@/constants/ledger';
import { IAccountBookLedgerJSON } from '@/interfaces/account_book_node';
import { ILedgerItem } from '@/interfaces/ledger';
import { getLedgerJSON } from '@/lib/utils/repo/account_book.repo';

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
