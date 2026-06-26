import { ITaskSkill } from "@/skills/types";
import { IPseudoTask, IPseudoMission } from "@/skills/types";
import { ChatService } from "@/services/chat.service";
import { prepareDocumentContext } from "@/skills/utils/document_helper";
import { UniversalAccountTag } from "@/constants/enums";

import { SchemaType, Schema } from "@/services/faith.service";

export class VoucherLinesParsingSkill implements ITaskSkill {
  name = "VOUCHER_LINES_PARSING";
  description =
    "Analyze the line items of a voucher document using AI Two-Turn RAG.";
  parameters = {
    type: "object",
    properties: {
      accountBookId: {
        type: "string",
        description: "The ID of the account book.",
      },
      fileId: { type: "string", description: "The ID of the uploaded file." },
      journalText: {
        type: "string",
        description: "The parsed text of the journal.",
      },
      country: {
        type: "string",
        description: "The country code of the account book.",
      },
    },
    required: ["fileId"],
  };

  async execute(
    task: IPseudoTask,
    mission: IPseudoMission,
    fullPrompt: string,
    chatService: ChatService,
  ): Promise<string> {
    const { images, parsedContext } = await prepareDocumentContext(task);
    /**
     * Info: (20260522 - Tzuhan)
     * Turn 1: 語意萃取 (Extract intent/particulars)
     */
    let turn1Prompt = fullPrompt;

    if (parsedContext.journalText) {
      turn1Prompt += `\n\n【重要指示】\n使用者已提供/修正日記帳的最新內容如下。請優先依據以下文字資訊進行解析，若與圖片內容有衝突，以此文字為準：\n${parsedContext.journalText}`;
    }

    try {
      const turn1Schema: Schema = {
        type: SchemaType.OBJECT,
        properties: {
          lines: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                particular: {
                  type: SchemaType.STRING,
                  description:
                    "請輸出適當的摘要。若是費用或採購，請以『交易項目 - 廠商簡稱』格式輸出；若是股本注資、借款等無明確廠商之交易，請原樣輸出，嚴禁自行加上『- 供應商』",
                },
                amount: { type: SchemaType.NUMBER, description: "金額" },
                isDebit: {
                  type: SchemaType.BOOLEAN,
                  description: "是否為借方",
                },
                semanticCategory: {
                  type: SchemaType.STRING,
                  description:
                    "從標準會計類別中挑選最適合的一項。若無合適選項請填寫 UNKNOWN",
                  format: "enum",
                  enum: Object.values(UniversalAccountTag),
                },
              },
              required: ["particular", "amount", "isDebit", "semanticCategory"],
            },
          },
        },
        required: ["lines"],
      };

      const turn1Text = await chatService.generateRawWithImages(
        turn1Prompt,
        images,
        true,
        turn1Schema,
      );

      const turn1Result = JSON.parse(turn1Text.trim()) as {
        lines?: Record<string, unknown>[];
      };
      const lines = turn1Result.lines || [];

      if (lines.length === 0) {
        return JSON.stringify({ lines: [] });
      }

      /**
       * Info: (20260527 - Tzuhan) [ADR Migration]
       * 過去此處包含大段的外幣匯率轉換邏輯 (Currency Mismatch Conversion)。
       * 為貫徹 Zero Trust Architecture，所有外幣換算與高精度數學運算
       * 已全數抽離至後端的 FxInterceptorService 與 VoucherPipelineOrchestrator。
       *
       * Info: (20260522 - Tzuhan)
       * Return Clean Extraction (Without LLM Hallucinated Accounting Codes)
       */
      return JSON.stringify({ lines: lines });
    } catch (error) {
      console.error("[VoucherLinesParsingSkill] Error:", error);
      return JSON.stringify({
        error: "AI 解析傳票分錄失敗，請稍後再試",
      });
    }
  }
}
