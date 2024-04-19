import Head from 'next/head';
import Image from 'next/image';
import React, { useState } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '../interfaces/locale';
import LandingNavBar from '../components/landing_nav_bar/landing_nav_bar';

// Info: (今天 - Liz) Define table data interface
interface ITableData {
  [key: string]: string;
  code: string;
  regional: string;
  company: string;
  informationYear: string;
  detailedInformation: string;
  creditRating: string;
  dateOfUpload: string;
}

// Info: (今天 - Liz) Dummy Data
const initialData: ITableData[] = [
  {
    code: '2330',
    regional: 'TW',
    company: 'TSMC',
    informationYear: '2024 Q1',
    detailedInformation: 'IFRSs Consolidated Financial Report',
    creditRating: 'AAA',
    dateOfUpload: '2024/04/08',
  },
  {
    code: '2234',
    regional: 'TW',
    company: 'iSunFA',
    informationYear: '2024 Q2',
    detailedInformation: 'IFRSs Consolidated Financial Report',
    creditRating: 'AA',
    dateOfUpload: '2024/04/08',
  },
  {
    code: '8991',
    regional: 'HK',
    company: 'BAIFA',
    informationYear: '2024 Q3',
    detailedInformation: 'IFRSs Consolidated Financial Report',
    creditRating: 'A',
    dateOfUpload: '2024/04/08',
  },
  {
    code: '8778',
    regional: 'HK',
    company: 'ASICEX',
    informationYear: '2024 Q4',
    detailedInformation: 'IFRSs Consolidated Financial Report',
    creditRating: 'BBB',
    dateOfUpload: '2024/04/08',
  },
  {
    code: '2233',
    regional: 'TW',
    company: 'CAFACA',
    informationYear: 'Daily',
    detailedInformation: 'IFRSs Consolidated Financial Report',
    creditRating: 'BB',
    dateOfUpload: '2024/04/08',
  },
  {
    code: '8866',
    regional: 'HK',
    company: 'iSunOne',
    informationYear: '2024 Q1',
    detailedInformation: 'IFRSs Consolidated Financial Report',
    creditRating: 'B',
    dateOfUpload: '2024/04/08',
  },
  {
    code: '0078',
    regional: 'US',
    company: 'Rover',
    informationYear: '2024 Q2',
    detailedInformation: 'IFRSs Consolidated Financial Report',
    creditRating: 'AA',
    dateOfUpload: '2024/04/08',
  },
  {
    code: '0012',
    regional: 'US',
    company: 'Apple',
    informationYear: 'Daily',
    detailedInformation: 'IFRSs Consolidated Financial Report',
    creditRating: 'AAA',
    dateOfUpload: '2024/04/08',
  },
  {
    code: '-',
    regional: 'TW',
    company: 'IFR',
    informationYear: 'Daily',
    detailedInformation: 'IFRSs Consolidated Financial Report',
    creditRating: 'B',
    dateOfUpload: '2024/04/08',
  },
  {
    code: '-',
    regional: 'TW',
    company: 'BACEX',
    informationYear: 'Daily',
    detailedInformation: 'IFRSs Consolidated Financial Report',
    creditRating: 'CCC',
    dateOfUpload: '2024/04/08',
  },
];

const auditReport = () => {
  const [data, setData] = React.useState<ITableData[]>(initialData);
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const displayTableRows = data.map((row: ITableData, index) => (
    <tr
      key={`${row.code}-${row.company}`}
      className={index % 2 === 0 ? 'bg-white' : 'bg-lightGray6'}
    >
      <td className="px-2 py-10px">{row.code}</td>
      <td className="px-2 py-10px">{row.regional}</td>
      <td className="px-2 py-10px">{row.company}</td>
      <td className="px-2 py-10px">{row.informationYear}</td>
      <td className="px-2 py-10px">{row.detailedInformation}</td>
      <td className="px-2 py-10px">{row.creditRating}</td>
      <td className="px-2 py-10px">{row.dateOfUpload}</td>
      <td className="px-2 py-10px">
        <div className="flex items-center justify-center">
          <Image src="/elements/link.svg" width={20} height={20} alt="link" />
        </div>
      </td>
    </tr>
  ));

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

      <main className="w-screen overflow-hidden text-white">
        <div className="min-h-screen bg-secondaryBlue font-barlow">
          <div className="px-80px py-120px">
            {/* Title */}
            <section className="mb-14 text-center text-h1 font-bold leading-h1">
              Audit Report
            </section>
            {/* Conditional Filters */}
            <section id="conditional-filters" className="mb-10 flex items-end gap-6 px-4px">
              {/* Search */}
              <div className="flex grow flex-col gap-2">
                <div className="text-sm font-semibold">Company Code or Abbreviation </div>
                <div className="flex items-center justify-between rounded-lg bg-white">
                  <div className="w-full">
                    <input
                      type="text"
                      placeholder="Search"
                      className="rounded-lg bg-white px-3 py-2.5 text-base font-medium text-lightGray4 focus:outline-none"
                    />
                  </div>
                  <div className="px-3 py-2.5">
                    <Image src="/elements/search_icon.svg" width={20} height={20} alt="search" />
                  </div>
                </div>
              </div>
              {/* Date Picker */}
              <div className="flex items-center justify-between rounded-lg bg-white">
                <div className="w-full">
                  <input
                    type="text"
                    placeholder="Start Date - End Date"
                    className="rounded-lg bg-white px-3 py-2.5 text-base font-medium text-lightGray4 focus:outline-none"
                  />
                </div>
                <div className="px-3 py-2.5">
                  <Image src="/elements/calendar.svg" width={20} height={20} alt="calendar" />
                </div>
              </div>
            </section>
            {/* Audit Report List */}
            <section id="audit-report-list" className="flex flex-col gap-5">
              {/* Filter Display List */}
              <div className="flex items-center gap-5 px-4px">
                <div className="text-lg font-semibold">Show Designated Regional Companies</div>
                <form className="flex gap-5 text-sm font-semibold text-primaryYellow">
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
                  <thead className="bg-primaryYellow text-h6 font-bold leading-8 text-black">
                    <tr className="">
                      <th className="px-2 py-12px">Code</th>
                      <th className="px-2 py-12px">Regional</th>
                      <th className="px-2 py-12px">Company</th>
                      <th className="flex items-center justify-center gap-1 px-2 py-12px">
                        <div>Information Year</div>
                        <div onClick={() => handleSort('informationYear')}>
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
                      <th className="px-2 py-12px">Detailed Information</th>
                      <th className="flex items-center justify-center gap-1 px-2 py-12px">
                        <div>Credit rating</div>
                        <div onClick={() => handleSort('creditRating')}>
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
                      <th className="px-2 py-12px">Date of Upload</th>
                      <th className="px-2 py-12px">LINK</th>
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
                  <label htmlFor="no-daily-reports" className="flex gap-2 text-primaryYellow">
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
                  <div className="flex items-center justify-center rounded border border-lightWhite p-3">
                    <Image
                      src="/elements/first_page_icon.svg"
                      width={20}
                      height={20}
                      alt="first_page_icon"
                    />
                  </div>
                  <div className="flex items-center justify-center rounded border border-lightWhite p-3">
                    <Image
                      src="/elements/previous_page_icon.svg"
                      width={20}
                      height={20}
                      alt="previous_page_icon"
                    />
                  </div>
                  <div className="flex w-11 items-center justify-center rounded border border-primaryYellow p-3 text-primaryYellow">
                    1
                  </div>
                  <div className="flex items-center justify-center rounded border border-lightWhite p-3">
                    <Image
                      src="/elements/next_page_icon.svg"
                      width={20}
                      height={20}
                      alt="next_page_icon"
                    />
                  </div>
                  <div className="flex items-center justify-center rounded border border-lightWhite p-3">
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
