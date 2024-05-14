import { useState } from 'react';
import { FaChevronDown } from 'react-icons/fa';
import { FiSearch } from 'react-icons/fi';
import Image from 'next/image';
import APIHandler from '@/lib/utils/api_handler';
import { useAccountingCtx } from '@/contexts/accounting_context';
import { APIName } from '@/constants/api_connection';
import { IJournal } from '@/interfaces/journal';
import useOuterClick from '../../lib/hooks/use_outer_click';
import JournalList from '../journal_list/journal_list';
import Pagination from '../pagination/pagination';
import DatePicker, { DatePickerType } from '../date_picker/date_picker';
import { IDatePeriod } from '../../interfaces/date_period';
import { default30DayPeriodInSec } from '../../constants/display';

const JournalListTab = () => {
  const { companyId } = useAccountingCtx();
  const {
    isLoading,
    success,
    code,
    error,
    data: journals,
  } = APIHandler<IJournal[]>(APIName.LIST_ALL_JOURNALS, {
    params: { companyId },
  });

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
  const [filteredJournalType, setFilteredJournalType] = useState<string>('All');
  const [filteredJournalSortBy, setFilteredJournalSortBy] = useState<string>('Newest');
  const [filteredPeriod, setFilteredPeriod] = useState<IDatePeriod>(default30DayPeriodInSec);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // ToDo: (20240418 - Julian) Replace with real data
  const totalPages = 100;
  // const isShowJournalList = false;

  // Info: (20240418 - Julian) for css
  const isTypeSelected = filteredJournalType !== 'All';
  const isSortBySelected = filteredJournalSortBy !== 'Newest';

  const toggleTypeMenu = () => setIsTypeMenuOpen(!isTypeMenuOpen);
  const toggleSortByMenu = () => setIsSortByMenuOpen(!isSortByMenuOpen);

  const displayedTypeDropMenu = (
    <div
      onClick={toggleTypeMenu}
      className={`group relative flex h-44px w-130px cursor-pointer ${isTypeMenuOpen ? 'border-primaryYellow text-primaryYellow' : ''} items-center justify-between rounded-md border bg-white p-10px hover:border-primaryYellow hover:text-primaryYellow`}
    >
      <p
        className={`group-hover:text-primaryYellow ${isTypeMenuOpen ? ' text-primaryYellow' : isTypeSelected ? '' : 'text-lightGray3'}`}
      >
        {filteredJournalType}
      </p>
      <FaChevronDown />
      {/* Info: (20240418 - Julian) Dropmenu */}
      <div
        className={`absolute left-0 top-50px grid w-full grid-cols-1 shadow-dropmenu ${isTypeMenuOpen ? 'grid-rows-1 border-lightGray3' : 'grid-rows-0 border-transparent'} overflow-hidden rounded-md border transition-all duration-300 ease-in-out`}
      >
        <ul ref={typeMenuRef} className="z-10 flex w-full flex-col items-start bg-white p-8px">
          {['All', 'Payment', 'Receiving', 'Transfer'].map((type: string) => (
            <li
              key={type}
              onClick={() => {
                setFilteredJournalType(type);
                setIsTypeMenuOpen(false);
              }}
              className="w-full cursor-pointer px-3 py-2 text-navyBlue2 hover:text-primaryYellow"
            >
              {type}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  const displayedSortByDropMenu = (
    <div
      onClick={toggleSortByMenu}
      className={`group relative flex h-44px w-200px cursor-pointer ${isSortByMenuOpen ? 'border-primaryYellow text-primaryYellow' : ''} items-center justify-between rounded-md border bg-white p-10px hover:border-primaryYellow hover:text-primaryYellow`}
    >
      <p
        className={`whitespace-nowrap group-hover:text-primaryYellow ${isSortByMenuOpen ? ' text-primaryYellow' : isSortBySelected ? '' : 'text-lightGray3'}`}
      >
        {filteredJournalSortBy}
      </p>
      <FaChevronDown />
      {/* Info: (20240418 - Julian) Dropmenu */}
      <div
        className={`absolute left-0 top-50px grid w-full grid-cols-1 shadow-dropmenu ${isSortByMenuOpen ? 'grid-rows-1 border-lightGray3' : 'grid-rows-0 border-transparent'} overflow-hidden rounded-md border transition-all duration-300 ease-in-out`}
      >
        <ul ref={sortByMenuRef} className="z-10 flex w-full flex-col items-start bg-white p-8px">
          {['Newest', 'Oldest', 'Payment Process', 'Project Process'].map((sorting: string) => (
            <li
              key={sorting}
              onClick={() => {
                setFilteredJournalSortBy(sorting);
                setIsSortByMenuOpen(false);
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

  // ToDo: (20240419 - Julian) 邊框顏色與設計稿不一致，需要調整
  const displayedDatePicker = (
    <DatePicker
      type={DatePickerType.TEXT}
      period={filteredPeriod}
      setFilteredPeriod={setFilteredPeriod}
    />
  );

  const displayedSearchBar = (
    <div className="relative flex-1">
      <input
        type="text"
        placeholder="Search"
        className={`relative flex h-44px w-full items-center justify-between rounded-md border border-lightGray3 bg-white p-10px outline-none`}
      />
      <FiSearch size={20} className="absolute right-3 top-3 cursor-pointer" />
    </div>
  );

  const displayedToolbar = (
    <div className="flex w-full items-center justify-end gap-16px">
      {/* Info: (20240418 - Julian) Print button */}
      <button
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
            d="M6.10783 0.584473L6.13602 0.584474H9.86936L9.89755 0.584473C10.2468 0.584459 10.553 0.584446 10.8062 0.605131C11.0749 0.627086 11.3492 0.676031 11.6152 0.811544C12.0072 1.01128 12.3259 1.32999 12.5256 1.72199C12.6611 1.98795 12.7101 2.26229 12.732 2.531C12.7527 2.78417 12.7527 3.09034 12.7527 3.4396V3.46781V3.9408C12.7837 3.94286 12.8141 3.9451 12.844 3.94755C13.2239 3.97858 13.5806 4.0457 13.9178 4.21754C14.4353 4.48119 14.856 4.90189 15.1196 5.41933C15.2915 5.7566 15.3586 6.11325 15.3896 6.49314C15.4194 6.85738 15.4194 7.30324 15.4194 7.8374V7.86781V9.33447C15.4194 9.36751 15.4194 9.40007 15.4194 9.43219C15.4197 9.956 15.42 10.3607 15.3257 10.7129C15.0714 11.6619 14.3301 12.4032 13.3811 12.6574C13.1905 12.7085 12.9845 12.7319 12.7526 12.7425C12.7521 13.0177 12.7491 13.2625 12.732 13.4713C12.7101 13.74 12.6611 14.0143 12.5256 14.2803C12.3259 14.6723 12.0072 14.991 11.6152 15.1907C11.3492 15.3263 11.0749 15.3752 10.8062 15.3972C10.553 15.4178 10.2468 15.4178 9.89752 15.4178H9.86936H6.13602H6.10786C5.75858 15.4178 5.45239 15.4178 5.19922 15.3972C4.9305 15.3752 4.65617 15.3263 4.39021 15.1907C3.9982 14.991 3.67949 14.6723 3.47976 14.2803C3.34424 14.0143 3.2953 13.74 3.27334 13.4713C3.25629 13.2625 3.25331 13.0177 3.25279 12.7425C3.02086 12.7319 2.81486 12.7085 2.62427 12.6574C1.67527 12.4032 0.93401 11.6619 0.679725 10.7129C0.585365 10.3607 0.585633 9.956 0.585978 9.43219C0.586 9.40007 0.586021 9.36751 0.586021 9.33447V7.86781L0.586021 7.83737C0.58601 7.30322 0.586001 6.85737 0.61576 6.49314C0.646798 6.11325 0.713909 5.7566 0.885753 5.41933C1.14941 4.90189 1.5701 4.48119 2.08755 4.21754C2.42481 4.0457 2.78147 3.97858 3.16135 3.94755C3.19125 3.9451 3.22169 3.94286 3.25269 3.9408V3.46781L3.25269 3.43961C3.25267 3.09035 3.25266 2.78417 3.27334 2.531C3.2953 2.26229 3.34424 1.98795 3.47976 1.72199C3.67949 1.32999 3.9982 1.01128 4.39021 0.811544C4.65617 0.676031 4.9305 0.627086 5.19922 0.605131C5.45239 0.584446 5.75857 0.584459 6.10783 0.584473ZM4.75269 3.91781H11.2527V3.46781C11.2527 3.08206 11.2521 2.83786 11.237 2.65315C11.2226 2.4772 11.1989 2.42224 11.1891 2.40298C11.1332 2.29322 11.0439 2.20398 10.9342 2.14805L11.2747 1.4798L10.9342 2.14805C10.9149 2.13824 10.86 2.11453 10.684 2.10015C10.4993 2.08506 10.2551 2.08447 9.86936 2.08447H6.13602C5.75028 2.08447 5.50608 2.08506 5.32136 2.10015C5.14541 2.11453 5.09045 2.13824 5.07119 2.14805C4.96143 2.20398 4.87219 2.29322 4.81627 2.40298C4.80646 2.42224 4.78274 2.4772 4.76836 2.65315C4.75327 2.83786 4.75269 3.08206 4.75269 3.46781V3.91781ZM4.75269 12.0011V12.5345C4.75269 12.9202 4.75327 13.1644 4.76836 13.3491C4.78274 13.5251 4.80646 13.58 4.81627 13.5993C4.87219 13.7091 4.96143 13.7983 5.07119 13.8542C5.09045 13.864 5.14541 13.8878 5.32136 13.9021C5.50608 13.9172 5.75028 13.9178 6.13602 13.9178H9.86936C10.2551 13.9178 10.4993 13.9172 10.684 13.9021C10.86 13.8878 10.9149 13.864 10.9342 13.8542C11.0439 13.7983 11.1332 13.7091 11.1891 13.5993C11.1989 13.58 11.2226 13.5251 11.237 13.3491C11.2521 13.1644 11.2527 12.9202 11.2527 12.5345V12.0011V11.4678C11.2527 11.0821 11.2521 10.8379 11.237 10.6532C11.2226 10.4772 11.1989 10.4222 11.1891 10.403C11.1332 10.2932 11.0439 10.204 10.9342 10.1481C10.9149 10.1382 10.86 10.1145 10.684 10.1001C10.4993 10.0851 10.2551 10.0845 9.86936 10.0845H6.13602C5.75028 10.0845 5.50608 10.0851 5.32136 10.1001C5.14541 10.1145 5.09045 10.1382 5.07119 10.1481C4.96143 10.204 4.87219 10.2932 4.81627 10.403C4.80646 10.4222 4.78274 10.4772 4.76836 10.6532C4.75327 10.8379 4.75269 11.0821 4.75269 11.4678V12.0011ZM12.7525 11.2407C12.7519 10.9732 12.7487 10.7349 12.732 10.531C12.7101 10.2623 12.6611 9.98795 12.5256 9.72199C12.3259 9.32999 12.0072 9.01128 11.6152 8.81154C11.3492 8.67603 11.0749 8.62709 10.8062 8.60513C10.553 8.58445 10.2468 8.58446 9.89754 8.58447L9.86936 8.58447H6.13602L6.10783 8.58447C5.75857 8.58446 5.45239 8.58445 5.19922 8.60513C4.9305 8.62709 4.65617 8.67603 4.39021 8.81154C3.9982 9.01128 3.67949 9.32999 3.47976 9.72199C3.34424 9.98795 3.2953 10.2623 3.27334 10.531C3.25668 10.7349 3.25345 10.9732 3.25283 11.2407C3.13948 11.2343 3.07108 11.2242 3.0125 11.2085C2.58113 11.093 2.2442 10.756 2.12861 10.3247C2.09246 10.1897 2.08602 10.0027 2.08602 9.33447V7.86781C2.08602 7.29538 2.0866 6.91116 2.11078 6.61529C2.13424 6.32816 2.17612 6.19088 2.22226 6.10032C2.3421 5.86512 2.53333 5.67389 2.76853 5.55405C2.85909 5.50791 2.99638 5.46602 3.2835 5.44256C3.57938 5.41839 3.96359 5.41781 4.53602 5.41781H11.4694C12.0418 5.41781 12.426 5.41839 12.7219 5.44256C13.009 5.46602 13.1463 5.50791 13.2368 5.55405C13.472 5.67389 13.6633 5.86512 13.7831 6.10032C13.8293 6.19088 13.8711 6.32816 13.8946 6.61529C13.9188 6.91116 13.9194 7.29538 13.9194 7.86781V9.33447C13.9194 10.0027 13.9129 10.1897 13.8768 10.3247C13.7612 10.756 13.4242 11.093 12.9929 11.2085C12.9343 11.2242 12.8659 11.2343 12.7525 11.2407ZM9.25269 7.00114C9.25269 6.58693 9.58848 6.25114 10.0027 6.25114H12.0027C12.4169 6.25114 12.7527 6.58693 12.7527 7.00114C12.7527 7.41535 12.4169 7.75114 12.0027 7.75114H10.0027C9.58848 7.75114 9.25269 7.41535 9.25269 7.00114Z"
            fill="#001840"
          />
        </svg>
      </button>

      {/* Info: (20240418 - Julian) Download button */}
      <button
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
      </button>

      {/* Info: (20240418 - Julian) Select */}
      <button
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
        <p>Select</p>
      </button>
    </div>
  );

  const isDisplayedJournalList =
    isLoading === false ? (
      success && journals ? (
        <>
          <JournalList journals={journals} />
          <div className="mx-auto my-40px">
            <Pagination
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              totalPages={totalPages}
            />
          </div>
        </>
      ) : (
        <>
          <p>Failed to fetch data</p>
          <p>{code}</p>
          <p>{error?.message}</p>
        </>
      )
    ) : (
      // Info: (20240419 - Julian) If no data
      <div className="flex h-full w-full flex-1 flex-col items-center justify-center text-xl font-semibold text-lightGray4">
        <Image src={'/icons/empty.svg'} width={48} height={70} alt="empty_icon" />
        <p>Empty</p>
      </div>
    );

  return (
    <div className="flex min-h-screen w-full flex-col p-10">
      {/* Info: (20240417 - Julian) Title */}
      <h1 className="text-4xl font-semibold text-lightGray5">View My Journal List</h1>

      {/* Info: (20240417 - Julian) Divider */}
      <hr className="my-20px w-full border-lightGray6" />

      {/* Info: (20240417 - Julian) Filter */}
      <div className="my-10px flex items-end gap-24px text-sm">
        {/* Info: (20240417 - Julian) Type */}
        <div className="flex flex-col items-start gap-8px">
          <p className="font-semibold text-navyBlue2">Type</p>
          {displayedTypeDropMenu}
        </div>

        {/* Info: (20240418 - Julian) Sort by */}
        <div className="flex flex-col items-start gap-8px">
          <p className="font-semibold text-navyBlue2">Sort by</p>
          {displayedSortByDropMenu}
        </div>

        {/* Info: (20240418 - Julian) Date picker */}
        {displayedDatePicker}

        {/* Info: (20240418 - Julian) Search bar */}
        {displayedSearchBar}
      </div>

      {/* Info: (20240418 - Julian) Divider */}
      <div className="my-5 flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <Image src="/icons/bill.svg" width={16} height={16} alt="bill_icon" />
          <p>Journal List</p>
        </div>
        <hr className="flex-1 border-lightGray4" />
      </div>

      {/* Info: (20240418 - Julian) Toolbar */}
      {displayedToolbar}

      {/* Info: (20240418 - Julian) Journal list */}
      {isDisplayedJournalList}
    </div>
  );
};

export default JournalListTab;
