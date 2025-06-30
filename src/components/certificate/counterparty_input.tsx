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
import { ICounterparty, ICounterpartyOptional } from '@/interfaces/counterparty';
import { MessageType } from '@/interfaces/message_modal';
import { ToastType } from '@/interfaces/toastify';
import Loader, { LoaderSize } from '@/components/loader/loader';
import { ICompanyTaxIdAndName } from '@/interfaces/account_book';

interface ICounterpartyInputProps {
  counterparty: ICounterpartyOptional | undefined;
  counterpartyList: ICounterparty[];
  onSelect: (counterparty: ICounterpartyOptional) => void;
  className?: string;
  labelClassName?: string;
  counterpartyRole?: 'buyer' | 'seller' | 'both';
}

export interface CounterpartyInputRef {
  triggerSearch: () => void;
}

let debounceTimer: NodeJS.Timeout | null = null;

const CounterpartyInput = forwardRef<CounterpartyInputRef, ICounterpartyInputProps>(
  (props, ref) => {
    const { counterparty, counterpartyList, onSelect, className } = props;
    const { t } = useTranslation(['certificate', 'common']);

    const { connectedAccountBook } = useUserCtx();
    const companyId = connectedAccountBook?.id;

    const { trigger: fetchCompanyDataAPI } = APIHandler<ICompanyTaxIdAndName>(
      APIName.ACCOUNT_BOOK_SEARCH_BY_NAME_OR_TAX_ID
    );

    const [isLoadingCounterparty, setIsLoadingCounterparty] = useState(false);
    const [filteredCounterpartyList, setFilteredCounterpartyList] = useState<
      ICounterpartyOptional[]
    >([]);
    const [searchedCompanies, setSearchedCompanies] = useState<ICompanyTaxIdAndName[]>([]);
    const [searchName, setSearchName] = useState<string>(counterparty?.name || '');
    const [searchTaxId, setSearchTaxId] = useState<string>(counterparty?.taxId || '');

    const {
      isMessageModalVisible,
      messageModalDataHandler,
      messageModalVisibilityHandler,
      addCounterPartyModalDataHandler,
      addCounterPartyModalVisibilityHandler,
      toastHandler,
    } = useModalContext();

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
      setCounterpartyMenuOpen(false);
      setSearchName('');
      setSearchTaxId('');
    };

    // Info: (20241227 - Tzuhan) 手動實作防抖函數
    const debounceSearchCompany = (name: string | undefined, taxId: string | undefined) => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(async () => {
        // Info: (20250626 - Anna) 檢查目前輸入是否已經在列表中
        const alreadyInList = counterpartyList.some(
          (party) => party.name === name || party.taxId === taxId
        );
        if (alreadyInList) return;

        const { success, data } = await fetchCompanyDataAPI({ query: { name, taxId } });

        if (success && data) {
          setSearchedCompanies((prev) => {
            const exists = prev.some(
              (company) => company.name === data.name && company.taxId === data.taxId
            );
            if (!exists && (!!data.name || !!data.taxId)) {
              return [...prev, data];
            }
            return prev;
          });
        }
      }, 300);
    };

    const handleAddCounterparty = (newCounterparty: ICounterparty) => {
      if (!companyId) return;

      toastHandler({
        id: ToastId.ADD_COUNTERPARTY_SUCCESS,
        type: ToastType.SUCCESS,
        content: t('certificate:COUNTERPARTY.SUCCESS'),
        closeable: true,
      });

      // Info: (20241206 - Julian) 選中新增的交易夥伴
      onSelect(newCounterparty);
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

    // Info: (20241204 - tzuhan) 篩選函式抽取，減少重複代碼
    const filterByCriteria = (list: ICounterpartyOptional[], taxId?: string, name?: string) => {
      const updatedTaxId = taxId ?? searchTaxId;
      const updatedName = name ?? searchName;

      return list.filter((item) => {
        // Info: (20241204 - tzuhan) 稅號篩選，需匹配數字開頭
        if (updatedTaxId && updatedTaxId.match(/^\d+$/)) {
          if (!item.taxId || !item.taxId.toLowerCase().startsWith(updatedTaxId.toLowerCase())) {
            return false;
          }
        }

        // Info: (20241204 - tzuhan) 如果 name 存在，則進行模糊匹配
        if (updatedName) {
          const searchWords = updatedName
            .toLowerCase()
            .split(/[\s,]+/)
            .filter(Boolean);
          const nameMatch = searchWords.some((word) => item.name?.toLowerCase().includes(word));
          if (!nameMatch) {
            return false;
          }
        }

        return true;
      });
    };

    // Info: (20241209 - Julian) Counterparty 搜尋欄位事件
    const counterpartyInputHandler = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isMessageModalVisible) return;

      // Info: (20241204 - tzuhan) 更新搜尋條件
      const { id, value } = e.target;
      const updatedTaxId = id === 'counterparty-tax-id' ? value : searchTaxId;
      const updatedName = id === 'counterparty-name' ? value : searchName;

      setSearchTaxId(updatedTaxId);
      setSearchName(updatedName);

      // Info: (20241204 - tzuhan) 更新選擇內容
      onSelect({ name: updatedName, taxId: updatedTaxId });

      // Info: (20241204 - tzuhan) 更新模態框資料
      addCounterPartyModalDataHandler({
        onSave: handleAddCounterparty,
        name: updatedName,
        taxId: updatedTaxId,
      });

      // Info: (20241204 - tzuhan) 執行防抖搜尋
      debounceSearchCompany(updatedName, updatedTaxId);

      // Info: (20250113 - Tzuhan) 加載狀態切換（優化效能，避免多餘狀態更新）
      if (!isLoadingCounterparty) {
        setIsLoadingCounterparty(true);
        setIsLoadingCounterparty(false);
      }
    };

    useEffect(() => {
      // Info: (20241204 - tzuhan) 同時篩選 counterparty 和 searchedCompanies
      const filteredList = filterByCriteria(counterpartyList);
      const filteredCompany = filterByCriteria(searchedCompanies);
      const mergedList = [...filteredList, ...filteredCompany];

      setFilteredCounterpartyList(mergedList);
    }, [searchTaxId, searchName, counterpartyList, searchedCompanies]);

    // Info: (20250415 - Anna) 只要 counterparty?.name 或 counterparty?.taxId 有變動（包含切換到不同的傳票筆數），就會執行
    useEffect(() => {
      setSearchName(counterparty?.name || '');
      setSearchTaxId(counterparty?.taxId || '');
    }, [counterparty?.name, counterparty?.taxId]);

    const counterpartyInput = (
      // isCounterpartyEditing || (!counterparty?.taxId && !counterparty?.name) ?
      <div className="flex w-full">
        <input
          id="counterparty-tax-id"
          ref={counterpartyTaxIdInputRef}
          value={searchTaxId}
          onChange={counterpartyInputHandler}
          onFocus={() => setCounterpartyMenuOpen(true)}
          type="text"
          placeholder={t('certificate:EDIT.ID_NUMBER')}
          className="w-100px truncate border-r bg-transparent px-12px py-10px outline-none"
        />
        <input
          id="counterparty-name"
          ref={counterpartyNameInputRef}
          value={searchName}
          onChange={counterpartyInputHandler}
          onFocus={() => setCounterpartyMenuOpen(true)}
          type="text"
          placeholder={t('certificate:EDIT.NAME')}
          className="w-28 overflow-hidden truncate bg-transparent px-12px py-10px outline-none iphonexr:w-40 iphone12promax:w-44 lg:flex-1"
        />
      </div>
    );
    //  : (
    //   <div
    //     className={`flex truncate ${counterparty ? 'text-dropdown-text-input-filled' : 'text-dropdown-text-secondary'}`}
    //   >
    //     <p className="w-100px border-r px-12px py-10px">
    //       {counterparty?.taxId ?? t('certificate:EDIT.ID_NUMBER')}
    //     </p>
    //     <p className="px-12px py-10px">{counterparty?.name ?? t('certificate:EDIT.NAME')}</p>
    //   </div>
    // );

    const counterpartySelectHandler = (company: ICounterpartyOptional) => {
      onSelect(company);
      // Info: (20241209 - Julian) 關閉 Counterparty Menu 和編輯狀態
      setCounterpartyMenuOpen(false);
      // Info: (20241209 - Julian) 重置搜尋關鍵字
      setSearchName(company.name || '');
      setSearchTaxId(company.taxId || '');
      addCounterPartyModalDataHandler({
        onSave: handleAddCounterparty,
        name: company.name || '',
        taxId: company.taxId || '',
      });
    };

    const displayedCounterpartyMenu = (
      <div
        className={`absolute left-0 top-50px z-30 grid w-full overflow-hidden ${
          isCounterpartyMenuOpen ? 'grid-rows-1' : 'grid-rows-0'
        } rounded-sm shadow-dropmenu transition-all duration-150 ease-in-out`}
      >
        <div className="flex max-h-150px flex-col overflow-y-auto rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary py-8px">
          {filteredCounterpartyList.map((partner) => {
            return (
              <button
                key={partner.id}
                type="button"
                onClick={() => counterpartySelectHandler(partner)}
                className="flex w-full text-left text-sm hover:bg-dropdown-surface-menu-background-secondary"
              >
                <p className="w-100px border-r px-12px py-8px text-dropdown-text-primary">
                  {partner.taxId}
                </p>
                <p className="px-12px py-8px text-dropdown-text-secondary">{partner.name}</p>
              </button>
            );
          })}
        </div>
        {isLoadingCounterparty && <Loader size={LoaderSize.SMALL} />}
      </div>
    );

    useImperativeHandle(ref, () => ({
      triggerSearch: counterpartySearchHandler,
    }));

    return (
      <div className={`relative flex w-full flex-1 flex-col items-start gap-2 ${className}`}>
        <p className={`text-sm font-semibold ${props.labelClassName ?? 'text-input-text-primary'}`}>
          {t(
            props.counterpartyRole === 'seller'
              ? 'certificate:EDIT.SELLER'
              : props.counterpartyRole === 'buyer'
                ? 'certificate:EDIT.BUYER'
                : 'certificate:EDIT.COUNTERPARTY'
          )}
        </p>
        <div className="relative w-full" ref={counterpartyMenuRef}>
          <div
            className={`flex items-center justify-between rounded-sm border ${inputStyle.NORMAL} bg-input-surface-input-background hover:cursor-pointer`}
          >
            {counterpartyInput}
            <FiSearch
              size={20}
              className={`absolute right-3 top-3 cursor-pointer ${!searchName && !searchTaxId ? 'text-input-text-primary' : 'text-input-text-input-filled'}`}
              onClick={() => {
                // Info: (20250626 - Anna) 檢查目前輸入是否已經在列表中
                const isInCounterpartyList = counterpartyList.some(
                  (party) => party.name === searchName || party.taxId === searchTaxId
                );
                counterpartySearchHandler(!isInCounterpartyList);
              }}
            />
          </div>
          {displayedCounterpartyMenu}
        </div>
      </div>
    );
  }
);

export default CounterpartyInput;
