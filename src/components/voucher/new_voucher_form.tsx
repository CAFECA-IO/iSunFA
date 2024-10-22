import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { FaChevronDown } from 'react-icons/fa6';
import { BiSave } from 'react-icons/bi';
import { FiSearch } from 'react-icons/fi';
import { useTranslation } from 'next-i18next';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { Button } from '@/components/button/button';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import Toggle from '@/components/toggle/toggle';
import AssetSection from '@/components/voucher/asset_section';
import ReverseSection from '@/components/voucher/reverse_section';
import VoucherLineBlock, { VoucherLinePreview } from '@/components/voucher/voucher_line_block';
import { IDatePeriod } from '@/interfaces/date_period';
import { ILineItemBeta, initialVoucherLine } from '@/interfaces/line_item';
import { MessageType } from '@/interfaces/message_modal';
import { ICounterParty, dummyCounterparty } from '@/interfaces/counterparty';
import { IAssetItem } from '@/interfaces/asset';
import { IReverse, defaultReverse } from '@/interfaces/reverse';
import { useUserCtx } from '@/contexts/user_context';
import { useAccountingCtx } from '@/contexts/accounting_context';
import { useModalContext } from '@/contexts/modal_context';
import {
  checkboxStyle,
  inputStyle,
  default30DayPeriodInSec,
  WEEK_FULL_LIST,
  MONTH_ABR_LIST,
} from '@/constants/display';
import { VoucherType, EventType, EVENT_TYPE_TO_VOUCHER_TYPE_MAP } from '@/constants/account';
import { AccountCodesOfAPandAR, AccountCodesOfAsset } from '@/constants/asset';
import AIWorkingArea, { AIState } from '@/components/voucher/ai_working_area';
import { ICertificate, ICertificateUI, OPERATIONS } from '@/interfaces/certificate';
import CertificateSelectorModal from '@/components/certificate/certificate_selector_modal';
import CertificateUploaderModal from '@/components/certificate/certificate_uoloader_modal';
import CertificateSelection from '@/components/certificate/certificate_selection';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { IPaginatedData } from '@/interfaces/pagination';
import { getPusherInstance } from '@/lib/pusherClient';
import { CERTIFICATE_EVENT, PRIVATE_CHANNEL } from '@/constants/pusher';

enum RecurringUnit {
  MONTH = 'month',
  WEEK = 'week',
}

interface IAIResultVoucher {
  voucherDate: number;
  type: string;
  note: string;
  counterPartyId: number; // ToDo: (20241018 - Julian) @Murky: 希望可以改成 ICounterParty (至少要有 company id 和 name)
  lineItemsInfo: {
    lineItems: ILineItemBeta[]; // ToDo: (20241018 - Julian) @Murky: 希望可以改成 ILineItemBeta[]
  };
}

const NewVoucherForm: React.FC = () => {
  const { t } = useTranslation('common');
  const router = useRouter();

  const { selectedCompany } = useUserCtx();
  const { getAccountListHandler } = useAccountingCtx();
  const { messageModalDataHandler, messageModalVisibilityHandler } = useModalContext();

  const {
    trigger: aiAnalyze,
    data: resultData,
    isLoading: isAIWorking,
    success: analyzeSuccess,
  } = APIHandler<IAIResultVoucher>(APIName.ASK_AI_V2);

  // ToDo: (20241017 - Julian) 施工中 🚧
  const {
    voucherDate: aiVoucherDate,
    type: aiType,
    note: aiNote,
    counterPartyId: aiCounterPartyId,
    lineItemsInfo: { lineItems: aiLineItems },
  } = resultData ?? {
    voucherDate: 0,
    type: '',
    note: '',
    counterPartyId: 0,
    lineItemsInfo: { lineItems: [] },
  };

  const aiDate = {
    startTimeStamp: aiVoucherDate,
    endTimeStamp: aiVoucherDate,
  };

  const aiTotalCredit = aiLineItems.reduce(
    (acc, item) => (item.debit === false ? acc + item.amount : acc),
    0
  );
  const aiTotalDebit = aiLineItems.reduce(
    (acc, item) => (item.debit === true ? acc + item.amount : acc),
    0
  );

  // Info: (20241004 - Julian) 通用項目
  const [date, setDate] = useState<IDatePeriod>(default30DayPeriodInSec);
  const [type, setType] = useState<string>(VoucherType.EXPENSE);
  const [note, setNote] = useState<string>('');

  // Info: (20241004 - Julian) 週期性分錄相關 state
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [recurringPeriod, setRecurringPeriod] = useState<IDatePeriod>(default30DayPeriodInSec);
  const [recurringUnit, setRecurringUnit] = useState<RecurringUnit>(RecurringUnit.MONTH);
  const [recurringArray, setRecurringArray] = useState<number[]>([]);

  // Info: (20241004 - Julian) 傳票列
  const [voucherLineItems, setLineItems] = useState<ILineItemBeta[]>([initialVoucherLine]);

  // Info: (20241004 - Julian) 傳票列驗證條件
  const [totalCredit, setTotalCredit] = useState<number>(0);
  const [totalDebit, setTotalDebit] = useState<number>(0);
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
    useState<ICounterParty[]>(dummyCounterparty);

  // Info: (20241011 - Julian) 資產相關 state
  const [assets, setAssets] = useState<IAssetItem[]>([]);

  // Info: (20241011 - Julian) 沖銷傳票相關 state
  const [reverses, setReverses] = useState<IReverse[]>([defaultReverse]);
  const [haveUnselectedReverse, setHaveUnselectedReverse] = useState<boolean>(false);
  const [haveZeroAmountReverse, setHaveZeroAmountReverse] = useState<boolean>(false);

  // Info: (20241004 - Julian) 是否顯示提示
  const [isShowDateHint, setIsShowDateHint] = useState<boolean>(false);
  const [isShowCounterHint, setIsShowCounterHint] = useState<boolean>(false);
  const [isShowRecurringPeriodHint, setIsShowRecurringPeriodHint] = useState<boolean>(false);
  const [isShowRecurringArrayHint, setIsShowRecurringArrayHint] = useState<boolean>(false);
  const [isShowAssetHint, setIsShowAssetHint] = useState<boolean>(false);

  // Info: (20241018 - Tzuhan) AI 分析相關 state
  const [aiState, setAiState] = useState<AIState>(AIState.RESTING);
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
      // Info: (20241018 - Tzuhan) 呼叫 AI 分析 API
      aiAnalyze({
        // ToDo: (20241017 - Julian) Replace with real parameters
        params: {
          companyId: '111',
          resultId: '123',
        },
        query: {
          reason: 'voucher',
        },
      });

      if (!isAIWorking && resultData) {
        setAiState(AIState.FINISH);
      }

      // setTimeout(() => {
      //   setAiState(AIState.FINISH);
      //   setAnalyzeSuccess(selectedCertificates.length > 0);
      // }, 2000);
    }
  }, [selectedCertificates, selectedIds]);

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
    []
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
  const {
    targetRef: recurringRef,
    componentVisible: isRecurringMenuOpen,
    setComponentVisible: setRecurringMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const counterpartyInputRef = useRef<HTMLInputElement>(null);

  // Info: (20241004 - Julian) 取得會計科目列表
  useEffect(() => {
    if (selectedCompany) {
      getAccountListHandler(selectedCompany.id);
    }
  }, [selectedCompany]);

  // Info: (20241004 - Julian) 傳票列條件
  useEffect(() => {
    // Info: (20241004 - Julian) 計算總借貸金額
    const debitTotal = voucherLineItems.reduce((acc, item) => {
      return item.debit === true ? acc + item.amount : acc;
    }, 0);
    const creditTotal = voucherLineItems.reduce((acc, item) => {
      return item.debit === false ? acc + item.amount : acc;
    }, 0);
    // Info: (20241004 - Julian) 檢查是否有未填的數字的傳票列
    const zeroLine = voucherLineItems.some((item) => item.amount === 0 || item.debit === null);
    // Info: (20241004 - Julian) 檢查是否有未選擇的會計科目
    const accountingNull = voucherLineItems.some((item) => item.account === null);

    // Info: (20241009 - Julian) 會計科目有應收付帳款時，顯示 Counterparty
    const isAPorAR = voucherLineItems.some((item) => {
      return AccountCodesOfAPandAR.includes(item.account?.code || '');
    });

    // Info: (20241009 - Julian) 會計科目有資產時，顯示 Asset
    const isAsset = voucherLineItems.some((item) => {
      return AccountCodesOfAsset.includes(item.account?.code || '');
    });

    // Info: (20241004 - Julian) 會計科目有應付帳款且借方有值 || 會計科目有應收帳款且貸方有值，顯示 Reverse
    const isReverse = voucherLineItems.some(
      (item) =>
        (item.account?.code === '2171' && item.debit === true && item.amount > 0) || // Info: (20241009 - Julian) 應付帳款
        (item.account?.code === '1172' && item.debit === false && item.amount > 0) // Info: (20241009 - Julian) 應收帳款
    );

    setTotalDebit(debitTotal);
    setTotalCredit(creditTotal);
    setHaveZeroLine(zeroLine);
    setIsAccountingNull(accountingNull);
    setIsVoucherLineEmpty(voucherLineItems.length === 0);
    setIsCounterpartyRequired(isAPorAR);
    setIsAssetRequired(isAsset);
    setIsReverseRequired(isReverse);
  }, [voucherLineItems]);

  useEffect(() => {
    // Info: (20241004 - Julian) 檢查是否有未選擇的沖銷傳票
    const unselectedReverse = reverses.some((reverse) => reverse.voucher === null);
    // Info: (20241004 - Julian) 檢查是否有金額為 0 的沖銷傳票
    const zeroAmountReverse = reverses.some((reverse) => reverse.amount === 0);

    setHaveUnselectedReverse(unselectedReverse);
    setHaveZeroAmountReverse(zeroAmountReverse);
  }, [reverses]);

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
        const taxIdMatch = counter.taxId.toString().startsWith(counterKeyword.toLowerCase());
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
  useEffect(() => {
    setRecurringArray([]);
  }, [recurringUnit]);

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
  useEffect(() => {
    if (isRecurring && recurringPeriod.startTimeStamp !== 0 && recurringPeriod.endTimeStamp !== 0) {
      setIsShowRecurringPeriodHint(false);
    }
  }, [isRecurring, recurringPeriod]);

  // Info: (20241007 - Julian) 週期未選擇時顯示提示
  useEffect(() => {
    if (isRecurring && recurringArray.length > 0) {
      setIsShowRecurringArrayHint(false);
    }
  }, [recurringArray]);

  useEffect(() => {
    if (isAssetRequired && assets.length > 0) {
      setIsShowAssetHint(false);
    }
  }, [assets]);

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

  const recurringToggleHandler = () => {
    setIsRecurring(!isRecurring);
  };

  const recurringUnitToggleHandler = () => {
    setRecurringMenuOpen(!isRecurringMenuOpen);
  };

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

  const translateUnit = (unit: RecurringUnit) => {
    if (unit === RecurringUnit.WEEK) {
      return t(`common:COMMON.WEEK`);
    } else {
      return t(`common:COMMON.YEAR`);
    }
  };

  // Info: (20241004 - Julian) 清空表單
  const clearAllHandler = () => {
    setDate(default30DayPeriodInSec);
    setType(VoucherType.EXPENSE);
    setNote('');
    setCounterparty(t('journal:ADD_NEW_VOUCHER.COUNTERPARTY'));
    setIsRecurring(false);
    setRecurringPeriod(default30DayPeriodInSec);
    setRecurringUnit(RecurringUnit.MONTH);
    setRecurringArray([]);
    setAssets([]);
    setReverses([defaultReverse]);
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
    setLineItems(aiLineItems);
  };

  // ToDo: (20240926 - Julian) Save voucher function
  const saveVoucher = async () => {
    // Info: (20241004 - Julian) for debug
    // eslint-disable-next-line no-console
    console.log(
      'Save voucher\nCertificate:',
      selectedCertificates,
      '\nDate: ',
      date,
      '\nType:',
      type,
      '\nNote:',
      note,
      '\nCounterparty:',
      counterparty,
      '\nRecurring:',
      isRecurring,
      isRecurring
        ? `Period: ${recurringPeriod.startTimeStamp} ~ ${recurringPeriod.endTimeStamp}`
        : '',
      isRecurring
        ? `Every ${recurringUnit === RecurringUnit.WEEK ? 'week' : 'year'}: ${recurringArray.map((item) => item)}`
        : '',
      assets.length > 0 ? '\nAssets:' : '',
      `${assets.map((asset) => `${asset.assetNumber} ${asset.assetName}`)}`,
      reverses.length > 0 ? '\nReverses:' : '',
      `${reverses.map((reverse) => `${reverse.voucher?.voucherNo} ${reverse.amount}`)}`,
      '\nVoucherLineItems:',
      voucherLineItems
    );
  };

  const submitForm = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Info: (20241007 - Julian) 若任一條件不符，則中斷 function
    if (date.startTimeStamp === 0 && date.endTimeStamp === 0) {
      // Info: (20241007 - Julian) 日期不可為 0：顯示日期提示，並定位到日期欄位
      setIsShowDateHint(true);
      router.push('#voucher-date');
    } else if (
      // Info: (20241004 - Julian) 如果需填入交易對象，則交易對象不可為空：顯示類型提示，並定位到類型欄位
      isCounterpartyRequired &&
      (counterparty === '' || counterparty === t('journal:ADD_NEW_VOUCHER.COUNTERPARTY'))
    ) {
      setIsShowCounterHint(true);
      router.push('#voucher-counterparty');
    } else if (
      // Info: (20241007 - Julian) 如果開啟週期，但週期區間未選擇，則顯示週期提示，並定位到週期欄位
      isRecurring &&
      (recurringPeriod.startTimeStamp === 0 || recurringPeriod.endTimeStamp === 0)
    ) {
      setIsShowRecurringPeriodHint(true);
      router.push('#voucher-recurring');
    } else if (isRecurring && recurringArray.length === 0) {
      // Info: (20241007 - Julian) 顯示週期提示，並定位到週期欄位
      setIsShowRecurringArrayHint(true);
      router.push('#voucher-recurring');
    } else if (
      (totalCredit === 0 && totalDebit === 0) || // Info: (20241004 - Julian) 借貸總金額不可為 0
      totalCredit !== totalDebit || // Info: (20241004 - Julian) 借貸金額需相等
      haveZeroLine || // Info: (20241004 - Julian) 沒有未填的數字的傳票列
      isAccountingNull || // Info: (20241004 - Julian) 沒有未選擇的會計科目
      isVoucherLineEmpty // Info: (20241004 - Julian) 沒有傳票列
    ) {
      setFlagOfSubmit(!flagOfSubmit);
      router.push('#voucher-line-block');
    } else if (isAssetRequired && assets.length === 0) {
      // Info: (20241007 - Julian) 如果需填入資產，但資產為空，則顯示資產提示，並定位到資產欄位
      setIsShowAssetHint(true);
      router.push('#asset-section');
    } else if (
      // Info: (20241007 - Julian) 如果需填入沖銷傳票，但沖銷傳票為空 or 有未選擇的沖銷傳票 or 有金額為 0 的沖銷傳票
      // 則顯示沖銷傳票提示，並定位到沖銷傳票欄位
      isReverseRequired &&
      (reverses.length === 0 || haveUnselectedReverse || haveZeroAmountReverse)
    ) {
      setFlagOfSubmit(!flagOfSubmit);
      router.push('#reverse-section');
    } else {
      // Info: (20241007 - Julian) 儲存傳票
      saveVoucher();

      // Info: (20241007 - Julian) 重設提示
      setIsShowDateHint(false);
      setIsShowCounterHint(false);
      setIsShowRecurringPeriodHint(false);
      setIsShowRecurringArrayHint(false);
      setIsShowAssetHint(false);
      setFlagOfSubmit(!flagOfSubmit);
      router.push('#');
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

  const recurringUnitMenu = (
    <div
      ref={recurringRef}
      className={`absolute left-0 top-12 ${isRecurringMenuOpen ? 'flex' : 'hidden'} w-full flex-col overflow-hidden rounded-sm border border-input-stroke-input bg-input-surface-input-background p-8px`}
    >
      {Object.values(RecurringUnit).map((unit) => {
        const recurringUnitClickHandler = () => {
          setRecurringUnit(unit);
          setRecurringMenuOpen(false);
        };
        return (
          <button
            key={unit}
            type="button"
            className="py-8px hover:bg-dropdown-surface-menu-background-secondary"
            onClick={recurringUnitClickHandler}
          >
            {translateUnit(unit)}
          </button>
        );
      })}
    </div>
  );

  const recurringUnitCheckboxes =
    recurringUnit === RecurringUnit.WEEK
      ? Array.from({ length: 7 }, (_, i) => {
          const week = i;
          const weekChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.checked) {
              setRecurringArray([...recurringArray, week]);
            } else {
              setRecurringArray(recurringArray.filter((item) => item !== week));
            }
          };
          // Info: (20241007 - Julian) 檢查 Array 是否有該值
          const weekChecked = recurringArray.includes(week);

          return (
            <div key={week} className="flex items-center gap-8px whitespace-nowrap">
              <input
                type="checkbox"
                id={`week-${week}`}
                checked={weekChecked}
                className={checkboxStyle}
                onChange={weekChangeHandler}
              />
              <label htmlFor={`week-${week}`}>{t(WEEK_FULL_LIST[week])}</label>
            </div>
          );
        })
      : Array.from({ length: 12 }, (_, i) => {
          const month = i + 1;
          const monthChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.checked) {
              setRecurringArray([...recurringArray, month]);
            } else {
              setRecurringArray(recurringArray.filter((item) => item !== month));
            }
          };
          // Info: (20241007 - Julian) 檢查 Array 是否有該值
          const monthChecked = recurringArray.includes(month);

          return (
            <div key={month} className="flex items-center gap-8px whitespace-nowrap">
              <input
                type="checkbox"
                id={`month-${month}`}
                checked={monthChecked}
                className={checkboxStyle}
                onChange={monthChangeHandler}
              />
              <label htmlFor={`month-${month}`}>{t(MONTH_ABR_LIST[i])}</label>
            </div>
          );
        });

  const certificateUpdateHandler = useCallback((message: { certificate: ICertificate }) => {
    const newCertificates = {
      ...certificates,
    };
    newCertificates[message.certificate.id] = {
      ...message.certificate,
      isSelected: false,
      actions: !message.certificate.voucherNo
        ? [OPERATIONS.DOWNLOAD, OPERATIONS.REMOVE]
        : [OPERATIONS.DOWNLOAD],
    };
    setCertificates(newCertificates);
  }, []);

  useEffect(() => {
    const pusher = getPusherInstance();
    const channel = pusher.subscribe(PRIVATE_CHANNEL.CERTIFICATE);

    channel.bind(CERTIFICATE_EVENT.UPDATE, certificateUpdateHandler);

    return () => {
      channel.unbind(CERTIFICATE_EVENT.UPDATE, certificateUpdateHandler);
      pusher.unsubscribe(PRIVATE_CHANNEL.CERTIFICATE);
    };
  }, []);

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
        <div id="voucher-date" className="flex flex-col gap-8px whitespace-nowrap">
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
        <div id="voucher-recurring" className="col-span-2 grid grid-cols-6 gap-16px">
          {/* Info: (20241007 - Julian) switch */}
          <div className="col-span-2 flex items-center gap-16px whitespace-nowrap text-switch-text-primary">
            <Toggle
              id="recurring-toggle"
              initialToggleState={isRecurring}
              getToggledState={recurringToggleHandler}
            />
            <p>{t('journal:ADD_NEW_VOUCHER.RECURRING_ENTRY')}</p>
          </div>
          {/* Info: (20241007 - Julian) recurring period */}
          <div className={`${isRecurring ? 'block' : 'hidden'} col-span-4`}>
            <DatePicker
              type={DatePickerType.TEXT_PERIOD}
              period={recurringPeriod}
              setFilteredPeriod={setRecurringPeriod}
              datePickerClassName="w-full"
              btnClassName={isShowRecurringPeriodHint ? inputStyle.ERROR : ''}
            />
          </div>
          {/* Info: (20241007 - Julian) recurring unit */}
          <div
            className={`${isRecurring ? 'flex' : 'hidden'} col-start-3 col-end-7 items-center gap-24px`}
          >
            {/* Info: (20241007 - Julian) recurring unit block */}
            <div className="flex items-center divide-x divide-input-stroke-input rounded-sm border border-input-stroke-input bg-input-surface-input-background">
              <p className="px-12px py-10px text-input-text-input-placeholder">
                {t('journal:ADD_NEW_VOUCHER.EVERY')}
              </p>
              <div
                onClick={recurringUnitToggleHandler}
                className="relative flex flex-1 items-center justify-between px-12px py-10px text-input-text-input-filled hover:cursor-pointer"
              >
                <p className="w-50px">{translateUnit(recurringUnit)}</p>
                <FaChevronDown />
                {/* Info: (20240926 - Julian) recurring unit dropdown */}
                {recurringUnitMenu}
              </div>
            </div>
            {/* Info: (20241007 - Julian) recurring unit checkbox */}
            <div
              className={`flex items-center gap-12px overflow-x-auto ${isShowRecurringArrayHint ? inputStyle.ERROR : inputStyle.NORMAL}`}
            >
              {recurringUnitCheckboxes}
            </div>
          </div>
        </div>
        {/* Info: (20241009 - Julian) Asset */}
        {isAssetRequired && (
          <div className="col-span-2 flex flex-col">
            <AssetSection isShowAssetHint={isShowAssetHint} assets={assets} setAssets={setAssets} />
          </div>
        )}
        {/* Info: (20240926 - Julian) Reverse */}
        {isReverseRequired && (
          <div className="col-span-2 flex flex-col">
            <ReverseSection
              reverses={reverses}
              setReverses={setReverses}
              flagOfClear={flagOfClear}
              flagOfSubmit={flagOfSubmit}
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
          <VoucherLineBlock
            totalCredit={totalCredit}
            totalDebit={totalDebit}
            haveZeroLine={haveZeroLine}
            isAccountingNull={isAccountingNull}
            isVoucherLineEmpty={isVoucherLineEmpty}
            lineItems={voucherLineItems}
            setLineItems={setLineItems}
            flagOfClear={flagOfClear}
            flagOfSubmit={flagOfSubmit}
          />
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
