// Info: (20260716 - Tzuhan) 整份報告匯入服務(#56):
// Info: (20260716 - Tzuhan) 職責:檔案內容 → LLM 切段並對應標準大綱(enum 鎖死) → TS 白名單複驗 → 匯入預覽資料
// Info: (20260716 - Tzuhan) 鐵律:內容「原樣搬運」嚴禁改寫;對不上大綱的內容進 unmapped 桶(不丟棄,由使用者裁決);
// Info: (20260716 - Tzuhan) 報告中的數字不可信任為已驗證 — 活動數據另行萃取,交決定論引擎重新勾稽

import {
  ChatService,
  isLlmQuotaError,
  isLlmTimeoutError,
  isLlmTruncatedError,
  SchemaType,
  type Schema,
} from "@/services/chat.service";
import { describeError } from "@/lib/utils/error_message";
import {
  assessPdfTextLayer,
  extractPdfTextLayer,
  slicePagesForRange,
  PDF_TEXT_LAYER_REASON,
} from "@/lib/pdf_text_layer";
import { PdfTextLayerDecisionEnum } from "@/constants/pdf_text_layer";
import { CARBON_ATTACHMENT_EXTRACTION_MAX_BYTES } from "@/constants/carbon_chatbot";
import {
  LLM_REPORT_IMPORT_TIMEOUT_MS,
  LLM_MAX_OUTPUT_TOKENS,
  LLM_TEMPERATURE,
  LlmTaskKeyEnum,
} from "@/constants/llm";
import {
  CARBON_REPORT_OUTLINE,
  ICarbonReportSection,
} from "@/constants/carbon_report_outline";
import { GhgProtocolCategory } from "@/constants/esg";
import { MeasurementUnit } from "@/constants/enums";
import {
  CarbonReportImportLlmOutputSchema,
  CarbonReportGapFillLlmOutputSchema,
  CarbonReportPageIndexLlmOutputSchema,
  CarbonActivityRecordSchema,
  CarbonSourceTableSchema,
} from "@/validators";
import { ApiError, API_ERRORS } from "@/lib/utils/error_dictionary";
import {
  validateSourceTables,
  type ICarbonSourceTable,
} from "@/lib/carbon_source_table.builder";
import { logger } from "@/lib/utils/logger";
import { IActivityRecord } from "@/types/carbon_chatbot.types";

// Info: (20260716 - Tzuhan) 匯入結果的單一段落(白名單複驗後)
export interface IImportedSegment {
  paragraphId: string;
  // Info: (20260716 - Tzuhan) 顯示用標題(code + title,取自大綱非 LLM)
  title: string;
  content: string;
  /**
   * Info: (20260801 - Tzuhan) 該段自原文照錄的表格(已逐張裁決)。
   * 與 content 分開的理由見 responseSchema 的註解:混在敘述裡會被剝除守門丟棄。
   */
  sourceTables?: ICarbonSourceTable[];
}

export interface IReportImportResult {
  segments: IImportedSegment[];
  // Info: (20260716 - Tzuhan) 對不上大綱的原文片段:不丟棄,由使用者於預覽卡手動指定或捨棄
  unmapped: string[];
  // Info: (20260716 - Tzuhan) 報告中的活動數據(已裁決):進帳本後由 /calculate 重新勾稽
  activities: IActivityRecord[];
}

/**
 * Info: (20260716 - Tzuhan) 逐章匯入(UAT:整份真實報告單次呼叫受 output token 上限所限,只回少數段落):
 * schema 依「本次範圍的段落」動態建構 — 全綱(小檔單發)或單章(前端逐章迴圈);
 * activities 僅第一章呼叫時萃取,避免 11 章重複入帳
 */
// Info: (20260716 - Tzuhan) LLM 輸出約束:段落 id 以 enum 鎖死;內容原樣照抄
// Info: (20260720 - Tzuhan) 改為條件組裝(withActivities)取代 delete 突變 — Schema 為聯合型別,delete 不過型別檢查
const buildImportResponseSchema = (
  sections: ICarbonReportSection[],
  withActivities: boolean,
): Schema => {
  const properties: Record<string, Schema> = {
    segments: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          paragraphId: {
            type: SchemaType.STRING,
            format: "enum",
            enum: sections.map((section) => section.id),
          },
          content: {
            type: SchemaType.STRING,
            description: "該段原文,逐字照抄,嚴禁改寫、摘要或補充",
          },
          // Info: (20260801 - Tzuhan) 原文表格獨立成欄而非混在 content 內:
          // Info: (20260801 - Tzuhan) 混在敘述裡會被 stripLlmTables 當成模型自產而丟棄,
          // Info: (20260801 - Tzuhan) 而且無法帶出表號與頁碼(那兩者是回查原文的唯一線索)。
          sourceTables: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                tableNo: {
                  type: SchemaType.STRING,
                  description: "原文的表號,如 表3.8;照抄不改格式",
                },
                caption: {
                  type: SchemaType.STRING,
                  description: "原文的表格標題,逐字照抄",
                },
                sourcePages: {
                  type: SchemaType.ARRAY,
                  items: { type: SchemaType.NUMBER },
                  description:
                    "該表所在頁碼;跨頁表格給起訖兩頁(取自原文的 -- p.N/總頁 -- 標記)",
                },
                markdown: {
                  type: SchemaType.STRING,
                  description:
                    "該表的 markdown;儲存格逐字照抄,嚴禁重排、合併、換算或補值",
                },
              },
              required: ["tableNo", "caption", "sourcePages", "markdown"],
            },
          },
        },
        required: ["paragraphId", "content"],
      },
    },
    unmapped: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.STRING,
        description: "無法對應任何大綱段落的原文片段(原樣照抄)",
      },
    },
  };
  if (withActivities) {
    properties.activities = {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          scopeCategory: {
            type: SchemaType.STRING,
            format: "enum",
            enum: Object.values(GhgProtocolCategory),
          },
          sourceName: { type: SchemaType.STRING },
          quantity: {
            type: SchemaType.STRING,
            description: "數量原樣照抄,嚴禁換算或加總",
          },
          unit: {
            type: SchemaType.STRING,
            format: "enum",
            enum: Object.values(MeasurementUnit),
          },
        },
        required: ["scopeCategory", "sourceName", "quantity", "unit"],
      },
    };
  }
  return {
    type: SchemaType.OBJECT,
    properties,
    required: ["segments", "unmapped"],
  };
};

// Info: (20260727 - Tzuhan) #57 草稿補齊 responseSchema:段落 id 以 enum 鎖死;內容為「依據原文撰寫的草稿」
const buildGapFillResponseSchema = (
  sections: ICarbonReportSection[],
): Schema => ({
  type: SchemaType.OBJECT,
  properties: {
    segments: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          paragraphId: {
            type: SchemaType.STRING,
            format: "enum",
            enum: sections.map((section) => section.id),
          },
          content: {
            type: SchemaType.STRING,
            description:
              "段落草稿(Markdown),100~300 字;所有事實必須出自報告原文,缺漏以(待補: 說明)佔位",
          },
        },
        required: ["paragraphId", "content"],
      },
    },
  },
  required: ["segments"],
});

const buildOutlineCatalog = (sections: ICarbonReportSection[]): string =>
  sections
    .map(
      (section) =>
        `${section.id}: ${section.code} ${section.title} — ${section.guidance}`,
    )
    .join("\n");

/**
 * Info: (20260730 - Tzuhan) 頁碼索引的輸出約束(兩階段匯入的第一階段)。
 * 只要頁碼、不要內容,輸出因此極小(33 個整數),一次呼叫即可把後續 11 章的輸入
 * 從「整份文件 × 11」縮成「該章對應頁 × 11」。段落 id 同樣以 enum 鎖死。
 */
const buildPageIndexResponseSchema = (
  sections: ICarbonReportSection[],
): Schema => ({
  type: SchemaType.OBJECT,
  properties: {
    index: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          paragraphId: {
            type: SchemaType.STRING,
            format: "enum",
            enum: sections.map((section) => section.id),
          },
          startPage: {
            type: SchemaType.INTEGER,
            description: "該段落內容起始的頁碼(取自原文的 -- p.N/總頁 -- 標記)",
          },
        },
        required: ["paragraphId", "startPage"],
      },
    },
  },
  required: ["index"],
});

const SECTION_BY_ID = new Map(CARBON_REPORT_OUTLINE.map((s) => [s.id, s]));

// Info: (20260716 - Tzuhan) 匯入來源:文字類直接入 prompt;pdf 走 inlineData
export interface IReportImportSource {
  name: string;
  mimeType: string;
  // Info: (20260716 - Tzuhan) base64(pdf)或 UTF-8 純文字(md/plain,由 route 解碼)
  data: string;
  isText: boolean;
}

export class ReportImportService {
  // Info: (20260716 - Tzuhan) 依賴延遲建立(避免 import 階段因缺 API Key 拋錯),測試時可注入 mock
  private readonly injectedChatService?: ChatService;

  constructor(chatService?: ChatService) {
    this.injectedChatService = chatService;
  }

  private getChatService(): ChatService {
    return this.injectedChatService ?? new ChatService();
  }

  /**
   * Info: (20260730 - Tzuhan) LLM 失敗的四路分流。實測一次完整匯入同時遇到三種不同失敗
   * (第二章逾時、後續章節 429 額度耗盡、更早一輪的輸出截斷),但當時全部回同一個
   * 「匯入失敗」,而且 log 是 `JSON.stringify(error)` 印出的 `{}` —— 無從判斷該加大額度、
   * 該等一下再試、還是該縮小範圍。錯誤分不清就等於沒有錯誤處理。
   */
  private toImportError(error: unknown, scope: string): ApiError {
    const detail = describeError(error);

    if (isLlmTruncatedError(error)) {
      logger.error(
        `[ReportImportService] output truncated for scope ${scope}: ${detail}`,
      );
      return new ApiError(
        API_ERRORS.IS_LLM_OUTPUT_TRUNCATED.code,
        API_ERRORS.IS_LLM_OUTPUT_TRUNCATED.message,
        API_ERRORS.IS_LLM_OUTPUT_TRUNCATED.status,
      );
    }
    if (isLlmTimeoutError(error)) {
      logger.error(
        `[ReportImportService] timeout for scope ${scope}: ${detail}`,
      );
      return new ApiError(
        API_ERRORS.IS_LLM_TIMEOUT.code,
        API_ERRORS.IS_LLM_TIMEOUT.message,
        API_ERRORS.IS_LLM_TIMEOUT.status,
      );
    }
    // Info: (20260730 - Tzuhan) 額度耗盡:重試有意義但必須等,與「模型壞掉」是完全不同的處置
    if (isLlmQuotaError(error)) {
      logger.error(
        `[ReportImportService] quota exhausted for scope ${scope}: ${detail}`,
      );
      return new ApiError(
        API_ERRORS.IS_LLM_QUOTA_EXCEEDED.code,
        API_ERRORS.IS_LLM_QUOTA_EXCEEDED.message,
        API_ERRORS.IS_LLM_QUOTA_EXCEEDED.status,
      );
    }
    logger.error(
      `[ReportImportService] LLM call failed for scope ${scope}: ${detail}`,
    );
    return new ApiError(
      API_ERRORS.IS_REPORT_IMPORT_FAILED.code,
      API_ERRORS.IS_REPORT_IMPORT_FAILED.message,
      API_ERRORS.IS_REPORT_IMPORT_FAILED.status,
    );
  }

  /**
   * Info: (20260730 - Tzuhan) 裁決一份上傳檔案要以什麼形態進 LLM(純文字 / 視覺模型 / 拒收)。
   *
   * 這段原本寫在 `import/route.ts`,但它是業務判斷而非端口職責:抽文字層、評估品質、
   * 決定降級路徑 —— 依三層式架構(API 只做接收→驗證→呼叫 Service→回應)應收在此。
   *
   * 回傳 null 代表兩條路都不通(文字層不可信、原檔又超過視覺模型上限),呼叫端須明確拒收。
   */
  async resolveSource(input: {
    name: string;
    mimeType: string;
    sizeBytes: number;
    buffer: Buffer;
    isTextMimeType: boolean;
  }): Promise<IReportImportSource | null> {
    const base = { name: input.name, mimeType: input.mimeType };

    if (input.isTextMimeType) {
      return { ...base, data: input.buffer.toString("utf-8"), isText: true };
    }

    const canUseVision =
      input.sizeBytes <= CARBON_ATTACHMENT_EXTRACTION_MAX_BYTES;
    const extracted = await extractPdfTextLayer(input.buffer);
    const assessment = extracted
      ? assessPdfTextLayer(extracted.text, extracted.pages, canUseVision)
      : null;

    logger.info("report import source decision", {
      fileName: input.name,
      fileSize: input.sizeBytes,
      canUseVision,
      decision: assessment?.decision ?? PdfTextLayerDecisionEnum.VISION,
      reason: assessment?.reason ?? PDF_TEXT_LAYER_REASON.EXTRACTION_FAILED,
      charsPerPage: assessment?.quality.charsPerPage ?? 0,
      numericUndecodedChars: assessment?.quality.numericUndecodedChars ?? 0,
    });

    if (extracted && assessment?.decision === PdfTextLayerDecisionEnum.TEXT) {
      return { ...base, data: extracted.text, isText: true };
    }
    if (canUseVision) {
      return { ...base, data: input.buffer.toString("base64"), isText: false };
    }
    return null;
  }

  /**
   * Info: (20260730 - Tzuhan) 依頁碼範圍縮小送進 LLM 的文字(兩階段匯入的第二階段)。
   * 切片本身是純函數(slicePagesForRange),此處只負責記錄實際生效範圍與退回情況 ——
   * 成本與品質的分水嶺必須看得到,否則無從判斷索引是否可靠。
   */
  scopeSourceToPages(
    source: IReportImportSource,
    fromPage: number,
    toPage: number,
  ): IReportImportSource {
    if (!source.isText) return source;
    const slice = slicePagesForRange(source.data, fromPage, toPage);
    logger.info("report import page slice", {
      fileName: source.name,
      requested: { fromPage, toPage },
      applied: slice.range,
      fellBack: slice.fellBack,
      chars: slice.text.length,
      originalChars: source.data.length,
    });
    return { ...source, data: slice.text };
  }

  /**
   * Info: (20260730 - Tzuhan) 兩階段匯入的第一階段:問出「33 節各自起始於第幾頁」。
   *
   * 為什麼需要:逐章匯入為了突破輸出上限而拆成 11 次呼叫,但每次都重送整份文件——
   * 實測 64 頁報告一次匯入耗掉約 44 萬 input token,後段章節因 API 額度耗盡連請求都發不出去
   * (失敗於 6~18ms)。278 頁的報告只會更糟。
   *
   * 為什麼可行:文字層抽取已在每頁尾植入 `-- p.N/總頁 --` 標記,模型只要回頁碼即可,
   * 輸出僅 33 個整數,一次呼叫的成本遠低於省下的 10 次全文輸入。
   *
   * 護欄:回傳的頁碼僅供切片最佳化。頁碼不合理、缺漏、或切出來過短時一律退回送全文
   * (見 slicePagesForRange),絕不因索引失準而讓內容靜默消失。
   */
  async buildSectionPageIndex(
    source: IReportImportSource,
    language?: string,
  ): Promise<Map<string, number>> {
    // Info: (20260730 - Tzuhan) 僅文字來源可切片(視覺模型走 inlineData,沒有頁標記可依循)
    if (!source.isText) return new Map();

    const prompt = `你是一位文件索引助手。以下是一份既有的溫室氣體盤查報告全文,每頁尾端有 \`-- p.頁碼/總頁 --\` 標記。

【任務】
判斷下列標準大綱的每個段落,其對應內容起始於原文的第幾頁,回傳 startPage。

【規則】
1. startPage 必須取自原文的頁標記,嚴禁推測或估算。
2. 原文完全沒有對應內容的段落,直接不要列入 index(不要猜一個頁碼)。
3. 只回頁碼,不要回任何內容。
4. 語言:${language ?? "zh-TW"}(僅影響你對標題語意的理解)。

【標準大綱】
${buildOutlineCatalog(CARBON_REPORT_OUTLINE)}

【報告原文】
${source.data}`;

    let raw: string;
    try {
      raw = await this.getChatService().generateRawWithImages(
        prompt,
        undefined,
        true,
        buildPageIndexResponseSchema(CARBON_REPORT_OUTLINE),
        {
          temperature: LLM_TEMPERATURE.EXTRACTION,
          timeoutMs: LLM_REPORT_IMPORT_TIMEOUT_MS,
          taskKey: LlmTaskKeyEnum.REPORT_IMPORT,
          // Info: (20260730 - Tzuhan) 輸出只有頁碼,但思考 token 與輸出共用額度,故仍給足空間
          maxOutputTokens: LLM_MAX_OUTPUT_TOKENS.REPORT_IMPORT,
        },
      );
    } catch (error) {
      // Info: (20260730 - Tzuhan) 索引失敗不阻斷匯入:回空 Map,呼叫端退回原本的送全文行為
      logger.error(
        `[ReportImportService] page index failed: ${describeError(error)}`,
      );
      return new Map();
    }

    try {
      const parsed = CarbonReportPageIndexLlmOutputSchema.parse(
        JSON.parse(raw),
      );
      const validIds = new Set(CARBON_REPORT_OUTLINE.map((s) => s.id));
      const index = new Map<string, number>();
      parsed.index.forEach((entry) => {
        // Info: (20260730 - Tzuhan) 白名單複驗:enum 之外的 id 直接丟棄(不進 unmapped,索引不承載內容)
        if (validIds.has(entry.paragraphId)) {
          index.set(entry.paragraphId, entry.startPage);
        }
      });
      return index;
    } catch (error) {
      logger.error(
        `[ReportImportService] page index output invalid: ${describeError(error)}`,
      );
      return new Map();
    }
  }

  async importReport(
    source: IReportImportSource,
    language?: string,
    options?: {
      // Info: (20260716 - Tzuhan) 逐章模式:僅對應該章段落(前端迴圈逐章呼叫,突破單次 output 上限)
      chapterId?: string;
      // Info: (20260716 - Tzuhan) 僅首次呼叫萃取活動數據(避免逐章重複入帳)
      extractActivities?: boolean;
    },
  ): Promise<IReportImportResult> {
    const scopedSections = options?.chapterId
      ? CARBON_REPORT_OUTLINE.filter(
          (section) => section.chapterId === options.chapterId,
        )
      : CARBON_REPORT_OUTLINE;
    if (scopedSections.length === 0) {
      throw new ApiError(
        API_ERRORS.VL_SCHEMA_ERROR.code,
        API_ERRORS.VL_SCHEMA_ERROR.message,
        API_ERRORS.VL_SCHEMA_ERROR.status,
      );
    }
    const withActivities = options?.extractActivities ?? true;
    const scopeRule = options?.chapterId
      ? "5. 本次只處理下列段落範圍:與範圍無關的內容一律忽略(其他章節另行處理),不要放入 unmapped;unmapped 僅放「疑似屬本範圍但對不上細段」的原文。"
      : "";

    const prompt = `你是一位專業碳會計師的文件整理助手。使用者上傳了一份既有的溫室氣體盤查報告,請將其內容切段並對應到標準大綱。

【對應規則】
1. content 逐字照抄原文,嚴禁改寫、摘要、翻譯或補充任何文字。
2. paragraphId 只能從下方大綱挑選;對不上任何段落的內容放入 unmapped(同樣原樣照抄)。
3. ${withActivities ? "activities:報告中的活動數據(用電量、油耗等),quantity 原樣照抄為字串,嚴禁換算;單位對不上列舉就整筆省略。" : "本次呼叫不需要萃取活動數據。"}
4. 語言:${language ?? "zh-TW"}(僅影響你對標題語意的理解,內容一律照抄)。${scopeRule}

【表格規則】
T1. 原文的表格**不要**放進 content,一律放入該段的 sourceTables;content 只放敘述文字。
T2. markdown 的儲存格內容逐字照抄:不重排欄列、不合併儲存格、不換算單位、不補值、不加總。
T3. **「NA」「NS」「-」等非數值標記必須原樣保留,嚴禁改成 0 或空白。** 它們的語意各不相同
    (不適用 / 不顯著 / 未填),改成 0 會讓「沒有盤查」看起來像「盤查後為零」。
T4. 跨頁的同一張表合併為一張,sourcePages 給起訖兩頁;不同表號絕不合併。
T5. tableNo 照抄原文表號(如「表3.8」);找不到表號的表格整張省略,不要自己編號。
T6. 只收錄真正是表格的內容;條列式文字不要當成表格。

【標準大綱】
${buildOutlineCatalog(scopedSections)}${source.isText ? `\n\n【報告原文】\n${source.data}` : ""}`;

    let raw: string;
    try {
      raw = await this.getChatService().generateRawWithImages(
        prompt,
        source.isText
          ? undefined
          : [{ data: source.data, mimeType: source.mimeType }],
        true,
        buildImportResponseSchema(scopedSections, withActivities),
        {
          temperature: LLM_TEMPERATURE.EXTRACTION,
          timeoutMs: LLM_REPORT_IMPORT_TIMEOUT_MS,
          taskKey: LlmTaskKeyEnum.REPORT_IMPORT,
          // Info: (20260730 - Tzuhan) 原樣照抄需要大輸出空間,且思考 token 與輸出共用此額度
          // Info: (20260730 - Tzuhan) (原本 8192 導致內容較多的前四章全部被截斷,見 LLM_MAX_OUTPUT_TOKENS 註解)
          maxOutputTokens: LLM_MAX_OUTPUT_TOKENS.REPORT_IMPORT,
        },
      );
    } catch (error) {
      throw this.toImportError(error, options?.chapterId ?? "all");
    }

    // Info: (20260714 - Tzuhan) 永不直接採信 LLM 輸出:JSON + Zod 雙重護欄
    let parsed;
    try {
      parsed = CarbonReportImportLlmOutputSchema.parse(JSON.parse(raw));
    } catch {
      throw new ApiError(
        API_ERRORS.IS_LLM_OUTPUT_INVALID.code,
        API_ERRORS.IS_LLM_OUTPUT_INVALID.message,
        API_ERRORS.IS_LLM_OUTPUT_INVALID.status,
      );
    }

    // Info: (20260716 - Tzuhan) 白名單複驗:非法/範圍外段落 id 的內容降入 unmapped(不丟棄);同段多片段串接
    const scopedIds = new Set(scopedSections.map((section) => section.id));
    const contentById = new Map<string, string[]>();
    const tablesById = new Map<string, ICarbonSourceTable[]>();
    const unmapped: string[] = [...parsed.unmapped];
    parsed.segments.forEach((segment) => {
      if (!scopedIds.has(segment.paragraphId)) {
        unmapped.push(segment.content);
        return;
      }
      const bucket = contentById.get(segment.paragraphId) ?? [];
      bucket.push(segment.content);
      contentById.set(segment.paragraphId, bucket);

      /**
       * Info: (20260801 - Tzuhan) 原文表格逐張裁決(壞一張丟一張,與 activities 同一原則)。
       * 整批拒絕是錯的比例:一張表格格式不合,其餘段落與敘述都還是好的。
       * 丟掉的表格記 log —— 沉默的缺表會讓使用者以為原文沒有那張表。
       */
      const accepted = tablesById.get(segment.paragraphId) ?? [];
      (segment.sourceTables ?? []).forEach((candidate) => {
        const table = CarbonSourceTableSchema.safeParse(candidate);
        if (!table.success) {
          /**
           * Info: (20260802 - Tzuhan) 記下**被拒的實際值**,不只記 Zod 的錯誤碼。
           * 實測時 log 只說 `tableNo: custom`,完全看不出模型給的是「表 3.6」還是「Table 3.6」——
           * 我因此只能回頭猜 regex 該怎麼放寬。這與先前 API 400 只回「schema error」是同一個坑,
           * 而我在同一輪重蹈了一次:拒絕的理由必須包含被拒的東西本身。
           * 值截斷至 40 字元:表號與標題夠看,但不會把整張表的 markdown 灌進 log。
           */
          const raw = candidate as Record<string, unknown> | null;
          logger.warn("[ReportImportService] source table rejected", {
            paragraphId: segment.paragraphId,
            tableNo: String(raw?.tableNo ?? "").slice(0, 40),
            caption: String(raw?.caption ?? "").slice(0, 40),
            sourcePages: Array.isArray(raw?.sourcePages)
              ? JSON.stringify(raw.sourcePages).slice(0, 40)
              : null,
            issues: table.error.issues
              .slice(0, 3)
              .map((issue) => `${issue.path.join(".")}: ${issue.code}`),
          });
          return;
        }
        accepted.push(table.data);
      });
      if (accepted.length > 0) tablesById.set(segment.paragraphId, accepted);
    });

    const segments: IImportedSegment[] = Array.from(contentById.entries()).map(
      ([paragraphId, parts]) => {
        const section = SECTION_BY_ID.get(paragraphId);
        // Info: (20260801 - Tzuhan) 形狀複驗(是否真為表格)在寫入段落前的最後一道;
        // Info: (20260801 - Tzuhan) 不合格即整段不帶表格,但敘述照樣落地
        const candidates = tablesById.get(paragraphId) ?? [];
        /**
         * Info: (20260802 - Tzuhan) 形狀檢查**逐張**丟棄,不整批丟。
         *
         * 原本呼叫 validateSourceTables 對整批判定,實測後果是:ch4-2 的「表4.1 定性及定量
         * 評估等級表」是文字矩陣而非真表格,於是**同一節其餘合格的表格也一起消失**。
         * 這與 Zod 層「壞一張丟一張」的原則自相矛盾 —— 同一件事在兩層用不同比例,
         * 是我設計上的不一致。統一為逐張:一張不合格只丟那一張。
         */
        const shaped = candidates.filter((table) => {
          const check = validateSourceTables([table]);
          if (!check.isValid) {
            logger.warn("[ReportImportService] source table dropped", {
              paragraphId,
              tableNo: table.tableNo,
              caption: table.caption.slice(0, 40),
              reason: check.reason ?? null,
            });
          }
          return check.isValid;
        });
        // Info: (20260802 - Tzuhan) 逐張過關後仍要驗數量上限(單張檢查看不到總數)
        const withinLimit = validateSourceTables(shaped);
        if (!withinLimit.isValid) {
          logger.warn("[ReportImportService] source tables dropped", {
            paragraphId,
            reason: withinLimit.reason ?? null,
            count: shaped.length,
          });
        }
        return {
          paragraphId,
          title: section ? `${section.code} ${section.title}` : paragraphId,
          content: parts.join("\n\n").trim(),
          sourceTables: withinLimit.isValid ? shaped : [],
        };
      },
    );

    // Info: (20260716 - Tzuhan) 活動數據逐筆裁決(壞一筆丟一筆);source 記檔名供溯源
    const activities: IActivityRecord[] = (parsed.activities ?? []).flatMap(
      (item) => {
        const record = CarbonActivityRecordSchema.safeParse(item);
        return record.success ? [{ ...record.data, source: source.name }] : [];
      },
    );

    return { segments, unmapped, activities };
  }

  /**
   * Info: (20260727 - Tzuhan) #57 草稿補齊:匯入(原樣照抄)後仍空白的段落,依上傳文件撰寫草稿。
   * 與 importReport 的鐵律區隔:本方法「允許改寫與摘要」,但事實與數值只能出自報告原文;
   * 缺漏資訊以「(待補: 說明)」佔位;數據段落不得自產表格與加總(由決定論引擎產出)。
   * 產出僅供匯入預覽,標記為 AI 草稿,人工確認後才寫入且查核一律重置。
   */
  async draftMissingSections(
    source: IReportImportSource,
    sectionIds: string[],
    language?: string,
  ): Promise<IImportedSegment[]> {
    const idSet = new Set(sectionIds);
    const scopedSections = CARBON_REPORT_OUTLINE.filter((section) =>
      idSet.has(section.id),
    );
    if (scopedSections.length === 0) {
      throw new ApiError(
        API_ERRORS.VL_SCHEMA_ERROR.code,
        API_ERRORS.VL_SCHEMA_ERROR.message,
        API_ERRORS.VL_SCHEMA_ERROR.status,
      );
    }

    const dataDrivenIds = scopedSections
      .filter((section) => section.isDataDriven)
      .map((section) => section.id);

    const prompt = `你是一位專業碳會計師,負責依據使用者上傳的既有溫室氣體盤查報告,為報告書標準大綱中「缺漏的段落」撰寫草稿。

【撰寫規則】
1. 每個列出的段落各撰寫一段草稿(Markdown,100~300 字),不含章節編號與段落標題。
2. 所有事實、數值、名稱、年份必須出自報告原文;報告中找不到的資訊以「(待補: 說明)」佔位,嚴禁虛構。
3. 嚴禁自行計算、換算、加總或推導任何數字。
4. 允許改寫與摘要原文以符合段落撰寫目標(此點與逐字匯入不同)。
5. ${dataDrivenIds.length > 0 ? `下列段落為數據段落:不得自行產生統計表格或加總數字,僅撰寫方法說明文字,並在表格應出現處保留「(數據表格由系統產出)」佔位:${dataDrivenIds.join(", ")}。` : "本範圍無數據段落。"}
6. 語言:${language ?? "zh-TW"}。
7. 報告原文完全沒有相關資訊的段落,仍需輸出草稿:以撰寫目標為骨架、全部關鍵資訊以「(待補: 說明)」佔位。

【待撰寫段落】
${buildOutlineCatalog(scopedSections)}${source.isText ? `\n\n【報告原文】\n${source.data}` : ""}`;

    let raw: string;
    try {
      raw = await this.getChatService().generateRawWithImages(
        prompt,
        source.isText
          ? undefined
          : [{ data: source.data, mimeType: source.mimeType }],
        true,
        buildGapFillResponseSchema(scopedSections),
        {
          temperature: LLM_TEMPERATURE.EXTRACTION,
          timeoutMs: LLM_REPORT_IMPORT_TIMEOUT_MS,
          taskKey: LlmTaskKeyEnum.REPORT_IMPORT,
          maxOutputTokens: LLM_MAX_OUTPUT_TOKENS.REPORT_IMPORT,
        },
      );
    } catch (error) {
      throw this.toImportError(error, `gap-fill(${sectionIds.length})`);
    }

    // Info: (20260727 - Tzuhan) 永不直接採信 LLM 輸出:JSON + Zod 雙重護欄
    let parsed;
    try {
      parsed = CarbonReportGapFillLlmOutputSchema.parse(JSON.parse(raw));
    } catch {
      throw new ApiError(
        API_ERRORS.IS_LLM_OUTPUT_INVALID.code,
        API_ERRORS.IS_LLM_OUTPUT_INVALID.message,
        API_ERRORS.IS_LLM_OUTPUT_INVALID.status,
      );
    }

    // Info: (20260727 - Tzuhan) 白名單複驗:範圍外段落 id 直接捨棄(草稿非原文,無保留價值);同段多片段串接
    const contentById = new Map<string, string[]>();
    parsed.segments.forEach((segment) => {
      if (!idSet.has(segment.paragraphId)) return;
      const bucket = contentById.get(segment.paragraphId) ?? [];
      bucket.push(segment.content);
      contentById.set(segment.paragraphId, bucket);
    });

    return Array.from(contentById.entries()).map(([paragraphId, parts]) => {
      const section = SECTION_BY_ID.get(paragraphId);
      return {
        paragraphId,
        title: section ? `${section.code} ${section.title}` : paragraphId,
        content: parts.join("\n\n").trim(),
      };
    });
  }
}
