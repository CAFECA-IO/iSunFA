import React, { useEffect } from 'react';
import useStateRef from 'react-usestateref';
import { Button } from '@/components/button/button';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import { ContractStatusWithAll } from '@/constants/contract';
import { SortOptions, default30DayPeriodInSec } from '@/constants/display';
import { FilterOptionsModalType, IFilterOptions } from '@/interfaces/modals';
import { AllReportTypesKey, AllReportTypesOptions } from '@/interfaces/report_type';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { useTranslation } from 'next-i18next';
import { IoIosArrowDown } from 'react-icons/io';
import { FaXmark } from 'react-icons/fa6';

interface IFilterOptionsModalProps {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
  filterType: FilterOptionsModalType;
  getFilterOptions?: (filterOptions: IFilterOptions) => void; // Info: (20240528 - Shirley) 把 filterOptions 透過 callback function 傳出去
}

const FilterOptionsModal = ({
  isModalVisible,
  modalVisibilityHandler,
  filterType,
  getFilterOptions = () => {},
}: IFilterOptionsModalProps) => {
  const { t } = useTranslation(['common', 'reports']);
  const [period, setPeriod, periodRef] = useStateRef(default30DayPeriodInSec);
  const [sort, setSort, sortRef] = useStateRef<SortOptions>(SortOptions.newest);
  const [selectedReportType, setSelectedReportType, selectedReportTypeRef] = useStateRef<
    keyof typeof AllReportTypesOptions
  >(AllReportTypesKey.all as keyof typeof AllReportTypesOptions);
  const [selectedStatus, setSelectedStatus, selectedStatusRef] =
    useStateRef<keyof typeof ContractStatusWithAll>('ALL');

  const [isTypeMenuSelected, setIsTypeMenuSelected] = useStateRef(false);
  const [isSortSelected, setIsSortSelected] = useStateRef(false);
  const [isStatusMenuSelected, setIsStatusMenuSelected] = useStateRef(false);

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

  const {
    targetRef: statusMenuRef,
    componentVisible: isStatusMenuOpen,
    setComponentVisible: setIsStatusMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const toggleTypeMenu = () => {
    setIsTypeMenuSelected(true);
    setIsTypeMenuOpen(!isTypeMenuOpen);
  };

  const toggleHistorySortMenu = () => {
    setIsSortSelected(true);
    setIsHistorySortMenuOpen(!isHistorySortMenuOpen);
  };

  const toggleStatusMenu = () => {
    setIsTypeMenuSelected(true);
    setIsStatusMenuOpen(!isStatusMenuOpen);
  };

  useEffect(() => {
    if (!isModalVisible) {
      // Info: (20240528 - Shirley) 把 filterOptions 透過 callback function 傳出去
      if (getFilterOptions) {
        getFilterOptions({
          period: periodRef.current,
          sort: sortRef.current,
          selectedReportType: selectedReportTypeRef.current,
          selectedStatus: selectedStatusRef.current,
        });
      }

      // Info: (20240528 - Shirley) 關掉 modal 後把資料清空
      setPeriod(default30DayPeriodInSec);
      setSort(SortOptions.newest);
      setSelectedReportType(AllReportTypesKey.all as keyof typeof AllReportTypesOptions);
      setSelectedStatus('ALL' as keyof typeof ContractStatusWithAll);
      setIsTypeMenuSelected(false);
      setIsSortSelected(false);
      setIsStatusMenuSelected(false);
    }
  }, [isModalVisible]);

  const displayedTypeMenu = (
    <div
      ref={typeMenuRef}
      onClick={toggleTypeMenu}
      className={`group relative flex w-full cursor-pointer max-md:max-w-full lg:w-auto ${isTypeMenuOpen ? 'border-input-stroke-input-hover hover:text-input-text-highlight' : ''} items-center justify-between rounded-sm border border-input-stroke-input bg-input-surface-input-background p-10px hover:border-input-stroke-input-hover hover:text-input-text-highlight`}
    >
      <p
        className={`whitespace-nowrap group-hover:text-input-text-highlight ${isTypeMenuOpen ? 'text-input-text-highlight' : isTypeMenuSelected ? 'text-input-text-input-filled' : 'text-input-text-input-placeholder'}`}
      >
        {AllReportTypesOptions[selectedReportType as keyof typeof AllReportTypesOptions]}
      </p>
      <IoIosArrowDown size={20} />

      {/* Info: (20240513 - Shirley) Dropdown menu */}
      <div
        className={`absolute left-0 top-50px grid w-full grid-rows-0 overflow-hidden shadow-dropmenu ${isTypeMenuOpen ? 'grid-rows-1 border-dropdown-stroke-menu' : 'grid-rows-0 border-transparent'} rounded-sm border transition-all duration-150 ease-in-out`}
      >
        {/* Info: (20240528 - Shirley) 超過高度就顯示卷軸 */}
        <ul className="z-10 flex max-h-200px w-full flex-col items-start overflow-y-auto bg-dropdown-surface-menu-background-primary p-8px">
          {Object.entries(AllReportTypesOptions).map(([key, value]) => (
            <li
              key={key}
              onClick={() => {
                setSelectedReportType(key as keyof typeof AllReportTypesOptions);
              }}
              className="w-full cursor-pointer px-3 py-2 text-dropdown-text-primary hover:text-dropdown-stroke-input-hover"
            >
              {value as string}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  const displayedStatusMenu = (
    <div
      ref={statusMenuRef}
      onClick={toggleStatusMenu}
      className={`group relative flex w-full cursor-pointer max-md:max-w-full ${isStatusMenuOpen ? 'border-input-stroke-input-hover hover:text-input-text-highlight' : ''} items-center justify-between rounded-sm border border-input-stroke-input bg-input-surface-input-background p-10px hover:border-input-stroke-input-hover hover:text-input-text-highlight`}
    >
      <p
        className={`whitespace-nowrap group-hover:text-input-text-highlight ${isStatusMenuOpen ? 'text-input-text-highlight' : isStatusMenuSelected ? 'text-input-text-input-filled' : 'text-input-text-input-placeholder'}`}
      >
        {ContractStatusWithAll[selectedStatus as keyof typeof ContractStatusWithAll]}
      </p>
      <IoIosArrowDown size={20} />

      {/* Info: (20240621 - Julian) Dropdown menu */}
      <div
        className={`absolute left-0 top-50px grid w-full grid-rows-0 overflow-hidden shadow-dropmenu ${isStatusMenuOpen ? 'grid-rows-1 border-dropdown-stroke-menu' : 'grid-rows-0 border-transparent'} rounded-sm border transition-all duration-150 ease-in-out`}
      >
        {/* Info: (20240621 - Julian) 超過高度就顯示卷軸 */}
        <ul className="z-10 flex max-h-200px w-full flex-col items-start overflow-y-auto bg-dropdown-surface-menu-background-primary p-8px">
          {Object.entries(ContractStatusWithAll).map(([key, value]) => (
            <li
              key={key}
              onClick={() => {
                setSelectedStatus(key as keyof typeof ContractStatusWithAll);
              }}
              className="w-full cursor-pointer px-3 py-2 text-dropdown-text-primary hover:text-dropdown-stroke-input-hover"
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
      className={`group relative flex w-full cursor-pointer max-md:max-w-full lg:w-auto ${isHistorySortMenuOpen ? 'border-input-stroke-input-hover hover:text-input-text-highlight' : ''} items-center justify-between rounded-sm border border-input-stroke-input bg-input-surface-input-background p-10px hover:border-input-stroke-input-hover hover:text-input-text-highlight`}
    >
      <p
        className={`whitespace-nowrap group-hover:text-input-text-highlight ${isHistorySortMenuOpen ? 'text-input-text-highlight' : isSortSelected ? 'text-input-text-input-filled' : 'text-input-text-input-placeholder'}`}
      >
        {t(sort)}
      </p>
      <IoIosArrowDown size={20} />

      {/* Info: (20240513 - Shirley) Dropdown menu */}
      <div
        className={`absolute left-0 top-50px grid w-full grid-cols-1 shadow-dropmenu ${isHistorySortMenuOpen ? 'grid-rows-1 border-dropdown-stroke-menu' : 'grid-rows-0 border-transparent'} overflow-hidden rounded-sm border transition-all duration-150 ease-in-out`}
      >
        <ul className="z-10 flex w-full flex-col items-start bg-dropdown-surface-menu-background-primary p-8px">
          {Object.values(SortOptions).map((sorting: SortOptions) => (
            <li
              key={sorting}
              onClick={() => {
                setSort(sorting);
              }}
              className="w-full cursor-pointer px-3 py-2 text-dropdown-text-primary hover:text-dropdown-stroke-input-hover"
            >
              {t(sorting)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  const displayedMiddleMenu =
    // Info: (20240620 - Julian)
    filterType === FilterOptionsModalType.contract ? (
      <div className="flex flex-col items-start gap-8px">
        <p className="font-semibold text-input-text-primary">{t('reports:COMMON.STATUS')}</p>
        {displayedStatusMenu}
      </div>
    ) : (
      <div className="flex flex-col space-y-2 self-stretch">
        <div className="text-sm font-semibold leading-5 tracking-normal text-input-text-primary">
          {t('common:COMMON.TYPE')}
        </div>
        {/* Info: (20240513 - Shirley) type menu */}
        {displayedTypeMenu}
      </div>
    );

  const isDisplayedModal = isModalVisible ? (
    <div className="fixed inset-0 z-10000 -mt-40 flex items-center justify-center bg-black/50">
      <div className="relative mx-5 flex w-full flex-col items-center rounded-md bg-surface-neutral-surface-lv2 pb-10 pt-3 shadow-lg shadow-black/80 sm:mx-auto sm:w-400px sm:px-3">
        <div className="flex w-full justify-between whitespace-nowrap px-5 py-4 text-xl font-bold leading-8 text-card-text-primary">
          <div className="flex-1">{t('reports:COMMON.FILTER')}</div>

          {/* Info: (20240528 - Shirley) close button */}
          <Button
            type="button"
            onClick={modalVisibilityHandler}
            className="p-0 text-icon-surface-single-color-primary hover:text-icon-surface-single-color-primary"
            variant={'secondaryBorderless'}
          >
            <FaXmark size={24} />
          </Button>
        </div>
        <div className="flex w-full flex-col space-y-5 px-5 pt-4 text-base font-medium leading-6 tracking-normal">
          <DatePicker
            type={DatePickerType.TEXT_PERIOD}
            period={period}
            setFilteredPeriod={setPeriod}
            btnClassName=""
          />

          {displayedMiddleMenu}

          <div className="flex flex-col space-y-2 self-stretch">
            <div className="text-sm font-semibold leading-5 tracking-normal text-input-text-primary">
              {t('reports:MY_REPORTS_SECTION.SORT_BY')}
            </div>
            {/* Info: (20240513 - Shirley) sort menu */}
            {displayedSortMenu}
          </div>
        </div>
      </div>
    </div>
  ) : null;
  return <div id={`${filterType}-filter-options-modal`}>{isDisplayedModal}</div>;
};

export default FilterOptionsModal;
