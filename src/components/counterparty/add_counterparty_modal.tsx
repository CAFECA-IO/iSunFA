import React, { useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { Button } from '@/components/button/button';
import { CounterpartyType } from '@/constants/counterparty';
import { RxCross1 } from 'react-icons/rx';
import { BiSave } from 'react-icons/bi';
import { FaChevronDown } from 'react-icons/fa6';
import { inputStyle } from '@/constants/display';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import { useUserCtx } from '@/contexts/user_context';
import { IAddCounterPartyModalData } from '@/interfaces/add_counterparty_modal';
import { ICounterparty } from '@/interfaces/counterparty';
import { ICompanyTaxIdAndName } from '@/interfaces/company';

interface IAddCounterPartyModalProps extends IAddCounterPartyModalData {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
}

const AddCounterPartyModal: React.FC<IAddCounterPartyModalProps> = ({
  isModalVisible,
  modalVisibilityHandler,
  onSave,
  name,
  taxId,
}) => {
  const { t } = useTranslation(['common', 'certificate']);
  const { selectedCompany } = useUserCtx();
  const [inputName, setInputName] = useState<string>('');
  const [inputTaxId, setInputTaxId] = useState<string>('');
  const [inputType, setInputType] = useState<null | CounterpartyType>(null);
  const [inputNote, setInputNote] = useState<string>('');
  const [showHint, setShowHint] = useState(false);

  const {
    trigger: addCounterpartyTrigger,
    success,
    error,
    data,
  } = APIHandler<ICounterparty>(APIName.COUNTERPARTY_ADD);

  // Info: (20241212 - Anna) 透過公司名稱或統一編號查詢公司資料
  const { trigger: fetchCompanyDataAPI } = APIHandler<ICompanyTaxIdAndName>(
    APIName.COMPANY_SEARCH_BY_NAME_OR_TAX_ID
  );

  // Info: (20241212 - Anna) 透過公司名稱查詢統一編號
  const fetchTaxIdByCompanyName = async (
    companyName: string,
    taxIdNumber?: string
  ): Promise<void> => {
    try {
      const { data: companyData } = await fetchCompanyDataAPI({
        query: {
          name: companyName || undefined,
          taxId: taxIdNumber || undefined,
        },
      });

      if (companyData && companyData.name.includes(companyName)) {
        setInputName(companyData.name || '');
        setInputTaxId(companyData.taxId || '');
      } else {
        setInputTaxId(''); //  Info: (20241212 - Anna) 清空統一編號
      }
    } catch (fetchError) {
      // Deprecate: (20241212 - Anna) remove eslint-disable
      // eslint-disable-next-line no-console
      console.error('Error fetching company data:', fetchError);
    }
  };

  // Info: (20241212 - Anna) 透過統一編號查詢公司名稱
  const fetchCompanyNameByTaxId = async (taxIdNumber: string): Promise<void> => {
    try {
      const { data: companyData } = await fetchCompanyDataAPI({
        query: {
          name: undefined, // Info: (20241212 - Anna) 不需要公司名稱
          taxId: taxIdNumber,
        },
      });

      if (companyData) {
        setInputName(companyData.name || ''); // Info: (20241212 - Anna) 更新公司名稱
      } else {
        setInputName(''); // Info: (20241212 - Anna) 查無資料時清空名稱
      }
    } catch (fetchError) {
      // Deprecate: (20241212 - Anna) remove eslint-disable
      // eslint-disable-next-line no-console
      console.error('Error fetching company data by Tax ID:', fetchError);
      setInputName(''); // Info: (20241212 - Anna) 查詢失敗時清空名稱
    }
  };

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
        // Deprecate: (20241118 - Anna) debug
        // eslint-disable-next-line no-console
        console.log('Selected Type:', type); // Info: (20241113 - Anna) 確認選擇的類型是否正確
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

  // Info: (20241212 - Anna) 等到按下 Enter 再發送 API
  const nameKeyDownHandler = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      // Info: (20241212 - Anna) 檢查輸入是否包含有效漢字
      if (/^[\u4e00-\u9fa5]+$/.test(inputName)) {
        // Deprecate: (20241212 - Anna) remove eslint-disable
        // eslint-disable-next-line no-console
        fetchTaxIdByCompanyName(inputName).catch(console.error);
      } else {
        // Deprecate: (20241212 - Anna) remove eslint-disable
        // eslint-disable-next-line no-console
        console.warn('輸入無效或不包含漢字');
      }
    }
  };

  const nameChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newName = event.target.value.trim();
    setInputName(newName);

    // Info: (20241212 - Anna) 當輸入為空時，直接清空結果不觸發 API
    if (newName === '') {
      setInputTaxId('');
    }
  };

  const taxIdChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTaxId = event.target.value.trim();
    setInputTaxId(newTaxId);

    // Info: (20241212 - Anna) 當輸入的統一編號滿 8 碼時，觸發 API
    if (newTaxId.length === 8 && /^[0-9]{8}$/.test(newTaxId)) {
      // Deprecate: (20241212 - Anna) remove eslint-disable
      // eslint-disable-next-line no-console
      fetchCompanyNameByTaxId(newTaxId).catch(console.error);
    } else if (newTaxId === '') {
      setInputName(''); // Info: (20241212 - Anna) 清空公司名稱
    }
  };

  const noteChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputNote(event.target.value);
  };

  // Info: (20241113 - Anna) 檢查是否有未填寫的欄位
  const disabled = !(inputName && inputTaxId && inputType);

  const addNewCounterPartyHandler = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (disabled) {
      setShowHint(true);
    } else {
      const counterpartyData = {
        name: inputName,
        taxId: inputTaxId,
        type: inputType as CounterpartyType,
        note: inputNote || '',
      };

      const apiData = {
        ...counterpartyData,
        type: counterpartyData.type.toString(),
      };

      await addCounterpartyTrigger({ params: { companyId: selectedCompany?.id }, body: apiData });
    }
  };

  useEffect(() => {
    if (success && data) {
      // Deprecate: (20241118 - Anna) debug
      // eslint-disable-next-line no-console
      console.log('Counterparty created successfully.');
      onSave(data);
      modalVisibilityHandler();
    } else if (error) {
      // Deprecate: (20241118 - Anna) debug
      // eslint-disable-next-line no-console
      console.error('Failed to create counterparty:', error);
    }
  }, [success, error, data]);

  useEffect(() => {
    // Info: (20241206 - Julian) 若有預設值，則填入輸入欄位
    if (name) {
      setInputName(name);
    }
    if (taxId) {
      setInputTaxId(taxId);
    }
  }, [name, taxId]);

  useEffect(() => {
    // Info: (20241206 - Julian) 關閉 Modal 時，清空輸入欄位
    if (!isModalVisible) {
      setInputName('');
      setInputTaxId('');
      setInputType(null);
      setInputNote('');
      setShowHint(false);
    }
  }, [isModalVisible]);

  const isDisplayModal = isModalVisible ? (
    <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/50">
      <div className="relative flex max-h-620px w-90vw max-w-480px flex-col gap-4 rounded-sm bg-surface-neutral-surface-lv2 p-8">
        {/* Info: (20240924 - tzuhan) 關閉按鈕 */}
        <button
          type="button"
          className="absolute right-4 top-4 text-checkbox-text-primary"
          onClick={modalVisibilityHandler}
        >
          <RxCross1 size={24} />
        </button>
        <h2 className="flex justify-center text-xl font-semibold">
          {t('certificate:COUNTERPARTY.ADD_NEW')}
        </h2>
        <form
          onSubmit={addNewCounterPartyHandler}
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
                  id="input-party-name"
                  type="text"
                  placeholder={t('certificate:COUNTERPARTY.ENTER_NAME')}
                  value={inputName}
                  onChange={nameChangeHandler}
                  onKeyDown={nameKeyDownHandler} // Info: (20241212 - Anna) 監聽 Enter 鍵
                  required
                  className="h-46px flex-1 rounded-sm border border-input-stroke-input bg-input-surface-input-background p-10px text-input-text-input-filled outline-none"
                />
              </div>
            </div>

            {/* Info: (20240924 - tzuhan) Tax Id */}
            <div className="relative flex w-full flex-1 flex-col items-start gap-2">
              <div id="counterparty-tax-id" className="absolute -top-20"></div>
              <p className="text-sm font-semibold text-input-text-primary">
                {t('certificate:COUNTERPARTY.TAX_NUMBER')}
                <span className="text-text-state-error">*</span>
              </p>
              <div className="flex w-full items-center">
                <input
                  id="input-party-tax-id"
                  type="text"
                  placeholder={t('certificate:COUNTERPARTY.ENTER_NUMBER')}
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
                {t('certificate:COUNTERPARTY.PARTNER_TYPE')}
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
                      : t('certificate:COUNTERPARTY.SELECT_TYPE')}
                  </span>
                  <div className={isTypeMenuOpen ? 'rotate-180' : 'rotate-0'}>
                    <FaChevronDown />
                  </div>
                </div>
                {displayedTypeMenu}
              </div>
            </div>
            <div className="flex w-full flex-col items-start gap-y-8px">
              <p className="font-semibold">{t('certificate:COUNTERPARTY:NOTE')}</p>
              <input
                id="input-party-note"
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
              onClick={modalVisibilityHandler}
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
  ) : null;

  return isDisplayModal;
};

export default AddCounterPartyModal;
