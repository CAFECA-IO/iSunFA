import { ReportSheetType, ReportType } from "@/constants/report";
import { IReport } from "@/interfaces/report";
import { Report } from "@prisma/client";
import { isReportSheetType, isReportType } from "@/lib/utils/type_guard/report";
import { IAccountForSheetDisplay } from "@/interfaces/accounting_account";
import { isIAccountForSheetDisplayArray } from "@/lib/utils/type_guard/account";

export function formatIReport(report: Report): IReport {
    const type: ReportType = isReportType(report.reportType) ? report.reportType : ReportType.FINANCIAL;
    const reportType: ReportSheetType = isReportSheetType(report.reportType) ? report.reportType : ReportSheetType.BALANCE_SHEET;
    const reportContent = JSON.parse(report.content as string);
    const content: IAccountForSheetDisplay[] = (isIAccountForSheetDisplayArray(reportContent)) ? reportContent : [];
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
