import { useState } from 'react';
import { FaChevronDown, FaListUl } from 'react-icons/fa';
import { FiGrid, FiSearch } from 'react-icons/fi';
import { Layout } from '@/constants/layout';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { IDatePeriod } from '@/interfaces/date_period';
import { default30DayPeriodInSec } from '@/constants/display';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import { Button } from '@/components/button/button';
import { dummyContracts } from '@/interfaces/contract';
import ContractCard from '@/components/contract_card/contract_card';

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

  const displayContracts = (
    <div className="flex w-full flex-col gap-20px">
      {dummyContracts.map((contract) => (
        <ContractCard key={contract.contractId} contract={contract} />
      ))}
    </div>
  );

  return (
    <div className="flex flex-1 flex-col items-center gap-y-24px">
      {/* Info: (20240618 - Julian) Filter (desktop) */}
      <div className="hidden w-full items-end gap-x-24px gap-y-40px md:flex">
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
            className={`relative flex w-130px items-center justify-between rounded-xs border border-input-stroke-input 
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
        <div className="w-200px">
          <DatePicker
            type={DatePickerType.TEXT_PERIOD}
            period={filterPeriod}
            setFilteredPeriod={setFilterPeriod}
          />
        </div>
        {/* Info: (20240618 - Julian) Search bar */}
        <div className="flex flex-1 items-center rounded-xs border border-input-stroke-input bg-input-surface-input-background px-16px text-icon-surface-single-color-primary">
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
      {/* Info: (20240619 - Julian) Filter (mobile) */}
      <div className="flex w-full flex-col items-end gap-x-24px gap-y-40px md:hidden">
        <div className="flex w-full gap-x-24px">
          {/* Info: (20240619 - Julian) Search bar */}
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
          {/* Info: (20240619 - Julian) filter button */}
          {/* ToDo: (20240619 - Julian) filter modal */}
          <Button type="button" variant="tertiaryOutline" className="p-3">
            <svg
              width="20"
              height="20"
              viewBox="0 0 16 17"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                className="fill-current"
                fillRule="evenodd"
                clipRule="evenodd"
                d="M3.33553 1.83154C3.74974 1.83154 4.08553 2.16733 4.08553 2.58154V5.24821C4.08553 5.66242 3.74974 5.99821 3.33553 5.99821C2.92132 5.99821 2.58553 5.66242 2.58553 5.24821V2.58154C2.58553 2.16733 2.92132 1.83154 3.33553 1.83154ZM8.0022 1.83154C8.41641 1.83154 8.7522 2.16733 8.7522 2.58154V4.63729C9.53221 4.93838 10.0855 5.69534 10.0855 6.58154C10.0855 7.73214 9.15279 8.66488 8.0022 8.66488C6.8516 8.66488 5.91886 7.73214 5.91886 6.58154C5.91886 5.69534 6.47219 4.93838 7.2522 4.63729V2.58154C7.2522 2.16733 7.58798 1.83154 8.0022 1.83154ZM12.6689 1.83154C13.0831 1.83154 13.4189 2.16733 13.4189 2.58154V6.58154C13.4189 6.99576 13.0831 7.33154 12.6689 7.33154C12.2547 7.33154 11.9189 6.99576 11.9189 6.58154V2.58154C11.9189 2.16733 12.2547 1.83154 12.6689 1.83154ZM8.0022 5.99821C7.68003 5.99821 7.41886 6.25938 7.41886 6.58154C7.41886 6.90371 7.68003 7.16488 8.0022 7.16488C8.32436 7.16488 8.58553 6.90371 8.58553 6.58154C8.58553 6.25938 8.32436 5.99821 8.0022 5.99821ZM3.33553 8.66488C3.01336 8.66488 2.7522 8.92604 2.7522 9.24821C2.7522 9.57038 3.01336 9.83154 3.33553 9.83154C3.6577 9.83154 3.91886 9.57038 3.91886 9.24821C3.91886 8.92604 3.6577 8.66488 3.33553 8.66488ZM1.2522 9.24821C1.2522 8.09762 2.18494 7.16488 3.33553 7.16488C4.48612 7.16488 5.41886 8.09762 5.41886 9.24821C5.41886 10.1344 4.86554 10.8914 4.08553 11.1925L4.08553 14.5815C4.08553 14.9958 3.74974 15.3315 3.33553 15.3315C2.92132 15.3315 2.58553 14.9958 2.58553 14.5815L2.58553 11.1925C1.80552 10.8914 1.2522 10.1344 1.2522 9.24821ZM12.6689 9.99821C12.3467 9.99821 12.0855 10.2594 12.0855 10.5815C12.0855 10.9037 12.3467 11.1649 12.6689 11.1649C12.991 11.1649 13.2522 10.9037 13.2522 10.5815C13.2522 10.2594 12.991 9.99821 12.6689 9.99821ZM10.5855 10.5815C10.5855 9.43095 11.5183 8.49821 12.6689 8.49821C13.8195 8.49821 14.7522 9.43095 14.7522 10.5815C14.7522 11.4677 14.1989 12.2247 13.4189 12.5258V14.5815C13.4189 14.9958 13.0831 15.3315 12.6689 15.3315C12.2547 15.3315 11.9189 14.9958 11.9189 14.5815V12.5258C11.1389 12.2247 10.5855 11.4677 10.5855 10.5815ZM8.0022 9.83154C8.41641 9.83154 8.7522 10.1673 8.7522 10.5815V14.5815C8.7522 14.9958 8.41641 15.3315 8.0022 15.3315C7.58798 15.3315 7.2522 14.9958 7.2522 14.5815V10.5815C7.2522 10.1673 7.58798 9.83154 8.0022 9.83154Z"
                fill="#001840"
              />
            </svg>
          </Button>
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
      {/* Info: (2024619 - Julian) Contracts */}
      {displayContracts}
    </div>
  );
};

export default ProjectContractsPageBody;
