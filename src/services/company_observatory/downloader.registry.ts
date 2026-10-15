import { ObservatorySource } from "@/constants/company_observatory";
import { IObservatoryDownloader } from "@/interfaces/company_observatory";
import { gcisRegistrationDownloader } from "@/services/company_observatory/gcis_registration.downloader";
import { mopsFinancialReportDownloader } from "@/services/company_observatory/mops_financial_report.downloader";
import { esgReportDownloader } from "@/services/company_observatory/esg_report.downloader";
import { ghgInventoryDownloader } from "@/services/company_observatory/ghg_inventory.downloader";

// Info: (20261015 - Luphia) 來源 → 下載器；新增來源時 Record 型別會強制這裡補上
export const OBSERVATORY_DOWNLOADERS: Record<
  ObservatorySource,
  IObservatoryDownloader
> = {
  GCIS_REGISTRATION: gcisRegistrationDownloader,
  MOPS_FINANCIAL_REPORT: mopsFinancialReportDownloader,
  ESG_REPORT: esgReportDownloader,
  GHG_INVENTORY: ghgInventoryDownloader,
};
