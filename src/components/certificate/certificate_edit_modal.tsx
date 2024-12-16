import Image from 'next/image';
import React, { useRef, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { FaChevronDown } from 'react-icons/fa6';
import useOuterClick from '@/lib/hooks/use_outer_click';
import NumericInput from '@/components/numeric_input/numeric_input';
import Toggle from '@/components/toggle/toggle';
import { Button } from '@/components/button/button';
import { InvoiceTransactionDirection, InvoiceType } from '@/constants/invoice';
import { ICounterparty } from '@/interfaces/counterparty';
import { ICertificate, ICertificateUI } from '@/interfaces/certificate';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import { IDatePeriod } from '@/interfaces/date_period';
import { useModalContext } from '@/contexts/modal_context';
import { IoCloseOutline } from 'react-icons/io5';
import { BiSave } from 'react-icons/bi';
import { LuTrash2 } from 'react-icons/lu';
import { CurrencyType } from '@/constants/currency';
import CounterpartyInput, { CounterpartyInputRef } from '@/components/voucher/counterparty_input';
import EditableFilename from '@/components/certificate/edible_file_name';

interface CertificateEditModalProps {
  isOpen: boolean;
  toggleModel: () => void; // Info: (20240924 - tzuhan) 關閉模態框的回調函數
  currencyAlias: CurrencyType;
  certificate?: ICertificateUI;
  onUpdateFilename: (certificateId: number, name: string) => void;
  onSave: (data: ICertificate) => Promise<void>; // Info: (20240924 - tzuhan) 保存數據的回調函數
  onDelete: (id: number) => void;
}

const CertificateEditModal: React.FC<CertificateEditModalProps> = ({
  isOpen,
  toggleModel,
  currencyAlias,
  certificate,
  onUpdateFilename,
  onSave,
  onDelete,
}) => {
  const counterpartyInputRef = useRef<CounterpartyInputRef>(null);
  // Info: (20240924 - tzuhan) 不顯示模態框時返回 null
  if (!isOpen || !certificate) return null;
  const { t } = useTranslation(['certificate', 'common', 'filter_section_type']);
  const [certificateFilename, setCertificateFilename] = useState<string>(certificate.file.name);
  const [counterParty, setCounterParty] = useState<ICounterparty | undefined>(
    certificate.invoice.counterParty
  );
  const [type, setType] = useState<InvoiceTransactionDirection>(
    certificate.invoice.inputOrOutput ?? InvoiceTransactionDirection.INPUT
  );
  const [date, setDate] = useState<IDatePeriod>({
    startTimeStamp: certificate.invoice?.date ?? 0,
    endTimeStamp: 0,
  });
  const [certificateNo, setCertificateNo] = useState<string>(certificate.invoice.no ?? '');
  const [priceBeforeTax, setPriceBeforeTax] = useState<number>(
    certificate.invoice.priceBeforeTax ?? 0
  );
  const [taxRatio, setTaxRatio] = useState<number>(certificate.invoice.taxRatio ?? 5);
  const [taxPrice, setTaxPrice] = useState<number>(certificate.invoice.taxPrice ?? 0);
  const [totalPrice, setTotalPrice] = useState<number>(certificate.invoice.totalPrice ?? 0);
  const [invoiceType, setInvoiceType] = useState<InvoiceType>(
    certificate.invoice.type ?? InvoiceType.SALES_NON_UNIFORM_INVOICE
  );
  const [deductible, setDeductible] = useState<boolean>(!!certificate.invoice.deductible);
  const { isMessageModalVisible } = useModalContext();
  //  const [isAddCounterPartyModalOpen, setIsAddCounterPartyModalOpen] = useState(false);
  const isFormValid = priceBeforeTax > 0 && totalPrice > 0 && certificateNo !== '';

  const {
    targetRef: taxRatioMenuRef,
    componentVisible: isTaxRatioMenuOpen,
    setComponentVisible: setIsTaxRatioMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const {
    targetRef: invoiceTypeMenuRef,
    componentVisible: isInvoiceTypeMenuOpen,
    setComponentVisible: setIsInvoiceTypeMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const invoiceTypeMenuClickHandler = () => {
    setIsInvoiceTypeMenuOpen(!isInvoiceTypeMenuOpen);
  };

  const invoiceTypeMenuOptionClickHandler = (id: InvoiceType) => {
    setInvoiceType(id);
    setIsInvoiceTypeMenuOpen(false);
  };

  const selectTaxHandler = (value: number) => {
    setTaxRatio(value);
    const updateTaxPrice = Math.round((priceBeforeTax * value) / 100);
    setTaxPrice(updateTaxPrice);
    setTotalPrice(priceBeforeTax + updateTaxPrice);
    setIsTaxRatioMenuOpen(false);
  };

  const priceBeforeTaxChangeHandler = (value: number) => {
    setPriceBeforeTax(value);
    const updateTaxPrice = Math.round((value * taxRatio) / 100);
    setTaxPrice(updateTaxPrice);
    setTotalPrice(value + updateTaxPrice);
  };

  const totalPriceChangeHandler = (value: number) => {
    setTotalPrice(value);
    const ratio = (100 + taxRatio) / 100;
    const updatePriceBeforeTax = Math.round(value / ratio);
    setPriceBeforeTax(updatePriceBeforeTax);
    const updateTaxPrice = value - updatePriceBeforeTax;
    setTaxPrice(updateTaxPrice);
  };

  // Info: (20241206 - Julian) currency alias setting
  const currencyAliasImageSrc = `/currencies/${(certificate.invoice?.currencyAlias || currencyAlias).toLowerCase()}.svg`;
  const currencyAliasImageAlt = `currency-${(certificate.invoice?.currencyAlias || currencyAlias).toLowerCase()}-icon`;
  const currencyAliasStr = t(
    `certificate:CURRENCY_ALIAS.${(certificate.invoice?.currencyAlias || currencyAlias).toUpperCase()}`
  );

  // Info: (20240924 - tzuhan) 處理保存
  const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (counterpartyInputRef.current) {
      counterpartyInputRef.current.triggerSearch();
    }
  };

  const onTriggerSave = async () => {
    const updatedData: ICertificate = {
      ...certificate,
      invoice: {
        ...certificate.invoice,
        inputOrOutput: type,
        date: date.startTimeStamp,
        no: certificateNo,
        priceBeforeTax,
        taxRatio,
        taxPrice,
        totalPrice,
        counterParty,
        type: invoiceType,
        deductible,
      },
    };
    await onSave(updatedData);
    toggleModel();
  };

  return (
    <div
      className={`fixed inset-0 z-70 flex items-center justify-center ${isMessageModalVisible ? '' : 'bg-black/50'}`}
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
        {/* eslint-disable-next-line tailwindcss/no-custom-classname */}
        <div className="hide-scrollbar flex w-full items-start justify-between gap-5 overflow-y-scroll md:flex-row">
          {/* Info: (20240924 - tzuhan) 發票縮略圖 */}
          <Image
            className="h-310px w-210px min-w-210px items-start"
            src={certificate.file.url}
            width={210}
            height={310}
            alt="certificate"
            priority
          />
          {/* Info: (20240924 - tzuhan) 編輯表單 */}

          {/* Info: (20241210 - tzuhan) 隱藏 scrollbar */}
          {/* eslint-disable-next-line tailwindcss/no-custom-classname */}
          <div className="hide-scrollbar flex h-600px w-full flex-col items-start space-y-4 overflow-y-scroll pb-80px">
            {/* Info: (20240924 - tzuhan) 切換輸入/輸出 */}
            <div className="flex flex-col items-start gap-2">
              <p className="text-sm font-semibold text-input-text-primary">
                {t('certificate:EDIT.TYPE')}
              </p>
              <div className="flex flex-row items-start gap-20">
                <label
                  htmlFor="invoice-input"
                  className="flex flex-row items-center gap-2 whitespace-nowrap text-checkbox-text-primary"
                >
                  <input
                    type="radio"
                    id="invoice-input"
                    name="invoice-type"
                    className="relative h-16px w-16px appearance-none rounded-full border border-checkbox-stroke-unselected bg-white outline-none after:absolute after:left-1/2 after:top-1/2 after:-ml-5px after:-mt-5px after:hidden after:h-10px after:w-10px after:rounded-full after:bg-checkbox-stroke-unselected checked:after:block"
                    defaultChecked
                    onClick={() => setType(InvoiceTransactionDirection.INPUT)}
                  />
                  <p>{t('certificate:EDIT.INPUT')}</p>
                </label>
                <label
                  htmlFor="invoice-output"
                  className="flex flex-row items-center gap-2 whitespace-nowrap text-checkbox-text-primary"
                >
                  <input
                    type="radio"
                    id="invoice-output"
                    name="invoice-type"
                    className="relative h-16px w-16px appearance-none rounded-full border border-checkbox-stroke-unselected bg-white outline-none after:absolute after:left-1/2 after:top-1/2 after:-ml-5px after:-mt-5px after:hidden after:h-10px after:w-10px after:rounded-full after:bg-checkbox-stroke-unselected checked:after:block"
                    onClick={() => setType(InvoiceTransactionDirection.OUTPUT)}
                  />
                  <p>{t('certificate:EDIT.OUTPUT')}</p>
                </label>
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
                btnClassName=""
              />
            </div>

            {/* Info: (20240924 - tzuhan) Invoice Number */}
            <div className="relative flex w-full flex-1 flex-col items-start gap-2">
              <div id="price" className="absolute -top-20"></div>
              <p className="text-sm font-semibold text-input-text-primary">
                {t('certificate:EDIT.INVOICE_NUMBER')}
                <span className="text-text-state-error">*</span>
              </p>
              <div className="flex w-full items-center">
                <input
                  id="invoiceno"
                  type="text"
                  value={certificateNo}
                  onChange={(e) => setCertificateNo(e.target.value)}
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
                  value={priceBeforeTax}
                  setValue={setPriceBeforeTax}
                  isDecimal
                  required
                  hasComma
                  className="h-46px flex-1 rounded-l-sm border border-input-stroke-input bg-input-surface-input-background p-10px outline-none"
                  triggerWhenChanged={priceBeforeTaxChangeHandler}
                />
                <div className="flex h-46px items-center gap-4px rounded-r-sm border border-l-0 border-input-stroke-input bg-input-surface-input-background p-14px text-sm text-input-text-input-placeholder">
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

            {/* Info: (20240924 - tzuhan) Tax */}
            <div className="flex w-full flex-col items-start gap-2">
              <p className="text-sm font-semibold text-input-text-primary">
                {t('certificate:EDIT.TAX')}
                <span className="text-text-state-error">*</span>
              </p>
              <div className="flex w-full items-center gap-2">
                <div
                  id="tax-rate-menu"
                  ref={taxRatioMenuRef}
                  onClick={() => setIsTaxRatioMenuOpen(!isTaxRatioMenuOpen)}
                  className={`group relative flex h-46px w-full cursor-pointer md:w-220px ${isTaxRatioMenuOpen ? 'border-input-stroke-selected text-dropdown-stroke-input-hover' : 'border-input-stroke-input text-input-text-input-filled'} items-center justify-between rounded-sm border bg-input-surface-input-background p-10px hover:border-input-stroke-selected hover:text-dropdown-stroke-input-hover`}
                >
                  <p className="text-input-text-input-filled">
                    {t('certificate:EDIT.TAXABLE')} {taxRatio}%
                  </p>
                  <div className="flex h-20px w-20px items-center justify-center">
                    <FaChevronDown
                      className={`transition-transform duration-300 ${
                        isTaxRatioMenuOpen ? 'rotate-180' : 'rotate-0'
                      }`}
                    />
                  </div>
                  <div
                    className={`absolute left-0 top-50px grid w-full grid-cols-1 shadow-dropmenu ${isTaxRatioMenuOpen ? 'grid-rows-1 border-dropdown-stroke-menu' : 'grid-rows-0 border-transparent'} overflow-hidden rounded-sm border transition-all duration-300 ease-in-out`}
                  >
                    <ul className="z-10 flex w-full flex-col items-start gap-2 bg-dropdown-surface-menu-background-primary p-8px">
                      {[0, 5, 10, 15].map((value) => (
                        <li
                          key={`taxable-${value}`}
                          value={value}
                          className="w-full cursor-pointer px-3 py-2 text-dropdown-text-primary hover:text-dropdown-stroke-input-hover"
                          onClick={selectTaxHandler.bind(null, value)}
                        >
                          {t('certificate:EDIT.TAXABLE')} {value}%
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="flex w-full items-center">
                  <NumericInput
                    id="input-tax"
                    name="input-tax"
                    value={taxPrice}
                    setValue={setTaxPrice}
                    isDecimal
                    required
                    hasComma
                    className="h-46px flex-1 rounded-l-sm border border-input-stroke-input bg-input-surface-input-background p-10px outline-none"
                  />
                  <div className="flex h-46px items-center gap-4px rounded-r-sm border border-l-0 border-input-stroke-input bg-input-surface-input-background p-14px text-sm text-input-text-input-placeholder">
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
                  value={totalPrice}
                  setValue={setTotalPrice}
                  isDecimal
                  required
                  hasComma
                  className="h-46px flex-1 rounded-l-sm border border-input-stroke-input bg-input-surface-input-background p-10px outline-none"
                  triggerWhenChanged={totalPriceChangeHandler}
                />
                <div className="flex h-46px items-center gap-4px rounded-r-sm border border-l-0 border-input-stroke-input bg-input-surface-input-background p-14px text-sm text-input-text-input-placeholder">
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

            {/* Info: (20240924 - tzuhan) CounterParty */}
            <CounterpartyInput
              ref={counterpartyInputRef}
              counterparty={counterParty}
              setCounterparty={setCounterParty}
              onTriggerSave={onTriggerSave}
            />

            {/* Info: (20240924 - tzuhan) Invoice Type */}
            <div className="flex flex-col items-start gap-2">
              <p className="text-sm font-semibold text-input-text-primary">
                {t('certificate:EDIT.INVOICE_TYPE')}
              </p>
              <div className="flex w-full items-center gap-4">
                <div className="flex w-full min-w-300px items-center justify-between">
                  <div
                    ref={invoiceTypeMenuRef}
                    id="invoice-type-menu"
                    onClick={invoiceTypeMenuClickHandler}
                    className={`group relative flex h-46px w-full cursor-pointer ${isInvoiceTypeMenuOpen ? 'border-input-stroke-selected text-dropdown-stroke-input-hover' : 'border-input-stroke-input text-input-text-input-filled'} items-center justify-between rounded-sm border bg-input-surface-input-background p-10px hover:border-input-stroke-selected hover:text-dropdown-stroke-input-hover`}
                  >
                    {/* Info: (20241210 - tzuhan) 隱藏 scrollbar */}
                    {/* eslint-disable-next-line tailwindcss/no-custom-classname */}
                    <p className="hide-scrollbar flex h-46px items-center gap-1 overflow-y-scroll">
                      <span>{t(`filter_section_type:FILTER_SECTION_TYPE.${invoiceType}`)}</span>
                      <div className="flex h-20px w-20px items-center justify-center">
                        <FaChevronDown
                          className={`transition-transform duration-300 ${
                            isInvoiceTypeMenuOpen ? 'rotate-180' : 'rotate-0'
                          }`}
                        />
                      </div>
                    </p>
                    <div
                      className={`absolute left-0 top-50px grid w-full grid-cols-1 shadow-dropmenu ${isInvoiceTypeMenuOpen ? 'grid-rows-1 border-dropdown-stroke-menu' : 'grid-rows-0 border-transparent'} overflow-hidden rounded-sm border transition-all duration-300 ease-in-out`}
                    >
                      <ul className="z-10 flex w-full flex-col items-start bg-dropdown-surface-menu-background-primary p-8px">
                        {Object.values(InvoiceType).map((value) => (
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
                    initialToggleState={deductible}
                    getToggledState={() => setDeductible(!deductible)}
                    toggleStateFromParent={deductible}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Info: (20240924 - tzuhan) Save 按鈕 */}
        <div className="flex items-center">
          {certificate.voucherNo && (
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
              disabled={!isFormValid}
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
