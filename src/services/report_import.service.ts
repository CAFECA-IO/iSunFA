// Info: (20260716 - Tzuhan) 整份報告匯入服務(#56):
// Info: (20260716 - Tzuhan) 職責:檔案內容 → LLM 切段並對應標準大綱(enum 鎖死) → TS 白名單複驗 → 匯入預覽資料
// Info: (20260716 - Tzuhan) 鐵律:內容「原樣搬運」嚴禁改寫;對不上大綱的內容進 unmapped 桶(不丟棄,由使用者裁決);
// Info: (20260716 - Tzuhan) 報告中的數字不可信任為已驗證 — 活動數據另行萃取,交決定論引擎重新勾稽

import {
  ChatService,
  isLlmQuotaError,
  isLlmTimeoutError,
  isLlmTransportError,
  isLlmTruncatedError,
  SchemaType,
  type Schema,
} from "@/services/chat.service";
import { ZodError } from "zod";
import { describeError } from "@/lib/utils/error_message";
import {
  assessPdfTextLayer,
  extractPdfPageImagery,
  extractPdfTextLayer,
  planImageOnlyPages,
  slicePagesForRange,
  PDF_TEXT_LAYER_REASON,
} from "@/lib/pdf_text_layer";
import { PdfTextLayerDecisionEnum } from "@/constants/pdf_text_layer";
import {
  ensureTableDivider,
  trimRowsToDividerWidth,
} from "@/lib/utils/markdown_table_divider";
import { joinWrappedTableRows } from "@/lib/utils/markdown_table_rows";
import { extractPagesAsPdf } from "@/lib/utils/pdf_page_extract";
import {
  narrowVisionPagesToRange,
  type IVisionPages,
} from "@/lib/utils/pdf_vision_scope";
import { CARBON_ATTACHMENT_EXTRACTION_MAX_BYTES } from "@/constants/carbon_chatbot";
import {
  LLM_REPORT_IMPORT_TIMEOUT_MS,
  LLM_TRANSPORT_RETRY_ATTEMPTS,
  LLM_TRANSPORT_RETRY_DELAY_MS,
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
  CarbonReportImportSegmentSchema,
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
import {
  replaceOfficeSymbolChars,
  unmappedPrivateUseChars,
} from "@/lib/utils/office_symbol_chars";
import { padTableHeaderToWidest } from "@/lib/utils/markdown_table_columns";
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
/**
 * Info: (20260814 - Emily) 這次呼叫要附帶哪些圖。
 *
 * 收成一支函式而不是在兩個呼叫點各寫一次三元式：那兩處原本就是同一份邏輯的複本，
 * 而這次要加的是第三種情況（純文字 + 只附幾頁）。複本會讓它只被加在其中一處，
 * 那正是本專案這幾天反覆踩到的「只改了一端」。
 */
const buildLlmImageParts = (
  source: IReportImportSource,
): Array<{ data: string; mimeType: string }> | undefined => {
  if (!source.isText) {
    return [{ data: source.data, mimeType: source.mimeType }];
  }
  if (source.visionPages) {
    return [
      { data: source.visionPages.data, mimeType: source.visionPages.mimeType },
    ];
  }
  return undefined;
};

/**
 * Info: (20260814 - Emily) 附帶頁面的說明句。
 *
 * 沒有這句的話模型收到的是「一份文字 + 幾張沒頭沒尾的圖」，
 * 不知道那幾張圖屬於哪一節，也不知道為什麼文字裡找不到對應內容。
 * 明講頁碼：文字層帶著 `-- p.N/總頁 --` 標記，模型可以據此把圖對回原文位置。
 */
const buildImagePagesInstruction = (source: IReportImportSource): string => {
  if (!source.visionPages) return "";
  return `\n\n【附帶頁面影像】
另附原文第 ${source.visionPages.pages.join("、")} 頁的頁面影像。
這幾頁的內容**主要以圖片呈現**，文字層幾乎抽不到字 ——
文字少不代表那一節沒有內容，請直接讀圖，把其中的文字（姓名、職稱、地址、
組織層級關係等）逐字抄進對應段落，與讀原文文字時的照錄要求相同。
若圖的內容確實無法辨識，照既有規則標示，不要臆造。`;
};

export interface IReportImportSource {
  name: string;
  mimeType: string;
  // Info: (20260716 - Tzuhan) base64(pdf)或 UTF-8 純文字(md/plain,由 route 解碼)
  data: string;
  isText: boolean;
  /**
   * Info: (20260814 - Emily) 「內容只住在圖片裡」的那幾頁，抽成一份小 PDF
   * (`data/issue_drafts/open/25_image_only_sections.md`)。
   *
   * 只有走純文字路徑時才會有值。實測高興昌那份 64 頁的 p6/p7/p8
   * （組織架構圖、三個廠址地圖）正文只有 0/146/369 字元，內容全在像素裡，
   * 而整份走純文字所以從沒被看過。
   *
   * 與 `data` 併送而不是取代它：那幾頁的**上下文**仍在文字層裡，
   * 只送圖的話模型不知道它屬於哪一節。
   */
  visionPages?: IVisionPages;
}

/**
 * Info: (20260806 - Tzuhan) 來源裁決的快取,鍵為 Laria cid。
 *
 * 只存裁決結果(文字層抽出的內容或視覺降級的標記),不存原始 buffer ——
 * buffer 隨時可由 `recoverLaria(cid)` 取回,留在記憶體裡只是佔位。
 *
 * 上限刻意很小:同時進行的匯入本來就只有一份(importInFlightRef 擋著),
 * 留幾筆是為了重試與補齊那幾次呼叫。超過即汰換最舊的 ——
 * 沒有上限的快取在長跑的伺服端就是一個慢速的記憶體洩漏。
 */
const SOURCE_DECISION_CACHE_MAX = 4;
const sourceDecisionCache = new Map<string, IReportImportSource>();

const rememberSourceDecision = (
  cacheKey: string,
  source: IReportImportSource,
): void => {
  if (sourceDecisionCache.has(cacheKey)) sourceDecisionCache.delete(cacheKey);
  sourceDecisionCache.set(cacheKey, source);
  while (sourceDecisionCache.size > SOURCE_DECISION_CACHE_MAX) {
    const oldest = sourceDecisionCache.keys().next().value;
    if (oldest === undefined) break;
    sourceDecisionCache.delete(oldest);
  }
};

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
  /**
   * Info: (20260803 - Tzuhan) 只對「傳輸層沒送到」的錯誤重試(見 isLlmTransportError)。
   *
   * 為什麼不一律重試:截斷與 schema 無效是模型確實回了但不合用,同一份輸入重送必得同樣結果,
   * 重試只會把一次必然的失敗變成三次,還多付兩次 token。傳輸失敗相反 ——
   * 請求根本沒抵達,重送完全可能成功。
   *
   * 為什麼非做不可:實測(20260803)一次連線中斷讓 ch3~ch10 共八章連鎖失敗
   * (latency 從 70s 掉到 2.5s,顯然是同一條連線掛掉),而當時匯入路徑沒有任何重試,
   * 八章直接報廢、使用者只看到「Failed to import the report」。
   * 結構圖路徑早就有退避重試 —— 同一個系統對兩條路徑用兩種標準,
   * 而比較貴、比較久、比較痛的那條反而沒有。
   *
   * 遞迴而非迴圈:專案禁 await-in-loop。深度上限 = 重試次數,無堆疊風險。
   */
  private async callLlmWithTransportRetry(
    exec: () => Promise<string>,
    scope: string,
    attemptsLeft: number = LLM_TRANSPORT_RETRY_ATTEMPTS,
  ): Promise<string> {
    try {
      return await exec();
    } catch (error) {
      if (attemptsLeft <= 0 || !isLlmTransportError(error)) throw error;
      logger.warn("[ReportImportService] transport error, retrying", {
        scope,
        attemptsLeft,
        detail: describeError(error).slice(0, 160),
      });
      await new Promise((resolve) => {
        setTimeout(resolve, LLM_TRANSPORT_RETRY_DELAY_MS);
      });
      return this.callLlmWithTransportRetry(exec, scope, attemptsLeft - 1);
    }
  }

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
    /**
     * Info: (20260806 - Tzuhan) 有 cid 即可快取裁決結果(同一份檔案的文字層不會變)。
     *
     * 一份 64 頁報告要 14 次 `/import` 呼叫,而每一次都重跑一遍 PDF 文字層抽取 ——
     * log 裡 14 筆一模一樣的 `report import source decision` 就是這件事。
     * 那是純函數式的判斷(輸入相同必得相同結果),沒有理由算 14 次。
     *
     * 沒有 cid(前端退回直傳)時不快取:那時沒有可信的鍵,
     * 拿檔名當鍵會讓兩份同名不同內容的檔互相污染。
     */
    cacheKey?: string | null;
  }): Promise<IReportImportSource | null> {
    const base = { name: input.name, mimeType: input.mimeType };

    if (input.isTextMimeType) {
      return { ...base, data: input.buffer.toString("utf-8"), isText: true };
    }

    if (input.cacheKey) {
      const cached = sourceDecisionCache.get(input.cacheKey);
      if (cached) {
        /**
         * Info: (20260806 - Tzuhan) 命中也記一行:少了這行就分不清「沒重算」與「沒跑到」
         *
         * Info: (20260814 - Emily) 同一個判準要往下推一層
         * (`data/issue_drafts/open/29_source_decision_cache_vision_pages.md`)。
         *
         * 影像頁的規劃整段住在未命中的分支裡，命中時不會執行也不會記 log。
         * 08-14 兩趟匯入一趟活動數據 28/28、一趟 0/0，而只印 fileName 與 cacheKey
         * 的話兩種解釋都說得通：快取帶著影像頁而模型這次沒抽到，
         * 或快取是影像頁功能上線前寫進去的舊物件、根本沒有 `visionPages`。
         *
         * 所以命中時要把「這次到底送了什麼」印出來，而不只是「命中了」。
         */
        logger.info("report import source decision (cached)", {
          fileName: input.name,
          cacheKey: input.cacheKey,
          isText: cached.isText,
          visionPages: cached.visionPages
            ? [...cached.visionPages.pages]
            : null,
        });
        return { ...cached, name: input.name, mimeType: input.mimeType };
      }
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

    /**
     * Info: (20260806 - Tzuhan) 兩條成功路徑都寫進快取。
     * 視覺降級那條的 data 是 base64 的整份檔案 —— 體積大,但快取上限只有 4 筆,
     * 而它換掉的是每次呼叫都重跑一遍文字層抽取。
     */
    if (extracted && assessment?.decision === PdfTextLayerDecisionEnum.TEXT) {
      /**
       * Info: (20260814 - Emily) 文字層乾淨 ≠ 內容完整
       * (`data/issue_drafts/open/25_image_only_sections.md`)。
       *
       * 逐頁找出「內容只住在圖片裡」的那幾頁，抽成一份小 PDF 一起送。
       * 拿不到圖片資訊時維持現行行為（整份純文字）—— 這支是補完整性的，
       * 不該讓匯入失敗；但 `extractPdfPageImagery` 會記 log，不靜默。
       */
      const imagery = await extractPdfPageImagery(input.buffer);
      const planned = imagery
        ? planImageOnlyPages(imagery, extracted.pages)
        : null;
      const imagePages =
        planned && planned.pages.length > 0
          ? await extractPagesAsPdf(input.buffer, planned.pages)
          : null;

      const resolved: IReportImportSource = {
        ...base,
        data: extracted.text,
        isText: true,
        ...(imagePages
          ? {
              visionPages: {
                data: Buffer.from(imagePages.bytes).toString("base64"),
                mimeType: input.mimeType,
                pages: imagePages.extracted,
              },
            }
          : {}),
      };
      if (input.cacheKey) rememberSourceDecision(input.cacheKey, resolved);
      return resolved;
    }
    if (canUseVision) {
      const resolved = {
        ...base,
        data: input.buffer.toString("base64"),
        isText: false,
      };
      if (input.cacheKey) rememberSourceDecision(input.cacheKey, resolved);
      return resolved;
    }
    // Info: (20260806 - Tzuhan) 拒收不快取:那是「這份檔案不能用」,不是一個可重用的結果
    return null;
  }

  /**
   * Info: (20260730 - Tzuhan) 依頁碼範圍縮小送進 LLM 的文字(兩階段匯入的第二階段)。
   * 切片本身是純函數(slicePagesForRange),此處只負責記錄實際生效範圍與退回情況 ——
   * 成本與品質的分水嶺必須看得到,否則無從判斷索引是否可靠。
   */
  async scopeSourceToPages(
    source: IReportImportSource,
    fromPage: number,
    // Info: (20260817 - Emily) null = 沒有上界,取到文末(見 slicePagesForRange 的註解)
    toPage: number | null,
    /**
     * Info: (20260817 - Emily) 這次切的是哪一章／哪幾節。
     *
     * 原本這行只印 `fileName`,於是 `fellBack: true` **無法歸屬到節** ——
     * 一趟 14 次呼叫裡有 8 次退回送全文,而看 log 的人分不出是哪 8 次,
     * 也就推不出成因(索引缺項?切出來太短?)。
     */
    scope?: string,
  ): Promise<IReportImportSource> {
    if (!source.isText) return source;
    const slice = slicePagesForRange(source.data, fromPage, toPage);
    logger.info("report import page slice", {
      fileName: source.name,
      scope: scope ?? "(unknown)",
      requested: { fromPage, toPage },
      applied: slice.range,
      fellBack: slice.fellBack,
      chars: slice.text.length,
      originalChars: source.data.length,
    });

    const { visionPages, ...rest } = source;
    const scoped: IReportImportSource = { ...rest, data: slice.text };
    if (!visionPages) return scoped;

    /**
     * Info: (20260814 - Emily) 影像也要跟著裁,原本只裁文字
     * (`data/issue_drafts/open/25_image_only_sections.md` 的後續)。
     *
     * 原本 `return { ...source, data: slice.text }` 把 `visionPages` 原封不動帶過去,
     * 於是一份 64 頁的報告在 14 次逐章呼叫裡**重送同一份 p6/p7/p8 影像 14 次**,
     * 包括文字範圍是 p38–47 的那一次 —— 而 `buildImagePagesInstruction` 會對模型說
     * 「另附原文第 6、7、8 頁的頁面影像」,那是一句與本次範圍矛盾的指示。
     *
     * 2026-08-14 實測:15 次呼叫、input 約 41 萬 token,每一次的
     * `source decision (cached)` 都印著 `visionPages:[6,7,8]`。
     */
    const narrowed = await narrowVisionPagesToRange(visionPages, slice.range);
    if (narrowed.decision !== "kept") {
      /**
       * Info: (20260814 - Emily) 裁掉也要記一行:少了它,「這一章不需要看圖」
       * 與「該附圖但裁不動」在現場分不出來 —— 與 `source decision (cached)`
       * 補印 visionPages 同一個判準(`open/29`)。
       */
      logger.info("report import vision pages scoped", {
        fileName: source.name,
        applied: slice.range,
        decision: narrowed.decision,
        had: [...narrowed.had],
        kept: [...(narrowed.visionPages?.pages ?? [])],
      });
    }
    return narrowed.visionPages
      ? { ...scoped, visionPages: narrowed.visionPages }
      : scoped;
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
      /**
       * Info: (20260805 - Tzuhan) 只處理這幾節(該章的子集)。
       * 前端把節數多的章切成數次呼叫,讓單次請求跑得完 ——
       * 閘道的 60 秒是**閒置**逾時,而等 LLM 期間一個位元組都沒送,整段都算閒置。
       * 省略即整章,行為與先前完全相同。
       */
      sectionIds?: string[];
    },
  ): Promise<IReportImportResult> {
    const sectionIdFilter = options?.sectionIds
      ? new Set(options.sectionIds)
      : null;
    const scopedSections = CARBON_REPORT_OUTLINE.filter((section) => {
      if (sectionIdFilter) return sectionIdFilter.has(section.id);
      return options?.chapterId
        ? section.chapterId === options.chapterId
        : true;
    });
    if (scopedSections.length === 0) {
      throw new ApiError(
        API_ERRORS.VL_SCHEMA_ERROR.code,
        API_ERRORS.VL_SCHEMA_ERROR.message,
        API_ERRORS.VL_SCHEMA_ERROR.status,
      );
    }
    const withActivities = options?.extractActivities ?? true;
    /**
     * Info: (20260805 - Tzuhan) 範圍規則的措辭必須與實際範圍一致。
     *
     * 原本一律寫「其他**章節**另行處理」,而切成工作單元後,範圍是「章的一部分」——
     * 模型看到同章但不在清單裡的內容(3.5、3.6),會判斷「同一章、應該收」,
     * 於是把它塞進清單裡最後那一節。實測代價:3.4 節裡多了一整份表3.8 與對帳說明,
     * 而 3.6 節又有一份 —— 同一份內容在報告裡出現兩次。
     * 頁碼安全邊界讓模型看得到範圍外的頁,措辭就必須明說那些頁不歸這次處理。
     */
    const scopeRule = options?.sectionIds
      ? "5. 本次**只處理下方大綱列出的段落**:清單外的內容一律忽略,即使它屬於同一章 —— 那些段落由其他次呼叫處理,重複收錄會讓同一份內容在報告裡出現兩次。不要把清單外的內容併進清單內任一段落,也不要放入 unmapped;unmapped 僅放「疑似屬清單內段落但對不上細段」的原文。"
      : options?.chapterId
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
T7. **每一列的欄數必須與表頭一致。** markdown 沒有跨欄/跨列,原文的合併儲存格要照下面兩條轉寫;
    欄數對不上時多出來的欄會被整個丟掉(連內容一起),而且不會有任何錯誤。
T8. **兩層表頭**(父標題橫跨數欄、子標題在下一列):表頭列寫父標題,父標題所涵蓋的每一欄各佔一格
    (第二格起留空),下一列再寫子標題。例:
      | 設施/活動 | 溫室氣體源 | 可能產生溫室氣體種類 | | | | | | | 備註 |
      | | | CO2 | CH4 | N2O | HFCs | PFCs | NF3 | SF6 | (類別) |
    —— 不要把父標題那一列寫成 4 欄了事,那會讓後面六欄的資料全部消失。
T9. **跨欄的分隔列**(整列只有一個置中標題,如「類別二:輸入能源的間接溫室氣體排放量」)
    獨立成一列:第一格寫該標題,同列其餘儲存格全部留空。
    不要把它填進它所涵蓋的每一列的第一欄,也不要因此把原本的第一欄擠到第二欄去。
    **縱向合併的儲存格**只在該範圍的第一列寫值,其餘列的該格留空,不要逐列重複。

【標準大綱】
${buildOutlineCatalog(scopedSections)}${buildImagePagesInstruction(source)}${source.isText ? `\n\n【報告原文】\n${source.data}` : ""}`;

    const scopeLabel = options?.sectionIds
      ? options.sectionIds.join(",")
      : (options?.chapterId ?? "all");
    let raw: string;
    try {
      raw = await this.callLlmWithTransportRetry(
        () =>
          this.getChatService().generateRawWithImages(
            prompt,
            buildLlmImageParts(source),
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
          ),
        scopeLabel,
      );
    } catch (error) {
      throw this.toImportError(error, scopeLabel);
    }

    // Info: (20260714 - Tzuhan) 永不直接採信 LLM 輸出:JSON + Zod 雙重護欄
    let parsed;
    try {
      parsed = CarbonReportImportLlmOutputSchema.parse(JSON.parse(raw));
    } catch (parseError) {
      /**
       * Info: (20260803 - Tzuhan) 記下失敗的實際欄位再丟。原本是裸的 `catch {}`,
       * ZodError 被整個丟掉,前端只看到「LLM structured output failed validation」——
       * 哪一個欄位、哪一段不合形狀完全無從得知。我在同一個檔案裡已經為表號與活動數據
       * 補過同樣的洞,這裡卻還留著。
       */
      logger.error("[ReportImportService] llm output schema invalid", {
        chapterId: options?.chapterId ?? "all",
        issues:
          parseError instanceof ZodError
            ? parseError.issues
                .slice(0, 6)
                .map((issue) => `${issue.path.join(".")}: ${issue.code}`)
            : [describeError(parseError).slice(0, 120)],
      });
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
    /**
     * Info: (20260803 - Tzuhan) 逐段裁決:一段不合形狀只丟那一段,不賠掉整章。
     * 實測第二章即因單一段落不合形狀而整章 500,十幾節原文全部落空。
     */
    const rawSegments = parsed.segments;
    const validSegments = rawSegments.flatMap((candidate) => {
      const segment = CarbonReportImportSegmentSchema.safeParse(candidate);
      if (segment.success) return [segment.data];
      const raw = candidate as Record<string, unknown> | null;
      logger.warn("[ReportImportService] segment rejected", {
        paragraphId: String(raw?.paragraphId ?? "").slice(0, 40),
        contentChars:
          typeof raw?.content === "string" ? raw.content.length : null,
        issues: segment.error.issues
          .slice(0, 3)
          .map((issue) => `${issue.path.join(".")}: ${issue.code}`),
      });
      return [];
    });
    if (validSegments.length < rawSegments.length) {
      logger.warn("[ReportImportService] segment adjudication", {
        chapterId: options?.chapterId ?? "all",
        received: rawSegments.length,
        accepted: validSegments.length,
      });
    }
    /**
     * Info: (20260811 - Emily) Word 私有區符號要在落地前換成真的 Unicode
     * (issue_drafts/open/20 第 1 張票)。
     *
     * 原文的項目符號是 Wingdings 的實心圓,Word 存成 PDF 時寫的是私有使用區
     * 的 U+F06C;抽取文字層時那個碼位原樣進來,而私有區沒有任何字型有字形 ——
     * 預覽與 PDF 都是一個空心方框。實測那份 UAT 報告 57 個。
     *
     * 修在匯入落地這一層:預覽與下載的 PDF 讀同一份內容,修在渲染層只會讓兩邊分歧。
     * 換不掉的私有區字元記 log —— 每一個都會在報告上留一個方框,不能靜默通過。
     */
    const normalizeSymbols = (text: string, paragraphId: string): string => {
      const stray = unmappedPrivateUseChars(text);
      if (stray.length > 0) {
        /**
         * Info: (20260812 - Emily) 訊息不再斷言「每一個都會是方框」。
         *
         * 掃描範圍是整個 BMP 私有區(U+E000–U+F8FF),而 Big5 造字區與 HKSCS 的
         * 罕用漢字(人名用字)也落在裡面 —— 在繁中報告裡不算罕見,而它們在
         * 裝好字型的環境是**正常顯示**的。原訊息會讓維運把那些當成缺陷去追。
         * 真正需要處理的是 Word 符號字型的 U+F020–U+F0FF 區段。
         */
        logger.warn("[ReportImportService] unmapped private-use chars", {
          note: "U+F020–U+F0FF 多為 Word 符號字型；其餘可能是造字區漢字，裝好字型即正常",
          paragraphId,
          chars: stray.map(
            (char) =>
              `U+${char.codePointAt(0)?.toString(16).toUpperCase() ?? "?"}`,
          ),
        });
      }
      return replaceOfficeSymbolChars(text);
    };

    validSegments.forEach((segment) => {
      const content = normalizeSymbols(segment.content, segment.paragraphId);
      if (!scopedIds.has(segment.paragraphId)) {
        unmapped.push(content);
        return;
      }
      const bucket = contentById.get(segment.paragraphId) ?? [];
      bucket.push(content);
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
        // Info: (20260811 - Emily) 表格儲存格裡也可能有私有區符號,同樣換掉
        accepted.push({
          ...table.data,
          markdown: normalizeSymbols(table.data.markdown, segment.paragraphId),
          caption: normalizeSymbols(table.data.caption, segment.paragraphId),
        });
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
        /**
         * Info: (20260814 - Emily) 缺分隔列的表先補一條，再交給裁決
         * (`data/issue_drafts/open/47_source_table_dropped.md`)。
         *
         * 2026-08-14 匯入實測：表3.1／3.2／3.4／4.1 被 `not_a_table` 整張丟掉，
         * 而表3.1 與表3.4 **被內文引用** —— 產出的報告留著「如表 3.1，…」
         * 指向一張不存在的表。
         *
         * 那些表的內容其實是好的：表3.1 的表頭已經是 10 欄、子標題也對位，
         * 匯入 prompt 的兩層表頭要求生效了，缺的只有一條 `| --- |` ——
         * 而模型不寫它其實合理：兩層表頭的分隔列該放哪一列之後，GFM 本身沒有答案。
         *
         * **順序必須在裁決之前**：`validateSourceTables` 認的就是分隔列，
         * 排在它之後等於補了也沒用。同理也在 `padTableHeaderToWidest` 之前 ——
         * 表被丟掉的話補欄根本沒機會執行。
         */
        /**
         * Info: (20260814 - Emily) 先把被折斷的列接回一行
         * (`data/issue_drafts/open/47_source_table_dropped.md`)。
         *
         * 模型會把一格的內容折成多行輸出（原文那幾張表的表頭是窄欄多行排版），
         * 於是一列佔了三四行、每一行都不是完整的 `| ... |`。2026-08-14 的匯入實測，
         * 表4.4／4.5／4.8 就是這樣整張消失的，其中表4.8 的 `lineCount` 是 1017。
         *
         * **必須排在 `ensureTableDivider` 之前**：補分隔列的判準是「連續多列欄數一致」，
         * 而一列被切成三行之後每一行的 `|` 數量都不一樣，那個判準對它不成立。
         * 順序是：接回列的邊界 → 補分隔列 → 補欄 → 才裁決。
         *
         * ⚠️ 這個缺陷是**偶發**的：同一份原檔、同一個 commit，08-14 一趟丟三張表、
         * 另一趟零張。所以「重新匯入一次沒有 dropped」不構成驗證通過，
         * 要連續兩趟才算。
         */
        const rejoined = candidates.map((table) => {
          const fix = joinWrappedTableRows(table.markdown);
          if (fix.joined === 0) return table;
          logger.warn("[ReportImportService] source table rows rejoined", {
            paragraphId,
            tableNo: table.tableNo,
            caption: table.caption.slice(0, 40),
            rows: fix.joined,
          });
          return { ...table, markdown: fix.markdown };
        });

        const repaired = rejoined.map((table) => {
          const fix = ensureTableDivider(table.markdown);
          if (!fix.inserted) {
            /**
             * Info: (20260819 - Emily) 沒補的兩種情況要分得開。
             *
             * `skipped` 有值 = 找到了一致列但它上面還有表格列,補進去會讓整張表
             * 印成原始 markdown(`open/47` 第三種形狀,08-19 run2 實測)。
             * 這一張接下來會被 `validateSourceTables` 擋掉,而那是刻意的 ——
             * 一個看得見的失敗勝過一片管線。所以要記出來,否則它就變成
             * 「表格莫名少一張」而沒有原因。
             */
            if (fix.skipped) {
              logger.warn(
                "[ReportImportService] source table divider skipped",
                {
                  paragraphId,
                  tableNo: table.tableNo,
                  caption: table.caption.slice(0, 40),
                  reason: fix.skipped,
                },
              );
            }
            return table;
          }
          /*
           * Info: (20260814 - Emily) 補了要記出來：這是「原文長得不標準」的訊號，
           * 累積起來要回頭改 prompt，而不是永遠靠讀取端補。
           */
          logger.warn("[ReportImportService] source table divider inserted", {
            paragraphId,
            tableNo: table.tableNo,
            caption: table.caption.slice(0, 40),
          });
          return { ...table, markdown: fix.markdown };
        });

        /**
         * Info: (20260820 - Emily) 超寬列裁到分隔列的欄數
         * (`data/issue_drafts/open/47_source_table_dropped.md` 的第四種形狀)。
         *
         * 08-20 run C：`表3.4` 的第一列是 547 格、只有 5 格有字，分隔列與 14 列
         * 資料全是 6 格。GFM 因此整張不渲染 —— 渲染不變式把它改成明示丟表，
         * 紙上乾淨了，但內文還引用著那張表。只裁空白格，一格有字就不裁。
         *
         * **必須排在 `validateSourceTables` 之前**：裁完才對得上分隔列，
         * 排在裁決之後等於裁了也沒用。
         */
        const trimmedRows = repaired.map((table) => {
          const fix = trimRowsToDividerWidth(table.markdown);
          if (fix.trimmed === 0) return table;
          logger.warn("[ReportImportService] source table rows trimmed", {
            paragraphId,
            tableNo: table.tableNo,
            caption: table.caption.slice(0, 40),
            rows: fix.trimmed,
          });
          return { ...table, markdown: fix.markdown };
        });

        const shaped = trimmedRows.filter((table) => {
          const check = validateSourceTables([table]);
          if (!check.isValid) {
            /**
             * Info: (20260804 - Tzuhan) 記下被拒內容的開頭幾行。
             *
             * 原本只記 reason —— 而 `not_a_table` 檢查的正是前兩行,
             * 不把它們印出來就等於「知道被擋了,但永遠不知道為什麼」。
             * 實測代價:表3.8 被判 not_a_table,桑基圖整張消失,
             * 我卻只能從別處推論,還推錯了方向(以為是頁碼切片切掉的)。
             */
            logger.warn("[ReportImportService] source table dropped", {
              paragraphId,
              tableNo: table.tableNo,
              caption: table.caption.slice(0, 40),
              reason: check.reason ?? null,
              head: table.markdown
                .split("\n")
                .filter((line) => line.trim().length > 0)
                .slice(0, 3)
                .map((line) => line.slice(0, 120)),
              lineCount: table.markdown.split("\n").length,
              /**
               * Info: (20260817 - Emily) 被拒的**完整** markdown（上限 2000 字）。
               *
               * 08-17 那趟丟了 表2.1（三次）與 表2.2，`head[0]` 看起來是
               * 「整張表擠成一行、列與列之間用相鄰的 `||` 分隔」——
               * 但 `| a || b |` 在 GFM 裡是合法的空儲存格，
               * 光憑一行被截斷到 120 字的開頭**設計不出安全的分割規則**：
               * 那會變成又一次對著一份樣本調門檻。
               *
               * 修這一族之前需要的是可重現的輸入，不是更多推測。
               * 這一欄就是為了讓下一趟直接把它交出來，
               * 然後寫成單元測試的 fixture（`open/47`）。
               *
               * 2000 字是折衷：`lineCount` 曾經出現 1017（表4.8 那次），
               * 但那是被折斷成多行；擠成一行的情況整張通常在 2000 字內。
               * 截斷了也看得出來 —— `fullLength` 會比 `full` 長。
               */
              full: table.markdown.slice(0, 2000),
              fullLength: table.markdown.length,
            });
          }
          return check.isValid;
        });
        /**
         * Info: (20260811 - Emily) 表頭比資料列窄的表要先把欄數補齊
         * (issue_drafts/open/19 第 3 張票)。
         *
         * GFM 會把超出表頭欄數的儲存格**靜默丟棄**。原文的兩層表頭
         * (父標題橫跨數欄、子標題在下一列)在 markdown 沒有 colspan 可用,
         * 模型只能把父標題那列寫成較少的欄 —— 於是表3.1 宣告 4 欄、資料列有 10 欄,
         * 七種溫室氣體裡的五種連同「(類別)」欄一起消失,而且沒有任何錯誤訊息。
         *
         * 實測那份 UAT 報告:4 張表共 261 個非空儲存格就這樣不見了。
         * 補欄只在表頭尾端加空欄,不動任何一格既有內容;多出來的格全是空的
         * (行尾多打一個 `|`)時不補,免得憑空多一條空欄。
         *
         * 修在匯入落地這一層而不是渲染層:預覽與下載的 PDF 讀的是同一份 markdown,
         * 修在渲染層只會讓兩邊再度分歧。
         */
        const widened = shaped.map((table) => {
          const fix = padTableHeaderToWidest(table.markdown);
          if (fix.recoveredCells === 0) return table;
          logger.warn("[ReportImportService] source table header widened", {
            paragraphId,
            tableNo: table.tableNo,
            headerColumns: fix.headerColumns,
            widestColumns: fix.widestColumns,
            recoveredCells: fix.recoveredCells,
            /**
             * Info: (20260812 - Emily) 第二層表頭:那種表的欄位標籤與資料欄
             * 不對應,而補欄不修那件事(見 markdown_table_columns 檔頭)。
             * 需要人工對照原文,所以要記得出來。
             */
            hasSecondHeaderLevel: fix.hasSecondHeaderLevel,
          });
          return { ...table, markdown: fix.markdown };
        });
        // Info: (20260802 - Tzuhan) 逐張過關後仍要驗數量上限(單張檢查看不到總數)
        const withinLimit = validateSourceTables(widened);
        if (!withinLimit.isValid) {
          logger.warn("[ReportImportService] source tables dropped", {
            paragraphId,
            reason: withinLimit.reason ?? null,
            count: widened.length,
          });
        }
        return {
          paragraphId,
          title: section ? `${section.code} ${section.title}` : paragraphId,
          content: parts.join("\n\n").trim(),
          sourceTables: withinLimit.isValid ? widened : [],
        };
      },
    );

    /**
     * Info: (20260716 - Tzuhan) 活動數據逐筆裁決(壞一筆丟一筆);source 記檔名供溯源。
     *
     * Info: (20260803 - Tzuhan) 補上裁決結果的記錄。原本被拒的筆數與原因**完全無痕跡**,
     * 後果是 computedLedger 空的時候(→ 所有數據表格顯示「資料不足」、桑基圖不出現)
     * 無法分辨是「模型沒抽到」還是「抽到了但整批被 Schema 擋掉」。
     * 這與表號、API 400 是同一類問題:裁決點不留下被拒的實際值,現場就只能靠猜。
     */
    const rawActivities = parsed.activities ?? [];
    const activities: IActivityRecord[] = rawActivities.flatMap((item) => {
      const record = CarbonActivityRecordSchema.safeParse(item);
      if (record.success) return [{ ...record.data, source: source.name }];
      const rejected = item as Record<string, unknown>;
      logger.warn("[ReportImportService] activity record rejected", {
        /**
         * Info: (20260817 - Emily) 欄位名是 `sourceName` 不是 `name`
         * (`src/validators/carbon_inventory.ts` 的 `CarbonActivityRecordShape`)。
         * 原本印 `rejected?.name`,於是這一欄**永遠是空字串** ——
         * 這行 log 存在的唯一理由就是說出「被拒的是哪一筆」,而它從來沒說出來過。
         */
        sourceName: String(rejected?.sourceName ?? "").slice(0, 40),
        unit: String(rejected?.unit ?? "").slice(0, 20),
        quantity: String(rejected?.quantity ?? "").slice(0, 20),
        issues: record.error.issues
          .map((issue) => `${issue.path.join(".")}:${issue.code}`)
          .slice(0, 4)
          .join(","),
      });
      return [];
    });
    /**
     * Info: (20260817 - Emily) 這行必須**無條件印**,而且要帶得出成因
     * (`data/issue_drafts/open/46_activity_data_traceability.md`)。
     *
     * 原本 `received: 0` 把四種完全不同的上游狀態塌成同一個數字:
     *
     *   (a) 模型根本沒回 `activities` 這個鍵 —— 合法,因為 responseSchema 的
     *       `required` 沒列它,外層 Zod 也是 `.optional()`,而 `?? []` 把
     *       「缺鍵」與「空陣列」在上面那一行永久抹平
     *   (b) 模型回 `activities: []`
     *   (c) 這次呼叫其實沒帶 `withActivities` —— 原本的 `if` 守衛讓這行**根本不印**,
     *       而驗收腳本對「零筆匹配」算出來也是 0/0:
     *       「這行從沒印過」與「印了 0」在現場是同一句話
     *   (d) 回超過 50 筆 → 外層整批 throw → 該單元 500(這個看 `issues`)
     *
     * `received: 0` 只證明了不是「回了但逐筆被擋掉」那一種。
     * 加上 `withActivities` / `hasKey` / `rawSample` 之後,四種就分得開了。
     */
    logger.info("[ReportImportService] activity extraction result", {
      withActivities,
      scope: options?.sectionIds?.join(",") ?? options?.chapterId ?? "all",
      hasKey: Object.prototype.hasOwnProperty.call(parsed, "activities"),
      received: rawActivities.length,
      accepted: activities.length,
      rawSample: JSON.stringify(parsed.activities ?? null).slice(0, 200),
    });

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
${buildOutlineCatalog(scopedSections)}${buildImagePagesInstruction(source)}${source.isText ? `\n\n【報告原文】\n${source.data}` : ""}`;

    let raw: string;
    try {
      raw = await this.getChatService().generateRawWithImages(
        prompt,
        buildLlmImageParts(source),
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
