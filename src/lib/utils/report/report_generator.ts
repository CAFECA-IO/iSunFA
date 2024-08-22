import { ReportSheetType } from "@/constants/report";
import { IReportContent } from "@/interfaces/report";

export default abstract class ReportGenerator {
  protected companyId: number;

  protected startDateInSecond: number;

  protected endDateInSecond: number;

  protected reportSheetType: ReportSheetType;

  constructor(companyId: number, startDateInSecond: number, endDateInSecond: number, reportSheetType: ReportSheetType) {
    this.companyId = companyId;
    this.startDateInSecond = startDateInSecond;
    this.endDateInSecond = endDateInSecond;
    this.reportSheetType = reportSheetType;
  }

  abstract generateReport(): Promise<IReportContent>;
}
