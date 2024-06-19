import { useState } from 'react';
import { FaChevronDown, FaListUl } from 'react-icons/fa';
import { FiGrid, FiSearch } from 'react-icons/fi';
import { Layout } from '@/constants/layout';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { IDatePeriod } from '@/interfaces/date_period';
import { default30DayPeriodInSec } from '@/constants/display';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import { Button } from '@/components/button/button';

enum ContractStatus {
  VALID = 'Valid',
  IN_WARRANTY = 'In Warranty',
  EXPIRED = 'Expired',
  COMPLETED = 'Completed',
}

enum ContractSort {
  NEWEST = 'Newest',
  OLDEST = 'Oldest',
}

const ProjectContractsPageBody = () => {
  // Info: (2024618 - Julian) add 'ALL' to the list
  const statusList = ['All', ...Object.values(ContractStatus)];

  const [currentLayout, setCurrentLayout] = useState<Layout>(Layout.LIST);
  const [filterStatus, setFilterStatus] = useState<string>(statusList[0]);
  const [sort, setSort] = useState<string>(ContractSort.NEWEST);
  const [filterPeriod, setFilterPeriod] = useState<IDatePeriod>(default30DayPeriodInSec);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [search, setSearch] = useState<string>('');

  const {
    targetRef: statusRef,
    componentVisible: statusVisible,
    setComponentVisible: setStatusVisible,
  } = useOuterClick<HTMLDivElement>(false);

  const {
    targetRef: sortRef,
    componentVisible: sortVisible,
    setComponentVisible: setSortVisible,
  } = useOuterClick<HTMLDivElement>(false);

  const listBtnStyle = currentLayout === Layout.LIST ? 'tertiary' : 'secondaryOutline';
  const gridBtnStyle = currentLayout === Layout.GRID ? 'tertiary' : 'secondaryOutline';

  const searchHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
  };

  const listLayoutHandler = () => setCurrentLayout(Layout.LIST);
  const gridLayoutHandler = () => setCurrentLayout(Layout.GRID);

  const statusClickHandler = () => setStatusVisible(!statusVisible);
  const sortClickHandler = () => setSortVisible(!sortVisible);

  const statusDropdown = (
    <div
      className={`absolute left-0 top-50px w-full rounded-xs border border-input-stroke-input bg-input-surface-input-background
      ${statusVisible ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-10 opacity-0'} 
      z-10 px-12px py-8px text-sm shadow-md transition-all duration-300 ease-in-out`}
    >
      {statusList.map((status) => {
        const clickHandler = () => {
          setFilterStatus(status);
          setStatusVisible(false);
        };
        return (
          <button
            key={status}
            type="button"
            className="w-full p-8px text-left hover:bg-dropdown-surface-item-hover"
            onClick={clickHandler}
          >
            {status}
          </button>
        );
      })}
    </div>
  );

  const sortDropdown = (
    <div
      className={`absolute left-0 top-50px w-full rounded-xs border border-input-stroke-input bg-input-surface-input-background
      ${sortVisible ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-10 opacity-0'} 
      z-10 px-12px py-8px text-sm shadow-md transition-all duration-300 ease-in-out`}
    >
      <button
        type="button"
        className="w-full p-8px text-left hover:bg-dropdown-surface-item-hover"
        onClick={() => setSort(ContractSort.NEWEST)}
      >
        {ContractSort.NEWEST}
      </button>
      <button
        type="button"
        className="w-full p-8px text-left hover:bg-dropdown-surface-item-hover"
        onClick={() => setSort(ContractSort.OLDEST)}
      >
        {ContractSort.OLDEST}
      </button>
    </div>
  );

  return (
    <div className="flex flex-1 flex-col items-center">
      {/* Info: (20240618 - Julian) Filter */}
      <div className="flex w-full flex-col items-center gap-x-24px gap-y-40px md:h-80px md:flex-row md:items-end">
        {/* Info: (20240618 - Julian) Status filter */}
        <div className="flex flex-col items-start gap-y-8px">
          <p className="font-semibold text-input-text-primary">Status</p>
          <div
            ref={statusRef}
            onClick={statusClickHandler}
            className={`relative flex w-130px items-center justify-between rounded-xs border border-input-stroke-input 
            ${statusVisible ? 'border-input-stroke-input-hover' : 'border-input-stroke-input'} 
            bg-input-surface-input-background px-12px py-10px hover:cursor-pointer hover:border-input-stroke-input-hover`}
          >
            <p className="text-text-neutral-primary">{filterStatus}</p>
            <FaChevronDown size={16} />
            {/* Info: (20240618 - Julian) Status dropdown */}
            {statusDropdown}
          </div>
        </div>
        {/* Info: (20240618 - Julian) Sort filter */}
        <div className="flex flex-col items-start gap-y-8px">
          <p className="font-semibold text-input-text-primary">Sort by</p>
          <div
            ref={sortRef}
            onClick={sortClickHandler}
            className={`relative flex w-200px items-center justify-between rounded-xs border border-input-stroke-input 
            ${sortVisible ? 'border-input-stroke-input-hover' : 'border-input-stroke-input'} 
            bg-input-surface-input-background px-12px py-10px hover:cursor-pointer hover:border-input-stroke-input-hover`}
          >
            <p className="text-text-neutral-primary">{sort}</p>
            <FaChevronDown size={16} />
            {/* Info: (20240618 - Julian) Status dropdown */}
            {sortDropdown}
          </div>
        </div>
        {/* Info: (20240618 - Julian) Date picker */}
        <div className="w-280px">
          <DatePicker
            type={DatePickerType.TEXT_PERIOD}
            period={filterPeriod}
            setFilteredPeriod={setFilterPeriod}
          />
        </div>
        {/* Info: (20240618 - Julian) Search bar */}
        <div className="flex w-full flex-1 items-center rounded-xs border border-input-stroke-input bg-input-surface-input-background px-16px text-icon-surface-single-color-primary">
          <input
            id="project-search-bar"
            type="text"
            onChange={searchHandler}
            className="h-44px flex-1 outline-none placeholder:text-input-text-input-placeholder"
            placeholder="Search Contract"
          />
          <FiSearch size={20} />
        </div>
        {/* Info: (20240618 - Julian) Layout Toggle */}
        <div className="ml-auto flex gap-x-8px">
          {/* Info: (20240618 - Julian) List button */}
          <Button type="button" variant={listBtnStyle} className="p-3" onClick={listLayoutHandler}>
            <FaListUl size={20} />
          </Button>
          {/* Info: (20240618 - Julian) Grid button */}
          <Button type="button" variant={gridBtnStyle} className="p-3" onClick={gridLayoutHandler}>
            <FiGrid size={20} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProjectContractsPageBody;
