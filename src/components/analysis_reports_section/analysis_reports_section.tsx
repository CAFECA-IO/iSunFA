/* eslint-disable */
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/button/button';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import { default30DayPeriodInSec } from '@/constants/display';
import useOuterClick from '@/lib/hooks/use_outer_click';
import Image from 'next/image';
import Link from 'next/link';
import { ISUNFA_ROUTE } from '@/constants/url';
import { AnalysisReportTypesKey, AnalysisReportTypesMap } from '@/interfaces/report_type';
import { ReportLanguagesKey, ReportLanguagesMap } from '@/interfaces/report_language';
import { DUMMY_PROJECTS_MAP } from '@/interfaces/report_project';
import { useTranslation } from 'next-i18next';

const AnalysisReportSection = () => {
  const { t } = useTranslation('common');
  const [period, setPeriod] = useState(default30DayPeriodInSec);
  const [selectedProjectName, setSelectedProjectName] =
    useState<keyof typeof DUMMY_PROJECTS_MAP>('Overall');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReportType, setSelectedReportType] = useState<AnalysisReportTypesKey>(
    AnalysisReportTypesKey.financial_performance
  );
  const [selectedReportLanguage, setSelectedReportLanguage] = useState<ReportLanguagesKey>(
    ReportLanguagesKey.en
  );

  const {
    targetRef: projectMenuRef,
    componentVisible: isProjectMenuOpen,
    setComponentVisible: setIsProjectMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const {
    targetRef: typeMenuRef,
    componentVisible: isTypeMenuOpen,
    setComponentVisible: setIsTypeMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const {
    targetRef: languageMenuRef,
    componentVisible: isLanguageMenuOpen,
    setComponentVisible: setIsLanguageMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const projectMenuClickHandler = () => {
    setIsProjectMenuOpen(!isProjectMenuOpen);
  };

  const projectOptionClickHandler = (projectName: keyof typeof DUMMY_PROJECTS_MAP) => {
    setSelectedProjectName(projectName);
    setIsProjectMenuOpen(false);
  };

  const typeMenuClickHandler = () => {
    setIsTypeMenuOpen(!isTypeMenuOpen);
  };

  const menuOptionClickHandler = (id: AnalysisReportTypesKey) => {
    setSelectedReportType(id);
    setIsTypeMenuOpen(false);
  };

  const selectedReportName = AnalysisReportTypesMap[selectedReportType].name;
  const selectedLanguage = ReportLanguagesMap[selectedReportLanguage];

  const languageMenuClickHandler = () => {
    setIsLanguageMenuOpen(!isLanguageMenuOpen);
  };

  const languageMenuOptionClickHandler = (id: ReportLanguagesKey) => {
    setSelectedReportLanguage(id);
    setIsLanguageMenuOpen(false);
  };

  // TODO: [Beta] (20240524 - Shirley) 這邊要改成申請 report 然後顯示成功 / 失敗的 modal
  const targetedReportViewLink = `${ISUNFA_ROUTE.USERS_ANALYSES_REPORTS_VIEW}/REPORT_ID?project=${DUMMY_PROJECTS_MAP[selectedProjectName].id}&report_type=${selectedReportType}&report_language=${selectedReportLanguage}&start_timestamp=${period.startTimeStamp}&end_timestamp=${period.endTimeStamp}`;

  useEffect(() => {
    // Info: (20240509 - Shirley) 每次展開 menu 之前都要清空 searchQuery
    if (isProjectMenuOpen) {
      setSearchQuery('');
    }
  }, [isProjectMenuOpen]);

  const displayedProjectMenu = (
    <div ref={projectMenuRef} className="relative flex w-full">
      <div
        className={`flex w-full items-center justify-between gap-0 rounded-sm border bg-input-surface-input-background px-2 ${
          isProjectMenuOpen ? 'border-input-stroke-selected' : 'border-dropdown-stroke-menu'
        }`}
      >
        <div className="flex items-center justify-center space-x-4 self-center pl-2.5 text-center">
          <div
            className="text-center text-input-text-input-filled"
            style={{ whiteSpace: 'nowrap' }}
          >
            {t('REPORTS_HISTORY_LIST.PROJECT')}
          </div>
          <div
            className={`h-11 w-px ${
              isProjectMenuOpen ? 'bg-input-stroke-selected' : 'bg-dropdown-stroke-menu'
            }`}
          />
        </div>

        <button
          className={`flex w-full items-center justify-between gap-0 bg-input-surface-input-background px-3 py-2.5`}
          onClick={projectMenuClickHandler}
        >
          <div className="text-base font-medium leading-6 tracking-normal text-input-text-input-filled">
            {/* Info: (20240710 - Anna) {selectedProjectName} */}
            {selectedProjectName === 'Overall' ? t('PROJECT.OVERALL') : selectedProjectName}
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
      </div>

      {/* Info: (20240425 - Shirley) Project Menu  */}
      <div
        className={`absolute left-0 top-[3.5rem] z-20 grid w-full grid-cols-1 overflow-hidden rounded-sm border transition-all duration-300 ease-in-out ${
          isProjectMenuOpen
            ? 'grid-rows-1 border-dropdown-stroke-menu shadow-dropmenu'
            : 'grid-rows-0 border-transparent'
        }`}
      >
        <ul className="z-10 flex w-full flex-col items-start bg-input-surface-input-background p-2">
          <div className="flex w-full max-w-xl items-center justify-between gap-5 self-center whitespace-nowrap rounded-sm border border-solid border-dropdown-stroke-menu bg-input-surface-input-background px-3 py-2.5 text-base leading-6 tracking-normal text-slate-500 shadow-sm">
            <input
              type="text"
              placeholder={t('AUDIT_REPORT.SEARCH')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border-none focus:outline-none"
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="none"
              viewBox="0 0 16 16"
            >
              <path
                fill="#314362"
                fillRule="evenodd"
                d="M3.906 2.413a5.409 5.409 0 116.01 8.994 5.409 5.409 0 01-6.01-8.994zm3.005.088a4.409 4.409 0 104.41 4.41M6.91 2.5a4.41 4.41 0 014.41 4.41"
                clipRule="evenodd"
              ></path>
              <path
                fill="#314362"
                fillRule="evenodd"
                d="M10.22 10.219a.5.5 0 01.707 0l3.429 3.428a.5.5 0 01-.707.707l-3.429-3.428a.5.5 0 010-.707z"
                clipRule="evenodd"
              ></path>
            </svg>
          </div>

          <div className="mt-2 max-h-52 w-full overflow-y-auto">
            {Object.keys(DUMMY_PROJECTS_MAP)
              .filter((project) =>
                DUMMY_PROJECTS_MAP[project as keyof typeof DUMMY_PROJECTS_MAP].name
                  .toLowerCase()
                  .includes(searchQuery.toLowerCase())
              )
              .map((project) => (
                <li
                  key={project}
                  onClick={() =>
                    projectOptionClickHandler(project as keyof typeof DUMMY_PROJECTS_MAP)
                  }
                  className="w-full cursor-pointer px-3 py-2 text-dropdown-text-primary hover:text-text-brand-primary-lv2"
                >
                  <div className="flex cursor-pointer items-center gap-2">
                    {DUMMY_PROJECTS_MAP[project as keyof typeof DUMMY_PROJECTS_MAP].icon ? (
                      <div className="h-6 w-6">
                        <Image
                          src={DUMMY_PROJECTS_MAP[project as keyof typeof DUMMY_PROJECTS_MAP].icon}
                          alt={project}
                          width={20}
                          height={20}
                        />
                      </div>
                    ) : null}
                    <div className="text-base font-medium leading-6 tracking-normal">
                      {/* Info: (20240710 - Anna) {DUMMY_PROJECTS_MAP[project as keyof typeof DUMMY_PROJECTS_MAP].name} */}
                      {DUMMY_PROJECTS_MAP[project as keyof typeof DUMMY_PROJECTS_MAP].name ===
                      'Overall'
                        ? t('PROJECT.OVERALL')
                        : DUMMY_PROJECTS_MAP[project as keyof typeof DUMMY_PROJECTS_MAP].name}
                    </div>
                  </div>
                </li>
              ))}
          </div>
        </ul>
      </div>
    </div>
  );

  const displayedReportTypeMenu = (
    <div ref={typeMenuRef} className="relative flex w-full">
      <button
        className={`flex w-full items-center justify-between gap-0 rounded-sm border bg-input-surface-input-background px-5 py-2.5 ${
          isTypeMenuOpen ? 'border-input-stroke-selected' : 'border-dropdown-stroke-menu'
        }`}
        onClick={typeMenuClickHandler}
      >
        <div className="text-base font-medium leading-6 tracking-normal text-input-text-input-filled">
          {t(`BOOKMARK_LIST.${selectedReportName.toUpperCase().replace(/ /g, '_')}`)}
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
      {/* Info: (20240425 - Shirley) Report Type Menu  */}
      <div
        className={`absolute left-0 top-[3.5rem] z-20 grid w-full grid-cols-1 overflow-hidden rounded-sm border transition-all duration-300 ease-in-out ${
          isTypeMenuOpen
            ? 'grid-rows-1 border-dropdown-stroke-menu shadow-dropmenu'
            : 'grid-rows-0 border-transparent'
        }`}
      >
        <ul className="z-10 flex w-full flex-col items-start bg-input-surface-input-background p-2">
          {Object.entries(AnalysisReportTypesMap).map(([id, { name }]) => (
            <li
              key={id}
              onClick={() => menuOptionClickHandler(id as AnalysisReportTypesKey)}
              className="mt-1 w-full cursor-pointer px-3 py-2 text-dropdown-text-primary hover:text-text-brand-primary-lv2"
            >
              {/* Info: (20240710 - Anna) {name} */}
              {t(`BOOKMARK_LIST.${name.toUpperCase().replace(/ /g, '_')}`)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  const displayedLanguageMenu = (
    <div ref={languageMenuRef} className="relative flex w-full">
      <button
        className={`flex w-full items-center justify-between gap-0 space-x-5 rounded-sm border bg-input-surface-input-background px-5 py-2.5 max-md:max-w-full ${
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
        <div className="flex-1 whitespace-nowrap text-start text-base font-medium leading-6 tracking-normal text-input-text-primary">
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
      {/* Info: (20240425 - Shirley) Language Menu */}
      <div
        className={`absolute left-0 top-[3.5rem] z-20 grid w-full grid-cols-1 overflow-hidden rounded-sm border transition-all duration-300 ease-in-out ${
          isLanguageMenuOpen
            ? 'grid-rows-1 border-dropdown-stroke-menu shadow-dropmenu'
            : 'grid-rows-0 border-transparent'
        }`}
      >
        <ul className="z-10 flex w-full flex-col items-start bg-input-surface-input-background p-2">
          {Object.entries(ReportLanguagesMap).map(([id, { name, icon }]) => (
            <li
              key={id}
              onClick={() => languageMenuOptionClickHandler(id as ReportLanguagesKey)}
              className="mt-1 flex w-full cursor-pointer items-center space-x-5 px-3 py-2.5 text-navyBlue2 hover:text-text-brand-primary-lv2"
            >
              <Image src={icon} alt={name} width={20} height={20} />
              <p className="text-base font-medium leading-5 tracking-normal">{name}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  const displayedButtonOrLink =
    !period.endTimeStamp || !selectedLanguage.id || !selectedReportType ? (
      <Button
        disabled={true}
        className="mt-20 flex items-center justify-center rounded-sm px-4 py-2 text-button-text-primary-solid disabled:text-lightGray2 max-md:mt-10 max-md:max-w-full max-md:px-5"
      >
        <Link href={targetedReportViewLink}>
          <div className="flex gap-1">
            <div className="text-sm font-medium leading-5 tracking-normal">
              {t('EMBED_CODE_MODAL.GENERATE')}
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
                    className="fill-current"
                    fill="none"
                    fillRule="evenodd"
                    d="M9.128 3.294a1 1 0 011.415 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.415-1.414l2.293-2.293H3.17a1 1 0 110-2h8.252L9.128 4.708a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  ></path>
                </g>
              </svg>
            </div>
          </div>
        </Link>
      </Button>
    ) : (
      <Link
        href={targetedReportViewLink}
        className="mt-20 flex items-center justify-center rounded-sm bg-primaryYellow py-2 text-button-text-primary-solid disabled:text-lightGray2 max-md:mt-10 max-md:max-w-full max-md:px-5"
      >
        <div className="flex gap-1">
          <div className="text-sm font-medium leading-5 tracking-normal">
            {t('EMBED_CODE_MODAL.GENERATE')}
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
                  className="fill-current"
                  fill="none"
                  fillRule="evenodd"
                  d="M9.128 3.294a1 1 0 011.415 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.415-1.414l2.293-2.293H3.17a1 1 0 110-2h8.252L9.128 4.708a1 1 0 010-1.414z"
                  clipRule="evenodd"
                ></path>
              </g>
            </svg>
          </div>
        </div>
      </Link>
    );

  return (
    <div className="mt-20 flex w-full shrink-0 grow basis-0 flex-col bg-surface-neutral-main-background px-0 pb-0">
      <div className="flex gap-0 max-md:flex-wrap">
        <div className="flex w-fit shrink-0 grow basis-0 flex-col pb-5 pt-16 max-md:max-w-full">
          {/* Info: (20240513 - Shirley) desktop heading */}
          <div className="hidden flex-col justify-center text-4xl font-semibold leading-10 text-slate-500 max-md:max-w-full max-md:pr-5 md:flex">
            <div className="w-full justify-center px-10 md:px-28">
              {t('REPORTS_SIDEBAR.ANALYSIS_REPORTS')}
            </div>
          </div>
          {/* Info: (20240513 - Shirley) mobile heading */}
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
              <div className="mt-1.5">{t('REPORTS_SIDEBAR.ANALYSIS_REPORTS')}</div>
            </div>
          </div>

          <div className="mt-4 flex flex-1 flex-col justify-center px-6 py-2.5 max-md:max-w-full md:px-28">
            <div className="flex flex-col justify-center max-md:max-w-full">
              <div className="h-px shrink-0 border border-solid border-gray-300 bg-gray-300 max-md:max-w-full" />
            </div>
          </div>
        </div>
      </div>
      {/* Info: (20240513 - Shirley) options for generation */}
      <div className="mt-3 flex w-600px max-w-full flex-col space-y-10 self-center px-5 lg:mt-16">
        <div className="flex flex-col justify-center max-md:max-w-full">
          <div className="flex flex-col gap-3 max-md:max-w-full">
            <div className="justify-center text-sm font-semibold leading-5 tracking-normal text-input-text-primary max-md:max-w-full">
              {t('REPORTS_HISTORY_LIST.PROJECT')}
            </div>

            {displayedProjectMenu}
          </div>
        </div>

        <div className="flex flex-col justify-center max-md:max-w-full">
          <div className="flex flex-col gap-3 max-md:max-w-full">
            <div className="justify-center text-sm font-semibold leading-5 tracking-normal text-input-text-primary max-md:max-w-full">
              {t('ANALYSIS_REPORTS_SECTION.REPORT_TYPE')}
            </div>
            {displayedReportTypeMenu}
          </div>
        </div>
        <div className="mt-0 flex flex-col justify-center max-md:mt-10 max-md:max-w-full">
          <div className="flex flex-col space-y-3 max-md:max-w-full">
            <div className="justify-center text-sm font-semibold leading-5 tracking-normal text-input-text-primary max-md:max-w-full">
              {t('EMBED_CODE_MODAL.REPORT_LANGUAGE')}
            </div>
            {displayedLanguageMenu}
          </div>
        </div>
        <div className="mt-0 flex flex-col max-md:mt-10 max-md:max-w-full">
          <div className="flex gap-4 max-md:max-w-full max-md:flex-wrap">
            {/* Info: (20240820 - Julian) 在螢幕寬度低於 md 時，新增右橫線，跟左橫線以及 Period 字串一起佔滿這個 div 的寬度 */}
            {/* Info: (20240425 - Shirley) 左橫線 */}
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
                    <g fillRule="evenodd" clipRule="evenodd">
                      <path
                        fill="#FFA502"
                        d="M12.286 0c.473 0 .857.384.857.857v2h2a.857.857 0 110 1.714h-2v2a.857.857 0 11-1.714 0v-2h-2a.857.857 0 010-1.714h2v-2c0-.473.383-.857.857-.857z"
                      ></path>
                      <path
                        fill="#002462"
                        d="M8.099 1.855a5.542 5.542 0 00-1.242-.141c-1.373 0-2.698.509-3.68 1.426-.985.918-1.545 2.172-1.545 3.488v4.314c0 .268-.114.532-.33.734-.25.233-.447.324-.73.324a.571.571 0 000 1.142h12.57a.571.571 0 100-1.142c-.282 0-.48-.09-.73-.324a1.004 1.004 0 01-.33-.734V8.848A2.286 2.286 0 0110 6.57V6h-.571a2.286 2.286 0 01-1.33-4.145zm-2.385 12.43a.857.857 0 000 1.715H8a.857.857 0 000-1.715H5.714z"
                      ></path>
                    </g>
                  </svg>
                </div>
              </div>
              <div className="text-sm font-medium leading-5 tracking-normal text-slate-800">
                {t('PENDING_REPORT_LIST.PERIOD')}
              </div>
            </div>

            {/* Info: (20240425 - Shirley) 右橫線  */}
            <div className="my-auto flex flex-1 flex-col justify-center max-md:max-w-full">
              <div className="h-px shrink-0 border border-solid border-divider-stroke-lv-1 bg-divider-stroke-lv-1 max-md:max-w-full" />
            </div>
          </div>
          <div className="mt-6 flex flex-col justify-center">
            <DatePicker
              // Info: (20240425 - Shirley) if we want to update the DatePicker whether the DatePickerType is changed or not, uncomment the below
              // key={selectedReportType}
              type={DatePickerType.TEXT_PERIOD}
              period={period}
              setFilteredPeriod={setPeriod}
              btnClassName="px-6"
            />
          </div>
        </div>

        <div className="my-10 flex flex-col justify-center">
          <p>{t('ANALYSIS_REPORTS_SECTION.ATTENTION')}</p>
        </div>
        {displayedButtonOrLink}
      </div>
    </div>
  );
};

export default AnalysisReportSection;
