/* eslint-disable */
import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ReportLanguagesKey, ReportLanguagesMap } from '@/interfaces/report_language';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { Button } from '@/components/button/button';
import { DUMMY_PROJECTS_MAP } from '@/interfaces/report_project';
import { useTranslation } from 'next-i18next';

interface IEmbedCodeModal {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
}

const EmbedCodeModal = ({ isModalVisible, modalVisibilityHandler }: IEmbedCodeModal) => {
  const { t } = useTranslation('common');
  const balanceSheetRef = useRef<HTMLInputElement>(null);
  const incomeStatementRef = useRef<HTMLInputElement>(null);
  const cashFlowStatementRef = useRef<HTMLInputElement>(null);

  const [isBalanceSheetChecked, setIsBalanceSheetChecked] = useState(true);
  const [isIncomeStatementChecked, setIsIncomeStatementChecked] = useState(true);
  const [isCashFlowStatementChecked, setIsCashFlowStatementChecked] = useState(true);

  const [selectedProjectName, setSelectedProjectName] =
    useState<keyof typeof DUMMY_PROJECTS_MAP>('Overall');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReportLanguage, setSelectedReportLanguage] = useState<ReportLanguagesKey>(
    ReportLanguagesKey.en
  );
  const [step, setStep] = useState<number>(0);
  const [generatedCode, setGeneratedCode] = useState<string>('');

  const {
    targetRef: projectMenuRef,
    componentVisible: isProjectMenuOpen,
    setComponentVisible: setIsProjectMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const {
    targetRef: languageMenuRef,
    componentVisible: isLanguageMenuOpen,
    setComponentVisible: setIsLanguageMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const selectedLanguage = ReportLanguagesMap[selectedReportLanguage];

  const projectMenuClickHandler = () => {
    setIsProjectMenuOpen(!isProjectMenuOpen);
  };

  const projectOptionClickHandler = (projectName: keyof typeof DUMMY_PROJECTS_MAP) => {
    setSelectedProjectName(projectName);
    setIsProjectMenuOpen(false);
  };

  const languageMenuClickHandler = () => {
    setIsLanguageMenuOpen(!isLanguageMenuOpen);
  };

  const languageMenuOptionClickHandler = (id: ReportLanguagesKey) => {
    setSelectedReportLanguage(id);
    setIsLanguageMenuOpen(false);
  };

  const cancelClickHandler = () => {
    setStep(0);
    modalVisibilityHandler();
  };

  const copyClickHandler = () => {
    navigator.clipboard.writeText(generatedCode);
    window.alert('Code copied to clipboard');
  };

  const generateClickHandler = () => {
    setStep(1);

    // TODO: dummy data (20240507 - Shirley)
    const balanceLink = `https://baifa.io/en/app/chains/8017/evidence/505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007/balance`;
    const comprehensiveIncomeLink = `https://baifa.io/en/app/chains/8017/evidence/505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007/comprehensive-income`;
    const cashFlowLink = `https://baifa.io/en/app/chains/8017/evidence/505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007/cash-flow`;
    const allReportsLink = `https://baifa.io/en/app/chains/8017/evidence/505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007/all-reports`;

    if (
      balanceSheetRef.current?.checked &&
      !incomeStatementRef.current?.checked &&
      !cashFlowStatementRef.current?.checked
    ) {
      const code = `  <iframe
    src="${balanceLink}"
    title="balance-sheet"
    width={600}
    height={600}
    />`;
      setGeneratedCode(code);
    } else if (
      !balanceSheetRef.current?.checked &&
      incomeStatementRef.current?.checked &&
      !cashFlowStatementRef.current?.checked
    ) {
      const code = `  <iframe
    src="${comprehensiveIncomeLink}"
    title="comprehensive-income-statement"
    width={600}
    height={600}
    />`;
      setGeneratedCode(code);
    } else if (
      !balanceSheetRef.current?.checked &&
      !incomeStatementRef.current?.checked &&
      cashFlowStatementRef.current?.checked
    ) {
      const code = `  <iframe
    src="${cashFlowLink}"
    title="cash-flow-statement"
    width={600}
    height={600}
    />`;
      setGeneratedCode(code);
    } else {
      const code = `  <iframe
    src="${allReportsLink}"
    title="financial-reports"
    width={600}
    height={600}
    />`;
      setGeneratedCode(code);
    }
  };

  useEffect(() => {
    // Info: 每次展開 menu 之前都要清空 searchQuery (20240509 - Shirley)
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
          <div className="text-center text-input-text-input-filled">
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
            {selectedProjectName}
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

      {/* Info: Project Menu (20240425 - Shirley) */}
      <div
        className={`absolute left-0 top-[3.5rem] z-20 grid w-full grid-cols-1 overflow-hidden rounded-sm border transition-all duration-300 ease-in-out ${
          isProjectMenuOpen
            ? 'grid-rows-1 border-dropdown-stroke-menu shadow-dropmenu'
            : 'grid-rows-0 border-transparent'
        }`}
      >
        <ul className="z-10 flex w-full flex-col items-start bg-input-surface-input-background p-2">
          <div className="flex w-full max-w-xl items-center justify-between gap-5 self-center whitespace-nowrap rounded-sm border border-solid border-slate-300 bg-input-surface-input-background px-3 py-2.5 text-base leading-6 tracking-normal text-slate-500 shadow-sm">
            <input
              type="text"
              placeholder="Search"
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

          <div className="mt-2 max-h-60 w-full overflow-y-auto">
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
                      {DUMMY_PROJECTS_MAP[project as keyof typeof DUMMY_PROJECTS_MAP].name}
                    </div>
                  </div>
                </li>
              ))}
          </div>
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
        <div className="flex-1 whitespace-nowrap text-start text-base font-medium leading-6 tracking-normal text-input-text-input-filled">
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
          {Object.entries(ReportLanguagesMap).map(([id, { name, icon }]) => (
            <li
              key={id}
              onClick={() => languageMenuOptionClickHandler(id as ReportLanguagesKey)}
              className="mt-1 flex w-full cursor-pointer items-center space-x-5 px-1 py-2.5 text-navyBlue2 hover:text-text-brand-primary-lv2"
            >
              <Image src={icon} alt={name} width={20} height={20} />
              <p className="text-base font-medium leading-5 tracking-normal">{name}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  const displayedConfigSection = (
    <>
      <div className="flex w-full flex-col justify-center bg-white px-4 py-2.5 max-md:max-w-full">
        <div className="flex flex-col max-md:max-w-full">
          <div className="flex flex-col justify-end text-sm leading-5 tracking-normal max-md:max-w-full">
            <div className="flex flex-col justify-center max-md:max-w-full">
              <div className="flex flex-col gap-3 max-md:max-w-full">
                <div className="justify-center text-sm font-semibold leading-5 tracking-normal text-input-text-primary max-md:max-w-full">
                  {t('REPORTS_HISTORY_LIST.PROJECT')}
                </div>

                {displayedProjectMenu}
              </div>
            </div>

            <div className="mt-10 font-semibold text-input-text-input-filled max-md:max-w-full">
              {t('EMBED_CODE_MODAL.WHAT_TYPE_OF_REPORT')}
            </div>
            <div className="mt-4 flex flex-wrap justify-between gap-1 text-input-text-input-filled sm:gap-2">
              <div
                className="flex gap-2 py-2.5"
                onClick={() => setIsBalanceSheetChecked(!isBalanceSheetChecked)}
              >
                <input
                  type="checkbox"
                  checked={isBalanceSheetChecked}
                  readOnly
                  className="my-auto h-4 w-4 shrink-0 appearance-none rounded-xxs border border-solid border-checkbox-surface-selected bg-white checked:border-checkbox-surface-selected checked:bg-checkbox-surface-selected checked:text-surface-neutral-main-background hover:cursor-pointer"
                />
                <button type="button">{t('PLUGIN.BALANCE_SHEET')}</button>
              </div>
              <div
                className="flex gap-2 py-2.5"
                onClick={() => setIsIncomeStatementChecked(!isIncomeStatementChecked)}
              >
                <input
                  type="checkbox"
                  checked={isIncomeStatementChecked}
                  readOnly
                  className="my-auto h-4 w-4 shrink-0 appearance-none rounded-xxs border border-solid border-checkbox-surface-selected bg-white checked:border-checkbox-surface-selected checked:bg-checkbox-surface-selected checked:text-surface-neutral-main-background hover:cursor-pointer"
                />
                <button type="button">{t('PLUGIN.COMPREHENSIVE_INCOME_STATEMENT')}</button>
              </div>
              <div
                className="flex gap-2 py-2.5"
                onClick={() => setIsCashFlowStatementChecked(!isCashFlowStatementChecked)}
              >
                <input
                  type="checkbox"
                  checked={isCashFlowStatementChecked}
                  readOnly
                  className="my-auto h-4 w-4 shrink-0 appearance-none rounded-xxs border border-solid border-checkbox-surface-selected bg-white checked:border-checkbox-surface-selected checked:bg-checkbox-surface-selected checked:text-surface-neutral-main-background hover:cursor-pointer"
                />
                <button type="button">{t('PLUGIN.CASH_FLOW_STATEMENT')}</button>
              </div>
            </div>
          </div>
          <div className="mt-10 flex flex-col justify-center max-md:max-w-full">
            <div className="flex flex-col space-y-3 max-md:max-w-full">
              <div className="text-sm font-semibold leading-5 tracking-normal text-input-text-input-filled max-md:max-w-full">
                {t('EMBED_CODE_MODAL.REPORT_LANGUAGE')}
              </div>
              {displayedLanguageMenu}
            </div>
          </div>
        </div>
      </div>
      <div className="flex w-full flex-col items-end justify-center whitespace-nowrap bg-white px-5 py-4 text-sm font-medium leading-5 tracking-normal max-md:max-w-full">
        <div className="flex gap-3">
          <button
            onClick={cancelClickHandler}
            className="rounded-sm px-4 py-2 text-secondaryBlue hover:text-primaryYellow"
          >
            {t('REPORTS_HISTORY_LIST.CANCEL')}
          </button>
          <Button
            disabled={
              !isBalanceSheetChecked && !isIncomeStatementChecked && !isCashFlowStatementChecked
            }
            variant={'tertiary'}
            onClick={generateClickHandler}
          >
            {t('EMBED_CODE_MODAL.GENERATE')}
          </Button>
        </div>
      </div>
    </>
  );

  const displayedEmbedCode = (
    <>
      <div className="flex w-full flex-col justify-center bg-white px-4 py-2.5">
        <div className="flex flex-col">
          <div className="w-300px justify-center self-center overflow-x-auto overflow-y-auto text-wrap border border-solid border-gray-300 bg-gray-100 px-3 py-4 text-sm leading-5 tracking-normal text-neutral-800 md:w-full">
            {generatedCode}
          </div>

          <div className="mt-3 flex flex-col justify-center space-y-3 text-base leading-6 tracking-normal text-input-text-input-filled max-md:max-w-full md:mt-8">
            <div className="flex space-x-3 text-input-text-primary">
              <Image src={'/icons/rocket.svg'} width={20} height={20} alt="rocket_icon" />
              <p className="text-input-text-primary"> {selectedProjectName}</p>
            </div>
            <ol className=" max-w-md list-disc space-y-2 pl-5 text-base tracking-normal md:max-w-xl lg:max-w-2xl lg:text-base">
              {isBalanceSheetChecked && <li>{t('PLUGIN.BALANCE_SHEET')}</li>}
              {isIncomeStatementChecked && <li>{t('PLUGIN.COMPREHENSIVE_INCOME_STATEMENT')}</li>}
              <li>{t('PLUGIN.COMPREHENSIVE_INCOME_STATEMENT')}</li>
              {isCashFlowStatementChecked && <li>{t('PLUGIN.CASH_FLOW_STATEMENT')}</li>}
              {!isBalanceSheetChecked &&
                !isIncomeStatementChecked &&
                !isCashFlowStatementChecked && (
                  <>
                    <li>{t('PLUGIN.BALANCE_SHEET')}</li>
                    <li>{t('PLUGIN.COMPREHENSIVE_INCOME_STATEMENT')}</li>
                    <li>{t('PLUGIN.CASH_FLOW_STATEMENT')}</li>
                  </>
                )}
            </ol>
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col items-end justify-center whitespace-nowrap bg-white px-5 py-4 text-sm font-medium leading-5 tracking-normal max-md:max-w-full">
        <Button variant={'tertiary'} onClick={copyClickHandler}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="none"
            viewBox="0 0 16 16"
          >
            <path
              fill="#FCFDFF"
              fillRule="evenodd"
              d="M11.426 2.786c-.407-.033-.932-.034-1.69-.034H5.001a.75.75 0 110-1.5h4.765c.72 0 1.306 0 1.78.039.492.04.93.125 1.34.333.642.328 1.165.85 1.493 1.493.208.41.293.848.333 1.34.039.474.039 1.06.039 1.78v4.765a.75.75 0 01-1.5 0V6.269c0-.76 0-1.284-.034-1.69-.032-.4-.092-.619-.175-.78a1.917 1.917 0 00-.838-.838c-.161-.083-.381-.143-.78-.175zm-7.319.8H9.563c.35 0 .656 0 .91.02.268.022.542.07.808.206.392.2.71.519.91.91.136.267.185.541.207.81.02.253.02.56.02.908v5.457c0 .35 0 .655-.02.908a2.12 2.12 0 01-.206.81c-.2.391-.519.71-.91.91a2.12 2.12 0 01-.81.206c-.253.021-.56.021-.909.021H4.107c-.35 0-.655 0-.909-.02a2.12 2.12 0 01-.809-.207c-.392-.2-.71-.519-.91-.91a2.118 2.118 0 01-.206-.81c-.021-.253-.021-.559-.021-.908V6.44c0-.349 0-.655.02-.908.023-.269.072-.543.207-.81.2-.391.518-.71.91-.91.266-.135.54-.184.81-.206.253-.02.559-.02.908-.02zM3.321 5.1c-.176.014-.231.038-.25.048a.583.583 0 00-.255.255c-.01.02-.034.074-.048.25a11.28 11.28 0 00-.016.815v5.4c0 .385 0 .63.016.814.014.176.038.231.048.25.055.11.145.2.254.255.02.01.075.034.25.048.185.015.43.016.815.016h5.4c.386 0 .63 0 .815-.016.176-.014.23-.038.25-.048a.583.583 0 00.255-.255c.01-.019.034-.074.048-.25.015-.184.016-.429.016-.814v-5.4c0-.386-.001-.63-.016-.815-.014-.176-.038-.23-.048-.25a.583.583 0 00-.255-.255c-.02-.01-.074-.034-.25-.048a11.28 11.28 0 00-.815-.016h-5.4c-.385 0-.63 0-.814.016z"
              clipRule="evenodd"
            ></path>
          </svg>
          <p>{t('EMBED_CODE_MODAL.COPY')}</p>
        </Button>
      </div>
    </>
  );

  const isDisplayedEmbedCodeModal = isModalVisible ? (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black bg-opacity-50 font-barlow">
      <div className="relative mx-auto flex flex-col items-center rounded-md bg-white p-6 shadow-lg shadow-black/80 sm:max-w-[511px] sm:px-3">
        <div className="flex w-full gap-2.5 bg-white pl-10 pr-5 max-md:max-w-full max-md:flex-wrap max-md:pl-5">
          <div className="flex flex-1 flex-col items-center justify-center px-20 pb-10 text-center max-md:px-5">
            <div className="justify-center text-xl font-bold leading-8 text-input-text-input-filled">
              {t('EMBED_CODE_MODAL.EMBED_CODE')}
            </div>
            <div className="text-xs leading-5 tracking-normal text-card-text-secondary">
              {t('EMBED_CODE_MODAL.THE_LATEST_REPORT')}
            </div>
          </div>
          <button
            onClick={cancelClickHandler}
            className="-mr-3 flex items-center justify-center self-start"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                fill="#314362"
                fillRule="evenodd"
                d="M6.223 6.22a.75.75 0 011.06 0l10.5 10.5a.75.75 0 01-1.06 1.061l-10.5-10.5a.75.75 0 010-1.06z"
                clipRule="evenodd"
              ></path>
              <path
                fill="#314362"
                fillRule="evenodd"
                d="M17.783 6.22a.75.75 0 010 1.061l-10.5 10.5a.75.75 0 11-1.06-1.06l10.5-10.5a.75.75 0 011.06 0z"
                clipRule="evenodd"
              ></path>
            </svg>
          </button>
        </div>
        {step === 0 ? displayedConfigSection : displayedEmbedCode}
      </div>
    </div>
  ) : null;

  return <>{isDisplayedEmbedCodeModal}</>;
};

export default EmbedCodeModal;
