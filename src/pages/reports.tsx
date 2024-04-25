import Head from 'next/head';
import Image from 'next/image';
import React, { useState } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '../interfaces/locale';
import LandingNavBar from '../components/landing_nav_bar/landing_nav_bar';
import ToggleButton from '../components/toggle_button/toggle_button';

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

const auditReport = () => {
  const [data, setData] = React.useState<ITableData[]>(initialData);
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [checked, setChecked] = useState(false);

  const compareCreditRatings = (a: string, b: string, direction: 'asc' | 'desc') => {
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
    return direction === 'asc' ? aRating - bRating : bRating - aRating;
  };

  const handleSort = (column: string) => {
    const direction = sortBy === column && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortBy(column);
    setSortDirection(direction);
    const sortedData = data.sort((a, b) => {
      if (column === 'creditRating') {
        return compareCreditRatings(a[column], b[column], direction);
      } else {
        return direction === 'asc'
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
        <div className="flex items-center justify-center" onClick={() => handleLinkClick(row.link)}>
          <Image src="/elements/link.svg" width={20} height={20} alt="link" />
        </div>
      </td>
    </tr>
  ));

  const displayCards = data.map((card: ITableData, index) => (
    <div
      className={`flex gap-10px rounded-sm border border-stroke-brand-secondary py-6px pl-8px pr-14px transition active:bg-slider-surface-controller-hover ${index % 2 === 0 ? 'bg-slider-surface-controller' : 'bg-slider-surface-base'}`}
      key={`${card.code}-${card.company}`}
      onClick={() => setTimeout(() => handleLinkClick(card.link), 500)} // Delay the link click to allow the card animation to complete
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

  // Info: (20240424 - Liz) desktop ver
  const desktopVer = (
    <div className="hidden flex-col px-80px py-120px lg:flex">
      {/* Title */}
      <section className="mb-14 text-center text-h1 font-bold leading-h1">Audit Report</section>
      {/* Conditional Filters */}
      <section id="conditional-filters" className="mb-10 flex items-end gap-6 px-4px">
        {/* Search */}
        <div className="flex grow flex-col gap-2">
          <div className="text-sm font-semibold">Company Code or Abbreviation </div>
          <div className="flex items-center justify-between rounded-sm bg-input-surface-input-background">
            <div className="grow">
              <input
                type="text"
                placeholder="Search"
                className="w-full rounded-sm bg-input-surface-input-background px-3 py-2.5 text-base font-medium placeholder:text-input-text-input-placeholder focus:outline-none "
              />
            </div>
            <div className="px-3 py-2.5">
              <Image src="/elements/search_icon.svg" width={20} height={20} alt="search" />
            </div>
          </div>
        </div>
        {/* Date Picker */}
        <div className="flex items-center justify-between rounded-sm bg-input-surface-input-background">
          <div className="w-full">
            <input
              type="text"
              placeholder="Start Date - End Date"
              className="rounded-sm bg-input-surface-input-background px-3 py-2.5 text-base font-medium text-lightGray4 focus:outline-none"
            />
          </div>
          <div className="px-3 py-2.5 text-icon-surface-single-color-primary hover:text-text-brand-primary-lv2">
            {/* <Image src="/elements/calendar.svg" width={20} height={20} alt="calendar" /> */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6.66862 0.917969C7.08283 0.917969 7.41862 1.25376 7.41862 1.66797V2.58464H12.5853V1.66797C12.5853 1.25376 12.9211 0.917969 13.3353 0.917969C13.7495 0.917969 14.0853 1.25376 14.0853 1.66797V2.5855C14.5155 2.58766 14.8864 2.59515 15.205 2.62119C15.6683 2.65904 16.0867 2.73977 16.4774 2.93886C17.0889 3.25045 17.5861 3.74764 17.8977 4.35917C18.0968 4.74991 18.1776 5.16831 18.2154 5.63157C18.252 6.07914 18.252 6.62986 18.252 7.30325V7.33464V8.33464V14.3346V14.366C18.252 15.0394 18.252 15.5901 18.2154 16.0377C18.1776 16.501 18.0968 16.9194 17.8977 17.3101C17.5861 17.9216 17.0889 18.4188 16.4774 18.7304C16.0867 18.9295 15.6683 19.0102 15.205 19.0481C14.7575 19.0847 14.2068 19.0846 13.5334 19.0846H13.502H6.50195H6.47052C5.79715 19.0846 5.24644 19.0847 4.79888 19.0481C4.33562 19.0102 3.91723 18.9295 3.52648 18.7304C2.91496 18.4188 2.41777 17.9216 2.10618 17.3101C1.90709 16.9194 1.82635 16.501 1.7885 16.0377C1.75194 15.5901 1.75194 15.0394 1.75195 14.3661L1.75195 14.3346V8.33464V7.33464L1.75195 7.30322C1.75194 6.62984 1.75194 6.07913 1.7885 5.63157C1.82635 5.16831 1.90709 4.74991 2.10618 4.35917C2.41777 3.74764 2.91496 3.25045 3.52648 2.93886C3.91723 2.73977 4.33562 2.65904 4.79888 2.62119C5.11751 2.59515 5.4884 2.58766 5.91862 2.5855V1.66797C5.91862 1.25376 6.25441 0.917969 6.66862 0.917969ZM5.91862 4.08559C5.50621 4.08771 5.18665 4.0945 4.92103 4.11621C4.55053 4.14648 4.35151 4.20198 4.20747 4.27537C3.87819 4.44315 3.61047 4.71087 3.44269 5.04015C3.3693 5.18419 3.31379 5.38321 3.28352 5.75371C3.25254 6.13297 3.25195 6.62219 3.25195 7.33464V7.58464H16.752V7.33464C16.752 6.62219 16.7514 6.13297 16.7204 5.75371C16.6901 5.38321 16.6346 5.18419 16.5612 5.04015C16.3934 4.71087 16.1257 4.44315 15.7964 4.27537C15.6524 4.20198 15.4534 4.14648 15.0829 4.11621C14.8173 4.0945 14.4977 4.08771 14.0853 4.08559V5.0013C14.0853 5.41552 13.7495 5.7513 13.3353 5.7513C12.9211 5.7513 12.5853 5.41552 12.5853 5.0013V4.08464H7.41862V5.0013C7.41862 5.41552 7.08283 5.7513 6.66862 5.7513C6.25441 5.7513 5.91862 5.41552 5.91862 5.0013V4.08559ZM16.752 9.08464H3.25195V14.3346C3.25195 15.0471 3.25254 15.5363 3.28352 15.9156C3.31379 16.2861 3.3693 16.4851 3.44269 16.6291C3.61047 16.9584 3.87819 17.2261 4.20747 17.3939C4.35151 17.4673 4.55053 17.5228 4.92103 17.5531C5.30029 17.5841 5.78951 17.5846 6.50195 17.5846H13.502C14.2144 17.5846 14.7036 17.5841 15.0829 17.5531C15.4534 17.5228 15.6524 17.4673 15.7964 17.3939C16.1257 17.2261 16.3934 16.9584 16.5612 16.6291C16.6346 16.4851 16.6901 16.2861 16.7204 15.9156C16.7514 15.5363 16.752 15.0471 16.752 14.3346V9.08464Z"
                className="fill-current"
              />
            </svg>
          </div>
        </div>
      </section>
      {/* Audit Report List */}
      <section id="audit-report-list" className="flex flex-col gap-5">
        {/* Filter Display List */}
        <div className="flex items-center gap-5 px-4px">
          <div className="text-lg font-semibold">Show Designated Regional Companies</div>
          <form className="flex gap-5 text-sm font-semibold text-text-brand-primary-lv2">
            <label htmlFor="us" className="flex gap-2">
              <input type="checkbox" id="us" name="country" value="US" /> US
            </label>
            <label htmlFor="hk" className="flex gap-2">
              <input type="checkbox" id="hk" name="country" value="HK" /> HK
            </label>
            <label htmlFor="tw" className="flex gap-2">
              <input type="checkbox" id="tw" name="country" value="TW" /> TW
            </label>
          </form>
        </div>
        {/* Table */}
        <div className="">
          <table className="w-full border-separate border-spacing-x-1 text-center">
            <thead className="bg-stroke-brand-primary-moderate text-h6 font-bold leading-8 text-black">
              <tr className="">
                <th className="px-8px py-12px">Code</th>
                <th className="px-8px py-12px">Regional</th>
                <th className="px-8px py-12px">Company</th>
                <th className="flex items-center justify-center gap-1 px-8px py-12px">
                  <div>Information Year</div>
                  <div onClick={() => handleSort('informationYear')} className="cursor-pointer">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill={sortBy === 'informationYear' ? '#53B1FD' : '#1D2433'}
                    >
                      <path
                        d="M6.66667 14.167H3.33333C3.09722 14.167 2.89944 14.087 2.74 13.927C2.58 13.7675 2.5 13.5698 2.5 13.3337C2.5 13.0975 2.58 12.8998 2.74 12.7403C2.89944 12.5803 3.09722 12.5003 3.33333 12.5003H6.66667C6.90278 12.5003 7.10083 12.5803 7.26083 12.7403C7.42028 12.8998 7.5 13.0975 7.5 13.3337C7.5 13.5698 7.42028 13.7675 7.26083 13.927C7.10083 14.087 6.90278 14.167 6.66667 14.167ZM16.6667 5.83366H3.33333C3.09722 5.83366 2.89944 5.75394 2.74 5.59449C2.58 5.43449 2.5 5.23644 2.5 5.00033C2.5 4.76421 2.58 4.56616 2.74 4.40616C2.89944 4.24671 3.09722 4.16699 3.33333 4.16699H16.6667C16.9028 4.16699 17.1006 4.24671 17.26 4.40616C17.42 4.56616 17.5 4.76421 17.5 5.00033C17.5 5.23644 17.42 5.43449 17.26 5.59449C17.1006 5.75394 16.9028 5.83366 16.6667 5.83366ZM11.6667 10.0003H3.33333C3.09722 10.0003 2.89944 9.92033 2.74 9.76033C2.58 9.60088 2.5 9.4031 2.5 9.16699C2.5 8.93088 2.58 8.73283 2.74 8.57282C2.89944 8.41338 3.09722 8.33366 3.33333 8.33366H11.6667C11.9028 8.33366 12.1008 8.41338 12.2608 8.57282C12.4203 8.73283 12.5 8.93088 12.5 9.16699C12.5 9.4031 12.4203 9.60088 12.2608 9.76033C12.1008 9.92033 11.9028 10.0003 11.6667 10.0003Z"
                        fillOpacity="0.8"
                      />
                    </svg>
                  </div>
                </th>
                <th className="px-8px py-12px">Detailed Information</th>
                <th className="flex items-center justify-center gap-1 px-8px py-12px">
                  <div>Credit rating</div>
                  <div onClick={() => handleSort('creditRating')} className="cursor-pointer">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill={sortBy === 'creditRating' ? '#53B1FD' : '#1D2433'}
                    >
                      <path
                        d="M6.66667 14.167H3.33333C3.09722 14.167 2.89944 14.087 2.74 13.927C2.58 13.7675 2.5 13.5698 2.5 13.3337C2.5 13.0975 2.58 12.8998 2.74 12.7403C2.89944 12.5803 3.09722 12.5003 3.33333 12.5003H6.66667C6.90278 12.5003 7.10083 12.5803 7.26083 12.7403C7.42028 12.8998 7.5 13.0975 7.5 13.3337C7.5 13.5698 7.42028 13.7675 7.26083 13.927C7.10083 14.087 6.90278 14.167 6.66667 14.167ZM16.6667 5.83366H3.33333C3.09722 5.83366 2.89944 5.75394 2.74 5.59449C2.58 5.43449 2.5 5.23644 2.5 5.00033C2.5 4.76421 2.58 4.56616 2.74 4.40616C2.89944 4.24671 3.09722 4.16699 3.33333 4.16699H16.6667C16.9028 4.16699 17.1006 4.24671 17.26 4.40616C17.42 4.56616 17.5 4.76421 17.5 5.00033C17.5 5.23644 17.42 5.43449 17.26 5.59449C17.1006 5.75394 16.9028 5.83366 16.6667 5.83366ZM11.6667 10.0003H3.33333C3.09722 10.0003 2.89944 9.92033 2.74 9.76033C2.58 9.60088 2.5 9.4031 2.5 9.16699C2.5 8.93088 2.58 8.73283 2.74 8.57282C2.89944 8.41338 3.09722 8.33366 3.33333 8.33366H11.6667C11.9028 8.33366 12.1008 8.41338 12.2608 8.57282C12.4203 8.73283 12.5 8.93088 12.5 9.16699C12.5 9.4031 12.4203 9.60088 12.2608 9.76033C12.1008 9.92033 11.9028 10.0003 11.6667 10.0003Z"
                        fillOpacity="0.8"
                      />
                    </svg>
                  </div>
                </th>
                <th className="px-8px py-12px">Date of Upload</th>
                <th className="px-8px py-12px">LINK</th>
              </tr>
            </thead>
            <tbody className="text-lg font-medium text-black">
              {/* Dynamically generate table rows */}
              {displayTableRows}
            </tbody>
          </table>
        </div>
        {/* Checkbox : no-daily-reports */}
        <div className="self-end px-4px">
          <form className="">
            <label htmlFor="no-daily-reports" className="flex gap-2 text-text-brand-primary-lv2">
              <input
                type="checkbox"
                id="no-daily-reports"
                name="no-daily-reports"
                value="no-daily-reports"
              />
              {`Don't show daily reports `}
            </label>
          </form>
        </div>
        {/* Pagination */}
        <div className="flex flex-col items-center">
          <div className="flex gap-10px">
            <div className="flex items-center justify-center rounded-xs border border-lightWhite p-3">
              <Image
                src="/elements/first_page_icon.svg"
                width={20}
                height={20}
                alt="first_page_icon"
              />
            </div>
            <div className="flex items-center justify-center rounded-xs border border-lightWhite p-3">
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
            <div className="flex items-center justify-center rounded-xs border border-lightWhite p-3">
              <Image
                src="/elements/next_page_icon.svg"
                width={20}
                height={20}
                alt="next_page_icon"
              />
            </div>
            <div className="flex items-center justify-center rounded-xs border border-lightWhite p-3">
              <Image
                src="/elements/last_page_icon.svg"
                width={20}
                height={20}
                alt="last_page_icon"
              />
            </div>
          </div>
          <div>of 100</div>
        </div>
      </section>
    </div>
  );

  // Info: (20240424 - Liz) Mobile ver
  const mobileVer = (
    <div className="flex flex-col px-5 lg:hidden">
      {/* Title */}
      <section className="pb-20px pt-90px text-center text-h4 font-bold leading-9">
        Audit Report
      </section>
      {/* Conditional Filters */}
      <section className="flex items-end gap-1">
        {/* Search */}
        <div className="flex grow flex-col gap-2">
          <div className="text-sm font-semibold">Company Code or Abbreviation </div>
          <div className="flex items-center justify-between rounded-sm border border-input-stroke-input bg-input-surface-input-background focus-within:border-stroke-brand-primary focus-within:bg-input-surface-input-selected focus:border">
            <div className="grow rounded-sm px-3">
              <input
                type="text"
                placeholder="Search"
                className="w-full rounded-sm bg-transparent py-2.5 text-xs font-medium text-input-text-input-filled placeholder:text-input-text-input-placeholder focus:outline-none"
              />
            </div>
            <div className="px-3 py-2.5">
              <Image src="/elements/search_icon.svg" width={20} height={20} alt="search" />
            </div>
          </div>
        </div>
        {/* Date Picker */}
        <div className="rounded-xs border border-stroke-neutral-solid-light p-2.5 text-neutral-white">
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
              d="M5.33545 0.667725C5.70364 0.667725 6.00212 0.966201 6.00212 1.33439V2.00106H10.0021V1.33439C10.0021 0.966201 10.3006 0.667725 10.6688 0.667725C11.037 0.667725 11.3354 0.966201 11.3354 1.33439V2.00214C11.6524 2.00432 11.9295 2.01087 12.17 2.03052C12.5447 2.06114 12.8892 2.12685 13.2128 2.29171C13.7145 2.54737 14.1225 2.95532 14.3781 3.45708C14.543 3.78064 14.6087 4.12511 14.6393 4.49984C14.6688 4.86063 14.6688 5.30354 14.6688 5.84018V11.4953C14.6688 12.0319 14.6688 12.4748 14.6393 12.8356C14.6087 13.2103 14.543 13.5548 14.3781 13.8784C14.1225 14.3801 13.7145 14.7881 13.2128 15.0437C12.8892 15.2086 12.5447 15.2743 12.17 15.3049C11.8092 15.3344 11.3663 15.3344 10.8297 15.3344H5.17457C4.63793 15.3344 4.19503 15.3344 3.83423 15.3049C3.4595 15.2743 3.11503 15.2086 2.79148 15.0437C2.28971 14.7881 1.88176 14.3801 1.6261 13.8784C1.46124 13.5548 1.39553 13.2103 1.36491 12.8356C1.33543 12.4748 1.33544 12.0319 1.33545 11.4953V5.84019C1.33544 5.30354 1.33543 4.86064 1.36491 4.49984C1.39553 4.12511 1.46124 3.78064 1.6261 3.45708C1.88176 2.95532 2.28971 2.54737 2.79148 2.29171C3.11503 2.12685 3.4595 2.06114 3.83423 2.03052C4.07477 2.01087 4.35181 2.00432 4.66878 2.00214V1.33439C4.66878 0.966201 4.96726 0.667725 5.33545 0.667725ZM4.66878 3.33557C4.37176 3.33765 4.13854 3.34343 3.94281 3.35943C3.65053 3.38331 3.50106 3.42659 3.3968 3.47972C3.14591 3.60755 2.94194 3.81152 2.81411 4.0624C2.76098 4.16667 2.7177 4.31614 2.69382 4.60842C2.6693 4.90848 2.66878 5.29667 2.66878 5.86772V6.00106H13.3354V5.86772C13.3354 5.29667 13.3349 4.90848 13.3104 4.60842C13.2865 4.31614 13.2432 4.16667 13.1901 4.0624C13.0623 3.81152 12.8583 3.60755 12.6074 3.47972C12.5032 3.42659 12.3537 3.38331 12.0614 3.35943C11.8657 3.34343 11.6325 3.33765 11.3354 3.33557V4.00106C11.3354 4.36925 11.037 4.66772 10.6688 4.66772C10.3006 4.66772 10.0021 4.36925 10.0021 4.00106V3.33439H6.00212V4.00106C6.00212 4.36925 5.70364 4.66772 5.33545 4.66772C4.96726 4.66772 4.66878 4.36925 4.66878 4.00106V3.33557ZM13.3354 7.33439H2.66878V11.4677C2.66878 12.0388 2.6693 12.427 2.69382 12.727C2.7177 13.0193 2.76098 13.1688 2.81411 13.273C2.94194 13.5239 3.14591 13.7279 3.3968 13.8557C3.50106 13.9089 3.65053 13.9521 3.94281 13.976C4.24287 14.0005 4.63106 14.0011 5.20212 14.0011H10.8021C11.3732 14.0011 11.7614 14.0005 12.0614 13.976C12.3537 13.9521 12.5032 13.9089 12.6074 13.8557C12.8583 13.7279 13.0623 13.5239 13.1901 13.273C13.2432 13.1688 13.2865 13.0193 13.3104 12.727C13.3349 12.427 13.3354 12.0388 13.3354 11.4677V7.33439Z"
              className="fill-current"
            />
          </svg>
        </div>
        {/* Sort */}
        <div className="rounded-xs border border-stroke-neutral-solid-light p-2.5 text-neutral-white">
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
      {/* Region & Switch daily reports */}
      <section className="flex justify-between pt-5">
        <div className="flex items-center gap-1 rounded-xs border border-stroke-neutral-solid-light px-4 py-2">
          <div className="text-sm font-medium">Region</div>
          <div>
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
                d="M3.47162 5.47077C3.76452 5.17788 4.23939 5.17788 4.53228 5.47077L8.00195 8.94044L11.4716 5.47077C11.7645 5.17788 12.2394 5.17788 12.5323 5.47077C12.8252 5.76366 12.8252 6.23854 12.5323 6.53143L8.53228 10.5314C8.23939 10.8243 7.76452 10.8243 7.47162 10.5314L3.47162 6.53143C3.17873 6.23854 3.17873 5.76366 3.47162 5.47077Z"
                className="fill-current"
              />
            </svg>
          </div>
        </div>
        {/* Switch daily reports  */}
        <div className="flex items-center gap-16px">
          <div
            className={`text-xs ${checked ? 'text-stroke-neutral-invert' : 'text-switch-text-inactive'}`}
          >
            Show daily reports
          </div>
          <ToggleButton checked={checked} onChange={() => setChecked(!checked)} />
        </div>
      </section>
      {/* Divider */}
      <div className="flex items-center gap-16px pt-6">
        <div className="flex items-center gap-8px">
          <div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path
                d="M14 8.00004L6 8.00004M14 4.00004L6 4.00004M14 12L6 12M3.33333 8.00004C3.33333 8.36823 3.03486 8.66671 2.66667 8.66671C2.29848 8.66671 2 8.36823 2 8.00004C2 7.63185 2.29848 7.33337 2.66667 7.33337C3.03486 7.33337 3.33333 7.63185 3.33333 8.00004ZM3.33333 4.00004C3.33333 4.36823 3.03486 4.66671 2.66667 4.66671C2.29848 4.66671 2 4.36823 2 4.00004C2 3.63185 2.29848 3.33337 2.66667 3.33337C3.03486 3.33337 3.33333 3.63185 3.33333 4.00004ZM3.33333 12C3.33333 12.3682 3.03486 12.6667 2.66667 12.6667C2.29848 12.6667 2 12.3682 2 12C2 11.6319 2.29848 11.3334 2.66667 11.3334C3.03486 11.3334 3.33333 11.6319 3.33333 12Z"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>Card List</div>
        </div>
        {/* line */}
        <div className="grow bg-stroke-neutral-solid-light">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="184"
            height="1"
            viewBox="0 0 184 1"
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
      {/* Audit Report List */}
      <section className="flex flex-col gap-8px pt-15px">{displayCards}</section>
      {/* Pagination */}
      <section className="flex flex-col items-center pb-20px pt-40px">
        <div className="flex gap-10px">
          <div className="flex items-center justify-center rounded-xs border border-lightWhite p-3">
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
                d="M14.7369 4.08614L5.05348 9.88153C5.0352 9.89246 5.00244 9.92673 5.00244 10.0011C5.00244 10.0755 5.03509 10.1097 5.05336 10.1206L14.7369 15.9161C14.7706 15.9362 14.7952 15.9393 14.8126 15.9386C14.8324 15.9379 14.858 15.9313 14.8861 15.913C14.9415 15.877 15.0024 15.7966 15.0024 15.6652V4.33704C15.0024 4.20564 14.9415 4.12521 14.8861 4.08918C14.858 4.07088 14.8324 4.06431 14.8126 4.06356C14.7952 4.0629 14.7706 4.06605 14.7369 4.08614ZM15.568 3.04153C15.9814 3.31058 16.2524 3.78718 16.2524 4.33704V15.6652C16.2524 16.215 15.9814 16.6916 15.568 16.9607C15.1493 17.2332 14.5899 17.2841 14.0961 16.9893L4.41168 11.1933C3.9566 10.921 3.75244 10.441 3.75244 10.0011C3.75244 9.56125 3.95648 9.08123 4.41156 8.80895L14.0958 3.01309C14.5896 2.71821 15.1493 2.76904 15.568 3.04153Z"
                className="fill-current"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M4.37744 2.5011C4.72262 2.5011 5.00244 2.78092 5.00244 3.1261V16.8761C5.00244 17.2213 4.72262 17.5011 4.37744 17.5011C4.03226 17.5011 3.75244 17.2213 3.75244 16.8761V3.1261C3.75244 2.78092 4.03226 2.5011 4.37744 2.5011Z"
                className="fill-current"
              />
            </svg>
          </div>
          <div className="flex items-center justify-center rounded-xs border border-lightWhite p-3">
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
          <div className="flex items-center justify-center rounded-xs border border-lightWhite p-3">
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
          <div className="flex items-center justify-center rounded-xs border border-lightWhite p-3">
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
        <div>of 100</div>
      </section>
    </div>
  );

  return (
    <>
      <Head>
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>iSunFA - Audit Report</title>
      </Head>
      {/* Navbar */}
      <nav className="">
        <LandingNavBar />
      </nav>

      <main className="w-screen overflow-hidden text-navy-blue-25">
        <div className="min-h-screen bg-navy-blue-600 font-barlow">
          {desktopVer}
          {mobileVer}
        </div>
      </main>
    </>
  );
};

const getStaticPropsFunction = async ({ locale }: ILocale) => ({
  props: {
    ...(await serverSideTranslations(locale, ['common'])),
  },
});

export const getStaticProps = getStaticPropsFunction;

export default auditReport;
