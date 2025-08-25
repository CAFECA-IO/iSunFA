import html2canvas from 'html2canvas';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/button/button';
import { FinancialReportTypesKey } from '@/interfaces/report_type';
import { ISUNFA_ROUTE } from '@/constants/url';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { DecimalOperations } from '@/lib/utils/decimal_operations';
import {
  BalanceSheetReport,
  CashFlowStatementReport,
  FinancialReport,
  IncomeStatementReport,
  TaxReport401Content,
  // TaxReport401,
} from '@/interfaces/report';
import { useUserCtx } from '@/contexts/user_context';
import { ReportSheetType, ReportSheetTypeDisplayMap } from '@/constants/report';
import Skeleton from '@/components/skeleton/skeleton';
// import { NON_EXISTING_REPORT_ID } from '@/constants/config'; // Deprecated: (20241129 - Liz)
import { useTranslation } from 'next-i18next';
import { MILLISECONDS_IN_A_SECOND, WAIT_FOR_REPORT_DATA } from '@/constants/display';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Toggle from '@/components/toggle/toggle';
import PrintButton from '@/components/button/print_button';
import DownloadButton from '@/components/button/download_button';
import { FaArrowLeft } from 'react-icons/fa6';
import { RxTrackNext, RxTrackPrevious } from 'react-icons/rx';
// import { RiCheckboxMultipleBlankLine } from 'react-icons/ri';

interface IViewReportSectionProps {
  reportTypesName: { id: FinancialReportTypesKey; name: string };

  tokenContract: string;
  tokenId: string;
  reportLink: string;
  reportId: string;
}
// Info: (20240815 - Anna)增加類型保護函數
function isTaxReport401(report: TaxReport401Content): boolean {
  // Info: (20240912 - Anna) 將回傳的值檢查是否是0，如果是0就轉換成字串"0"
  // Info: (20240912 - Anna) 轉換為字串"0"，為了避免回傳0時，判斷報表為無效，導致列印按鈕一直是禁用狀態
  const basicInfo = report.content.basicInfo ? report.content.basicInfo : '0';
  const sales = report.content.sales ? report.content.sales : '0';
  const purchases = report.content.purchases ? report.content.purchases : '0';
  const taxCalculation = report.content.taxCalculation ? report.content.taxCalculation : '0';
  const imports = report.content.imports ? report.content.imports : '0';
  const bondedAreaSalesToTaxArea =
    DecimalOperations.isZero(report.content.bondedAreaSalesToTaxArea) ? '0' : report.content.bondedAreaSalesToTaxArea;
  return !!(
    basicInfo &&
    sales &&
    purchases &&
    taxCalculation &&
    imports &&
    bondedAreaSalesToTaxArea
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
  const { t } = useTranslation(['reports']);
  const router = useRouter();
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  // Info: (20240807 - Anna)
  // const globalCtx = useGlobalCtx();
  const { isAuthLoading, connectedAccountBook } = useUserCtx();
  // const hasCompanyId = isAuthLoading === false && !!connectedAccountBook?.id; // Deprecated: (20241129 - Liz)

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [thumbnailUrls, setThumbnailUrls] = useState<string[]>([]); // Info: (20240909 - tzuhan)  保存縮略圖的 URL

  const [numPages, setNumPages] = useState<number>(1);
  const [activeIndex, setActiveIndex] = useState(0);
  const [reportThumbnails, setReportThumbnails] = useState<
    { number: number; alt: string; active: boolean; src: string }[]
  >([]);
  // TODO: (20240802 - Shirley) [Beta] download PDF file
  // const [pdfFile, setPdfFile] = useState<null | string>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Deprecated: (20241129 - Liz)
  // const { data: reportFinancial, isLoading: getReportFinancialIsLoading } =
  //   APIHandler<FinancialReport>(
  //     APIName.REPORT_GET_BY_ID,
  //     {
  //       params: {
  //         companyId: connectedAccountBook?.id,
  //         reportId: reportId ?? NON_EXISTING_REPORT_ID,
  //       },
  //     },
  //     hasCompanyId
  //   );

  const [financialReport, setFinancialReport] = useState<FinancialReport | null>(null);
  const [isReportFinancialIsLoading, setIsReportFinancialIsLoading] = useState<boolean>(false);

  const { trigger: getFinancialReportAPI } = APIHandler<FinancialReport>(APIName.REPORT_GET_BY_ID);

  useEffect(() => {
    if (isAuthLoading || !connectedAccountBook) return;
    if (isReportFinancialIsLoading) return;
    setIsReportFinancialIsLoading(true);

    const getFinancialReport = async () => {
      try {
        const { data: reportFinancial, success: getFRSuccess } = await getFinancialReportAPI({
          params: { companyId: connectedAccountBook.id, reportId },
        });

        if (!getFRSuccess) {
          return;
        }

        setFinancialReport(reportFinancial);
      } catch (error) {
        // console.log('error:', error);
      } finally {
        setIsReportFinancialIsLoading(false);
      }
    };

    getFinancialReport();
  }, [isAuthLoading, reportId, connectedAccountBook]);

  const isInvalidReport = useMemo(() => {
    if (!financialReport) return true;

    switch (financialReport.reportType) {
      case ReportSheetType.INCOME_STATEMENT:
        return !isValidIncomeStatementReport(financialReport as IncomeStatementReport);
      case ReportSheetType.BALANCE_SHEET:
        return !isValidBalanceSheetReport(financialReport as BalanceSheetReport);
      case ReportSheetType.CASH_FLOW_STATEMENT:
        return !isValidCashFlowStatementReport(financialReport as CashFlowStatementReport);
      // Info:(20240815 - Anna) 新增定義 isValidReport401 函數
      case ReportSheetType.REPORT_401:
        // Info:(20240912 - Anna) 將 financialReport 轉換為 TaxReport401Content 類型
        return !isTaxReport401(financialReport as unknown as TaxReport401Content);
      default:
        return true;
    }
  }, [financialReport]);

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
  const [subAccountsToggle, setSubAccountsToggle] = useState<boolean>(false);
  // Info: (20241003 - Anna) 處理 toggle 開關
  const subAccountsToggleHandler: () => void = () => {
    setSubAccountsToggle((prevState) => !prevState);
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
  }, [reportTypesName?.id]);

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

  const generateCanvas = useCallback(async () => {
    if (!isLoading && iframeRef.current) {
      const iframeWindow = iframeRef.current.contentWindow;
      const iframeDoc = iframeWindow?.document;

      if (iframeDoc && iframeWindow) {
        // Info: (20240909 - tzuhan) 使用 setInterval 定時輪詢檢查，直到找到第1頁的元素
        intervalIdRef.current = setInterval(() => {
          const firstPageElement = iframeDoc.getElementById('1'); // Info: (20240909 - tzuhan) 檢查 id 為 '1' 的元素是否存在

          if (firstPageElement) {
            // Info: (20240909 - tzuhan) 當找到第1頁的元素後，清除輪詢並開始生成縮略圖
            if (intervalIdRef.current) {
              clearInterval(intervalIdRef.current);
            }

            // Info: (20240909 - tzuhan) 創建 Promise 列表，生成所有頁面的縮略圖
            const canvasPromises = Array.from({ length: numPages }, async (_, i) => {
              const pageElement = iframeDoc.getElementById(`${i + 1}`); // Info: (20240909 - tzuhan) 依序查找每頁的元素
              if (pageElement) {
                const canvas = await html2canvas(pageElement, {
                  scale: 0.2, // Info: (20240909 - tzuhan) 縮小比例，減少圖片大小
                  useCORS: true, // Info: (20240909 - tzuhan) 允許跨域圖片
                  logging: false, // Info: (20240909 - tzuhan) 關閉日誌以提升性能
                });
                return canvas.toDataURL('image/jpeg', 0.5); // Info: (20240909 - tzuhan) 生成 JPEG 縮略圖
              }
              return null;
            });

            // Info: (20240909 - tzuhan) 等待所有縮略圖生成完成，並更新縮略圖的狀態
            Promise.all(canvasPromises).then((thumbnails) => {
              const validThumbnails = thumbnails.filter(Boolean) as string[]; // Info: (20240909 - tzuhan) 過濾掉 null 結果
              setThumbnailUrls(validThumbnails); // Info: (20240909 - tzuhan) 更新縮略圖狀態
            });
          }
        }, 1000); // Info: (20240909 - tzuhan) 每秒檢查一次，直到找到目標元素
      }
    }
  }, [isLoading, numPages]);

  useEffect(() => {
    // Info: (20240909 - tzuhan) 在 isLoading 為 false 且 iframe 引用存在時開始檢查
    if (!isLoading && iframeRef.current) {
      generateCanvas();
    }
    // Info: (20240909 - tzuhan)  在組件卸載時清除 setInterval，防止內存洩漏
    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, [generateCanvas, isLoading]);

  const displayedReportType = isReportFinancialIsLoading ? (
    <Skeleton width={200} height={40} />
  ) : (
    <p>{ReportSheetTypeDisplayMap[financialReport?.reportType ?? ReportSheetType.BALANCE_SHEET]}</p>
  );

  // Info: (20240730 - Anna) 創建一個新的變數來儲存翻譯後的字串
  const reportTypeString =
    !isReportFinancialIsLoading && typeof displayedReportType.props.children === 'string'
      ? displayedReportType.props.children
      : '';
  const translatedReportType = t(
    `reports:PLUGIN.${reportTypeString.toUpperCase().replace(/ /g, '_')}`
  );

  const renderedThumbnail = (
    thumbnail: { number: number; active: boolean; alt: string; src: string },
    index: number
  ) => (
    <button
      type="button"
      onClick={() => thumbnailClickHandler(index)}
      key={thumbnail.number + index}
    >
      <div
        className={`flex flex-col rounded-2xl px-5 py-4 ${
          index === activeIndex
            ? 'bg-surface-brand-primary-50'
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
            {isLoading || thumbnailUrls.length === 0 ? (
              <p>{t('reports:COMMON.LOADING')}</p>
            ) : isInvalidReport ? null : thumbnailUrls.length > 0 ? (
              thumbnailUrls.map((thumbnailUrl, index) => (
                <div
                  key={`thumbnail-${thumbnailUrl + index}`}
                  className={`m-6 mb-0 self-center rounded-sm p-6 tracking-normal ${
                    index === activeIndex
                      ? 'bg-surface-brand-primary-50'
                      : 'bg-surface-neutral-surface-lv2 hover:bg-surface-neutral-main-background'
                  }`}
                  onClick={() => thumbnailClickHandler(index)}
                >
                  <Image
                    src={thumbnailUrl}
                    alt="Report Thumbnail"
                    className="border border-stroke-brand-secondary"
                    width={120}
                    height={80}
                  />
                  <p
                    className={`mt-2 text-center ${index === activeIndex ? 'text-text-neutral-solid-dark' : 'text-text-neutral-primary'}`}
                  >
                    {index + 1 < 10 ? `0${index + 1}` : index + 1}
                  </p>
                </div>
              ))
            ) : (
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
            <FaArrowLeft className="h-4 w-4" />
          </div>
        </Button>
        {/* Info: (20240723 - Shirley) */}
        {/* <div className="flex-1 justify-center self-stretch text-lg font-semibold leading-10 text-slate-500 max-md:max-w-full lg:text-4xl">
          {displayedReportType}
        </div> */}
        <div className="flex-1 justify-center self-stretch text-lg font-semibold leading-10 text-text-neutral-secondary max-md:max-w-full lg:text-4xl">
          {isReportFinancialIsLoading ? <Skeleton width={200} height={40} /> : translatedReportType}
        </div>
      </div>
      <div
        className={`mx-10 mt-10 flex items-center px-px pb-6 max-md:flex-wrap lg:mx-40 ${reportTypesName.id !== FinancialReportTypesKey.balance_sheet ? 'justify-end' : 'justify-between'}`}
      >
        {/* Info: (20241002 - Anna) 只在 BalanceSheetReport 顯示 Toggle */}
        {reportTypesName.id === FinancialReportTypesKey.balance_sheet && (
          <Toggle
            id="subAccounts-toggle"
            initialToggleState={subAccountsToggle}
            getToggledState={subAccountsToggleHandler}
            toggleStateFromParent={subAccountsToggle}
            label="Display Sub-Accounts"
            labelClassName="text-neutral-600"
          />
        )}

        <div className="my-auto flex flex-col justify-center self-stretch">
          <div className="flex gap-3">
            {/* Info: (20241002 - Anna) 拿掉「分享按鈕」，改為「下載按鈕」 */}
            <DownloadButton
              onClick={downloadClickHandler}
              disabled={!reportLink || isLoading || isInvalidReport}
            />
            {/* <Button
              // TODO: (20240507 - Shirley) [Beta] yet to dev
              disabled
              variant={'tertiary'}
              className="flex h-9 w-9 flex-col items-center justify-center rounded-xs p-2.5"
            >
              <div className="flex items-center justify-center">
                <IoArrowRedoOutline className="h-4 w-4 text-neutral-25" />
              </div>
            </Button> */}
            {/* Info: (20240930 - Anna) 列印按鈕獨立出組件，並且在這裡使用 */}
            <PrintButton
              onClick={downloadClickHandler}
              disabled={!reportLink || isLoading || isInvalidReport}
            />
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
                <RiCheckboxMultipleBlankLine size={16} />
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
                <RiCheckboxMultipleBlankLine size={16} />
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
                    <RiCheckboxMultipleBlankLine size={16} />
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
                    <RiCheckboxMultipleBlankLine size={16} />
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
          <RxTrackPrevious size={20} />
        </Button>

        {/* Info: (20240529 - Shirley) next button */}
        <Button
          variant={'secondaryBorderless'}
          size={'extraSmall'}
          onClick={nextClickHandler}
          disabled={pageNumber >= numPages || isInvalidReport || isLoading}
          className="fixed right-4 top-2/3 z-10 -translate-y-1/2 fill-current disabled:opacity-80"
        >
          <RxTrackNext size={16} />
        </Button>
      </div>

      {/* Info: (20240426 - Shirley) financial report content */}
      {displayedReport}
    </div>
  );
};

export default ViewFinancialSection;
