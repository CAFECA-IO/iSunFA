import React, { createContext, useState, useCallback, useMemo } from 'react';
import { IJournal } from '../interfaces/journal';

interface IAccountingContext {
  tempJournalList: IJournal[];
  addTempJournal: (journal: IJournal) => void;
  duplicateTempJournal: (id: string) => void;
  removeTempJournal: (id: string) => void;
}

interface IAccountingProvider {
  children: React.ReactNode;
}

export enum PaymentPeriod {
  AT_ONCE = 'At Once',
  INSTALLMENT = 'Installment',
}

export enum PaymentState {
  PAID = 'Paid',
  UNPAID = 'Unpaid',
  PARTIAL_PAID = 'Partial Paid',
}

const initialAccountingContext: IAccountingContext = {
  tempJournalList: [],
  addTempJournal: () => {},
  duplicateTempJournal: () => {},
  removeTempJournal: () => {},
};

export const AccountingContext = createContext<IAccountingContext>(initialAccountingContext);

export const AccountingProvider = ({ children }: IAccountingProvider) => {
  const [tempJournalList, setTempJournalList] = useState<IJournal[]>([]);

  // Info: (20240426 - Julian) 新增暫存日記帳
  const addTempJournal = useCallback(
    (journal: IJournal) => {
      setTempJournalList([...tempJournalList, journal]);
    },
    [tempJournalList]
  );

  // Info: (20240426 - Julian) 複製暫存日記帳
  const duplicateTempJournal = useCallback(
    (id: string) => {
      const targetJournal = tempJournalList.find((item) => item.id === id);
      const newId = `${targetJournal?.id}_copy`;

      if (targetJournal) {
        const duplicatedJournal = { ...targetJournal, id: newId };
        setTempJournalList([...tempJournalList, duplicatedJournal]);
      }
    },
    [tempJournalList]
  );

  // Info: (20240426 - Julian) 移除暫存日記帳
  const removeTempJournal = useCallback(
    (id: string) => {
      const newJournalList = tempJournalList.filter((item) => item.id !== id);
      setTempJournalList(newJournalList);
    },
    [tempJournalList]
  );

  const value = useMemo(
    () => ({
      tempJournalList,
      addTempJournal,
      duplicateTempJournal,
      removeTempJournal,
    }),
    [tempJournalList, addTempJournal, duplicateTempJournal, removeTempJournal]
  );

  return <AccountingContext.Provider value={value}>{children}</AccountingContext.Provider>;

  return <AccountingContext.Provider value={value}>{children}</AccountingContext.Provider>;
};

export const useAccountingCtx = () => {
  const context = React.useContext(AccountingContext);
  if (context === undefined) {
    throw new Error('useAccountingCtx must be used within a AccountingProvider');
  }
  return context;
};
