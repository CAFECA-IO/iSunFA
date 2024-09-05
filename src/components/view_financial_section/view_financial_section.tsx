import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/button/button';
import { FinancialReportTypesKey } from '@/interfaces/report_type';
import { ISUNFA_ROUTE } from '@/constants/url';
// import { useGlobalCtx } from '@/contexts/global_context';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
// import { ToastType } from '@/interfaces/toastify';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import {
  BalanceSheetReport,
  CashFlowStatementReport,
  FinancialReport,
  IncomeStatementReport,
  // TaxReport401,
} from '@/interfaces/report';
import { useUserCtx } from '@/contexts/user_context';
import { ReportSheetType, ReportSheetTypeDisplayMap } from '@/constants/report';
import Skeleton from '@/components/skeleton/skeleton';
import { NON_EXISTING_REPORT_ID } from '@/constants/config';
import { useTranslation } from 'next-i18next';
import { MILLISECONDS_IN_A_SECOND, WAIT_FOR_REPORT_DATA } from '@/constants/display';
import { useRouter } from 'next/router';

interface IViewReportSectionProps {
  reportTypesName: { id: FinancialReportTypesKey; name: string };

  tokenContract: string;
  tokenId: string;
  reportLink: string;
  reportId: string;
}
// Info: (20240815 - Anna)增加類型保護函數
function isTaxReport401(report: FinancialReport): boolean {
  return (
    'basicInfo' in report &&
    'sales' in report &&
    'purchases' in report &&
    'taxCalculation' in report &&
    'imports' in report &&
    'bondedAreaSalesToTaxArea' in report
  );
}
const generateThumbnails = (count: number) => {
  return Array.from({ length: count }, (_, index) => ({
    number: index + 1,
    active: index === 0,
    src: `${count}`,
    alt: `${count}`,
  }));
};

const balanceReportThumbnails = generateThumbnails(12);
const incomeReportThumbnails = generateThumbnails(9);
const cashFlowReportThumbnails = generateThumbnails(11);
// Info: (20240815 - Anna)增加401報表的縮圖
const report401Thumbnails = generateThumbnails(1);

enum TotalPages {
  BALANCE_SHEET = 12,
  INCOME_STATEMENT = 9,
  CASH_FLOW_STATEMENT = 11,
  // Info: (20240815 - Anna)增加401報表的頁數
  REPORT_401 = 1,
}

function isValidIncomeStatementReport(report: IncomeStatementReport): boolean {
  return !!(
    report.general &&
    report.details &&
    report.otherInfo &&
    report.otherInfo.revenueAndExpenseRatio &&
    report.otherInfo.revenueToRD
  );
}

function isValidBalanceSheetReport(report: BalanceSheetReport): boolean {
  return !!(
    report.general &&
    report.details &&
    report.otherInfo &&
    report.otherInfo.assetLiabilityRatio &&
    report.otherInfo.assetMixRatio &&
    report.otherInfo.dso &&
    report.otherInfo.inventoryTurnoverDays
  );
}

function isValidCashFlowStatementReport(report: CashFlowStatementReport): boolean {
  return !!(
    report.general &&
    report.details &&
    report.otherInfo &&
    report.otherInfo.operatingStabilized &&
    report.otherInfo.lineChartDataForRatio &&
    report.otherInfo.strategyInvest &&
    report.otherInfo.freeCash
  );
}
// Info: (20240815 - Anna)增加401報表的判斷函數
// function isValidReport401(report: TaxReport401): boolean {
//   return !!(
//     report.basicInfo &&
//     report.sales &&
//     report.purchases &&
//     report.taxCalculation &&
//     report.imports &&
//     report.bondedAreaSalesToTaxArea !== undefined
//   );
// }
const ViewFinancialSection = ({
  reportId,

  reportTypesName,
  tokenContract,
  tokenId,
  reportLink,
}: IViewReportSectionProps) => {
  const { t } = useTranslation([
    'common',
    'project',
    'journal',
    'kyc',
    'report_401',
    'salary',
    'setting',
    'terms',
  ]);
  const router = useRouter();

  // Info: (20240807 - Anna)
  // const globalCtx = useGlobalCtx();
  const { isAuthLoading, selectedCompany } = useUserCtx();
  const hasCompanyId = isAuthLoading === false && !!selectedCompany?.id;

  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [numPages, setNumPages] = useState<number>(1);
  const [activeIndex, setActiveIndex] = useState(0);
  const [reportThumbnails, setReportThumbnails] = useState<
    { number: number; alt: string; active: boolean; src: string }[]
  >([]);
  // TODO: (20240802 - Shirley) [Beta] download PDF file
  // const [pdfFile, setPdfFile] = useState<null | string>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const { data: reportFinancial, isLoading: getReportFinancialIsLoading } =
    APIHandler<FinancialReport>(
      APIName.REPORT_GET_BY_ID,
      {
        params: {
          companyId: selectedCompany?.id,
          reportId: reportId ?? NON_EXISTING_REPORT_ID,
        },
      },
      hasCompanyId
    );

  const isInvalidReport = useMemo(() => {
    if (!reportFinancial) return true;

    switch (reportFinancial.reportType) {
      case ReportSheetType.INCOME_STATEMENT:
        return !isValidIncomeStatementReport(reportFinancial as IncomeStatementReport);
      case ReportSheetType.BALANCE_SHEET:
        return !isValidBalanceSheetReport(reportFinancial as BalanceSheetReport);
      case ReportSheetType.CASH_FLOW_STATEMENT:
        return !isValidCashFlowStatementReport(reportFinancial as CashFlowStatementReport);
      // Info:(20240815 - Anna) 新增定義 isValidReport401 函數
      case ReportSheetType.REPORT_401:
        // Info:(20240815 - Anna)使用 isTaxReport401 進行類型檢查
        return !isTaxReport401(reportFinancial);
      default:
        return true;
    }
  }, [reportFinancial]);

  // Info: (20240729 - Shirley) iframe 為在 users/ 底下的 reports ，偵查 session 登入狀態並根據登入狀態轉址需要時間
  const handleIframeLoad = () => {
    setTimeout(() => {
      setIsLoading(false);
    }, MILLISECONDS_IN_A_SECOND);
  };

  const thumbnailClickHandler = (index: number) => {
    setActiveIndex(index);
    setPageNumber(index + 1);
  };

  const prevClickHandler = () => {
    setActiveIndex((prev) => prev - 1);
    setPageNumber((prev) => prev - 1);
  };

  const nextClickHandler = () => {
    setActiveIndex((prev) => prev + 1);
    setPageNumber((prev) => prev + 1);
  };

  const printPDF = () => {
    if (reportLink) {
      const printWindow = window.open(reportLink, '_blank');
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          setTimeout(() => {
            printWindow.print();
          }, WAIT_FOR_REPORT_DATA);
        });
      }
    }
  };
  // Info: (20240807 - Anna) 還沒有Token Contract資訊，先隱藏
  // const copyTokenContract = () => {
  //   navigator.clipboard.writeText(tokenContract);

  //   globalCtx.toastHandler({
  //     type: ToastType.SUCCESS,
  //     id: 'token-copied',
  //     closeable: true,
  //     content: 'Copied',
  //     autoClose: 500,
  //   });
  // };

  // Info: (20240807 - Anna) 還沒有Token ID資訊，先隱藏
  // const copyTokenId = () => {
  //   navigator.clipboard.writeText(tokenId);

  //   globalCtx.toastHandler({
  //     type: ToastType.SUCCESS,
  //     id: 'token-copied',
  //     closeable: true,
  //     content: 'Copied',
  //     autoClose: 500,
  //   });
  // };

  // Info: (20240807 - Anna) 還沒有Token Contract資訊，先隱藏
  // const copyTokenContractClickHandler = () => {
  //   copyTokenContract();
  // };

  // Info: (20240807 - Anna) 還沒有Token ID資訊，先隱藏
  // const copyTokenIdClickHandler = () => {
  //   copyTokenId();
  // };

  const backClickHandler = () => {
    // Info: (20240729 - Shirley) 返回我的報表頁面，因為使用 iframe ，所以不能使用 window.history.back()，這樣會讓 iframe 的內容跳轉到登入畫面
    router.push(ISUNFA_ROUTE.USERS_MY_REPORTS);
  };

  const downloadClickHandler = () => {
    if (reportLink) {
      printPDF();
    }
    // TODO: (20240802 - Shirley) [Beta] get PDF file
    // if (pdfFile) {
    //   window.open(pdfFile, '_blank');
    // }
  };

  // TODO: (20240802 - Shirley) [Beta] get PDF file
  // const fetchPDF = async () => {
  //   try {
  //     const uri = encodeURIComponent(`${DOMAIN}/${reportLink}`);

  //     const apiUrl = `${EXTERNAL_API.CFV_PDF}/${uri}`;

  //     // TODO: (20240502 - Shirley) use API service
  //     const response = await fetch(apiUrl, {
  //       method: 'GET',
  //     });

  //     const blob = await response.blob();
  //     const pdfUrl = URL.createObjectURL(blob);

  //     setPdfFile(pdfUrl);
  //   } catch (error) {
  //     // TODO: (20240502 - Shirley) error handling
  //     console.error(error);
  //   }
  // };

  useEffect(() => {
    switch (reportTypesName?.id ?? '') {
      case FinancialReportTypesKey.balance_sheet:
        setReportThumbnails(balanceReportThumbnails);
        setNumPages(TotalPages.BALANCE_SHEET);
        break;
      case FinancialReportTypesKey.comprehensive_income_statement:
        setReportThumbnails(incomeReportThumbnails);
        setNumPages(TotalPages.INCOME_STATEMENT);
        break;
      case FinancialReportTypesKey.cash_flow_statement:
        setReportThumbnails(cashFlowReportThumbnails);
        setNumPages(TotalPages.CASH_FLOW_STATEMENT);
        break;
      // Info:(20240815 - Anna) 創建401
      case FinancialReportTypesKey.report_401:
        setReportThumbnails(report401Thumbnails);
        setNumPages(TotalPages.REPORT_401);
        break;
      default:
        setReportThumbnails([]);
    }
  }, []);

  /* Info: (20240729 - Shirley)
  // useEffect(() => {
  //   if (reportLink) {
  //     fetchPDF();
  //   }
  // }, [reportLink]);

  // useEffect(() => {
  //   pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  //     'pdfjs-dist/build/pdf.worker.js',
  //     import.meta.url
  //   ).toString();
  // }, []);
  */

  const displayedReportType = getReportFinancialIsLoading ? (
    <Skeleton width={200} height={40} />
  ) : (
    <p>{ReportSheetTypeDisplayMap[reportFinancial?.reportType ?? ReportSheetType.BALANCE_SHEET]}</p>
  );

  // Info: (20240730 - Anna) 創建一個新的變數來儲存翻譯後的字串
  const reportTypeString =
    !getReportFinancialIsLoading && typeof displayedReportType.props.children === 'string'
      ? displayedReportType.props.children
      : '';
  const translatedReportType = t(
    `common:PLUGIN.${reportTypeString.toUpperCase().replace(/ /g, '_')}`
  );

  const renderedThumbnail = (
    thumbnail: { number: number; active: boolean; alt: string; src: string },
    index: number
  ) => (
    <button type="button" onClick={() => thumbnailClickHandler(index)} key={index}>
      <div
        className={`flex flex-col rounded-2xl px-5 py-4 ${
          index === activeIndex
            ? 'bg-surface-brand-primary-soft'
            : 'bg-surface-neutral-surface-lv2 hover:bg-surface-neutral-main-background'
        }`}
      >
        <div
          className={`flex h-80px w-120px items-center justify-center border border-solid border-stroke-brand-secondary text-3xl font-bold ${
            thumbnail.active ? 'text-text-neutral-solid-dark' : 'text-text-neutral-primary'
          }`}
        >
          {thumbnail.number < 10 ? `0${thumbnail.number}` : thumbnail.number}
        </div>
        {/* Info: (20240830 - Shirley) 等實作報告縮圖之後，將報告頁數 uncomment */}
        {/* <div
          className={`mt-2.5 self-center text-sm font-medium leading-5 tracking-normal ${
            thumbnail.active ? 'text-text-neutral-solid-dark' : 'text-text-neutral-primary'
          }`}
        >
          {thumbnail.number < 10 ? `0${thumbnail.number}` : thumbnail.number}
        </div> */}
      </div>
    </button>
  );

  const displayedReport = (
    <div className="mt-12 flex h-850px w-full bg-surface-neutral-main-background px-5 pb-2 md:px-0 lg:px-40">
      {/* Info: (20240426 - Shirley) Sidebar */}
      <div className="hidden w-1/4 overflow-y-scroll bg-surface-neutral-surface-lv2 lg:flex">
        <div className="mt-9 flex w-full flex-col items-center justify-center">
          <div className="flex h-850px flex-col gap-3">
            {isLoading ? (
              <p>{t('report_401:MY_REPORTS_SECTION.LOADING')}</p>
            ) : isInvalidReport ? null : (
              reportThumbnails.map((thumbnail, index) => renderedThumbnail(thumbnail, index))
            )}
          </div>
        </div>
      </div>

      <div className="mx-10 flex h-850px w-full flex-1 justify-center overflow-x-auto bg-transparent lg:mx-0">
        <iframe
          ref={iframeRef}
          src={`${reportLink}#${pageNumber}`}
          className={`h-full w-full origin-top-left scale-90 overflow-x-auto border-none bg-surface-neutral-depth transition-transform duration-300 md:scale-100`}
          title="Financial Report"
          onLoad={handleIframeLoad}
        />
      </div>
    </div>
  );

  return (
    <div className="flex w-full shrink-0 grow basis-0 flex-col overflow-hidden bg-surface-neutral-main-background pt-32">
      {/* Info: (20240426 - Shirley) financial title, print button and share button */}
      <div className="mx-10 flex items-center gap-5 border-b border-divider-stroke-lv-4 px-px pb-6 max-md:flex-wrap lg:mx-40">
        <Button
          onClick={backClickHandler}
          variant={'tertiaryOutline'}
          className="my-auto flex flex-col justify-center self-stretch rounded-xs p-2.5"
        >
          <div className="flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="none"
              viewBox="0 0 16 16"
            >
              <path
                className="fill-current"
                fill="none"
                fillRule="evenodd"
                d="M8.532 2.804a.75.75 0 010 1.06L5.146 7.251h7.523a.75.75 0 010 1.5H5.146l3.386 3.386a.75.75 0 11-1.06 1.06L2.805 8.532a.75.75 0 010-1.06l4.667-4.667a.75.75 0 011.06 0z"
                clipRule="evenodd"
              ></path>
            </svg>
          </div>
        </Button>
        {/* Info: (20240723 - Shirley) */}
        {/* <div className="flex-1 justify-center self-stretch text-lg font-semibold leading-10 text-slate-500 max-md:max-w-full lg:text-4xl">
          {displayedReportType}
        </div> */}
        <div className="flex-1 justify-center self-stretch text-lg font-semibold leading-10 text-text-neutral-secondary max-md:max-w-full lg:text-4xl">
          {getReportFinancialIsLoading ? (
            <Skeleton width={200} height={40} />
          ) : (
            translatedReportType
          )}
        </div>
        <div className="my-auto flex flex-col justify-center self-stretch">
          <div className="flex gap-3">
            <Button
              disabled={!reportLink || isLoading || isInvalidReport}
              // disabled={isLoading || pdfFile === null} // TODO: (20240729 - Shirley) PDF file
              onClick={downloadClickHandler}
              variant={'tertiary'}
              className="flex h-9 w-9 flex-col items-center justify-center rounded-xs p-2.5"
            >
              <div className="flex items-center justify-center">
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
                    d="M8.002 1.251a.75.75 0 01.75.75v6.19l2.053-2.054a.75.75 0 011.06 1.061l-3.332 3.333a.75.75 0 01-1.061 0L4.139 7.198a.75.75 0 011.06-1.06L7.252 8.19V2.001a.75.75 0 01.75-.75zm-6 8a.75.75 0 01.75.75v.8c0 .572 0 .957.025 1.252.023.288.065.425.111.515.12.236.312.427.547.547.09.046.228.088.515.111.296.024.68.025 1.252.025h5.6c.573 0 .957 0 1.253-.025.287-.023.424-.065.515-.111a1.25 1.25 0 00.546-.546c.046-.091.088-.228.111-.516.025-.295.025-.68.025-1.252v-.8a.75.75 0 111.5 0V10.831c0 .535 0 .98-.03 1.345-.03.38-.098.736-.27 1.073a2.75 2.75 0 01-1.201 1.202c-.338.172-.694.24-1.074.27-.364.03-.81.03-1.344.03H5.172c-.534 0-.98 0-1.344-.03-.38-.03-.737-.098-1.074-.27a2.75 2.75 0 01-1.202-1.202c-.172-.337-.239-.694-.27-1.073-.03-.365-.03-.81-.03-1.345V10.001a.75.75 0 01.75-.75z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </div>
            </Button>
            <Button
              // TODO: (20240507 - Shirley) [Beta] yet to dev
              disabled
              variant={'tertiary'}
              className="flex h-9 w-9 flex-col items-center justify-center rounded-xs p-2.5"
            >
              <div className="flex items-center justify-center">
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
                    d="M6.83 2.042c.21-.26.53-.407.866-.4.297.008.52.157.625.232a5.563 5.563 0 01.383.312l5.647 4.84.014.013c.069.059.152.13.22.2.078.078.19.208.258.396.085.237.085.496 0 .732-.068.189-.18.318-.258.397-.068.07-.151.14-.22.2l-.014.012-5.647 4.84-.02.017c-.122.105-.25.215-.363.295a1.128 1.128 0 01-.625.231 1.083 1.083 0 01-.867-.398 1.129 1.129 0 01-.231-.625 5.557 5.557 0 01-.012-.469V10.898a6.848 6.848 0 00-4.007 2.357.75.75 0 01-1.327-.479v-.408a7.194 7.194 0 015.334-6.945V3.16v-.026c0-.162 0-.33.012-.468.012-.13.043-.395.231-.625zm1.256 1.59v2.392a.75.75 0 01-.621.739 5.694 5.694 0 00-4.51 4.103A8.353 8.353 0 017.285 9.3a.75.75 0 01.8.748v2.322l5.098-4.369-5.097-4.37z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </div>
            </Button>
          </div>
        </div>
      </div>

      {/* Info: (20240426 - Shirley) token contract and token id info */}
      <div className="mx-10 mt-5 flex items-center gap-5 px-px text-sm max-md:flex-wrap lg:mx-40">
        <div className="hidden w-full flex-col justify-start gap-4 lg:flex lg:flex-row lg:space-x-2">
          <div className="flex space-x-5">
            {/* Info: (20240807 - Anna) 還沒有Token Contract資訊，先隱藏 */}
            {/* <div className="text-text-neutral-tertiary">Token Contract </div> */}
            <div className="flex items-center space-x-3">
              {/* TODO: (20240507 - Shirley) [Beta] link */}
              {/* <Link href={''} className="font-semibold text-link-text-primary">
                {tokenContract}{' '}
              </Link> */}
              <div className="font-semibold text-link-text-primary">{tokenContract} </div>
              {/* Info: (20240807 - Anna) 還沒有Token Contract資訊，先隱藏 */}
              {/* <Button
                disabled={!tokenContract}
                variant={'secondaryBorderless'}
                size={'extraSmall'}
                onClick={copyTokenContractClickHandler}
                type="button"
              >
                {' '}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="none"
                  viewBox="0 0 16 16"
                >
                  <path
                    fill="#001840"
                    fillRule="evenodd"
                    d="M11.426 2.785c-.407-.033-.931-.034-1.69-.034H5.002a.75.75 0 010-1.5h4.765c.72 0 1.306 0 1.781.039.491.04.93.125 1.339.333.643.328 1.165.85 1.493 1.494.208.408.293.847.333 1.338.04.475.04 1.061.04 1.78v4.766a.75.75 0 01-1.5 0V6.268c0-.76-.001-1.284-.035-1.69-.032-.399-.092-.619-.175-.78a1.917 1.917 0 00-.837-.838c-.162-.083-.382-.143-.78-.175zm-7.319.8h5.457c.349 0 .655 0 .908.02.27.022.543.07.81.206.391.2.71.519.91.91.135.267.184.541.206.81.02.253.02.56.02.908v5.457c0 .35 0 .655-.02.908-.022.27-.07.543-.206.81-.2.391-.519.71-.91.91-.267.135-.54.184-.81.206-.253.021-.559.021-.908.021H4.107c-.349 0-.655 0-.908-.02a2.118 2.118 0 01-.81-.207c-.391-.2-.71-.518-.91-.91a2.119 2.119 0 01-.206-.81c-.02-.253-.02-.559-.02-.908V6.439c0-.349 0-.655.02-.908.022-.269.07-.543.206-.81.2-.391.519-.71.91-.91.267-.135.541-.184.81-.206.253-.02.56-.02.908-.02zM3.321 5.1c-.176.014-.231.038-.25.048a.583.583 0 00-.255.255c-.01.02-.034.074-.048.25-.015.185-.016.429-.016.815v5.4c0 .385 0 .63.016.814.014.176.038.231.048.25.056.11.145.2.255.255.019.01.074.034.25.048.185.015.429.016.815.016h5.4c.385 0 .63 0 .814-.016.176-.014.231-.038.25-.048a.584.584 0 00.255-.255c.01-.019.034-.074.048-.25.015-.184.016-.429.016-.814v-5.4c0-.386 0-.63-.016-.815-.014-.176-.038-.23-.048-.25a.583.583 0 00-.255-.255c-.019-.01-.074-.034-.25-.048a11.274 11.274 0 00-.814-.016h-5.4c-.386 0-.63 0-.815.016z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </Button> */}
            </div>
          </div>
          <div className="flex space-x-5">
            {/* Info: (20240807 - Anna) 還沒有Token ID資訊，先隱藏 */}
            {/* <div className="text-text-neutral-tertiary">Token ID </div> */}

            <div className="flex items-center space-x-3">
              {/* TODO: (20240507 - Shirley) [Beta] link */}
              {/* <Link href={''} className="font-semibold text-link-text-primary">
                {tokenId}
              </Link> */}

              <div className="font-semibold text-link-text-primary">{tokenId} </div>
              {/* Info: (20240807 - Anna) 還沒有Token ID資訊，先隱藏 */}
              {/* <Button
                disabled={!tokenId}
                variant={'secondaryBorderless'}
                size={'extraSmall'}
                onClick={copyTokenIdClickHandler}
                type="button"
              >
                {' '}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="none"
                  viewBox="0 0 16 16"
                >
                  <path
                    fill="#001840"
                    fillRule="evenodd"
                    d="M11.426 2.785c-.407-.033-.931-.034-1.69-.034H5.002a.75.75 0 010-1.5h4.765c.72 0 1.306 0 1.781.039.491.04.93.125 1.339.333.643.328 1.165.85 1.493 1.494.208.408.293.847.333 1.338.04.475.04 1.061.04 1.78v4.766a.75.75 0 01-1.5 0V6.268c0-.76-.001-1.284-.035-1.69-.032-.399-.092-.619-.175-.78a1.917 1.917 0 00-.837-.838c-.162-.083-.382-.143-.78-.175zm-7.319.8h5.457c.349 0 .655 0 .908.02.27.022.543.07.81.206.391.2.71.519.91.91.135.267.184.541.206.81.02.253.02.56.02.908v5.457c0 .35 0 .655-.02.908-.022.27-.07.543-.206.81-.2.391-.519.71-.91.91-.267.135-.54.184-.81.206-.253.021-.559.021-.908.021H4.107c-.349 0-.655 0-.908-.02a2.118 2.118 0 01-.81-.207c-.391-.2-.71-.518-.91-.91a2.119 2.119 0 01-.206-.81c-.02-.253-.02-.559-.02-.908V6.439c0-.349 0-.655.02-.908.022-.269.07-.543.206-.81.2-.391.519-.71.91-.91.267-.135.541-.184.81-.206.253-.02.56-.02.908-.02zM3.321 5.1c-.176.014-.231.038-.25.048a.583.583 0 00-.255.255c-.01.02-.034.074-.048.25-.015.185-.016.429-.016.815v5.4c0 .385 0 .63.016.814.014.176.038.231.048.25.056.11.145.2.255.255.019.01.074.034.25.048.185.015.429.016.815.016h5.4c.385 0 .63 0 .814-.016.176-.014.231-.038.25-.048a.584.584 0 00.255-.255c.01-.019.034-.074.048-.25.015-.184.016-.429.016-.814v-5.4c0-.386 0-.63-.016-.815-.014-.176-.038-.23-.048-.25a.583.583 0 00-.255-.255c-.019-.01-.074-.034-.25-.048a11.274 11.274 0 00-.814-.016h-5.4c-.386 0-.63 0-.815.016z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </Button> */}
            </div>
          </div>
        </div>

        <div className="mt-0 flex flex-col lg:hidden">
          <div className="flex flex-col pr-2">
            <div className="flex gap-0">
              {/* Info: (20240807 - Anna) 還沒有Token Contract資訊，先隱藏 */}
              {/* <div className="my-auto text-sm font-medium leading-5 tracking-normal text-slate-500">
                Token Contract
              </div> */}
              <div className="flex flex-col justify-center rounded-md p-2.5">
                <div className="flex flex-col items-start justify-center">
                  {/* Info: (20240807 - Anna) 還沒有Token Contract資訊，先隱藏 */}
                  {/* <Button
                    disabled={!tokenContract}
                    variant={'secondaryBorderless'}
                    size={'extraSmall'}
                    onClick={copyTokenContractClickHandler}
                    type="button"
                  >
                    {' '}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      fill="none"
                      viewBox="0 0 16 16"
                    >
                      <path
                        fill="#001840"
                        fillRule="evenodd"
                        d="M11.426 2.785c-.407-.033-.931-.034-1.69-.034H5.002a.75.75 0 010-1.5h4.765c.72 0 1.306 0 1.781.039.491.04.93.125 1.339.333.643.328 1.165.85 1.493 1.494.208.408.293.847.333 1.338.04.475.04 1.061.04 1.78v4.766a.75.75 0 01-1.5 0V6.268c0-.76-.001-1.284-.035-1.69-.032-.399-.092-.619-.175-.78a1.917 1.917 0 00-.837-.838c-.162-.083-.382-.143-.78-.175zm-7.319.8h5.457c.349 0 .655 0 .908.02.27.022.543.07.81.206.391.2.71.519.91.91.135.267.184.541.206.81.02.253.02.56.02.908v5.457c0 .35 0 .655-.02.908-.022.27-.07.543-.206.81-.2.391-.519.71-.91.91-.267.135-.54.184-.81.206-.253.021-.559.021-.908.021H4.107c-.349 0-.655 0-.908-.02a2.118 2.118 0 01-.81-.207c-.391-.2-.71-.518-.91-.91a2.119 2.119 0 01-.206-.81c-.02-.253-.02-.559-.02-.908V6.439c0-.349 0-.655.02-.908.022-.269.07-.543.206-.81.2-.391.519-.71.91-.91.267-.135.541-.184.81-.206.253-.02.56-.02.908-.02zM3.321 5.1c-.176.014-.231.038-.25.048a.583.583 0 00-.255.255c-.01.02-.034.074-.048.25-.015.185-.016.429-.016.815v5.4c0 .385 0 .63.016.814.014.176.038.231.048.25.056.11.145.2.255.255.019.01.074.034.25.048.185.015.429.016.815.016h5.4c.385 0 .63 0 .814-.016.176-.014.231-.038.25-.048a.584.584 0 00.255-.255c.01-.019.034-.074.048-.25.015-.184.016-.429.016-.814v-5.4c0-.386 0-.63-.016-.815-.014-.176-.038-.23-.048-.25a.583.583 0 00-.255-.255c-.019-.01-.074-.034-.25-.048a11.274 11.274 0 00-.814-.016h-5.4c-.386 0-.63 0-.815.016z"
                        clipRule="evenodd"
                      ></path>
                    </svg>
                  </Button> */}
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center whitespace-nowrap text-xs font-semibold leading-5 tracking-normal text-link-text-primary">
              <div className="justify-center rounded-md">{tokenContract}</div>
            </div>
          </div>
          <div className="mt-4 flex flex-col">
            <div className="flex gap-0">
              {/* Info: (20240807 - Anna) 還沒有Token ID資訊，先隱藏 */}
              {/* <div className="my-auto text-sm font-medium leading-5 tracking-normal text-slate-500">
                Token ID
              </div> */}
              <div className="flex flex-col justify-center rounded-md p-2.5">
                <div className="flex flex-col items-start justify-center">
                  {/* Info: (20240807 - Anna) 還沒有Token ID資訊，先隱藏 */}
                  {/* <Button
                    disabled={!tokenId}
                    variant={'secondaryBorderless'}
                    size={'extraSmall'}
                    onClick={copyTokenIdClickHandler}
                    type="button"
                  >
                    {' '}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      fill="none"
                      viewBox="0 0 16 16"
                    >
                      <path
                        fill="#001840"
                        fillRule="evenodd"
                        d="M11.426 2.785c-.407-.033-.931-.034-1.69-.034H5.002a.75.75 0 010-1.5h4.765c.72 0 1.306 0 1.781.039.491.04.93.125 1.339.333.643.328 1.165.85 1.493 1.494.208.408.293.847.333 1.338.04.475.04 1.061.04 1.78v4.766a.75.75 0 01-1.5 0V6.268c0-.76-.001-1.284-.035-1.69-.032-.399-.092-.619-.175-.78a1.917 1.917 0 00-.837-.838c-.162-.083-.382-.143-.78-.175zm-7.319.8h5.457c.349 0 .655 0 .908.02.27.022.543.07.81.206.391.2.71.519.91.91.135.267.184.541.206.81.02.253.02.56.02.908v5.457c0 .35 0 .655-.02.908-.022.27-.07.543-.206.81-.2.391-.519.71-.91.91-.267.135-.54.184-.81.206-.253.021-.559.021-.908.021H4.107c-.349 0-.655 0-.908-.02a2.118 2.118 0 01-.81-.207c-.391-.2-.71-.518-.91-.91a2.119 2.119 0 01-.206-.81c-.02-.253-.02-.559-.02-.908V6.439c0-.349 0-.655.02-.908.022-.269.07-.543.206-.81.2-.391.519-.71.91-.91.267-.135.541-.184.81-.206.253-.02.56-.02.908-.02zM3.321 5.1c-.176.014-.231.038-.25.048a.583.583 0 00-.255.255c-.01.02-.034.074-.048.25-.015.185-.016.429-.016.815v5.4c0 .385 0 .63.016.814.014.176.038.231.048.25.056.11.145.2.255.255.019.01.074.034.25.048.185.015.429.016.815.016h5.4c.385 0 .63 0 .814-.016.176-.014.231-.038.25-.048a.584.584 0 00.255-.255c.01-.019.034-.074.048-.25.015-.184.016-.429.016-.814v-5.4c0-.386 0-.63-.016-.815-.014-.176-.038-.23-.048-.25a.583.583 0 00-.255-.255c-.019-.01-.074-.034-.25-.048a11.274 11.274 0 00-.814-.016h-5.4c-.386 0-.63 0-.815.016z"
                        clipRule="evenodd"
                      ></path>
                    </svg>
                  </Button> */}
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-center whitespace-nowrap text-sm font-semibold leading-5 tracking-normal text-link-text-primary">
              <div className="justify-center rounded-md">{tokenId}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-auto z-0 flex lg:hidden">
        {/* Info: (20240529 - Shirley) prev button */}
        <Button
          variant={'secondaryBorderless'}
          size={'extraSmall'}
          onClick={prevClickHandler}
          disabled={pageNumber <= 1 || isInvalidReport || isLoading}
          className="fixed left-4 top-2/3 z-10 -translate-y-1/2 fill-current disabled:opacity-80"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            fill="currentColor"
            viewBox="0 0 17 16"
          >
            <path
              fillRule="evenodd"
              d="M10.973 3.525c.26.26.26.683 0 .943L7.445 7.997l3.528 3.528a.667.667 0 11-.942.943l-4-4a.667.667 0 010-.943l4-4c.26-.26.682-.26.942 0z"
              clipRule="evenodd"
            ></path>
          </svg>
        </Button>

        {/* Info: (20240529 - Shirley) next button */}
        <Button
          variant={'secondaryBorderless'}
          size={'extraSmall'}
          onClick={nextClickHandler}
          disabled={pageNumber >= numPages || isInvalidReport || isLoading}
          className="fixed right-4 top-2/3 z-10 -translate-y-1/2 fill-current disabled:opacity-80"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            fill="currentColor"
            viewBox="0 0 17 16"
          >
            <path
              fillRule="evenodd"
              d="M6.03 3.525c.261-.26.683-.26.944 0l4 4c.26.26.26.683 0 .943l-4 4a.667.667 0 01-.943-.943l3.528-3.528-3.528-3.529a.667.667 0 010-.943z"
              clipRule="evenodd"
            ></path>
          </svg>
        </Button>
      </div>

      {/* Info: (20240426 - Shirley) financial report content */}
      {displayedReport}
    </div>
  );
};

export default ViewFinancialSection;
