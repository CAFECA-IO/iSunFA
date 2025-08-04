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
import { IoCloseOutline /* IoArrowBackOutline, IoArrowForward */ } from 'react-icons/io5';
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
import { useIsLg } from '@/lib/utils/use_is_lg';
import { useCurrencyCtx } from '@/contexts/currency_context';
import eventManager from '@/lib/utils/event_manager';

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
  accountBookId,
  toggleModel,
  currencyAlias,
  certificate,
  onSave,
  onDelete,
  // certificates,
  editingId,
  // setEditingId,
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
  const { currency } = useCurrencyCtx();
  const isLg = useIsLg();

  // Info: (20250430 - Anna) 用 ref 包住 preview 區塊
  const certificateRef = useRef<HTMLDivElement>(null);
  const [eInvoiceImageUrl, setEInvoiceImageUrl] = useState<string | null>(null);

  // Info: (20250414 - Anna) 記錄上一次成功儲存的 certificate，用來做 shallowEqual 比對
  const savedInvoiceRC2Ref = useRef<Partial<IInvoiceRC2Input>>(certificate ?? {});

  // Info: (20250603 - Anna) 取得會計設定資料
  const { trigger: getAccountSetting } = APIHandler<IAccountingSetting>(
    APIName.ACCOUNTING_SETTING_GET
  );
  const { trigger: getCounterpartyList } = APIHandler<IPaginatedData<ICounterparty[]>>(
    APIName.COUNTERPARTY_LIST
  );
  const [counterpartyList, setCounterpartyList] = useState<ICounterparty[]>([]);
  const [date, setDate] = useState<IDatePeriod>({
    startTimeStamp: certificate?.issuedDate ?? 0,
    endTimeStamp: 0,
  });
  const { isMessageModalVisible } = useModalContext();
  const [formState, setFormState] = useState(
    () =>
      ({
        // Info: (20250414 - Anna) 這個組件改為全為進項
        direction: InvoiceDirection.INPUT,
        date: certificate?.issuedDate,
        no: certificate?.no,
        netAmount: certificate?.netAmount,
        taxType: certificate?.taxType,
        taxRate: certificate?.taxRate ?? undefined,
        taxAmount: certificate?.taxAmount,
        totalAmount: certificate?.totalAmount,
        salesName: certificate?.salesName,
        salesIdNumber: certificate?.salesIdNumber,
        type: certificate?.type ?? InvoiceType.INPUT_21,
        // Info: (20250422 - Anna)「扣抵類型」
        deductionType: certificate?.deductionType ?? DeductionType.DEDUCTIBLE_PURCHASE_AND_EXPENSE,
        // Info: (20250429 - Anna)「是否為彙總金額代表憑證」
        isSharedAmount: certificate?.isSharedAmount ?? false,
        // Info: (20250429 - Anna)「其他憑證編號」
        otherCertificateNo: certificate?.otherCertificateNo ?? '',
        // Info: (20250514 - Anna)「載具流水號」
        carrierSerialNumber: certificate?.carrierSerialNumber ?? '',
      }) as Partial<IInvoiceRC2Input>
  );
  const [errors] = useState<Record<string, string>>({});

  const formStateRef = useRef(formState);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Info: (20250416 - Anna) 不用formState，改用 formStateRef.current（由 handleInputChange 寫入，總是最新值），避免 useState 非同步更新問題
    const {
      issuedDate: selectedDate,
      netAmount,
      taxAmount,
      type,
      no,
      otherCertificateNo,
      carrierSerialNumber,
      totalOfSummarizedInvoices,
    } = formStateRef.current;

    // Info: (20250514 - Anna) 檢查發票日期
    if (!selectedDate || selectedDate <= 0) {
      newErrors.date = t('certificate:ERROR.PLEASE_FILL_UP_THIS_FORM'); // Info: (20250106 - Anna) 備用 t('certificate:ERROR.REQUIRED_DATE');
    }

    // Info: (20250514 - Anna) 檢查金額的淨額
    if (!netAmount || netAmount <= 0) {
      newErrors.netAmount = t('certificate:ERROR.PLEASE_FILL_UP_THIS_FORM'); // Info: (20250106 - Anna) 備用 t('certificate:ERROR.REQUIRED_PRICE');
    }

    // Info: (20250514 - Anna) 檢查稅額（除了 INPUT_20、INPUT_22 、INPUT_24、INPUT_27 以外）
    // Info: (20250514 - Anna) 只有在「非免稅」（taxRate 有值）時，才檢查 taxAmount 是否 > 0
    // Info: (20250514 - Anna) taxAmount 是 null（沒選稅類），還是會報錯
    if (
      (type !== InvoiceType.INPUT_20 &&
        type !== InvoiceType.INPUT_22 &&
        type !== InvoiceType.INPUT_24 &&
        type !== InvoiceType.INPUT_27 &&
        formStateRef.current.taxRate !== undefined &&
        (!taxAmount || taxAmount <= 0)) ||
      taxAmount == null
    ) {
      newErrors.taxAmount = t('certificate:ERROR.PLEASE_FILL_UP_THIS_FORM');
    }

    // Info: (20250514 - Anna) 根據發票格式檢查 invoiceNo 或替代欄位
    const needsAlternativeNo =
      type === InvoiceType.INPUT_22 ||
      type === InvoiceType.INPUT_25 ||
      type === InvoiceType.INPUT_27;

    if (
      type !== InvoiceType.INPUT_20 &&
      ((!needsAlternativeNo && !no) ||
        (needsAlternativeNo && !no && !otherCertificateNo && !carrierSerialNumber))
    ) {
      newErrors.no = t('certificate:ERROR.PLEASE_FILL_UP_THIS_FORM');
    }

    // Info: (20250514 - Anna) 格式 26 和 27 要填 totalOfSummarizedInvoices
    if (
      (type === InvoiceType.INPUT_26 || type === InvoiceType.INPUT_27) &&
      (!totalOfSummarizedInvoices || totalOfSummarizedInvoices <= 0)
    ) {
      newErrors.totalOfSummarizedInvoices = t('certificate:ERROR.PLEASE_FILL_UP_THIS_FORM');
    }

    return Object.keys(newErrors).length === 0;
  };

  // Info: (20250414 - Anna) 用來記錄 setTimeout 的任務 ID，供 debounce 清除使用
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Info: (20250428 - Anna) 用來操作 input（focus 或 select）
  const summarizedInvoiceInputRef = useRef<HTMLInputElement>(null);

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
    if (!certificate) return;
    const { isSelected, actions, ...rest } = certificate;

    const updatedCertificate = {
      ...rest,
      ...formStateRef.current,
    };

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

        // Info: (20250416 - Anna) 格式20，設為不可扣抵
        if (field === 'type' && value === InvoiceType.INPUT_20) {
          updated.deductionType = DeductionType.NON_DEDUCTIBLE_PURCHASE_AND_EXPENSE;
          updated.taxType = TaxType.TAX_FREE;
        }
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
    setFormState((prev) => {
      const updated = { ...prev, type: id };

      // Info: (20250609 - Anna) 如果從格式20切換到其他格式，則重新預設扣抵類型 & 稅種
      if (prev.type === InvoiceType.INPUT_20 && id !== InvoiceType.INPUT_20) {
        updated.deductionType = DeductionType.DEDUCTIBLE_PURCHASE_AND_EXPENSE;
        updated.taxType = TaxType.TAXABLE;
      }

      // Info: (20250609 - Anna) 清除不適用的欄位，避免殘留舊值
      if (id !== InvoiceType.INPUT_22 && id !== InvoiceType.INPUT_27) {
        updated.otherCertificateNo = '';
      }

      if (id !== InvoiceType.INPUT_25) {
        updated.carrierSerialNumber = '';
      }
      formStateRef.current = updated;
      return updated;
    });
    handleInputChange('type', id);
  };

  const netAmountChangeHandler = (value: number) => {
    handleInputChange('netAmount', value);
    const updateTaxPrice =
      // Info: (20250415  - Anna) 格式22、格式24 、格式20 稅額為 0
      formState.type === InvoiceType.INPUT_22 ||
      formState.type === InvoiceType.INPUT_24 ||
      formState.type === InvoiceType.INPUT_20
        ? 0
        : Math.round((value * (formState.taxRate ?? 0)) / 100);
    handleInputChange('taxAmount', updateTaxPrice);
    handleInputChange('totalAmount', value + updateTaxPrice);
  };

  const selectTaxHandler = ({ taxRate, taxType }: { taxRate: number | null; taxType: TaxType }) => {
    // Info: (20250514 - Anna) 處理 null 的 taxRate (免稅)，轉為 undefined
    const normalizedTaxRate = taxRate ?? undefined;

    // Info: (20250514 - Anna) 只觸發一次 setFormState，資料更新也更同步
    setFormState((prev) => {
      const netAmount = prev.netAmount ?? 0;
      const newTaxAmount = Math.round((netAmount * (normalizedTaxRate ?? 0)) / 100);
      const updated = {
        ...prev,
        taxRate: normalizedTaxRate,
        taxType,
        taxAmount: newTaxAmount,
        totalAmount: netAmount + newTaxAmount,
      };
      formStateRef.current = updated;

      // Info: (20250514 - Anna) 如果稅額變了就立即儲存
      if (prev.taxAmount !== newTaxAmount) {
        setTimeout(() => {
          handleSave();
        }, 0);
      }

      return updated;
    });
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
  const currencyAliasImageAlt = `currency-${(certificate?.currencyCode || currencyAlias).toLowerCase()}-icon`;

  // Info: (20250415 - Anna) 在 modal 裡找出正在編輯的 index 並判斷能否切換
  // const currentIndex = certificates.findIndex((c) => c.id === editingId);
  // const hasPrev = currentIndex > 0;
  // const hasNext = currentIndex < certificates.length - 1;

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
      deductionType: certificate.deductionType ?? DeductionType.DEDUCTIBLE_PURCHASE_AND_EXPENSE,
      isSharedAmount: certificate.isSharedAmount,
      otherCertificateNo: certificate.otherCertificateNo,
      totalOfSummarizedInvoices: certificate.totalOfSummarizedInvoices,
      carrierSerialNumber: certificate.carrierSerialNumber,
    };

    // Info: (20250516 - Anna) 補算格式28、格式29 的稅額和總額（如果沒有的話）
    if (
      (newFormState.type === InvoiceType.INPUT_28 || newFormState.type === InvoiceType.INPUT_29) &&
      newFormState.taxAmount == null &&
      newFormState.taxRate != null &&
      newFormState.netAmount != null
    ) {
      const computedTax = Math.round((newFormState.netAmount * newFormState.taxRate) / 100);
      newFormState.taxAmount = computedTax;
      newFormState.totalAmount = newFormState.netAmount + computedTax;
    }

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

  useEffect(() => {
    const refreshCounterpartyList = () => {
      listCounterparty();
    };
    // Info: (20250621 - Anna) 當全域事件系統有 ‘counterparty:added’ 事件發生時，就執行 refreshCounterpartyList 函數;
    eventManager.on('counterparty:added', refreshCounterpartyList);

    return () => {
      // Info: (20250621 - Anna) 元件卸載時，剛剛註冊的事件監聽取消掉
      eventManager.off('counterparty:added', refreshCounterpartyList);
    };
  }, [listCounterparty]);

  return (
    <div
      className={`fixed inset-0 z-120 flex items-center justify-center ${isMessageModalVisible ? '' : 'bg-black/50'}`}
    >
      <div className="overflow-hidden rounded-sm">
        <div className="max-h-90vh w-90vw max-w-95vw overflow-y-auto bg-surface-neutral-surface-lv2 px-8 py-4 md:max-w-1000px">
          <form
            className={`relative flex flex-col gap-4`}
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
            <div className="hide-scrollbar flex w-full flex-col items-start justify-between gap-5 overflow-y-scroll lg:h-600px lg:flex-row">
              {/* Info: (20240924 - Anna) 發票縮略圖 */}

              {/*  Info: (20250430 - Anna) e-invoice UI (格式25的時候套用) */}
              {formState.type === InvoiceType.INPUT_25 && formState.isGenerated && (
                <div className="h-0 w-0 overflow-hidden">
                  <EInvoicePreview
                    ref={certificateRef}
                    certificateType={InvoiceType.INPUT_25}
                    issuedDate={dayjs
                      .unix(formState.issuedDate ?? certificate?.issuedDate ?? 0)
                      .format('YYYY-MM-DD')}
                    invoiceNo={formState.no ?? certificate?.no ?? ''}
                    taxId={formState.salesIdNumber ?? certificate?.salesIdNumber ?? undefined}
                    netAmount={formState.netAmount ?? certificate?.netAmount ?? 0}
                    taxAmount={formState.taxAmount ?? certificate?.taxAmount ?? 0}
                    totalAmount={formState.totalAmount ?? certificate?.totalAmount ?? 0}
                  />
                </div>
              )}
              {(certificate?.file?.url || (certificate?.isGenerated && eInvoiceImageUrl)) && (
                <div className="relative w-full lg:h-570px">
                  <ImageZoom
                    imageUrl={
                      certificate.isGenerated && eInvoiceImageUrl
                        ? eInvoiceImageUrl
                        : certificate.file.thumbnail?.url || certificate.file.url
                    }
                    className="mx-auto h-350px w-240px iphonese:w-256px tablet:max-h-640px tablet:min-h-510px tablet:w-440px lg:mx-0"
                    controlPosition={isLg ? 'bottom-right' : 'bottom-center'}
                  />
                </div>
              )}

              {/* Info: (20250527 - Anna) 刪除、上一筆、下一筆( lg 以下) */}
              <div className="flex w-full justify-center tablet:pt-20 lg:hidden">
                <div>
                  {/* Info: (20250801 - Julian) 儲存紐 */}
                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => {
                      handleSave();
                      toggleModel();
                    }}
                  >
                    <p>{t('common:COMMON.SAVE')}</p>
                  </Button>
                  {/* ToDo: (20250801 - Julian) 暫時隱藏 */}
                  <div className="ml-auto flex items-center gap-4">
                    {/* Info: (20250415 - Anna) 上一筆 */}
                    {/* <Button
                      type="button"
                      disabled={!hasPrev}
                      onClick={() => setEditingId(certificates[currentIndex - 1].id)}
                      variant="tertiaryOutline"
                      className="h-36px px-8px py-8px iphonese:px-16px md:h-40px md:px-24px"
                    >
                      <IoArrowBackOutline size={20} />
                      <p>{t('certificate:OUTPUT_CERTIFICATE.PREVIOUS')}</p>
                    </Button> */}
                    {/* Info: (20250415 - Anna) 下一筆 */}
                    {/* <Button
                      onClick={() => setEditingId(certificates[currentIndex + 1].id)}
                      type="button"
                      disabled={!hasNext}
                      variant="tertiary"
                      className="h-36px px-8px py-8px iphonese:px-16px md:h-40px md:px-24px"
                    >
                      <p>{t('certificate:OUTPUT_CERTIFICATE.NEXT')}</p>
                      <IoArrowForward size={20} />
                    </Button> */}
                  </div>
                  {!certificate?.voucherNo && (
                    <Button
                      id="certificate-delete-btn"
                      type="button"
                      className="mt-10px h-36px w-full px-16px py-8px md:h-40px"
                      onClick={() => {
                        if (certificate?.id !== undefined) {
                          onDelete(certificate.id);
                        }
                      }}
                      variant="errorOutline"
                    >
                      <LuTrash2 size={20} />
                      <p>{t('common:COMMON.DELETE')}</p>
                    </Button>
                  )}
                </div>
              </div>

              {/* Info: (20240924 - Anna) 編輯表單 */}
              {/* Info: (20241210 - Anna) 隱藏 scrollbar */}
              <div className="hide-scrollbar flex h-600px w-full flex-col items-start space-y-4 pb-80px pt-20 lg:overflow-y-scroll lg:pt-0">
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
                    {formState.type === InvoiceType.INPUT_23 ||
                    formState.type === InvoiceType.INPUT_24
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
                        className={`h-44px w-16 flex-1 rounded-l-sm border border-r-0 border-input-stroke-input bg-input-surface-input-background p-16px text-right uppercase outline-none ${
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
                            className="h-44px w-16 rounded-l-sm border border-r-0 border-input-stroke-input bg-input-surface-input-background p-16px text-center uppercase outline-none"
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
                            className="h-44px min-w-0 flex-1 rounded-r-sm border border-input-stroke-input bg-input-surface-input-background p-16px outline-none"
                            placeholder={t('certificate:EDIT.ENTER_ONE_INVOICE')}
                          />
                        </div>
                      </>
                    ) : // Info: (20250429 - Anna) 格式22、格式25
                    formState.type === InvoiceType.INPUT_22 ||
                      formState.type === InvoiceType.INPUT_25 ? (
                      <div className="flex w-full flex-col justify-between lg:flex-row">
                        {/* Info: (20250429 - Anna) Invoice No. */}
                        <div className="flex flex-col gap-2 lg:w-52">
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
                              className="h-44px w-16 rounded-l-sm border border-r-0 border-input-stroke-input bg-input-surface-input-background p-16px text-center uppercase outline-none"
                              placeholder="AB"
                              disabled={
                                !!formState.otherCertificateNo ||
                                !!formState.carrierSerialNumber?.trim().length
                              }
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
                              className="h-44px min-w-0 flex-1 rounded-r-sm border border-input-stroke-input bg-input-surface-input-background p-16px outline-none md:w-28 lg:flex-none"
                              placeholder="12345678"
                              disabled={
                                !!formState.otherCertificateNo ||
                                !!formState.carrierSerialNumber?.trim().length
                              }
                            />
                          </div>
                        </div>
                        {/* Info: (20250429 - Anna) or */}
                        <p className="mt-2 flex w-full items-end justify-center text-neutral-400 lg:mx-4 lg:w-3">
                          {t('common:COMMON.OR')}
                        </p>
                        {/* Info: (20250429 - Anna) Other Certificate No.、Carrier Serial No. * */}
                        <div className="flex flex-col gap-2 lg:w-52">
                          <p className="text-sm font-semibold text-neutral-300">
                            {formState.type === InvoiceType.INPUT_22
                              ? t('certificate:EDIT.OTHER_CERTIFICATE_NO')
                              : t('certificate:EDIT.CARRIER_SERIAL_NO')}
                            <span> </span>
                            <span className="text-text-state-error">*</span>
                          </p>
                          {formState.type === InvoiceType.INPUT_22 && (
                            <div className="flex w-full items-center">
                              <input
                                id="other-certificate-no w-full"
                                type="text"
                                value={formState.otherCertificateNo ?? ''}
                                onChange={(e) => {
                                  handleInputChange('otherCertificateNo', e.target.value);
                                }}
                                className="h-44px flex-1 rounded-sm border border-input-stroke-input bg-input-surface-input-background p-16px outline-none lg:w-40"
                                placeholder="CC12345678"
                                disabled={!!formState.no}
                              />
                            </div>
                          )}
                          {formState.type === InvoiceType.INPUT_25 && (
                            <div className="flex items-center">
                              {/* Info: (20250514 - Anna) 載具流水號前綴 */}
                              <input
                                id="carrier-serial-prefix"
                                type="text"
                                maxLength={2}
                                value={formState.carrierSerialNumber?.substring(0, 2) ?? ''}
                                // Info: (20250514 - Anna) 輸入「前綴」時，保留輸入框中「後綴」的值，只更新前綴
                                onChange={(e) => {
                                  const latestNo = formStateRef.current.carrierSerialNumber ?? '';
                                  const suffix = latestNo.substring(2);
                                  handleInputChange(
                                    'carrierSerialNumber',
                                    `${e.target.value.toUpperCase()}${suffix}`
                                  );
                                }}
                                className="h-44px w-16 rounded-l-sm border border-r-0 border-input-stroke-input bg-input-surface-input-background p-16px text-center uppercase outline-none"
                                placeholder="BB"
                                disabled={!!formState.no}
                              />

                              <input
                                id="carrier-serial-number"
                                type="text"
                                maxLength={8}
                                value={formState.carrierSerialNumber?.substring(2) ?? ''}
                                onChange={(e) => {
                                  const latestNo = formStateRef.current.carrierSerialNumber ?? '';
                                  const prefix = latestNo.substring(0, 2);
                                  handleInputChange(
                                    'carrierSerialNumber',
                                    `${prefix}${e.target.value}`
                                  );
                                }}
                                className="h-44px w-full rounded-r-sm border border-input-stroke-input bg-input-surface-input-background p-16px outline-none lg:w-28"
                                placeholder={t('certificate:EDIT.CHARACTERS_8')}
                                disabled={!!formState.no}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ) : // Info: (20250429 - Anna) 格式27
                    formState.type === InvoiceType.INPUT_27 ? (
                      <div className="flex w-full flex-col justify-between lg:flex-row">
                        {/* Info: (20250429 - Anna) Representative Invoice No. */}
                        <div className="flex min-w-0 flex-col gap-2 lg:w-52">
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
                              className="h-44px w-16 rounded-l-sm border border-r-0 border-input-stroke-input bg-input-surface-input-background p-16px text-center uppercase outline-none"
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
                              className="h-44px min-w-0 flex-1 rounded-r-sm border border-input-stroke-input bg-input-surface-input-background p-16px outline-none"
                              placeholder="12345678"
                              disabled={!!formState.otherCertificateNo}
                            />
                          </div>
                        </div>
                        {/* Info: (20250429 - Anna) or */}
                        <p className="mx-4 mt-2 flex items-end justify-center text-neutral-400">
                          {t('common:COMMON.OR')}
                        </p>
                        {/* Info: (20250429 - Anna) Other Certificate No. */}
                        <div className="flex min-w-0 flex-col gap-2">
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
                              className="h-44px min-w-0 flex-1 rounded-sm border border-input-stroke-input bg-input-surface-input-background p-16px outline-none"
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
                            className="h-44px w-14 rounded-l-sm border border-r-0 border-input-stroke-input bg-input-surface-input-background p-16px text-center uppercase outline-none"
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
                            className="h-44px min-w-0 flex-1 rounded-r-sm border border-input-stroke-input bg-input-surface-input-background p-16px outline-none"
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
                      <TaxMenu
                        selectTaxHandler={selectTaxHandler}
                        initialTaxType={formState.taxType}
                      />
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
                {formState.type !== InvoiceType.INPUT_20 &&
                  formState.type !== InvoiceType.INPUT_26 &&
                  formState.type !== InvoiceType.INPUT_27 &&
                  formState.type !== InvoiceType.INPUT_28 && (
                    <CounterpartyInput
                      ref={counterpartyInputRef}
                      counterparty={{
                        taxId: formState.salesIdNumber,
                        name: formState.salesName ?? undefined,
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
                <div className="flex w-full flex-col gap-4 lg:flex-row lg:gap-2">
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
                          src={`/currencies/${currency.toLowerCase()}.svg`}
                          width={16}
                          height={16}
                          alt={currencyAliasImageAlt}
                          className="aspect-square rounded-full object-cover"
                        />
                        <p>{currency}</p>
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
                        {formState.type !== InvoiceType.INPUT_22 &&
                          formState.type !== InvoiceType.INPUT_24 && (
                            <>
                              <span> </span>
                              <span className="text-text-state-error">*</span>
                            </>
                          )}
                      </p>
                      <div className="flex w-full items-center">
                        <NumericInput
                          id="input-tax"
                          name="input-tax"
                          value={formState.taxAmount ?? 0}
                          isDecimal
                          required
                          hasComma
                          className={`h-46px w-full flex-1 rounded-l-sm border border-input-stroke-input bg-input-surface-input-background p-10px text-right text-input-text-primary outline-none`}
                          // Info: (20250516 - Anna) 手動改變稅額時，更新總金額，觸發儲存 API
                          // Info: (20250516 - Anna) 如果輸入的值 value 跟目前的稅額 taxAmount 相同，就什麼都不做
                          triggerWhenChanged={(value: number) => {
                            if (value === (formStateRef.current.taxAmount ?? 0)) return;

                            // Info: (20250516 - Anna) 更新 taxAmount 欄位
                            handleInputChange('taxAmount', value);

                            // Info: (20250516 - Anna) 最新的稅額 + 原本的淨額，算出總金額，更新 totalAmount 欄位。
                            const updatedTotal = (formStateRef.current.netAmount ?? 0) + value;
                            handleInputChange('totalAmount', updatedTotal);

                            // Info: (20250516 - Anna) 如果前一次的 debounce timer 還沒觸發，就清掉，避免多次呼叫 handleSave()
                            if (debounceTimer.current) clearTimeout(debounceTimer.current);

                            // Info: (20250516 - Anna) 設一個新的 timer，如果現在的資料與上一次儲存的不同， 1 秒後觸發儲存
                            debounceTimer.current = setTimeout(() => {
                              const isSame = shallowEqual(
                                formStateRef.current,
                                savedInvoiceRC2Ref.current
                              );
                              const isValid = validateForm();
                              if (!isSame && isValid) {
                                handleSave();
                              }
                            }, 1000);
                          }}
                        />
                        <div className="flex h-46px w-91px min-w-91px items-center gap-4px rounded-r-sm border border-l-0 border-input-stroke-input bg-input-surface-input-background p-14px text-sm text-input-text-input-placeholder">
                          <Image
                            src={`/currencies/${currency.toLowerCase()}.svg`}
                            width={16}
                            height={16}
                            alt={currencyAliasImageAlt}
                            className="aspect-square rounded-full object-cover"
                          />
                          <p>{currency}</p>
                        </div>
                      </div>
                      {(formState.type === InvoiceType.INPUT_22 ||
                        formState.type === InvoiceType.INPUT_27) && (
                        <p className="w-full whitespace-nowrap text-right text-sm font-medium tracking-wide text-neutral-300">
                          {t('certificate:EDIT.DUPLICATE_INVOICE_TAX')}
                        </p>
                      )}
                      {formState.type === InvoiceType.INPUT_24 && (
                        <p className="w-full text-right text-sm font-medium tracking-wide text-neutral-300">
                          {t('certificate:EDIT.SALES_AMOUNT_UNDER_10')}
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
                          src={`/currencies/${currency.toLowerCase()}.svg`}
                          width={16}
                          height={16}
                          alt={currencyAliasImageAlt}
                          className="aspect-square rounded-full object-cover"
                        />
                        <p>{currency}</p>
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

                        // Info: (20250514 - Anna) 勾選完存到後端
                        setTimeout(() => {
                          handleSave();
                        }, 0);
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
            {/* Info: (20250527 - Anna) 刪除、上一筆、下一筆( lg 以上) */}
            <div className="hidden items-center lg:flex">
              {!certificate?.voucherNo && (
                <Button
                  id="certificate-delete-btn"
                  type="button"
                  className="px-16px py-8px"
                  onClick={() => {
                    if (certificate?.id !== undefined) {
                      onDelete(certificate.id);
                    }
                  }}
                  variant="errorOutline"
                >
                  <LuTrash2 size={20} />
                  <p>{t('common:COMMON.DELETE')}</p>
                </Button>
              )}
              <div className="ml-auto flex items-center gap-4">
                {/* Info: (20250801 - Julian) 儲存紐 */}
                <Button
                  type="button"
                  onClick={() => {
                    handleSave();
                    toggleModel();
                  }}
                >
                  <p>{t('common:COMMON.SAVE')}</p>
                </Button>
                {/* ToDo: (20250801 - Julian) 暫時隱藏 */}
                {/* Info: (20250415 - Anna) 上一筆 */}
                {/* <Button
                  type="button"
                  disabled={!hasPrev}
                  onClick={() => setEditingId(certificates[currentIndex - 1].id)}
                  variant="tertiaryOutline"
                  className="px-16px py-8px"
                >
                  <IoArrowBackOutline size={20} />
                  <p>{t('certificate:OUTPUT_CERTIFICATE.PREVIOUS')}</p>
                </Button> */}
                {/* Info: (20250415 - Anna) 下一筆 */}
                {/* <Button
                  onClick={() => setEditingId(certificates[currentIndex + 1].id)}
                  type="button"
                  disabled={!hasNext}
                  variant="tertiary"
                  className="px-16px py-8px"
                >
                  <p>{t('certificate:OUTPUT_CERTIFICATE.NEXT')}</p>
                  <IoArrowForward size={20} />
                </Button> */}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default InputInvoiceEditModal;
