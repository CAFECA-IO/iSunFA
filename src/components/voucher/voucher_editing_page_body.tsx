import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { FaChevronDown } from 'react-icons/fa6';
import { BiSave } from 'react-icons/bi';
import { FiSearch } from 'react-icons/fi';
import { useHotkeys } from 'react-hotkeys-hook';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { Button } from '@/components/button/button';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import AssetSection from '@/components/voucher/asset_section';
import VoucherLineBlock, { VoucherLinePreview } from '@/components/voucher/voucher_line_block';
import { IDatePeriod } from '@/interfaces/date_period';
import { ILineItemBeta, ILineItemUI, initialVoucherLine } from '@/interfaces/line_item';
import { MessageType } from '@/interfaces/message_modal';
import { ICounterparty } from '@/interfaces/counterparty';
import { useUserCtx } from '@/contexts/user_context';
import { useAccountingCtx } from '@/contexts/accounting_context';
import { useModalContext } from '@/contexts/modal_context';
import { inputStyle, default30DayPeriodInSec } from '@/constants/display';
import {
  VoucherType,
  EventType,
  EVENT_TYPE_TO_VOUCHER_TYPE_MAP,
  VOUCHER_TYPE_TO_EVENT_TYPE_MAP,
} from '@/constants/account';
import AIWorkingArea, { AIState } from '@/components/voucher/ai_working_area';
import { ICertificate, ICertificateUI } from '@/interfaces/certificate';
import CertificateSelectorModal from '@/components/certificate/certificate_selector_modal';
import CertificateUploaderModal from '@/components/certificate/certificate_uploader_modal';
import CertificateSelection from '@/components/certificate/certificate_selection';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { IPaginatedData } from '@/interfaces/pagination';
import { getPusherInstance } from '@/lib/utils/pusher_client';
import { CERTIFICATE_EVENT, PRIVATE_CHANNEL } from '@/constants/pusher';
import { CERTIFICATE_USER_INTERACT_OPERATION } from '@/constants/certificate';
import { VoucherV2Action } from '@/constants/voucher';
import { FREE_COMPANY_ID } from '@/constants/config';
import { IVoucherDetailForFrontend /* , defaultVoucherDetail  */ } from '@/interfaces/voucher';
import { InvoiceTaxType, InvoiceTransactionDirection, InvoiceType } from '@/constants/invoice';
import { CurrencyType } from '@/constants/currency';
import { IAssetDetails } from '@/interfaces/asset';
import { ISUNFA_ROUTE } from '@/constants/url';
import { ToastType } from '@/interfaces/toastify';

// ToDo: (20241118 - Julian) For debug, remove later
const defaultVoucherDetail: IVoucherDetailForFrontend = {
  id: 1000,
  voucherDate: 1704134230,
  type: 'payment',
  note: '',
  counterParty: {
    id: 1000,
    companyId: 1000,
    name: 'ABC Corp',
  },
  payableInfo: {
    total: 1000,
    alreadyHappened: 100,
    remain: 900,
  },
  receivingInfo: undefined,
  reverseVoucherIds: [
    {
      id: 1002,
      voucherNo: '20240101003',
    },
  ],
  assets: [
    {
      id: 1000,
      assetName: 'Bank',
      assetNumber: 'A-000010',
      assetType: 'asset',
      depreciationStart: 1672531200,
      depreciationMethod: 'straight-line',
      usefulLife: 5,
      relatedVouchers: [],
      currencyAlias: CurrencyType.TWD,
      acquisitionDate: 1672531200,
      purchasePrice: 1000,
      accumulatedDepreciation: 0,
      residualValue: 0,
      remainingLife: 5,
      assetStatus: 'active',
      createdAt: 1672531200,
      updatedAt: 1672531200,
      deletedAt: null,
    },
  ],
  certificates: [
    {
      id: 1000,
      name: 'Invoice-00000001',
      companyId: 1000,
      voucherNo: '20240101001',
      unRead: true,
      uploader: 'Updated Test_User_1',
      invoice: {
        id: 1000,
        isComplete: true,
        inputOrOutput: InvoiceTransactionDirection.OUTPUT,
        date: 1,
        no: '1',
        currencyAlias: CurrencyType.TWD,
        priceBeforeTax: 1000,
        taxType: InvoiceTaxType.TAXABLE,
        taxRatio: 5,
        taxPrice: 50,
        totalPrice: 1050,
        type: InvoiceType.SALES_SPECIAL_TAX_CALCULATION,
        deductible: true,
        createdAt: 1,
        updatedAt: 1,
        counterParty: {
          id: 1000,
          companyId: 1000,
          name: 'ABC Corp',
          taxId: '123456789',
          type: 'SUPPLIER',
          note: 'Preferred supplier',
          createdAt: 1622548800,
          updatedAt: 1625130800,
        },
      },
      file: {
        id: 1000,
        name: '100000.jpg',
        url: 'https://example.com/uploads/100000.jpg',
        size: 1024.5,
        existed: true,
      },
      createdAt: 1672531200,
      updatedAt: 1672531200,
    },
  ],
  lineItems: [
    {
      id: 10000280,
      description: '償還應付帳款-銀行現金',
      debit: false,
      amount: 100,
      account: {
        id: 10000603,
        companyId: 1002,
        system: 'IFRS',
        debit: true,
        liquidity: true,
        name: '銀行存款',
        code: '1103',
        type: 'asset',
        createdAt: 0,
        updatedAt: 0,
        deletedAt: null,
      },
      reverseList: [
        {
          voucherId: 1000,
          amount: 100,
          description: '購買存貨-應付帳款',
          debit: true,
          account: {
            id: 10000981,
            companyId: 1002,
            system: 'IFRS',
            type: 'liability',
            debit: false,
            liquidity: true,
            code: '2171',
            name: '應付帳款',
            createdAt: 0,
            updatedAt: 0,
            deletedAt: null,
          },
          voucherNo: 'VCH001',
          lineItemBeReversedId: 1001,
        },
      ],
    },
    {
      id: 10000281,
      description: '購買存貨-機具設備成本',
      debit: false,
      amount: 500,
      account: {
        id: 10000981,
        companyId: 1002,
        system: 'IFRS',
        debit: false,
        liquidity: true,
        name: '機具設備成本',
        code: '1701',
        type: 'liability',
        createdAt: 0,
        updatedAt: 0,
        deletedAt: null,
      },
      reverseList: [
        {
          voucherId: 1000,
          amount: 100,
          description: '購買存貨-應付帳款',
          debit: true,
          account: {
            id: 10000981,
            companyId: 1002,
            system: 'IFRS',
            type: 'liability',
            debit: false,
            liquidity: true,
            code: '2171',
            name: '應付帳款',
            createdAt: 0,
            updatedAt: 0,
            deletedAt: null,
          },
          voucherNo: 'VCH001',
          lineItemBeReversedId: 1001,
        },
      ],
    },
    {
      id: 10000285,
      description: '購買存貨-銀行現金',
      debit: false,
      amount: 1000,
      account: {
        id: 10000603,
        companyId: 1002,
        system: 'IFRS',
        debit: true,
        liquidity: true,
        name: '銀行存款',
        code: '1103',
        type: 'asset',
        createdAt: 0,
        updatedAt: 0,
        deletedAt: null,
      },
      reverseList: [
        {
          voucherId: 1000,
          amount: 100,
          description: '購買存貨-應付帳款',
          debit: true,
          account: {
            id: 10000981,
            companyId: 1002,
            system: 'IFRS',
            type: 'liability',
            debit: false,
            liquidity: true,
            code: '2171',
            name: '應付帳款',
            createdAt: 0,
            updatedAt: 0,
            deletedAt: null,
          },
          voucherNo: 'VCH001',
          lineItemBeReversedId: 1001,
        },
      ],
    },
    {
      id: 10000286,
      description: '償還應付帳款-應付帳款',
      debit: true,
      amount: 100,
      account: {
        id: 10000981,
        companyId: 1002,
        system: 'IFRS',
        debit: false,
        liquidity: true,
        name: '應付帳款',
        code: '2171',
        type: 'liability',
        createdAt: 0,
        updatedAt: 0,
        deletedAt: null,
      },
      reverseList: [
        {
          voucherId: 1000,
          amount: 100,
          description: '購買存貨-應付帳款',
          debit: true,
          account: {
            id: 10000981,
            companyId: 1002,
            system: 'IFRS',
            type: 'liability',
            debit: false,
            liquidity: true,
            code: '2171',
            name: '應付帳款',
            createdAt: 0,
            updatedAt: 0,
            deletedAt: null,
          },
          voucherNo: 'VCH001',
          lineItemBeReversedId: 1001,
        },
      ],
    },
    {
      id: 10000287,
      description: '購買存貨-商品存貨',
      debit: true,
      amount: 1500,
      account: {
        id: 10001099,
        companyId: 1002,
        system: 'IFRS',
        debit: true,
        liquidity: true,
        name: '商品存貨',
        code: '1301',
        type: 'asset',
        createdAt: 0,
        updatedAt: 0,
        deletedAt: null,
      },
      reverseList: [
        {
          voucherId: 1000,
          amount: 100,
          description: '購買存貨-應付帳款',
          debit: true,
          account: {
            id: 10000981,
            companyId: 1002,
            system: 'IFRS',
            type: 'liability',
            debit: false,
            liquidity: true,
            code: '2171',
            name: '應付帳款',
            createdAt: 0,
            updatedAt: 0,
            deletedAt: null,
          },
          voucherNo: 'VCH001',
          lineItemBeReversedId: 1001,
        },
      ],
    },
    {
      id: 1000,
      description: '購買存貨-銀行現金',
      debit: false,
      amount: 1000,
      account: {
        id: 10000603,
        companyId: 1002,
        system: 'IFRS',
        debit: true,
        liquidity: true,
        name: '銀行存款',
        code: '1103',
        type: 'asset',
        createdAt: 0,
        updatedAt: 0,
        deletedAt: null,
      },
      reverseList: [
        {
          voucherId: 1000,
          amount: 100,
          description: '購買存貨-應付帳款',
          debit: true,
          account: {
            id: 10000981,
            companyId: 1002,
            system: 'IFRS',
            type: 'liability',
            debit: false,
            liquidity: true,
            code: '2171',
            name: '應付帳款',
            createdAt: 0,
            updatedAt: 0,
            deletedAt: null,
          },
          voucherNo: 'VCH001',
          lineItemBeReversedId: 1001,
        },
      ],
    },
    {
      id: 1001,
      description: '購買存貨-應付帳款',
      debit: false,
      amount: 500,
      account: {
        id: 10000981,
        companyId: 1002,
        system: 'IFRS',
        debit: false,
        liquidity: true,
        name: '應付帳款',
        code: '2171',
        type: 'liability',
        createdAt: 0,
        updatedAt: 0,
        deletedAt: null,
      },
      reverseList: [
        {
          voucherId: 1000,
          amount: 100,
          description: '購買存貨-應付帳款',
          debit: true,
          account: {
            id: 10000981,
            companyId: 1002,
            system: 'IFRS',
            type: 'liability',
            debit: false,
            liquidity: true,
            code: '2171',
            name: '應付帳款',
            createdAt: 0,
            updatedAt: 0,
            deletedAt: null,
          },
          voucherNo: 'VCH001',
          lineItemBeReversedId: 1001,
        },
      ],
    },
    {
      id: 1002,
      description: '購買存貨-商品存貨',
      debit: true,
      amount: 1500,
      account: {
        id: 10001099,
        companyId: 1002,
        system: 'IFRS',
        debit: true,
        liquidity: true,
        name: '商品存貨',
        code: '1301',
        type: 'asset',
        createdAt: 0,
        updatedAt: 0,
        deletedAt: null,
      },
      reverseList: [
        {
          voucherId: 1000,
          amount: 100,
          description: '購買存貨-應付帳款',
          debit: true,
          account: {
            id: 10000981,
            companyId: 1002,
            system: 'IFRS',
            type: 'liability',
            debit: false,
            liquidity: true,
            code: '2171',
            name: '應付帳款',
            createdAt: 0,
            updatedAt: 0,
            deletedAt: null,
          },
          voucherNo: 'VCH001',
          lineItemBeReversedId: 1001,
        },
      ],
    },
  ],
};

type FocusableElement = HTMLInputElement | HTMLButtonElement | HTMLDivElement;

// ToDo: (20241021 - Julian) 確認完後移動到 interfaces
interface IAIResultVoucher {
  voucherDate: number;
  type: string;
  note: string;
  counterParty?: ICounterparty; // ToDo: (20241018 - Julian) @Murky: 希望可以改成 ICounterparty (至少要有 company id 和 name)
  lineItemsInfo: {
    lineItems: ILineItemBeta[]; // ToDo: (20241018 - Julian) @Murky: 希望可以改成 ILineItemBeta[]
  };
}

const dummyAIResult: IAIResultVoucher = {
  voucherDate: 0,
  type: '',
  note: '',
  lineItemsInfo: { lineItems: [] },
};

const VoucherEditingPageBody: React.FC<{ voucherId: string }> = ({ voucherId }) => {
  const { t } = useTranslation('common');
  const router = useRouter();

  const { selectedCompany, userAuth } = useUserCtx();
  const {
    getAccountListHandler,
    temporaryAssetList,
    clearTemporaryAssetHandler,
    clearReverseListHandler,
  } = useAccountingCtx();
  const { messageModalDataHandler, messageModalVisibilityHandler, toastHandler } =
    useModalContext();

  const companyId = selectedCompany?.id ?? FREE_COMPANY_ID;
  const userId = userAuth?.id ?? -1;
  const temporaryAssetListByUser = temporaryAssetList[userId] ?? [];

  // Info: (20241108 - Julian) POST ASK AI
  const {
    trigger: askAI,
    success: askSuccess,
    data: askData,
    isLoading: isAskingAI,
  } = APIHandler<{
    reason: string;
    resultId: string;
  }>(APIName.ASK_AI_V2);

  // Info: (20241108 - Julian) GET AI RESULT
  const {
    trigger: getAIResult,
    data: resultData,
    isLoading: isAIWorking,
    success: analyzeSuccess,
  } = APIHandler<IAIResultVoucher>(APIName.ASK_AI_RESULT_V2);

  // Info: (20241108 - Julian) 取得交易對象列表
  const {
    trigger: getCounterpartyList,
    data: counterpartyData,
    isLoading: isCounterpartyLoading,
  } = APIHandler<IPaginatedData<ICounterparty[]>>(APIName.COUNTERPARTY_LIST);

  // Info: (20241118 - Julian) 取得 Voucher 資料
  const { data: voucherData } = APIHandler<IVoucherDetailForFrontend>(
    APIName.VOUCHER_GET_BY_ID_V2,
    { params: { companyId, voucherId } },
    true
  );

  // Info: (20241118 - Julian) 如果只改動 Voucher line 以外的內容(date, counterparty 等) ，用 PUT
  const {
    trigger: updateVoucher,
    success: updateSuccess,
    isLoading: isUpdating,
  } = APIHandler(APIName.VOUCHER_UPDATE);

  // Info: (20241118 - Julian) 如果有改動到 Voucher line -> 先 DELETE 舊的再 POST 新的
  const {
    trigger: deleteVoucher,
    success: deleteSuccess,
    isLoading: isDeleting,
  } = APIHandler(APIName.VOUCHER_DELETE_V2);
  const {
    trigger: createNewVoucher,
    success: createNewSuccess,
    isLoading: isCreating,
  } = APIHandler(APIName.VOUCHER_CREATE);

  // Info: (20241108 - Julian) 取得 AI 分析結果
  const {
    voucherDate: aiVoucherDate,
    type: aiType,
    note: aiNote,
    counterParty: aiCounterParty,
    lineItemsInfo: { lineItems: aiLineItems },
  } = resultData ?? dummyAIResult;

  const aiDate = { startTimeStamp: aiVoucherDate, endTimeStamp: aiVoucherDate };

  const aiTotalCredit = aiLineItems.reduce(
    (acc, item) => (item.debit === false ? acc + item.amount : acc),
    0
  );
  const aiTotalDebit = aiLineItems.reduce(
    (acc, item) => (item.debit === true ? acc + item.amount : acc),
    0
  );

  // Info: (20241118 - Julian) 將 API 回傳的資料轉換成 UI 顯示用的格式
  const {
    voucherDate,
    type: voucherType,
    note: voucherNote,
    lineItems: voucherLineItems,
    certificates: voucherCertificates,
    counterParty: voucherCounterParty,
    assets: voucherAssets,
  } = voucherData ?? defaultVoucherDetail;

  const defaultDate: IDatePeriod = { startTimeStamp: voucherDate, endTimeStamp: voucherDate };
  const defaultType = EVENT_TYPE_TO_VOUCHER_TYPE_MAP[voucherType as EventType] || voucherType;

  const defaultLineItems: ILineItemUI[] = voucherLineItems.map((lineItem) => {
    return {
      ...lineItem,
      isReverse: false,
      reverseList: [],
    };
  });

  const defaultCertificateUI: ICertificateUI[] = voucherCertificates.map((certificate) => {
    return {
      ...certificate,
      isSelected: false,
      actions: [],
    };
  });

  // Info: (20241118 - Julian) State
  const [date, setDate] = useState<IDatePeriod>(defaultDate);
  const [type, setType] = useState<string>(defaultType);
  const [note, setNote] = useState<string>(voucherNote);
  const [lineItems, setLineItems] = useState<ILineItemUI[]>(defaultLineItems);
  const [assetList, setAssetList] = useState<IAssetDetails[]>([...voucherAssets]);

  // Info: (20241004 - Julian) 傳票列驗證條件
  const [isTotalNotEqual, setIsTotalNotEqual] = useState<boolean>(false);
  const [isTotalZero, setIsTotalZero] = useState<boolean>(false);
  const [haveZeroLine, setHaveZeroLine] = useState<boolean>(false);
  const [isAccountingNull, setIsAccountingNull] = useState<boolean>(false);
  const [isVoucherLineEmpty, setIsVoucherLineEmpty] = useState<boolean>(false);

  // Info: (20241004 - Julian) 清空表單 flag
  const [flagOfClear, setFlagOfClear] = useState<boolean>(false);
  //  Info: (20241007 - Julian) 送出表單 flag
  const [flagOfSubmit, setFlagOfSubmit] = useState<boolean>(false);

  // Info: (20241009 - Julian) 追加項目
  const [isCounterpartyRequired, setIsCounterpartyRequired] = useState<boolean>(false);
  const [isAssetRequired, setIsAssetRequired] = useState<boolean>(false);
  // Deprecated: (20241118 - Julian) implement later
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isReverseRequired, setIsReverseRequired] = useState<boolean>(false);

  // Info: (20241004 - Julian) 交易對象相關 state
  const [counterKeyword, setCounterKeyword] = useState<string>('');
  const [counterparty, setCounterparty] = useState<
    | {
        id: number;
        companyId: number;
        name: string;
      }
    | undefined
  >(voucherCounterParty);
  const [filteredCounterparty, setFilteredCounterparty] = useState<ICounterparty[]>([]);

  // Info: (20241004 - Julian) 是否顯示提示
  const [isShowDateHint, setIsShowDateHint] = useState<boolean>(false);
  const [isShowCounterHint, setIsShowCounterHint] = useState<boolean>(false);
  const [isShowAssetHint, setIsShowAssetHint] = useState<boolean>(false);
  const [isShowReverseHint, setIsShowReverseHint] = useState<boolean>(false);

  // Info: (20241018 - Tzuhan) AI 分析相關 state
  const [aiState, setAiState] = useState<AIState>(AIState.RESTING);
  const [isShowAnalysisPreview, setIsShowAnalysisPreview] = useState<boolean>(false);

  // Info: (20241018 - Tzuhan) 選擇憑證相關 state
  const [openSelectorModal, setOpenSelectorModal] = useState<boolean>(false);
  const [openUploaderModal, setOpenUploaderModal] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = React.useState<number[]>([]);

  // Info: (20241118 - Julian) 選擇憑證相關 state
  const [certificates, setCertificates] = useState<{ [id: string]: ICertificateUI }>({});
  const [selectedCertificatesUI, setSelectedCertificatesUI] =
    useState<ICertificateUI[]>(defaultCertificateUI);

  useEffect(() => {
    const storedCertificates = localStorage.getItem('selectedCertificates');
    if (storedCertificates) {
      setCertificates(JSON.parse(storedCertificates));
      localStorage.removeItem('selectedCertificates');
    }
  }, []);

  // Info: (20241118 - Julian) 將 reverse voucher 與 line item 掛鉤
  // useEffect(() => {
  //   if (isReverseLoading === false && reverseData && reverseData.length > 0) {
  //     const reverseList = reverseVoucherList
  //       .map((reverseVoucher) => {
  //         const reverseDetail = reverseData.find(
  //           (item) => item.lineItemBeReversedId === reverseVoucher.id
  //         );
  //         return reverseDetail;
  //       })
  //       .filter((item) => item !== undefined) as IReverseItem[];

  //     const lineItemsWithReverse = lineItems.map((lineItem) => {
  //       return { ...lineItem, reverseList };
  //     });

  //     setLineItems(lineItemsWithReverse);
  //   }
  // }, [reverseVoucherList, reverseData, isReverseLoading]);

  // Info: (20241119 - Julian) 更新 asset 列表
  useEffect(() => {
    if (temporaryAssetListByUser && temporaryAssetListByUser.length > 0) {
      const newAssetList = [...voucherAssets, ...temporaryAssetListByUser];
      setAssetList(newAssetList);
    }
  }, [temporaryAssetList]);

  // Info: (20241108 - Julian) 需要交易對象的時候才拿 counterparty list
  useEffect(() => {
    if (isCounterpartyRequired) {
      getCounterpartyList({ params: { companyId } });
    }
  }, [isCounterpartyRequired]);

  // Info: (20241018 - Tzuhan) 選擇憑證
  const handleSelect = useCallback(
    (ids: number[], isSelected: boolean) => {
      const updatedData = {
        ...certificates,
      };
      ids.forEach((id) => {
        updatedData[id] = {
          ...updatedData[id],
          isSelected,
        };
      });
      setCertificates(updatedData);
      setSelectedCertificatesUI(
        Object.values(updatedData).filter((item) => item.isSelected) as ICertificateUI[]
      );
    },
    [certificates]
  );

  useEffect(() => {
    if (selectedCertificatesUI.length > 0 && selectedIds.length > 0) {
      // ToDo: (20241018 - Tzuhan) To Julian: 這邊之後用來呼叫AI分析的API
      setAiState(AIState.WORKING);
      // Info: (20241021 - Julian) 呼叫 ask AI
      askAI({
        params: { companyId },
        query: { reason: 'voucher' },
        body: { certificateId: selectedIds[0] },
      });
    }
  }, [selectedCertificatesUI, selectedIds]);

  useEffect(() => {
    if (!isAskingAI) {
      if (askSuccess && askData) {
        // Info: (20241018 - Tzuhan) 呼叫 AI 分析 API
        getAIResult({
          params: { companyId, resultId: askData.resultId },
          query: { reason: 'voucher' },
        });
      } else if (!askSuccess) {
        //  Info: (20241021 - Julian) AI 分析失敗
        setAiState(AIState.FAILED);
      }
    }
  }, [askSuccess, askData, isAskingAI]);

  // Info: (20241021 - Julian) AI 分析結果
  useEffect(() => {
    if (!isAskingAI && !isAIWorking) {
      if (resultData) {
        setAiState(AIState.FINISH);
      } else if (!resultData || !analyzeSuccess) {
        // Info: (20241021 - Julian) AI 分析失敗
        setAiState(AIState.FAILED);
      }
    }
  }, [isAIWorking, resultData, analyzeSuccess, isAskingAI]);

  // Info: (20241018 - Tzuhan) 開啟選擇憑證 Modal
  const handleOpenSelectorModal = useCallback(() => {
    setSelectedIds(selectedCertificatesUI.map((item) => item.id));
    setOpenSelectorModal(true);
  }, [selectedCertificatesUI]);

  // Info: (20241018 - Tzuhan) 選擇憑證返回上一步
  const handleBack = useCallback(() => {
    handleOpenSelectorModal();
    setOpenUploaderModal(false);
  }, []);

  // Info: (20241018 - Tzuhan) 處理選擇憑證 API 回傳
  const handleCertificateApiResponse = useCallback(
    (
      resData: IPaginatedData<{
        totalInvoicePrice: number;
        unRead: {
          withVoucher: number;
          withoutVoucher: number;
        };
        currency: string;
        certificates: ICertificate[];
      }>
    ) => {
      const { data } = resData;
      const certificatesData = data.certificates.reduce(
        (acc, item) => {
          acc[item.id] = {
            ...item,
            isSelected: selectedCertificatesUI.some((selectedItem) => selectedItem.id === item.id),
            actions: [],
          };
          return acc;
        },
        {} as { [id: string]: ICertificateUI }
      );
      setCertificates(certificatesData);
    },
    [selectedCertificatesUI]
  );

  // Info: (20241004 - Julian) Type 下拉選單
  const {
    targetRef: typeRef,
    componentVisible: typeVisible,
    setComponentVisible: setTypeVisible,
  } = useOuterClick<HTMLDivElement>(false);

  // Info: (20241004 - Julian) Counterparty 下拉選單
  const {
    targetRef: counterMenuRef,
    componentVisible: isCounterMenuOpen,
    setComponentVisible: setCounterMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  // Info: (20241004 - Julian) Counterparty 搜尋
  const {
    targetRef: counterpartyRef,
    componentVisible: isSearchCounterparty,
    setComponentVisible: setIsSearchCounterparty,
  } = useOuterClick<HTMLDivElement>(false);

  // Info: (20241107 - Julian) ============ 熱鍵設置 ============
  const formRef = useRef<HTMLFormElement>(null);

  const handleTabPress = useCallback(
    (event: KeyboardEvent) => {
      event.preventDefault(); // Info: (20241107 - Julian) 阻止預設事件

      // Info: (20241107 - Julian) 獲取 form 元素中的所有 input, button 元素
      const elementsInForm =
        formRef.current?.querySelectorAll<FocusableElement>('input, button, div') ?? [];

      // Info: (20241107 - Julian) 過濾出可聚焦的元素
      const focusableElements: FocusableElement[] = Array.from(elementsInForm).filter(
        // Info: (20241107 - Julian) 過濾掉 disabled 或 tabIndex < 0 的元素
        (el) => el.tabIndex >= 0 && (el as HTMLInputElement | HTMLButtonElement).disabled !== true
      );

      // Info: (20241107 - Julian) 獲取各個欄位的 index
      const dateIndex = focusableElements.findIndex((el) => el.id === 'voucher-date');
      const voucherTypeIndex = focusableElements.findIndex((el) => el.id === 'voucher-type');
      const noteIndex = focusableElements.findIndex((el) => el.id === 'voucher-note');
      const counterpartyIndex = focusableElements.findIndex(
        (el) => el.id === 'voucher-counterparty'
      ); // Info: (20241108 - Julian) Div
      const assetIndex = focusableElements.findIndex((el) => el.id === 'voucher-asset');
      const accountTitleIndex = focusableElements.findIndex((el) =>
        el.id.includes('account-title')
      ); // Info: (20241108 - Julian) Div

      const formIndexOrder = [
        dateIndex,
        voucherTypeIndex,
        noteIndex,
        counterpartyIndex,
        assetIndex,
        accountTitleIndex,
      ];

      // Info: (20241107 - Julian) 獲取當前聚焦元素的 index
      const currentIndex = focusableElements.findIndex((el) => el === document.activeElement);

      const ToNext = () => {
        // Info: (20241107 - Julian) 獲取下一個聚焦元素的 index
        const nextIndex = currentIndex + 1 >= focusableElements.length ? 0 : currentIndex + 1;
        // Info: (20241107 - Julian) 移動到下一個可聚焦元素
        focusableElements[nextIndex]?.focus();
      };

      // ToDo: (20241107 - Julian) ============ 施工中🔧 ============
      if (currentIndex === -1 || currentIndex === focusableElements.length - 1) {
        focusableElements[0]?.focus();
      } else if (currentIndex >= formIndexOrder[0] && currentIndex < formIndexOrder[1]) {
        // Info: (20241107 - Julian) 如果當前聚焦元素是日期欄位，且日期已選，則移動到類型欄位
        if (date.startTimeStamp !== 0 && date.endTimeStamp !== 0) {
          focusableElements[voucherTypeIndex]?.focus();
        } else {
          ToNext();
        }
      } else {
        ToNext();
      }
    },
    [formRef, date, counterparty, isCounterpartyRequired, assetList]
  );

  useHotkeys('tab', handleTabPress);

  const dateRef = useRef<HTMLDivElement>(null);
  const counterpartyInputRef = useRef<HTMLInputElement>(null);
  const assetRef = useRef<HTMLDivElement>(null);
  const voucherLineRef = useRef<HTMLDivElement>(null);

  // Info: (20241004 - Julian) 取得會計科目列表
  useEffect(() => {
    if (selectedCompany) {
      getAccountListHandler(selectedCompany.id);
    }
  }, [selectedCompany]);

  useEffect(() => {
    // Info: (20241004 - Julian) 查詢交易對象關鍵字時聚焦
    if (isSearchCounterparty && counterpartyInputRef.current) {
      counterpartyInputRef.current.focus();
    }

    // Info: (20241001 - Julian) 查詢模式關閉後清除搜尋關鍵字
    if (!isSearchCounterparty) {
      setCounterKeyword('');
    }
  }, [isSearchCounterparty]);

  // Info: (20241004 - Julian) 搜尋交易對象
  useEffect(() => {
    getCounterpartyList({ params: { companyId }, query: { searchQuery: counterKeyword } });
  }, [counterKeyword]);
  useEffect(() => {
    if (counterpartyData && !isCounterpartyLoading) {
      setFilteredCounterparty(counterpartyData.data);
    }
  }, [counterpartyData, isCounterpartyLoading]);

  // Info: (20241007 - Julian) 日期未選擇時顯示提示
  useEffect(() => {
    if (date.startTimeStamp !== 0 && date.endTimeStamp !== 0) {
      setIsShowDateHint(false);
    }
  }, [date]);

  // Info: (20241004 - Julian) 交易對象未選擇時顯示提示
  useEffect(() => {
    if (counterparty) {
      setIsShowCounterHint(false);
    }
  }, [counterparty]);

  useEffect(() => {
    if (isAssetRequired && assetList.length > 0) {
      setIsShowAssetHint(false);
    }
  }, [assetList]);

  const typeToggleHandler = () => setTypeVisible(!typeVisible);

  const counterSearchToggleHandler = () => {
    setIsSearchCounterparty(!isSearchCounterparty);
    setCounterMenuOpen(!isCounterMenuOpen);
  };

  const noteChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNote(e.target.value);
  };

  const counterKeywordChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCounterKeyword(e.target.value);
  };

  // Info: (20241018 - Julian) 欄位顯示
  const isShowCounter = isCounterpartyRequired || (isShowAnalysisPreview && aiCounterParty);

  // Info: (20240926 - Julian) type 字串轉換
  const translateType = (typeStr: string) => {
    const eventTypeToVoucherType = EVENT_TYPE_TO_VOUCHER_TYPE_MAP[typeStr as EventType];

    if (eventTypeToVoucherType) {
      return t(`journal:ADD_NEW_VOUCHER.TYPE_${eventTypeToVoucherType.toUpperCase()}`);
    } else {
      return t(`journal:ADD_NEW_VOUCHER.TYPE_${typeStr.toUpperCase()}`);
    }
  };

  const getCounterpartyStr = (counterParty: ICounterparty | undefined) => {
    if (counterParty) {
      return `${counterParty.companyId} - ${counterParty.name}`;
    } else {
      return t('journal:ADD_NEW_VOUCHER.COUNTERPARTY');
    }
  };

  // Info: (20241004 - Julian) 清空表單
  const clearAllHandler = () => {
    setDate(default30DayPeriodInSec);
    setType(VoucherType.EXPENSE);
    setNote('');
    setCounterparty(undefined);
    clearTemporaryAssetHandler(userId);
    clearReverseListHandler();
    setLineItems([initialVoucherLine]);
    setFlagOfClear(!flagOfClear);
  };

  // Info: (20241004 - Julian) 清空表單前的警告提示
  const clearClickHandler = () => {
    messageModalDataHandler({
      messageType: MessageType.WARNING,
      title: t('journal:JOURNAL.CLEAR_FORM'),
      content: t('journal:JOURNAL.CLEAR_FORM_CONTENT'),
      submitBtnStr: t('journal:JOURNAL.CLEAR_FORM'),
      submitBtnFunction: clearAllHandler,
      backBtnStr: t('common:COMMON.CANCEL'),
    });
    messageModalVisibilityHandler();
  };

  const fillUpWithAIResult = () => {
    setDate(aiDate);
    setType(aiType);
    setNote(aiNote);
    setCounterparty(aiCounterParty);
    const aiLineItemsUI = aiLineItems.map((item) => {
      return {
        ...item,
        isReverse: false,
        reverseList: [],
      } as ILineItemUI;
    });
    setLineItems(aiLineItemsUI);
  };

  // Info: (20241119 - Julian) 逐一比對 line item 是否有異動
  const isLineItemsEqual = (arr1: ILineItemBeta[], arr2: ILineItemBeta[]) => {
    if (arr1.length !== arr2.length) return false;

    for (let i = 0; i < arr1.length; i += 1) {
      if (arr1[i].id !== arr2[i].id) return false;
      if (arr1[i].description !== arr2[i].description) return false;
      if (arr1[i].debit !== arr2[i].debit) return false;
      if (arr1[i].amount !== arr2[i].amount) return false;
      if (arr1[i].account?.id !== arr2[i].account?.id) return false;
    }

    return true;
  };

  const saveVoucher = async () => {
    // Info: (20241105 - Julian) 如果有資產，則加入 VoucherV2Action.ADD_ASSET；如果有反轉傳票，則加入 VoucherV2Action.REVERT
    const actions = [];
    if (isAssetRequired) actions.push(VoucherV2Action.ADD_ASSET);
    if (isReverseRequired) actions.push(VoucherV2Action.REVERT);

    const resultCertificates = Object.values(certificates);
    const resultDate = date.startTimeStamp;
    const resultType = VOUCHER_TYPE_TO_EVENT_TYPE_MAP[type as VoucherType];
    const resultNote = note;
    const resultCounterpartyId = counterparty?.companyId;
    const resultLineItems = lineItems.map((lineItem) => {
      return {
        accountId: lineItem.account?.id ?? '',
        amount: lineItem.amount,
        debit: lineItem.debit,
        description: lineItem.description,
      };
    });

    // Info: (20241105 - Julian) 如果沒有新增資產，就回傳空陣列
    const resultAssetIds =
      isAssetRequired && assetList.length > 0 ? assetList.map((asset) => asset.id) : [];

    // ToDo: (20241119 - Julian) 等待 API 調整完再處理
    // Info: (20241105 - Julian) 如果有反轉傳票，則取得反轉傳票的資訊並加入 reverseVouchers，否則回傳空陣列
    // const reverseVouchers: {
    //   voucherId: number;
    //   lineItemIdBeReversed: number;
    //   lineItemIdReverseOther: number;
    //   amount: number;
    // }[] =
    //   isReverseRequired && reverses.length > 0
    //     ? reverses.map((reverse) => {
    //         return {
    //           voucherId: reverse.voucherId,
    //           lineItemIdBeReversed: reverse.voucherId, // ToDo: (20241105 - Julian) 白字藍底的 `reverse line item` 的 id
    //           lineItemIdReverseOther: -1, // ToDo: (20241105 - Julian) 藍字白底的 `voucher line item` 的 id
    //           amount: reverse.amount,
    //         };
    //       })
    //     : [];

    const body = {
      actions,
      certificateIds: resultCertificates,
      voucherDate: resultDate,
      type: resultType,
      note: resultNote,
      counterPartyId: resultCounterpartyId,
      lineItems: resultLineItems,
      assetIds: resultAssetIds,
      // reverseVouchers,
    };

    // Info: (20241119 - Julian) 如果只改動 Voucher line 以外的內容(date, counterparty 等) ，用 PUT
    const isOnlyUpdateVoucher = isLineItemsEqual(voucherLineItems, lineItems);

    if (isOnlyUpdateVoucher) {
      // Info: (20241119 - Julian) 如果只改動 Voucher line 以外的內容(date, counterparty 等) ，用 PUT
      updateVoucher({ params: { companyId, voucherId }, body });
    } else {
      // Info: (20241119 - Julian) 如果有改動到 Voucher line -> 先 DELETE 舊的再 POST 新的
      deleteVoucher({ params: { companyId, voucherId } });
      createNewVoucher({ params: { companyId }, body });
    }
  };

  const submitForm = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Info: (20241007 - Julian) 若任一條件不符，則中斷 function
    if (date.startTimeStamp === 0 && date.endTimeStamp === 0) {
      // Info: (20241007 - Julian) 日期不可為 0：顯示日期提示，並定位到日期欄位
      setIsShowDateHint(true);
      if (dateRef.current) dateRef.current.scrollIntoView();
      // Info: (20241004 - Julian) 如果需填入交易對象，則交易對象不可為空：顯示類型提示，並定位到類型欄位
    } else if (isCounterpartyRequired && !counterparty) {
      setIsShowCounterHint(true);
      if (counterpartyRef.current) counterpartyRef.current.scrollIntoView();
    } else if (
      isTotalZero || // Info: (20241004 - Julian) 借貸總金額不可為 0
      isTotalNotEqual || // Info: (20241004 - Julian) 借貸金額需相等
      haveZeroLine || // Info: (20241004 - Julian) 沒有未填的數字的傳票列
      isAccountingNull || // Info: (20241004 - Julian) 沒有未選擇的會計科目
      isVoucherLineEmpty // Info: (20241004 - Julian) 沒有傳票列
    ) {
      setFlagOfSubmit(!flagOfSubmit);
      if (voucherLineRef.current) voucherLineRef.current.scrollIntoView();
    } else if (isAssetRequired && assetList.length === 0) {
      // Info: (20241007 - Julian) 如果需填入資產，但資產為空，則顯示資產提示，並定位到資產欄位
      setIsShowAssetHint(true);
      if (assetRef.current) assetRef.current.scrollIntoView();
    } else if (isReverseRequired /* && reverses.length === 0 */) {
      // Info: (20241011 - Julian) 如果需填入沖銷傳票，但沖銷傳票為空，則顯示沖銷提示，並定位到沖銷欄位
      setIsShowReverseHint(true);
    } else {
      // Info: (20241007 - Julian) 儲存傳票
      saveVoucher();

      // Info: (20241007 - Julian) 重設提示
      setIsShowDateHint(false);
      setIsShowCounterHint(false);
      setIsShowAssetHint(false);
      setIsShowReverseHint(false);
      setFlagOfSubmit(!flagOfSubmit);
    }
  };

  // Info: (20241119 - Julian) PUT 的成功與失敗處理
  useEffect(() => {
    if (isUpdating === false) {
      if (updateSuccess) {
        router.push(ISUNFA_ROUTE.VOUCHER_LIST); // ToDo: (20241119 - Julian) Should be replaced by voucher detail page
      } else {
        toastHandler({
          id: 'update-voucher-fail',
          type: ToastType.ERROR,
          content: 'Failed to update voucher, please try again later.',
          closeable: true,
        });
      }
    }
  }, [updateSuccess, isUpdating]);

  // Info: (20241119 - Julian) DELETE && POST 的成功與失敗處理
  useEffect(() => {
    if (isDeleting === false && isCreating === false) {
      if (deleteSuccess && createNewSuccess) {
        router.push(ISUNFA_ROUTE.VOUCHER_LIST); // ToDo: (20241119 - Julian) Should be replaced by voucher detail page
      } else {
        toastHandler({
          id: 'delete-voucher-fail',
          type: ToastType.ERROR,
          content: 'Failed to update voucher, please try again later.',
          closeable: true,
        });
      }
    }
  }, [deleteSuccess, isDeleting, createNewSuccess, isCreating]);

  const typeDropdownMenu = typeVisible ? (
    <div
      ref={typeRef}
      className="absolute left-0 top-50px flex w-full flex-col rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px text-dropdown-text-primary shadow-dropmenu"
    >
      {Object.values(VoucherType).map((v) => {
        const typeClickHandler = () => {
          setType(v);
          setTypeVisible(false);
        };

        return (
          <button
            key={voucherType}
            id={`type-${voucherType}`}
            type="button"
            className="px-12px py-8px text-left hover:bg-dropdown-surface-item-hover"
            onClick={typeClickHandler}
          >
            {translateType(voucherType)}
          </button>
        );
      })}
    </div>
  ) : null;

  const displayedCounterparty = isSearchCounterparty ? (
    <input
      ref={counterpartyInputRef}
      value={counterKeyword}
      onChange={counterKeywordChangeHandler}
      placeholder={`${counterparty?.id} - ${counterparty?.name}`}
      className="w-full truncate bg-transparent text-input-text-input-filled outline-none"
    />
  ) : (
    <p
      className={`truncate ${isShowCounterHint ? inputStyle.ERROR : isShowAnalysisPreview ? inputStyle.PREVIEW : inputStyle.NORMAL}`}
    >
      {isShowAnalysisPreview
        ? getCounterpartyStr(aiCounterParty)
        : `${counterparty?.id} - ${counterparty?.name}`}
    </p>
  );

  const counterMenu = isCounterpartyLoading ? (
    <div className="px-12px py-8px text-sm text-input-text-input-placeholder">Loading...</div>
  ) : filteredCounterparty && filteredCounterparty.length > 0 ? (
    filteredCounterparty.map((counter) => {
      const counterClickHandler = () => {
        setCounterparty(counter);
        setCounterMenuOpen(false);
      };

      return (
        <button
          key={counter.id}
          type="button"
          onClick={counterClickHandler}
          className="flex w-full gap-8px px-12px py-8px text-left text-sm hover:bg-dropdown-surface-menu-background-secondary"
        >
          <p className="text-dropdown-text-primary">{counter.taxId}</p>
          <p className="text-dropdown-text-secondary">{counter.name}</p>
        </button>
      );
    })
  ) : (
    <p className="px-12px py-8px text-sm text-input-text-input-placeholder">
      {t('journal:ADD_NEW_VOUCHER.NO_COUNTERPARTY_FOUND')}
    </p>
  );

  const counterpartyDropMenu = isCounterMenuOpen ? (
    <div
      ref={counterMenuRef}
      className="absolute top-85px z-30 w-full rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px shadow-dropmenu"
    >
      {counterMenu}
    </div>
  ) : null;

  const certificateCreatedHandler = useCallback((message: { certificate: ICertificate }) => {
    const newCertificates = {
      ...certificates,
    };
    newCertificates[message.certificate.id] = {
      ...message.certificate,
      isSelected: false,
      unRead: true,
      actions: !message.certificate.voucherNo
        ? [CERTIFICATE_USER_INTERACT_OPERATION.DOWNLOAD, CERTIFICATE_USER_INTERACT_OPERATION.REMOVE]
        : [CERTIFICATE_USER_INTERACT_OPERATION.DOWNLOAD],
    };
    setCertificates(newCertificates);
  }, []);

  // Info: (20241022 - tzuhan) @Murky, 這裡是前端訂閱 PUSHER (CERTIFICATE_EVENT.CREATE) 的地方，當生成新的 certificate 要新增到列表中
  useEffect(() => {
    const pusher = getPusherInstance();
    const channel = pusher.subscribe(PRIVATE_CHANNEL.CERTIFICATE);

    channel.bind(CERTIFICATE_EVENT.CREATE, certificateCreatedHandler);

    return () => {
      channel.unbind(CERTIFICATE_EVENT.CREATE, certificateCreatedHandler);
      pusher.unsubscribe(PRIVATE_CHANNEL.CERTIFICATE);
    };
  }, []);

  useEffect(() => {
    setSelectedCertificatesUI(Object.values(certificates).filter((item) => item.isSelected));
    setSelectedIds(Object.keys(certificates).map(Number));
  }, [certificates]);

  return (
    <div className="relative flex flex-col items-center gap-40px p-40px">
      <CertificateSelectorModal
        isOpen={openSelectorModal}
        onClose={() => setOpenSelectorModal(false)}
        openUploaderModal={() => setOpenUploaderModal(true)}
        handleSelect={handleSelect}
        handleApiResponse={handleCertificateApiResponse}
        certificates={Object.values(certificates)}
        selectedIds={selectedIds}
        setSelectedIds={setSelectedIds}
      />
      <CertificateUploaderModal
        isOpen={openUploaderModal}
        onClose={() => setOpenUploaderModal(false)}
        onBack={handleBack}
      />
      {/* Info: (20240926 - Julian) AI analyze */}
      <AIWorkingArea
        aiState={aiState}
        analyzeSuccess={analyzeSuccess ?? false}
        setAiState={setAiState}
        setIsShowAnalysisPreview={setIsShowAnalysisPreview}
        fillUpClickHandler={fillUpWithAIResult}
      />
      {/* ToDo: (20240926 - Julian) Uploaded certificates */}
      <CertificateSelection
        selectedCertificates={selectedCertificatesUI}
        setOpenModal={handleOpenSelectorModal}
        isSelectable
        isDeletable
        className="my-8"
      />

      {/* Info: (20240926 - Julian) form */}
      <form ref={formRef} onSubmit={submitForm} className="grid w-full grid-cols-2 gap-24px">
        {/* Info: (20240926 - Julian) Date */}
        <div ref={dateRef} className="flex flex-col gap-8px whitespace-nowrap">
          <p className="font-bold text-input-text-primary">
            {t('journal:ADD_NEW_VOUCHER.VOUCHER_DATE')}
            <span className="text-text-state-error">*</span>
          </p>
          <DatePicker
            id="voucher-date"
            type={DatePickerType.TEXT_DATE}
            period={isShowAnalysisPreview ? aiDate : date}
            setFilteredPeriod={setDate}
            btnClassName={
              isShowDateHint ? inputStyle.ERROR : isShowAnalysisPreview ? inputStyle.PREVIEW : ''
            }
          />
        </div>
        {/* Info: (20240926 - Julian) Type */}
        <div className="flex flex-col gap-8px">
          <p className="font-bold text-input-text-primary">
            {t('journal:ADD_NEW_VOUCHER.VOUCHER_TYPE')}
            <span className="text-text-state-error">*</span>
          </p>
          <button
            id="voucher-type"
            type="button"
            onClick={typeToggleHandler}
            className="relative flex items-center justify-between rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px hover:cursor-pointer hover:border-input-stroke-input-hover"
          >
            <p
              className={`text-base ${isShowAnalysisPreview ? inputStyle.PREVIEW : 'text-input-text-input-filled'}`}
            >
              {isShowAnalysisPreview ? translateType(aiType) : translateType(type)}
            </p>
            <FaChevronDown size={20} />
            {/* Info: (20240926 - Julian) Type dropdown */}
            {typeDropdownMenu}
          </button>
        </div>

        {/* Info: (20240926 - Julian) Note */}
        <div className="col-span-2 flex flex-col gap-8px">
          <p className="font-bold text-input-text-primary">{t('journal:ADD_NEW_VOUCHER.NOTE')}</p>
          <input
            id="voucher-note"
            type="text"
            value={note}
            onChange={noteChangeHandler}
            placeholder={isShowAnalysisPreview ? aiNote : t('journal:ADD_NEW_VOUCHER.NOTE')}
            className={`rounded-sm border border-input-stroke-input px-12px py-10px ${isShowAnalysisPreview ? inputStyle.PREVIEW : 'placeholder:text-input-text-input-placeholder'}`}
          />
        </div>
        {/* Info: (20240926 - Julian) Counterparty */}
        {isShowCounter && (
          <div className="relative col-span-2 flex flex-col gap-8px">
            <p className="font-bold text-input-text-primary">
              {t('journal:ADD_NEW_VOUCHER.COUNTERPARTY')}
              <span className="text-text-state-error">*</span>
            </p>
            <div
              id="voucher-counterparty"
              // Info: (20241108 - Julian) 透過 tabIndex 讓 div 可以被 focus
              // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
              tabIndex={0}
              ref={counterpartyRef}
              onClick={counterSearchToggleHandler}
              className={`flex w-full items-center justify-between gap-8px rounded-sm border bg-input-surface-input-background px-12px py-10px hover:cursor-pointer hover:border-input-stroke-selected ${isSearchCounterparty ? 'border-input-stroke-selected' : isShowCounterHint ? inputStyle.ERROR : 'border-input-stroke-input text-input-text-input-filled'}`}
            >
              {displayedCounterparty}
              <div className="h-20px w-20px">
                <FiSearch size={20} />
              </div>
            </div>
            {/* Info: (20241004 - Julian) Counterparty drop menu */}
            {counterpartyDropMenu}
          </div>
        )}
        {/* Info: (20241009 - Julian) Asset */}
        {isAssetRequired && (
          <div ref={assetRef} className="col-span-2 flex flex-col">
            <AssetSection
              isShowAssetHint={isShowAssetHint}
              lineItems={lineItems}
              defaultAssetList={voucherAssets}
            />
          </div>
        )}
        {/* Info: (20240926 - Julian) Voucher line block */}
        {isShowAnalysisPreview ? (
          <VoucherLinePreview
            totalCredit={aiTotalCredit}
            totalDebit={aiTotalDebit}
            lineItems={aiLineItems}
          />
        ) : (
          <>
            {isShowReverseHint ? (
              <p className="text-text-state-error">
                {t('journal:VOUCHER_LINE_BLOCK.REVERSE_HINT')}
              </p>
            ) : null}
            <div ref={voucherLineRef} className="col-span-2">
              <VoucherLineBlock
                lineItems={lineItems}
                setLineItems={setLineItems}
                flagOfClear={flagOfClear}
                flagOfSubmit={flagOfSubmit}
                setIsTotalZero={setIsTotalZero}
                setIsTotalNotEqual={setIsTotalNotEqual}
                setHaveZeroLine={setHaveZeroLine}
                setIsAccountingNull={setIsAccountingNull}
                setIsVoucherLineEmpty={setIsVoucherLineEmpty}
                setIsCounterpartyRequired={setIsCounterpartyRequired}
                setIsAssetRequired={setIsAssetRequired}
              />
            </div>
          </>
        )}
        {/* Info: (20240926 - Julian) buttons */}
        <div className="col-span-2 ml-auto flex items-center gap-12px">
          <Button
            id="voucher-clear-button"
            type="button"
            variant="secondaryOutline"
            onClick={clearClickHandler}
          >
            {t('journal:JOURNAL.CLEAR_ALL')}
          </Button>
          <Button
            id="voucher-save-button"
            type="submit"
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.preventDefault();
            }}
            disabled={isUpdating || isDeleting || isCreating} // Info: (20241119 - Julian) 防止重複送出
          >
            <p>{t('common:COMMON.SAVE')}</p>
            <BiSave size={20} />
          </Button>
        </div>
      </form>
    </div>
  );
};

export default VoucherEditingPageBody;
