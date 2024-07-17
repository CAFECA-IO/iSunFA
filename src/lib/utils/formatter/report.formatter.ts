import { ReportSheetType, ReportSheetTypeFinancialFinancialReportTypesKeyMapping, ReportType } from "@/constants/report";
import { IReport, IReportIncludeProject } from "@/interfaces/report";
import { Report } from "@prisma/client";
import { isReportSheetType, isReportType } from "@/lib/utils/type_guard/report";
import { IAccountForSheetDisplay } from "@/interfaces/accounting_account";
import { isIAccountForSheetDisplayArray } from "@/lib/utils/type_guard/account";
import { IPendingReportItem, IGeneratedReportItem, IBasicReportItem } from "@/interfaces/report_item";

export function formatIReport(report: Report): IReport {
  const type: ReportType = isReportType(report.reportType)
    ? report.reportType
    : ReportType.FINANCIAL;
  const reportType: ReportSheetType = isReportSheetType(report.reportType)
    ? report.reportType
    : ReportSheetType.BALANCE_SHEET;
  const reportContent = JSON.parse(report.content as string);
  const content: IAccountForSheetDisplay[] = isIAccountForSheetDisplayArray(reportContent)
    ? reportContent
    : [];
  const formattedReport: IReport = {
    id: report.id,
    companyId: report.companyId,
    tokenContract: report.tokenContract || '',
    tokenId: report.tokenId || '',
    name: report.name,
    from: report.from,
    to: report.to,
    type,
    reportType,
    status: report.status,
    remainingSeconds: report.remainingSeconds || 0,
    paused: report.paused || false,
    projectId: report.projectId,
    reportLink: report.reportLink || '',
    downloadLink: report.downloadLink || '',
    blockChainExplorerLink: report.blockChainExplorerLink || '',
    evidenceId: report.evidenceId || '',
    content,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  };
  return formattedReport;
}

export function formatIBasicReportItem(report: IReportIncludeProject): IBasicReportItem {
    const id = report.id.toString();
    const type = report.reportType as ReportType;
    const reportSheetType = report.reportType as ReportSheetType;
    const reportType = ReportSheetTypeFinancialFinancialReportTypesKeyMapping[reportSheetType];
    const reportItem: IBasicReportItem = {
        id,
        name: report.name,
        createdTimestamp: report.createdAt,
        period: {
            startTimestamp: report.from,
            endTimestamp: report.to,
        },
        type,
        reportType
    };
    return reportItem;
}

export function formatIPendingReportItem(report: IReportIncludeProject): IPendingReportItem {
    const basicReportItem = formatIBasicReportItem(report);
    const reportItem: IPendingReportItem = {
        ...basicReportItem,
        remainingSeconds: report.remainingSeconds || 0,
        paused: report.paused || false,
    };
    return reportItem;
}

export function formatIGeneratedReportItem(report: IReportIncludeProject): IGeneratedReportItem {
    const basicReportItem = formatIBasicReportItem(report);
    const project = report.project ? {
        id: report.project.id.toString(),
        name: report.project.name,
        code: report.project.name,
    } : null;
    const reportItem: IGeneratedReportItem = {
        ...basicReportItem,
        project,
        reportLinkId: report.reportLink || '',
        downloadLink: report.downloadLink || '',
        blockchainExplorerLink: report.blockChainExplorerLink || '',
        evidenceId: report.evidenceId || '',
    };
    return reportItem;
}
