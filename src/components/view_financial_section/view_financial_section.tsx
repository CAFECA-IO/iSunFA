/* eslint-disable */
import { pdfjs, Document, Page } from 'react-pdf';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/button/button';
import { FinancialReportTypesKey } from '@/interfaces/report_type';
import { EXTERNAL_API } from '@/constants/url';
import { useGlobalCtx } from '@/contexts/global_context';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { ToastType } from '@/interfaces/toastify';
import useStateRef from 'react-usestateref';
import { useTranslation } from 'next-i18next';
import Pagination from '@/components/pagination/pagination';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { useUserCtx } from '@/contexts/user_context';
import { DEFAULT_DISPLAYED_COMPANY_ID } from '@/constants/display';
import { useRouter } from 'next/router';

// Anna
interface CashFlowDisplayProps {
  reportType: unknown;
}
// Anna
interface FinancialReportItem {
  code: string;
  name: string;
  curPeriodAmount: number;
  curPeriodAmountString: string;
  curPeriodPercentage: number;
  prePeriodAmount: number;
  prePeriodAmountString: string;
  prePeriodPercentage: number;
  indent: number;
}
// Anna
interface FinancialReport {
  general: FinancialReportItem[];
  details: FinancialReportItem[];
}
interface IViewReportSectionProps {
  reportTypesName: { id: FinancialReportTypesKey; name: string };

  tokenContract: string;
  tokenId: string;
  reportLink: string;
}

const balanceReportThumbnails = [
  {
    src: '/report_thumbnails/balance_sheet/report_thumbnail_01.png',
    alt: 'Report Thumbnail 01',
    active: true,
  },
  {
    src: '/report_thumbnails/balance_sheet/report_thumbnail_02.png',
    alt: 'Report Thumbnail 02',
    active: false,
  },
  {
    src: '/report_thumbnails/balance_sheet/report_thumbnail_03.png',
    alt: 'Report Thumbnail 03',
    active: false,
  },
  {
    src: '/report_thumbnails/balance_sheet/report_thumbnail_04.png',
    alt: 'Report Thumbnail 04',
    active: false,
  },
  {
    src: '/report_thumbnails/balance_sheet/report_thumbnail_05.png',
    alt: 'Report Thumbnail 05',
    active: false,
  },
  {
    src: '/report_thumbnails/balance_sheet/report_thumbnail_06.png',
    alt: 'Report Thumbnail 06',
    active: false,
  },
  {
    src: '/report_thumbnails/balance_sheet/report_thumbnail_07.png',
    alt: 'Report Thumbnail 07',
    active: false,
  },
  {
    src: '/report_thumbnails/balance_sheet/report_thumbnail_08.png',
    alt: 'Report Thumbnail 08',
    active: false,
  },
  {
    src: '/report_thumbnails/balance_sheet/report_thumbnail_09.png',
    alt: 'Report Thumbnail 09',
    active: false,
  },
  {
    src: '/report_thumbnails/balance_sheet/report_thumbnail_10.png',
    alt: 'Report Thumbnail 10',
    active: false,
  },
  {
    src: '/report_thumbnails/balance_sheet/report_thumbnail_11.png',
    alt: 'Report Thumbnail 11',
    active: false,
  },
  {
    src: '/report_thumbnails/balance_sheet/report_thumbnail_12.png',
    alt: 'Report Thumbnail 12',
    active: false,
  },
  {
    src: '/report_thumbnails/balance_sheet/report_thumbnail_13.png',
    alt: 'Report Thumbnail 13',
    active: false,
  },
  {
    src: '/report_thumbnails/balance_sheet/report_thumbnail_14.png',
    alt: 'Report Thumbnail 14',
    active: false,
  },
  {
    src: '/report_thumbnails/balance_sheet/report_thumbnail_15.png',
    alt: 'Report Thumbnail 15',
    active: false,
  },
  {
    src: '/report_thumbnails/balance_sheet/report_thumbnail_16.png',
    alt: 'Report Thumbnail 16',
    active: false,
  },
];

const comprehensiveIncomeReportThumbnails = [
  {
    src: '/report_thumbnails/comprehensive_income_statement/report_thumbnail_01.png',
    alt: 'Report Thumbnail 01',
    active: true,
  },
  {
    src: '/report_thumbnails/comprehensive_income_statement/report_thumbnail_02.png',
    alt: 'Report Thumbnail 02',
    active: false,
  },
  {
    src: '/report_thumbnails/comprehensive_income_statement/report_thumbnail_03.png',
    alt: 'Report Thumbnail 03',
    active: false,
  },
  {
    src: '/report_thumbnails/comprehensive_income_statement/report_thumbnail_04.png',
    alt: 'Report Thumbnail 04',
    active: false,
  },
  {
    src: '/report_thumbnails/comprehensive_income_statement/report_thumbnail_05.png',
    alt: 'Report Thumbnail 05',
    active: false,
  },
  {
    src: '/report_thumbnails/comprehensive_income_statement/report_thumbnail_06.png',
    alt: 'Report Thumbnail 06',
    active: false,
  },
  {
    src: '/report_thumbnails/comprehensive_income_statement/report_thumbnail_07.png',
    alt: 'Report Thumbnail 07',
    active: false,
  },
  {
    src: '/report_thumbnails/comprehensive_income_statement/report_thumbnail_08.png',
    alt: 'Report Thumbnail 08',
    active: false,
  },
  {
    src: '/report_thumbnails/comprehensive_income_statement/report_thumbnail_09.png',
    alt: 'Report Thumbnail 09',
    active: false,
  },
  {
    src: '/report_thumbnails/comprehensive_income_statement/report_thumbnail_10.png',
    alt: 'Report Thumbnail 10',
    active: false,
  },
  {
    src: '/report_thumbnails/comprehensive_income_statement/report_thumbnail_11.png',
    alt: 'Report Thumbnail 11',
    active: false,
  },
  {
    src: '/report_thumbnails/comprehensive_income_statement/report_thumbnail_12.png',
    alt: 'Report Thumbnail 12',
    active: false,
  },
  {
    src: '/report_thumbnails/comprehensive_income_statement/report_thumbnail_13.png',
    alt: 'Report Thumbnail 13',
    active: false,
  },
  {
    src: '/report_thumbnails/comprehensive_income_statement/report_thumbnail_14.png',
    alt: 'Report Thumbnail 14',
    active: false,
  },
  {
    src: '/report_thumbnails/comprehensive_income_statement/report_thumbnail_15.png',
    alt: 'Report Thumbnail 15',
    active: false,
  },
  {
    src: '/report_thumbnails/comprehensive_income_statement/report_thumbnail_16.png',
    alt: 'Report Thumbnail 16',
    active: false,
  },
  {
    src: '/report_thumbnails/comprehensive_income_statement/report_thumbnail_17.png',
    alt: 'Report Thumbnail 17',
    active: false,
  },
  {
    src: '/report_thumbnails/comprehensive_income_statement/report_thumbnail_18.png',
    alt: 'Report Thumbnail 18',
    active: false,
  },
  {
    src: '/report_thumbnails/comprehensive_income_statement/report_thumbnail_19.png',
    alt: 'Report Thumbnail 19',
    active: false,
  },
  {
    src: '/report_thumbnails/comprehensive_income_statement/report_thumbnail_20.png',
    alt: 'Report Thumbnail 20',
    active: false,
  },
  {
    src: '/report_thumbnails/comprehensive_income_statement/report_thumbnail_21.png',
    alt: 'Report Thumbnail 21',
    active: false,
  },
  {
    src: '/report_thumbnails/comprehensive_income_statement/report_thumbnail_22.png',
    alt: 'Report Thumbnail 22',
    active: false,
  },
];

const cashFlowReportThumbnails = [
  {
    src: '/report_thumbnails/cash_flow_statement/report_thumbnail_01.png',
    alt: 'Report Thumbnail 01',
    active: true,
  },
  {
    src: '/report_thumbnails/cash_flow_statement/report_thumbnail_02.png',
    alt: 'Report Thumbnail 02',
    active: false,
  },
  {
    src: '/report_thumbnails/cash_flow_statement/report_thumbnail_03.png',
    alt: 'Report Thumbnail 03',
    active: false,
  },
  {
    src: '/report_thumbnails/cash_flow_statement/report_thumbnail_04.png',
    alt: 'Report Thumbnail 04',
    active: false,
  },
  {
    src: '/report_thumbnails/cash_flow_statement/report_thumbnail_05.png',
    alt: 'Report Thumbnail 05',
    active: false,
  },
  {
    src: '/report_thumbnails/cash_flow_statement/report_thumbnail_06.png',
    alt: 'Report Thumbnail 06',
    active: false,
  },
  {
    src: '/report_thumbnails/cash_flow_statement/report_thumbnail_07.png',
    alt: 'Report Thumbnail 07',
    active: false,
  },
  {
    src: '/report_thumbnails/cash_flow_statement/report_thumbnail_08.png',
    alt: 'Report Thumbnail 08',
    active: false,
  },
  {
    src: '/report_thumbnails/cash_flow_statement/report_thumbnail_09.png',
    alt: 'Report Thumbnail 09',
    active: false,
  },
  {
    src: '/report_thumbnails/cash_flow_statement/report_thumbnail_10.png',
    alt: 'Report Thumbnail 10',
    active: false,
  },
  {
    src: '/report_thumbnails/cash_flow_statement/report_thumbnail_11.png',
    alt: 'Report Thumbnail 11',
    active: false,
  },
  {
    src: '/report_thumbnails/cash_flow_statement/report_thumbnail_12.png',
    alt: 'Report Thumbnail 12',
    active: false,
  },
  {
    src: '/report_thumbnails/cash_flow_statement/report_thumbnail_13.png',
    alt: 'Report Thumbnail 13',
    active: false,
  },
  {
    src: '/report_thumbnails/cash_flow_statement/report_thumbnail_14.png',
    alt: 'Report Thumbnail 14',
    active: false,
  },
  {
    src: '/report_thumbnails/cash_flow_statement/report_thumbnail_15.png',
    alt: 'Report Thumbnail 15',
    active: false,
  },
  {
    src: '/report_thumbnails/cash_flow_statement/report_thumbnail_16.png',
    alt: 'Report Thumbnail 16',
    active: false,
  },
  {
    src: '/report_thumbnails/cash_flow_statement/report_thumbnail_17.png',
    alt: 'Report Thumbnail 17',
    active: false,
  },
  {
    src: '/report_thumbnails/cash_flow_statement/report_thumbnail_18.png',
    alt: 'Report Thumbnail 18',
    active: false,
  },
  {
    src: '/report_thumbnails/cash_flow_statement/report_thumbnail_19.png',
    alt: 'Report Thumbnail 19',
    active: false,
  },
  {
    src: '/report_thumbnails/cash_flow_statement/report_thumbnail_20.png',
    alt: 'Report Thumbnail 20',
    active: false,
  },
  {
    src: '/report_thumbnails/cash_flow_statement/report_thumbnail_21.png',
    alt: 'Report Thumbnail 21',
    active: false,
  },
  {
    src: '/report_thumbnails/cash_flow_statement/report_thumbnail_22.png',
    alt: 'Report Thumbnail 22',
    active: false,
  },
];
const ViewFinancialSection = ({
  reportTypesName,
  tokenContract,
  tokenId,
  reportLink,
}: IViewReportSectionProps) => {
  const { t } = useTranslation('common');
  const globalCtx = useGlobalCtx();
  const { selectedCompany } = useUserCtx(); // Anna 新增 useUserCtx 來取得選擇的公司
  const { toastHandler } = useGlobalCtx(); // Anna 新增 toastHandler 來處理 toast 訊息

  const [chartWidth, setChartWidth, chartWidthRef] = useStateRef(580);
  const [chartHeight, setChartHeight, chartHeightRef] = useStateRef(250);

  const [activeIndex, setActiveIndex] = useState(0);
  const [reportThumbnails, setReportThumbnails] = useState<
    { src: string; alt: string; active: boolean }[]
  >([]);
  const [pdfFile, setPdfFile] = useState<null | string>(null);
  const [numPages, setNumPages] = useState<number>(1);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // Info: (2024721 - Anna) 財報分頁器
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 12; // 假設總頁數為12
  const [reportData, setReportData] = useState<FinancialReport>({ general: [], details: [] }); // Anna 新增 reportData 狀態來存儲財務報告資料

  function onDocumentLoadSuccess(data: { numPages: number }): void {
    setNumPages(data.numPages);
    setIsLoading(false);
  }

  const thumbnailClickHandler = (index: number) => {
    setActiveIndex(index);
    setPageNumber(index + 1);
    setCurrentPage(index + 1); // 同时更新 currentPage Anna
    push({
      pathname: router.pathname,
      query: { ...query, page: (index + 1).toString() },
    });
  };

  // const prevClickHandler = () => {
  //   setActiveIndex((prev) => prev - 1);
  //   setPageNumber((prev) => prev - 1);
  // };

  // Anna
  const prevClickHandler = () => {
    if (activeIndex > 0) {
      setActiveIndex((prev) => prev - 1);
      setPageNumber((prev) => prev - 1);
      setCurrentPage((prev) => prev - 1);
      push({
        pathname: router.pathname,
        query: { ...query, page: activeIndex.toString() },
      });
    }
  };

  // const nextClickHandler = () => {
  //   setActiveIndex((prev) => prev + 1);
  //   setPageNumber((prev) => prev + 1);
  // };

  // Anna
  const nextClickHandler = () => {
    if (activeIndex < numPages - 1) {
      setActiveIndex((prev) => prev + 1);
      setPageNumber((prev) => prev + 1);
      setCurrentPage((prev) => prev + 1);
      push({
        pathname: router.pathname,
        query: { ...query, page: (activeIndex + 2).toString() },
      });
    }
  };
  // 確保分頁器正在傳遞 currentPage 和 setCurrentPage Anna
  const onPageChange = (page: number) => {
    setCurrentPage(page);
    setPageNumber(page); // 同时更新 pageNumber Anna
    push({
      pathname: router.pathname,
      query: { ...query, page: page.toString() },
    }); // Anna
  };

  const copyTokenContract = () => {
    navigator.clipboard.writeText(tokenContract);

    globalCtx.toastHandler({
      type: ToastType.SUCCESS,
      id: 'token-copied',
      closeable: true,
      content: 'Copied',
      autoClose: 500,
    });
  };

  const copyTokenId = () => {
    navigator.clipboard.writeText(tokenId);

    globalCtx.toastHandler({
      type: ToastType.SUCCESS,
      id: 'token-copied',
      closeable: true,
      content: 'Copied',
      autoClose: 500,
    });
  };

  const copyTokenContractClickHandler = () => {
    copyTokenContract();
  };

  const copyTokenIdClickHandler = () => {
    copyTokenId();
  };

  const backClickHandler = () => {
    window.history.back();
  };

  const downloadClickHandler = () => {
    if (pdfFile) {
      window.open(pdfFile, '_blank');
    }
  };

  const fetchPDF = async () => {
    try {
      const uri = encodeURIComponent(reportLink);

      const apiUrl = `${EXTERNAL_API.CFV_PDF}/${uri}`;

      // TODO: use API service (20240502 - Shirley)
      const response = await fetch(apiUrl, {
        method: 'GET',
      });

      const blob = await response.blob();
      const pdfUrl = URL.createObjectURL(blob);

      setPdfFile(pdfUrl);
    } catch (error) {
      // TODO: error handling (20240502 - Shirley)
      // eslint-disable-next-line no-console
      console.error(error);
    }
  };

  // Anna 新增的 useEffect，用來調用 API 獲取財務報告資料
  const {
    data: reportFinancial,
    code: getReportFinancialCode,
    success: getReportFinancialSuccess,
  } = APIHandler<FinancialReport>(APIName.REPORT_FINANCIAL_GET_BY_ID, {
    params: {
      companyId: selectedCompany?.id ?? DEFAULT_DISPLAYED_COMPANY_ID,
      reportId: '10000003',
    },
  });
  // Anna
  const router = useRouter();
  const { query, push } = router;

  useEffect(() => {
    if (getReportFinancialSuccess === false) {
      toastHandler({
        id: `getReportFinancialCode-${getReportFinancialCode}}`,
        content: `${t('DASHBOARD.FAILED_TO_GET')} ${t('DASHBOARD.REPORT')} ${getReportFinancialCode}`,
        type: ToastType.ERROR,
        closeable: true,
      });
    }
    if (getReportFinancialSuccess && reportFinancial) {
      setReportData(reportFinancial);
    }
  }, [getReportFinancialSuccess, getReportFinancialCode, reportFinancial, t, toastHandler]);
  // ----------
  useEffect(() => {
    if (!pdfFile) return;

    switch (reportTypesName.id) {
      case FinancialReportTypesKey.balance_sheet:
        setReportThumbnails(balanceReportThumbnails);
        break;
      case FinancialReportTypesKey.comprehensive_income_statement:
        setReportThumbnails(comprehensiveIncomeReportThumbnails);
        break;
      case FinancialReportTypesKey.cash_flow_statement:
        setReportThumbnails(cashFlowReportThumbnails);
        break;
      default:
        setReportThumbnails([]);
    }
  }, [pdfFile]);

  useEffect(() => {
    fetchPDF();
  }, [reportLink]);

  useEffect(() => {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.js',
      import.meta.url
    ).toString();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const windowWidth = globalCtx.width;
      const windowHeight = window.innerHeight;
      const DESKTOP_WIDTH = 1024;
      const TABLET_WIDTH = 910;
      const MOBILE_WIDTH = 500;

      if (windowWidth <= MOBILE_WIDTH) {
        const presentWidth = 350 + (windowWidth - 375);
        const presentHeight = 150;

        setChartWidth(presentWidth);
        setChartHeight(presentHeight);
      } else if (windowWidth <= TABLET_WIDTH) {
        // Info: 為了讓 ipad mini 跟 ipad air 可以在 left:x 參數不改動的情況下置中，以 ipad mini 去水平跟垂直置中，超過 ipad mini (768 px) 的部分就變大，以維持比例 (20240529 - Shirley)
        const presentWidth = 650 + (windowWidth - 768);
        const presentHeight = 250;

        setChartWidth(presentWidth);
        setChartHeight(presentHeight);
      } else if (windowWidth <= DESKTOP_WIDTH && windowWidth > TABLET_WIDTH) {
        const presentWidth = 500;
        const presentHeight = 250;

        setChartWidth(presentWidth);
        setChartHeight(presentHeight);
      } else {
        const presentWidth = windowWidth / 12;
        const presentHeight = windowHeight / 3.5;

        setChartWidth(presentWidth);
        setChartHeight(presentHeight);
      }
    };

    handleResize();
    // Anna
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [globalCtx.width]);

  // Anna
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get('page');
    if (page) {
      setCurrentPage(Number(page));
      setPageNumber(Number(page));
    }
  }, []);
  // Anna
  useEffect(() => {
    const { page } = query;
    if (page) {
      setCurrentPage(Number(page));
      setPageNumber(Number(page));
      setActiveIndex(Number(page) - 1);
    }
  }, [query]);
  // TODO: no `map` and `conditional rendering` in return (20240502 - Shirley)
  // console.log('reportData', reportData.general);
  // Deprecated: temporary console.log debug information (20240722 - Anna)
  if (pageNumber === 1) {
    return (
      <div className="flex w-full shrink-0 grow basis-0 flex-col overflow-hidden bg-surface-neutral-main-background px-0 pb-0 pt-32">
        {/* Info: financial title, print button and share button (20240426 - Shirley) */}
        <div className="mx-10 flex items-center gap-5 border-b border-lightGray px-px pb-6 max-md:flex-wrap lg:mx-40">
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
          <div className="flex-1 justify-center self-stretch text-lg font-semibold leading-10 text-slate-500 max-md:max-w-full lg:text-4xl">
            {/* {reportTypesName?.name} */}
            {t(`PLUGIN.${reportTypesName?.name.toUpperCase().replace(/ /g, '_')}`)}
          </div>
          <div className="my-auto flex flex-col justify-center self-stretch">
            <div className="flex gap-3">
              <Button
                disabled={isLoading}
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
                // TODO: yet to dev (20240507 - Shirley)
                disabled={true}
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

        {/* Info: token contract and token id info (20240426 - Shirley) */}
        <div className="mx-10 mt-5 flex items-center gap-5 px-px text-sm max-md:flex-wrap lg:mx-40">
          <div className="hidden w-full flex-col justify-start gap-4 lg:flex lg:flex-row lg:space-x-2">
            <div className="flex space-x-5">
              <div className="text-text-neutral-tertiary">{t('JOURNAL.TOKEN_CONTRACT')} </div>
              <div className="flex items-center space-x-3">
                {/* TODO: link (20240507 - Shirley) */}
                {/* <Link href={''} className="font-semibold text-link-text-primary">
                {tokenContract}{' '}
              </Link> */}
                <div className="font-semibold text-link-text-primary">{tokenContract} </div>

                <button onClick={copyTokenContractClickHandler} type="button">
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
                </button>
              </div>
            </div>
            <div className="flex space-x-5">
              <div className="text-text-neutral-tertiary">{t('JOURNAL.TOKEN_ID')}</div>

              <div className="flex items-center space-x-3">
                {/* TODO: link (20240507 - Shirley) */}
                {/* <Link href={''} className="font-semibold text-link-text-primary">
                {tokenId}
              </Link> */}

                <div className="font-semibold text-link-text-primary">{tokenId} </div>

                <button onClick={copyTokenIdClickHandler} type="button">
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
                </button>
              </div>
            </div>
          </div>

          <div className="mt-0 flex flex-col lg:hidden">
            <div className="flex flex-col pr-2">
              <div className="flex gap-0">
                <div className="my-auto text-sm font-medium leading-5 tracking-normal text-slate-500">
                  {t('JOURNAL.TOKEN_CONTRACT')}
                </div>
                <div className="flex flex-col justify-center rounded-md p-2.5">
                  <div className="flex flex-col items-start justify-center">
                    <button onClick={copyTokenContractClickHandler} type="button">
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
                    </button>
                  </div>
                </div>
              </div>
              {/* TODO: link (20240507 - Shirley) */}

              <div className="flex flex-col justify-center whitespace-nowrap text-xs font-semibold leading-5 tracking-normal text-link-text-primary">
                <div className="justify-center rounded-md">{tokenContract}</div>
              </div>
            </div>
            <div className="mt-4 flex flex-col">
              <div className="flex gap-0">
                <div className="my-auto text-sm font-medium leading-5 tracking-normal text-slate-500">
                  {t('JOURNAL.TOKEN_ID')}
                </div>
                <div className="flex flex-col justify-center rounded-md p-2.5">
                  <div className="flex flex-col items-start justify-center">
                    <button onClick={copyTokenIdClickHandler} type="button">
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
                    </button>
                  </div>
                </div>
              </div>
              {/* TODO: link (20240507 - Shirley) */}

              <div className="flex flex-col justify-center whitespace-nowrap text-sm font-semibold leading-5 tracking-normal text-link-text-primary">
                <div className="justify-center rounded-md">{tokenId}</div>
              </div>
            </div>
          </div>

          <div className=""></div>
        </div>

        {/* Info: financial report content (20240426 - Shirley) */}
        <div className="mt-12 flex h-850px w-full bg-surface-neutral-main-background px-40 pb-2">
          {/* Info: Sidebar (20240426 - Shirley) */}
          <div className="hidden w-1/4 overflow-y-scroll bg-white pl-0 lg:flex">
            <div className="mt-9 flex w-full flex-col items-center justify-center">
              {/* Info: 不能加上 `items-center justify-center`，否則縮圖會被截斷 (20240507 - Shirley) */}
              <div className="flex h-850px flex-col gap-3">
                {!isLoading ? (
                  reportThumbnails.map((thumbnail, index) => (
                    <button onClick={() => thumbnailClickHandler(index)} key={index}>
                      <div
                        className={`flex flex-col rounded-2xl px-5 py-4 ${
                          index === activeIndex
                            ? 'bg-surface-brand-primary-soft'
                            : 'bg-surface-neutral-surface-lv2 hover:bg-surface-neutral-main-background'
                        }`}
                      >
                        <div className="flex items-center justify-center border border-solid border-blue-950">
                          <Image width={150} height={106} src={thumbnail.src} alt={thumbnail.alt} />
                        </div>
                        <div
                          className={`mt-2.5 self-center text-sm font-medium leading-5 tracking-normal ${
                            thumbnail.active
                              ? 'text-text-neutral-solid-dark'
                              : 'text-text-text-neutral-primary'
                          }`}
                        >
                          {index + 1 < 10 ? `0${index + 1}` : index + 1}
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  // <p>{t('MY_REPORTS_SECTION.LOADING')}</p>
                  // Info: (2024721 - Anna) 財報畫面-縮圖
                  <>
                    {' '}
                    <div
                      className="outer-container mx-auto bg-white"
                      style={{
                        width: '150px',
                        height: 'auto',
                        overflow: 'hidden',
                        position: 'relative',
                      }}
                    >
                      <div
                        className="scale-container"
                        style={{
                          transform: 'scale(0.25)',
                          transformOrigin: 'top left',
                          width: '600px',
                          height: 'auto',
                        }}
                      >
                        <div className="container mx-auto bg-white">
                          <header className="mb-20 flex justify-between p-5 text-white">
                            <div className="w-1/3 bg-blue-900 p-5 font-bold">
                              <div>
                                <h1 className="mb-7 text-lg">
                                  2330 <br />
                                  台灣積體電路製造股份有限公司
                                </h1>
                                <p className="font-semibold">
                                  2023年第四季 <br />
                                  合併財務報告 - 資產負債表
                                </p>
                              </div>
                            </div>
                            <div className="relative w-1/3 pr-5 pt-6 text-right">
                              <h2 className="relative inline-block pb-1 text-lg font-bold text-gray-400">
                                Balance Sheet
                                <div className="relative">
                                  <span className="block h-2 w-full bg-yellow-500"></span>
                                  <span
                                    className="block h-1 w-3/4 bg-blue-900"
                                    style={{ marginTop: '-0.125rem' }}
                                  ></span>
                                </div>
                              </h2>
                            </div>
                          </header>
                          <section className="p-5">
                            <div className="mb-4 flex justify-between font-semibold text-blue-900">
                              <p>一、項目彙總格式</p>
                              <p>單位：新台幣仟元</p>
                            </div>
                            <table className="w-full border-collapse bg-white">
                              <thead>
                                <tr>
                                  <th className="border border-gray-300 bg-yellow-200 p-2 text-sm font-semibold">
                                    代號
                                  </th>
                                  <th className="border border-gray-300 bg-yellow-200 p-2 text-sm font-semibold">
                                    會計項目
                                  </th>
                                  <th className="border border-gray-300 bg-yellow-200 p-2 text-right text-sm font-semibold">
                                    2023-12-31
                                  </th>
                                  <th className="border border-gray-300 bg-yellow-200 p-2 text-center text-sm font-semibold">
                                    %
                                  </th>
                                  <th className="border border-gray-300 bg-yellow-200 p-2 text-right text-sm font-semibold">
                                    2022-12-31
                                  </th>
                                  <th className="border border-gray-300 bg-yellow-200 p-2 text-center text-sm font-semibold">
                                    %
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td
                                    colSpan={6}
                                    className="border border-gray-300 p-2 font-semibold"
                                  >
                                    資產
                                  </td>
                                </tr>
                                <tr>
                                  <td className="border border-gray-300 p-2 text-sm">11XX</td>
                                  <td className="border border-gray-300 p-2 text-sm">
                                    流動資產合計
                                  </td>
                                  <td className="border border-gray-300 p-2 text-right text-sm">
                                    2,194,032,910
                                  </td>
                                  <td className="border border-gray-300 p-2 text-center text-sm">
                                    40
                                  </td>
                                  <td className="border border-gray-300 p-2 text-right text-sm">
                                    2,052,896,744
                                  </td>
                                  <td className="border border-gray-300 p-2 text-center text-sm">
                                    41
                                  </td>
                                </tr>
                                <tr>
                                  <td className="border border-gray-300 p-2 text-sm">15XX</td>
                                  <td className="border border-gray-300 p-2 text-sm">
                                    非流動資產合計
                                  </td>
                                  <td className="border border-gray-300 p-2 text-right text-sm">
                                    3,338,338,305
                                  </td>
                                  <td className="border border-gray-300 p-2 text-center text-sm">
                                    60
                                  </td>
                                  <td className="border border-gray-300 p-2 text-right text-sm">
                                    2,911,882,134
                                  </td>
                                  <td className="border border-gray-300 p-2 text-center text-sm">
                                    59
                                  </td>
                                </tr>
                                <tr>
                                  <td className="border border-gray-300 p-2 text-sm">1XXX</td>
                                  <td className="border border-gray-300 p-2 text-sm">資產總計</td>
                                  <td className="border border-gray-300 p-2 text-right text-sm">
                                    5,532,371,215
                                  </td>
                                  <td className="border border-gray-300 p-2 text-center text-sm">
                                    100
                                  </td>
                                  <td className="border border-gray-300 p-2 text-right text-sm">
                                    4,964,778,878
                                  </td>
                                  <td className="border border-gray-300 p-2 text-center text-sm">
                                    100
                                  </td>
                                </tr>
                                <tr>
                                  <td
                                    colSpan={6}
                                    className="border border-gray-300 p-2 font-semibold"
                                  >
                                    負債及權益
                                  </td>
                                </tr>
                                <tr>
                                  <td className="border border-gray-300 p-2 text-sm">21XX</td>
                                  <td className="border border-gray-300 p-2 text-sm">
                                    流動負債合計
                                  </td>
                                  <td className="border border-gray-300 p-2 text-right text-sm">
                                    913,583,316
                                  </td>
                                  <td className="border border-gray-300 p-2 text-center text-sm">
                                    16
                                  </td>
                                  <td className="border border-gray-300 p-2 text-right text-sm">
                                    944,226,817
                                  </td>
                                  <td className="border border-gray-300 p-2 text-center text-sm">
                                    19
                                  </td>
                                </tr>
                                <tr>
                                  <td className="border border-gray-300 p-2 text-sm">21XX</td>
                                  <td className="border border-gray-300 p-2 text-sm">
                                    非流動負債合計
                                  </td>
                                  <td className="border border-gray-300 p-2 text-right text-sm">
                                    1,135,525,052
                                  </td>
                                  <td className="border border-gray-300 p-2 text-center text-sm">
                                    21
                                  </td>
                                  <td className="border border-gray-300 p-2 text-right text-sm">
                                    944,226,817
                                  </td>
                                  <td className="border border-gray-300 p-2 text-center text-sm">
                                    19
                                  </td>
                                </tr>
                                <tr>
                                  <td className="border border-gray-300 p-2 text-sm">21XX</td>
                                  <td className="border border-gray-300 p-2 text-sm">負債總計</td>
                                  <td className="border border-gray-300 p-2 text-right text-sm">
                                    2,049,108,368
                                  </td>
                                  <td className="border border-gray-300 p-2 text-center text-sm">
                                    37
                                  </td>
                                  <td className="border border-gray-300 p-2 text-right text-sm">
                                    944,226,817
                                  </td>
                                  <td className="border border-gray-300 p-2 text-center text-sm">
                                    40
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </section>
                          <footer className="mt-5 flex items-center justify-between border-t-2 border-gray-300 bg-blue-900 p-2">
                            <p className="m-0 text-xs text-white">1</p>
                            <div className="font-bold text-white">
                              <img src="./logo.png" alt="" />
                            </div>
                          </footer>
                          <div className="pointer-events-none fixed top-1/2 flex w-full -translate-y-1/2 justify-between">
                            <button
                              id="prevPage"
                              type="button"
                              className="pointer-events-auto cursor-pointer border-none bg-none text-2xl text-gray-600"
                            >
                              <i className="bi bi-arrow-left"></i>
                            </button>
                            <button
                              id="nextPage"
                              type="button"
                              className="pointer-events-auto cursor-pointer border-none bg-none text-2xl text-gray-600"
                            >
                              <i className="bi bi-arrow-right"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {pdfFile ? (
            <div className="flex w-screen flex-1 items-center justify-center md:h-850px lg:w-full lg:bg-white">
              {/* Info: prev button (20240529 - Shirley) */}
              <button
                onClick={prevClickHandler}
                disabled={pageNumber <= 1}
                className="absolute left-0 top-40rem z-10 m-4 iphone12pro:top-40rem iphonexr:top-38rem md:bottom-56 lg:hidden"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  fill="none"
                  viewBox="0 0 17 16"
                >
                  <path
                    fill="#001840"
                    fillRule="evenodd"
                    d="M10.973 3.525c.26.26.26.683 0 .943L7.445 7.997l3.528 3.528a.667.667 0 11-.942.943l-4-4a.667.667 0 010-.943l4-4c.26-.26.682-.26.942 0z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </button>

              {/* Info: PDF 本體 for desktop (20240529 - Shirley) */}
              <div className="hidden lg:flex">
                <Document file={pdfFile} onLoadSuccess={onDocumentLoadSuccess}>
                  <Page scale={1} pageNumber={pageNumber} />
                </Document>
              </div>

              {/* Info: PDF 本體 for mobile (20240529 - Shirley) */}
              <div className="flex h-screen md:mt-20 lg:hidden">
                <Document
                  file={pdfFile}
                  onLoadSuccess={onDocumentLoadSuccess}
                  className={`relative`}
                >
                  <Page
                    scale={1}
                    pageNumber={pageNumber}
                    width={chartWidth}
                    height={chartHeight}
                    className="absolute left-8% top-1/3 w-full -translate-x-1/2 -translate-y-1/2 iphonese:left-11% iphonexr:left-14% sm:left-35% sm:top-1/2 md:left-35%"
                  />
                </Document>
              </div>

              {/* Info: next button (20240529 - Shirley) */}
              <button
                onClick={nextClickHandler}
                disabled={pageNumber >= numPages}
                className="absolute right-0 top-40rem z-10 m-4 iphone12pro:top-40rem iphonexr:top-38rem md:bottom-56 lg:hidden"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  fill="none"
                  viewBox="0 0 17 16"
                >
                  <path
                    fill="#001840"
                    fillRule="evenodd"
                    d="M6.03 3.525c.261-.26.683-.26.944 0l4 4c.26.26.26.683 0 .943l-4 4a.667.667 0 01-.943-.943l3.528-3.528-3.528-3.529a.667.667 0 010-.943z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex h-850px w-full flex-1 justify-center bg-white">
              {/* <p className="text-stroke-brand-secondary">{t('MY_REPORTS_SECTION.LOADING')}</p> */}
              {/* Info: (2024721 - Anna) 財報畫面 */}
              <div className="container mx-auto">
                <div className="bg-white">
                  <header className="mb-20 flex justify-between p-5 text-white">
                    <div className="w-1/3 bg-blue-900 p-5 font-bold">
                      <div>
                        <h1 className="mb-7 text-lg">
                          2330 <br />
                          台灣積體電路製造股份有限公司
                        </h1>
                        <p className="font-semibold">
                          2023年第四季 <br />
                          合併財務報告 - 資產負債表
                        </p>
                      </div>
                    </div>
                    <div className="relative w-1/3 pr-5 pt-6 text-right">
                      <h2 className="relative inline-block pb-1 text-lg font-bold text-gray-400">
                        Balance Sheet
                        <div className="relative">
                          <span className="block h-2 w-full bg-yellow-500"></span>
                          <span
                            className="block h-1 w-3/4 bg-blue-900"
                            style={{ marginTop: '-0.125rem' }}
                          ></span>
                        </div>
                      </h2>
                    </div>
                  </header>
                  <section className="p-5">
                    <div className="mb-4 flex justify-between font-semibold text-blue-900">
                      <p>一、項目彙總格式</p>
                      <p>單位：新台幣仟元</p>
                    </div>
                    <table className="w-full border-collapse bg-white">
                      <thead>
                        <tr className="text-neutral-400">
                          <th className="border border-gray-300 bg-yellow-200 p-2 text-sm font-semibold">
                            代號
                          </th>
                          <th className="border border-gray-300 bg-yellow-200 p-2 text-sm font-semibold">
                            會計項目
                          </th>
                          <th className="border border-gray-300 bg-yellow-200 p-2 text-right text-sm font-semibold">
                            2023-12-31
                          </th>
                          <th className="border border-gray-300 bg-yellow-200 p-2 text-center text-sm font-semibold">
                            %
                          </th>
                          <th className="border border-gray-300 bg-yellow-200 p-2 text-right text-sm font-semibold">
                            2022-12-31
                          </th>
                          <th className="border border-gray-300 bg-yellow-200 p-2 text-center text-sm font-semibold">
                            %
                          </th>
                        </tr>
                      </thead>
                      <tbody className="text-neutral-400">
                        {/* page1 */}
                        {Object.prototype.hasOwnProperty.call(reportData, 'general') &&
                          reportData.general.slice(0, 9).map((value) => (
                            <tr key={value.name}>
                              <td className="border border-gray-300 p-2 text-center text-sm">
                                {value.code}
                              </td>
                              <td className="border border-gray-300 p-2 text-left text-sm">
                                {value.name}
                              </td>
                              <td className="border border-gray-300 p-2 text-right text-sm">
                                {value.curPeriodAmount}
                              </td>
                              <td className="border border-gray-300 p-2 text-center text-sm">
                                {value.curPeriodPercentage}
                              </td>
                              <td className="border border-gray-300 p-2 text-right text-sm">
                                {value.prePeriodAmount}
                              </td>
                              <td className="border border-gray-300 p-2 text-center text-sm">
                                {value.prePeriodPercentage}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </section>
                  <footer className="mt-5 flex items-center justify-between border-t-2 border-gray-300 bg-blue-900 p-2">
                    <p className="m-0 text-xs text-white">1</p>
                    <div className="font-bold text-white">
                      <img src="./logo.png" alt="" />
                    </div>
                  </footer>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="mt-5 flex justify-center">
          <Pagination
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            totalPages={totalPages}
            pagePrefix="page"
          />
        </div>
      </div>
    );
  }
  if (pageNumber === 2) {
    return (
      <div className="flex w-full shrink-0 grow basis-0 flex-col overflow-hidden bg-surface-neutral-main-background px-0 pb-0 pt-32">
        {/* Info: financial title, print button and share button (20240426 - Shirley) */}
        <div className="mx-10 flex items-center gap-5 border-b border-lightGray px-px pb-6 max-md:flex-wrap lg:mx-40">
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
          <div className="flex-1 justify-center self-stretch text-lg font-semibold leading-10 text-slate-500 max-md:max-w-full lg:text-4xl">
            {/* {reportTypesName?.name} */}
            {t(`PLUGIN.${reportTypesName?.name.toUpperCase().replace(/ /g, '_')}`)}
          </div>
          <div className="my-auto flex flex-col justify-center self-stretch">
            <div className="flex gap-3">
              <Button
                disabled={isLoading}
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
                // TODO: yet to dev (20240507 - Shirley)
                disabled={true}
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

        {/* Info: token contract and token id info (20240426 - Shirley) */}
        <div className="mx-10 mt-5 flex items-center gap-5 px-px text-sm max-md:flex-wrap lg:mx-40">
          <div className="hidden w-full flex-col justify-start gap-4 lg:flex lg:flex-row lg:space-x-2">
            <div className="flex space-x-5">
              <div className="text-text-neutral-tertiary">{t('JOURNAL.TOKEN_CONTRACT')} </div>
              <div className="flex items-center space-x-3">
                {/* TODO: link (20240507 - Shirley) */}
                {/* <Link href={''} className="font-semibold text-link-text-primary">
                {tokenContract}{' '}
              </Link> */}
                <div className="font-semibold text-link-text-primary">{tokenContract} </div>

                <button onClick={copyTokenContractClickHandler} type="button">
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
                </button>
              </div>
            </div>
            <div className="flex space-x-5">
              <div className="text-text-neutral-tertiary">{t('JOURNAL.TOKEN_ID')}</div>

              <div className="flex items-center space-x-3">
                {/* TODO: link (20240507 - Shirley) */}
                {/* <Link href={''} className="font-semibold text-link-text-primary">
                {tokenId}
              </Link> */}

                <div className="font-semibold text-link-text-primary">{tokenId} </div>

                <button onClick={copyTokenIdClickHandler} type="button">
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
                </button>
              </div>
            </div>
          </div>

          <div className="mt-0 flex flex-col lg:hidden">
            <div className="flex flex-col pr-2">
              <div className="flex gap-0">
                <div className="my-auto text-sm font-medium leading-5 tracking-normal text-slate-500">
                  {t('JOURNAL.TOKEN_CONTRACT')}
                </div>
                <div className="flex flex-col justify-center rounded-md p-2.5">
                  <div className="flex flex-col items-start justify-center">
                    <button onClick={copyTokenContractClickHandler} type="button">
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
                    </button>
                  </div>
                </div>
              </div>
              {/* TODO: link (20240507 - Shirley) */}

              <div className="flex flex-col justify-center whitespace-nowrap text-xs font-semibold leading-5 tracking-normal text-link-text-primary">
                <div className="justify-center rounded-md">{tokenContract}</div>
              </div>
            </div>
            <div className="mt-4 flex flex-col">
              <div className="flex gap-0">
                <div className="my-auto text-sm font-medium leading-5 tracking-normal text-slate-500">
                  {t('JOURNAL.TOKEN_ID')}
                </div>
                <div className="flex flex-col justify-center rounded-md p-2.5">
                  <div className="flex flex-col items-start justify-center">
                    <button onClick={copyTokenIdClickHandler} type="button">
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
                    </button>
                  </div>
                </div>
              </div>
              {/* TODO: link (20240507 - Shirley) */}

              <div className="flex flex-col justify-center whitespace-nowrap text-sm font-semibold leading-5 tracking-normal text-link-text-primary">
                <div className="justify-center rounded-md">{tokenId}</div>
              </div>
            </div>
          </div>

          <div className=""></div>
        </div>

        {/* Info: financial report content (20240426 - Shirley) */}
        <div className="mt-12 flex h-850px w-full bg-surface-neutral-main-background px-40 pb-2">
          {/* Info: Sidebar (20240426 - Shirley) */}
          <div className="hidden w-1/4 overflow-y-scroll bg-white pl-0 lg:flex">
            <div className="mt-9 flex w-full flex-col items-center justify-center">
              {/* Info: 不能加上 `items-center justify-center`，否則縮圖會被截斷 (20240507 - Shirley) */}
              <div className="flex h-850px flex-col gap-3">
                {!isLoading ? (
                  reportThumbnails.map((thumbnail, index) => (
                    <button onClick={() => thumbnailClickHandler(index)} key={index}>
                      <div
                        className={`flex flex-col rounded-2xl px-5 py-4 ${
                          index === activeIndex
                            ? 'bg-surface-brand-primary-soft'
                            : 'bg-surface-neutral-surface-lv2 hover:bg-surface-neutral-main-background'
                        }`}
                      >
                        <div className="flex items-center justify-center border border-solid border-blue-950">
                          <Image width={150} height={106} src={thumbnail.src} alt={thumbnail.alt} />
                        </div>
                        <div
                          className={`mt-2.5 self-center text-sm font-medium leading-5 tracking-normal ${
                            thumbnail.active
                              ? 'text-text-neutral-solid-dark'
                              : 'text-text-text-neutral-primary'
                          }`}
                        >
                          {index + 1 < 10 ? `0${index + 1}` : index + 1}
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  // <p>{t('MY_REPORTS_SECTION.LOADING')}</p>
                  // Info: (2024721 - Anna) 財報畫面-縮圖
                  <>
                    {' '}
                    <div
                      className="outer-container mx-auto bg-white"
                      style={{
                        width: '150px',
                        height: 'auto',
                        overflow: 'hidden',
                        position: 'relative',
                      }}
                    >
                      <div
                        className="scale-container"
                        style={{
                          transform: 'scale(0.25)',
                          transformOrigin: 'top left',
                          width: '600px',
                          height: 'auto',
                        }}
                      >
                        <div className="container mx-auto bg-white">
                          <header className="mb-20 flex justify-between p-5 text-white">
                            <div className="w-1/3 bg-blue-900 p-5 font-bold">
                              <div>
                                <h1 className="mb-7 text-lg">
                                  2330 <br />
                                  台灣積體電路製造股份有限公司
                                </h1>
                                <p className="font-semibold">
                                  2023年第四季 <br />
                                  合併財務報告 - 資產負債表
                                </p>
                              </div>
                            </div>
                            <div className="relative w-1/3 pr-5 pt-6 text-right">
                              <h2 className="relative inline-block pb-1 text-lg font-bold text-gray-400">
                                Balance Sheet
                                <div className="relative">
                                  <span className="block h-2 w-full bg-yellow-500"></span>
                                  <span
                                    className="block h-1 w-3/4 bg-blue-900"
                                    style={{ marginTop: '-0.125rem' }}
                                  ></span>
                                </div>
                              </h2>
                            </div>
                          </header>
                          <section className="p-5">
                            <div className="mb-4 flex justify-between font-semibold text-blue-900">
                              <p>一、項目彙總格式</p>
                              <p>單位：新台幣仟元</p>
                            </div>
                            <table className="w-full border-collapse bg-white">
                              <thead>
                                <tr>
                                  <th className="border border-gray-300 bg-yellow-200 p-2 text-sm font-semibold">
                                    代號
                                  </th>
                                  <th className="border border-gray-300 bg-yellow-200 p-2 text-sm font-semibold">
                                    會計項目
                                  </th>
                                  <th className="border border-gray-300 bg-yellow-200 p-2 text-right text-sm font-semibold">
                                    2023-12-31
                                  </th>
                                  <th className="border border-gray-300 bg-yellow-200 p-2 text-center text-sm font-semibold">
                                    %
                                  </th>
                                  <th className="border border-gray-300 bg-yellow-200 p-2 text-right text-sm font-semibold">
                                    2022-12-31
                                  </th>
                                  <th className="border border-gray-300 bg-yellow-200 p-2 text-center text-sm font-semibold">
                                    %
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td
                                    colSpan={6}
                                    className="border border-gray-300 p-2 font-semibold"
                                  >
                                    資產
                                  </td>
                                </tr>
                                <tr>
                                  <td className="border border-gray-300 p-2 text-sm">11XX</td>
                                  <td className="border border-gray-300 p-2 text-sm">
                                    流動資產合計
                                  </td>
                                  <td className="border border-gray-300 p-2 text-right text-sm">
                                    2,194,032,910
                                  </td>
                                  <td className="border border-gray-300 p-2 text-center text-sm">
                                    40
                                  </td>
                                  <td className="border border-gray-300 p-2 text-right text-sm">
                                    2,052,896,744
                                  </td>
                                  <td className="border border-gray-300 p-2 text-center text-sm">
                                    41
                                  </td>
                                </tr>
                                <tr>
                                  <td className="border border-gray-300 p-2 text-sm">15XX</td>
                                  <td className="border border-gray-300 p-2 text-sm">
                                    非流動資產合計
                                  </td>
                                  <td className="border border-gray-300 p-2 text-right text-sm">
                                    3,338,338,305
                                  </td>
                                  <td className="border border-gray-300 p-2 text-center text-sm">
                                    60
                                  </td>
                                  <td className="border border-gray-300 p-2 text-right text-sm">
                                    2,911,882,134
                                  </td>
                                  <td className="border border-gray-300 p-2 text-center text-sm">
                                    59
                                  </td>
                                </tr>
                                <tr>
                                  <td className="border border-gray-300 p-2 text-sm">1XXX</td>
                                  <td className="border border-gray-300 p-2 text-sm">資產總計</td>
                                  <td className="border border-gray-300 p-2 text-right text-sm">
                                    5,532,371,215
                                  </td>
                                  <td className="border border-gray-300 p-2 text-center text-sm">
                                    100
                                  </td>
                                  <td className="border border-gray-300 p-2 text-right text-sm">
                                    4,964,778,878
                                  </td>
                                  <td className="border border-gray-300 p-2 text-center text-sm">
                                    100
                                  </td>
                                </tr>
                                <tr>
                                  <td
                                    colSpan={6}
                                    className="border border-gray-300 p-2 font-semibold"
                                  >
                                    負債及權益
                                  </td>
                                </tr>
                                <tr>
                                  <td className="border border-gray-300 p-2 text-sm">21XX</td>
                                  <td className="border border-gray-300 p-2 text-sm">
                                    流動負債合計
                                  </td>
                                  <td className="border border-gray-300 p-2 text-right text-sm">
                                    913,583,316
                                  </td>
                                  <td className="border border-gray-300 p-2 text-center text-sm">
                                    16
                                  </td>
                                  <td className="border border-gray-300 p-2 text-right text-sm">
                                    944,226,817
                                  </td>
                                  <td className="border border-gray-300 p-2 text-center text-sm">
                                    19
                                  </td>
                                </tr>
                                <tr>
                                  <td className="border border-gray-300 p-2 text-sm">21XX</td>
                                  <td className="border border-gray-300 p-2 text-sm">
                                    非流動負債合計
                                  </td>
                                  <td className="border border-gray-300 p-2 text-right text-sm">
                                    1,135,525,052
                                  </td>
                                  <td className="border border-gray-300 p-2 text-center text-sm">
                                    21
                                  </td>
                                  <td className="border border-gray-300 p-2 text-right text-sm">
                                    944,226,817
                                  </td>
                                  <td className="border border-gray-300 p-2 text-center text-sm">
                                    19
                                  </td>
                                </tr>
                                <tr>
                                  <td className="border border-gray-300 p-2 text-sm">21XX</td>
                                  <td className="border border-gray-300 p-2 text-sm">負債總計</td>
                                  <td className="border border-gray-300 p-2 text-right text-sm">
                                    2,049,108,368
                                  </td>
                                  <td className="border border-gray-300 p-2 text-center text-sm">
                                    37
                                  </td>
                                  <td className="border border-gray-300 p-2 text-right text-sm">
                                    944,226,817
                                  </td>
                                  <td className="border border-gray-300 p-2 text-center text-sm">
                                    40
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </section>
                          <footer className="mt-5 flex items-center justify-between border-t-2 border-gray-300 bg-blue-900 p-2">
                            <p className="m-0 text-xs text-white">1</p>
                            <div className="font-bold text-white">
                              <img src="./logo.png" alt="" />
                            </div>
                          </footer>
                          <div className="pointer-events-none fixed top-1/2 flex w-full -translate-y-1/2 justify-between">
                            <button
                              id="prevPage"
                              type="button"
                              className="pointer-events-auto cursor-pointer border-none bg-none text-2xl text-gray-600"
                            >
                              <i className="bi bi-arrow-left"></i>
                            </button>
                            <button
                              id="nextPage"
                              type="button"
                              className="pointer-events-auto cursor-pointer border-none bg-none text-2xl text-gray-600"
                            >
                              <i className="bi bi-arrow-right"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {pdfFile ? (
            <div className="flex w-screen flex-1 items-center justify-center md:h-850px lg:w-full lg:bg-white">
              {/* Info: prev button (20240529 - Shirley) */}
              <button
                onClick={prevClickHandler}
                disabled={pageNumber <= 1}
                className="absolute left-0 top-40rem z-10 m-4 iphone12pro:top-40rem iphonexr:top-38rem md:bottom-56 lg:hidden"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  fill="none"
                  viewBox="0 0 17 16"
                >
                  <path
                    fill="#001840"
                    fillRule="evenodd"
                    d="M10.973 3.525c.26.26.26.683 0 .943L7.445 7.997l3.528 3.528a.667.667 0 11-.942.943l-4-4a.667.667 0 010-.943l4-4c.26-.26.682-.26.942 0z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </button>

              {/* Info: PDF 本體 for desktop (20240529 - Shirley) */}
              <div className="hidden lg:flex">
                <Document file={pdfFile} onLoadSuccess={onDocumentLoadSuccess}>
                  <Page scale={1} pageNumber={pageNumber} />
                </Document>
              </div>

              {/* Info: PDF 本體 for mobile (20240529 - Shirley) */}
              <div className="flex h-screen md:mt-20 lg:hidden">
                <Document
                  file={pdfFile}
                  onLoadSuccess={onDocumentLoadSuccess}
                  className={`relative`}
                >
                  <Page
                    scale={1}
                    pageNumber={pageNumber}
                    width={chartWidth}
                    height={chartHeight}
                    className="absolute left-8% top-1/3 w-full -translate-x-1/2 -translate-y-1/2 iphonese:left-11% iphonexr:left-14% sm:left-35% sm:top-1/2 md:left-35%"
                  />
                </Document>
              </div>

              {/* Info: next button (20240529 - Shirley) */}
              <button
                onClick={nextClickHandler}
                disabled={pageNumber >= numPages}
                className="absolute right-0 top-40rem z-10 m-4 iphone12pro:top-40rem iphonexr:top-38rem md:bottom-56 lg:hidden"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  fill="none"
                  viewBox="0 0 17 16"
                >
                  <path
                    fill="#001840"
                    fillRule="evenodd"
                    d="M6.03 3.525c.261-.26.683-.26.944 0l4 4c.26.26.26.683 0 .943l-4 4a.667.667 0 01-.943-.943l3.528-3.528-3.528-3.529a.667.667 0 010-.943z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex h-850px w-full flex-1 justify-center bg-white">
              {/* <p className="text-stroke-brand-secondary">{t('MY_REPORTS_SECTION.LOADING')}</p> */}
              {/* Info: (2024721 - Anna) 財報畫面 */}
              <div className="container mx-auto">
                <div className="bg-white">
                  <header className="flex justify-between text-white">
                    <div className="mt-8 flex w-1/3">
                      <div className="bg-primary-blue h-2 w-4/5"></div>
                      <div className="h-2 w-1/5 bg-yellow-500"></div>
                    </div>
                    <div className="w-1/3 pr-5 pt-6 text-right">
                      <h2 className="border-b-10 relative border-yellow-500 pb-1 text-xl font-bold text-surface-brand-secondary-soft">
                        Balance Sheet
                        <div className="bg-primary-blue absolute bottom-[-20px] right-0 h-1 w-3/4"></div>
                      </h2>
                    </div>
                  </header>
                  <section className="p-5">
                    <div className="mb-4 flex justify-between font-semibold text-blue-900">
                      <p>一、項目彙總格式</p>
                      <p>單位：新台幣仟元</p>
                    </div>
                    <table className="w-full border-collapse bg-white">
                      <thead>
                        <tr className="text-neutral-400">
                          <th className="border border-gray-300 bg-yellow-200 p-2 text-sm font-semibold">
                            代號
                          </th>
                          <th className="border border-gray-300 bg-yellow-200 p-2 text-sm font-semibold">
                            會計項目
                          </th>
                          <th className="border border-gray-300 bg-yellow-200 p-2 text-right text-sm font-semibold">
                            2023-12-31
                          </th>
                          <th className="border border-gray-300 bg-yellow-200 p-2 text-center text-sm font-semibold">
                            %
                          </th>
                          <th className="border border-gray-300 bg-yellow-200 p-2 text-right text-sm font-semibold">
                            2022-12-31
                          </th>
                          <th className="border border-gray-300 bg-yellow-200 p-2 text-center text-sm font-semibold">
                            %
                          </th>
                        </tr>
                      </thead>
                      <tbody className="text-neutral-400">
                        {/* page2 */}
                        {Object.prototype.hasOwnProperty.call(reportData, 'general') &&
                          reportData.general.slice(10, 18).map((value) => (
                            <tr key={value.name}>
                              <td className="border border-gray-300 p-2 text-center text-sm">
                                {value.code}
                              </td>
                              <td className="border border-gray-300 p-2 text-left text-sm">
                                {value.name}
                              </td>
                              <td className="border border-gray-300 p-2 text-right text-sm">
                                {value.curPeriodAmount}
                              </td>
                              <td className="border border-gray-300 p-2 text-center text-sm">
                                {value.curPeriodPercentage}
                              </td>
                              <td className="border border-gray-300 p-2 text-right text-sm">
                                {value.prePeriodAmount}
                              </td>
                              <td className="border border-gray-300 p-2 text-center text-sm">
                                {value.prePeriodPercentage}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </section>
                  <footer className="mt-5 flex items-center justify-between border-t-2 border-gray-300 bg-blue-900 p-2">
                    <p className="m-0 text-xs text-white">2</p>
                    <div className="font-bold text-white">
                      <img src="./logo.png" alt="" />
                    </div>
                  </footer>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="mt-5 flex justify-center">
          <Pagination
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            totalPages={totalPages}
            pagePrefix="page"
          />
        </div>
      </div>
    );
  }
};

export default ViewFinancialSection;
