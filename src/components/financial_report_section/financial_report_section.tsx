// Info: (20241114 - Liz) common:PLUGIN 翻譯已拔除，請重新加入翻譯在非 common 檔案

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { IAccountResultStatus } from '@/interfaces/accounting_account';
import { IFinancialReportRequest } from '@/interfaces/report';
import { Button } from '@/components/button/button';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import { default30DayPeriodInSec } from '@/constants/display';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { FinancialReportTypesKey, FinancialReportTypesMap } from '@/interfaces/report_type';
import { ReportLanguagesKey, ReportLanguagesMap } from '@/interfaces/report_language';
import { DUMMY_PROJECTS_MAP } from '@/interfaces/report_project';
import { useModalContext } from '@/contexts/modal_context';
import { MessageType } from '@/interfaces/message_modal';
import { LoadingSVG } from '@/components/loading_svg/loading_svg';
import { useUserCtx } from '@/contexts/user_context';
import { useTranslation } from 'next-i18next';
import { FinancialReportTypesKeyReportSheetTypeMapping, ReportType } from '@/constants/report';
// Info: (20240807 - Anna) 用來處理路由的 hook
import { useRouter } from 'next/router';
import { ISUNFA_ROUTE } from '@/constants/url';
import { GrPowerReset } from 'react-icons/gr';
import { IoIosArrowDown } from 'react-icons/io';
import { FiSearch } from 'react-icons/fi';
import { FaArrowRight } from 'react-icons/fa6';

interface IFinancialReportSectionProps {
  reportType?: FinancialReportTypesKey;
}

const FinancialReportSection = ({ reportType }: IFinancialReportSectionProps) => {
  // Info: (20240807 - Anna) 初始化 useRouter
  const router = useRouter();
  const { t } = useTranslation(['common', 'report_401']);
  const { messageModalDataHandler, messageModalVisibilityHandler } = useModalContext();
  const { selectedCompany } = useUserCtx();
  const {
    trigger: generateFinancialReport,
    // Info: (20240516 - Shirley) data: generatedResult,
    // Info: (20240516 - Shirley) error: generatedError,
    code: generatedCode,
    isLoading: generatedLoading,
    success: generatedSuccess,
  } = APIHandler<IAccountResultStatus>(APIName.REPORT_GENERATE);

  const [period, setPeriod] = useState(default30DayPeriodInSec);
  const [selectedProjectName, setSelectedProjectName] =
    useState<keyof typeof DUMMY_PROJECTS_MAP>('Overall');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReportType, setSelectedReportType] = useState<FinancialReportTypesKey>(
    reportType && FinancialReportTypesKey[reportType]
      ? FinancialReportTypesKey[reportType]
      : FinancialReportTypesKey.balance_sheet
  );
  const [selectedReportLanguage, setSelectedReportLanguage] = useState<ReportLanguagesKey>(
    ReportLanguagesKey.en
  );
  const [datePickerType, setDatePickerType] = useState(DatePickerType.TEXT_DATE);

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
    // Info: (20240709 - Anna)  setSelectedProjectName(DUMMY_PROJECTS_MAP[projectName].name);
    setSelectedProjectName(projectName);
    setIsProjectMenuOpen(false);
  };

  const typeMenuClickHandler = () => {
    setIsTypeMenuOpen(!isTypeMenuOpen);
  };

  const menuOptionClickHandler = (id: FinancialReportTypesKey) => {
    setSelectedReportType(id);
    setIsTypeMenuOpen(false);
  };

  const selectedReportName = FinancialReportTypesMap[selectedReportType].name;
  const selectedLanguage = ReportLanguagesMap[selectedReportLanguage];

  const languageMenuClickHandler = () => {
    setIsLanguageMenuOpen(!isLanguageMenuOpen);
  };

  const languageMenuOptionClickHandler = (id: ReportLanguagesKey) => {
    setSelectedReportLanguage(id);
    setIsLanguageMenuOpen(false);
  };

  const generateReportHandler = async () => {
    const body: IFinancialReportRequest = {
      projectId: DUMMY_PROJECTS_MAP[selectedProjectName as keyof typeof DUMMY_PROJECTS_MAP].id,
      type: FinancialReportTypesKeyReportSheetTypeMapping[selectedReportType],
      reportLanguage: selectedReportLanguage,
      from: period.startTimeStamp,
      to: period.endTimeStamp,
      reportType: ReportType.FINANCIAL,
    };

    if (selectedCompany) {
      generateFinancialReport({
        params: {
          companyId: selectedCompany.id,
        },
        body,
      });
    }
  };
  // Info: (20240807 - Anna) 定義導航到 "my_reports" 頁面的函數
  const navigateToMyReports = () => {
    router.push(ISUNFA_ROUTE.USERS_MY_REPORTS);
  };
  useEffect(() => {
    setDatePickerType(() => {
      if (selectedReportType === FinancialReportTypesKey.balance_sheet) {
        setPeriod(default30DayPeriodInSec);
        return DatePickerType.TEXT_DATE;
      } else {
        setPeriod(default30DayPeriodInSec);
        return DatePickerType.TEXT_PERIOD;
      }
    });
  }, [selectedReportType]);
  useEffect(() => {
    // Info: (20240509 - Shirley) 每次展開 menu 之前都要清空 searchQuery
    if (isProjectMenuOpen) {
      setSearchQuery('');
    }
  }, [isProjectMenuOpen]);

  // Info: (20240517 - Shirley) 點下 Generate 後，依照申請成功或申請失敗，顯示不同的 message
  useEffect(() => {
    if (generatedCode && !generatedLoading) {
      if (generatedSuccess) {
        messageModalDataHandler({
          title: '',
          subtitle: t('report_401:MY_REPORTS_SECTION.WE_RECEIVED_YOUR_APPLICATION'),
          content: t('report_401:MY_REPORTS_SECTION.TAKE_MINUTES'),
          submitBtnStr: t('common:COMMON.CLOSE'),
          submitBtnFunction: () => {
            messageModalVisibilityHandler();
            // Info: (20240807 - Anna) 在成功生成報告後，將導航函數作為submitBtnFunction傳入⭢執行導航
            navigateToMyReports();
          },
          messageType: MessageType.SUCCESS,
          submitBtnVariant: 'secondaryBorderless',
          submitBtnClassName: 'text-link-text-success hover:text-link-text-success-hover',
        });
        messageModalVisibilityHandler();
      } else {
        messageModalDataHandler({
          title: '',
          subtitle: t('common:DASHBOARD.FAILED'),
          content: t('common:DASHBOARD.WE_CAN_T_GENERATE_THE_REPORT'),
          submitBtnStr: t('common:DASHBOARD.TRY_AGAIN'),
          submitBtnFunction: () => {
            messageModalVisibilityHandler();
          },
          messageType: MessageType.ERROR,
          submitBtnVariant: 'tertiaryBorderless',
          submitBtnIcon: <GrPowerReset size={16} />,
        });
        messageModalVisibilityHandler();
      }
    }
  }, [generatedSuccess, generatedLoading]);

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
            {DUMMY_PROJECTS_MAP[selectedProjectName].name === 'Overall'
              ? t('common:COMMON.OVERALL')
              : DUMMY_PROJECTS_MAP[selectedProjectName].name}
          </div>

          <div className="my-auto flex flex-col justify-center">
            <div className="flex items-center justify-center">
              <IoIosArrowDown size={20} className="text-icon-surface-single-color-primary" />
            </div>
          </div>
        </button>
      </div>

      {/* Info: (20240425 - Shirley) Project Menu */}
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
            <FiSearch size={20} className="text-icon-surface-single-color-primary" />
          </div>

          <div className="mt-2 max-h-14rem w-full overflow-y-auto">
            {Object.keys(DUMMY_PROJECTS_MAP)
              .filter((project) => {
                return DUMMY_PROJECTS_MAP[project as keyof typeof DUMMY_PROJECTS_MAP].name
                  .toLowerCase()
                  .includes(searchQuery.toLowerCase());
              })
              // TODO: (20240726 - Shirley) [Beta] 串上 API 之後把 filter 拿掉
              .filter((project) => {
                return project.includes('Overall');
              })
              .map((project) => (
                <li
                  key={project}
                  onClick={() => {
                    projectOptionClickHandler(project as keyof typeof DUMMY_PROJECTS_MAP);
                  }}
                  className="mt-1 w-full cursor-pointer px-3 py-2 text-dropdown-text-primary hover:text-text-brand-primary-lv2"
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
          {t(`common:PLUGIN.${selectedReportName.toUpperCase().replace(/ /g, '_')}`)}
        </div>
        <div className="my-auto flex flex-col justify-center">
          <div className="flex items-center justify-center">
            <IoIosArrowDown size={20} className="text-icon-surface-single-color-primary" />
          </div>
        </div>
      </button>
      {/* Info: (20240425 - Shirley) ===== Report Type Menu ===== */}
      <div
        className={`absolute left-0 top-50px z-20 grid w-full grid-cols-1 overflow-hidden rounded-sm border transition-all duration-300 ease-in-out ${
          isTypeMenuOpen
            ? 'grid-rows-1 border-dropdown-stroke-menu shadow-dropmenu'
            : 'grid-rows-0 border-transparent'
        }`}
      >
        <ul className="z-10 flex w-full flex-col items-start bg-input-surface-input-background p-2">
          {Object.entries(FinancialReportTypesMap).map(([id, { name }]) => (
            <li
              key={id}
              onClick={() => menuOptionClickHandler(id as FinancialReportTypesKey)}
              className="mt-1 w-full cursor-pointer px-3 py-2 text-dropdown-text-primary hover:text-text-brand-primary-lv2"
            >
              {/* Info: (20240710 - Anna) {name} */}
              {t(`common:PLUGIN.${name.toUpperCase().replace(/ /g, '_')}`)}
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
            <IoIosArrowDown size={20} className="text-icon-surface-single-color-primary" />
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

  const displayedButtonOrLink = (
    <Button
      disabled={
        generatedLoading || !period.endTimeStamp || !selectedLanguage.id || !selectedReportType
      }
      onClick={generateReportHandler}
      className="mt-20 flex items-center justify-center py-2 max-md:mt-10 max-md:max-w-full max-md:px-5"
    >
      {generatedLoading ? (
        <LoadingSVG />
      ) : (
        <div className="flex gap-1">
          <div className="text-sm font-medium leading-5 tracking-normal">
            {t('report_401:EMBED_CODE_MODAL.GENERATE')}
          </div>
          <div className="my-auto flex items-center justify-center">
            <FaArrowRight size={16} />
          </div>
        </div>
      )}
    </Button>
  );
  return (
    <div className="mt-20 flex w-full shrink-0 grow basis-0 flex-col bg-surface-neutral-main-background">
      <div className="flex max-md:flex-wrap">
        <div className="flex w-fit shrink-0 grow basis-0 flex-col pb-5 pt-16 max-md:max-w-full">
          {/* Info: (20240513 - Shirley)  desktop heading */}
          <div className="hidden flex-col justify-center text-4xl font-semibold leading-10 text-text-neutral-secondary max-md:max-w-full max-md:pr-5 md:flex">
            <div className="w-full justify-center px-10 md:px-28">
              {t('report_401:REPORTS_SIDEBAR.FINANCIAL_REPORTS')}
            </div>
          </div>
          {/* Info: (20240513 - Shirley) mobile heading */}
          <div className="flex w-600px max-w-full flex-1 md:hidden">
            <div className="mx-4 flex items-center space-x-2 font-semibold text-text-neutral-secondary">
              <Image src={'/icons/report.svg'} width={30} height={30} alt="report_icon" />
              <p>{t('report_401:REPORTS_SIDEBAR.FINANCIAL_REPORTS')}</p>
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
            {/* Info: 在螢幕寬度低於 md 時，新增右橫線，跟左橫線以及 Period 字串一起佔滿這個 div 的寬度 */}
            {/* Info: (20240425 - Shirley) 左橫線 */}
            <div className="my-auto hidden max-md:flex max-md:flex-1 max-md:flex-col max-md:justify-center">
              <div className="h-px shrink-0 border border-solid border-divider-stroke-lv-1" />
            </div>

            <div className="flex gap-2">
              <div className="my-auto flex flex-col justify-center">
                <div className="flex items-center justify-center">
                  <Image src="/icons/bell.svg" width={16} height={16} alt="calendar"></Image>
                </div>
              </div>
              <div className="text-sm font-medium leading-5 tracking-normal text-divider-text-lv-1">
                {t('report_401:PENDING_REPORT_LIST.PERIOD')}
              </div>
            </div>

            {/* Info: (20240425 - Shirley) 右橫線 */}
            <div className="my-auto flex flex-1 flex-col justify-center max-md:max-w-full">
              <div className="h-px shrink-0 border border-solid border-divider-stroke-lv-1 bg-divider-stroke-lv-1 max-md:max-w-full" />
            </div>
          </div>
          <div className="mt-6 flex flex-col justify-center">
            <DatePicker
              key={`${selectedReportType}-${period.startTimeStamp}-${period.endTimeStamp}`}
              type={datePickerType}
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
export default FinancialReportSection;
