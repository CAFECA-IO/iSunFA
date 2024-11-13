import React, { useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import CounterpartyItem from '@/components/counterparty/counterparty_item';
import Pagination from '@/components/pagination/pagination';
import SortingButton from '@/components/voucher/sorting_button';
import { SortOrder } from '@/constants/sort';
import { ICounterparty } from '@/interfaces/counterparty';

interface CounterpartyListProps {
  counterparties: ICounterparty[];
  searchQuery: string; // Info: (20241106 - Anna) 接收來自上層的搜尋關鍵字
}

const CounterpartyList: React.FC<CounterpartyListProps> = ({ counterparties, searchQuery }) => {
  const { t } = useTranslation(['common', 'certificate']);

  // Info: (20241106 - Anna) 將 CounterPartyList 的狀態類型設為 ICounterPartyEntity[]
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1); // (20241101 - Anna) 動態 totalPages 狀態
  // Info: (20240920 - Julian) 排序狀態
  const [dateSort, setDateSort] = useState<null | SortOrder>(null);
  const itemsPerPage = 10; // (20241112 - Anna) 每頁顯示的項目數量

  // Info: (20241106 - Anna) 排序按鈕
  const displayedDate = SortingButton({
    string: t('common:COMMON.PARTNER_S_NAME'),
    sortOrder: dateSort,
    setSortOrder: setDateSort,
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
  const displayedCounterPartyList = filteredCounterparties
    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    .map((counterparty) => <CounterpartyItem key={counterparty.id} counterparty={counterparty} />);

  if (!filteredCounterparties.length) {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <p className="text-neutral-300">{t('common:BETA_DASHBOARD.NO_DATA_AVAILABLE')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="mb-4 table w-full overflow-hidden rounded-lg bg-surface-neutral-surface-lv2">
        <div className="table-header-group border-b bg-surface-neutral-surface-lv1 text-sm text-text-neutral-tertiary">
          <div className="table-row h-60px">
            <div
              className={`table-cell border-b border-r border-stroke-neutral-quaternary text-center align-middle`}
            >
              {displayedDate}
            </div>
            <div
              className={`table-cell border-b border-r border-stroke-neutral-quaternary text-center align-middle`}
            >
              {t('common:COMMON.TAX_ID')}
            </div>
            <div
              className={`table-cell border-b border-r border-stroke-neutral-quaternary text-center align-middle`}
            >
              {t('common:COMMON.TYPE')}
            </div>
            <div
              className={`table-cell border-b border-r border-stroke-neutral-quaternary text-center align-middle`}
            >
              {t('certificate:COUNTERPARTY.NOTE')}
            </div>
            <div
              className={`table-cell border-b border-stroke-neutral-quaternary text-center align-middle`}
            >
              {t('common:COMMON.OPERATIONS')}
            </div>
          </div>
        </div>

        <div className="table-row-group">{displayedCounterPartyList}</div>
      </div>

      <div className="mx-auto mt-10">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          setCurrentPage={setCurrentPage}
        />
      </div>
    </div>
  );
};

export default CounterpartyList;
