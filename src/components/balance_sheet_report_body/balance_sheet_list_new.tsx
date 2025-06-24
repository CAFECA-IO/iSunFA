import { APIName } from '@/constants/api_connection';
import { useUserCtx } from '@/contexts/user_context';
import { BalanceSheetReport } from '@/interfaces/report';
import APIHandler from '@/lib/utils/api_handler';
import Image from 'next/image';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import PieChart from '@/components/balance_sheet_report_body/pie_chart';
import PieChartAssets from '@/components/balance_sheet_report_body/pie_chart_assets';
import useStateRef from 'react-usestateref';
import { timestampToString } from '@/lib/utils/common';
import { SkeletonList } from '@/components/skeleton/skeleton';
import { DEFAULT_SKELETON_COUNT_FOR_PAGE } from '@/constants/display';
import { useTranslation } from 'next-i18next';
import CollapseButton from '@/components/button/collapse_button';
import { FinancialReportTypesKey } from '@/interfaces/report_type';
import BalanceDetailsButton from '@/components/button/balance_details_button';
import { IAccountReadyForFrontend } from '@/interfaces/accounting_account';
import { IDatePeriod } from '@/interfaces/date_period';
import PrintButton from '@/components/button/print_button';
import DownloadButton from '@/components/button/download_button';
import Toggle from '@/components/toggle/toggle';
import BalanceSheetA4Template from '@/components/balance_sheet_report_body/balance_sheet_a4_template';
import DownloadBalanceSheet from '@/components/balance_sheet_report_body/download_balance_sheet';
import { useCurrencyCtx } from '@/contexts/currency_context';

interface BalanceSheetListProps {
  selectedDateRange: IDatePeriod | null; // Info: (20241023 - Anna) 接收來自上層的日期範圍
  printRef: React.RefObject<HTMLDivElement>; // Info: (20241122 - Anna) 從父層傳入的 Ref
  downloadRef: React.RefObject<HTMLDivElement>; // Info: (20250327 - Anna) 從父層傳入的 Ref
  printFn: () => void; // Info: (20241122 - Anna) 從父層傳入的列印函數
  downloadFn: () => void; // Info: (20250327 - Anna) 從父層傳入的下載函數
  isDownloading: boolean;
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

const BalanceSheetList: React.FC<BalanceSheetListProps> = ({
  selectedDateRange,
  printRef, // Info: (20241122 - Anna) 使用打印範圍 Ref
  downloadRef, // Info: (20250327 - Anna) 使用下載範圍 Ref
  printFn, // Info: (20241122 - Anna) 使用打印函數
  downloadFn, // Info: (20250327 - Anna) 使用下載函數
  isDownloading,
}) => {
  const { t, i18n } = useTranslation(['reports']);
  const { currency } = useCurrencyCtx();

  const isChinese = i18n.language === 'tw' || i18n.language === 'cn'; // Info: (20250108 - Anna) 判斷當前語言是否為中文

  // Info: (20241023 - Anna) 追蹤是否已經成功請求過一次 API
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);

  // Info: (20241023 - Anna) 使用 useRef 追蹤之前的日期範圍
  const prevSelectedDateRange = useRef<IDatePeriod | null>(null);

  const { isAuthLoading, connectedAccountBook } = useUserCtx();
  const hasCompanyId = isAuthLoading === false && !!connectedAccountBook?.id;

  const [totalSubAccountsToggle, setTotalSubAccountsToggle] = useState(false); // Info: (20241029 - Anna) 新增 totalSubAccountsToggle 狀態

  // Info: (20241029 - Anna) 切換 totalSubAccountsToggle 的開關狀態
  const totalSubAccountsToggleHandler = () => {
    setTotalSubAccountsToggle((prevState) => !prevState);
  };

  const [curAssetLiabilityRatio, setCurAssetLiabilityRatio] = useStateRef<Array<number>>([]);
  const [preAssetLiabilityRatio, setPreAssetLiabilityRatio] = useStateRef<Array<number>>([]);
  const [curAssetLiabilityRatioLabels, setCurAssetLiabilityRatioLabels] = useStateRef<
    Array<string>
  >([]);
  const [preAssetLiabilityRatioLabels, setPreAssetLiabilityRatioLabels] = useStateRef<
    Array<string>
  >([]);

  const [curAssetMixRatio, setCurAssetMixRatio] = useStateRef<Array<number>>([]);
  const [preAssetMixRatio, setPreAssetMixRatio] = useStateRef<Array<number>>([]);
  const [curAssetMixLabels, setCurAssetMixLabels] = useStateRef<Array<string>>([]);
  const [preAssetMixLabels, setPreAssetMixLabels] = useStateRef<Array<string>>([]);

  const [curDate, setCurDate] = useStateRef<string>('');
  const [curYear, setCurYear] = useStateRef<string>('');
  const [preDate, setPreDate] = useStateRef<string>('');
  const [preYear, setPreYear] = useStateRef<string>('');

  const {
    data: reportFinancial,
    code: getReportFinancialCode,
    success: getReportFinancialSuccess,
    isLoading: getReportFinancialIsLoading,
    trigger,
  } = APIHandler<BalanceSheetReport>(APIName.REPORT_GET_V2);

  // Info: (20241023 - Anna) 將 getBalanceSheetReport 包裝為 useCallback 並加入 setSelectedDateRange 作為依賴項
  // Info: (20241023 - Anna) 檢查selectedDateRange存在，避免無效API請求
  const getBalanceSheetReport = useCallback(async () => {
    if (!hasCompanyId || !selectedDateRange || selectedDateRange.endTimeStamp === 0) {
      return;
    }

    // Info: (20241023 - Anna) 如果日期範圍與上次相同，且已經成功請求過，則跳過 API 請求
    if (
      prevSelectedDateRange.current &&
      prevSelectedDateRange.current.startTimeStamp === selectedDateRange.startTimeStamp &&
      prevSelectedDateRange.current.endTimeStamp === selectedDateRange.endTimeStamp &&
      hasFetchedOnce
    ) {
      return;
    }

    try {
      const response = await trigger({
        params: {
          accountBookId: connectedAccountBook?.id,
        },
        query: {
          startDate: selectedDateRange.startTimeStamp,
          endDate: selectedDateRange.endTimeStamp,
          language: 'en',
          reportType: FinancialReportTypesKey.balance_sheet,
        },
      });

      if (response.success) {
        // Info: (20241023 - Anna) 設定已成功請求過 API
        setHasFetchedOnce(true);
        prevSelectedDateRange.current = selectedDateRange;
      }
    } catch (error) {
      (() => {})(); // Info: (20241023 - Anna) Empty function, does nothing
    } finally {
      (() => {})(); // Info: (20241023 - Anna) Empty function, does nothing
    }
  }, [hasCompanyId, connectedAccountBook?.id, selectedDateRange, trigger]);

  // Info: (20241023 - Anna) 在 useEffect 中依賴 getBalanceSheetReport，當日期範圍變更時觸發 API 請求
  useEffect(() => {
    // if (!selectedDateRange) return; // Info: (20241023 - Anna) 如果尚未選擇日期區間，不觸發請求
    if (!selectedDateRange || selectedDateRange.startTimeStamp === 0) return; // Info: (20241121 - Anna) 新增檢查
    getBalanceSheetReport();
    // }, [getBalanceSheetReport, selectedDateRange]); // Info: (20241121 - Anna) 直接依賴 getBalanceSheetReport
  }, [selectedDateRange, getBalanceSheetReport]); // Info: (20241121 - Anna) 簡化依賴

  const isNoDataForCurALR = curAssetLiabilityRatio.every((value) => value === 0);
  const isNoDataForPreALR = preAssetLiabilityRatio.every((value) => value === 0);

  // Info: (20241001 - Anna) 管理表格摺疊狀態(項目彙總格式)
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(false);
  // Info: (20241001 - Anna) 管理表格摺疊狀態(細項分類格式)
  const [isDetailCollapsed, setIsDetailCollapsed] = useState(false);
  // Info: (20241017 - Anna) 管理表格摺疊狀態(某個項目的展開組成科目)
  const [isSubAccountsCollapsed, setIsSubAccountsCollapsed] = useState<{ [key: string]: boolean }>(
    {}
  );

  // Info: (20241001 - Anna) 切換摺疊狀態(項目彙總格式)
  const toggleSummaryTable = () => {
    setIsSummaryCollapsed(!isSummaryCollapsed);
  };
  // Info: (20241001 - Anna) 切換摺疊狀態(細項分類格式)
  const toggleDetailTable = () => {
    setIsDetailCollapsed(!isDetailCollapsed);
  };
  // Info: (20241017 - Anna) 切換摺疊狀態(某個項目的展開組成科目)
  const toggleSubAccounts = (code: string) => {
    setIsSubAccountsCollapsed((prevState) => ({
      ...prevState,
      [code]: !prevState[code],
    }));
  };

  useEffect(() => {
    if (getReportFinancialSuccess === true && reportFinancial && reportFinancial?.otherInfo) {
      const currentDateString = timestampToString(reportFinancial.curDate.to ?? 0);
      const previousDateString = timestampToString(reportFinancial.preDate.to ?? 0);
      const currentYear = currentDateString.year;
      const previousYear = previousDateString.year;

      const curALR = reportFinancial.otherInfo.assetLiabilityRatio[currentDateString.date]
        ?.data || [0, 0, 0];
      const preALR = reportFinancial.otherInfo.assetLiabilityRatio[previousDateString.date]
        ?.data || [0, 0, 0];
      const curALRLabels = reportFinancial.otherInfo.assetLiabilityRatio[currentDateString.date]
        ?.labels || ['', '', ''];
      const preALRLabels = reportFinancial.otherInfo.assetLiabilityRatio[previousDateString.date]
        ?.labels || ['', '', ''];

      const curAMR = reportFinancial.otherInfo.assetMixRatio[currentDateString.date]?.data || [
        0, 0, 0, 0, 0, 0,
      ];
      const curAMRLabels = reportFinancial.otherInfo.assetMixRatio[currentDateString.date]
        ?.labels || ['', '', '', '', '', '其他'];
      const preAMR = reportFinancial.otherInfo.assetMixRatio[previousDateString.date]?.data || [
        0, 0, 0, 0, 0, 0,
      ];
      const preAMRLabels = reportFinancial.otherInfo.assetMixRatio[previousDateString.date]
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
    }
  }, [reportFinancial]);

  useEffect(() => {
    if (reportFinancial && reportFinancial.details) {
      const initialCollapseState: { [key: string]: boolean } = reportFinancial.details.reduce(
        (acc, item) => {
          // acc[item.code] = true; // Info: (20241017 - Anna) 預設每個項目的展開狀態為摺疊
          acc[item.code] = !totalSubAccountsToggle; // Info: (20241029 - Anna) 根據 totalSubAccountsToggle 設定初始展開狀態
          return acc;
        },
        {} as { [key: string]: boolean }
      );
      setIsSubAccountsCollapsed(initialCollapseState);
    }
  }, [reportFinancial, totalSubAccountsToggle]); // Info: (20241029 - Anna) 新增 totalSubAccountsToggle 作為依賴項

  // Info: (20241023 - Anna) 顯示圖片或報告資料
  if (!hasFetchedOnce && !getReportFinancialIsLoading) {
    return (
      <div className="-mt-40 flex h-screen flex-col items-center justify-center">
        <Image src="/images/empty.svg" alt="No data image" width={120} height={135} />
        <div>
          <p className="text-neutral-300">{t('reports:REPORT.NO_DATA_AVAILABLE')}</p>
          <p className="text-neutral-300">{t('reports:REPORT.PLEASE_SELECT_PERIOD')}</p>
        </div>
      </div>
    );
  } else if (getReportFinancialIsLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-surface-neutral-main-background">
        <SkeletonList count={DEFAULT_SKELETON_COUNT_FOR_PAGE} />
      </div>
    );
  } else if (
    !getReportFinancialSuccess ||
    !reportFinancial ||
    !Object.prototype.hasOwnProperty.call(reportFinancial, 'otherInfo') ||
    !reportFinancial.otherInfo ||
    !Object.prototype.hasOwnProperty.call(reportFinancial.otherInfo, 'assetLiabilityRatio') ||
    !Object.prototype.hasOwnProperty.call(reportFinancial.otherInfo, 'assetMixRatio') ||
    !Object.prototype.hasOwnProperty.call(reportFinancial.otherInfo, 'dso') ||
    !Object.prototype.hasOwnProperty.call(reportFinancial.otherInfo, 'inventoryTurnoverDays')
  ) {
    return <div>Error {getReportFinancialCode}</div>;
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
    <div>
      <PieChart data={curAssetLiabilityRatio} />
    </div>
  );

  const displayedPreALRChart = isNoDataForPreALR ? (
    <div className="flex w-300px items-center justify-center">
      <div
        className="ml-5 flex items-center justify-center rounded-full bg-neutral-100 text-xl text-white sm:ml-0"
        style={{
          width: '232px',
          height: '232px',
        }}
      >
        {t('reports:REPORTS.NO_DATA')}
      </div>
    </div>
  ) : (
    <div>
      <PieChart data={preAssetLiabilityRatio} />
    </div>
  );

  const renderDataRow = (
    label: string,
    curValue: number | undefined,
    preValue: number | undefined
  ) => (
    <tr>
      <td className="border border-stroke-neutral-quaternary p-10px text-sm">{label}</td>
      <td className="border border-stroke-neutral-quaternary p-10px text-end text-sm">
        {curValue}
      </td>
      <td className="border border-stroke-neutral-quaternary p-10px text-end text-sm">
        {preValue}
      </td>
    </tr>
  );
  type IAccountWithAdjustedPercentage = IAccountReadyForFrontend &
    // Info: (20250610 - Anna) 兩個欄位可以只有一個被加上，不強制同時存在
    Partial<{
      curPeriodAdjustedPercentageString: string;
      prePeriodAdjustedPercentageString: string;
    }>;
  // Info: (20250610 - Anna) 調整子項目百分比尾差(支援當期與前期）
  type PeriodKey = 'curPeriod' | 'prePeriod';
  const adjustChildPercentageTailGap = (
    children: IAccountReadyForFrontend[],
    parentAmount: number,
    totalAsset: number,
    parentAdjustedPercentage: number,
    key: PeriodKey
  ): IAccountWithAdjustedPercentage[] => {
    const amountKey = key === 'curPeriod' ? 'curPeriodAmount' : 'prePeriodAmount';
    const realPercentageKey =
      key === 'curPeriod' ? 'curPeriodRealPercentage' : 'prePeriodRealPercentage';
    const adjustedStringKey =
      key === 'curPeriod'
        ? 'curPeriodAdjustedPercentageString'
        : 'prePeriodAdjustedPercentageString';

    // Info: (20250610 - Anna) 篩掉金額為 0 的子項
    const noZeroChildren = children.filter((child) => child[amountKey] !== 0);

    // Info: (20250610 - Anna) 計算每個子項的原始百分比(含小數)
    const childrenWithValues = noZeroChildren.map((child) => ({
      ...child,
      [realPercentageKey]: (child[amountKey] / totalAsset) * 100,
    })) as Array<IAccountReadyForFrontend & { [key in typeof realPercentageKey]: number }>;

    // Info: (20250610 - Anna) 子項百分比四捨五入為整數
    const roundedPercentages = childrenWithValues.map((child) =>
      Math.round(child[realPercentageKey])
    );

    // Info: (20250610 - Anna) 計算子項百分比總和、父項百分比（皆為四捨五入後的）
    const sumRounded = roundedPercentages.reduce((a, b) => a + b, 0);
    const parentRounded = parentAdjustedPercentage;

    // Info: (20250610 - Anna) 計算尾差：正值表示子項加起來太小，負值表示子項加起來太大
    let remaining = parentRounded - sumRounded;

    // Info: (20250610 - Anna) 若有尾差，調整子項百分比
    if (remaining !== 0 && childrenWithValues.length > 0) {
      // Info: (20250610 - Anna) 根據「原始百分比 & 四捨五入」的差距，從大到小排序
      const sortedCandidates = childrenWithValues
        .map((child, i) => ({
          i,
          gap: Math.abs(child[realPercentageKey] - roundedPercentages[i]),
          childAmount: child[amountKey],
          roundedPercentage: roundedPercentages[i],
        }))
        .sort((a, b) => b.gap - a.gap);

      // Info: (20250610 - Anna) 用 for 依序處理候選子項，如果剩下的尾差已經為 0 就跳出
      for (let j = 0; j < sortedCandidates.length && remaining !== 0; j += 1) {
        const { i, childAmount, roundedPercentage } = sortedCandidates[j];
        const defaultAdjustmentPercentage = roundedPercentage + remaining;

        // Info: (20250610 - Anna) 百分比應該和數值同方向
        const directionIsValid =
          (childAmount >= 0 && defaultAdjustmentPercentage >= 0) ||
          (childAmount < 0 && defaultAdjustmentPercentage <= 0);

        if (directionIsValid) {
          roundedPercentages[i] = defaultAdjustmentPercentage;
          remaining = 0;
        } else {
          // Info: (20250610 - Anna) 最多只能調整至 0，剩餘尾差再傳給下一筆
          const maxAdjust = -roundedPercentage; // Info: (20250610 - Anna) 讓目前這筆變成 0 所需的調整量
          if (maxAdjust !== 0) {
            roundedPercentages[i] = 0;
            remaining -= maxAdjust; // Info: (20250610 - Anna) 將未能調整的部分繼續往下補
          }
        }
      }
    }

    // Info: (20250610 - Anna) 回傳陣列，格式化數字
    return childrenWithValues.map((child, i) => {
      const adjusted = roundedPercentages[i];
      const adjustedStr: string =
        adjusted === 0
          ? '-'
          : adjusted < 0
            ? `(${Math.abs(adjusted).toLocaleString()})`
            : `${adjusted.toLocaleString()}`;

      return {
        ...child,
        [adjustedStringKey]: adjustedStr,
      };
    });
  };

  // Info: (20250616 - Anna) 調整百分比尾差的父科目與子科目對照表（general 區塊專用）
  const parentChildMap: Record<string, string[]> = {
    '1XXX': ['11XX', '15XX'],
    '2XXX': ['21XX', '25XX'],
    '3XXX': ['3100', '3200', '3300', '3400', '36XX'],
  };

  function adjustSummaryTailGap(
    flatItems: IAccountReadyForFrontend[],
    totalAsset: number,
    key: PeriodKey
  ): IAccountWithAdjustedPercentage[] {
    const adjustedItems = [...flatItems];

    Object.entries(parentChildMap).forEach(([parentCode, childCodes]) => {
      const parent = adjustedItems.find((item) => item.code === parentCode);
      if (!parent) return;

      const children = adjustedItems.filter((item) => childCodes.includes(item.code || ''));
      if (children.length === 0) return;

      const parentAmountKey = key === 'curPeriod' ? 'curPeriodAmount' : 'prePeriodAmount';
      const parentAmount = parent[parentAmountKey] ?? 0;

      const parentPercentageStr =
        key === 'curPeriod' ? parent.curPeriodPercentageString : parent.prePeriodPercentageString;
      const parentPercentage = parseFloat(parentPercentageStr);

      // Info: (20250616 - Anna) 呼叫尾差處理函式
      const adjustedChildren = adjustChildPercentageTailGap(
        children,
        parentAmount,
        totalAsset,
        parentPercentage,
        key
      );

      // Info: (20250616 - Anna) 將結果寫回 adjustedItems 中
      adjustedChildren.forEach((adjChild) => {
        const index = adjustedItems.findIndex((item) => item.code === adjChild.code);
        if (index !== -1) {
          adjustedItems[index] = {
            ...adjustedItems[index],
            ...adjChild,
          };
        }
      });
    });

    return adjustedItems;
  }

  // Info: (20250610 - Anna) 調整父項百分比，使其加總不超過100
  const adjustParentPercentageTailGap = (
    parents: IAccountReadyForFrontend[],
    key: 'curPeriod' | 'prePeriod',
    totalAsset: number
  ): IAccountWithAdjustedPercentage[] => {
    // Info: (20250610 - Anna) 用 code 開頭分組(資產：'1'，負債與權益：'2'、'3')
    const groupByCodePrefix = (prefixes: string[]) =>
      parents.filter((parent) => prefixes.some((prefix) => parent.code?.startsWith(prefix)));

    // Info: (20250610 - Anna) 輸入和輸出陣列的型別一致
    const createDisplayPercentagesForGroup = (group: typeof parents): typeof group => {
      const accountsWithPercentageMeta = group.map((parent) => {
        const parentAmount = key === 'curPeriod' ? parent.curPeriodAmount : parent.prePeriodAmount;
        const realPercentage = parentAmount && totalAsset ? (parentAmount / totalAsset) * 100 : 0;
        const roundedPercentage = Math.round(realPercentage);
        const gap = Math.abs(realPercentage - roundedPercentage);
        return { ...parent, realPercentage, roundedPercentage, gap };
      });

      // Info: (20250610 - Anna) 如果全部 父項 & 子項 都是 0，就直接回傳 "-"，不進行補尾差
      const allZero = accountsWithPercentageMeta.every((parent) => {
        const parentAmount = key === 'curPeriod' ? parent.curPeriodAmount : parent.prePeriodAmount;
        const children = parent.children ?? [];

        const allChildrenZero = children.every(
          (child) => (key === 'curPeriod' ? child.curPeriodAmount : child.prePeriodAmount) === 0
        );

        return parentAmount === 0 && allChildrenZero;
      });
      if (allZero) {
        return group.map((parent) => ({
          ...parent,
          [`${key}AdjustedPercentageString`]: '-',
        }));
      }

      const roundedPercentageSum = accountsWithPercentageMeta.reduce(
        (sum, parent) => sum + parent.roundedPercentage,
        0
      );
      let diff = 100 - roundedPercentageSum;

      // Info: (20250610 - Anna) 排序補尾差
      const sorted = accountsWithPercentageMeta.slice().sort((a, b) => b.gap - a.gap);

      for (let i = 0; i < sorted.length && diff !== 0; i += 1) {
        if (diff > 0) {
          sorted[i].roundedPercentage += 1;
          diff -= 1;
        } else {
          sorted[i].roundedPercentage -= 1;
          diff += 1;
        }
      }

      return sorted.map(({ roundedPercentage, ...rest }) => {
        const formattedPercentage =
          roundedPercentage === 0
            ? '-'
            : roundedPercentage < 0
              ? `(${Math.abs(roundedPercentage).toLocaleString()})`
              : `${roundedPercentage.toLocaleString()}`;

        return {
          ...rest,
          [`${key}AdjustedPercentageString`]: formattedPercentage,
        };
      });
    };

    const assets = createDisplayPercentagesForGroup(groupByCodePrefix(['1']));
    const liabilitiesEquity = createDisplayPercentagesForGroup(groupByCodePrefix(['2', '3']));

    // Info: (20250610 - Anna) 把兩組調整後的科目依 code 存入 map
    const accountByCodeMap = new Map<string, IAccountReadyForFrontend>();
    [...assets, ...liabilitiesEquity].forEach((parent) => {
      if (parent.code) accountByCodeMap.set(parent.code, parent);
    });
    // Info: (20250610 - Anna) 依照原本的順序，把調整後的結果補回去，如果該項目沒有被調整，則保留原始值
    return parents.map((parent) => accountByCodeMap.get(parent.code!) ?? parent);
  };
  // Info: (20250610 - Anna) 百分比字串解析為數值
  const parseBracketPercentage = (str?: string): number => {
    if (!str || str === '-') return 0;

    const cleaned = str.replace(/[(),]/g, '');
    const value = Number(cleaned);

    // Info: (20250610 - Anna) 有括號表示是負數
    return str.includes('(') ? -value : value;
  };
  // Info: (20250610 - Anna) 取出「當期總資產」與「前期總資產」
  const curTotalAsset =
    reportFinancial?.general?.find((account) => account.code === '1XXX')?.curPeriodAmount ?? 1;
  const preTotalAsset =
    reportFinancial?.general?.find((account) => account.code === '1XXX')?.prePeriodAmount ?? 1;

  const rowsForSummary = (items: Array<IAccountReadyForFrontend>) => {
    // Info: (20250616 - Anna) 修正子科目百分比總和不等於父科目的尾差（含當期與前期）
    const adjustedCur = adjustSummaryTailGap(items, curTotalAsset, 'curPeriod');
    const adjustedFinal = adjustSummaryTailGap(adjustedCur, preTotalAsset, 'prePeriod') as Array<
      IAccountReadyForFrontend & {
        curPeriodAdjustedPercentageString?: string;
        prePeriodAdjustedPercentageString?: string;
      }
    >;
    const rows = adjustedFinal.map((item) => {
      // Info: (20250213 - Anna) 判斷是否四個欄位都是 "0" 或 "-"
      const isAllZeroOrDash =
        (item.curPeriodAmountString === '0' || item.curPeriodAmountString === '-') &&
        (item.curPeriodPercentageString === '0' || item.curPeriodPercentageString === '-') &&
        (item.prePeriodAmountString === '0' || item.prePeriodAmountString === '-') &&
        (item.prePeriodPercentageString === '0' || item.prePeriodPercentageString === '-');

      if (isAllZeroOrDash) {
        return null; // Info: (20250213 - Anna) 這一列不顯示
      }

      if (!item.code) {
        return (
          <tr key={item.code}>
            <td
              colSpan={6}
              className="border border-stroke-neutral-quaternary p-10px text-sm font-bold"
            >
              {item.name}
            </td>
          </tr>
        );
      }

      return (
        <tr key={item.code}>
          <td className="w-50px border border-stroke-neutral-quaternary p-10px text-sm">
            {item.code}
          </td>
          <td className="border border-stroke-neutral-quaternary p-10px text-sm">
            <p>{t(`reports:ACCOUNTING_ACCOUNT.${item.name}`)}</p>
          </td>
          <td className="border border-stroke-neutral-quaternary p-10px text-end text-sm">
            {item.curPeriodAmountString}
          </td>
          <td className="border border-stroke-neutral-quaternary p-10px text-center text-sm">
            {item.curPeriodAdjustedPercentageString ?? item.curPeriodPercentageString}
          </td>
          <td className="border border-stroke-neutral-quaternary p-10px text-end text-sm">
            {item.prePeriodAmountString}
          </td>
          <td className="border border-stroke-neutral-quaternary p-10px text-center text-sm">
            {item.prePeriodAdjustedPercentageString ?? item.prePeriodPercentageString}
          </td>
        </tr>
      );
    });
    return rows;
  };

  // Info: (20241021 - Anna) 要記得改interface
  const rowsForDetail = (items: Array<IAccountReadyForFrontend>) => {
    // Info: (20250610 - Anna) 呼叫「百分比總和不超過100」的調整函式
    const adjustedCurParent = adjustParentPercentageTailGap(items, 'curPeriod', curTotalAsset);
    const adjustedPreParent = adjustParentPercentageTailGap(items, 'prePeriod', preTotalAsset);

    // Info: (20250610 - Anna) 根據 code 合併兩期結果
    const mergedItems = adjustedCurParent.map((curItem) => {
      const matchedPre = adjustedPreParent.find((parent) => parent.code === curItem.code);
      return {
        ...curItem,
        prePeriodAdjustedPercentageString:
          matchedPre?.prePeriodAdjustedPercentageString ?? curItem.prePeriodPercentageString,
      };
    });

    // Info: (20250610 - Anna) 將 mergedItems 傳入 map
    const rows = mergedItems.map((item) => {
      // Info: (20250213 - Anna) 判斷是否四個欄位都是 "0" 或 "-"
      const isAllZeroOrDash =
        (item.curPeriodAmountString === '0' || item.curPeriodAmountString === '-') &&
        (item.curPeriodPercentageString === '0' || item.curPeriodPercentageString === '-') &&
        (item.prePeriodAmountString === '0' || item.prePeriodAmountString === '-') &&
        (item.prePeriodPercentageString === '0' || item.prePeriodPercentageString === '-');

      if (isAllZeroOrDash) {
        return null; // Info: (20250213 - Anna) 這一列不顯示
      }

      if (!item.code) {
        return (
          <tr key={item.code}>
            <td
              colSpan={6}
              className="border border-stroke-neutral-quaternary p-10px text-sm font-bold"
            >
              {item.name}
            </td>
          </tr>
        );
      }

      return (
        <React.Fragment key={item.code}>
          <tr>
            <td className="border border-stroke-neutral-quaternary p-10px text-sm">{item.code}</td>
            <td className="border border-stroke-neutral-quaternary p-10px text-sm">
              <div className="flex items-center justify-between">
                {t(`reports:ACCOUNTING_ACCOUNT.${item.name}`)}
                {/* Info: (20241021 - Anna) 如果有 children 才顯示 CollapseButton */}
                {item.children &&
                  item.children.filter(
                    (child) =>
                      child.curPeriodAmountString !== '-' ||
                      child.curPeriodPercentageString !== '-' ||
                      child.prePeriodAmountString !== '-' ||
                      child.prePeriodPercentageString !== '-'
                  ).length > 0 && (
                    <CollapseButton
                      className="print:hidden"
                      // Info: (20241017 - Anna) 指定 item 的 code 作為參數
                      onClick={() => toggleSubAccounts(item.code)}
                      // Info: (20241017 - Anna) 依據每個 item 的狀態決定是否展開
                      isCollapsed={isSubAccountsCollapsed[item.code] ?? true}
                      buttonType="orange"
                    />
                  )}
              </div>
            </td>
            <td className="border border-stroke-neutral-quaternary p-10px text-end text-sm">
              {item.curPeriodAmountString}
            </td>
            <td className="border border-stroke-neutral-quaternary p-10px text-center text-sm">
              {item.curPeriodAdjustedPercentageString ?? item.curPeriodPercentageString}
            </td>
            <td className="border border-stroke-neutral-quaternary p-10px text-end text-sm">
              {item.prePeriodAmountString}
            </td>
            <td className="border border-stroke-neutral-quaternary p-10px text-center text-sm">
              {item.prePeriodAdjustedPercentageString ?? item.prePeriodPercentageString}
            </td>
          </tr>
          {/* Info: (20250610 - Anna) 如果展開，新增子科目表格 */}
          {!isSubAccountsCollapsed[item.code] &&
            item.children &&
            item.children.length > 0 &&
            (() => {
              const adjustedCurChildren = adjustChildPercentageTailGap(
                item.children,
                item.curPeriodAmount,
                curTotalAsset,
                parseBracketPercentage(item.curPeriodAdjustedPercentageString),
                'curPeriod'
              );

              const adjustedPreChildren = adjustChildPercentageTailGap(
                item.children,
                item.prePeriodAmount,
                preTotalAsset,
                parseBracketPercentage(item.prePeriodAdjustedPercentageString),
                'prePeriod'
              );

              // Info: (20250610 - Anna) 根據 code 合併兩個陣列
              const mergedChildren = adjustedCurChildren.map((child) => {
                const match = adjustedPreChildren.find((c) => c.code === child.code);
                return {
                  ...child,
                  prePeriodAdjustedPercentageString:
                    match?.prePeriodAdjustedPercentageString ?? '-',
                };
              });
              // Info: (20241203 - Anna) 過濾掉數值為 "0" 或 "-" 的子科目
              return mergedChildren
                .filter(
                  (child) =>
                    child.curPeriodAmountString !== '-' ||
                    child.curPeriodPercentageString !== '-' ||
                    child.prePeriodAmountString !== '-' ||
                    child.prePeriodPercentageString !== '-'
                )
                .map((child) => (
                  <tr key={`sub-accounts-${child.code}`}>
                    <td className="border border-t-0 border-stroke-brand-secondary-soft p-10px text-sm"></td>
                    <td className="items-center border border-t-0 border-stroke-brand-secondary-soft px-10px py-3px text-sm">
                      <div className="flex items-center justify-between">
                        <div className="justify-start">
                          <span>{child.code}</span>
                          <span className="ml-2">
                            {t(`reports:ACCOUNTING_ACCOUNT.${child.name}`)}
                          </span>
                        </div>
                        {/* Info: (20241107 - Anna) 將子項目的會計科目名稱傳遞給 BalanceDetailsButton，用於顯示彈出視窗的標題 */}
                        {/* Info: (20241217 - Anna) 判斷 child.code 是否為 3353（本期損益（結轉來，沒有分錄）） or 3351（累積盈虧（結轉來，沒有分錄）），若不是才顯示按鈕 */}
                        {child.code !== '3353' && child.code !== '3351' && (
                          <BalanceDetailsButton
                            accountName={child.name}
                            accountId={child.accountId}
                            className="print:hidden"
                          />
                        )}
                      </div>
                    </td>
                    <td className="border border-t-0 border-stroke-brand-secondary-soft p-10px text-end text-sm">
                      {child.curPeriodAmountString}
                    </td>
                    <td className="border border-t-0 border-stroke-brand-secondary-soft p-10px text-center text-sm">
                      {child.curPeriodAdjustedPercentageString}
                    </td>
                    <td className="border border-t-0 border-stroke-brand-secondary-soft p-10px text-end text-sm">
                      {child.prePeriodAmountString}
                    </td>
                    <td className="border border-t-0 border-stroke-brand-secondary-soft p-10px text-center text-sm">
                      {child.prePeriodAdjustedPercentageString}
                    </td>
                  </tr>
                ));
            })()}
        </React.Fragment>
      );
    });
    return rows;
  };
  // Info: (20241029 - Anna) 子科目 Toggle 開關、列印及下載按鈕
  // const displayedSelectArea = (ref: React.RefObject<HTMLDivElement>) => {
  const displayedSelectArea = () => {
    return (
      <div className="mb-16px flex items-center justify-between px-px max-md:flex-wrap print:hidden">
        <Toggle
          id="totalSubAccounts-toggle"
          initialToggleState={totalSubAccountsToggle}
          getToggledState={totalSubAccountsToggleHandler}
          toggleStateFromParent={totalSubAccountsToggle}
          label={t('reports:REPORTS.DISPLAY_SUB_ACCOUNTS')}
          labelClassName="text-neutral-600"
        />
        <div className="ml-auto flex items-center gap-2 tablet:gap-24px">
          <DownloadButton onClick={downloadFn} />
          <PrintButton onClick={printFn} disabled={!isChinese} />
        </div>
      </div>
    );
  };

  const ItemSummary = (
    <div id="1" className="relative overflow-y-hidden">
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

      <section className="mx-1 text-text-neutral-secondary">
        <div className="relative z-1 mb-16px flex justify-between font-semibold text-surface-brand-secondary">
          <div className="flex items-center">
            <p className="font-bold leading-5">{t('reports:REPORTS.ITEM_SUMMARY_FORMAT')}</p>
            <CollapseButton
              onClick={toggleSummaryTable}
              isCollapsed={isSummaryCollapsed}
              buttonType="default"
            />
          </div>
          <p className="text-xs font-semibold leading-5">
            {t('reports:REPORTS.UNIT_NEW_TAIWAN_DOLLARS')}
            {currency}
          </p>
        </div>
        {!isSummaryCollapsed && (
          <div className="hide-scrollbar overflow-x-auto">
            <div className="min-w-900px">
              <table className="relative z-1 w-full border-collapse bg-white">
                <thead>
                  <tr className="print:hidden">
                    <th className="w-50px whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-sm font-semibold">
                      {t('reports:REPORTS.CODE_NUMBER')}
                    </th>
                    <th
                      className={`w-800px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-sm font-semibold`}
                    >
                      {t('reports:REPORTS.ACCOUNTING_ITEMS')}
                    </th>
                    <th className="w-120px whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-sm font-semibold">
                      {curDate}
                    </th>
                    <th className="w-60px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-sm font-semibold">
                      %
                    </th>
                    <th className="w-120px whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-sm font-semibold">
                      {preDate}
                    </th>
                    <th className="w-60px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-sm font-semibold">
                      %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reportFinancial &&
                    reportFinancial.general &&
                    Object.prototype.hasOwnProperty.call(reportFinancial, 'general') &&
                    rowsForSummary(reportFinancial.general)}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
  const ItemDetail = (
    <div id="2" className={`relative overflow-y-hidden print:break-before-page`}>
      <section className="mx-1 text-text-neutral-secondary">
        <div className="mb-16px mt-32px flex justify-between font-semibold text-surface-brand-secondary">
          <div className="flex items-center">
            <p className="font-bold leading-5">
              {t('reports:REPORTS.DETAILED_CLASSIFICATION_FORMAT')}
            </p>
            <CollapseButton onClick={toggleDetailTable} isCollapsed={isDetailCollapsed} />
          </div>
          <p className="text-xs font-semibold leading-5">
            {t('reports:REPORTS.UNIT_NEW_TAIWAN_DOLLARS')}
            {currency}
          </p>
        </div>
        {!isDetailCollapsed && (
          <div className="hide-scrollbar overflow-x-auto">
            <div className="min-w-900px">
              <table className="w-full border-collapse bg-white">
                <thead>
                  <tr className="print:hidden">
                    <th className="w-50px whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-sm font-semibold">
                      {t('reports:REPORTS.CODE_NUMBER')}
                    </th>
                    <th className="w-800px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-sm font-semibold">
                      {t('reports:REPORTS.ACCOUNTING_ITEMS')}
                    </th>
                    <th className="w-120px whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-sm font-semibold">
                      {curDate}
                    </th>
                    <th className="w-60px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-sm font-semibold">
                      %
                    </th>
                    <th className="w-120px whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-sm font-semibold">
                      {preDate}
                    </th>
                    <th className="w-60px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-sm font-semibold">
                      %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reportFinancial &&
                    reportFinancial.general &&
                    Object.prototype.hasOwnProperty.call(reportFinancial, 'general') &&
                    rowsForDetail(reportFinancial.details)}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
  const ProportionalTable = (
    <div id="3" className={`relative overflow-y-hidden print:break-before-page`}>
      <section className="mx-1 text-text-neutral-secondary">
        <div className="mb-16px mt-32px flex justify-between font-semibold text-surface-brand-secondary">
          <p>{t('reports:REPORTS.ASSET_LIABILITY_RATIO')}</p>
        </div>
        <div className="mx-3 mr-0 flex flex-col space-y-10 sm:mr-3">
          <div className="flex flex-col space-y-0">
            <p className="text-base font-semibold text-text-brand-secondary-lv2">{curDate}</p>
            <div className="hide-scrollbar flex items-center justify-between overflow-x-auto">
              <ul className="space-y-2">
                {curAssetLiabilityRatioLabels.map((label, index) => (
                  <li key={label} className="flex items-center">
                    <span
                      className={`mr-2 inline-block h-2 w-2 rounded-full text-xs ${ASSETS_LIABILITIES_EQUITY_COLOR[index % ASSETS_LIABILITIES_EQUITY_COLOR.length]} `}
                    ></span>
                    <span className="w-100px text-sm lg:w-200px">
                      {t(`reports:ACCOUNTING_ACCOUNT.${label}`)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="-ml-1 lg:ml-0">{displayedCurALRChart}</div>
            </div>
          </div>
          <div className="flex flex-col space-y-0">
            <p className="text-base font-semibold text-text-brand-secondary-lv2">{preDate}</p>
            <div className="hide-scrollbar flex items-center justify-between overflow-x-auto">
              <ul className="space-y-2">
                {preAssetLiabilityRatioLabels.map((label, index) => (
                  <li key={label} className="flex items-center">
                    <span
                      className={`mr-2 inline-block h-2 w-2 rounded-full text-xs ${ASSETS_LIABILITIES_EQUITY_COLOR[index % ASSETS_LIABILITIES_EQUITY_COLOR.length]} `}
                    ></span>
                    <span className="w-100px text-sm lg:w-200px">
                      {t(`reports:ACCOUNTING_ACCOUNT.${label}`)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="-ml-3 sm:-ml-1 lg:ml-0">{displayedPreALRChart}</div>
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
  const AssetItem = (
    <div id="4" className={`hide-scrollbar relative overflow-y-hidden print:break-before-page`}>
      <section className="mx-1 mb-6 text-text-neutral-secondary">
        <div className="mb-16px mt-32px flex justify-between font-semibold text-surface-brand-secondary">
          <p>{t('reports:REPORTS.ASSET_DISTRIBUTION_CHART')}</p>
        </div>
        <div className="mx-3 flex flex-col space-y-10">
          <div className="flex flex-col space-y-5">
            <p className="text-base font-semibold text-text-brand-secondary-lv2">{curDate}</p>
            <div className="flex items-center justify-between">
              <ul className="space-y-2">
                {curAssetMixLabels.map((label, index) => {
                  // Info: (20250619 - Anna) 如果百分比為 0 ，label就不顯示
                  if (curAssetMixRatio[index] === 0) return null;
                  if (
                    curAssetMixRatio.slice(0, 5).every((value) => value === 0) &&
                    label === '其他'
                  ) return null;
                  return (
                    <li key={label} className="flex items-center">
                      <span
                        className={`mr-2 inline-block h-2 w-2 rounded-full ${COLOR_CLASSES[index % COLOR_CLASSES.length]}`}
                      ></span>
                      <span className="w-100px text-sm lg:w-auto">
                        {t(`reports:ACCOUNTING_ACCOUNT.${label}`)}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div className="relative" style={{ marginTop: '-20px' }}>
                {curAssetMixRatio.slice(0, -1).every((value) => value === 0) ? (
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
                    data={curAssetMixRatio}
                    labels={curAssetMixLabels}
                    colors={COLORS}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col space-y-5">
            <p className="text-base font-semibold text-text-brand-secondary-lv2">{preDate}</p>
            <div className="flex items-center justify-between">
              <ul className="space-y-2">
                {preAssetMixLabels.map((label, index) => {
                  // Info: (20250619 - Anna) 如果百分比為 0 ，label就不顯示
                  if (preAssetMixRatio[index] === 0) return null;
                  if (
                    preAssetMixRatio.slice(0, 5).every((value) => value === 0) &&
                    label === '其他'
                  ) return null;
                  return (
                    <li key={label} className="flex items-center">
                      <span
                        className={`mr-2 inline-block h-2 w-2 rounded-full ${COLOR_CLASSES[index % COLOR_CLASSES.length]}`}
                      ></span>
                      <span className="w-100px text-sm lg:w-auto">
                        {t(`reports:ACCOUNTING_ACCOUNT.${label}`)}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div className="relative" style={{ marginTop: '-20px' }}>
                {preAssetMixRatio.slice(0, -1).every((value) => value === 0) ? (
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
                    data={preAssetMixRatio}
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
  const TurnoverDay = (
    <div id="5" className={`relative overflow-y-hidden print:break-before-page`}>
      <section className="mx-1 text-text-neutral-secondary">
        <div className="mb-16px mt-32px flex justify-between font-semibold text-surface-brand-secondary">
          <p>{t('reports:REPORTS.ACCOUNTS_RECEIVABLE_TURNOVER_DAYS')}</p>
          <p className="flex items-center text-xs font-semibold leading-5">
            {t('reports:REPORTS.UNIT_DAYS')}
          </p>
        </div>
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="w-1/3 border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-sm font-semibold"></th>
              <th className="w-1/3 whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-end text-sm font-semibold">
                {t('reports:REPORTS.YEAR_TEMPLATE', { year: curYear })}
              </th>
              <th className="w-1/3 border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-end text-sm font-semibold">
                {t('reports:REPORTS.YEAR_TEMPLATE', { year: preYear })}
              </th>
            </tr>
          </thead>
          <tbody>
            {renderDataRow(
              t('reports:REPORTS.ACCOUNTS_RECEIVABLE_TURNOVER_DAYS'),
              reportFinancial?.otherInfo?.dso.curDso,
              reportFinancial?.otherInfo?.dso.preDso
            )}
          </tbody>
        </table>
        <div className="mb-16px mt-32px flex justify-between font-semibold text-surface-brand-secondary">
          <p>{t('reports:REPORTS.INVENTORY_TURNOVER_DAYS')}</p>
          <p className="flex items-center text-xs font-semibold leading-5">
            {t('reports:REPORTS.UNIT_DAYS')}
          </p>
        </div>
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="w-1/3 border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-sm font-semibold"></th>
              <th className="w-1/3 border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-end text-sm font-semibold">
                {t('reports:REPORTS.YEAR_TEMPLATE', { year: curYear })}
              </th>
              <th className="w-1/3 border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-end text-sm font-semibold">
                {t('reports:REPORTS.YEAR_TEMPLATE', { year: preYear })}
              </th>
            </tr>
          </thead>
          <tbody>
            {renderDataRow(
              t('reports:REPORTS.INVENTORY_TURNOVER_DAYS'),
              reportFinancial?.otherInfo?.inventoryTurnoverDays.curInventoryTurnoverDays,
              reportFinancial?.otherInfo?.inventoryTurnoverDays.preInventoryTurnoverDays
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

  return (
    <div className={`relative mx-auto w-full origin-top overflow-x-auto`}>
      {displayedSelectArea()}
      {/* Info: (20241125 - Tzuhan) 渲染打印模板，通過 CSS 隱藏 */}
      <div ref={printRef} className="hidden print:block">
        <BalanceSheetA4Template
          reportFinancial={reportFinancial}
          curDate={curDate}
          preDate={preDate}
        >
          {ItemSummary}
          {ItemDetail}
          {TurnoverDay}
        </BalanceSheetA4Template>
      </div>
      {/*  Info: (20241125 - Tzuhan) 預覽區域 */}
      <div className="block print:hidden">
        {ItemSummary}
        <hr className="break-before-page" />
        {ItemDetail}
        <hr className="break-before-page" />
        {ProportionalTable}
        <hr className="mb-16px mt-32px break-before-page" />
        {AssetItem}
        <hr className="break-before-page" />
        {TurnoverDay}
      </div>
      <DownloadBalanceSheet
        reportFinancial={reportFinancial}
        downloadRef={downloadRef}
        isDownloading={isDownloading}
      />
    </div>
  );
};

export default BalanceSheetList;
