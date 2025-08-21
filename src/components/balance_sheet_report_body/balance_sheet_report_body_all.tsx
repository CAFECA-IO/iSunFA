import { APIName } from '@/constants/api_connection';
import { NON_EXISTING_REPORT_ID } from '@/constants/config';
import { BalanceSheetReport, FinancialReportItem } from '@/interfaces/report';
import { useUserCtx } from '@/contexts/user_context';
import APIHandler from '@/lib/utils/api_handler';
import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import PieChart from '@/components/balance_sheet_report_body/pie_chart';
import PieChartAssets from '@/components/balance_sheet_report_body/pie_chart_assets';
import useStateRef from 'react-usestateref';
import { timestampToString } from '@/lib/utils/common';
import { SkeletonList } from '@/components/skeleton/skeleton';
import { DEFAULT_SKELETON_COUNT_FOR_PAGE } from '@/constants/display';
import { useTranslation } from 'next-i18next';
import CollapseButton from '@/components/button/collapse_button';
import { DecimalOperations } from '@/lib/utils/decimal_operations';

interface IBalanceSheetReportBodyAllProps {
  reportId: string;
}

// Info: (20241022 - Anna) 定義圓餅圖顏色（紅、藍、紫）
const ASSETS_LIABILITIES_EQUITY_COLOR = ['bg-[#FD6F8E]', 'bg-[#53B1FD]', 'bg-[#9B8AFB]'];

const COLORS = ['#FD6F8E', '#6CDEA0', '#F670C7', '#FD853A', '#53B1FD', '#9B8AFB'];

const COLOR_CLASSES = [
  'bg-[#FD6F8E]',
  'bg-[#6CDEA0]',
  'bg-[#F670C7]',
  'bg-[#FD853A]',
  'bg-[#53B1FD]',
  'bg-[#9B8AFB]',
];

const BalanceSheetReportBodyAll = ({ reportId }: IBalanceSheetReportBodyAllProps) => {
  const { t } = useTranslation('common');
  const { connectedAccountBook } = useUserCtx();

  const [curAssetLiabilityRatio, setCurAssetLiabilityRatio] = useStateRef<Array<string>>([]);
  const [preAssetLiabilityRatio, setPreAssetLiabilityRatio] = useStateRef<Array<string>>([]);
  const [curAssetLiabilityRatioLabels, setCurAssetLiabilityRatioLabels] = useStateRef<
    Array<string>
  >([]);
  const [preAssetLiabilityRatioLabels, setPreAssetLiabilityRatioLabels] = useStateRef<
    Array<string>
  >([]);

  const [curAssetMixRatio, setCurAssetMixRatio] = useStateRef<Array<string>>([]);
  const [preAssetMixRatio, setPreAssetMixRatio] = useStateRef<Array<string>>([]);
  const [curAssetMixLabels, setCurAssetMixLabels] = useStateRef<Array<string>>([]);
  const [preAssetMixLabels, setPreAssetMixLabels] = useStateRef<Array<string>>([]);

  const [curDate, setCurDate] = useStateRef<string>('');
  const [curYear, setCurYear] = useStateRef<string>('');
  const [preDate, setPreDate] = useStateRef<string>('');
  const [preYear, setPreYear] = useStateRef<string>('');

  const [financialReport, setFinancialReport] = useState<BalanceSheetReport | null>(null);
  const [isGetFinancialReportSuccess, setIsGetFinancialReportSuccess] = useState<boolean>(false);
  const [errorCode, setErrorCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { trigger: getFinancialReportAPI } = APIHandler<BalanceSheetReport>(
    APIName.REPORT_GET_BY_ID
  );

  useEffect(() => {
    if (isLoading) return;
    setIsLoading(true);

    const getFinancialReport = async () => {
      try {
        const {
          data,
          code,
          success: getReportFinancialSuccess,
        } = await getFinancialReportAPI({
          params: {
            companyId: 1,
            reportId: reportId ?? NON_EXISTING_REPORT_ID,
            accountBookId: connectedAccountBook?.id,
          },
        });
        if (!getReportFinancialSuccess) {
          setErrorCode(code);
          return;
        }
        setFinancialReport(data);
        setIsGetFinancialReportSuccess(getReportFinancialSuccess);
      } finally {
        setIsLoading(false);
      }
    };
    getFinancialReport();
  }, [reportId]);

  const isNoDataForCurALR = curAssetLiabilityRatio.every((value) => DecimalOperations.isZero(value));
  const isNoDataForPreALR = preAssetLiabilityRatio.every((value) => DecimalOperations.isZero(value));

  // Info: (20241001 - Anna) 管理表格摺疊狀態
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(false);
  const [isDetailCollapsed, setIsDetailCollapsed] = useState(false);
  // Info: (20241001 - Anna) 切換摺疊狀態
  const toggleSummaryTable = () => {
    setIsSummaryCollapsed(!isSummaryCollapsed);
  };

  const toggleDetailTable = () => {
    setIsDetailCollapsed(!isDetailCollapsed);
  };

  useEffect(() => {
    if (isGetFinancialReportSuccess === true && financialReport && financialReport?.otherInfo) {
      const currentDateString = timestampToString(financialReport.curDate.to ?? 0);
      const previousDateString = timestampToString(financialReport.preDate.to ?? 0);
      const currentYear = currentDateString.year;
      const previousYear = previousDateString.year;

      const curALR = financialReport.otherInfo.assetLiabilityRatio[currentDateString.date]
        ?.data || ['0', '0', '0'];
      const preALR = financialReport.otherInfo.assetLiabilityRatio[previousDateString.date]
        ?.data || ['0', '0', '0'];
      const curALRLabels = financialReport.otherInfo.assetLiabilityRatio[currentDateString.date]
        ?.labels || ['', '', ''];
      const preALRLabels = financialReport.otherInfo.assetLiabilityRatio[previousDateString.date]
        ?.labels || ['', '', ''];

      const curAMR = financialReport.otherInfo.assetMixRatio[currentDateString.date]?.data || [
        '0', '0', '0', '0', '0', '0',
      ];
      const curAMRLabels = financialReport.otherInfo.assetMixRatio[currentDateString.date]
        ?.labels || ['', '', '', '', '', '其他'];
      const preAMR = financialReport.otherInfo.assetMixRatio[previousDateString.date]?.data || [
        '0', '0', '0', '0', '0', '0',
      ];
      const preAMRLabels = financialReport.otherInfo.assetMixRatio[previousDateString.date]
        ?.labels || ['', '', '', '', '', '其他'];

      setCurAssetLiabilityRatio(curALR);
      setPreAssetLiabilityRatio(preALR);
      setCurAssetLiabilityRatioLabels(curALRLabels);
      setPreAssetLiabilityRatioLabels(preALRLabels);

      setCurAssetMixRatio(curAMR);
      setPreAssetMixRatio(preAMR);
      setCurAssetMixLabels(curAMRLabels);
      setPreAssetMixLabels(preAMRLabels);

      setCurDate(currentDateString.date);
      setPreDate(previousDateString.date);
      setCurYear(currentYear);
      setPreYear(previousYear);

      // Info: (20250214 - Anna) 新增過濾 general 和 details 的邏輯
      if (financialReport.general || financialReport.details) {
        const filteredGeneral = financialReport.general
          ? financialReport.general.filter((item) => {
              // Info: (20250219 - Anna) 如果是標題列（沒有 code），則保留
              if (!item.code) return true;
              return !(
                DecimalOperations.isZero(item.curPeriodAmount) &&
                DecimalOperations.isZero(item.curPeriodPercentage) &&
                DecimalOperations.isZero(item.prePeriodAmount) &&
                DecimalOperations.isZero(item.prePeriodPercentage)
              );
            })
          : [];

        const filteredDetails = financialReport.details
          ? financialReport.details.filter((item) => {
              // Info: (20250219 - Anna) 如果是標題列（沒有 code），則保留
              if (!item.code) return true;
              return !(
                DecimalOperations.isZero(item.curPeriodAmount) &&
                DecimalOperations.isZero(item.curPeriodPercentage) &&
                DecimalOperations.isZero(item.prePeriodAmount) &&
                DecimalOperations.isZero(item.prePeriodPercentage)
              );
            })
          : [];

        // Info: (20250219 - Anna) 如果資料沒有變化，就不要呼叫 `setFinancialReport`
        if (
          JSON.stringify(financialReport.general) !== JSON.stringify(filteredGeneral) ||
          JSON.stringify(financialReport.details) !== JSON.stringify(filteredDetails)
        ) {
          setFinancialReport((prev) => {
            if (!prev) return null; //  Info: (20250219 - Anna) 如果 prev 為 null，則不更新 state
            return {
              ...prev,
              general: filteredGeneral,
              details: filteredDetails,
            };
          });
        }
      }
    }
  }, [financialReport]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-surface-neutral-main-background">
        <SkeletonList count={DEFAULT_SKELETON_COUNT_FOR_PAGE} />
      </div>
    );
  } else if (
    !isGetFinancialReportSuccess ||
    !financialReport ||
    !Object.prototype.hasOwnProperty.call(financialReport, 'otherInfo') ||
    !financialReport.otherInfo ||
    !Object.prototype.hasOwnProperty.call(financialReport.otherInfo, 'assetLiabilityRatio') ||
    !Object.prototype.hasOwnProperty.call(financialReport.otherInfo, 'assetMixRatio') ||
    !Object.prototype.hasOwnProperty.call(financialReport.otherInfo, 'dso') ||
    !Object.prototype.hasOwnProperty.call(financialReport.otherInfo, 'inventoryTurnoverDays')
  ) {
    return <div>Error {errorCode}</div>;
  }

  const displayedCurALRChart = isNoDataForCurALR ? (
    <div className="flex w-300px items-center justify-center">
      <div
        className="flex items-center justify-center rounded-full bg-neutral-100 text-xl text-white"
        style={{
          width: '232px',
          height: '232px',
        }}
      >
        {t('reports:REPORTS.NO_DATA')}
      </div>
    </div>
  ) : (
    <div className="ml-10">
      <PieChart data={curAssetLiabilityRatio.map(val => parseFloat(val))} />
    </div>
  );

  const displayedPreALRChart = isNoDataForPreALR ? (
    <div className="flex w-300px items-center justify-center">
      <div
        className="flex items-center justify-center rounded-full bg-neutral-100 text-xl text-white"
        style={{
          width: '232px',
          height: '232px',
        }}
      >
        {t('reports:REPORTS.NO_DATA')}
      </div>
    </div>
  ) : (
    <div className="ml-10">
      <PieChart data={preAssetLiabilityRatio.map(val => parseFloat(val))} />
    </div>
  );

  const renderedFooter = (pageNumber: number) => {
    return (
      <footer className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between bg-surface-brand-secondary p-10px">
        <p className="text-xs text-white">{pageNumber}</p>
        <div className="text-base font-bold text-surface-brand-secondary">
          <Image width={80} height={20} src="/logo/white_isunfa_logo_light.svg" alt="iSunFA Logo" />
        </div>
      </footer>
    );
  };

  const renderDataRow = (
    label: string,
    curValue: number | undefined,
    preValue: number | undefined
  ) => (
    <tr>
      <td className="border border-stroke-neutral-quaternary p-10px text-xs">{label}</td>
      <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs">
        {curValue}
      </td>
      <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs">
        {preValue}
      </td>
    </tr>
  );

  const rowsForPage1 = (items: Array<FinancialReportItem>) => {
    const rows = items.slice(0, 9).map((item, index) => {
      if (!item.code) {
        return (
          <tr key={`${item.code + item.name + index}`}>
            <td
              colSpan={6}
              className="border border-stroke-neutral-quaternary p-10px text-xs font-bold"
            >
              {item.name}
            </td>
          </tr>
        );
      }

      return (
        // Info: (20240723 - Shirley) it's ok to use index in the static data
        <tr key={item.code}>
          <td className="border border-stroke-neutral-quaternary p-10px text-xs">{item.code}</td>
          <td className="border border-stroke-neutral-quaternary p-10px text-xs">{item.name}</td>
          <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs">
            {
              DecimalOperations.isZero(item.curPeriodAmount)
                ? '-' // Info: (20241022 - Anna) 如果數字是 0，顯示 "-"
                : DecimalOperations.isNegative(item.curPeriodAmount)
                  ? `(${parseFloat(DecimalOperations.abs(item.curPeriodAmount)).toLocaleString()})` // Info: (20241022 - Anna) 負數，顯示括號和千分位
                  : parseFloat(item.curPeriodAmount).toLocaleString() // Info: (20241022 - Anna) 正數，顯示千分位
            }
          </td>
          <td className="border border-stroke-neutral-quaternary p-10px text-center text-xs">
            {DecimalOperations.isZero(item.curPeriodPercentage)
              ? '-'
              : DecimalOperations.isNegative(item.curPeriodPercentage)
                ? `(${parseFloat(DecimalOperations.abs(item.curPeriodPercentage)).toLocaleString()})`
                : `${parseFloat(item.curPeriodPercentage).toLocaleString()}`}
          </td>
          <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs">
            {DecimalOperations.isZero(item.prePeriodAmount)
              ? '-'
              : DecimalOperations.isNegative(item.prePeriodAmount)
                ? `(${parseFloat(DecimalOperations.abs(item.prePeriodAmount)).toLocaleString()})`
                : parseFloat(item.prePeriodAmount).toLocaleString()}
          </td>
          <td className="border border-stroke-neutral-quaternary p-10px text-center text-xs">
            {DecimalOperations.isZero(item.prePeriodPercentage)
              ? '-'
              : DecimalOperations.isNegative(item.prePeriodPercentage)
                ? `(${parseFloat(DecimalOperations.abs(item.prePeriodPercentage)).toLocaleString()})`
                : `${item.prePeriodPercentage.toLocaleString()}`}
          </td>
        </tr>
      );
    });
    return rows;
  };

  const rowsForPage2 = (items: Array<FinancialReportItem>) => {
    const rows = items.slice(9, 20).map((item, index) => {
      if (!item.code) {
        return (
          <tr key={`${item.code + item.name + index}`}>
            <td
              colSpan={6}
              className="border border-stroke-neutral-quaternary p-10px text-xs font-bold"
            >
              {item.name}
            </td>
          </tr>
        );
      }

      return (
        // Info: (20240723 - Shirley) it's ok to use index in the static data
        <tr key={item.code}>
          <td className="border border-stroke-neutral-quaternary p-10px text-xs">{item.code}</td>
          <td className="border border-stroke-neutral-quaternary p-10px text-xs">{item.name}</td>
          <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs">
            {DecimalOperations.isZero(item.curPeriodAmount)
              ? '-'
              : DecimalOperations.isNegative(item.curPeriodAmount)
                ? `(${parseFloat(DecimalOperations.abs(item.curPeriodAmount)).toLocaleString()})`
                : parseFloat(item.curPeriodAmount).toLocaleString()}
          </td>
          <td className="border border-stroke-neutral-quaternary p-10px text-center text-xs">
            {DecimalOperations.isZero(item.curPeriodPercentage)
              ? '-'
              : DecimalOperations.isNegative(item.curPeriodPercentage)
                ? `(${parseFloat(DecimalOperations.abs(item.curPeriodPercentage)).toLocaleString()})`
                : `${parseFloat(item.curPeriodPercentage).toLocaleString()}`}
          </td>
          <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs">
            {DecimalOperations.isZero(item.prePeriodAmount)
              ? '-'
              : DecimalOperations.isNegative(item.prePeriodAmount)
                ? `(${parseFloat(DecimalOperations.abs(item.prePeriodAmount)).toLocaleString()})`
                : parseFloat(item.prePeriodAmount).toLocaleString()}
          </td>
          <td className="border border-stroke-neutral-quaternary p-10px text-center text-xs">
            {DecimalOperations.isZero(item.prePeriodPercentage)
              ? '-'
              : DecimalOperations.isNegative(item.prePeriodPercentage)
                ? `(${parseFloat(DecimalOperations.abs(item.prePeriodPercentage)).toLocaleString()})`
                : `${item.prePeriodPercentage.toLocaleString()}`}
          </td>
        </tr>
      );
    });
    return rows;
  };

  const rowsForPage3 = (items: Array<FinancialReportItem>) => {
    const rows = items.slice(0, 13).map((item, index) => {
      if (!item.code) {
        return (
          <tr key={`${item.code + item.name + index}`}>
            <td
              colSpan={6}
              className="border border-stroke-neutral-quaternary p-10px text-xs font-bold"
            >
              {item.name}
            </td>
          </tr>
        );
      }

      return (
        // Info: (20240723 - Shirley) it's ok to use index in the static data
        <tr key={item.code}>
          <td className="border border-stroke-neutral-quaternary p-10px text-xs">{item.code}</td>
          <td className="border border-stroke-neutral-quaternary p-10px text-xs">{item.name}</td>
          <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs">
            {DecimalOperations.isZero(item.curPeriodAmount)
              ? '-'
              : DecimalOperations.isNegative(item.curPeriodAmount)
                ? `(${parseFloat(DecimalOperations.abs(item.curPeriodAmount)).toLocaleString()})`
                : parseFloat(item.curPeriodAmount).toLocaleString()}
          </td>
          <td className="border border-stroke-neutral-quaternary p-10px text-center text-xs">
            {DecimalOperations.isZero(item.curPeriodPercentage)
              ? '-'
              : DecimalOperations.isNegative(item.curPeriodPercentage)
                ? `(${parseFloat(DecimalOperations.abs(item.curPeriodPercentage)).toLocaleString()})`
                : `${parseFloat(item.curPeriodPercentage).toLocaleString()}`}
          </td>
          <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs">
            {DecimalOperations.isZero(item.prePeriodAmount)
              ? '-'
              : DecimalOperations.isNegative(item.prePeriodAmount)
                ? `(${parseFloat(DecimalOperations.abs(item.prePeriodAmount)).toLocaleString()})`
                : parseFloat(item.prePeriodAmount).toLocaleString()}
          </td>
          <td className="border border-stroke-neutral-quaternary p-10px text-center text-xs">
            {DecimalOperations.isZero(item.prePeriodPercentage)
              ? '-'
              : DecimalOperations.isNegative(item.prePeriodPercentage)
                ? `(${parseFloat(DecimalOperations.abs(item.prePeriodPercentage)).toLocaleString()})`
                : `${item.prePeriodPercentage.toLocaleString()}`}
          </td>
        </tr>
      );
    });
    return rows;
  };

  const rowsForPage4 = (items: Array<FinancialReportItem>) => {
    const rows = items.slice(13, 26).map((item, index) => {
      if (!item.code) {
        return (
          <tr key={`${item.code + item.name + index}`}>
            <td
              colSpan={6}
              className="border border-stroke-neutral-quaternary p-10px text-xs font-bold"
            >
              {item.name}
            </td>
          </tr>
        );
      }

      return (
        // Info: (20240723 - Shirley) it's ok to use index in the static data
        <tr key={item.code}>
          <td className="border border-stroke-neutral-quaternary p-10px text-xs">{item.code}</td>
          <td className="border border-stroke-neutral-quaternary p-10px text-xs">{item.name}</td>
          <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs">
            {DecimalOperations.isZero(item.curPeriodAmount)
              ? '-'
              : DecimalOperations.isNegative(item.curPeriodAmount)
                ? `(${parseFloat(DecimalOperations.abs(item.curPeriodAmount)).toLocaleString()})`
                : parseFloat(item.curPeriodAmount).toLocaleString()}
          </td>
          <td className="border border-stroke-neutral-quaternary p-10px text-center text-xs">
            {DecimalOperations.isZero(item.curPeriodPercentage)
              ? '-'
              : DecimalOperations.isNegative(item.curPeriodPercentage)
                ? `(${parseFloat(DecimalOperations.abs(item.curPeriodPercentage)).toLocaleString()})`
                : `${parseFloat(item.curPeriodPercentage).toLocaleString()}`}
          </td>
          <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs">
            {DecimalOperations.isZero(item.prePeriodAmount)
              ? '-'
              : DecimalOperations.isNegative(item.prePeriodAmount)
                ? `(${parseFloat(DecimalOperations.abs(item.prePeriodAmount)).toLocaleString()})`
                : parseFloat(item.prePeriodAmount).toLocaleString()}
          </td>
          <td className="border border-stroke-neutral-quaternary p-10px text-center text-xs">
            {DecimalOperations.isZero(item.prePeriodPercentage)
              ? '-'
              : DecimalOperations.isNegative(item.prePeriodPercentage)
                ? `(${parseFloat(DecimalOperations.abs(item.prePeriodPercentage)).toLocaleString()})`
                : `${item.prePeriodPercentage.toLocaleString()}`}
          </td>
        </tr>
      );
    });
    return rows;
  };

  const rowsForPage5 = (items: Array<FinancialReportItem>) => {
    const rows = items.slice(26, 39).map((item, index) => {
      if (!item.code) {
        return (
          <tr key={`${item.code + item.name + index}`}>
            <td
              colSpan={6}
              className="border border-stroke-neutral-quaternary p-10px text-xs font-bold"
            >
              {item.name}
            </td>
          </tr>
        );
      }

      return (
        // Info: (20240723 - Shirley) it's ok to use index in the static data
        <tr key={item.code}>
          <td className="border border-stroke-neutral-quaternary p-10px text-xs">{item.code}</td>
          <td className="border border-stroke-neutral-quaternary p-10px text-xs">{item.name}</td>
          <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs">
            {DecimalOperations.isZero(item.curPeriodAmount)
              ? '-'
              : DecimalOperations.isNegative(item.curPeriodAmount)
                ? `(${parseFloat(DecimalOperations.abs(item.curPeriodAmount)).toLocaleString()})`
                : parseFloat(item.curPeriodAmount).toLocaleString()}
          </td>
          <td className="border border-stroke-neutral-quaternary p-10px text-center text-xs">
            {DecimalOperations.isZero(item.curPeriodPercentage)
              ? '-'
              : DecimalOperations.isNegative(item.curPeriodPercentage)
                ? `(${parseFloat(DecimalOperations.abs(item.curPeriodPercentage)).toLocaleString()})`
                : `${parseFloat(item.curPeriodPercentage).toLocaleString()}`}
          </td>
          <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs">
            {DecimalOperations.isZero(item.prePeriodAmount)
              ? '-'
              : DecimalOperations.isNegative(item.prePeriodAmount)
                ? `(${parseFloat(DecimalOperations.abs(item.prePeriodAmount)).toLocaleString()})`
                : parseFloat(item.prePeriodAmount).toLocaleString()}
          </td>
          <td className="border border-stroke-neutral-quaternary p-10px text-center text-xs">
            {DecimalOperations.isZero(item.prePeriodPercentage)
              ? '-'
              : DecimalOperations.isNegative(item.prePeriodPercentage)
                ? `(${parseFloat(DecimalOperations.abs(item.prePeriodPercentage)).toLocaleString()})`
                : `${item.prePeriodPercentage.toLocaleString()}`}
          </td>
        </tr>
      );
    });
    return rows;
  };

  const rowsForPage6 = (items: Array<FinancialReportItem>) => {
    const rows = items.slice(39, 53).map((item, index) => {
      if (!item.code) {
        return (
          <tr key={`${item.code + item.name + index}`}>
            <td
              colSpan={6}
              className="border border-stroke-neutral-quaternary p-10px text-xs font-bold"
            >
              {item.name}
            </td>
          </tr>
        );
      }

      return (
        // Info: (20240723 - Shirley) it's ok to use index in the static data
        <tr key={item.code}>
          <td className="border border-stroke-neutral-quaternary p-10px text-xs">{item.code}</td>
          <td className="border border-stroke-neutral-quaternary p-10px text-xs">{item.name}</td>
          <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs">
            {DecimalOperations.isZero(item.curPeriodAmount)
              ? '-'
              : DecimalOperations.isNegative(item.curPeriodAmount)
                ? `(${parseFloat(DecimalOperations.abs(item.curPeriodAmount)).toLocaleString()})`
                : parseFloat(item.curPeriodAmount).toLocaleString()}
          </td>
          <td className="border border-stroke-neutral-quaternary p-10px text-center text-xs">
            {DecimalOperations.isZero(item.curPeriodPercentage)
              ? '-'
              : DecimalOperations.isNegative(item.curPeriodPercentage)
                ? `(${parseFloat(DecimalOperations.abs(item.curPeriodPercentage)).toLocaleString()})`
                : `${parseFloat(item.curPeriodPercentage).toLocaleString()}`}
          </td>
          <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs">
            {DecimalOperations.isZero(item.prePeriodAmount)
              ? '-'
              : DecimalOperations.isNegative(item.prePeriodAmount)
                ? `(${parseFloat(DecimalOperations.abs(item.prePeriodAmount)).toLocaleString()})`
                : parseFloat(item.prePeriodAmount).toLocaleString()}
          </td>
          <td className="border border-stroke-neutral-quaternary p-10px text-center text-xs">
            {DecimalOperations.isZero(item.prePeriodPercentage)
              ? '-'
              : DecimalOperations.isNegative(item.prePeriodPercentage)
                ? `(${parseFloat(DecimalOperations.abs(item.prePeriodPercentage)).toLocaleString()})`
                : `${item.prePeriodPercentage.toLocaleString()}`}
          </td>
        </tr>
      );
    });
    return rows;
  };

  const rowsForPage7 = (items: Array<FinancialReportItem>) => {
    const rows = items.slice(53, 67).map((item, index) => {
      if (!item.code) {
        return (
          <tr key={`${item.code + item.name + index}`}>
            <td
              colSpan={6}
              className="border border-stroke-neutral-quaternary p-10px text-xs font-bold"
            >
              {item.name}
            </td>
          </tr>
        );
      }

      return (
        // Info: (20240723 - Shirley) it's ok to use index in the static data
        <tr key={item.code}>
          <td className="border border-stroke-neutral-quaternary p-10px text-xs">{item.code}</td>
          <td className="border border-stroke-neutral-quaternary p-10px text-xs">{item.name}</td>
          <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs">
            {DecimalOperations.isZero(item.curPeriodAmount)
              ? '-'
              : DecimalOperations.isNegative(item.curPeriodAmount)
                ? `(${parseFloat(DecimalOperations.abs(item.curPeriodAmount)).toLocaleString()})`
                : parseFloat(item.curPeriodAmount).toLocaleString()}
          </td>
          <td className="border border-stroke-neutral-quaternary p-10px text-center text-xs">
            {DecimalOperations.isZero(item.curPeriodPercentage)
              ? '-'
              : DecimalOperations.isNegative(item.curPeriodPercentage)
                ? `(${parseFloat(DecimalOperations.abs(item.curPeriodPercentage)).toLocaleString()})`
                : `${parseFloat(item.curPeriodPercentage).toLocaleString()}`}
          </td>
          <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs">
            {DecimalOperations.isZero(item.prePeriodAmount)
              ? '-'
              : DecimalOperations.isNegative(item.prePeriodAmount)
                ? `(${parseFloat(DecimalOperations.abs(item.prePeriodAmount)).toLocaleString()})`
                : parseFloat(item.prePeriodAmount).toLocaleString()}
          </td>
          <td className="border border-stroke-neutral-quaternary p-10px text-center text-xs">
            {DecimalOperations.isZero(item.prePeriodPercentage)
              ? '-'
              : DecimalOperations.isNegative(item.prePeriodPercentage)
                ? `(${parseFloat(DecimalOperations.abs(item.prePeriodPercentage)).toLocaleString()})`
                : `${item.prePeriodPercentage.toLocaleString()}`}
          </td>
        </tr>
      );
    });
    return rows;
  };

  const rowsForPage8 = (items: Array<FinancialReportItem>) => {
    const rows = items.slice(67, 80).map((item, index) => {
      if (!item.code) {
        return (
          <tr key={`${item.code + item.name + index}`}>
            <td
              colSpan={6}
              className="border border-stroke-neutral-quaternary p-10px text-xs font-bold"
            >
              {item.name}
            </td>
          </tr>
        );
      }

      return (
        // Info: (20240723 - Shirley) it's ok to use index in the static data
        <tr key={item.code}>
          <td className="border border-stroke-neutral-quaternary p-10px text-xs">{item.code}</td>
          <td className="border border-stroke-neutral-quaternary p-10px text-xs">{item.name}</td>
          <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs">
            {DecimalOperations.isZero(item.curPeriodAmount)
              ? '-'
              : DecimalOperations.isNegative(item.curPeriodAmount)
                ? `(${parseFloat(DecimalOperations.abs(item.curPeriodAmount)).toLocaleString()})`
                : parseFloat(item.curPeriodAmount).toLocaleString()}
          </td>
          <td className="border border-stroke-neutral-quaternary p-10px text-center text-xs">
            {DecimalOperations.isZero(item.curPeriodPercentage)
              ? '-'
              : DecimalOperations.isNegative(item.curPeriodPercentage)
                ? `(${parseFloat(DecimalOperations.abs(item.curPeriodPercentage)).toLocaleString()})`
                : `${parseFloat(item.curPeriodPercentage).toLocaleString()}`}
          </td>
          <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs">
            {DecimalOperations.isZero(item.prePeriodAmount)
              ? '-'
              : DecimalOperations.isNegative(item.prePeriodAmount)
                ? `(${parseFloat(DecimalOperations.abs(item.prePeriodAmount)).toLocaleString()})`
                : parseFloat(item.prePeriodAmount).toLocaleString()}
          </td>
          <td className="border border-stroke-neutral-quaternary p-10px text-center text-xs">
            {DecimalOperations.isZero(item.prePeriodPercentage)
              ? '-'
              : DecimalOperations.isNegative(item.prePeriodPercentage)
                ? `(${parseFloat(DecimalOperations.abs(item.prePeriodPercentage)).toLocaleString()})`
                : `${item.prePeriodPercentage.toLocaleString()}`}
          </td>
        </tr>
      );
    });
    return rows;
  };

  const rowsForPage9 = (items: Array<FinancialReportItem>) => {
    const rows = items.slice(80, 91).map((item, index) => {
      if (!item.code) {
        return (
          <tr key={`${item.code + item.name + index}`}>
            <td
              colSpan={6}
              className="border border-stroke-neutral-quaternary p-10px text-xs font-bold"
            >
              {item.name}
            </td>
          </tr>
        );
      }

      return (
        // Info: (20240723 - Shirley) it's ok to use index in the static data
        <tr key={item.code}>
          <td className="border border-stroke-neutral-quaternary p-10px text-xs">{item.code}</td>
          <td className="border border-stroke-neutral-quaternary p-10px text-xs">{item.name}</td>
          <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs">
            {DecimalOperations.isZero(item.curPeriodAmount)
              ? '-'
              : DecimalOperations.isNegative(item.curPeriodAmount)
                ? `(${parseFloat(DecimalOperations.abs(item.curPeriodAmount)).toLocaleString()})`
                : parseFloat(item.curPeriodAmount).toLocaleString()}
          </td>
          <td className="border border-stroke-neutral-quaternary p-10px text-center text-xs">
            {DecimalOperations.isZero(item.curPeriodPercentage)
              ? '-'
              : DecimalOperations.isNegative(item.curPeriodPercentage)
                ? `(${parseFloat(DecimalOperations.abs(item.curPeriodPercentage)).toLocaleString()})`
                : `${parseFloat(item.curPeriodPercentage).toLocaleString()}`}
          </td>
          <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs">
            {DecimalOperations.isZero(item.prePeriodAmount)
              ? '-'
              : DecimalOperations.isNegative(item.prePeriodAmount)
                ? `(${parseFloat(DecimalOperations.abs(item.prePeriodAmount)).toLocaleString()})`
                : parseFloat(item.prePeriodAmount).toLocaleString()}
          </td>
          <td className="border border-stroke-neutral-quaternary p-10px text-center text-xs">
            {DecimalOperations.isZero(item.prePeriodPercentage)
              ? '-'
              : DecimalOperations.isNegative(item.prePeriodPercentage)
                ? `(${parseFloat(DecimalOperations.abs(item.prePeriodPercentage)).toLocaleString()})`
                : `${item.prePeriodPercentage.toLocaleString()}`}
          </td>
        </tr>
      );
    });
    return rows;
  };

  const page1 = (
    <div id="1" className="relative h-a4-height overflow-y-hidden">
      {/* Info: (20240723 - Shirley) watermark logo */}
      <div className="relative right-0 top-16 z-0">
        <Image
          className="absolute right-0 top-0"
          src="/logo/watermark_logo.svg"
          alt="isunfa logo"
          width={400}
          height={300}
        />
      </div>

      <header className="mb-12 flex justify-between pl-0 text-white">
        <div className="w-3/10 bg-surface-brand-secondary pb-14px pl-10px pr-14px pt-40px font-bold">
          <div className="">
            {financialReport && financialReport.company && (
              <>
                <h1 className="mb-30px text-h6">
                  {financialReport.company.code} <br />
                  {financialReport.company.name}
                </h1>
                <p className="text-left text-xs font-bold leading-5">
                  {curDate}
                  <br />
                  財務報告 - 資產負債表
                </p>
              </>
            )}
          </div>
        </div>
        <div className="box-border w-35% text-right">
          <h2 className="relative border-b-6px border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Balance Sheet
            <span className="absolute -bottom-20px right-0 h-5px w-9/12 bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>

      <section className="mx-1 text-text-neutral-secondary">
        <div className="relative z-1 mb-16px flex justify-between text-xs font-semibold text-surface-brand-secondary">
          <div className="flex items-center">
            <p>{t('reports:REPORTS.ITEM_SUMMARY_FORMAT')}</p>
            <CollapseButton onClick={toggleSummaryTable} isCollapsed={isSummaryCollapsed} />
          </div>
          <p>
            {t('reports:REPORTS.UNIT_NEW_TAIWAN_DOLLARS')}
            {financialReport.company.accountingSetting?.currency}
          </p>
        </div>
        {!isSummaryCollapsed && (
          <table className="relative z-1 w-full border-collapse bg-white">
            <thead>
              <tr>
                <th className="w-50px whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-xs font-semibold">
                  {t('reports:TAX_REPORT.CODE_NUMBER')}
                </th>
                <th className="w-400px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-xs font-semibold">
                  {t('reports:REPORTS.ACCOUNTING_ITEMS')}
                </th>
                <th className="w-120px whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                  {curDate}
                </th>
                <th className="w-60px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                  %
                </th>
                <th className="w-120px whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                  {preDate}
                </th>
                <th className="w-60px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                  %
                </th>
              </tr>
            </thead>
            <tbody>
              {financialReport &&
                financialReport.general &&
                Object.prototype.hasOwnProperty.call(financialReport, 'general') &&
                rowsForPage1(financialReport.general)}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );

  const page2 = (
    <div id="2" className="relative h-a4-height overflow-y-hidden">
      <header className="flex justify-between text-white">
        <div className="flex flex-col">
          <div className="h-1 bg-surface-brand-secondary"></div>
          <div className="mt-1 h-1 bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative border-b-6px border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Balance Sheet
            <span className="absolute -bottom-20px right-0 h-5px w-9/12 bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="mx-1 text-text-neutral-secondary">
        <div className="mb-16px mt-32px flex justify-between text-xs font-semibold text-surface-brand-secondary">
          <p>{t('reports:REPORTS.ITEM_SUMMARY_FORMAT')}</p>
          <p>
            {t('reports:REPORTS.UNIT_NEW_TAIWAN_DOLLARS')}
            {financialReport.company.accountingSetting?.currency}
          </p>
        </div>
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="w-50px whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-xs font-semibold">
                {t('reports:TAX_REPORT.CODE_NUMBER')}
              </th>
              <th className="w-400px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-xs font-semibold">
                {t('reports:REPORTS.ACCOUNTING_ITEMS')}
              </th>
              <th className="w-120px whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                {curDate}
              </th>
              <th className="w-60px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                %
              </th>
              <th className="w-120px whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                {preDate}
              </th>
              <th className="w-60px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {financialReport &&
              financialReport.general &&
              Object.prototype.hasOwnProperty.call(financialReport, 'general') &&
              rowsForPage2(financialReport.general)}
          </tbody>
        </table>

        {/* Info: (20240723 - Shirley) watermark logo */}
        <div className="relative bottom-20 right-0 -z-10">
          <Image
            className="absolute right-0 top-0"
            src="/logo/watermark_logo.svg"
            alt="isunfa logo"
            width={450}
            height={300}
          />
        </div>
      </section>
    </div>
  );
  const page3 = (
    <div id="3" className="relative h-a4-height overflow-y-hidden">
      <header className="flex justify-between text-white">
        <div className="mt-30px flex w-28%">
          <div className="h-10px w-82.5% bg-surface-brand-secondary"></div>
          <div className="h-10px w-17.5% bg-surface-brand-primary"></div>
        </div>
        <div className="flex flex-col">
          <div className="h-1 bg-surface-brand-secondary"></div>
          <div className="mt-1 h-1 bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative border-b-6px border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Balance Sheet
            <span className="absolute -bottom-20px right-0 h-5px w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="mx-1 text-text-neutral-secondary">
        <div className="mb-16px mt-32px flex justify-between text-xs font-semibold text-surface-brand-secondary">
          <div className="flex items-center">
            <p>{t('reports:REPORTS.DETAILED_CLASSIFICATION_FORMAT')}</p>
            <CollapseButton onClick={toggleDetailTable} isCollapsed={isDetailCollapsed} />
          </div>
          <p>
            {t('reports:REPORTS.UNIT_NEW_TAIWAN_DOLLARS')}
            {financialReport.company.accountingSetting?.currency}
          </p>
        </div>
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="w-50px whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-xs font-semibold">
                {t('reports:TAX_REPORT.CODE_NUMBER')}
              </th>
              <th className="w-400px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-xs font-semibold">
                {t('reports:REPORTS.ACCOUNTING_ITEMS')}
              </th>
              <th className="w-120px whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                {curDate}
              </th>
              <th className="w-60px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                %
              </th>
              <th className="w-120px whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                {preDate}
              </th>
              <th className="w-60px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {financialReport &&
              financialReport.general &&
              Object.prototype.hasOwnProperty.call(financialReport, 'general') &&
              rowsForPage3(financialReport.details)}
          </tbody>
        </table>
      </section>
    </div>
  );
  const page4 = (
    <div id="4" className="relative h-a4-height overflow-y-hidden">
      <header className="flex justify-between text-white">
        <div className="mt-30px flex w-28%">
          <div className="h-10px w-82.5% bg-surface-brand-secondary"></div>
          <div className="h-10px w-17.5% bg-surface-brand-primary"></div>
        </div>
        <div className="flex flex-col">
          <div className="h-1 bg-surface-brand-secondary"></div>
          <div className="mt-1 h-1 bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative border-b-6px border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Balance Sheet
            <span className="absolute -bottom-20px right-0 h-5px w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="mx-1 text-text-neutral-secondary">
        <div className="mb-16px mt-32px flex justify-between text-xs font-semibold text-surface-brand-secondary">
          <p>{t('reports:REPORTS.DETAILED_CLASSIFICATION_FORMAT')}</p>
          <p>
            {t('reports:REPORTS.UNIT_NEW_TAIWAN_DOLLARS')}
            {financialReport.company.accountingSetting?.currency}
          </p>
        </div>
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="w-50px whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-xs font-semibold">
                {t('reports:TAX_REPORT.CODE_NUMBER')}
              </th>
              <th className="w-400px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-xs font-semibold">
                {t('reports:REPORTS.ACCOUNTING_ITEMS')}
              </th>
              <th className="w-120px whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                {curDate}
              </th>
              <th className="w-60px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                %
              </th>
              <th className="w-120px whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                {preDate}
              </th>
              <th className="w-60px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {financialReport &&
              financialReport.general &&
              Object.prototype.hasOwnProperty.call(financialReport, 'details') &&
              rowsForPage4(financialReport.details)}
          </tbody>
        </table>
      </section>
    </div>
  );
  const page5 = (
    <div id="5" className="relative h-a4-height overflow-y-hidden">
      <header className="flex justify-between text-white">
        <div className="mt-30px flex w-28%">
          <div className="h-10px w-82.5% bg-surface-brand-secondary"></div>
          <div className="h-10px w-17.5% bg-surface-brand-primary"></div>
        </div>
        <div className="flex flex-col">
          <div className="h-1 bg-surface-brand-secondary"></div>
          <div className="mt-1 h-1 bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative border-b-6px border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Balance Sheet
            <span className="absolute -bottom-20px right-0 h-5px w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="mx-1 text-text-neutral-secondary">
        <div className="mb-16px mt-32px flex justify-between text-xs font-semibold text-surface-brand-secondary">
          <p>{t('reports:REPORTS.DETAILED_CLASSIFICATION_FORMAT')}</p>
          <p>
            {t('reports:REPORTS.UNIT_NEW_TAIWAN_DOLLARS')}
            {financialReport.company.accountingSetting?.currency}
          </p>
        </div>
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="w-50px whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-xs font-semibold">
                {t('reports:TAX_REPORT.CODE_NUMBER')}
              </th>
              <th className="w-400px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-xs font-semibold">
                {t('reports:REPORTS.ACCOUNTING_ITEMS')}
              </th>
              <th className="w-120px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-end text-xs font-semibold">
                {curDate}
              </th>
              <th className="w-60px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                %
              </th>
              <th className="w-120px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-end text-xs font-semibold">
                {preDate}
              </th>
              <th className="w-60px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {financialReport &&
              financialReport.details &&
              Object.prototype.hasOwnProperty.call(financialReport, 'details') &&
              rowsForPage5(financialReport.details)}
          </tbody>
        </table>
      </section>
    </div>
  );
  const page6 = (
    <div id="6" className="relative h-a4-height overflow-y-hidden">
      <header className="flex justify-between text-white">
        <div className="mt-30px flex w-28%">
          <div className="h-10px w-82.5% bg-surface-brand-secondary"></div>
          <div className="h-10px w-17.5% bg-surface-brand-primary"></div>
        </div>
        <div className="flex flex-col">
          <div className="h-1 bg-surface-brand-secondary"></div>
          <div className="mt-1 h-1 bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative border-b-6px border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Balance Sheet
            <span className="absolute -bottom-20px right-0 h-5px w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="mx-1 text-text-neutral-secondary">
        <div className="mb-16px mt-32px flex justify-between text-xs font-semibold text-surface-brand-secondary">
          <p>{t('reports:REPORTS.DETAILED_CLASSIFICATION_FORMAT')}</p>
          <p>
            {t('reports:REPORTS.UNIT_NEW_TAIWAN_DOLLARS')}
            {financialReport.company.accountingSetting?.currency}
          </p>
        </div>
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="w-50px whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-xs font-semibold">
                {t('reports:TAX_REPORT.CODE_NUMBER')}
              </th>
              <th className="w-400px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-xs font-semibold">
                {t('reports:REPORTS.ACCOUNTING_ITEMS')}
              </th>
              <th className="w-120px whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                {curDate}
              </th>
              <th className="w-60px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                %
              </th>
              <th className="w-120px whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                {preDate}
              </th>
              <th className="w-60px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {financialReport &&
              financialReport.details &&
              Object.prototype.hasOwnProperty.call(financialReport, 'details') &&
              rowsForPage6(financialReport.details)}
          </tbody>
        </table>
      </section>
    </div>
  );
  const page7 = (
    <div id="7" className="relative h-a4-height overflow-y-hidden">
      <header className="flex justify-between text-white">
        <div className="mt-30px flex w-28%">
          <div className="h-10px w-82.5% bg-surface-brand-secondary"></div>
          <div className="h-10px w-17.5% bg-surface-brand-primary"></div>
        </div>
        <div className="flex flex-col">
          <div className="h-1 bg-surface-brand-secondary"></div>
          <div className="mt-1 h-1 bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative border-b-6px border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Balance Sheet
            <span className="absolute -bottom-20px right-0 h-5px w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="mx-1 text-text-neutral-secondary">
        <div className="mb-16px mt-32px flex justify-between text-xs font-semibold text-surface-brand-secondary">
          <p>{t('reports:REPORTS.DETAILED_CLASSIFICATION_FORMAT')}</p>
          <p>
            {t('reports:REPORTS.UNIT_NEW_TAIWAN_DOLLARS')}
            {financialReport.company.accountingSetting?.currency}
          </p>
        </div>
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="w-50px whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-xs font-semibold">
                {t('reports:TAX_REPORT.CODE_NUMBER')}
              </th>
              <th className="w-400px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-xs font-semibold">
                {t('reports:REPORTS.ACCOUNTING_ITEMS')}
              </th>
              <th className="w-120px whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                {curDate}
              </th>
              <th className="w-60px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                %
              </th>
              <th className="w-120px whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                {preDate}
              </th>
              <th className="w-60px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {financialReport &&
              financialReport.details &&
              Object.prototype.hasOwnProperty.call(financialReport, 'details') &&
              rowsForPage7(financialReport.details)}
          </tbody>
        </table>
      </section>
    </div>
  );
  const page8 = (
    <div id="8" className="relative h-a4-height overflow-y-hidden">
      <header className="flex justify-between text-white">
        <div className="mt-30px flex w-28%">
          <div className="h-10px w-82.5% bg-surface-brand-secondary"></div>
          <div className="h-10px w-17.5% bg-surface-brand-primary"></div>
        </div>
        <div className="flex flex-col">
          <div className="h-1 bg-surface-brand-secondary"></div>
          <div className="mt-1 h-1 bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative border-b-6px border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Balance Sheet
            <span className="absolute -bottom-20px right-0 h-5px w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="mx-1 text-text-neutral-secondary">
        <div className="mb-16px mt-32px flex justify-between text-xs font-semibold text-surface-brand-secondary">
          <p>{t('reports:REPORTS.DETAILED_CLASSIFICATION_FORMAT')}</p>
          <p>
            {t('reports:REPORTS.UNIT_NEW_TAIWAN_DOLLARS')}
            {financialReport.company.accountingSetting?.currency}
          </p>
        </div>
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="w-50px whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-xs font-semibold">
                {t('reports:TAX_REPORT.CODE_NUMBER')}
              </th>
              <th className="w-400px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-xs font-semibold">
                {t('reports:REPORTS.ACCOUNTING_ITEMS')}
              </th>
              <th className="w-120px whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                {curDate}
              </th>
              <th className="w-60px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                %
              </th>
              <th className="w-120px whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                {preDate}
              </th>
              <th className="w-60px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {financialReport &&
              financialReport.details &&
              Object.prototype.hasOwnProperty.call(financialReport, 'details') &&
              rowsForPage8(financialReport.details)}
          </tbody>
        </table>
      </section>
    </div>
  );
  const page9 = (
    <div id="9" className="relative h-a4-height overflow-y-hidden">
      <header className="flex justify-between text-white">
        <div className="mt-30px flex w-28%">
          <div className="h-10px w-82.5% bg-surface-brand-secondary"></div>
          <div className="h-10px w-17.5% bg-surface-brand-primary"></div>
        </div>
        <div className="flex flex-col">
          <div className="h-1 bg-surface-brand-secondary"></div>
          <div className="mt-1 h-1 bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative border-b-6px border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Balance Sheet
            <span className="absolute -bottom-20px right-0 h-5px w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="mx-1 text-text-neutral-secondary">
        <div className="mb-16px mt-32px flex justify-between text-xs font-semibold text-surface-brand-secondary">
          <p>{t('reports:REPORTS.DETAILED_CLASSIFICATION_FORMAT')}</p>
          <p>
            {t('reports:REPORTS.UNIT_NEW_TAIWAN_DOLLARS')}
            {financialReport.company.accountingSetting?.currency}
          </p>
        </div>
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="w-50px whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-xs font-semibold">
                {t('reports:TAX_REPORT.CODE_NUMBER')}
              </th>
              <th className="w-400px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-xs font-semibold">
                {t('reports:REPORTS.ACCOUNTING_ITEMS')}
              </th>
              <th className="w-120px whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                {curDate}
              </th>
              <th className="w-60px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                %
              </th>
              <th className="w-120px whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                {preDate}
              </th>
              <th className="w-60px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {financialReport &&
              financialReport.details &&
              Object.prototype.hasOwnProperty.call(financialReport, 'details') &&
              rowsForPage9(financialReport.details)}
          </tbody>
        </table>
        {/* Info: (20240723 - Anna) watermark logo */}
        <div className="relative -z-10">
          <Image
            className="absolute -top-300px right-0"
            src="/logo/watermark_logo.svg"
            alt="isunfa logo"
            width={450}
            height={300}
          />
        </div>
      </section>
    </div>
  );
  const page10 = (
    <div id="10" className="relative h-a4-height overflow-y-hidden">
      <header className="flex justify-between text-white">
        <div className="mt-30px flex w-28%">
          <div className="h-10px w-82.5% bg-surface-brand-secondary"></div>
          <div className="h-10px w-17.5% bg-surface-brand-primary"></div>
        </div>
        <div className="flex flex-col">
          <div className="h-1 bg-surface-brand-secondary"></div>
          <div className="mt-1 h-1 bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative border-b-6px border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Balance Sheet
            <span className="absolute -bottom-20px right-0 h-5px w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="mx-1 text-text-neutral-secondary">
        <div className="mb-16px mt-32px flex justify-between text-xs font-semibold text-surface-brand-secondary">
          <p>{t('reports:REPORTS.ASSET_LIABILITY_RATIO')}</p>
        </div>
        <div className="mx-3 flex flex-col space-y-10">
          <div className="flex flex-col space-y-0">
            <p className="text-base font-semibold text-text-brand-secondary-lv2">{curDate}</p>
            <div className="flex items-center justify-between">
              <ul className="space-y-2">
                {curAssetLiabilityRatioLabels.map((label, index) => (
                  <li key={label} className="flex items-center">
                    <span
                      className={`mr-2 inline-block h-2 w-2 rounded-full text-xs ${ASSETS_LIABILITIES_EQUITY_COLOR[index % ASSETS_LIABILITIES_EQUITY_COLOR.length]}`}
                    ></span>
                    <span className="w-200px text-base">{label}</span>
                  </li>
                ))}
              </ul>
              {displayedCurALRChart}
            </div>
          </div>
          <div className="flex flex-col space-y-0">
            <p className="text-base font-semibold text-text-brand-secondary-lv2">{preDate}</p>
            <div className="flex items-center justify-between">
              <ul className="space-y-2">
                {preAssetLiabilityRatioLabels.map((label, index) => (
                  <li key={label} className="flex items-center">
                    <span
                      className={`mr-2 inline-block h-2 w-2 rounded-full text-xs ${ASSETS_LIABILITIES_EQUITY_COLOR[index % ASSETS_LIABILITIES_EQUITY_COLOR.length]}`}
                    ></span>
                    <span className="w-200px text-base">{label}</span>
                  </li>
                ))}
              </ul>
              {displayedPreALRChart}
            </div>
          </div>
        </div>
        <div className="relative -z-10">
          <Image
            className="absolute -top-300px right-0"
            src="/logo/watermark_logo.svg"
            alt="isunfa logo"
            width={450}
            height={300}
          />
        </div>
      </section>
    </div>
  );
  const page11 = (
    <div id="11" className="relative h-a4-height overflow-y-hidden">
      <header className="flex justify-between text-white">
        <div className="mt-30px flex w-28%">
          <div className="h-10px w-82.5% bg-surface-brand-secondary"></div>
          <div className="h-10px w-17.5% bg-surface-brand-primary"></div>
        </div>
        <div className="flex flex-col">
          <div className="h-1 bg-surface-brand-secondary"></div>
          <div className="mt-1 h-1 bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative border-b-6px border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Balance Sheet
            <span className="absolute -bottom-20px right-0 h-5px w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="mx-1 text-text-neutral-secondary">
        <div className="mb-16px mt-32px flex justify-between text-xs font-semibold text-surface-brand-secondary">
          <p>四、{t('reports:REPORTS.ASSET_DISTRIBUTION_CHART')}</p>
        </div>
        <div className="mx-3 flex flex-col space-y-10">
          <div className="flex flex-col space-y-5">
            <p className="text-xs font-semibold text-text-brand-secondary-lv2">{curDate}</p>
            <div className="flex items-center justify-between">
              <ul className="space-y-2">
                {curAssetMixLabels.map((label, index) => {
                  // Info: (20250619 - Anna) 如果百分比為 0 ，label就不顯示
                  if (DecimalOperations.isZero(curAssetMixRatio[index])) return null;
                  if (
                    curAssetMixRatio.slice(0, 5).every((value) => DecimalOperations.isZero(value)) &&
                    label === '其他'
                  ) return null;
                  return (
                    <li key={`${label + index}`} className="flex items-center">
                      <span
                        className={`mr-2 inline-block h-2 w-2 rounded-full ${COLOR_CLASSES[index % COLOR_CLASSES.length]}`}
                      ></span>
                      <span className="w-200px text-base">{label}</span>
                    </li>
                  );
                })}
              </ul>
              <div className="relative" style={{ marginTop: '-20px' }}>
                {curAssetMixRatio.slice(0, -1).every((value) => DecimalOperations.isZero(value)) ? (
                  <div className="flex w-300px items-center justify-center">
                    <div
                      className="flex items-center justify-center rounded-full bg-neutral-100 text-xl text-white"
                      style={{
                        width: '232px',
                        height: '232px',
                      }}
                    >
                      {t('reports:REPORTS.NO_DATA')}
                    </div>
                  </div>
                ) : (
                  <PieChartAssets
                    data={curAssetMixRatio.map(val => parseFloat(val))}
                    labels={curAssetMixLabels}
                    colors={COLORS}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col space-y-5">
            <p className="text-xs font-semibold text-text-brand-secondary-lv2">{preDate}</p>
            <div className="flex items-center justify-between">
              <ul className="space-y-2">
                {preAssetMixLabels.map((label, index) => {
                  // Info: (20250619 - Anna) 如果百分比為 0 ，label就不顯示
                  if (DecimalOperations.isZero(preAssetMixRatio[index])) return null;
                  if (
                    preAssetMixRatio.slice(0, 5).every((value) => DecimalOperations.isZero(value)) &&
                    label === '其他'
                  ) return null;
                  return (
                    <li key={`${label + index}`} className="flex items-center">
                      <span
                        className={`mr-2 inline-block h-2 w-2 rounded-full ${COLOR_CLASSES[index % COLOR_CLASSES.length]}`}
                      ></span>
                      <span className="w-200px text-base">{label}</span>
                    </li>
                  );
                })}
              </ul>
              <div className="relative" style={{ marginTop: '-20px' }}>
                {preAssetMixRatio.slice(0, -1).every((value) => DecimalOperations.isZero(value)) ? (
                  <div className="flex w-300px items-center justify-center">
                    <div
                      className="flex items-center justify-center rounded-full bg-neutral-100 text-xl text-white"
                      style={{
                        width: '232px',
                        height: '232px',
                      }}
                    >
                      {t('reports:REPORTS.NO_DATA')}
                    </div>
                  </div>
                ) : (
                  <PieChartAssets
                    data={preAssetMixRatio.map(val => parseFloat(val))}
                    labels={preAssetMixLabels}
                    colors={COLORS}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="relative -z-10">
          <Image
            className="absolute -top-300px right-0"
            src="/logo/watermark_logo.svg"
            alt="isunfa logo"
            width={450}
            height={300}
          />
        </div>
      </section>
    </div>
  );
  const page12 = (
    <div id="12" className="relative h-a4-height overflow-y-hidden">
      <header className="flex justify-between text-white">
        <div className="mt-30px flex w-28%">
          <div className="h-10px w-82.5% bg-surface-brand-secondary"></div>
          <div className="h-10px w-17.5% bg-surface-brand-primary"></div>
        </div>
        <div className="flex flex-col">
          <div className="h-1 bg-surface-brand-secondary"></div>
          <div className="mt-1 h-1 bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative border-b-6px border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Balance Sheet
            <span className="absolute -bottom-20px right-0 h-5px w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="mx-1 text-text-neutral-secondary">
        <div className="mt-30px flex justify-between !text-xs font-semibold text-surface-brand-secondary">
          <p className="mb-16px">五、{t('reports:REPORTS.ACCOUNTS_RECEIVABLE_TURNOVER_DAYS')}</p>
          <p>{t('reports:REPORTS.UNIT_DAYS')}</p>
        </div>
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="w-300px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-xs font-semibold"></th>
              <th className="w-300px whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-end text-xs font-semibold">
                {curYear}年度
              </th>
              <th className="w-300px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-end text-xs font-semibold">
                {preYear}年度
              </th>
            </tr>
          </thead>
          <tbody>
            {renderDataRow(
              t('reports:REPORTS.ACCOUNTS_RECEIVABLE_TURNOVER_DAYS'),
              financialReport?.otherInfo?.dso.curDso ? parseFloat(financialReport.otherInfo.dso.curDso) : undefined,
              financialReport?.otherInfo?.dso.preDso ? parseFloat(financialReport.otherInfo.dso.preDso) : undefined
            )}
          </tbody>
        </table>
        <div className="mb-16px mt-32px flex justify-between text-xs font-semibold text-surface-brand-secondary">
          <p>六、{t('reports:REPORTS.INVENTORY_TURNOVER_DAYS')}</p>
          <p>{t('reports:REPORTS.UNIT_DAYS')}</p>
        </div>
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="w-300px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-xs font-semibold"></th>
              <th className="w-300px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-end text-xs font-semibold">
                {curYear}年度
              </th>
              <th className="w-300px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-end text-xs font-semibold">
                {preYear}年度
              </th>
            </tr>
          </thead>
          <tbody>
            {renderDataRow(
              t('reports:REPORTS.INVENTORY_TURNOVER_DAYS'),
              financialReport?.otherInfo?.inventoryTurnoverDays.curInventoryTurnoverDays ? parseFloat(financialReport.otherInfo.inventoryTurnoverDays.curInventoryTurnoverDays) : undefined,
              financialReport?.otherInfo?.inventoryTurnoverDays.preInventoryTurnoverDays ? parseFloat(financialReport.otherInfo.inventoryTurnoverDays.preInventoryTurnoverDays) : undefined
            )}
          </tbody>
        </table>
        <div className="relative top-28rem -z-10">
          <Image
            className="absolute bottom-0 right-0"
            src="/logo/watermark_logo.svg"
            alt="isunfa logo"
            width={450}
            height={300}
          />
        </div>
      </section>
    </div>
  );

  // Info: (20250214 - Anna) 取得 general 和 details 的資料筆數，用於判斷是否要顯示對應頁面
  const generalLength = financialReport?.general?.length || 0;
  const detailsLength = financialReport?.details?.length || 0;

  // Info: (20250214 - Anna) 第一部分：summary (彙總)
  const hasPage1 = generalLength > 0;
  const hasPage2 = generalLength > 9; // Info: (20250214 - Anna) (rowsForPage1 -> slice(0, 9))

  // Info: (20250214 - Anna) 第二部分：details (細項)
  const hasPage3 = detailsLength > 0;
  const hasPage4 = detailsLength > 13; // Info: (20250214 - Anna) (rowsForPage3 -> slice(0, 13))
  const hasPage5 = detailsLength > 26; // Info: (20250214 - Anna) (rowsForPage4 -> slice(13, 26))
  const hasPage6 = detailsLength > 39; // Info: (20250214 - Anna) (rowsForPage5 -> slice(26, 39))
  const hasPage7 = detailsLength > 53; // Info: (20250214 - Anna) (rowsForPage6 -> slice(39, 53))
  const hasPage8 = detailsLength > 67; // Info: (20250214 - Anna) (rowsForPage7 -> slice(53, 67))
  const hasPage9 = detailsLength > 80; // Info: (20250214 - Anna) (rowsForPage8 -> slice(67, 80))

  const pages: { component: React.ReactElement; pageNumber: number }[] = [];
  let currentPageNumber = 1; // Info: (20250217 - Anna) 追蹤實際的顯示頁碼

  // Info: (20250214 - Anna) 第一部分：summary (彙總)
  if (hasPage1) {
    pages.push({ component: page1, pageNumber: currentPageNumber });
    currentPageNumber += 1;
  }
  if (hasPage2) {
    pages.push({ component: page2, pageNumber: currentPageNumber });
    currentPageNumber += 1;
  }

  // Info: (20250214 - Anna) 第二部分：details (細項)
  if (hasPage3) {
    pages.push({ component: page3, pageNumber: currentPageNumber });
    currentPageNumber += 1;
  }
  if (hasPage4) {
    pages.push({ component: page4, pageNumber: currentPageNumber });
    currentPageNumber += 1;
  }
  if (hasPage5) {
    pages.push({ component: page5, pageNumber: currentPageNumber });
    currentPageNumber += 1;
  }
  if (hasPage6) {
    pages.push({ component: page6, pageNumber: currentPageNumber });
    currentPageNumber += 1;
  }
  if (hasPage7) {
    pages.push({ component: page7, pageNumber: currentPageNumber });
    currentPageNumber += 1;
  }
  if (hasPage8) {
    pages.push({ component: page8, pageNumber: currentPageNumber });
    currentPageNumber += 1;
  }
  if (hasPage9) {
    pages.push({ component: page9, pageNumber: currentPageNumber });
    currentPageNumber += 1;
  }

  // Info: (20250214 - Anna) 第三部分：固定的圖表頁 (不受資料長度影響)
  pages.push(
    { component: page10, pageNumber: currentPageNumber },
    { component: page11, pageNumber: currentPageNumber + 1 },
    { component: page12, pageNumber: currentPageNumber + 2 }
  );

  // Info: (20250217 - Anna) 在這裡同步更新 `currentPageNumber`，以防後續還有頁面
  currentPageNumber += 3;

  // Info: (20250214 - Anna) 依據資料長度，動態 render 頁面
  return (
    <div className="mx-auto w-a4-width origin-top overflow-x-auto">
      {pages.map(({ component, pageNumber }, index) => (
        <React.Fragment key={`page-${index + 1}`}>
          {index !== 0 && <hr className="break-before-page" />}
          {/* Info: (20250217 - Anna) 原本 component（ page1, page2 ...）沒有 renderedFooter(pageNumber)，所以透過 React.cloneElement() 動態新增到 component 的 children 裡 */}
          {React.cloneElement(component, {
            children: [...component.props.children, renderedFooter(pageNumber)],
          })}
        </React.Fragment>
      ))}
    </div>
  );
};

export default BalanceSheetReportBodyAll;
