// Info: (20260714 - Emily) 附件解析 → 段落生成管線
// Info: (20260714 - Emily) 職責: Gemini 萃取附件事實(字串原樣，不換算) → 白名單裁決建議段落 → 呼叫 ParagraphDraftService 生成草稿
// Info: (20260714 - Emily) 降級策略(graceful fallback): 解析失敗或對應不到段落時，以檔名事實 + 預設段落生成通用草稿，不中斷流程

// Info: (20260714 - Emily) AI 串接單一閘道: SDK 型別與呼叫一律經 chat.service，本檔不直接依賴 @google/generative-ai
import { ChatService, SchemaType, type Schema } from "@/services/chat.service";
import {
  LLM_EXTRACTION_TIMEOUT_MS,
  LLM_TEMPERATURE,
  LlmTaskKeyEnum,
} from "@/constants/llm";
import { logger } from "@/lib/utils/logger";
import { ParagraphDraftService } from "@/services/paragraph_draft.service";
import { storageService, StorageService } from "@/services/storage.service";
import { IAttachment, IActivityRecord } from "@/types/carbon_chatbot.types";
import { CARBON_REPORT_OUTLINE } from "@/constants/carbon_report_outline";
import {
  CARBON_ATTACHMENT_PIPELINE_MAX_PARAGRAPHS,
  CARBON_ATTACHMENT_FALLBACK_PARAGRAPH_ID,
  CARBON_ATTACHMENT_EXTRACTION_MAX_BYTES,
} from "@/constants/carbon_chatbot";
import {
  CarbonAttachmentExtractionLlmOutputSchema,
  CarbonActivityRecordSchema,
} from "@/validators";
import { GhgProtocolCategory } from "@/constants/esg";
import { MeasurementUnit } from "@/constants/enums";
import {
  IAttachmentExtraction,
  IAttachmentPipelineResult,
} from "@/interfaces/carbon_attachment_extraction";
import {
  IContextFact,
  IParagraphDraftInput,
} from "@/interfaces/carbon_paragraph_draft";

// Info: (20260714 - Emily) 白名單: 合法 outline 段落 id(LLM 建議必須經此裁決)
const OUTLINE_PARAGRAPH_ID_SET = new Set(
  CARBON_REPORT_OUTLINE.map((s) => s.id),
);

// Info: (20260714 - Emily) 供 LLM 對應段落的簡表(id + 標題 + 目標)，控制 prompt 長度只列 id 與標題
const OUTLINE_CATALOG = CARBON_REPORT_OUTLINE.map(
  (s) => `${s.id}: ${s.code} ${s.title}`,
).join("\n");

// Info: (20260714 - Emily) Gemini responseSchema:suggestedParagraphIds 以 enum 約束，禁止 LLM 捏造段落編號
const EXTRACTION_RESPONSE_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    facts: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          label: { type: SchemaType.STRING, description: "事實名稱" },
          value: {
            type: SchemaType.STRING,
            description: "事實內容，數值連同單位原樣照抄，不得換算",
          },
          source: { type: SchemaType.STRING, description: "出處(如檔名)" },
        },
        required: ["label", "value"],
      },
    },
    suggestedParagraphIds: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.STRING,
        format: "enum",
        enum: CARBON_REPORT_OUTLINE.map((s) => s.id),
      },
    },
    confidence: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["high", "medium", "low"],
    },
    // Info: (20260716 - Emily) #6518 活動數據: enum 鎖死範疇/單位，數值原樣字串(嚴禁換算)
    activities: {
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
            description: "數量原樣照抄，嚴禁換算或加總",
          },
          unit: {
            type: SchemaType.STRING,
            format: "enum",
            enum: Object.values(MeasurementUnit),
          },
          confidence: {
            type: SchemaType.STRING,
            format: "enum",
            enum: ["high", "medium", "low"],
          },
        },
        required: ["scopeCategory", "sourceName", "quantity", "unit"],
      },
    },
  },
  required: ["facts", "suggestedParagraphIds", "confidence"],
};

interface IPipelineInput {
  // Info: (20260714 - Emily) 附件為 metadata+cid(檔案已於選檔時上傳 Laria)；內容由管線經 recoverLaria 取回
  attachments: IAttachment[];
  conversationContext: IParagraphDraftInput["conversationContext"];
  language?: string;
}

// Info: (20260714 - Emily) 萃取來源: 自 Laria 取回後的檔案內容(base64)
interface IExtractionSource {
  name: string;
  mimeType: string;
  data: string;
}

export class AttachmentExtractionService {
  // Info: (20260714 - Emily) 依賴延遲建立(避免 import 階段因缺 API Key 拋錯)，測試時可注入 mock
  private readonly injectedChatService?: ChatService;
  private readonly injectedDraftService?: ParagraphDraftService;
  private readonly injectedStorageService?: StorageService;

  constructor(
    chatService?: ChatService,
    paragraphDraftService?: ParagraphDraftService,
    injectedStorageService?: StorageService,
  ) {
    this.injectedChatService = chatService;
    this.injectedDraftService = paragraphDraftService;
    this.injectedStorageService = injectedStorageService;
  }

  private getChatService(): ChatService {
    return this.injectedChatService ?? new ChatService();
  }

  private getDraftService(): ParagraphDraftService {
    return this.injectedDraftService ?? new ParagraphDraftService();
  }

  private getStorageService(): StorageService {
    return this.injectedStorageService ?? storageService;
  }

  // Info: (20260714 - Emily) 單一附件萃取: 失敗直接拋錯，由管線層決定降級
  async extractFactsFromAttachment(
    attachment: IExtractionSource,
  ): Promise<IAttachmentExtraction> {
    const prompt = `你是一位專業碳會計師的資料萃取助手。請閱讀附件(檔名: ${attachment.name})，萃取與溫室氣體盤查相關的事實。

【萃取規則】
1. 數值連同單位「原樣照抄」為字串，嚴禁換算、加總或推導。
2. 每筆事實給定簡短 label(如「外購電力」「柴油用量」「帳單期間」)與 value。
3. source 填檔名。
4. 從下列報告段落中挑選此附件內容最相關的段落 id(最多 3 個)，只能使用列表中的 id:
${OUTLINE_CATALOG}
5. confidence: 內容清晰完整為 high，部分可辨識為 medium，幾乎無法辨識為 low。
6. activities: 附件中的活動數據(如用電度數、油品公升數)。quantity 原樣照抄為字串，嚴禁換算或加總；單位只能從列舉挑選，對不上就整筆省略。`;

    const raw = await this.getChatService().generateRawWithImages(
      prompt,
      [{ data: attachment.data, mimeType: attachment.mimeType }],
      true,
      EXTRACTION_RESPONSE_SCHEMA,
      {
        // Info: (20260716 - Emily) 萃取 Temperature = 0；大附件 inline 萃取較慢，逾時 120s(#6515)
        temperature: LLM_TEMPERATURE.EXTRACTION,
        timeoutMs: LLM_EXTRACTION_TIMEOUT_MS,
        taskKey: LlmTaskKeyEnum.ATTACHMENT_EXTRACTION,
      },
    );

    // Info: (20260714 - Emily) 永不直接採信 LLM 輸出: JSON + Zod 雙重護欄(失敗拋錯 → 管線降級)
    const parsed = CarbonAttachmentExtractionLlmOutputSchema.parse(
      JSON.parse(raw),
    );

    // Info: (20260714 - Emily) 白名單交叉驗證: 無效段落 id 一律過濾(LLM 建議僅供參考，TS 裁決)
    const validIds = parsed.suggestedParagraphIds.filter((id) =>
      OUTLINE_PARAGRAPH_ID_SET.has(id),
    );

    // Info: (20260716 - Emily) #6518 活動數據逐筆裁決: 壞欄位丟該筆不廢全包；source 記檔名供溯源
    const activities: IActivityRecord[] = (parsed.activities ?? []).flatMap(
      (item) => {
        const record = CarbonActivityRecordSchema.safeParse(item);
        return record.success
          ? [{ ...record.data, source: attachment.name }]
          : [];
      },
    );

    return {
      facts: parsed.facts.map((fact) => ({
        ...fact,
        source: fact.source ?? attachment.name,
      })),
      suggestedParagraphIds: validIds,
      confidence: parsed.confidence,
      activities,
    };
  }

  // Info: (20260714 - Emily) 管線協調: 逐附件萃取(失敗降級) → 段落去重限量 → 逐段生成草稿(失敗跳過)
  async runAttachmentToParagraphPipeline(
    input: IPipelineInput,
  ): Promise<IAttachmentPipelineResult> {
    let degraded = false;
    const allFacts: IContextFact[] = [];
    const allActivities: IActivityRecord[] = [];
    const orderedIds: string[] = [];

    const pushId = (id: string) => {
      if (!orderedIds.includes(id)) orderedIds.push(id);
    };

    // Info: (20260714 - Emily) 降級共用: 以檔名為事實 + 預設段落，不中斷 demo
    const degradeWithFilename = (name: string) => {
      degraded = true;
      allFacts.push({ label: "上傳檔案", value: name, source: name });
      pushId(CARBON_ATTACHMENT_FALLBACK_PARAGRAPH_ID);
    };

    // Info: (20260714 - Emily) 逐附件循序處理，維持結果順序可預期(demo 附件數上限 5，延遲可接受)
    for (const attachment of input.attachments) {
      // Info: (20260714 - Emily) 無 cid(上傳失敗的殘留)直接降級
      if (!attachment.cid) {
        degradeWithFilename(attachment.name);
        continue;
      }

      // Info: (20260714 - Emily) 自 Laria 取回原檔；取回失敗降級
      let buffer: Buffer;
      try {
        buffer = await this.getStorageService().recoverLaria(attachment.cid);
      } catch (error) {
        logger.error(
          `[AttachmentExtractionService] laria recover failed for ${attachment.name}: ${JSON.stringify(error)}`,
        );
        degradeWithFilename(attachment.name);
        continue;
      }

      // Info: (20260714 - Emily) 決定性防線: 超過 Gemini inline 安全值的大檔直接降級，不送必失敗的萃取呼叫
      if (buffer.length > CARBON_ATTACHMENT_EXTRACTION_MAX_BYTES) {
        degradeWithFilename(attachment.name);
        continue;
      }

      try {
        const extraction = await this.extractFactsFromAttachment({
          name: attachment.name,
          mimeType: attachment.mimeType ?? "application/octet-stream",
          data: buffer.toString("base64"),
        });
        allFacts.push(...extraction.facts);
        allActivities.push(...extraction.activities);

        if (
          extraction.suggestedParagraphIds.length === 0 ||
          extraction.confidence === "low"
        ) {
          // Info: (20260714 - Emily) 對應不到段落或信心不足 → 預設落點 + 標記降級
          degraded = true;
          pushId(CARBON_ATTACHMENT_FALLBACK_PARAGRAPH_ID);
        } else {
          extraction.suggestedParagraphIds.forEach(pushId);
        }
      } catch (error) {
        // Info: (20260714 - Emily) 解析失敗(如 Gemini 斷線、不支援格式): 降級生成
        logger.error(
          `[AttachmentExtractionService] extraction failed for ${attachment.name}: ${JSON.stringify(error)}`,
        );
        degradeWithFilename(attachment.name);
      }
    }

    const targetIds = orderedIds.slice(
      0,
      CARBON_ATTACHMENT_PIPELINE_MAX_PARAGRAPHS,
    );

    const drafts: IAttachmentPipelineResult["drafts"] = [];
    for (const paragraphId of targetIds) {
      try {
        const draft = await this.getDraftService().generateParagraphDraft({
          paragraphId,
          conversationContext: input.conversationContext,
          contextFacts: allFacts,
          language: input.language,
        });
        drafts.push(draft);
      } catch (error) {
        // Info: (20260714 - Emily) 單段生成失敗僅跳過該段並標記降級，其餘段落照常產出
        logger.error(
          `[AttachmentExtractionService] draft failed for ${paragraphId}: ${JSON.stringify(error)}`,
        );
        degraded = true;
      }
    }

    return { drafts, facts: allFacts, degraded, activities: allActivities };
  }
}
