// Info: (20260716 - Tzuhan) 整份報告匯入服務(#56):
// Info: (20260716 - Tzuhan) 職責:檔案內容 → LLM 切段並對應標準大綱(enum 鎖死) → TS 白名單複驗 → 匯入預覽資料
// Info: (20260716 - Tzuhan) 鐵律:內容「原樣搬運」嚴禁改寫;對不上大綱的內容進 unmapped 桶(不丟棄,由使用者裁決);
// Info: (20260716 - Tzuhan) 報告中的數字不可信任為已驗證 — 活動數據另行萃取,交決定論引擎重新勾稽

import { ChatService, SchemaType, type Schema } from "@/services/chat.service";
import {
  LLM_EXTRACTION_TIMEOUT_MS,
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
  CarbonActivityRecordSchema,
} from "@/validators";
import { ApiError, API_ERRORS } from "@/lib/utils/error_dictionary";
import { logger } from "@/lib/utils/logger";
import { IActivityRecord } from "@/types/carbon_chatbot.types";

// Info: (20260716 - Tzuhan) 匯入結果的單一段落(白名單複驗後)
export interface IImportedSegment {
  paragraphId: string;
  // Info: (20260716 - Tzuhan) 顯示用標題(code + title,取自大綱非 LLM)
  title: string;
  content: string;
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
          timeoutMs: LLM_EXTRACTION_TIMEOUT_MS,
          taskKey: LlmTaskKeyEnum.REPORT_IMPORT,
          // Info: (20260716 - Tzuhan) 原樣照抄需要大輸出空間:拉滿單次輸出上限
          maxOutputTokens: 8192,
        },
      );
    } catch (error) {
      logger.error(
        `[ReportImportService] LLM call failed: ${JSON.stringify(error)}`,
      );
      throw new ApiError(
        API_ERRORS.IS_REPORT_IMPORT_FAILED.code,
        API_ERRORS.IS_REPORT_IMPORT_FAILED.message,
        API_ERRORS.IS_REPORT_IMPORT_FAILED.status,
      );
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
    const unmapped: string[] = [...parsed.unmapped];
    parsed.segments.forEach((segment) => {
      if (!scopedIds.has(segment.paragraphId)) {
        unmapped.push(segment.content);
        return;
      }
      const bucket = contentById.get(segment.paragraphId) ?? [];
      bucket.push(segment.content);
      contentById.set(segment.paragraphId, bucket);
    });

    const segments: IImportedSegment[] = Array.from(contentById.entries()).map(
      ([paragraphId, parts]) => {
        const section = SECTION_BY_ID.get(paragraphId);
        return {
          paragraphId,
          title: section ? `${section.code} ${section.title}` : paragraphId,
          content: parts.join("\n\n").trim(),
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
          timeoutMs: LLM_EXTRACTION_TIMEOUT_MS,
          taskKey: LlmTaskKeyEnum.REPORT_IMPORT,
          maxOutputTokens: 8192,
        },
      );
    } catch (error) {
      logger.error(
        `[ReportImportService] gap-fill LLM call failed: ${JSON.stringify(error)}`,
      );
      throw new ApiError(
        API_ERRORS.IS_REPORT_IMPORT_FAILED.code,
        API_ERRORS.IS_REPORT_IMPORT_FAILED.message,
        API_ERRORS.IS_REPORT_IMPORT_FAILED.status,
      );
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
