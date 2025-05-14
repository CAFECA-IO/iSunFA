import Image from 'next/image';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { FaChevronDown } from 'react-icons/fa6';
import useOuterClick from '@/lib/hooks/use_outer_click';
import NumericInput from '@/components/numeric_input/numeric_input';
import { Button } from '@/components/button/button';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import { IDatePeriod } from '@/interfaces/date_period';
import { useModalContext } from '@/contexts/modal_context';
import { IoCloseOutline, IoArrowBackOutline, IoArrowForward } from 'react-icons/io5';
import { LuTrash2 } from 'react-icons/lu';
import { CurrencyType } from '@/constants/currency';
import CounterpartyInput, {
  CounterpartyInputRef,
} from '@/components/certificate/counterparty_input';
import ImageZoom from '@/components/image_zoom/image_zoom';
import EInvoicePreview from '@/components/invoice/e_invoice_preview';
import dayjs from 'dayjs';
import html2canvas from 'html2canvas';
import APIHandler from '@/lib/utils/api_handler';
import { IAccountingSetting } from '@/interfaces/accounting_setting';
import { APIName } from '@/constants/api_connection';
import TaxMenu from '@/components/invoice/invoice_tax_menu';
import { IPaginatedData } from '@/interfaces/pagination';
import { HiCheck } from 'react-icons/hi';
import { getInvoiceTracksByDate } from '@/lib/utils/invoice_track';
import { IInvoiceRC2Output, IInvoiceRC2OutputUI } from '@/interfaces/invoice_rc2';
import { InvoiceDirection, InvoiceType } from '@/constants/invoice_rc2';
import { ICounterparty, ICounterpartyOptional } from '@/interfaces/counterparty';

interface OutputInvoiceEditModalProps {
  isOpen: boolean;
  accountBookId: number;
  toggleModel: () => void; // Info: (20240924 - Anna) 關閉模態框的回調函數
  currencyAlias: CurrencyType;
  certificate?: IInvoiceRC2OutputUI;
  onUpdateFilename: (certificateId: number, name: string) => void;
  onSave: (data: Partial<IInvoiceRC2Output>) => Promise<void>; // Info: (20240924 - Anna) 保存數據的回調函數
  onDelete: (id: number) => void;
  certificates: IInvoiceRC2OutputUI[]; // Info: (20250415 - Anna) 傳入目前這頁的所有憑證清單（為了做前後筆切換）
  editingId: number; // Info: (20250415 - Anna) 傳入正在編輯的這筆 ID
  setEditingId: (id: number) => void; // Info: (20250415 - Anna) 前後筆切換時用
}

const OutputInvoiceEditModal: React.FC<OutputInvoiceEditModalProps> = ({
  isOpen,
  accountBookId,
  toggleModel,
  currencyAlias,
  certificate,
  onSave,
  onDelete,
  certificates,
  editingId,
  setEditingId,
}) => {
  const selectableInvoiceType: InvoiceType[] = [
    InvoiceType.OUTPUT_30,
    InvoiceType.OUTPUT_31,
    InvoiceType.OUTPUT_32,
    InvoiceType.OUTPUT_33,
    InvoiceType.OUTPUT_34,
    InvoiceType.OUTPUT_35,
    InvoiceType.OUTPUT_36,
  ];
  const counterpartyInputRef = useRef<CounterpartyInputRef>(null);
  const { t } = useTranslation(['certificate', 'common', 'filter_section_type']);

  // Info: (20250430 - Anna) 用 ref 包住 preview 區塊
  const certificateRef = useRef<HTMLDivElement>(null);
  const [eInvoiceImageUrl, setEInvoiceImageUrl] = useState<string | null>(null);

  // Info: (20250414 - Anna) 記錄上一次成功儲存的 invoice，用來做 shallowEqual 比對
  const savedInvoiceRC2Ref = useRef<Partial<IInvoiceRC2Output>>(certificate ?? {});

  const { trigger: getAccountSetting } = APIHandler<IAccountingSetting>(
    APIName.ACCOUNTING_SETTING_GET
  );
  const { trigger: getCounterpartyList } = APIHandler<IPaginatedData<ICounterparty[]>>(
    APIName.COUNTERPARTY_LIST
  );
  const [counterpartyList, setCounterpartyList] = useState<ICounterparty[]>([]);
  // Info: (20240924 - Anna) 不顯示模態框時返回 null
  if (!isOpen || !certificate) return null;
  const [date, setDate] = useState<IDatePeriod>({
    startTimeStamp: certificate.issuedDate ?? 0,
    endTimeStamp: 0,
  });
  const { isMessageModalVisible } = useModalContext();
  const [formState, setFormState] = useState(
    () =>
      ({
        // Info: (20250414 - Anna) 這個組件改為全為銷項
        direction: InvoiceDirection.OUTPUT,
        date: certificate.issuedDate,
        no: certificate.no,
        netAmount: certificate.netAmount,
        taxRate: certificate.taxRate,
        taxAmount: certificate.taxAmount,
        totalAmount: certificate.totalAmount,
        buyerIdNumber: certificate.buyerIdNumber,
        buyerName: certificate.buyerName,
        type: certificate.type ?? InvoiceType.INPUT_21,
      }) as Partial<IInvoiceRC2Output>
  );
  const [errors] = useState<Record<string, string>>({});
  const [isReturnOrAllowance, setIsReturnOrAllowance] = useState(false);

  const formStateRef = useRef(formState);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Info: (20250416 - Anna) 不用formState，改用 formStateRef.current（由 handleInputChange 寫入，總是最新值），避免 useState 非同步更新問題
    const { issuedDate: selectedDate, netAmount, taxAmount, buyerName } = formStateRef.current;

    if (!selectedDate || selectedDate <= 0) {
      newErrors.date = t('certificate:ERROR.PLEASE_FILL_UP_THIS_FORM'); // Info: (20250106 - Anna) 備用 t('certificate:ERROR.REQUIRED_DATE');
    }
    if (!netAmount || netAmount <= 0) {
      newErrors.netAmount = t('certificate:ERROR.PLEASE_FILL_UP_THIS_FORM'); // Info: (20250106 - Anna) 備用 t('certificate:ERROR.REQUIRED_PRICE');
    }
    if (!taxAmount || taxAmount <= 0) {
      newErrors.taxAmount = t('certificate:ERROR.PLEASE_FILL_UP_THIS_FORM'); // Info: (20250106 - Anna) 備用 t('certificate:ERROR.REQUIRED_TOTAL');
    }
    if (!buyerName) {
      newErrors.counterParty = t('certificate:ERROR.REQUIRED_COUNTERPARTY_NAME'); // Info: (20250106 - Anna) 備用 t('certificate:ERROR.REQUIRED_COUNTERPARTY');
    }

    return Object.keys(newErrors).length === 0;
  };

  // Info: (20250414 - Anna) 用來記錄 setTimeout 的任務 ID，供 debounce 清除使用
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const handleInputChange = useCallback(
    (
      field: keyof typeof formState,
      value:
        | string
        | number
        | InvoiceDirection
        | ICounterpartyOptional
        | InvoiceType
        | boolean
        | null
    ) => {
      // Info: (20250416 - Anna) 每次輸入都重置 debounce timer
      if (debounceTimer.current) clearTimeout(debounceTimer.current);

      setFormState((prev) => {
        const updated = { ...prev, [field]: value };
        formStateRef.current = updated; // Info: (20250416 - Anna) 同步更新 Ref
        return updated;
      });
    },
    []
  );

  const getSettingTaxRatio = useCallback(async () => {
    const { success, data } = await getAccountSetting({
      params: { accountBookId },
    });
    if (success && data) {
      if (formState.taxRate === undefined) {
        // Info: (20250414 - Anna) 因為 inputOrOutput 永遠是 OUTPUT，所以不需再判斷 if (formState.inputOrOutput === OUTPUT)
        handleInputChange('taxRate', data.taxSettings.salesTax.rate * 100);
      }
    }
  }, [accountBookId, formState.taxRate]);

  const listCounterparty = useCallback(async () => {
    const { success, data } = await getCounterpartyList({
      params: { accountBookId },
    });
    if (success) {
      setCounterpartyList(data?.data ?? []);
    }
  }, [accountBookId]);

  const {
    targetRef: invoiceTypeMenuRef,
    componentVisible: isInvoiceTypeMenuOpen,
    setComponentVisible: setIsInvoiceTypeMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  // Info: (20250415 - Anna) 建立發票前綴選單的狀態和 Ref
  const {
    targetRef: invoicePrefixMenuRef,
    componentVisible: isInvoicePrefixMenuOpen,
    setComponentVisible: setIsInvoicePrefixMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const invoiceTypeMenuClickHandler = () => {
    setIsInvoiceTypeMenuOpen(!isInvoiceTypeMenuOpen);
  };

  // Info: (20250415 - Anna) 點擊切換發票前綴下拉狀態;
  const invoicePrefixMenuClickHandler = () => {
    setIsInvoicePrefixMenuOpen(!isInvoicePrefixMenuOpen);
  };

  const invoiceTypeMenuOptionClickHandler = (id: InvoiceType) => {
    setIsInvoiceTypeMenuOpen(false);
    handleInputChange('type', id);
    // Info: (20250414 - Anna) 如果用戶手動切換下拉選單，重設折讓勾選
    setIsReturnOrAllowance(false);
  };

  // Info: (20250415 - Anna) 點選發票前綴的選項
  const invoicePrefixOptionClickHandler = (prefix: string) => {
    const latestNo = formStateRef.current.no ?? '';
    const suffix = latestNo.substring(2);
    handleInputChange('no', `${prefix}${suffix}`);
    setIsInvoicePrefixMenuOpen(false);
  };

  const netAmountChangeHandler = (value: number) => {
    handleInputChange('netAmount', value);
    const updateTaxPrice = Math.round((value * (formState.taxRate ?? 0)) / 100);
    handleInputChange('taxAmount', updateTaxPrice);
    handleInputChange('totalAmount', value + updateTaxPrice);
  };

  const selectTaxHandler = (value: number | null) => {
    handleInputChange('taxRate', value);
    const updateTaxPrice = Math.round(((formState.netAmount ?? 0) * (value ?? 0)) / 100);
    handleInputChange('taxAmount', updateTaxPrice);
    handleInputChange('totalAmount', (formState.netAmount ?? 0) + updateTaxPrice);
  };

  const totalAmountChangeHandler = (value: number) => {
    handleInputChange('totalAmount', value);
    const ratio = (100 + (formState.taxRate ?? 0)) / 100;
    const updatePriceBeforeTax = Math.round(value / ratio);
    handleInputChange('netAmount', updatePriceBeforeTax);
    const updateTaxPrice = value - updatePriceBeforeTax;
    handleInputChange('taxAmount', updateTaxPrice);
  };

  // Info: (20241206 - Julian) currency alias setting
  const currencyAliasImageSrc = `/currencies/${(certificate.currencyCode || currencyAlias).toLowerCase()}.svg`;
  const currencyAliasImageAlt = `currency-${(certificate.currencyCode || currencyAlias).toLowerCase()}-icon`;
  const currencyAliasStr = t(
    `common:CURRENCY_ALIAS.${(certificate.currencyCode || currencyAlias).toUpperCase()}`
  );

  // Info: (20250416 - Anna) 發票字軌選單
  const invoiceDate = formState.issuedDate ?? 0; // Info: (20250416 - Anna) 用 formState.date 即時對應變動
  const invoiceTracks = getInvoiceTracksByDate(new Date(invoiceDate * 1000)); // Info: (20250416 - Anna) 秒轉毫秒
  const InvoiceNumberPrefix = [
    ...invoiceTracks.A,
    ...invoiceTracks.B,
    ...invoiceTracks.C,
    ...invoiceTracks.D,
  ];

  // Info: (20250414 - Anna) 處理保存
  // Info: (20250414 - Anna) 檢查兩個表單物件是否淺層相等（不比較巢狀物件，特別處理 counterParty）
  const shallowEqual = (obj1: Record<string, unknown>, obj2: Record<string, unknown>): boolean => {
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) return false;

    return !keys1.some((key) => {
      const val1 = obj1[key];
      const val2 = obj2[key];

      if (key === 'counterParty') {
        const cp1 = val1 as ICounterpartyOptional;
        const cp2 = val2 as ICounterpartyOptional;
        return cp1?.name !== cp2?.name || cp1?.taxId !== cp2?.taxId;
      }

      return val1 !== val2;
    });
  };
  const handleSave = useCallback(async () => {
    if (!validateForm()) return;
    const { isSelected, actions, ...rest } = certificate;

    const updatedCertificate = {
      ...rest,
      ...formStateRef.current,
    };

    // Info: (20250414 - Anna) 如果資料完全沒變，就不打 API
    if (shallowEqual(savedInvoiceRC2Ref.current, updatedCertificate)) return;

    const updatedData: Partial<IInvoiceRC2Output> = {
      ...certificate,
      ...updatedCertificate,
    };
    await onSave(updatedData);

    // Info: (20250414 - Anna) 更新最新儲存成功的內容
    savedInvoiceRC2Ref.current = updatedCertificate;
  }, [certificate, onSave]);

  // Info: (20250415 - Anna) 在 modal 裡找出正在編輯的 index 並判斷能否切換
  const currentIndex = certificates.findIndex((c) => c.id === editingId);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < certificates.length - 1;

  // Info: (20250414 - Anna) 初始化 formStateRef，避免剛打開 modal 時 formStateRef.current 是 undefined，導致比對失效，無法觸發 handleSave()
  useEffect(() => {
    formStateRef.current = formState;
  }, []);

  // Info: (20250414 - Anna) 初始化 savedInvoiceRC2Ref，代表「目前已儲存的版本（上次存成功的資料）」，每次打開 modal 都會更新，用來與最新內容做 shallowEqual 比較
  useEffect(() => {
    // Info: (20250414 - Anna) 確保 savedInvoiceRC2Ref.current 被正確初始化為 certificate.invoice
    if (certificate) {
      savedInvoiceRC2Ref.current = certificate;
    }
  }, [certificate]);

  // Info: (20250414 - Anna) 用戶輸入新內容都同步放入formStateRef.current，用來和前面兩種舊資料內容比較
  useEffect(() => {
    formStateRef.current = formState;
  }, [formState]);

  useEffect(() => {
    getSettingTaxRatio();
    listCounterparty();
  }, []);

  // Info: (20250414 - Anna) 當使用者修改任何欄位，停止輸入超過 1 秒且資料有變動，就自動觸發儲存 API
  useEffect(() => {
    // Info: (20250414 - Anna) 取消上一次的 debounce 任務（如果還沒執行），避免重複打 API
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      const isSame = shallowEqual(formStateRef.current, savedInvoiceRC2Ref.current);
      const isValid = validateForm();

      if (!isSame && isValid) {
        handleSave();
      }
    }, 1000); // Info: (20250414 - Anna) 停止輸入 1 秒才觸發
  }, [formState]);

  // Info: (20250415 - Anna) certificate 或 editingId 變動時，重新初始化表單狀態、formRef、savedInvoiceRC2Ref、日期 等，為了做前後筆切換
  useEffect(() => {
    if (!certificate) return;

    const newFormState: Partial<IInvoiceRC2Output> = {
      direction: InvoiceDirection.OUTPUT,
      issuedDate: certificate.issuedDate,
      no: certificate.no,
      netAmount: certificate.netAmount,
      taxRate: certificate.taxRate,
      taxAmount: certificate.taxAmount,
      totalAmount: certificate.totalAmount,
      buyerIdNumber: certificate.buyerIdNumber,
      buyerName: certificate.buyerName,
      isReturnOrAllowance: certificate.isReturnOrAllowance,
      type: certificate.type ?? InvoiceType.OUTPUT_31,
      otherCertificateNo: certificate.otherCertificateNo,
      totalOfSummarizedInvoices: certificate.totalOfSummarizedInvoices,
    };

    setFormState(newFormState);
    formStateRef.current = newFormState;
    savedInvoiceRC2Ref.current = newFormState;

    // Info: (20250509 - Tzuhan) 同步更新日期 UI
    if (certificate.issuedDate) {
      setDate({
        startTimeStamp: certificate.issuedDate,
        endTimeStamp: certificate.issuedDate + 86399,
      });
    }
  }, [certificate, editingId]);

  useEffect(() => {
    if (!certificateRef.current) return;

    html2canvas(certificateRef.current).then((canvas) => {
      const dataUrl = canvas.toDataURL('image/png');
      setEInvoiceImageUrl(dataUrl); // Info: (20250430 - Anna) 給 <ImageZoom /> 用
    });
  }, [formState]);

  // Info: (20250512 - Anna) Debug
  useEffect(() => {
    if (isOpen && certificate) {
      // Deprecated: (20250512 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Modal initialized with certificate:', certificate);
    }
  }, [isOpen, certificate]);

  return (
    <div
      className={`fixed inset-0 z-120 flex items-center justify-center ${isMessageModalVisible ? '' : 'bg-black/50'}`}
    >
      <form
        className={`relative flex max-h-900px w-90vw max-w-95vw flex-col gap-4 overflow-y-hidden rounded-sm bg-surface-neutral-surface-lv2 px-8 py-4 md:max-h-96vh md:max-w-1000px`}
        onSubmit={(e) => e.preventDefault()} // Info: (20250414 - Anna) 防止表單預設行為
      >
        {/* Info: (20240924 - Anna) 關閉按鈕 */}
        <button
          type="button"
          className="absolute right-4 top-4 text-checkbox-text-primary"
          onClick={toggleModel}
        >
          <IoCloseOutline size={32} />
        </button>

        <div>
          <p className="flex justify-center text-xl font-bold leading-8 text-neutral-600">
            {t(`certificate:EDIT.OUTPUT_INVOICE`)}
          </p>
          <p className="flex justify-center text-xs font-normal leading-5 tracking-wide text-neutral-400">
            {t(`certificate:EDIT.HEADER`)}
          </p>
        </div>

        {/* Info: (20241210 - Anna) 隱藏 scrollbar */}
        <div className="hide-scrollbar flex w-full items-start justify-between gap-5 overflow-y-scroll md:h-600px md:flex-row">
          {/* Info: (20240924 - Anna) 發票縮略圖 */}

          {/*  Info: (20250430 - Anna) e-invoice UI (格式35的時候套用) */}
          {/*  Todo: (20250430 - Anna) 要再加一個條件[ isGenerated 為 true ] */}
          {formState.type === InvoiceType.OUTPUT_35 && (
            <div className="h-0 w-0 overflow-hidden">
              <EInvoicePreview
                ref={certificateRef}
                certificateType={InvoiceType.OUTPUT_35}
                issuedDate={dayjs
                  .unix(formState.issuedDate ?? certificate.issuedDate ?? 0)
                  .format('YYYY-MM-DD')}
                invoiceNo={formState.no ?? certificate.no ?? ''}
                taxId={formState.buyerIdNumber ?? certificate.buyerIdNumber ?? undefined}
                netAmount={formState.netAmount ?? certificate.netAmount ?? 0}
                taxAmount={formState.taxAmount ?? certificate.taxAmount ?? 0}
                totalAmount={formState.totalAmount ?? certificate.totalAmount ?? 0}
              />
            </div>
          )}

          {(certificate.file?.url || eInvoiceImageUrl) && (
            <ImageZoom
              imageUrl={
                certificate.isGenerated && eInvoiceImageUrl
                  ? eInvoiceImageUrl
                  : certificate.file.url
              }
              className="max-h-630px min-h-450px w-440px"
              controlPosition="bottom-right"
            />
          )}
          {/* Info: (20240924 - Anna) 編輯表單 */}
          {/* Info: (20241210 - Anna) 隱藏 scrollbar */}
          <div className="hide-scrollbar flex h-600px w-full flex-col items-start space-y-4 overflow-y-scroll pb-80px">
            {/* Info: (20240924 - Anna) Invoice Type */}
            <div className="flex w-full flex-col items-start gap-2">
              <p className="text-sm font-semibold text-neutral-300">
                {t('certificate:EDIT.INVOICE_TYPE')}
                <span className="text-text-state-error">*</span>
              </p>
              <div className="flex w-full items-center gap-4">
                <div className="flex w-full">
                  <div
                    ref={invoiceTypeMenuRef}
                    id="invoice-type-menu"
                    onClick={invoiceTypeMenuClickHandler}
                    className={`group relative flex h-46px w-full cursor-pointer ${isInvoiceTypeMenuOpen ? 'border-input-stroke-selected text-dropdown-stroke-input-hover' : 'border-input-stroke-input text-input-text-input-filled'} items-center justify-between rounded-sm border bg-input-surface-input-background p-10px hover:border-input-stroke-selected hover:text-dropdown-stroke-input-hover`}
                  >
                    <p className="flex h-46px w-full items-center justify-between">
                      <span className="h-24px overflow-hidden">
                        {t(`filter_section_type:FILTER_SECTION_TYPE.${formState.type}`)}
                      </span>
                      <div className="flex h-20px w-20px items-center justify-center">
                        <FaChevronDown
                          className={isInvoiceTypeMenuOpen ? 'rotate-180' : 'rotate-0'}
                        />
                      </div>
                    </p>
                    <div
                      className={`absolute left-0 top-50px grid w-full grid-cols-1 shadow-dropmenu ${isInvoiceTypeMenuOpen ? 'grid-rows-1 border-dropdown-stroke-menu' : 'grid-rows-0 border-transparent'} overflow-hidden rounded-sm border transition-all duration-300 ease-in-out`}
                    >
                      <ul className="z-130 flex max-h-210px w-full flex-col items-start overflow-y-auto bg-dropdown-surface-menu-background-primary p-8px">
                        {Object.values(selectableInvoiceType).map((value) => (
                          <li
                            key={`taxable-${value}`}
                            value={value}
                            className="w-full cursor-pointer px-3 py-2 text-dropdown-text-primary hover:text-dropdown-stroke-input-hover"
                            onClick={invoiceTypeMenuOptionClickHandler.bind(null, value)}
                          >
                            {t(`filter_section_type:FILTER_SECTION_TYPE.${value}`)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Info: (20240924 - Anna) Invoice Date */}
            <div className="flex w-full flex-col items-start gap-2">
              <p className="text-sm font-semibold text-neutral-300">
                {t('certificate:EDIT.DATE')}
                <span className="text-text-state-error">*</span>
              </p>
              <DatePicker
                period={date}
                setFilteredPeriod={setDate}
                type={DatePickerType.TEXT_DATE}
                datePickerClassName="z-120"
                datePickerHandler={(start: number) => handleInputChange('issuedDate', start)}
              />
              {errors.date && (
                <p className="-translate-y-1 self-start text-sm text-text-state-error">
                  {errors.date}
                </p>
              )}
            </div>

            {/* Info: (20240924 - Anna) Invoice Number */}
            <div className="relative flex w-full flex-col items-start gap-2">
              <div id="price" className="absolute -top-20"></div>
              <p className="text-sm font-semibold text-neutral-300">
                {formState.type === InvoiceType.OUTPUT_36
                  ? t('certificate:EDIT.OTHER_CERTIFICATE_NO')
                  : t('certificate:EDIT.INVOICE_NUMBER')}
                <span className="text-text-state-error">*</span>
              </p>

              {formState.type === InvoiceType.OUTPUT_36 ? (
                // Info: (20250415 - Anna) 免用統一發票的UI
                <div className="flex w-full items-center">
                  <input
                    id="invoiceno"
                    type="text"
                    value={formState.no}
                    onChange={(e) => handleInputChange('no', e.target.value)}
                    className="h-46px flex-1 rounded-sm border border-input-stroke-input bg-input-surface-input-background p-10px outline-none"
                    placeholder="AB-12345678"
                  />
                </div>
              ) : (
                // Info: (20250415 - Anna) 其他憑證類型的UI
                <div className="flex w-full items-center">
                  {/* Info: (20250415 - Anna) 輸入發票前綴，如果改為不用下拉選單，可以解開這個 */}
                  {/* <input
                    id="invoice-prefix"
                    type="text"
                    maxLength={2}
                    value={formState.no?.substring(0, 2) ?? ''}
                    onChange={(e) => {
                      const latestNo = formStateRef.current.no ?? '';
                      const suffix = latestNo.substring(2);
                      handleInputChange('no', `${e.target.value.toUpperCase()}${suffix}`);
                    }}
                    className="h-44px w-16 rounded-l-sm border border-input-stroke-input bg-input-surface-input-background p-16px text-center uppercase outline-none"
                    placeholder="AB"
                  /> */}

                  {/* Info: (20250415 - Anna) 「選擇」發票前綴 */}
                  <div
                    ref={invoicePrefixMenuRef}
                    onClick={invoicePrefixMenuClickHandler}
                    className={`relative h-44px min-w-75px cursor-pointer ${isInvoicePrefixMenuOpen ? 'border-input-stroke-selected text-dropdown-stroke-input-hover' : 'border-input-stroke-input text-input-text-input-filled'} flex items-center justify-between rounded-l-sm border bg-input-surface-input-background p-16px hover:border-input-stroke-selected hover:text-dropdown-stroke-input-hover`}
                  >
                    <p className="flex h-44px w-full items-center justify-between gap-x-2">
                      <span className="overflow-hidden">{formState.no?.substring(0, 2) ?? ''}</span>
                      <div className="flex h-6px w-12px items-center justify-center">
                        <FaChevronDown
                          className={isInvoicePrefixMenuOpen ? 'rotate-180' : 'rotate-0'}
                        />
                      </div>
                    </p>

                    <div
                      className={`absolute left-0 top-44px grid w-full grid-cols-1 shadow-dropmenu ${isInvoicePrefixMenuOpen ? 'grid-rows-1 border-dropdown-stroke-menu' : 'grid-rows-0 border-transparent'} overflow-hidden rounded-sm border transition-all duration-300 ease-in-out`}
                    >
                      <ul className="z-130 flex max-h-130px w-full flex-col items-start overflow-y-auto bg-dropdown-surface-menu-background-primary p-8px">
                        {InvoiceNumberPrefix.map((prefix) => (
                          <li
                            key={prefix}
                            className="w-full cursor-pointer px-3 py-2 text-dropdown-text-primary hover:text-dropdown-stroke-input-hover"
                            onClick={() => invoicePrefixOptionClickHandler(prefix)}
                          >
                            {prefix}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <input
                    id="invoice-number"
                    type="text"
                    maxLength={8}
                    value={formState.no?.substring(2) ?? ''}
                    onChange={(e) => {
                      const latestNo = formStateRef.current.no ?? '';
                      const prefix = latestNo.substring(0, 2);
                      handleInputChange('no', `${prefix}${e.target.value}`);
                    }}
                    className="h-44px flex-1 rounded-r-sm border border-input-stroke-input bg-input-surface-input-background p-16px outline-none"
                    placeholder="12345678"
                  />
                </div>
              )}
            </div>

            {/* Info: (20250414 - Anna) Tax Type */}
            <div className="flex w-full flex-col items-start gap-2">
              <p className="text-sm font-semibold text-neutral-300">
                {t('certificate:EDIT.TAX_TYPE')}
                <span> </span>
                <span className="text-text-state-error">*</span>
              </p>
              <div className="relative z-10 flex w-full items-center gap-2">
                <TaxMenu selectTaxHandler={selectTaxHandler} />
              </div>
              {errors.taxAmount && (
                <p className="-translate-y-1 self-end text-sm text-text-state-error">
                  {errors.taxAmount}
                </p>
              )}
            </div>

            {/* Info: (20240924 - Anna) CounterParty */}
            {formState.type !== InvoiceType.OUTPUT_32 && (
              <>
                <CounterpartyInput
                  ref={counterpartyInputRef}
                  counterparty={{
                    taxId: formState.buyerIdNumber,
                    name: formState.buyerName,
                  }}
                  counterpartyList={counterpartyList}
                  onSelect={(cp: ICounterpartyOptional) => {
                    if (cp && cp.name) {
                      handleInputChange('buyerName', cp.name);
                    }
                    if (cp && cp.taxId) {
                      handleInputChange('buyerIdNumber', cp.taxId);
                    }
                  }}
                  labelClassName="text-neutral-300"
                  counterpartyRole="buyer"
                />
                {errors.counterParty && (
                  <p className="-translate-y-1 self-end text-sm text-text-state-error">
                    {errors.counterParty}
                  </p>
                )}
                {formState.type === InvoiceType.OUTPUT_35 && (
                  <p className="w-full text-right text-sm font-medium leading-5 tracking-wide text-neutral-300">
                    {t('certificate:EDIT.SKIP_IF_TRIPLICATE_CASH_REGISTER')}
                  </p>
                )}
              </>
            )}

            <div className="flex w-full items-center gap-2">
              {/* Info: (20240924 - Anna) Price Before Tax */}
              <div className="relative flex flex-1 flex-col items-start gap-2 md:h-122px">
                <p className="text-sm font-semibold text-neutral-300">
                  {t('certificate:EDIT.PRICE_BEFORE_TAX')}
                  <span className="text-text-state-error">*</span>
                </p>
                <div className="flex w-full items-center">
                  <NumericInput
                    id="input-price-before-tax"
                    name="input-price-before-tax"
                    value={formState.netAmount ?? 0}
                    isDecimal
                    required
                    hasComma
                    className="h-46px w-full rounded-l-sm border border-input-stroke-input bg-input-surface-input-background p-10px text-right outline-none"
                    triggerWhenChanged={netAmountChangeHandler}
                  />
                  <div className="flex h-46px w-91px min-w-91px items-center gap-4px rounded-r-sm border border-l-0 border-input-stroke-input bg-input-surface-input-background p-14px text-sm text-input-text-input-placeholder">
                    <Image
                      src={currencyAliasImageSrc}
                      width={16}
                      height={16}
                      alt={currencyAliasImageAlt}
                      className="rounded-full"
                    />
                    <p>{currencyAliasStr}</p>
                  </div>
                </div>
                {errors.netAmount && (
                  <p className="-translate-y-1 self-end text-sm text-text-state-error">
                    {errors.netAmount}
                  </p>
                )}
              </div>
              {formState.type !== InvoiceType.OUTPUT_32 && (
                <>
                  {/* Info: (20250414 - Anna) Tax */}
                  <div className="relative flex flex-1 flex-col items-start gap-2 md:h-122px">
                    <p className="text-sm font-semibold text-neutral-300">
                      {t('certificate:EDIT.TAX')}
                      <span className="text-text-state-error">*</span>
                    </p>
                    <div className="flex w-full items-center">
                      <NumericInput
                        id="input-tax"
                        name="input-tax"
                        value={formState.taxAmount ?? 0}
                        isDecimal
                        required
                        hasComma
                        className="h-46px w-full rounded-l-sm border border-input-stroke-input bg-input-surface-input-background p-10px text-right outline-none"
                      />
                      <div className="flex h-46px w-91px min-w-91px items-center gap-4px rounded-r-sm border border-l-0 border-input-stroke-input bg-input-surface-input-background p-14px text-sm text-input-text-input-placeholder">
                        <Image
                          src={currencyAliasImageSrc}
                          width={16}
                          height={16}
                          alt={currencyAliasImageAlt}
                          className="rounded-full"
                        />
                        <p>{currencyAliasStr}</p>
                      </div>
                    </div>
                    {formState.type === InvoiceType.OUTPUT_35 && (
                      <p className="w-full text-right text-sm font-medium leading-5 tracking-wide text-neutral-300">
                        {t('certificate:EDIT.SKIP_IF_TRIPLICATE_CASH_REGISTER')}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Info: (20240924 - Anna) Total Price */}
            <div className="hidden">
              <div className="relative flex w-full flex-1 flex-col items-start gap-2">
                <div id="price" className="absolute -top-20"></div>
                <p className="text-sm font-semibold text-input-text-primary">
                  {t('certificate:EDIT.TOTAL_PRICE')}
                  <span className="text-text-state-error">*</span>
                </p>
                <div className="flex w-full items-center">
                  <NumericInput
                    id="input-total-price"
                    name="input-total-price"
                    value={formState.totalAmount ?? 0}
                    isDecimal
                    required
                    hasComma
                    className="h-46px flex-1 rounded-l-sm border border-input-stroke-input bg-input-surface-input-background p-10px text-right outline-none"
                    triggerWhenChanged={totalAmountChangeHandler}
                  />
                  <div className="flex h-46px w-91px min-w-91px items-center gap-4px rounded-r-sm border border-l-0 border-input-stroke-input bg-input-surface-input-background p-14px text-sm text-input-text-input-placeholder">
                    <Image
                      src={currencyAliasImageSrc}
                      width={16}
                      height={16}
                      alt={currencyAliasImageAlt}
                      className="rounded-full"
                    />
                    <p>{currencyAliasStr}</p>
                  </div>
                </div>
                {errors.totalAmount && (
                  <p className="-translate-y-1 self-end text-sm text-text-state-error">
                    {errors.totalAmount}
                  </p>
                )}
              </div>
            </div>

            {/* Info: (20250414 - Anna) 退回或折讓checkbox */}
            <div className="flex w-full items-center gap-2">
              <div
                className={`relative h-16px w-16px rounded-xxs border border-checkbox-stroke-unselected ${
                  isReturnOrAllowance
                    ? 'bg-checkbox-surface-selected'
                    : 'bg-checkbox-surface-unselected'
                }`}
                onClick={() => {
                  const isTogglingToReturnOrAllowance = !isReturnOrAllowance;
                  setIsReturnOrAllowance(isTogglingToReturnOrAllowance);

                  // Info: (20250414 - Anna) 如果選擇的是「銷項三聯式發票」且要轉為退回折讓，就自動轉換為「銷項三聯式發票退回或折讓證明單」
                  // Info: (20250414 - Anna) 如果選擇的是「銷項二聯式發票」且要轉為退回折讓，就自動轉換為「銷項二聯式發票退回或折讓證明單」
                  if (formState.type === InvoiceType.OUTPUT_31 && isTogglingToReturnOrAllowance) {
                    handleInputChange('type', InvoiceType.OUTPUT_33);
                  } else if (
                    formState.type === InvoiceType.OUTPUT_33 &&
                    !isTogglingToReturnOrAllowance
                  ) {
                    handleInputChange('type', InvoiceType.OUTPUT_31);
                  } else if (
                    formState.type === InvoiceType.OUTPUT_32 &&
                    isTogglingToReturnOrAllowance
                  ) {
                    handleInputChange('type', InvoiceType.OUTPUT_34);
                  } else if (
                    formState.type === InvoiceType.OUTPUT_34 &&
                    !isTogglingToReturnOrAllowance
                  ) {
                    handleInputChange('type', InvoiceType.OUTPUT_32);
                  }
                }}
              >
                {isReturnOrAllowance && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <HiCheck className="text-neutral-white" />
                  </div>
                )}
              </div>

              {/* Info: (20250414 - Anna) Checkbox label */}
              <span className="text-sm font-medium text-input-text-primary">
                {t('certificate:OUTPUT_CERTIFICATE.MARK_RETURN_OR_ALLOWANCE')}
              </span>
            </div>
          </div>
        </div>
        {/* Info: (20240924 - Anna) Save 按鈕 */}
        <div className="flex items-center">
          {!certificate.voucherNo && (
            <Button
              id="certificate-delete-btn"
              type="button"
              className="px-16px py-8px"
              onClick={() => onDelete(certificate.id)}
              variant="errorOutline"
            >
              <LuTrash2 size={20} />
              <p>{t('common:COMMON.DELETE')}</p>
            </Button>
          )}
          <div className="ml-auto flex items-center gap-4">
            {/* Info: (20250415 - Anna) 上一筆 */}
            <Button
              type="button"
              disabled={!hasPrev}
              onClick={() => setEditingId(certificates[currentIndex - 1].id)}
              variant="tertiaryOutline"
              className="px-16px py-8px"
            >
              <IoArrowBackOutline size={20} />
              <p>{t('certificate:OUTPUT_CERTIFICATE.PREVIOUS')}</p>
            </Button>
            {/* Info: (20250415 - Anna) 下一筆 */}
            <Button
              onClick={() => setEditingId(certificates[currentIndex + 1].id)}
              type="button"
              disabled={!hasNext}
              variant="tertiary"
              className="px-16px py-8px"
            >
              <p>{t('certificate:OUTPUT_CERTIFICATE.NEXT')}</p>
              <IoArrowForward size={20} />
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default OutputInvoiceEditModal;
