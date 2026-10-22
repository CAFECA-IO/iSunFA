import { reportRepo } from "@/repositories/report.repo";
import { companyRepo } from "@/repositories/company.repo";
import { observatoryDocumentRepo } from "@/repositories/observatory_document.repo";
import { lanceDBService } from "@/services/lancedb.service";
import { runBilledCarbonTask } from "@/services/carbon_billing.service";
import { ILanceDBRow } from "@/interfaces/lance_db";
import {
  IAIChatScope,
  IAIResponse,
  IReport,
  IReportFile,
} from "@/interfaces/business_monitor";
import { IBusinessMonitorChatScope } from "@/validators";
import { detectYears } from "@/lib/business_monitor/scope";
import { COMPANY_ALIASES } from "@/constants/company";
import { BILLABLE_FEATURE_CODE } from "@/constants/subscription_quota";
import { BUSINESS_MONITOR_FILE_CONTENT_TYPE } from "@/constants/business_monitor";
import {
  BUSINESS_MONITOR_LEGACY_PDF_DIR,
  OBSERVATORY_CONTENT_TYPE,
  OBSERVATORY_PDF_SOURCES,
} from "@/constants/company_observatory";
import { IObservatoryVectorFilter } from "@/interfaces/company_observatory";
import {
  IObservatoryScoredRow,
  observatoryVectorRepo,
} from "@/repositories/observatory_vector.repo";
import {
  IObservatoryReportPath,
  observatoryReportPath,
  parseObservatoryReportPath,
} from "@/lib/company_observatory/report_projection";
import {
  buildObservatoryFilter,
  industryNameOfFilter,
} from "@/lib/company_observatory/business_monitor_bridge";
import { createOllamaEmbedder } from "@/lib/company_observatory/embedder";
import { reciprocalRankFusion } from "@/lib/company_observatory/rank_fusion";
import { OBSERVATORY_RETRIEVAL_CANDIDATES } from "@/constants/company_observatory";
import {
  createFileStorage,
  IObservatoryStorage,
} from "@/lib/company_observatory/storage";
import {
  buildEvidenceContext,
  IEvidence,
  resolveCitations,
} from "@/lib/business_monitor/citations";
import { ollamaGenerate } from "@/lib/llm/ollama_generate";
import { API_ERRORS, ApiError, IErrorDef } from "@/lib/utils/error_dictionary";
import { logger } from "@/lib/utils/logger";

// Info: (20260702 - Julian) 查詢關鍵字
export const QUERY_KEYWORDS: Record<string, string[]> = {
  永續報告書: ["ESG", "永續", "CSR", "碳排放", "節能減碳", "綠色轉型", "環境"],
  財務報告: ["年報", "財報", "annual report", "報表", "財務"],
};

// Info: (20260701 - Julian) Ollama 相關參數
const OLLAMA_HOST = "http://localhost:11434";
const LLM_MODEL = "gemma4:e4b";
/**
 * Info: (20261015 - Luphia) 查詢向量與切塊向量必須出自同一個模型，所以共用企業觀測站的嵌入器
 * （模型見 OBSERVATORY_EMBED_MODEL），不再各自寫死模型名稱。
 */
const queryEmbedder = createOllamaEmbedder();

const LANCE_DB_CHAT_LIMIT = 3;

interface IChatResponse {
  reports: IReport[];
  total: number;
  totalPages: number;
  aiResponse: IAIResponse;
  scope: IAIChatScope;
  from: "service" | "LLM";
}

// Info: (20261022 - Luphia) 錯誤一律以字典定義包裝，不讓原始錯誤噴到前端
function toApiError(def: IErrorDef): ApiError {
  return new ApiError(def.code, def.message, def.status);
}

// Info: (20261022 - Luphia) 下載檔名不能含路徑與保留字元；其餘（含中文）原樣保留
function safeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|\r\n]+/g, "_").trim();
}

class BusinessMonitorService {
  // Info: (20261022 - Luphia) 原始檔來源：觀測站下載的檔案與手動匯入的 PDF 各一個根目錄
  private readonly observatoryStorage: IObservatoryStorage =
    createFileStorage();
  private readonly legacyPdfStorage: IObservatoryStorage = createFileStorage(
    BUSINESS_MONITOR_LEGACY_PDF_DIR,
  );

  // =========================================================================
  // Info: (20260701 - Julian) AI 諮詢 (RAG Chat)
  // =========================================================================

  /**
   * Info: (20260701 - Julian) AI 諮詢
   * @param question 查詢文字
   * @returns AI 回答
   *
   * Info: (20261022 - Luphia) 改為登入後扣額度（產品拍板 20261022）。
   * 檢索（嵌入 + 向量查詢）不計費，先做；檢索不到任何資料就直接回「找不到」，不收費——
   * 沒有東西可讀時還收錢，等於讓使用者為「我們沒有資料」付費。
   * 有資料才進 `runBilledCarbonTask`：企業觀測站沒有帳本可綁，走個人點數「先收款、失敗退款」那條，
   * 冪等鍵由前端的 clientMessageId 組成，402 付款後重送同一則不會重複扣款。
   */
  async chat(params: {
    userId: string;
    question: string;
    clientMessageId: string;
    scope?: IBusinessMonitorChatScope;
  }): Promise<IChatResponse> {
    const { userId, question, clientMessageId } = params;

    // Info: (20260702 - Julian) 步驟 1：檢索背景知識
    const { matchedReports, metadataContext, evidence, scope } =
      await this.searchContext(question, params.scope);

    // Info: (20260701 - Julian) 處理搜尋結果為空的情況
    if (evidence.length === 0) {
      return {
        reports: [],
        total: 0,
        totalPages: 0,
        aiResponse: {
          answer: "抱歉，根據目前的報告資料，無法找到足夠相關的數據。",
          citations: [],
        },
        scope,
        from: "service",
      };
    }

    const context = [metadataContext, buildEvidenceContext(evidence)]
      .filter(Boolean)
      .join("\n\n=== 報告書內文段落（回答時以 [編號] 標示出處）===\n\n");

    // Info: (20260702 - Julian) 步驟 2：呼叫 LLM 生成回答
    const billed = await runBilledCarbonTask({
      userId,
      channel: undefined,
      featureCode: BILLABLE_FEATURE_CODE.BUSINESS_MONITOR_CHAT,
      idempotencyKey: `business-monitor-chat:${userId}:${clientMessageId}`,
      inputChars: question.length + context.length,
      hasAttachment: false,
      nowSec: Math.floor(Date.now() / 1000),
      run: () => this.generateAnswer(question, context),
    });

    // Info: (20261022 - Luphia) 步驟 3：比對出處編號，移除對不上的編號
    const { answer, citations } = resolveCitations(billed.result, evidence);

    return {
      reports: matchedReports,
      total: matchedReports.length,
      totalPages: 1,
      aiResponse: { answer, citations },
      scope,
      from: "LLM",
    };
  }

  /**
   * Info: (20260702 - Julian) 檢索背景知識 (RAG Retrieval)
   * @param question 查詢文字
   * @returns 匹配的報告與格式化後的 Context
   */
  async searchContext(
    question: string,
    scope?: IBusinessMonitorChatScope,
  ): Promise<{
    matchedReports: IReport[];
    metadataContext: string;
    evidence: IEvidence[];
    scope: IAIChatScope;
  }> {
    // Info: (20260630 - Julian) 使用 AI 諮詢功能前，先偵測公司名稱
    // Info: (20261022 - Luphia) 公司頁帶了 stockId 就以它為準，不再從問題裡猜
    const companyNames = scope?.stockId
      ? [await this.companyNameOf(scope.stockId)]
      : await this.detectCompanies(question);
    console.log(`🤖 [AI Chat] 提問：「${question}」`);
    console.log(`🤖 [AI Chat] 步驟 1：偵測出的公司名稱：`, companyNames);

    // Info: (20260702 - Julian) 偵測問題類型 (永續 vs 財務)
    const reportTypes = await this.detectReportType(question);
    console.log(`🤖 [AI Chat] 步驟 2：偵測出的報告類型：`, reportTypes);

    // Info: (20260702 - Julian) 偵測年份
    // Info: (20261022 - Luphia) 前端送出前已讓使用者看過、可取消的年度；有帶就照用（空陣列代表不限年度）
    const years = scope?.years ?? detectYears(question);
    console.log(`🤖 [AI Chat] 步驟 3：偵測出的年份：`, years);

    // Info: (20260701 - Julian) 將用戶問題轉換為向量
    /**
     * Info: (20261015 - Luphia) 嵌入服務不可用（Ollama 未啟動、模型還沒 pull）時不讓 AI 諮詢整個失敗：
     * 略過向量檢索，只用企業觀測站的全文檢索。
     */
    const queryVector = await this.getQueryEmbedding(question).catch(
      (error: unknown) => {
        console.error("⚠️ [AI Chat] 查詢向量產生失敗，只用全文檢索:", error);
        return null;
      },
    );

    // Info: (20260701 - Julian) 到 LanceDB 進行相似度檢索
    /**
     * Info: (20261015 - Luphia) 手動匯入報告的資料表打不開時（從未匯入、或資料夾殘缺）只記 log，
     * 不讓它擋住企業觀測站的資料；兩張表都沒有結果時，後面自然回「找不到相關數據」。
     */
    const table = await lanceDBService.getTable().catch((error: unknown) => {
      console.error(
        "⚠️ [AI Chat] company_reports 無法開啟，只檢索企業觀測站:",
        error,
      );
      return null;
    });
    let matchedDocs: ILanceDBRow[] = [];

    // Info: (20260702 - Julian) 建立動態過濾條件 (先從 Repo 篩選符合條件的報告 ID)
    const filteredReports = await reportRepo.findByCriteria(
      companyNames,
      reportTypes,
      years,
    );
    /**
     * Info: (20261015 - Luphia) 報告分兩種：手動匯入的（切塊在 company_reports，以 Report.id 對應）
     * 與企業觀測站下載的（切塊在 company_observatory_chunks，以 pdfPath 上的公司代號／年度／來源對應）。
     */
    const observatoryPaths = filteredReports
      .map((r) => parseObservatoryReportPath(r.pdfPath))
      .filter((p): p is IObservatoryReportPath => p !== null);
    const matchedIds = filteredReports
      .filter((r) => parseObservatoryReportPath(r.pdfPath) === null)
      .map((r) => String(r.id));
    const hasFilters =
      companyNames.length > 0 || reportTypes.length > 0 || years.length > 0;
    const observatoryFilter = buildObservatoryFilter(
      companyNames.length > 0,
      observatoryPaths,
      reportTypes,
      years,
    );
    /**
     * Info: (20261022 - Luphia) 回報給畫面的是「實際套用」的年度：有指定公司時，問到的年度若該公司
     * 一份報告都沒有，觀測站檢索不過濾年度（見 buildObservatoryFilter），此時照實顯示「不限年度」，
     * 而不是沿用使用者要求的年度——範疇標籤寫 2023 卻查了全部年份，就是不實的範疇。
     */
    const usedScope: IAIChatScope = {
      companies: companyNames,
      years:
        companyNames.length > 0
          ? (observatoryFilter.years ?? []).map(String)
          : years,
    };

    if (
      hasFilters &&
      matchedIds.length === 0 &&
      observatoryPaths.length === 0
    ) {
      // Info: (20260702 - Julian) 有設定過濾條件但找不到任何報告，直接回傳空結果
      console.log(`⚠️  [AI Chat] 過濾條件未匹配到任何報告，跳過檢索。`);
      return {
        matchedReports: [],
        metadataContext: "",
        evidence: [],
        scope: usedScope,
      };
    }

    if (table && queryVector && (!hasFilters || matchedIds.length > 0)) {
      const combinedWhere =
        matchedIds.length > 0
          ? `reportId IN (${matchedIds.map((id) => `'${id}'`).join(", ")})`
          : "";
      if (combinedWhere) {
        console.log(`🔍 [AI Chat] 使用過濾條件: ${combinedWhere}`);
      }
      // Info: (20260701 - Julian) 執行向量檢索；無指定公司與類型時不過濾
      // Info: (20261015 - Luphia) 取較多候選，與企業觀測站的結果一起融合排序後才截成 LANCE_DB_CHAT_LIMIT 筆
      let legacyQuery = table
        .vectorSearch(new Float32Array(queryVector))
        .limit(OBSERVATORY_RETRIEVAL_CANDIDATES);
      if (combinedWhere) legacyQuery = legacyQuery.where(combinedWhere);
      // Info: (20261015 - Luphia) 換嵌入模型後、表還沒重建前維度對不上會丟錯，只記 log、沿用觀測站的結果
      matchedDocs = await legacyQuery
        .toArray()
        .then((rows) => rows as unknown as ILanceDBRow[])
        .catch((error: unknown) => {
          console.error(
            "⚠️ [AI Chat] company_reports 向量檢索失敗，略過:",
            error,
          );
          return [];
        });
    }

    if (!hasFilters || observatoryPaths.length > 0) {
      matchedDocs = await this.mergeObservatoryDocs(
        matchedDocs,
        question,
        queryVector,
        observatoryFilter,
      );
    } else {
      matchedDocs = matchedDocs.slice(0, LANCE_DB_CHAT_LIMIT);
    }

    console.log(`✅ [AI Chat] 最終篩選出 ${matchedDocs.length} 筆資料`);

    // Info: (20260701 - Julian) 在呼叫 LLM 之前，先取得關聯的 PostgreSQL Report 記錄，以便注入 metadata 作為 Context
    const matchedReports: IReport[] = [];
    const seenIds = new Set<number>();
    /**
     * Info: (20261022 - Luphia) 每個切塊成為一筆編號證據（[1]、[2]…），帶著頁碼與官方網址。
     * 找不到對應 Report 的切塊不送進提示詞：它沒有可以點回去的出處，引用了也無從查核。
     */
    const evidence: IEvidence[] = [];

    for (const doc of matchedDocs) {
      const reportIdVal = doc.reportId;
      if (!reportIdVal) continue;

      const report: IReport | null = /^\d+$/.test(String(reportIdVal))
        ? await reportRepo.findUnique({
            where: { id: parseInt(String(reportIdVal), 10) },
          })
        : await reportRepo.findUnique({
            where: { pdfPath: String(reportIdVal) },
          });

      if (!report) {
        logger.warn("business monitor chunk has no report", {
          reportId: String(reportIdVal),
        });
        continue;
      }
      if (!seenIds.has(report.id)) {
        seenIds.add(report.id);
        matchedReports.push(report);
      }
      evidence.push({
        index: evidence.length + 1,
        report,
        text: doc.text,
        pageNumber:
          doc.pageNumber !== undefined && doc.pageNumber > 0
            ? doc.pageNumber
            : null,
        sourceUrl: doc.sourceUrl || null,
      });
    }

    /**
     * Info: (20260702 - Julian) 將 SQL 中繼資料 (Metadata) 格式化為結構化背景知識
     * 確保 LLM 能夠直接回答「資本額」等基本資料，並加入寬鬆檢索的提醒標籤
     */
    const reportMetadataContext = matchedReports
      .map((r) => {
        const isYearMatch = years.length === 0 || years.includes(r.reportYear);
        const isTypeMatch =
          reportTypes.length === 0 ||
          reportTypes.some((t) => r.title.includes(t));

        let warnings = "";
        if (!isYearMatch) {
          warnings += ` [⚠️ 注意：年度不匹配，用戶要求 ${years.join("/")}，此為 ${r.reportYear} 年資料]`;
        }
        if (!isTypeMatch) {
          warnings += ` [⚠️ 注意：類型不匹配，用戶要求 ${reportTypes.join("/")}，此為 ${r.title}]`;
        }

        return `【報告書基本資料（中繼資料）】${warnings}
- 公司名稱：${r.companyName}
- 報告書標題：${r.title}
- 報告年度：${r.reportYear}
- 期間：${r.period}
- 產業別：${r.industry}
- 資本額：${r.capital}
- 第三方查驗機構：${r.verificationAgency} (查證標準: ${r.verificationStandards})
- 第三方確信機構：${r.assuranceAgency} (確信標準: ${r.assuranceStandards})
- 是否經第三方確信：${r.isVerifiedByThirdParty ? "是" : "否"}`;
      })
      .join("\n\n");

    return {
      matchedReports,
      metadataContext: reportMetadataContext,
      evidence,
      scope: usedScope,
    };
  }

  /**
   * Info: (20261015 - Luphia) 併入企業觀測站切塊，與手動匯入的切塊以倒數排名融合（RRF）一起取前幾名。
   *
   * 三份候選清單：手動匯入表的向量結果、觀測站的向量結果、觀測站的全文（BM25）結果。
   * RRF 只看名次，向量距離與 BM25 分數尺度不同也能合併；中文專有名詞（範疇一、每股盈餘）
   * 靠全文檢索字面命中，語意相近但用字不同的段落靠向量檢索補上。
   * 觀測站切塊的 reportId 換成它的 pdfPath，後面「依 reportId 找 Report」的流程就不必區分來源。
   * 觀測站任一路檢索失敗（資料表未初始化、全文索引未建）只記 log、沿用其餘結果，不讓整個 AI 諮詢失敗。
   */
  private async mergeObservatoryDocs(
    legacyDocs: ILanceDBRow[],
    question: string,
    queryVector: number[] | null,
    filter: IObservatoryVectorFilter,
  ): Promise<ILanceDBRow[]> {
    const [denseRows, lexicalRows] = await Promise.all([
      queryVector
        ? observatoryVectorRepo
            .search({
              vector: queryVector,
              filter,
              limit: OBSERVATORY_RETRIEVAL_CANDIDATES,
            })
            .catch((error: unknown) => {
              console.error(
                "⚠️ [AI Chat] 企業觀測站向量檢索失敗，略過:",
                error,
              );
              return [];
            })
        : [],
      observatoryVectorRepo
        .searchText({
          query: question,
          filter,
          limit: OBSERVATORY_RETRIEVAL_CANDIDATES,
        })
        .catch((error: unknown) => {
          console.error("⚠️ [AI Chat] 企業觀測站全文檢索失敗，略過:", error);
          return [];
        }),
    ]);
    const toDoc = (row: IObservatoryScoredRow): ILanceDBRow => ({
      id: row.id,
      vector: new Float32Array(0),
      text: row.text,
      reportId: observatoryReportPath({
        stockId: row.stock_id,
        year: Number(row.year),
        source: row.source,
      }),
      companyName: row.company_name,
      // Info: (20261022 - Luphia) 純文字來源（公司登記、溫室氣體）的「頁碼」不是任何文件的頁碼，不帶出去
      pageNumber: OBSERVATORY_PDF_SOURCES.includes(row.source)
        ? Number(row.page_number)
        : undefined,
      sourceUrl: row.source_url || undefined,
      _distance: row._distance,
    });
    return reciprocalRankFusion(
      [legacyDocs, denseRows.map(toDoc), lexicalRows.map(toDoc)],
      (doc) => doc.id,
    ).slice(0, LANCE_DB_CHAT_LIMIT);
  }

  /**
   * Info: (20260702 - Julian) 呼叫 LLM 生成回答 (RAG Generation)
   * @param question 查詢文字
   * @param context 檢索出的背景知識
   * @returns AI 回答
   */
  async generateAnswer(question: string, context: string): Promise<string> {
    // Info: (20260701 - Julian) 撰寫 RAG Prompt
    const systemPrompt = `你是一個專業的企業報告分析師。請嚴格根據下方提供的【參考資料】來回答使用者的【問題】。
規則：
1. 只能根據【參考資料】內的數據與事實回答，切勿憑空捏造或憑空猜測。
2. 如果【參考資料】中找不到精確答案，請先說明您已查閱哪些報告書（例如：『我已為您查閱台灣水泥股份有限公司的 2024 年永續報告書，但參考資料中未提及具體資本額數字...』），並提供參考資料中與該主題最相關的內容，切勿憑空捏造。
3. 如果資料包含表格，請精準解讀表格中的對應欄位。
4. 不需要開場白（例：根據您提供的【參考資料】...），直接回答問題即可。
5. 每一個事實或數字後面，標上它出自哪一段參考資料的編號，例如「範疇一排放量為 123 公噸 CO2e [2]」。只能使用參考資料裡出現過的編號，不要自己編號。

【參考資料】：
${context}

【問題】：
${question}`;

    // Info: (20261022 - Luphia) 經 ollamaGenerate 呼叫：用量回報給計費範圍；Temperature 0（CLAUDE.md §8）
    return ollamaGenerate({
      host: OLLAMA_HOST,
      model: LLM_MODEL,
      prompt: systemPrompt,
      temperature: 0,
    });
  }

  // =========================================================================
  // Info: (20260701 - Julian) 報告書清單 (Reports List & AI Filters)
  // =========================================================================

  /**
   * Info: (20260701 - Julian) 取得報告書清單
   * @param params 查詢參數
   * @returns 報告書清單
   */
  async getReports(params: {
    company?: string;
    industry?: string;
    year?: string;
    page: number;
    pageSize: number;
  }) {
    const { company, industry, year, page, pageSize } = params;

    /**
     * Info: (20261022 - Luphia) 移除 `query` 分支（AI 篩選）與模擬的 500ms 延遲。
     * 那條分支未登入可呼叫、不計費，提示詞還要求 Gemini「利用既有知識」回答永續數據——
     * 也就是請模型憑記憶給數字（違反零捏造與 CLAUDE.md §8）。前端早已改用 /chat，它沒有呼叫端。
     */
    const whereClause: {
      companyName?: { contains: string };
      industry?: { contains: string };
      reportYear?: string;
    } = {};
    if (company) {
      whereClause.companyName = { contains: company };
    }
    if (industry) {
      // Info: (20261015 - Luphia) 篩選送的是 SEMICONDUCTOR 這類鍵，報告存的是「半導體業」這類名稱
      whereClause.industry = { contains: industryNameOfFilter(industry) };
    }
    if (year) {
      whereClause.reportYear = year;
    }

    const total = await reportRepo.count({ where: whereClause });
    const totalPages = Math.ceil(total / pageSize);
    const skip = (page - 1) * pageSize;

    const paginatedReports = await reportRepo.findMany({
      where: whereClause,
      skip: skip,
      take: pageSize,
      orderBy: { reportYear: "desc" },
    });

    return {
      reports: paginatedReports,
      total,
      totalPages,
    };
  }

  // =========================================================================
  // Info: (20260701 - Julian) 取得單一報告書詳細資訊
  // =========================================================================

  /**
   * Info: (20260701 - Julian) 取得單一報告書詳細資訊
   * @param reportIdNumber 報告書 ID
   * @returns 報告書詳細資訊
   */
  async getReportDetail(reportIdNumber: number) {
    const report = await reportRepo.findUnique({
      where: { id: reportIdNumber },
    });

    if (!report) {
      return null;
    }

    // Info: (20260701 - Julian) 找出該公司的所有報告書，並依照年份降序排列
    const companyReports = await reportRepo.findMany({
      where: { companyName: report.companyName },
      orderBy: { reportYear: "desc" },
    });

    // Info: (20260701 - Julian) 找出同產業的其他公司報告
    const industryReports = await reportRepo.findMany({
      where: {
        industry: report.industry,
        companyName: { not: report.companyName },
      },
      orderBy: { reportYear: "desc" },
    });

    return {
      report,
      companyReports,
      industryReports,
    };
  }

  // =========================================================================
  // Info: (20261022 - Luphia) 原始檔下載（取代原本模擬進度的 SSE）
  // =========================================================================

  /**
   * Info: (20261022 - Luphia) 取得報告的原始檔。
   *
   * 觀測站報告（pdfPath = observatory/{代號}/{年度}/{來源}）讀 `ObservatoryDocument.filePath`；
   * 手動匯入的報告讀 `pdfs/` 下的同名檔。檔案不存在或路徑越界一律回「檔案尚未備妥」，
   * 不把檔案系統錯誤原樣丟出去。
   */
  async getReportFile(reportId: number): Promise<IReportFile> {
    const report = await reportRepo.findUnique({ where: { id: reportId } });
    if (!report) throw toApiError(API_ERRORS.NF_BUSINESS_MONITOR_REPORT);

    const observatoryPath = parseObservatoryReportPath(report.pdfPath);
    let storage = this.legacyPdfStorage;
    let relativePath = report.pdfPath;
    let contentType: IReportFile["contentType"] =
      BUSINESS_MONITOR_FILE_CONTENT_TYPE.PDF;

    if (observatoryPath) {
      const doc = await observatoryDocumentRepo.findByKey(observatoryPath);
      if (!doc?.filePath) {
        throw toApiError(API_ERRORS.NF_BUSINESS_MONITOR_REPORT_FILE);
      }
      storage = this.observatoryStorage;
      relativePath = doc.filePath;
      contentType =
        doc.contentType === OBSERVATORY_CONTENT_TYPE.PDF
          ? BUSINESS_MONITOR_FILE_CONTENT_TYPE.PDF
          : BUSINESS_MONITOR_FILE_CONTENT_TYPE.TEXT;
    }

    let body: Buffer;
    try {
      body = await storage.read(relativePath);
    } catch (error) {
      logger.warn("business monitor report file unreadable", {
        reportId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw toApiError(API_ERRORS.NF_BUSINESS_MONITOR_REPORT_FILE);
    }

    const extension =
      contentType === BUSINESS_MONITOR_FILE_CONTENT_TYPE.PDF ? "pdf" : "txt";
    return {
      body,
      contentType,
      fileName: `${safeFileName(`${report.companyName}_${report.title}`)}.${extension}`,
    };
  }

  // =========================================================================
  // Info: (20260701 - Julian) 私有輔助函式
  // =========================================================================

  /**
   * Info: (20260701 - Julian) 比對靜態別名(COMPANY_ALIASES)，回傳對應的企業全稱
   * @param text 待比對的文字（可以是完整提問，或是 LLM 擷取出的單一簡稱）
   * @param isFullQuestion 是否為完整問題比對（為 true 時使用字串包含比對，為 false 時使用精確比對）
   * @returns 匹配到的企業全稱陣列
   */
  private matchStaticAliases(text: string, isFullQuestion = false): string[] {
    const matched = new Set<string>();
    const lowercaseText = text.toLowerCase();

    for (const [fullName, aliases] of Object.entries(COMPANY_ALIASES)) {
      if (isFullQuestion) {
        // Info: (20260701 - Julian) 完整問題：檢查問題中是否包含任何別名
        for (const alias of aliases) {
          if (lowercaseText.includes(alias.toLowerCase())) {
            matched.add(fullName);
          }
        }
      } else {
        // Info: (20260701 - Julian) 單一簡稱：精確比對別名或全稱
        const isMatched =
          fullName.toLowerCase() === lowercaseText ||
          aliases.some((alias) => alias.toLowerCase() === lowercaseText);

        if (isMatched) {
          matched.add(fullName);
        }
      }
    }

    return Array.from(matched);
  }

  /**
   * Info: (20260701 - Julian) 偵測企業名稱（比對靜態別名➡️資料庫➡️LLM 萃取）
   * @param question 問題
   * @returns 企業名稱
   */
  private async detectCompanies(question: string): Promise<string[]> {
    const detected = new Set<string>();
    const lowercaseQuestion = question.toLowerCase();

    // Info: (20260701 - Julian) 優先使用靜態別名比對
    const staticMatches = this.matchStaticAliases(question, true);
    for (const name of staticMatches) {
      detected.add(name);
    }

    // Info: (20260701 - Julian) 動態比對
    try {
      const reports = await reportRepo.findMany({
        select: { companyName: true },
        distinct: ["companyName"],
      });

      for (const report of reports) {
        const fullName = report.companyName;
        const cleanName = fullName
          .replace(/股份有限公司|商業銀行|電信|海運|資訊/g, "")
          .trim();

        if (
          cleanName.length >= 2 &&
          lowercaseQuestion.includes(cleanName.toLowerCase())
        ) {
          detected.add(fullName);
        }
      }

      /**
       * Info: (20261015 - Luphia) 以公開資料字典（Company）的簡稱比對。
       * 企業觀測站發布的報告用登記全名（如「臺灣水泥股份有限公司」），而靜態別名寫的是「台灣水泥…」，
       * 「台泥」因此對不上；Company.abbreviation 正是證交所公布的簡稱，直接拿來比對。
       */
      const companies = await companyRepo.findMany({
        where: { name: { in: reports.map((report) => report.companyName) } },
        select: { name: true, abbreviation: true },
      });
      for (const company of companies) {
        const abbreviation = company.abbreviation?.trim() ?? "";
        if (
          abbreviation.length >= 2 &&
          lowercaseQuestion.includes(abbreviation.toLowerCase())
        ) {
          detected.add(company.name);
        }
      }
    } catch (error) {
      console.error("⚠️ [detectCompanies] 動態資料庫比對失敗:", error);
    }

    // Info: (20260701 - Julian) 若前兩步比對出結果，直接回傳
    if (detected.size > 0) {
      console.log(
        `🎯 [AI Chat] 本地規則成功偵測出企業名稱:`,
        Array.from(detected),
      );
      return Array.from(detected);
    }

    // Info: (20260701 - Julian) 退階至 LLM 擷取
    console.log(`⚠️  [AI Chat] 本地規則未比對出企業，退階呼叫 LLM 擷取...`);
    const llmExtracted = await this.extractCompanyNames(question);

    for (const name of llmExtracted) {
      const matchedFullNames = this.matchStaticAliases(name, false);
      if (matchedFullNames.length > 0) {
        for (const fullName of matchedFullNames) {
          detected.add(fullName);
        }
      } else {
        try {
          const dbReport = await reportRepo.findMany({
            where: { companyName: { contains: name } },
            take: 1,
            select: { companyName: true },
          });
          if (dbReport.length > 0) {
            detected.add(dbReport[0].companyName);
          }
        } catch {
          // Info: (20260701 - Julian) ignore
        }
      }
    }

    return Array.from(detected);
  }

  /**
   * Info: (20260701 - Julian) 萃取公司名稱（LLM 萃取）
   * @param question 問題
   * @returns 公司名稱
   */
  private async extractCompanyNames(question: string): Promise<string[]> {
    const prompt = `你是一個關鍵字萃取器。請從以下問題中，擷取所有提到的「公司或企業名稱的簡稱或全名」。
請務必回傳合法的 JSON 格式，包含一個 "companies" 陣列，不要有其他文字。
如果沒有提到任何公司，請回傳 {"companies": []}。

問題：${question}
輸出範例：{"companies": ["亞泥", "台泥"]}`;

    try {
      // Info: (20261022 - Luphia) 在計費範圍之外（檢索階段）呼叫，用量回報為 no-op；以 JSON 模式約束輸出
      const rawResponse = await ollamaGenerate({
        host: OLLAMA_HOST,
        model: LLM_MODEL,
        prompt,
        temperature: 0,
        format: "json",
      });
      const match = rawResponse.match(/\{.*?\}/s);
      const jsonStr = match ? match[0] : rawResponse;
      const result = JSON.parse(jsonStr);
      return Array.isArray(result.companies) ? result.companies : [];
    } catch (error) {
      console.error("❌ 實體擷取或解析失敗:", error);
      return [];
    }
  }

  /**
   * Info: (20260701 - Julian) 偵測問題傾向
   * @param question 問題
   * @returns 問題類型["永續報告書" | "財務報告"]
   */
  private async detectReportType(question: string): Promise<string[]> {
    const detected: string[] = [];
    const lowerQuestion = question.toLowerCase();

    for (const [type, keywords] of Object.entries(QUERY_KEYWORDS)) {
      if (keywords.some((k) => lowerQuestion.includes(k.toLowerCase()))) {
        detected.push(type);
      }
    }

    return detected;
  }

  // Info: (20261022 - Luphia) 公司頁的範疇：代號 → 登記全名（觀測站報告以全名發布）
  private async companyNameOf(stockId: string): Promise<string> {
    const company = await companyRepo.findUnique({ where: { stockId } });
    if (!company) throw toApiError(API_ERRORS.NF_BUSINESS_MONITOR_COMPANY);
    return company.name;
  }

  /**
   * Info: (20260701 - Julian) 將查詢文字轉換為向量
   * @param text 查詢文字
   * @returns 查詢向量
   */
  private async getQueryEmbedding(text: string): Promise<number[]> {
    return queryEmbedder.embed(text);
  }
}

export const businessMonitorService = new BusinessMonitorService();
