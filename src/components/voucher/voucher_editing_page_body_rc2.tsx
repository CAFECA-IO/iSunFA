import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { FaChevronDown } from 'react-icons/fa6';
import { BiSave } from 'react-icons/bi';
import { useHotkeys } from 'react-hotkeys-hook';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { Button } from '@/components/button/button';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import AssetSection from '@/components/voucher/asset_section';
import VoucherLineBlock from '@/components/voucher/voucher_line_block';
import { IDatePeriod } from '@/interfaces/date_period';
import { ILineItemBeta, ILineItemUI, initialVoucherLine } from '@/interfaces/line_item';
import { MessageType } from '@/interfaces/message_modal';
import { ICounterpartyOptional } from '@/interfaces/counterparty';
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
// Deprecated: (20250311 - Julian) remove eslint-disable
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import AIWorkingArea, { AIState } from '@/components/voucher/ai_working_area';
import InvoiceUploaderModal from '@/components/certificate/certificate_uploader_modal';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { IPaginatedData } from '@/interfaces/pagination';
import { getPusherInstance } from '@/lib/utils/pusher_client';
import { CERTIFICATE_EVENT, PRIVATE_CHANNEL } from '@/constants/pusher';
import { CERTIFICATE_USER_INTERACT_OPERATION } from '@/constants/invoice_rc2';
import { VoucherV2Action } from '@/constants/voucher';
import { IVoucherDetailForFrontend } from '@/interfaces/voucher';
import { IAssetPostOutput } from '@/interfaces/asset';
import { ISUNFA_ROUTE } from '@/constants/url';
import { ToastType } from '@/interfaces/toastify';
import CounterpartyInput from '@/components/voucher/counterparty_input';
import { ToastId } from '@/constants/toast_id';
import { FREE_ACCOUNT_BOOK_ID } from '@/constants/config';
import { parseNoteData } from '@/lib/utils/parser/note_with_counterparty';
import { KEYBOARD_EVENT_CODE } from '@/constants/keyboard_event_code';
import { TbArrowBackUp } from 'react-icons/tb';
import { IInvoiceRC2, IInvoiceRC2UI } from '@/interfaces/invoice_rc2';
import InvoiceSelection from '@/components/voucher/invoice_selection';
import InvoiceSelectorModal from '@/components/voucher/invoice_selector_modal';

type FocusableElement = HTMLInputElement | HTMLButtonElement | HTMLDivElement;

const VoucherEditingPageBody: React.FC<{
  voucherData: IVoucherDetailForFrontend;
  voucherNo: string | undefined;
}> = ({ voucherData, voucherNo }) => {
  const { t } = useTranslation('common');
  const router = useRouter();

  const { connectedAccountBook } = useUserCtx();
  const { temporaryAssetList, clearTemporaryAssetHandler, clearReverseListHandler } =
    useAccountingCtx();
  const { messageModalDataHandler, messageModalVisibilityHandler, toastHandler } =
    useModalContext();

  const accountBookId = connectedAccountBook?.id ?? FREE_ACCOUNT_BOOK_ID;
  const temporaryAssetListByCompany = temporaryAssetList[accountBookId] ?? [];

  // Info: (20241118 - Julian) 如果只改動 Voucher line 以外的內容(date, counterparty 等) ，用 PUT
  const {
    trigger: updateVoucher,
    success: updateSuccess,
    isLoading: isUpdating,
  } = APIHandler(APIName.VOUCHER_PUT_V2);

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
  } = APIHandler(APIName.VOUCHER_POST_V2);

  // Info: (20241118 - Julian) 將 API 回傳的資料轉換成 UI 顯示用的格式
  const {
    id: voucherId,
    voucherDate,
    type: voucherType,
    note: voucherNote,
    lineItems: voucherLineItems,
    invoiceRC2List: voucherInvoiceList,
    counterParty: voucherCounterParty,
    assets: voucherAssets,
  } = voucherData;

  const defaultDate: IDatePeriod = { startTimeStamp: voucherDate, endTimeStamp: voucherDate };
  const defaultType = EVENT_TYPE_TO_VOUCHER_TYPE_MAP[voucherType as EventType] || voucherType;

  const defaultLineItems: ILineItemUI[] = voucherLineItems.map((lineItem) => {
    return { ...lineItem, isReverse: false, reverseList: lineItem.reverseList };
  });

  const defaultInvoiceUI: IInvoiceRC2UI[] = voucherInvoiceList.map((invoice) => {
    return {
      ...invoice,
      isSelected: true,
      actions: [],
    };
  });

  const defaultAssetList: IAssetPostOutput[] = voucherAssets.map((asset) => ({
    ...asset,
    name: asset.assetName,
    number: asset.assetNumber,
    note: asset.note ?? '',
    status: 'normal',
    accountBookId: accountBookId ?? 0,
  }));

  // Info: (20250116 - Julian) 不顯示 Opening
  const typeList = Object.values(VoucherType).filter((type) => type !== VoucherType.OPENING);

  // Info: (20241118 - Julian) State
  const [date, setDate] = useState<IDatePeriod>(defaultDate);
  const [type, setType] = useState<string>(defaultType);
  const [note, setNote] = useState<{
    note: string;
    name: string | undefined;
    taxId: string | undefined;
  }>(parseNoteData(voucherNote));
  const [lineItems, setLineItems] = useState<ILineItemUI[]>(defaultLineItems);
  const [assetList, setAssetList] = useState<IAssetPostOutput[]>(defaultAssetList);

  // Info: (20241004 - Julian) 傳票列驗證條件
  // const [isTotalNotEqual, setIsTotalNotEqual] = useState<boolean>(false);
  // const [isTotalZero, setIsTotalZero] = useState<boolean>(false);
  // const [haveZeroLine, setHaveZeroLine] = useState<boolean>(false);
  // const [isAccountingNull, setIsAccountingNull] = useState<boolean>(false);
  // const [isVoucherLineEmpty, setIsVoucherLineEmpty] = useState<boolean>(false);

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
  const [counterparty, setCounterparty] = useState<ICounterpartyOptional | undefined>(
    voucherCounterParty
  );

  // Info: (20241004 - Julian) 是否顯示提示
  const [isShowDateHint, setIsShowDateHint] = useState<boolean>(false);
  const [isShowAssetHint, setIsShowAssetHint] = useState<boolean>(false);
  const [isShowReverseHint, setIsShowReverseHint] = useState<boolean>(false);

  // Info: (20241018 - Tzuhan) 選擇憑證相關 state
  const [openSelectorModal, setOpenSelectorModal] = useState<boolean>(false);
  const [openUploaderModal, setOpenUploaderModal] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = React.useState<number[]>(
    defaultInvoiceUI.map((invoice) => invoice.id)
  );

  // Info: (20241118 - Julian) 選擇憑證相關 state
  const [invoices, setInvoices] = useState<{ [id: string]: IInvoiceRC2UI }>({});
  const [bindedInvoiceUI, setBindedInvoiceUI] = useState<{ [id: string]: IInvoiceRC2UI }>(
    defaultInvoiceUI.reduce(
      (acc, invoice) => {
        acc[invoice.id] = { ...invoice };
        return acc;
      },
      {} as { [id: string]: IInvoiceRC2UI }
    )
  );
  const [selectedInvoicesUI, setSelectedInvoicesUI] = useState<IInvoiceRC2UI[]>(defaultInvoiceUI);

  const goBack = () => router.push(ISUNFA_ROUTE.BETA_VOUCHER_LIST);

  useEffect(() => {
    const storedInvoices = localStorage.getItem('selectedInvoices');
    if (storedInvoices) {
      setInvoices(JSON.parse(storedInvoices));
      localStorage.removeItem('selectedInvoices');
    }
  }, []);

  // Info: (20241119 - Julian) 更新 asset 列表
  useEffect(() => {
    if (temporaryAssetListByCompany && temporaryAssetListByCompany.length > 0) {
      const newAssetList: IAssetPostOutput[] = [
        ...defaultAssetList,
        ...temporaryAssetListByCompany,
      ];
      setAssetList(newAssetList);
    }
  }, [temporaryAssetList]);

  // Info: (20241018 - Tzuhan) 選擇憑證
  const handleSelect = useCallback(
    (ids: number[]) => {
      // Info: (20241230 - Tzuhan) 把所有 invoices 先歸零
      const updatedInvoices = Object.values(invoices).reduce(
        (acc, item) => {
          acc[item.id] = { ...item, isSelected: false };
          return acc;
        },
        {} as { [id: string]: IInvoiceRC2UI }
      );

      // Info: (20241230 - Tzuhan) 把所有 bindedInvoiceUI 也先歸零
      const updatedBinded = Object.values(bindedInvoiceUI).reduce(
        (acc, item) => {
          acc[item.id] = { ...item, isSelected: false };
          return acc;
        },
        {} as { [id: string]: IInvoiceRC2UI }
      );

      // Info: (20250312 - Julian) 更新選擇狀態：包含在 ids 中的 isSelected 為 true，不在 ids 中的為 false
      Object.keys(updatedInvoices).forEach((key) => {
        if (updatedInvoices[key]) {
          updatedInvoices[key].isSelected = ids.includes(Number(key));
        }
        if (updatedBinded[key]) {
          updatedBinded[key].isSelected = ids.includes(Number(key));
        }
      });

      // Info: (20241230 - Tzuhan) 更新狀態
      setInvoices(updatedInvoices);
      setBindedInvoiceUI(updatedBinded);

      // Info: (20241230 - Tzuhan) 合併並篩選
      const merged = { ...updatedBinded, ...updatedInvoices };
      const selectedList = Object.values(merged).filter((i) => i.isSelected);
      setSelectedInvoicesUI(selectedList);
      setSelectedIds(selectedList.map((item) => item.id));
    },
    [invoices, bindedInvoiceUI]
  );

  const handleDelete = useCallback(
    (id: number) => {
      if (invoices[id]) {
        const updatedData = {
          ...invoices,
        };
        updatedData[id] = {
          ...updatedData[id],
          isSelected: false,
        };
        setInvoices(updatedData);
      }
      if (bindedInvoiceUI[id]) {
        const updatedBindedData = {
          ...bindedInvoiceUI,
        };
        updatedBindedData[id] = {
          ...updatedBindedData[id],
          isSelected: false,
        };
        setBindedInvoiceUI(updatedBindedData);
      }
      const selectedCerts = Object.values({ ...bindedInvoiceUI, ...invoices }).filter(
        (item) => item.isSelected
      ) as IInvoiceRC2UI[];

      setSelectedInvoicesUI(selectedCerts);
    },
    [invoices]
  );

  // Info: (20241018 - Tzuhan) 開啟選擇憑證 Modal
  const handleOpenSelectorModal = useCallback(() => {
    setSelectedIds(selectedInvoicesUI.map((item) => item.id));
    setOpenSelectorModal(true);
  }, [selectedInvoicesUI]);

  // Info: (20241018 - Tzuhan) 處理選擇憑證 API 回傳
  const handleInvoiceApiResponse = useCallback(
    (resData: IPaginatedData<IInvoiceRC2[]>) => {
      const { data } = resData;
      const invoicesData = data.reduce(
        (acc, invoice) => {
          acc[invoice.id] = {
            ...invoice,
            isSelected: false,
            actions: [],
          };
          return acc;
        },
        {} as { [id: string]: IInvoiceRC2UI }
      );
      setInvoices({ ...bindedInvoiceUI, ...invoicesData });
    },
    [selectedInvoicesUI]
  );

  // Info: (20241004 - Julian) Type 下拉選單
  const {
    targetRef: typeRef,
    componentVisible: typeVisible,
    setComponentVisible: setTypeVisible,
  } = useOuterClick<HTMLDivElement>(false);

  // Info: (20241107 - Julian) ============ 熱鍵設置 ============
  const formRef = useRef<HTMLFormElement>(null);

  const handleTabPress = useCallback(
    (event: KeyboardEvent) => {
      event.preventDefault(); // Info: (20241107 - Julian) 阻止預設事件
      event.stopPropagation(); // Info: (20241120 - Julian) 防止事件冒泡

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
        (el) => el.id === 'counterparty-tax-id'
      );
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
        // } else if (currentIndex >= formIndexOrder[4] && currentIndex < formIndexOrder[5]) {
        //   if (isCounterpartyRequired && !counterparty) {
        //     setIsShowCounterHint(true);
        //   } else {
        //     ToNext();
        //   }
      } else {
        ToNext();
      }
    },
    [formRef, date, counterparty, isCounterpartyRequired, assetList]
  );

  useHotkeys('tab', handleTabPress);

  const dateRef = useRef<HTMLDivElement>(null);
  const counterpartyRef = useRef<HTMLDivElement>(null);
  const assetRef = useRef<HTMLDivElement>(null);
  const voucherLineRef = useRef<HTMLDivElement>(null);

  // Info: (20241007 - Julian) 日期未選擇時顯示提示
  useEffect(() => {
    if (date.startTimeStamp !== 0 && date.endTimeStamp !== 0) {
      setIsShowDateHint(false);
    }
  }, [date]);

  useEffect(() => {
    if (isAssetRequired && assetList.length > 0) {
      setIsShowAssetHint(false);
    }
  }, [assetList]);

  const typeToggleHandler = () => setTypeVisible(!typeVisible);

  const noteChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNote((prev) => ({ ...prev, note: e.target.value }));
  };

  // Info: (20241018 - Julian) 欄位顯示
  const isShowCounter = isCounterpartyRequired;

  // Info: (20240926 - Julian) type 字串轉換
  const translateType = (typeStr: string) => {
    const eventTypeToVoucherType = EVENT_TYPE_TO_VOUCHER_TYPE_MAP[typeStr as EventType];

    if (eventTypeToVoucherType) {
      return t(`journal:ADD_NEW_VOUCHER.TYPE_${eventTypeToVoucherType.toUpperCase()}`);
    } else {
      return t(`journal:ADD_NEW_VOUCHER.TYPE_${typeStr.toUpperCase()}`);
    }
  };

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
    clearTemporaryAssetHandler(accountBookId);
    clearReverseListHandler();
    setLineItems([initialVoucherLine, { ...initialVoucherLine, id: 1 }]);
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

    const resultDate = date.startTimeStamp;
    const resultType = VOUCHER_TYPE_TO_EVENT_TYPE_MAP[type as VoucherType];
    const resultNote = note;
    const resultCounterpartyId = counterparty?.id;
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

    const body = {
      actions,
      certificateIds: [],
      invoiceRC2Ids: selectedIds,
      voucherDate: resultDate,
      type: resultType,
      note: JSON.stringify(resultNote),
      counterPartyId: resultCounterpartyId,
      lineItems: resultLineItems,
      assetIds: resultAssetIds,
    };

    // Info: (20241119 - Julian) 如果只改動 Voucher line 以外的內容(date, counterparty 等) ，用 PUT
    const isOnlyUpdateVoucher = isLineItemsEqual(voucherLineItems, lineItems);

    if (isOnlyUpdateVoucher) {
      // Info: (20241119 - Julian) 如果只改動 Voucher line 以外的內容(date, counterparty 等) ，用 PUT
      updateVoucher({ params: { accountBookId, voucherId }, body });
    } else {
      // Info: (20241119 - Julian) 如果有改動到 Voucher line -> 先 DELETE 舊的再 POST 新的
      deleteVoucher({ params: { accountBookId, voucherId } });
      createNewVoucher({ params: { accountBookId }, body });
    }
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
    }
    // else if (
    //   isTotalZero || // Info: (20241004 - Julian) 借貸總金額不可為 0
    //   isTotalNotEqual || // Info: (20241004 - Julian) 借貸金額需相等
    //   haveZeroLine || // Info: (20241004 - Julian) 沒有未填的數字的傳票列
    //   isAccountingNull || // Info: (20241004 - Julian) 沒有未選擇的會計科目
    //   isVoucherLineEmpty // Info: (20241004 - Julian) 沒有傳票列
    // ) {
    //   setFlagOfSubmit(!flagOfSubmit);
    //   if (voucherLineRef.current) voucherLineRef.current.scrollIntoView();
    //   toastHandler({
    //     id: ToastId.FILL_UP_VOUCHER_FORM,
    //     type: ToastType.ERROR,
    //     content: (
    //       <>
    //         {t('journal:ADD_NEW_VOUCHER.LINE_ITEM_1')}
    //         <br />
    //         {t('journal:ADD_NEW_VOUCHER.LINE_ITEM_2')}
    //         <br />
    //         {t('journal:ADD_NEW_VOUCHER.LINE_ITEM_3')}
    //       </>
    //     ),
    //     closeable: true,
    //   });
    // }
    else if (isAssetRequired && assetList.length === 0) {
      // Info: (20241007 - Julian) 如果需填入資產，但資產為空，則顯示資產提示，並定位到資產欄位、吐司通知
      setIsShowAssetHint(true);
      toastHandler({
        id: ToastId.FILL_UP_VOUCHER_FORM,
        type: ToastType.ERROR,
        content: `${t('journal:ASSET_SECTION.EMPTY_HINT')}`,
        closeable: true,
      });
      if (assetRef.current) assetRef.current.scrollIntoView();
    } else if (isReverseRequired /* && reverses.length === 0 */) {
      // Info: (20241011 - Julian) 如果需填入沖銷傳票，但沖銷傳票為空，則顯示沖銷提示，並定位到沖銷欄位、吐司通知
      setIsShowReverseHint(true);
      toastHandler({
        id: ToastId.FILL_UP_VOUCHER_FORM,
        type: ToastType.ERROR,
        content: `${t('journal:VOUCHER_LINE_BLOCK.REVERSE_HINT')}`,
        closeable: true,
      });
    } else {
      // Info: (20241007 - Julian) 儲存傳票
      saveVoucher();

      // Info: (20241007 - Julian) 重設提示
      setIsShowDateHint(false);
      setIsShowAssetHint(false);
      setIsShowReverseHint(false);
      setFlagOfSubmit(!flagOfSubmit);
    }
  };

  // Info: (20241119 - Julian) PUT 的成功與失敗處理
  useEffect(() => {
    if (isUpdating === false) {
      if (updateSuccess) {
        router.push(`/users/accounting/${voucherId}?voucherNo=${voucherNo}`);
      } else {
        toastHandler({
          id: ToastId.UPDATE_VOUCHER_ERROR,
          type: ToastType.ERROR,
          content: t('journal:ADD_NEW_VOUCHER.TOAST_FAILED_TO_UPDATE'),
          closeable: true,
        });
      }
    }
  }, [updateSuccess, isUpdating]);

  // Info: (20241119 - Julian) DELETE && POST 的成功與失敗處理
  useEffect(() => {
    if (isDeleting === false && isCreating === false) {
      if (deleteSuccess && createNewSuccess) {
        router.push(ISUNFA_ROUTE.VOUCHER_LIST);
      } else {
        toastHandler({
          id: ToastId.DELETE_VOUCHER_ERROR,
          type: ToastType.ERROR,
          content: t('journal:ADD_NEW_VOUCHER.TOAST_FAILED_TO_UPDATE'),
          closeable: true,
        });
      }
    }
  }, [deleteSuccess, isDeleting, createNewSuccess, isCreating]);

  const typeDropdownMenu = typeVisible ? (
    <div className="absolute left-0 top-50px flex w-full flex-col rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px text-dropdown-text-primary shadow-dropmenu">
      {typeList.map((v) => {
        const typeClickHandler = () => {
          setType(v);
          setTypeVisible(false);
        };

        return (
          <button
            key={v}
            id={`type-${v}`}
            type="button"
            className="px-12px py-8px text-left hover:bg-dropdown-surface-item-hover"
            onClick={typeClickHandler}
          >
            {translateType(v)}
          </button>
        );
      })}
    </div>
  ) : null;

  const invoiceCreatedHandler = useCallback(
    (data: { message: string }) => {
      const newInvoice: IInvoiceRC2 = JSON.parse(data.message);
      const newInvoicesUI: { [id: string]: IInvoiceRC2UI } = {
        [newInvoice.id]: {
          ...newInvoice,
          isSelected: true, // Info: (20250312 - Julian) 新增的發票預設為選取
          actions: !newInvoice.voucherNo
            ? [
                CERTIFICATE_USER_INTERACT_OPERATION.DOWNLOAD,
                CERTIFICATE_USER_INTERACT_OPERATION.REMOVE,
              ]
            : [CERTIFICATE_USER_INTERACT_OPERATION.DOWNLOAD],
        },
      };

      setInvoices((prev) => {
        Object.values(prev).forEach((invoice) => {
          newInvoicesUI[invoice.id] = {
            ...invoice,
            isSelected: newInvoicesUI[invoice.id]?.isSelected ?? invoice.isSelected,
          };
        });
        return newInvoicesUI;
      });
    },
    [invoices]
  );

  const handleCounterpartySelect = (counterpartyPartial: ICounterpartyOptional) => {
    setCounterparty(counterpartyPartial);
    setNote((prev) => ({
      ...prev,
      name: counterpartyPartial.name,
      taxId: counterpartyPartial.taxId,
    }));
  };

  // Info: (20241022 - tzuhan) @Murky, 這裡是前端訂閱 PUSHER (CERTIFICATE_EVENT.CREATE) 的地方，當生成新的 invoice 要新增到列表中
  useEffect(() => {
    const pusher = getPusherInstance();
    const channel = pusher.subscribe(`${PRIVATE_CHANNEL.CERTIFICATE}-${connectedAccountBook?.id}`);

    channel.bind(CERTIFICATE_EVENT.CREATE, invoiceCreatedHandler);

    return () => {
      channel.unbind(CERTIFICATE_EVENT.CREATE, invoiceCreatedHandler);
      channel.unsubscribe();
      pusher.unsubscribe(`${PRIVATE_CHANNEL.CERTIFICATE}-${connectedAccountBook?.id}`);
    };
  }, []);

  return (
    <div className="relative flex flex-col items-center gap-40px">
      {/* Info: (20250526 - Julian) Mobile back button */}
      <div className="flex w-full items-center gap-lv-2 tablet:hidden">
        <Button variant="secondaryBorderless" size="defaultSquare" onClick={goBack}>
          <TbArrowBackUp size={24} />
        </Button>
        <p className="text-base font-semibold text-text-neutral-secondary">
          {t('journal:EDIT_VOUCHER.PAGE_TITLE')}
        </p>
      </div>

      <InvoiceSelectorModal
        accountBookId={accountBookId}
        isOpen={openSelectorModal}
        onClose={() => setOpenSelectorModal(false)}
        // openUploaderModal={() => setOpenUploaderModal(true)}
        handleSelect={handleSelect}
        handleApiResponse={handleInvoiceApiResponse}
        invoices={Object.values(invoices)}
        selectedIds={selectedIds}
        setSelectedIds={setSelectedIds}
      />
      <InvoiceUploaderModal
        isOpen={openUploaderModal}
        onClose={() => setOpenUploaderModal(false)}
      />
      {/* ToDo: (20240926 - Julian) Uploaded invoices */}
      <InvoiceSelection
        selectedInvoices={selectedInvoicesUI}
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
            period={date}
            setFilteredPeriod={setDate}
            btnClassName={isShowDateHint ? inputStyle.ERROR : ''}
          />
        </div>
        {/* Info: (20240926 - Julian) Type */}
        <div ref={typeRef} className="flex flex-col gap-8px">
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
            <p className={'text-base text-input-text-input-filled'}>{translateType(type)}</p>
            <div className={typeVisible ? 'rotate-180' : 'rotate-0'}>
              <FaChevronDown size={20} />
            </div>
            {/* Info: (20240926 - Julian) Type dropdown */}
            {typeDropdownMenu}
          </button>
        </div>

        {/* Info: (20240926 - Julian) Note */}
        <div className="flex flex-col gap-8px tablet:col-span-2">
          <p className="font-bold text-input-text-primary">{t('journal:ADD_NEW_VOUCHER.NOTE')}</p>
          <input
            id="voucher-note"
            type="text"
            value={note.note}
            onChange={noteChangeHandler}
            placeholder={t('journal:ADD_NEW_VOUCHER.NOTE')}
            className={
              'rounded-sm border border-input-stroke-input px-12px py-10px placeholder:text-input-text-input-placeholder'
            }
          />
        </div>
        {/* Info: (20240926 - Julian) Counterparty */}
        {isShowCounter && (
          <div ref={counterpartyRef} className="tablet:col-span-2">
            <CounterpartyInput
              counterparty={counterparty}
              onSelect={handleCounterpartySelect}
              isShowRedHint={isCounterpartyRequired && !counterparty}
            />
          </div>
        )}
        {/* Info: (20241009 - Julian) Asset */}
        {isAssetRequired && (
          <div ref={assetRef} className="flex flex-col tablet:col-span-2">
            <AssetSection
              isShowAssetHint={isShowAssetHint}
              lineItems={lineItems}
              defaultAssetList={voucherAssets}
            />
          </div>
        )}
        {/* Info: (20240926 - Julian) Voucher line block */}
        <>
          {isShowReverseHint ? (
            <p className="text-text-state-error">{t('journal:VOUCHER_LINE_BLOCK.REVERSE_HINT')}</p>
          ) : null}
          <div ref={voucherLineRef} className="overflow-x-auto tablet:col-span-2">
            <VoucherLineBlock
              lineItems={lineItems}
              setLineItems={setLineItems}
              flagOfClear={flagOfClear}
              flagOfSubmit={flagOfSubmit}
              isShowReverseHint={isShowReverseHint}
              // setIsTotalZero={setIsTotalZero}
              // setIsTotalNotEqual={setIsTotalNotEqual}
              // setHaveZeroLine={setHaveZeroLine}
              // setIsAccountingNull={setIsAccountingNull}
              // setIsVoucherLineEmpty={setIsVoucherLineEmpty}
              setIsCounterpartyRequired={setIsCounterpartyRequired}
              errorMessages={[]}
              setIsAssetRequired={setIsAssetRequired}
              setErrorMessages={() => {}} // ToDo: (20251125 - Julian)
            />
          </div>
        </>
        {/* Info: (20240926 - Julian) buttons */}
        <div className="flex items-center justify-end gap-12px tablet:col-span-2">
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
            disabled={isUpdating || isDeleting || isCreating} // Info: (20241119 - Julian) 防止重複送出
            className="w-full tablet:w-auto"
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
