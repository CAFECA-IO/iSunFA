import Image from 'next/image';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { FaChevronDown } from 'react-icons/fa6';
import useOuterClick from '@/lib/hooks/use_outer_click';
import NumericInput from '@/components/numeric_input/numeric_input';
import Toggle from '@/components/toggle/toggle';
import { Button } from '@/components/button/button';
import { InvoiceTransactionDirection, InvoiceType } from '@/constants/invoice';
import { ICounterparty, ICounterpartyOptional } from '@/interfaces/counterparty';
import { ICertificate, ICertificateUI } from '@/interfaces/certificate';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import { IDatePeriod } from '@/interfaces/date_period';
import { useModalContext } from '@/contexts/modal_context';
import { IoCloseOutline } from 'react-icons/io5';
import { BiSave } from 'react-icons/bi';
import { LuTrash2 } from 'react-icons/lu';
import { CurrencyType } from '@/constants/currency';
import CounterpartyInput, {
  CounterpartyInputRef,
} from '@/components/certificate/counterparty_input';
import EditableFilename from '@/components/certificate/edible_file_name';
import Magnifier from '@/components/magnifier/magifier';
import { IInvoiceBetaOptional } from '@/interfaces/invoice';
import APIHandler from '@/lib/utils/api_handler';
import { IAccountingSetting, ITaxSetting } from '@/interfaces/accounting_setting';
import { APIName } from '@/constants/api_connection';
import TaxMenu from '@/components/certificate/certificate_tax_menu';
import { IPaginatedData } from '@/interfaces/pagination';

interface CertificateEditModalProps {
  isOpen: boolean;
  accountBookId: number;
  toggleModel: () => void; // Info: (20240924 - tzuhan) 關閉模態框的回調函數
  currencyAlias: CurrencyType;
  certificate?: ICertificateUI;
  onUpdateFilename: (certificateId: number, name: string) => void;
  onSave: (data: ICertificate) => Promise<void>; // Info: (20240924 - tzuhan) 保存數據的回調函數
  onDelete: (id: number) => void;
}

const CertificateEditModal: React.FC<CertificateEditModalProps> = ({
  isOpen,
  accountBookId,
  toggleModel,
  currencyAlias,
  certificate,
  onUpdateFilename,
  onSave,
  onDelete,
}) => {
  const selectableInvoiceType = Object.values(InvoiceType).filter(
    (type) => type !== InvoiceType.ALL
  );
  const counterpartyInputRef = useRef<CounterpartyInputRef>(null);
  const { t } = useTranslation(['certificate', 'common', 'filter_section_type']);
  const [taxSetting, setTaxSetting] = useState<ITaxSetting>();
  const { trigger: getAccountSetting } = APIHandler<IAccountingSetting>(
    APIName.ACCOUNTING_SETTING_GET
  );
  const { trigger: getCounterpartyList } = APIHandler<IPaginatedData<ICounterparty[]>>(
    APIName.COUNTERPARTY_LIST
  );
  const [counterpartyList, setCounterpartyList] = useState<ICounterparty[]>([]);
  // Info: (20240924 - tzuhan) 不顯示模態框時返回 null
  if (!isOpen || !certificate) return null;
  const [certificateFilename, setCertificateFilename] = useState<string>(certificate.file.name);
  const [date, setDate] = useState<IDatePeriod>({
    startTimeStamp: certificate.invoice?.date ?? 0,
    endTimeStamp: 0,
  });
  const { isMessageModalVisible } = useModalContext();
  //  const [isAddCounterPartyModalOpen, setIsAddCounterPartyModalOpen] = useState(false);
  const [formState, setFormState] = useState(
    () =>
      ({
        inputOrOutput: certificate.invoice.inputOrOutput ?? InvoiceTransactionDirection.INPUT,
        date: certificate.invoice.date,
        no: certificate.invoice.no,
        priceBeforeTax: certificate.invoice.priceBeforeTax,
        taxRatio: certificate.invoice.taxRatio,
        taxPrice: certificate.invoice.taxPrice,
        totalPrice: certificate.invoice.totalPrice,
        counterParty: certificate.invoice.counterParty,
        type: certificate.invoice.type ?? InvoiceType.SALES_NON_UNIFORM_INVOICE,
        deductible: certificate.invoice.deductible,
      }) as IInvoiceBetaOptional
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const { date: selectedDate, priceBeforeTax, totalPrice, counterParty } = formState;

    if (!selectedDate || selectedDate <= 0) {
      newErrors.date = t('certificate:ERROR.PLEASE_FILL_UP_THIS_FORM'); // Info: (20250106 - tzuhan) 備用 t('certificate:ERROR.REQUIRED_DATE');
    }
    if (!priceBeforeTax || priceBeforeTax <= 0) {
      newErrors.priceBeforeTax = t('certificate:ERROR.PLEASE_FILL_UP_THIS_FORM'); // Info: (20250106 - tzuhan) 備用 t('certificate:ERROR.REQUIRED_PRICE');
    }
    if (!totalPrice || totalPrice <= 0) {
      newErrors.totalPrice = t('certificate:ERROR.PLEASE_FILL_UP_THIS_FORM'); // Info: (20250106 - tzuhan) 備用 t('certificate:ERROR.REQUIRED_TOTAL');
    }
    if (!counterParty?.name) {
      newErrors.counterParty = t('certificate:ERROR.REQUIRED_COUNTERPARTY_NAME'); // Info: (20250106 - tzuhan) 備用 t('certificate:ERROR.REQUIRED_COUNTERPARTY');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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
      setFormState((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const getSettingTaxRatio = useCallback(async () => {
    const { success, data } = await getAccountSetting({
      params: { accountBookId },
    });
    if (success && data) {
      setTaxSetting(data.taxSettings);
      if (formState.taxRatio === undefined) {
        if (formState.inputOrOutput === InvoiceTransactionDirection.INPUT) {
          handleInputChange('taxRatio', data.taxSettings.salesTax.rate * 100);
        } else if (formState.inputOrOutput === InvoiceTransactionDirection.OUTPUT) {
          handleInputChange('taxRatio', data.taxSettings.purchaseTax.rate * 100);
        } else {
          handleInputChange('taxRatio', 0);
        }
      }
    }
  }, [accountBookId, formState.inputOrOutput, formState.taxRatio]);

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

  const totalPriceChangeHandler = (value: number) => {
    handleInputChange('totalPrice', value);
    const ratio = (100 + (formState.taxRatio ?? 0)) / 100;
    const updatePriceBeforeTax = Math.round(value / ratio);
    handleInputChange('priceBeforeTax', updatePriceBeforeTax);
    const updateTaxPrice = value - updatePriceBeforeTax;
    handleInputChange('taxPrice', updateTaxPrice);
  };

  const handeInputOrOutputChange = (value: InvoiceTransactionDirection) => {
    handleInputChange('inputOrOutput', value);
    if (taxSetting) {
      if (formState.inputOrOutput === InvoiceTransactionDirection.INPUT) {
        handleInputChange('taxRatio', taxSetting.salesTax.rate * 100);
      } else if (formState.inputOrOutput === InvoiceTransactionDirection.OUTPUT) {
        handleInputChange('taxRatio', taxSetting.purchaseTax.rate * 100);
      } else {
        handleInputChange('taxRatio', 0);
      }
    }
  };

  // Info: (20241206 - Julian) currency alias setting
  const currencyAliasImageSrc = `/currencies/${(certificate.invoice?.currencyAlias || currencyAlias).toLowerCase()}.svg`;
  const currencyAliasImageAlt = `currency-${(certificate.invoice?.currencyAlias || currencyAlias).toLowerCase()}-icon`;
  const currencyAliasStr = t(
    `common:CURRENCY_ALIAS.${(certificate.invoice?.currencyAlias || currencyAlias).toUpperCase()}`
  );

  const formStateRef = useRef(formState);

  useEffect(() => {
    formStateRef.current = formState;
  }, [formState]);

  useEffect(() => {
    getSettingTaxRatio();
    listCounterparty();
  }, []);

  // Info: (20240924 - tzuhan) 處理保存
  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;
    const updatedData: ICertificate = {
      ...certificate,
      invoice: {
        ...certificate.invoice,
        ...formStateRef.current,
      },
    };
    await onSave(updatedData);
    toggleModel();
    if (counterpartyInputRef.current) {
      counterpartyInputRef.current.triggerSearch();
    }
  };

  return (
    <div
      className={`fixed inset-0 z-120 flex items-center justify-center ${isMessageModalVisible ? '' : 'bg-black/50'}`}
    >
      <form
        className={`relative flex max-h-900px w-90vw max-w-95vw flex-col gap-4 overflow-y-hidden rounded-sm bg-surface-neutral-surface-lv2 px-8 py-4 md:max-h-96vh md:max-w-800px`}
        onSubmit={handleSave}
      >
        {/* Info: (20240924 - tzuhan) 關閉按鈕 */}
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

        {/* Info: (20241210 - tzuhan) 隱藏 scrollbar */}
        <div className="hide-scrollbar flex w-full items-start justify-between gap-5 overflow-y-scroll md:flex-row">
          {/* Info: (20240924 - tzuhan) 發票縮略圖 */}
          <Magnifier
            imageUrl={certificate.file.thumbnail?.url || certificate.file.url}
            className="w-210px min-w-210px"
          />
          {/* Info: (20240924 - tzuhan) 編輯表單 */}

          {/* Info: (20241210 - tzuhan) 隱藏 scrollbar */}
          <div className="hide-scrollbar flex h-600px w-full flex-col items-start space-y-4 overflow-y-scroll pb-80px">
            {/* Info: (20240924 - tzuhan) 切換輸入/輸出 */}
            <div className="flex flex-col items-start gap-2">
              <p className="text-sm font-semibold text-input-text-primary">
                {t('certificate:EDIT.TYPE')}
              </p>
              <div className="flex flex-row items-start gap-20">
                {Object.values(InvoiceTransactionDirection).map((value) => (
                  <label
                    key={value}
                    htmlFor={`invoice-${value}`}
                    className="flex flex-row items-center gap-2 whitespace-nowrap text-checkbox-text-primary"
                  >
                    <input
                      type="radio"
                      id={`invoice-${value}`}
                      name="invoice-type"
                      className="relative h-16px w-16px appearance-none rounded-full border border-checkbox-stroke-unselected bg-white outline-none after:absolute after:left-1/2 after:top-1/2 after:-ml-5px after:-mt-5px after:hidden after:h-10px after:w-10px after:rounded-full after:bg-checkbox-stroke-unselected checked:after:block"
                      defaultChecked={formState.inputOrOutput === value}
                      onClick={() => handeInputOrOutputChange(value)}
                    />
                    <p>{t(`certificate:EDIT.${value.toUpperCase()}`)}</p>
                  </label>
                ))}
              </div>
            </div>

            {/* Info: (20240924 - tzuhan) Invoice Date */}
            <div className="flex flex-col items-start gap-2">
              <p className="text-sm font-semibold text-input-text-primary">
                {t('certificate:EDIT.DATE')}
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

            {/* Info: (20240924 - tzuhan) Invoice Number */}
            <div className="relative flex w-full flex-1 flex-col items-start gap-2">
              <div id="price" className="absolute -top-20"></div>
              <p className="text-sm font-semibold text-input-text-primary">
                {t('certificate:EDIT.INVOICE_NUMBER')}
                {/* <span className="text-text-state-error">*</span> */}
              </p>
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
            </div>
            {/* Info: (20240924 - tzuhan) Price Before Tax */}
            <div className="relative flex w-full flex-1 flex-col items-start gap-2">
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

            {/* Info: (20240924 - tzuhan) Tax */}
            <div className="flex w-full flex-col items-start gap-2">
              <p className="text-sm font-semibold text-input-text-primary">
                {t('certificate:EDIT.TAX')}
                <span className="text-text-state-error">*</span>
              </p>
              <div className="flex w-full items-center gap-2">
                <TaxMenu selectTaxHandler={selectTaxHandler} />
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
              {errors.taxPrice && (
                <p className="-translate-y-1 self-end text-sm text-text-state-error">
                  {errors.taxPrice}
                </p>
              )}
            </div>

            {/* Info: (20240924 - tzuhan) Total Price */}
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

            {/* Info: (20240924 - tzuhan) CounterParty */}
            <CounterpartyInput
              ref={counterpartyInputRef}
              counterparty={formState.counterParty}
              counterpartyList={counterpartyList}
              onSelect={(cp: ICounterpartyOptional) => handleInputChange('counterParty', cp)}
            />
            {errors.counterParty && (
              <p className="-translate-y-1 self-end text-sm text-text-state-error">
                {errors.counterParty}
              </p>
            )}

            {/* Info: (20240924 - tzuhan) Invoice Type */}
            <div className="flex flex-col items-start gap-2">
              <p className="text-sm font-semibold text-input-text-primary">
                {t('certificate:EDIT.INVOICE_TYPE')}
              </p>
              <div className="flex w-full items-center gap-4">
                <div className="flex w-full">
                  <div
                    ref={invoiceTypeMenuRef}
                    id="invoice-type-menu"
                    onClick={invoiceTypeMenuClickHandler}
                    className={`group relative flex h-46px w-full cursor-pointer ${isInvoiceTypeMenuOpen ? 'border-input-stroke-selected text-dropdown-stroke-input-hover' : 'border-input-stroke-input text-input-text-input-filled'} items-center justify-between rounded-sm border bg-input-surface-input-background p-10px hover:border-input-stroke-selected hover:text-dropdown-stroke-input-hover`}
                  >
                    <p className="flex h-46px min-w-300px items-center justify-between">
                      <span className="h-24px w-280px overflow-hidden">
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
                      <ul className="z-10 flex w-full flex-col items-start bg-dropdown-surface-menu-background-primary p-8px">
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
                {/* Info: (20240924 - tzuhan) Deductible */}
                <div className="flex min-w-150px items-center justify-end gap-2 text-switch-text-primary">
                  <p>{t('certificate:EDIT.DEDUCTIBLE')}</p>
                  <Toggle
                    id="tax-toggle"
                    initialToggleState={formState.deductible}
                    getToggledState={() => handleInputChange('deductible', !formState.deductible)}
                    toggleStateFromParent={formState.deductible}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Info: (20240924 - tzuhan) Save 按鈕 */}
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
            <Button
              id="certificate-cancel-btn"
              type="button"
              className="px-16px py-8px"
              onClick={toggleModel}
              variant="tertiaryOutline"
            >
              <p>{t('common:COMMON.CANCEL')}</p>
            </Button>
            <Button
              id="certificate-save-btn"
              type="submit"
              variant="tertiary"
              className="px-16px py-8px"
            >
              <p>{t('common:COMMON.SAVE')}</p>
              <BiSave size={20} />
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CertificateEditModal;
