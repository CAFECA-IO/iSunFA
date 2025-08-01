import { ReportSheetType, ReportType } from '@/constants/report';
import { IPaginatedReport, IReport, IReportIncludeCompanyProject } from '@/interfaces/report';
import { isReportSheetType, isReportType } from '@/lib/utils/type_guard/report';

export function formatIReport(report: IReportIncludeCompanyProject): IReport {
  const type: ReportType = isReportType(report.reportType)
    ? report.reportType
    : ReportType.FINANCIAL;
  const reportType: ReportSheetType = isReportSheetType(report.reportType)
    ? report.reportType
    : ReportSheetType.BALANCE_SHEET;
  const reportContent = JSON.parse(report.content as string);
  const { content, otherInfo, ...rest } = reportContent;
  // Info: (20240729 - Murky) Bad code, not robust
  const project = report.project
    ? {
        id: report.project.id.toString(),
        name: report.project.name,
        code: report.project.name,
      }
    : null;

  const formattedReport: IReport = {
    id: report.id,
    accountBookId: report.accountBookId,
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
    project,
    reportLink: report.reportLink || '',
    downloadLink: report.downloadLink || '',
    blockChainExplorerLink: report.blockChainExplorerLink || '',
    evidenceId: report.evidenceId || '',
    content: content ?? rest,
    otherInfo,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  };
  return formattedReport;
}

export function formatIPaginatedReport(reports: {
  data: IReportIncludeCompanyProject[];
  page: number;
  totalPages: number;
  totalCount: number; // 總數量
  pageSize: number; // 每頁顯示的項目數量
  hasNextPage: boolean; // 是否有下一頁
  hasPreviousPage: boolean; // 是否有上一頁
  sortBy: string; // 排序欄位
  sortOrder: string; // 排序方式
}) {
  const formattedReports = reports.data.map((report) => formatIReport(report));
  const paginatedReport: IPaginatedReport = {
    data: formattedReports,
    page: reports.page,
    totalPages: reports.totalPages,
    totalCount: reports.totalCount,
    pageSize: reports.pageSize,
    hasNextPage: reports.hasNextPage,
    hasPreviousPage: reports.hasPreviousPage,
    sort: [
      {
        sortBy: reports.sortBy,
        sortOrder: reports.sortOrder,
      },
    ],
  };
  return paginatedReport;
}
