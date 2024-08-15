/* eslint-disable tailwindcss/no-arbitrary-value */
// TODO: 在 tailwindcss.config 註冊 css 變數，取消 eslint-disable (20240723 - Shirley Anna)
import { SkeletonList } from '@/components/skeleton/skeleton';
import { APIName } from '@/constants/api_connection';
import { NON_EXISTING_REPORT_ID } from '@/constants/config';
import { DEFAULT_SKELETON_COUNT_FOR_PAGE } from '@/constants/display';
import { useUserCtx } from '@/contexts/user_context';
import { FinancialReport, TaxReport401 } from '@/interfaces/report';
import APIHandler from '@/lib/utils/api_handler';
import React, { useEffect, useState } from 'react';
// import { format } from 'date-fns';

interface ITaxReportBodyAllProps {
  reportId: string;
}

const TaxReportBodyAll = ({ reportId }: ITaxReportBodyAllProps) => {
  const { isAuthLoading, selectedCompany } = useUserCtx();
  // Info: (20240814 - Anna) 使用 useState 定義 report401 變量的狀態，並將其類型設為 TaxReport401 | null
  const [report401, setReport401] = useState<TaxReport401 | null>(null);
  useEffect(() => {
 const fetchReport = async () => {
   if (selectedCompany && reportId) {
     const companyId = selectedCompany.id;

     try {
       const response = await fetch(
         `https://isunfa.com/company/${companyId}/report/${reportId}`,
         {
           method: 'GET',
           headers: {
             'Content-Type': 'application/json',
           },
         }
       );

       if (!response.ok) {
         throw new Error(`Error fetching report: ${response.statusText}`);
       }

       const reportData = await response.json();
       setReport401(reportData);
     } catch (error) {
       // eslint-disable-next-line no-console
       console.error('Failed to fetch report:', error);
     }
   }
 };

    fetchReport();
  }, [selectedCompany]);

  if (!report401) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-surface-neutral-main-background">
        <SkeletonList count={DEFAULT_SKELETON_COUNT_FOR_PAGE} />
      </div>
    );
  }

  const hasCompanyId = isAuthLoading === false && !!selectedCompany?.id;
  const {
    data: reportFinancial,
    code: getReportFinancialCode,
    success: getReportFinancialSuccess,
    isLoading: getReportFinancialIsLoading,
  } = APIHandler<FinancialReport>(
    APIName.REPORT_GET_BY_ID,
    {
      params: {
        companyId: selectedCompany?.id,
        reportId: reportId ?? NON_EXISTING_REPORT_ID,
      },
    },
    hasCompanyId
  );

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
    !Object.prototype.hasOwnProperty.call(reportFinancial.otherInfo, 'revenueAndExpenseRatio') ||
    !Object.prototype.hasOwnProperty.call(reportFinancial.otherInfo, 'revenueToRD')
  ) {
    return <div>錯誤 {getReportFinancialCode}</div>;
  }
  /* Info: 格式化數字為千分位 (20240730 - Anna) */
  // const formatNumber = (num: number) => num.toLocaleString();
  /* Info: 轉換和格式化日期 (20240730 - Anna) */
  // const curDateFrom = new Date(reportFinancial.curDate.from * 1000);
  // const curDateTo = new Date(reportFinancial.curDate.to * 1000);
  // const preDateFrom = new Date(reportFinancial.preDate.from * 1000);
  // const preDateTo = new Date(reportFinancial.preDate.to * 1000);
  // const formattedCurFromDate = format(curDateFrom, 'yyyy-MM-dd');
  // const formattedCurToDate = format(curDateTo, 'yyyy-MM-dd');
  // const formattedPreFromDate = format(preDateFrom, 'yyyy-MM-dd');
  // const formattedPreToDate = format(preDateTo, 'yyyy-MM-dd');

  const page1 = (
    <div id="1" className="relative h-a4-width overflow-y-hidden">
      <header className="flex w-full justify-between">
        <table className="border-collapse border border-black text-[8px]">
          <tbody>
            <tr>
              <td className="border border-black px-2 py-0">統一編號</td>
              <td className="border border-black px-2 py-0">
                {report401?.basicInfo.uniformNumber || 'N/A'}
              </td>
            </tr>
            <tr>
              <td className="border border-black px-2 py-0">營業人名稱</td>
              <td className="border border-black px-2 py-0">
                {report401?.basicInfo.businessName || 'N/A'}
              </td>
            </tr>
            <tr>
              <td className="border border-black px-2 py-0">稅籍編號</td>
              <td className="border border-black px-2 py-0">
                {report401?.basicInfo.taxSerialNumber || 'N/A'}
              </td>
            </tr>
          </tbody>
        </table>
        <div className="flex flex-col text-center">
          <h1 className="text-sm font-bold">
            <span>財政部</span>
            <span>
              {''}北區{''}
            </span>
            <span>國稅局營業人銷售額與稅額申報書(401)</span>
          </h1>
          <p className="text-xs">(一般稅額計算-專營應稅營業人使用)</p>
          <div className="flex justify-between text-xs">
            <p className="flex-1 text-center">
              所屬年月份:{report401?.basicInfo.currentYear || 'N/A'}年 月
            </p>
            <p className="text-right">金額單位:新臺幣元</p>
          </div>
        </div>
        <table className="border-collapse border border-black text-[8px]">
          <tbody>
            <tr>
              <td
                className="text-nowrap border-l border-r border-t border-black px-2 py-0"
                rowSpan={3}
              >
                註記欄
              </td>
              <td className="border-b border-l border-t border-black px-2 py-0" colSpan={2}>
                核准按月申報
              </td>
              <td className="w-1/8 border border-black px-2 py-0"></td>
            </tr>
            <tr>
              <td
                className="text-nowrap border-l border-r border-t border-black px-2 py-0"
                rowSpan={2}
              >
                總繳單位
                <br />
                核准合併
              </td>
              <td className="text-nowrap border border-black px-2 py-0">總機構彙總申報</td>
              <td className="w-1/8 border border-black px-2 py-0"></td>
            </tr>
            <tr>
              <td className="text-nowrap border border-black px-2 py-0">各單位分別申報</td>
              <td className="w-1/8 border border-black px-2 py-0"></td>
            </tr>
          </tbody>
        </table>
      </header>
      <table className="w-full border-collapse border border-black text-[8px]">
        <tbody>
          <tr>
            <td className="text-nowrap border border-black px-2 py-0">負責人姓名</td>
            <td className="border border-black px-2 py-0">
              {report401?.basicInfo.personInCharge || 'N/A'}
            </td>
            <td className="text-nowrap border border-black px-2 py-0">營業地址</td>
            <td className="border border-black px-2 py-0" colSpan={9}>
              {report401?.basicInfo.businessAddress || 'N/A'}
            </td>
            <td className="text-nowrap border border-black px-2 py-0">使用發票份數</td>
            <td className="border border-black px-2 py-0 text-right">
              {report401?.basicInfo.usedInvoiceCount || 'N/A'}份
            </td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-0 text-center" rowSpan={10}>
              銷項
            </td>
            <td className="border-b border-l border-t border-black px-2 py-0" rowSpan={2}>
              項目
            </td>
            <td className="border-b border-r border-t border-black px-2 py-0" rowSpan={2}>
              區分
            </td>
            <td className="border border-black px-2 py-0 text-center" colSpan={4}>
              應稅
            </td>
            <td className="border border-black px-2 py-0 text-center" rowSpan={2} colSpan={2}>
              零稅率銷售額
            </td>
            <td className="border border-black px-2 py-0 text-center" rowSpan={10}>
              稅額
              <br />
              計算
            </td>
            <td className="border border-black px-2 py-0">代號</td>
            <td className="border border-black px-2 py-0 text-center" colSpan={2}>
              項目
            </td>
            <td className="border border-black px-2 py-0">稅額</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-0 text-center" colSpan={2}>
              銷售額
            </td>
            <td className="border border-black px-2 py-0 text-center" colSpan={2}>
              稅額
            </td>
            <td className="border border-black px-2 py-0">1</td>
            <td className="border border-black px-2 py-0">本期(月)銷項稅額合計</td>
            <td className="border border-black px-2 py-0">② 101</td>
            <td className="border border-black px-2 py-0"></td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-0" colSpan={2}>
              三聯式發票、電子計算機發票
            </td>
            <td className="border border-black px-2 py-0">1</td>
            <td className="border border-black px-2 py-0"></td>
            <td className="border border-black px-2 py-0">2</td>
            <td className="border border-black px-2 py-0">
              {report401?.sales.breakdown.triplicateAndElectronic.tax || 'N/A'}
            </td>
            <td className="border border-black px-2 py-0" colSpan={2}>
              3 (非經海關出口應附證明文件者)
            </td>
            <td className="border border-black px-2 py-0">7</td>
            <td className="border border-black px-2 py-0">得扣抵進項稅額合計</td>
            <td className="border border-black px-2 py-0">⑨+⑩ 107</td>
            <td className="border border-black px-2 py-0"></td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-0" colSpan={2}>
              收銀機發票(三聯式)及電子發票
            </td>
            <td className="border border-black px-2 py-0">5</td>
            <td className="border border-black px-2 py-0"></td>
            <td className="border border-black px-2 py-0">6</td>
            <td className="border border-black px-2 py-0">
              {report401?.sales.breakdown.cashRegisterTriplicate.tax || 'N/A'}
            </td>
            <td className="border border-black px-2 py-0">7</td>
            <td className="border border-black px-2 py-0"></td>
            <td className="border border-black px-2 py-0">8</td>
            <td className="border border-black px-2 py-0">上期(月)累積留抵稅額</td>
            <td className="border border-black px-2 py-0">108</td>
            <td className="border border-black px-2 py-0"></td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-0" colSpan={2}>
              二聯式發票、收銀機發票(二聯式)
            </td>
            <td className="border border-black px-2 py-0">9</td>
            <td className="border border-black px-2 py-0"></td>
            <td className="border border-black px-2 py-0">10</td>
            <td className="border border-black px-2 py-0">
              {report401?.sales.breakdown.duplicateAndCashRegister.tax || 'N/A'}
            </td>
            <td className="border border-black px-2 py-0" colSpan={2}>
              11 (經海關出口免附證明文件者)
            </td>
            <td className="border border-black px-2 py-0">10</td>
            <td className="border border-black px-2 py-0">小計(7+8)</td>
            <td className="border border-black px-2 py-0">110</td>
            <td className="border border-black px-2 py-0"></td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-0" colSpan={2}>
              免用發票
            </td>
            <td className="border border-black px-2 py-0">13</td>
            <td className="border border-black px-2 py-0"></td>
            <td className="border border-black px-2 py-0">14</td>
            <td className="border border-black px-2 py-0"></td>
            <td className="border border-black px-2 py-0">15</td>
            <td className="border border-black px-2 py-0"></td>
            <td className="border border-black px-2 py-0">11</td>
            <td className="border border-black px-2 py-0">本期(月)應實繳稅額(1-10)</td>
            <td className="border border-black px-2 py-0">111</td>
            <td className="border border-black px-2 py-0"></td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-0" colSpan={2}>
              減:退回及折讓
            </td>
            <td className="border border-black px-2 py-0">17</td>
            <td className="border border-black px-2 py-0"></td>
            <td className="border border-black px-2 py-0">18</td>
            <td className="border border-black px-2 py-0">
              {report401?.sales.breakdown.returnsAndAllowances.tax || 'N/A'}
            </td>
            <td className="border border-black px-2 py-0">19</td>
            <td className="border border-black px-2 py-0"></td>
            <td className="border border-black px-2 py-0">12</td>
            <td className="border border-black px-2 py-0">本期(月)申報留抵稅額(10-1)</td>
            <td className="border border-black px-2 py-0">112</td>
            <td className="border border-black px-2 py-0"></td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-0" colSpan={2}>
              合計
            </td>
            <td className="border border-black px-2 py-0">21①</td>
            <td className="border border-black px-2 py-0"></td>
            <td className="border border-black px-2 py-0">22②</td>
            <td className="border border-black px-2 py-0">
              {report401?.sales.breakdown.total.tax || 'N/A'}
            </td>
            <td className="border border-black px-2 py-0">23③</td>
            <td className="border border-black px-2 py-0"></td>
            <td className="border border-black px-2 py-0">13</td>
            <td className="border border-black px-2 py-0">得退稅限額合計</td>
            <td className="border border-black px-2 py-0">③×5%+⑩ 113</td>
            <td className="border border-black px-2 py-0"></td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-0" colSpan={2} rowSpan={2}>
              銷售額總計
              <br />
              ①+③
            </td>
            <td className="border border-black px-2 py-0" rowSpan={2}>
              25⑦
            </td>
            <td className="border border-black px-2 py-0" colSpan={5} rowSpan={2}>
              <div className="flex items-center">
                {report401?.sales.totalTaxableAmount || 'N/A'}元(
                <div>
                  <span>內含銷售</span>
                  <br />
                  <span>固定資產</span>
                </div>
                ㉗{report401?.sales.includeFixedAsset || 'N/A'}元)
              </div>
            </td>
            <td className="border border-black px-2 py-0">14</td>
            <td className="flex items-center text-nowrap border border-black px-2 py-0">
              本期(月)應退稅額(如
              <div>
                <span>12&gt;13</span>
                <br />
                <span>13&gt;12</span>
              </div>
              則為
              <div>
                <span>13</span>
                <br />
                <span>12</span>
              </div>
              )
            </td>
            <td className="border border-black px-2 py-0">114</td>
            <td className="border border-black px-2 py-0"></td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-0">15</td>
            <td className="border border-black px-2 py-0">本期(月)累積留抵稅額(12-14)</td>
            <td className="border border-black px-2 py-0">115</td>
            <td className="border border-black px-2 py-0"></td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-0 text-center" rowSpan={16}>
              進項
            </td>
            <td className="border-b border-l border-t border-black px-2 py-0" rowSpan={2}>
              項目
            </td>
            <td className="border-b border-r border-t border-black px-2 py-0" rowSpan={2}>
              區分
            </td>
            <td
              className="border-b border-r border-t border-black px-2 py-0 text-center"
              colSpan={6}
            >
              得扣抵進項稅額
            </td>
            <td className="border border-black px-2 py-0 text-center" rowSpan={2} colSpan={3}>
              本期(月)應退稅額 <br />
              處理方式
            </td>
            <td className="border border-black px-2 py-0 text-center" colSpan={2}>
              <div className="flex flex-nowrap items-center gap-1">
                <input type="checkbox" className="h-2 w-2" />
                <p className="text-nowrap">利用存款帳戶劃撥</p>
              </div>
            </td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-0 text-center" colSpan={3}>
              金額
            </td>
            <td className="border border-black px-2 py-0 text-center" colSpan={3}>
              稅額
            </td>
            <td className="border border-black px-2 py-0 text-center" colSpan={2}>
              <div className="flex flex-nowrap items-center gap-1">
                <input type="checkbox" className="h-2 w-2" />
                <p className="text-nowrap">領取退稅支票</p>
              </div>
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-2 py-0 text-start" rowSpan={2}>
              <div className="flex w-full justify-between">
                <div className="flex w-full justify-between">
                  <span>
                    統一發票扣抵聯 <br />
                    (包括一般稅額計算之電子計算機發票扣抵聯)
                  </span>
                </div>
              </div>
            </td>
            <td className="text-nowrap border border-black px-2 py-0 text-center">進貨及費用</td>
            <td className="border border-black px-2 py-0 text-center">28</td>
            <td className="border border-black px-2 py-0 text-center" colSpan={2}>
              {report401?.purchases.breakdown.uniformInvoice.generalPurchases.amount || 'N/A'}
            </td>
            <td className="border border-black px-2 py-0 text-center">29</td>
            <td className="border border-black px-2 py-0 text-center" colSpan={2}>
              {report401?.purchases.breakdown.uniformInvoice.generalPurchases.tax || 'N/A'}
            </td>
            <td className="border border-black px-2 py-0 text-center" rowSpan={2} colSpan={3}>
              保稅區營業人按進口報關程序銷售貨物至我國
              <br />
              境內課稅區之免開立統一發票銷售額
            </td>
            <td className="border border-black px-2 py-0 text-center" rowSpan={2} colSpan={2}>
              <div className="flex justify-between">
                <p>82</p>
                <p>元</p>
              </div>
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-2 py-0 text-center">固定資產</td>
            <td className="border border-black px-2 py-0 text-center">30</td>
            <td className="border border-black px-2 py-0 text-center" colSpan={2}>
              {report401?.purchases.breakdown.uniformInvoice.fixedAssets.amount || 'N/A'}
            </td>
            <td className="border border-black px-2 py-0 text-center">31</td>
            <td className="border border-black px-2 py-0 text-center" colSpan={2}>
              {report401?.purchases.breakdown.uniformInvoice.fixedAssets.tax || 'N/A'}
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-2 py-0 text-start" rowSpan={2}>
              三聯式收銀機發票扣抵聯 <br />
              及一般稅額計算之電子發票
            </td>
            <td className="text-nowrap border border-black px-2 py-0 text-center">進貨及費用</td>
            <td className="border border-black px-2 py-0 text-center">32</td>
            <td className="border border-black px-2 py-0 text-center" colSpan={2}>
              {report401?.purchases.breakdown.cashRegisterAndElectronic.generalPurchases.amount ||
                'N/A'}
            </td>
            <td className="border border-black px-2 py-0 text-center">33</td>
            <td className="border border-black px-2 py-0 text-center" colSpan={2}>
              {report401?.purchases.breakdown.cashRegisterAndElectronic.generalPurchases.tax ||
                'N/A'}
            </td>
            <td className="border border-black px-2 py-0 text-center" colSpan={3}>
              申報單位蓋章處(統一發票專用章)
            </td>
            <td className="border border-black px-2 py-0 text-center" colSpan={2}>
              核收機關及人員蓋章處
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-2 py-0 text-center">固定資產</td>
            <td className="border border-black px-2 py-0 text-center">34</td>
            <td className="border border-black px-2 py-0 text-center" colSpan={2}>
              {report401?.purchases.breakdown.cashRegisterAndElectronic.fixedAssets.amount || 'N/A'}
            </td>
            <td className="border border-black px-2 py-0 text-center">35</td>
            <td className="border border-black px-2 py-0 text-center" colSpan={2}>
              {report401?.purchases.breakdown.cashRegisterAndElectronic.fixedAssets.tax || 'N/A'}
            </td>
            <td className="border border-black px-2 py-0 text-left" rowSpan={9} colSpan={3}>
              <p>
                <span>附 1.統一發票明細表</span>
                <span>份</span>
              </p>
              <p>
                <span>2.進項憑證</span>
                <span>冊</span>
                <span>份</span>
              </p>
              <p>
                <span>3.海關代徵營業稅繳納證</span>
                <span>份</span>
              </p>
              <p>
                <span>4.退回(出)及折讓證明單、海關退還溢繳營業稅申報單</span>
                <span>份</span>
              </p>
              <p>
                <span>5.營業稅繳款書申報聯</span>
                <span>份</span>
              </p>
              <p>
                <span>6.零稅率銷售額清單</span>
                <span>份</span>
              </p>
              <p>
                <span>7.營業稅一次性移轉訂價調整聲明書</span>
                <span>份</span>
              </p>
              <p>
                <span>8.營業稅聲明事項表</span>
                <span>份</span>
              </p>
              <p>申報日期： 年 月 日</p>
            </td>
            <td
              className="border border-black px-2 py-0 text-left align-bottom"
              rowSpan={9}
              colSpan={2}
            >
              <p>核收日期： 年 月 日</p>
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-2 py-0 text-start" rowSpan={2}>
              載有稅額之其他憑證 <br />
              (包括二聯式收銀機發票)
            </td>
            <td className="text-nowrap border border-black px-2 py-0 text-center">進貨及費用</td>
            <td className="border border-black px-2 py-0 text-center">36</td>
            <td className="border border-black px-2 py-0 text-center" colSpan={2}>
              {report401?.purchases.breakdown.otherTaxableVouchers.generalPurchases.amount || 'N/A'}
            </td>
            <td className="border border-black px-2 py-0 text-center">37</td>
            <td className="border border-black px-2 py-0 text-center" colSpan={2}>
              {report401?.purchases.breakdown.otherTaxableVouchers.generalPurchases.tax || 'N/A'}
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-2 py-0 text-center">固定資產</td>
            <td className="border border-black px-2 py-0 text-center">38</td>
            <td className="border border-black px-2 py-0 text-center" colSpan={2}>
              {report401?.purchases.breakdown.otherTaxableVouchers.fixedAssets.amount || 'N/A'}
            </td>
            <td className="border border-black px-2 py-0 text-center">39</td>
            <td className="border border-black px-2 py-0 text-center" colSpan={2}>
              {report401?.purchases.breakdown.otherTaxableVouchers.fixedAssets.tax || 'N/A'}
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-2 py-0 text-start" rowSpan={2}>
              海關代徵營業稅繳納證扣抵聯
            </td>
            <td className="text-nowrap border border-black px-2 py-0 text-center">進貨及費用</td>
            <td className="border border-black px-2 py-0 text-center">78</td>
            <td className="border border-black px-2 py-0 text-center" colSpan={2}>
              {report401?.purchases.breakdown.customsDutyPayment.generalPurchases.amount || 'N/A'}
            </td>
            <td className="border border-black px-2 py-0 text-center">79</td>
            <td className="border border-black px-2 py-0 text-center" colSpan={2}>
              {report401?.purchases.breakdown.customsDutyPayment.generalPurchases.tax || 'N/A'}
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-2 py-0 text-center">固定資產</td>
            <td className="border border-black px-2 py-0 text-center">80</td>
            <td className="border border-black px-2 py-0 text-center" colSpan={2}></td>
            <td className="border border-black px-2 py-0 text-center">81</td>
            <td className="border border-black px-2 py-0 text-center" colSpan={2}></td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-2 py-0 text-start" rowSpan={2}>
              減 :退出、折讓及海關退還 <br />
              溢繳稅款
            </td>
            <td className="text-nowrap border border-black px-2 py-0 text-center">進貨及費用</td>
            <td className="border border-black px-2 py-0 text-center">40</td>
            <td className="border border-black px-2 py-0 text-center" colSpan={2}></td>
            <td className="border border-black px-2 py-0 text-center">41</td>
            <td className="border border-black px-2 py-0 text-center" colSpan={2}></td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-2 py-0 text-center">固定資產</td>
            <td className="border border-black px-2 py-0 text-center">80</td>
            <td className="border border-black px-2 py-0 text-center" colSpan={2}>
              {report401?.purchases.breakdown.customsDutyPayment.fixedAssets.amount || 'N/A'}
            </td>
            <td className="border border-black px-2 py-0 text-center">81</td>
            <td className="border border-black px-2 py-0 text-center" colSpan={2}>
              {report401?.purchases.breakdown.customsDutyPayment.fixedAssets.tax || 'N/A'}
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-2 py-0 text-start" rowSpan={2}>
              合計
            </td>
            <td className="text-nowrap border border-black px-2 py-0 text-center">進貨及費用</td>
            <td className="border border-black px-2 py-0 text-center">44</td>
            <td className="border border-black px-2 py-0 text-center" colSpan={2}></td>
            <td className="border border-black px-2 py-0 text-center">45⑨</td>
            <td className="border border-black px-2 py-0 text-center" colSpan={2}></td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-2 py-0 text-center">固定資產</td>
            <td className="border border-black px-2 py-0 text-center">46</td>
            <td className="border border-black px-2 py-0 text-center" colSpan={2}></td>
            <td className="border border-black px-2 py-0 text-center">47⑩</td>
            <td className="border border-black px-2 py-0 text-center" colSpan={2}></td>
          </tr>
          <tr>
            <td
              className="items-center text-nowrap border border-black px-2 py-0 text-start"
              rowSpan={2}
            >
              <p>進項總金額 (包括不得扣抵憑證及普通收據) </p>
            </td>
            <td className="text-nowrap border border-black px-2 py-0 text-center">進貨及費用</td>
            <td className="border border-black px-2 py-0 text-center">48</td>
            <td className="border border-black px-2 py-0 text-right" colSpan={5}>
              元
            </td>
            <td className="text-nowrap border border-black px-2 py-0 text-center" rowSpan={2}>
              申辦情形
            </td>
            <td className="text-nowrap border border-black px-2 py-0 text-center" rowSpan={2}>
              姓名
            </td>
            <td className="text-nowrap border border-black px-2 py-0 text-center" rowSpan={2}>
              身分證統一編號
            </td>
            <td className="text-nowrap border border-black px-2 py-0 text-center" rowSpan={2}>
              電話
            </td>
            <td className="text-nowrap border border-black px-2 py-0 text-center" rowSpan={2}>
              登錄文(字)號
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-2 py-0 text-center">固定資產</td>
            <td className="border border-black px-2 py-0 text-center">49</td>
            <td className="border border-black px-2 py-0 text-right" colSpan={5}>
              元
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-2 py-0 text-center" colSpan={2}>
              進口免稅貨物
            </td>
            <td className="text-nowrap border border-black px-2 py-0 text-center">73</td>
            <td className="text-nowrap border border-black px-2 py-0 text-end" colSpan={6}>
              元
            </td>
            <td className="text-nowrap border border-black px-2 py-0 text-center">自行申報</td>
            <td className="text-nowrap border border-black px-2 py-0 text-center"></td>
            <td className="text-nowrap border border-black px-2 py-0 text-center"></td>
            <td className="text-nowrap border border-black px-2 py-0 text-center"></td>
            <td className="text-nowrap border border-black px-2 py-0 text-center"></td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-2 py-0 text-center" colSpan={2}>
              購買國外勞務
            </td>
            <td className="text-nowrap border border-black px-2 py-0 text-center">74</td>
            <td className="text-nowrap border border-black px-2 py-0 text-end" colSpan={6}>
              元
            </td>
            <td className="text-nowrap border border-black px-2 py-0 text-center">委任申報</td>
            <td className="text-nowrap border border-black px-2 py-0 text-center"></td>
            <td className="text-nowrap border border-black px-2 py-0 text-center"></td>
            <td className="text-nowrap border border-black px-2 py-0 text-center"></td>
            <td className="text-nowrap border border-black px-2 py-0 text-center"></td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-2 py-0 text-center">說明</td>
            <td className="text-nowrap border border-black px-2 py-0 text-start" colSpan={13}>
              <p>一、 本申報書適用專營應稅及零稅率之營業人填報。</p>
              <p>
                二、
                如營業人申報當期(月)之銷售額包括有免稅、特種稅額計算銷售額者，請改用(403)申報書申報。
              </p>
              <p>
                三、
                營業人如有依財政部108年11月15日台財稅字第10804629000號令規定進行一次性移轉訂價調整申報營業稅，除跨境受控交易為進口貨物外，請另填報「營業稅一次性移轉訂價調整聲明書」並檢附相關證明文件，併
                <br />
                同會計年度最後一期營業稅申報。
              </p>
              <p>
                四、
                納稅者如有依納稅者權利保護法第7條第8項但書規定，為重要事項陳述者，請另填報「營業稅聲明事項表」並檢附相關證明文件。
              </p>
            </td>
          </tr>
        </tbody>
      </table>
      <div className="my-auto flex justify-end py-2">
        <p className="text-[8px] font-bold">紙張尺度(297 ×210)公厘 ods檔案格式</p>
      </div>
    </div>
  );

  return (
    <div className="mx-auto w-a4-height origin-top overflow-x-auto">
      {page1}
      <hr className="break-before-page" />
    </div>
  );
};

export default TaxReportBodyAll;
