import { ProgressStatus } from '@/constants/account';
import { APIName } from '@/constants/api_connection';
import { EXPIRATION_FOR_DATA_IN_INDEXED_DB_IN_SECONDS } from '@/constants/config';
import { useUserCtx } from '@/contexts/user_context';
import { IAssetDetails, IAssetPostOutput } from '@/interfaces/asset';
import { IJournal } from '@/interfaces/journal';
import { IOCR, IOCRItem } from '@/interfaces/ocr';
import { IReverseItemUI } from '@/interfaces/line_item';
import { IVoucher } from '@/interfaces/voucher';
import APIHandler from '@/lib/utils/api_handler';
import { getTimestampNow } from '@/lib/utils/common';
import {
  clearAllItems,
  deleteItem,
  getAllItems,
  initDB,
  updateAndDeleteOldItems,
} from '@/lib/utils/indexed_db/ocr';
import { isValidEncryptedDataForOCR } from '@/lib/utils/type_guard/ocr';
import React, { createContext, useState, useCallback, useMemo, useEffect } from 'react';
// Info: (20250319 - Anna)
import { IAccountingSetting } from '@/interfaces/accounting_setting';

interface IAccountingProvider {
  children: React.ReactNode;
}

// Info: (2024709 - Anna) 定義傳票類型到翻譯鍵值的映射
interface AccountTitleMap {
  [key: string]: string;
}

export const accountTitleMap: AccountTitleMap = {
  Income: 'project:PROJECT.INCOME',
  Payment: 'journal:JOURNAL.PAYMENT',
  Transfer: 'common:COMMON.TRANSFER',
};

interface IAccountingContext {
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
  addPendingOCRHandler: (item: IOCRItem) => void;
  deletePendingOCRHandler: (uploadIdentifier: string) => void;
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

  pendingOCRList: IOCRItem[];
  pendingOCRListFromBrowser: IOCRItem[];
  excludeUploadIdentifier: (OCRs: IOCR[], pendingOCRs: IOCRItem[]) => IOCRItem[];

  // Info: (20241025 - Julian) 暫存的資產列表 (用於新增資產顯示)
  temporaryAssetList: { [key: number]: IAssetPostOutput[] };
  addTemporaryAssetHandler: (companyId: number, asset: IAssetDetails) => void;
  deleteTemporaryAssetHandler: (companyId: number, assetId: number) => void;
  clearTemporaryAssetHandler: (companyId: number) => void;

  // Info: (20241105 - Julian) 反轉分錄列表
  reverseList: {
    [key: number]: IReverseItemUI[];
  };
  addReverseListHandler: (lineItemId: number, item: IReverseItemUI[]) => void;
  clearReverseListHandler: () => void;

  // Info: (20250221 - Julian) 重新整理傳票列表
  flagOfRefreshVoucherList: boolean;
  refreshVoucherListHandler: () => void;

  // Info: (20250319 - Anna) 確保幣別資料載入完成後再顯示
  isCurrencyLoaded: boolean;

  // Info: (20250319 - Anna) 管理當前貨幣狀態
  currentCurrency: string;
  setCurrentCurrency: (currency: string) => void;
}

const initialAccountingContext: IAccountingContext = {
  OCRList: [],
  OCRListStatus: { listSuccess: undefined, listCode: undefined },
  updateOCRListHandler: () => {},
  addOCRHandler: () => {},
  deleteOCRHandler: () => {},
  addPendingOCRHandler: () => {},
  deletePendingOCRHandler: () => {},
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

  pendingOCRList: [],
  pendingOCRListFromBrowser: [],
  excludeUploadIdentifier: () => [],

  temporaryAssetList: {},
  addTemporaryAssetHandler: () => {},
  deleteTemporaryAssetHandler: () => {},
  clearTemporaryAssetHandler: () => {},

  reverseList: {},
  addReverseListHandler: () => {},
  clearReverseListHandler: () => {},

  flagOfRefreshVoucherList: false,
  refreshVoucherListHandler: () => {},

  // Info: (20250319 - Anna) `isCurrencyLoaded` 預設為 `false`
  isCurrencyLoaded: false,

  currentCurrency: '', // Info: (20250319 - Anna) 預設為空，避免強制指定幣別
  setCurrentCurrency: () => {},
};

export const AccountingContext = createContext<IAccountingContext>(initialAccountingContext);

export const AccountingProvider = ({ children }: IAccountingProvider) => {
  const { userAuth, selectedAccountBook, isSignIn } = useUserCtx();

  // Info: (20250319 - Anna) 初始值設為空，等 API 或 UI 設定
  const [currentCurrency, setCurrentCurrency] = useState<string>('');
  // Info: (20250319 - Anna) 追蹤是否載入完成
  const [isCurrencyLoaded, setIsCurrencyLoaded] = useState(false);

  // Info: (20250319 - Anna) 取得會計設定資料
  const { trigger: getAccountSetting, data: accountingSetting } = APIHandler<IAccountingSetting>(
    APIName.ACCOUNTING_SETTING_GET,
    { params: { companyId: selectedAccountBook?.id } }
  );

  // Info: (20250319 - Anna) 在組件載入時，獲取會計設定
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('Selected Account Book ID:', selectedAccountBook?.id);
    if (selectedAccountBook?.id) {
      // eslint-disable-next-line no-console
      console.log('Triggering getAccountSetting...'); // 🌟 檢查是否有觸發 API
      getAccountSetting({ params: { companyId: selectedAccountBook.id } });
    }
  }, [selectedAccountBook?.id]);

  // Info: (20250319 - Anna) 當 accountingSetting 變更時，更新 currentCurrency
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('Loaded currency from API:', accountingSetting?.currency);
    if (accountingSetting?.currency) {
      setCurrentCurrency(accountingSetting.currency);
    }
    setIsCurrencyLoaded(true); // Info: (20250319 - Anna) 設定為已載入
  }, [accountingSetting]);

  const { trigger: getAIStatus } = APIHandler<ProgressStatus>(APIName.ASK_AI_STATUS);
  const {
    trigger: listUnprocessedOCR,
    error: listError,
    success: listSuccess,
    code: listCode,
  } = APIHandler<IOCR[]>(APIName.OCR_LIST);

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
  const [voucherPreview, setVoucherPreview] = useState<IVoucher | undefined>(undefined);
  const [AIStatus, setAIStatus] = useState<ProgressStatus>(ProgressStatus.IN_PROGRESS);
  const [stopAskAI, setStopAskAI] = useState<boolean>(false);

  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [inputDescription, setInputDescription] = useState<string>('');

  const [pendingOCRList, setPendingOCRList] = useState<IOCRItem[]>([]);
  const [isDBReady, setIsDBReady] = useState(false);
  const [pendingOCRListFromBrowser, setPendingOCRListFromBrowser] = useState<IOCRItem[]>([]);
  const [unprocessedOCRs, setUnprocessedOCRs] = useState<IOCR[]>([]);

  const [temporaryAssetList, setTemporaryAssetList] = useState<{
    [key: string]: IAssetPostOutput[];
  }>({});

  const [reverseList, setReverseList] = useState<{ [key: string]: IReverseItemUI[] }>({});

  const [flagOfRefreshVoucherList, setFlagOfRefreshVoucherList] = useState(false);

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
  const mergeOCRLists = useCallback((upcomingList: IOCR[], currentList: IOCR[]) => {
    const apiSet = new Set(upcomingList.map((ocr) => ocr.aichResultId)); // Info: (20240820 - Shirley) 使用 Set 儲存 apiList 的 aichResultId ，避免雙重迴圈
    const mergedList = [
      ...upcomingList,
      ...currentList.filter((localOCR) => !apiSet.has(localOCR.aichResultId)),
    ];

    // Info: (20240820 - Shirley) 按創建時間排序，最舊的在前面
    mergedList.sort((a, b) => a.createdAt - b.createdAt);

    return mergedList;
  }, []);

  const mergePendingOCRList = useCallback((upcomingList: IOCRItem[], currentList: IOCRItem[]) => {
    const apiSet = new Set(upcomingList.map((ocr) => ocr.uploadIdentifier));
    const mergedList = [
      ...currentList.filter((localOCR) => !apiSet.has(localOCR.uploadIdentifier)),
      ...upcomingList,
    ];
    // Info: (20240827 - Shirley) 按創建時間排序，最舊的在前面
    mergedList.sort((a, b) => a.timestamp - b.timestamp);
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

  const addPendingOCRHandler = (item: IOCRItem) => {
    setPendingOCRList((prev) => {
      const rs = mergePendingOCRList([item], prev);
      return rs;
    });
  };

  const deletePendingOCRHandler = (uploadIdentifier: string) => {
    // Info: 刪除 IndexedDB 中的數據 (20240822 - Shirley)
    deleteItem(uploadIdentifier);
    setPendingOCRList((prev) => {
      const rs = prev.filter((ocr) => ocr.uploadIdentifier !== uploadIdentifier);
      return rs;
    });
  };

  const clearPendingOCRList = () => {
    setPendingOCRList([]);
    setPendingOCRListFromBrowser([]);
  };

  const clearOCRList = () => {
    setOCRList([]);
  };

  // Info: (20240826 - Shirley) uploadIdentifier in ocrList need to be excluded from pendingOCRList
  const excludeUploadIdentifier = useCallback((OCRs: IOCR[], pendingOCRs: IOCRItem[]) => {
    const uploadIdentifierSet = new Set(OCRs.map((ocr) => ocr.uploadIdentifier));
    const filteredPendingOCRList = pendingOCRs.filter((ocr) => {
      const isUploaded = uploadIdentifierSet.has(ocr.uploadIdentifier);
      if (isUploaded) {
        deletePendingOCRHandler(ocr.uploadIdentifier);
      }
      return !isUploaded;
    });
    return filteredPendingOCRList;
  }, []);

  /* Info: (20240827 - Shirley)
    1. 確認 user context 的 userId 和 companyId 有值
    2. 確認儲存於 IndexedDB 的 pendingOCRList 資料格式正確，不同就清空 IndexedDB 中的數據
    3. 確認 pendingOCRList 的 userId 和 userAuth.id 相同，不同就清空 IndexedDB 中的數據
    4. 確認 pendingOCRList 的數據是否過期，過期就透過 `updateAndDeleteOldItems` 刪掉 IndexedDB 的數據，而 useState 透過 filter 刪選，避免非同步執行會有遺漏
    5. 將 pendingOCRList 的 companyId 和 selectedAccountBook.id 相同的數據存為 `pendingOCRListFromBrowser` 給一開始的 JournalUploadArea 上傳檔案、 `pendingOCRs` 給 StepOneTab 顯示 skeleton
   */
  const initPendingOCRList = async () => {
    if (!userAuth?.id || !selectedAccountBook?.id) return;
    const allItems = await getAllItems();
    const now = getTimestampNow();

    const validItems = allItems.filter(
      (item) => isValidEncryptedDataForOCR(item.data) && item.data.userId === userAuth.id
    );

    if (validItems.length !== allItems.length) {
      clearAllItems();
    }

    const pendingOCRs = validItems
      .filter(
        (item) =>
          item.data.companyId === selectedAccountBook.id &&
          now - item.data.timestamp < EXPIRATION_FOR_DATA_IN_INDEXED_DB_IN_SECONDS
      )
      .map((item) => item.data);

    setPendingOCRListFromBrowser(pendingOCRs);
    pendingOCRs.forEach(addPendingOCRHandler);
  };

  const initializeDB = async () => {
    try {
      await initDB();
      setIsDBReady(true);
    } catch (error) {
      setIsDBReady(false);
    }
  };

  const clearOCRs = () => {
    setPendingOCRList([]);
    setPendingOCRListFromBrowser([]);
    setUnprocessedOCRs([]);
    setOCRList([]);
  };

  useEffect(() => {
    initializeDB();
  }, []);

  // Info: (20240827 - Shirley) 在初始化 pending ocr 之前，先清理 state 和 IndexedDB 的數據
  useEffect(() => {
    if (isDBReady && userAuth?.id && selectedAccountBook?.id) {
      clearPendingOCRList();
      clearOCRList();
      updateAndDeleteOldItems(EXPIRATION_FOR_DATA_IN_INDEXED_DB_IN_SECONDS);
      initPendingOCRList();
    }
  }, [isDBReady, userAuth, selectedAccountBook]);

  useEffect(() => {
    clearOCRs();
  }, [isSignIn, selectedAccountBook]);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;

    if (OCRListParams && OCRListParams.update) {
      interval = setInterval(async () => {
        try {
          const response = await listUnprocessedOCR({
            params: {
              companyId: OCRListParams.companyId,
            },
          });
          if (response?.data) {
            setUnprocessedOCRs(response.data);
          }
        } catch (error) {
          clearInterval(interval);
        }
      }, 2000);
    }

    return () => {
      clearInterval(interval);
    };
  }, [OCRListParams]);

  useEffect(() => {
    if (OCRListStatus.listSuccess !== listSuccess || OCRListStatus.listCode !== listCode) {
      setOCRLisStatus({
        listSuccess,
        listCode,
      });
    }

    if (listSuccess) {
      setOCRList((prevList) => mergeOCRLists(unprocessedOCRs, prevList));
      setPendingOCRList((prevList) => excludeUploadIdentifier(unprocessedOCRs, prevList));
    }

    if (listSuccess === false) {
      setOCRListParams((prev) => (prev ? { ...prev, update: false } : prev));
    }
  }, [listSuccess, listError, listCode, unprocessedOCRs]);

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

  // Info: (20241119 - Julian) 將 Asset list 與 user id 綁定，用於新增資產顯示
  const addTemporaryAssetHandler = (companyId: number, asset: IAssetDetails) => {
    setTemporaryAssetList((prev) => {
      return {
        ...prev,
        [companyId]: [...(prev[companyId] ?? []), asset],
      };
    });
  };

  // Info: (20241119 - Julian) 刪除該用戶暫存在資產列表中的項目
  const deleteTemporaryAssetHandler = (companyId: number, assetId: number) => {
    setTemporaryAssetList((prev) => {
      return {
        ...prev,
        [companyId]: prev[companyId]?.filter((asset) => asset.id !== assetId),
      };
    });
  };

  // Info: (20241119 - Julian) 清空該用戶暫存在資產列表
  const clearTemporaryAssetHandler = (companyId: number) => {
    setTemporaryAssetList((prev) => {
      return {
        ...prev,
        [companyId]: [],
      };
    });
  };

  // Info: (20241105 - Julian) 新增反轉分錄列表
  const addReverseListHandler = (lineItemId: number, reverseItemList: IReverseItemUI[]) => {
    setReverseList((prev) => {
      return {
        ...prev,
        [lineItemId]: reverseItemList,
      };
    });
  };

  // Info: (20241105 - Julian) 清空反轉分錄列表
  const clearReverseListHandler = () => {
    setReverseList({});
  };

  // Info: (20250221 - Julian) 重新整理傳票列表：改變 flag 來觸發重新整理
  const refreshVoucherListHandler = () => {
    setFlagOfRefreshVoucherList((prev) => !prev);
  };

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
      getAIStatusHandler,
      AIStatus,

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

      inputDescription,
      inputDescriptionHandler,

      pendingOCRList,
      pendingOCRListFromBrowser,
      excludeUploadIdentifier,

      temporaryAssetList,
      addTemporaryAssetHandler,
      deleteTemporaryAssetHandler,
      clearTemporaryAssetHandler,

      reverseList,
      addReverseListHandler,
      clearReverseListHandler,

      flagOfRefreshVoucherList,
      refreshVoucherListHandler,

      // Info: (20250319 - Anna) 傳遞 isCurrencyLoaded & currentCurrency & setCurrentCurrency
      isCurrencyLoaded,
      setIsCurrencyLoaded,
      currentCurrency,
      setCurrentCurrency,
    }),
    [
      OCRList,
      OCRListStatus,
      AIStatus,
      invoiceId,
      voucherId,
      voucherPreview,
      selectedOCR,
      selectOCRHandler,
      selectedJournal,
      selectJournalHandler,
      inputDescription,
      pendingOCRList,
      pendingOCRListFromBrowser,
      temporaryAssetList,
      addTemporaryAssetHandler,
      deleteTemporaryAssetHandler,
      clearTemporaryAssetHandler,
      reverseList,
      addReverseListHandler,
      clearReverseListHandler,
      flagOfRefreshVoucherList,
      refreshVoucherListHandler,
      currentCurrency, // Info: (20250319 - Anna)
      isCurrencyLoaded, // Info: (20250319 - Anna)
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
