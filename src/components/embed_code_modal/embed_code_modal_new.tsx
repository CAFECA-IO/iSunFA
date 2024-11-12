import React, { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { ReportLanguagesKey, ReportLanguagesMap } from '@/interfaces/report_language';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { Button } from '@/components/button/button';
import { useTranslation } from 'next-i18next';
import { RxCross2 } from 'react-icons/rx';
import { IoIosArrowDown, IoMdCheckmark } from 'react-icons/io';
import { PiCopySimpleBold } from 'react-icons/pi';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { useUserCtx } from '@/contexts/user_context';
import { ReportTypeToBaifaReportType } from '@/interfaces/report_type';
import { ISUNFA_ROUTE } from '@/constants/url';
import { useModalContext } from '@/contexts/modal_context';
import { ToastType } from '@/interfaces/toastify';

interface IEmbedCodeModal {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
}

const EmbedCodeModal = ({ isModalVisible, modalVisibilityHandler }: IEmbedCodeModal) => {
  const { t } = useTranslation(['common', 'report_401']);
  const { selectedCompany } = useUserCtx();
  const { toastHandler } = useModalContext();
  const balanceSheetRef = useRef<HTMLInputElement>(null);
  const incomeStatementRef = useRef<HTMLInputElement>(null);
  const cashFlowStatementRef = useRef<HTMLInputElement>(null);

  const [isBalanceSheetChecked, setIsBalanceSheetChecked] = useState(true);
  const [isIncomeStatementChecked, setIsIncomeStatementChecked] = useState(true);
  const [isCashFlowStatementChecked, setIsCashFlowStatementChecked] = useState(true);
  const [selectedReportLanguage, setSelectedReportLanguage] = useState<ReportLanguagesKey>(
    ReportLanguagesKey.en
  );
  const [step, setStep] = useState<number>(0);
  const [generatedCode, setGeneratedCode] = useState<string>('');

  // Info: (20241111 - Anna) Set the current date as default for report generation
  const todayDate = new Date().toISOString().split('T')[0];

  // Info: (20241111 - Anna) 使用 APIHandler 設置 REPORT_GENERATE API 的觸發功能
  const {
    trigger: generateFinancialReport, // Info: (20241111 - Anna) API 觸發方法
    code: reportId, // Info: (20241111 - Anna) 生成的報告 ID
    isLoading: isGenerating, // Info: (20241111 - Anna) 是否正在生成
    success: generateSuccess, // Info: (20241111 - Anna) 生成是否成功
    error: generateError, // Info: (20241111 - Anna) 錯誤信息
  } = APIHandler(APIName.REPORT_GENERATE); // Info: (20241111 - Anna) 使用 APIHandler 設置 API

  const {
    targetRef: languageMenuRef,
    componentVisible: isLanguageMenuOpen,
    setComponentVisible: setIsLanguageMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const selectedLanguage = ReportLanguagesMap[selectedReportLanguage];

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
    navigator.clipboard
      .writeText(generatedCode)
      .then(() => {
        // Info: (20241111 - Anna) 使用 toastHandler 顯示複製成功提示
        toastHandler({
          id: 'copy-success', // Info: (20241111 - Anna) 固定的唯一標識
          type: ToastType.SUCCESS,
          content: '複製成功！',
          closeable: true,
        });
      })
      .catch(() => {
        // Info: (20241111 - Anna) 使用 toastHandler 顯示複製失敗提示
        toastHandler({
          id: 'copy-error', // Info: (20241111 - Anna) 固定的唯一標識
          type: ToastType.ERROR,
          content: '複製失敗！',
          closeable: true,
        });
      });
  };

  // Info: (20241111 - Anna) 在 generateClickHandler 中設置生成報告所需的參數並使用 todayDate
  const generateClickHandler = async () => {
    setStep(1);

    const reportTypes = [
      isBalanceSheetChecked ? 'balance' : null,
      isIncomeStatementChecked ? 'comprehensive-income' : null,
      isCashFlowStatementChecked ? 'cash-flow' : null,
    ].filter(Boolean);

    // Info: (20241111 - Anna) 確保包含 selectedCompany 作為參數
    if (selectedCompany) {
      try {
        await generateFinancialReport({
          params: {
            companyId: selectedCompany.id,
          },
          body: {
            date: todayDate, // Info: (20241111 - Anna) 使用當前預設日期
            language: selectedReportLanguage,
            reportTypes,
          },
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error generating report:', generateError);
      }
    } else {
      // eslint-disable-next-line no-console
      console.warn('No company selected for report generation');
    }
  };

  // Info: (20241111 - Anna) 使用 useEffect 監聽生成成功，並更新 iframe 嵌入代碼
  useEffect(() => {
    if (generateSuccess && reportId) {
      //   const balanceLink = `https://isunfa.com/users/reports/financials/view/${reportId}?report_type=balance`;
      //   const comprehensiveIncomeLink = `https://isunfa.com/users/reports/financials/view/${reportId}?report_type=comprehensive-income`;
      //   const cashFlowLink = `https://isunfa.com/users/reports/financials/view/${reportId}?report_type=cash-flow`;

      // Info: (20241111 - Anna) 使用 ISUNFA_ROUTE 和 ReportTypeToBaifaReportType 的新鏈接格式
      const balanceLink = `${ISUNFA_ROUTE.USERS_FINANCIAL_REPORTS_VIEW}/${reportId}?report_type=${ReportTypeToBaifaReportType.balance_sheet}`;
      const comprehensiveIncomeLink = `${ISUNFA_ROUTE.USERS_FINANCIAL_REPORTS_VIEW}/${reportId}?report_type=${ReportTypeToBaifaReportType.comprehensive_income_statement}`;
      const cashFlowLink = `${ISUNFA_ROUTE.USERS_FINANCIAL_REPORTS_VIEW}/${reportId}?report_type=${ReportTypeToBaifaReportType.cash_flow_statement}`;

      let code = '';

      if (
        balanceSheetRef.current?.checked &&
        !incomeStatementRef.current?.checked &&
        !cashFlowStatementRef.current?.checked
      ) {
        code = `<iframe src="${balanceLink}" title="balance-sheet" width={600} height={600} />`;
      } else if (
        !balanceSheetRef.current?.checked &&
        incomeStatementRef.current?.checked &&
        !cashFlowStatementRef.current?.checked
      ) {
        code = `<iframe src="${comprehensiveIncomeLink}" title="comprehensive-income-statement" width={600} height={600} />`;
      } else if (
        !balanceSheetRef.current?.checked &&
        !incomeStatementRef.current?.checked &&
        cashFlowStatementRef.current?.checked
      ) {
        code = `<iframe src="${cashFlowLink}" title="cash-flow-statement" width={600} height={600} />`;
      } else {
        // Info: (20241111 - Anna)  如果選擇多個或全部報告，生成多個 <iframe> 標籤
        code = `
      <div>
        ${balanceSheetRef.current?.checked ? `<iframe src="${balanceLink}" title="balance-sheet" width={600} height={600}></iframe>` : ''}
        ${incomeStatementRef.current?.checked ? `<iframe src="${comprehensiveIncomeLink}" title="comprehensive-income-statement" width={600} height={600}></iframe>` : ''}
        ${cashFlowStatementRef.current?.checked ? `<iframe src="${cashFlowLink}" title="cash-flow-statement" width={600} height={600}></iframe>` : ''}
      </div>
    `;
      }

      setGeneratedCode(code);
    }
  }, [generateSuccess, reportId]);

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
              <div className="flex flex-col gap-3 max-md:max-w-full"></div>
            </div>

            <div className="mt-26px font-semibold text-input-text-input-filled max-md:max-w-full">
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
              (!isBalanceSheetChecked &&
                !isIncomeStatementChecked &&
                !isCashFlowStatementChecked) ||
              isGenerating // Info: (20241111 - Anna) 當 `isGenerating` 為 `true` 時禁用按鈕
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

          <div className="flex w-full flex-col items-end justify-center whitespace-nowrap px-5 py-4 text-sm font-medium leading-5 tracking-normal max-md:max-w-full">
            <Button
              className="bg-transparent !px-0 text-navy-blue-600 hover:bg-transparent focus:bg-transparent"
              variant={'tertiary'}
              onClick={copyClickHandler}
            >
              <PiCopySimpleBold size={16} />
              <p>{t('report_401:EMBED_CODE_MODAL.COPY')}</p>
            </Button>
          </div>

          <div className="mt-3 flex flex-col justify-center space-y-3 text-base leading-6 tracking-normal text-input-text-input-filled max-md:max-w-full md:mt-8">
            <ol className="max-w-md space-y-2 text-base tracking-normal md:max-w-xl lg:max-w-2xl lg:text-base">
              {isBalanceSheetChecked && (
                <li className="flex items-center gap-1">
                  <IoMdCheckmark />
                  {t('common:PLUGIN.BALANCE_SHEET')}
                </li>
              )}
              {isIncomeStatementChecked && (
                <li className="flex items-center gap-1">
                  <IoMdCheckmark />
                  {t('common:PLUGIN.COMPREHENSIVE_INCOME_STATEMENT')}
                </li>
              )}
              {isCashFlowStatementChecked && (
                <li className="flex items-center gap-1">
                  <IoMdCheckmark />
                  {t('common:PLUGIN.CASH_FLOW_STATEMENT')}
                </li>
              )}
              {!isBalanceSheetChecked &&
                !isIncomeStatementChecked &&
                !isCashFlowStatementChecked && (
                  <>
                    <li className="flex items-center gap-1">
                      <IoMdCheckmark />
                      {t('common:PLUGIN.BALANCE_SHEET')}
                    </li>
                    <li className="flex items-center gap-1">
                      <IoMdCheckmark />
                      {t('common:PLUGIN.COMPREHENSIVE_INCOME_STATEMENT')}
                    </li>
                    <li className="flex items-center gap-1">
                      <IoMdCheckmark />
                      {t('common:PLUGIN.CASH_FLOW_STATEMENT')}
                    </li>
                  </>
                )}
            </ol>
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col items-end justify-center whitespace-nowrap px-5 py-4 text-sm font-medium leading-5 tracking-normal max-md:max-w-full">
        <Button variant={'tertiary'} onClick={cancelClickHandler}>
          <p>{t('common:COMMON.CANCEL')}</p>
        </Button>
      </div>
    </>
  );

  const isDisplayedEmbedCodeModal = isModalVisible ? (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50 font-barlow">
      <div className="relative mx-auto flex flex-col items-center rounded-md bg-card-surface-primary p-6 shadow-lg shadow-black/80 sm:max-w-lg sm:px-3">
        <div className="flex w-full gap-2.5 pl-10 pr-5 max-md:max-w-full max-md:flex-wrap max-md:pl-5">
          <div className="flex flex-1 flex-col items-center justify-center px-20 text-center max-md:px-5">
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
