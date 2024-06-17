import { ProgressStatus } from '@/constants/account';
import { IJournal } from '@/interfaces/journal';
import { IUnprocessedOCR } from '@/interfaces/ocr';
import { IVoucher } from '@/interfaces/voucher';
import React, { createContext, useState, useCallback, useMemo, useEffect } from 'react';

interface IAccountingProvider {
  children: React.ReactNode;
}

export enum VoucherRowType {
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

  selectedOCR: IUnprocessedOCR | undefined;
  selectOCRHandler: (journal: IUnprocessedOCR | undefined) => void;
  selectedJournal: IJournal | undefined;
  selectJournalHandler: (journal: IJournal | undefined) => void;

  invoiceId: string | undefined;
  setInvoiceIdHandler: (id: string | undefined) => void;
  voucherId: string | undefined;
  setVoucherIdHandler: (id: string | undefined) => void;
  voucherPreview: IVoucher | undefined;
  setVoucherPreviewHandler: (voucher: IVoucher | undefined) => void;

  accountingVoucher: IAccountingVoucher[];
  addVoucherRowHandler: (type?: VoucherRowType) => void;
  deleteVoucherRowHandler: (id: number) => void;
  changeVoucherStringHandler: (index: number, value: string, type: VoucherString) => void;
  changeVoucherAmountHandler: (
    index: number,
    value: number | null,
    type: VoucherRowType,
    description?: string
  ) => void;
  clearVoucherHandler: () => void;

  totalDebit: number;
  totalCredit: number;
}

const initialAccountingContext: IAccountingContext = {
  // tempJournalList: [],
  // addTempJournal: () => {},
  // duplicateTempJournal: () => {},
  // removeTempJournal: () => {},

  selectedOCR: undefined,
  selectOCRHandler: () => {},
  selectedJournal: undefined,
  selectJournalHandler: () => {},

  invoiceId: '1',
  setInvoiceIdHandler: () => {},
  voucherId: undefined,
  setVoucherIdHandler: () => {},
  voucherPreview: undefined,
  setVoucherPreviewHandler: () => {},

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
  const [selectedOCR, setSelectedOCR] = useState<IUnprocessedOCR | undefined>(undefined);
  const [selectedJournal, setSelectedJournal] = useState<IJournal | undefined>(undefined);
  const [invoiceId, setInvoiceId] = useState<string | undefined>('');
  const [voucherId, setVoucherId] = useState<string | undefined>(undefined);
  const [voucherStatus, setVoucherStatus] = useState<ProgressStatus | undefined>(undefined);
  const [voucherPreview, setVoucherPreview] = useState<IVoucher | undefined>(undefined);

  const [accountingVoucher, setAccountingVoucher] = useState<IAccountingVoucher[]>([
    defaultAccountingVoucher,
  ]);
  const [totalDebit, setTotalDebit] = useState<number>(0); // Info: (20240430 - Julian) 計算總借方
  const [totalCredit, setTotalCredit] = useState<number>(0); // Info: (20240430 - Julian) 計算總貸方

  // Info: (20240430 - Julian) 新增日記帳列
  const addVoucherRowHandler = useCallback(
    (type?: VoucherRowType) => {
      // Info: (20240530 - Julian) 檢查 accountingVoucher 是否有列
      const isVoucherEmpty = !!accountingVoucher && accountingVoucher.length > 0;
      // Info: (20240530 - Julian) 若 accountingVoucher 為空，則新增 id = 0，否則最後一列 id + 1
      const newId = isVoucherEmpty ? accountingVoucher[accountingVoucher.length - 1].id + 1 : 0;

      switch (type) {
        // Info: (20240530 - Julian) 新增借方列
        case VoucherRowType.DEBIT:
          setAccountingVoucher((prev) => [
            ...prev,
            { id: newId, accountTitle: '', particulars: '', debit: 1, credit: 0 },
          ]);
          break;
        // Info: (20240530 - Julian) 新增貸方列
        case VoucherRowType.CREDIT:
          setAccountingVoucher((prev) => [
            ...prev,
            { id: newId, accountTitle: '', particulars: '', debit: 0, credit: 1 },
          ]);
          break;
        // Info: (20240530 - Julian) 新增空白列
        default:
          setAccountingVoucher((prev) => [
            ...prev,
            { id: newId, accountTitle: '', particulars: '', debit: 0, credit: 0 },
          ]);
          break;
      }
    },
    [accountingVoucher]
  );

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
    (index: number, value: number | null, type: VoucherRowType, description?: string) => {
      setAccountingVoucher((prev) => {
        // Info: (20240430 - Julian) 複製現有的傳票
        const newVoucher = [...prev];

        // Info: (20240430 - Julian) 新的 amount 值，若 value 為 null 則預設為 0
        const newAmount = value || 0;

        // Info: (20240430 - Julian) 找到要寫入的傳票 id
        const targetId = prev.findIndex((voucher) => voucher.id === index) ?? index;

        if (type === VoucherRowType.CREDIT) {
          // Info: (20240430 - Julian) credit 的處理：寫入 amount 值，如果 description 有值則寫入，否則不動作
          newVoucher[targetId].credit = newAmount;
          if (description) newVoucher[targetId].particulars = description;
        } else if (type === VoucherRowType.DEBIT) {
          // Info: (20240430 - Julian) debit 的處理：寫入 amount 值，如果 description 有值則寫入，否則不動作
          newVoucher[targetId].debit = newAmount;
          if (description) newVoucher[targetId].particulars = description;
        }

        return newVoucher;
      });
    },
    [accountingVoucher]
  );

  // Info: (20240503 - Julian) 清空傳票
  const clearVoucherHandler = useCallback(() => {
    setAccountingVoucher([defaultAccountingVoucher]); // Info: (20240503 - Julian) 清空傳票列表
    changeVoucherAmountHandler(0, 0, VoucherRowType.DEBIT); // Info: (20240503 - Julian) 清空借方 input
    changeVoucherAmountHandler(0, 0, VoucherRowType.CREDIT); // Info: (20240503 - Julian) 清空貸方 input
    changeVoucherStringHandler(0, '', VoucherString.ACCOUNT_TITLE); // Info: (20240503 - Julian) 清空科目 input
    changeVoucherStringHandler(0, '', VoucherString.PARTICULARS); // Info: (20240503 - Julian) 清空摘要 input
    // Info: (20240515 - Julian) 清空欄位資料
    setInvoiceId('');
    setVoucherId(undefined);
    setVoucherStatus(undefined);
    setVoucherPreview(undefined);
  }, []);

  // Info: (20240503 - Julian) 計算總借方/貸方
  useEffect(() => {
    const debit = accountingVoucher.reduce((acc, voucher) => acc + (voucher.debit || 0), 0);
    const credit = accountingVoucher.reduce((acc, voucher) => acc + (voucher.credit || 0), 0);
    setTotalDebit(debit);
    setTotalCredit(credit);
  }, [accountingVoucher]);

  const setInvoiceIdHandler = useCallback(
    (id: string | undefined) => setInvoiceId(id),
    [invoiceId]
  );
  const setVoucherIdHandler = useCallback(
    (id: string | undefined) => setVoucherId(id),
    [voucherId]
  );
  const setVoucherPreviewHandler = useCallback(
    (voucher: IVoucher | undefined) => setVoucherPreview(voucher),
    [voucherPreview]
  );

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

  const selectOCRHandler = useCallback(
    (OCR: IUnprocessedOCR | undefined) => setSelectedOCR(OCR),
    [selectedOCR]
  );

  const selectJournalHandler = useCallback(
    (journal: IJournal | undefined) => setSelectedJournal(journal),
    [selectedJournal]
  );

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

      invoiceId,
      setInvoiceIdHandler,
      voucherId,
      setVoucherIdHandler,
      voucherPreview,
      setVoucherPreviewHandler,

      selectedOCR,
      selectOCRHandler,
      selectedJournal,
      selectJournalHandler,
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
      invoiceId,
      voucherId,
      voucherStatus,
      voucherPreview,
      selectedOCR,
      selectOCRHandler,
      selectedJournal,
      selectJournalHandler,
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
