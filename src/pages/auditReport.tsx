import Head from 'next/head';
import Image from 'next/image';
import React from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '../interfaces/locale';
import LandingNavBar from '../components/landing_nav_bar/landing_nav_bar';

const AuditReport = () => {
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
            {/* Types */}
            <div className="inline-flex h-44 w-96 flex-col items-center justify-start gap-14">
              {/* Title */}
              <div className=" inline-flex w-96 items-center justify-center">
                <div className=" w-96 text-center text-5xl font-bold leading-10 text-white">
                  Audit Report
                </div>
              </div>
              {/* FiltersSection */}
              <div className="inline-flex items-end justify-start gap-6 self-stretch">
                <div className="inline-flex h-16 w-96 flex-col items-start justify-start gap-2">
                  <div className="inline-flex items-start justify-start self-stretch">
                    <div className="shrink grow basis-0  text-sm font-semibold leading-tight tracking-tight text-gray-50">
                      Company Code or Abbreviation{' '}
                    </div>
                  </div>
                  <div className="inline-flex items-center justify-start self-stretch rounded-lg border border-slate-300 bg-white shadow">
                    <div className="flex h-11 shrink grow basis-0 items-center justify-start">
                      <div className="flex h-11 items-start justify-start gap-2.5 px-3 py-2.5">
                        <div className="text-base font-medium leading-normal tracking-tight text-slate-500">
                          Search
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-start gap-2 px-3 py-2.5">
                      <div className="inline-flex flex-col items-center justify-center">
                        <div className="relative h-5 w-5">
                          <div className="absolute h-4 w-4">
                            <Image
                              alt="Union"
                              src="/elements/search_icon.svg"
                              width={20}
                              height={20}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* DatePicker */}
                <div className="relative h-11 w-96">
                  <div className="absolute left-0 top-0 inline-flex h-11 w-96 flex-col items-start justify-start gap-2">
                    <div className="inline-flex items-center justify-start self-stretch rounded-lg border border-slate-300 bg-white shadow">
                      <div className="flex h-11 items-center justify-start">
                        <div className="flex h-11 shrink grow basis-0 items-start justify-start gap-2.5 px-3 py-2.5">
                          <div className="text-base font-medium leading-normal tracking-tight text-slate-500">
                            Start Date - End Date
                          </div>
                        </div>
                      </div>
                      <div className=" flex h-10 shrink grow basis-0 items-center justify-end gap-2 px-3 py-2.5">
                        <div className=" inline-flex flex-col items-center justify-center">
                          <div className=" relative h-5 w-5">
                            <div className="absolute left-2 top-1 h-5 w-4"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Table */}
            <div>
              <div>Audit report list</div>
              <div>Pagination</div>
            </div>
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

export default AuditReport;
