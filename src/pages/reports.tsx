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
import { FaAngleDown, FaListUl, FaChevronLeft, FaChevronRight } from 'react-icons/fa6';
import { RxTrackPrevious, RxTrackNext } from 'react-icons/rx';
import { BiSortDown } from 'react-icons/bi';

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
          <BiSortDown size={16} />
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
        <hr className="grow bg-stroke-neutral-solid-light" />
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
            <FaChevronLeft size={20} />
          </div>
          <div className="flex w-11 items-center justify-center rounded-xs border border-stroke-brand-primary p-3 text-text-brand-primary-lv2">
            1
          </div>
          <div className="flex items-center justify-center rounded-xs border border-navy-blue-25 p-3 text-navy-blue-25">
            <FaChevronRight size={20} />
          </div>
          <div className="flex items-center justify-center rounded-xs border border-navy-blue-25 p-3 text-navy-blue-25">
            <RxTrackNext size={20} />
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
