import React, { createContext, useState, useCallback, useMemo, useEffect } from 'react';

interface IAccountingProvider {
  children: React.ReactNode;
}

export enum PaymentPeriod {
  AT_ONCE = 'atOnce',
  INSTALLMENT = 'installment',
}

export enum PaymentState {
  PAID = 'paid',
  UNPAID = 'unpaid',
  PARTIAL_PAID = 'partial',
}

export enum VoucherType {
  DEBIT = 'debit',
  CREDIT = 'credit',
}

export enum VoucherString {
  ACCOUNT_TITLE = 'accountTitle',
  PARTICULARS = 'particulars',
}

export interface IAccountingVoucher {
  id: number;
  accountTitle: string;
  particulars: string;
  debit: number | null;
  credit: number | null;
}

const defaultAccountingVoucher: IAccountingVoucher = {
  id: 0,
  accountTitle: '',
  particulars: '',
  debit: 0,
  credit: 0,
};

interface IAccountingContext {
  // tempJournalList: IJournal[];
  // addTempJournal: (journal: IJournal) => void;
  // duplicateTempJournal: (id: string) => void;
  // removeTempJournal: (id: string) => void;

  companyId: string;
  ocrResultId: string;
  setOcrResultIdHandler: (id: string) => void;
  voucherId: string;
  setVoucherIdHandler: (id: string) => void;

  accountingVoucher: IAccountingVoucher[];
  addVoucherRowHandler: () => void;
  deleteVoucherRowHandler: (id: number) => void;
  changeVoucherStringHandler: (index: number, value: string, type: VoucherString) => void;
  changeVoucherAmountHandler: (index: number, value: number | null, type: VoucherType) => void;
  clearVoucherHandler: () => void;

  totalDebit: number;
  totalCredit: number;
}

const initialAccountingContext: IAccountingContext = {
  // tempJournalList: [],
  // addTempJournal: () => {},
  // duplicateTempJournal: () => {},
  // removeTempJournal: () => {},

  companyId: '',
  ocrResultId: '',
  setOcrResultIdHandler: () => {},
  voucherId: '',
  setVoucherIdHandler: () => {},

  accountingVoucher: [defaultAccountingVoucher],
  addVoucherRowHandler: () => {},
  deleteVoucherRowHandler: () => {},
  changeVoucherStringHandler: () => {},
  changeVoucherAmountHandler: () => {},
  clearVoucherHandler: () => {},

  totalDebit: 0,
  totalCredit: 0,
};

export const AccountingContext = createContext<IAccountingContext>(initialAccountingContext);

export const AccountingProvider = ({ children }: IAccountingProvider) => {
  const [companyId, setCompanyId] = useState<string>('1'); // TODO: Dummy data for companyId, need to replace with real data @Julian (20240509 - Tzuhan)
  const [voucherId, setVoucherResultId] = useState<string>('');
  const [ocrResultId, setOcrResultId] = useState<string>('');

  const [accountingVoucher, setAccountingVoucher] = useState<IAccountingVoucher[]>([
    defaultAccountingVoucher,
  ]);
  const [totalDebit, setTotalDebit] = useState<number>(0); // Info: (20240430 - Julian) 計算總借方
  const [totalCredit, setTotalCredit] = useState<number>(0); // Info: (20240430 - Julian) 計算總貸方

  // Info: (20240430 - Julian) 新增日記帳列
  const addVoucherRowHandler = useCallback(() => {
    setAccountingVoucher((prev) => [
      ...prev,
      {
        id: prev[prev.length - 1].id + 1,
        accountTitle: '',
        particulars: '',
        debit: 0,
        credit: 0,
      },
    ]);
  }, [accountingVoucher]);

  // Info: (20240430 - Julian) 刪除日記帳列
  const deleteVoucherRowHandler = useCallback(
    (id: number) => {
      setAccountingVoucher((prev) => prev.filter((voucher) => voucher.id !== id));
    },
    [accountingVoucher]
  );

  // Info: (20240430 - Julian) 將 account title/particulars 值寫入 state
  const changeVoucherStringHandler = useCallback(
    (index: number, value: string | undefined, type: VoucherString) => {
      setAccountingVoucher((prev) => {
        const newVoucher = [...prev]; // Info: (20240430 - Julian) 複製現有的傳票
        const newStr = value || ''; // Info: (20240430 - Julian) 若 value 為 undefined 則預設為空字串
        const targetId = prev.findIndex((voucher) => voucher.id === index); // Info: (20240430 - Julian) 找到要寫入的傳票 id
        if (type === VoucherString.ACCOUNT_TITLE) {
          newVoucher[targetId].accountTitle = newStr; // Info: (20240430 - Julian) 寫入新的 account title 值
        } else if (type === VoucherString.PARTICULARS) {
          newVoucher[targetId].particulars = newStr; // Info: (20240430 - Julian) 寫入新的 particulars 值
        }
        return newVoucher;
      });
    },
    [accountingVoucher]
  );

  // Info: (20240430 - Julian) 將 debit/credit 值寫入 state
  const changeVoucherAmountHandler = useCallback(
    (index: number, value: number | null, type: VoucherType) => {
      setAccountingVoucher((prev) => {
        const newVoucher = [...prev]; // Info: (20240430 - Julian) 複製現有的傳票
        const newAmount = value || 0; // Info: (20240430 - Julian) 若 value 為 null 則預設為 0
        const targetId = prev.findIndex((voucher) => voucher.id === index); // Info: (20240430 - Julian) 找到要寫入的傳票 id
        if (type === VoucherType.CREDIT) {
          newVoucher[targetId].credit = newAmount; // Info: (20240430 - Julian) 寫入新的 credit 值
        } else if (type === VoucherType.DEBIT) {
          newVoucher[targetId].debit = newAmount; // Info: (20240430 - Julian) 寫入新的 debit 值
        }
        return newVoucher;
      });
    },
    [accountingVoucher]
  );

  // Info: (20240503 - Julian) 清空傳票
  const clearVoucherHandler = useCallback(() => {
    setAccountingVoucher([defaultAccountingVoucher]); // Info: (20240503 - Julian) 清空傳票列表
    changeVoucherAmountHandler(0, 0, VoucherType.DEBIT); // Info: (20240503 - Julian) 清空借方 input
    changeVoucherAmountHandler(0, 0, VoucherType.CREDIT); // Info: (20240503 - Julian) 清空貸方 input
    changeVoucherStringHandler(0, '', VoucherString.ACCOUNT_TITLE); // Info: (20240503 - Julian) 清空科目 input
    changeVoucherStringHandler(0, '', VoucherString.PARTICULARS); // Info: (20240503 - Julian) 清空摘要 input
  }, []);

  // Info: (20240503 - Julian) 計算總借方/貸方
  useEffect(() => {
    const debit = accountingVoucher.reduce((acc, voucher) => acc + (voucher.debit || 0), 0);
    const credit = accountingVoucher.reduce((acc, voucher) => acc + (voucher.credit || 0), 0);
    setTotalDebit(debit);
    setTotalCredit(credit);
  }, [accountingVoucher]);

  // Info: (20240430 - Julian) 設定 OCR 回傳的結果 id
  const setCompanyIdHandler = useCallback((id: string) => setCompanyId(id), [companyId]);
  const setOcrResultIdHandler = useCallback((id: string) => setOcrResultId(id), [ocrResultId]);
  const setVoucherIdHandler = useCallback((id: string) => setVoucherResultId(id), [voucherId]);

  // Info: (20240430 - Julian) ------------ 目前已經取消暫存日記帳的功能，預計刪除以下程式碼 ------------
  // const [tempJournalList, setTempJournalList] = useState<IJournal[]>([]);

  // // Info: (20240426 - Julian) 新增暫存日記帳
  // const addTempJournal = useCallback(
  //   (journal: IJournal) => {
  //     setTempJournalList([...tempJournalList, journal]);
  //   },
  //   [tempJournalList]
  // );

  // // Info: (20240426 - Julian) 複製暫存日記帳
  // const duplicateTempJournal = useCallback(
  //   (id: string) => {
  //     const targetJournal = tempJournalList.find((item) => item.id === id);
  //     const newId = `${targetJournal?.basicInfo.description}_${Date.now()}_copy`;

  //     if (targetJournal) {
  //       const duplicatedJournal = { ...targetJournal, id: newId };
  //       setTempJournalList([...tempJournalList, duplicatedJournal]);
  //     }
  //   },
  //   [tempJournalList]
  // );

  // // Info: (20240426 - Julian) 移除暫存日記帳
  // const removeTempJournal = useCallback(
  //   (id: string) => {
  //     const newJournalList = tempJournalList.filter((item) => item.id !== id);
  //     setTempJournalList(newJournalList);
  //   },
  //   [tempJournalList]
  // );

  const value = useMemo(
    () => ({
      accountingVoucher,
      addVoucherRowHandler,
      deleteVoucherRowHandler,
      changeVoucherStringHandler,
      changeVoucherAmountHandler,
      clearVoucherHandler,
      totalDebit,
      totalCredit,

      companyId,
      setCompanyIdHandler,
      ocrResultId,
      setOcrResultIdHandler,
      voucherId,
      setVoucherIdHandler,
    }),
    [
      accountingVoucher,
      addVoucherRowHandler,
      deleteVoucherRowHandler,
      changeVoucherStringHandler,
      changeVoucherAmountHandler,
      clearVoucherHandler,
      totalDebit,
      totalCredit,
      companyId,
      ocrResultId,
      voucherId,
    ]
  );

  return <AccountingContext.Provider value={value}>{children}</AccountingContext.Provider>;
};

export const useAccountingCtx = () => {
  const context = React.useContext(AccountingContext);
  if (context === undefined) {
    throw new Error('useAccountingCtx must be used within a AccountingProvider');
  }
  return context;
};
