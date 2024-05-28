import { Button } from '@/components/button/button';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import { SortOptions, default30DayPeriodInSec } from '@/constants/display';
import { IFilterOptions } from '@/interfaces/modals';
import { AllReportTypesKey, AllReportTypesOptions } from '@/interfaces/report_type';
import useOuterClick from '@/lib/hooks/use_outer_click';
import React, { useEffect } from 'react';
import useStateRef from 'react-usestateref';

interface IFilterOptionsModalProps {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
  getFilterOptions?: (filterOptions: IFilterOptions) => void; // Info: 把 filterOptions 透過 callback function 傳出去 (20240528 - Shirley)
}

const FilterOptionsModal = ({
  isModalVisible,
  modalVisibilityHandler,
  getFilterOptions = () => {},
}: IFilterOptionsModalProps) => {
  const [period, setPeriod, periodRef] = useStateRef(default30DayPeriodInSec);
  const [sort, setSort, sortRef] = useStateRef<SortOptions>(SortOptions.newest);
  const [selectedReportType, setSelectedReportType, selectedReportTypeRef] = useStateRef<
    keyof typeof AllReportTypesOptions
  >(AllReportTypesKey.all as keyof typeof AllReportTypesOptions);
  const [isTypeMenuSelected, setIsTypeMenuSelected] = useStateRef(false);
  const [isSortSelected, setIsSortSelected] = useStateRef(false);

  const {
    targetRef: typeMenuRef,
    componentVisible: isTypeMenuOpen,
    setComponentVisible: setIsTypeMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const {
    targetRef: historySortMenuRef,
    componentVisible: isHistorySortMenuOpen,
    setComponentVisible: setIsHistorySortMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const toggleTypeMenu = () => {
    setIsTypeMenuSelected(true);
    setIsTypeMenuOpen(!isTypeMenuOpen);
  };

  const toggleHistorySortMenu = () => {
    setIsSortSelected(true);
    setIsHistorySortMenuOpen(!isHistorySortMenuOpen);
  };

  useEffect(() => {
    if (!isModalVisible) {
      // Info: 把 filterOptions 透過 callback function 傳出去 (20240528 - Shirley)
      if (getFilterOptions) {
        getFilterOptions({
          period: periodRef.current,
          sort: sortRef.current,
          selectedReportType: selectedReportTypeRef.current,
        });
      }

      // Info: 關掉 modal 後把資料清空 (20240528 - Shirley)
      setPeriod(default30DayPeriodInSec);
      setSort(SortOptions.newest);
      setSelectedReportType(AllReportTypesKey.all as keyof typeof AllReportTypesOptions);
    }
  }, [isModalVisible]);

  const displayedTypeMenu = (
    <div
      ref={typeMenuRef}
      onClick={toggleTypeMenu}
      className={`group relative flex h-44px w-300px cursor-pointer ${isTypeMenuOpen ? 'border-primaryYellow text-primaryYellow' : ''} items-center justify-between rounded-sm border border-input-stroke-input bg-input-surface-input-background p-10px hover:border-primaryYellow hover:text-primaryYellow`}
    >
      <p
        className={`whitespace-nowrap group-hover:text-primaryYellow ${isTypeMenuOpen ? ' text-primaryYellow' : isTypeMenuSelected ? '' : 'text-input-text-input-placeholder'}`}
      >
        {AllReportTypesOptions[selectedReportType as keyof typeof AllReportTypesOptions]}
      </p>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        fill="none"
        viewBox="0 0 20 20"
      >
        <path
          className="fill-current"
          fillRule="evenodd"
          d="M4.472 6.972a.75.75 0 011.06 0l4.47 4.47 4.47-4.47a.75.75 0 011.06 1.06l-5 5a.75.75 0 01-1.06 0l-5-5a.75.75 0 010-1.06z"
          clipRule="evenodd"
        ></path>
      </svg>{' '}
      {/* Info: (20240513 - Shirley) Dropdown menu */}
      <div
        className={`grid-cols-0 absolute left-0 top-50px grid w-full overflow-hidden shadow-dropmenu ${isTypeMenuOpen ? 'grid-rows-1 border-lightGray3' : 'grid-rows-0 border-transparent'} rounded-sm border transition-all duration-150 ease-in-out`}
      >
        {/* Info: 超過高度就顯示卷軸 (20240528 - Shirley) */}
        <ul className="z-10 flex max-h-200px w-full flex-col items-start overflow-y-auto bg-white p-8px">
          {Object.entries(AllReportTypesOptions).map(([key, value]) => (
            <li
              key={key}
              onClick={() => {
                setSelectedReportType(key as keyof typeof AllReportTypesOptions);
              }}
              className="w-full cursor-pointer px-3 py-2 text-navyBlue2 hover:text-primaryYellow"
            >
              {value as string}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  const displayedSortMenu = (
    <div
      ref={historySortMenuRef}
      onClick={toggleHistorySortMenu}
      className={`group relative flex h-44px w-200px cursor-pointer ${isHistorySortMenuOpen ? 'border-primaryYellow text-primaryYellow' : ''} items-center justify-between rounded-sm border border-input-stroke-input bg-input-surface-input-background p-10px hover:border-primaryYellow hover:text-primaryYellow`}
    >
      <p
        className={`whitespace-nowrap group-hover:text-primaryYellow ${isHistorySortMenuOpen ? ' text-primaryYellow' : isSortSelected ? '' : 'text-input-text-input-placeholder'}`}
      >
        {sort}
      </p>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        fill="none"
        viewBox="0 0 20 20"
      >
        <path
          className="fill-current"
          fillRule="evenodd"
          d="M4.472 6.972a.75.75 0 011.06 0l4.47 4.47 4.47-4.47a.75.75 0 011.06 1.06l-5 5a.75.75 0 01-1.06 0l-5-5a.75.75 0 010-1.06z"
          clipRule="evenodd"
        ></path>
      </svg>{' '}
      {/* Info: (20240513 - Shirley) Dropdown menu */}
      <div
        className={`absolute left-0 top-50px grid w-full grid-cols-1 shadow-dropmenu ${isHistorySortMenuOpen ? 'grid-rows-1 border-lightGray3' : 'grid-rows-0 border-transparent'} overflow-hidden rounded-sm border transition-all duration-150 ease-in-out`}
      >
        <ul className="z-10 flex w-full flex-col items-start bg-white p-8px">
          {Object.values(SortOptions).map((sorting: SortOptions) => (
            <li
              key={sorting}
              onClick={() => {
                setSort(sorting);
              }}
              className="w-full cursor-pointer px-3 py-2 text-navyBlue2 hover:text-primaryYellow"
            >
              {sorting}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  const isDisplayedModal = isModalVisible ? (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50">
      <div className="relative mx-auto flex flex-col items-center rounded-md bg-white pb-6 pt-3 shadow-lg shadow-black/80 sm:w-400px sm:px-3">
        <div className="flex w-full justify-between whitespace-nowrap bg-white px-5 py-4 text-xl font-bold leading-8 text-card-text-primary">
          <div className="flex-1">Filter</div>

          {/* Info: close button (20240528 - Shirley) */}
          <Button
            onClick={modalVisibilityHandler}
            className="p-0 text-icon-surface-single-color-primary hover:text-icon-surface-single-color-primary"
            variant={'secondaryBorderless'}
          >
            {' '}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                className="fill-current"
                // fill="#314362"
                fillRule="evenodd"
                d="M6.223 6.22a.75.75 0 011.06 0l10.5 10.5a.75.75 0 11-1.06 1.061l-10.5-10.5a.75.75 0 010-1.06z"
                clipRule="evenodd"
              ></path>
              <path
                className="fill-current"
                // fill="#314362"
                fillRule="evenodd"
                d="M17.783 6.22a.75.75 0 010 1.061l-10.5 10.5a.75.75 0 01-1.06-1.06l10.5-10.5a.75.75 0 011.06 0z"
                clipRule="evenodd"
              ></path>
            </svg>
          </Button>
        </div>
        <div className="flex w-full flex-col space-y-5 bg-white p-5 text-base font-medium leading-6 tracking-normal">
          <DatePicker
            type={DatePickerType.CHOOSE_PERIOD}
            period={period}
            setFilteredPeriod={setPeriod}
          />

          <div className="flex flex-col space-y-2 self-stretch">
            <div className="text-sm font-semibold leading-5 tracking-normal text-input-text-primary">
              Type{' '}
            </div>
            {/* Info: type menu (20240513 - Shirley) */}
            {displayedTypeMenu}
          </div>

          <div className="flex flex-col space-y-2 self-stretch">
            <div className="text-sm font-semibold leading-5 tracking-normal text-input-text-primary">
              Sort by
            </div>
            {/* Info: sort menu (20240513 - Shirley) */}
            {displayedSortMenu}
          </div>
        </div>
        <div className="h-10px w-full bg-white" />
      </div>
    </div>
  ) : null;
  return <div>{isDisplayedModal}</div>;
};

export default FilterOptionsModal;
