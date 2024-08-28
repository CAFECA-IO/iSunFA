import { useState, useEffect, useCallback } from 'react';
import { FaChevronDown } from 'react-icons/fa';
import { FiSearch } from 'react-icons/fi';
import Image from 'next/image';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { NON_EXISTING_COMPANY_ID } from '@/constants/config';
import { default30DayPeriodInSec } from '@/constants/display';
import { IJournalListItem } from '@/interfaces/journal';
import { IDatePeriod } from '@/interfaces/date_period';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import { useTranslation } from 'next-i18next';
import { useUserCtx } from '@/contexts/user_context';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import {
  JOURNAL_EVENT,
  JOURNAL_TYPE,
  SORTING_OPTION,
  toEventType,
  toSort,
} from '@/constants/journal';
import JournalList from '@/components/journal_list/journal_list';
import { IPaginatedData } from '@/interfaces/pagination';
import { useGlobalCtx } from '@/contexts/global_context';
import { MessageType } from '@/interfaces/message_modal';
import { ToastType } from '@/interfaces/toastify';
import { cn } from '@/lib/utils/common';

// Info: (20240808 - Anna) Alpha版先隱藏(發票列表)
// import Toggle from '@/components/toggle/toggle';

const JournalListBody = () => {
  const { t } = useTranslation('common');
  const { toastHandler, messageModalDataHandler, messageModalVisibilityHandler } = useGlobalCtx();
  const { isAuthLoading, selectedCompany } = useUserCtx();
  const hasCompanyId = isAuthLoading === false && !!selectedCompany?.id;
  const [pagenatedJournalListItems, setPagenatedJournalListItems] = useState<{
    [key: string]: IPaginatedData<IJournalListItem[]>;
  } | null>(null);
  const [success, setSuccess] = useState<boolean | undefined>(undefined);
  const [code, setCode] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean | undefined>(undefined);
  // Info: (20240808 - Anna) Alpha版先隱藏(發票列表)
  // const [invoiceListToggle, setInvoiceListoggle] = useState<boolean>(false);
  const { trigger, isLoading: isJournalListLoading } = APIHandler<{
    [key: string]: IPaginatedData<IJournalListItem[]>;
  }>(APIName.JOURNAL_LIST);
  const { trigger: deleteJournalById } = APIHandler<void>(APIName.JOURNAL_DELETE);

  const types = [
    JOURNAL_TYPE.ALL,
    JOURNAL_TYPE.PAYMENT,
    JOURNAL_TYPE.RECEIVING,
    JOURNAL_TYPE.TRANSFER,
  ];
  const sortingOptions = [
    SORTING_OPTION.NEWEST,
    SORTING_OPTION.OLDEST,
    SORTING_OPTION.HIGHEST_PAYMENT_PRICE,
    SORTING_OPTION.LOWEST_PAYMENT_PRICE,
  ];

  const {
    targetRef: typeMenuRef,
    componentVisible: isTypeMenuOpen,
    setComponentVisible: setIsTypeMenuOpen,
  } = useOuterClick<HTMLUListElement>(false);

  const {
    targetRef: sortByMenuRef,
    componentVisible: isSortByMenuOpen,
    setComponentVisible: setIsSortByMenuOpen,
  } = useOuterClick<HTMLUListElement>(false);

  // Info: (20240419 - Julian) Filtered states
  const [filteredJournalType, setFilteredJournalType] = useState<JOURNAL_TYPE>(JOURNAL_TYPE.ALL);
  const [filteredJournalSortBy, setFilteredJournalSortBy] = useState<SORTING_OPTION>(
    SORTING_OPTION.NEWEST
  );
  const [filteredPeriod, setFilteredPeriod] = useState<IDatePeriod>(default30DayPeriodInSec);
  const [currentPage, setCurrentPage] = useState<number>(1);
  // Info: (20240808 - Anna) Alpha版，進到頁面時，顯示JOURNAL_EVENT.UPLOADED的畫面，而不是JOURNAL_EVENT.UPCOMING的畫面
  const [currentTab, setCurrentTab] = useState<JOURNAL_EVENT>(JOURNAL_EVENT.UPLOADED);
  const [search, setSearch] = useState<string>('');
  const [totalPages, setTotalPages] = useState<number>(0);
  const [journals, setJournals] = useState<IJournalListItem[]>([]);

  // Info: (20240418 - Julian) for css
  const [isTypeSelected, setIsTypeSelected] = useState(false);
  const [isSortBySelected, setIsSortBySelected] = useState(false);

  const toggleTypeMenu = () => {
    if (!isJournalListLoading) {
      setIsTypeMenuOpen(!isTypeMenuOpen);
    }
  };
  const toggleSortByMenu = () => {
    if (!isJournalListLoading) {
      setIsSortByMenuOpen(!isSortByMenuOpen);
    }
  };
  const tabClickHandler = (event: JOURNAL_EVENT) => {
    setCurrentTab(event);
    setJournals(pagenatedJournalListItems?.[event]?.data ?? []);
    setTotalPages(pagenatedJournalListItems?.[event]?.totalPages ?? 0);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isJournalListLoading) {
      setSearch(e.target.value);
    }
  };

  const getJournalList = useCallback(
    async (query: {
      currentPage?: number;
      filteredJournalType?: JOURNAL_TYPE;
      filteredJournalSortBy?: SORTING_OPTION;
      filteredPeriod?: IDatePeriod;
      search?: string;
    }) => {
      if (!hasCompanyId) return;
      setIsLoading(true);
      setSuccess(undefined);
      setCode(undefined);
      setPagenatedJournalListItems(null);
      const {
        currentPage: page,
        filteredJournalType: type,
        filteredJournalSortBy: sortBy,
        filteredPeriod: period,
        search: searchString,
      } = query;
      const response = await trigger({
        params: {
          companyId: selectedCompany?.id,
        },
        query: {
          ...toSort(sortBy ?? filteredJournalSortBy),
          page: page ?? currentPage,
          eventType: toEventType(type ?? filteredJournalType),
          startDate: !(period ?? filteredPeriod).startTimeStamp
            ? undefined
            : (period ?? filteredPeriod).startTimeStamp,
          endDate: !(period ?? filteredPeriod).endTimeStamp
            ? undefined
            : (period ?? filteredPeriod).endTimeStamp,
          searchQuery: !(searchString ?? search) ? undefined : searchString ?? search,
        },
      });

      setSuccess(response.success);
      setCode(response.code);
      setIsLoading(false);

      if (response.success && response.data) {
        setJournals(response.data[currentTab].data ?? []);
        setTotalPages(response.data[currentTab].totalPages ?? 0);
        setPagenatedJournalListItems(response.data);
      }
    },
    [currentPage, filteredJournalType, filteredJournalSortBy, filteredPeriod, search]
  );

  const datePickerHandler = async (start: number, end: number) => {
    await getJournalList({
      filteredPeriod: {
        startTimeStamp: start,
        endTimeStamp: end,
      },
    });
  };

  const deleteJournalHandler = async (companyId: number, journalId: number) => {
    const { success: deleteSuccess, code: deleteCode } = await deleteJournalById({
      params: { companyId, journalId },
    });
    if (deleteSuccess) {
      toastHandler({
        id: `deleteJournal-${journalId}`,
        type: ToastType.SUCCESS,
        content: (
          <div className="flex items-center justify-between">
            <p>{t('journal:JOURNAL.DELETED_SUCCESSFULLY')}</p>
          </div>
        ),
        closeable: true,
      });
      await getJournalList({});
    } else {
      messageModalDataHandler({
        title: t('journal:JOURNAL.FAILED_TO_DELETE'),
        subMsg: t('journal:JOURNAL.TRY_AGAIN_LATER'),
        content: `Error code: ${deleteCode}`,
        messageType: MessageType.ERROR,
        submitBtnStr: t('COMMON.CLOSE'),
        submitBtnFunction: () => messageModalVisibilityHandler(),
      });
      messageModalVisibilityHandler();
    }
  };
  // Info: (20240808 - Anna) Alpha版先隱藏(發票列表)
  // const invoiceListToggleHandler = () => setInvoiceListoggle(!invoiceListToggle);

  useEffect(() => {
    getJournalList({});
  }, [currentPage, filteredJournalType, filteredJournalSortBy]);

  useEffect(() => {
    // Info: (20240729 - Julian) 將拿到的資料放入 journals
    if (pagenatedJournalListItems) {
      setJournals(pagenatedJournalListItems[currentTab]?.data ?? []);
      setTotalPages(pagenatedJournalListItems[currentTab]?.totalPages ?? 0);
    }
  }, [pagenatedJournalListItems, currentTab]);

  const displayedTypeDropMenu = (
    <div
      onClick={isJournalListLoading ? undefined : toggleTypeMenu}
      className={cn(
        'group relative flex h-44px w-200px cursor-pointer items-center justify-between rounded-sm border border-input-stroke-input bg-input-surface-input-background bg-white p-10px hover:border-primaryYellow hover:text-primaryYellow',
        {
          'cursor-not-allowed border-button-stroke-disable text-button-text-disable hover:border-button-stroke-disable hover:text-button-text-disable':
            isJournalListLoading,
          'border-input-stroke-selected text-primaryYellow': isTypeMenuOpen,
          'border-input-stroke-input text-input-text-input-placeholder': !isTypeMenuOpen,
        }
      )}
    >
      <p
        className={`whitespace-nowrap ${isJournalListLoading ? 'group-hover:text-button-text-disable' : 'group-hover:text-primaryYellow'} ${isTypeMenuOpen ? 'text-primaryYellow' : isTypeSelected ? '' : 'text-input-text-input-placeholder'}`}
      >
        {t(filteredJournalType)}
      </p>
      <FaChevronDown />
      {/* Info: (20240418 - Julian) Dropmenu */}
      <div
        className={`absolute left-0 top-50px grid w-full grid-cols-1 shadow-dropmenu ${isTypeMenuOpen ? 'grid-rows-1 border-lightGray3' : 'grid-rows-0 border-transparent'} overflow-hidden rounded-sm border transition-all duration-300 ease-in-out`}
      >
        <ul ref={typeMenuRef} className="z-10 flex w-full flex-col items-start bg-white p-8px">
          {types.map((type: JOURNAL_TYPE) => (
            <li
              key={t(type)}
              onClick={() => {
                setFilteredJournalType(type);
                setIsTypeMenuOpen(false);
                setIsTypeSelected(true);
              }}
              className="w-full cursor-pointer px-3 py-2 text-navyBlue2 hover:text-primaryYellow"
            >
              {t(type)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  const displayedSortByDropMenu = (
    <div
      onClick={isJournalListLoading ? undefined : toggleSortByMenu}
      className={cn(
        'group relative flex h-44px w-200px cursor-pointer items-center justify-between rounded-sm border border-input-stroke-input bg-input-surface-input-background bg-white p-10px hover:border-primaryYellow hover:text-primaryYellow',
        {
          'cursor-not-allowed border-button-stroke-disable text-button-text-disable hover:border-button-stroke-disable hover:text-button-text-disable':
            isJournalListLoading,
          'border-input-stroke-selected text-primaryYellow': isSortByMenuOpen,
          'border-input-stroke-input text-input-text-input-placeholder': !isSortByMenuOpen,
        }
      )}
    >
      <p
        className={`whitespace-nowrap ${isJournalListLoading ? 'group-hover:text-button-text-disable' : 'group-hover:text-primaryYellow'} ${isSortByMenuOpen ? 'text-primaryYellow' : isSortBySelected ? '' : 'text-input-text-input-placeholder'}`}
      >
        {t(filteredJournalSortBy)}
      </p>
      <FaChevronDown />
      {/* Info: (20240418 - Julian) Dropmenu */}
      <div
        className={`absolute left-0 top-50px grid w-full grid-cols-1 shadow-dropmenu ${isSortByMenuOpen ? 'grid-rows-1 border-lightGray3' : 'grid-rows-0 border-transparent'} overflow-hidden rounded-sm border transition-all duration-300 ease-in-out`}
      >
        <ul ref={sortByMenuRef} className="z-10 flex w-full flex-col items-start bg-white p-8px">
          {sortingOptions.map((sorting: SORTING_OPTION) => (
            <li
              key={t(sorting)}
              onClick={() => {
                setFilteredJournalSortBy(sorting);
                setIsSortByMenuOpen(false);
                setIsSortBySelected(true);
              }}
              className="w-full cursor-pointer px-3 py-2 text-navyBlue2 hover:text-primaryYellow"
            >
              {t(sorting)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  const displayedDatePicker = (
    <div className="hidden md:flex">
      <DatePicker
        disabled={isJournalListLoading}
        type={DatePickerType.TEXT_PERIOD}
        period={filteredPeriod}
        setFilteredPeriod={setFilteredPeriod}
        datePickerHandler={datePickerHandler}
      />
    </div>
  );

  const displayedSearchBar = (
    <div className="relative flex-1">
      <input
        disabled={isJournalListLoading}
        type="text"
        placeholder={t('AUDIT_REPORT.SEARCH')}
        className={`relative flex h-44px w-full items-center justify-between rounded-sm border border-lightGray3 bg-white p-10px outline-none`}
        onChange={handleInputChange}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            getJournalList({ search });
          }
        }}
      />
      <FiSearch
        size={20}
        className="absolute right-3 top-3 cursor-pointer"
        onClick={() => !isJournalListLoading && getJournalList({ search })}
      />
    </div>
  );

  const displayedToolbar = (
    <>
      {/* Info: (20240418 - Julian) Divider */}
      <div className="my-5 flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <Image src="/icons/bill.svg" width={16} height={16} alt="bill_icon" />
          <p>{t('journal:JOURNAL.JOURNAL_LIST')}</p>
        </div>
        <hr className="flex-1 border-lightGray4" />
      </div>
      <div className="flex items-center justify-between">
        {/* Info: (20240808 - Anna) Alpha版先隱藏(發票列表) */}
        {/* <div className="flex items-center gap-18px">
            <Toggle
              id="invoice-list-toggle"
              initialToggleState={invoiceListToggle}
              getToggledState={invoiceListToggleHandler}
              toggleStateFromParent={invoiceListToggle}
            />
            <p>{t('journal:JOURNAL.INVOICE_LIST')}</p>
          </div> */}
        {/* Info: (20240731 - Tzuhan) Toolbar */}
        <div className="flex items-center">
          <div className="flex w-full items-center justify-center gap-16px md:justify-end">
            {/* Info: (20240808 - Anna) Alpha版先隱藏(刪除按鈕) */}
            {/* Info: (20240731 - Tzuhan) Delete button */}
            {/* <button
              type="button"
              className="rounded-xs border border-secondaryBlue p-10px text-secondaryBlue hover:border-primaryYellow hover:text-primaryYellow"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="10 10 20 20"
                fill="none"
              >
                <g>
                  <path
                    className="fill-current"
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M19.3068 10.918L19.3363 10.918H20.6696L20.6991 10.918C21.1407 10.918 21.5166 10.9179 21.8253 10.9432C22.1496 10.9697 22.4651 11.0277 22.7667 11.1814C23.2215 11.4131 23.5912 11.7828 23.8229 12.2375C23.9765 12.5391 24.0346 12.8546 24.0611 13.1789C24.0853 13.475 24.0862 13.8329 24.0863 14.2513H25.8363H27.5029C27.9171 14.2513 28.2529 14.5871 28.2529 15.0013C28.2529 15.4155 27.9171 15.7513 27.5029 15.7513H26.5863V24.3346V24.3661C26.5863 25.0394 26.5863 25.5901 26.5497 26.0377C26.5119 26.501 26.4311 26.9194 26.232 27.3101C25.9204 27.9216 25.4233 28.4188 24.8117 28.7304C24.421 28.9295 24.0026 29.0102 23.5393 29.0481C23.0918 29.0847 22.5411 29.0846 21.8677 29.0846H21.8363H18.1696H18.1382C17.4648 29.0846 16.9141 29.0847 16.4665 29.0481C16.0033 29.0102 15.5849 28.9295 15.1941 28.7304C14.5826 28.4188 14.0854 27.9216 13.7738 27.3101C13.5747 26.9194 13.494 26.501 13.4561 26.0377C13.4196 25.5901 13.4196 25.0394 13.4196 24.3661L13.4196 24.3346V15.7513H12.5029C12.0887 15.7513 11.7529 15.4155 11.7529 15.0013C11.7529 14.5871 12.0887 14.2513 12.5029 14.2513H14.1696H15.9196C15.9196 13.8329 15.9206 13.475 15.9448 13.1789C15.9713 12.8546 16.0293 12.5391 16.183 12.2375C16.4147 11.7828 16.7844 11.4131 17.2391 11.1814C17.5407 11.0277 17.8562 10.9697 18.1805 10.9432C18.4892 10.9179 18.8652 10.918 19.3068 10.918ZM16.6696 15.7513H14.9196V24.3346C14.9196 25.0471 14.9202 25.5363 14.9512 25.9156C14.9814 26.2861 15.0369 26.4851 15.1103 26.6291C15.2781 26.9584 15.5458 27.2261 15.8751 27.3939L15.5346 28.0622L15.8751 27.3939C16.0192 27.4673 16.2182 27.5228 16.5887 27.5531C16.9679 27.5841 17.4572 27.5846 18.1696 27.5846H21.8363C22.5487 27.5846 23.0379 27.5841 23.4172 27.5531C23.7877 27.5228 23.9867 27.4673 24.1307 27.3939C24.46 27.2261 24.7277 26.9584 24.8955 26.6291C24.9689 26.4851 25.0244 26.2861 25.0547 25.9156C25.0857 25.5363 25.0863 25.0471 25.0863 24.3346V15.7513H23.3363H16.6696ZM22.5863 14.2513H17.4196C17.4197 13.8186 17.4213 13.5271 17.4398 13.301C17.4587 13.0695 17.4915 12.9734 17.5195 12.9185C17.6074 12.746 17.7476 12.6058 17.9201 12.5179C17.975 12.4899 18.0711 12.4571 18.3027 12.4382C18.543 12.4186 18.8572 12.418 19.3363 12.418H20.6696C21.1487 12.418 21.4629 12.4186 21.7032 12.4382C21.9347 12.4571 22.0308 12.4899 22.0858 12.5179C22.2582 12.6058 22.3985 12.746 22.4864 12.9185C22.5143 12.9734 22.5471 13.0695 22.566 13.301C22.5845 13.5271 22.5861 13.8186 22.5863 14.2513ZM18.3363 18.8346C18.7505 18.8346 19.0863 19.1704 19.0863 19.5846V23.7513C19.0863 24.1655 18.7505 24.5013 18.3363 24.5013C17.922 24.5013 17.5863 24.1655 17.5863 23.7513V19.5846C17.5863 19.1704 17.922 18.8346 18.3363 18.8346ZM21.6696 18.8346C22.0838 18.8346 22.4196 19.1704 22.4196 19.5846V23.7513C22.4196 24.1655 22.0838 24.5013 21.6696 24.5013C21.2554 24.5013 20.9196 24.1655 20.9196 23.7513V19.5846C20.9196 19.1704 21.2554 18.8346 21.6696 18.8346Z"
                    fill="#001840"
                  />
                </g>
              </svg>
            </button> */}
            {/* Info: (20240808 - Anna) Alpha版先隱藏(下載按鈕) */}
            {/* Info: (20240418 - Julian) Download button */}
            {/* <button
              type="button"
              className="rounded-xs border border-secondaryBlue p-10px text-secondaryBlue hover:border-primaryYellow hover:text-primaryYellow"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
              >
                <path
                  className={`fill-current`}
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M8.00195 1.2511C8.41617 1.2511 8.75195 1.58689 8.75195 2.0011V8.19044L10.805 6.13744C11.0979 5.84454 11.5727 5.84454 11.8656 6.13744C12.1585 6.43033 12.1585 6.9052 11.8656 7.1981L8.53228 10.5314C8.23939 10.8243 7.76452 10.8243 7.47162 10.5314L4.13829 7.1981C3.8454 6.9052 3.8454 6.43033 4.13829 6.13744C4.43118 5.84454 4.90606 5.84454 5.19895 6.13744L7.25195 8.19044V2.0011C7.25195 1.58689 7.58774 1.2511 8.00195 1.2511ZM2.00195 9.2511C2.41617 9.2511 2.75195 9.58689 2.75195 10.0011V10.8011C2.75195 11.3735 2.75254 11.7577 2.77671 12.0536C2.80017 12.3407 2.84205 12.478 2.8882 12.5686C3.00804 12.8038 3.19926 12.995 3.43447 13.1149C3.52503 13.161 3.66231 13.2029 3.94943 13.2263C4.24531 13.2505 4.62953 13.2511 5.20195 13.2511H10.802C11.3744 13.2511 11.7586 13.2505 12.0545 13.2263C12.3416 13.2029 12.4789 13.161 12.5694 13.1149C12.8046 12.995 12.9959 12.8038 13.1157 12.5686C13.1619 12.478 13.2037 12.3407 13.2272 12.0536C13.2514 11.7577 13.252 11.3735 13.252 10.8011V10.0011C13.252 9.58689 13.5877 9.2511 14.002 9.2511C14.4162 9.2511 14.752 9.58689 14.752 10.0011V10.8011V10.8316C14.752 11.3657 14.752 11.8115 14.7222 12.1758C14.6912 12.5557 14.6241 12.9123 14.4522 13.2496C14.1886 13.767 13.7679 14.1877 13.2504 14.4514C12.9132 14.6232 12.5565 14.6903 12.1766 14.7214C11.8124 14.7511 11.3666 14.7511 10.8324 14.7511H10.802H5.20195H5.1715C4.63735 14.7511 4.19151 14.7511 3.82728 14.7214C3.4474 14.6903 3.09074 14.6232 2.75348 14.4514C2.23603 14.1877 1.81534 13.767 1.55169 13.2496C1.37984 12.9123 1.31273 12.5557 1.28169 12.1758C1.25193 11.8115 1.25194 11.3657 1.25195 10.8315L1.25195 10.8011V10.0011C1.25195 9.58689 1.58774 9.2511 2.00195 9.2511Z"
                  fill="#001840"
                />
              </svg>
            </button> */}
            {/* Info: (20240808 - Anna) Alpha版先隱藏(選擇按鈕) */}
            {/* Info: (20240418 - Julian) Select */}
            {/* <button
              type="button"
              className="flex items-center gap-4px p-16px text-sm text-secondaryBlue hover:text-primaryYellow"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
              >
                <path
                  className={`fill-current`}
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M5.17152 1.2511L5.20195 1.2511H10.6686C11.0828 1.2511 11.4186 1.58689 11.4186 2.0011C11.4186 2.41531 11.0828 2.7511 10.6686 2.7511H5.20195C4.62953 2.7511 4.24531 2.75168 3.94943 2.77586C3.66231 2.79932 3.52503 2.8412 3.43447 2.88734C3.19926 3.00718 3.00804 3.19841 2.8882 3.43361C2.84205 3.52417 2.80017 3.66145 2.77671 3.94858C2.75254 4.24446 2.75195 4.62867 2.75195 5.2011V10.8011C2.75195 11.3735 2.75254 11.7577 2.77671 12.0536C2.80017 12.3407 2.84205 12.478 2.8882 12.5686C3.00804 12.8038 3.19926 12.995 3.43447 13.1149C3.52503 13.161 3.66231 13.2029 3.94943 13.2263C4.24531 13.2505 4.62953 13.2511 5.20195 13.2511H10.802C11.3744 13.2511 11.7586 13.2505 12.0545 13.2263C12.3416 13.2029 12.4789 13.161 12.5694 13.1149C12.8046 12.995 12.9959 12.8038 13.1157 12.5686C13.1619 12.478 13.2037 12.3407 13.2272 12.0536C13.2514 11.7577 13.252 11.3735 13.252 10.8011V8.0011C13.252 7.58689 13.5877 7.2511 14.002 7.2511C14.4162 7.2511 14.752 7.58689 14.752 8.0011V10.8011V10.8316C14.752 11.3657 14.752 11.8115 14.7222 12.1758C14.6912 12.5557 14.6241 12.9123 14.4522 13.2496C14.1886 13.767 13.7679 14.1877 13.2504 14.4514C12.9132 14.6232 12.5565 14.6903 12.1766 14.7214C11.8124 14.7511 11.3666 14.7511 10.8324 14.7511H10.802H5.20195H5.1715C4.63735 14.7511 4.19151 14.7511 3.82728 14.7214C3.4474 14.6903 3.09074 14.6232 2.75348 14.4514C2.23603 14.1877 1.81534 13.767 1.55169 13.2496C1.37984 12.9123 1.31273 12.5557 1.28169 12.1758C1.25193 11.8115 1.25194 11.3657 1.25195 10.8315L1.25195 10.8011V5.2011L1.25195 5.17066C1.25194 4.63651 1.25193 4.19066 1.28169 3.82643C1.31273 3.44654 1.37984 3.08989 1.55169 2.75263C1.81534 2.23518 2.23603 1.81448 2.75348 1.55083C3.09074 1.37899 3.4474 1.31188 3.82728 1.28084C4.19152 1.25108 4.63737 1.25109 5.17152 1.2511ZM15.199 2.13744C15.4918 2.43033 15.4918 2.9052 15.199 3.1981L8.53228 9.86476C8.23939 10.1577 7.76452 10.1577 7.47162 9.86476L5.47162 7.86476C5.17873 7.57187 5.17873 7.097 5.47162 6.8041C5.76452 6.51121 6.23939 6.51121 6.53228 6.8041L8.00195 8.27377L14.1383 2.13744C14.4312 1.84454 14.9061 1.84454 15.199 2.13744Z"
                  fill="#001840"
                />
              </svg>
              <p>{t('PENDING_REPORT_LIST.SELECT')}</p>
            </button> */}
          </div>
        </div>
      </div>
    </>
  );

  const displayedTabs = (
    <div className="my-20px inline-flex w-full items-center justify-center">
      <button
        type="button"
        onClick={() => tabClickHandler(JOURNAL_EVENT.UPLOADED)}
        className={`inline-flex w-1/2 items-center justify-center gap-2 border-b-2 ${currentTab === JOURNAL_EVENT.UPLOADED ? 'border-tabs-stroke-active' : 'border-tabs-stroke-default'} px-12px py-8px font-medium tracking-tight transition-all duration-300 ease-in-out`}
      >
        <p
          className={`flex items-center gap-4px whitespace-nowrap text-base leading-normal ${currentTab === JOURNAL_EVENT.UPLOADED ? 'text-tabs-text-active' : 'text-tabs-text-default'}`}
        >
          {t('journal:JOURNAL.UPLOADED')}{' '}
          <span className="hidden md:block">{t('journal:JOURNAL.EVENTS')}</span>
        </p>
        <div className="rounded-full bg-badge-surface-soft-primary px-4px py-2px text-xs tracking-tight text-badge-text-primary-solid">
          {pagenatedJournalListItems
            ? pagenatedJournalListItems[JOURNAL_EVENT.UPLOADED]?.totalCount
            : 0}
        </div>
      </button>
      <button
        type="button"
        onClick={() => tabClickHandler(JOURNAL_EVENT.UPCOMING)}
        // Info: (20240808 - Anna) Alpha版，進到頁面時，顯示JOURNAL_EVENT.UPLOADED的畫面，而不是JOURNAL_EVENT.UPCOMING的畫面，並且把文字顏色改為disabled:text-button-text-disable、底線顏色由border-tabs-stroke-active改為border-tabs-stroke-default(改?後面的)
        className={`inline-flex w-1/2 items-center justify-center gap-2 border-b-2 ${currentTab === JOURNAL_EVENT.UPLOADED ? 'border-tabs-stroke-default' : 'border-tabs-stroke-default'} px-12px py-8px font-medium tracking-tight transition-all duration-300 ease-in-out disabled:text-button-text-disable`}
        // Info: (20240808 - Anna) Alpha版先屏蔽(即將到來的會計事件)
        disabled
      >
        {/* Info: (20240808 - Anna) Alpha版先屏蔽(即將到來的會計事件)，文字顏色由text-tabs-text-default改為disabled:text-button-text-disable、由text-tabs-text-active改為text-tabs-text-default */}
        <p
          className={`flex items-center gap-4px whitespace-nowrap text-base leading-normal ${currentTab === JOURNAL_EVENT.UPCOMING ? 'text-tabs-text-default' : 'disabled:text-button-text-disable'}`}
        >
          {t('journal:JOURNAL.UPCOMING')}{' '}
          <span className="hidden md:block">{t('journal:JOURNAL.EVENTS')}</span>
        </p>
        <div className="rounded-full bg-badge-surface-soft-primary px-4px py-2px text-xs tracking-tight text-badge-text-primary-solid">
          {pagenatedJournalListItems
            ? pagenatedJournalListItems[JOURNAL_EVENT.UPCOMING]?.totalCount
            : 0}
        </div>
      </button>
    </div>
  );

  return (
    <>
      {/* Info: (20240523 - Julian) Tabs */}
      {displayedTabs}
      {/* Info: (20240417 - Julian) Filter */}
      <div className="my-10px flex items-center gap-24px text-sm md:items-end">
        {/* Info: (20240417 - Julian) Type */}
        <div className="hidden flex-col items-start gap-8px md:flex">
          <p className="font-semibold text-navyBlue2">{t('journal:JOURNAL.TYPE')}</p>
          {displayedTypeDropMenu}
        </div>

        {/* Info: (20240418 - Julian) Sort by */}
        <div className="hidden flex-col items-start gap-8px md:flex">
          <p className="font-semibold text-navyBlue2">{t('SORTING.SORT_BY')}</p>
          {displayedSortByDropMenu}
        </div>

        {/* Info: (20240418 - Julian) Date picker */}
        {displayedDatePicker}

        {/* Info: (20240418 - Julian) Search bar */}
        {displayedSearchBar}

        {/* Info: (20240517 - Julian) Filter button for mobile */}
        <button
          type="button"
          className="block rounded-xs border border-secondaryBlue p-10px text-secondaryBlue hover:border-primaryYellow hover:text-primaryYellow md:hidden"
        >
          <svg
            width="16"
            height="17"
            viewBox="0 0 16 17"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              className="fill-current"
              fillRule="evenodd"
              clipRule="evenodd"
              d="M3.33553 1.74677C3.74974 1.74677 4.08553 2.08255 4.08553 2.49677V5.16343C4.08553 5.57765 3.74974 5.91343 3.33553 5.91343C2.92132 5.91343 2.58553 5.57765 2.58553 5.16343V2.49677C2.58553 2.08255 2.92132 1.74677 3.33553 1.74677ZM8.0022 1.74677C8.41641 1.74677 8.7522 2.08255 8.7522 2.49677V4.55251C9.53221 4.8536 10.0855 5.61057 10.0855 6.49677C10.0855 7.64736 9.15279 8.5801 8.0022 8.5801C6.8516 8.5801 5.91886 7.64736 5.91886 6.49677C5.91886 5.61057 6.47219 4.8536 7.2522 4.55251V2.49677C7.2522 2.08255 7.58798 1.74677 8.0022 1.74677ZM12.6689 1.74677C13.0831 1.74677 13.4189 2.08255 13.4189 2.49677V6.49677C13.4189 6.91098 13.0831 7.24677 12.6689 7.24677C12.2547 7.24677 11.9189 6.91098 11.9189 6.49677V2.49677C11.9189 2.08255 12.2547 1.74677 12.6689 1.74677ZM8.0022 5.91343C7.68003 5.91343 7.41886 6.1746 7.41886 6.49677C7.41886 6.81893 7.68003 7.0801 8.0022 7.0801C8.32436 7.0801 8.58553 6.81893 8.58553 6.49677C8.58553 6.1746 8.32436 5.91343 8.0022 5.91343ZM3.33553 8.5801C3.01336 8.5801 2.7522 8.84127 2.7522 9.16343C2.7522 9.4856 3.01336 9.74677 3.33553 9.74677C3.6577 9.74677 3.91886 9.4856 3.91886 9.16343C3.91886 8.84127 3.6577 8.5801 3.33553 8.5801ZM1.2522 9.16343C1.2522 8.01284 2.18494 7.0801 3.33553 7.0801C4.48612 7.0801 5.41886 8.01284 5.41886 9.16343C5.41886 10.0496 4.86554 10.8066 4.08553 11.1077L4.08553 14.4968C4.08553 14.911 3.74974 15.2468 3.33553 15.2468C2.92132 15.2468 2.58553 14.911 2.58553 14.4968L2.58553 11.1077C1.80552 10.8066 1.2522 10.0496 1.2522 9.16343ZM12.6689 9.91343C12.3467 9.91343 12.0855 10.1746 12.0855 10.4968C12.0855 10.8189 12.3467 11.0801 12.6689 11.0801C12.991 11.0801 13.2522 10.8189 13.2522 10.4968C13.2522 10.1746 12.991 9.91343 12.6689 9.91343ZM10.5855 10.4968C10.5855 9.34617 11.5183 8.41343 12.6689 8.41343C13.8195 8.41343 14.7522 9.34617 14.7522 10.4968C14.7522 11.383 14.1989 12.1399 13.4189 12.441V14.4968C13.4189 14.911 13.0831 15.2468 12.6689 15.2468C12.2547 15.2468 11.9189 14.911 11.9189 14.4968V12.441C11.1389 12.1399 10.5855 11.383 10.5855 10.4968ZM8.0022 9.74677C8.41641 9.74677 8.7522 10.0826 8.7522 10.4968V14.4968C8.7522 14.911 8.41641 15.2468 8.0022 15.2468C7.58798 15.2468 7.2522 14.911 7.2522 14.4968V10.4968C7.2522 10.0826 7.58798 9.74677 8.0022 9.74677Z"
              fill="#001840"
            />
          </svg>
        </button>
      </div>
      {/* Info: (20240418 - Julian) Toolbar */}
      {currentTab === JOURNAL_EVENT.UPLOADED && displayedToolbar}
      {/* Info: (20240418 - Julian) Journal list */}
      <JournalList
        event={currentTab}
        companyId={selectedCompany?.id ?? NON_EXISTING_COMPANY_ID}
        journalsProps={{
          journals,
          isLoading,
          success,
          code,
        }}
        paginationProps={{
          currentPage,
          setCurrentPage,
          totalPages,
        }}
        onDelete={deleteJournalHandler}
      />
    </>
  );
};

export default JournalListBody;
