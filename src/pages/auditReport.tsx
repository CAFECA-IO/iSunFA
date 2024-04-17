import Head from 'next/head';
import Image from 'next/image';
import React from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '../interfaces/locale';
import LandingNavBar from '../components/landing_nav_bar/landing_nav_bar';

// Define JSON data for table rows
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
  const displayTableRows = tableData.map((row: ITableData) => (
    <tr key={row.code}>
      <td>{row.code}</td>
      <td>{row.regional}</td>
      <td>{row.company}</td>
      <td>{row.informationYear}</td>
      <td>{row.detailedInformation}</td>
      <td>{row.creditRating}</td>
      <td>{row.dateOfUpload}</td>
      <td>
        <div>
          <Image src="/elements/link.svg" width={20} height={20} alt="link" />
        </div>
      </td>
    </tr>
  ));

  return (
    <>
      <Head>
        <title>Test</title>
      </Head>

      <nav className="">
        <LandingNavBar />
      </nav>

      <main className="w-screen overflow-hidden text-white">
        <div className="min-h-screen bg-secondaryBlue font-barlow">
          <div className="px-80px py-120px">
            {/* Title */}
            <section className="gap-14 text-h1 font-bold leading-h1">Audit Report</section>
            {/* Conditional Filters */}
            <section id="conditional-filters" className="flex items-end gap-10">
              {/* Search */}
              <div className="">
                <div className="text-sm font-semibold">Company Code or Abbreviation </div>
                <div className="flex items-center justify-between bg-white">
                  <div className="w-full">
                    <input
                      type="text"
                      placeholder="Search"
                      className="bg-white px-3 py-2.5 text-base font-medium text-lightGray4 focus:outline-none"
                    />
                  </div>
                  <div className="px-3 py-2.5">
                    <Image src="/elements/search_icon.svg" width={20} height={20} alt="search" />
                  </div>
                </div>
              </div>
              {/* Date Picker */}
              <div className="flex items-center justify-between bg-white">
                <div className="w-full">
                  <input
                    type="text"
                    placeholder="Start Date - End Date"
                    className="bg-white px-3 py-2.5 text-base font-medium text-lightGray4 focus:outline-none"
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
              <div>
                <div className="text-lg font-semibold">Show Designated Regional Companies</div>
                <form className="text-sm font-semibold text-primaryYellow">
                  <label htmlFor="us" className="pr-20px">
                    <input type="checkbox" id="us" name="country" value="US" /> US
                  </label>
                  <label htmlFor="hk" className="pr-20px">
                    <input type="checkbox" id="hk" name="country" value="HK" /> HK
                  </label>
                  <label htmlFor="tw" className="pr-20px">
                    <input type="checkbox" id="tw" name="country" value="TW" /> TW
                  </label>
                </form>
              </div>
              {/* Table */}
              <div className="">
                <table>
                  <thead className="bg-primaryYellow text-black">
                    <tr>
                      <th className="px-8px py-12px">Code</th>
                      <th className="px-8px py-12px">Regional</th>
                      <th className="px-8px py-12px">Company</th>
                      <th className="flex items-center px-8px py-12px">
                        Information Year
                        <div>
                          <Image src="/elements/sort.svg" width={20} height={20} alt="sort" />
                        </div>
                      </th>
                      <th className="px-8px py-12px">Detailed Information</th>
                      <th className="flex items-center px-8px py-12px">
                        Credit rating
                        <div>
                          <Image src="/elements/sort.svg" width={20} height={20} alt="sort" />
                        </div>
                      </th>
                      <th className="px-8px py-12px">Date of Upload</th>
                      <th className="px-8px py-12px">LINK</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white text-lg font-medium text-black">
                    {/* Dynamically generate table rows */}
                    {displayTableRows}
                  </tbody>
                  {/* <tbody className="bg-white text-lg font-medium text-black">
                    <tr>
                      <td>2330</td>
                      <td>TW</td>
                      <td>TSMC</td>
                      <td>2024 Q1</td>
                      <td>IFRSs Consolidated Financial Report</td>
                      <td>AAA</td>
                      <td>2024/04/08</td>
                      <td>
                        <div>
                          <Image src="/elements/link.svg" width={20} height={20} alt="link" />
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td>2234</td>
                      <td>TW</td>
                      <td>iSunFA</td>
                      <td>2024 Q2</td>
                      <td>IFRSs Consolidated Financial Report</td>
                      <td>AA</td>
                      <td>2024/04/08</td>
                      <td>
                        <div>
                          <Image src="/elements/link.svg" width={20} height={20} alt="link" />
                        </div>
                      </td>
                    </tr>
                  </tbody> */}
                </table>
              </div>
              {/* Checkbox */}
              <div>
                <form>
                  <label htmlFor="all">
                    {`Don't show daily reports `}
                    <input type="checkbox" id="all" name="all" value="all" />
                  </label>
                </form>
              </div>
              {/* Pagination */}
              <div className="flex gap-1">
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
                <div className="flex items-center justify-center rounded border border-lightWhite p-3">
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
