import Head from 'next/head';
import Image from 'next/image';
import React, { useState } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { ILocale } from '@/interfaces/locale';
import LandingNavBar from '@/components/landing_page/landing_nav_bar';
import ToggleButton from '@/components/toggle_button/toggle_button';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import { default30DayPeriodInSec } from '@/constants/display';
import { IDatePeriod } from '@/interfaces/date_period';
import { SortOrder } from '@/constants/sort';
import { HiOutlineMenuAlt2 } from 'react-icons/hi';
import { FaAngleDown, FaListUl } from 'react-icons/fa6';
import { RxTrackPrevious } from 'react-icons/rx';

const isAuditReportDisabled = true; // Info: (20240719 - Liz) Audit Report 目前都是假資料所以不開放

// Info: (20240424 - Liz) Define table data interface
interface ITableData {
  [key: string]: string;
  code: string;
  regional: string;
  company: string;
  informationYear: string;
  detailedInformation: string;
  creditRating: string;
  dateOfUpload: string;
  link: string;
}

// Info: (20240424 - Liz) Dummy Data
const initialData: ITableData[] = [
  {
    code: '2330',
    regional: 'TW',
    company: 'TSMC',
    informationYear: '2024 Q1',
    detailedInformation: 'IFRSs Consolidated Financial Report',
    creditRating: 'AAA',
    dateOfUpload: '2024/04/08',
    link: 'https://baifa.io/en/app/chains/8017/evidence/505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007/all-reports',
  },
  {
    code: '2234',
    regional: 'TW',
    company: 'iSunFA',
    informationYear: '2024 Q2',
    detailedInformation: 'IFRSs Consolidated Financial Report',
    creditRating: 'AA',
    dateOfUpload: '2024/04/08',
    link: 'https://baifa.io/en/app/chains/8017/evidence/505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007/all-reports',
  },
  {
    code: '8991',
    regional: 'HK',
    company: 'BAIFA',
    informationYear: '2024 Q3',
    detailedInformation: 'IFRSs Consolidated Financial Report',
    creditRating: 'A',
    dateOfUpload: '2024/04/08',
    link: 'https://baifa.io/en/app/chains/8017/evidence/505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007/all-reports',
  },
  {
    code: '8778',
    regional: 'HK',
    company: 'ASICEX',
    informationYear: '2024 Q4',
    detailedInformation: 'IFRSs Consolidated Financial Report',
    creditRating: 'BBB',
    dateOfUpload: '2024/04/08',
    link: 'https://baifa.io/en/app/chains/8017/evidence/505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007/all-reports',
  },
  {
    code: '2233',
    regional: 'TW',
    company: 'CAFACA',
    informationYear: 'Daily',
    detailedInformation: 'IFRSs Consolidated Financial Report',
    creditRating: 'BB',
    dateOfUpload: '2024/04/08',
    link: 'https://baifa.io/en/app/chains/8017/evidence/505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007/all-reports',
  },
  {
    code: '8866',
    regional: 'HK',
    company: 'iSunOne',
    informationYear: '2024 Q1',
    detailedInformation: 'IFRSs Consolidated Financial Report',
    creditRating: 'B',
    dateOfUpload: '2024/04/08',
    link: 'https://baifa.io/en/app/chains/8017/evidence/505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007/all-reports',
  },
  {
    code: '0078',
    regional: 'US',
    company: 'Rover',
    informationYear: '2024 Q2',
    detailedInformation: 'IFRSs Consolidated Financial Report',
    creditRating: 'AA',
    dateOfUpload: '2024/04/08',
    link: 'https://baifa.io/en/app/chains/8017/evidence/505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007/all-reports',
  },
  {
    code: '0012',
    regional: 'US',
    company: 'Apple',
    informationYear: 'Daily',
    detailedInformation: 'IFRSs Consolidated Financial Report',
    creditRating: 'AAA',
    dateOfUpload: '2024/04/08',
    link: 'https://baifa.io/en/app/chains/8017/evidence/505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007/all-reports',
  },
  {
    code: '-',
    regional: 'TW',
    company: 'IFR',
    informationYear: 'Daily',
    detailedInformation: 'IFRSs Consolidated Financial Report',
    creditRating: 'B',
    dateOfUpload: '2024/04/08',
    link: 'https://baifa.io/en/app/chains/8017/evidence/505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007/all-reports',
  },
  {
    code: '-',
    regional: 'TW',
    company: 'BACEX',
    informationYear: 'Daily',
    detailedInformation: 'IFRSs Consolidated Financial Report',
    creditRating: 'CCC',
    dateOfUpload: '2024/04/08',
    link: 'https://baifa.io/en/app/chains/8017/evidence/505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007/all-reports',
  },
];

const AuditReport = () => {
  const { t } = useTranslation(['common', 'reports']);
  const [data, setData] = React.useState<ITableData[]>(initialData);
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortOrder.ASC | SortOrder.DESC>(SortOrder.ASC);
  const [checked, setChecked] = useState(false);

  const [datePeriod, setDatePeriod] = useState<IDatePeriod>(default30DayPeriodInSec);

  const compareCreditRatings = (
    a: string,
    b: string,
    direction: SortOrder.ASC | SortOrder.DESC
  ) => {
    const ratingOrder: { [key: string]: number } = {
      AAA: 1,
      AA: 2,
      A: 3,
      BBB: 4,
      BB: 5,
      B: 6,
      CCC: 7,
      CC: 8,
      C: 9,
      D: 10,
    };
    const aRating = ratingOrder[a] || Number.MAX_SAFE_INTEGER;
    const bRating = ratingOrder[b] || Number.MAX_SAFE_INTEGER;
    return direction === SortOrder.ASC ? aRating - bRating : bRating - aRating;
  };

  const handleSort = (column: string) => {
    const direction =
      sortBy === column && sortDirection === SortOrder.ASC ? SortOrder.DESC : SortOrder.ASC;
    setSortBy(column);
    setSortDirection(direction);
    const sortedData = data.sort((a, b) => {
      if (column === 'creditRating') {
        return compareCreditRatings(a[column], b[column], direction);
      } else {
        return direction === SortOrder.ASC
          ? a[column].localeCompare(b[column])
          : b[column].localeCompare(a[column]);
      }
    });
    setData(sortedData);
  };

  const handleLinkClick = (link: string) => {
    window.open(link, '_blank');
  };

  const displayTableRows = data.map((row: ITableData, index) => (
    <tr
      key={`${row.code}-${row.company}`}
      className={index % 2 === 0 ? 'bg-surface-neutral-surface-lv1' : 'bg-surface-neutral-mute'}
    >
      <td className="px-8px py-10px">{row.code}</td>
      <td className="px-8px py-10px">{row.regional}</td>
      <td className="px-8px py-10px">{row.company}</td>
      <td className="px-8px py-10px">{row.informationYear}</td>
      <td className="px-8px py-10px">{row.detailedInformation}</td>
      <td className="px-8px py-10px">{row.creditRating}</td>
      <td className="px-8px py-10px">{row.dateOfUpload}</td>
      <td className="px-8px py-10px">
        <div
          className="flex cursor-pointer items-center justify-center"
          onClick={() => handleLinkClick(row.link)}
        >
          <Image src="/elements/link.svg" width={20} height={20} alt="link" />
        </div>
      </td>
    </tr>
  ));

  const displayCards = data.map((card: ITableData, index) => (
    <div
      className={`flex gap-10px rounded-sm border border-stroke-brand-secondary py-6px pl-8px pr-14px transition active:bg-slider-surface-controller-hover ${index % 2 === 0 ? 'bg-slider-surface-controller' : 'cursor-pointer bg-slider-surface-base'}`}
      key={`${card.code}-${card.company}`}
      onClick={() => handleLinkClick(card.link)}
    >
      <div className="flex w-56px items-center justify-center rounded-xs border border-stroke-brand-secondary text-lg font-semibold text-text-brand-secondary-lv2">
        {card.creditRating}
      </div>
      <div>
        <div className="text-sm font-semibold text-text-neutral-primary">
          {card.company}
          <span> </span>
          <span className="text-xs font-semibold text-text-neutral-primary">
            {card.regional}/{card.code}
          </span>
        </div>
        <div className="text-xs font-light text-text-neutral-primary">
          {card.detailedInformation}
        </div>
        <div className="text-xs font-semibold text-text-neutral-primary">
          {card.informationYear}
        </div>
      </div>
    </div>
  ));

  // Info: (20240424 - Liz) Desktop ver
  const desktopVer = (
    <div className="hidden flex-col px-80px py-120px lg:flex">
      {/*  Info: (20240424 - Liz) ===== Title ===== */}
      <section className="mb-14 text-center text-h1 font-bold leading-h1 text-navy-blue-25">
        {t('reports:AUDIT_REPORT.AUDIT_REPORT')}
      </section>

      {/*  Info: (20240424 - Liz) ===== Conditional Filters ===== */}
      <section id="conditional-filters" className="mb-10 flex items-center gap-24px px-4px">
        {/* Date Picker */}
        <div>
          <DatePicker
            type={DatePickerType.TEXT_PERIOD}
            period={datePeriod}
            setFilteredPeriod={setDatePeriod}
            btnClassName="w-360px items-center text-left"
          />
        </div>

        {/* Search */}
        <div className="flex grow items-center justify-between rounded-sm border border-input-stroke-input bg-input-surface-input-background">
          <div className="grow">
            <input
              type="text"
              placeholder={t('search:COMMON.SEARCH')}
              className="w-full rounded-sm bg-input-surface-input-background px-3 py-2.5 text-base font-medium placeholder:text-input-text-input-placeholder focus:outline-none"
            />
          </div>
          <div className="cursor-pointer px-3 py-2.5">
            <Image src="/elements/search_icon.svg" width={20} height={20} alt="search" />
          </div>
        </div>
      </section>

      {/*  Info: (20240424 - Liz) ===== Audit Report List ===== */}
      <section id="audit-report-list" className="flex flex-col gap-5">
        {/* Filter Display List */}
        <div className="flex items-center gap-5 px-4px">
          <div className="text-lg font-semibold text-navy-blue-25">
            {t('reports:AUDIT_REPORT.SHOW_DESIGNATED_REGIONAL_COMPANIES')}
          </div>
          <form className="flex gap-5 text-sm font-semibold text-text-brand-primary-lv2">
            <label htmlFor="us" className="flex cursor-pointer gap-2">
              <input type="checkbox" id="us" name="country" value="US" className="cursor-pointer" />{' '}
              {t('reports:AUDIT_REPORT.US')}
            </label>
            <label htmlFor="hk" className="flex cursor-pointer gap-2">
              <input type="checkbox" id="hk" name="country" value="HK" className="cursor-pointer" />{' '}
              {t('reports:AUDIT_REPORT.HK')}
            </label>
            <label htmlFor="tw" className="flex cursor-pointer gap-2">
              <input type="checkbox" id="tw" name="country" value="TW" className="cursor-pointer" />{' '}
              {t('reports:AUDIT_REPORT.TW')}
            </label>
          </form>
        </div>

        {/* Table */}
        <div className="">
          <table className="w-full border-separate border-spacing-x-1 text-center">
            <thead className="bg-stroke-brand-primary-moderate text-h6 font-bold leading-8 text-text-brand-secondary-lv1">
              <tr className="">
                <th className="px-8px py-12px">{t('reports:AUDIT_REPORT.CODE')}</th>
                <th className="px-8px py-12px">{t('reports:AUDIT_REPORT.REGIONAL')}</th>
                <th className="px-8px py-12px">{t('reports:AUDIT_REPORT.COMPANY')}</th>
                <th className="flex items-center justify-center gap-1 px-8px py-12px">
                  <div>{t('reports:AUDIT_REPORT.INFORMATION_YEAR')}</div>
                  <div onClick={() => handleSort('informationYear')} className="cursor-pointer">
                    <HiOutlineMenuAlt2
                      className={`h-5 w-5 ${sortBy === 'creditRating' ? 'text-support-baby-400' : 'text-neutral-700'}`}
                    />
                  </div>
                </th>
                <th className="px-8px py-12px">{t('reports:AUDIT_REPORT.DETAILED_INFORMATION')}</th>
                <th className="flex items-center justify-center gap-1 px-8px py-12px">
                  <div>{t('reports:AUDIT_REPORT.CREDIT_RATING')}</div>
                  <div onClick={() => handleSort('creditRating')} className="cursor-pointer">
                    <HiOutlineMenuAlt2
                      className={`h-5 w-5 ${sortBy === 'creditRating' ? 'text-support-baby-400' : 'text-neutral-700'}`}
                    />
                  </div>
                </th>
                <th className="px-8px py-12px">{t('reports:AUDIT_REPORT.DATE_OF_UPLOAD')}</th>
                <th className="px-8px py-12px">{t('reports:AUDIT_REPORT.LINK')}</th>
              </tr>
            </thead>
            <tbody className="text-lg font-medium text-text-brand-secondary-lv1">
              {/* Dynamically generate table rows */}
              {displayTableRows}
            </tbody>
          </table>
        </div>

        {/* Checkbox : no-daily-reports */}
        <div className="self-end px-4px">
          <form className="">
            <label
              htmlFor="no-daily-reports"
              className="flex cursor-pointer gap-2 text-text-brand-primary-lv2"
            >
              <input
                type="checkbox"
                id="no-daily-reports"
                name="no-daily-reports"
                value="no-daily-reports"
                className="cursor-pointer"
              />
              {t('reports:AUDIT_REPORT.DON_T_SHOW_DAILY_REPORTS')}
            </label>
          </form>
        </div>

        {/* Pagination */}
        <div className="flex flex-col items-center">
          <div className="flex gap-10px">
            <div className="flex items-center justify-center rounded-xs border border-navy-blue-25 p-3">
              <Image
                src="/elements/first_page_icon.svg"
                width={20}
                height={20}
                alt="first_page_icon"
              />
            </div>
            <div className="flex items-center justify-center rounded-xs border border-navy-blue-25 p-3">
              <Image
                src="/elements/previous_page_icon.svg"
                width={20}
                height={20}
                alt="previous_page_icon"
              />
            </div>
            <div className="flex w-11 items-center justify-center rounded-xs border border-stroke-brand-primary p-3 text-text-brand-primary-lv2">
              1
            </div>
            <div className="flex items-center justify-center rounded-xs border border-navy-blue-25 p-3">
              <Image
                src="/elements/next_page_icon.svg"
                width={20}
                height={20}
                alt="next_page_icon"
              />
            </div>
            <div className="flex items-center justify-center rounded-xs border border-navy-blue-25 p-3">
              <Image
                src="/elements/last_page_icon.svg"
                width={20}
                height={20}
                alt="last_page_icon"
              />
            </div>
          </div>
          <div>{t('reports:AUDIT_REPORT.OF_100')}</div>
        </div>
      </section>
    </div>
  );

  // Info: (20240424 - Liz) Mobile ver
  const mobileVer = (
    <div className="flex flex-col px-5 lg:hidden">
      {/* Info: (20240424 - Liz) ===== Title ===== */}
      <section className="pb-20px pt-90px text-center text-h4 font-bold leading-9 text-navy-blue-25">
        {t('reports:AUDIT_REPORT.AUDIT_REPORT')}
      </section>

      {/* Info: (20240424 - Liz) ===== Conditional Filters ===== */}
      <section className="flex items-end gap-1">
        {/* Search */}
        <div className="flex grow flex-col gap-2">
          <div className="text-sm font-semibold text-navy-blue-25">
            {t('reports:AUDIT_REPORT.COMPANY_CODE_OR ABBREVIATION')}{' '}
          </div>
          <div className="flex items-center justify-between rounded-sm border border-input-stroke-input bg-input-surface-input-background focus-within:border-stroke-brand-primary focus-within:bg-input-surface-input-selected focus:border">
            <div className="grow rounded-sm px-3">
              <input
                type="text"
                placeholder={t('search:COMMON.SEARCH')}
                className="w-full rounded-sm bg-transparent py-2.5 text-xs font-medium text-input-text-input-filled placeholder:text-input-text-input-placeholder focus:outline-none"
              />
            </div>
            <div className="cursor-pointer px-3 py-2.5">
              <Image src="/elements/search_icon.svg" width={20} height={20} alt="search" />
            </div>
          </div>
        </div>
        {/* Date Picker */}
        <div>
          <DatePicker
            type={DatePickerType.ICON_PERIOD}
            period={datePeriod}
            setFilteredPeriod={setDatePeriod}
            calenderClassName="right-0"
            btnClassName="rounded-xs border border-stroke-neutral-solid-light bg-inherit p-2.5 text-neutral-white"
            buttonStyleAfterDateSelected="border-stroke-neutral-solid-light"
          />
        </div>
        {/* Sort */}
        <div className="cursor-pointer rounded-xs border border-stroke-neutral-solid-light p-2.5 text-neutral-white">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M3.33545 0.584473C3.74966 0.584473 4.08545 0.920259 4.08545 1.33447L4.08545 3.52381L4.80512 2.80414C5.09801 2.51125 5.57289 2.51125 5.86578 2.80414C6.15867 3.09704 6.15867 3.57191 5.86578 3.8648L3.86578 5.8648C3.72513 6.00546 3.53436 6.08447 3.33545 6.08447C3.13654 6.08447 2.94577 6.00546 2.80512 5.8648L0.805119 3.8648C0.512226 3.57191 0.512226 3.09704 0.805119 2.80414C1.09801 2.51125 1.57289 2.51125 1.86578 2.80414L2.58545 3.52381L2.58545 1.33447C2.58545 0.920259 2.92124 0.584473 3.33545 0.584473ZM12.0546 2.7759C11.7588 2.75172 11.3745 2.75114 10.8021 2.75114H8.00212C7.5879 2.75114 7.25212 2.41535 7.25212 2.00114C7.25212 1.58693 7.5879 1.25114 8.00212 1.25114H10.8021L10.8326 1.25114C11.3667 1.25113 11.8126 1.25112 12.1768 1.28088C12.5567 1.31192 12.9133 1.37903 13.2506 1.55087C13.768 1.81452 14.1887 2.23522 14.4524 2.75267C14.6242 3.08993 14.6913 3.44658 14.7224 3.82647C14.7521 4.1907 14.7521 4.63654 14.7521 5.17069V5.20114V10.8011V10.8316C14.7521 11.3657 14.7521 11.8116 14.7224 12.1758C14.6913 12.5557 14.6242 12.9124 14.4524 13.2496C14.1887 13.7671 13.768 14.1878 13.2506 14.4514C12.9133 14.6233 12.5567 14.6904 12.1768 14.7214C11.8126 14.7512 11.3667 14.7512 10.8326 14.7511H10.8021H5.20212H5.17166C4.63752 14.7512 4.19168 14.7512 3.82745 14.7214C3.44756 14.6904 3.0909 14.6233 2.75364 14.4514C2.2362 14.1878 1.8155 13.7671 1.55185 13.2496C1.38 12.9124 1.31289 12.5557 1.28186 12.1758C1.2521 11.8116 1.2521 11.3657 1.25212 10.8316L1.25212 10.8011V8.00114C1.25212 7.58693 1.5879 7.25114 2.00212 7.25114C2.41633 7.25114 2.75212 7.58693 2.75212 8.00114V10.8011C2.75212 11.3736 2.7527 11.7578 2.77687 12.0537C2.80033 12.3408 2.84221 12.4781 2.88836 12.5686C3.0082 12.8038 3.19942 12.9951 3.43463 13.1149C3.52519 13.161 3.66247 13.2029 3.94959 13.2264C4.24547 13.2506 4.62969 13.2511 5.20212 13.2511H10.8021C11.3745 13.2511 11.7588 13.2506 12.0546 13.2264C12.3418 13.2029 12.479 13.161 12.5696 13.1149C12.8048 12.9951 12.996 12.8038 13.1159 12.5686C13.162 12.4781 13.2039 12.3408 13.2274 12.0537C13.2515 11.7578 13.2521 11.3736 13.2521 10.8011V5.20114C13.2521 4.62871 13.2515 4.2445 13.2274 3.94862C13.2039 3.66149 13.162 3.52421 13.1159 3.43365C12.996 3.19845 12.8048 3.00722 12.5696 2.88738C12.479 2.84124 12.3418 2.79936 12.0546 2.7759ZM8.00212 3.91781C8.41633 3.91781 8.75212 4.25359 8.75212 4.66781V11.3345C8.75212 11.7487 8.41633 12.0845 8.00212 12.0845C7.5879 12.0845 7.25212 11.7487 7.25212 11.3345V4.66781C7.25212 4.25359 7.5879 3.91781 8.00212 3.91781ZM10.6688 6.58447C11.083 6.58447 11.4188 6.92026 11.4188 7.33447V11.3345C11.4188 11.7487 11.083 12.0845 10.6688 12.0845C10.2546 12.0845 9.91878 11.7487 9.91878 11.3345V7.33447C9.91878 6.92026 10.2546 6.58447 10.6688 6.58447ZM5.33545 7.91781C5.74966 7.91781 6.08545 8.25359 6.08545 8.66781V11.3345C6.08545 11.7487 5.74966 12.0845 5.33545 12.0845C4.92124 12.0845 4.58545 11.7487 4.58545 11.3345V8.66781C4.58545 8.25359 4.92124 7.91781 5.33545 7.91781Z"
              className="fill-current"
            />
          </svg>
        </div>
      </section>

      {/* Info: (20240424 - Liz) ===== Region & Switch daily reports ===== */}
      <section className="flex justify-between pt-5">
        <div className="flex cursor-pointer items-center gap-1 rounded-xs border border-stroke-neutral-solid-light px-4 py-2">
          <div className="text-sm font-medium text-navy-blue-25">
            {t('reports:AUDIT_REPORT.REGION')}
          </div>
          <div className="text-navy-blue-25">
            <FaAngleDown className="h-4 w-4" />
          </div>
        </div>
        {/* Switch daily reports  */}
        <div className="flex items-center gap-16px">
          <div
            className={`text-xs ${checked ? 'text-stroke-neutral-invert' : 'text-switch-text-disable'}`}
          >
            {t('reports:AUDIT_REPORT.SHOW_DAILY_REPORTS')}
          </div>
          <ToggleButton checked={checked} onChange={() => setChecked(!checked)} />
        </div>
      </section>

      {/* Info: (20240424 - Liz) ===== Divider ===== */}
      <div className="flex items-center gap-16px pt-6">
        <div className="flex items-center gap-8px">
          <FaListUl className="h-4 w-4 text-white" />
          <div className="whitespace-nowrap text-navy-blue-25">
            {t('reports:AUDIT_REPORT.CARD_LIST')}
          </div>
        </div>
        {/* line */}
        <div className="grow bg-stroke-neutral-solid-light">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="1"
            height="1"
            viewBox="0 0 1 1"
            fill="none"
          >
            <line
              x1="0.5"
              y1="0.5"
              x2="183.5"
              y2="0.5"
              stroke="fill-current"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      {/* Info: (20240424 - Liz) ===== Audit Report List ===== */}
      <section className="flex flex-col gap-8px pt-15px">{displayCards}</section>

      {/* Info: (20240424 - Liz) ===== Pagination ===== */}
      <section className="flex flex-col items-center pb-20px pt-40px">
        <div className="flex gap-10px">
          <div className="flex items-center justify-center rounded-xs border border-navy-blue-25 p-3 text-navy-blue-25">
            <RxTrackPrevious size={20} />
          </div>
          <div className="flex items-center justify-center rounded-xs border border-navy-blue-25 p-3 text-navy-blue-25">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M13.4779 3.71319C13.844 4.0793 13.844 4.67289 13.4779 5.03901L8.51577 10.0011L13.4779 14.9632C13.844 15.3293 13.844 15.9229 13.4779 16.289C13.1117 16.6551 12.5181 16.6551 12.152 16.289L6.52703 10.664C6.16091 10.2979 6.16091 9.7043 6.52703 9.33819L12.152 3.71319C12.5181 3.34707 13.1117 3.34707 13.4779 3.71319Z"
                className="fill-current"
              />
            </svg>
          </div>
          <div className="flex w-11 items-center justify-center rounded-xs border border-stroke-brand-primary p-3 text-text-brand-primary-lv2">
            1
          </div>
          <div className="flex items-center justify-center rounded-xs border border-navy-blue-25 p-3 text-navy-blue-25">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6.52703 3.71319C6.89315 3.34707 7.48674 3.34707 7.85285 3.71319L13.4779 9.33819C13.844 9.7043 13.844 10.2979 13.4779 10.664L7.85285 16.289C7.48674 16.6551 6.89315 16.6551 6.52703 16.289C6.16091 15.9229 6.16091 15.3293 6.52703 14.9632L11.4891 10.0011L6.52703 5.03901C6.16091 4.67289 6.16091 4.0793 6.52703 3.71319Z"
                className="fill-current"
              />
            </svg>
          </div>
          <div className="flex items-center justify-center rounded-xs border border-navy-blue-25 p-3 text-navy-blue-25">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M4.43691 3.04153C4.85558 2.76904 5.41499 2.71805 5.90881 3.01293L15.5928 8.80888C16.0479 9.08116 16.2521 9.56125 16.2521 10.0011C16.2521 10.4409 16.048 10.921 15.5929 11.1932L5.90935 16.9889C5.41553 17.2838 4.85558 17.2332 4.43691 16.9607C4.02351 16.6916 3.75244 16.215 3.75244 15.6652V4.33704C3.75244 3.78718 4.02351 3.31058 4.43691 3.04153ZM5.11876 4.08918C5.0634 4.12521 5.00244 4.20564 5.00244 4.33704V15.6652C5.00244 15.7966 5.0634 15.877 5.11876 15.913C5.14688 15.9313 5.17245 15.9379 5.19223 15.9386C5.20967 15.9393 5.23427 15.9362 5.26795 15.9161L14.9511 10.1206C14.9694 10.1097 15.0021 10.0755 15.0021 10.0011C15.0021 9.92673 14.9694 9.89253 14.9511 9.8816L5.26795 4.08614C5.23435 4.06612 5.20965 4.0629 5.19223 4.06356C5.17245 4.06431 5.14688 4.07088 5.11876 4.08918Z"
                className="fill-current"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M15.6274 2.5011C15.9726 2.5011 16.2524 2.78092 16.2524 3.1261V16.8761C16.2524 17.2213 15.9726 17.5011 15.6274 17.5011C15.2823 17.5011 15.0024 17.2213 15.0024 16.8761V3.1261C15.0024 2.78092 15.2823 2.5011 15.6274 2.5011Z"
                className="fill-current"
              />
            </svg>
          </div>
        </div>
        <div>{t('reports:AUDIT_REPORT.OF_100')}</div>
      </section>
    </div>
  );

  return (
    <>
      <Head>
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{t('reports:AUDIT_REPORT.ISUNFA_AUDIT_REPORT')}</title>
      </Head>

      {/* Info: (20240424 - Liz) Navbar */}
      <nav className="">
        <LandingNavBar />
      </nav>

      <main className="w-screen overflow-hidden">
        {/*  Info: (20240424 - Liz) disable this page manually */}
        {isAuditReportDisabled ? (
          <div className="min-h-screen bg-navy-blue-600 font-barlow">
            <div className="mx-auto w-fit pt-300px">
              <h1 className="text-lg font-bold text-gray-300 md:text-40px">
                {t('common:NAV_BAR.LINK_NOT_OPEN')}
              </h1>
            </div>
          </div>
        ) : (
          <div className="min-h-screen bg-navy-blue-600 font-barlow">
            {desktopVer}
            {mobileVer}
          </div>
        )}
      </main>
    </>
  );
};

const getStaticPropsFunction = async ({ locale }: ILocale) => ({
  props: {
    ...(await serverSideTranslations(locale, ['common', 'reports'])),
  },
});

export const getStaticProps = getStaticPropsFunction;

export default AuditReport;
