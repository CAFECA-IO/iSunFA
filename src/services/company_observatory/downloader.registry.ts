import {
  MOPS_SEASON_OF_SOURCE,
  OBSERVATORY_SOURCE,
  ObservatorySource,
} from "@/constants/company_observatory";
import { IObservatoryDownloader } from "@/interfaces/company_observatory";
import { gcisRegistrationDownloader } from "@/services/company_observatory/gcis_registration.downloader";
import {
  createMopsFinancialReportDownloader,
  mopsFinancialReportDownloader,
} from "@/services/company_observatory/mops_financial_report.downloader";
import { esgReportDownloader } from "@/services/company_observatory/esg_report.downloader";
import { ghgInventoryDownloader } from "@/services/company_observatory/ghg_inventory.downloader";

// Info: (20261015 - Luphia) 來源 → 下載器；新增來源時 Record 型別會強制這裡補上
export const OBSERVATORY_DOWNLOADERS: Record<
  ObservatorySource,
  IObservatoryDownloader
> = {
  GCIS_REGISTRATION: gcisRegistrationDownloader,
  MOPS_FINANCIAL_REPORT: mopsFinancialReportDownloader,
  // Info: (20261023 - Luphia) 第一～三季：同一支 MOPS 電子書流程，季別不同
  MOPS_FINANCIAL_REPORT_Q1: createMopsFinancialReportDownloader(
    OBSERVATORY_SOURCE.MOPS_FINANCIAL_REPORT_Q1,
    MOPS_SEASON_OF_SOURCE.MOPS_FINANCIAL_REPORT_Q1,
  ),
  MOPS_FINANCIAL_REPORT_Q2: createMopsFinancialReportDownloader(
    OBSERVATORY_SOURCE.MOPS_FINANCIAL_REPORT_Q2,
    MOPS_SEASON_OF_SOURCE.MOPS_FINANCIAL_REPORT_Q2,
  ),
  MOPS_FINANCIAL_REPORT_Q3: createMopsFinancialReportDownloader(
    OBSERVATORY_SOURCE.MOPS_FINANCIAL_REPORT_Q3,
    MOPS_SEASON_OF_SOURCE.MOPS_FINANCIAL_REPORT_Q3,
  ),
  ESG_REPORT: esgReportDownloader,
  GHG_INVENTORY: ghgInventoryDownloader,
};
