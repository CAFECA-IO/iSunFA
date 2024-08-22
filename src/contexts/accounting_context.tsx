import { ProgressStatus } from '@/constants/account';
import { APIName } from '@/constants/api_connection';
import { IAccount, IPaginatedAccount } from '@/interfaces/accounting_account';
import { IJournal } from '@/interfaces/journal';
import { IOCR } from '@/interfaces/ocr';
import { IVoucher } from '@/interfaces/voucher';
import APIHandler from '@/lib/utils/api_handler';
import { getTimestampNow } from '@/lib/utils/common';
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

// Info: (2024709 - Anna) 定義傳票類型到翻譯鍵值的映射
interface AccountTitleMap {
  [key: string]: string;
}

export const accountTitleMap: AccountTitleMap = {
  Income: 'PROJECT.INCOME',
  Payment: 'JOURNAL.PAYMENT',
  Transfer: 'JOURNAL.TRANSFER',
};

interface IAccountingContext {
  // tempJournalList: IJournal[];
  // addTempJournal: (journal: IJournal) => void;
  // duplicateTempJournal: (id: string) => void;
  // removeTempJournal: (id: string) => void;
  OCRList: IOCR[];
  OCRListStatus: { listSuccess: boolean | undefined; listCode: string | undefined };
  updateOCRListHandler: (companyId: number | undefined, update: boolean) => void;
  addOCRHandler: (
    aichId: string,
    imageName: string,
    imageUrl: string,
    imageSize: string,
    uploadIdentifier: string
  ) => void;
  deleteOCRHandler: (aichId: string) => void;
  addPendingOCRHandler: (imageName: string, imageSize: string, uploadIdentifier: string) => void;
  deletePendingOCRHandler: (uploadIdentifier: string) => void;
  accountList: IAccount[];
  getAccountListHandler: (
    companyId: number,
    type?: string,
    liquidity?: string,
    page?: number,
    limit?: number,
    // Info (20240722 - Murky) @Julian, query will match IAccountQueryArgs
    includeDefaultAccount?: boolean,
    reportType?: string,
    equityType?: string,
    forUser?: boolean,
    sortBy?: string,
    sortOrder?: string,
    searchKey?: string
  ) => void;
  getAIStatusHandler: (
    params: { companyId: number; askAIId: string } | undefined,
    update: boolean
  ) => void;
  AIStatus: ProgressStatus;
  inputDescription: string;

  selectedOCR: IOCR | undefined;
  selectOCRHandler: (journal: IOCR | undefined) => void;
  selectedJournal: IJournal | undefined;
  selectJournalHandler: (journal: IJournal | undefined) => void;
  inputDescriptionHandler: (description: string) => void;

  invoiceId: string | undefined;
  setInvoiceIdHandler: (id: string | undefined) => void;
  voucherId: string | undefined;
  setVoucherIdHandler: (id: string | undefined) => void;
  voucherPreview: IVoucher | undefined;
  setVoucherPreviewHandler: (voucher: IVoucher | undefined) => void;

  accountingVoucher: IAccountingVoucher[];
  addVoucherRowHandler: (count: number, type?: VoucherRowType) => void;
  changeVoucherAccountHandler: (index: number, account: IAccount | undefined) => void;
  deleteVoucherRowHandler: (id: number) => void;
  changeVoucherStringHandler: (index: number, value: string, type: VoucherString) => void;
  changeVoucherAmountHandler: (
    index: number,
    value: number | null,
    type: VoucherRowType,
    description?: string
  ) => void;
  resetVoucherHandler: () => void;

  totalDebit: number;
  totalCredit: number;

  generateAccountTitle: (account: IAccount | null) => string;

  deleteOwnAccountTitle: (companyId: number, id: number) => void;
  pendingOCRList: IOCR[];
}

const initialAccountingContext: IAccountingContext = {
  // tempJournalList: [],
  // addTempJournal: () => {},
  // duplicateTempJournal: () => {},
  // removeTempJournal: () => {},

  OCRList: [],
  OCRListStatus: { listSuccess: undefined, listCode: undefined },
  updateOCRListHandler: () => {},
  addOCRHandler: () => {},
  deleteOCRHandler: () => {},
  addPendingOCRHandler: () => {},
  deletePendingOCRHandler: () => {},
  accountList: [],
  getAccountListHandler: () => {},
  getAIStatusHandler: () => {},
  AIStatus: ProgressStatus.IN_PROGRESS,
  selectedOCR: undefined,
  selectOCRHandler: () => {},
  selectedJournal: undefined,
  selectJournalHandler: () => {},
  inputDescription: '',
  inputDescriptionHandler: () => {},

  invoiceId: '1',
  setInvoiceIdHandler: () => {},
  voucherId: undefined,
  setVoucherIdHandler: () => {},
  voucherPreview: undefined,
  setVoucherPreviewHandler: () => {},

  accountingVoucher: [],
  addVoucherRowHandler: () => {},
  deleteVoucherRowHandler: () => {},
  changeVoucherStringHandler: () => {},
  changeVoucherAccountHandler: () => {},
  changeVoucherAmountHandler: () => {},
  resetVoucherHandler: () => {},

  totalDebit: 0,
  totalCredit: 0,

  generateAccountTitle: () => 'Account Title',

  deleteOwnAccountTitle: () => {},
  pendingOCRList: [],
};

export const AccountingContext = createContext<IAccountingContext>(initialAccountingContext);

export const AccountingProvider = ({ children }: IAccountingProvider) => {
  const {
    trigger: getAccountList,
    data: accountTitleList,
    success: accountSuccess,
  } = APIHandler<IPaginatedAccount>(APIName.ACCOUNT_LIST);
  const { trigger: getAIStatus } = APIHandler<ProgressStatus>(APIName.AI_ASK_STATUS);
  const {
    trigger: listUnprocessedOCR,
    data: unprocessOCRs,
    error: listError,
    success: listSuccess,
    code: listCode,
  } = APIHandler<IOCR[]>(APIName.OCR_LIST);
  const {
    trigger: deleteAccountById,
    data: deleteResult,
    success: deleteSuccess,
  } = APIHandler<IAccount>(APIName.DELETE_ACCOUNT_BY_ID);
  const [OCRListParams, setOCRListParams] = useState<
    { companyId: number; update: boolean } | undefined
  >(undefined);
  const [OCRList, setOCRList] = useState<IOCR[]>([]);
  const [OCRListStatus, setOCRLisStatus] = useState<{
    listSuccess: boolean | undefined;
    listCode: string | undefined;
  }>({
    listSuccess: undefined,
    listCode: undefined,
  });

  const [selectedOCR, setSelectedOCR] = useState<IOCR | undefined>(undefined);
  const [selectedJournal, setSelectedJournal] = useState<IJournal | undefined>(undefined);
  const [invoiceId, setInvoiceId] = useState<string | undefined>('');
  const [voucherId, setVoucherId] = useState<string | undefined>(undefined);
  const [voucherStatus, setVoucherStatus] = useState<ProgressStatus | undefined>(undefined);
  const [voucherPreview, setVoucherPreview] = useState<IVoucher | undefined>(undefined);
  const [AIStatus, setAIStatus] = useState<ProgressStatus>(ProgressStatus.IN_PROGRESS);
  const [stopAskAI, setStopAskAI] = useState<boolean>(false);
  const [accountingVoucher, setAccountingVoucher] = useState<IAccountingVoucher[]>([
    defaultAccountingVoucher,
  ]);
  const [totalDebit, setTotalDebit] = useState<number>(0); // Info: (20240430 - Julian) 計算總借方
  const [totalCredit, setTotalCredit] = useState<number>(0); // Info: (20240430 - Julian) 計算總貸方

  const [accountList, setAccountList] = useState<IAccount[]>([]);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [inputDescription, setInputDescription] = useState<string>('');

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [pendingOCRList, setPendingOCRList] = useState<IOCR[]>([]);

  const getAccountListHandler = (
    companyId: number,
    type?: string,
    liquidity?: string,
    page?: number,
    limit?: number,
    // ToDo: (20240719 - Julian) lack of keyword search
    // Info (20240722 - Murky) @Julian, query will match IAccountQueryArgs
    includeDefaultAccount?: boolean,
    reportType?: string,
    equityType?: string,
    forUser?: boolean,
    sortBy?: string,
    sortOrder?: string,
    searchKey?: string
    // isDeleted?: boolean
  ) => {
    getAccountList({
      params: { companyId },
      query: {
        type,
        liquidity,
        page,
        limit: Number.MAX_SAFE_INTEGER,
        // Info: (20240720 - Murky) @Julian, I set default value for these query params
        includeDefaultAccount: true,
        reportType,
        equityType,
        forUser: true,
        sortBy,
        sortOrder,
        searchKey,
        isDeleted: false,
      },
    });
  };

  const getAIStatusHandler = useCallback(
    (params: { companyId: number; askAIId: string } | undefined, update: boolean) => {
      if (update) {
        setAIStatus(ProgressStatus.IN_PROGRESS);
        setStopAskAI(false);
        const interval = setInterval(async () => {
          const { success, data } = await getAIStatus({
            params: {
              companyId: params!.companyId,
              resultId: params!.askAIId,
            },
          });
          if ((success && data !== ProgressStatus.IN_PROGRESS) || success === false) {
            setAIStatus(data ?? ProgressStatus.LLM_ERROR);
            clearInterval(interval);
          }
        }, 5000);
        setIntervalId(interval);
      } else {
        setStopAskAI(true);
      }
    },
    [stopAskAI]
  );

  useEffect(() => {
    if (stopAskAI && intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
  }, [stopAskAI, intervalId]);

  const updateOCRListHandler = (companyId: number | undefined, update: boolean) => {
    if (companyId) {
      setOCRListParams({
        companyId,
        update,
      });
    }
  };

  // Info: (20240820 - Shirley) 新增一個合併 OCR 列表的函數
  const mergeOCRLists = useCallback((apiList: IOCR[], currentList: IOCR[]) => {
    const apiSet = new Set(apiList.map((ocr) => ocr.aichResultId)); // Info: (20240820 - Shirley) 使用 Set 儲存 apiList 的 aichResultId ，避免雙重迴圈
    const mergedList = [
      ...apiList,
      ...currentList.filter((localOCR) => !apiSet.has(localOCR.aichResultId)),
    ];

    // Info: (20240820 - Shirley) 按創建時間排序，最舊的在前面
    mergedList.sort((a, b) => a.createdAt - b.createdAt);

    return mergedList;
  }, []);

  const deleteOCRHandler = useCallback((aichId: string) => {
    setOCRList((prevList) => prevList.filter((ocr) => ocr.aichResultId !== aichId));
  }, []);

  const addOCRHandler = useCallback(
    (
      aichId: string,
      imageName: string,
      imageUrl: string,
      imageSize: string,
      uploadIdentifier: string
    ) => {
      const now = getTimestampNow();
      const newOCR: IOCR = {
        id: now,
        aichResultId: aichId,
        imageName,
        imageUrl,
        imageSize,
        progress: 100,
        status: ProgressStatus.SUCCESS,
        createdAt: now,
        uploadIdentifier,
      };
      setOCRList((prevList) => mergeOCRLists([newOCR], prevList));
    },
    [mergeOCRLists]
  );

  const addPendingOCRHandler = (imageName: string, imageSize: string, uploadIdentifier: string) => {
    const ocr: IOCR = {
      id: getTimestampNow(),
      aichResultId: getTimestampNow().toString(),
      imageName,
      imageUrl: '',
      progress: 0,
      status: ProgressStatus.WAITING_FOR_UPLOAD,
      imageSize,
      createdAt: 0,
      uploadIdentifier,
    };
    setPendingOCRList((prev) => {
      const rs = [...prev, ocr];
      return rs;
    });
  };

  const deletePendingOCRHandler = (uploadIdentifier: string) => {
    setPendingOCRList((prev) => {
      const rs = prev.filter((ocr) => ocr.uploadIdentifier !== uploadIdentifier);
      return rs;
    });
  };

  useEffect(() => {
    if (accountSuccess && accountTitleList) {
      setAccountList(accountTitleList.data);
    }
  }, [accountSuccess, accountTitleList]);

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
        setOCRList((prevList) => mergeOCRLists(unprocessOCRs, prevList));
      }
      if (listSuccess === false) {
        setOCRListParams((prev) => (prev ? { ...prev, update: false } : prev));
      }
    }
    return () => clearInterval(interval);
  }, [OCRListParams, listError, listSuccess, listCode, unprocessOCRs]);

  const generateAccountTitle = (account: IAccount | null) => {
    if (account) return account.code + ' - ' + account.name;
    return `JOURNAL.ACCOUNT_TITLE`;
  };

  const deleteOwnAccountTitle = (companyId: number, id: number) => {
    deleteAccountById({
      params: { companyId, accountId: id },
    });
  };

  // Info: (20240430 - Julian) 新增日記帳列
  const addVoucherRowHandler = useCallback(
    (count: number, type?: VoucherRowType) => {
      // Info: (20240530 - Julian) 檢查 accountingVoucher 是否有列
      const isNotEmpty = !!accountingVoucher && accountingVoucher.length > 0;
      // Info: (20240530 - Julian) 檢查 accountingVoucher 是否為預設值
      const isDefault = accountingVoucher.length === 1 && accountingVoucher[0].id === 0;
      // Info: (20240729 - Julian) 如果 accountingVoucher 有值，則取得最後一個 id；若為預設值，則 id 為 0；否則 id 為 1
      const newId = isNotEmpty
        ? accountingVoucher[accountingVoucher.length - 1].id + 1
        : isDefault
          ? 0
          : 1;

      switch (type) {
        // Info: (20240530 - Julian) 新增借方列
        case VoucherRowType.DEBIT: {
          const newDebitRow = Array.from({ length: count }, (_, i) => ({
            id: i + newId, // Info: (20240729 - Julian) 根據 i 的數量新增 id
            account: null,
            particulars: '',
            debit: 1,
            credit: 0,
          }));

          setAccountingVoucher((prev) => [...prev, ...newDebitRow]);
          break;
        }
        // Info: (20240530 - Julian) 新增貸方列
        case VoucherRowType.CREDIT: {
          const newCreditRow = Array.from({ length: count }, (_, i) => ({
            id: i + newId, // Info: (20240729 - Julian) 根據 i 的數量新增 id
            account: null,
            particulars: '',
            debit: 0,
            credit: 1,
          }));

          setAccountingVoucher((prev) => [...prev, ...newCreditRow]);
          break;
        }
        // Info: (20240530 - Julian) 新增空白列
        default: {
          const newRow = Array.from({ length: count }, (_, i) => ({
            id: i + newId, // Info: (20240729 - Julian) 根據 i 的數量新增 id
            account: null,
            particulars: '',
            debit: 0,
            credit: 0,
          }));

          setAccountingVoucher((prev) => [...prev, ...newRow]);
          break;
        }
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

        if (!newVoucher[targetId]) {
          return prev;
        }

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
        const targetId = prev.findIndex((voucher) => voucher.id === index) ?? index; // Info: (20240430 - Julian) 找到要寫入的傳票 id
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

        // Info: (20240430 - Julian) 若找不到對應的傳票，則不寫入
        if (!newVoucher[targetId]) {
          return prev;
        }

        // Info: (20240710 - Julian) 如果有 description ，則寫入
        if (description) {
          newVoucher[targetId].particulars = description;
        }

        // Info: (20240710 - Julian) 判斷是 debit 還是 credit
        if (type === VoucherRowType.CREDIT) {
          // Info: (20240430 - Julian) amount 值寫入 credit，debit 值清空
          newVoucher[targetId].credit = newAmount;
          newVoucher[targetId].debit = null;
        } else if (type === VoucherRowType.DEBIT) {
          // Info: (20240430 - Julian) debit 值寫入 debit，credit 值清空
          newVoucher[targetId].debit = newAmount;
          newVoucher[targetId].credit = null;
        }
        return newVoucher;
      });
    },
    [accountingVoucher]
  );

  // Info: (20240503 - Julian) 重置傳票
  const resetVoucherHandler = useCallback(() => {
    setAccountingVoucher([defaultAccountingVoucher]); // Info: (20240503 - Julian) 清空傳票列表
    changeVoucherAmountHandler(0, 0, VoucherRowType.DEBIT); // Info: (20240503 - Julian) 清空借方 input
    changeVoucherAmountHandler(0, 0, VoucherRowType.CREDIT); // Info: (20240503 - Julian) 清空貸方 input
    changeVoucherStringHandler(0, undefined, VoucherString.ACCOUNT_TITLE); // Info: (20240503 - Julian) 清空科目 input
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

  useEffect(() => {
    if (deleteSuccess && deleteResult) {
      // Info: (20240719 - Julian) 重新取得 account list
      getAccountListHandler(deleteResult.companyId);
    }
  }, [deleteSuccess, deleteResult]);

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
    (OCR: IOCR | undefined) => {
      setSelectedOCR(OCR);
      setInputDescription('');
    },
    [selectedOCR]
  );

  const selectJournalHandler = useCallback(
    (journal: IJournal | undefined) => setSelectedJournal(journal),
    [selectedJournal]
  );

  const inputDescriptionHandler = useCallback(
    (description: string) => setInputDescription(description),
    [inputDescription]
  );

  const value = useMemo(
    () => ({
      OCRList,
      OCRListStatus,
      updateOCRListHandler,
      addOCRHandler,
      deleteOCRHandler,
      addPendingOCRHandler,
      deletePendingOCRHandler,
      accountList,
      getAccountListHandler,
      getAIStatusHandler,
      AIStatus,
      accountingVoucher,
      addVoucherRowHandler,
      deleteVoucherRowHandler,
      changeVoucherStringHandler,
      changeVoucherAmountHandler,
      resetVoucherHandler,
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
      deleteOwnAccountTitle,
      inputDescription,
      inputDescriptionHandler,

      pendingOCRList,
    }),
    [
      OCRList,
      OCRListStatus,
      AIStatus,
      accountList,
      getAccountListHandler,
      accountingVoucher,
      addVoucherRowHandler,
      deleteVoucherRowHandler,
      changeVoucherStringHandler,
      changeVoucherAmountHandler,
      resetVoucherHandler,
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
      inputDescription,
      pendingOCRList,
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
