import Image from 'next/image';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IoIosArrowDown } from 'react-icons/io';
import useOuterClick from '@/lib/hooks/use_outer_click';
import NumericInput from '@/components/numeric_input/numeric_input';
import Toggle from '@/components/toggle/toggle';
import Modal from '@/components/modal/modal';
import { Button } from '@/components/button/button';
import { CERTIFICATE_TYPES, ICertificateUI, INVOICE_TYPES } from '@/interfaces/certificate';

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
  const { t } = useTranslation(['common', 'journal']);
  // Info: (20240924 - tzuhan) 本地狀態來管理表單輸入
  const [priceBeforeTax, setPriceBeforeTax] = useState(certificate.priceBeforeTax);
  const [taxRate, setTaxRate] = useState(certificate.taxRate);
  const [tax, setTax] = useState(certificate.tax);
  const [totalPrice, setTotalPrice] = useState(certificate.totalPrice);
  const [fromTo, setFromTo] = useState(certificate.fromTo);
  const [invoiceNumber, setInvoiceNumber] = useState(certificate.invoiceNumber);
  const [type, setType] = useState(certificate.type);
  const [invoiceType, setInvoiceType] = useState(certificate.invoiceType);
  const [deductible, setDeductible] = useState(certificate.deductible);
  const isFormValid = priceBeforeTax > 0 && totalPrice > 0 && fromTo !== '' && invoiceNumber !== '';

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
    setTax(Math.round((priceBeforeTax * value) / 100));
    setIsTaxRateMenuOpen(false);
  };

  // Info: (20240924 - tzuhan) 處理保存
  const handleSave = () => {
    const updatedData = {
      ...certificate,
      priceBeforeTax,
      taxRate,
      totalPrice,
      fromTo,
      invoiceNumber,
      type,
      invoiceType,
      deductible,
      thumbnailUrl: certificate.thumbnailUrl,
    };
    onSave(updatedData);
  };

  // Info: (20240924 - tzuhan) 不顯示模態框時返回 null
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <>
        {/* Info: (20240924 - tzuhan) 模態框標題 */}
        <h2 className="mb-4 flex justify-center gap-2 text-xl font-semibold">
          {certificate.invoiceName}
          <Image alt="edit" src="/elements/edit.svg" width={16} height={16} />
        </h2>
        <div className="my-40px flex w-full items-center justify-between gap-40px md:flex-row">
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
            <div className="mb-4 flex items-center space-x-4">
              <label
                htmlFor="invoice-input"
                className="flex items-center gap-8px whitespace-nowrap text-checkbox-text-primary"
              >
                <input
                  type="radio"
                  id="invoice-input"
                  name="invoice-type"
                  className="relative h-16px w-16px appearance-none rounded-full border border-checkbox-stroke-unselected bg-white outline-none after:absolute after:left-1/2 after:top-1/2 after:-ml-5px after:-mt-5px after:hidden after:h-10px after:w-10px after:rounded-full after:bg-checkbox-stroke-unselected checked:after:block"
                  defaultChecked
                  onClick={() => setType(CERTIFICATE_TYPES.INPUT)}
                />
                <p>Input</p>
              </label>
              <label
                htmlFor="invoice-output"
                className="flex items-center gap-8px whitespace-nowrap text-checkbox-text-primary"
              >
                <input
                  type="radio"
                  id="invoice-output"
                  name="invoice-type"
                  className="relative h-16px w-16px appearance-none rounded-full border border-checkbox-stroke-unselected bg-white outline-none after:absolute after:left-1/2 after:top-1/2 after:-ml-5px after:-mt-5px after:hidden after:h-10px after:w-10px after:rounded-full after:bg-checkbox-stroke-unselected checked:after:block"
                  onClick={() => setType(CERTIFICATE_TYPES.OUTPUT)}
                />
                <p>Output</p>
              </label>
            </div>
            {/* Info: (20240924 - tzuhan) Price Before Tax */}
            <div className="relative flex w-full flex-1 flex-col items-start gap-8px">
              <div id="price" className="absolute -top-20"></div>
              <p className="text-sm font-semibold text-input-text-primary">Price Before Tax*</p>
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
              </div>
            </div>

            {/* Info: (20240924 - tzuhan) Tax */}
            <div className="flex w-full flex-col items-start">
              <p className="text-sm font-semibold text-input-text-primary">Tax</p>
              <div className="flex w-full items-center space-x-4">
                <div
                  id="tax-rate-menu"
                  onClick={() => setIsTaxRateMenuOpen(!isTaxRateMenuOpen)}
                  className={`group relative flex h-46px w-full cursor-pointer md:w-220px ${isTaxRateMenuOpen ? 'border-input-stroke-selected text-dropdown-stroke-input-hover' : 'border-input-stroke-input text-input-text-input-filled'} items-center justify-between rounded-sm border bg-input-surface-input-background p-10px hover:border-input-stroke-selected hover:text-dropdown-stroke-input-hover`}
                >
                  <p> Taxable {taxRate}%</p>
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
                          Taxable {value}%
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="flex w-full items-center">
                  <NumericInput
                    id="input-tax"
                    name="input-tax"
                    value={tax}
                    setValue={setTax}
                    isDecimal
                    required
                    hasComma
                    className="h-46px flex-1 rounded-l-sm border border-input-stroke-input bg-input-surface-input-background p-10px outline-none"
                  />
                  <div className="flex items-center gap-4px rounded-r-sm border border-l-0 border-input-stroke-input bg-input-surface-input-background p-12px text-sm text-input-text-input-placeholder">
                    <Image
                      src="/elements/bell.svg"
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
              </div>
            </div>

            {/* Info: (20240924 - tzuhan) From/To */}
            <div className="relative flex w-full flex-1 flex-col items-start gap-8px">
              <div id="price" className="absolute -top-20"></div>
              <p className="text-sm font-semibold text-input-text-primary">From/To*</p>
              <div className="flex w-full items-center">
                <input
                  id="tax-id"
                  type="text"
                  value={fromTo}
                  onChange={(e) => setFromTo(e.target.value)}
                  className="h-46px flex-1 rounded-sm border border-input-stroke-input bg-input-surface-input-background p-10px outline-none"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Info: (20240924 - tzuhan) Invoice Number */}
            <div className="relative flex w-full flex-1 flex-col items-start gap-8px">
              <div id="price" className="absolute -top-20"></div>
              <p className="text-sm font-semibold text-input-text-primary">Invoice Number*</p>
              <div className="flex w-full items-center">
                <input
                  id="tax-id"
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="h-46px flex-1 rounded-sm border border-input-stroke-input bg-input-surface-input-background p-10px outline-none"
                  placeholder="0"
                />
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
      </>
    </Modal>
  );
};

export default CertificateEditModal;
