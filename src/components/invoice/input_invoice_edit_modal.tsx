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
import DeductionTypeMenu from '@/components/invoice/invoice_deduction_type_menu';
import { IPaginatedData } from '@/interfaces/pagination';
import { HiCheck } from 'react-icons/hi';
import { IInvoiceRC2Input, IInvoiceRC2InputUI } from '@/interfaces/invoice_rc2';
import { InvoiceDirection, InvoiceType, DeductionType, TaxType } from '@/constants/invoice_rc2';
import { ICounterparty, ICounterpartyOptional } from '@/interfaces/counterparty';

interface InputInvoiceEditModalProps {
  isOpen: boolean;
  accountBookId: number;
  toggleModel: () => void; // Info: (20240924 - Anna) 關閉模態框的回調函數
  currencyAlias: CurrencyType;
  certificate?: IInvoiceRC2InputUI;
  onUpdateFilename: (certificateId: number, name: string) => void;
  onSave: (data: Partial<IInvoiceRC2Input>) => Promise<void>; // Info: (20240924 - Anna) 保存數據的回調函數
  onDelete: (id: number) => void;
  certificates: IInvoiceRC2InputUI[]; // Info: (20250415 - Anna) 傳入目前這頁的所有憑證清單（為了做前後筆切換）
  editingId: number; // Info: (20250415 - Anna) 傳入正在編輯的這筆 ID
  setEditingId: (id: number) => void; // Info: (20250415 - Anna) 前後筆切換時用
}

const InputInvoiceEditModal: React.FC<InputInvoiceEditModalProps> = ({
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
    InvoiceType.INPUT_20,
    InvoiceType.INPUT_21,
    InvoiceType.INPUT_22,
    InvoiceType.INPUT_23,
    InvoiceType.INPUT_24,
    InvoiceType.INPUT_25,
    InvoiceType.INPUT_26,
    InvoiceType.INPUT_27,
    InvoiceType.INPUT_28,
    InvoiceType.INPUT_29,
  ];
  const counterpartyInputRef = useRef<CounterpartyInputRef>(null);
  const { t } = useTranslation(['certificate', 'common', 'filter_section_type']);

  // Info: (20250430 - Anna) 用 ref 包住 preview 區塊
  const certificateRef = useRef<HTMLDivElement>(null);
  const [eInvoiceImageUrl, setEInvoiceImageUrl] = useState<string | null>(null);

  // Info: (20250414 - Anna) 記錄上一次成功儲存的 certificate，用來做 shallowEqual 比對
  const savedInvoiceRC2Ref = useRef<Partial<IInvoiceRC2Input>>(certificate ?? {});

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
        // Info: (20250414 - Anna) 這個組件改為全為進項
        direction: InvoiceDirection.INPUT,
        date: certificate.issuedDate,
        no: certificate.no,
        netAmount: certificate.netAmount,
        taxType: certificate.taxType,
        taxRate: certificate.taxRate,
        taxAmount: certificate.taxAmount,
        totalAmount: certificate.totalAmount,
        salesName: certificate.salesName,
        salesIdNumber: certificate.salesIdNumber,
        type: certificate.type ?? InvoiceType.INPUT_21,
        // Info: (20250422 - Anna)「扣抵類型」
        deductionType: certificate.deductionType ?? DeductionType.DEDUCTIBLE_PURCHASE_AND_EXPENSE,
        // Info: (20250429 - Anna)「是否為彙總金額代表憑證」
        isSharedAmount: certificate.isSharedAmount ?? false,
        // Info: (20250429 - Anna)「其他憑證編號」
        otherCertificateNo: certificate.otherCertificateNo ?? '',
      }) as Partial<IInvoiceRC2Input>
  );
  const [errors] = useState<Record<string, string>>({});

  const formStateRef = useRef(formState);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Info: (20250416 - Anna) 不用formState，改用 formStateRef.current（由 handleInputChange 寫入，總是最新值），避免 useState 非同步更新問題
    const { issuedDate: selectedDate, netAmount, taxAmount, salesName } = formStateRef.current;

    if (!selectedDate || selectedDate <= 0) {
      newErrors.date = t('certificate:ERROR.PLEASE_FILL_UP_THIS_FORM'); // Info: (20250106 - Anna) 備用 t('certificate:ERROR.REQUIRED_DATE');
    }
    if (!netAmount || netAmount <= 0) {
      newErrors.netAmount = t('certificate:ERROR.PLEASE_FILL_UP_THIS_FORM'); // Info: (20250106 - Anna) 備用 t('certificate:ERROR.REQUIRED_PRICE');
    }
    if (!taxAmount || taxAmount <= 0) {
      newErrors.taxAmount = t('certificate:ERROR.PLEASE_FILL_UP_THIS_FORM'); // Info: (20250106 - Anna) 備用 t('certificate:ERROR.REQUIRED_TOTAL');
    }
    if (!salesName) {
      newErrors.counterParty = t('certificate:ERROR.REQUIRED_COUNTERPARTY_NAME'); // Info: (20250106 - Anna) 備用 t('certificate:ERROR.REQUIRED_COUNTERPARTY');
    }

    // Deprecated: (20250509 - Luphia) remove eslint-disable
    // eslint-disable-next-line no-console
    console.log('newErrors:', newErrors);

    return Object.keys(newErrors).length === 0;
  };

  // Info: (20250414 - Anna) 用來記錄 setTimeout 的任務 ID，供 debounce 清除使用
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Info: (20250428 - Anna) 用來操作 input（focus 或 select）
  const summarizedInvoiceInputRef = useRef<HTMLInputElement>(null);

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

  const invoiceTypeMenuClickHandler = () => {
    setIsInvoiceTypeMenuOpen(!isInvoiceTypeMenuOpen);
  };

  const invoiceTypeMenuOptionClickHandler = (id: InvoiceType) => {
    setIsInvoiceTypeMenuOpen(false);
    handleInputChange('type', id);
  };

  const netAmountChangeHandler = (value: number) => {
    handleInputChange('netAmount', value);
    const updateTaxPrice = Math.round((value * (formState.taxRate ?? 0)) / 100);
    handleInputChange('taxAmount', updateTaxPrice);
    handleInputChange('totalAmount', value + updateTaxPrice);
  };

  const selectTaxHandler = (taxInfo: { taxRate: number | null; taxType: TaxType }) => {
    handleInputChange('taxRate', taxInfo.taxRate);
    const updateTaxPrice = Math.round(((formState.netAmount ?? 0) * (taxInfo.taxRate ?? 0)) / 100);
    handleInputChange('taxType', taxInfo.taxType);
    handleInputChange('taxAmount', updateTaxPrice);
    handleInputChange('totalAmount', (formState.netAmount ?? 0) + updateTaxPrice);
  };
  const selectDeductionTypeHandler = (value: string) => {
    handleInputChange('deductionType', value);
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
    // ToDo: (20250429 - Anna) 等後端欄位完成，確認 isSharedAmount 正確存取後，移除 console.log
    // eslint-disable-next-line no-console
    console.log('傳到後端的 isSharedAmount(formStateRef):', formStateRef.current.isSharedAmount);
    // eslint-disable-next-line no-console
    console.log('傳到後端的 isSharedAmount(updatedInvoice):', updatedCertificate.isSharedAmount);

    // Info: (20250414 - Anna) 如果資料完全沒變，就不打 API
    if (shallowEqual(savedInvoiceRC2Ref.current, updatedCertificate)) return;

    const updatedData: Partial<IInvoiceRC2Input> = {
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
      // eslint-disable-next-line no-console
      console.log('isSame:', isSame, formStateRef.current, savedInvoiceRC2Ref.current);
      const isValid = validateForm();

      if (!isSame && isValid) {
        handleSave();
      }
    }, 1000); // Info: (20250414 - Anna) 停止輸入 1 秒才觸發
  }, [formState]);

  // Info: (20250415 - Anna) certificate 或 editingId 變動時，重新初始化表單狀態、formRef、savedInvoiceRC2Ref、日期 等，為了做前後筆切換
  useEffect(() => {
    if (!certificate) return;

    const newFormState: Partial<IInvoiceRC2Input> = {
      direction: InvoiceDirection.INPUT,
      issuedDate: certificate.issuedDate,
      no: certificate.no,
      netAmount: certificate.netAmount,
      taxType: certificate.taxType ?? TaxType.TAXABLE,
      taxRate: certificate.taxRate,
      taxAmount: certificate.taxAmount,
      totalAmount: certificate.totalAmount,
      type: certificate.type ?? InvoiceType.INPUT_21,
      salesIdNumber: certificate.salesIdNumber,
      salesName: certificate.salesName,
      deductionType: certificate.deductionType,
      isSharedAmount: certificate.isSharedAmount,
      otherCertificateNo: certificate.otherCertificateNo,
      totalOfSummarizedInvoices: certificate.totalOfSummarizedInvoices,
    };

    setFormState(newFormState);
    formStateRef.current = newFormState;
    savedInvoiceRC2Ref.current = newFormState;

    // Info: (20250415 - Anna)同步更新日期 UI
    if (certificate.issuedDate) {
      setDate({
        startTimeStamp: certificate.issuedDate,
        // Info: (20250415 - Anna) 補足當天結束時間（23:59:59）(24 小時 × 60 分鐘 × 60 秒 = 86400 秒，86400 - 1 = 86399 秒)
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
            {t(`certificate:EDIT.INPUT_INVOICE`)}
          </p>
          <p className="flex justify-center text-xs font-normal leading-5 tracking-wide text-neutral-400">
            {t(`certificate:EDIT.HEADER`)}
          </p>
        </div>

        {/* Info: (20241210 - Anna) 隱藏 scrollbar */}
        <div className="hide-scrollbar flex w-full items-start justify-between gap-5 overflow-y-scroll md:h-600px md:flex-row">
          {/* Info: (20240924 - Anna) 發票縮略圖 */}

          {/*  Info: (20250430 - Anna) e-invoice UI (格式25的時候套用) */}
          {/*  Todo: (20250430 - Anna) 要再加一個條件[ isGenerated 為 true ] */}
          {formState.type === InvoiceType.INPUT_25 && (
            <div className="h-0 w-0 overflow-hidden">
              <EInvoicePreview
                ref={certificateRef}
                certificateType={InvoiceType.INPUT_25}
                issuedDate={dayjs
                  .unix(formState.issuedDate ?? certificate.issuedDate ?? 0)
                  .format('YYYY-MM-DD')}
                invoiceNo={formState.no ?? certificate.no ?? ''}
                taxId={formState.salesIdNumber ?? certificate.salesIdNumber ?? undefined}
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
              className="max-h-640px min-h-510px w-440px"
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
                {formState.type === InvoiceType.INPUT_23 || formState.type === InvoiceType.INPUT_24
                  ? t('certificate:EDIT.ALLOWANCE_ISSUE_DATE')
                  : t('certificate:EDIT.DATE')}
                <span> </span>
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
            {/* Info: (20250428 - Anna) 輸入彙總發票張數 */}
            {(formState.type === InvoiceType.INPUT_26 ||
              formState.type === InvoiceType.INPUT_27) && (
              <div className="flex w-full flex-col gap-2">
                <p className="text-sm font-semibold text-neutral-300">
                  {t('certificate:EDIT.TOTAL_OF_SUMMARIZED_INVOICES')}
                  <span> </span>
                  <span className="text-text-state-error">*</span>
                </p>
                <div className="flex w-full items-center">
                  <input
                    id="summarized-invoice-count"
                    ref={summarizedInvoiceInputRef}
                    type="number"
                    value={
                      formState.totalOfSummarizedInvoices != null
                        ? formState.totalOfSummarizedInvoices.toString()
                        : '0'
                    }
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      const numberValue = parseInt(inputValue, 10);
                      if (inputValue === '') {
                        handleInputChange('totalOfSummarizedInvoices', 0); // Info: (20250428 - Anna) 空的話直接設 0
                      } else if (!Number.isNaN(numberValue)) {
                        handleInputChange('totalOfSummarizedInvoices', numberValue);
                      }
                    }}
                    // Info: (20250428 - Anna) 只在值是 0 或 undefined 時全部選取
                    onFocus={() => {
                      if (
                        formState.totalOfSummarizedInvoices === undefined ||
                        formState.totalOfSummarizedInvoices === 0
                      ) {
                        summarizedInvoiceInputRef.current?.select();
                      }
                    }}
                    className={`h-44px w-16 flex-1 rounded-l-sm border border-input-stroke-input bg-input-surface-input-background p-16px text-right uppercase outline-none ${
                      formState.totalOfSummarizedInvoices === 0 ||
                      formState.totalOfSummarizedInvoices === undefined
                        ? 'text-neutral-300'
                        : 'text-neutral-600'
                    }`}
                    placeholder="0"
                  />
                  <div className="flex h-44px min-w-70px items-center justify-center rounded-r-sm border border-input-stroke-input bg-input-surface-input-background p-14px font-medium text-neutral-300 outline-none">
                    {t('certificate:EDIT.COPIES')}
                  </div>
                </div>
              </div>
            )}
            {/* Info: (20240924 - Anna) Invoice Number */}
            <div className="flex w-full flex-col gap-4">
              <div className="relative flex w-full flex-1 flex-col items-start gap-2">
                {/* Info: (20250422 - Anna) 28 - 進項海關代徵營業稅繳納證 or 29 - 進項海關退還溢繳營業稅申報單 */}
                {formState.type === InvoiceType.INPUT_28 ||
                formState.type === InvoiceType.INPUT_29 ? (
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
                ) : // Info: (20250429 - Anna) 格式26
                formState.type === InvoiceType.INPUT_26 ? (
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
                ) : // Info: (20250429 - Anna) 格式22
                formState.type === InvoiceType.INPUT_22 ? (
                  <div className="flex w-full justify-between">
                    {/* Info: (20250429 - Anna) Invoice No. */}
                    <div className="flex flex-col gap-2 md:w-52">
                      <p className="text-sm font-semibold text-neutral-300">
                        {t('certificate:EDIT.INVOICE_NUMBER')}
                        <span> </span>
                        <span className="text-text-state-error">*</span>
                      </p>

                      <div className="flex items-center">
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
                          disabled={!!formState.otherCertificateNo}
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
                          className="h-44px rounded-r-sm border border-input-stroke-input bg-input-surface-input-background p-16px outline-none md:w-36"
                          placeholder="12345678"
                          disabled={!!formState.otherCertificateNo}
                        />
                      </div>
                    </div>
                    {/* Info: (20250429 - Anna) or */}
                    <p className="flex items-end text-neutral-400">{t('common:COMMON.OR')}</p>
                    {/* Info: (20250429 - Anna) Other Certificate No. */}
                    <div className="flex flex-col gap-2 md:w-52">
                      <p className="text-sm font-semibold text-neutral-300">
                        {t('certificate:EDIT.OTHER_CERTIFICATE_NO')}
                        <span> </span>
                        <span className="text-text-state-error">*</span>
                      </p>

                      <div className="flex w-full items-center">
                        <input
                          id="other-certificate-no"
                          type="text"
                          value={formState.otherCertificateNo ?? ''}
                          onChange={(e) => {
                            handleInputChange('otherCertificateNo', e.target.value);
                          }}
                          className="h-44px flex-1 rounded-sm border border-input-stroke-input bg-input-surface-input-background p-16px outline-none"
                          placeholder="CC12345678"
                          disabled={!!formState.no}
                        />
                      </div>
                    </div>
                  </div>
                ) : // Info: (20250429 - Anna) 格式27
                formState.type === InvoiceType.INPUT_27 ? (
                  <div className="flex w-full justify-between">
                    {/* Info: (20250429 - Anna) Representative Invoice No. */}
                    <div className="flex flex-col gap-2 md:w-52">
                      <p className="text-sm font-semibold text-neutral-300">
                        {t('certificate:EDIT.REPRESENTATIVE_INVOICE')}
                        <span> </span>
                        <span className="text-text-state-error">*</span>
                      </p>

                      <div className="flex items-center">
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
                          disabled={!!formState.otherCertificateNo}
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
                          className="h-44px rounded-r-sm border border-input-stroke-input bg-input-surface-input-background p-16px outline-none md:w-36"
                          placeholder="12345678"
                          disabled={!!formState.otherCertificateNo}
                        />
                      </div>
                    </div>
                    {/* Info: (20250429 - Anna) or */}
                    <p className="flex items-end text-neutral-400">{t('common:COMMON.OR')}</p>
                    {/* Info: (20250429 - Anna) Other Certificate No. */}
                    <div className="flex flex-col gap-2 md:w-52">
                      <p className="text-sm font-semibold text-neutral-300">
                        {t('certificate:EDIT.OTHER_CERTIFICATE_NO')}
                        <span> </span>
                        <span className="text-text-state-error">*</span>
                      </p>

                      <div className="flex w-full items-center">
                        <input
                          id="other-certificate-no"
                          type="text"
                          value={formState.otherCertificateNo ?? ''}
                          onChange={(e) => {
                            handleInputChange('otherCertificateNo', e.target.value);
                          }}
                          className="h-44px flex-1 rounded-sm border border-input-stroke-input bg-input-surface-input-background p-16px outline-none"
                          placeholder="CC12345678"
                          disabled={!!formState.no}
                        />
                      </div>
                    </div>
                  </div>
                ) : // Info: (20250513 - Anna) 其他進項憑證 （不可申報）
                formState.type === InvoiceType.INPUT_20 ? (
                  <>
                    <p className="text-sm font-semibold text-neutral-300">
                      {t('certificate:EDIT.CERTIFICATE_NO')}
                    </p>
                    <div className="flex w-full items-center">
                      <input
                        id="invoiceno"
                        type="text"
                        value={formState.no}
                        onChange={(e) => handleInputChange('no', e.target.value)}
                        className="h-46px flex-1 rounded-sm border border-input-stroke-input bg-input-surface-input-background p-10px outline-none"
                        placeholder="12345678"
                      />
                    </div>
                  </>
                ) : (
                  // Info: (20250415 - Anna) 其他憑證類型的UI
                  <>
                    <p className="text-sm font-semibold text-neutral-300">
                      {t('certificate:EDIT.INVOICE_NUMBER')}
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
                        placeholder="12345678"
                      />
                    </div>
                  </>
                )}
              </div>
              {/* Info: (20250513 - Anna) Description - 「其他進項憑證（不可申報）」適用 */}
              {formState.type === InvoiceType.INPUT_20 && (
                <div className="relative flex w-full flex-col items-start gap-2">
                  <p className="text-sm font-semibold text-neutral-300">
                    {t('certificate:EDIT.DESCRIPTION')}
                  </p>

                  <div className="flex w-full items-center">
                    <input
                      id="description"
                      type="text"
                      value={formState.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      className="h-46px flex-1 rounded-sm border border-input-stroke-input bg-input-surface-input-background p-10px outline-none"
                      placeholder={t('certificate:EDIT.DESCRIPTION_PLACEHOLDER')}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Info: (20250414 - Anna) Tax Type */}
            {formState.type !== InvoiceType.INPUT_20 && (
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
            )}

            {/* Info: (20250421 - Anna) Deduction Type */}
            {formState.type !== InvoiceType.INPUT_20 && (
              <div className="flex w-full flex-col items-start gap-2">
                <p className="text-sm font-semibold text-neutral-300">
                  {t('certificate:TABLE.DEDUCTION_TYPE')}
                  <span> </span>
                  <span className="text-text-state-error">*</span>
                </p>
                <div className="flex w-full items-center gap-2">
                  <DeductionTypeMenu selectDeductionTypeHandler={selectDeductionTypeHandler} />
                </div>
              </div>
            )}

            {/* Info: (20240924 - Anna) CounterParty */}
            {formState.type !== InvoiceType.INPUT_20 && (
              <CounterpartyInput
                ref={counterpartyInputRef}
                counterparty={{
                  taxId: formState.salesIdNumber,
                  name: formState.salesName,
                }}
                counterpartyList={counterpartyList}
                onSelect={(cp: ICounterpartyOptional) => {
                  if (cp && cp.name) {
                    handleInputChange('salesName', cp.name);
                  }
                  if (cp && cp.taxId) {
                    handleInputChange('salesIdNumber', cp.taxId);
                  }
                }}
                labelClassName="text-neutral-300"
                counterpartyRole="seller"
              />
            )}
            {errors.counterParty && (
              <p className="-translate-y-1 self-end text-sm text-text-state-error">
                {errors.counterParty}
              </p>
            )}

            <div className="flex w-full items-center gap-2">
              {/* Info: (20240924 - Anna) Price Before Tax */}
              <div className="relative flex flex-1 flex-col items-start gap-2 md:h-105px">
                <p className="text-sm font-semibold text-neutral-300">
                  {formState.type === InvoiceType.INPUT_20
                    ? t('certificate:EDIT.CERTIFICATE_AMOUNT')
                    : formState.type === InvoiceType.INPUT_28 ||
                        formState.type === InvoiceType.INPUT_29 ||
                        formState.type === InvoiceType.INPUT_27 ||
                        formState.type === InvoiceType.INPUT_26
                      ? t('certificate:EDIT.TOTAL_OF_SALES_AMOUNT')
                      : t('certificate:EDIT.SALES_AMOUNT')}
                  <span> </span>
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

              {/* Info: (20250414 - Anna) Tax */}
              {formState.type !== InvoiceType.INPUT_20 && (
                <div className="relative flex flex-1 flex-col items-start gap-2 md:h-105px">
                  <p className="text-sm font-semibold text-neutral-300">
                    {t('certificate:EDIT.TAX')}
                    <span> </span>
                    <span className="text-text-state-error">*</span>
                  </p>
                  <div className="flex w-full items-center">
                    <NumericInput
                      id="input-tax"
                      name="input-tax"
                      value={
                        formState.type === InvoiceType.INPUT_22 ||
                        formState.type === InvoiceType.INPUT_27
                          ? 0
                          : (formState.taxAmount ?? 0)
                      }
                      isDecimal
                      required
                      hasComma
                      disabled={
                        formState.type === InvoiceType.INPUT_22 ||
                        formState.type === InvoiceType.INPUT_27
                      }
                      className={`h-46px w-full flex-1 rounded-l-sm border border-input-stroke-input bg-input-surface-input-background p-10px text-right outline-none ${
                        formState.type === InvoiceType.INPUT_22 ||
                        formState.type === InvoiceType.INPUT_27
                          ? 'text-neutral-300'
                          : 'text-input-text-primary'
                      }`}
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
                  {(formState.type === InvoiceType.INPUT_22 ||
                    formState.type === InvoiceType.INPUT_27) && (
                    <p className="w-full text-right text-sm font-medium tracking-wide text-neutral-300">
                      {t('certificate:EDIT.DUPLICATE_INVOICE_TAX')}
                    </p>
                  )}
                </div>
              )}
            </div>
            {/* Info: (20240924 - Anna) Total Price */}
            <div className="hidden">
              <div className="relative flex w-full flex-1 flex-col items-start gap-2">
                <div id="price" className="absolute -top-20"></div>
                <p className="text-sm font-semibold text-neutral-300">
                  {t('certificate:EDIT.TOTAL_PRICE')}
                  <span> </span>
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
                {errors.taxAmount && (
                  <p className="-translate-y-1 self-end text-sm text-text-state-error">
                    {errors.taxAmount}
                  </p>
                )}
              </div>
            </div>
            {/* Info: (20250429 - Anna) Mark as shared amount checkbox */}
            {formState.type === InvoiceType.INPUT_25 && (
              <div className="flex w-full items-center gap-2">
                <div
                  className={`relative h-16px w-16px rounded-xxs border border-checkbox-stroke-unselected ${
                    formState.isSharedAmount
                      ? 'bg-checkbox-surface-selected'
                      : 'bg-checkbox-surface-unselected'
                  }`}
                  onClick={() => {
                    const isTogglingToSharedAmount = !(
                      formStateRef.current.isSharedAmount ?? false
                    );
                    handleInputChange('isSharedAmount', isTogglingToSharedAmount);
                  }}
                >
                  {formState.isSharedAmount && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <HiCheck className="text-neutral-white" />
                    </div>
                  )}
                </div>

                {/* Info: (20250414 - Anna) Checkbox label */}
                <span className="text-sm font-medium text-input-text-primary">
                  {t('certificate:INPUT_CERTIFICATE.MARK_AS_SHARED_AMOUNT')}
                </span>
              </div>
            )}
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

export default InputInvoiceEditModal;
