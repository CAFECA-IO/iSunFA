import { APIName } from '@/constants/api_connection';
import { NON_EXISTING_REPORT_ID } from '@/constants/config';
import { useUserCtx } from '@/contexts/user_context';
import { BalanceSheetReport, FinancialReportItem } from '@/interfaces/report';
import APIHandler from '@/lib/utils/api_handler';
import Image from 'next/image';
import React, { useEffect } from 'react';
import PieChart from '@/components/balance_sheet_report_body/pie_chart';
import PieChartAssets from '@/components/balance_sheet_report_body/pie_chart_assets';
import useStateRef from 'react-usestateref';
import { timestampToString } from '@/lib/utils/common';
import { SkeletonList } from '@/components/skeleton/skeleton';
import { DEFAULT_SKELETON_COUNT_FOR_PAGE } from '@/constants/display';
import { useTranslation } from 'next-i18next';

interface IBalanceSheetReportBodyAllProps {
  reportId: string;
}

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
    APIName.REPORT_GET_BY_ID,
    {
      params: {
        companyId: selectedCompany?.id,
        reportId: reportId ?? NON_EXISTING_REPORT_ID,
      },
    },
    hasCompanyId
  );

  const isNoDataForCurALR = curAssetLiabilityRatio.every((value) => value === 0);
  const isNoDataForPreALR = preAssetLiabilityRatio.every((value) => value === 0);

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
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="200"
        height="200"
        fill="none"
        viewBox="0 0 200 200"
      >
        <circle cx="100" cy="100" r="100" fill="#D9D9D9"></circle>
        <text x="100" y="105" fill="#fff" fontSize="20" textAnchor="middle">
          {t('PROJECT.NO_DATA')}
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
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="200"
        height="200"
        fill="none"
        viewBox="0 0 200 200"
      >
        <circle cx="100" cy="100" r="100" fill="#D9D9D9"></circle>
        <text x="100" y="105" fill="#fff" fontSize="20" textAnchor="middle">
          {t('PROJECT.NO_DATA')}
        </text>
      </svg>
    </div>
  ) : (
    <div className="ml-10">
      <PieChart data={preAssetLiabilityRatio} />
    </div>
  );

  const renderedFooter = (page: number) => {
    return (
      <footer className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between border-t-2 border-solid border-lightGray9 bg-surface-brand-secondary p-10px">
        <p className="text-xs text-white">{page}</p>
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
      <td className="border border-lightGray8 p-10px text-sm">{label}</td>
      <td className="border border-lightGray8 p-10px text-end text-sm">{curValue}</td>
      <td className="border border-lightGray8 p-10px text-end text-sm">{preValue}</td>
    </tr>
  );

  const rowsForPage1 = (items: Array<FinancialReportItem>) => {
    const rows = items.slice(0, 9).map((item) => {
      if (!item.code) {
        return (
          <tr key={item.code}>
            <td colSpan={6} className="border border-lightGray8 p-10px text-sm font-bold">
              {item.name}
            </td>
          </tr>
        );
      }

      return (
        // Info: it's ok to use index in the static data (20240723 - Shirley)
        <tr key={item.code}>
          <td className="border border-lightGray8 p-10px text-sm">{item.code}</td>
          <td className="border border-lightGray8 p-10px text-sm">{item.name}</td>
          <td className="border border-lightGray8 p-10px text-end text-sm">
            {item.curPeriodAmountString}
          </td>
          <td className="border border-lightGray8 p-10px text-center text-sm">
            {item.curPeriodPercentage}
          </td>
          <td className="border border-lightGray8 p-10px text-end text-sm">
            {item.prePeriodAmountString}
          </td>
          <td className="border border-lightGray8 p-10px text-center text-sm">
            {item.prePeriodPercentage}
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
          <tr key={item.code}>
            <td colSpan={6} className="border border-lightGray8 p-10px text-sm font-bold">
              {item.name}
            </td>
          </tr>
        );
      }

      return (
        // Info: it's ok to use index in the static data (20240723 - Shirley)
        // eslint-disable-next-line react/no-array-index-key
        <tr key={index}>
          <td className="border border-lightGray8 p-10px text-sm">{item.code}</td>
          <td className="border border-lightGray8 p-10px text-sm">{item.name}</td>
          <td className="border border-lightGray8 p-10px text-end text-sm">
            {item.curPeriodAmountString}
          </td>
          <td className="border border-lightGray8 p-10px text-center text-sm">
            {item.curPeriodPercentage}
          </td>
          <td className="border border-lightGray8 p-10px text-end text-sm">
            {item.prePeriodAmountString}
          </td>
          <td className="border border-lightGray8 p-10px text-center text-sm">
            {item.prePeriodPercentage}
          </td>
        </tr>
      );
    });
    return rows;
  };

  const rowsForPage2part1 = (items: Array<FinancialReportItem>) => {
    const rows = items.slice(0, 2).map((item, index) => {
      if (!item.code) {
        return (
          <tr key={item.code}>
            <td colSpan={6} className="border border-lightGray8 p-10px text-sm font-bold">
              {item.name}
            </td>
          </tr>
        );
      }
      return (
        // Info: it's ok to use index in the static data (20240723 - Shirley)
        // eslint-disable-next-line react/no-array-index-key
        <tr key={index}>
          <td className="border border-lightGray8 p-10px text-sm">{item.code}</td>
          <td className="border border-lightGray8 p-10px text-sm">{item.name}</td>
          <td className="border border-lightGray8 p-10px text-end text-sm">
            {item.curPeriodAmountString}
          </td>
          <td className="border border-lightGray8 p-10px text-center text-sm">
            {item.curPeriodPercentage}
          </td>
          <td className="border border-lightGray8 p-10px text-end text-sm">
            {item.prePeriodAmountString}
          </td>
          <td className="border border-lightGray8 p-10px text-center text-sm">
            {item.prePeriodPercentage}
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
          <tr key={item.code}>
            <td colSpan={6} className="border border-lightGray8 p-10px text-sm font-bold">
              {item.name}
            </td>
          </tr>
        );
      }

      return (
        // Info: it's ok to use index in the static data (20240723 - Shirley)
        // eslint-disable-next-line react/no-array-index-key
        <tr key={index}>
          <td className="border border-lightGray8 p-10px text-sm">{item.code}</td>
          <td className="border border-lightGray8 p-10px text-sm">{item.name}</td>
          <td className="border border-lightGray8 p-10px text-end text-sm">
            {item.curPeriodAmountString}
          </td>
          <td className="border border-lightGray8 p-10px text-center text-sm">
            {item.curPeriodPercentage}
          </td>
          <td className="border border-lightGray8 p-10px text-end text-sm">
            {item.prePeriodAmountString}
          </td>
          <td className="border border-lightGray8 p-10px text-center text-sm">
            {item.prePeriodPercentage}
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
          <tr key={item.code}>
            <td colSpan={6} className="border border-lightGray8 p-10px text-sm font-bold">
              {item.name}
            </td>
          </tr>
        );
      }

      return (
        // Info: it's ok to use index in the static data (20240723 - Shirley)
        // eslint-disable-next-line react/no-array-index-key
        <tr key={index}>
          <td className="border border-lightGray8 p-10px text-sm">{item.code}</td>
          <td className="border border-lightGray8 p-10px text-sm">{item.name}</td>
          <td className="border border-lightGray8 p-10px text-end text-sm">
            {item.curPeriodAmountString}
          </td>
          <td className="border border-lightGray8 p-10px text-center text-sm">
            {item.curPeriodPercentage}
          </td>
          <td className="border border-lightGray8 p-10px text-end text-sm">
            {item.prePeriodAmountString}
          </td>
          <td className="border border-lightGray8 p-10px text-center text-sm">
            {item.prePeriodPercentage}
          </td>
        </tr>
      );
    });
    return rows;
  };

  const rowsForPage5 = (items: Array<FinancialReportItem>) => {
    const rows = items.slice(26, 40).map((item, index) => {
      if (!item.code) {
        return (
          <tr key={item.code}>
            <td colSpan={6} className="border border-lightGray8 p-10px text-sm font-bold">
              {item.name}
            </td>
          </tr>
        );
      }

      return (
        // Info: it's ok to use index in the static data (20240723 - Shirley)
        // eslint-disable-next-line react/no-array-index-key
        <tr key={index}>
          <td className="border border-lightGray8 p-10px text-sm">{item.code}</td>
          <td className="border border-lightGray8 p-10px text-sm">{item.name}</td>
          <td className="border border-lightGray8 p-10px text-end text-sm">
            {item.curPeriodAmountString}
          </td>
          <td className="border border-lightGray8 p-10px text-center text-sm">
            {item.curPeriodPercentage}
          </td>
          <td className="border border-lightGray8 p-10px text-end text-sm">
            {item.prePeriodAmountString}
          </td>
          <td className="border border-lightGray8 p-10px text-center text-sm">
            {item.prePeriodPercentage}
          </td>
        </tr>
      );
    });
    return rows;
  };

  const rowsForPage6 = (items: Array<FinancialReportItem>) => {
    const rows = items.slice(40, 54).map((item, index) => {
      if (!item.code) {
        return (
          <tr key={item.code}>
            <td colSpan={6} className="border border-lightGray8 p-10px text-sm font-bold">
              {item.name}
            </td>
          </tr>
        );
      }

      return (
        // Info: it's ok to use index in the static data (20240723 - Shirley)
        // eslint-disable-next-line react/no-array-index-key
        <tr key={index}>
          <td className="border border-lightGray8 p-10px text-sm">{item.code}</td>
          <td className="border border-lightGray8 p-10px text-sm">{item.name}</td>
          <td className="border border-lightGray8 p-10px text-end text-sm">
            {item.curPeriodAmountString}
          </td>
          <td className="border border-lightGray8 p-10px text-center text-sm">
            {item.curPeriodPercentage}
          </td>
          <td className="border border-lightGray8 p-10px text-end text-sm">
            {item.prePeriodAmountString}
          </td>
          <td className="border border-lightGray8 p-10px text-center text-sm">
            {item.prePeriodPercentage}
          </td>
        </tr>
      );
    });
    return rows;
  };

  const rowsForPage7 = (items: Array<FinancialReportItem>) => {
    const rows = items.slice(54, 68).map((item, index) => {
      if (!item.code) {
        return (
          <tr key={item.code}>
            <td colSpan={6} className="border border-lightGray8 p-10px text-sm font-bold">
              {item.name}
            </td>
          </tr>
        );
      }

      return (
        // Info: it's ok to use index in the static data (20240723 - Shirley)
        // eslint-disable-next-line react/no-array-index-key
        <tr key={index}>
          <td className="border border-lightGray8 p-10px text-sm">{item.code}</td>
          <td className="border border-lightGray8 p-10px text-sm">{item.name}</td>
          <td className="border border-lightGray8 p-10px text-end text-sm">
            {item.curPeriodAmountString}
          </td>
          <td className="border border-lightGray8 p-10px text-center text-sm">
            {item.curPeriodPercentage}
          </td>
          <td className="border border-lightGray8 p-10px text-end text-sm">
            {item.prePeriodAmountString}
          </td>
          <td className="border border-lightGray8 p-10px text-center text-sm">
            {item.prePeriodPercentage}
          </td>
        </tr>
      );
    });
    return rows;
  };

  const rowsForPage8 = (items: Array<FinancialReportItem>) => {
    const rows = items.slice(68, 80).map((item, index) => {
      if (!item.code) {
        return (
          <tr key={item.code}>
            <td colSpan={6} className="border border-lightGray8 p-10px text-sm font-bold">
              {item.name}
            </td>
          </tr>
        );
      }

      return (
        // Info: it's ok to use index in the static data (20240723 - Shirley)
        // eslint-disable-next-line react/no-array-index-key
        <tr key={index}>
          <td className="border border-lightGray8 p-10px text-sm">{item.code}</td>
          <td className="border border-lightGray8 p-10px text-sm">{item.name}</td>
          <td className="border border-lightGray8 p-10px text-end text-sm">
            {item.curPeriodAmountString}
          </td>
          <td className="border border-lightGray8 p-10px text-center text-sm">
            {item.curPeriodPercentage}
          </td>
          <td className="border border-lightGray8 p-10px text-end text-sm">
            {item.prePeriodAmountString}
          </td>
          <td className="border border-lightGray8 p-10px text-center text-sm">
            {item.prePeriodPercentage}
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
          <tr key={item.code}>
            <td colSpan={6} className="border border-lightGray8 p-10px text-sm font-bold">
              {item.name}
            </td>
          </tr>
        );
      }

      return (
        // Info: it's ok to use index in the static data (20240723 - Shirley)
        // eslint-disable-next-line react/no-array-index-key
        <tr key={index}>
          <td className="border border-lightGray8 p-10px text-sm">{item.code}</td>
          <td className="border border-lightGray8 p-10px text-sm">{item.name}</td>
          <td className="border border-lightGray8 p-10px text-end text-sm">
            {item.curPeriodAmountString}
          </td>
          <td className="border border-lightGray8 p-10px text-center text-sm">
            {item.curPeriodPercentage}
          </td>
          <td className="border border-lightGray8 p-10px text-end text-sm">
            {item.prePeriodAmountString}
          </td>
          <td className="border border-lightGray8 p-10px text-center text-sm">
            {item.prePeriodPercentage}
          </td>
        </tr>
      );
    });
    return rows;
  };

  const page1 = (
    <div id="1" className="relative h-a4-height overflow-y-hidden">
      {/* Info: watermark logo (20240723 - Shirley) */}
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
            {reportFinancial && reportFinancial.company && (
              <>
                <h1 className="mb-30px text-h6">
                  {reportFinancial.company.code} <br />
                  {reportFinancial.company.name}
                </h1>
                <p className="text-left text-xs font-bold leading-5">
                  {curDate}
                  <br />
                  合併財務報告 - 資產負債表
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
        <div className="relative z-1 mb-16px flex justify-between font-semibold text-surface-brand-secondary">
          <p>一、項目彙總格式</p>
          <p>單位：新台幣仟元</p>
        </div>
        <table className="relative z-1 w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left text-sm font-semibold">
                代號
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left text-sm font-semibold">
                會計項目
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end text-sm font-semibold">
                {curDate}
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-center text-sm font-semibold">
                %
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end text-sm font-semibold">
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
              rowsForPage1(reportFinancial.general)}
          </tbody>
        </table>
      </section>

      {renderedFooter(1)}
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
        <div className="mb-16px mt-32px flex justify-between font-semibold text-surface-brand-secondary">
          <p>一、項目彙總格式</p>
          <p>單位：新台幣仟元</p>
        </div>
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left text-sm font-semibold">
                代號
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left text-sm font-semibold">
                會計項目
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end text-sm font-semibold">
                {curDate}{' '}
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-center text-sm font-semibold">
                %
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end text-sm font-semibold">
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
              rowsForPage2(reportFinancial.general)}
          </tbody>
        </table>

        {/* Info: watermark logo (20240723 - Shirley) */}
        <div className="relative bottom-20 right-0 -z-10">
          <Image
            className="absolute right-0 top-0"
            src="/logo/watermark_logo.svg"
            alt="isunfa logo"
            width={450}
            height={300}
          />
        </div>

        <div className="mb-16px mt-32px flex justify-between font-semibold text-surface-brand-secondary">
          <p>二、細項分類格式</p>
          <p>單位：新台幣仟元</p>
        </div>
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left text-sm font-semibold">
                代號
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left text-sm font-semibold">
                會計項目
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end text-sm font-semibold">
                {curDate}
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-center text-sm font-semibold">
                %
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end text-sm font-semibold">
                {preDate}
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-center text-sm font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {reportFinancial &&
              reportFinancial.details &&
              Object.prototype.hasOwnProperty.call(reportFinancial, 'details') &&
              rowsForPage2part1(reportFinancial.details)}
          </tbody>
        </table>
      </section>
      {renderedFooter(2)}
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
        <div className="mb-16px mt-32px flex justify-between font-semibold text-surface-brand-secondary">
          <p>二、細項分類格式</p>
          <p>單位：新台幣仟元</p>
        </div>
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left text-sm font-semibold">
                代號
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left text-sm font-semibold">
                會計項目
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end text-sm font-semibold">
                {curDate}
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-center text-sm font-semibold">
                %
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end text-sm font-semibold">
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
              rowsForPage3(reportFinancial.details)}
          </tbody>
        </table>
      </section>
      {renderedFooter(3)}
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
        <div className="mb-16px mt-32px flex justify-between font-semibold text-surface-brand-secondary">
          <p>二、細項分類格式</p>
          <p>單位：新台幣仟元</p>
        </div>
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left text-sm font-semibold">
                代號
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left text-sm font-semibold">
                會計項目
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end text-sm font-semibold">
                {curDate}
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-center text-sm font-semibold">
                %
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end text-sm font-semibold">
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
              Object.prototype.hasOwnProperty.call(reportFinancial, 'details') &&
              rowsForPage4(reportFinancial.details)}
          </tbody>
        </table>
      </section>
      {renderedFooter(4)}
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
        <div className="mb-16px mt-32px flex justify-between font-semibold text-surface-brand-secondary">
          <p>二、細項分類格式</p>
          <p>單位：新台幣仟元</p>
        </div>
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left text-xs font-semibold">
                代號
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left text-xs font-semibold">
                會計項目
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end text-xs font-semibold">
                {curDate}
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-center text-xs font-semibold">
                %
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end text-xs font-semibold">
                {preDate}
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-center text-xs font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {reportFinancial &&
              reportFinancial.details &&
              Object.prototype.hasOwnProperty.call(reportFinancial, 'details') &&
              rowsForPage5(reportFinancial.details)}
          </tbody>
        </table>
      </section>
      {renderedFooter(5)}
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
        <div className="mb-16px mt-32px flex justify-between font-semibold text-surface-brand-secondary">
          <p>二、細項分類格式</p>
          <p>單位：新台幣仟元</p>
        </div>
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left text-sm font-semibold">
                代號
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left text-sm font-semibold">
                會計項目
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end text-sm font-semibold">
                {curDate}
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-center text-sm font-semibold">
                %
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end text-sm font-semibold">
                {preDate}
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-center text-sm font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {reportFinancial &&
              reportFinancial.details &&
              Object.prototype.hasOwnProperty.call(reportFinancial, 'details') &&
              rowsForPage6(reportFinancial.details)}
          </tbody>
        </table>
      </section>
      {renderedFooter(6)}
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
        <div className="mb-16px mt-32px flex justify-between font-semibold text-surface-brand-secondary">
          <p>二、細項分類格式</p>
          <p>單位：新台幣仟元</p>
        </div>
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left text-sm font-semibold">
                代號
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left text-sm font-semibold">
                會計項目
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end text-sm font-semibold">
                {curDate}
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-center text-sm font-semibold">
                %
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end text-sm font-semibold">
                {preDate}
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-center text-sm font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {reportFinancial &&
              reportFinancial.details &&
              Object.prototype.hasOwnProperty.call(reportFinancial, 'details') &&
              rowsForPage7(reportFinancial.details)}
          </tbody>
        </table>
      </section>
      {renderedFooter(7)}
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
        <div className="mb-16px mt-32px flex justify-between font-semibold text-surface-brand-secondary">
          <p>二、細項分類格式</p>
          <p>單位：新台幣仟元</p>
        </div>
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
              reportFinancial.details &&
              Object.prototype.hasOwnProperty.call(reportFinancial, 'details') &&
              rowsForPage8(reportFinancial.details)}
          </tbody>
        </table>
      </section>
      {renderedFooter(8)}
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
        <div className="mb-16px mt-32px flex justify-between font-semibold text-surface-brand-secondary">
          <p>二、細項分類格式</p>
          <p>單位：新台幣仟元</p>
        </div>
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left text-sm font-semibold">
                代號
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left text-sm font-semibold">
                會計項目
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end text-sm font-semibold">
                {curDate}
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-center text-sm font-semibold">
                %
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end text-sm font-semibold">
                {preDate}
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-center text-sm font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {reportFinancial &&
              reportFinancial.details &&
              Object.prototype.hasOwnProperty.call(reportFinancial, 'details') &&
              rowsForPage9(reportFinancial.details)}
          </tbody>
        </table>
        {/* Info: watermark logo (20240723 - Anna) */}
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
      {renderedFooter(9)}
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
                      className={`mr-2 inline-block h-2 w-2 rounded-full ${COLOR_CLASSES[index % COLOR_CLASSES.length]}`}
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
                      className={`mr-2 inline-block h-2 w-2 rounded-full ${COLOR_CLASSES[index % COLOR_CLASSES.length]}`}
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
      {renderedFooter(10)}
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
                    <span className="w-200px">{label}</span>
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
                    <span className="w-200px">{label}</span>
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
      {renderedFooter(11)}
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
      {renderedFooter(12)}
    </div>
  );

  return (
    <div className="mx-auto w-a4-width origin-top overflow-x-auto">
      {page1}
      <hr className="break-before-page" />
      {page2}
      <hr className="break-before-page" />
      {page3}
      <hr className="break-before-page" />
      {page4}
      <hr className="break-before-page" />
      {page5}
      <hr className="break-before-page" />
      {page6}
      <hr className="break-before-page" />
      {page7}
      <hr className="break-before-page" />
      {page8}
      <hr className="break-before-page" />
      {page9}
      <hr className="break-before-page" />
      {page10}
      <hr className="break-before-page" />
      {page11}
      <hr className="break-before-page" />
      {page12}
    </div>
  );
};

export default BalanceSheetReportBodyAll;
