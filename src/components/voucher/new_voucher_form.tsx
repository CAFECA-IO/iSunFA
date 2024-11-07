import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaChevronDown } from 'react-icons/fa6';
import { BiSave } from 'react-icons/bi';
import { FiSearch } from 'react-icons/fi';
import { useTranslation } from 'next-i18next';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { Button } from '@/components/button/button';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
// import Toggle from '@/components/toggle/toggle';
import AssetSection from '@/components/voucher/asset_section';
import VoucherLineBlock, { VoucherLinePreview } from '@/components/voucher/voucher_line_block';
import { IDatePeriod } from '@/interfaces/date_period';
import { ILineItemBeta, ILineItemUI, initialVoucherLine } from '@/interfaces/line_item';
import { MessageType } from '@/interfaces/message_modal';
import { ICounterparty, dummyCounterparty } from '@/interfaces/counterparty';
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
import { VoucherType, EventType, EVENT_TYPE_TO_VOUCHER_TYPE_MAP } from '@/constants/account';
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

// enum RecurringUnit {
//   MONTH = 'month',
//   WEEK = 'week',
// }

// ToDo: (20241021 - Julian) 確認完後移動到 interfaces
interface IAIResultVoucher {
  voucherDate: number;
  type: string;
  note: string;
  counterPartyId: number; // ToDo: (20241018 - Julian) @Murky: 希望可以改成 ICounterparty (至少要有 company id 和 name)
  lineItemsInfo: {
    lineItems: ILineItemBeta[]; // ToDo: (20241018 - Julian) @Murky: 希望可以改成 ILineItemBeta[]
  };
}

const dummyAIResult: IAIResultVoucher = {
  voucherDate: 0,
  type: '',
  note: '',
  counterPartyId: 0,
  lineItemsInfo: { lineItems: [] },
};

interface NewVoucherFormProps {
  selectedData: { [id: string]: ICertificateUI };
}

const NewVoucherForm: React.FC<NewVoucherFormProps> = ({ selectedData }) => {
  const { t } = useTranslation('common');

  const { selectedCompany } = useUserCtx();
  const {
    getAccountListHandler,
    temporaryAssetList,
    clearTemporaryAssetHandler,
    reverseList,
    clearReverseListHandler,
  } = useAccountingCtx();
  const { messageModalDataHandler, messageModalVisibilityHandler } = useModalContext();

  const {
    trigger: askAI,
    success: askSuccess,
    data: askData,
  } = APIHandler<{
    reason: string;
    resultId: string;
  }>(APIName.ASK_AI_V2);

  const {
    trigger: getAIResult,
    data: resultData,
    isLoading: isAIWorking,
    success: analyzeSuccess,
  } = APIHandler<IAIResultVoucher>(APIName.ASK_AI_RESULT_V2);

  const {
    voucherDate: aiVoucherDate,
    type: aiType,
    note: aiNote,
    counterPartyId: aiCounterPartyId,
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
  const [counterKeyword, setCounterKeyword] = useState<string>('');
  const [counterparty, setCounterparty] = useState<string>(
    t('journal:ADD_NEW_VOUCHER.COUNTERPARTY')
  );
  const [filteredCounterparty, setFilteredCounterparty] =
    useState<ICounterparty[]>(dummyCounterparty);

  // Info: (20241004 - Julian) 是否顯示提示
  const [isShowDateHint, setIsShowDateHint] = useState<boolean>(false);
  const [isShowCounterHint, setIsShowCounterHint] = useState<boolean>(false);
  // const [isShowRecurringPeriodHint, setIsShowRecurringPeriodHint] = useState<boolean>(false);
  // const [isShowRecurringArrayHint, setIsShowRecurringArrayHint] = useState<boolean>(false);
  const [isShowAssetHint, setIsShowAssetHint] = useState<boolean>(false);
  const [isShowReverseHint, setIsShowReverseHint] = useState<boolean>(false);

  // Info: (20241018 - Tzuhan) AI 分析相關 state
  const [aiState, setAiState] = useState<AIState>(AIState.RESTING);
  const [isAIStart, setIsAIStart] = useState<boolean>(false);
  const [isShowAnalysisPreview, setIsShowAnalysisPreview] = useState<boolean>(false);

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
      setCertificates(updatedData);
      setSelectedCertificates(
        Object.values(updatedData).filter((item) => item.isSelected) as ICertificateUI[]
      );
    },
    [certificates]
  );

  useEffect(() => {
    if (selectedCertificates.length > 0 && selectedIds.length > 0) {
      // ToDo: (20241018 - Tzuhan) To Julian: 這邊之後用來呼叫AI分析的API
      setAiState(AIState.WORKING);
      setIsAIStart(true);
      // Info: (20241021 - Julian) 呼叫 ask AI
      askAI({
        params: { companyId: selectedCompany?.id },
        query: { reason: 'voucher' },
        body: { certificateId: selectedIds[0] },
      });
    }
  }, [selectedCertificates, selectedIds]);

  useEffect(() => {
    if (askSuccess && askData) {
      // Info: (20241018 - Tzuhan) 呼叫 AI 分析 API
      getAIResult({
        params: {
          companyId: selectedCompany?.id,
          resultId: 222, // ToDo: (20241021 - Julian) Replace with askData.resultId
        },
        query: {
          reason: 'voucher',
        },
      });
    } else if (isAIStart && !askSuccess) {
      // Info: (20241021 - Julian) AI 分析失敗
      setAiState(AIState.FAILED);
    }
  }, [askSuccess, askData]);

  // Info: (20241021 - Julian) AI 分析結果
  useEffect(() => {
    if (isAIStart) {
      if (!isAIWorking && resultData) {
        setAiState(AIState.FINISH);
      } else if (!isAIWorking && !resultData) {
        setAiState(AIState.FAILED);
      }
    } else if (!isAIWorking && !analyzeSuccess) {
      // Info: (20241021 - Julian) AI 分析失敗
      setAiState(AIState.FAILED);
    }
  }, [isAIWorking, resultData]);

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

  // Info: (20241007 - Julian) Recurring 下拉選單
  // const {
  //   targetRef: recurringRef,
  //   componentVisible: isRecurringMenuOpen,
  //   setComponentVisible: setRecurringMenuOpen,
  // } = useOuterClick<HTMLDivElement>(false);

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
    const filteredList = dummyCounterparty.filter((counter) => {
      // Info: (20241004 - Julian) 編號(數字)搜尋: 字首符合
      if (counterKeyword.match(/^\d+$/)) {
        const taxIdMatch = counter.taxId.toLowerCase().startsWith(counterKeyword.toLowerCase());
        return taxIdMatch;
      } else if (counterKeyword !== '') {
        // Info: (20241004 - Julian) 名稱搜尋: 部分符合
        const nameMatch = counter.name.toLowerCase().includes(counterKeyword.toLowerCase());
        return nameMatch;
      }
      return true;
    });
    setFilteredCounterparty(filteredList);
  }, [counterKeyword]);

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

  // Info: (20241004 - Julian) 交易對象未選擇時顯示提示
  useEffect(() => {
    if (counterparty !== '' && counterparty !== t('journal:ADD_NEW_VOUCHER.COUNTERPARTY')) {
      setIsShowCounterHint(false);
    }
  }, [counterparty]);

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
    if (isAssetRequired && temporaryAssetList.length > 0) {
      setIsShowAssetHint(false);
    }
  }, [temporaryAssetList]);

  const typeToggleHandler = () => {
    setTypeVisible(!typeVisible);
  };

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

  // const recurringToggleHandler = () => {
  //   setIsRecurring(!isRecurring);
  // };

  // const recurringUnitToggleHandler = () => {
  //   setRecurringMenuOpen(!isRecurringMenuOpen);
  // };

  // Info: (20241018 - Julian) 欄位顯示
  const isShowCounter = isCounterpartyRequired || (isShowAnalysisPreview && aiCounterPartyId);

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
    setCounterparty(t('journal:ADD_NEW_VOUCHER.COUNTERPARTY'));
    // setIsRecurring(false);
    // setRecurringPeriod(default30DayPeriodInSec);
    // setRecurringUnit(RecurringUnit.MONTH);
    // setRecurringArray([]);
    clearTemporaryAssetHandler();
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
    setCounterparty(aiCounterPartyId.toString());
    // ToDo: (20241021 - Julian) 等 API 格式確認後再處理
    //  setLineItems(aiLineItems);
  };

  // ToDo: (20240926 - Julian) Save voucher function
  const saveVoucher = async () => {
    // Info: (20241105 - Julian) 如果有資產，則加入 VoucherV2Action.ADD_ASSET；如果有反轉傳票，則加入 VoucherV2Action.REVERT
    const actions = [];
    if (isAssetRequired) actions.push(VoucherV2Action.ADD_ASSET);
    if (isReverseRequired) actions.push(VoucherV2Action.REVERT);

    // Info: (20241105 - Julian) 如果沒有新增資產，就回傳空陣列
    const assetIds =
      isAssetRequired && temporaryAssetList.length > 0
        ? temporaryAssetList.map((asset) => asset.id)
        : [];

    // Info: (20241105 - Julian) 如果有反轉傳票，則取得反轉傳票的資訊並加入 reverseVouchers，否則回傳空陣列
    const reverseVouchers: {
      voucherId: string;
      lineItemIdBeReversed: number;
      lineItemIdReverseOther: number;
      amount: number;
    }[] =
      isReverseRequired && reverses.length > 0
        ? reverses.map((reverse) => {
            return {
              voucherId: reverse.voucherNo,
              lineItemIdBeReversed: reverse.voucherId, // Info: (20241105 - Julian) 白字藍底的 `reverse line item` 的 id
              lineItemIdReverseOther: -1, // Info: (20241105 - Julian) 藍字白底的 `voucher line item` 的 id
              amount: reverse.amount,
            };
          })
        : [];

    const body = {
      actions,
      certificateIds: Object.values(certificates),
      voucherDate: date.startTimeStamp,
      type,
      note,
      lineItems: voucherLineItems,
      assetIds,
      counterPartyId: counterparty,
      reverseVouchers,
    };

    // Info: (20241004 - Julian) for debug
    // eslint-disable-next-line no-console
    console.log(body);
  };

  const submitForm = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Info: (20241007 - Julian) 若任一條件不符，則中斷 function
    if (date.startTimeStamp === 0 && date.endTimeStamp === 0) {
      // Info: (20241007 - Julian) 日期不可為 0：顯示日期提示，並定位到日期欄位
      setIsShowDateHint(true);
      if (dateRef.current) dateRef.current.scrollIntoView();
    } else if (
      // Info: (20241004 - Julian) 如果需填入交易對象，則交易對象不可為空：顯示類型提示，並定位到類型欄位
      isCounterpartyRequired &&
      (counterparty === '' || counterparty === t('journal:ADD_NEW_VOUCHER.COUNTERPARTY'))
    ) {
      setIsShowCounterHint(true);
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
    } else if (isAssetRequired && temporaryAssetList.length === 0) {
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
      setIsShowCounterHint(false);
      // setIsShowRecurringPeriodHint(false);
      // setIsShowRecurringArrayHint(false);
      setIsShowAssetHint(false);
      setIsShowReverseHint(false);
      setFlagOfSubmit(!flagOfSubmit);
    }
  };

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

  const displayedCounterparty = isSearchCounterparty ? (
    <input
      ref={counterpartyInputRef}
      value={counterKeyword}
      onChange={counterKeywordChangeHandler}
      placeholder={counterparty}
      className="w-full truncate bg-transparent text-input-text-input-filled outline-none"
    />
  ) : (
    <p
      className={`truncate ${isShowCounterHint ? inputStyle.ERROR : isShowAnalysisPreview ? inputStyle.PREVIEW : inputStyle.NORMAL}`}
    >
      {isShowAnalysisPreview ? aiCounterPartyId : counterparty}
    </p>
  );

  const counterMenu =
    filteredCounterparty && filteredCounterparty.length > 0 ? (
      filteredCounterparty.map((counter) => {
        const counterClickHandler = () => {
          setCounterparty(`${counter.taxId} ${counter.name}`);
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
      <form onSubmit={submitForm} className="grid w-full grid-cols-2 gap-24px">
        {/* Info: (20240926 - Julian) Date */}
        <div ref={dateRef} className="flex flex-col gap-8px whitespace-nowrap">
          <p className="font-bold text-input-text-primary">
            {t('journal:ADD_NEW_VOUCHER.VOUCHER_DATE')}
            <span className="text-text-state-error">*</span>
          </p>
          <DatePicker
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
          <div
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
          </div>
        </div>

        {/* Info: (20240926 - Julian) Note */}
        <div className="col-span-2 flex flex-col gap-8px">
          <p className="font-bold text-input-text-primary">{t('journal:ADD_NEW_VOUCHER.NOTE')}</p>
          <input
            id="note-input"
            type="text"
            value={note}
            onChange={noteChangeHandler}
            placeholder={isShowAnalysisPreview ? aiNote : t('journal:ADD_NEW_VOUCHER.NOTE')}
            className={`rounded-sm border border-input-stroke-input px-12px py-10px outline-none ${isShowAnalysisPreview ? inputStyle.PREVIEW : 'placeholder:text-input-text-input-placeholder'}`}
          />
        </div>
        {/* Info: (20240926 - Julian) Counterparty */}
        {isShowCounter && (
          <div id="voucher-counterparty" className="relative col-span-2 flex flex-col gap-8px">
            <p className="font-bold text-input-text-primary">
              {t('journal:ADD_NEW_VOUCHER.COUNTERPARTY')}
              <span className="text-text-state-error">*</span>
            </p>
            <div
              ref={counterpartyRef}
              onClick={counterSearchToggleHandler}
              className={`flex w-full items-center justify-between gap-8px rounded-sm border bg-input-surface-input-background px-12px py-10px outline-none hover:cursor-pointer hover:border-input-stroke-selected ${isSearchCounterparty ? 'border-input-stroke-selected' : isShowCounterHint ? inputStyle.ERROR : 'border-input-stroke-input text-input-text-input-filled'}`}
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
          <Button type="button" variant="secondaryOutline" onClick={clearClickHandler}>
            {t('journal:JOURNAL.CLEAR_ALL')}
          </Button>
          <Button type="submit">
            <p>{t('common:COMMON.SAVE')}</p>
            <BiSave size={20} />
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NewVoucherForm;
