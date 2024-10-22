import { APIName } from '@/constants/api_connection';
import { useUserCtx } from '@/contexts/user_context';
import { BalanceSheetReport } from '@/interfaces/report';
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
import { FinancialReportTypesKey } from '@/interfaces/report_type';
import BalanceDetailsButton from '@/components/button/balance_details_button';
import { IAccountReadyForFrontend } from '@/interfaces/accounting_account';

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

const BalanceSheetList = () => {
  const { t } = useTranslation('common');

  const { isAuthLoading, selectedCompany } = useUserCtx();
  const hasCompanyId = isAuthLoading === false && !!selectedCompany?.id;

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
  } = APIHandler<BalanceSheetReport>(
    APIName.REPORT_GET_V2,
    {
      params: {
        companyId: selectedCompany?.id,
      },
      query: {
        startDate: 1704070800,
        endDate: 1706745599,
        language: 'en',
        reportType: FinancialReportTypesKey.balance_sheet,
      },
    },
    hasCompanyId
  );

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
          acc[item.code] = true; // Info: (20241017 - Anna) 預設每個項目的展開狀態為摺疊
          return acc;
        },
        {} as { [key: string]: boolean }
      );
      setIsSubAccountsCollapsed(initialCollapseState);
    }
  }, [reportFinancial]);

  if (getReportFinancialIsLoading === undefined || getReportFinancialIsLoading) {
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
    <div className="ml-20">
      {/* // ToDo: (20240911 - Liz) 未來可以改用 CSS 刻，以便拔掉 svg */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="200"
        height="200"
        fill="none"
        viewBox="0 0 200 200"
      >
        <circle cx="100" cy="100" r="100" fill="#D9D9D9"></circle>
        <text x="100" y="105" fill="#fff" fontSize="20" textAnchor="middle">
          {t('common:COMMON.NO_DATA')}
        </text>
      </svg>
    </div>
  ) : (
    <div className="ml-10">
      <PieChart data={curAssetLiabilityRatio} />
    </div>
  );

  const displayedPreALRChart = isNoDataForPreALR ? (
    <div className="ml-20">
      {/* // ToDo: (20240911 - Liz) 未來可以改用 CSS 刻，以便拔掉 svg */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="200"
        height="200"
        fill="none"
        viewBox="0 0 200 200"
      >
        <circle cx="100" cy="100" r="100" fill="#D9D9D9"></circle>
        <text x="100" y="105" fill="#fff" fontSize="20" textAnchor="middle">
          {t('common:COMMON.NO_DATA')}
        </text>
      </svg>
    </div>
  ) : (
    <div className="ml-10">
      <PieChart data={preAssetLiabilityRatio} />
    </div>
  );

  const renderDataRow = (
    label: string,
    curValue: number | undefined,
    preValue: number | undefined
  ) => (
    <tr>
      <td className="border border-stroke-brand-secondary-soft p-10px text-sm">{label}</td>
      <td className="border border-stroke-brand-secondary-soft p-10px text-end text-sm">
        {curValue}
      </td>
      <td className="border border-stroke-brand-secondary-soft p-10px text-end text-sm">
        {preValue}
      </td>
    </tr>
  );

  const rowsForSummary = (items: Array<IAccountReadyForFrontend>) => {
    const rows = items.map((item) => {
      if (!item.code) {
        return (
          <tr key={item.code}>
            <td
              colSpan={6}
              className="border border-stroke-brand-secondary-soft p-10px text-sm font-bold"
            >
              {item.name}
            </td>
          </tr>
        );
      }

      return (
        <tr key={item.code}>
          <td className="border border-stroke-brand-secondary-soft p-10px text-sm">{item.code}</td>
          <td className="border border-stroke-brand-secondary-soft p-10px text-sm">{item.name}</td>
          <td className="border border-stroke-brand-secondary-soft p-10px text-end text-sm">
            {item.curPeriodAmountString}
          </td>
          <td className="border border-stroke-brand-secondary-soft p-10px text-center text-sm">
            {item.curPeriodPercentageString}
          </td>
          <td className="border border-stroke-brand-secondary-soft p-10px text-end text-sm">
            {item.prePeriodAmountString}
          </td>
          <td className="border border-stroke-brand-secondary-soft p-10px text-center text-sm">
            {item.prePeriodPercentageString}
          </td>
        </tr>
      );
    });
    return rows;
  };

  // Info: (20241021 - Anna) 要記得改interface
  const rowsForDetail = (items: Array<IAccountReadyForFrontend>) => {
    const rows = items.map((item) => {
      if (!item.code) {
        return (
          <tr key={item.code}>
            <td
              colSpan={6}
              className="border border-stroke-brand-secondary-soft p-10px text-sm font-bold"
            >
              {item.name}
            </td>
          </tr>
        );
      }

      return (
        <React.Fragment key={item.code}>
          <tr>
            <td className="border border-stroke-brand-secondary-soft p-10px text-sm">
              {item.code}
            </td>
            <td className="flex items-center justify-between border-b border-stroke-brand-secondary-soft p-10px text-sm">
              {item.name}
              {/* Info: (20241021 - Anna) 如果有 children 才顯示 CollapseButton */}
              {item.children && item.children.length > 0 && (
                <CollapseButton
                  // Info: (20241017 - Anna) 指定 item 的 code 作為參數
                  onClick={() => toggleSubAccounts(item.code)}
                  // Info: (20241017 - Anna) 依據每個 item 的狀態決定是否展開
                  isCollapsed={isSubAccountsCollapsed[item.code] ?? true}
                  buttonType="orange"
                />
              )}
            </td>
            <td className="border border-stroke-brand-secondary-soft p-10px text-end text-sm">
              {item.curPeriodAmountString}
            </td>
            <td className="border border-stroke-brand-secondary-soft p-10px text-center text-sm">
              {item.curPeriodPercentageString}
            </td>
            <td className="border border-stroke-brand-secondary-soft p-10px text-end text-sm">
              {item.prePeriodAmountString}
            </td>
            <td className="border border-stroke-brand-secondary-soft p-10px text-center text-sm">
              {item.prePeriodPercentageString}
            </td>
          </tr>
          {/* Info: (20241003 - Anna) 如果展開，新增子科目表格 */}
          {!isSubAccountsCollapsed[item.code] &&
            item.children &&
            item.children.length > 0 &&
            item.children.map((child) => (
              <tr key={`sub-accounts-${child.code}`}>
                <td className="border border-stroke-brand-secondary-soft p-10px text-sm"></td>
                <td className="items-center border border-stroke-brand-secondary-soft p-10px text-sm">
                  <div className="flex items-center justify-between">
                    <div className="justify-start">
                      <span>{child.code}</span>
                      <span className="ml-2">{child.name}</span>
                    </div>
                    <BalanceDetailsButton />
                  </div>
                </td>
                <td className="border border-stroke-brand-secondary-soft p-10px text-end text-sm">
                  {child.curPeriodAmountString}
                </td>
                <td className="border border-stroke-brand-secondary-soft p-10px text-center text-sm">
                  {child.curPeriodPercentageString}
                </td>
                <td className="border border-stroke-brand-secondary-soft p-10px text-end text-sm">
                  {child.prePeriodAmountString}
                </td>
                <td className="border border-stroke-brand-secondary-soft p-10px text-center text-sm">
                  {child.prePeriodPercentageString}
                </td>
              </tr>
            ))}
        </React.Fragment>
      );
    });
    return rows;
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
            <p>項目彙總格式</p>
            <CollapseButton
              onClick={toggleSummaryTable}
              isCollapsed={isSummaryCollapsed}
              buttonType="default"
            />
          </div>
          <p>單位：新台幣元</p>
        </div>
        {!isSummaryCollapsed && (
          <table className="relative z-1 w-full border-collapse bg-white">
            <thead>
              <tr>
                <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left text-sm font-semibold">
                  代號
                </th>
                <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left text-sm font-semibold">
                  會計項目
                </th>
                <th className="whitespace-nowrap border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end text-sm font-semibold">
                  {curDate}
                </th>
                <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-center text-sm font-semibold">
                  %
                </th>
                <th className="whitespace-nowrap border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end text-sm font-semibold">
                  {preDate}
                </th>
                <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-center text-sm font-semibold">
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
        )}
      </section>
    </div>
  );
  const ItemDetail = (
    <div id="3" className="relative overflow-y-hidden">
      <section className="mx-1 text-text-neutral-secondary">
        <div className="relative z-1 mb-16px flex justify-between font-semibold text-surface-brand-secondary">
          <div className="flex items-center">
            <p>細項分類格式</p>
            <CollapseButton
              onClick={toggleDetailTable}
              isCollapsed={isDetailCollapsed}
              buttonType="default"
            />
          </div>
          <p>單位：新台幣元</p>
        </div>
        {!isDetailCollapsed && (
          <table className="w-full border-collapse bg-white">
            <thead>
              <tr>
                <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left text-sm font-semibold">
                  代號
                </th>
                <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left text-sm font-semibold">
                  會計項目
                </th>
                <th className="whitespace-nowrap border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end text-sm font-semibold">
                  {curDate}
                </th>
                <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-center text-sm font-semibold">
                  %
                </th>
                <th className="whitespace-nowrap border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end text-sm font-semibold">
                  {preDate}
                </th>
                <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-center text-sm font-semibold">
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
        )}
      </section>
    </div>
  );
  const ProportionalTable = (
    <div id="10" className="relative overflow-y-hidden">
      <section className="mx-1 text-text-neutral-secondary">
        <div className="mb-16px mt-32px flex justify-between font-semibold text-surface-brand-secondary">
          <p>三、資產負債比例表</p>
        </div>
        <div className="mx-3 flex flex-col space-y-10">
          <div className="flex flex-col space-y-0">
            <p className="text-xs font-semibold text-text-brand-secondary-lv2">{curDate}</p>
            <div className="flex items-center">
              <ul className="space-y-2">
                {curAssetLiabilityRatioLabels.map((label, index) => (
                  <li key={label} className="flex items-center">
                    <span
                      className={`mr-2 inline-block h-2 w-2 rounded-full ${ASSETS_LIABILITIES_EQUITY_COLOR[index % ASSETS_LIABILITIES_EQUITY_COLOR.length]}`}
                    ></span>
                    <span className="w-200px">{label}</span>
                  </li>
                ))}
              </ul>
              {displayedCurALRChart}{' '}
            </div>
          </div>
          <div className="flex flex-col space-y-0">
            <p className="text-xs font-semibold text-text-brand-secondary-lv2">{preDate}</p>
            <div className="flex items-center">
              <ul className="space-y-2">
                {preAssetLiabilityRatioLabels.map((label, index) => (
                  <li key={label} className="flex items-center">
                    <span
                      className={`mr-2 inline-block h-2 w-2 rounded-full ${ASSETS_LIABILITIES_EQUITY_COLOR[index % ASSETS_LIABILITIES_EQUITY_COLOR.length]}`}
                    ></span>
                    <span className="w-200px">{label}</span>
                  </li>
                ))}
              </ul>
              {displayedPreALRChart}{' '}
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
    <div id="11" className="relative overflow-y-hidden">
      <section className="mx-1 text-text-neutral-secondary">
        <div className="mb-16px mt-32px flex justify-between font-semibold text-surface-brand-secondary">
          <p>四、資產分布圖</p>
        </div>
        <div className="mx-3 flex flex-col space-y-10">
          <div className="flex flex-col space-y-5">
            <p className="text-xs font-semibold text-text-brand-secondary-lv2">{curDate}</p>
            <div className="flex items-center justify-between">
              <ul className="space-y-2">
                {curAssetMixLabels.map((label, index) => (
                  <li key={label} className="flex items-center">
                    <span
                      className={`mr-2 inline-block h-2 w-2 rounded-full ${COLOR_CLASSES[index % COLOR_CLASSES.length]}`}
                    ></span>
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
              <PieChartAssets data={curAssetMixRatio} labels={curAssetMixLabels} colors={COLORS} />
            </div>
          </div>

          <div className="flex flex-col space-y-5">
            <p className="text-xs font-semibold text-text-brand-secondary-lv2">{preDate}</p>
            <div className="flex items-center justify-between">
              <ul className="space-y-2">
                {preAssetMixLabels.map((label, index) => (
                  <li key={label} className="flex items-center">
                    <span
                      className={`mr-2 inline-block h-2 w-2 rounded-full ${COLOR_CLASSES[index % COLOR_CLASSES.length]}`}
                    ></span>
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
              <PieChartAssets data={preAssetMixRatio} labels={preAssetMixLabels} colors={COLORS} />
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
    <div id="12" className="relative overflow-y-hidden">
      <section className="mx-1 text-text-neutral-secondary">
        <div className="mt-30px flex justify-between font-semibold text-surface-brand-secondary">
          <p>五、應收帳款週轉天數</p>
          <p>單位：天</p>
        </div>
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left text-sm font-semibold"></th>
              <th className="whitespace-nowrap border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end text-sm font-semibold">
                {curYear}年度
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end text-sm font-semibold">
                {preYear}年度
              </th>
            </tr>
          </thead>
          <tbody>
            {renderDataRow(
              '應收帳款週轉天數',
              reportFinancial?.otherInfo?.dso.curDso,
              reportFinancial?.otherInfo?.dso.preDso
            )}
          </tbody>
        </table>
        <div className="mb-16px mt-32px flex justify-between font-semibold text-surface-brand-secondary">
          <p>六、存貨週轉天數</p>
          <p>單位：天</p>
        </div>
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left text-sm font-semibold"></th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end text-sm font-semibold">
                {curYear}年度
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end text-sm font-semibold">
                {preYear}年度
              </th>
            </tr>
          </thead>
          <tbody>
            {renderDataRow(
              '存貨週轉天數',
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
    <div className="mx-auto w-full origin-top overflow-x-auto">
      {ItemSummary}
      <hr className="break-before-page" />
      {ItemDetail}
      <hr className="break-before-page" />
      {ProportionalTable}
      <hr className="break-before-page" />
      {AssetItem}
      <hr className="break-before-page" />
      {TurnoverDay}
    </div>
  );
};

export default BalanceSheetList;
