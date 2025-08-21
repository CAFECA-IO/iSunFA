import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { FaChevronDown } from 'react-icons/fa6';
import { BiSave } from 'react-icons/bi';
import { useTranslation } from 'next-i18next';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { useHotkeys } from 'react-hotkeys-hook';
import { Button } from '@/components/button/button';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
// import Toggle from '@/components/toggle/toggle';
import AssetSection from '@/components/voucher/asset_section';
import VoucherLineBlock, { VoucherLinePreview } from '@/components/voucher/voucher_line_block';
import { IDatePeriod } from '@/interfaces/date_period';
import { ILineItemUI, initialVoucherLine } from '@/interfaces/line_item';
import { MessageType } from '@/interfaces/message_modal';
import { ICounterpartyOptional } from '@/interfaces/counterparty';
import { useUserCtx } from '@/contexts/user_context';
import { useAccountingCtx } from '@/contexts/accounting_context';
import { useModalContext } from '@/contexts/modal_context';
import {
  // checkboxStyle,
  inputStyle,
  default30DayPeriodInSec,
  // WEEK_FULL_LIST,
  // MONTH_ABR_LIST,
} from '@/constants/display';
import {
  VoucherType,
  EventType,
  EVENT_TYPE_TO_VOUCHER_TYPE_MAP,
  VOUCHER_TYPE_TO_EVENT_TYPE_MAP,
  ProgressStatus,
} from '@/constants/account';
import { /* AIWorkingArea, */ AIState } from '@/components/voucher/ai_working_area';
import { ICertificate, ICertificateUI } from '@/interfaces/certificate';
import CertificateSelectorModal from '@/components/certificate/certificate_selector_modal';
import CertificateUploaderModal from '@/components/certificate/certificate_uploader_modal';
import CertificateSelection from '@/components/certificate/certificate_selection';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { IPaginatedData } from '@/interfaces/pagination';
import { getPusherInstance } from '@/lib/utils/pusher_client';
import { CERTIFICATE_EVENT, PRIVATE_CHANNEL } from '@/constants/pusher';
import { CERTIFICATE_USER_INTERACT_OPERATION } from '@/constants/invoice_rc2';
import { VoucherV2Action } from '@/constants/voucher';
import { ISUNFA_ROUTE } from '@/constants/url';
import { ToastType } from '@/interfaces/toastify';
import { DecimalOperations } from '@/lib/utils/decimal_operations';
import { IAIResultVoucher } from '@/interfaces/voucher';
import { AI_TYPE } from '@/constants/aich';
import CounterpartyInput from '@/components/voucher/counterparty_input';
import { ToastId } from '@/constants/toast_id';
import { FREE_ACCOUNT_BOOK_ID } from '@/constants/config';
import { KEYBOARD_EVENT_CODE } from '@/constants/keyboard_event_code';
import { TbArrowBackUp } from 'react-icons/tb';
import loggerFront from '@/lib/utils/logger_front';

// enum RecurringUnit {
//   MONTH = 'month',
//   WEEK = 'week',
// }

const dummyAIResult: IAIResultVoucher = {
  aiType: AI_TYPE.VOUCHER,
  aiStatus: ProgressStatus.SUCCESS,
  voucherDate: 0,
  type: '',
  note: '',
  lineItems: [],
};

interface NewVoucherFormProps {
  selectedData: { [id: string]: ICertificateUI };
}

const NewVoucherForm: React.FC<NewVoucherFormProps> = ({ selectedData }) => {
  const { t } = useTranslation('common');
  const router = useRouter();

  const { connectedAccountBook } = useUserCtx();
  const { temporaryAssetList, clearTemporaryAssetHandler, reverseList, clearReverseListHandler } =
    useAccountingCtx();
  const { messageModalDataHandler, messageModalVisibilityHandler, toastHandler } =
    useModalContext();

  const accountBookId = connectedAccountBook?.id ?? FREE_ACCOUNT_BOOK_ID;

  const temporaryAssetListByUser = temporaryAssetList[accountBookId] ?? [];

  const initialLineItems: ILineItemUI[] = [
    initialVoucherLine,
    {
      ...initialVoucherLine,
      id: 1,
    },
  ];

  // Info: (20250116 - Julian) 不顯示 Opening
  const typeList = Object.values(VoucherType).filter((type) => type !== VoucherType.OPENING);

  // Info: (20241108 - Julian) POST ASK AI
  // Deprecated: (20250122 - Julian) remove eslint-disable
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { trigger: askAI, isLoading: isAskingAI } = APIHandler<{
    reason: string;
    resultId: string;
  }>(APIName.ASK_AI_V2);

  // Info: (20241108 - Julian) GET AI RESULT
  // Deprecated: (20250122 - Julian) remove eslint-disable
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { trigger: getAIResult, success: analyzeSuccess } = APIHandler<IAIResultVoucher>(
    APIName.ASK_AI_RESULT_V2
  );

  const {
    trigger: createVoucher,
    success: createSuccess,
    isLoading: isCreating,
  } = APIHandler(APIName.VOUCHER_POST_V2);

  // Info: (20241105 - Julian) 從 useAccountingCtx 取得反轉傳票
  const reverses = Object.values(reverseList).flatMap((reverse) => reverse);

  // Info: (20241004 - Julian) 通用項目
  const [date, setDate] = useState<IDatePeriod>(default30DayPeriodInSec);
  const [type, setType] = useState<string>(VoucherType.EXPENSE);
  const [note, setNote] = useState<{
    note: string;
    name: string | undefined;
    taxId: string | undefined;
  }>({
    note: '',
    name: undefined,
    taxId: undefined,
  });

  // Info: (20241004 - Julian) 週期性分錄相關 state
  // const [isRecurring, setIsRecurring] = useState<boolean>(false);
  // const [recurringPeriod, setRecurringPeriod] = useState<IDatePeriod>(default30DayPeriodInSec);
  // const [recurringUnit, setRecurringUnit] = useState<RecurringUnit>(RecurringUnit.MONTH);
  // const [recurringArray, setRecurringArray] = useState<number[]>([]);

  // Info: (20241004 - Julian) 傳票列
  const [voucherLineItems, setLineItems] = useState<ILineItemUI[]>(initialLineItems);

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
  // Info: (20250603 - Tzuhan) 目前只有刪除傳票時需要建立反轉分錄
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isReverseRequired, setIsReverseRequired] = useState<boolean>(false);

  // Info: (20241004 - Julian) 交易對象相關 state
  const [counterparty, setCounterparty] = useState<ICounterpartyOptional | undefined>(undefined);

  // Info: (20241004 - Julian) 是否顯示提示
  const [isShowDateHint, setIsShowDateHint] = useState<boolean>(false);
  const [isShowCounterpartyHint, setIsShowCounterpartyHint] = useState<boolean>(false);
  // const [isShowRecurringPeriodHint, setIsShowRecurringPeriodHint] = useState<boolean>(false);
  // const [isShowRecurringArrayHint, setIsShowRecurringArrayHint] = useState<boolean>(false);
  const [isShowAssetHint, setIsShowAssetHint] = useState<boolean>(false);
  const [isShowReverseHint, setIsShowReverseHint] = useState<boolean>(false);

  // Info: (20241018 - Tzuhan) AI 分析相關 state
  // Deprecated: (20250122 - Julian) remove eslint-disable
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [aiState, setAiState] = useState<AIState>(AIState.RESTING);
  // Deprecated: (20250122 - Julian) remove eslint-disable
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isShowAnalysisPreview, setIsShowAnalysisPreview] = useState<boolean>(false);
  const [targetIdList, setTargetIdList] = useState<number[]>([]);
  const [resultId, setResultId] = useState<string>('');
  const [resultData, setResultData] = useState<IAIResultVoucher | null>(null);

  // Info: (20241018 - Tzuhan) 選擇憑證相關 state
  const [openSelectorModal, setOpenSelectorModal] = useState<boolean>(false);
  const [openUploaderModal, setOpenUploaderModal] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const [certificates, setCertificates] = useState<{ [id: string]: ICertificateUI }>({});
  const [selectedCertificates, setSelectedCertificates] = useState<ICertificateUI[]>([]);

  // Info: (20241108 - Julian) 取得 AI 分析結果
  const {
    voucherDate: aiVoucherDate,
    type: aiType,
    note: aiNote,
    counterParty: aiCounterParty,
    lineItems: aiLineItems,
  } = resultData ?? dummyAIResult;

  const aiDate = { startTimeStamp: aiVoucherDate, endTimeStamp: aiVoucherDate };

  const aiTotalCredit = parseFloat(
    aiLineItems.reduce(
      (acc, item) => (item.debit === false ? DecimalOperations.add(acc, item.amount) : acc),
      '0'
    )
  );
  const aiTotalDebit = parseFloat(
    aiLineItems.reduce(
      (acc, item) => (item.debit === true ? DecimalOperations.add(acc, item.amount) : acc),
      '0'
    )
  );

  const goBack = () => router.push(ISUNFA_ROUTE.BETA_VOUCHER_LIST);

  const getResult = useCallback(async () => {
    // Info: (20241220 - Julian) 問 AI 分析結果
    const analysisResult = await getAIResult({
      params: { accountBookId, resultId },
      query: { reason: 'voucher' },
    });

    if (analysisResult.data) {
      setResultData(analysisResult.data);
      setAiState(AIState.FINISH);
    } else {
      setAiState(AIState.FAILED);
    }
  }, [resultId]);

  // Info: (20241220 - Julian) 從 resultId 判斷是否已經 POST 成功
  const askAIAnalysis = async (targetIds: number[]) => {
    const aiResult = await askAI({
      params: { accountBookId },
      query: { reason: 'voucher' },
      body: { targetIdList: targetIds },
    });

    setResultId(aiResult.data?.resultId ?? '');
  };

  useEffect(() => {
    // Info: (20241220 - Julian) 如果有 resultId，則問 AI 分析結果
    if (resultId) getResult();
  }, [resultId]);

  // Info: (20241018 - Tzuhan) 選擇憑證
  const handleSelect = useCallback(
    (ids: number[]) => {
      // Info: (20250312 - Julian) 複製一份資料
      const updatedData = { ...certificates };
      // Info: (20250312 - Julian) 更新選擇狀態：包含在 ids 中的 isSelected 為 true，不在 ids 中的為 false
      Object.keys(updatedData).forEach((key) => {
        updatedData[key] = {
          ...updatedData[key],
          isSelected: ids.includes(Number(key)), // Info: (20250312 - Julian) 須轉換成數字
        };
      });

      const selectedCerts = Object.values(updatedData).filter(
        (item) => item.isSelected
      ) as ICertificateUI[];

      setCertificates(updatedData);
      setSelectedCertificates(selectedCerts);

      const targetIds = selectedCerts.map((item) => item.file.id);
      setTargetIdList(targetIds);

      // ToDo: (20241018 - Tzuhan) To Julian: 這邊之後用來呼叫AI分析的API
      setAiState(AIState.WORKING);
      // Info: (20241021 - Julian) 呼叫 ask AI
      askAIAnalysis(targetIds);
    },
    [certificates, selectedIds]
  );

  const handleDelete = useCallback(
    (id: number) => {
      const updatedData = {
        ...certificates,
      };
      updatedData[id] = {
        ...updatedData[id],
        isSelected: false,
      };

      const selectedCerts = Object.values(updatedData).filter(
        (item) => item.isSelected
      ) as ICertificateUI[];

      setCertificates(updatedData);
      setSelectedCertificates(selectedCerts);
    },
    [certificates]
  );

  useEffect(() => {
    /* (20250603 - Tzuhan) Fix: Prevent incorrect REVERT on offset]
    * 原本根據 voucherLineItems 中是否存在 isReverse=true 來推斷是否需要建立反轉分錄（REVERT）
    但實務上「沖銷行為」也會產生 isReverse=true 的項目，並不代表使用者要刪除原始傳票
    因此這段邏輯會造成「沖銷時誤送出 actions: ['revert']」，導致建立錯誤的反轉傳票
    目前僅允許由刪除傳票流程（明確執行 delete API）觸發 REVERT，因此這段先行註解
    const isReverse = voucherLineItems.some((item) => item.isReverse);
    setIsReverseRequired(isReverse);
    */
    setIsShowReverseHint(false); // Info: (20250304 - Julian) 重置沖銷提示
  }, [voucherLineItems]);

  // Info: (20241018 - Tzuhan) 開啟選擇憑證 Modal
  const handleOpenSelectorModal = useCallback(() => {
    setSelectedIds(selectedCertificates.map((item) => item.id));
    setOpenSelectorModal(true);
  }, [selectedCertificates]);

  // Info: (20241018 - Tzuhan) 處理選擇憑證 API 回傳
  const handleCertificateApiResponse = useCallback(
    (resData: IPaginatedData<ICertificate[]>) => {
      const { data } = resData;
      const certificatesData = data.reduce(
        (acc, item) => {
          acc[item.id] = {
            ...item,
            isSelected: selectedCertificates.some((selectedItem) => selectedItem.id === item.id),
            actions: [],
          };
          return acc;
        },
        {} as { [id: string]: ICertificateUI }
      );
      setCertificates(certificatesData);
    },
    [selectedCertificates]
  );

  // Info: (20241004 - Julian) Type 下拉選單
  const {
    targetRef: typeRef,
    componentVisible: typeVisible,
    setComponentVisible: setTypeVisible,
  } = useOuterClick<HTMLDivElement>(false);

  // Info: (20241007 - Julian) Recurring 下拉選單
  // const {
  //   targetRef: recurringRef,
  //   componentVisible: isRecurringMenuOpen,
  //   setComponentVisible: setRecurringMenuOpen,
  // } = useOuterClick<HTMLDivElement>(false);

  // Info: (20241107 - Julian) ============ 熱鍵設置 ============
  const formRef = useRef<HTMLFormElement>(null);

  // const handleTabPress = useCallback(
  //   (event: KeyboardEvent) => {
  //     event.preventDefault(); // Info: (20241107 - Julian) 阻止預設事件

  //     // Info: (20241107 - Julian) 獲取 form 元素中的所有 input, button 元素
  //     const elementsInForm =
  //       formRef.current?.querySelectorAll<FocusableElement>('input, button, div') ?? [];

  //     // Info: (20241107 - Julian) 獲取各個欄位的 index
  //     const dateIndex = focusableElements.findIndex((el) => el.id === 'voucher-date');
  //     const voucherTypeIndex = focusableElements.findIndex((el) => el.id === 'voucher-type');
  //     const noteIndex = focusableElements.findIndex((el) => el.id === 'voucher-note');
  //     const counterpartyIndex = focusableElements.findIndex(
  //       (el) => el.id === 'voucher-counterparty'
  //     ); // Info: (20241108 - Julian) Div
  //     const assetIndex = focusableElements.findIndex((el) => el.id === 'voucher-asset');
  //     const accountTitleIndex = focusableElements.findIndex((el) =>
  //       el.id.includes('account-title')
  //     ); // Info: (20241108 - Julian) Div

  //     const formIndexOrder = [
  //       dateIndex,
  //       voucherTypeIndex,
  //       noteIndex,
  //       counterpartyIndex,
  //       assetIndex,
  //       accountTitleIndex,
  //     ];

  //     // Info: (20241107 - Julian) 獲取當前聚焦元素的 index
  //     const currentIndex = focusableElements.findIndex((el) => el === document.activeElement);

  //     const ToNext = () => {
  //       // Info: (20241107 - Julian) 獲取下一個聚焦元素的 index
  //       const nextIndex = currentIndex + 1 >= focusableElements.length ? 0 : currentIndex + 1;
  //       // Info: (20241107 - Julian) 移動到下一個可聚焦元素
  //       focusableElements[nextIndex]?.focus();
  //     };

  //     if (currentIndex === -1 || currentIndex === focusableElements.length - 1) {
  //       focusableElements[0]?.focus();
  //     } else if (currentIndex >= formIndexOrder[0] && currentIndex < formIndexOrder[1]) {
  //       // Info: (20241107 - Julian) 如果當前聚焦元素是日期欄位，且日期已選，則移動到類型欄位
  //       if (date.startTimeStamp !== 0 && date.endTimeStamp !== 0) {
  //         focusableElements[voucherTypeIndex]?.focus();
  //       } else {
  //         ToNext();
  //       }
  //     } else {
  //       ToNext();
  //     }

  //     // switch (currentIndex) {
  //     //   case dateIndex:
  //     //     if (date.startTimeStamp !== 0 && date.endTimeStamp !== 0) {
  //     //       focusableElements[voucherTypeIndex]?.focus();
  //     //     } else ToNext();
  //     //     break;
  //     //   case voucherTypeIndex:
  //     //     console.log('voucherTypeIndex');
  //     //     ToNext();
  //     //     break;
  //     //   case noteIndex:
  //     //     console.log('noteIndex');
  //     //     ToNext();
  //     //     break;
  //     //   case counterpartyIndex:
  //     //     console.log('counterpartyIndex');
  //     //     // Info: (20241107 - Julian) 如果需填入交易對象，但交易對象未選擇，則聚焦到交易對象欄位
  //     //     if (isCounterpartyRequired && !counterparty) {
  //     //       focusableElements[counterpartyIndex]?.click();
  //     //     } else {
  //     //       ToNext();
  //     //     }
  //     //     break;
  //     //   case assetIndex:
  //     //     console.log('assetIndex');
  //     //     // Info: (20241107 - Julian) 如果需填入資產，但資產為空，則聚焦到資產欄位
  //     //     if (isAssetRequired && temporaryAssetList.length === 0) {
  //     //       focusableElements[assetIndex]?.focus();
  //     //     } else {
  //     //       ToNext();
  //     //     }
  //     //     break;
  //     //   case accountTitleIndex:
  //     //     console.log('accountTitleIndex');
  //     //     ToNext();
  //     //     break;
  //     //   default:
  //     //     console.log('default');
  //     //     focusableElements[0]?.focus();
  //     //     break;
  //     // }
  //   },
  //   [formRef, date, counterparty, isCounterpartyRequired, temporaryAssetListByUser]
  // );

  // useHotkeys('tab', handleTabPress);

  const dateRef = useRef<HTMLDivElement>(null);
  const assetRef = useRef<HTMLDivElement>(null);
  const counterpartyRef = useRef<HTMLDivElement>(null);
  const voucherLineRef = useRef<HTMLDivElement>(null);

  // Info: (20241007 - Julian) 如果單位改變，則重設 Recurring Array
  // useEffect(() => {
  //   setRecurringArray([]);
  // }, [recurringUnit]);

  // Info: (20241007 - Julian) 日期未選擇時顯示提示
  useEffect(() => {
    if (date.startTimeStamp !== 0 && date.endTimeStamp !== 0) {
      setIsShowDateHint(false);
    }
  }, [date]);

  // Info: (20241007 - Julian) 交易對象未選擇時顯示提示
  useEffect(() => {
    if (isCounterpartyRequired && counterparty) {
      setIsShowCounterpartyHint(false);
    }
  }, [counterparty, isCounterpartyRequired]);

  // Info: (20241007 - Julian) 週期區間未選擇時顯示提示
  // useEffect(() => {
  //   if (isRecurring && recurringPeriod.startTimeStamp !== 0 && recurringPeriod.endTimeStamp !== 0) {
  //     setIsShowRecurringPeriodHint(false);
  //   }
  // }, [isRecurring, recurringPeriod]);

  // Info: (20241007 - Julian) 週期未選擇時顯示提示
  // useEffect(() => {
  //   if (isRecurring && recurringArray.length > 0) {
  //     setIsShowRecurringArrayHint(false);
  //   }
  // }, [recurringArray]);

  useEffect(() => {
    if (isAssetRequired && temporaryAssetListByUser.length > 0) {
      setIsShowAssetHint(false);
    }
  }, [temporaryAssetListByUser]);

  const typeToggleHandler = () => setTypeVisible(!typeVisible);

  const noteChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNote((prev) => ({ ...prev, note: e.target.value }));
  };

  // const recurringToggleHandler = () => {
  //   setIsRecurring(!isRecurring);
  // };

  // const recurringUnitToggleHandler = () => {
  //   setRecurringMenuOpen(!isRecurringMenuOpen);
  // };

  // Info: (20241018 - Julian) 欄位顯示
  const isShowCounter = isCounterpartyRequired || (isShowAnalysisPreview && aiCounterParty);

  // Info: (20240926 - Julian) type 字串轉換
  const translateType = (voucherType: string) => {
    const typeStr = EVENT_TYPE_TO_VOUCHER_TYPE_MAP[voucherType as EventType];

    if (typeStr) {
      return t(`journal:ADD_NEW_VOUCHER.TYPE_${typeStr.toUpperCase()}`);
    } else {
      return t(`journal:ADD_NEW_VOUCHER.TYPE_${voucherType.toUpperCase()}`);
    }
  };

  // const translateUnit = (unit: RecurringUnit) => {
  //   if (unit === RecurringUnit.WEEK) {
  //     return t(`common:COMMON.WEEK`);
  //   } else {
  //     return t(`common:COMMON.YEAR`);
  //   }
  // };

  // Info: (20241004 - Julian) 清空表單
  const clearAllHandler = () => {
    setDate(default30DayPeriodInSec);
    setType(VoucherType.EXPENSE);
    setNote({
      note: '',
      name: undefined,
      taxId: undefined,
    });
    setCounterparty(undefined);
    // setIsRecurring(false);
    // setRecurringPeriod(default30DayPeriodInSec);
    // setRecurringUnit(RecurringUnit.MONTH);
    // setRecurringArray([]);
    clearTemporaryAssetHandler(accountBookId);
    clearReverseListHandler();
    setLineItems(initialLineItems);
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const fillUpWithAIResult = () => {
    setDate(aiDate);
    setType(aiType);
    setNote((prev) => ({
      ...prev,
      note: aiNote,
      name: aiCounterParty?.name,
      taxId: aiCounterParty?.taxId,
    }));
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const retryAIHandler = () => {
    setAiState(AIState.WORKING);
    if (resultId) {
      // Info: (20241220 - Julian) 如果有 resultId，則直接 GET AI 分析結果
      getResult();
    } else {
      // Info: (20241220 - Julian) 如果沒有 resultId，則重新 POST ASK AI
      askAIAnalysis(targetIdList);
    }
  };

  const saveVoucher = async () => {
    // Info: (20241105 - Julian) 如果有資產，則加入 VoucherV2Action.ADD_ASSET；如果有反轉傳票，則加入 VoucherV2Action.REVERT
    const actions = [];
    if (isAssetRequired && temporaryAssetListByUser.length > 0) {
      actions.push(VoucherV2Action.ADD_ASSET);
    }
    if (isReverseRequired) actions.push(VoucherV2Action.REVERT);

    const lineItems = voucherLineItems.map((lineItem) => {
      return {
        accountId: lineItem.account?.id ?? '',
        amount: lineItem.amount,
        debit: lineItem.debit,
        description: lineItem.description,
      };
    });

    // Info: (20241105 - Julian) 如果沒有新增資產，就回傳空陣列
    const assetIds =
      isAssetRequired && temporaryAssetListByUser.length > 0
        ? temporaryAssetListByUser.map((asset) => asset.id)
        : [];

    // Info: (20241105 - Julian) 如果有反轉傳票，則取得反轉傳票的資訊並加入 reverseVouchers，否則回傳空陣列
    const reverseVouchers: {
      voucherId: number;
      lineItemIdBeReversed: number;
      lineItemIdReverseOther: number;
      amount: string;
    }[] =
      isReverseRequired && reverses.length > 0
        ? reverses.map((reverse) => {
            return {
              voucherId: reverse.voucherId,
              lineItemIdBeReversed: reverse.lineItemBeReversedId, // ToDo: (20241105 - Julian) 白字藍底的 `reverse line item` 的 id
              lineItemIdReverseOther: reverse.lineItemIndex, // ToDo: (20241105 - Julian) 藍字白底的 `voucher line item` 的 id
              amount: reverse.amount,
            };
          })
        : [];

    const body = {
      actions,
      certificateIds: selectedIds,
      voucherDate: date.startTimeStamp,
      type: VOUCHER_TYPE_TO_EVENT_TYPE_MAP[type as VoucherType],
      note: JSON.stringify(note),
      counterPartyId: counterparty?.id,
      lineItems,
      assetIds,
      reverseVouchers,
    };

    clearTemporaryAssetHandler(accountBookId);
    clearReverseListHandler();
    createVoucher({ params: { accountBookId }, body });
  };

  const submitForm = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Info: (20241007 - Julian) 若任一條件不符，則中斷 function
    if (date.startTimeStamp === 0 && date.endTimeStamp === 0) {
      // Info: (20241007 - Julian) 日期不可為 0：顯示日期提示，並定位到日期欄位、吐司通知
      setIsShowDateHint(true);
      toastHandler({
        id: ToastId.FILL_UP_VOUCHER_FORM,
        type: ToastType.ERROR,
        content: `${t('journal:ADD_NEW_VOUCHER.TOAST_FILL_UP_FORM')}:${t('journal:ADD_NEW_VOUCHER.VOUCHER_DATE')}`,
        closeable: true,
      });
      if (dateRef.current) dateRef.current.scrollIntoView();
      // Info: (20241004 - Julian) 如果需填入交易對象，則交易對象不可為空：顯示交易對象提示，並定位到交易對象欄位、吐司通知
    } else if (isCounterpartyRequired && (!counterparty || counterparty?.name === '')) {
      setIsShowCounterpartyHint(true);
      toastHandler({
        id: ToastId.FILL_UP_VOUCHER_FORM,
        type: ToastType.ERROR,
        content: `${t('journal:ADD_NEW_VOUCHER.TOAST_FILL_UP_FORM')}:${t('journal:ADD_NEW_VOUCHER.COUNTERPARTY')}`,
        closeable: true,
      });
      if (counterpartyRef.current) counterpartyRef.current.scrollIntoView();
      // } else if (
      //   // Info: (20241007 - Julian) 如果開啟週期，但週期區間未選擇，則顯示週期提示，並定位到週期欄位
      //   isRecurring &&
      //   (recurringPeriod.startTimeStamp === 0 || recurringPeriod.endTimeStamp === 0)
      // ) {
      //   setIsShowRecurringPeriodHint(true);
      //   router.push('#voucher-recurring');
      // } else if (isRecurring && recurringArray.length === 0) {
      //   // Info: (20241007 - Julian) 顯示週期提示，並定位到週期欄位
      //   setIsShowRecurringArrayHint(true);
      //   router.push('#voucher-recurring');
    } else if (
      isTotalZero || // Info: (20241004 - Julian) 借貸總金額不可為 0
      isTotalNotEqual || // Info: (20241004 - Julian) 借貸金額需相等
      haveZeroLine || // Info: (20241004 - Julian) 沒有未填的數字的傳票列
      isAccountingNull || // Info: (20241004 - Julian) 沒有未選擇的會計科目
      isVoucherLineEmpty // Info: (20241004 - Julian) 沒有傳票列
    ) {
      setFlagOfSubmit(!flagOfSubmit);
      if (voucherLineRef.current) voucherLineRef.current.scrollIntoView();
      toastHandler({
        id: ToastId.FILL_UP_VOUCHER_FORM,
        type: ToastType.ERROR,
        content: (
          <>
            {t('journal:ADD_NEW_VOUCHER.LINE_ITEM_1')}
            <br />
            {t('journal:ADD_NEW_VOUCHER.LINE_ITEM_2')}
            <br />
            {t('journal:ADD_NEW_VOUCHER.LINE_ITEM_3')}
          </>
        ),
        closeable: true,
      });
    } else if (isReverseRequired && reverses.length === 0) {
      // Info: (20241011 - Julian) 如果需填入沖銷傳票，但沖銷傳票為空，則顯示沖銷提示，並定位到沖銷欄位、吐司通知
      setIsShowReverseHint(true);
      toastHandler({
        id: ToastId.FILL_UP_VOUCHER_FORM,
        type: ToastType.ERROR,
        content: `${t('journal:VOUCHER_LINE_BLOCK.REVERSE_HINT')}`,
        closeable: true,
      });
    } else {
      if (isAssetRequired && temporaryAssetListByUser.length === 0) {
        // Info: (20241007 - Julian) 如果需填入資產，但資產為空，則顯示資產提示，並定位到資產欄位、吐司通知
        toastHandler({
          id: ToastId.FILL_UP_VOUCHER_FORM,
          type: ToastType.WARNING,
          content: `${t('journal:ASSET_SECTION.EMPTY_HINT')}`,
          closeable: true,
        });
        if (assetRef.current) assetRef.current.scrollIntoView();
      }

      // Info: (20241007 - Julian) 儲存傳票
      saveVoucher();

      // Info: (20241007 - Julian) 重設提示
      setIsShowDateHint(false);
      setIsShowCounterpartyHint(false);
      // setIsShowRecurringPeriodHint(false);
      // setIsShowRecurringArrayHint(false);
      setIsShowAssetHint(false);
      setIsShowReverseHint(false);
      setFlagOfSubmit(!flagOfSubmit);
    }
  };

  // Info: (20241125 - Julian) 清空表單熱鍵
  useHotkeys('ctrl+c', clearClickHandler);

  useEffect(() => {
    if (isCreating === false) {
      if (createSuccess) {
        router.push(ISUNFA_ROUTE.VOUCHER_LIST);
      } else {
        toastHandler({
          id: ToastId.CREATE_VOUCHER_ERROR,
          type: ToastType.ERROR,
          content: t('journal:ADD_NEW_VOUCHER.TOAST_FAILED_TO_CREATE'),
          closeable: true,
        });
      }
    }
  }, [createSuccess, isCreating]);

  const typeDropdownMenu = typeVisible ? (
    <div className="absolute left-0 top-50px z-10 flex w-full flex-col rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px text-dropdown-text-primary shadow-dropmenu">
      {typeList.map((voucherType) => {
        const typeClickHandler = () => {
          setType(voucherType);
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

  // const recurringUnitMenu = (
  //   <div
  //     ref={recurringRef}
  //     className={`absolute left-0 top-12 ${isRecurringMenuOpen ? 'flex' : 'hidden'} w-full flex-col overflow-hidden rounded-sm border border-input-stroke-input bg-input-surface-input-background p-8px`}
  //   >
  //     {Object.values(RecurringUnit).map((unit) => {
  //       const recurringUnitClickHandler = () => {
  //         setRecurringUnit(unit);
  //         setRecurringMenuOpen(false);
  //       };
  //       return (
  //         <button
  //           key={unit}
  //           type="button"
  //           className="py-8px hover:bg-dropdown-surface-menu-background-secondary"
  //           onClick={recurringUnitClickHandler}
  //         >
  //           {translateUnit(unit)}
  //         </button>
  //       );
  //     })}
  //   </div>
  // );

  // const recurringUnitCheckboxes =
  //   recurringUnit === RecurringUnit.WEEK
  //     ? Array.from({ length: 7 }, (_, i) => {
  //         const week = i;
  //         const weekChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
  //           if (e.target.checked) {
  //             setRecurringArray([...recurringArray, week]);
  //           } else {
  //             setRecurringArray(recurringArray.filter((item) => item !== week));
  //           }
  //         };
  //         // Info: (20241007 - Julian) 檢查 Array 是否有該值
  //         const weekChecked = recurringArray.includes(week);

  //         return (
  //           <div key={week} className="flex items-center gap-8px whitespace-nowrap">
  //             <input
  //               type="checkbox"
  //               id={`week-${week}`}
  //               checked={weekChecked}
  //               className={checkboxStyle}
  //               onChange={weekChangeHandler}
  //             />
  //             <label htmlFor={`week-${week}`}>{t(WEEK_FULL_LIST[week])}</label>
  //           </div>
  //         );
  //       })
  //     : Array.from({ length: 12 }, (_, i) => {
  //         const month = i + 1;
  //         const monthChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
  //           if (e.target.checked) {
  //             setRecurringArray([...recurringArray, month]);
  //           } else {
  //             setRecurringArray(recurringArray.filter((item) => item !== month));
  //           }
  //         };
  //         // Info: (20241007 - Julian) 檢查 Array 是否有該值
  //         const monthChecked = recurringArray.includes(month);

  //         return (
  //           <div key={month} className="flex items-center gap-8px whitespace-nowrap">
  //             <input
  //               type="checkbox"
  //               id={`month-${month}`}
  //               checked={monthChecked}
  //               className={checkboxStyle}
  //               onChange={monthChangeHandler}
  //             />
  //             <label htmlFor={`month-${month}`}>{t(MONTH_ABR_LIST[i])}</label>
  //           </div>
  //         );
  //       });

  // ToDo: (20241104 - Julian) 預計移到其他地方
  // const displayedRecurring =  (
  //   <div id="voucher-recurring" className="col-span-2 grid grid-cols-6 gap-16px">
  //     {/* Info: (20241007 - Julian) switch */}
  //     <div className="col-span-2 flex items-center gap-16px whitespace-nowrap text-switch-text-primary">
  //       <Toggle
  //         id="recurring-toggle"
  //         initialToggleState={isRecurring}
  //         getToggledState={recurringToggleHandler}
  //       />
  //       <p>{t('journal:ADD_NEW_VOUCHER.RECURRING_ENTRY')}</p>
  //     </div>
  //     {/* Info: (20241007 - Julian) recurring period */}
  //     <div className={`${isRecurring ? 'block' : 'hidden'} col-span-4`}>
  //       <DatePicker
  //         type={DatePickerType.TEXT_PERIOD}
  //         period={recurringPeriod}
  //         setFilteredPeriod={setRecurringPeriod}
  //         datePickerClassName="w-full"
  //         btnClassName={isShowRecurringPeriodHint ? inputStyle.ERROR : ''}
  //       />
  //     </div>
  //     {/* Info: (20241007 - Julian) recurring unit */}
  //     <div
  //       className={`${isRecurring ? 'flex' : 'hidden'} col-start-3 col-end-7 items-center gap-24px`}
  //     >
  //       {/* Info: (20241007 - Julian) recurring unit block */}
  //       <div className="flex items-center divide-x divide-input-stroke-input rounded-sm border border-input-stroke-input bg-input-surface-input-background">
  //         <p className="px-12px py-10px text-input-text-input-placeholder">
  //           {t('journal:ADD_NEW_VOUCHER.EVERY')}
  //         </p>
  //         <div
  //           onClick={recurringUnitToggleHandler}
  //           className="relative flex flex-1 items-center justify-between px-12px py-10px text-input-text-input-filled hover:cursor-pointer"
  //         >
  //           <p className="w-50px">{translateUnit(recurringUnit)}</p>
  //           <FaChevronDown />
  //           {/* Info: (20240926 - Julian) recurring unit dropdown */}
  //           {recurringUnitMenu}
  //         </div>
  //       </div>
  //       {/* Info: (20241007 - Julian) recurring unit checkbox */}
  //       <div
  //         className={`flex items-center gap-12px overflow-x-auto ${isShowRecurringArrayHint ? inputStyle.ERROR : inputStyle.NORMAL}`}
  //       >
  //         {recurringUnitCheckboxes}
  //       </div>
  //     </div>
  //   </div>
  // )

  const certificateCreatedHandler = useCallback(
    (data: { message: string }) => {
      const newCertificate: ICertificate = JSON.parse(data.message);

      const newCertificatesUI: { [id: string]: ICertificateUI } = {
        [newCertificate.id]: {
          ...newCertificate,
          isSelected: true, // Info: (20250312 - Julian) 新增的發票預設為選取
          actions: !newCertificate.voucherNo
            ? [
                CERTIFICATE_USER_INTERACT_OPERATION.DOWNLOAD,
                CERTIFICATE_USER_INTERACT_OPERATION.REMOVE,
              ]
            : [CERTIFICATE_USER_INTERACT_OPERATION.DOWNLOAD],
        },
      };

      loggerFront.log(`NewVoucherForm handleNewCertificateComing: newCertificate`, newCertificate);
      setCertificates((prev) => {
        loggerFront.log(`NewVoucherForm handleNewCertificateComing: prev`, prev);

        Object.values(prev).forEach((certificate) => {
          newCertificatesUI[certificate.id] = {
            ...certificate,
            // Info: (20250604 - Julian) 保留原有的 isSelected 狀態
            isSelected: newCertificatesUI[certificate.id]?.isSelected ?? certificate.isSelected,
          };
        });
        loggerFront.log(
          `NewVoucherForm handleNewCertificateComing: newCertificates`,
          newCertificatesUI
        );
        return newCertificatesUI;
      });
    },
    [certificates]
  );

  // Info: (20241022 - tzuhan) @Murky, 這裡是前端訂閱 PUSHER (CERTIFICATE_EVENT.CREATE) 的地方，當生成新的 certificate 要新增到列表中
  useEffect(() => {
    const pusher = getPusherInstance();
    const channel = pusher.subscribe(`${PRIVATE_CHANNEL.CERTIFICATE}-${accountBookId}`);

    channel.bind(CERTIFICATE_EVENT.CREATE, certificateCreatedHandler);

    return () => {
      channel.unbind(CERTIFICATE_EVENT.CREATE, certificateCreatedHandler);
      channel.unsubscribe();
      pusher.unsubscribe(`${PRIVATE_CHANNEL.CERTIFICATE}-${accountBookId}`);
    };
  }, []);

  // ToDo: (20241127 - Julian) 訂閱 Voucher AI 分析結果 PUSHER
  // const aiResultHandler = useCallback(
  //   (data: { message: string }) => {
  //     const aiResult: IAIResultVoucher = JSON.parse(data.message);
  // loggerFront.log(`NewVoucherForm aiResultHandler: aiResult`, aiResult);
  //     setAiVoucherResult(aiResult);
  //     setAiState(AIState.FINISH);
  //   },
  //   [selectedIds]
  // );

  // ToDo: (20241127 - Julian) 訂閱 Voucher AI 分析結果 PUSHER
  // useEffect(() => {
  //   const pusher = getPusherInstance();
  //   const channel = pusher.subscribe(`${PRIVATE_CHANNEL.VOUCHER}-${resultId}`);

  //   channel.bind(CERTIFICATE_EVENT.ANALYSIS, aiResultHandler);

  //   return () => {
  //     channel.unbind_all();
  //     channel.unsubscribe();
  //     pusher.disconnect();
  //   };
  // }, []);

  const handleCounterpartySelect = (counterpartyPartial: ICounterpartyOptional) => {
    setCounterparty(counterpartyPartial);
    setNote((prev) => ({
      ...prev,
      name: counterpartyPartial.name,
      taxId: counterpartyPartial.taxId,
    }));
  };

  useEffect(() => {
    setSelectedCertificates(Object.values(selectedData));
    setSelectedIds(Object.keys(selectedData).map(Number));
  }, [selectedData]);

  return (
    <div className="relative flex flex-col gap-lv-6 tablet:gap-40px">
      {/* Info: (20250526 - Julian) Mobile back button */}
      <div className="flex items-center gap-lv-2 tablet:hidden">
        <Button variant="secondaryBorderless" size="defaultSquare" onClick={goBack}>
          <TbArrowBackUp size={24} />
        </Button>
        <p className="text-base font-semibold text-text-neutral-secondary">
          {t('journal:ADD_NEW_VOUCHER.PAGE_TITLE')}
        </p>
      </div>

      <CertificateSelectorModal
        accountBookId={accountBookId}
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
      />
      {/* Info: (20240926 - Julian) AI analyze */}
      {/* ToDo: (20250122 - Julian) 暫時隱藏 */}
      {/* <AIWorkingArea
        aiState={aiState}
        analyzeSuccess={analyzeSuccess ?? false}
        setAiState={setAiState}
        setIsShowAnalysisPreview={setIsShowAnalysisPreview}
        retryClickHandler={retryAIHandler}
        retryDisabled={isAskingAI || aiState === AIState.WORKING}
        fillUpClickHandler={fillUpWithAIResult}
      /> */}
      {/* ToDo: (20240926 - Julian) Uploaded certificates */}
      <CertificateSelection
        selectedCertificates={selectedCertificates}
        setOpenModal={handleOpenSelectorModal}
        isSelectable
        isDeletable
        className="my-8"
        onDelete={handleDelete}
      />

      {/* Info: (20240926 - Julian) form */}
      <form
        ref={formRef}
        onSubmit={submitForm}
        className="grid w-full grid-cols-1 gap-lv-5 tablet:grid-cols-2 tablet:gap-24px"
      >
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
            calenderClassName="w-full tablet:w-auto"
          />
        </div>
        {/* Info: (20240926 - Julian) Type */}
        <div className="flex flex-col gap-8px">
          <p className="font-bold text-input-text-primary">
            {t('journal:ADD_NEW_VOUCHER.VOUCHER_TYPE')}
            <span className="text-text-state-error">*</span>
          </p>
          <div ref={typeRef} className="relative">
            <button
              id="voucher-type"
              type="button"
              onClick={typeToggleHandler}
              className="flex w-full items-center justify-between rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px hover:cursor-pointer hover:border-input-stroke-input-hover"
            >
              <p
                className={`text-base ${isShowAnalysisPreview ? inputStyle.PREVIEW : 'text-input-text-input-filled'}`}
              >
                {isShowAnalysisPreview ? translateType(aiType) : translateType(type)}
              </p>
              <div className={typeVisible ? 'rotate-180' : 'rotate-0'}>
                <FaChevronDown size={20} />
              </div>
            </button>
            {/* Info: (20240926 - Julian) Type dropdown */}
            {typeDropdownMenu}
          </div>
        </div>

        {/* Info: (20240926 - Julian) Note */}
        <div className="flex flex-col gap-8px tablet:col-span-2">
          <p className="font-bold text-input-text-primary">{t('journal:ADD_NEW_VOUCHER.NOTE')}</p>
          <input
            id="voucher-note"
            type="text"
            value={note.note}
            onChange={noteChangeHandler}
            placeholder={isShowAnalysisPreview ? aiNote : t('journal:ADD_NEW_VOUCHER.NOTE')}
            className={`rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px ${isShowAnalysisPreview ? inputStyle.PREVIEW : 'placeholder:text-input-text-input-placeholder'}`}
          />
        </div>
        {/* Info: (20240926 - Julian) Counterparty */}
        {isShowCounter && (
          <div ref={counterpartyRef} className="tablet:col-span-2">
            <CounterpartyInput
              counterparty={counterparty}
              onSelect={handleCounterpartySelect}
              isShowRedHint={isShowCounterpartyHint}
            />
          </div>
        )}
        {/* Info: (20241007 - Julian) Recurring */}

        {/* Info: (20241009 - Julian) Asset */}
        {isAssetRequired && (
          <div ref={assetRef} className="flex flex-col tablet:col-span-2">
            <AssetSection isShowAssetHint={isShowAssetHint} lineItems={voucherLineItems} />
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
          <div ref={voucherLineRef} className="overflow-x-auto tablet:col-span-2">
            <VoucherLineBlock
              lineItems={voucherLineItems}
              setLineItems={setLineItems}
              flagOfClear={flagOfClear}
              flagOfSubmit={flagOfSubmit}
              isShowReverseHint={isShowReverseHint}
              setIsTotalZero={setIsTotalZero}
              setIsTotalNotEqual={setIsTotalNotEqual}
              setHaveZeroLine={setHaveZeroLine}
              setIsAccountingNull={setIsAccountingNull}
              setIsVoucherLineEmpty={setIsVoucherLineEmpty}
              setIsCounterpartyRequired={setIsCounterpartyRequired}
              setIsAssetRequired={setIsAssetRequired}
            />
          </div>
        )}
        {/* Info: (20240926 - Julian) buttons */}
        <div className="flex items-center gap-24px tablet:col-span-2 tablet:ml-auto tablet:gap-12px">
          <Button
            id="voucher-clear-button"
            type="button"
            variant="secondaryOutline"
            onClick={clearClickHandler}
            className="w-full tablet:w-auto"
          >
            {t('journal:JOURNAL.CLEAR_ALL')}
          </Button>
          <Button
            id="voucher-save-button"
            type="submit"
            onKeyDown={(e) => {
              if (e.key === KEYBOARD_EVENT_CODE.ENTER) e.preventDefault();
            }}
            className="w-full tablet:w-auto"
            disabled={isCreating} // Info: (20241120 - Julian) 防止重複送出
          >
            <p>{t('common:COMMON.SAVE')}</p>
            <BiSave size={20} />
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NewVoucherForm;
