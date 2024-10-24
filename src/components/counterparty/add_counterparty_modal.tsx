import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { Button } from '@/components/button/button';
import { CounterpartyType } from '@/constants/counterparty';
import { RxCross1 } from 'react-icons/rx';
import { BiSave } from 'react-icons/bi';
import { FaChevronDown } from 'react-icons/fa6';
import { inputStyle } from '@/constants/display';

interface AddCounterPartyModalProps {
  onClose: () => void;
  onSave: (data: { name: string; taxId: string; type: CounterpartyType; note: string }) => void;
  name?: string;
  taxId?: string;
}

const AddCounterPartyModal: React.FC<AddCounterPartyModalProps> = ({
  onSave,
  onClose,
  name,
  taxId,
}) => {
  const { t } = useTranslation(['common', 'certificate']);
  const [inputName, setInputName] = useState<string>(name || '');
  const [inputTaxId, setInputTaxId] = useState<string>(taxId || '');
  const [inputType, setInputType] = useState<null | CounterpartyType>(null);
  const [inputNote, setInputNote] = useState<string>('');
  const [showHint, setShowHint] = useState(false);

  const { targetRef: typeRef, setComponentVisible: setIsTypeSelecting } =
    useOuterClick<HTMLDivElement>(false);

  const {
    targetRef: typeMenuRef,
    componentVisible: isTypeMenuOpen,
    setComponentVisible: setTypeMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const selectTypeHandler = () => {
    setIsTypeSelecting(true);
    setTypeMenuOpen(true);
  };

  const typeItems = [CounterpartyType.BOTH, CounterpartyType.CLIENT, CounterpartyType.SUPPLIER].map(
    (type) => {
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
    }
  );

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

  const taxIdChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputTaxId(event.target.value);
  };

  const noteChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputNote(event.target.value);
  };

  const disabled = !inputName || !inputTaxId || !inputType;

  const addNewCounterParterHandler = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled) {
      setShowHint(true);
    } else {
      onSave({ name: inputName, taxId: inputTaxId, type: inputType, note: inputNote || '' });
    }
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50">
      <div className="relative flex max-h-620px w-90vw max-w-480px flex-col gap-4 rounded-sm bg-surface-neutral-surface-lv2 p-8">
        {/* Info: (20240924 - tzuhan) 關閉按鈕 */}
        <button
          type="button"
          className="absolute right-4 top-4 text-checkbox-text-primary"
          onClick={onClose}
        >
          <RxCross1 size={32} />
        </button>
        <h2 className="flex justify-center text-xl font-semibold">
          {t('certificate:COUNTERPARTY.ADD_NEW')}
        </h2>
        <form
          onSubmit={addNewCounterParterHandler}
          className="flex w-full flex-col gap-4 text-sm text-input-text-primary"
        >
          <div className="flex flex-col gap-4">
            {/* Info: (20241018 - tzuhan) name */}
            <div className="relative flex w-full flex-1 flex-col items-start gap-2">
              <div id="counterparty-name" className="absolute -top-20"></div>
              <p className="text-sm font-semibold text-input-text-primary">
                {t('certificate:COUNTERPARTY.COMPANY_NAME')}
                <span className="text-text-state-error">*</span>
              </p>
              <div className="flex w-full items-center">
                <input
                  id="input-parter-name"
                  type="text"
                  placeholder={t('certificate:COUNTERPARTY.ENTER_NAME')}
                  value={inputName}
                  onChange={nameChangeHandler}
                  required
                  className="h-46px flex-1 rounded-sm border border-input-stroke-input bg-input-surface-input-background p-10px text-input-text-input-filled outline-none"
                />
              </div>
            </div>

            {/* Info: (20240924 - tzuhan) Tax Id */}
            <div className="relative flex w-full flex-1 flex-col items-start gap-2">
              <div id="counterpart-taxid" className="absolute -top-20"></div>
              <p className="text-sm font-semibold text-input-text-primary">
                {t('certificate:COUNTERPARTY.TAX_NUMBER')}
                <span className="text-text-state-error">*</span>
              </p>
              <div className="flex w-full items-center">
                <input
                  id="input-parter-tax-id"
                  type="text"
                  placeholder={t('certificate:COUNTERPARTY.INVOICE_NUMBER')}
                  value={inputTaxId}
                  onChange={taxIdChangeHandler}
                  required
                  className="h-46px flex-1 rounded-sm border border-input-stroke-input bg-input-surface-input-background p-10px text-input-text-input-filled outline-none"
                />
              </div>
            </div>

            {/* Info: (20240924 - tzuhan) Partner Type */}
            <div className="flex w-full flex-col items-start gap-2">
              <p className="font-semibold">
                {t('journal:ADD_ASSET_MODAL.ASSET_TYPE')}
                <span className="text-text-state-error">*</span>
              </p>
              <div ref={typeRef} className="relative w-full">
                <div
                  onClick={selectTypeHandler}
                  className={`flex items-center justify-between gap-8px rounded-sm border ${
                    showHint && !inputType ? inputStyle.ERROR : inputStyle.NORMAL
                  } bg-input-surface-input-background px-10px py-12px hover:cursor-pointer`}
                >
                  <span className="text-input-text-input-filled">
                    {inputType
                      ? t(`certificate:COUNTERPARTY.${inputType.toUpperCase()}`)
                      : t('certificate:COUNTERPARTY.BOTH')}
                  </span>
                  <FaChevronDown />
                </div>
                {displayedTypeMenu}
              </div>
            </div>
            <div className="flex w-full flex-col items-start gap-y-8px">
              <p className="font-semibold">{t('certificate:COUNTERPARTY:NOTE')}</p>
              <input
                id="input-parter-note"
                type="text"
                placeholder={t('certificate:COUNTERPARTY.ENTER_TEXT')}
                value={inputNote}
                onChange={noteChangeHandler}
                className="h-46px w-full rounded-sm border border-input-stroke-input px-12px text-input-text-input-filled outline-none placeholder:text-input-text-input-placeholder"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-12px">
            <Button
              className="px-16px py-8px"
              type="button"
              onClick={onClose}
              variant="secondaryBorderless"
            >
              {t('common:COMMON.CANCEL')}
            </Button>
            <Button className="px-16px py-8px" type="submit" variant="tertiary" disabled={disabled}>
              <p>{t('common:COMMON.SAVE')}</p>
              <BiSave size={20} />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCounterPartyModal;
