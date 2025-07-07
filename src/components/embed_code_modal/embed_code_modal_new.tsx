import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { ReportLanguagesKey, ReportLanguagesMap } from '@/interfaces/report_language';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { Button } from '@/components/button/button';
import { useTranslation } from 'next-i18next';
import { useUserCtx } from '@/contexts/user_context';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { FinancialReportTypesKeyReportSheetTypeMapping, ReportType } from '@/constants/report';
import dayjs from 'dayjs';
import { FinancialReportTypesKey, ReportTypeToBaifaReportType } from '@/interfaces/report_type';
import { RxCross2 } from 'react-icons/rx';
import { IoIosArrowDown, IoMdCheckmark } from 'react-icons/io';
import { PiCopySimpleBold } from 'react-icons/pi';
import { IFinancialReportRequest } from '@/interfaces/report';
import { ToastType } from '@/interfaces/toastify';
import { useModalContext } from '@/contexts/modal_context';
import loggerFront from '@/lib/utils/logger_front';

interface IEmbedCodeModal {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
}

const EmbedCodeModal = ({ isModalVisible, modalVisibilityHandler }: IEmbedCodeModal) => {
  const { t } = useTranslation(['common', 'reports']);
  const { connectedAccountBook } = useUserCtx();
  const { toastHandler } = useModalContext();
  // Info: (20241127 - Anna) 追蹤是否點擊了生成按鈕
  const [isGenerateClicked, setIsGenerateClicked] = useState(false);
  const [isBalanceSheetChecked, setIsBalanceSheetChecked] = useState(true);
  const [isIncomeStatementChecked, setIsIncomeStatementChecked] = useState(true);
  const [isCashFlowStatementChecked, setIsCashFlowStatementChecked] = useState(true);
  const [selectedReportLanguage, setSelectedReportLanguage] = useState<ReportLanguagesKey>(
    ReportLanguagesKey.tw
  );
  const [step, setStep] = useState<number>(0);
  const [generatedIframeCode, setGeneratedIframeCode] = useState<string>('');

  const {
    targetRef: languageMenuRef,
    componentVisible: isLanguageMenuOpen,
    setComponentVisible: setIsLanguageMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const selectedLanguage = ReportLanguagesMap[selectedReportLanguage];

  // Info: (20241125 - Anna)
  const {
    trigger: generateFinancialReport,
    code: generatedCode,
    isLoading: generatedLoading,
    success: generatedSuccess,
  } = APIHandler<number | null>(APIName.REPORT_GENERATE);

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
    navigator.clipboard.writeText(generatedIframeCode).then(
      () => {
        // Info: (20241210 - Anna) 複製成功的吐司通知
        toastHandler({
          id: 'copyIframeCodeSuccess',
          type: ToastType.SUCCESS,
          content: t('layout:EMBED_CODE_MODAL.COPIED'),
          closeable: true,
        });
      },
      (error) => {
        // Info: (20241210 - Anna) 複製失敗的吐司通知
        toastHandler({
          id: 'copyIframeCodeError',
          type: ToastType.ERROR,
          content: t('layout:EMBED_CODE_MODAL.COPY_FAILED'),
          closeable: true,
        });
        loggerFront.error('Failed to copy iframe code:', error);
      }
    );
  };

  const generateClickHandler = () => {
    setStep(1);
  };

  useEffect(() => {
    if (generatedCode && !generatedLoading && generatedSuccess) {
      const selectedReportTypes = [];
      if (isBalanceSheetChecked) {
        selectedReportTypes.push(FinancialReportTypesKey.balance_sheet);
      }
      if (isIncomeStatementChecked) {
        selectedReportTypes.push(FinancialReportTypesKey.comprehensive_income_statement);
      }
      if (isCashFlowStatementChecked) {
        selectedReportTypes.push(FinancialReportTypesKey.cash_flow_statement);
      }
    }

    // Info: (20241130 - Anna) 確保返回 void
  }, [generatedCode, generatedLoading, generatedSuccess]);

  const generateReportHandler = async () => {
    const getPeriod = () => {
      const today = dayjs().startOf('day'); // Info: (20241130 - Anna) 拿今天日期
      return {
        startTimeStamp: today.subtract(3, 'month').unix(), // Info: (20241130 - Anna) 三個月前
        endTimeStamp: today.unix(), // Info: (20241130 - Anna) 今天
      };
    };

    const period = getPeriod();

    if (!period) {
      return;
    }

    const selectedReportTypes = [];
    if (isBalanceSheetChecked) selectedReportTypes.push(FinancialReportTypesKey.balance_sheet);
    if (isIncomeStatementChecked) {
      selectedReportTypes.push(FinancialReportTypesKey.comprehensive_income_statement);
    }
    if (isCashFlowStatementChecked) {
      selectedReportTypes.push(FinancialReportTypesKey.cash_flow_statement);
    }

    if (selectedReportTypes.length === 0) {
      return;
    }

    if (connectedAccountBook) {
      const iframeCodes: string[] = [];

      // Info: (20241213 - Anna) 設置序號初始值
      let sequenceNumber = 1;

      await Promise.all(
        selectedReportTypes.map(async (reportType) => {
          const body: IFinancialReportRequest = {
            type: FinancialReportTypesKeyReportSheetTypeMapping[reportType], // Info: (20241130 - Anna) 每次迭代報告類型
            reportLanguage: selectedReportLanguage,
            from: period.startTimeStamp,
            to: period.endTimeStamp,
            reportType: ReportType.FINANCIAL,
          };

          try {
            const report = await generateFinancialReport({
              params: { accountBookId: connectedAccountBook.id },
              body,
            });

            const reportId = report.data; // Info: (20241130 - Anna) 從 API 響應中拿 reportId

            // Info: (20241213 - Anna) 動態生成link，增加 id 不然只會顯示一張報表
            const reportLink = `https://isunfa.tw/embed/view/${reportId}?report_type=${ReportTypeToBaifaReportType[reportType]}&_id=${sequenceNumber}`;

            // Info: (20241213 - Anna) 增加序號
            sequenceNumber += 1;

            // Info: (20241130 - Anna) 生成 iframe
            iframeCodes.push(
              `<iframe src="${reportLink}" title="${reportType}" width="1280" height="720"></iframe>`
            );
          } catch (error) {
            loggerFront.error(`Failed to generate report for type: ${reportType}`, error);
          }
        })
      );

      if (iframeCodes.length > 0) {
        setGeneratedIframeCode(iframeCodes.join('\n')); // Info: (20241130 - Anna) 設置 iframe 到狀態
      }
    }

    setIsGenerateClicked(false); // Info: (20241130 - Anna) 重置按鈕
  };

  const handleGenerateClick = () => {
    setIsGenerateClicked(true); // Info: (20241126 - Anna) 點擊按鈕時設置為 true
    generateClickHandler(); // Info: (20241126 - Anna) 第一次處理
    generateReportHandler(); // Info: (20241126 - Anna) 第二次處理
  };

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
          {Object.entries(ReportLanguagesMap).map(([id, { name, icon }]) => {
            const isDisabled = id !== ReportLanguagesKey.tw; // Info: (20250602 - Anna) 目前只有繁體中文可用

            return (
              <li
                key={id}
                onClick={() => {
                  if (!isDisabled) {
                    languageMenuOptionClickHandler(id as ReportLanguagesKey);
                  }
                }}
                className={`mt-1 flex w-full items-center space-x-5 px-1 py-2.5 ${
                  isDisabled
                    ? 'cursor-default text-neutral-300'
                    : 'cursor-pointer text-dropdown-text-primary hover:text-text-brand-primary-lv2'
                }`}
              >
                <Image src={icon} alt={name} width={20} height={20} />
                <p className="text-base font-medium leading-5 tracking-normal">{name}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );

  const displayedConfigSection = (
    <>
      <div className="flex w-full flex-col justify-center px-4 py-2.5 max-md:max-w-full">
        <div className="flex flex-col max-md:max-w-full">
          <div className="flex flex-col justify-end text-sm leading-5 tracking-normal max-md:max-w-full">
            <div className="flex flex-col justify-center max-md:max-w-full"></div>

            <div className="mt-5 font-semibold text-neutral-300 max-md:max-w-full">
              {t('layout:EMBED_CODE_MODAL.WHAT_TYPE_OF_REPORT')}
            </div>
            <div className="mt-4 flex flex-col flex-wrap justify-between gap-1 text-input-text-input-filled sm:gap-2 tablet:flex-row">
              <div
                className="flex gap-2 py-2.5"
                onClick={() => {
                  setIsBalanceSheetChecked(!isBalanceSheetChecked);
                }}
              >
                <input
                  type="checkbox"
                  checked={isBalanceSheetChecked}
                  readOnly
                  className="my-auto h-4 w-4 shrink-0 appearance-none rounded-xxs border border-solid border-checkbox-surface-selected checked:border-checkbox-surface-selected checked:bg-checkbox-surface-selected checked:text-surface-neutral-main-background hover:cursor-pointer"
                />
                <button type="button">{t('layout:EMBED_CODE_MODAL.BALANCE_SHEET')}</button>
              </div>
              <div
                className="flex gap-2 py-2.5"
                onClick={() => {
                  setIsIncomeStatementChecked(!isIncomeStatementChecked);
                }}
              >
                <input
                  type="checkbox"
                  checked={isIncomeStatementChecked}
                  readOnly
                  className="my-auto h-4 w-4 shrink-0 appearance-none rounded-xxs border border-solid border-checkbox-surface-selected checked:border-checkbox-surface-selected checked:bg-checkbox-surface-selected checked:text-surface-neutral-main-background hover:cursor-pointer"
                />
                <button type="button">
                  {t('layout:EMBED_CODE_MODAL.COMPREHENSIVE_INCOME_STATEMENT')}
                </button>
              </div>
              <div
                className="flex gap-2 py-2.5"
                onClick={() => {
                  setIsCashFlowStatementChecked(!isCashFlowStatementChecked);
                }}
              >
                <input
                  type="checkbox"
                  checked={isCashFlowStatementChecked}
                  readOnly
                  className="my-auto h-4 w-4 shrink-0 appearance-none rounded-xxs border border-solid border-checkbox-surface-selected checked:border-checkbox-surface-selected checked:bg-checkbox-surface-selected checked:text-surface-neutral-main-background hover:cursor-pointer"
                />
                <button type="button">{t('layout:EMBED_CODE_MODAL.CASH_FLOW_STATEMENT')}</button>
              </div>
            </div>
          </div>
          <div className="mt-10 flex flex-col justify-center max-md:max-w-full">
            <div className="flex flex-col space-y-3 max-md:max-w-full">
              <div className="text-sm font-semibold leading-5 tracking-normal text-neutral-300 max-md:max-w-full">
                {t('layout:EMBED_CODE_MODAL.REPORT_LANGUAGE')}
              </div>
              {displayedLanguageMenu}
            </div>
          </div>
        </div>
      </div>
      <div className="flex w-full flex-col items-end justify-center whitespace-nowrap px-5 py-4 text-sm font-medium leading-5 tracking-normal max-md:max-w-full">
        <div className="flex gap-3">
          <Button type="button" onClick={cancelClickHandler} variant="tertiaryOutline">
            {t('layout:EMBED_CODE_MODAL.CANCEL')}
          </Button>
          {/* Info: (20241128 - Anna) 當 isGenerateClicked 為 true 時，按鈕會被禁用，防止重複點擊。 */}
          <Button
            disabled={
              (!isBalanceSheetChecked &&
                !isIncomeStatementChecked &&
                !isCashFlowStatementChecked) ||
              isGenerateClicked
            }
            variant={'tertiary'}
            // Info: (20241125 - Anna)
            // onClick={generateClickHandler}
            // onClick={generateReportHandler}
            onClick={handleGenerateClick}
          >
            {t('layout:EMBED_CODE_MODAL.GENERATE')}
          </Button>
        </div>
      </div>
    </>
  );

  const displayedEmbedCode = (
    <>
      <div className="flex w-full flex-col justify-center px-4 py-2.5">
        <div className="flex flex-col">
          <div className="hide-scrollbar w-300px justify-center self-center overflow-x-auto overflow-y-auto text-wrap border border-solid border-stroke-neutral-quaternary bg-surface-neutral-main-background px-3 py-4 text-sm leading-5 tracking-normal text-neutral-800 md:w-full">
            {generatedIframeCode}
          </div>

          <div className="flex w-full flex-col items-end justify-center whitespace-nowrap px-5 py-4 text-sm font-medium leading-5 tracking-normal max-md:max-w-full">
            <Button
              className="bg-transparent !px-0 text-navy-blue-600 hover:bg-transparent focus:bg-transparent"
              variant={'tertiary'}
              onClick={copyClickHandler}
            >
              <PiCopySimpleBold size={16} />
              <p>{t('layout:EMBED_CODE_MODAL.COPY')}</p>
            </Button>
          </div>

          <div className="mt-3 flex flex-col justify-center space-y-3 text-base leading-6 tracking-normal text-input-text-input-filled max-md:max-w-full md:mt-8">
            <ol className="max-w-md space-y-2 text-base tracking-normal md:max-w-xl lg:max-w-2xl lg:text-base">
              {isBalanceSheetChecked && (
                <li className="flex items-center gap-1">
                  <IoMdCheckmark />
                  <span className="text-neutral-300">
                    {t('layout:EMBED_CODE_MODAL.BALANCE_SHEET')}
                  </span>
                </li>
              )}
              {isIncomeStatementChecked && (
                <li className="flex items-center gap-1">
                  <IoMdCheckmark />
                  <span className="text-neutral-300">
                    {t('layout:EMBED_CODE_MODAL.COMPREHENSIVE_INCOME_STATEMENT')}
                  </span>
                </li>
              )}
              {isCashFlowStatementChecked && (
                <li className="flex items-center gap-1">
                  <IoMdCheckmark />
                  <span className="text-neutral-300">
                    {t('layout:EMBED_CODE_MODAL.CASH_FLOW_STATEMENT')}
                  </span>
                </li>
              )}
              {!isBalanceSheetChecked &&
                !isIncomeStatementChecked &&
                !isCashFlowStatementChecked && (
                  <>
                    <li className="flex items-center gap-1">
                      <IoMdCheckmark />
                      {t('layout:EMBED_CODE_MODAL.BALANCE_SHEET')}
                    </li>
                    <li className="flex items-center gap-1">
                      <IoMdCheckmark />
                      {t('layout:EMBED_CODE_MODAL.COMPREHENSIVE_INCOME_STATEMENT')}
                    </li>
                    <li className="flex items-center gap-1">
                      <IoMdCheckmark />
                      {t('layout:EMBED_CODE_MODAL.CASH_FLOW_STATEMENT')}
                    </li>
                  </>
                )}
            </ol>
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col items-end justify-center whitespace-nowrap px-5 py-4 text-sm font-medium leading-5 tracking-normal max-md:max-w-full">
        <Button variant={'tertiary'} onClick={cancelClickHandler}>
          <p>{t('layout:EMBED_CODE_MODAL.CLOSE')}</p>
        </Button>
      </div>
    </>
  );

  const isDisplayedEmbedCodeModal = isModalVisible ? (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50 font-barlow">
      <div className="relative mx-auto flex max-w-90vw flex-col items-center rounded-md bg-card-surface-primary p-6 shadow-lg shadow-black/80 sm:max-w-lg sm:px-3">
        <div className="flex w-full gap-2.5 pl-10 pr-5 max-md:max-w-full max-md:flex-wrap max-md:pl-5">
          <div className="flex flex-1 flex-col items-center justify-center px-20 text-center max-md:px-5">
            <div className="justify-center text-xl font-bold leading-8 text-input-text-input-filled">
              {t('layout:SIDE_MENU.EMBED_CODE')}
            </div>
            <div className="text-xs leading-5 tracking-normal text-neutral-400">
              {t('layout:EMBED_CODE_MODAL.THE_LATEST_REPORT')}
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
