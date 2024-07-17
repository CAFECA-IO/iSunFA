import type { NextApiRequest, NextApiResponse } from 'next';
import { IResponseData } from '@/interfaces/response_data';
import {
  formatApiResponse,
  getTimestampOfFirstDateOfThisYear,
  getTimestampOfLastSecondOfDate,
  getTimestampOfSameDateOfLastYear,
  isParamNumeric,
  isParamString,
  timestampInSeconds,
  timestampToString,
} from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IAccountForSheetDisplay } from '@/interfaces/accounting_account';
import { getSession } from '@/lib/utils/session';
import { ReportSheetType, ReportSheetTypeDisplayMap, ReportType } from '@/constants/report';
import { isReportSheetType, convertStringToReportSheetType } from '@/lib/utils/type_guard/report';
import FinancialReportGeneratorFactory from '@/lib/utils/financial_report/financial_report_generator_factory';
import { createReport, getReportIdByFromTo } from '@/lib/utils/repo/report.repo';
import { ProgressStatus } from '@/constants/account';
import { getCompanyById } from '@/lib/utils/repo/company.repo';

export function formatReportSheetTypeFromQuery(reportType: string | string[] | undefined) {
  let reportSheetType = ReportSheetType.BALANCE_SHEET;

  if (isParamString(reportType) && isReportSheetType(reportType)) {
    reportSheetType = convertStringToReportSheetType(reportType);
  }
  return reportSheetType;
}

export function formatStartAndEndDateFromQuery(
  reportSheetType: ReportSheetType,
  startDate: string | string[] | undefined,
  endDate: string | string[] | undefined
) {
  const today = new Date();
  const todayInTimestamp = today.getTime();

  // Info: (20240710 - Murky) 如果是Balance Sheet，default開始時間為0，否則為今年的第一天
  let startDateInSecond =
    reportSheetType === ReportSheetType.BALANCE_SHEET ? 0 : getTimestampOfFirstDateOfThisYear();
  let endDateInSecond = getTimestampOfLastSecondOfDate(todayInTimestamp);

  if (startDate && isParamNumeric(startDate)) {
    const startDateInSecondString = parseInt(startDate as string, 10);
    startDateInSecond = timestampInSeconds(startDateInSecondString);
  }

  if (endDate && isParamNumeric(endDate)) {
    const endDateInSecondString = parseInt(endDate as string, 10);
    endDateInSecond = timestampInSeconds(endDateInSecondString);
  }

  const lastPeriodStartDateInSecond =
    reportSheetType === ReportSheetType.BALANCE_SHEET
      ? 0
      : Math.max(getTimestampOfSameDateOfLastYear(startDateInSecond), 0);
  const lastPeriodEndDateInSecond = Math.max(getTimestampOfSameDateOfLastYear(endDateInSecond), 0);

  return {
    startDateInSecond,
    endDateInSecond,
    lastPeriodStartDateInSecond,
    lastPeriodEndDateInSecond,
  };
}

export function formatProjectIdFromQuery(projectId: string | string[] | undefined): number | null {
  let projectIdNumber = null;

  if (isParamNumeric(projectId)) {
    projectIdNumber = parseInt(projectId as string, 10);
  }
  return projectIdNumber;
}

export function formatReportLanguageFromQuery(
  reportLanguage: string | string[] | undefined
): string {
  let reportLanguageString = 'tw';

  if (isParamString(reportLanguage)) {
    reportLanguageString = reportLanguage as string;
  }
  return reportLanguageString;
}

export function formatFinancialOrAnalysisFromQuery(
  financialOrAnalysis: string | string[] | undefined
): string {
  // Deprecate: (20240710 - Murky) this function is to separate financial and analysis temperately
  let financialOrAnalysisString = 'financial';

  if (isParamString(financialOrAnalysis)) {
    financialOrAnalysisString = financialOrAnalysis as string;
  }
  return financialOrAnalysisString;
}

export function formatPostRequestQuery(req: NextApiRequest) {
  const { projectId, reportType, reportLanguage, startDate, endDate, financialOrAnalysis } =
    req.query;

  const projectIdNumber = formatProjectIdFromQuery(projectId);

  const reportLanguageString = formatReportLanguageFromQuery(reportLanguage);

  const reportSheetType = formatReportSheetTypeFromQuery(reportType);

  const {
    startDateInSecond,
    endDateInSecond,
    lastPeriodStartDateInSecond,
    lastPeriodEndDateInSecond,
  } = formatStartAndEndDateFromQuery(reportSheetType, startDate, endDate);

  const financialOrAnalysisString = formatFinancialOrAnalysisFromQuery(financialOrAnalysis);

  return {
    projectIdNumber,
    reportLanguageString,
    reportSheetType,
    startDateInSecond,
    endDateInSecond,
    lastPeriodStartDateInSecond,
    lastPeriodEndDateInSecond,
    financialOrAnalysisString,
  };
}

export async function generateFinancialReport(
  companyId: number,
  startDateInSecond: number,
  endDateInSecond: number,
  reportSheetType: ReportSheetType
) {
  // Info: (20240710 - Murky) Financial Report Generator
  let sheetDisplay: IAccountForSheetDisplay[] = [];
  try {
    const financialReportGenerator = await FinancialReportGeneratorFactory.createGenerator(
      companyId,
      startDateInSecond,
      endDateInSecond,
      reportSheetType
    );

    sheetDisplay = await financialReportGenerator.generateFinancialReportArray();
  } catch (error) {
    // Deprecate: (20240710 - Murky) console.error
    // eslint-disable-next-line no-console
    console.error(error);
  }
  return sheetDisplay;
}

export async function generateReportName(
  companyId: number,
  reportSheetType: ReportSheetType,
  reportLanguage: string,
  endDateInSecond: number
) {
  const company = await getCompanyById(companyId);
  const reportSheetForDisplay = ReportSheetTypeDisplayMap[reportSheetType];
  const dateString = timestampToString(endDateInSecond).date.replace(/-/g, '');
  const reportName = `${company?.code}_${reportSheetForDisplay}_${reportLanguage}_${dateString}`;
  return reportName;
}

export async function generateReportIfNotExist(
  companyId: number,
  projectId: number | null,
  startDateInSecond: number,
  endDateInSecond: number,
  reportSheetType: ReportSheetType,
  reportLanguageString: string
) {
  // Info: (20240710 - Murky) Check if the report is already generated
  let reportId = await getReportIdByFromTo(
    companyId,
    startDateInSecond,
    endDateInSecond,
    reportSheetType
  );
  if (!reportId) {
    const reportContentJSON = await generateFinancialReport(
      companyId,
      startDateInSecond,
      endDateInSecond,
      reportSheetType
    );
    const name = await generateReportName(
      companyId,
      reportSheetType,
      reportLanguageString,
      endDateInSecond
    );
    const reportCreated = await createReport(
      companyId,
      projectId,
      name,
      startDateInSecond,
      endDateInSecond,
      ReportType.FINANCIAL,
      reportSheetType,
      reportContentJSON,
      ProgressStatus.SUCCESS
    );
    reportId = reportCreated?.id || -1;
  }
  return reportId;
}

export async function handlePostRequest(companyId: number, req: NextApiRequest) {
  const {
    projectIdNumber,
    reportLanguageString,
    reportSheetType,
    startDateInSecond,
    endDateInSecond,
    lastPeriodStartDateInSecond,
    lastPeriodEndDateInSecond,
    financialOrAnalysisString,
  } = formatPostRequestQuery(req);

  let thisPeriodReportId = -1;
  let lastPeriodReportId = -1;
  switch (financialOrAnalysisString) {
    case 'financial': {
      thisPeriodReportId = await generateReportIfNotExist(
        companyId,
        projectIdNumber,
        startDateInSecond,
        endDateInSecond,
        reportSheetType,
        reportLanguageString
      );
      lastPeriodReportId = await generateReportIfNotExist(
        companyId,
        projectIdNumber,
        lastPeriodStartDateInSecond,
        lastPeriodEndDateInSecond,
        reportSheetType,
        reportLanguageString
      );
      break;
    }
    case 'analysis': {
      // ToDo: (20240710 - Murky) Analysis Report Generator
      break;
    }
    default: {
      break;
    }
  }
  return { thisPeriodReportId, lastPeriodReportId };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<{ [key: string]: number } | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: { [key: string]: number } | null = null;
  try {
    const session = await getSession(req, res);
    const { companyId } = session;

    // ToDo: (20240703 - Murky) Need to check Auth
    switch (req.method) {
      case 'POST': {
        const { thisPeriodReportId, lastPeriodReportId } = await handlePostRequest(companyId, req);
        payload = { thisPeriodReportId, lastPeriodReportId };
        statusMessage = STATUS_MESSAGE.CREATED;
        break;
      }
      default: {
        break;
      }
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
  }
  const { httpCode, result } = formatApiResponse<{ [key: string]: number } | null>(
    statusMessage,
    payload
  );
  res.status(httpCode).json(result);
}
