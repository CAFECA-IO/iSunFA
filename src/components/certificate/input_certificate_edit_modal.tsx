import Image from 'next/image';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { FaChevronDown } from 'react-icons/fa6';
import useOuterClick from '@/lib/hooks/use_outer_click';
import NumericInput from '@/components/numeric_input/numeric_input';
import { Button } from '@/components/button/button';
import { InvoiceTransactionDirection, InvoiceType } from '@/constants/invoice';
import { ICounterparty, ICounterpartyOptional } from '@/interfaces/counterparty';
import { ICertificate, ICertificateUI } from '@/interfaces/certificate';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import { IDatePeriod } from '@/interfaces/date_period';
import { useModalContext } from '@/contexts/modal_context';
import { IoCloseOutline, IoArrowBackOutline, IoArrowForward } from 'react-icons/io5';
import { LuTrash2 } from 'react-icons/lu';
import { CurrencyType } from '@/constants/currency';
import CounterpartyInput, {
  CounterpartyInputRef,
} from '@/components/certificate/counterparty_input';
import EditableFilename from '@/components/certificate/edible_file_name';
import Magnifier from '@/components/magnifier/magifier';
import { IInvoiceBetaOptional } from '@/interfaces/invoice';
import APIHandler from '@/lib/utils/api_handler';
import { IAccountingSetting } from '@/interfaces/accounting_setting';
import { APIName } from '@/constants/api_connection';
import TaxMenu from '@/components/certificate/certificate_tax_menu_new';
import DeductionTypeMenu from '@/components/certificate/certificate_deduction_type_menu';
import { IPaginatedData } from '@/interfaces/pagination';
import { HiCheck } from 'react-icons/hi';

interface InputCertificateEditModalProps {
  isOpen: boolean;
  companyId: number;
  toggleModel: () => void; // Info: (20240924 - Anna) 關閉模態框的回調函數
  currencyAlias: CurrencyType;
  certificate?: ICertificateUI;
  onUpdateFilename: (certificateId: number, name: string) => void;
  onSave: (data: ICertificate) => Promise<void>; // Info: (20240924 - Anna) 保存數據的回調函數
  onDelete: (id: number) => void;
  certificates: ICertificateUI[]; // Info: (20250415 - Anna) 傳入目前這頁的所有憑證清單（為了做前後筆切換）
  editingId: number; // Info: (20250415 - Anna) 傳入正在編輯的這筆 ID
  setEditingId: (id: number) => void; // Info: (20250415 - Anna) 前後筆切換時用
}

const InputCertificateEditModal: React.FC<InputCertificateEditModalProps> = ({
  isOpen,
  companyId,
  toggleModel,
  currencyAlias,
  certificate,
  onUpdateFilename,
  onSave,
  onDelete,
  certificates,
  editingId,
  setEditingId,
}) => {
  const selectableInvoiceType: InvoiceType[] = [
    InvoiceType.PURCHASE_TRIPLICATE_AND_ELECTRONIC,
    InvoiceType.PURCHASE_DUPLICATE_CASH_REGISTER_AND_OTHER,
    InvoiceType.PURCHASE_RETURNS_TRIPLICATE_AND_ELECTRONIC,
    InvoiceType.PURCHASE_RETURNS_DUPLICATE_CASH_REGISTER_AND_OTHER,
    InvoiceType.PURCHASE_UTILITY_ELECTRONIC_INVOICE,
    InvoiceType.PURCHASE_SUMMARIZED_TRIPLICATE_AND_ELECTRONIC,
    InvoiceType.PURCHASE_SUMMARIZED_DUPLICATE_CASH_REGISTER_AND_OTHER,
    InvoiceType.PURCHASE_CUSTOMS_DUTY_PAYMENT,
    InvoiceType.PURCHASE_CUSTOMS_DUTY_REFUND,
  ];
  const counterpartyInputRef = useRef<CounterpartyInputRef>(null);
  const { t } = useTranslation(['certificate', 'common', 'filter_section_type']);

  // Info: (20250414 - Anna) 記錄上一次成功儲存的 invoice，用來做 shallowEqual 比對
  const savedInvoiceRef = useRef<ICertificate['invoice']>(certificate?.invoice ?? {});

  const { trigger: getAccountSetting } = APIHandler<IAccountingSetting>(
    APIName.ACCOUNTING_SETTING_GET
  );
  const { trigger: getCounterpartyList } = APIHandler<IPaginatedData<ICounterparty[]>>(
    APIName.COUNTERPARTY_LIST
  );
  const [counterpartyList, setCounterpartyList] = useState<ICounterparty[]>([]);
  // Info: (20240924 - Anna) 不顯示模態框時返回 null
  if (!isOpen || !certificate) return null;
  const [certificateFilename, setCertificateFilename] = useState<string>(certificate.file.name);
  const [date, setDate] = useState<IDatePeriod>({
    startTimeStamp: certificate.invoice?.date ?? 0,
    endTimeStamp: 0,
  });
  const { isMessageModalVisible } = useModalContext();
  const [formState, setFormState] = useState(
    () =>
      ({
        // Info: (20250414 - Anna) 這個組件改為全為進項
        inputOrOutput: InvoiceTransactionDirection.INPUT,
        date: certificate.invoice.date,
        no: certificate.invoice.no,
        priceBeforeTax: certificate.invoice.priceBeforeTax,
        taxRatio: certificate.invoice.taxRatio,
        taxPrice: certificate.invoice.taxPrice,
        totalPrice: certificate.invoice.totalPrice,
        counterParty: certificate.invoice.counterParty,
        type: certificate.invoice.type ?? InvoiceType.PURCHASE_TRIPLICATE_AND_ELECTRONIC,
        deductible: certificate.invoice.deductible,
        // Info: (20250422 - Anna) 多存「扣抵類型」
        deductionType: certificate.invoice.deductionType ?? 'DEDUCTIBLE_PURCHASE_AND_EXPENSE',
      }) as IInvoiceBetaOptional
  );
  const [errors] = useState<Record<string, string>>({});
  const [isReturnOrAllowance, setIsReturnOrAllowance] = useState(false);

  const formStateRef = useRef(formState);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Info: (20250416 - Anna) 不用formState，改用 formStateRef.current（由 handleInputChange 寫入，總是最新值），避免 useState 非同步更新問題
    const { date: selectedDate, priceBeforeTax, totalPrice, counterParty } = formStateRef.current;

    if (!selectedDate || selectedDate <= 0) {
      newErrors.date = t('certificate:ERROR.PLEASE_FILL_UP_THIS_FORM'); // Info: (20250106 - Anna) 備用 t('certificate:ERROR.REQUIRED_DATE');
    }
    if (!priceBeforeTax || priceBeforeTax <= 0) {
      newErrors.priceBeforeTax = t('certificate:ERROR.PLEASE_FILL_UP_THIS_FORM'); // Info: (20250106 - Anna) 備用 t('certificate:ERROR.REQUIRED_PRICE');
    }
    if (!totalPrice || totalPrice <= 0) {
      newErrors.totalPrice = t('certificate:ERROR.PLEASE_FILL_UP_THIS_FORM'); // Info: (20250106 - Anna) 備用 t('certificate:ERROR.REQUIRED_TOTAL');
    }
    if (!counterParty?.name) {
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
        | InvoiceTransactionDirection
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
      params: { companyId },
    });
    if (success && data) {
      if (formState.taxRatio === undefined) {
        // Info: (20250414 - Anna) 因為 inputOrOutput 永遠是 OUTPUT，所以不需再判斷 if (formState.inputOrOutput === OUTPUT)
        handleInputChange('taxRatio', data.taxSettings.salesTax.rate * 100);
      }
    }
  }, [companyId, formState.taxRatio]);

  const listCounterparty = useCallback(async () => {
    const { success, data } = await getCounterpartyList({
      params: { companyId },
    });
    if (success) {
      setCounterpartyList(data?.data ?? []);
    }
  }, [companyId]);

  const {
    targetRef: invoiceTypeMenuRef,
    componentVisible: isInvoiceTypeMenuOpen,
    setComponentVisible: setIsInvoiceTypeMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const invoiceTypeMenuClickHandler = () => {
    setIsInvoiceTypeMenuOpen(!isInvoiceTypeMenuOpen);
  };

  const invoiceTypeMenuOptionClickHandler = (id: InvoiceType) => {
    setIsInvoiceTypeMenuOpen(false);
    handleInputChange('type', id);
    // Info: (20250414 - Anna) 如果用戶手動切換下拉選單，重設折讓勾選
    setIsReturnOrAllowance(false);
  };

  const priceBeforeTaxChangeHandler = (value: number) => {
    handleInputChange('priceBeforeTax', value);
    const updateTaxPrice = Math.round((value * (formState.taxRatio ?? 0)) / 100);
    handleInputChange('taxPrice', updateTaxPrice);
    handleInputChange('totalPrice', value + updateTaxPrice);
  };

  const selectTaxHandler = (value: number | null) => {
    handleInputChange('taxRatio', value);
    const updateTaxPrice = Math.round(((formState.priceBeforeTax ?? 0) * (value ?? 0)) / 100);
    handleInputChange('taxPrice', updateTaxPrice);
    handleInputChange('totalPrice', (formState.priceBeforeTax ?? 0) + updateTaxPrice);
  };
    const selectDeductionTypeHandler = (value: string) => {
      handleInputChange('deductionType', value);
    };

  const totalPriceChangeHandler = (value: number) => {
    handleInputChange('totalPrice', value);
    const ratio = (100 + (formState.taxRatio ?? 0)) / 100;
    const updatePriceBeforeTax = Math.round(value / ratio);
    handleInputChange('priceBeforeTax', updatePriceBeforeTax);
    const updateTaxPrice = value - updatePriceBeforeTax;
    handleInputChange('taxPrice', updateTaxPrice);
  };

  // Info: (20241206 - Julian) currency alias setting
  const currencyAliasImageSrc = `/currencies/${(certificate.invoice?.currencyAlias || currencyAlias).toLowerCase()}.svg`;
  const currencyAliasImageAlt = `currency-${(certificate.invoice?.currencyAlias || currencyAlias).toLowerCase()}-icon`;
  const currencyAliasStr = t(
    `common:CURRENCY_ALIAS.${(certificate.invoice?.currencyAlias || currencyAlias).toUpperCase()}`
  );

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

    const updatedInvoice = {
      ...certificate.invoice,
      ...formStateRef.current,
    };

    // Info: (20250414 - Anna) 如果資料完全沒變，就不打 API
    if (shallowEqual(savedInvoiceRef.current, updatedInvoice)) return;

    // eslint-disable-next-line no-console
    console.log('📦 API 請求內容（來自 handleSave）：', updatedInvoice);

    const updatedData: ICertificate = {
      ...certificate,
      invoice: updatedInvoice,
    };

    await onSave(updatedData);

    // Info: (20250414 - Anna) 更新最新儲存成功的內容
    savedInvoiceRef.current = updatedInvoice;
  }, [certificate, onSave]);

  // Info: (20250415 - Anna) 在 modal 裡找出正在編輯的 index 並判斷能否切換
  const currentIndex = certificates.findIndex((c) => c.id === editingId);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < certificates.length - 1;

  // Info: (20250414 - Anna) 初始化 formStateRef，避免剛打開 modal 時 formStateRef.current 是 undefined，導致比對失效，無法觸發 handleSave()
  useEffect(() => {
    formStateRef.current = formState;
  }, []);

  // Info: (20250414 - Anna) 初始化 savedInvoiceRef，代表「目前已儲存的版本（上次存成功的資料）」，每次打開 modal 都會更新，用來與最新內容做 shallowEqual 比較
  useEffect(() => {
    // Info: (20250414 - Anna) 確保 savedInvoiceRef.current 被正確初始化為 certificate.invoice
    if (certificate?.invoice) {
      savedInvoiceRef.current = certificate.invoice;
    }
  }, [certificate?.invoice]);

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
      const isSame = shallowEqual(formStateRef.current, savedInvoiceRef.current);
      const isValid = validateForm();

      if (!isSame && isValid) {
        handleSave();
      }
    }, 1000); // Info: (20250414 - Anna) 停止輸入 1 秒才觸發
  }, [formState]);

  // Info: (20250415 - Anna) certificate 或 editingId 變動時，重新初始化表單狀態、formRef、savedInvoiceRef、日期 等，為了做前後筆切換
  useEffect(() => {
    if (!certificate) return;

    const {
      type,
      // Info: (20250415 - Anna) 避免命名衝突，將 invoice.date 改名為 certificateDate
      date: certificateDate,
      no,
      taxRatio,
      counterParty,
      priceBeforeTax,
      taxPrice,
      totalPrice,
    } = certificate.invoice;

    // Info: (20250415 - Anna) 初始化 formState
    const newFormState: IInvoiceBetaOptional = {
      inputOrOutput: InvoiceTransactionDirection.INPUT,
      date: certificateDate,
      no,
      priceBeforeTax,
      taxRatio,
      taxPrice,
      totalPrice,
      counterParty,
      type: type ?? InvoiceType.PURCHASE_TRIPLICATE_AND_ELECTRONIC,
    };

    // Info: (20250415 - Anna) 更新 state 與 Ref
    setFormState(newFormState);
    formStateRef.current = newFormState;
    savedInvoiceRef.current = {
      ...certificate.invoice,
      ...newFormState,
    };

    // Info: (20250415 - Anna) Debug 日期內容
    if (certificateDate) {
      setDate({
        startTimeStamp: certificateDate,
        // Info: (20250415 - Anna) 補足當天結束時間（23:59:59）(24 小時 × 60 分鐘 × 60 秒 = 86400 秒，86400 - 1 = 86399 秒)
        endTimeStamp: certificateDate + 86399,
      });
    }

    // Info: (20250415 - Anna) 依據憑證類型判斷是否為折讓
    if (
      type === InvoiceType.SALES_RETURNS_TRIPLICATE_AND_ELECTRONIC ||
      type === InvoiceType.SALES_RETURNS_DUPLICATE_AND_NON_UNIFORM
    ) {
      setIsReturnOrAllowance(true);
    } else {
      setIsReturnOrAllowance(false);
    }
  }, [certificate, editingId]);

  return (
    <div
      className={`fixed inset-0 z-120 flex items-center justify-center ${isMessageModalVisible ? '' : 'bg-black/50'}`}
    >
      <form
        className={`relative flex max-h-900px w-90vw max-w-95vw flex-col gap-4 overflow-y-hidden rounded-sm bg-surface-neutral-surface-lv2 px-8 py-4 md:max-h-96vh md:max-w-800px`}
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

        <EditableFilename
          certificate={certificate}
          certificateFilename={certificateFilename}
          setCertificateFilename={setCertificateFilename}
          onUpdateFilename={onUpdateFilename}
        />

        {/* Info: (20241210 - Anna) 隱藏 scrollbar */}
        <div className="hide-scrollbar flex w-full items-start justify-between gap-5 overflow-y-scroll md:flex-row">
          {/* Info: (20240924 - Anna) 發票縮略圖 */}
          <Magnifier imageUrl={certificate.file.url} className="w-210px min-w-210px" />
          {/* Info: (20240924 - Anna) 編輯表單 */}
          {/* Info: (20241210 - Anna) 隱藏 scrollbar */}
          <div className="hide-scrollbar flex h-600px w-full flex-col items-start space-y-4 overflow-y-scroll pb-80px">
            {/* Info: (20240924 - Anna) Invoice Type */}
            <div className="flex w-full flex-col items-start gap-2">
              <p className="text-sm font-semibold text-neutral-300">
                {t('certificate:EDIT.INVOICE_TYPE')}
                <span> </span>
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
                <span> </span>
                <span className="text-text-state-error">*</span>
              </p>
              <DatePicker
                period={date}
                setFilteredPeriod={setDate}
                type={DatePickerType.TEXT_DATE}
                datePickerClassName="z-120"
                datePickerHandler={(start: number) => handleInputChange('date', start)}
              />
              {errors.date && (
                <p className="-translate-y-1 self-start text-sm text-text-state-error">
                  {errors.date}
                </p>
              )}
            </div>

            {/* Info: (20240924 - Anna) Invoice Number */}
            <div className="relative flex w-full flex-1 flex-col items-start gap-2">
              <div id="price" className="absolute -top-20"></div>
              {/* Info: (20250422 - Anna) 28 - 進項海關代徵營業稅繳納證 or 29 - 進項海關退還溢繳營業稅申報單 */}
              {formState.type === InvoiceType.PURCHASE_CUSTOMS_DUTY_PAYMENT ||
              formState.type === InvoiceType.PURCHASE_CUSTOMS_DUTY_REFUND ? (
                <>
                  <p className="text-sm font-semibold text-neutral-300">
                    {t('certificate:EDIT.CERTIFICATE_BY_CUSTOMS')}
                    <span> </span>
                    <span className="text-text-state-error">*</span>
                  </p>

                  <div className="flex w-full items-center">
                    <input
                      id="invoiceno"
                      type="text"
                      value={formState.no}
                      onChange={(e) => handleInputChange('no', e.target.value)}
                      className="h-46px flex-1 rounded-sm border border-input-stroke-input bg-input-surface-input-background p-10px outline-none"
                      placeholder={t('certificate:EDIT.CHARACTERS')}
                    />
                  </div>
                </>
              ) : formState.type === InvoiceType.PURCHASE_SUMMARIZED_TRIPLICATE_AND_ELECTRONIC ? (
                <>
                  <p className="text-sm font-semibold text-neutral-300">
                    {t('certificate:EDIT.REPRESENTATIVE_INVOICE')}
                    <span> </span>
                    <span className="text-text-state-error">*</span>
                  </p>

                  <div className="flex w-full items-center">
                    {/* Info: (20250415 - Anna) 「輸入」發票前綴 */}
                    <input
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
                    />

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
                      placeholder={t('certificate:EDIT.ENTER_ONE_INVOICE')}
                    />
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-input-text-primary">
                    {t('certificate:EDIT.INVOICE_NUMBER')}
                    <span className="text-text-state-error">*</span>
                  </p>
                  {/* Info: (20250415 - Anna) 其他憑證類型的UI */}
                  <div className="flex w-full items-center">
                    {/* Info: (20250415 - Anna) 「輸入」發票前綴 */}
                    <input
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
                    />

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
                </>
              )}
            </div>

            {/* Info: (20250414 - Anna) Tax Type */}
            <div className="flex w-full flex-col items-start gap-2">
              <p className="text-sm font-semibold text-neutral-300">
                {t('certificate:EDIT.TAX_TYPE')}
                <span> </span>
                <span className="text-text-state-error">*</span>
              </p>
              <div className="relative z-120 flex w-full items-center gap-2">
                <TaxMenu selectTaxHandler={selectTaxHandler} />
              </div>
              {errors.taxPrice && (
                <p className="-translate-y-1 self-end text-sm text-text-state-error">
                  {errors.taxPrice}
                </p>
              )}
            </div>

            {/* Info: (20250421 - Anna) Deduction Type */}
            <div className="flex w-full flex-col items-start gap-2">
              <p className="text-sm font-semibold text-input-text-primary">
                {t('certificate:TABLE.DEDUCTION_TYPE')}
                <span className="text-text-state-error">*</span>
              </p>
              <div className="flex w-full items-center gap-2">
                <DeductionTypeMenu selectDeductionTypeHandler={selectDeductionTypeHandler} />
              </div>
            </div>

            {/* Info: (20240924 - Anna) CounterParty */}
            <CounterpartyInput
              ref={counterpartyInputRef}
              counterparty={formState.counterParty}
              counterpartyList={counterpartyList}
              onSelect={(cp: ICounterpartyOptional) => {
                if (cp && cp.name) {
                  handleInputChange('counterParty', cp);
                }
              }}
            />
            {errors.counterParty && (
              <p className="-translate-y-1 self-end text-sm text-text-state-error">
                {errors.counterParty}
              </p>
            )}

            <div className="flex w-full items-center gap-2">
              {/* Info: (20240924 - Anna) Price Before Tax */}
              <div className="relative flex flex-1 flex-col items-start gap-2">
                <div id="price" className="absolute -top-20"></div>
                <p className="text-sm font-semibold text-input-text-primary">
                  {t('certificate:EDIT.PRICE_BEFORE_TAX')}
                  <span className="text-text-state-error">*</span>
                </p>
                <div className="flex w-full items-center">
                  <NumericInput
                    id="input-price-before-tax"
                    name="input-price-before-tax"
                    value={formState.priceBeforeTax ?? 0}
                    isDecimal
                    required
                    hasComma
                    className="h-46px flex-1 rounded-l-sm border border-input-stroke-input bg-input-surface-input-background p-10px text-right outline-none"
                    triggerWhenChanged={priceBeforeTaxChangeHandler}
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
                {errors.priceBeforeTax && (
                  <p className="-translate-y-1 self-end text-sm text-text-state-error">
                    {errors.priceBeforeTax}
                  </p>
                )}
              </div>

              {/* Info: (20250414 - Anna) Tax */}
              <div className="relative flex flex-1 flex-col items-start gap-2">
                <p className="text-sm font-semibold text-input-text-primary">
                  Tax
                  <span className="text-text-state-error">*</span>
                </p>
                <div className="flex w-full items-center">
                  <NumericInput
                    id="input-tax"
                    name="input-tax"
                    value={formState.taxPrice ?? 0}
                    isDecimal
                    required
                    hasComma
                    className="h-46px flex-1 rounded-l-sm border border-input-stroke-input bg-input-surface-input-background p-10px text-right outline-none"
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
              </div>
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
                    value={formState.totalPrice ?? 0}
                    isDecimal
                    required
                    hasComma
                    className="h-46px flex-1 rounded-l-sm border border-input-stroke-input bg-input-surface-input-background p-10px text-right outline-none"
                    triggerWhenChanged={totalPriceChangeHandler}
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
                {errors.totalPrice && (
                  <p className="-translate-y-1 self-end text-sm text-text-state-error">
                    {errors.totalPrice}
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

                  // Info:Info: (20250414 - Anna) 如果選擇的是「銷項三聯式發票」且要轉為退回折讓，就自動轉換為「銷項三聯式發票退回或折讓證明單」
                  // Info:Info: (20250414 - Anna) 如果選擇的是「銷項二聯式發票」且要轉為退回折讓，就自動轉換為「銷項二聯式發票退回或折讓證明單」
                  if (
                    formState.type === InvoiceType.SALES_TRIPLICATE_INVOICE &&
                    isTogglingToReturnOrAllowance
                  ) {
                    handleInputChange('type', InvoiceType.SALES_RETURNS_TRIPLICATE_AND_ELECTRONIC);
                  } else if (
                    formState.type === InvoiceType.SALES_RETURNS_TRIPLICATE_AND_ELECTRONIC &&
                    !isTogglingToReturnOrAllowance
                  ) {
                    handleInputChange('type', InvoiceType.SALES_TRIPLICATE_INVOICE);
                  } else if (
                    formState.type === InvoiceType.SALES_DUPLICATE_CASH_REGISTER_INVOICE &&
                    isTogglingToReturnOrAllowance
                  ) {
                    handleInputChange('type', InvoiceType.SALES_RETURNS_DUPLICATE_AND_NON_UNIFORM);
                  } else if (
                    formState.type === InvoiceType.SALES_RETURNS_DUPLICATE_AND_NON_UNIFORM &&
                    !isTogglingToReturnOrAllowance
                  ) {
                    handleInputChange('type', InvoiceType.SALES_DUPLICATE_CASH_REGISTER_INVOICE);
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

export default InputCertificateEditModal;
