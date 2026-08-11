import { GoogleGenerativeAI } from "@google/generative-ai";
import { systemSettingService } from "@/services/system_setting.service";
import { SystemSettingKey } from "@/constants/system_setting";
import { reportRepo } from "@/repositories/report.repo";
import { lanceDBService } from "@/services/lancedb.service";
import { ILanceDBRow } from "@/interfaces/lance_db";
import {
  IAIResponse,
  IReport,
  IReportDownloadTask,
} from "@/interfaces/business_monitor";
import { COMPANY_ALIASES } from "@/constants/company";

// Info: (20260702 - Julian) 查詢關鍵字
export const QUERY_KEYWORDS: Record<string, string[]> = {
  永續報告書: ["ESG", "永續", "CSR", "碳排放", "節能減碳", "綠色轉型", "環境"],
  財務報告: ["年報", "財報", "annual report", "報表", "財務"],
};

// Info: (20260701 - Julian) Ollama 相關參數
const OLLAMA_HOST = "http://localhost:11434";
const EMBED_MODEL = "nomic-embed-text";
const LLM_MODEL = "gemma4:e4b";

const LANCE_DB_CHAT_LIMIT = 3;

interface IChatResponse {
  reports: IReport[];
  total: number;
  totalPages: number;
  aiResponse: IAIResponse;
  from: "service" | "LLM";
}

class BusinessMonitorService {
  // =========================================================================
  // Info: (20260701 - Julian) AI 諮詢 (RAG Chat)
  // =========================================================================

  /**
   * Info: (20260701 - Julian) AI 諮詢
   * @param question 查詢文字
   * @returns AI 回答
   */
  async chat(question: string): Promise<IChatResponse> {
    // Info: (20260702 - Julian) 步驟 1：檢索背景知識
    const { matchedReports, context } = await this.searchContext(question);

    // Info: (20260701 - Julian) 處理搜尋結果為空的情況
    if (matchedReports.length === 0) {
      return {
        reports: [],
        total: 0,
        totalPages: 0,
        aiResponse: {
          answer: "抱歉，根據目前的報告資料，無法找到足夠相關的數據。",
          sourceReportIds: [],
        },
        from: "service",
      };
    }

    // Info: (20260702 - Julian) 步驟 2：呼叫 LLM 生成回答
    const answer = await this.generateAnswer(question, context);

    return {
      reports: matchedReports,
      total: matchedReports.length,
      totalPages: 1,
      aiResponse: {
        answer: answer,
        sourceReportIds: matchedReports.map((r) => r.id),
      },
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
  ): Promise<{ matchedReports: IReport[]; context: string }> {
    // Info: (20260630 - Julian) 使用 AI 諮詢功能前，先偵測公司名稱
    const companyNames = await this.detectCompanies(question);
    console.log(`🤖 [AI Chat] 提問：「${question}」`);
    console.log(`🤖 [AI Chat] 步驟 1：偵測出的公司名稱：`, companyNames);

    // Info: (20260702 - Julian) 偵測問題類型 (永續 vs 財務)
    const reportTypes = await this.detectReportType(question);
    console.log(`🤖 [AI Chat] 步驟 2：偵測出的報告類型：`, reportTypes);

    // Info: (20260702 - Julian) 偵測年份
    const years = this.detectYears(question);
    console.log(`🤖 [AI Chat] 步驟 3：偵測出的年份：`, years);

    // Info: (20260701 - Julian) 將用戶問題轉換為向量
    const queryVector = await this.getQueryEmbedding(question);

    // Info: (20260701 - Julian) 到 LanceDB 進行相似度檢索
    const table = await lanceDBService.getTable();
    let matchedDocs: ILanceDBRow[] = [];

    // Info: (20260702 - Julian) 建立動態過濾條件 (先從 Repo 篩選符合條件的報告 ID)
    const filteredReports = await reportRepo.findByCriteria(
      companyNames,
      reportTypes,
      years,
    );
    const matchedIds = filteredReports.map((r) => String(r.id));

    let combinedWhere = "";
    if (matchedIds.length > 0) {
      combinedWhere = `reportId IN (${matchedIds.map((id) => `'${id}'`).join(", ")})`;
    } else if (
      companyNames.length > 0 ||
      reportTypes.length > 0 ||
      years.length > 0
    ) {
      // Info: (20260702 - Julian) 有設定過濾條件但找不到任何報告，直接回傳空結果
      console.log(`⚠️  [AI Chat] 過濾條件未匹配到任何報告，跳過檢索。`);
      return { matchedReports: [], context: "" };
    }

    if (combinedWhere) {
      console.log(`🔍 [AI Chat] 使用過濾條件: ${combinedWhere}`);

      // Info: (20260701 - Julian) 執行向量檢索
      matchedDocs = (await table
        .vectorSearch(new Float32Array(queryVector))
        .where(combinedWhere)
        .limit(LANCE_DB_CHAT_LIMIT)
        .toArray()) as unknown as ILanceDBRow[];
    } else {
      // Info: (20260701 - Julian) 退階：無指定公司與類型
      matchedDocs = (await table
        .vectorSearch(new Float32Array(queryVector))
        .limit(LANCE_DB_CHAT_LIMIT)
        .toArray()) as unknown as ILanceDBRow[];
    }

    console.log(`✅ [AI Chat] 最終篩選出 ${matchedDocs.length} 筆資料`);

    // Info: (20260701 - Julian) 在呼叫 LLM 之前，先取得關聯的 PostgreSQL Report 記錄，以便注入 metadata 作為 Context
    const matchedReports: IReport[] = [];
    const seenIds = new Set<number>();

    for (const doc of matchedDocs) {
      const reportIdVal = doc.reportId;
      if (!reportIdVal) continue;

      let report: IReport | null = null;
      if (/^\d+$/.test(String(reportIdVal))) {
        const numericId = parseInt(String(reportIdVal), 10);
        console.log(`DEBUG: 嘗試使用 ID 查詢: ${numericId}`);
        report = await reportRepo.findUnique({
          where: { id: numericId },
        });
      } else {
        console.log(`DEBUG: 嘗試使用 pdfPath 查詢: ${reportIdVal}`);
        report = await reportRepo.findUnique({
          where: { pdfPath: String(reportIdVal) },
        });
      }

      if (report) {
        console.log(
          `DEBUG: 找到 Report: ${report.companyName} (ID: ${report.id})`,
        );
        if (!seenIds.has(report.id)) {
          seenIds.add(report.id);
          matchedReports.push(report);
        }
      } else {
        console.log(`DEBUG: 找不到 Report，ID/Path: ${reportIdVal}`);
      }
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

    // Info: (20260701 - Julian) 將搜尋到的 Markdown 文字片段拼接在一起
    const textContext = matchedDocs.map((doc) => doc.text).join("\n\n---\n\n");

    // Info: (20260701 - Julian) 合併中繼資料與向量內文段落，並加入防溢位保護
    const context = [reportMetadataContext, textContext]
      .filter(Boolean)
      .join("\n\n=== 報告書內文段落 ===\n\n")
      .slice(0, 3500);

    return { matchedReports, context };
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

【參考資料】：
${context}

【問題】：
${question}`;

    const llmResponse = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: LLM_MODEL,
        prompt: systemPrompt,
        stream: false,
      }),
    });
    const llmData = await this.responseToJSON<{ response: string }>(
      llmResponse,
    );
    return llmData.response;
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
    query?: string;
    company?: string;
    industry?: string;
    year?: string;
    page: number;
    pageSize: number;
  }) {
    const { query, company, industry, year, page, pageSize } = params;

    // Info: (20260701 - Julian) 若無 AI 查詢，模擬基本網路延遲
    const delayMs = query ? 0 : 500;
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    if (query) {
      let aiResponse: IAIResponse | undefined;
      const allReports = await reportRepo.findMany();

      try {
        /**
         * Info: (20260812 - Luphia) 金鑰改由 systemSettingService 解析。
         *
         * 這是本檔唯一不經過 ChatService 的 LLM 呼叫(自建 GoogleGenerativeAI 並
         * 指定 responseMimeType),所以不能靠 ChatService 的解析,得自己問。
         * `get()` 已經處理三種狀態:資料庫可信時以資料庫為準、驗簽失敗時拒絕服務、
         * 從未用資料庫保管時才讀環境變數 —— 直接讀 env 會跳過前兩者。
         */
        const apiKey = await systemSettingService.get(
          SystemSettingKey.GEMINI_API_KEY,
        );
        if (!apiKey) {
          throw new Error("Missing GEMINI_API_KEY");
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-pro",
          generationConfig: {
            responseMimeType: "application/json",
          },
        });

        // Info: (20260701 - Julian) 將真實報告當作參考資料餵給 LLM
        const contextData = allReports.map((r) => ({
          id: r.id,
          company: r.companyName,
          title: r.title,
          industry: r.industry,
        }));

        const prompt = `你是一個企業永續報告觀測助理。請根據使用者問題回答。
雖然提供的參考資料僅包含報告的 Metadata (無內文)，你可以利用你既有的知識庫來回答使用者關於該企業的具體永續數據 (例如離職率、碳排放、減碳目標等)。
回答完畢後，請從提供的報告清單中挑出最符合的報告，將其 ID 放入 sourceReportIds 陣列。
如果使用者的問題完全無關或無法回答，請將 answer 設為「在現有報告中找不到相關解答。」，並讓 sourceReportIds 為空陣列。

參考報告清單：
${JSON.stringify(contextData, null, 2)}

使用者問題：
${query}

請嚴格依照此 JSON Schema 格式回傳（不需要 markdown 標記）：
{
  "answer": "字串，你的回答",
  "sourceReportIds": [數字陣列，對應的報告 ID]
}
`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        aiResponse = JSON.parse(text) as IAIResponse;
      } catch (error) {
        console.error("LLM API 發生錯誤:", error);
        aiResponse = {
          answer: "系統忙線中或未設定正確的 API Key，請稍後再試。",
          sourceReportIds: [],
        };
      }

      // Info: (20260701 - Julian) 收斂為只顯示來源報告
      const filtered = allReports.filter((r) =>
        aiResponse?.sourceReportIds.includes(r.id),
      );

      const total = filtered.length;
      const totalPages = Math.ceil(total / pageSize);
      const startIndex = (page - 1) * pageSize;
      const paginatedReports = filtered.slice(
        startIndex,
        startIndex + pageSize,
      );

      return {
        reports: paginatedReports,
        total,
        totalPages,
        aiResponse,
      };
    } else {
      // Info: (20260701 - Julian) 只有非 AI 查詢時，才套用 PostgreSQL 常規過濾與分頁邏輯
      const whereClause: {
        companyName?: { contains: string };
        industry?: string;
        reportYear?: string;
      } = {};
      if (company) {
        whereClause.companyName = { contains: company };
      }
      if (industry) {
        whereClause.industry = industry;
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
  // Info: (20260701 - Julian) 🔧模擬報告下載 (SSE Stream)
  // =========================================================================

  /**
   * Info: (20260701 - Julian) 模擬報告下載
   * @param reportId 報告書 ID
   * @returns ReadableStream
   */
  downloadReport(reportId: string): ReadableStream {
    const totalBytes = Math.floor(Math.random() * 20 + 10) * 1024 * 1024; // Info: (20260701 - Julian) 10MB ~ 30MB
    let downloadedBytes = 0;
    let status: "downloading" | "completed" = "downloading";

    return new ReadableStream({
      async start(controller) {
        const interval = setInterval(() => {
          const chunk = Math.floor(Math.random() * 2 + 1) * 1024 * 1024; // Info: (20260701 - Julian) 1MB ~ 3MB
          downloadedBytes += chunk;

          if (downloadedBytes >= totalBytes) {
            downloadedBytes = totalBytes;
            status = "completed";
          }

          const progress = Math.floor((downloadedBytes / totalBytes) * 100);

          const data: IReportDownloadTask = {
            reportId,
            companyName: "Mock Company Ltd.",
            reportTitle: "2024 年永續報告書",
            fileSizeBytes: totalBytes,
            downloadedBytes,
            progress,
            status: status === "completed" ? "completed" : "downloading",
          };

          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`),
          );

          if (status === "completed") {
            clearInterval(interval);
            controller.close();
          }
        }, 500);
      },
    });
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
      const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: LLM_MODEL,
          prompt: prompt,
          stream: false,
        }),
      });
      const data = await this.responseToJSON<{ response: string }>(response);
      const rawResponse = data.response;
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

  /**
   * Info: (20260702 - Julian) 偵測年份：抓取 19xx、20xx 四位數
   * @param question 問題
   * @returns 年份
   */
  private detectYears(question: string): string[] {
    const lowerQuestion = question.toLowerCase();
    const match = lowerQuestion.match(/\b(19\d{2}|20\d{2})\b/g);
    if (match) {
      return match;
    }
    return [];
  }

  /**
   * Info: (20260701 - Julian) 將查詢文字轉換為向量
   * @param text 查詢文字
   * @returns 查詢向量
   */
  private async getQueryEmbedding(text: string): Promise<number[]> {
    const response = await fetch(`${OLLAMA_HOST}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: EMBED_MODEL, prompt: text }),
    });
    const data = await response.json();
    return data.embedding;
  }

  /**
   * Info: (20260701 - Julian) 將 response 轉換為 JSON
   * @param response Response 物件
   * @returns JSON
   */
  private async responseToJSON<T = Record<string, unknown>>(
    response: Response,
  ): Promise<T> {
    const text = await response.text();
    return JSON.parse(text) as T;
  }
}

export const businessMonitorService = new BusinessMonitorService();
