import Skeleton from '@/components/skeleton/skeleton';
import { APIName } from '@/constants/api_connection';
import { NON_EXISTING_REPORT_ID } from '@/constants/config';
// import { DEFAULT_SKELETON_COUNT_FOR_PAGE } from '@/constants/display';
import { useUserCtx } from '@/contexts/user_context';
import { TaxReport401Content } from '@/interfaces/report';
import APIHandler from '@/lib/utils/api_handler';
import React from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'next-i18next';

interface ITaxReportBodyAllProps {
  reportId: string;
}

const TaxReportBodyAll = ({ reportId }: ITaxReportBodyAllProps) => {
  const { t } = useTranslation(['report_401', 'common']);
  const { isAuthLoading, selectedCompany } = useUserCtx();
  // Info: (20240814 - Anna) 使用 useState 定義 report401 變量的狀態，並將其類型設為 TaxReport401 | null

  const hasCompanyId = isAuthLoading === false && !!selectedCompany?.id;
  const {
    data: reportFinancial,
    // code: getReportFinancialCode,
    // success: getReportFinancialSuccess,
    isLoading: getReportFinancialIsLoading,
  } = APIHandler<TaxReport401Content>(
    APIName.REPORT_GET_BY_ID,
    {
      params: {
        companyId: selectedCompany?.id,
        reportId: reportId ?? NON_EXISTING_REPORT_ID,
      },
    },
    hasCompanyId
  );
  // console.log('reportFinancial in reportId', reportFinancial);
  /* Info: 格式化數字為千分位 (20240730 - Anna) */
  const formatNumber = (num: number) => num.toLocaleString();
  /* Info: 轉換和格式化日期 (20240816 - Anna) */
  const createdAt = reportFinancial?.createdAt ? new Date(reportFinancial.createdAt * 1000) : null;
  const updatedAt = reportFinancial?.updatedAt ? new Date(reportFinancial.updatedAt * 1000) : null;

  const formatToTaiwanDate = (timestamp: number | null) => {
    // Info: 如果 timestamp 為 null，返回 'N/A'(20240816 - Anna)
    if (timestamp === null) return 'N/A';
    const date = new Date(timestamp);
    const taiwanYear = date.getFullYear() - 1911;
    const yearTranslation = t('COMMON.Y');
    const monthTranslation = t('COMMON.M');
    const dayTranslation = t('ADD_ASSET_MODAL.DAY');
    return `${taiwanYear}${yearTranslation} ${format(date, `MM'${monthTranslation}'dd'${dayTranslation}'`)}`;
  };

  const createdTaiwanDate = createdAt ? formatToTaiwanDate(createdAt.getTime()) : 'N/A';
  const updatedTaiwanDate = updatedAt ? formatToTaiwanDate(updatedAt.getTime()) : 'N/A';

  const page1 = getReportFinancialIsLoading ? (
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
                {/* 統一編號 */}
                {t('TAX_REPORT.BUSINESS_ID_NUMBER')}
              </td>
              <td className="border border-black px-1 py-0">
                {reportFinancial?.content.basicInfo.uniformNumber ?? 'N/A'}
              </td>
            </tr>
            <tr>
              <td className="border border-black px-1 py-0">
                {/* 營業人名稱 */}
                {t('TAX_REPORT.NAME_OF_BUSINESS_ENTITY')}
              </td>
              <td className="border border-black px-1 py-0">
                {reportFinancial?.content.basicInfo.businessName ?? 'N/A'}
              </td>
            </tr>
            <tr>
              <td className="border border-black px-1 py-0">
                {/* 稅籍編號 */}
                {t('TAX_REPORT.TAX_SERIAL_NUMBER')}
              </td>
              <td className="border border-black px-1 py-0">
                {reportFinancial?.content.basicInfo.taxSerialNumber ?? 'N/A'}
              </td>
            </tr>
          </tbody>
        </table>
        <div className="flex flex-col text-center">
          <h1 className="text-sm font-bold">
            <span>
              {/* 財政部 */}
              {t('TAX_REPORT.MINISTRY_OF_FINANCE')}
            </span>
            <span>
              {''}
              {/* 北區 */}
              {t('TAX_REPORT.NORTH_DISTRICT')}
              {''}
            </span>
            <span>
              {/* 國稅局營業人銷售額與稅額申報書(401) */}
              {t('TAX_REPORT.IRS')}
              {t('PLUGIN.REPORT_401')}
            </span>
          </h1>
          <p className="text-xs">
            ({/* 一般稅額計算-專營應稅營業人使用 */}){t('TAX_REPORT.GENERAL_TAX_COMPUTATION')}
          </p>
          <div className="flex justify-between text-xs">
            <p className="flex-1 text-center">
              {/* 所屬年月份: */}
              {t('TAX_REPORT.CURRENT_PERIOD')}
              {reportFinancial?.content.basicInfo.currentYear ?? 'N/A'}
              {/* 年 */}
              {t('COMMON.Y')}
              {reportFinancial?.content.basicInfo.startMonth ?? 'N/A'}-
              {reportFinancial?.content.basicInfo.endMonth ?? 'N/A'}
              {/* 月 */}
              {t('COMMON.M')}
            </p>
            <p className="text-right">
              {/* 金額單位:新臺幣元 */}
              {t('TAX_REPORT.CURRENCY_UNIT_NTD')}
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
                {/* 註記欄 */}
                {t('TAX_REPORT.MARK')}
              </td>
              <td className="border-b border-l border-t border-black px-1 py-0" colSpan={2}>
                {/* 核准按月申報 */}
                {t('TAX_REPORT.APPROVED_MONTHLY_FILING')}
              </td>
              <td className="w-1/8 border border-black px-1 py-0"></td>
            </tr>
            <tr>
              <td
                className="text-nowrap border-l border-r border-t border-black px-1 py-0"
                rowSpan={2}
              >
                {/* 核准合併 */}
                {t('TAX_REPORT.APPROVED')}
                <br />
                {/* 總繳單位 */}
                {t('TAX_REPORT.CONSOLIDATED_FILING')}
              </td>
              <td className="text-nowrap border border-black px-1 py-0">
                {/* 總機構彙總申報 */}
                {t('TAX_REPORT.CONSOLIDATED_FILING_OF_HEAD_OFFICE')}
              </td>
              <td className="w-1/8 border border-black px-1 py-0"></td>
            </tr>
            <tr>
              <td className="text-nowrap border border-black px-1 py-0">
                {/* 各單位分別申報 */}
                {t('TAX_REPORT.INDIVIDUAL_FILING')}
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
              {/* 負責人姓名 */}
              {t('TAX_REPORT.NAME_OF_RESPONSIBLE_PERSON')}
            </td>
            <td className="border border-black px-1 py-0">
              {reportFinancial?.content.basicInfo.personInCharge ?? 'N/A'}
            </td>
            <td className="text-nowrap border border-black px-1 py-0">
              {/* 營業地址 */}
              {t('TAX_REPORT.BUSINESS_ADDRESS')}
            </td>
            <td className="border border-black px-1 py-0" colSpan={9}>
              {reportFinancial?.content.basicInfo.businessAddress ?? 'N/A'}
            </td>
            <td className="text-nowrap border border-black px-1 py-0">
              {/* 使用發票份數 */}
              {t('TAX_REPORT.NUMBER_OF_USED_INVOICES')}
            </td>
            <td className="border border-black px-1 py-0 text-right">
              {/* {reportFinancial?.content.basicInfo.usedInvoiceCount ?? 'N/A'} */}
              {reportFinancial?.content.basicInfo.usedInvoiceCount !== undefined &&
              reportFinancial?.content.basicInfo.usedInvoiceCount !== null
                ? formatNumber(reportFinancial.content.basicInfo.usedInvoiceCount)
                : 'N/A'}
              {/* 份 */}
              {t('TAX_REPORT.COPIES')}
            </td>
          </tr>
          <tr>
            <td className="border border-black px-1 py-0 text-center" rowSpan={10}>
              {/* 銷項 */}
              {t('TAX_REPORT.OUTPUT')}
            </td>
            <td className="border-b border-l border-t border-black px-1 py-0" rowSpan={2}>
              {/* 項目 */}
              {t('TAX_REPORT.ITEMS')}
            </td>
            <td className="border-b border-r border-t border-black px-1 py-0" rowSpan={2}>
              {/* 區分 */}
              {t('TAX_REPORT.DISTINGUISHMENT')}
            </td>
            <td className="border border-black px-1 py-0 text-center" colSpan={4}>
              {/* 應稅 */}
              {t('TAX_REPORT.TAXABLE')}
            </td>
            <td className="border border-black px-1 py-0 text-center" rowSpan={2} colSpan={2}>
              {/* 零稅率銷售額 */}
              {t('TAX_REPORT.ZERO_TAX_RATE_SALES_AMOUNT')}
            </td>
            <td className="border border-black px-1 py-0 text-center" rowSpan={10}>
              {/* 稅額 */}
              {t('TAX_REPORT.TAX')}
              <br />
              {/* 計算 */}
              {t('TAX_REPORT.CALCULATION')}
            </td>
            <td className="border border-black px-1 py-0">
              {/* 代號 */}
              {t('TAX_REPORT.CODE_NUMBER')}
            </td>
            <td className="border border-black px-1 py-0 text-center" colSpan={2}>
              {/* 項目 */}
              {t('TAX_REPORT.ITEMS')}
            </td>
            <td className="border border-black px-1 py-0">
              {/* 稅額 */}
              {t('TAX_REPORT.TAX')}
            </td>
          </tr>
          <tr>
            <td className="border border-black px-1 py-0 text-center" colSpan={2}>
              {/* 銷售額 */}
              {t('TAX_REPORT.SALES_AMOUNT')}
            </td>
            <td className="border border-black px-1 py-0 text-center" colSpan={2}>
              {/* 稅額 */}
              {t('TAX_REPORT.TAX')}
            </td>
            <td className="border border-black px-1 py-0">1</td>
            <td className="border border-black px-1 py-0">
              {/* 本期(月)銷項稅額合計 */}
              {t('TAX_REPORT.TOTAL_OUTPUT_TAX')}
            </td>
            <td className="w-8% border border-black px-1 py-0">② 101</td>
            <td className="border border-black px-1 py-0 text-right">
              {/* {reportFinancial?.content.taxCalculation.outputTax ?? 'N/A'} */}
              {reportFinancial?.content.taxCalculation.outputTax !== undefined &&
              reportFinancial?.content.taxCalculation.outputTax !== null
                ? formatNumber(reportFinancial?.content.taxCalculation.outputTax)
                : 'N/A'}
            </td>
          </tr>
          <tr>
            <td className="border border-black px-1 py-0" colSpan={2}>
              {/* 三聯式發票、電子計算機發票 */}
              {t('TAX_REPORT.TRIPLICATE_UNIFORM_INVOICE')}
            </td>
            <td className="border border-black px-1 py-0">1</td>
            <td className="w-8% border border-black px-1 py-0 text-right">
              {/* {reportFinancial?.content.sales.breakdown.triplicateAndElectronic.sales ?? 'N/A'} */}
              {reportFinancial?.content.sales.breakdown.triplicateAndElectronic.sales !==
                undefined &&
              reportFinancial?.content.sales.breakdown.triplicateAndElectronic.sales !== null
                ? formatNumber(
                    reportFinancial?.content.sales.breakdown.triplicateAndElectronic.sales
                  )
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0">2</td>
            <td className="w-8% border border-black px-1 py-0 text-right">
              {/* {reportFinancial?.content.sales.breakdown.triplicateAndElectronic.tax ?? 'N/A'} */}
              {reportFinancial?.content.sales.breakdown.triplicateAndElectronic.tax !== undefined &&
              reportFinancial?.content.sales.breakdown.triplicateAndElectronic.tax !== null
                ? formatNumber(reportFinancial?.content.sales.breakdown.triplicateAndElectronic.tax)
                : 'N/A'}
            </td>
            <td
              className="w-8% justify-between border border-black px-1 py-0 text-right"
              colSpan={2}
            >
              3
              {/* {reportFinancial?.content.sales.breakdown.triplicateAndElectronic.zeroTax ?? 'N/A'} */}{' '}
              {reportFinancial?.content.sales.breakdown.triplicateAndElectronic.zeroTax !==
                undefined &&
              reportFinancial?.content.sales.breakdown.triplicateAndElectronic.zeroTax !== null
                ? formatNumber(
                    reportFinancial?.content.sales.breakdown.triplicateAndElectronic.zeroTax
                  )
                : 'N/A'}{' '}
              ({/* 非經海關出口應附證明文件者 */})
              {t('TAX_REPORT.EXPORT_NOT_THROUGH_CUSTOMS_EVIDENCE_REQUIRED')}
            </td>
            <td className="border border-black px-1 py-0">7</td>
            <td className="border border-black px-1 py-0">
              {/* 得扣抵進項稅額合計 */}
              {t('TAX_REPORT.TOTAL_DEDUCTIBLE_INPUT_TAX')}
            </td>
            <td className="border border-black px-1 py-0">⑨+⑩ 107</td>
            <td className="border border-black px-1 py-0 text-right">
              {/* {reportFinancial?.content.taxCalculation.deductibleInputTax ?? 'N/A'} */}
              {reportFinancial?.content.taxCalculation.deductibleInputTax !== undefined &&
              reportFinancial?.content.taxCalculation.deductibleInputTax !== null
                ? formatNumber(reportFinancial?.content.taxCalculation.deductibleInputTax)
                : 'N/A'}
            </td>
          </tr>
          <tr>
            <td className="border border-black px-1 py-0" colSpan={2}>
              {/* 收銀機發票(三聯式)及電子發票 */}
              {t('TAX_REPORT.CASH_REGISTER_UNIFORM_INVOICE')}
            </td>
            <td className="border border-black px-1 py-0">5</td>
            <td className="border border-black px-1 py-0 text-right">
              {/* {reportFinancial?.content.sales.breakdown.cashRegisterTriplicate.sales ?? 'N/A'} */}
              {reportFinancial?.content.sales.breakdown.cashRegisterTriplicate.sales !==
                undefined &&
              reportFinancial?.content.sales.breakdown.cashRegisterTriplicate.sales !== null
                ? formatNumber(
                    reportFinancial?.content.sales.breakdown.cashRegisterTriplicate.sales
                  )
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0">6</td>
            <td className="border border-black px-1 py-0 text-right">
              {/* {reportFinancial?.content.sales.breakdown.cashRegisterTriplicate.tax ?? 'N/A'} */}
              {reportFinancial?.content.sales.breakdown.cashRegisterTriplicate.tax !== undefined &&
              reportFinancial?.content.sales.breakdown.cashRegisterTriplicate.tax !== null
                ? formatNumber(reportFinancial?.content.sales.breakdown.cashRegisterTriplicate.tax)
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0">7</td>
            <td className="border border-black px-1 py-0 text-right">
              {/* {reportFinancial?.content.sales.breakdown.cashRegisterTriplicate.zeroTax ?? 'N/A'} */}
              {reportFinancial?.content.sales.breakdown.cashRegisterTriplicate.zeroTax !==
                undefined &&
              reportFinancial?.content.sales.breakdown.cashRegisterTriplicate.zeroTax !== null
                ? formatNumber(
                    reportFinancial?.content.sales.breakdown.cashRegisterTriplicate.zeroTax
                  )
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0">8</td>
            <td className="border border-black px-1 py-0">
              {/* 上期(月)累積留抵稅額 */}
              {t('TAX_REPORT.BUSINESS_TAX_PAYABLE')}
            </td>
            <td className="border border-black px-1 py-0">108</td>
            <td className="border border-black px-1 py-0 text-right">
              {/* {reportFinancial?.content.taxCalculation.previousPeriodOffset ?? 'N/A'} */}
              {reportFinancial?.content.taxCalculation.previousPeriodOffset !== undefined &&
              reportFinancial?.content.taxCalculation.previousPeriodOffset !== null
                ? formatNumber(reportFinancial?.content.taxCalculation.previousPeriodOffset)
                : 'N/A'}
            </td>
          </tr>
          <tr>
            <td className="border border-black px-1 py-0" colSpan={2}>
              {/* 二聯式發票、收銀機發票(二聯式) */}
              {t('TAX_REPORT.DUPLICATE_UNIFORM_INVOICE')}
            </td>
            <td className="border border-black px-1 py-0">9</td>
            <td className="border border-black px-1 py-0 text-right">
              {/* {reportFinancial?.content.sales.breakdown.duplicateAndCashRegister.sales ?? 'N/A'} */}
              {reportFinancial?.content.sales.breakdown.duplicateAndCashRegister.sales !==
                undefined &&
              reportFinancial?.content.sales.breakdown.duplicateAndCashRegister.sales !== null
                ? formatNumber(
                    reportFinancial?.content.sales.breakdown.duplicateAndCashRegister.sales
                  )
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0">10</td>
            <td className="border border-black px-1 py-0 text-right">
              {/* {reportFinancial?.content.sales.breakdown.duplicateAndCashRegister.tax ?? 'N/A'} */}
              {reportFinancial?.content.sales.breakdown.duplicateAndCashRegister.tax !==
                undefined &&
              reportFinancial?.content.sales.breakdown.duplicateAndCashRegister.tax !== null
                ? formatNumber(
                    reportFinancial?.content.sales.breakdown.duplicateAndCashRegister.tax
                  )
                : 'N/A'}
            </td>
            <td className="justify-between border border-black px-1 py-0" colSpan={2}>
              11{' '}
              {/* {reportFinancial?.content.sales.breakdown.duplicateAndCashRegister.zeroTax ?? 'N/A'} */}
              {reportFinancial?.content.sales.breakdown.duplicateAndCashRegister.zeroTax !==
                undefined &&
              reportFinancial?.content.sales.breakdown.duplicateAndCashRegister.zeroTax !== null
                ? formatNumber(
                    reportFinancial?.content.sales.breakdown.duplicateAndCashRegister.zeroTax
                  )
                : 'N/A'}{' '}
              ({/* 經海關出口免附證明文件者 */}){t('TAX_REPORT.EXPORT_THROUGH_CUSTOMS')}
            </td>
            <td className="border border-black px-1 py-0">10</td>
            <td className="border border-black px-1 py-0">
              {/* 小計 */}
              {t('TAX_REPORT.SUBTOTAL')}
              (7+8)
            </td>
            <td className="border border-black px-1 py-0">110</td>
            <td className="border border-black px-1 py-0 text-right">
              {/* {reportFinancial?.content.taxCalculation.subtotal ?? 'N/A'} */}
              {reportFinancial?.content.taxCalculation.subtotal !== undefined &&
              reportFinancial?.content.taxCalculation.subtotal !== null
                ? formatNumber(reportFinancial?.content.taxCalculation.subtotal)
                : 'N/A'}
            </td>
          </tr>
          <tr>
            <td className="border border-black px-1 py-0" colSpan={2}>
              {/* 免用發票 */}
              {t('TAX_REPORT.EXEMPTION_OF_UNIFORM_INVOICE')}
            </td>
            <td className="border border-black px-1 py-0">13</td>
            <td className="border border-black px-1 py-0 text-right">
              {/* {reportFinancial?.content.sales.breakdown.invoiceExempt.sales ?? 'N/A'} */}
              {reportFinancial?.content.sales.breakdown.invoiceExempt.sales !== undefined &&
              reportFinancial?.content.sales.breakdown.invoiceExempt.sales !== null
                ? formatNumber(reportFinancial?.content.sales.breakdown.invoiceExempt.sales)
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0">14</td>
            <td className="border border-black px-1 py-0 text-right">
              {/* {reportFinancial?.content.sales.breakdown.invoiceExempt.tax ?? 'N/A'} */}
              {reportFinancial?.content.sales.breakdown.invoiceExempt.tax !== undefined &&
              reportFinancial?.content.sales.breakdown.invoiceExempt.tax !== null
                ? formatNumber(reportFinancial?.content.sales.breakdown.invoiceExempt.tax)
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0">15</td>
            <td className="border border-black px-1 py-0 text-right">
              {/* {reportFinancial?.content.sales.breakdown.invoiceExempt.zeroTax ?? 'N/A'} */}
              {reportFinancial?.content.sales.breakdown.invoiceExempt.zeroTax !== undefined &&
              reportFinancial?.content.sales.breakdown.invoiceExempt.zeroTax !== null
                ? formatNumber(reportFinancial?.content.sales.breakdown.invoiceExempt.zeroTax)
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0">11</td>
            <td className="border border-black px-1 py-0">
              {/* 本期(月)應實繳稅額 */}
              {t('TAX_REPORT.TAX_PAYABLE_FOR_CURRENT_PERIOD')}
              (1-10)
            </td>
            <td className="border border-black px-1 py-0">111</td>
            <td className="border border-black px-1 py-0 text-right">
              {/* {reportFinancial?.content.taxCalculation.currentPeriodTaxPayable ?? 'N/A'} */}
              {reportFinancial?.content.taxCalculation.currentPeriodTaxPayable !== undefined &&
              reportFinancial?.content.taxCalculation.currentPeriodTaxPayable !== null
                ? formatNumber(reportFinancial?.content.taxCalculation.currentPeriodTaxPayable)
                : 'N/A'}
            </td>
          </tr>
          <tr>
            <td className="border border-black px-1 py-0" colSpan={2}>
              {/* 減:退回及折讓 */}
              {t('TAX_REPORT.LESS_SALES_RETURN_AND_ALLOWANCE')}
            </td>
            <td className="border border-black px-1 py-0">17</td>
            <td className="border border-black px-1 py-0 text-right">
              {/* {reportFinancial?.content.sales.breakdown.returnsAndAllowances.sales ?? 'N/A'} */}
              {reportFinancial?.content.sales.breakdown.returnsAndAllowances.sales !== undefined &&
              reportFinancial?.content.sales.breakdown.returnsAndAllowances.sales !== null
                ? formatNumber(reportFinancial?.content.sales.breakdown.returnsAndAllowances.sales)
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0">18</td>
            <td className="border border-black px-1 py-0 text-right">
              {/* {reportFinancial?.content.sales.breakdown.returnsAndAllowances.tax ?? 'N/A'} */}
              {reportFinancial?.content.sales.breakdown.returnsAndAllowances.tax !== undefined &&
              reportFinancial?.content.sales.breakdown.returnsAndAllowances.tax !== null
                ? formatNumber(reportFinancial?.content.sales.breakdown.returnsAndAllowances.tax)
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0">19</td>
            <td className="border border-black px-1 py-0 text-right">
              {/* {reportFinancial?.content.sales.breakdown.returnsAndAllowances.zeroTax ?? 'N/A'} */}
              {reportFinancial?.content.sales.breakdown.returnsAndAllowances.zeroTax !==
                undefined &&
              reportFinancial?.content.sales.breakdown.returnsAndAllowances.zeroTax !== null
                ? formatNumber(
                    reportFinancial?.content.sales.breakdown.returnsAndAllowances.zeroTax
                  )
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0">12</td>
            <td className="border border-black px-1 py-0">
              {/* 本期(月)申報留抵稅額 */}
              {t('TAX_REPORT.FILING_OFFSET_AGAINST')}
              (10-1)
            </td>
            <td className="border border-black px-1 py-0">112</td>
            <td className="border border-black px-1 py-0 text-right">
              {/* {reportFinancial?.content.taxCalculation.currentPeriodFilingOffset ?? 'N/A'} */}
              {reportFinancial?.content.taxCalculation.currentPeriodFilingOffset !== undefined &&
              reportFinancial?.content.taxCalculation.currentPeriodFilingOffset !== null
                ? formatNumber(reportFinancial?.content.taxCalculation.currentPeriodFilingOffset)
                : 'N/A'}
            </td>
          </tr>
          <tr>
            <td className="border border-black px-1 py-0" colSpan={2}>
              {/* 合計 */}
              {t('TAX_REPORT.TOTAL')}
            </td>
            <td className="border border-black px-1 py-0">21①</td>
            <td className="border border-black px-1 py-0 text-right">
              {/* {reportFinancial?.content.sales.breakdown.total.sales ?? 'N/A'} */}
              {reportFinancial?.content.sales.breakdown.total.sales !== undefined &&
              reportFinancial?.content.sales.breakdown.total.sales !== null
                ? formatNumber(reportFinancial?.content.sales.breakdown.total.sales)
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0">22②</td>
            <td className="border border-black px-1 py-0 text-right">
              {/* {reportFinancial?.content.sales.breakdown.total.tax ?? 'N/A'} */}
              {reportFinancial?.content.sales.breakdown.total.tax !== undefined &&
              reportFinancial?.content.sales.breakdown.total.tax !== null
                ? formatNumber(reportFinancial?.content.sales.breakdown.total.tax)
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0">23③</td>
            <td className="border border-black px-1 py-0 text-right">
              {/* {reportFinancial?.content.sales.breakdown.total.zeroTax ?? 'N/A'} */}
              {reportFinancial?.content.sales.breakdown.total.zeroTax !== undefined &&
              reportFinancial?.content.sales.breakdown.total.zeroTax !== null
                ? formatNumber(reportFinancial?.content.sales.breakdown.total.zeroTax)
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0">13</td>
            <td className="border border-black px-1 py-0">
              {/* 得退稅限額合計 */}
              {t('TAX_REPORT.CEILING_OF_REFUND')}
            </td>
            <td className="border border-black px-1 py-0">③×5%+⑩ 113</td>
            <td className="border border-black px-1 py-0 text-right">
              {/* {reportFinancial?.content.taxCalculation.refundCeiling ?? 'N/A'} */}
              {reportFinancial?.content.taxCalculation.refundCeiling !== undefined &&
              reportFinancial?.content.taxCalculation.refundCeiling !== null
                ? formatNumber(reportFinancial?.content.taxCalculation.refundCeiling)
                : 'N/A'}
            </td>
          </tr>
          <tr>
            <td className="border border-black px-1 py-0" colSpan={2} rowSpan={2}>
              {/* 銷售額總計 */}
              {t('TAX_REPORT.TOTAL_SALES_AMOUNT')}
              <br />
              ①+③
            </td>
            <td className="border border-black px-1 py-0" rowSpan={2}>
              25⑦
            </td>
            <td className="border border-black px-1 py-0 text-center" colSpan={5} rowSpan={2}>
              <div className="flex items-center">
                {/* {reportFinancial?.content.sales.totalTaxableAmount ?? 'N/A'} */}
                {reportFinancial?.content.sales.totalTaxableAmount !== undefined &&
                reportFinancial?.content.sales.totalTaxableAmount !== null
                  ? formatNumber(reportFinancial?.content.sales.totalTaxableAmount)
                  : 'N/A'}
                {/* 元 */}
                {t('TAX_REPORT.NTD')}(
                <div>
                  <span>
                    {/* 內含銷售 */}
                    {t('TAX_REPORT.INCLUDING_SALES')}
                  </span>
                  <br />
                  <span>
                    {/* 固定資產 */}
                    {t('TAX_REPORT.OF_FIXED_ASSETS')}
                  </span>
                </div>
                ㉗{/* {reportFinancial?.content.sales.includeFixedAsset ?? 'N/A'} */}
                {reportFinancial?.content.sales.includeFixedAsset !== undefined &&
                reportFinancial?.content.sales.includeFixedAsset !== null
                  ? formatNumber(reportFinancial?.content.sales.includeFixedAsset)
                  : 'N/A'}
                {/* 元 */}
                {t('TAX_REPORT.NTD')})
              </div>
            </td>
            <td className="border border-black px-1 py-0">14</td>
            <td className="flex items-center text-nowrap border border-black px-1 py-0">
              {/* 本期(月)應退稅額 */}
              {t('TAX_REPORT.REFUNDABLE_TAX')}({/* 如 */}
              {t('TAX_REPORT.IF')}
              <div>
                <span>12&gt;13</span>
                <br />
                <span>13&gt;12</span>
              </div>
              {/* 則為 */}
              {t('TAX_REPORT.THEN')}
              <div>
                <span>13</span>
                <br />
                <span>12</span>
              </div>
              )
            </td>
            <td className="border border-black px-1 py-0">114</td>
            <td className="border border-black px-1 py-0 text-right">
              {/* {reportFinancial?.content.taxCalculation.currentPeriodRefundableTax ?? 'N/A'} */}
              {reportFinancial?.content.taxCalculation.currentPeriodRefundableTax !== undefined &&
              reportFinancial?.content.taxCalculation.currentPeriodRefundableTax !== null
                ? formatNumber(reportFinancial?.content.taxCalculation.currentPeriodRefundableTax)
                : 'N/A'}
            </td>
          </tr>
          <tr>
            <td className="border border-black px-1 py-0">15</td>
            <td className="border border-black px-1 py-0">
              {/* 本期(月)累積留抵稅額 */}
              {t('TAX_REPORT.ACCUMULATED_OFFSET_AGAINST')}
              (12-14)
            </td>
            <td className="border border-black px-1 py-0">115</td>
            <td className="border border-black px-1 py-0 text-right">
              {/* {reportFinancial?.content.taxCalculation.currentPeriodAccumulatedOffset ?? 'N/A'} */}
              {reportFinancial?.content.taxCalculation.currentPeriodAccumulatedOffset !==
                undefined &&
              reportFinancial?.content.taxCalculation.currentPeriodAccumulatedOffset !== null
                ? formatNumber(
                    reportFinancial?.content.taxCalculation.currentPeriodAccumulatedOffset
                  )
                : 'N/A'}
            </td>
          </tr>
          <tr>
            <td className="border border-black px-1 py-0 text-center" rowSpan={16}>
              {/* 進項 */}
              {t('TAX_REPORT.INPUT')}
            </td>
            <td className="border-b border-l border-t border-black px-1 py-0" rowSpan={2}>
              {/* 項目 */}
              {t('TAX_REPORT.ITEMS')}
            </td>
            <td className="border-b border-r border-t border-black px-1 py-0" rowSpan={2}>
              {/* 區分 */}
              {t('TAX_REPORT.DISTINGUISHMENT')}
            </td>
            <td
              className="border-b border-r border-t border-black px-1 py-0 text-center"
              colSpan={6}
            >
              {/* 得扣抵進項稅額 */}
              {t('TAX_REPORT.DEDUCTIBLE_INPUT_TAX')}
            </td>
            <td className="border border-black px-1 py-0 text-center" rowSpan={2} colSpan={3}>
              {/* 本期(月)應退稅額處理方式 */}
              {t('TAX_REPORT.WAY_TO_RECEIVE_REFUND')}
            </td>
            <td className="border border-black px-1 py-0 text-center" colSpan={2}>
              <div className="flex flex-nowrap items-center gap-1">
                <input type="checkbox" className="h-2 w-2" />
                <p className="text-nowrap">
                  {/* 利用存款帳戶劃撥 */}
                  {t('TAX_REPORT.REMITTANCE_TRANSFER')}
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td className="border border-black px-1 py-0 text-center" colSpan={3}>
              {/* 金額 */}
              {t('TAX_REPORT.AMOUNT')}
            </td>
            <td className="border border-black px-1 py-0 text-center" colSpan={3}>
              {/* 稅額 */}
              {t('TAX_REPORT.TAX')}
            </td>
            <td className="border border-black px-1 py-0 text-center" colSpan={2}>
              <div className="flex flex-nowrap items-center gap-1">
                <input type="checkbox" className="h-2 w-2" />
                <p className="text-nowrap">
                  {/* 領取退稅支票 */}
                  {t('TAX_REPORT.TAX_REFUND_CHECK')}
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0 text-start" rowSpan={2}>
              <div className="flex w-full justify-between">
                <div className="flex w-full justify-between">
                  <span>
                    {/* 統一發票扣抵聯 */}
                    {t('TAX_REPORT.DEDUCTION_COPY_OF_UNIFORM_INVOICE')}
                    <br />({/* 包括一般稅額計算之電子計算機發票扣抵聯 */})
                    {t('TAX_REPORT.INCLUDING_COMPUTER_UNIFORM_INVOICE')}
                  </span>
                </div>
              </div>
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* 進貨及費用 */}
              {t('TAX_REPORT.PURCHASE_AND_EXPENDITURES')}
            </td>
            <td className="border border-black px-1 py-0 text-center">28</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              {/* {reportFinancial?.content.purchases.breakdown.uniformInvoice.generalPurchases
                .amount ?? 'N/A'} */}
              {reportFinancial?.content.purchases.breakdown.uniformInvoice.generalPurchases
                .amount !== undefined &&
              reportFinancial?.content.purchases.breakdown.uniformInvoice.generalPurchases
                .amount !== null
                ? formatNumber(
                    reportFinancial?.content.purchases.breakdown.uniformInvoice.generalPurchases
                      .amount
                  )
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0 text-center">29</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              {/* {reportFinancial?.content.purchases.breakdown.uniformInvoice.generalPurchases.tax ??
                'N/A'} */}
              {reportFinancial?.content.purchases.breakdown.uniformInvoice.generalPurchases.tax !==
                undefined &&
              reportFinancial?.content.purchases.breakdown.uniformInvoice.generalPurchases.tax !==
                null
                ? formatNumber(
                    reportFinancial?.content.purchases.breakdown.uniformInvoice.generalPurchases.tax
                  )
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0 text-center" rowSpan={2} colSpan={3}>
              {/* 保稅區營業人按進口報關程序銷售貨物至我國 */}
              {t('TAX_REPORT.SOLD_BY_A_BONDED_ZONE')}
              <br />
              {/* 境內課稅區之免開立統一發票銷售額 */}
              {t('TAX_REPORT.TO_A_TAXABLE_ZONE')}
            </td>
            <td className="border border-black px-1 py-0 text-center" rowSpan={2} colSpan={2}>
              <div className="flex justify-between">
                <p>82</p>
                <p>
                  {/* {reportFinancial?.content.bondedAreaSalesToTaxArea ?? 'N/A'} */}
                  {reportFinancial?.content.bondedAreaSalesToTaxArea !== undefined &&
                  reportFinancial?.content.bondedAreaSalesToTaxArea !== null
                    ? formatNumber(reportFinancial?.content.bondedAreaSalesToTaxArea)
                    : 'N/A'}
                  {/* 元 */}
                  {t('TAX_REPORT.NTD')}
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* 固定資產 */}
              {t('TAX_REPORT.FIXED_ASSETS')}
            </td>
            <td className="border border-black px-1 py-0 text-center">30</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              {/* {reportFinancial?.content.purchases.breakdown.uniformInvoice.fixedAssets.amount ??
                'N/A'} */}
              {reportFinancial?.content.purchases.breakdown.uniformInvoice.fixedAssets.amount !==
                undefined &&
              reportFinancial?.content.purchases.breakdown.uniformInvoice.fixedAssets.amount !==
                null
                ? formatNumber(
                    reportFinancial?.content.purchases.breakdown.uniformInvoice.fixedAssets.amount
                  )
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0 text-center">31</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              {/* {reportFinancial?.content.purchases.breakdown.uniformInvoice.fixedAssets.tax ?? 'N/A'} */}
              {reportFinancial?.content.purchases.breakdown.uniformInvoice.fixedAssets.tax !==
                undefined &&
              reportFinancial?.content.purchases.breakdown.uniformInvoice.fixedAssets.tax !== null
                ? formatNumber(
                    reportFinancial?.content.purchases.breakdown.uniformInvoice.fixedAssets.tax
                  )
                : 'N/A'}
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0 text-start" rowSpan={2}>
              {/* 三聯式收銀機發票扣抵聯 */}
              {t('TAX_REPORT.DEDUCTION_COPY_OF_CASH_REGISTER_UNIFORM_INVOICE')}
              <br />
              {/* 及一般稅額計算之電子發票 */}
              {t('TAX_REPORT.ELECTRONIC_INVOICE')}
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* 進貨及費用 */}
              {t('TAX_REPORT.PURCHASE_AND_EXPENDITURES')}
            </td>
            <td className="border border-black px-1 py-0 text-center">32</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              {/* {reportFinancial?.content.purchases.breakdown.cashRegisterAndElectronic
                .generalPurchases.amount ?? 'N/A'} */}
              {reportFinancial?.content.purchases.breakdown.cashRegisterAndElectronic
                .generalPurchases.amount !== undefined &&
              reportFinancial?.content.purchases.breakdown.cashRegisterAndElectronic
                .generalPurchases.amount !== null
                ? formatNumber(
                    reportFinancial?.content.purchases.breakdown.cashRegisterAndElectronic
                      .generalPurchases.amount
                  )
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0 text-center">33</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              {/* {reportFinancial?.content.purchases.breakdown.cashRegisterAndElectronic
                .generalPurchases.tax ?? 'N/A'} */}
              {reportFinancial?.content.purchases.breakdown.cashRegisterAndElectronic
                .generalPurchases.tax !== undefined &&
              reportFinancial?.content.purchases.breakdown.cashRegisterAndElectronic
                .generalPurchases.tax !== null
                ? formatNumber(
                    reportFinancial?.content.purchases.breakdown.cashRegisterAndElectronic
                      .generalPurchases.tax
                  )
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0 text-center" colSpan={3}>
              {/* 申報單位蓋章處(統一發票專用章) */}
              {t('TAX_REPORT.UNIQUE_UNIFORM_INVOICE_CHOP')}
            </td>
            <td className="border border-black px-1 py-0 text-center" colSpan={2}>
              {/* 核收機關及人員蓋章處 */}
              {t('TAX_REPORT.STAMP_OF_TAX_AUTHORITY')}
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* 固定資產 */}
              {t('TAX_REPORT.FIXED_ASSETS')}
            </td>
            <td className="border border-black px-1 py-0 text-center">34</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              {/* {reportFinancial?.content.purchases.breakdown.cashRegisterAndElectronic.fixedAssets
                .amount ?? 'N/A'} */}
              {reportFinancial?.content.purchases.breakdown.cashRegisterAndElectronic.fixedAssets
                .amount !== undefined &&
              reportFinancial?.content.purchases.breakdown.cashRegisterAndElectronic.fixedAssets
                .amount !== null
                ? formatNumber(
                    reportFinancial?.content.purchases.breakdown.cashRegisterAndElectronic
                      .fixedAssets.amount
                  )
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0 text-center">35</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              {/* {reportFinancial?.content.purchases.breakdown.cashRegisterAndElectronic.fixedAssets
                .tax ?? 'N/A'} */}
              {reportFinancial?.content.purchases.breakdown.cashRegisterAndElectronic.fixedAssets
                .tax !== undefined &&
              reportFinancial?.content.purchases.breakdown.cashRegisterAndElectronic.fixedAssets
                .tax !== null
                ? formatNumber(
                    reportFinancial?.content.purchases.breakdown.cashRegisterAndElectronic
                      .fixedAssets.tax
                  )
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0 text-left" rowSpan={9} colSpan={3}>
              <p>
                <span>
                  {/* 附 1.統一發票明細表 */}
                  {t('TAX_REPORT.ATTACHMENT_LIST_OF_UNIFORM_INVOICE')}
                </span>
                <span>
                  {/* 份 */}
                  {t('TAX_REPORT.COPIES')}
                </span>
              </p>
              <p>
                <span>
                  {/* 2.進項憑證 */}
                  {t('TAX_REPORT.INPUT_DOCUMENTS')}
                </span>
                <span>
                  {/* 冊 */}
                  {t('TAX_REPORT.VOLUMES')}
                </span>
                <span>
                  {/* 份 */}
                  {t('TAX_REPORT.COPIES')}
                </span>
              </p>
              <p>
                <span>
                  {/* 3.海關代徵營業稅繳納證 */}
                  {t('TAX_REPORT.CERTIFICATE_BY_CUSTOMS')}
                </span>
                <span>
                  {/* 份 */}
                  {t('TAX_REPORT.COPIES')}
                </span>
              </p>
              <p>
                <span>
                  {/* 4.退回(出)及折讓證明單、海關退還溢繳營業稅申報單 */}
                  {t('TAX_REPORT.CERTIFICATE_OF_RETURN_AND_ALLOWANCE')}
                </span>
                <span>
                  {/* 份 */}
                  {t('TAX_REPORT.COPIES')}
                </span>
              </p>
              <p>
                <span>
                  {/* 5.營業稅繳款書申報聯 */}
                  {t('TAX_REPORT.BUSINESS_TAX_PAYMENT_NOTICE')}
                </span>
                <span>
                  {/* 份 */}
                  {t('TAX_REPORT.COPIES')}
                </span>
              </p>
              <p>
                <span>
                  {/* 6.零稅率銷售額清單 */}
                  {t('TAX_REPORT.LIST_OF_ZERO_TAX_RATE_SALES_AMOUNT')}
                </span>
                <span>
                  {/* 份 */}
                  {t('TAX_REPORT.COPIES')}
                </span>
              </p>
              <p>
                <span>
                  {/* 7.營業稅一次性移轉訂價調整聲明書 */}
                  {t('TAX_REPORT.ONE_TIME_TRANSFER_PRICING_ADJUSTMENT_STATEMENT')}
                </span>
                <span>
                  {/* 份 */}
                  {t('TAX_REPORT.COPIES')}
                </span>
              </p>
              <p>
                <span>
                  {/* 8.營業稅聲明事項表 */}
                  {t('TAX_REPORT.BUSINESS_TAX_DECLARATION_STATEMENT_FORM')}
                </span>
                <span>
                  {/* 份 */}
                  {t('TAX_REPORT.COPIES')}
                </span>
              </p>
              <p>
                {/* 申報日期： */}
                {t('TAX_REPORT.FILING_DATE')}
                {createdTaiwanDate ?? 'N/A'}
              </p>
            </td>
            <td
              className="border border-black px-1 py-0 text-center align-bottom"
              rowSpan={9}
              colSpan={2}
            >
              <p>
                {/* 核收日期： */}
                {t('TAX_REPORT.RECEIVED_DATE')}
                {updatedTaiwanDate ?? 'N/A'}
              </p>
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0 text-start" rowSpan={2}>
              {/* 載有稅額之其他憑證 */}
              {t('TAX_REPORT.OTHER_VOUCHERS')}
              <br />({/* 包括二聯式收銀機發票 */}
              {t('TAX_REPORT.INCLUDING_CASH_REGISTER')})
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* 進貨及費用 */}
              {t('TAX_REPORT.PURCHASE_AND_EXPENDITURES')}
            </td>
            <td className="border border-black px-1 py-0 text-center">36</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              {/* {reportFinancial?.content.purchases.breakdown.otherTaxableVouchers.generalPurchases
                .amount ?? 'N/A'} */}
              {reportFinancial?.content.purchases.breakdown.otherTaxableVouchers.generalPurchases
                .amount !== undefined &&
              reportFinancial?.content.purchases.breakdown.otherTaxableVouchers.generalPurchases
                .amount !== null
                ? formatNumber(
                    reportFinancial?.content.purchases.breakdown.otherTaxableVouchers
                      .generalPurchases.amount
                  )
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0 text-center">37</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              {/* {reportFinancial?.content.purchases.breakdown.otherTaxableVouchers.generalPurchases
                .tax ?? 'N/A'} */}
              {reportFinancial?.content.purchases.breakdown.otherTaxableVouchers.generalPurchases
                .tax !== undefined &&
              reportFinancial?.content.purchases.breakdown.otherTaxableVouchers.generalPurchases
                .tax !== null
                ? formatNumber(
                    reportFinancial?.content.purchases.breakdown.otherTaxableVouchers
                      .generalPurchases.tax
                  )
                : 'N/A'}
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* 固定資產 */}
              {t('TAX_REPORT.FIXED_ASSETS')}
            </td>
            <td className="border border-black px-1 py-0 text-center">38</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              {/* {reportFinancial?.content.purchases.breakdown.otherTaxableVouchers.fixedAssets
                .amount ?? 'N/A'} */}
              {reportFinancial?.content.purchases.breakdown.otherTaxableVouchers.fixedAssets
                .amount !== undefined &&
              reportFinancial?.content.purchases.breakdown.otherTaxableVouchers.fixedAssets
                .amount !== null
                ? formatNumber(
                    reportFinancial?.content.purchases.breakdown.otherTaxableVouchers.fixedAssets
                      .amount
                  )
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0 text-center">39</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              {/* {reportFinancial?.content.purchases.breakdown.otherTaxableVouchers.fixedAssets.tax ??
                'N/A'} */}
              {reportFinancial?.content.purchases.breakdown.otherTaxableVouchers.fixedAssets.tax !==
                undefined &&
              reportFinancial?.content.purchases.breakdown.otherTaxableVouchers.fixedAssets.tax !==
                null
                ? formatNumber(
                    reportFinancial?.content.purchases.breakdown.otherTaxableVouchers.fixedAssets
                      .tax
                  )
                : 'N/A'}
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0 text-start" rowSpan={2}>
              {/* 海關代徵營業稅繳納證扣抵聯 */}
              {t('TAX_REPORT.CERTIFICATE_OF_PAYMENT_BY_CUSTOMS')}
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* 進貨及費用 */}
              {t('TAX_REPORT.PURCHASE_AND_EXPENDITURES')}
            </td>
            <td className="border border-black px-1 py-0 text-center">78</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              {/* {reportFinancial?.content.purchases.breakdown.customsDutyPayment.generalPurchases
                .amount ?? 'N/A'} */}
              {reportFinancial?.content.purchases.breakdown.customsDutyPayment.generalPurchases
                .amount !== undefined &&
              reportFinancial?.content.purchases.breakdown.customsDutyPayment.generalPurchases
                .amount !== null
                ? formatNumber(
                    reportFinancial?.content.purchases.breakdown.customsDutyPayment.generalPurchases
                      .amount
                  )
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0 text-center">79</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              {/* {reportFinancial?.content.purchases.breakdown.customsDutyPayment.generalPurchases
                .tax ?? 'N/A'} */}
              {reportFinancial?.content.purchases.breakdown.customsDutyPayment.generalPurchases
                .tax !== undefined &&
              reportFinancial?.content.purchases.breakdown.customsDutyPayment.generalPurchases
                .tax !== null
                ? formatNumber(
                    reportFinancial?.content.purchases.breakdown.customsDutyPayment.generalPurchases
                      .tax
                  )
                : 'N/A'}
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* 固定資產 */}
              {t('TAX_REPORT.FIXED_ASSETS')}
            </td>
            <td className="border border-black px-1 py-0 text-center">80</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              {/* {reportFinancial?.content.purchases.breakdown.customsDutyPayment.fixedAssets.amount ??
                'N/A'} */}
              {reportFinancial?.content.purchases.breakdown.customsDutyPayment.fixedAssets
                .amount !== undefined &&
              reportFinancial?.content.purchases.breakdown.customsDutyPayment.fixedAssets.amount !==
                null
                ? formatNumber(
                    reportFinancial?.content.purchases.breakdown.customsDutyPayment.fixedAssets
                      .amount
                  )
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0 text-center">81</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              {/* {reportFinancial?.content.purchases.breakdown.customsDutyPayment.fixedAssets.tax ??
                'N/A'} */}
              {reportFinancial?.content.purchases.breakdown.customsDutyPayment.fixedAssets.tax !==
                undefined &&
              reportFinancial?.content.purchases.breakdown.customsDutyPayment.fixedAssets.tax !==
                null
                ? formatNumber(
                    reportFinancial?.content.purchases.breakdown.customsDutyPayment.fixedAssets.tax
                  )
                : 'N/A'}
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0 text-start" rowSpan={2}>
              {/* 減 :退出、折讓及海關退還 */}
              {t('TAX_REPORT.DEDUCTION_COPY_OF_CERTIFICATE_OF_PAYMENT')}
              <br />
              {/* 溢繳稅款 */}
              {t('TAX_REPORT.FOR_BUSINESS_TAX_COLLECTED_BY_CUSTOMS')}
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* 進貨及費用 */}
              {t('TAX_REPORT.PURCHASE_AND_EXPENDITURES')}
            </td>
            <td className="border border-black px-1 py-0 text-center">40</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              {/* {reportFinancial?.content.purchases.breakdown.returnsAndAllowances.generalPurchases
                .amount ?? 'N/A'} */}
              {reportFinancial?.content.purchases.breakdown.returnsAndAllowances.generalPurchases
                .amount !== undefined &&
              reportFinancial?.content.purchases.breakdown.returnsAndAllowances.generalPurchases
                .amount !== null
                ? formatNumber(
                    reportFinancial?.content.purchases.breakdown.returnsAndAllowances
                      .generalPurchases.amount
                  )
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0 text-center">41</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              {/* {reportFinancial?.content.purchases.breakdown.returnsAndAllowances.generalPurchases
                .tax ?? 'N/A'} */}
              {reportFinancial?.content.purchases.breakdown.returnsAndAllowances.generalPurchases
                .tax !== undefined &&
              reportFinancial?.content.purchases.breakdown.returnsAndAllowances.generalPurchases
                .tax !== null
                ? formatNumber(
                    reportFinancial?.content.purchases.breakdown.returnsAndAllowances
                      .generalPurchases.tax
                  )
                : 'N/A'}
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* 固定資產 */}
              {t('TAX_REPORT.FIXED_ASSETS')}
            </td>
            <td className="border border-black px-1 py-0 text-center">42</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              {/* {reportFinancial?.content.purchases.breakdown.returnsAndAllowances.fixedAssets
                .amount ?? 'N/A'} */}
              {reportFinancial?.content.purchases.breakdown.returnsAndAllowances.fixedAssets
                .amount !== undefined &&
              reportFinancial?.content.purchases.breakdown.returnsAndAllowances.fixedAssets
                .amount !== null
                ? formatNumber(
                    reportFinancial?.content.purchases.breakdown.returnsAndAllowances.fixedAssets
                      .amount
                  )
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0 text-center">43</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              {/* {reportFinancial?.content.purchases.breakdown.returnsAndAllowances.fixedAssets.tax ??
                'N/A'} */}
              {reportFinancial?.content.purchases.breakdown.returnsAndAllowances.fixedAssets.tax !==
                undefined &&
              reportFinancial?.content.purchases.breakdown.returnsAndAllowances.fixedAssets.tax !==
                null
                ? formatNumber(
                    reportFinancial?.content.purchases.breakdown.returnsAndAllowances.fixedAssets
                      .tax
                  )
                : 'N/A'}
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0 text-start" rowSpan={2}>
              {/* 合計 */}
              {t('TAX_REPORT.TOTAL')}
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* 進貨及費用 */}
              {t('TAX_REPORT.PURCHASE_AND_EXPENDITURES')}
            </td>
            <td className="border border-black px-1 py-0 text-center">44</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              {/* {reportFinancial?.content.purchases.breakdown.total.generalPurchases.amount ?? 'N/A'} */}
              {reportFinancial?.content.purchases.breakdown.total.generalPurchases.amount !==
                undefined &&
              reportFinancial?.content.purchases.breakdown.total.generalPurchases.amount !== null
                ? formatNumber(
                    reportFinancial?.content.purchases.breakdown.total.generalPurchases.amount
                  )
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0 text-center">45⑨</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              {/* {reportFinancial?.content.purchases.breakdown.total.generalPurchases.tax ?? 'N/A'} */}
              {reportFinancial?.content.purchases.breakdown.total.generalPurchases.tax !==
                undefined &&
              reportFinancial?.content.purchases.breakdown.total.generalPurchases.tax !== null
                ? formatNumber(
                    reportFinancial?.content.purchases.breakdown.total.generalPurchases.tax
                  )
                : 'N/A'}
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* 固定資產 */}
              {t('TAX_REPORT.FIXED_ASSETS')}
            </td>
            <td className="border border-black px-1 py-0 text-center">46</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              {/* {reportFinancial?.content.purchases.breakdown.total.fixedAssets.amount ?? 'N/A'} */}
              {reportFinancial?.content.purchases.breakdown.total.fixedAssets.amount !==
                undefined &&
              reportFinancial?.content.purchases.breakdown.total.fixedAssets.amount !== null
                ? formatNumber(
                    reportFinancial?.content.purchases.breakdown.total.fixedAssets.amount
                  )
                : 'N/A'}
            </td>
            <td className="border border-black px-1 py-0 text-center">47⑩</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              {/* {reportFinancial?.content.purchases.breakdown.total.fixedAssets.tax ?? 'N/A'} */}
              {reportFinancial?.content.purchases.breakdown.total.fixedAssets.tax !== undefined &&
              reportFinancial?.content.purchases.breakdown.total.fixedAssets.tax !== null
                ? formatNumber(reportFinancial?.content.purchases.breakdown.total.fixedAssets.tax)
                : 'N/A'}
            </td>
          </tr>
          <tr>
            <td
              className="items-center text-nowrap border border-black px-1 py-0 text-start"
              rowSpan={2}
            >
              <p>
                {/* 進項總金額 (包括不得扣抵憑證及普通收據) */}
                {t('TAX_REPORT.TOTAL_INPUT_AMOUNT')}
              </p>
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* 進貨及費用 */}
              {t('TAX_REPORT.PURCHASE_AND_EXPENDITURES')}
            </td>
            <td className="border border-black px-1 py-0 text-center">48</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={5}>
              {/* {reportFinancial?.content.purchases.totalWithNonDeductible.generalPurchases ?? 'N/A'} */}
              {reportFinancial?.content.purchases.totalWithNonDeductible.generalPurchases !==
                undefined &&
              reportFinancial?.content.purchases.totalWithNonDeductible.generalPurchases !== null
                ? formatNumber(
                    reportFinancial?.content.purchases.totalWithNonDeductible.generalPurchases
                  )
                : 'N/A'}
              {/* 元 */}
              {t('TAX_REPORT.NTD')}
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center" rowSpan={2}>
              {/* 申辦情形 */}
              {t('TAX_REPORT.FILING_STATUS')}
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center" rowSpan={2}>
              {/* 姓名 */}
              {t('TAX_REPORT.NAME')}
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center" rowSpan={2}>
              {/* 身分證統一編號 */}
              {t('TAX_REPORT.ID Number')}
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center" rowSpan={2}>
              {/* 電話 */}
              {t('TAX_REPORT.TELEPHONE_NUMBER')}
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center" rowSpan={2}>
              {/* 登錄文(字)號 */}
              {t('TAX_REPORT.LOGIN_NUMBER')}
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* 固定資產 */}
              {t('TAX_REPORT.FIXED_ASSETS')}
            </td>
            <td className="border border-black px-1 py-0 text-center">49</td>
            <td className="border border-black px-1 py-0 text-right" colSpan={5}>
              {/* {reportFinancial?.content.purchases.totalWithNonDeductible.fixedAssets ?? 'N/A'} */}
              {reportFinancial?.content.purchases.totalWithNonDeductible.fixedAssets !==
                undefined &&
              reportFinancial?.content.purchases.totalWithNonDeductible.fixedAssets !== null
                ? formatNumber(
                    reportFinancial?.content.purchases.totalWithNonDeductible.fixedAssets
                  )
                : 'N/A'}
              {/* 元 */}
              {t('TAX_REPORT.NTD')}
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0 text-center" colSpan={2}>
              {/* 進口免稅貨物 */}
              {t('TAX_REPORT.IMPORTATION_OF_TAX_EXEMPTED_GOODS')}
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center">73</td>
            <td className="text-nowrap border border-black px-1 py-0 text-end" colSpan={6}>
              {/* {reportFinancial?.content.imports.taxExemptGoods ?? 'N/A'} */}
              {reportFinancial?.content.imports.taxExemptGoods !== undefined &&
              reportFinancial?.content.imports.taxExemptGoods !== null
                ? formatNumber(reportFinancial?.content.imports.taxExemptGoods)
                : 'N/A'}
              {/* 元 */}
              {t('TAX_REPORT.NTD')}
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* 自行申報 */}
              {t('TAX_REPORT.SELF_FILING')}
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center"></td>
            <td className="text-nowrap border border-black px-1 py-0 text-center"></td>
            <td className="text-nowrap border border-black px-1 py-0 text-center"></td>
            <td className="text-nowrap border border-black px-1 py-0 text-center"></td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0 text-center" colSpan={2}>
              {/* 購買國外勞務 */}
              {t('TAX_REPORT.PURCHASE_OF_FOREIGN_SERVICES')}
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center">74</td>
            <td className="text-nowrap border border-black px-1 py-0 text-end" colSpan={6}>
              {/* {reportFinancial?.content.imports.foreignServices ?? 'N/A'} */}
              {reportFinancial?.content.imports.foreignServices !== undefined &&
              reportFinancial?.content.imports.foreignServices !== null
                ? formatNumber(reportFinancial?.content.imports.foreignServices)
                : 'N/A'}
              {/* 元 */}
              {t('TAX_REPORT.NTD')}
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* 委任申報 */}
              {t('TAX_REPORT.FILING_BY_AGENT')}
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center"></td>
            <td className="text-nowrap border border-black px-1 py-0 text-center"></td>
            <td className="text-nowrap border border-black px-1 py-0 text-center"></td>
            <td className="text-nowrap border border-black px-1 py-0 text-center"></td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* 說明 */}
              {t('TAX_REPORT.REMARKS')}
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-start" colSpan={13}>
              <p>
                {/* 一、 本申報書適用專營應稅及零稅率之營業人填報。 */}
                {t('TAX_REPORT.REMARKS_1')}
              </p>
              <p>
                {/* 二、
                如營業人申報當期(月)之銷售額包括有免稅、特種稅額計算銷售額者，請改用(403)申報書申報。 */}
                {t('TAX_REPORT.REMARKS_2')}
              </p>
              <p>
                {/* 三、
                營業人如有依財政部108年11月15日台財稅字第10804629000號令規定進行一次性移轉訂價調整申報營業稅，除跨境受控交易為進口貨物外，請另填報「營業稅一次性移轉訂價調整聲明書」並檢附相關證明文件，併 */}
                {t('TAX_REPORT.REMARKS_3')}
                <br />
                {/* 同會計年度最後一期營業稅申報。 */}
                {t('TAX_REPORT.REMARKS_3_1')}
              </p>
              <p>
                {/* 四、
                納稅者如有依納稅者權利保護法第7條第8項但書規定，為重要事項陳述者，請另填報「營業稅聲明事項表」並檢附相關證明文件。 */}
                {t('TAX_REPORT.REMARKS_4')}
              </p>
            </td>
          </tr>
        </tbody>
      </table>
      <div className="my-auto flex justify-end py-2">
        <p className="text-8px font-bold">
          {/* 紙張尺度(297 ×210)公厘 ods檔案格式 */}
          {t('TAX_REPORT.PAPER_SIZE')}
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
