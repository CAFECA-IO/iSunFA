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
import { ICounterparty } from '@/interfaces/counterparty';
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
import { ISUNFA_ROUTE } from '@/constants/url';
import { ToastType } from '@/interfaces/toastify';
import { IAIResultVoucher } from '@/interfaces/voucher';
import { AI_TYPE } from '@/constants/aich';
import CounterpartyInput from '@/components/voucher/counterparty_input';

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

  const { selectedCompany, userAuth } = useUserCtx();
  const {
    getAccountListHandler,
    temporaryAssetList,
    clearTemporaryAssetHandler,
    reverseList,
    clearReverseListHandler,
  } = useAccountingCtx();
  const { messageModalDataHandler, messageModalVisibilityHandler, toastHandler } =
    useModalContext();

  const companyId = selectedCompany?.id;
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

  const {
    trigger: createVoucher,
    success: createSuccess,
    isLoading: isCreating,
  } = APIHandler(APIName.VOUCHER_POST_V2);

  // Info: (20241108 - Julian) 取得 AI 分析結果
  const {
    voucherDate: aiVoucherDate,
    type: aiType,
    note: aiNote,
    counterParty: aiCounterParty,
    lineItems: aiLineItems,
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

  // Info: (20241105 - Julian) 從 useAccountingCtx 取得反轉傳票
  const reverses = Object.values(reverseList).flatMap((reverse) => reverse);

  // Info: (20241004 - Julian) 通用項目
  const [date, setDate] = useState<IDatePeriod>(default30DayPeriodInSec);
  const [type, setType] = useState<string>(VoucherType.EXPENSE);
  const [note, setNote] = useState<string>('');

  // Info: (20241004 - Julian) 週期性分錄相關 state
  // const [isRecurring, setIsRecurring] = useState<boolean>(false);
  // const [recurringPeriod, setRecurringPeriod] = useState<IDatePeriod>(default30DayPeriodInSec);
  // const [recurringUnit, setRecurringUnit] = useState<RecurringUnit>(RecurringUnit.MONTH);
  // const [recurringArray, setRecurringArray] = useState<number[]>([]);

  // Info: (20241004 - Julian) 傳票列
  const [voucherLineItems, setLineItems] = useState<ILineItemUI[]>([initialVoucherLine]);

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
  const [isReverseRequired, setIsReverseRequired] = useState<boolean>(false);

  // Info: (20241004 - Julian) 交易對象相關 state
  const [counterparty, setCounterparty] = useState<ICounterparty | undefined>(undefined);

  // Info: (20241004 - Julian) 是否顯示提示
  const [isShowDateHint, setIsShowDateHint] = useState<boolean>(false);
  // const [isShowRecurringPeriodHint, setIsShowRecurringPeriodHint] = useState<boolean>(false);
  // const [isShowRecurringArrayHint, setIsShowRecurringArrayHint] = useState<boolean>(false);
  const [isShowAssetHint, setIsShowAssetHint] = useState<boolean>(false);
  const [isShowReverseHint, setIsShowReverseHint] = useState<boolean>(false);

  // Info: (20241018 - Tzuhan) AI 分析相關 state
  const [aiState, setAiState] = useState<AIState>(AIState.RESTING);
  const [isShowAnalysisPreview, setIsShowAnalysisPreview] = useState<boolean>(false);
  const [apiInterval, setApiInterval] = useState<NodeJS.Timeout | null>(null);

  // Info: (20241018 - Tzuhan) 選擇憑證相關 state
  const [openSelectorModal, setOpenSelectorModal] = useState<boolean>(false);
  const [openUploaderModal, setOpenUploaderModal] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = React.useState<number[]>([]);

  const [certificates, setCertificates] = useState<{ [id: string]: ICertificateUI }>({});
  const [selectedCertificates, setSelectedCertificates] = useState<ICertificateUI[]>([]);

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

      const selectedCerts = Object.values(updatedData).filter(
        (item) => item.isSelected
      ) as ICertificateUI[];

      setCertificates(updatedData);
      setSelectedCertificates(selectedCerts);

      const targetIdList = selectedCerts.map((item) => item.id);

      // ToDo: (20241018 - Tzuhan) To Julian: 這邊之後用來呼叫AI分析的API
      setAiState(AIState.WORKING);
      // Info: (20241021 - Julian) 呼叫 ask AI
      askAI({ params: { companyId }, query: { reason: 'voucher' }, body: { targetIdList } });
    },
    [certificates]
  );

  // useEffect(() => {
  //   if (selectedCertificates.length > 0 && selectedIds.length > 0) {
  //     // ToDo: (20241018 - Tzuhan) To Julian: 這邊之後用來呼叫AI分析的API
  //     setAiState(AIState.WORKING);
  //     // Info: (20241021 - Julian) 呼叫 ask AI
  //     askAI({
  //       params: { companyId },
  //       query: { reason: 'voucher' },
  //       body: { targetIdList: [100] },
  //     });
  //   }
  // }, [selectedCertificates, selectedIds]);

  const handleGetAIResult = useCallback(() => {
    // Info: (20241128 - Julian) 用 ResultId 來問 AI 分析結果，持續問到有結果為止；若 aiState !== AIState.WORKING 則停止問
    const interval = setInterval(async () => {
      getAIResult({
        params: { companyId, resultId: askData?.resultId },
        query: { reason: 'voucher' },
      });
    }, 5000);

    setApiInterval(interval);
  }, [askData]);

  useEffect(() => {
    if (aiState === AIState.WORKING) {
      // Info: (20241128 - Julian) 問 AI 分析結果
      handleGetAIResult();
    } else if (apiInterval) {
      // Info: (20241128 - Julian) 如果 AI 分析結束，則停止問 API
      clearInterval(apiInterval);
    }
  }, [aiState]);

  // Info: (20241128 - Julian) 取得 AI 分析結果
  useEffect(() => {
    if (isAskingAI === false) {
      if (askSuccess === false || askData?.resultId === 'fetchAIResultIdError') {
        //  Info: (20241021 - Julian) AI 分析失敗
        setAiState(AIState.FAILED);
      } else if (askSuccess && askData) {
        //  Info: (20241021 - Julian) AI 分析中
        setAiState(AIState.WORKING);
      }
    }
  }, [askSuccess, askData, isAskingAI]);

  // Info: (20241021 - Julian) AI 分析結果
  useEffect(() => {
    if (isAIWorking === false) {
      if (resultData) {
        setAiState(AIState.FINISH);
      } else if (analyzeSuccess === false) {
        // Info: (20241021 - Julian) AI 分析失敗
        setAiState(AIState.FAILED);
      }
    }
  }, [isAIWorking, resultData, analyzeSuccess]);

  useEffect(() => {
    const isReverse = reverses.length > 0;
    setIsReverseRequired(isReverse);
  }, [reverseList]);

  // Info: (20241018 - Tzuhan) 開啟選擇憑證 Modal
  const handleOpenSelectorModal = useCallback(() => {
    setSelectedIds(selectedCertificates.map((item) => item.id));
    setOpenSelectorModal(true);
  }, [selectedCertificates]);

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

  //     // ToDo: (20241107 - Julian) ============ 施工中🔧 ============
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
  const voucherLineRef = useRef<HTMLDivElement>(null);

  // Info: (20241004 - Julian) 取得會計科目列表
  useEffect(() => {
    if (selectedCompany) {
      getAccountListHandler(selectedCompany.id);
    }
  }, [selectedCompany]);

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

  // const counterSearchToggleHandler = () => {
  //   setIsSearchCounterparty(!isSearchCounterparty);
  //   setCounterMenuOpen(!isCounterMenuOpen);
  // };

  const noteChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNote(e.target.value);
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
    setNote('');
    setCounterparty(undefined);
    // setIsRecurring(false);
    // setRecurringPeriod(default30DayPeriodInSec);
    // setRecurringUnit(RecurringUnit.MONTH);
    // setRecurringArray([]);
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

  const retryAIHandler = () => {
    setAiState(AIState.WORKING);
    askAI({
      params: { companyId },
      query: { reason: 'voucher' },
      body: { targetIdList: selectedIds },
    });
  };

  const saveVoucher = async () => {
    // Info: (20241105 - Julian) 如果有資產，則加入 VoucherV2Action.ADD_ASSET；如果有反轉傳票，則加入 VoucherV2Action.REVERT
    const actions = [];
    if (isAssetRequired) actions.push(VoucherV2Action.ADD_ASSET);
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
      amount: number;
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
      note,
      counterPartyId: counterparty?.companyId,
      lineItems,
      assetIds,
      reverseVouchers,
    };

    clearTemporaryAssetHandler(userId);
    clearReverseListHandler();
    createVoucher({ params: { companyId }, body });
  };

  const submitForm = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Info: (20241007 - Julian) 若任一條件不符，則中斷 function
    if (date.startTimeStamp === 0 && date.endTimeStamp === 0) {
      // Info: (20241007 - Julian) 日期不可為 0：顯示日期提示，並定位到日期欄位
      setIsShowDateHint(true);
      if (dateRef.current) dateRef.current.scrollIntoView();
      // Info: (20241004 - Julian) 如果需填入交易對象，則交易對象不可為空：顯示類型提示，並定位到類型欄位
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
    } else if (isAssetRequired && temporaryAssetListByUser.length === 0) {
      // Info: (20241007 - Julian) 如果需填入資產，但資產為空，則顯示資產提示，並定位到資產欄位
      setIsShowAssetHint(true);
      if (assetRef.current) assetRef.current.scrollIntoView();
    } else if (isReverseRequired && reverses.length === 0) {
      // Info: (20241011 - Julian) 如果需填入沖銷傳票，但沖銷傳票為空，則顯示沖銷提示，並定位到沖銷欄位
      setIsShowReverseHint(true);
    } else {
      // Info: (20241007 - Julian) 儲存傳票
      saveVoucher();

      // Info: (20241007 - Julian) 重設提示
      setIsShowDateHint(false);
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
        router.push(ISUNFA_ROUTE.VOUCHER_LIST); // ToDo: (20241108 - Julian) Should be replaced by voucher detail page
      } else {
        toastHandler({
          // ToDo: (20241108 - Julian) i18n
          id: 'create-voucher-fail',
          type: ToastType.ERROR,
          content: t('journal:ADD_NEW_VOUCHER.TOAST_FAILED_TO_CREATE'),
          closeable: true,
        });
      }
    }
  }, [createSuccess, isCreating]);

  const typeDropdownMenu = typeVisible ? (
    <div
      ref={typeRef}
      className="absolute left-0 top-50px flex w-full flex-col rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px text-dropdown-text-primary shadow-dropmenu"
    >
      {Object.values(VoucherType).map((voucherType) => {
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
      // Deprecated: (20241122 - tzuhan) Debugging purpose
      // eslint-disable-next-line no-console
      console.log(`NewVoucherForm handleNewCertificateComing: newCertificate`, newCertificate);
      setCertificates((prev) => {
        // Deprecated: (20241122 - tzuhan) Debugging purpose
        // eslint-disable-next-line no-console
        console.log(`NewVoucherForm handleNewCertificateComing: prev`, prev);
        const newCertificatesUI: { [id: string]: ICertificateUI } = {
          [newCertificate.id]: {
            ...newCertificate,
            isSelected: false,
            actions: !newCertificate.voucherNo
              ? [
                  CERTIFICATE_USER_INTERACT_OPERATION.DOWNLOAD,
                  CERTIFICATE_USER_INTERACT_OPERATION.REMOVE,
                ]
              : [CERTIFICATE_USER_INTERACT_OPERATION.DOWNLOAD],
          },
        };
        Object.values(prev).forEach((certificate) => {
          newCertificatesUI[certificate.id] = {
            ...certificate,
          };
        });
        // Deprecated: (20241122 - tzuhan) Debugging purpose
        // eslint-disable-next-line no-console
        console.log(
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
    const channel = pusher.subscribe(`${PRIVATE_CHANNEL.CERTIFICATE}-${companyId}`);

    channel.bind(CERTIFICATE_EVENT.CREATE, certificateCreatedHandler);

    return () => {
      channel.unbind(CERTIFICATE_EVENT.CREATE, certificateCreatedHandler);
      channel.unsubscribe();
      pusher.unsubscribe(`${PRIVATE_CHANNEL.CERTIFICATE}-${companyId}`);
    };
  }, []);

  // ToDo: (20241127 - Julian) 訂閱 Voucher AI 分析結果 PUSHER
  // const aiResultHandler = useCallback(
  //   (data: { message: string }) => {
  //     const aiResult: IAIResultVoucher = JSON.parse(data.message);
  //     // Deprecated: (20241127 - Julian) Debugging purpose
  //     // eslint-disable-next-line no-console
  //     console.log(`NewVoucherForm aiResultHandler: aiResult`, aiResult);
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

  useEffect(() => {
    setSelectedCertificates(Object.values(selectedData));
    setSelectedIds(Object.keys(selectedData).map(Number));
  }, [selectedData]);

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
        retryClickHandler={retryAIHandler}
        retryDisabled={isAskingAI || aiState === AIState.WORKING}
        fillUpClickHandler={fillUpWithAIResult}
      />
      {/* ToDo: (20240926 - Julian) Uploaded certificates */}
      <CertificateSelection
        selectedCertificates={selectedCertificates}
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
          <div className="relative">
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
              <FaChevronDown size={20} />
            </button>
            {/* Info: (20240926 - Julian) Type dropdown */}
            {typeDropdownMenu}
          </div>
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
        {!isShowCounter && (
          <CounterpartyInput
            counterparty={counterparty}
            setCounterparty={setCounterparty}
            flagOfSubmit={flagOfSubmit}
            className="col-span-2"
          />
          // <div className="relative col-span-2 flex flex-col gap-8px">
          //   <p className="font-bold text-input-text-primary">
          //     {t('journal:ADD_NEW_VOUCHER.COUNTERPARTY')}
          //     <span className="text-text-state-error">*</span>
          //   </p>
          //   <button
          //     id="voucher-counterparty"
          //     type="button"
          //     ref={counterpartyRef}
          //     onClick={counterSearchToggleHandler}
          //     className={`flex w-full items-center justify-between gap-8px rounded-sm border bg-input-surface-input-background px-12px py-10px hover:cursor-pointer hover:border-input-stroke-selected ${isSearchCounterparty ? 'border-input-stroke-selected' : isShowCounterHint ? inputStyle.ERROR : 'border-input-stroke-input text-input-text-input-filled'}`}
          //   >
          //     {displayedCounterparty}
          //     <div className="h-20px w-20px">
          //       <FiSearch size={20} />
          //     </div>
          //   </button>
          //   {/* Info: (20241004 - Julian) Counterparty drop menu */}
          //   {counterpartyDropMenu}
          // </div>
        )}
        {/* Info: (20241007 - Julian) Recurring */}

        {/* Info: (20241009 - Julian) Asset */}
        {isAssetRequired && (
          <div ref={assetRef} className="col-span-2 flex flex-col">
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
          <>
            {isShowReverseHint ? (
              <p className="text-text-state-error">
                {t('journal:VOUCHER_LINE_BLOCK.REVERSE_HINT')}
              </p>
            ) : null}
            <div ref={voucherLineRef} className="col-span-2">
              <VoucherLineBlock
                lineItems={voucherLineItems}
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
