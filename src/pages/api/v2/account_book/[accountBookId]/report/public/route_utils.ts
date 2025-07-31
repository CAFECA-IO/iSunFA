import { DefaultValue } from '@/constants/default_value';
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
import { getCompanyById } from '@/lib/utils/repo/account_book.repo';
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
    accountBookId: number;
    startDateInSecond: number;
    endDateInSecond: number;
    reportSheetType: ReportSheetType;
  }): Promise<IReportContent> => {
    const { accountBookId, startDateInSecond, endDateInSecond, reportSheetType } = options;
    let reportContent: IReportContent = {
      content: {
        content: [],
        otherInfo: {} as BalanceSheetOtherInfo,
      },
    };
    try {
      const financialReportGenerator = await ReportGeneratorFactory.createGenerator(
        accountBookId,
        startDateInSecond,
        endDateInSecond,
        reportSheetType
      );

      reportContent = await financialReportGenerator.generateReport();
    } catch (error) {
      const errorInfo = {
        userId: DefaultValue.USER_ID.SYSTEM,
        errorType: 'generateReport failed',
        errorMessage: 'Func. generateReport in company/companyId/report/index.ts failed',
      };
      loggerError(errorInfo);
    }
    return reportContent;
  },
  generateReportName: async (options: {
    accountBookId: number;
    reportSheetType: ReportSheetType;
    reportLanguage: string;
    endDateInSecond: number;
  }) => {
    const { accountBookId, reportSheetType, reportLanguage, endDateInSecond } = options;
    const company = await getCompanyById(accountBookId);
    const reportSheetForDisplay = ReportSheetTypeDisplayMap[reportSheetType];
    const dateString = timestampToString(endDateInSecond).date.replace(/-/g, '');
    const reportName = `${company?.taxId}_${reportSheetForDisplay}_${reportLanguage}_${dateString}`;
    return reportName;
  },
  generateAndSaveReport: async (options: {
    accountBookId: number;
    projectId: number | null;
    startDateInSecond: number;
    endDateInSecond: number;
    reportType: ReportType;
    reportSheetType: ReportSheetType;
    reportLanguageString: ReportLanguagesKey;
  }) => {
    const {
      accountBookId,
      projectId,
      startDateInSecond,
      endDateInSecond,
      reportType,
      reportSheetType,
      reportLanguageString,
    } = options;
    const { content } = await publicGenerateReportUtils.generateReport({
      accountBookId,
      startDateInSecond,
      endDateInSecond,
      reportSheetType,
    });
    const name = await publicGenerateReportUtils.generateReportName({
      accountBookId,
      reportSheetType,
      reportLanguage: reportLanguageString,
      endDateInSecond,
    });

    const reportCreated = await createReport(
      accountBookId,
      projectId,
      name,
      startDateInSecond,
      endDateInSecond,
      reportType,
      reportSheetType,
      content,
      ReportStatusType.GENERATED
    );

    // eslint-disable-next-line no-console
    console.log('content:', content, 'name:', name, 'reportCreated:', reportCreated);

    return reportCreated?.id || null;
  },
};
