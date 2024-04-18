import Head from 'next/head';
import Image from 'next/image';
import React from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '../interfaces/locale';
import LandingNavBar from '../components/landing_nav_bar/landing_nav_bar';

// Info: (20240418 - Liz) Define JSON data for table rows
interface ITableData {
  code: string;
  regional: string;
  company: string;
  informationYear: string;
  detailedInformation: string;
  creditRating: string;
  dateOfUpload: string;
}

const tableData: ITableData[] = [
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
  const displayTableRows = tableData.map((row: ITableData, index) => (
    <tr key={row.code} className={index % 2 === 0 ? 'bg-white' : 'bg-lightGray6'}>
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
                        <div>
                          <Image src="/elements/sort.svg" width={20} height={20} alt="sort" />
                        </div>
                      </th>
                      <th className="px-2 py-12px">Detailed Information</th>
                      <th className="flex items-center justify-center gap-1 px-2 py-12px">
                        <div>Credit rating</div>
                        <div>
                          <Image src="/elements/sort.svg" width={20} height={20} alt="sort" />
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
