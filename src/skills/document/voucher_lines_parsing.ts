import { ITaskSkill } from "@/skills/types";
import { IPseudoTask, IPseudoMission } from "@/skills/types";
import { ChatService } from "@/services/chat.service";
import { prepareDocumentContext } from "@/skills/utils/document_helper";
import { SchemaType, Schema } from "@google/generative-ai";

export class VoucherLinesParsingSkill implements ITaskSkill {
  name = "VOUCHER_LINES_PARSING";
  description = "Analyze the line items of a voucher document using AI.";
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

    // Info: (20260501 - Luphia) Use fullPrompt provided by executor to keep worker stateless
    let promptText = fullPrompt;

    if (parsedContext.journalText) {
      promptText += `\n\n【重要指示】\n使用者已提供/修正日記帳的最新內容如下。請優先依據以下文字資訊進行解析，若與圖片內容有衝突，以此文字為準：\n${parsedContext.journalText}`;
    }

    try {
      const responseSchema = (task.data as Record<string, unknown>)
        ?.responseSchema as Schema | undefined;

      const schema: Schema = responseSchema || {
        type: SchemaType.OBJECT,
        properties: {
          lines: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                // Info: (20260520 - Tzuhan) [AUDIT FIX] 強制約束為帳本當地語系以阻止英文 AI 幻覺
                accountingCode: {
                  type: SchemaType.STRING,
                  description:
                    "會計科目名稱。必須強制輸出為『帳本當地語系』（若為台灣帳本，請絕對輸出繁體中文，例如：『預付租金』、『存出保證金』）。嚴禁輸出英文！",
                },
                particular: {
                  type: SchemaType.STRING,
                  description:
                    "請強制以『交易項目 - 廠商簡稱』的格式輸出摘要，例如：『市內電話上網費 - 中華電信』",
                },
                amount: { type: SchemaType.NUMBER, description: "金額" },
                isDebit: {
                  type: SchemaType.BOOLEAN,
                  description: "是否為借方",
                },
              },
              required: ["accountingCode", "particular", "amount", "isDebit"],
            },
          },
        },
        required: ["lines"],
      };

      const text = await chatService.generateRawWithImages(
        promptText,
        images,
        true,
        schema,
      );
      return text.trim();
    } catch (error) {
      console.error("[VoucherLinesParsingSkill] Error:", error);
      return JSON.stringify({
        error: "AI 解析傳票分錄失敗，請稍後再試",
      });
    }
  }
}
