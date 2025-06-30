import Skeleton from '@/components/skeleton/skeleton';
import { APIName } from '@/constants/api_connection';
import { NON_EXISTING_REPORT_ID } from '@/constants/config';
import { useUserCtx } from '@/contexts/user_context';
import { TaxReport401Content } from '@/interfaces/report';
import APIHandler from '@/lib/utils/api_handler';
import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'next-i18next';

interface ITaxReportBodyAllProps {
  reportId: string;
}

const TaxReportBodyAll = ({ reportId }: ITaxReportBodyAllProps) => {
  const { t } = useTranslation(['reports']);
  const { isAuthLoading, connectedAccountBook } = useUserCtx();
  // Info: (20240814 - Anna) 使用 useState 定義 report401 變量的狀態，並將其類型設為 TaxReport401 | null

  // const hasCompanyId = isAuthLoading === false && !!connectedAccountBook?.id; // Deprecated: (20241129 - Liz)

  // Deprecated: (20241129 - Liz)
  // const {
  //   data: reportFinancial,
  //   // Info: (20240816 - Anna)
  //   // code: getReportFinancialCode,
  //   // success: getReportFinancialSuccess,
  //   isLoading: getReportFinancialIsLoading,
  // } = APIHandler<TaxReport401Content>(
  //   APIName.REPORT_GET_BY_ID,
  //   {
  //     params: {
  //       companyId: connectedAccountBook?.id,
  //       reportId: reportId ?? NON_EXISTING_REPORT_ID,
  //     },
  //   },
  //   hasCompanyId
  // );

  const [financialReport, setFinancialReport] = useState<TaxReport401Content | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { trigger: getFinancialReportAPI } = APIHandler<TaxReport401Content>(
    APIName.REPORT_GET_BY_ID
  );

  useEffect(() => {
    if (isAuthLoading || !connectedAccountBook) return;
    if (isLoading) return;
    setIsLoading(true);

    const getFinancialReport = async () => {
      try {
        const { data: report, success: getFRSuccess } = await getFinancialReportAPI({
          params: {
            companyId: connectedAccountBook.id,
            reportId: reportId ?? NON_EXISTING_REPORT_ID,
          },
        });

        if (!getFRSuccess) {
          return;
        }

        setFinancialReport(report);
      } catch (error) {
        // console.log('error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getFinancialReport();
  }, [isAuthLoading, reportId, connectedAccountBook]);

  // Info: (20240730 - Anna) 格式化數字為千分位
  const formatNumber = (num: number) => num.toLocaleString();

  // Info: (20240816 - Anna) 轉換和格式化日期
  const createdAt = financialReport?.createdAt ? new Date(financialReport.createdAt * 1000) : null;
  const updatedAt = financialReport?.updatedAt ? new Date(financialReport.updatedAt * 1000) : null;

  const formatToTaiwanDate = (timestamp: number | null) => {
    // Info: (20240816 - Anna) 如果 timestamp 為 null，返回 'N/A'
    if (timestamp === null) return 'N/A';
    const date = new Date(timestamp);
    const taiwanYear = date.getFullYear() - 1911;
    const yearTranslation = t('reports:COMMON.Y');
    const monthTranslation = t('reports:COMMON.M');
    const dayTranslation = t('reports:COMMON.DAY');
    return `${taiwanYear}${yearTranslation} ${format(date, `MM'${monthTranslation}'dd'${dayTranslation}'`)}`;
  };

  const createdTaiwanDate = createdAt ? formatToTaiwanDate(createdAt.getTime()) : 'N/A';
  const updatedTaiwanDate = updatedAt ? formatToTaiwanDate(updatedAt.getTime()) : 'N/A';

  const page1 = isLoading ? (
    <div className="mt-5">
      <Skeleton width={80} height={20} />
    </div>
  ) : (
    <div id="1" className="relative h-a4-width overflow-y-hidden">
      <header className="flex w-full justify-between">
        <table className="border-collapse border border-black text-8px">
          <tbody>
            <tr>
              <td className="border border-black px-1 py-0">
                {/* Info: (20240814 - Anna) 統一編號 */}
                {t('reports:TAX_REPORT.BUSINESS_ID_NUMBER')}
              </td>
              <td className="border border-black px-1 py-0">
                {financialReport?.content.basicInfo.uniformNumber ?? 'N/A'}
              </td>
            </tr>
            <tr>
              <td className="border border-black px-1 py-0">
                {/* Info: (20240814 - Anna) 營業人名稱 */}
                {t('reports:TAX_REPORT.NAME_OF_BUSINESS_ENTITY')}
              </td>
              <td className="border border-black px-1 py-0">
                {financialReport?.content.basicInfo.businessName ?? 'N/A'}
              </td>
            </tr>
            <tr>
              <td className="border border-black px-1 py-0">
                {/* Info: (20240814 - Anna) 稅籍編號 */}
                {t('reports:TAX_REPORT.TAX_SERIAL_NUMBER')}
              </td>
              <td className="border border-black px-1 py-0">
                {financialReport?.content.basicInfo.taxSerialNumber ?? 'N/A'}
              </td>
            </tr>
          </tbody>
        </table>
        <div className="flex flex-col text-center">
          <h1 className="text-sm font-bold">
            <span>
              {/* Info: (20240814 - Anna) 財政部 */}
              {t('reports:TAX_REPORT.MINISTRY_OF_FINANCE')}
            </span>
            <span>
              {''}
              {/* Info: (20240814 - Anna) 北區 */}
              {t('reports:TAX_REPORT.NORTH_DISTRICT')}
              {''}
            </span>
            <span>
              {/* Info: (20240814 - Anna) 國稅局營業人銷售額與稅額申報書(401) */}
              {t('reports:TAX_REPORT.IRS')}
              {t('reports:PLUGIN.REPORT_401')}
            </span>
          </h1>
          <p className="text-xs">
            ({/* Info: (20240814 - Anna) 一般稅額計算-專營應稅營業人使用 */}
            {t('reports:TAX_REPORT.GENERAL_TAX_COMPUTATION')})
          </p>
          <div className="flex justify-between text-xs">
            <p className="flex-1 text-center">
              {/* Info: (20240814 - Anna) 所屬年月份: */}
              {t('reports:TAX_REPORT.CURRENT_PERIOD')}
              {financialReport?.content.basicInfo.currentYear ?? 'N/A'}
              {/* Info: (20240814 - Anna) 年 */}
              {t('reports:COMMON.Y')}
              {financialReport?.content.basicInfo.startMonth ?? 'N/A'}-
              {financialReport?.content.basicInfo.endMonth ?? 'N/A'}
              {/* Info: (20240814 - Anna) 月 */}
              {t('reports:COMMON.M')}
            </p>
            <p className="text-right">
              {/* Info: (20240814 - Anna) 金額單位:新臺幣元 */}
              {t('reports:TAX_REPORT.CURRENCY_UNIT_NTD')}
            </p>
          </div>
        </div>
        <table className="border-collapse border border-black text-8px">
          <tbody>
            <tr>
              <td
                className="text-nowrap border-l border-r border-t border-black px-1 py-0"
                rowSpan={3}
              >
                {/* Info: (20240814 - Anna) 註記欄 */}
                {t('reports:TAX_REPORT.MARK')}
              </td>
              <td className="border-b border-l border-t border-black px-1 py-0" colSpan={2}>
                {/* Info: (20240814 - Anna) 核准按月申報 */}
                {t('reports:TAX_REPORT.APPROVED_MONTHLY_FILING')}
              </td>
              <td className="w-1/8 border border-black px-1 py-0"></td>
            </tr>
            <tr>
              <td
                className="text-nowrap border-l border-r border-t border-black px-1 py-0"
                rowSpan={2}
              >
                {/* Info: (20240814 - Anna) 核准合併 */}
                {t('reports:TAX_REPORT.APPROVED')}
                <br />
                {/* Info: (20240814 - Anna) 總繳單位 */}
                {t('reports:TAX_REPORT.CONSOLIDATED_FILING')}
              </td>
              <td className="text-nowrap border border-black px-1 py-0">
                {/* Info: (20240814 - Anna) 總機構彙總申報 */}
                {t('reports:TAX_REPORT.CONSOLIDATED_FILING_OF_HEAD_OFFICE')}
              </td>
              <td className="w-1/8 border border-black px-1 py-0"></td>
            </tr>
            <tr>
              <td className="text-nowrap border border-black px-1 py-0">
                {/* Info: (20240814 - Anna) 各單位分別申報 */}
                {t('reports:TAX_REPORT.INDIVIDUAL_FILING')}
              </td>
              <td className="w-1/8 border border-black px-1 py-0">V</td>
            </tr>
          </tbody>
        </table>
      </header>
      <table className="w-full border-collapse border border-black text-8px">
        <tbody>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0">
              {/* Info: (20240814 - Anna) 負責人姓名 */}
              {t('reports:TAX_REPORT.NAME_OF_RESPONSIBLE_PERSON')}
            </td>
            <td className="border border-black px-1 py-0">
              {financialReport?.content.basicInfo.personInCharge ?? 'N/A'}
            </td>
            <td className="text-nowrap border border-black px-1 py-0">
              {/* Info: (20240814 - Anna) 營業地址 */}
              {t('reports:TAX_REPORT.BUSINESS_ADDRESS')}
            </td>
            <td className="border border-black px-1 py-0" colSpan={9}>
              {financialReport?.content.basicInfo.businessAddress ?? 'N/A'}
            </td>
            <td className="text-nowrap border border-black px-1 py-0">
              {/* Info: (20240814 - Anna) 使用發票份數 */}
              {t('reports:TAX_REPORT.NUMBER_OF_USED_INVOICES')}
            </td>
            <td className="border border-black px-1 py-0 text-right">
              {financialReport?.content.basicInfo.usedInvoiceCount !== undefined &&
              financialReport?.content.basicInfo.usedInvoiceCount !== null
                ? formatNumber(financialReport.content.basicInfo.usedInvoiceCount)
                : 'N/A'}
              {/* Info: (20240814 - Anna) 份 */}
              {t('reports:TAX_REPORT.COPIES')}
            </td>
          </tr>
          <tr>
            <td className="border border-black px-1 py-0 text-center" rowSpan={10}>
              {/* Info: (20240814 - Anna) 銷項 */}
              {t('reports:TAX_REPORT.OUTPUT')}
            </td>
            <td className="border-b border-l border-t border-black px-1 py-0" rowSpan={2}>
              {/* Info: (20240814 - Anna) 項目 */}
              {t('reports:TAX_REPORT.ITEMS')}
            </td>
            <td className="border-b border-r border-t border-black px-1 py-0" rowSpan={2}>
              {/* Info: (20240814 - Anna) 區分 */}
              {t('reports:TAX_REPORT.DISTINGUISHMENT')}
            </td>
            <td className="border border-black px-1 py-0 text-center" colSpan={4}>
              {/* Info: (20240814 - Anna) 應稅 */}
              {t('reports:TAX_REPORT.TAXABLE')}
            </td>
            <td className="border border-black px-1 py-0 text-center" rowSpan={2} colSpan={2}>
              {/* Info: (20240814 - Anna) 零稅率銷售額 */}
              {t('reports:TAX_REPORT.ZERO_TAX_RATE_SALES_AMOUNT')}
            </td>
            <td className="border border-black px-1 py-0 text-center" rowSpan={10}>
              {/* Info: (20240814 - Anna) 稅額 */}
              {t('reports:TAX_REPORT.TAX')}
              <br />
              {/* Info: (20240814 - Anna) 計算 */}
              {t('reports:TAX_REPORT.CALCULATION')}
            </td>
            <td className="border border-black px-1 py-0">
              {/* Info: (20240814 - Anna) 代號 */}
              {t('reports:TAX_REPORT.CODE_NUMBER')}
            </td>
            <td className="border border-black px-1 py-0 text-center" colSpan={2}>
              {/* Info: (20240814 - Anna) 項目 */}
              {t('reports:TAX_REPORT.ITEMS')}
            </td>
            <td className="border border-black px-1 py-0">
              {/* Info: (20240814 - Anna) 稅額 */}
              {t('reports:TAX_REPORT.TAX')}
            </td>
          </tr>
          <tr>
            <td className="border border-black px-1 py-0 text-center" colSpan={2}>
              {/* Info: (20240814 - Anna) 銷售額 */}
              {t('reports:TAX_REPORT.SALES_AMOUNT')}
            </td>
            <td className="border border-black px-1 py-0 text-center" colSpan={2}>
              {/* Info: (20240814 - Anna) 稅額 */}
              {t('reports:TAX_REPORT.TAX')}
            </td>
            <td className="border border-black px-1 py-0">1</td>
            <td className="border border-black px-1 py-0">
              {/* Info: (20240814 - Anna) 本期(月)銷項稅額合計 */}
              {t('reports:TAX_REPORT.TOTAL_OUTPUT_TAX')}
            </td>
            <td className="w-8% border border-black px-1 py-0">② 101</td>
            <td className="border border-black px-1 py-0 text-right">
              {financialReport?.content.taxCalculation.outputTax !== undefined &&
              financialReport?.content.taxCalculation.outputTax !== null
                ? formatNumber(financialReport?.content.taxCalculation.outputTax)
                : 'N/A'}
            </td>
          </tr>
          <tr>
            <td className="border border-black px-1 py-0" colSpan={2}>
              {/* Info: (20240814 - Anna) 三聯式發票、電子計算機發票 */}
              {t('reports:TAX_REPORT.TRIPLICATE_UNIFORM_INVOICE')}
            </td>
            <td className="border border-black px-1 py-0">1</td>
            <td className="w-8% border border-black px-1 py-0 text-right">
              {financialReport?.content.sales.breakdown.triplicateAndElectronic.sales !==
                undefined &&
              financialReport?.content.sales.breakdown.triplicateAndElectronic.sales !== null
                ? formatNumber(
                    financialReport?.content.sales.breakdown.triplicateAndElectronic.sales
                  )
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0">2</td>
            <td className="w-8% border border-black px-1 py-0 text-right">
              {financialReport?.content.sales.breakdown.triplicateAndElectronic.tax !== undefined &&
              financialReport?.content.sales.breakdown.triplicateAndElectronic.tax !== null
                ? formatNumber(financialReport?.content.sales.breakdown.triplicateAndElectronic.tax)
                : 'N/A'}
            </td>
            <td
              className="w-8% justify-between border border-black px-1 py-0 text-right"
              colSpan={2}
            >
              3
              {financialReport?.content.sales.breakdown.triplicateAndElectronic.zeroTax !==
                undefined &&
              financialReport?.content.sales.breakdown.triplicateAndElectronic.zeroTax !== null
                ? formatNumber(
                    financialReport?.content.sales.breakdown.triplicateAndElectronic.zeroTax
                  )
                : 'N/A'}{' '}
              ({/* Info: (20240814 - Anna) 非經海關出口應附證明文件者 */})
              {t('reports:TAX_REPORT.EXPORT_NOT_THROUGH_CUSTOMS_EVIDENCE_REQUIRED')}
            </td>
            <td className="border border-black px-1 py-0">7</td>
            <td className="border border-black px-1 py-0">
              {/* Info: (20240814 - Anna) 得扣抵進項稅額合計 */}
              {t('reports:TAX_REPORT.TOTAL_DEDUCTIBLE_INPUT_TAX')}
            </td>
            <td className="border border-black px-1 py-0">⑨+⑩ 107</td>
            <td className="border border-black px-1 py-0 text-right">
              {financialReport?.content.taxCalculation.deductibleInputTax !== undefined &&
              financialReport?.content.taxCalculation.deductibleInputTax !== null
                ? formatNumber(financialReport?.content.taxCalculation.deductibleInputTax)
                : 'N/A'}
            </td>
          </tr>
          <tr>
            <td className="border border-black px-1 py-0" colSpan={2}>
              {/* Info: (20240814 - Anna) 收銀機發票(三聯式)及電子發票 */}
              {t('reports:TAX_REPORT.CASH_REGISTER_UNIFORM_INVOICE')}
            </td>
            <td className="border border-black px-1 py-0">5</td>
            <td className="border border-black px-1 py-0 text-right">
              {financialReport?.content.sales.breakdown.cashRegisterTriplicate.sales !==
                undefined &&
              financialReport?.content.sales.breakdown.cashRegisterTriplicate.sales !== null
                ? formatNumber(
                    financialReport?.content.sales.breakdown.cashRegisterTriplicate.sales
                  )
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0">6</td>
            <td className="border border-black px-1 py-0 text-right">
              {financialReport?.content.sales.breakdown.cashRegisterTriplicate.tax !== undefined &&
              financialReport?.content.sales.breakdown.cashRegisterTriplicate.tax !== null
                ? formatNumber(financialReport?.content.sales.breakdown.cashRegisterTriplicate.tax)
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0">7</td>
            <td className="border border-black px-1 py-0 text-right">
              {financialReport?.content.sales.breakdown.cashRegisterTriplicate.zeroTax !==
                undefined &&
              financialReport?.content.sales.breakdown.cashRegisterTriplicate.zeroTax !== null
                ? formatNumber(
                    financialReport?.content.sales.breakdown.cashRegisterTriplicate.zeroTax
                  )
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0">8</td>
            <td className="border border-black px-1 py-0">
              {/* Info: (20240814 - Anna) 上期(月)累積留抵稅額 */}
              {t('reports:TAX_REPORT.BUSINESS_TAX_PAYABLE')}
            </td>
            <td className="border border-black px-1 py-0">108</td>
            <td className="border border-black px-1 py-0 text-right">
              {financialReport?.content.taxCalculation.previousPeriodOffset !== undefined &&
              financialReport?.content.taxCalculation.previousPeriodOffset !== null
                ? formatNumber(financialReport?.content.taxCalculation.previousPeriodOffset)
                : 'N/A'}
            </td>
          </tr>
          <tr>
            <td className="border border-black px-1 py-0" colSpan={2}>
              {/* Info: (20240814 - Anna) 二聯式發票、收銀機發票(二聯式) */}
              {t('reports:TAX_REPORT.DUPLICATE_UNIFORM_INVOICE')}
            </td>
            <td className="border border-black px-1 py-0">9</td>
            <td className="border border-black px-1 py-0 text-right">
              {financialReport?.content.sales.breakdown.duplicateAndCashRegister.sales !==
                undefined &&
              financialReport?.content.sales.breakdown.duplicateAndCashRegister.sales !== null
                ? formatNumber(
                    financialReport?.content.sales.breakdown.duplicateAndCashRegister.sales
                  )
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0">10</td>
            <td className="border border-black px-1 py-0 text-right">
              {financialReport?.content.sales.breakdown.duplicateAndCashRegister.tax !==
                undefined &&
              financialReport?.content.sales.breakdown.duplicateAndCashRegister.tax !== null
                ? formatNumber(
                    financialReport?.content.sales.breakdown.duplicateAndCashRegister.tax
                  )
                : 'N/A'}
            </td>
            <td className="justify-between border border-black px-1 py-0" colSpan={2}>
              11{' '}
              {financialReport?.content.sales.breakdown.duplicateAndCashRegister.zeroTax !==
                undefined &&
              financialReport?.content.sales.breakdown.duplicateAndCashRegister.zeroTax !== null
                ? formatNumber(
                    financialReport?.content.sales.breakdown.duplicateAndCashRegister.zeroTax
                  )
                : 'N/A'}{' '}
              ({/* Info: (20240814 - Anna) 經海關出口免附證明文件者 */})
              {t('reports:TAX_REPORT.EXPORT_THROUGH_CUSTOMS')}
            </td>
            <td className="border border-black px-1 py-0">10</td>
            <td className="border border-black px-1 py-0">
              {/* Info: (20240814 - Anna) 小計 */}
              {t('reports:TAX_REPORT.SUBTOTAL')}
              (7+8)
            </td>
            <td className="border border-black px-1 py-0">110</td>
            <td className="border border-black px-1 py-0 text-right">
              {financialReport?.content.taxCalculation.subtotal !== undefined &&
              financialReport?.content.taxCalculation.subtotal !== null
                ? formatNumber(financialReport?.content.taxCalculation.subtotal)
                : 'N/A'}
            </td>
          </tr>
          <tr>
            <td className="border border-black px-1 py-0" colSpan={2}>
              {/* Info: (20240814 - Anna) 免用發票 */}
              {t('reports:TAX_REPORT.EXEMPTION_OF_UNIFORM_INVOICE')}
            </td>
            <td className="border border-black px-1 py-0">13</td>
            <td className="border border-black px-1 py-0 text-right">
              {financialReport?.content.sales.breakdown.invoiceExempt.sales !== undefined &&
              financialReport?.content.sales.breakdown.invoiceExempt.sales !== null
                ? formatNumber(financialReport?.content.sales.breakdown.invoiceExempt.sales)
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0">14</td>
            <td className="border border-black px-1 py-0 text-right">
              {financialReport?.content.sales.breakdown.invoiceExempt.tax !== undefined &&
              financialReport?.content.sales.breakdown.invoiceExempt.tax !== null
                ? formatNumber(financialReport?.content.sales.breakdown.invoiceExempt.tax)
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0">15</td>
            <td className="border border-black px-1 py-0 text-right">
              {financialReport?.content.sales.breakdown.invoiceExempt.zeroTax !== undefined &&
              financialReport?.content.sales.breakdown.invoiceExempt.zeroTax !== null
                ? formatNumber(financialReport?.content.sales.breakdown.invoiceExempt.zeroTax)
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0">11</td>
            <td className="border border-black px-1 py-0">
              {/* Info: (20240814 - Anna) 本期(月)應實繳稅額 */}
              {t('reports:TAX_REPORT.TAX_PAYABLE_FOR_CURRENT_PERIOD')}
              (1-10)
            </td>
            <td className="border border-black px-1 py-0">111</td>
            <td className="border border-black px-1 py-0 text-right">
              {financialReport?.content.taxCalculation.currentPeriodTaxPayable !== undefined &&
              financialReport?.content.taxCalculation.currentPeriodTaxPayable !== null
                ? formatNumber(financialReport?.content.taxCalculation.currentPeriodTaxPayable)
                : 'N/A'}
            </td>
          </tr>
          <tr>
            <td className="border border-black px-1 py-0" colSpan={2}>
              {/* Info: (20240814 - Anna) 減:退回及折讓 */}
              {t('reports:TAX_REPORT.LESS_SALES_RETURN_AND_ALLOWANCE')}
            </td>
            <td className="border border-black px-1 py-0">17</td>
            <td className="border border-black px-1 py-0 text-right">
              {financialReport?.content.sales.breakdown.returnsAndAllowances.sales !== undefined &&
              financialReport?.content.sales.breakdown.returnsAndAllowances.sales !== null
                ? formatNumber(financialReport?.content.sales.breakdown.returnsAndAllowances.sales)
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0">18</td>
            <td className="border border-black px-1 py-0 text-right">
              {financialReport?.content.sales.breakdown.returnsAndAllowances.tax !== undefined &&
              financialReport?.content.sales.breakdown.returnsAndAllowances.tax !== null
                ? formatNumber(financialReport?.content.sales.breakdown.returnsAndAllowances.tax)
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0">19</td>
            <td className="border border-black px-1 py-0 text-right">
              {financialReport?.content.sales.breakdown.returnsAndAllowances.zeroTax !==
                undefined &&
              financialReport?.content.sales.breakdown.returnsAndAllowances.zeroTax !== null
                ? formatNumber(
                    financialReport?.content.sales.breakdown.returnsAndAllowances.zeroTax
                  )
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0">12</td>
            <td className="border border-black px-1 py-0">
              {/* Info: (20240814 - Anna) 本期(月)申報留抵稅額 */}
              {t('reports:TAX_REPORT.FILING_OFFSET_AGAINST')}
              (10-1)
            </td>
            <td className="border border-black px-1 py-0">112</td>
            <td className="border border-black px-1 py-0 text-right">
              {financialReport?.content.taxCalculation.currentPeriodFilingOffset !== undefined &&
              financialReport?.content.taxCalculation.currentPeriodFilingOffset !== null
                ? formatNumber(financialReport?.content.taxCalculation.currentPeriodFilingOffset)
                : 'N/A'}
            </td>
          </tr>
          <tr>
            <td className="border border-black px-1 py-0" colSpan={2}>
              {/* Info: (20240814 - Anna) 合計 */}
              {t('reports:TAX_REPORT.TOTAL')}
            </td>
            <td className="border border-black px-1 py-0">21①</td>
            <td className="border border-black px-1 py-0 text-right">
              {financialReport?.content.sales.breakdown.total.sales !== undefined &&
              financialReport?.content.sales.breakdown.total.sales !== null
                ? formatNumber(financialReport?.content.sales.breakdown.total.sales)
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0">22②</td>
            <td className="border border-black px-1 py-0 text-right">
              {financialReport?.content.sales.breakdown.total.tax !== undefined &&
              financialReport?.content.sales.breakdown.total.tax !== null
                ? formatNumber(financialReport?.content.sales.breakdown.total.tax)
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0">23③</td>
            <td className="border border-black px-1 py-0 text-right">
              {financialReport?.content.sales.breakdown.total.zeroTax !== undefined &&
              financialReport?.content.sales.breakdown.total.zeroTax !== null
                ? formatNumber(financialReport?.content.sales.breakdown.total.zeroTax)
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0">13</td>
            <td className="border border-black px-1 py-0">
              {/* Info: (20240814 - Anna) 得退稅限額合計 */}
              {t('reports:TAX_REPORT.CEILING_OF_REFUND')}
            </td>
            <td className="border border-black px-1 py-0">③×5%+⑩ 113</td>
            <td className="border border-black px-1 py-0 text-right">
              {financialReport?.content.taxCalculation.refundCeiling !== undefined &&
              financialReport?.content.taxCalculation.refundCeiling !== null
                ? formatNumber(financialReport?.content.taxCalculation.refundCeiling)
                : 'N/A'}
            </td>
          </tr>
          <tr>
            <td className="border border-black px-1 py-0" colSpan={2} rowSpan={2}>
              {/* Info: (20240814 - Anna) 銷售額總計 */}
              {t('reports:TAX_REPORT.TOTAL_SALES_AMOUNT')}
              <br />
              ①+③
            </td>
            <td className="border border-black px-1 py-0" rowSpan={2}>
              25⑦
            </td>
            <td className="border border-black px-1 py-0 text-center" colSpan={5} rowSpan={2}>
              <div className="flex items-center">
                {financialReport?.content.sales.totalTaxableAmount !== undefined &&
                financialReport?.content.sales.totalTaxableAmount !== null
                  ? formatNumber(financialReport?.content.sales.totalTaxableAmount)
                  : 'N/A'}
                {/* Info: (20240814 - Anna) 元 */}
                {t('reports:TAX_REPORT.NTD')}(
                <div>
                  <span>
                    {/* Info: (20240814 - Anna) 內含銷售 */}
                    {t('reports:TAX_REPORT.INCLUDING_SALES')}
                  </span>
                  <br />
                  <span>
                    {/* Info: (20240814 - Anna) 固定資產 */}
                    {t('reports:TAX_REPORT.OF_FIXED_ASSETS')}
                  </span>
                </div>
                ㉗
                {financialReport?.content.sales.includeFixedAsset !== undefined &&
                financialReport?.content.sales.includeFixedAsset !== null
                  ? formatNumber(financialReport?.content.sales.includeFixedAsset)
                  : 'N/A'}
                {/* Info: (20240814 - Anna) 元 */}
                {t('reports:TAX_REPORT.NTD')})
              </div>
            </td>
            <td className="border border-black px-1 py-0">14</td>
            <td className="flex items-center text-nowrap border border-black px-1 py-0">
              {/* Info: (20240814 - Anna) 本期(月)應退稅額 */}
              {t('reports:TAX_REPORT.REFUNDABLE_TAX')}({/* 如 */}
              {t('reports:TAX_REPORT.IF')}
              <div>
                <span>12&gt;13</span>
                <br />
                <span>13&gt;12</span>
              </div>
              {/* Info: (20240814 - Anna) 則為 */}
              {t('reports:TAX_REPORT.THEN')}
              <div>
                <span>13</span>
                <br />
                <span>12</span>
              </div>
              )
            </td>
            <td className="border border-black px-1 py-0">114</td>
            <td className="border border-black px-1 py-0 text-right">
              {financialReport?.content.taxCalculation.currentPeriodRefundableTax !== undefined &&
              financialReport?.content.taxCalculation.currentPeriodRefundableTax !== null
                ? formatNumber(financialReport?.content.taxCalculation.currentPeriodRefundableTax)
                : 'N/A'}
            </td>
          </tr>
          <tr>
            <td className="border border-black px-1 py-0">15</td>
            <td className="border border-black px-1 py-0">
              {/* Info: (20240814 - Anna) 本期(月)累積留抵稅額 */}
              {t('reports:TAX_REPORT.ACCUMULATED_OFFSET_AGAINST')}
              (12-14)
            </td>
            <td className="border border-black px-1 py-0">115</td>
            <td className="border border-black px-1 py-0 text-right">
              {financialReport?.content.taxCalculation.currentPeriodAccumulatedOffset !==
                undefined &&
              financialReport?.content.taxCalculation.currentPeriodAccumulatedOffset !== null
                ? formatNumber(
                    financialReport?.content.taxCalculation.currentPeriodAccumulatedOffset
                  )
                : 'N/A'}
            </td>
          </tr>
          <tr>
            <td className="border border-black px-1 py-0 text-center" rowSpan={16}>
              {/* Info: (20240814 - Anna) 進項 */}
              {t('reports:TAX_REPORT.INPUT')}
            </td>
            <td className="border-b border-l border-t border-black px-1 py-0" rowSpan={2}>
              {/* Info: (20240814 - Anna) 項目 */}
              {t('reports:TAX_REPORT.ITEMS')}
            </td>
            <td className="border-b border-r border-t border-black px-1 py-0" rowSpan={2}>
              {/* Info: (20240814 - Anna) 區分 */}
              {t('reports:TAX_REPORT.DISTINGUISHMENT')}
            </td>
            <td
              className="border-b border-r border-t border-black px-1 py-0 text-center"
              colSpan={6}
            >
              {/* Info: (20240814 - Anna) 得扣抵進項稅額 */}
              {t('reports:TAX_REPORT.DEDUCTIBLE_INPUT_TAX')}
            </td>
            <td className="border border-black px-1 py-0 text-center" rowSpan={2} colSpan={3}>
              {/* Info: (20240814 - Anna) 本期(月)應退稅額處理方式 */}
              {t('reports:TAX_REPORT.WAY_TO_RECEIVE_REFUND')}
            </td>
            <td className="border border-black px-1 py-0 text-center" colSpan={2}>
              <div className="flex flex-nowrap items-center gap-1">
                <input type="checkbox" className="h-2 w-2" />
                <p className="text-nowrap">
                  {/* Info: (20240814 - Anna) 利用存款帳戶劃撥 */}
                  {t('reports:TAX_REPORT.REMITTANCE_TRANSFER')}
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td className="border border-black px-1 py-0 text-center" colSpan={3}>
              {/* Info: (20240814 - Anna) 金額 */}
              {t('reports:TAX_REPORT.AMOUNT')}
            </td>
            <td className="border border-black px-1 py-0 text-center" colSpan={3}>
              {/* Info: (20240814 - Anna) 稅額 */}
              {t('reports:TAX_REPORT.TAX')}
            </td>
            <td className="border border-black px-1 py-0 text-center" colSpan={2}>
              <div className="flex flex-nowrap items-center gap-1">
                <input type="checkbox" className="h-2 w-2" />
                <p className="text-nowrap">
                  {/* Info: (20240814 - Anna) 領取退稅支票 */}
                  {t('reports:TAX_REPORT.TAX_REFUND_CHECK')}
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0 text-start" rowSpan={2}>
              <div className="flex w-full justify-between">
                <div className="flex w-full justify-between">
                  <span>
                    {/* Info: (20240814 - Anna) 統一發票扣抵聯 */}
                    {t('reports:TAX_REPORT.DEDUCTION_COPY_OF_UNIFORM_INVOICE')}
                    <br />({/* Info: (20240814 - Anna) 包括一般稅額計算之電子計算機發票扣抵聯 */})
                    {t('reports:TAX_REPORT.INCLUDING_COMPUTER_UNIFORM_INVOICE')}
                  </span>
                </div>
              </div>
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* Info: (20240814 - Anna) 進貨及費用 */}
              {t('reports:TAX_REPORT.PURCHASE_AND_EXPENDITURES')}
            </td>
            <td className="border border-black px-1 py-0 text-center">28</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              {/* {financialReport?.content.purchases.breakdown.uniformInvoice.generalPurchases
                .amount ?? 'N/A'} */}
              {financialReport?.content.purchases.breakdown.uniformInvoice.generalPurchases
                .amount !== undefined &&
              financialReport?.content.purchases.breakdown.uniformInvoice.generalPurchases
                .amount !== null
                ? formatNumber(
                    financialReport?.content.purchases.breakdown.uniformInvoice.generalPurchases
                      .amount
                  )
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0 text-center">29</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              {/* {financialReport?.content.purchases.breakdown.uniformInvoice.generalPurchases.tax ??
                'N/A'} */}
              {financialReport?.content.purchases.breakdown.uniformInvoice.generalPurchases.tax !==
                undefined &&
              financialReport?.content.purchases.breakdown.uniformInvoice.generalPurchases.tax !==
                null
                ? formatNumber(
                    financialReport?.content.purchases.breakdown.uniformInvoice.generalPurchases.tax
                  )
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0 text-center" rowSpan={2} colSpan={3}>
              {/* Info: (20240814 - Anna) 保稅區營業人按進口報關程序銷售貨物至我國 */}
              {t('reports:TAX_REPORT.SOLD_BY_A_BONDED_ZONE')}
              <br />
              {/* Info: (20240814 - Anna) 境內課稅區之免開立統一發票銷售額 */}
              {t('reports:TAX_REPORT.TO_A_TAXABLE_ZONE')}
            </td>
            <td className="border border-black px-1 py-0 text-center" rowSpan={2} colSpan={2}>
              <div className="flex justify-between">
                <p>82</p>
                <p>
                  {financialReport?.content.bondedAreaSalesToTaxArea !== undefined &&
                  financialReport?.content.bondedAreaSalesToTaxArea !== null
                    ? formatNumber(financialReport?.content.bondedAreaSalesToTaxArea)
                    : 'N/A'}
                  {/* Info: (20240814 - Anna) 元 */}
                  {t('reports:TAX_REPORT.NTD')}
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* Info: (20240814 - Anna) 固定資產 */}
              {t('reports:TAX_REPORT.FIXED_ASSETS')}
            </td>
            <td className="border border-black px-1 py-0 text-center">30</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              {/* {financialReport?.content.purchases.breakdown.uniformInvoice.fixedAssets.amount ??
                'N/A'} */}
              {financialReport?.content.purchases.breakdown.uniformInvoice.fixedAssets.amount !==
                undefined &&
              financialReport?.content.purchases.breakdown.uniformInvoice.fixedAssets.amount !==
                null
                ? formatNumber(
                    financialReport?.content.purchases.breakdown.uniformInvoice.fixedAssets.amount
                  )
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0 text-center">31</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              {financialReport?.content.purchases.breakdown.uniformInvoice.fixedAssets.tax !==
                undefined &&
              financialReport?.content.purchases.breakdown.uniformInvoice.fixedAssets.tax !== null
                ? formatNumber(
                    financialReport?.content.purchases.breakdown.uniformInvoice.fixedAssets.tax
                  )
                : 'N/A'}
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0 text-start" rowSpan={2}>
              {/* Info: (20240814 - Anna) 三聯式收銀機發票扣抵聯 */}
              {t('reports:TAX_REPORT.DEDUCTION_COPY_OF_CASH_REGISTER_UNIFORM_INVOICE')}
              <br />
              {/* Info: (20240814 - Anna) 及一般稅額計算之電子發票 */}
              {t('reports:TAX_REPORT.ELECTRONIC_INVOICE')}
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* Info: (20240814 - Anna) 進貨及費用 */}
              {t('reports:TAX_REPORT.PURCHASE_AND_EXPENDITURES')}
            </td>
            <td className="border border-black px-1 py-0 text-center">32</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              {financialReport?.content.purchases.breakdown.cashRegisterAndElectronic
                .generalPurchases.amount !== undefined &&
              financialReport?.content.purchases.breakdown.cashRegisterAndElectronic
                .generalPurchases.amount !== null
                ? formatNumber(
                    financialReport?.content.purchases.breakdown.cashRegisterAndElectronic
                      .generalPurchases.amount
                  )
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0 text-center">33</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              {financialReport?.content.purchases.breakdown.cashRegisterAndElectronic
                .generalPurchases.tax !== undefined &&
              financialReport?.content.purchases.breakdown.cashRegisterAndElectronic
                .generalPurchases.tax !== null
                ? formatNumber(
                    financialReport?.content.purchases.breakdown.cashRegisterAndElectronic
                      .generalPurchases.tax
                  )
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0 text-center" colSpan={3}>
              {/* Info: (20240814 - Anna) 申報單位蓋章處(統一發票專用章) */}
              {t('reports:TAX_REPORT.UNIQUE_UNIFORM_INVOICE_CHOP')}
            </td>
            <td className="border border-black px-1 py-0 text-center" colSpan={2}>
              {/* Info: (20240814 - Anna) 核收機關及人員蓋章處 */}
              {t('reports:TAX_REPORT.STAMP_OF_TAX_AUTHORITY')}
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* Info: (20240814 - Anna) 固定資產 */}
              {t('reports:TAX_REPORT.FIXED_ASSETS')}
            </td>
            <td className="border border-black px-1 py-0 text-center">34</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              {financialReport?.content.purchases.breakdown.cashRegisterAndElectronic.fixedAssets
                .amount !== undefined &&
              financialReport?.content.purchases.breakdown.cashRegisterAndElectronic.fixedAssets
                .amount !== null
                ? formatNumber(
                    financialReport?.content.purchases.breakdown.cashRegisterAndElectronic
                      .fixedAssets.amount
                  )
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0 text-center">35</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              {financialReport?.content.purchases.breakdown.cashRegisterAndElectronic.fixedAssets
                .tax !== undefined &&
              financialReport?.content.purchases.breakdown.cashRegisterAndElectronic.fixedAssets
                .tax !== null
                ? formatNumber(
                    financialReport?.content.purchases.breakdown.cashRegisterAndElectronic
                      .fixedAssets.tax
                  )
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0 text-left" rowSpan={9} colSpan={3}>
              <p>
                <span>
                  {/* Info: (20240814 - Anna) 附 1.統一發票明細表 */}
                  {t('reports:TAX_REPORT.ATTACHMENT_LIST_OF_UNIFORM_INVOICE')}
                </span>
                <span>
                  {/* Info: (20240814 - Anna) 份 */}
                  {t('reports:TAX_REPORT.COPIES')}
                </span>
              </p>
              <p>
                <span>
                  {/* Info: (20240814 - Anna) 2.進項憑證 */}
                  {t('reports:TAX_REPORT.INPUT_DOCUMENTS')}
                </span>
                <span>
                  {/* Info: (20240814 - Anna) 冊 */}
                  {t('reports:TAX_REPORT.VOLUMES')}
                </span>
                <span>
                  {/* Info: (20240814 - Anna) 份 */}
                  {t('reports:TAX_REPORT.COPIES')}
                </span>
              </p>
              <p>
                <span>
                  {/* Info: (20240814 - Anna) 3.海關代徵營業稅繳納證 */}
                  {t('reports:TAX_REPORT.CERTIFICATE_BY_CUSTOMS')}
                </span>
                <span>
                  {/* Info: (20240814 - Anna) 份 */}
                  {t('reports:TAX_REPORT.COPIES')}
                </span>
              </p>
              <p>
                <span>
                  {/* Info: (20240814 - Anna) 4.退回(出)及折讓證明單、海關退還溢繳營業稅申報單 */}
                  {t('reports:TAX_REPORT.CERTIFICATE_OF_RETURN_AND_ALLOWANCE')}
                </span>
                <span>
                  {/* Info: (20240814 - Anna) 份 */}
                  {t('reports:TAX_REPORT.COPIES')}
                </span>
              </p>
              <p>
                <span>
                  {/* Info: (20240814 - Anna) 5.營業稅繳款書申報聯 */}
                  {t('reports:TAX_REPORT.BUSINESS_TAX_PAYMENT_NOTICE')}
                </span>
                <span>
                  {/* Info: (20240814 - Anna) 份 */}
                  {t('reports:TAX_REPORT.COPIES')}
                </span>
              </p>
              <p>
                <span>
                  {/* Info: (20240814 - Anna) 6.零稅率銷售額清單 */}
                  {t('reports:TAX_REPORT.LIST_OF_ZERO_TAX_RATE_SALES_AMOUNT')}
                </span>
                <span>
                  {/* Info: (20240814 - Anna) 份 */}
                  {t('reports:TAX_REPORT.COPIES')}
                </span>
              </p>
              <p>
                <span>
                  {/* Info: (20240814 - Anna) 7.營業稅一次性移轉訂價調整聲明書 */}
                  {t('reports:TAX_REPORT.ONE_TIME_TRANSFER_PRICING_ADJUSTMENT_STATEMENT')}
                </span>
                <span>
                  {/* Info: (20240814 - Anna) 份 */}
                  {t('reports:TAX_REPORT.COPIES')}
                </span>
              </p>
              <p>
                <span>
                  {/* Info: (20240814 - Anna) 8.營業稅聲明事項表 */}
                  {t('reports:TAX_REPORT.BUSINESS_TAX_DECLARATION_STATEMENT_FORM')}
                </span>
                <span>
                  {/* Info: (20240814 - Anna) 份 */}
                  {t('reports:TAX_REPORT.COPIES')}
                </span>
              </p>
              <p>
                {/* Info: (20240814 - Anna) 申報日期： */}
                {t('reports:TAX_REPORT.FILING_DATE')}
                {createdTaiwanDate ?? 'N/A'}
              </p>
            </td>
            <td
              className="border border-black px-1 py-0 text-center align-bottom"
              rowSpan={9}
              colSpan={2}
            >
              <p>
                {/* Info: (20240814 - Anna) 核收日期： */}
                {t('reports:TAX_REPORT.RECEIVED_DATE')}
                {updatedTaiwanDate ?? 'N/A'}
              </p>
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0 text-start" rowSpan={2}>
              {/* Info: (20240814 - Anna) 載有稅額之其他憑證 */}
              {t('reports:TAX_REPORT.OTHER_VOUCHERS')}
              <br />({/* Info: (20240814 - Anna) 包括二聯式收銀機發票 */}
              {t('reports:TAX_REPORT.INCLUDING_CASH_REGISTER')})
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* Info: (20240814 - Anna) 進貨及費用 */}
              {t('reports:TAX_REPORT.PURCHASE_AND_EXPENDITURES')}
            </td>
            <td className="border border-black px-1 py-0 text-center">36</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              {financialReport?.content.purchases.breakdown.otherTaxableVouchers.generalPurchases
                .amount !== undefined &&
              financialReport?.content.purchases.breakdown.otherTaxableVouchers.generalPurchases
                .amount !== null
                ? formatNumber(
                    financialReport?.content.purchases.breakdown.otherTaxableVouchers
                      .generalPurchases.amount
                  )
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0 text-center">37</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              {financialReport?.content.purchases.breakdown.otherTaxableVouchers.generalPurchases
                .tax !== undefined &&
              financialReport?.content.purchases.breakdown.otherTaxableVouchers.generalPurchases
                .tax !== null
                ? formatNumber(
                    financialReport?.content.purchases.breakdown.otherTaxableVouchers
                      .generalPurchases.tax
                  )
                : 'N/A'}
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* Info: (20240814 - Anna) 固定資產 */}
              {t('reports:TAX_REPORT.FIXED_ASSETS')}
            </td>
            <td className="border border-black px-1 py-0 text-center">38</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              {financialReport?.content.purchases.breakdown.otherTaxableVouchers.fixedAssets
                .amount !== undefined &&
              financialReport?.content.purchases.breakdown.otherTaxableVouchers.fixedAssets
                .amount !== null
                ? formatNumber(
                    financialReport?.content.purchases.breakdown.otherTaxableVouchers.fixedAssets
                      .amount
                  )
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0 text-center">39</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              {financialReport?.content.purchases.breakdown.otherTaxableVouchers.fixedAssets.tax !==
                undefined &&
              financialReport?.content.purchases.breakdown.otherTaxableVouchers.fixedAssets.tax !==
                null
                ? formatNumber(
                    financialReport?.content.purchases.breakdown.otherTaxableVouchers.fixedAssets
                      .tax
                  )
                : 'N/A'}
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0 text-start" rowSpan={2}>
              {/* Info: (20240814 - Anna) 海關代徵營業稅繳納證扣抵聯 */}
              {t('reports:TAX_REPORT.CERTIFICATE_OF_PAYMENT_BY_CUSTOMS')}
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* Info: (20240814 - Anna) 進貨及費用 */}
              {t('reports:TAX_REPORT.PURCHASE_AND_EXPENDITURES')}
            </td>
            <td className="border border-black px-1 py-0 text-center">78</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              {financialReport?.content.purchases.breakdown.customsDutyPayment.generalPurchases
                .amount !== undefined &&
              financialReport?.content.purchases.breakdown.customsDutyPayment.generalPurchases
                .amount !== null
                ? formatNumber(
                    financialReport?.content.purchases.breakdown.customsDutyPayment.generalPurchases
                      .amount
                  )
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0 text-center">79</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              {financialReport?.content.purchases.breakdown.customsDutyPayment.generalPurchases
                .tax !== undefined &&
              financialReport?.content.purchases.breakdown.customsDutyPayment.generalPurchases
                .tax !== null
                ? formatNumber(
                    financialReport?.content.purchases.breakdown.customsDutyPayment.generalPurchases
                      .tax
                  )
                : 'N/A'}
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* Info: (20240814 - Anna) 固定資產 */}
              {t('reports:TAX_REPORT.FIXED_ASSETS')}
            </td>
            <td className="border border-black px-1 py-0 text-center">80</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              {financialReport?.content.purchases.breakdown.customsDutyPayment.fixedAssets
                .amount !== undefined &&
              financialReport?.content.purchases.breakdown.customsDutyPayment.fixedAssets.amount !==
                null
                ? formatNumber(
                    financialReport?.content.purchases.breakdown.customsDutyPayment.fixedAssets
                      .amount
                  )
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0 text-center">81</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              {financialReport?.content.purchases.breakdown.customsDutyPayment.fixedAssets.tax !==
                undefined &&
              financialReport?.content.purchases.breakdown.customsDutyPayment.fixedAssets.tax !==
                null
                ? formatNumber(
                    financialReport?.content.purchases.breakdown.customsDutyPayment.fixedAssets.tax
                  )
                : 'N/A'}
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0 text-start" rowSpan={2}>
              {/* Info: (20240814 - Anna) 減 :退出、折讓及海關退還 */}
              {t('reports:TAX_REPORT.DEDUCTION_COPY_OF_CERTIFICATE_OF_PAYMENT')}
              <br />
              {/* Info: (20240814 - Anna) 溢繳稅款 */}
              {t('reports:TAX_REPORT.FOR_BUSINESS_TAX_COLLECTED_BY_CUSTOMS')}
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* Info: (20240814 - Anna) 進貨及費用 */}
              {t('reports:TAX_REPORT.PURCHASE_AND_EXPENDITURES')}
            </td>
            <td className="border border-black px-1 py-0 text-center">40</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              {financialReport?.content.purchases.breakdown.returnsAndAllowances.generalPurchases
                .amount !== undefined &&
              financialReport?.content.purchases.breakdown.returnsAndAllowances.generalPurchases
                .amount !== null
                ? formatNumber(
                    financialReport?.content.purchases.breakdown.returnsAndAllowances
                      .generalPurchases.amount
                  )
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0 text-center">41</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              {/* {financialReport?.content.purchases.breakdown.returnsAndAllowances.generalPurchases
                .tax ?? 'N/A'} */}
              {financialReport?.content.purchases.breakdown.returnsAndAllowances.generalPurchases
                .tax !== undefined &&
              financialReport?.content.purchases.breakdown.returnsAndAllowances.generalPurchases
                .tax !== null
                ? formatNumber(
                    financialReport?.content.purchases.breakdown.returnsAndAllowances
                      .generalPurchases.tax
                  )
                : 'N/A'}
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* Info: (20240814 - Anna) 固定資產 */}
              {t('reports:TAX_REPORT.FIXED_ASSETS')}
            </td>
            <td className="border border-black px-1 py-0 text-center">42</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              {/* {financialReport?.content.purchases.breakdown.returnsAndAllowances.fixedAssets
                .amount ?? 'N/A'} */}
              {financialReport?.content.purchases.breakdown.returnsAndAllowances.fixedAssets
                .amount !== undefined &&
              financialReport?.content.purchases.breakdown.returnsAndAllowances.fixedAssets
                .amount !== null
                ? formatNumber(
                    financialReport?.content.purchases.breakdown.returnsAndAllowances.fixedAssets
                      .amount
                  )
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0 text-center">43</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              {/* {financialReport?.content.purchases.breakdown.returnsAndAllowances.fixedAssets.tax ??
                'N/A'} */}
              {financialReport?.content.purchases.breakdown.returnsAndAllowances.fixedAssets.tax !==
                undefined &&
              financialReport?.content.purchases.breakdown.returnsAndAllowances.fixedAssets.tax !==
                null
                ? formatNumber(
                    financialReport?.content.purchases.breakdown.returnsAndAllowances.fixedAssets
                      .tax
                  )
                : 'N/A'}
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0 text-start" rowSpan={2}>
              {/* Info: (20240814 - Anna) 合計 */}
              {t('reports:TAX_REPORT.TOTAL')}
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* Info: (20240814 - Anna) 進貨及費用 */}
              {t('reports:TAX_REPORT.PURCHASE_AND_EXPENDITURES')}
            </td>
            <td className="border border-black px-1 py-0 text-center">44</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              {financialReport?.content.purchases.breakdown.total.generalPurchases.amount !==
                undefined &&
              financialReport?.content.purchases.breakdown.total.generalPurchases.amount !== null
                ? formatNumber(
                    financialReport?.content.purchases.breakdown.total.generalPurchases.amount
                  )
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0 text-center">45⑨</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              {financialReport?.content.purchases.breakdown.total.generalPurchases.tax !==
                undefined &&
              financialReport?.content.purchases.breakdown.total.generalPurchases.tax !== null
                ? formatNumber(
                    financialReport?.content.purchases.breakdown.total.generalPurchases.tax
                  )
                : 'N/A'}
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* Info: (20240814 - Anna) 固定資產 */}
              {t('reports:TAX_REPORT.FIXED_ASSETS')}
            </td>
            <td className="border border-black px-1 py-0 text-center">46</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              {financialReport?.content.purchases.breakdown.total.fixedAssets.amount !==
                undefined &&
              financialReport?.content.purchases.breakdown.total.fixedAssets.amount !== null
                ? formatNumber(
                    financialReport?.content.purchases.breakdown.total.fixedAssets.amount
                  )
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0 text-center">47⑩</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              {financialReport?.content.purchases.breakdown.total.fixedAssets.tax !== undefined &&
              financialReport?.content.purchases.breakdown.total.fixedAssets.tax !== null
                ? formatNumber(financialReport?.content.purchases.breakdown.total.fixedAssets.tax)
                : 'N/A'}
            </td>
          </tr>
          <tr>
            <td
              className="items-center text-nowrap border border-black px-1 py-0 text-start"
              rowSpan={2}
            >
              <p>
                {/* Info: (20240814 - Anna) 進項總金額 (包括不得扣抵憑證及普通收據) */}
                {t('reports:TAX_REPORT.TOTAL_INPUT_AMOUNT')}
              </p>
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* Info: (20240814 - Anna) 進貨及費用 */}
              {t('reports:TAX_REPORT.PURCHASE_AND_EXPENDITURES')}
            </td>
            <td className="border border-black px-1 py-0 text-center">48</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={5}>
              {financialReport?.content.purchases.totalWithNonDeductible.generalPurchases !==
                undefined &&
              financialReport?.content.purchases.totalWithNonDeductible.generalPurchases !== null
                ? formatNumber(
                    financialReport?.content.purchases.totalWithNonDeductible.generalPurchases
                  )
                : 'N/A'}
              {/* Info: (20240814 - Anna) 元 */}
              {t('reports:TAX_REPORT.NTD')}
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center" rowSpan={2}>
              {/* Info: (20240814 - Anna) 申辦情形 */}
              {t('reports:TAX_REPORT.FILING_STATUS')}
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center" rowSpan={2}>
              {/* Info: (20240814 - Anna) 姓名 */}
              {t('reports:TAX_REPORT.NAME')}
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center" rowSpan={2}>
              {/* Info: (20240814 - Anna) 身分證統一編號 */}
              {t('reports:TAX_REPORT.ID_NUMBER')}
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center" rowSpan={2}>
              {/* Info: (20240814 - Anna) 電話 */}
              {t('reports:TAX_REPORT.TELEPHONE_NUMBER')}
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center" rowSpan={2}>
              {/* Info: (20240814 - Anna) 登錄文(字)號 */}
              {t('reports:TAX_REPORT.LOGIN_NUMBER')}
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* Info: (20240814 - Anna) 固定資產 */}
              {t('reports:TAX_REPORT.FIXED_ASSETS')}
            </td>
            <td className="border border-black px-1 py-0 text-center">49</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={5}>
              {financialReport?.content.purchases.totalWithNonDeductible.fixedAssets !==
                undefined &&
              financialReport?.content.purchases.totalWithNonDeductible.fixedAssets !== null
                ? formatNumber(
                    financialReport?.content.purchases.totalWithNonDeductible.fixedAssets
                  )
                : 'N/A'}
              {/* Info: (20240814 - Anna) 元 */}
              {t('reports:TAX_REPORT.NTD')}
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0 text-center" colSpan={2}>
              {/* Info: (20240814 - Anna) 進口免稅貨物 */}
              {t('reports:TAX_REPORT.IMPORTATION_OF_TAX_EXEMPTED_GOODS')}
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center">73</td>
            <td className="text-nowrap border border-black px-1 py-0 text-end" colSpan={6}>
              {financialReport?.content.imports.taxExemptGoods !== undefined &&
              financialReport?.content.imports.taxExemptGoods !== null
                ? formatNumber(financialReport?.content.imports.taxExemptGoods)
                : 'N/A'}
              {/* Info: (20240814 - Anna) 元 */}
              {t('reports:TAX_REPORT.NTD')}
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* Info: (20240814 - Anna) 自行申報 */}
              {t('reports:TAX_REPORT.SELF_FILING')}
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center"></td>
            <td className="text-nowrap border border-black px-1 py-0 text-center"></td>
            <td className="text-nowrap border border-black px-1 py-0 text-center"></td>
            <td className="text-nowrap border border-black px-1 py-0 text-center"></td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0 text-center" colSpan={2}>
              {/* Info: (20240814 - Anna) 購買國外勞務 */}
              {t('reports:TAX_REPORT.PURCHASE_OF_FOREIGN_SERVICES')}
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center">74</td>
            <td className="text-nowrap border border-black px-1 py-0 text-end" colSpan={6}>
              {financialReport?.content.imports.foreignServices !== undefined &&
              financialReport?.content.imports.foreignServices !== null
                ? formatNumber(financialReport?.content.imports.foreignServices)
                : 'N/A'}
              {/* Info: (20240814 - Anna) 元 */}
              {t('reports:TAX_REPORT.NTD')}
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* Info: (20240814 - Anna) 委任申報 */}
              {t('reports:TAX_REPORT.FILING_BY_AGENT')}
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center"></td>
            <td className="text-nowrap border border-black px-1 py-0 text-center"></td>
            <td className="text-nowrap border border-black px-1 py-0 text-center"></td>
            <td className="text-nowrap border border-black px-1 py-0 text-center"></td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* Info: (20240814 - Anna) 說明 */}
              {t('reports:TAX_REPORT.REMARKS')}
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-start" colSpan={13}>
              <p>
                {/* Info: (20240814 - Anna) 一、 本申報書適用專營應稅及零稅率之營業人填報。 */}
                {t('reports:TAX_REPORT.REMARKS_1')}
              </p>
              <p>
                {/* Info: (20240814 - Anna) 二、
                如營業人申報當期(月)之銷售額包括有免稅、特種稅額計算銷售額者，請改用(403)申報書申報。 */}
                {t('reports:TAX_REPORT.REMARKS_2')}
              </p>
              <p>
                {/* Info: (20240814 - Anna) 三、
                營業人如有依財政部108年11月15日台財稅字第10804629000號令規定進行一次性移轉訂價調整申報營業稅，除跨境受控交易為進口貨物外，請另填報「營業稅一次性移轉訂價調整聲明書」並檢附相關證明文件，併 */}
                {t('reports:TAX_REPORT.REMARKS_3')}
                <br />
                {/* Info: (20240814 - Anna) 同會計年度最後一期營業稅申報。 */}
                {t('reports:TAX_REPORT.REMARKS_3_1')}
              </p>
              <p>
                {/* Info: (20240814 - Anna) 四、
                納稅者如有依納稅者權利保護法第7條第8項但書規定，為重要事項陳述者，請另填報「營業稅聲明事項表」並檢附相關證明文件。 */}
                {t('reports:TAX_REPORT.REMARKS_4')}
              </p>
            </td>
          </tr>
        </tbody>
      </table>
      <div className="my-auto flex justify-end py-2">
        <p className="text-8px font-bold">
          {/* Info: (20240814 - Anna) 紙張尺度(297 ×210)公厘 ods檔案格式 */}
          {t('reports:TAX_REPORT.PAPER_SIZE')}
        </p>
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
