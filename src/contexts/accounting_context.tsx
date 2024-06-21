import { ProgressStatus } from '@/constants/account';
import { APIName } from '@/constants/api_connection';
import { IAccount } from '@/interfaces/accounting_account';
import { IJournal } from '@/interfaces/journal';
import { IUnprocessedOCR } from '@/interfaces/ocr';
import { IVoucher } from '@/interfaces/voucher';
import APIHandler from '@/lib/utils/api_handler';
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
  account: IAccount | null;
  particulars: string;
  debit: number | null;
  credit: number | null;
}

const defaultAccountingVoucher: IAccountingVoucher = {
  id: 0,
  account: null,
  particulars: '',
  debit: 0,
  credit: 0,
};

interface IAccountingContext {
  // tempJournalList: IJournal[];
  // addTempJournal: (journal: IJournal) => void;
  // duplicateTempJournal: (id: string) => void;
  // removeTempJournal: (id: string) => void;
  OCRList: IUnprocessedOCR[];
  OCRListStatus: { listSuccess: boolean | undefined; listCode: string | undefined };
  updateOCRListHandler: (companyId: number, update: boolean) => void;
  accountList: IAccount[];
  getAIStatusHandler: (
    params: { companyId: number; askAIId: string } | undefined,
    update: boolean
  ) => void;
  AIStatus: ProgressStatus;

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
  changeVoucherAccountHandler: (index: number, account: IAccount | undefined) => void;
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

  generateAccountTitle: (account: IAccount | null) => string;
}

const initialAccountingContext: IAccountingContext = {
  // tempJournalList: [],
  // addTempJournal: () => {},
  // duplicateTempJournal: () => {},
  // removeTempJournal: () => {},

  OCRList: [],
  OCRListStatus: { listSuccess: undefined, listCode: undefined },
  updateOCRListHandler: () => { },
  accountList: [],
  getAIStatusHandler: () => { },
  AIStatus: ProgressStatus.IN_PROGRESS,
  selectedOCR: undefined,
  selectOCRHandler: () => { },
  selectedJournal: undefined,
  selectJournalHandler: () => { },

  invoiceId: '1',
  setInvoiceIdHandler: () => { },
  voucherId: undefined,
  setVoucherIdHandler: () => { },
  voucherPreview: undefined,
  setVoucherPreviewHandler: () => { },

  // accountingVoucher: [defaultAccountingVoucher],
  accountingVoucher: [],
  addVoucherRowHandler: () => { },
  deleteVoucherRowHandler: () => { },
  changeVoucherStringHandler: () => { },
  changeVoucherAccountHandler: () => { },
  changeVoucherAmountHandler: () => { },
  clearVoucherHandler: () => { },

  totalDebit: 0,
  totalCredit: 0,

  generateAccountTitle: () => 'Account Title',
};

export const AccountingContext = createContext<IAccountingContext>(initialAccountingContext);

export const AccountingProvider = ({ children }: IAccountingProvider) => {
  const { data: accountList } = APIHandler<IAccount[]>(APIName.ACCOUNT_LIST, {});
  const {
    trigger: getAIStatus,
    data: status,
    success: statusSuccess,
    error: statusError,
  } = APIHandler<ProgressStatus>(APIName.AI_ASK_STATUS, {}, false, false);
  const {
    trigger: listUnprocessedOCR,
    data: unprocessOCRs,
    error: listError,
    success: listSuccess,
    code: listCode,
  } = APIHandler<IUnprocessedOCR[]>(APIName.OCR_LIST, {}, false, false);
  const [OCRListParams, setOCRListParams] = useState<
    { companyId: number; update: boolean } | undefined
  >(undefined);
  const [OCRList, setOCRList] = useState<IUnprocessedOCR[]>([]);
  const [OCRListStatus, setOCRLisStatus] = useState<{
    listSuccess: boolean | undefined;
    listCode: string | undefined;
  }>({
    listSuccess: undefined,
    listCode: undefined,
  });
  const [selectedOCR, setSelectedOCR] = useState<IUnprocessedOCR | undefined>(undefined);
  const [selectedJournal, setSelectedJournal] = useState<IJournal | undefined>(undefined);
  const [invoiceId, setInvoiceId] = useState<string | undefined>('');
  const [voucherId, setVoucherId] = useState<string | undefined>(undefined);
  const [voucherStatus, setVoucherStatus] = useState<ProgressStatus | undefined>(undefined);
  const [voucherPreview, setVoucherPreview] = useState<IVoucher | undefined>(undefined);

  const [askAIParams, setAskAIParams] = useState<{
    params: { companyId: number; askAIId: string } | undefined;
    update: boolean;
  }>({ params: undefined, update: false });
  const [AIStatus, setAIStatus] = useState<ProgressStatus>(ProgressStatus.IN_PROGRESS);
  const [accountingVoucher, setAccountingVoucher] = useState<IAccountingVoucher[]>([
    defaultAccountingVoucher,
  ]);
  const [totalDebit, setTotalDebit] = useState<number>(0); // Info: (20240430 - Julian) 計算總借方
  const [totalCredit, setTotalCredit] = useState<number>(0); // Info: (20240430 - Julian) 計算總貸方

  const getAIStatusHandler = (
    params: { companyId: number; askAIId: string } | undefined,
    update: boolean
  ) => {
    setAskAIParams({ params, update });
  };

  const updateOCRListHandler = (companyId: number, update: boolean) => {
    setOCRListParams({
      companyId,
      update,
    });
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (OCRListParams && OCRListParams.update) {
      interval = setInterval(() => {
        listUnprocessedOCR({
          params: {
            companyId: OCRListParams.companyId,
          },
        });
      }, 2000);
      if (OCRListStatus.listSuccess !== listSuccess || OCRListStatus.listCode !== listCode) {
        setOCRLisStatus({
          listSuccess,
          listCode,
        });
      }
      if (listSuccess && unprocessOCRs) {
        setOCRList(unprocessOCRs);
      }
      if (listSuccess === false) {
        setOCRListParams((prev) => (prev ? { ...prev, update: false } : prev));
      }
    }
    return () => clearInterval(interval);
  }, [OCRListParams, listError, listSuccess, listCode, unprocessOCRs]);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (askAIParams.params !== undefined && askAIParams.update) {
      interval = setInterval(() => {
        getAIStatus({
          params: {
            companyId: askAIParams.params!.companyId,
            resultId: askAIParams.params!.askAIId,
          },
        });
      }, 2000);
    }
    if ((statusSuccess && status === ProgressStatus.SUCCESS) || statusError) {
      setAIStatus(status ?? ProgressStatus.LLM_ERROR);
      setAskAIParams((prev) => (prev ? { ...prev, update: false } : prev));
    }
    return () => clearInterval(interval);
  }, [askAIParams, status, statusSuccess, statusError]);

  const generateAccountTitle = (account: IAccount | null) => {
    if (account) return account.code.substring(0, 4) + ' - ' + account.name;
    return 'Account Title';
  };

  // Info: (20240430 - Julian) 新增日記帳列
  const addVoucherRowHandler = useCallback(
    (type?: VoucherRowType) => {
      // Info: (20240530 - Julian) 檢查 accountingVoucher 是否有列
      const isVoucherEmpty = !!accountingVoucher && accountingVoucher.length > 0;
      // Info: (20240530 - Julian) 若 accountingVoucher 為空，則新增 id = 0，否則最後一列 id + 1
      const newId = isVoucherEmpty ? accountingVoucher[accountingVoucher.length - 1].id + 1 : 0;
      const account = accountList && accountList.length > 0 ? accountList[0] : null;

      switch (type) {
        // Info: (20240530 - Julian) 新增借方列
        case VoucherRowType.DEBIT:
          setAccountingVoucher((prev) => [
            ...prev,
            {
              id: newId,
              account,
              particulars: '',
              debit: 1,
              credit: 0,
            },
          ]);
          break;
        // Info: (20240530 - Julian) 新增貸方列
        case VoucherRowType.CREDIT:
          setAccountingVoucher((prev) => [
            ...prev,
            {
              id: newId,
              account,
              particulars: '',
              debit: 0,
              credit: 1,
            },
          ]);
          break;
        // Info: (20240530 - Julian) 新增空白列
        default:
          setAccountingVoucher((prev) => [
            ...prev,
            { id: newId, account: null, particulars: '', debit: 0, credit: 0 },
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

  const changeVoucherAccountHandler = useCallback(
    (index: number, account: IAccount | undefined) => {
      setAccountingVoucher((prev) => {
        const newVoucher = [...prev];
        const targetId = prev.findIndex((voucher) => voucher.id === index);
        newVoucher[targetId].account = account ?? null;
        return newVoucher;
      });
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
        if (type === VoucherString.PARTICULARS) {
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
    setAskAIParams((prev) => (prev ? { ...prev, update: false } : prev));
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
      OCRList,
      OCRListStatus,
      updateOCRListHandler,
      accountList: accountList ?? [],
      getAIStatusHandler,
      AIStatus,
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

      generateAccountTitle,
      changeVoucherAccountHandler,
    }),
    [
      OCRList,
      OCRListStatus,
      AIStatus,
      accountList,
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
