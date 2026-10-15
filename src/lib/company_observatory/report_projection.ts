import {
  BUSINESS_MONITOR_CAPITAL_RANGE,
  BUSINESS_MONITOR_CAPITAL_THRESHOLD,
} from "@/constants/business_monitor";
import {
  COMPANY_PAID_IN_CAPITAL_KEYS,
  OBSERVATORY_REPORT_PATH_PREFIX,
  OBSERVATORY_REPORT_TITLE_SUFFIX,
  OBSERVATORY_SOURCES,
  ObservatorySource,
  TWSE_INDUSTRY_NAME,
} from "@/constants/company_observatory";
import { IObservatoryReportMetadata } from "@/interfaces/company_observatory";
import { observatoryReportMetadataSchema } from "@/validators/company_observatory";

/**
 * Info: (20261015 - Luphia) 把觀測站文件投影成企業觀測站頁面的 `Report` 列。純函數。
 *
 * 每個欄位都來自來源的結構化資料或 `Company` 字典，以固定規則轉換：
 * 產業別代碼查表、實收資本額以 BigInt 比對級距、揭露期間與確信機構原樣照抄。
 * 來源沒有提供的欄位一律留空字串，不推測、不補值（零捏造）。
 */

export interface IObservatoryReportPath {
  stockId: string;
  year: number;
  source: ObservatorySource;
}

export interface IObservatoryReportRecord {
  companyName: string;
  title: string;
  reportYear: string;
  period: string;
  industry: string;
  capital: string;
  verificationAgency: string;
  verificationStandards: string;
  assuranceAgency: string;
  assuranceStandards: string;
  isVerifiedByThirdParty: boolean;
  pdfPath: string;
}

export interface IObservatoryReportInput extends IObservatoryReportPath {
  companyName: string;
  industryCode: string | null;
  companyMetadata: unknown;
  documentMetadata: unknown;
}

export function observatoryReportPath(path: IObservatoryReportPath): string {
  return [
    OBSERVATORY_REPORT_PATH_PREFIX,
    path.stockId,
    String(path.year),
    path.source,
  ].join("/");
}

export function parseObservatoryReportPath(
  pdfPath: string,
): IObservatoryReportPath | null {
  const [prefix, stockId, yearText, source, ...rest] = pdfPath.split("/");
  if (prefix !== OBSERVATORY_REPORT_PATH_PREFIX || rest.length > 0) return null;
  if (!stockId || !/^\d{4}$/.test(yearText ?? "")) return null;
  if (!(OBSERVATORY_SOURCES as readonly string[]).includes(source ?? "")) {
    return null;
  }
  return {
    stockId,
    year: Number(yearText),
    source: source as ObservatorySource,
  };
}

export function industryNameOf(code: string | null): string {
  if (!code) return "";
  return TWSE_INDUSTRY_NAME[code.trim()] ?? "";
}

// Info: (20261015 - Luphia) 從 Company.metadata（證交所／櫃買中心原始列）取實收資本額；只接受純數字字串
export function paidInCapitalOf(companyMetadata: unknown): string | null {
  if (typeof companyMetadata !== "object" || companyMetadata === null) {
    return null;
  }
  const record = companyMetadata as Record<string, unknown>;
  for (const key of COMPANY_PAID_IN_CAPITAL_KEYS) {
    const value = record[key];
    if (typeof value === "string" && /^\d+$/.test(value.trim())) {
      return value.trim();
    }
  }
  return null;
}

export function capitalRangeOf(paidInCapital: string | null): string {
  if (paidInCapital === null) return "";
  const amount = BigInt(paidInCapital);
  if (amount >= BUSINESS_MONITOR_CAPITAL_THRESHOLD.TEN_BILLION) {
    return BUSINESS_MONITOR_CAPITAL_RANGE.OVER_10B;
  }
  if (amount >= BUSINESS_MONITOR_CAPITAL_THRESHOLD.FIVE_BILLION) {
    return BUSINESS_MONITOR_CAPITAL_RANGE.FROM_5B_TO_10B;
  }
  if (amount >= BUSINESS_MONITOR_CAPITAL_THRESHOLD.ONE_BILLION) {
    return BUSINESS_MONITOR_CAPITAL_RANGE.FROM_1B_TO_5B;
  }
  return BUSINESS_MONITOR_CAPITAL_RANGE.UNDER_1B;
}

export function parseReportMetadata(
  value: unknown,
): IObservatoryReportMetadata {
  const parsed = observatoryReportMetadataSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : {};
}

export function buildObservatoryReport(
  input: IObservatoryReportInput,
): IObservatoryReportRecord {
  const metadata = parseReportMetadata(input.documentMetadata);
  const verificationAgency = metadata.verificationAgency ?? "";
  const assuranceAgency = metadata.assuranceAgency ?? "";
  return {
    companyName: input.companyName,
    title: `${input.year} ${OBSERVATORY_REPORT_TITLE_SUFFIX[input.source]}`,
    reportYear: String(input.year),
    period: metadata.period ?? "",
    industry: industryNameOf(input.industryCode),
    capital: capitalRangeOf(paidInCapitalOf(input.companyMetadata)),
    verificationAgency,
    verificationStandards: metadata.verificationStandards ?? "",
    assuranceAgency,
    assuranceStandards: metadata.assuranceStandards ?? "",
    isVerifiedByThirdParty: verificationAgency !== "" || assuranceAgency !== "",
    pdfPath: observatoryReportPath(input),
  };
}
