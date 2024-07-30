/* eslint-disable tailwindcss/no-arbitrary-value */
// TODO: 在 tailwindcss.config 註冊 css 變數，取消 eslint-disable (20240723 - Shirley Anna)
import { APIName } from '@/constants/api_connection';
import { useUserCtx } from '@/contexts/user_context';
import { CashFlowStatementReport, FinancialReportItem } from '@/interfaces/report';
import APIHandler from '@/lib/utils/api_handler';
import React, { useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import LineChart from '@/components/cash_flow_statement_report_body/line_chart';
import BarChart from '@/components/cash_flow_statement_report_body/bar_chart';
import Image from 'next/image';
import { FREE_COMPANY_ID, NON_EXISTING_REPORT_ID } from '@/constants/config';
import { SkeletonList } from '@/components/skeleton/skeleton';
import { DEFAULT_SKELETON_COUNT_FOR_PAGE } from '@/constants/display';
import useStateRef from 'react-usestateref';
import { timestampToString } from '@/lib/utils/common';

interface ICashFlowStatementReportBodyAllProps {
  reportId: string;
}

const CashFlowStatementReportBodyAll = ({ reportId }: ICashFlowStatementReportBodyAllProps) => {
  const { selectedCompany } = useUserCtx();
  const {
    data: reportFinancial,
    code: getReportFinancialCode,
    success: getReportFinancialSuccess,
    isLoading: getReportFinancialIsLoading,
  } = APIHandler<CashFlowStatementReport>(APIName.REPORT_FINANCIAL_GET_BY_ID, {
    params: {
      companyId: selectedCompany?.id ?? FREE_COMPANY_ID,
      reportId: reportId ?? NON_EXISTING_REPORT_ID,
    },
  });

  const [curDate, setCurDate] = useStateRef<{ from: string; to: string }>({ from: '', to: '' });
  const [curYear, setCurYear] = useStateRef<string>('');
  const [preDate, setPreDate] = useStateRef<{ from: string; to: string }>({ from: '', to: '' });
  const [preYear, setPreYear] = useStateRef<string>('');

  const [lineChartData, setLineChartData] = useStateRef<number[]>([]);
  const [lineChartLabels, setLineChartLabels] = useStateRef<string[]>([]);

  const [curBarChartData, setCurBarChartData] = useStateRef<number[]>([]);
  const [curBarChartLabels, setCurBarChartLabels] = useStateRef<string[]>([]);
  const [preBarChartData, setPreBarChartData] = useStateRef<number[]>([]);
  const [preBarChartLabels, setPreBarChartLabels] = useStateRef<string[]>([]);

  // TODO: 測試用，正式上線時需刪除 (20240723 - Shirley Anna)
  // eslint-disable-next-line no-console
  console.log('reportFinancial', reportFinancial);

  useEffect(() => {
    if (getReportFinancialSuccess === true && reportFinancial) {
      const currentFrom = timestampToString(reportFinancial.curDate.from ?? 0);
      const currentTo = timestampToString(reportFinancial.curDate.to ?? 0);
      const previousFrom = timestampToString(reportFinancial.preDate.from ?? 0);
      const previousTo = timestampToString(reportFinancial.preDate.to ?? 0);
      const currentYear = currentTo.year;
      const previousYear = previousTo.year;
      // const lineChartData = reportFinancial.otherInfo.operatingStabilized.map((item) => item.amount);
      // const lineChartLabels = reportFinancial.otherInfo.operatingStabilized.map((item) => item.name);

      // eslint-disable-next-line no-console
      console.log('reportFinancial.otherInfo in CashFlow useEffect', reportFinancial.otherInfo);
      // 處理 operatingStabilized 數據
      // if (reportFinancial.otherInfo && reportFinancial.otherInfo.operatingStabilized) {
      //   const chartData = reportFinancial.otherInfo.operatingStabilized.lineChartData as {
      //     data: number[];
      //     labels: string[];
      //   };
      //   if (chartData && 'data' in chartData && 'labels' in chartData) {
      //     setLineChartData(chartData.data);
      //     setLineChartLabels(chartData.labels);
      //   }
      // }

      setLineChartData([0, 0, 0, 0, 0]);
      setLineChartLabels(['2020', '2021', '2022', '2023', '2024']);
      setCurBarChartData([0, 0, 0]);
      setCurBarChartLabels(['不動產、廠房、\n設備的收支項目', '策略性投資項目', '其他']);
      setPreBarChartData([0, 0, 0]);
      setPreBarChartLabels(['不動產、廠房、\n設備的收支項目', '策略性投資項目', '其他']);

      setCurDate({ from: currentFrom.date, to: currentTo.date });
      setCurYear(currentYear);
      setPreDate({ from: previousFrom.date, to: previousTo.date });
      setPreYear(previousYear);
    }
  }, [reportFinancial]);

  if (getReportFinancialIsLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-surface-neutral-main-background">
        <SkeletonList count={DEFAULT_SKELETON_COUNT_FOR_PAGE} />
      </div>
    );
  } else if (!getReportFinancialSuccess) {
    return <div>Error {getReportFinancialCode}</div>;
  }

  const renderedFooter = (page: number) => {
    return (
      <footer className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between border-t-2 border-solid border-[#e0e0e0] bg-surface-brand-secondary p-10px">
        <p className="m-0 text-xs text-white">{page}</p>
        <div className="text-base font-bold text-surface-brand-secondary">
          <Image width={80} height={20} src="/logo/white_isunfa_logo_light.svg" alt="iSunFA Logo" />
        </div>
      </footer>
    );
  };

  const renderTable = (data: FinancialReportItem[], startIndex: number, endIndex: number) => {
    return (
      <table className="relative w-full border-collapse bg-white">
        <thead>
          <tr>
            <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-xs font-semibold">
              代號
            </th>
            <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-xs font-semibold">
              會計項目
            </th>
            <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-xxs font-semibold">
              {curDate.from}至{curDate.to}
            </th>
            <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-xxs font-semibold">
              {preDate.from}至{preDate.to}
            </th>
          </tr>
        </thead>
        <tbody>
          {data.slice(startIndex, endIndex).map((value) => (
            <tr key={value.code}>
              <td className="border border-[#dee2e6] p-[10px] text-xs">{value.code}</td>
              <td className="border border-[#dee2e6] p-[10px] text-xs">{value.name}</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-xs">
                {value.curPeriodAmount}
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-xs">
                {value.prePeriodAmount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderedPage10_1 = () => {
    return (
      <div className="mt-4 text-text-neutral-primary">
        <h3 className="text-base font-semibold leading-[24px] tracking-[0.16px]">
          不動產、廠房、設備的收支項目：
        </h3>
        <ol className="list-decimal pl-6 text-xs font-normal leading-[20px] tracking-[0.12px]">
          <li>
            取得不動產、廠房及設備：本期支出較上期減少，表示公司可能正在優化其資本支出，減少對固定資產的投資，這可能是因為市場需求減弱或是公司在提高資產使用效率方面取得了進展。
          </li>
          <li>
            處分不動產、廠房及設備價款：處分收入是公司在出售非核心或效益較低的資產，從而增加現金流，這是優化資源配置和提高資本回報率的策略。而本期收入較上期略為減少，可能是因為市場需求減弱或公司資源配置的改變。
          </li>
          <li>
            收取政府補助款－不動產、廠房及設備：本期較上期大幅增加，表明公司正在積極參與政府鼓勵的項目或政策，或是政府於本年度撥款，這不僅能降低公司的資本支出壓力，還能促進其長期發展和技術升級。
          </li>
        </ol>
        <h3 className="mt-4 text-base font-semibold leading-[24px] tracking-[0.16px]">
          策略性投資項目：
        </h3>
        <ol className="list-decimal pl-6 text-xs font-normal leading-[20px] tracking-[0.12px]">
          <li>
            取得透過損益按公允價值衡量之金融資產：本期取得此類金融資產的金額大幅增加，表示公司可能在積極參與短期市場投資，尋求快速的收益增長。這種策略可能反映了公司對市場走勢的信心。
          </li>
          <li>
            取得透過其他綜合損益按公允價值衡量之金融資產：本期取得此類金融資產支出較上期增加，反映公司在中長期投資上的策略調整。說明公司持續加大對中長期投資的力度，看好未來的市場前景並希望透過這些投資獲得穩定的回報。
          </li>
          <li>
            取得按攤銷後成本衡量之金融資產：本期支出較上期減少，顯示公司在穩定的利息收入投資方面有所減少，可能是為了重新配置資源或降低風險。
          </li>
          <li>
            處分透過其他綜合損益按公允價值衡量之金融資產價款：處分收入的增加可能顯示公司在調整投資組合，出售部分獲利或表現不佳的資產，以實現資本利得或重新配置資源。而本期收入較上期減少，可能表示市場條件變化或公司資源重新配置。
          </li>
          <li>
            按攤銷後成本衡量之金融資產領回：本期較上期增加，說明公司正在回收先前的投資，這可能是因為資金需求增加或是對市場前景的重新評估。
          </li>
          <li>
            透過其他綜合損益按公允價值衡量之權益工具投資成本收回：本期較上期增加，收回此類投資成本表明公司正在實現其長期投資收益，這有助於提高公司的現金流和財務靈活性。
          </li>
          <li>
            除列避險之金融工具：本期較上期減少，表明公司風險管理策略有所調整，可能是出於市場風險變化或公司風險偏好的改變。
          </li>
          <li>
            收取其他股利：本期較上期增加，表明公司持有的投資正在產生穩定的回報，這有助於增強公司的財務健康度和投資者信心。
          </li>
          <li>
            收取採用權益法投資之股利：本期較上期增加，顯示公司在其聯營企業或子公司中的投資表現良好，反映出其投資策略的成功和相關企業的穩定增長。
          </li>
        </ol>
      </div>
    );
  };

  const renderedPage11_1 = () => {
    return (
      <ol className="list-decimal pl-6 text-xs font-normal leading-[20px] tracking-[0.12px] text-text-neutral-primary">
        <li>
          收取之利息：本期較上期增加，表示公司資金運用有效，現金流穩定，可能來自於更高的現金或短期投資。
        </li>
        <li>收取政府補助款 - 其他：兩期並無太大增減。</li>
        <li>取得商標等資產：本期較上期減少，可能是在重新評估其投資優先級。</li>
        <li>處分商標等資產價款：本期較上期減少，可能是資源重整，轉移業務。</li>
        <li>
          預付租金攤銷增加：本期對付租金攤銷增加，而上期數據較少，表示今年有新的租金付訖款需求，公司在擴展經營場所或設備價值取得。
        </li>
        <li>存出保證金增加：本期支出較上期增加，顯示公司在新業務或合作上的擔保。</li>
        <li>
          取得保證金收益：本期較上期增加，表明公司完成了一些業務合作或獲得更高的信用保障，釋放資金。
        </li>
      </ol>
    );
  };

  const renderedPage11_2 = (
    // TODO: change based on API (20240730 - Shirley)
    data: FinancialReportItem[],
    currentYear: string,
    previousYear: string
  ) => {
    return (
      <div className="mt-4">
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr className="bg-[#ffd892]">
              <th className="border border-[#c1c9d5] p-[10px] text-left text-[10px] font-semibold leading-[20px] tracking-[0.1px] text-text-neutral-secondary"></th>
              <th className="border border-[#c1c9d5] p-[10px] text-center text-[10px] font-semibold leading-[20px] tracking-[0.1px] text-text-neutral-secondary">
                {currentYear}年度
              </th>
              <th className="border border-[#c1c9d5] p-[10px] text-center text-[10px] font-semibold leading-[20px] tracking-[0.1px] text-text-neutral-secondary">
                {previousYear}年度
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-start text-[12px] font-normal leading-[20px] tracking-[0.12px] text-text-neutral-secondary">
                {reportFinancial &&
                  reportFinancial.details &&
                  reportFinancial.details[0] &&
                  reportFinancial.details[0].name}
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[12px] font-normal leading-[20px] tracking-[0.12px] text-text-neutral-secondary">
                {reportFinancial &&
                  reportFinancial.details &&
                  reportFinancial.details[0] &&
                  reportFinancial.details[0].curPeriodAmount}
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[12px] font-normal leading-[20px] tracking-[0.12px] text-text-neutral-secondary">
                {reportFinancial &&
                  reportFinancial.details &&
                  reportFinancial.details[0] &&
                  reportFinancial.details[0].prePeriodAmount}
              </td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-start text-[12px] font-normal leading-[20px] tracking-[0.12px] text-text-neutral-secondary">
                不動產、廠房及設備
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[12px] font-normal leading-[20px] tracking-[0.12px] text-text-neutral-secondary">
                949,816,825
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[12px] font-normal leading-[20px] tracking-[0.12px] text-text-neutral-secondary">
                1,082,672,130
              </td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-start text-[12px] font-normal leading-[20px] tracking-[0.12px] text-text-neutral-secondary">
                無形資產支出
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[12px] font-normal leading-[20px] tracking-[0.12px] text-text-neutral-secondary">
                5,518,414
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[12px] font-normal leading-[20px] tracking-[0.12px] text-text-neutral-secondary">
                6,954,326
              </td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-start text-[12px] font-normal leading-[20px] tracking-[0.12px] text-text-neutral-secondary">
                自由現金流量
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[12px] font-normal leading-[20px] tracking-[0.12px] text-text-neutral-secondary">
                286,632,108
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[12px] font-normal leading-[20px] tracking-[0.12px] text-text-neutral-secondary">
                520,972,732
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const page1 = (
    <div id="1" className="relative h-a4-height overflow-hidden">
      <header className="mb-10 flex justify-between text-white">
        <div className="w-30% bg-surface-brand-secondary pb-14px pl-[10px] pr-14px pt-[40px] font-bold">
          <div className="">
            {reportFinancial && reportFinancial.company && (
              <>
                <h1 className="mb-30px text-h6">
                  {reportFinancial.company.code} <br />
                  {reportFinancial.company.name}
                </h1>
                <p className="font-normal">
                  {curDate.from}至{curDate.to} <br />
                  合併財務報告 - 現金流量表
                </p>
              </>
            )}
          </div>
        </div>
        <div className="box-border w-35% text-right">
          <h2 className="relative whitespace-nowrap border-b-[10px] border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Cash Flow Statement
            <span className="absolute bottom-[-20px] right-0 h-[5px] w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="relative mx-1 text-text-neutral-secondary">
        <div className="mb-[16px] flex justify-between font-semibold text-surface-brand-secondary">
          <p>一、項目彙總格式</p>
          <p>單位：新台幣仟元</p>
        </div>
        {reportFinancial && reportFinancial.general && renderTable(reportFinancial.general, 0, 10)}
        {/* <table className="relative z-10 w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
                代號
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
                會計項目
              </th>
              <th className="whitespace-nowrap border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold">
                2023-1-1 至 2023-12-31
              </th>
              <th className="whitespace-nowrap border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold">
                2022-1-1 至 2022-12-31
              </th>
            </tr>
          </thead>
          <tbody>
            {reportFinancial &&
              reportFinancial.general &&
              reportFinancial.general.slice(0, 10).map((value) => (
                <tr key={value.code}>
                  <td className="border border-[#dee2e6] p-[10px] text-[14px]">{value.code}</td>
                  <td className="border border-[#dee2e6] p-[10px] text-[14px]">{value.name}</td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                    {value.curPeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                    {value.prePeriodAmount}
                  </td>
                </tr>
              ))}
          </tbody>
        </table> */}
      </section>
      {renderedFooter(1)}
    </div>
  );
  const page2 = (
    <div id="2" className="relative h-a4-height overflow-hidden">
      <header className="flex justify-between text-white">
        <div className="mt-[29px] flex w-[28%]">
          <div className="h-[10px] w-[82.5%] bg-surface-brand-secondary"></div>
          <div className="h-[10px] w-[17.5%] bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative whitespace-nowrap border-b-[10px] border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Cash Flow Statement
            <span className="absolute bottom-[-20px] right-0 h-[5px] w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="relative mx-1 text-text-neutral-secondary">
        <div className="mb-1 mt-8 flex justify-between text-xs font-semibold text-surface-brand-secondary">
          <p>一、項目彙總格式</p>
          <p>單位：新台幣仟元</p>
        </div>
        {reportFinancial && reportFinancial.general && renderTable(reportFinancial.general, 10, 19)}
        <div className="relative -z-10">
          <Image
            className="absolute -top-300px right-0"
            src="/logo/watermark_logo.svg"
            alt="isunfa logo"
            width={450}
            height={300}
          />
        </div>
        {/* <table className="relative z-10 w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
                代號
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
                會計項目
              </th>
              <th className="whitespace-nowrap border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold">
                2023-1-1 至 2023-12-31
              </th>
              <th className="whitespace-nowrap border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold">
                2022-1-1 至 2022-12-31
              </th>
            </tr>
          </thead>
          <tbody>
            {reportFinancial &&
              reportFinancial.general &&
              reportFinancial.general.slice(10, 19).map((value) => (
                <tr key={value.code}>
                  <td className="border border-[#dee2e6] p-[10px] text-[14px]">{value.code}</td>
                  <td className="border border-[#dee2e6] p-[10px] text-[14px]">{value.name}</td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                    {value.curPeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                    {value.prePeriodAmount}
                  </td>
                </tr>
              ))}
          </tbody>
        </table> */}
        <div className="mb-1 mt-8 flex justify-between text-xs font-semibold text-surface-brand-secondary">
          <p>二、細項分類格式</p>
          <p>單位：新台幣仟元</p>
        </div>
        {reportFinancial && reportFinancial.details && renderTable(reportFinancial.details, 0, 3)}
        {/* <table className="relative z-10 w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
                代號
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
                會計項目
              </th>
              <th className="whitespace-nowrap border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold">
                2023-1-1 至 2023-12-31
              </th>
              <th className="whitespace-nowrap border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold">
                2022-1-1 至 <br /> 2022-12-31
              </th>
            </tr>
          </thead>
          <tbody>
            {reportFinancial &&
              reportFinancial.details &&
              reportFinancial.details.slice(0, 3).map((value) => (
                <tr key={value.code}>
                  <td className="border border-[#dee2e6] p-[10px] text-[14px]">{value.code}</td>
                  <td className="border border-[#dee2e6] p-[10px] text-[14px]">{value.name}</td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                    {value.curPeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                    {value.prePeriodAmount}
                  </td>
                </tr>
              ))}
          </tbody>
        </table> */}
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
      {renderedFooter(2)}
    </div>
  );
  const page3 = (
    <div id="3" className="relative h-a4-height overflow-hidden">
      <header className="flex justify-between text-white">
        <div className="mt-[29px] flex w-[28%]">
          <div className="h-[10px] w-[82.5%] bg-surface-brand-secondary"></div>
          <div className="h-[10px] w-[17.5%] bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative whitespace-nowrap border-b-[10px] border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Cash Flow Statement
            <span className="absolute bottom-[-20px] right-0 h-[5px] w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="relative mx-1 text-text-neutral-secondary">
        <div className="mb-1 mt-8 flex justify-between text-xs font-semibold text-surface-brand-secondary">
          <p>二、細項分類格式</p>
          <p>單位：新台幣仟元</p>
        </div>
        {reportFinancial && reportFinancial.details && renderTable(reportFinancial.details, 0, 13)}
        {/* <table className="relative z-10 w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
                代號
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
                會計項目
              </th>
              <th className="whitespace-nowrap border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold">
                2023-1-1 至 2023-12-31
              </th>
              <th className="whitespace-nowrap border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold">
                2022-1-1 至 2022-12-31
              </th>
            </tr>
          </thead>
          <tbody>
            {reportFinancial &&
              reportFinancial.details &&
              reportFinancial.details.slice(0, 13).map((value) => (
                <tr key={value.code}>
                  <td className="border border-[#dee2e6] p-[10px] text-[14px]">{value.code}</td>
                  <td className="border border-[#dee2e6] p-[10px] text-[14px]">{value.name}</td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                    {value.curPeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                    {value.prePeriodAmount}
                  </td>
                </tr>
              ))}
          </tbody>
        </table> */}
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
      {renderedFooter(3)}
    </div>
  );
  const page4 = (
    <div id="4" className="relative h-a4-height overflow-hidden">
      <header className="flex justify-between text-white">
        <div className="mt-[29px] flex w-[28%]">
          <div className="h-[10px] w-[82.5%] bg-surface-brand-secondary"></div>
          <div className="h-[10px] w-[17.5%] bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative whitespace-nowrap border-b-[10px] border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Cash Flow Statement
            <span className="absolute bottom-[-20px] right-0 h-[5px] w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="relative mx-1 text-text-neutral-secondary">
        <div className="mb-1 mt-8 flex justify-between text-xs font-semibold text-surface-brand-secondary">
          <p>二、細項分類格式</p>
          <p>單位：新台幣仟元</p>
        </div>
        {reportFinancial && reportFinancial.details && renderTable(reportFinancial.details, 13, 26)}
        {/* <table className="relative z-10 w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
                代號
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
                會計項目
              </th>
              <th className="whitespace-nowrap border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold">
                2023-1-1 至 2023-12-31
              </th>
              <th className="whitespace-nowrap border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold">
                2022-1-1 至 2022-12-31
              </th>
            </tr>
          </thead>
          <tbody>
            {reportFinancial &&
              reportFinancial.details &&
              reportFinancial.details.slice(13, 26).map((value) => (
                <tr key={value.code}>
                  <td className="border border-[#dee2e6] p-[10px] text-[14px]">{value.code}</td>
                  <td className="border border-[#dee2e6] p-[10px] text-[14px]">{value.name}</td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                    {value.curPeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                    {value.prePeriodAmount}
                  </td>
                </tr>
              ))}
          </tbody>
        </table> */}
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
      {renderedFooter(4)}
    </div>
  );
  const page5 = (
    <div id="5" className="relative h-a4-height overflow-hidden">
      <header className="flex justify-between text-white">
        <div className="mt-[29px] flex w-[28%]">
          <div className="h-[10px] w-[82.5%] bg-surface-brand-secondary"></div>
          <div className="h-[10px] w-[17.5%] bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative whitespace-nowrap border-b-[10px] border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Cash Flow Statement
            <span className="absolute bottom-[-20px] right-0 h-[5px] w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="relative mx-1 text-text-neutral-secondary">
        <div className="mb-1 mt-8 flex justify-between text-xs font-semibold text-surface-brand-secondary">
          <p>二、細項分類格式</p>
          <p>單位：新台幣仟元</p>
        </div>
        {reportFinancial && reportFinancial.details && renderTable(reportFinancial.details, 26, 41)}
        {/* <table className="relative z-10 w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
                代號
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
                會計項目
              </th>
              <th className="whitespace-nowrap border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold">
                2023-1-1 至 2023-12-31
              </th>
              <th className="whitespace-nowrap border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold">
                2022-1-1 至 2022-12-31
              </th>
            </tr>
          </thead>
          <tbody>
            {reportFinancial &&
              reportFinancial.details &&
              reportFinancial.details.slice(26, 41).map((value) => (
                <tr key={value.code}>
                  <td className="border border-[#dee2e6] p-[10px] text-[14px]">{value.code}</td>
                  <td className="border border-[#dee2e6] p-[10px] text-[14px]">{value.name}</td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                    {value.curPeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                    {value.prePeriodAmount}
                  </td>
                </tr>
              ))}
          </tbody>
        </table> */}
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
      {renderedFooter(5)}
    </div>
  );
  const page6 = (
    <div id="6" className="relative h-a4-height overflow-hidden">
      <header className="flex justify-between text-white">
        <div className="mt-[29px] flex w-[28%]">
          <div className="h-[10px] w-[82.5%] bg-surface-brand-secondary"></div>
          <div className="h-[10px] w-[17.5%] bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative whitespace-nowrap border-b-[10px] border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Cash Flow Statement
            <span className="absolute bottom-[-20px] right-0 h-[5px] w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="relative mx-1 text-text-neutral-secondary">
        <div className="mb-1 mt-8 flex justify-between text-xs font-semibold text-surface-brand-secondary">
          <p>二、細項分類格式</p>
          <p>單位：新台幣仟元</p>
        </div>
        {reportFinancial && reportFinancial.details && renderTable(reportFinancial.details, 41, 55)}
        {/* <table className="relative z-10 w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
                代號
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
                會計項目
              </th>
              <th className="whitespace-nowrap border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold">
                2023-1-1 至 2023-12-31
              </th>
              <th className="whitespace-nowrap border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold">
                2022-1-1 至 2022-12-31
              </th>
            </tr>
          </thead>
          <tbody>
            {reportFinancial &&
              reportFinancial.details &&
              reportFinancial.details.slice(41, 55).map((value) => (
                <tr key={value.code}>
                  <td className="border border-[#dee2e6] p-[10px] text-[14px]">{value.code}</td>
                  <td className="border border-[#dee2e6] p-[10px] text-[14px]">{value.name}</td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                    {value.curPeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                    {value.prePeriodAmount}
                  </td>
                </tr>
              ))}
          </tbody>
        </table> */}
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
      {renderedFooter(6)}
    </div>
  );
  const page7 = (
    <div id="7" className="relative h-a4-height overflow-hidden">
      <header className="flex justify-between text-white">
        <div className="mt-[29px] flex w-[28%]">
          <div className="h-[10px] w-[82.5%] bg-surface-brand-secondary"></div>
          <div className="h-[10px] w-[17.5%] bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative whitespace-nowrap border-b-[10px] border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Cash Flow Statement
            <span className="absolute bottom-[-20px] right-0 h-[5px] w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="relative mx-1 text-text-neutral-secondary">
        <div className="mb-1 mt-8 flex justify-between text-xs font-semibold text-surface-brand-secondary">
          <p>一、項目彙總格式</p>
          <p>單位：新台幣仟元</p>
        </div>
        {reportFinancial && reportFinancial.details && renderTable(reportFinancial.details, 55, 70)}
        {/* <table className="relative z-10 w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
                代號
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
                會計項目
              </th>
              <th className="whitespace-nowrap border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold">
                2023-1-1 至 2023-12-31
              </th>
              <th className="whitespace-nowrap border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold">
                2022-1-1 至 2022-12-31
              </th>
            </tr>
          </thead>
          <tbody>
            {reportFinancial &&
              reportFinancial.details &&
              reportFinancial.details.slice(55, 70).map((value) => (
                <tr key={value.code}>
                  <td className="border border-[#dee2e6] p-[10px] text-[14px]">{value.code}</td>
                  <td className="border border-[#dee2e6] p-[10px] text-[14px]">{value.name}</td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                    {value.curPeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                    {value.prePeriodAmount}
                  </td>
                </tr>
              ))}
          </tbody>
        </table> */}
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
      {renderedFooter(7)}
    </div>
  );
  const page8 = (
    <div id="8" className="relative h-a4-height overflow-hidden">
      <header className="flex justify-between text-white">
        <div className="mt-[29px] flex w-[28%]">
          <div className="h-[10px] w-[82.5%] bg-surface-brand-secondary"></div>
          <div className="h-[10px] w-[17.5%] bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative whitespace-nowrap border-b-[10px] border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Cash Flow Statement
            <span className="absolute bottom-[-20px] right-0 h-[5px] w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="relative mx-3 text-xs text-text-neutral-secondary">
        <div className="mb-[16px] mt-[32px] flex justify-between font-semibold text-surface-brand-secondary">
          <p>三、營業活動穩定度：A與B量現穩定比例關係，公司的營業活動穩定。</p>
        </div>
        {reportFinancial &&
        reportFinancial.otherInfo &&
        Object.prototype.hasOwnProperty.call(reportFinancial.otherInfo, 'operatingStabilized') ? (
          <>
            <div className="relative mb-0 flex items-center pb-1">
              <Image
                src="/icons/line_chart_icon.svg"
                alt=""
                className="mr-2"
                width={24}
                height={24}
              />
              <p className="my-auto items-center text-center text-xs font-semibold">A和B比例關係</p>
              <div className="absolute bottom-0 left-0 h-px w-full bg-darkBlue2"></div>
            </div>
            <div className="mb-16 flex">
              <div className="mt-18px w-3/5">
                <LineChart data={lineChartData} labels={lineChartLabels} />
              </div>
              <div className="mt-18px w-2/5 pl-8 text-xs">
                <p>A. 稅前淨利(淨損)+折舊及攤銷費用-支付的所得稅</p>
                <p>B. 營業活動的現金流入(流出)</p>
              </div>
            </div>
            <div className="mb-1 mt-2 flex justify-between text-xs font-semibold text-surface-brand-secondary">
              <p>圖表金額來源彙總：</p>
            </div>
            <table className="relative w-full border-collapse bg-white">
              <thead>
                <tr className="text-xxs">
                  {/* <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold"></th> */}
                  {lineChartLabels?.map((label) => (
                    <th
                      key={label}
                      className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold"
                    >
                      {label}
                    </th>
                  ))}
                  {/* <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                    2019
                  </th>
                  <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                    2020
                  </th>
                  <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                    2021
                  </th>
                  <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                    2022
                  </th>
                  <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                    2023
                  </th> */}
                </tr>
              </thead>

              <tbody className="text-xs">
                <tr>
                  <td className="border border-[#dee2e6] p-[10px] font-semibold">A</td>
                  <td className="border border-[#dee2e6] p-[10px] font-semibold"></td>
                  <td className="border border-[#dee2e6] p-[10px] font-semibold"></td>
                  <td className="border border-[#dee2e6] p-[10px] font-semibold"></td>
                  <td className="border border-[#dee2e6] p-[10px] font-semibold"></td>
                  <td className="border border-[#dee2e6] p-[10px] font-semibold"></td>
                </tr>
                <tr>
                  <td className="border border-[#dee2e6] p-[10px]">
                    {reportFinancial &&
                      reportFinancial.details &&
                      reportFinancial.details[2] &&
                      reportFinancial.details[2].name}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end">389,845,336</td>
                  <td className="border border-[#dee2e6] p-[10px] text-end">584,777,180</td>
                  <td className="border border-[#dee2e6] p-[10px] text-end">663,126,314</td>
                  <td className="border border-[#dee2e6] p-[10px] text-end">
                    {reportFinancial &&
                      reportFinancial.details &&
                      reportFinancial.details[2] &&
                      reportFinancial.details[2].prePeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end">
                    {reportFinancial &&
                      reportFinancial.details &&
                      reportFinancial.details[2] &&
                      reportFinancial.details[2].curPeriodAmount}
                  </td>
                </tr>
                <tr>
                  <td className="border border-[#dee2e6] p-[10px]">折舊及攤銷費用</td>
                  <td className="border border-[#dee2e6] p-[10px] text-end">286,884,241</td>
                  <td className="border border-[#dee2e6] p-[10px] text-end">331,724,691</td>
                  <td className="border border-[#dee2e6] p-[10px] text-end">422,394,869</td>
                  <td className="border border-[#dee2e6] p-[10px] text-end">437,254,273</td>
                  <td className="border border-[#dee2e6] p-[10px] text-end">532,190,921</td>
                </tr>
                <tr>
                  <td className="border border-[#dee2e6] p-[10px]">
                    {reportFinancial &&
                      reportFinancial.details &&
                      reportFinancial.details.find(
                        (detail) => detail.name === '退還（支付）之所得稅'
                      )?.name}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end">52,044,071</td>
                  <td className="border border-[#dee2e6] p-[10px] text-end">51,362,365</td>
                  <td className="border border-[#dee2e6] p-[10px] text-end">83,497,851</td>
                  <td className="border border-[#dee2e6] p-[10px] text-end">
                    {reportFinancial &&
                      reportFinancial.details &&
                      reportFinancial.details.find(
                        (detail) => detail.name === '退還（支付）之所得稅'
                      )?.prePeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end">
                    {reportFinancial &&
                      reportFinancial.details &&
                      reportFinancial.details.find(
                        (detail) => detail.name === '退還（支付）之所得稅'
                      )?.curPeriodAmount}
                  </td>
                </tr>
                <tr>
                  <td className="border border-[#dee2e6] p-[10px] font-semibold">B</td>
                  <td className="border border-[#dee2e6] p-[10px] font-semibold"></td>
                  <td className="border border-[#dee2e6] p-[10px] font-semibold"></td>
                  <td className="border border-[#dee2e6] p-[10px] font-semibold"></td>
                  <td className="border border-[#dee2e6] p-[10px] font-semibold"></td>
                  <td className="border border-[#dee2e6] p-[10px] font-semibold"></td>
                </tr>
                <tr>
                  <td className="border border-[#dee2e6] p-[10px]">
                    {reportFinancial &&
                      reportFinancial.details &&
                      reportFinancial.details[0] &&
                      reportFinancial.details[0].name}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end">615,138,744</td>
                  <td className="border border-[#dee2e6] p-[10px] text-end">822,666,212</td>
                  <td className="border border-[#dee2e6] p-[10px] text-end">1,112,160,722</td>
                  <td className="border border-[#dee2e6] p-[10px] text-end">
                    {reportFinancial &&
                      reportFinancial.details &&
                      reportFinancial.details[0] &&
                      reportFinancial.details[0].prePeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end">
                    {reportFinancial &&
                      reportFinancial.details &&
                      reportFinancial.details[0] &&
                      reportFinancial.details[0].curPeriodAmount}
                  </td>
                </tr>
                <tr>
                  <td className="border border-[#dee2e6] p-[10px]"></td>
                  <td className="border border-[#dee2e6] p-[10px]"></td>
                  <td className="border border-[#dee2e6] p-[10px]"></td>
                  <td className="border border-[#dee2e6] p-[10px]"></td>
                  <td className="border border-[#dee2e6] p-[10px]"></td>
                  <td className="border border-[#dee2e6] p-[10px]"></td>
                </tr>
                <tr>
                  <td className="border border-[#dee2e6] p-[10px]">A和B比例關係</td>
                  <td className="border border-[#dee2e6] p-[10px] text-end">1.02</td>
                  <td className="border border-[#dee2e6] p-[10px] text-end">1.05</td>
                  <td className="border border-[#dee2e6] p-[10px] text-end">0.90</td>
                  <td className="border border-[#dee2e6] p-[10px] text-end">0.93</td>
                  <td className="border border-[#dee2e6] p-[10px] text-end">0.79</td>
                </tr>
              </tbody>
            </table>
          </>
        ) : null}
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
      {renderedFooter(8)}
    </div>
  );
  const page9 = (
    <div id="9" className="relative h-a4-height overflow-hidden">
      <header className="flex justify-between text-white">
        <div className="mt-[29px] flex w-[28%]">
          <div className="h-[10px] w-[82.5%] bg-surface-brand-secondary"></div>
          <div className="h-[10px] w-[17.5%] bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative whitespace-nowrap border-b-[10px] border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Cash Flow Statement
            <span className="absolute bottom-[-20px] right-0 h-[5px] w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="relative mx-3 text-xs text-text-neutral-secondary">
        <div className="mb-[16px] mt-[32px] font-semibold text-surface-brand-secondary">
          <p className="text-xs font-semibold leading-none">
            四、投資活動 - 「不動產、廠房及設備」及「策略性投資」佔比：
          </p>
          <p className="text-xs font-semibold leading-none">
            公司投資於不動產、廠房、設備，佔投資活動比例高，公司致力於主要事業的拓展。
          </p>
        </div>
        <div className="mt-8 flex items-end justify-between">
          <div className="w-1/2 pr-4">
            <div className="relative mb-0 flex items-center pb-1">
              <Image
                src="/icons/bar_chart_icon.svg"
                alt=""
                className="mr-2"
                width={24}
                height={24}
              />
              <p className="my-auto items-end text-xs font-semibold text-lightGray5">
                {curYear}年度投資活動項目佔比
              </p>
              <div className="absolute bottom-0 left-0 h-px w-full bg-darkBlue2"></div>
            </div>
            <BarChart data={curBarChartData} labels={curBarChartLabels} />
          </div>
          <div className="w-1/2 pl-4">
            <div className="relative mb-0 flex items-center pb-1">
              <Image
                src="/icons/bar_chart_icon.svg"
                alt=""
                className="mr-2"
                width={24}
                height={24}
              />
              <p className="my-auto items-end text-xs font-semibold text-lightGray5">
                {preYear}年度投資活動項目佔比
              </p>
              <div className="absolute bottom-0 left-0 h-px w-full bg-darkBlue2"></div>
            </div>
            <BarChart data={preBarChartData} labels={preBarChartLabels} />
          </div>
        </div>
        <div className="mb-[16px] mt-4 font-semibold text-surface-brand-secondary">
          <p className="text-xs font-semibold">四之一、2023年度上圖組成項目之細項及iSunFa認為：</p>
        </div>
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
      {renderedFooter(9)}
    </div>
  );
  const page10 = (
    <div id="10" className="relative h-a4-height overflow-hidden">
      <header className="flex justify-between text-white">
        <div className="mt-[29px] flex w-[28%]">
          <div className="h-[10px] w-[82.5%] bg-surface-brand-secondary"></div>
          <div className="h-[10px] w-[17.5%] bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative whitespace-nowrap border-b-[10px] border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Cash Flow Statement
            <span className="absolute bottom-[-20px] right-0 h-[5px] w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="relative mx-3 text-xs text-text-neutral-secondary">
        <div className="mb-[16px] mt-[32px] text-xs font-semibold leading-[20px] tracking-[0.12px] text-surface-brand-secondary">
          <p className="text-xs font-semibold">
            四之一，{curYear}年度上圖組成項目之細項及iSunFa認為：
          </p>
        </div>
        {renderedPage10_1()}
      </section>
      {renderedFooter(10)}
    </div>
  );
  const page11 = (
    <div id="11" className="relative h-a4-height overflow-hidden">
      <header className="flex justify-between text-white">
        <div className="mt-[29px] flex w-[28%]">
          <div className="h-[10px] w-[82.5%] bg-surface-brand-secondary"></div>
          <div className="h-[10px] w-[17.5%] bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative whitespace-nowrap border-b-[10px] border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Cash Flow Statement
            <span className="absolute bottom-[-20px] right-0 h-[5px] w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="relative mx-3 text-xs text-text-neutral-secondary">
        <div className="mb-[16px] mt-[32px] text-xs font-semibold leading-[20px] tracking-[0.12px] text-surface-brand-secondary">
          <h3 className="mt-8 text-base font-semibold leading-[24px] tracking-[0.16px] text-black">
            其他：
          </h3>
          {renderedPage11_1()}
        </div>
        <div className="mb-4 mt-[32px] text-center text-xs font-semibold leading-[20px] tracking-[0.12px] text-surface-brand-secondary">
          <p className="text-start text-xs font-semibold">
            五、年度產生的自由現金：公司可以靈活運用的現金
          </p>
          {renderedPage11_2([], curYear, preYear)}
          <div className="relative -z-10">
            <Image
              className="absolute -top-180px right-0"
              src="/logo/watermark_logo.svg"
              alt="isunfa logo"
              width={450}
              height={300}
            />
          </div>
        </div>
      </section>
      {renderedFooter(11)}
    </div>
  );

  return (
    <div className="mx-auto w-a4-width">
      {page1}
      {page2}
      {page3}
      {page4}
      {page5}
      {page6}
      {page7}
      {page8}
      {page9}
      {page10}
      {page11}
    </div>
  );
};

export default CashFlowStatementReportBodyAll;
