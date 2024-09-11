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
import { FaArrowRightLong } from 'react-icons/fa6';

const AnalysisReportSection = () => {
  const { t } = useTranslation(['common', 'report_401']);
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

  // TODO: (20240524 - Shirley) [Beta] 這邊要改成申請 report 然後顯示成功 / 失敗的 modal
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
        className={`flex w-full items-center justify-between rounded-sm border bg-input-surface-input-background px-2 ${
          isProjectMenuOpen ? 'border-input-stroke-selected' : 'border-dropdown-stroke-menu'
        }`}
      >
        <div className="flex items-center justify-center space-x-4 self-center pl-2.5 text-center">
          <div
            className="text-center text-input-text-input-filled"
            style={{ whiteSpace: 'nowrap' }}
          >
            {t('common:COMMON.PROJECT')}
          </div>
          <div
            className={`h-11 w-px ${
              isProjectMenuOpen ? 'bg-input-stroke-selected' : 'bg-dropdown-stroke-menu'
            }`}
          />
        </div>

        <button
          type="button"
          className={`flex w-full items-center justify-between bg-input-surface-input-background px-3 py-2.5`}
          onClick={projectMenuClickHandler}
        >
          <div className="text-base font-medium leading-6 tracking-normal text-input-text-input-filled">
            {/* Info: (20240710 - Anna) {selectedProjectName} */}
            {selectedProjectName === 'Overall' ? t('common:COMMON.OVERALL') : selectedProjectName}
          </div>

          <div className="my-auto flex flex-col justify-center">
            <div className="flex items-center justify-center">
              <Image src="/elements/arrow_down.svg" alt="arrow_down" width={20} height={20} />
            </div>
          </div>
        </button>
      </div>

      {/* Info: (20240425 - Shirley) Project Menu  */}
      <div
        className={`absolute left-0 top-50px z-20 grid w-full grid-cols-1 overflow-hidden rounded-sm border transition-all duration-300 ease-in-out ${
          isProjectMenuOpen
            ? 'grid-rows-1 border-dropdown-stroke-menu shadow-dropmenu'
            : 'grid-rows-0 border-transparent'
        }`}
      >
        <ul className="z-10 flex w-full flex-col items-start bg-input-surface-input-background p-2">
          <div className="flex w-full max-w-xl items-center justify-between gap-5 self-center whitespace-nowrap rounded-sm border border-solid border-dropdown-stroke-menu bg-input-surface-input-background px-3 py-2.5 text-base leading-6 tracking-normal text-input-text-input-filled shadow-sm">
            <input
              type="text"
              placeholder={t('common:COMMON.SEARCH')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border-none focus:outline-none"
            />
            <Image src="/elements/search_icon.svg" alt="search_icon" width={16} height={16} />
          </div>
          {/* Info: (20240830 - Anna) 為了解決Unexpected newline before '}'錯誤，請prettier不要格式化 */}
          {/* prettier-ignore */}
          <div className="mt-2 max-h-52 w-full overflow-y-auto">
            {Object.keys(DUMMY_PROJECTS_MAP)
              .filter((project) => {
                return DUMMY_PROJECTS_MAP[project as keyof typeof DUMMY_PROJECTS_MAP].name
                  .toLowerCase()
                  .includes(searchQuery.toLowerCase());
              })
              .map((project) => (
                <li
                  key={project}
                  onClick={() =>
                    projectOptionClickHandler(project as keyof typeof DUMMY_PROJECTS_MAP)}
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
                        ? t('common:COMMON.OVERALL')
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
        type="button"
        className={`flex w-full items-center justify-between rounded-sm border bg-input-surface-input-background px-5 py-2.5 ${
          isTypeMenuOpen ? 'border-input-stroke-selected' : 'border-dropdown-stroke-menu'
        }`}
        onClick={typeMenuClickHandler}
      >
        <div className="text-base font-medium leading-6 tracking-normal text-input-text-input-filled">
          {t(`common:BOOKMARK_LIST.${selectedReportName.toUpperCase().replace(/ /g, '_')}`)}
        </div>
        <div className="my-auto flex flex-col justify-center">
          <div className="flex items-center justify-center">
            <Image src="/elements/arrow_down.svg" alt="arrow_down" width={20} height={20} />
          </div>
        </div>
      </button>
      {/* Info: (20240425 - Shirley) Report Type Menu  */}
      <div
        className={`absolute left-0 top-50px z-20 grid w-full grid-cols-1 overflow-hidden rounded-sm border transition-all duration-300 ease-in-out ${
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
              {t(`common:BOOKMARK_LIST.${name.toUpperCase().replace(/ /g, '_')}`)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  const displayedLanguageMenu = (
    <div ref={languageMenuRef} className="relative flex w-full">
      <button
        type="button"
        className={`flex w-full items-center justify-between space-x-5 rounded-sm border bg-input-surface-input-background px-5 py-2.5 max-md:max-w-full ${
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
        <div className="my-auto flex flex-col justify-center">
          <div className="flex items-center justify-center">
            <Image src="/elements/arrow_down.svg" alt="arrow_down" width={20} height={20} />
          </div>
        </div>
      </button>
      {/* Info: (20240425 - Shirley) Language Menu */}
      <div
        className={`absolute left-0 top-50px z-20 grid w-full grid-cols-1 overflow-hidden rounded-sm border transition-all duration-300 ease-in-out ${
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
              className="mt-1 flex w-full cursor-pointer items-center space-x-5 px-3 py-2.5 text-dropdown-text-primary hover:text-text-brand-primary-lv2"
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
        disabled
        className="mt-20 flex items-center justify-center py-2 max-md:mt-10 max-md:max-w-full max-md:px-5"
      >
        <Link href={targetedReportViewLink}>
          <div className="flex gap-1">
            <div className="text-sm font-medium leading-5 tracking-normal">
              {t('report_401:EMBED_CODE_MODAL.GENERATE')}
            </div>
            <div className="my-auto flex items-center justify-center">
              <FaArrowRightLong size={16} />
            </div>
          </div>
        </Link>
      </Button>
    ) : (
      <Link
        href={targetedReportViewLink}
        className="mt-20 flex items-center justify-center rounded-sm bg-button-surface-strong-primary py-2 text-button-text-primary-solid disabled:text-button-text-disable max-md:mt-10 max-md:max-w-full max-md:px-5"
      >
        <div className="flex gap-1">
          <div className="text-sm font-medium leading-5 tracking-normal">
            {t('report_401:EMBED_CODE_MODAL.GENERATE')}
          </div>
          <div className="my-auto flex items-center justify-center">
            <FaArrowRightLong size={16} />
          </div>
        </div>
      </Link>
    );

  return (
    <div className="mt-20 flex w-full shrink-0 grow basis-0 flex-col bg-surface-neutral-main-background">
      <div className="flex max-md:flex-wrap">
        <div className="flex w-fit shrink-0 grow basis-0 flex-col pb-5 pt-16 max-md:max-w-full">
          {/* Info: (20240513 - Shirley) desktop heading */}
          <div className="hidden flex-col justify-center text-4xl font-semibold leading-10 text-text-neutral-secondary max-md:max-w-full max-md:pr-5 md:flex">
            <div className="w-full justify-center px-10 md:px-28">
              {t('common:COMMON.ANALYSIS_REPORTS')}
            </div>
          </div>
          {/* Info: (20240513 - Shirley) mobile heading */}
          <div className="flex w-600px max-w-full flex-1 md:hidden">
            <div className="mx-4 flex space-x-2">
              <Image src={'/icons/report.svg'} width={30} height={30} alt="report_icon" />
              <div className="mt-1.5">{t('common:COMMON.ANALYSIS_REPORTS')}</div>
            </div>
          </div>

          <div className="mt-4 flex flex-1 flex-col justify-center px-6 py-2.5 max-md:max-w-full md:px-28">
            <div className="h-px shrink-0 border border-solid border-divider-stroke-lv-4 max-md:max-w-full" />
          </div>
        </div>
      </div>
      {/* Info: (20240513 - Shirley) options for generation */}
      <div className="mt-3 flex w-600px max-w-full flex-col space-y-10 self-center px-5 lg:mt-16">
        <div className="flex flex-col justify-center max-md:max-w-full">
          <div className="flex flex-col gap-3 max-md:max-w-full">
            <div className="justify-center text-sm font-semibold leading-5 tracking-normal text-input-text-primary max-md:max-w-full">
              {t('common:COMMON.PROJECT')}
            </div>

            {displayedProjectMenu}
          </div>
        </div>

        <div className="flex flex-col justify-center max-md:max-w-full">
          <div className="flex flex-col gap-3 max-md:max-w-full">
            <div className="justify-center text-sm font-semibold leading-5 tracking-normal text-input-text-primary max-md:max-w-full">
              {t('report_401:ANALYSIS_REPORTS_SECTION.REPORT_TYPE')}
            </div>
            {displayedReportTypeMenu}
          </div>
        </div>
        <div className="flex flex-col justify-center max-md:mt-10 max-md:max-w-full">
          <div className="flex flex-col space-y-3 max-md:max-w-full">
            <div className="justify-center text-sm font-semibold leading-5 tracking-normal text-input-text-primary max-md:max-w-full">
              {t('report_401:EMBED_CODE_MODAL.REPORT_LANGUAGE')}
            </div>
            {displayedLanguageMenu}
          </div>
        </div>
        <div className="flex flex-col max-md:mt-10 max-md:max-w-full">
          <div className="flex gap-4 max-md:max-w-full max-md:flex-wrap">
            {/* Info: (20240820 - Julian) 在螢幕寬度低於 md 時，新增右橫線，跟左橫線以及 Period 字串一起佔滿這個 div 的寬度 */}
            {/* Info: (20240425 - Shirley) 左橫線 */}
            <div className="my-auto hidden max-md:flex max-md:flex-1 max-md:flex-col max-md:justify-center">
              <div className="h-px shrink-0 border border-solid border-divider-stroke-lv-1" />
            </div>

            <div className="flex gap-2">
              <div className="my-auto flex flex-col justify-center">
                <div className="flex items-center justify-center">
                  <Image src="/icons/bell.svg" alt="bell" width={16} height={16} />
                </div>
              </div>
              <div className="text-sm font-medium leading-5 tracking-normal text-divider-text-lv-1">
                {t('report_401:PENDING_REPORT_LIST.PERIOD')}
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

        <div className="my-10 flex flex-col justify-center text-text-neutral-primary">
          <p>{t('report_401:ANALYSIS_REPORTS_SECTION.ATTENTION')}</p>
        </div>
        {displayedButtonOrLink}
      </div>
    </div>
  );
};

export default AnalysisReportSection;
