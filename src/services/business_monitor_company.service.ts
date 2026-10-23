import { Company, ObservatoryDocument, Prisma } from "@/generated";
import { companyRepo } from "@/repositories/company.repo";
import { reportRepo } from "@/repositories/report.repo";
import { observatoryDocumentRepo } from "@/repositories/observatory_document.repo";
import { companyFinancialFactRepo } from "@/repositories/company_financial_fact.repo";
import {
  BUSINESS_MONITOR_DOCUMENT_STATUS,
  BUSINESS_MONITOR_MANUAL_IMPORT_SOURCE,
  BUSINESS_MONITOR_TAX_ID_PATTERN,
  BusinessMonitorDocumentStatus,
} from "@/constants/business_monitor";
import {
  OBSERVATORY_DOCUMENT_STATUS,
  OBSERVATORY_REPORT_PATH_PREFIX,
  OBSERVATORY_SOURCE,
  ObservatorySource,
  TWSE_INDUSTRY_NAME,
} from "@/constants/company_observatory";
import {
  IBusinessMonitorCompany,
  IBusinessMonitorCompanyList,
  IBusinessMonitorCompanyProfile,
  IBusinessMonitorIndustry,
  ICompanyLibraryDocument,
  ICompanyLibraryYear,
  ICompanyRegistration,
  IEmissionYear,
} from "@/interfaces/business_monitor";
import { buildFinancialPeriods } from "@/lib/business_monitor/financial_summary";
import { withEmissionChanges } from "@/lib/business_monitor/emission_summary";
import { parseGhgInventoryText } from "@/lib/company_observatory/ghg_inventory_text";
import { IBusinessMonitorCompanyListQuery } from "@/validators";
import { taiVariantsOf } from "@/lib/business_monitor/scope";
import {
  observatoryReportPath,
  parseReportMetadata,
} from "@/lib/company_observatory/report_projection";
import { parseRegistrationText } from "@/lib/company_observatory/registration_text";
import {
  createFileStorage,
  IObservatoryStorage,
} from "@/lib/company_observatory/storage";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { logger } from "@/lib/utils/logger";

/**
 * Info: (20261022 - Luphia) 企業觀測站「以公司為中心」的讀取：公司搜尋、依產業瀏覽、公司頁。
 *
 * 公司清單讀唯讀字典 `Company`；報告庫讀 `ObservatoryDocument`（含尚未下載、來源未公布的），
 * 再對上已發布的 `Report` 取得可下載的 id。這裡沒有任何 LLM 呼叫，全部是查表與固定規則。
 */

// Info: (20261022 - Luphia) 觀測站內部狀態 → 給使用者看的四種狀態
const DOCUMENT_STATUS_OF: Record<string, BusinessMonitorDocumentStatus> = {
  [OBSERVATORY_DOCUMENT_STATUS.INDEXED]:
    BUSINESS_MONITOR_DOCUMENT_STATUS.AVAILABLE,
  [OBSERVATORY_DOCUMENT_STATUS.DOWNLOADED]:
    BUSINESS_MONITOR_DOCUMENT_STATUS.PENDING,
  [OBSERVATORY_DOCUMENT_STATUS.PENDING]:
    BUSINESS_MONITOR_DOCUMENT_STATUS.PENDING,
  [OBSERVATORY_DOCUMENT_STATUS.NOT_AVAILABLE]:
    BUSINESS_MONITOR_DOCUMENT_STATUS.NOT_PUBLISHED,
  [OBSERVATORY_DOCUMENT_STATUS.FAILED]: BUSINESS_MONITOR_DOCUMENT_STATUS.FAILED,
  [OBSERVATORY_DOCUMENT_STATUS.DEAD]: BUSINESS_MONITOR_DOCUMENT_STATUS.FAILED,
};

function industryNameOf(code: string | null): string {
  if (!code) return "";
  return TWSE_INDUSTRY_NAME[code.trim()] ?? "";
}

function toSummary(
  company: Company,
  documentCount: number,
): IBusinessMonitorCompany {
  return {
    stockId: company.stockId,
    name: company.name,
    abbreviation: company.abbreviation,
    industryCode: company.industry,
    industryName: industryNameOf(company.industry),
    marketType: company.marketType,
    documentCount,
  };
}

// Info: (20261022 - Luphia) 搜尋字 → 查詢條件：整串統編精確比對；其餘比對代號開頭、全名與簡稱（含台／臺異體）
function searchWhere(q: string | undefined): Prisma.CompanyWhereInput {
  if (!q) return {};
  if (BUSINESS_MONITOR_TAX_ID_PATTERN.test(q)) return { taxId: q };
  const variants = taiVariantsOf(q);
  return {
    OR: [
      { stockId: { startsWith: q.toUpperCase() } },
      ...variants.map((v) => ({ name: { contains: v } })),
      ...variants.map((v) => ({ abbreviation: { contains: v } })),
    ],
  };
}

class BusinessMonitorCompanyService {
  private readonly storage: IObservatoryStorage = createFileStorage();

  async listIndustries(): Promise<IBusinessMonitorIndustry[]> {
    const groups = await companyRepo.countActiveByIndustry();
    return groups
      .filter((group): group is { industry: string; count: number } =>
        Boolean(group.industry),
      )
      .map((group) => ({
        code: group.industry,
        // Info: (20261022 - Luphia) 查不到名稱的代碼原樣顯示，不自行命名
        name: industryNameOf(group.industry) || group.industry,
        companyCount: group.count,
      }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }

  async listCompanies(
    query: IBusinessMonitorCompanyListQuery,
  ): Promise<IBusinessMonitorCompanyList> {
    const where: Prisma.CompanyWhereInput = {
      isActive: true,
      ...(query.industry ? { industry: query.industry } : {}),
      ...searchWhere(query.q),
    };
    const [total, companies] = await Promise.all([
      companyRepo.count({ where }),
      companyRepo.findMany({
        where,
        orderBy: { stockId: "asc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    const counts = await observatoryDocumentRepo.countIndexedByStockIds(
      companies.map((company) => company.stockId),
    );
    return {
      companies: companies.map((company) =>
        toSummary(company, counts.get(company.stockId) ?? 0),
      ),
      total,
      totalPages: Math.ceil(total / query.pageSize),
    };
  }

  async getCompanyProfile(
    stockId: string,
  ): Promise<IBusinessMonitorCompanyProfile> {
    const company = await companyRepo.findUnique({ where: { stockId } });
    if (!company) {
      const def = API_ERRORS.NF_BUSINESS_MONITOR_COMPANY;
      throw new ApiError(def.code, def.message, def.status);
    }

    const [documents, observatoryReports, manualReports, financialFacts] =
      await Promise.all([
        observatoryDocumentRepo.listByStockId(stockId),
        reportRepo.findMany({
          where: {
            pdfPath: {
              startsWith: `${OBSERVATORY_REPORT_PATH_PREFIX}/${stockId}/`,
            },
          },
        }),
        // Info: (20261022 - Luphia) 手動匯入的舊報告沒有公司代號，只能以登記全名對應
        reportRepo.findMany({
          where: {
            companyName: company.name,
            NOT: {
              pdfPath: { startsWith: `${OBSERVATORY_REPORT_PATH_PREFIX}/` },
            },
          },
        }),
        companyFinancialFactRepo.findByStockId(stockId),
      ]);
    const reportIdByPath = new Map(
      observatoryReports.map((report) => [report.pdfPath, report.id]),
    );
    const reportIdOf = (doc: ObservatoryDocument): number | null =>
      reportIdByPath.get(
        observatoryReportPath({
          stockId: doc.stockId,
          year: doc.year,
          source: doc.source as ObservatorySource,
        }),
      ) ?? null;

    const registrationDocs = documents.filter(
      (doc) => doc.source === OBSERVATORY_SOURCE.GCIS_REGISTRATION,
    );
    const registration = await this.readRegistration(
      registrationDocs,
      reportIdOf,
    );

    const libraryDocs: ICompanyLibraryDocument[] = [
      ...documents
        .filter((doc) => doc.source !== OBSERVATORY_SOURCE.GCIS_REGISTRATION)
        .map((doc) => {
          const reportId = reportIdOf(doc);
          const status =
            DOCUMENT_STATUS_OF[doc.status] ??
            BUSINESS_MONITOR_DOCUMENT_STATUS.PENDING;
          return {
            source: doc.source,
            title: doc.title ?? "",
            year: doc.year,
            // Info: (20261022 - Luphia) 已索引但還沒發布成 Report 的，下載不了，仍算排程中
            status:
              status === BUSINESS_MONITOR_DOCUMENT_STATUS.AVAILABLE &&
              reportId === null
                ? BUSINESS_MONITOR_DOCUMENT_STATUS.PENDING
                : status,
            reportId,
            period: parseReportMetadata(doc.metadata).period ?? "",
            sourceUrl: doc.sourceUrl,
            retrievedAt: doc.downloadedAt?.toISOString() ?? null,
          };
        }),
      ...manualReports
        .filter((report) => /^\d{4}$/.test(report.reportYear))
        .map((report) => ({
          source: BUSINESS_MONITOR_MANUAL_IMPORT_SOURCE,
          title: report.title,
          year: Number(report.reportYear),
          status: BUSINESS_MONITOR_DOCUMENT_STATUS.AVAILABLE,
          reportId: report.id,
          period: report.period,
          sourceUrl: null,
          retrievedAt: report.createdAt.toISOString(),
        })),
    ];

    const counts = await observatoryDocumentRepo.countIndexedByStockIds([
      stockId,
    ]);
    return {
      company: {
        ...toSummary(company, counts.get(stockId) ?? 0),
        taxId: company.taxId,
        listingDate: company.listingDate,
      },
      registration,
      library: groupByYear(libraryDocs),
      financials: buildFinancialPeriods(financialFacts),
      emissions: await this.readEmissions(
        documents.filter(
          (doc) => doc.source === OBSERVATORY_SOURCE.GHG_INVENTORY,
        ),
        reportIdOf,
      ),
    };
  }

  /**
   * Info: (20261023 - Luphia) 各揭露年度的範疇一～三：讀已下載的溫室氣體盤查文字，原樣取出。
   * 讀不到的年度略過（只記 log），不讓整個公司頁失敗。
   */
  private async readEmissions(
    docs: ObservatoryDocument[],
    reportIdOf: (doc: ObservatoryDocument) => number | null,
  ): Promise<IEmissionYear[]> {
    const years: IEmissionYear[] = [];
    for (const doc of docs) {
      if (!doc.filePath) continue;
      try {
        const text = (await this.storage.read(doc.filePath)).toString("utf8");
        const scopes = parseGhgInventoryText(text);
        if (scopes.length > 0) {
          years.push({ year: doc.year, reportId: reportIdOf(doc), scopes });
        }
      } catch (error) {
        logger.warn("business monitor emissions unreadable", {
          stockId: doc.stockId,
          year: doc.year,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return withEmissionChanges(years);
  }

  /**
   * Info: (20261022 - Luphia) 最新一份讀得到的公司登記。登記是現況快照：
   * 以最後一次向商業司取得的時間標示，不屬於任何資料年度。
   */
  private async readRegistration(
    docs: ObservatoryDocument[],
    reportIdOf: (doc: ObservatoryDocument) => number | null,
  ): Promise<ICompanyRegistration | null> {
    const latest = docs
      .filter((doc) => doc.filePath && doc.downloadedAt)
      .sort((a, b) => b.year - a.year)[0];
    if (!latest?.filePath || !latest.downloadedAt) return null;
    try {
      const text = (await this.storage.read(latest.filePath)).toString("utf8");
      return {
        updatedAt: latest.downloadedAt.toISOString(),
        reportId: reportIdOf(latest),
        ...parseRegistrationText(text),
      };
    } catch (error) {
      logger.warn("business monitor registration unreadable", {
        stockId: latest.stockId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }
}

// Info: (20261022 - Luphia) 報告庫依資料年度分組，新的在前；同一年內依來源排序，順序固定
function groupByYear(docs: ICompanyLibraryDocument[]): ICompanyLibraryYear[] {
  const byYear = new Map<number, ICompanyLibraryDocument[]>();
  for (const doc of docs) {
    const list = byYear.get(doc.year) ?? [];
    list.push(doc);
    byYear.set(doc.year, list);
  }
  return Array.from(byYear.entries())
    .sort(([a], [b]) => b - a)
    .map(([year, documents]) => ({
      year,
      documents: documents.sort((a, b) => a.source.localeCompare(b.source)),
    }));
}

export const businessMonitorCompanyService =
  new BusinessMonitorCompanyService();
