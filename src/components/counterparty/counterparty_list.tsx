import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import CounterpartyItem from '@/components/counterparty/counterparty_item';
import Pagination from '@/components/pagination/pagination';
import SortingButton from '@/components/voucher/sorting_button';
import { SortOrder } from '@/constants/sort';
import { CounterpartyType } from '@/constants/counterparty';
import { SkeletonList } from '@/components/skeleton/skeleton';
import type { ICounterPartyEntity } from 'src/interfaces/counterparty';

interface CounterpartyListProps {
  searchQuery: string; // Info: (20241106 - Anna) 接收來自上層的搜尋關鍵字
}

const CounterpartyList: React.FunctionComponent<CounterpartyListProps> = ({ searchQuery }) => {
  const { t } = useTranslation('common');

  // Info: (20241106 - Anna) 將 CounterPartyList 的狀態類型設為 ICounterPartyEntity[]
  const [counterPartyList, setCounterPartyList] = useState<ICounterPartyEntity[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1); // (20241101 - Anna) 動態 totalPages 狀態
  // Info: (20240920 - Julian) 排序狀態
  const [dateSort, setDateSort] = useState<null | SortOrder>(null);

  // Info: (20241106 - Anna) 排序按鈕
  const displayedDate = SortingButton({
    string: t('common:COMMON.PARTNER_S_NAME'),
    sortOrder: dateSort,
    setSortOrder: setDateSort,
  });

  // Info: (20241106 - Anna) 新增狀態和參考變量以追蹤首次加載和搜尋
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Info: (20241106 - Anna) 初始值設為 true 以顯示 Skeleton

  const fetchCounterpartyData = useCallback(async () => {
    // Info: (20241106 - Anna) 使用符合 ICounterPartyEntity 結構的靜態資料
    const counterpartyData: ICounterPartyEntity[] = [
      {
        id: 1,
        companyId: 100,
        name: 'Company A',
        taxId: '123456789',
        type: CounterpartyType.SUPPLIER,
        note: 'Sample Note A',
        createdAt: 1702511200,
        updatedAt: 1702511200,
        deletedAt: null,
      },
      {
        id: 2,
        companyId: 101,
        name: 'Company B',
        taxId: '987654321',
        type: CounterpartyType.CLIENT,
        note: 'Sample Note B',
        createdAt: 1702511200,
        updatedAt: 1702511200,
        deletedAt: null,
      },
      {
        id: 3,
        companyId: 102,
        name: 'Company C',
        taxId: '555555555',
        type: CounterpartyType.BOTH,
        note: 'Sample Note C',
        createdAt: 1702511200,
        updatedAt: 1702511200,
        deletedAt: null,
      },
    ];

    // Info: (20241106 - Anna) 使用 searchQuery 過濾靜態數據
    const filteredData = counterpartyData.filter(
      (item) => item.name.includes(searchQuery) || item.note.includes(searchQuery)
    );

    setCounterPartyList(filteredData);
    setTotalPages(1);

    setHasFetchedOnce(true);
    setIsLoading(false); // Info: (20241106 - Anna) 加載完成後將 isLoading 設為 false
  }, [searchQuery]);

  /* Info: (20241106 - Anna) 當搜尋關鍵字改變時觸發數據加載 */
  useEffect(() => {
    fetchCounterpartyData();
  }, [fetchCounterpartyData, searchQuery]);

  if (!hasFetchedOnce && !isLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <div>
          <p className="text-neutral-300">{t('report_401:REPORT.NO_DATA_AVAILABLE')}</p>
          <p className="text-neutral-300">{t('report_401:REPORT.PLEASE_SELECT_PERIOD')}</p>
        </div>
      </div>
    );
  } else if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-surface-neutral-main-background">
        <SkeletonList count={5} />
      </div>
    );
  }

  // Info: (20241106 - Anna) updated: displayedCounterPartyList 將每個 counterpartyItem 傳給 CounterpartyItem
  const displayedCounterPartyList = counterPartyList.map((counterparty) => (
    <CounterpartyItem key={counterparty.id} counterparty={counterparty} />
  ));

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
