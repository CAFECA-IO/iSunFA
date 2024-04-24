/* eslint-disable */
import React, { useState } from 'react';
import { Button } from '../button/button';
import DatePicker, { DatePickerType } from '../date_picker/date_picker';
import { default30DayPeriodInSec } from '../../constants/display';
import useOuterClick from '../../lib/hooks/use_outer_click';
import Image from 'next/image';

const reportTypes = [
  { id: 'balance_sheet', name: 'Balance Sheet' },
  { id: 'income_statement', name: 'Income Statement' },
  { id: 'cash_flow', name: 'Cash Flow Statement' },
];

const reportLanguages = [
  { id: 'en', name: 'English', icon: '/icons/en.svg' },
  { id: 'tw', name: '繁體中文', icon: '/icons/tw.svg' },
  { id: 'cn', name: '简体中文', icon: '/icons/cn.svg' },
];

const FinancialReportSection = () => {
  const [period, setPeriod] = useState(default30DayPeriodInSec);

  const [selectedReportType, setSelectedReportType] = useState(reportTypes[0].id);
  const [selectedReportLanguage, setSelectedReportLanguage] = useState(reportLanguages[0].id);

  const {
    targetRef: menuRef,
    componentVisible: isMenuOpen,
    setComponentVisible: setIsMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const menuClickHandler = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const menuOptionClickHandler = (id: string) => {
    setSelectedReportType(id);
    setIsMenuOpen(false);
  };

  const selectedReportName = reportTypes.find((type) => type.id === selectedReportType)?.name;

  const {
    targetRef: languageMenuRef,
    componentVisible: isLanguageMenuOpen,
    setComponentVisible: setIsLanguageMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const languageMenuClickHandler = () => {
    setIsLanguageMenuOpen(!isLanguageMenuOpen);
  };

  const languageMenuOptionClickHandler = (id: string) => {
    setSelectedReportLanguage(id);
    setIsLanguageMenuOpen(false);
  };

  const selectedLanguage = reportLanguages.find((lang) => lang.id === selectedReportLanguage);

  const languageMenu = isLanguageMenuOpen ? (
    <div className="absolute top-[35rem] z-20 max-h-[200px] w-[560px] flex-col overflow-y-auto rounded-sm border border-solid border-slate-300 bg-white pb-2 shadow-dropmenu lg:max-h-[250px]">
      <div className="flex w-full flex-col pl-2 pt-2">
        <div className="z-10 flex items-start gap-0">
          <div className="flex w-full flex-col">
            {reportLanguages.map((lang) => (
              <button
                key={lang.id}
                onClick={() => languageMenuOptionClickHandler(lang.id)}
                type="button"
                className={`
                mt-1 flex space-x-3 rounded-sm px-3 py-3 text-navyBlue2 hover:bg-lightGray/10`}
              >
                <img src={lang.icon} alt={lang.name} className="mr-2 h-6 w-6" />
                <p className="justify-center text-base font-medium leading-5 tracking-normal">
                  {lang.name}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  ) : null;

  const menu = isMenuOpen ? (
    <div className="absolute top-[25rem] z-20 max-h-[200px] w-[560px] flex-col overflow-y-auto rounded-sm border border-solid border-slate-300 bg-white pb-2 shadow-dropmenu lg:max-h-[250px]">
      <div className="flex w-full flex-col pl-2 pt-2">
        <div className="z-10 flex items-start gap-0">
          <div className="flex w-full flex-col">
            {reportTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => menuOptionClickHandler(type.id)}
                type="button"
                className={`
                mt-1 flex rounded-sm px-3 py-3 text-navyBlue2 hover:bg-lightGray/10`}
              >
                <p className="justify-center text-base font-medium leading-5 tracking-normal">
                  {type.name}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="mt-20 flex w-full shrink-0 grow basis-0 flex-col bg-surface-neutral-main-background px-0 pb-0">
      <div className="flex gap-0 max-md:flex-wrap">
        <div className="flex w-fit shrink-0 grow basis-0 flex-col pb-5 pt-16 max-md:max-w-full">
          <div className="flex flex-col justify-center text-4xl font-semibold leading-10 text-slate-500 max-md:max-w-full max-md:pr-5">
            <div className="w-full justify-center px-10 md:px-28">Financial Report</div>
          </div>
          <div className="mt-4 flex flex-col justify-center px-0 py-2.5 max-md:max-w-full md:px-28">
            <div className="flex flex-col justify-center max-md:max-w-full">
              <div className="h-px shrink-0 border border-solid border-gray-300 bg-gray-300 max-md:max-w-full" />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-16 flex w-600px max-w-full flex-col self-center px-5 max-md:mt-10">
        <div className="flex flex-col justify-center max-md:max-w-full">
          <div className="flex flex-col gap-3 max-md:max-w-full">
            <div className="justify-center text-sm font-semibold leading-5 tracking-normal text-slate-700 max-md:max-w-full">
              Report Type
            </div>
            <div className="flex w-full" ref={menuRef}>
              <button
                className={`${
                  isMenuOpen ? 'border-primaryYellow' : 'border-slate-300'
                } flex w-full gap-0 rounded-sm border border-solid bg-white max-md:flex-wrap`}
                onClick={menuClickHandler}
              >
                <div className="flex flex-1 flex-col justify-center text-base font-medium leading-6 tracking-normal text-slate-700 max-md:max-w-full">
                  <div className="items-start px-3 py-2.5 text-start max-md:max-w-full max-md:pr-5">
                    {selectedReportName}
                  </div>
                </div>
                <div className="my-auto flex flex-col justify-center px-3 py-2.5">
                  <div className="flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      fill="none"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fill="#314362"
                        fillRule="evenodd"
                        d="M4.472 6.97a.75.75 0 011.06 0l4.47 4.47 4.47-4.47a.75.75 0 011.06 1.061l-5 5a.75.75 0 01-1.06 0l-5-5a.75.75 0 010-1.06z"
                        clipRule="evenodd"
                      ></path>
                    </svg>
                  </div>
                </div>
              </button>
              {menu}
            </div>
          </div>
        </div>
        <div className="mt-20 flex flex-col justify-center max-md:mt-10 max-md:max-w-full">
          <div className="flex flex-col space-y-3 max-md:max-w-full">
            <div className="justify-center text-sm font-semibold leading-5 tracking-normal text-slate-700 max-md:max-w-full">
              Report Language
            </div>
            <div ref={languageMenuRef} className="flex w-full">
              <button
                className={`${
                  isLanguageMenuOpen ? 'border-primaryYellow' : 'border-slate-300'
                } flex w-full gap-0 rounded-sm border border-solid bg-white max-md:flex-wrap`}
                onClick={languageMenuClickHandler}
              >
                <div className="my-auto flex flex-col justify-center self-stretch px-3 py-2.5">
                  <Image
                    width={20}
                    height={20}
                    src={selectedLanguage?.icon ?? '/icons/en.svg'}
                    alt="language icon"
                  />
                </div>
                <div className="flex flex-1 flex-col justify-start self-stretch whitespace-nowrap text-start text-base font-medium leading-6 tracking-normal text-slate-700 max-md:max-w-full">
                  <div className="items-start justify-start px-3 py-2.5 text-start max-md:max-w-full max-md:pr-5">
                    {selectedLanguage?.name}
                  </div>
                </div>
                <div className="my-auto flex flex-col justify-end self-stretch px-3 py-2.5">
                  <div className="flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      fill="none"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fill="#314362"
                        fillRule="evenodd"
                        d="M4.472 6.97a.75.75 0 011.06 0l4.47 4.47 4.47-4.47a.75.75 0 011.06 1.061l-5 5a.75.75 0 01-1.06 0l-5-5a.75.75 0 010-1.06z"
                        clipRule="evenodd"
                      ></path>
                    </svg>
                  </div>
                </div>
              </button>
              {languageMenu}
            </div>
          </div>
        </div>
        <div className="mt-20 flex flex-col max-md:mt-10 max-md:max-w-full">
          <div className="flex gap-4 max-md:max-w-full max-md:flex-wrap">
            <div className="flex gap-2">
              <div className="my-auto flex flex-col justify-center">
                <div className="flex items-center justify-center">
                  {' '}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="none"
                    viewBox="0 0 16 16"
                  >
                    <g fillRule="evenodd" clipPath="url(#clip0_904_69620)" clipRule="evenodd">
                      <path
                        fill="#FFA502"
                        d="M12.286 0c.473 0 .857.384.857.857v2h2a.857.857 0 110 1.714h-2v2a.857.857 0 11-1.714 0v-2h-2a.857.857 0 010-1.714h2v-2c0-.473.383-.857.857-.857z"
                      ></path>
                      <path
                        fill="#002462"
                        d="M8.099 1.855a5.542 5.542 0 00-1.242-.141c-1.373 0-2.698.509-3.68 1.426-.985.918-1.545 2.172-1.545 3.488v4.314c0 .268-.114.532-.33.734-.25.233-.447.324-.73.324a.571.571 0 000 1.142h12.57a.571.571 0 100-1.142c-.282 0-.48-.09-.73-.324a1.004 1.004 0 01-.33-.734V8.848A2.286 2.286 0 0110 6.57V6h-.571a2.286 2.286 0 01-1.33-4.145zm-2.385 12.43a.857.857 0 000 1.715H8a.857.857 0 000-1.715H5.714z"
                      ></path>
                    </g>
                    <defs>
                      <clipPath id="clip0_904_69620">
                        <path fill="#fff" d="M0 0H16V16H0z"></path>
                      </clipPath>
                    </defs>
                  </svg>
                </div>
              </div>
              <div className="text-sm font-medium leading-5 tracking-normal text-slate-800">
                Period
              </div>
            </div>
            <div className="my-auto flex flex-1 flex-col justify-center max-md:max-w-full">
              <div className="h-px shrink-0 border border-solid border-slate-800 bg-slate-800 max-md:max-w-full" />
            </div>
          </div>
          <div className="mt-6 flex flex-col justify-center">
            <DatePicker
              type={DatePickerType.CHOOSE_DATE}
              period={period}
              setFilteredPeriod={setPeriod}
              className="w-340px justify-start md:w-550px"
            />
          </div>
        </div>
        <Button className="mt-20 flex items-center justify-center rounded-sm px-4 py-2 max-md:mt-10 max-md:max-w-full max-md:px-5">
          <div className="flex gap-1">
            <div className="text-sm font-medium leading-5 tracking-normal text-yellow-700">
              Generate
            </div>
            <div className="my-auto flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="17"
                height="16"
                fill="none"
                viewBox="0 0 17 16"
              >
                <g>
                  <path
                    fill="#996301"
                    fillRule="evenodd"
                    d="M9.128 3.294a1 1 0 011.415 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.415-1.414l2.293-2.293H3.17a1 1 0 110-2h8.252L9.128 4.708a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  ></path>
                </g>
              </svg>
            </div>
          </div>
        </Button>
      </div>
    </div>
  );
};

export default FinancialReportSection;
