import html2canvas from 'html2canvas';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/button/button';
import { FinancialReportTypesKey } from '@/interfaces/report_type';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import {
  BalanceSheetReport,
  CashFlowStatementReport,
  FinancialReport,
  IncomeStatementReport,
} from '@/interfaces/report';
import { ReportSheetType, ReportSheetTypeDisplayMap } from '@/constants/report';
import Skeleton from '@/components/skeleton/skeleton';
import { useTranslation } from 'next-i18next';
import { MILLISECONDS_IN_A_SECOND } from '@/constants/display';
import Image from 'next/image';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa6';

interface IViewReportSectionProps {
  reportTypesName: { id: FinancialReportTypesKey; name: string };
  tokenContract: string;
  tokenId: string;
  reportLink: string;
  reportId: string;
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

enum TotalPages {
  BALANCE_SHEET = 12,
  INCOME_STATEMENT = 9,
  CASH_FLOW_STATEMENT = 11,
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
const ViewFinancialSectionNew = ({
  reportId,
  reportTypesName,
  tokenContract,
  tokenId,
  reportLink,
}: IViewReportSectionProps) => {
  const { t } = useTranslation(['reports']);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [thumbnailUrls, setThumbnailUrls] = useState<string[]>([]); // Info: (20240909 - tzuhan)  保存縮略圖的 URL

  const [numPages, setNumPages] = useState<number>(1);
  const [activeIndex, setActiveIndex] = useState(0);
  const [reportThumbnails, setReportThumbnails] = useState<
    { number: number; alt: string; active: boolean; src: string }[]
  >([]);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [financialReport, setFinancialReport] = useState<FinancialReport | null>(null);
  const [isReportFinancialIsLoading, setIsReportFinancialIsLoading] = useState<boolean>(false);

  const { trigger: getFinancialReportAPI } = APIHandler<FinancialReport>(APIName.REPORT_GET_BY_ID);

  useEffect(() => {
    if (isReportFinancialIsLoading) return;
    setIsReportFinancialIsLoading(true);

    const getFinancialReport = async () => {
      try {
        const { data: reportFinancial, success: getFRSuccess } = await getFinancialReportAPI({
          params: { companyId: 1, reportId },
        });

        if (!getFRSuccess) {
          return;
        }

        setFinancialReport(reportFinancial);
      } catch (error) {
        (error as Error).message += ' (from ViewFinancialSectionNew - getFinancialReport)';
        // console.log('error:', error);
      } finally {
        setIsReportFinancialIsLoading(false);
      }
    };

    getFinancialReport();
  }, [reportId]);

  const isInvalidReport = useMemo(() => {
    if (!financialReport) return true;

    switch (financialReport.reportType) {
      case ReportSheetType.INCOME_STATEMENT:
        return !isValidIncomeStatementReport(financialReport as IncomeStatementReport);
      case ReportSheetType.BALANCE_SHEET:
        return !isValidBalanceSheetReport(financialReport as BalanceSheetReport);
      case ReportSheetType.CASH_FLOW_STATEMENT:
        return !isValidCashFlowStatementReport(financialReport as CashFlowStatementReport);
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
      default:
        setReportThumbnails([]);
    }
  }, [reportTypesName?.id]);

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
      {/* Info: (20240426 - Shirley) financial title */}
      <div className="mx-10 flex items-center gap-5 border-b border-divider-stroke-lv-4 px-px pb-6 max-md:flex-wrap lg:mx-40">
        <div className="flex-1 justify-center self-stretch text-lg font-semibold leading-10 text-text-neutral-secondary max-md:max-w-full lg:text-4xl">
          {isReportFinancialIsLoading ? <Skeleton width={200} height={40} /> : translatedReportType}
        </div>
      </div>

      {/* Info: (20240426 - Shirley) token contract and token id info */}
      <div className="mx-10 flex items-center gap-5 px-px text-sm max-md:flex-wrap lg:mx-40">
        <div className="hidden w-full flex-col justify-start gap-4 lg:flex lg:flex-row lg:space-x-2">
          <div className="flex space-x-5">
            <div className="flex items-center space-x-3">
              <div className="font-semibold text-link-text-primary">{tokenContract} </div>
            </div>
          </div>
          <div className="flex space-x-5">
            <div className="flex items-center space-x-3">
              <div className="font-semibold text-link-text-primary">{tokenId} </div>
            </div>
          </div>
        </div>

        <div className="mt-0 flex flex-col lg:hidden">
          <div className="flex flex-col pr-2">
            <div className="flex gap-0">
              <div className="flex flex-col justify-center rounded-md p-2.5">
                <div className="flex flex-col items-start justify-center"></div>
              </div>
            </div>

            <div className="flex flex-col justify-center whitespace-nowrap text-xs font-semibold leading-5 tracking-normal text-link-text-primary">
              <div className="justify-center rounded-md">{tokenContract}</div>
            </div>
          </div>
          <div className="mt-4 flex flex-col">
            <div className="flex gap-0">
              <div className="flex flex-col justify-center rounded-md p-2.5">
                <div className="flex flex-col items-start justify-center"></div>
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
          <FaChevronLeft className="h-5 w-5" />
        </Button>

        {/* Info: (20240529 - Shirley) next button */}
        <Button
          variant={'secondaryBorderless'}
          size={'extraSmall'}
          onClick={nextClickHandler}
          disabled={pageNumber >= numPages || isInvalidReport || isLoading}
          className="fixed right-4 top-2/3 z-10 -translate-y-1/2 fill-current disabled:opacity-80"
        >
          <FaChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Info: (20240426 - Shirley) financial report content */}
      {displayedReport}
    </div>
  );
};

export default ViewFinancialSectionNew;
