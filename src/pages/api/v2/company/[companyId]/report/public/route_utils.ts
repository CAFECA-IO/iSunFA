import { DEFAULT_VALUE } from '@/constants/default_value';
import {
  ReportSheetType,
  ReportSheetTypeDisplayMap,
  ReportStatusType,
  ReportType,
} from '@/constants/report';
import { BalanceSheetOtherInfo, IReportContent } from '@/interfaces/report';
import { ReportLanguagesKey } from '@/interfaces/report_language';
import { timestampToString } from '@/lib/utils/common';
import { loggerError } from '@/lib/utils/logger_back';
import { getCompanyById } from '@/lib/utils/repo/company.repo';
import { createReport } from '@/lib/utils/repo/report.repo';
import ReportGeneratorFactory from '@/lib/utils/report/report_generator_factory';

export const publicGenerateReportUtils = {
  formatStartAndEndDateFromQuery: (options: {
    reportSheetType: ReportSheetType;
    startDate: number;
    endDate: number;
  }) => {
    const { reportSheetType, startDate, endDate } = options;
    const startDateInSecond = reportSheetType === ReportSheetType.BALANCE_SHEET ? 0 : startDate;
    const endDateInSecond = endDate;
    return { startDateInSecond, endDateInSecond };
  },
  generateReport: async (options: {
    companyId: number;
    startDateInSecond: number;
    endDateInSecond: number;
    reportSheetType: ReportSheetType;
  }): Promise<IReportContent> => {
    const { companyId, startDateInSecond, endDateInSecond, reportSheetType } = options;
    let reportContent: IReportContent = {
      content: {
        content: [],
        otherInfo: {} as BalanceSheetOtherInfo,
      },
    };
    try {
      const financialReportGenerator = await ReportGeneratorFactory.createGenerator(
        companyId,
        startDateInSecond,
        endDateInSecond,
        reportSheetType
      );

      reportContent = await financialReportGenerator.generateReport();
    } catch (error) {
      const errorInfo = {
        userId: DEFAULT_VALUE.USER_ID.SYSTEM,
        errorType: 'generateReport failed',
        errorMessage: 'Func. generateReport in company/companyId/report/index.ts failed',
      };
      loggerError(errorInfo);
    }
    return reportContent;
  },
  generateReportName: async (options: {
    companyId: number;
    reportSheetType: ReportSheetType;
    reportLanguage: string;
    endDateInSecond: number;
  }) => {
    const { companyId, reportSheetType, reportLanguage, endDateInSecond } = options;
    const company = await getCompanyById(companyId);
    const reportSheetForDisplay = ReportSheetTypeDisplayMap[reportSheetType];
    const dateString = timestampToString(endDateInSecond).date.replace(/-/g, '');
    const reportName = `${company?.taxId}_${reportSheetForDisplay}_${reportLanguage}_${dateString}`;
    return reportName;
  },
  generateAndSaveReport: async (options: {
    companyId: number;
    projectId: number | null;
    startDateInSecond: number;
    endDateInSecond: number;
    reportType: ReportType;
    reportSheetType: ReportSheetType;
    reportLanguageString: ReportLanguagesKey;
  }) => {
    const {
      companyId,
      projectId,
      startDateInSecond,
      endDateInSecond,
      reportType,
      reportSheetType,
      reportLanguageString,
    } = options;
    const { content } = await publicGenerateReportUtils.generateReport({
      companyId,
      startDateInSecond,
      endDateInSecond,
      reportSheetType,
    });
    const name = await publicGenerateReportUtils.generateReportName({
      companyId,
      reportSheetType,
      reportLanguage: reportLanguageString,
      endDateInSecond,
    });

    const reportCreated = await createReport(
      companyId,
      projectId,
      name,
      startDateInSecond,
      endDateInSecond,
      reportType,
      reportSheetType,
      content,
      ReportStatusType.GENERATED
    );

    return reportCreated?.id || null;
  },
};
