import React, {
  forwardRef,
  useRef,
  useState,
  useCallback,
  useEffect,
  useImperativeHandle,
} from 'react';
import { useTranslation } from 'next-i18next';
import { FiSearch } from 'react-icons/fi';
import { inputStyle } from '@/constants/display';
import { ToastId } from '@/constants/toast_id';
import { APIName } from '@/constants/api_connection';
import { useUserCtx } from '@/contexts/user_context';
import { useModalContext } from '@/contexts/modal_context';
import APIHandler from '@/lib/utils/api_handler';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { IPaginatedData } from '@/interfaces/pagination';
import { ICounterparty, ICounterpartyOptional } from '@/interfaces/counterparty';
import { MessageType } from '@/interfaces/message_modal';
import { ToastType } from '@/interfaces/toastify';
import Loader, { LoaderSize } from '@/components/loader/loader';
import { ICompanyTaxIdAndName } from '@/interfaces/company';

interface ICounterpartyInputProps {
  counterparty: ICounterpartyOptional | undefined;
  onSelect: (counterparty: ICounterpartyOptional) => void;
  flagOfSubmit?: boolean;
  className?: string;
}

export interface CounterpartyInputRef {
  triggerSearch: () => void;
}

const CounterpartyInput = forwardRef<CounterpartyInputRef, ICounterpartyInputProps>(
  (props, ref) => {
    const { counterparty, onSelect, flagOfSubmit, className } = props;
    const { t } = useTranslation(['certificate', 'common']);

    const { selectedCompany } = useUserCtx();
    const companyId = selectedCompany?.id;

    const { trigger: getCounterpartyList } = APIHandler<IPaginatedData<ICounterparty[]>>(
      APIName.COUNTERPARTY_LIST
    );
    const { trigger: fetchCompanyDataAPI } = APIHandler<ICompanyTaxIdAndName>(
      APIName.COMPANY_SEARCH_BY_NAME_OR_TAX_ID
    );

    const [isLoadingCounterparty, setIsLoadingCounterparty] = useState(false);
    const [counterpartyList, setCounterpartyList] = useState<ICounterparty[]>([]);
    const [filteredCounterpartyList, setFilteredCounterpartyList] = useState<
      ICounterpartyOptional[]
    >([]);
    const [searchedCompanies, setSearchedCompanies] = useState<ICompanyTaxIdAndName[]>([]);
    const [searchName, setSearchName] = useState<string>('');
    const [searchTaxId, setSearchTaxId] = useState<string>('');
    const [isShowRedHint, setIsShowRedHint] = useState(false);
    const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

    const {
      isMessageModalVisible,
      messageModalDataHandler,
      messageModalVisibilityHandler,
      addCounterPartyModalDataHandler,
      addCounterPartyModalVisibilityHandler,
      toastHandler,
    } = useModalContext();

    // Info: (20241209 - Julian) 編輯 Counterparty
    const {
      targetRef: counterpartyRef,
      componentVisible: isCounterpartyEditing,
      setComponentVisible: setIsCounterpartyEditing,
    } = useOuterClick<HTMLDivElement>(false);

    // Info: (20241209 - Julian) 選單開關
    const {
      targetRef: counterpartyMenuRef,
      componentVisible: isCounterpartyMenuOpen,
      setComponentVisible: setCounterpartyMenuOpen,
    } = useOuterClick<HTMLDivElement>(false);

    const counterpartyNameInputRef = useRef<HTMLInputElement>(null);
    const counterpartyTaxIdInputRef = useRef<HTMLInputElement>(null);

    // Info: (20241209 - Julian) 清空 Counterparty 搜尋欄位
    const onCancelAddCounterparty = () => {
      setIsCounterpartyEditing(false);
      setCounterpartyMenuOpen(false);
      setSearchName('');
      setSearchTaxId('');
    };

    // Info: (20241227 - Tzuhan) 手動實作防抖函數
    const debounceSearchCompany = async (name: string | undefined, taxId: string | undefined) => {
      // Info: (20241227 - Tzuhan) 清除前一次的計時器，避免頻繁觸發
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      const timer = setTimeout(async () => {
        const { success, data } = await fetchCompanyDataAPI({ query: { name, taxId } });
        if (success && data) {
          setSearchedCompanies((prev) => {
            // Info: (20241227 - Tzuhan) 檢查是否已存在於 searchedCompany 陣列
            const exists = prev.some(
              (company) => company.name === data.name && company.taxId === data.taxId
            );
            if (!exists && (!!data.name || !!data.taxId)) {
              return [...prev, data];
            }
            return prev;
          });
        }
      }, 300); // Info: (20241227 - Tzuhan) 300ms 防抖時間

      setDebounceTimer(timer);
    };

    const handleAddCounterparty = (newCounterparty: ICounterparty) => {
      if (!companyId) return;

      setCounterpartyList((prev) => [...prev, newCounterparty]);
      toastHandler({
        id: ToastId.ADD_COUNTERPARTY_SUCCESS,
        type: ToastType.SUCCESS,
        content: t('certificate:COUNTERPARTY.SUCCESS'),
        closeable: true,
      });

      // Info: (20241206 - Julian) 選中新增的交易夥伴
      onSelect(newCounterparty);
    };

    // Info: (20241209 - Julian) 編輯 Counterparty 事件：展開選單、取得 Counterparty 列表
    const counterpartyEditingHandler = async () => {
      setIsCounterpartyEditing(true);
      setIsLoadingCounterparty(true);
      setCounterpartyMenuOpen(true);
      const { success, data } = await getCounterpartyList({
        params: { companyId },
      });
      if (success) {
        setCounterpartyList(data?.data ?? []);
        setFilteredCounterpartyList(data?.data ?? []);
      }
      setIsLoadingCounterparty(false);
    };

    const onAddCounterparty = async () => {
      addCounterPartyModalVisibilityHandler();
    };
    // Info: (20241209 - Julian) 變更 Counterparty 事件：顯示是否新增 Counterparty 的視窗
    const counterpartySearchHandler = useCallback(
      async (showModal = true) => {
        if (searchName || searchTaxId) {
          const isInCounterpartyList = counterpartyList.some(
            (party) => party.name === searchName && party.taxId === searchTaxId
          );
          if (showModal && !isInCounterpartyList) {
            messageModalDataHandler({
              messageType: MessageType.INFO,
              title: t('certificate:COUNTERPARTY.TITLE'),
              content: t('certificate:COUNTERPARTY.CONTENT', {
                counterparty: `${searchTaxId} ${searchName}`,
              }),
              backBtnStr: t('certificate:COUNTERPARTY.NO'),
              backBtnFunction: onCancelAddCounterparty,
              submitBtnStr: t('certificate:COUNTERPARTY.YES'),
              submitBtnFunction: () => onAddCounterparty(),
            });
            messageModalVisibilityHandler();
          }
        }
      },
      [searchName, searchTaxId]
    );

    useEffect(() => {
      // Info: (20241209 - Julian) 如果 flagOfSubmit 改變，則顯示紅色提示
      setIsShowRedHint(true);
    }, [flagOfSubmit]);

    useEffect(() => {
      // Info: (20241209 - Julian) 如果 Counterparty 改變，則取消紅色提示
      setIsShowRedHint(false);
    }, [counterparty]);

    // Info: (20241209 - Julian) Counterparty 搜尋欄位事件
    const counterpartyInputHandler = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isMessageModalVisible) return;
      setCounterpartyMenuOpen(true);
      let taxId = searchTaxId;
      let name = searchName;
      if (e.target.id === 'counterparty-tax-id') {
        taxId = e.target.value;
        setSearchTaxId(taxId);
      }
      if (e.target.id === 'counterparty-name') {
        name = e.target.value;
        setSearchName(name);
      }
      onSelect({ name, taxId });
      // Info: (20241209 - Julian) 將資料傳入 AddCounterpartyModal
      addCounterPartyModalDataHandler({
        onSave: handleAddCounterparty,
        name,
        taxId,
      });

      // 執行防抖搜尋
      await debounceSearchCompany(name, taxId);
      const filteredList = counterpartyList.filter((party) => {
        // Info: (20241209 - Julian) 編號(數字)搜尋: 字首符合
        if (taxId.match(/^\d+$/)) {
          const codeMatch = party.taxId.toString().toLowerCase().startsWith(taxId.toLowerCase());
          return codeMatch;
        } else if (name !== '') {
          // Info: (20241209 - Julian) 名稱搜尋: 部分符合
          const nameMatch = party.name.toLowerCase().includes(name.toLowerCase());
          return nameMatch;
        }
        return true;
      });
      const filteredCompany = e.target.value
        ? searchedCompanies.filter((company) => {
            // Info: (20241209 - Julian) 編號(數字)搜尋: 字首符合
            if (taxId.match(/^\d+$/)) {
              const codeMatch = company.taxId
                .toString()
                .toLowerCase()
                .startsWith(taxId.toLowerCase());
              return codeMatch;
            } else if (name !== '') {
              // Info: (20241209 - Julian) 名稱搜尋: 部分符合
              const nameMatch = company.name.toLowerCase().includes(name.toLowerCase());
              return nameMatch;
            }
            return true;
          })
        : [];
      setFilteredCounterpartyList([...filteredList, ...filteredCompany]);
      setIsLoadingCounterparty(true);
      setIsLoadingCounterparty(false);
    };

    const counterpartyInput =
      isCounterpartyEditing || (!counterparty?.taxId && !counterparty?.name) ? (
        <div className="flex w-full">
          <input
            id="counterparty-tax-id"
            ref={counterpartyTaxIdInputRef}
            value={searchTaxId}
            onChange={counterpartyInputHandler}
            type="text"
            placeholder={t('certificate:EDIT.ID_NUMBER')}
            className="w-100px truncate border-r bg-transparent px-12px py-10px outline-none"
          />
          <input
            id="counterparty-name"
            ref={counterpartyNameInputRef}
            value={searchName}
            onChange={counterpartyInputHandler}
            type="text"
            placeholder={t('certificate:EDIT.NAME')}
            className="flex-1 truncate bg-transparent px-12px py-10px outline-none"
          />
        </div>
      ) : (
        <div
          className={`flex truncate ${counterparty ? 'text-dropdown-text-input-filled' : 'text-dropdown-text-secondary'}`}
        >
          <p className="w-100px border-r px-12px py-10px">
            {counterparty?.taxId ?? t('certificate:EDIT.ID_NUMBER')}
          </p>
          <p className="px-12px py-10px">{counterparty?.name ?? t('certificate:EDIT.NAME')}</p>
        </div>
      );

    const counterpartyClickHandler = (company: ICounterpartyOptional) => {
      onSelect(company);
      // Info: (20241209 - Julian) 關閉 Counterparty Menu 和編輯狀態
      setCounterpartyMenuOpen(false);
      setIsCounterpartyEditing(false);
      // Info: (20241209 - Julian) 重置搜尋關鍵字
      setSearchName(company.name || '');
      setSearchTaxId(company.taxId || '');
      addCounterPartyModalDataHandler({
        onSave: handleAddCounterparty,
        name: company.name || '',
        taxId: company.taxId || '',
      });
    };

    const counterpartyItems =
      filteredCounterpartyList.length > 0
        ? filteredCounterpartyList.map((partner) => {
            return (
              <button
                key={partner.id}
                type="button"
                onClick={() => counterpartyClickHandler(partner)}
                className="flex w-full text-left text-sm hover:bg-dropdown-surface-menu-background-secondary"
              >
                <p className="w-100px border-r px-12px py-8px text-dropdown-text-primary">
                  {partner.taxId}
                </p>
                <p className="px-12px py-8px text-dropdown-text-secondary">{partner.name}</p>
              </button>
            );
          })
        : null;

    const displayedCounterpartyMenu = (
      <div
        ref={counterpartyMenuRef}
        className={`absolute left-0 top-50px z-30 grid w-full overflow-hidden ${
          isCounterpartyMenuOpen && (filteredCounterpartyList.length > 0 || isLoadingCounterparty)
            ? 'grid-rows-1'
            : 'grid-rows-0'
        } rounded-sm shadow-dropmenu transition-all duration-150 ease-in-out`}
      >
        {isLoadingCounterparty ? (
          <Loader size={LoaderSize.SMALL} />
        ) : (
          <div className="flex max-h-150px flex-col overflow-y-auto rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary py-8px">
            {counterpartyItems}
          </div>
        )}
      </div>
    );

    useImperativeHandle(ref, () => ({
      triggerSearch: counterpartySearchHandler,
    }));

    return (
      <div className={`relative flex w-full flex-1 flex-col items-start gap-2 ${className}`}>
        <p className="text-sm font-semibold text-input-text-primary">
          {t('certificate:EDIT.COUNTERPARTY')}
          <span className="text-text-state-error">*</span>
        </p>
        <div ref={counterpartyRef} className="relative w-full">
          <div
            onClick={counterpartyEditingHandler}
            className={`flex items-center justify-between rounded-sm border ${
              isShowRedHint ? inputStyle.ERROR : inputStyle.NORMAL
            } bg-input-surface-input-background hover:cursor-pointer`}
          >
            {counterpartyInput}
            <FiSearch
              size={20}
              className={`absolute right-3 top-3 cursor-pointer ${!searchName && !searchTaxId ? 'text-input-text-primary' : 'text-input-text-input-filled'}`}
              // onClick={() => counterpartySearchHandler(false)}
            />
          </div>
          {displayedCounterpartyMenu}
        </div>
      </div>
    );
  }
);

export default CounterpartyInput;
