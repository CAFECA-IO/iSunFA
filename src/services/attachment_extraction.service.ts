// Info: (20260714 - Emily) 附件解析 → 段落生成管線
// Info: (20260714 - Emily) 職責:Gemini 萃取附件事實(字串原樣,不換算) → 白名單裁決建議段落 → 呼叫 ParagraphDraftService 生成草稿
// Info: (20260714 - Emily) 降級策略(graceful fallback):解析失敗或對應不到段落時,以檔名事實 + 預設段落生成通用草稿,不中斷流程

import { SchemaType, type Schema } from "@google/generative-ai";
import { ChatService } from "@/services/chat.service";
import { ParagraphDraftService } from "@/services/paragraph_draft.service";
import { storageService } from "@/services/storage.service";
import { IAttachment } from "@/types/carbon_chatbot.types";
import { CARBON_REPORT_OUTLINE } from "@/constants/carbon_report_outline";
import {
  CARBON_ATTACHMENT_PIPELINE_MAX_PARAGRAPHS,
  CARBON_ATTACHMENT_FALLBACK_PARAGRAPH_ID,
} from "@/constants/carbon_chatbot";
import { CarbonAttachmentExtractionLlmOutputSchema } from "@/validators";
import type { CarbonChatAttachmentPayload } from "@/validators";
import {
  IAttachmentExtraction,
  IAttachmentPipelineResult,
} from "@/interfaces/carbon_attachment_extraction";
import {
  IContextFact,
  IParagraphDraftInput,
} from "@/interfaces/carbon_paragraph_draft";

// Info: (20260714 - Emily) 白名單:合法 outline 段落 id(LLM 建議必須經此裁決)
const OUTLINE_PARAGRAPH_ID_SET = new Set(
  CARBON_REPORT_OUTLINE.map((s) => s.id),
);

// Info: (20260714 - Emily) 供 LLM 對應段落的簡表(id + 標題 + 目標),控制 prompt 長度只列 id 與標題
const OUTLINE_CATALOG = CARBON_REPORT_OUTLINE.map(
  (s) => `${s.id}: ${s.code} ${s.title}`,
).join("\n");

// Info: (20260714 - Emily) Gemini responseSchema:suggestedParagraphIds 以 enum 約束,禁止 LLM 捏造段落編號
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
            description: "事實內容,數值連同單位原樣照抄,不得換算",
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
  },
  required: ["facts", "suggestedParagraphIds", "confidence"],
};

interface IPipelineInput {
  attachments: CarbonChatAttachmentPayload[];
  conversationContext: IParagraphDraftInput["conversationContext"];
  language?: string;
}

export class AttachmentExtractionService {
  // Info: (20260714 - Emily) 依賴延遲建立(避免 import 階段因缺 API Key 拋錯),測試時可注入 mock
  private readonly injectedChatService?: ChatService;
  private readonly injectedDraftService?: ParagraphDraftService;

  constructor(
    chatService?: ChatService,
    paragraphDraftService?: ParagraphDraftService,
  ) {
    this.injectedChatService = chatService;
    this.injectedDraftService = paragraphDraftService;
  }

  private getChatService(): ChatService {
    return this.injectedChatService ?? new ChatService();
  }

  private getDraftService(): ParagraphDraftService {
    return this.injectedDraftService ?? new ParagraphDraftService();
  }

  // Info: (20260714 - Emily) 附件持久化:比照 issue/mission 服務以 storageService.uploadLaria 分片入庫,回傳含 cid 的 metadata
  // Info: (20260714 - Emily) 失敗為 best-effort(cid 缺席不阻斷訊息流程);之後可經 recoverLaria(cid) 取回原檔
  async persistAttachments(
    attachments: CarbonChatAttachmentPayload[],
  ): Promise<IAttachment[]> {
    return Promise.all(
      attachments.map(async (attachment) => {
        const metadata: IAttachment = {
          name: attachment.name,
          size: attachment.size,
          mimeType: attachment.mimeType,
        };
        try {
          const buffer = Buffer.from(attachment.data, "base64");
          const file = new globalThis.File([buffer], attachment.name, {
            type: attachment.mimeType,
          });
          metadata.cid = await storageService.uploadLaria(file);
        } catch (error) {
          console.error(
            `[AttachmentExtractionService] laria upload failed for ${attachment.name}:`,
            error,
          );
        }
        return metadata;
      }),
    );
  }

  // Info: (20260714 - Emily) 單一附件萃取:失敗直接拋錯,由管線層決定降級
  async extractFactsFromAttachment(
    attachment: CarbonChatAttachmentPayload,
  ): Promise<IAttachmentExtraction> {
    const prompt = `你是一位專業碳會計師的資料萃取助手。請閱讀附件(檔名: ${attachment.name}),萃取與溫室氣體盤查相關的事實。

【萃取規則】
1. 數值連同單位「原樣照抄」為字串,嚴禁換算、加總或推導。
2. 每筆事實給定簡短 label(如「外購電力」「柴油用量」「帳單期間」)與 value。
3. source 填檔名。
4. 從下列報告段落中挑選此附件內容最相關的段落 id(最多 3 個),只能使用列表中的 id:
${OUTLINE_CATALOG}
5. confidence:內容清晰完整為 high,部分可辨識為 medium,幾乎無法辨識為 low。`;

    const raw = await this.getChatService().generateRawWithImages(
      prompt,
      [{ data: attachment.data, mimeType: attachment.mimeType }],
      true,
      EXTRACTION_RESPONSE_SCHEMA,
      { temperature: 0 },
    );

    // Info: (20260714 - Emily) 永不直接採信 LLM 輸出:JSON + Zod 雙重護欄(失敗拋錯 → 管線降級)
    const parsed = CarbonAttachmentExtractionLlmOutputSchema.parse(
      JSON.parse(raw),
    );

    // Info: (20260714 - Emily) 白名單交叉驗證:無效段落 id 一律過濾(LLM 建議僅供參考,TS 裁決)
    const validIds = parsed.suggestedParagraphIds.filter((id) =>
      OUTLINE_PARAGRAPH_ID_SET.has(id),
    );

    return {
      facts: parsed.facts.map((fact) => ({
        ...fact,
        source: fact.source ?? attachment.name,
      })),
      suggestedParagraphIds: validIds,
      confidence: parsed.confidence,
    };
  }

  // Info: (20260714 - Emily) 管線協調:逐附件萃取(失敗降級) → 段落去重限量 → 逐段生成草稿(失敗跳過)
  async runAttachmentToParagraphPipeline(
    input: IPipelineInput,
  ): Promise<IAttachmentPipelineResult> {
    let degraded = false;
    const allFacts: IContextFact[] = [];
    const orderedIds: string[] = [];

    const pushId = (id: string) => {
      if (!orderedIds.includes(id)) orderedIds.push(id);
    };

    // Info: (20260714 - Emily) 逐附件循序處理,維持結果順序可預期(demo 附件數上限 5,延遲可接受)
    for (const attachment of input.attachments) {
      try {
        const extraction = await this.extractFactsFromAttachment(attachment);
        allFacts.push(...extraction.facts);

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
        // Info: (20260714 - Emily) 解析失敗(如 Gemini 斷線、不支援格式):以檔名為事實降級生成,不中斷 demo
        console.error(
          `[AttachmentExtractionService] extraction failed for ${attachment.name}:`,
          error,
        );
        degraded = true;
        allFacts.push({
          label: "上傳檔案",
          value: attachment.name,
          source: attachment.name,
        });
        pushId(CARBON_ATTACHMENT_FALLBACK_PARAGRAPH_ID);
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
        // Info: (20260714 - Emily) 單段生成失敗僅跳過該段並標記降級,其餘段落照常產出
        console.error(
          `[AttachmentExtractionService] draft failed for ${paragraphId}:`,
          error,
        );
        degraded = true;
      }
    }

    return { drafts, facts: allFacts, degraded };
  }
}
