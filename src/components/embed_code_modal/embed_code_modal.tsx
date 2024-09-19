import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ReportLanguagesKey, ReportLanguagesMap } from '@/interfaces/report_language';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { Button } from '@/components/button/button';
import { DUMMY_PROJECTS_MAP } from '@/interfaces/report_project';
import { useTranslation } from 'next-i18next';
import { RxCross2 } from 'react-icons/rx';
import { IoIosArrowDown } from 'react-icons/io';
import { FiSearch } from 'react-icons/fi';
import { PiCopySimple } from 'react-icons/pi';

interface IEmbedCodeModal {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
}

const EmbedCodeModal = ({ isModalVisible, modalVisibilityHandler }: IEmbedCodeModal) => {
  const { t } = useTranslation(['common', 'report_401']);
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
  };

  const generateClickHandler = () => {
    setStep(1);

    // TODO: (20240507 - Shirley) [Beta] dummy data
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
            {selectedProjectName === 'Overall' ? t('common:COMMON.OVERALL') : selectedProjectName}
          </div>

          <div className="my-auto flex flex-col justify-center">
            <IoIosArrowDown size={20} className="text-icon-surface-single-color-primary" />
          </div>
        </button>
      </div>

      {/* Info: (20240425 - Shirley) Project Menu */}
      <div
        className={`absolute left-0 top-56px z-20 grid w-full grid-cols-1 overflow-hidden rounded-sm border transition-all duration-300 ease-in-out ${
          isProjectMenuOpen
            ? 'grid-rows-1 border-dropdown-stroke-menu shadow-dropmenu'
            : 'grid-rows-0 border-transparent'
        }`}
      >
        <ul className="z-10 flex w-full flex-col items-start bg-input-surface-input-background p-2">
          <div className="flex w-full max-w-xl items-center justify-between gap-5 self-center whitespace-nowrap rounded-sm border border-solid border-dropdown-stroke-menu bg-input-surface-input-background px-3 py-2.5 text-base leading-6 tracking-normal shadow-sm">
            <input
              type="text"
              placeholder={t('common:COMMON.SEARCH')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border-none text-input-text-input-filled focus:outline-none"
            />
            <FiSearch size={20} className="text-icon-surface-single-color-primary" />
          </div>
          {/* Info: (20240830 - Anna) 為了解決Unexpected newline before '}'錯誤，請prettier不要格式化 */}
          {/* prettier-ignore */}
          <div className="mt-2 max-h-60 w-full overflow-y-auto">
            {Object.keys(DUMMY_PROJECTS_MAP)
              .filter((project) =>
                DUMMY_PROJECTS_MAP[project as keyof typeof DUMMY_PROJECTS_MAP].name
                  .toLowerCase()
                  .includes(searchQuery.toLowerCase()))
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

  const displayedLanguageMenu = (
    <div ref={languageMenuRef} className="relative flex w-full">
      <button
        className={`flex w-full items-center justify-between gap-0 space-x-5 rounded-sm border bg-input-surface-input-selected px-3 py-2.5 max-md:max-w-full ${
          isLanguageMenuOpen ? 'border-input-stroke-selected' : 'border-dropdown-stroke-menu'
        }`}
        onClick={languageMenuClickHandler}
        type="button"
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
        <div className="my-auto flex flex-col justify-center">
          <IoIosArrowDown size={20} className="text-icon-surface-single-color-primary" />
        </div>
      </button>
      {/* Info: (20240425 - Shirley) Language Menu */}
      <div
        className={`absolute left-0 top-56px z-20 grid w-full grid-cols-1 overflow-hidden rounded-sm border transition-all duration-300 ease-in-out ${
          isLanguageMenuOpen
            ? 'grid-rows-1 border-dropdown-stroke-menu shadow-dropmenu'
            : 'grid-rows-0 border-transparent'
        }`}
      >
        <ul className="z-10 flex w-full flex-col items-start bg-dropdown-surface-menu-background-primary p-2">
          {Object.entries(ReportLanguagesMap).map(([id, { name, icon }]) => (
            <li
              key={id}
              onClick={() => languageMenuOptionClickHandler(id as ReportLanguagesKey)}
              className="mt-1 flex w-full cursor-pointer items-center space-x-5 px-1 py-2.5 text-dropdown-text-primary hover:text-text-brand-primary-lv2"
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
      <div className="flex w-full flex-col justify-center px-4 py-2.5 max-md:max-w-full">
        <div className="flex flex-col max-md:max-w-full">
          <div className="flex flex-col justify-end text-sm leading-5 tracking-normal max-md:max-w-full">
            <div className="flex flex-col justify-center max-md:max-w-full">
              <div className="flex flex-col gap-3 max-md:max-w-full">
                <div className="justify-center text-sm font-semibold leading-5 tracking-normal text-input-text-primary max-md:max-w-full">
                  {t('common:COMMON.PROJECT')}
                </div>

                {displayedProjectMenu}
              </div>
            </div>

            <div className="mt-10 font-semibold text-input-text-input-filled max-md:max-w-full">
              {t('report_401:EMBED_CODE_MODAL.WHAT_TYPE_OF_REPORT')}
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
                  className="my-auto h-4 w-4 shrink-0 appearance-none rounded-xxs border border-solid border-checkbox-surface-selected checked:border-checkbox-surface-selected checked:bg-checkbox-surface-selected checked:text-surface-neutral-main-background hover:cursor-pointer"
                />
                <button type="button">{t('common:PLUGIN.BALANCE_SHEET')}</button>
              </div>
              <div
                className="flex gap-2 py-2.5"
                onClick={() => setIsIncomeStatementChecked(!isIncomeStatementChecked)}
              >
                <input
                  type="checkbox"
                  checked={isIncomeStatementChecked}
                  readOnly
                  className="my-auto h-4 w-4 shrink-0 appearance-none rounded-xxs border border-solid border-checkbox-surface-selected checked:border-checkbox-surface-selected checked:bg-checkbox-surface-selected checked:text-surface-neutral-main-background hover:cursor-pointer"
                />
                <button type="button">{t('common:PLUGIN.COMPREHENSIVE_INCOME_STATEMENT')}</button>
              </div>
              <div
                className="flex gap-2 py-2.5"
                onClick={() => setIsCashFlowStatementChecked(!isCashFlowStatementChecked)}
              >
                <input
                  type="checkbox"
                  checked={isCashFlowStatementChecked}
                  readOnly
                  className="my-auto h-4 w-4 shrink-0 appearance-none rounded-xxs border border-solid border-checkbox-surface-selected checked:border-checkbox-surface-selected checked:bg-checkbox-surface-selected checked:text-surface-neutral-main-background hover:cursor-pointer"
                />
                <button type="button">{t('common:PLUGIN.CASH_FLOW_STATEMENT')}</button>
              </div>
            </div>
          </div>
          <div className="mt-10 flex flex-col justify-center max-md:max-w-full">
            <div className="flex flex-col space-y-3 max-md:max-w-full">
              <div className="text-sm font-semibold leading-5 tracking-normal text-input-text-input-filled max-md:max-w-full">
                {t('report_401:EMBED_CODE_MODAL.REPORT_LANGUAGE')}
              </div>
              {displayedLanguageMenu}
            </div>
          </div>
        </div>
      </div>
      <div className="flex w-full flex-col items-end justify-center whitespace-nowrap px-5 py-4 text-sm font-medium leading-5 tracking-normal max-md:max-w-full">
        <div className="flex gap-3">
          <Button type="button" onClick={cancelClickHandler} variant="tertiaryBorderless">
            {t('common:COMMON.CANCEL')}
          </Button>
          <Button
            disabled={
              !isBalanceSheetChecked && !isIncomeStatementChecked && !isCashFlowStatementChecked
            }
            variant={'tertiary'}
            onClick={generateClickHandler}
          >
            {t('report_401:EMBED_CODE_MODAL.GENERATE')}
          </Button>
        </div>
      </div>
    </>
  );

  const displayedEmbedCode = (
    <>
      <div className="flex w-full flex-col justify-center px-4 py-2.5">
        <div className="flex flex-col">
          <div className="w-300px justify-center self-center overflow-x-auto overflow-y-auto text-wrap border border-solid border-stroke-neutral-quaternary bg-surface-neutral-main-background px-3 py-4 text-sm leading-5 tracking-normal text-neutral-800 md:w-full">
            {generatedCode}
          </div>

          <div className="mt-3 flex flex-col justify-center space-y-3 text-base leading-6 tracking-normal text-input-text-input-filled max-md:max-w-full md:mt-8">
            <div className="flex space-x-3 text-input-text-primary">
              <Image src={'/icons/rocket.svg'} width={20} height={20} alt="rocket_icon" />
              <p className="text-input-text-primary">
                {t(
                  `project:PROJECT.${DUMMY_PROJECTS_MAP[selectedProjectName].name.toUpperCase().replace(/ /g, '_')}`
                )}
              </p>
            </div>
            <ol className="max-w-md list-disc space-y-2 pl-5 text-base tracking-normal md:max-w-xl lg:max-w-2xl lg:text-base">
              {isBalanceSheetChecked && <li>{t('common:PLUGIN.BALANCE_SHEET')}</li>}
              {isIncomeStatementChecked && (
                <li>{t('common:PLUGIN.COMPREHENSIVE_INCOME_STATEMENT')}</li>
              )}
              <li>{t('common:PLUGIN.COMPREHENSIVE_INCOME_STATEMENT')}</li>
              {isCashFlowStatementChecked && <li>{t('common:PLUGIN.CASH_FLOW_STATEMENT')}</li>}
              {!isBalanceSheetChecked &&
                !isIncomeStatementChecked &&
                !isCashFlowStatementChecked && (
                  <>
                    <li>{t('common:PLUGIN.BALANCE_SHEET')}</li>
                    <li>{t('common:PLUGIN.COMPREHENSIVE_INCOME_STATEMENT')}</li>
                    <li>{t('common:PLUGIN.CASH_FLOW_STATEMENT')}</li>
                  </>
                )}
            </ol>
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col items-end justify-center whitespace-nowrap px-5 py-4 text-sm font-medium leading-5 tracking-normal max-md:max-w-full">
        <Button variant={'tertiary'} onClick={copyClickHandler}>
          <PiCopySimple size={16} />
          <p>{t('report_401:EMBED_CODE_MODAL.COPY')}</p>
        </Button>
      </div>
    </>
  );

  const isDisplayedEmbedCodeModal = isModalVisible ? (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50 font-barlow">
      <div className="relative mx-auto flex flex-col items-center rounded-md bg-card-surface-primary p-6 shadow-lg shadow-black/80 sm:max-w-lg sm:px-3">
        <div className="flex w-full gap-2.5 pl-10 pr-5 max-md:max-w-full max-md:flex-wrap max-md:pl-5">
          <div className="flex flex-1 flex-col items-center justify-center px-20 pb-10 text-center max-md:px-5">
            <div className="justify-center text-xl font-bold leading-8 text-input-text-input-filled">
              {t('report_401:EMBED_CODE_MODAL.EMBED_CODE')}
            </div>
            <div className="text-xs leading-5 tracking-normal text-card-text-secondary">
              {t('report_401:EMBED_CODE_MODAL.THE_LATEST_REPORT')}
            </div>
          </div>
          <button
            onClick={cancelClickHandler}
            type="button"
            className="-mr-3 flex items-center justify-center self-start"
          >
            <RxCross2 size={20} />
          </button>
        </div>
        {step === 0 ? displayedConfigSection : displayedEmbedCode}
      </div>
    </div>
  ) : null;

  return isDisplayedEmbedCodeModal;
};

export default EmbedCodeModal;
