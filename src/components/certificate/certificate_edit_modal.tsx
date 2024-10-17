import Image from 'next/image';
import React, { useRef, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { IoIosArrowDown } from 'react-icons/io';
import useOuterClick from '@/lib/hooks/use_outer_click';
import NumericInput from '@/components/numeric_input/numeric_input';
import Toggle from '@/components/toggle/toggle';
import Modal from '@/components/modal/modal';
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
import { default30DayPeriodInSec, inputStyle } from '@/constants/display';
import { FiSearch } from 'react-icons/fi';
import { MessageType } from '@/interfaces/message_modal';
import { useModalContext } from '@/contexts/modal_context';
import { RxCross1 } from 'react-icons/rx';
import { BiSave } from 'react-icons/bi';
import { ToastId } from '@/constants/toast_id';
import { ToastType } from '@/interfaces/toastify';
import { FaChevronDown } from 'react-icons/fa6';

interface AddCounterPartyModalProps {
  onClose: () => void;
}

const AddCounterPartyModal: React.FC<AddCounterPartyModalProps> = ({ onClose }) => {
  const { t } = useTranslation(['common', 'certificate']);
  const [inputName, setInputName] = useState<string>('');
  const [inputTaxId, setInputTaxId] = useState<number>(0);
  const [inputType, setInputType] = useState<null | PARTER_TYPES>(null);
  const [inputNote, setInputNote] = useState<string>('');
  const [showHint, setShowHint] = useState(false);
  const { toastHandler } = useModalContext();

  const {
    targetRef: typeRef,
    componentVisible: isTypeSelecting,
    setComponentVisible: setIsTypeSelecting,
  } = useOuterClick<HTMLDivElement>(false);

  const {
    targetRef: typeMenuRef,
    componentVisible: isTypeMenuOpen,
    setComponentVisible: setTypeMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const selectTypeHandler = () => {
    setIsTypeSelecting(true);
    setTypeMenuOpen(true);
  };

  const typeItems = [PARTER_TYPES.BOTH, PARTER_TYPES.CLIENT, PARTER_TYPES.SUPPLIER].map((type) => {
    const accountClickHandler = () => {
      setInputType(type);
      setTypeMenuOpen(false);
      setIsTypeSelecting(false);
    };

    return (
      <button
        key={type}
        type="button"
        onClick={accountClickHandler}
        className="flex w-full gap-8px px-12px py-8px text-left text-sm hover:bg-dropdown-surface-menu-background-secondary"
      >
        <p className="text-dropdown-text-secondary">
          {t(`certificate:COUNTERPARTY.${type.toUpperCase()}`)}
        </p>
      </button>
    );
  });

  const displayedTypeMenu = (
    <div
      ref={typeMenuRef}
      className={`absolute left-0 top-50px z-30 grid w-full overflow-hidden ${
        isTypeMenuOpen ? 'grid-rows-1' : 'grid-rows-0'
      } rounded-sm shadow-dropmenu transition-all duration-150 ease-in-out`}
    >
      <div className="flex max-h-150px flex-col overflow-y-auto rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px">
        {typeItems}
      </div>
    </div>
  );

  const nameChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputName(event.target.value);
  };

  const noteChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputNote(event.target.value);
  };

  const addNewCounterParterHandler = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!inputName || !inputTaxId || !inputType) {
      setShowHint(true);
    } else {
      toastHandler({
        id: ToastId.ADD_COUNTERPARTY_SUCCESS,
        type: ToastType.SUCCESS,
        content: t('certificate:COUNTERPARTY.SUCCESS'),
        closeable: true,
      });
    }
  };

  return (
    <div className="relative flex max-h-450px w-90vw max-w-800px flex-col rounded-sm bg-surface-neutral-surface-lv2 p-20px md:max-h-90vh">
      <div className="relative flex max-h-450px w-90vw max-w-800px flex-col rounded-sm bg-surface-neutral-surface-lv2 p-20px md:max-h-90vh">
        {/* Info: (20240924 - tzuhan) 關閉按鈕 */}
        <button
          type="button"
          className="absolute right-4 top-4 text-checkbox-text-primary"
          onClick={onClose}
        >
          <RxCross1 size={32} />
        </button>
        <div className="flex flex-col">
          <h2>{t('certificate:COUNTERPARTY.ADD_NEW')}</h2>
          <form
            onSubmit={addNewCounterParterHandler}
            className="flex w-full flex-col gap-y-40px px-30px py-24px text-sm text-input-text-primary"
          >
            <div className="flex flex-col">
              <div className="flex w-full flex-col items-start gap-y-8px">
                <p className="font-semibold">
                  {t('certificate:COUNTERPARTY.COMPANY_NAME')}
                  <span className="text-text-state-error">*</span>
                </p>
                <input
                  id="input-parter-name"
                  type="text"
                  placeholder={t('certificate:COUNTERPARTY.ENTER_NAME')}
                  value={inputName}
                  onChange={nameChangeHandler}
                  required
                  className={`h-46px w-full rounded-sm border border-input-stroke-input px-12px outline-none placeholder:text-input-text-input-placeholder ${showHint && !inputName ? inputStyle.ERROR : inputStyle.NORMAL}`}
                />
              </div>
              <div
                className={`flex h-46px w-full items-center justify-between divide-x ${showHint && !inputTaxId ? inputStyle.ERROR : inputStyle.NORMAL} rounded-sm border bg-input-surface-input-background`}
              >
                <NumericInput
                  id="input-partner-tax-id"
                  name="input-partner-tax-id"
                  value={inputTaxId}
                  setValue={setInputTaxId}
                  isDecimal={false}
                  hasComma={false}
                  required
                  min={1}
                  className="flex-1 bg-transparent px-10px text-right outline-none"
                />
              </div>
              <div className="flex w-full flex-col items-start gap-y-8px md:col-span-2">
                <p className="font-semibold">
                  {t('journal:ADD_ASSET_MODAL.ASSET_TYPE')}
                  <span className="text-text-state-error">*</span>
                </p>
                <div ref={typeRef} className="relative w-full">
                  <div
                    onClick={selectTypeHandler}
                    className={`flex items-center justify-between gap-8px rounded-sm border ${
                      showHint && !inputType ? inputStyle.ERROR : inputStyle.NORMAL
                    } bg-input-surface-input-background px-12px py-10px hover:cursor-pointer`}
                  >
                    {isTypeSelecting}
                    <FaChevronDown />
                  </div>
                  {displayedTypeMenu}
                </div>
              </div>
              <div className="flex w-full flex-col items-start gap-y-8px">
                <p className="font-semibold">
                  {t('journal:ADD_ASSET_MODAL.ASSET_NO')}
                  <span className="text-text-state-error">*</span>
                </p>
                <input
                  id="input-parter-note"
                  type="text"
                  placeholder={t('journal:ADD_ASSET_MODAL.ASSET_NO_PLACEHOLDER')}
                  value={inputNote}
                  onChange={noteChangeHandler}
                  required
                  className="h-46px w-full rounded-sm border border-input-stroke-input px-12px outline-none placeholder:text-input-text-input-placeholder"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-12px">
              <Button
                className="px-16px py-8px"
                type="button"
                onClick={onClose}
                variant="secondaryOutline"
              >
                {t('common:COMMON.CANCEL')}
              </Button>
              <Button className="px-16px py-8px" type="submit" variant="tertiary">
                <p>{t('common:COMMON.SAVE')}</p>
                <BiSave size={20} />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

interface CertificateEditModalProps {
  isOpen: boolean;
  onClose: () => void; // Info: (20240924 - tzuhan) 關閉模態框的回調函數
  certificate: ICertificateUI;
  onSave: (data: ICertificateUI) => void; // Info: (20240924 - tzuhan) 保存數據的回調函數
}

const CertificateEditModal: React.FC<CertificateEditModalProps> = ({
  isOpen,
  onClose,
  certificate,
  onSave,
}) => {
  const { t } = useTranslation(['certificate', 'common']);
  const counterPartyList = generateRandomCounterParties(10);
  const [filteredCounterPartyList, setFilteredCounterPartyList] =
    useState<ICounterParty[]>(counterPartyList);
  const [counterParty, setCounterParty] = useState(certificate.counterParty);
  const [counterPartyTitle, setCounterPartyTitle] = useState<string>(
    `${counterParty.taxId} ${counterParty.name}`
  );
  const [type, setType] = useState(certificate.type);
  const [date, setDate] = useState<IDatePeriod>(default30DayPeriodInSec);
  const [invoiceNumber, setInvoiceNumber] = useState(certificate.invoiceNumber);
  const [priceBeforeTax, setPriceBeforeTax] = useState(certificate.priceBeforeTax);
  const [taxRate, setTaxRate] = useState(certificate.taxRate);
  const [taxPrice, setTaxPrice] = useState(certificate.taxPrice);
  const [totalPrice, setTotalPrice] = useState(certificate.totalPrice);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [invoiceType, setInvoiceType] = useState(certificate.invoiceType);
  const [deductible, setDeductible] = useState(certificate.deductible);
  const { messageModalDataHandler, messageModalVisibilityHandler } = useModalContext();
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

  const counterPartyInputRef = useRef<HTMLInputElement>(null);

  const counterPartyEditingHandler = () => {
    setIsCounterPartyEditing(true);
    setCounterPartyMenuOpen(true);
  };

  const CounterPartyItems = filteredCounterPartyList.map((partner) => {
    const accountClickHandler = () => {
      setCounterPartyTitle(`${partner.taxId} ${partner.name}`);
      setCounterParty(partner);
      // Info: (20241017 - Tzuhan) 關閉 CounterPartyI Menu 和編輯狀態
      setCounterPartyMenuOpen(false);
      setIsCounterPartyEditing(false);
      // Info: (20241017 - Tzuhan) 重置搜尋關鍵字
      setSearchKeyword('');
    };

    return (
      <button
        key={partner.id}
        type="button"
        onClick={accountClickHandler}
        className="flex w-full gap-8px px-12px py-8px text-left text-sm hover:bg-dropdown-surface-menu-background-secondary"
      >
        <p className="text-dropdown-text-primary">{partner.taxId}</p>
        <p className="text-dropdown-text-secondary">{partner.name}</p>
      </button>
    );
  });

  const DisplayedCounterPartyMenu = (
    <div
      ref={counterPartyMenuRef}
      className={`absolute left-0 top-50px z-30 grid w-full overflow-hidden ${
        isCounterPartyMenuOpen ? 'grid-rows-1' : 'grid-rows-0'
      } rounded-sm shadow-dropmenu transition-all duration-150 ease-in-out`}
    >
      <div className="flex max-h-150px flex-col overflow-y-auto rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px">
        {CounterPartyItems}
      </div>
    </div>
  );

  const counterPartySearchHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCounterPartyMenuOpen(true);
    setSearchKeyword(e.target.value);
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
    if (filteredCounterPartyList.length === 0) {
      messageModalDataHandler({
        messageType: MessageType.INFO,
        title: t('certificate:COUNTERPARTY.TITLE'),
        content: t('certificate:COUNTERPARTY.CONTENT', { counterParty: e.target.value }),
        backBtnStr: t('certificate:COUNTERPARTY.NO'),
        submitBtnStr: t('certificate:COUNTERPARTY.YES'),
        submitBtnFunction: () => {
          setIsAddCounterPartyModalOpen(true);
        },
      });
      messageModalVisibilityHandler();
    }
  };

  const isEditCounterParty = isCounterPartyEditing ? (
    <input
      ref={counterPartyInputRef}
      value={searchKeyword}
      onChange={counterPartySearchHandler}
      placeholder={counterPartyTitle}
      className="w-full truncate bg-transparent outline-none"
    />
  ) : (
    <p className={`truncate text-input-text-input-filled`}>{counterPartyTitle}</p>
  );

  // Info: (20240924 - tzuhan) 處理保存
  const handleSave = () => {
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
  };

  // Info: (20240924 - tzuhan) 不顯示模態框時返回 null
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <>
        <div className="mb-4 flex w-full flex-col items-center gap-0">
          <h2 className="flex justify-center gap-2 text-xl font-semibold">
            {certificate.invoiceName}
            <Image alt="edit" src="/elements/edit.svg" width={16} height={16} />
          </h2>
          <p>{t('certificate:EDIT.HEADER')}</p>
        </div>
        <div className="flex w-full items-start justify-between gap-40px md:flex-row">
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
          <div className="w-full flex-col items-start gap-x-60px space-y-4">
            {/* Info: (20240924 - tzuhan) 切換輸入/輸出 */}
            <div className="mb-4 flex flex-col items-start gap-4">
              <p className="text-sm font-semibold text-input-text-primary">
                {t('certificate:EDIT.TYPE')}
              </p>
              <div className="mb-4 flex flex-row items-start gap-4">
                <label
                  htmlFor="invoice-input"
                  className="flex flex-row items-center gap-8px whitespace-nowrap text-checkbox-text-primary"
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
                  className="flex flex-row items-center gap-8px whitespace-nowrap text-checkbox-text-primary"
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
            <div className="mb-4 flex items-center space-x-4">
              <p className="text-sm font-semibold text-input-text-primary">
                {t('certificate:EDIT.DATE')}
                <span className="text-red-500">*</span>
              </p>
              <DatePicker
                period={date}
                setFilteredPeriod={setDate}
                type={DatePickerType.TEXT_DATE}
                btnClassName=""
              />
            </div>

            {/* Info: (20240924 - tzuhan) Invoice Number */}
            <div className="relative flex w-full flex-1 flex-col items-start gap-8px">
              <div id="price" className="absolute -top-20"></div>
              <p className="text-sm font-semibold text-input-text-primary">
                {t('certificate:EDIT.INVOICE_NUMBER')}
                <span className="text-red-500">*</span>
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
            <div className="relative flex w-full flex-1 flex-col items-start gap-8px">
              <div id="price" className="absolute -top-20"></div>
              <p className="text-sm font-semibold text-input-text-primary">
                {t('certificate:EDIT.PRICE_BEFORE_TAX')}
                <span className="text-red-500">*</span>
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
                  className="h-46px flex-1 rounded-sm border border-input-stroke-input bg-input-surface-input-background p-10px outline-none"
                />
                <div className="flex items-center gap-4px rounded-r-sm border border-l-0 border-input-stroke-input bg-input-surface-input-background p-12px text-sm text-input-text-input-placeholder">
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
            <div className="flex w-full flex-col items-start">
              <p className="text-sm font-semibold text-input-text-primary">
                {t('certificate:EDIT.TAX')}
                <span className="text-red-500">*</span>
              </p>
              <div className="flex w-full items-center space-x-4">
                <div
                  id="tax-rate-menu"
                  onClick={() => setIsTaxRateMenuOpen(!isTaxRateMenuOpen)}
                  className={`group relative flex h-46px w-full cursor-pointer md:w-220px ${isTaxRateMenuOpen ? 'border-input-stroke-selected text-dropdown-stroke-input-hover' : 'border-input-stroke-input text-input-text-input-filled'} items-center justify-between rounded-sm border bg-input-surface-input-background p-10px hover:border-input-stroke-selected hover:text-dropdown-stroke-input-hover`}
                >
                  <p>
                    {t('certificate:EDIT.TAXABLE')} {taxRate}%
                  </p>
                  <IoIosArrowDown />
                  <div
                    className={`absolute left-0 top-50px grid w-full grid-cols-1 shadow-dropmenu ${isTaxRateMenuOpen ? 'grid-rows-1 border-dropdown-stroke-menu' : 'grid-rows-0 border-transparent'} overflow-hidden rounded-sm border transition-all duration-300 ease-in-out`}
                  >
                    <ul
                      ref={taxRateMenuRef}
                      className="z-10 flex w-full flex-col items-start bg-dropdown-surface-menu-background-primary p-8px"
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
                  <div className="flex items-center gap-4px rounded-r-sm border border-l-0 border-input-stroke-input bg-input-surface-input-background p-12px text-sm text-input-text-input-placeholder">
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

            <div className="relative flex w-full flex-1 flex-col items-start gap-8px">
              <div id="price" className="absolute -top-20"></div>
              <p className="text-sm font-semibold text-input-text-primary">
                Total Price (Including Tax)*
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
                  className="h-46px flex-1 rounded-sm border border-input-stroke-input bg-input-surface-input-background p-10px outline-none"
                />
                <div className="flex items-center gap-4px rounded-r-sm border border-l-0 border-input-stroke-input bg-input-surface-input-background p-12px text-sm text-input-text-input-placeholder">
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

            <div className="relative flex w-full flex-1 flex-col items-start gap-8px">
              <div id="price" className="absolute -top-20"></div>
              <p className="text-sm font-semibold text-input-text-primary">
                {t('certificate:EDIT.COUNTERPARTY')}
                <span className="text-text-state-error">*</span>
              </p>
              <div ref={counterPartyRef} className="relative w-full">
                <div
                  onClick={counterPartyEditingHandler}
                  className={`flex items-center justify-between gap-8px rounded-sm border ${
                    inputStyle.NORMAL // TODO: (20241017 - tzuhan) isShowTypeHint ? inputStyle.ERROR : inputStyle.NORMAL
                  } bg-input-surface-input-background px-12px py-10px hover:cursor-pointer`}
                >
                  {isEditCounterParty}
                  <FiSearch size={20} className="absolute right-3 top-3 cursor-pointer" />
                </div>
                {DisplayedCounterPartyMenu}
              </div>
            </div>

            {/* Info: (20240924 - tzuhan) Invoice Type */}
            <div className="flex flex-col items-start">
              <p className="text-sm font-semibold text-input-text-primary">Tax</p>
              <div className="flex w-full items-center space-x-4">
                <div className="flex w-full items-center space-x-4">
                  <div
                    id="tax-rate-menu"
                    onClick={() => setIsInvoiceTypeMenuOpen(!isTaxRateMenuOpen)}
                    className={`group relative flex h-46px w-full cursor-pointer md:w-220px ${isInvoiceTypeMenuOpen ? 'border-input-stroke-selected text-dropdown-stroke-input-hover' : 'border-input-stroke-input text-input-text-input-filled'} items-center justify-between rounded-sm border bg-input-surface-input-background p-10px hover:border-input-stroke-selected hover:text-dropdown-stroke-input-hover`}
                  >
                    <p> {invoiceType} uniform invoice</p>
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
                            {value} uniform invoice
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
                {/* Info: (20240924 - tzuhan) Deductible */}
                <div className="flex items-center space-x-4 text-switch-text-primary">
                  <p>Deductible</p>
                  <Toggle
                    id="tax-toggle"
                    initialToggleState={deductible}
                    getToggledState={() => setDeductible(!deductible)}
                    toggleStateFromParent={deductible}
                  />
                </div>
              </div>
            </div>

            {/* Info: (20240924 - tzuhan) Save 按鈕 */}
            <div className="ml-auto flex items-center">
              <Button
                id="certificate-save-btn"
                type="submit"
                className="ml-auto px-16px py-8px"
                disabled={!isFormValid}
                onClick={handleSave}
              >
                <p>Save</p>
              </Button>
            </div>
          </div>
        </div>
        {isAddCounterPartyModalOpen && (
          <AddCounterPartyModal onClose={() => setIsAddCounterPartyModalOpen(false)} />
        )}
      </>
    </Modal>
  );
};

export default CertificateEditModal;
