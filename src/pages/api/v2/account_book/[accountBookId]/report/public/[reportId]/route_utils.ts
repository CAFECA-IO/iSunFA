import { ReportSheetType } from '@/constants/report';
import { IAccountReadyForFrontend } from '@/interfaces/accounting_account';
import {
  BalanceSheetOtherInfo,
  CashFlowStatementOtherInfo,
  FinancialReport,
  IncomeStatementOtherInfo,
  IReport,
} from '@/interfaces/report';
import { formatIReport } from '@/lib/utils/formatter/report.formatter';
import { findUniqueReportById } from '@/lib/utils/repo/report.repo';
import { AccountBook } from '@prisma/client';

import balanceSheetLiteMapping from '@/constants/account_sheet_mapping/v1/balance_sheet_lite_mapping.json';
import cashFlowStatementLiteMapping from '@/constants/account_sheet_mapping/v1/cash_flow_statement_lite_mapping.json';
import incomeStatementLiteMapping from '@/constants/account_sheet_mapping/v1/income_statement_lite_mapping.json';
import { getTimestampOfSameDateOfLastYear } from '@/lib/utils/common';
import {
  isBalanceSheetOtherInfo,
  isCashFlowStatementOtherInfo,
  isIncomeStatementOtherInfo,
} from '@/lib/utils/type_guard/report';
import { IAccountingSetting } from '@/interfaces/accounting_setting';

export const getPublicReportUtils = {
  getMappingByReportType: (
    reportType: ReportSheetType
  ): {
    code: string;
    name: string;
    indent: number;
  }[] => {
    let mapping = balanceSheetLiteMapping;
    switch (reportType) {
      case ReportSheetType.BALANCE_SHEET:
        mapping = balanceSheetLiteMapping;
        break;
      case ReportSheetType.CASH_FLOW_STATEMENT:
        mapping = cashFlowStatementLiteMapping;
        break;
      case ReportSheetType.INCOME_STATEMENT:
        mapping = incomeStatementLiteMapping;
        break;
      default:
        break;
    }
    return mapping;
  },

  transformDetailsIntoGeneral: (
    reportType: ReportSheetType,
    accounts: IAccountReadyForFrontend[]
  ): IAccountReadyForFrontend[] => {
    const mapping = getPublicReportUtils.getMappingByReportType(reportType);
    const accountMap = new Map<string, IAccountReadyForFrontend>();
    accounts.forEach((account) => {
      if (account.code.length > 0) {
        accountMap.set(account.code, account);
      }
    });

    const general: IAccountReadyForFrontend[] = mapping.map((account) => {
      const accountCode = account.code;
      const accountInfo = accountMap.get(accountCode);
      if (accountInfo) {
        return accountInfo;
      }
      return {
        accountId: -1,
        code: accountCode,
        name: account.name,
        curPeriodAmount: '0',
        curPeriodAmountString: '0',
        curPeriodPercentage: '0',
        curPeriodPercentageString: '0',
        prePeriodAmount: '0',
        prePeriodAmountString: '0',
        prePeriodPercentage: '0',
        prePeriodPercentageString: '0',
        indent: account.indent,
        children: [],
      };
    });
    return general;
  },
  addBalanceSheetInfo: (report: IReport): BalanceSheetOtherInfo | null => {
    let otherInfo = null;

    if (isBalanceSheetOtherInfo(report.otherInfo)) {
      otherInfo = report.otherInfo;
    }

    return otherInfo;
  },

  addIncomeStatementInfo: (report: IReport): IncomeStatementOtherInfo | null => {
    let otherInfo = null;

    if (isIncomeStatementOtherInfo(report.otherInfo)) {
      otherInfo = report.otherInfo;
    }

    return otherInfo;
  },

  addCashFlowStatementInfo: (report: IReport): CashFlowStatementOtherInfo | null => {
    let otherInfo = null;

    if (isCashFlowStatementOtherInfo(report.otherInfo)) {
      otherInfo = report.otherInfo;
    }

    return otherInfo;
  },
  getAdditionalInfo: (
    report: IReport
  ): BalanceSheetOtherInfo | IncomeStatementOtherInfo | CashFlowStatementOtherInfo | null => {
    const { reportType } = report;

    let otherInfo = null;
    switch (reportType) {
      case ReportSheetType.BALANCE_SHEET:
        otherInfo = getPublicReportUtils.addBalanceSheetInfo(report);
        break;
      case ReportSheetType.CASH_FLOW_STATEMENT:
        otherInfo = getPublicReportUtils.addCashFlowStatementInfo(report);
        break;
      case ReportSheetType.INCOME_STATEMENT:
        otherInfo = getPublicReportUtils.addIncomeStatementInfo(report);
        break;
      default:
        break;
    }

    return otherInfo;
  },

  formatPayloadFromIReport: (
    report: IReport,
    company: AccountBook,
    accountingSetting?: IAccountingSetting
  ): FinancialReport => {
    const { reportType } = report;
    const details = report.content;

    const general = getPublicReportUtils.transformDetailsIntoGeneral(reportType, details);
    const curFrom = report.from;
    const curTo = report.to;

    const preFrom = getTimestampOfSameDateOfLastYear(curFrom);
    const preTo = getTimestampOfSameDateOfLastYear(curTo);

    const otherInfo = getPublicReportUtils.getAdditionalInfo(report);

    return {
      company: {
        id: company.id,
        code: company.taxId,
        name: company.name,
        accountingSetting,
      },
      reportType,
      preDate: {
        from: preFrom,
        to: preTo,
      },
      curDate: {
        from: curFrom,
        to: curTo,
      },
      details,
      general,
      otherInfo,
    };
  },
  getPeriodReport: async (reportId: number) => {
    const curPeriodReportFromDB = await findUniqueReportById(reportId);
    let curPeriodReport: IReport | null = null;
    let company: AccountBook | null = null;
    if (curPeriodReportFromDB) {
      curPeriodReport = formatIReport(curPeriodReportFromDB);
      company = curPeriodReportFromDB.accountBook;
    }

    return {
      curPeriodReport,
      company,
    };
  },
};
