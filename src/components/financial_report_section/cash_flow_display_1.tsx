import React, { useEffect } from 'react';
// import './reset.css';
// import './balance_sheet_display.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
// import Image from 'next/image';
import Script from 'next/script';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { useUserCtx } from '@/contexts/user_context';
import { DEFAULT_DISPLAYED_COMPANY_ID } from '@/constants/display';
import { useGlobalCtx } from '@/contexts/global_context';
import { useTranslation } from 'next-i18next';
import { ToastType } from '@/interfaces/toastify';
// import { ReportSheetType } from '@/constants/report';

// REPORT_FINANCIAL_GET_BY_ID = 'REPORT_FINANCIAL_GET_BY_ID',

interface CashFlowDisplayProps {
  reportType: unknown;
}

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

interface FinancialReport {
  general: FinancialReportItem[];
  details: FinancialReportItem[];
}

// Example usage:
// const exampleReport: FinancialReport = {
//   general: [
//     {
//       code: '3X2X',
//       name: '負債及權益總計',
//       curPeriodAmount: 0,
//       curPeriodAmountString: '0',
//       curPeriodPercentage: 0,
//       prePeriodAmount: 0,
//       prePeriodAmountString: '0',
//       prePeriodPercentage: 0,
//       indent: 0,
//     },
//   ],
//   details: [],
// };

const CashFlowDisplay: React.FC<CashFlowDisplayProps> = ({ reportType }) => {
  // type IAPIInput = {
  //     header?: {
  //         [key: string]: string;
  //     };
  //     body?: {
  //         [key: string]: unknown;
  //     } | FormData | IVoucher | IFinancialReportRequest;
  //     params?: {
  //         [key: string]: unknown;
  //     };
  //     query?: {
  //         [key: string]: unknown;
  //     };
  // }
  const { t } = useTranslation('common');
  const { selectedCompany } = useUserCtx();
  const { toastHandler } = useGlobalCtx();
  const {
    data: reportFinancial,
    code: getReportFinancialCode,
    success: getReportFinancialSuccess,
  } = APIHandler<ReportBody>(APIName.REPORT_FINANCIAL_GET_BY_ID, {
    params: {
      params: {
        companyId: selectedCompany?.id ?? DEFAULT_DISPLAYED_COMPANY_ID,
        reportId: '10000003',
      },
    },
  });
  const [reportData, setReportData] = React.useState<FinancialReport>({
    general: [],
    details: [],
  });
  // {
  //   reportTypesName: AnalysisReportTypesMap[reportType],
  //   tokenContract: '0x00000000219ab540356cBB839Cbe05303d7705Fa',
  //   tokenId: '37002036',
  //   reportLink: ReportLink[reportType],
  // }
  useEffect(() => {
    if (getReportFinancialSuccess === false) {
      toastHandler({
        id: `getReportFinancialCode-${getReportFinancialCode}}`,
        content: `${t('DASHBOARD.FAILED_TO_GET')} ${reportType}${t('DASHBOARD.REPORT')}${getReportFinancialCode}`,
        type: ToastType.ERROR,
        closeable: true,
      });
    }
    if (getReportFinancialSuccess && reportFinancial) {
      setReportData(reportFinancial as unknown as FinancialReport);
    }
  }, [getReportFinancialSuccess, getReportFinancialCode, reportFinancial]);

  // eslint-disable-next-line no-console
  console.log('reportData', reportData.general);
  return (
    <div className="container">
      <header>
        {/* Object.prototype.hasOwnProperty.call(reportData, 'details') &&
          reportData.details.map((value,index) => {
          return (<><h1>
              2330 <br />
              台灣積體電路製造股份有限公司
            </h1>
            <p>
              2023年第四季 <br />
              合併財務報告 - 現金流量表
            </p></>);
          }) */}
        <div>
          <div>
            <h1>
              2330 <br />
              台灣積體電路製造股份有限公司
            </h1>
            <p>
              2023年第四季 <br />
              合併財務報告 - 現金流量表
            </p>
          </div>
        </div>
        <div>
          <h2>Cash Flow Statement</h2>
        </div>
      </header>
      <section>
        <div>
          <p>一、項目彙總格式</p>
          <p>單位：新台幣仟元</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>代號</th>
              <th>會計項目</th>
              <th className="text-end">2023-1-1 至 2023-12-31</th>
              <th className="text-end">2022-1-1 至 2022-12-31</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={4}>營業活動之現金流量 - 直接法</td>
            </tr>
            <tr>
              <td>A00010</td>
              <td>繼續營業單位稅前淨利（淨損）</td>
              {/* <td className="text-end">979,171,324</td> */}
              {Object.prototype.hasOwnProperty.call(reportData, 'general') &&
                reportData.general.map((value) => {
                  return (
                    <td key={`${value.name}`} className="text-end">
                      {value.name}
                    </td>
                  );
                })}
              <td className="text-end">1,144,190,718</td>
            </tr>
            <tr>
              <td>A10000</td>
              <td>本期稅前淨利（淨損）</td>
              <td className="text-end">979,171,324</td>
              <td className="text-end">1,144,190,718</td>
            </tr>
            <tr>
              <td colSpan={4}>調整項目</td>
            </tr>
            <tr>
              <td>A20010</td>
              <td>收益費損項目合計</td>
              <td className="text-end">479,523,232</td>
              <td className="text-end">430,461,118</td>
            </tr>
            <tr>
              <td>A30000</td>
              <td>與營業活動相關之資產及負債之淨變動合計</td>
              <td className="text-end">(56,852,144)</td>
              <td className="text-end">(82,502,593)</td>
            </tr>
            <tr>
              <td>A20000</td>
              <td>調整項目合計</td>
              <td className="text-end">422,671,088</td>
              <td className="text-end">522,961,716</td>
            </tr>
            <tr>
              <td>A33000</td>
              <td>營運產生之現金流入（流出）</td>
              <td className="text-end">1,401,842,412</td>
              <td className="text-end">1,667,152,434</td>
            </tr>
            <tr>
              <td>A33500</td>
              <td>退還（支付）之所得稅</td>
              <td className="text-end">(159,875,065)</td>
              <td className="text-end">(160,964,247)</td>
            </tr>
            <tr>
              <td>AAAA</td>
              <td>營業活動之淨現金流入（流出）</td>
              <td className="text-end">1,241,967,347</td>
              <td className="text-end">1,506,188,188</td>
            </tr>
          </tbody>
        </table>
      </section>
      <footer className="footer">
        <p>1</p>
      </footer>
      <div>
        <button id="prevPage" type="button">
          <i></i>
        </button>
        <button id="nextPage" type="button">
          <i></i>
        </button>
      </div>
      <Script src="/pagination.js" strategy="lazyOnload" />
    </div>
  );
};

export default CashFlowDisplay;
