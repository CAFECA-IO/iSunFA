import Image from 'next/image';
import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { IoIosArrowDown } from 'react-icons/io';
import useOuterClick from '@/lib/hooks/use_outer_click';
import NumericInput from '@/components/numeric_input/numeric_input';
import Toggle from '@/components/toggle/toggle';
import { Button } from '@/components/button/button';
import {
  CERTIFICATE_TYPES,
  generateRandomCounterParties,
  ICertificateUI,
  ICounterParty,
  INVOICE_TYPES,
  PARTER_TYPES,
} from '@/interfaces/certificate';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import { IDatePeriod } from '@/interfaces/date_period';
import { inputStyle } from '@/constants/display';
import { FiSearch } from 'react-icons/fi';
import { MessageType } from '@/interfaces/message_modal';
import { useModalContext } from '@/contexts/modal_context';
import AddCounterPartyModal from '@/components/counterparty/add_counterparty_modal';
import { ToastId } from '@/constants/toast_id';
import { ToastType } from '@/interfaces/toastify';
import { RxCross1 } from 'react-icons/rx';
import { BiSave } from 'react-icons/bi';
import { LuTrash2 } from 'react-icons/lu';

interface CertificateEditModalProps {
  isOpen: boolean;
  toggleIsEditModalOpen: (open: boolean) => void; // Info: (20240924 - tzuhan) 關閉模態框的回調函數
  certificate?: ICertificateUI;
  onSave: (data: ICertificateUI) => void; // Info: (20240924 - tzuhan) 保存數據的回調函數
}

const CertificateEditModal: React.FC<CertificateEditModalProps> = ({
  isOpen,
  toggleIsEditModalOpen,
  certificate,
  onSave,
}) => {
  // Info: (20240924 - tzuhan) 不顯示模態框時返回 null
  if (!isOpen || !certificate) return null;

  const { t } = useTranslation(['certificate', 'common']);
  const counterPartyList = generateRandomCounterParties(10);
  const [filteredCounterPartyList, setFilteredCounterPartyList] =
    useState<ICounterParty[]>(counterPartyList);
  const [counterParty, setCounterParty] = useState(certificate.counterParty);
  const [type, setType] = useState(certificate.type);
  const [date, setDate] = useState<IDatePeriod>({
    startTimeStamp: certificate.date,
    endTimeStamp: 0,
  });
  const [invoiceNumber, setInvoiceNumber] = useState(certificate.invoiceNumber);
  const [priceBeforeTax, setPriceBeforeTax] = useState(certificate.priceBeforeTax);
  const [taxRate, setTaxRate] = useState(certificate.taxRate);
  const [taxPrice, setTaxPrice] = useState(certificate.taxPrice);
  const [totalPrice, setTotalPrice] = useState(certificate.totalPrice);
  const [searchName, setSearchName] = useState<string>('');
  const [searchTaxId, setSearchTaxId] = useState<number>(0);
  const [invoiceType, setInvoiceType] = useState(certificate.invoiceType);
  const [deductible, setDeductible] = useState(certificate.deductible);
  const {
    isMessageModalVisible,
    messageModalDataHandler,
    messageModalVisibilityHandler,
    toastHandler,
  } = useModalContext();
  const [isAddCounterPartyModalOpen, setIsAddCounterPartyModalOpen] = useState(false);
  const isFormValid =
    priceBeforeTax > 0 && totalPrice > 0 && counterParty !== null && invoiceNumber !== '';

  const {
    targetRef: taxRateMenuRef,
    componentVisible: isTaxRateMenuOpen,
    setComponentVisible: setIsTaxRateMenuOpen,
  } = useOuterClick<HTMLUListElement>(false);

  const {
    targetRef: invoiceTypeMenuRef,
    componentVisible: isInvoiceTypeMenuOpen,
    setComponentVisible: setIsInvoiceTypeMenuOpen,
  } = useOuterClick<HTMLUListElement>(false);

  const selectTaxHandler = (value: number) => {
    setTaxRate(value);
    setTaxPrice(Math.round((priceBeforeTax * value) / 100));
    setIsTaxRateMenuOpen(false);
  };

  // Info: (20241017 - tzuhan) 參考 AddAssetModal
  const {
    targetRef: counterPartyRef,
    componentVisible: isCounterPartyEditing,
    setComponentVisible: setIsCounterPartyEditing,
  } = useOuterClick<HTMLDivElement>(false);

  const {
    targetRef: counterPartyMenuRef,
    componentVisible: isCounterPartyMenuOpen,
    setComponentVisible: setCounterPartyMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const counterPartyNameInputRef = useRef<HTMLInputElement>(null);
  const counterPartyTaxIdInputRef = useRef<HTMLInputElement>(null);

  const counterPartyEditingHandler = () => {
    setIsCounterPartyEditing(true);
    setCounterPartyMenuOpen(true);
  };

  const onCancelAddCounterParty = () => {
    setIsAddCounterPartyModalOpen(false);
    setIsCounterPartyEditing(false);
    setCounterPartyMenuOpen(false);
    setSearchName('');
    setSearchTaxId(0);
  };

  const CounterPartyItems = filteredCounterPartyList.map((partner) => {
    const counterPartyClickHandler = () => {
      setCounterParty(partner);
      // Info: (20241017 - Tzuhan) 關閉 CounterPartyI Menu 和編輯狀態
      setCounterPartyMenuOpen(false);
      setIsCounterPartyEditing(false);
      // Info: (20241017 - Tzuhan) 重置搜尋關鍵字
      setSearchName('');
      setSearchTaxId(0);
    };

    return (
      <button
        key={partner.id}
        type="button"
        onClick={counterPartyClickHandler}
        className="flex w-full text-left text-sm hover:bg-dropdown-surface-menu-background-secondary"
      >
        <p className="w-100px border-r px-12px py-8px text-dropdown-text-primary">
          {partner.taxId}
        </p>
        <p className="px-12px py-8px text-dropdown-text-secondary">{partner.name}</p>
      </button>
    );
  });

  const DisplayedCounterPartyMenu = (
    <div
      ref={counterPartyMenuRef}
      className={`absolute left-0 top-50px z-30 grid w-full overflow-hidden ${
        isCounterPartyMenuOpen && filteredCounterPartyList.length > 0
          ? 'grid-rows-1'
          : 'grid-rows-0'
      } rounded-sm shadow-dropmenu transition-all duration-150 ease-in-out`}
    >
      <div className="flex max-h-150px flex-col overflow-y-auto rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary py-8px">
        {CounterPartyItems}
      </div>
    </div>
  );

  const counterPartySearchHandler = useCallback(() => {
    if (!searchName && searchTaxId) return;
    messageModalDataHandler({
      messageType: MessageType.INFO,
      title: t('certificate:COUNTERPARTY.TITLE'),
      content: t('certificate:COUNTERPARTY.CONTENT', {
        counterparty: `${searchTaxId} ${searchName}`,
      }),
      backBtnStr: t('certificate:COUNTERPARTY.NO'),
      backBtnFunction: () => {
        onCancelAddCounterParty();
      },
      submitBtnStr: t('certificate:COUNTERPARTY.YES'),
      submitBtnFunction: () => {
        setIsAddCounterPartyModalOpen(true);
      },
    });
    messageModalVisibilityHandler();
  }, [searchName, searchTaxId]);

  const counterPartyInputHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isMessageModalVisible) return;
    setCounterPartyMenuOpen(true);
    if (e.target.id === 'counterparty-taxid') {
      setSearchTaxId(Number(e.target.value));
    }
    if (e.target.id === 'counterparty-name') {
      setSearchName(e.target.value);
    }
    const filteredList = counterPartyList.filter((parter) => {
      // Info: (20241017 - Tzuhan) 編號(數字)搜尋: 字首符合
      if (e.target.value.match(/^\d+$/)) {
        const codeMatch = parter.taxId
          .toString()
          .toLowerCase()
          .startsWith(e.target.value.toLowerCase());
        return codeMatch;
      } else if (e.target.value !== '') {
        // Info: (20241017 - Tzuhan) 名稱搜尋: 部分符合
        const nameMatch = parter.name.toLowerCase().includes(e.target.value.toLowerCase());
        return nameMatch;
      }
      return true;
    });
    setFilteredCounterPartyList(filteredList);
    if (filteredList.length === 0) {
      setCounterPartyMenuOpen(false);
      counterPartySearchHandler();
    }
  };

  const CounterPartyInput = isCounterPartyEditing ? (
    <div className="flex">
      <input
        ref={counterPartyTaxIdInputRef}
        value={searchTaxId}
        id="counterparty-taxid"
        onChange={counterPartyInputHandler}
        type="number"
        placeholder={counterParty.taxId.toString()}
        className="w-100px truncate border-r bg-transparent px-12px py-10px outline-none"
      />
      <input
        ref={counterPartyNameInputRef}
        value={searchName}
        id="counterparty-name"
        onChange={counterPartyInputHandler}
        type="text"
        placeholder={counterParty.name}
        className="truncate bg-transparent px-12px py-10px outline-none"
      />
    </div>
  ) : (
    <p className={`flex truncate text-input-text-input-filled`}>
      <p className="w-100px border-r px-12px py-10px text-dropdown-text-primary">
        {counterParty.taxId}
      </p>
      <p className="px-12px py-10px text-dropdown-text-secondary">{counterParty.name}</p>
    </p>
  );

  // Info: (20240924 - tzuhan) 處理保存
  const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const updatedData = {
      ...certificate,
      type,
      date: date.startTimeStamp,
      invoiceNumber,
      priceBeforeTax,
      taxRate,
      taxPrice,
      totalPrice,
      counterParty,
      invoiceType,
      deductible,
    };
    onSave(updatedData);
    toastHandler({
      id: ToastId.SAVE_CERTIFICATE_SUCCESS,
      type: ToastType.SUCCESS,
      content: t('certificate:EDIT.SUCCESS'),
      closeable: true,
    });
    toggleIsEditModalOpen(false);
  };

  const handleAddCounterParty = (data: {
    name: string;
    taxId: number;
    parterType: PARTER_TYPES;
    note: string;
  }) => {
    filteredCounterPartyList.push({
      ...data,
      id: filteredCounterPartyList.length + 1,
    });
    toastHandler({
      id: ToastId.ADD_COUNTERPARTY_SUCCESS,
      type: ToastType.SUCCESS,
      content: t('certificate:COUNTERPARTY.SUCCESS'),
      closeable: true,
    });
    setIsAddCounterPartyModalOpen(false);
  };

  return (
    <div
      className={`fixed inset-0 z-70 flex items-center justify-center ${isMessageModalVisible || isAddCounterPartyModalOpen ? '' : 'bg-black/50'}`}
    >
      {isAddCounterPartyModalOpen && (
        <AddCounterPartyModal
          onClose={onCancelAddCounterParty}
          onSave={handleAddCounterParty}
          name={searchName}
          taxId={searchTaxId}
        />
      )}
      <form
        className={`relative flex max-h-900px w-90vw max-w-95vw flex-col gap-4 rounded-sm bg-surface-neutral-surface-lv2 px-8 py-4 md:max-h-96vh md:max-w-800px`}
        onSubmit={handleSave}
      >
        {/* Info: (20240924 - tzuhan) 關閉按鈕 */}
        <button
          type="button"
          className="absolute right-4 top-4 text-checkbox-text-primary"
          onClick={() => toggleIsEditModalOpen(false)}
        >
          <RxCross1 size={32} />
        </button>

        <div className="flex w-full flex-col items-center">
          <h2 className="flex justify-center gap-2 text-xl font-semibold">
            {certificate.invoiceName}
            <Image alt="edit" src="/elements/edit.svg" width={16} height={16} />
          </h2>
          <p className="text-xs text-card-text-secondary">{t('certificate:EDIT.HEADER')}</p>
        </div>
        <div className="flex w-full items-start justify-between gap-5 md:flex-row">
          {/* Info: (20240924 - tzuhan) 發票縮略圖 */}
          <Image
            className="h-400px w-250px items-start"
            src={certificate.thumbnailUrl}
            width={250}
            height={400}
            alt="certificate"
            priority
          />
          {/* Info: (20240924 - tzuhan) 編輯表單 */}

          <div className="w-full flex-col items-start space-y-4 overflow-y-scroll">
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
                    onClick={() => setType(CERTIFICATE_TYPES.INPUT)}
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
                    onClick={() => setType(CERTIFICATE_TYPES.OUTPUT)}
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
                  id="invoiceno-id"
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="h-46px flex-1 rounded-sm border border-input-stroke-input bg-input-surface-input-background p-10px outline-none"
                  placeholder="0"
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
                />
                <div className="flex items-center rounded-r-sm border border-l-0 border-input-stroke-input bg-input-surface-input-background p-12px text-sm text-input-text-input-placeholder">
                  <Image
                    src="/currencies/twd.svg"
                    width={16}
                    height={16}
                    alt="twd_icon"
                    className="rounded-full"
                  />
                  <p>{t('common:COMMON.TWD')}</p>
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
                  onClick={() => setIsTaxRateMenuOpen(!isTaxRateMenuOpen)}
                  className={`group relative flex h-46px w-full cursor-pointer md:w-220px ${isTaxRateMenuOpen ? 'border-input-stroke-selected text-dropdown-stroke-input-hover' : 'border-input-stroke-input text-input-text-input-filled'} items-center justify-between rounded-sm border bg-input-surface-input-background p-10px hover:border-input-stroke-selected hover:text-dropdown-stroke-input-hover`}
                >
                  <p className="text-input-text-input-filled">
                    {t('certificate:EDIT.TAXABLE')} {taxRate}%
                  </p>
                  <IoIosArrowDown />
                  <div
                    className={`absolute left-0 top-50px grid w-full grid-cols-1 shadow-dropmenu ${isTaxRateMenuOpen ? 'grid-rows-1 border-dropdown-stroke-menu' : 'grid-rows-0 border-transparent'} overflow-hidden rounded-sm border transition-all duration-300 ease-in-out`}
                  >
                    <ul
                      ref={taxRateMenuRef}
                      className="z-10 flex w-full flex-col items-start gap-2 bg-dropdown-surface-menu-background-primary p-8px"
                    >
                      {[5, 10, 15].map((value) => (
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
                  <div className="flex items-center rounded-r-sm border border-l-0 border-input-stroke-input bg-input-surface-input-background p-12px text-sm text-input-text-input-placeholder">
                    <Image
                      src="/currencies/twd.svg"
                      width={16}
                      height={16}
                      alt="twd_icon"
                      className="rounded-full"
                    />
                    <p>{t('common:COMMON.TWD')}</p>
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
                />
                <div className="flex items-center rounded-r-sm border border-l-0 border-input-stroke-input bg-input-surface-input-background p-12px text-sm text-input-text-input-placeholder">
                  <Image
                    src="/currencies/twd.svg"
                    width={16}
                    height={16}
                    alt="twd_icon"
                    className="rounded-full"
                  />
                  <p>{t('common:COMMON.TWD')}</p>
                </div>
              </div>
            </div>

            {/* Info: (20240924 - tzuhan) CounterParty */}
            <div className="relative flex w-full flex-1 flex-col items-start gap-2">
              <div id="price" className="absolute -top-20"></div>
              <p className="text-sm font-semibold text-input-text-primary">
                {t('certificate:EDIT.COUNTERPARTY')}
                <span className="text-text-state-error">*</span>
              </p>
              <div ref={counterPartyRef} className="relative w-full">
                <div
                  onClick={counterPartyEditingHandler}
                  className={`flex items-center justify-between rounded-sm border ${
                    inputStyle.NORMAL // TODO: (20241017 - tzuhan) isShowTypeHint ? inputStyle.ERROR : inputStyle.NORMAL
                  } bg-input-surface-input-background hover:cursor-pointer`}
                >
                  {CounterPartyInput}
                  <FiSearch
                    size={20}
                    className={`absolute right-3 top-3 cursor-pointer ${!searchName && !searchTaxId ? 'text-input-text-primary' : 'text-input-text-input-filled'}`}
                    onClick={counterPartySearchHandler}
                  />
                </div>
                {DisplayedCounterPartyMenu}
              </div>
            </div>

            {/* Info: (20240924 - tzuhan) Invoice Type */}
            <div className="flex flex-col items-start gap-2">
              <p className="text-sm font-semibold text-input-text-primary">
                {t('certificate:EDIT.INVOICE_TYPE')}
              </p>
              <div className="flex w-full items-center gap-4">
                <div className="flex w-full items-center">
                  <div
                    id="invoice-type-menu"
                    onClick={() => setIsInvoiceTypeMenuOpen(!isTaxRateMenuOpen)}
                    className={`group relative flex h-46px w-full cursor-pointer ${isInvoiceTypeMenuOpen ? 'border-input-stroke-selected text-dropdown-stroke-input-hover' : 'border-input-stroke-input text-input-text-input-filled'} items-center justify-between rounded-sm border bg-input-surface-input-background p-10px hover:border-input-stroke-selected hover:text-dropdown-stroke-input-hover`}
                  >
                    <p>
                      {t(`certificate:TYPE.${invoiceType.toUpperCase()}`)}{' '}
                      {t('certificate:TYPE.UNIFORM_INVOICE')}
                    </p>
                    <IoIosArrowDown />
                    <div
                      className={`absolute left-0 top-50px grid w-full grid-cols-1 shadow-dropmenu ${isInvoiceTypeMenuOpen ? 'grid-rows-1 border-dropdown-stroke-menu' : 'grid-rows-0 border-transparent'} overflow-hidden rounded-sm border transition-all duration-300 ease-in-out`}
                    >
                      <ul
                        ref={invoiceTypeMenuRef}
                        className="z-10 flex w-full flex-col items-start bg-dropdown-surface-menu-background-primary p-8px"
                      >
                        {[
                          INVOICE_TYPES.TRIPLICATE,
                          INVOICE_TYPES.DUPLICATE,
                          INVOICE_TYPES.SPECIAL,
                        ].map((value) => (
                          <li
                            key={`taxable-${value}`}
                            value={value}
                            className="w-full cursor-pointer px-3 py-2 text-dropdown-text-primary hover:text-dropdown-stroke-input-hover"
                            onClick={() => setInvoiceType(value)}
                          >
                            {t(`certificate:TYPE.${value.toUpperCase()}`)}{' '}
                            {t('certificate:TYPE.UNIFORM_INVOICE')}
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
              onClick={() => toggleIsEditModalOpen(false)}
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
              onClick={() => toggleIsEditModalOpen(false)}
              variant="tertiaryOutline"
            >
              <p>{t('common:COMMON.CANCEL')}</p>
              <BiSave size={20} />
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
