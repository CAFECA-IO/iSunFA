import React, { useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import CounterpartyItem from '@/components/counterparty/counterparty_item';
import Pagination from '@/components/pagination/pagination';
import SortingButton from '@/components/voucher/sorting_button';
import { SortOrder } from '@/constants/sort';
import { ICounterparty } from '@/interfaces/counterparty';
import Image from 'next/image';

interface CounterpartyListProps {
  counterparties: ICounterparty[];
  searchQuery: string; // Info: (20241106 - Anna) 接收來自上層的搜尋關鍵字
  handleSave: () => void; // Info: (20241118 - Anna) 新增 handleSave 屬性
  totalCount: number;
}

const CounterpartyList: React.FC<CounterpartyListProps> = ({
  counterparties,
  searchQuery,
  handleSave,
  totalCount,
}) => {
  const { t } = useTranslation(['common', 'certificate']);

  // Info: (20241106 - Anna) 將 CounterPartyList 的狀態類型設為 ICounterPartyEntity[]
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1); // Info: (20241101 - Anna) 動態 totalPages 狀態
  // Info: (20250106 - Julian) 排序狀態
  const [typeSort, setTypeSort] = useState<null | SortOrder>(null);
  const itemsPerPage = 10; // Info: (20241112 - Anna) 每頁顯示的項目數量

  // Info: (20250106 - Julian) 排序按鈕
  const displayedType = SortingButton({
    string: t('common:COMMON.TYPE'),
    sortOrder: typeSort,
    setSortOrder: setTypeSort,
  });

  // Info: (20241112 - Anna) 過濾資料並計算頁數
  const filteredCounterparties = searchQuery
    ? counterparties.filter(
        (item) => item.name.includes(searchQuery) || item.note.includes(searchQuery)
      )
    : counterparties;

  // Info: (20241112 - Anna) 更新 totalPages 和重置到第1頁
  useEffect(() => {
    setTotalPages(Math.ceil(filteredCounterparties.length / itemsPerPage));
    setCurrentPage(1); // Info: (20241112 - Anna) 當過濾條件改變時，重置頁碼到第 1 頁
  }, [filteredCounterparties]);

  // Info: (20241112 - Anna) 根據當前頁碼進行分頁
  const displayedCounterPartyList = filteredCounterparties.map((counterparty) => (
    <CounterpartyItem
      key={counterparty.id}
      counterparty={counterparty}
      handleSave={handleSave} // Info: (20241118 - Anna) 傳遞給 CounterpartyItem
    />
  ));

  if (!filteredCounterparties.length) {
    return (
      <div className="-mt-40 flex h-screen flex-col items-center justify-center">
        <Image src="/images/empty.svg" alt="No data image" width={120} height={135} />
        <div>
          <p className="text-neutral-300">{t('certificate:COUNTERPARTY.NO_DATA_AVAILABLE')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="hide-scrollbar overflow-x-auto">
        <div className="min-w-900px">
          <div className="mb-4 table w-full overflow-hidden rounded-lg bg-surface-neutral-surface-lv2 shadow-Dropshadow_XS">
            <div className="table-header-group border-b bg-surface-neutral-surface-lv1 text-sm text-text-neutral-tertiary">
              <div className="table-row h-60px">
                <div
                  className={`table-cell w-225px border-b border-r border-stroke-neutral-quaternary text-center align-middle`}
                >
                  {t('common:COMMON.PARTNER_S_NAME')}
                </div>
                <div
                  className={`table-cell w-100px border-b border-r border-stroke-neutral-quaternary text-center align-middle`}
                >
                  {t('common:COMMON.TAX_ID')}
                </div>
                <div
                  className={`table-cell w-140px border-b border-r border-stroke-neutral-quaternary text-center align-middle`}
                >
                  {displayedType}
                </div>
                <div
                  className={`table-cell border-b border-r border-stroke-neutral-quaternary text-center align-middle`}
                >
                  {t('certificate:COUNTERPARTY.NOTE')}
                </div>
                <div
                  className={`table-cell w-100px border-b border-stroke-neutral-quaternary text-center align-middle`}
                >
                  {t('common:COMMON.OPERATIONS')}
                </div>
              </div>
            </div>

            <div className="table-row-group bg-neutral-white">{displayedCounterPartyList}</div>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-10">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          setCurrentPage={setCurrentPage}
          totalCount={totalCount}
        />
      </div>
    </div>
  );
};

export default CounterpartyList;
