import Head from 'next/head';
import Image from 'next/image';
import React from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '../interfaces/locale';
import LandingNavBar from '../components/landing_nav_bar/landing_nav_bar';

const AuditReportTwo = () => {
  return (
    <>
      <Head>
        <title>Test</title>
      </Head>

      <nav className="">
        <LandingNavBar />
      </nav>

      <main className="w-screen overflow-hidden text-white">
        <div className="min-h-screen w-screen bg-secondaryBlue font-barlow lg:h-1000px">
          <div className="flex flex-col items-center pb-48 pl-20 pr-20 pt-48">
            {/* Title */}
            <section>Title</section>
            {/* Conditional Filtering */}
            <section>
              {/* Search */}
              <div className="w-3/4">
                <p>Company Code or Abbreviation </p>
                <div className="flex w-48 cursor-pointer rounded-md border border-gray-300 bg-white px-4 text-base text-black outline-none">
                  <div>
                    <input type="text" placeholder="Search" />
                  </div>
                  <div>
                    <Image src="/elements/search_icon.svg" width={20} height={20} alt="search" />
                  </div>
                </div>
              </div>
              {/* Date Picker */}
              <div className="w-1/4">
                <div className="flex h-10 w-48 cursor-pointer rounded-md border border-gray-300 bg-white px-4 text-base text-black outline-none">
                  <div>
                    <input type="text" placeholder="Start Date - End Date" />
                  </div>
                  <div>
                    <Image src="/elements/calendar.svg" width={20} height={20} alt="calendar" />
                  </div>
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

export default AuditReportTwo;
