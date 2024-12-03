import { LabelType } from '@/constants/ledger';
import { IAccountBookLedgerJSON } from '@/interfaces/account_book_node';
import { ILedgerItem } from '@/interfaces/ledger';
import { getLedgerJSON } from '@/lib/utils/repo/account_book.repo';

export const getLedgerFromAccountBook = async (
  companyId: number,
  startDate: number,
  endDate: number
) => {
  const ledger = await getLedgerJSON(companyId, startDate, endDate);
  return ledger;
};

export const filterLedgerByAccountNo = async (
  ledgers: IAccountBookLedgerJSON[],
  startAccountNo?: string,
  endAccountNo?: string
) => {
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

export const filterLedgerByLabelType = async (ledgers: ILedgerItem[], labelType: LabelType) => {
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
