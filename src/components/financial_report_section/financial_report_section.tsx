/* eslint-disable */
import React, { useEffect, useState } from 'react';
import { Button } from '../button/button';
import DatePicker, { DatePickerType } from '../date_picker/date_picker';
import { default30DayPeriodInSec } from '../../constants/display';
import useOuterClick from '../../lib/hooks/use_outer_click';
import Image from 'next/image';

const reportTypes = {
  balance_sheet: { id: 'balance_sheet', name: 'Balance Sheet' },
  income_statement: { id: 'income_statement', name: 'Income Statement' },
  cash_flow: { id: 'cash_flow', name: 'Cash Flow Statement' },
};

const reportLanguages = {
  en: { id: 'en', name: 'English', icon: '/icons/en.svg' },
  tw: { id: 'tw', name: '繁體中文', icon: '/icons/tw.svg' },
  cn: { id: 'cn', name: '简体中文', icon: '/icons/cn.svg' },
};

enum ReportTypes {
  balance_sheet = 'balance_sheet',
  income_statement = 'income_statement',
  cash_flow = 'cash_flow',
}

enum ReportLanguages {
  en = 'en',
  tw = 'tw',
  cn = 'cn',
}

const FinancialReportSection = () => {
  const [period, setPeriod] = useState(default30DayPeriodInSec);

  const [selectedReportType, setSelectedReportType] = useState<ReportTypes>(
    ReportTypes.balance_sheet
  );
  const [selectedReportLanguage, setSelectedReportLanguage] = useState<ReportLanguages>(
    ReportLanguages.en
  );
  const [datePickerType, setDatePickerType] = useState(DatePickerType.CHOOSE_DATE);

  const {
    targetRef: menuRef,
    componentVisible: isMenuOpen,
    setComponentVisible: setIsMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const {
    targetRef: languageMenuRef,
    componentVisible: isLanguageMenuOpen,
    setComponentVisible: setIsLanguageMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const menuClickHandler = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const menuOptionClickHandler = (id: ReportTypes) => {
    setSelectedReportType(id);
    setIsMenuOpen(false);
  };

  const selectedReportName = reportTypes[selectedReportType].name;
  const selectedLanguage = reportLanguages[selectedReportLanguage];

  const languageMenuClickHandler = () => {
    setIsLanguageMenuOpen(!isLanguageMenuOpen);
  };

  const languageMenuOptionClickHandler = (id: ReportLanguages) => {
    setSelectedReportLanguage(id);
    setIsLanguageMenuOpen(false);
  };

  useEffect(() => {
    setDatePickerType((prev) => {
      if (selectedReportType === ReportTypes.balance_sheet) {
        return DatePickerType.CHOOSE_DATE;
      } else {
        return DatePickerType.CHOOSE_PERIOD;
      }
    });
  }, [selectedReportType]);

  const displayedReportTypeMenu = (
    <div ref={menuRef} className="relative flex w-full">
      <button
        className={`flex w-full items-center justify-between gap-0 rounded-sm border bg-white px-3 py-2.5 ${
          isMenuOpen ? 'border-input-stroke-selected' : 'border-dropdown-stroke-menu'
        }`}
        onClick={menuClickHandler}
      >
        <div className="text-base font-medium leading-6 tracking-normal text-input-text-input-filled">
          {selectedReportName}
        </div>
        <div className="my-auto flex flex-col justify-center px-0 py-0">
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
      {/* Info: Report Type Menu (20240425 - Shirley) */}
      <div
        className={`absolute left-0 top-[3.5rem] z-20 grid w-full grid-cols-1 overflow-hidden rounded-sm border transition-all duration-300 ease-in-out ${
          isMenuOpen
            ? 'grid-rows-1 border-dropdown-stroke-menu shadow-dropmenu'
            : 'grid-rows-0 border-transparent'
        }`}
      >
        <ul className="z-10 flex w-full flex-col items-start bg-white p-2">
          {Object.entries(reportTypes).map(([id, { name }]) => (
            <li
              key={id}
              onClick={() => menuOptionClickHandler(id as ReportTypes)}
              className="mt-1 w-full cursor-pointer px-3 py-2 text-dropdown-text-primary hover:text-text-brand-primary-lv2"
            >
              {name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  const displayedLanguageMenu = (
    <div ref={languageMenuRef} className="relative flex w-full">
      <button
        className={`flex w-full items-center justify-between gap-0 space-x-5 rounded-sm border bg-white px-3 py-2.5 max-md:max-w-full ${
          isLanguageMenuOpen ? 'border-input-stroke-selected' : 'border-dropdown-stroke-menu'
        }`}
        onClick={languageMenuClickHandler}
      >
        <Image
          width={20}
          height={20}
          src={selectedLanguage?.icon ?? '/icons/en.svg'}
          alt="language icon"
        />
        <div className="flex-1 whitespace-nowrap text-start text-base font-medium leading-6 tracking-normal text-slate-700">
          {selectedLanguage?.name}
        </div>
        <div className="my-auto flex flex-col justify-center px-0 py-0">
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
      {/* Info: Language Menu (20240425 - Shirley) */}
      <div
        className={`absolute left-0 top-[3.5rem] z-20 grid w-full grid-cols-1 overflow-hidden rounded-sm border transition-all duration-300 ease-in-out ${
          isLanguageMenuOpen
            ? 'grid-rows-1 border-dropdown-stroke-menu shadow-dropmenu'
            : 'grid-rows-0 border-transparent'
        }`}
      >
        <ul className="z-10 flex w-full flex-col items-start bg-white p-2">
          {Object.entries(reportLanguages).map(([id, { name, icon }]) => (
            <li
              key={id}
              onClick={() => languageMenuOptionClickHandler(id as ReportLanguages)}
              className="mt-1 flex w-full cursor-pointer items-center space-x-5 px-1 py-2.5 text-navyBlue2 hover:text-text-brand-primary-lv2"
            >
              <img src={icon} alt={name} className="h-6 w-6" />
              <p className="text-base font-medium leading-5 tracking-normal">{name}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  return (
    <div className="mt-20 flex w-full shrink-0 grow basis-0 flex-col bg-surface-neutral-main-background px-0 pb-0">
      <div className="flex gap-0 max-md:flex-wrap">
        <div className="flex w-fit shrink-0 grow basis-0 flex-col pb-5 pt-16 max-md:max-w-full">
          <div className="hidden flex-col justify-center text-4xl font-semibold leading-10 text-slate-500 max-md:max-w-full max-md:pr-5 md:flex">
            <div className="w-full justify-center px-10 md:px-28">Financial Report</div>
          </div>
          <div className="flex w-600px max-w-full flex-1 md:hidden">
            <div className="mx-4 flex space-x-2">
              <div>
                <Image
                  src={'/icons/report.svg'}
                  width={30}
                  height={30}
                  alt="report_icon"
                  className="aspect-square shrink-0"
                />
              </div>

              <div className="mt-1.5">Financial Report</div>
            </div>
          </div>

          <div className="mt-4 flex flex-1 flex-col justify-center px-6 py-2.5 max-md:max-w-full md:px-28">
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
            {displayedReportTypeMenu}
          </div>
        </div>
        <div className="mt-20 flex flex-col justify-center max-md:mt-10 max-md:max-w-full">
          <div className="flex flex-col space-y-3 max-md:max-w-full">
            <div className="justify-center text-sm font-semibold leading-5 tracking-normal text-slate-700 max-md:max-w-full">
              Report Language
            </div>
            {displayedLanguageMenu}
          </div>
        </div>
        <div className="mt-20 flex flex-col max-md:mt-10 max-md:max-w-full">
          <div className="flex gap-4 max-md:max-w-full max-md:flex-wrap">
            {/* TODO: 在螢幕寬度低於 md 時，新增右橫線，跟左橫線以及 Period 字串一起佔滿這個 div 的寬度 */}
            {/* Info: 左橫線 (20240425 - Shirley) */}
            <div className="my-auto hidden max-md:flex max-md:flex-1 max-md:flex-col max-md:justify-center">
              <div className="h-px shrink-0 border border-solid border-slate-800 bg-slate-800" />
            </div>

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

            {/* Info: 右橫線 (20240425 - Shirley) */}
            <div className="my-auto flex flex-1 flex-col justify-center max-md:max-w-full">
              <div className="h-px shrink-0 border border-solid border-divider-stroke-lv-1 bg-divider-stroke-lv-1 max-md:max-w-full" />
            </div>
          </div>
          <div className="mt-6 flex flex-col justify-center">
            <DatePicker
              // Info: if we want to update the DatePicker whether the DatePickerType is changed or not, uncomment the below (20240425 - Shirley)
              // key={selectedReportType}
              type={datePickerType}
              period={period}
              setFilteredPeriod={setPeriod}
              className=""
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
