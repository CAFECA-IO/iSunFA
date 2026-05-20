import { ITaskSkill } from "@/skills/types";
import { IPseudoTask, IPseudoMission } from "@/skills/types";
import { ChatService } from "@/services/chat.service";
import { prepareDocumentContext } from "@/skills/utils/document_helper";
import { SchemaType, Schema } from "@google/generative-ai";
import { MoneyUtil } from "@/lib/utils/money";
import { VendorRegistry } from "@/services/rules/vendor_registry";

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
    priorResults?: Map<string, string>,
  ): Promise<string> {
    const { images, parsedContext } = await prepareDocumentContext(task);

    // Info: (20260501 - Luphia) Use fullPrompt provided by executor to keep worker stateless
    let promptText = fullPrompt;

    if (parsedContext.journalText) {
      promptText += `\n\n【重要指示】\n使用者已提供/修正日記帳的最新內容如下。請優先依據以下文字資訊進行解析，若與圖片內容有衝突，以此文字為準：\n${parsedContext.journalText}`;
    }

    // Info: (20260511 - Tzuhan) Stage 2 Deterministic Routing Intercept
    if (priorResults) {
      let baseParsed: Record<string, unknown> | null = null;
      for (const prevResultStr of priorResults.values()) {
        try {
          const parsed = JSON.parse(prevResultStr);
          const actualParsed = parsed.data || parsed;

          if (actualParsed.error) {
            throw new Error(`AI 解析失敗: ${actualParsed.error}`);
          }

          if (actualParsed.vendorName && actualParsed.documentType) {
            baseParsed = actualParsed;
            break;
          }
        } catch (err) {
          if (err instanceof Error && err.message.includes("AI 解析失敗")) {
            throw err;
          }
        }
      }

      if (baseParsed && baseParsed.vendorName) {
        const matchedRules = VendorRegistry.match(
          String(baseParsed.vendorName),
          String(baseParsed.documentType || "ACCRUAL_NOTICE"),
        );

        if (matchedRules && matchedRules.length > 0) {
          const lines = matchedRules.map((rule) => ({
            accountingCode: rule.accountingCode,
            isDebit: rule.isDebit,
            particular: rule.isDebit
              ? `支付 ${baseParsed.vendorName}`
              : `應付 ${baseParsed.vendorName}`,
            amount: MoneyUtil.parseInput(String(baseParsed.totalAmount || "0")),
          }));

          console.log(
            `[VoucherLinesParsingSkill] 🎯 Stage 2 Match: Deterministic rules applied for ${baseParsed.vendorName}`,
          );
          return JSON.stringify({
            generationSource: "RULE_ENGINE_STAGE_2",
            confidence: 100,
            aiNote: "Stage 2: Deterministic Routing Applied (TypeScript Rules)",
            lines: lines,
          });
        }
      }
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
                  description: "摘要說明",
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
