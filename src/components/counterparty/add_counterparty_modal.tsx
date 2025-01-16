import React, { useState, useEffect, useRef } from 'react';
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
  const [isDropdownOpen, setDropdownOpen] = useState(false); // Info: (20241223 - Anna) 控制下拉選單顯示
  const [suggestions, setSuggestions] = useState<ICompanyTaxIdAndName[]>([]); // Info: (20241223 - Anna) 建議選項的狀態
  // Deprecate: (20241226 - Tzuhan) remove isOptionSelected
  // const [isOptionSelected, setIsOptionSelected] = useState(false); // Info: (20241223 - Anna) 選擇選項的狀態
  const dropdownRef = useRef<HTMLDivElement>(null); // Info: (20241223 - Anna) Ref 追蹤下拉選單
  const [isNameDuplicate, setIsNameDuplicate] = useState(false); // Info: (20250116 - Anna) 新增追蹤名稱是否重複的狀態

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
      }
    } catch (fetchError) {
      // Deprecate: (20241212 - Anna) remove eslint-disable
      // eslint-disable-next-line no-console
      console.error('Error fetching company data by Tax ID:', fetchError);
    }
  };

  const {
    targetRef: typeMenuRef,
    componentVisible: isTypeMenuOpen,
    setComponentVisible: setTypeMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const selectTypeHandler = () => setTypeMenuOpen(!isTypeMenuOpen);

  const typeItems = [CounterpartyType.BOTH, CounterpartyType.CLIENT, CounterpartyType.SUPPLIER].map(
    (type) => {
      const accountClickHandler = () => {
        setInputType(type);
        // Deprecate: (20241118 - Anna) debug
        // eslint-disable-next-line no-console
        console.log('Selected Type:', type); // Info: (20241113 - Anna) 確認選擇的類型是否正確
        setTypeMenuOpen(false);
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
      className={`absolute left-0 top-50px z-30 grid w-full overflow-hidden ${
        isTypeMenuOpen ? 'grid-rows-1' : 'grid-rows-0'
      } rounded-sm shadow-dropmenu transition-all duration-150 ease-in-out`}
    >
      <div className="flex max-h-150px flex-col overflow-y-auto rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px">
        {typeItems}
      </div>
    </div>
  );

  let currentRequestController: AbortController | null = null; // Info: (20241223 - Anna) 定義全域變數以追蹤當前請求
  const requestCounterRef = useRef(0); // Info: (20241223 - Anna) 追蹤請求序號

  const nameChangeHandler = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newName = event.target.value.trim();
    // Deprecate: (20241223 - Anna) remove eslint-disable
    // eslint-disable-next-line no-console
    console.log('Input value:', newName); // Info: (20241223 - Anna) 確認輸入框值是否為空
    setInputName(newName);
    // setIsOptionSelected(false); // Info: (20241223 - Anna) 清空選擇狀態

    if (newName === '') {
      // Info: (20241223 - Anna) 當輸入框清空時，關閉下拉選單並清空建議的選項
      setSuggestions([]);
      setDropdownOpen(false);
      if (currentRequestController) {
        currentRequestController.abort(); // Info: (20241223 - Anna) 取消當前請求
        currentRequestController = null; // Info: (20241223 - Anna) 清理控制器
      }
      return; // Info: (20241223 - Anna) 提前結束函數，不調用 API
    }

    if (/^[\u4e00-\u9fa5]+$/.test(newName)) {
      if (currentRequestController) {
        currentRequestController.abort(); // Info: (20241223 - Anna) 取消之前的請求
      }

      const controller = new AbortController();
      currentRequestController = controller;

      requestCounterRef.current += 1; // Info: (20241223 - Anna) 使用 useRef 來持續增加計數器
      const requestId = requestCounterRef.current; // Info: (20241223 - Anna) 獲取當前請求的 ID

      // Deprecate: (20241223 - Anna) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log(`Sending API request #${requestId} with name: ${newName}`);

      // Info: (20241223 - Anna) 每輸入一個完整的中文字時觸發
      try {
        // eslint-disable-next-line no-console
        console.log(`Sending API request with name: ${newName}`); // Info: (20241223 - Anna) 打印請求參數
        const { data: companyData } = await fetchCompanyDataAPI({
          query: { name: newName, taxId: undefined },
          signal: controller.signal, // Info: (20241223 - Anna) 傳入控制器的信號
        } as unknown as Record<string, unknown>);

        // Info: (20241223 - Anna) 比較輸入值，確保回傳對應的是最後一次的輸入
        if (requestId !== requestCounterRef.current) {
          // Deprecate: (20241223 - Anna) remove eslint-disable
          // eslint-disable-next-line no-console
          console.log(`Discarding stale response for request #${requestId}`); // Info: (20241223 - Anna) 丟棄過期的請求結果
          return;
        }

        // Deprecate: (20241223 - Anna) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('API response:', companyData); // Info: (20241223 - Anna) 輸出 API 回傳的數據
        setSuggestions(companyData ? [companyData] : []); // Info: (20241223 - Anna) 儲存 API 回傳的建議
        setDropdownOpen(true);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          // Deprecate: (20241223 - Anna) remove eslint-disable
          // eslint-disable-next-line no-console
          console.log('Request aborted.'); // Info: (20241223 - Anna) 請求被中止時不需處理錯誤
        } else {
          // Deprecate: (20241223 - Anna) remove eslint-disable
          // eslint-disable-next-line no-console
          console.error('Error fetching suggestions:', err); // Info: (20241223 - Anna) 其他錯誤處理
        }
      } finally {
        // Info: (20241223 - Anna) 清理控制器，避免干擾後續請求
        if (currentRequestController === controller) {
          currentRequestController = null;
        }
      }
    } else {
      setSuggestions([]);
      setDropdownOpen(false); // Info: (20241223 - Anna) 如果輸入非中文字，關閉下拉選單
    }
  };

  const selectSuggestionHandler = (suggestion: ICompanyTaxIdAndName) => {
    // Info: (20241223 - Anna) 當選擇建議時
    setInputName(suggestion.name);
    setInputTaxId(suggestion.taxId || '');
    setDropdownOpen(false);
    // setIsOptionSelected(true); // Info: (20241224 - Anna) 標記用戶選擇了選項
  };

  const outsideClickHandler = (event: MouseEvent) => {
    // Info: (20241223 - Anna) 監控點擊事件
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setDropdownOpen(false); // Info: (20241223 - Anna) 點擊外部時關閉下拉選單
      // setIsOptionSelected(true); // Info: (20241223 - Anna) 標記用戶選擇了選項
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
    }
  };

  const noteChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputNote(event.target.value);
  };

  // Info: (20241113 - Anna) 檢查是否有未填寫的欄位
  const disabled = !(inputName && inputType);

  const addNewCounterPartyHandler = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (disabled) {
      setShowHint(true);
    } else {
      const counterpartyData = {
        name: inputName, // Info: (20241223 - Anna) 只有選擇了選項才帶入值
        taxId: inputTaxId,
        type: inputType as CounterpartyType,
        note: inputNote || '',
      };

      const apiData = {
        ...counterpartyData,
        type: counterpartyData.type.toString(),
      };

      try {
        await addCounterpartyTrigger({ params: { companyId: selectedCompany?.id }, body: apiData });
        setIsNameDuplicate(false); // Info: (20250116 - Anna) 重置名稱重複狀態
      } catch (responseError) {
        // Info: (20250116 - Anna) 定義類型守衛
        const isApiError = (err: unknown): err is { payload: { name: string } } => {
          return (
            typeof err === 'object' &&
            err !== null &&
            'payload' in err &&
            typeof (err as { payload: { name?: unknown } }).payload?.name === 'string'
          );
        };

        // Info: (20250116 - Anna) 使用類型守衛
        if (isApiError(responseError) && responseError.payload.name === inputName) {
          setIsNameDuplicate(true); // 如果名稱重複，設定狀態為 true
        } else {
          setIsNameDuplicate(false);
        }
      }
    }
  };

  useEffect(() => {
    // Info: (20250116 - Anna) 定義類型守衛
    const isApiError = (err: unknown): err is { payload: { name: string } } => {
      return (
        typeof err === 'object' &&
        err !== null &&
        'payload' in err &&
        typeof (err as { payload: { name?: unknown } }).payload?.name === 'string'
      );
    };

    if (success && data) {
      // Deprecate: (20241118 - Anna) debug
      // eslint-disable-next-line no-console
      console.log('Counterparty created successfully.');
      setIsNameDuplicate(false); // Info: (20250116 - Anna) 重置名稱重複的狀態
      onSave(data);
      modalVisibilityHandler();
    } else if (error) {
      // Deprecate: (20241118 - Anna) debug
      // eslint-disable-next-line no-console
      console.error('Failed to create counterparty:', error);
      // Info: (20250116 - Anna) 使用類型守衛檢查錯誤結構
      if (isApiError(error) && error.payload.name === inputName) {
        setIsNameDuplicate(true); // Info: (20250116 - Anna) 如果名稱重複，設定狀態為 true
      } else {
        setIsNameDuplicate(false);
      }
    }
  }, [success, error, data, inputName]); // Info: (20250116 - Anna) 添加 inputName 作為依賴

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

  useEffect(() => {
    document.addEventListener('mousedown', outsideClickHandler); // Info: (20241223 - Anna) 綁定事件
    return () => document.removeEventListener('mousedown', outsideClickHandler); // Info: (20241223 - Anna) 清理事件
  }, []);

  const displayedDropdown =
    isDropdownOpen && suggestions.length > 0 && inputName !== '' ? ( // Info: (20241223 - Anna) 渲染下拉選單
      <div
        ref={dropdownRef}
        className="absolute top-75px z-30 w-full rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-5px shadow-dropmenu"
      >
        {suggestions.length > 0 ? (
          suggestions.map((suggestion) => (
            <button
              key={suggestion.taxId}
              type="button"
              onClick={() => selectSuggestionHandler(suggestion)} // Info: (20241223 - Anna) 點擊選擇建議
              className="block w-full px-4 py-2 text-left hover:bg-gray-200"
            >
              {suggestion.name}
            </button>
          ))
        ) : (
          <p className="px-4 py-2 text-sm text-gray-500">{t('common:NO_SUGGESTIONS')}</p>
        )}
      </div>
    ) : null;

  const isDisplayModal = isModalVisible ? (
    <div className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
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
                  required
                  className={`h-46px flex-1 rounded-sm border bg-input-surface-input-background p-10px text-input-text-input-filled outline-none ${
                    isNameDuplicate ? 'border-red-500' : 'border-input-stroke-input'
                  }`}
                />
                {displayedDropdown} {/*  Info: (20241223 - Anna) 顯示下拉選單 */}
              </div>
            </div>

            {/* Info: (20240924 - tzuhan) Tax Id */}
            <div className="relative flex w-full flex-1 flex-col items-start gap-2">
              <div id="counterparty-tax-id" className="absolute -top-20"></div>
              <p className="text-sm font-semibold text-input-text-primary">
                {t('certificate:COUNTERPARTY.TAX_NUMBER')}
              </p>
              <div className="flex w-full items-center">
                <input
                  id="input-party-tax-id"
                  type="text"
                  placeholder={t('certificate:COUNTERPARTY.ENTER_NUMBER')}
                  value={inputTaxId}
                  onChange={taxIdChangeHandler}
                  className="h-46px flex-1 rounded-sm border border-input-stroke-input bg-input-surface-input-background p-10px text-input-text-input-filled outline-none"
                />
              </div>
            </div>

            {/* Info: (20240924 - tzuhan) Partner Type */}
            <div ref={typeMenuRef} className="flex w-full flex-col items-start gap-2">
              <p className="font-semibold">
                {t('certificate:COUNTERPARTY.PARTNER_TYPE')}
                <span className="text-text-state-error">*</span>
              </p>
              <div
                onClick={selectTypeHandler}
                className={`relative flex w-full items-center justify-between gap-8px rounded-sm border ${
                  showHint && !inputType ? inputStyle.ERROR : inputStyle.NORMAL
                } bg-input-surface-input-background px-10px py-12px hover:cursor-pointer`}
              >
                <p className="text-input-text-input-filled">
                  {inputType
                    ? t(`certificate:COUNTERPARTY.${inputType.toUpperCase()}`)
                    : t('certificate:COUNTERPARTY.SELECT_TYPE')}
                </p>
                <div className={isTypeMenuOpen ? 'rotate-180' : 'rotate-0'}>
                  <FaChevronDown />
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
