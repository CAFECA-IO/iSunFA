import { ITaskSkill } from "@/skills/types";
import { IPseudoTask, IPseudoMission } from "@/skills/types";
import { ChatService } from "@/services/chat.service";
import { prepareDocumentContext } from "@/skills/utils/document_helper";
import { UniversalAccountTag } from "@/constants/enums";
import { getCrossExchangeRateStatic } from "@/skills/utils/exchange_rate_helper";

import { SchemaType, Schema } from "@google/generative-ai";

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
    priorResults?: Map<string, string>,
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
                    "請強制以『交易項目 - 廠商簡稱』的格式輸出摘要，例如：『市內電話上網費 - 中華電信』",
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

      // Info: (20260525 - Luphia) 如果傳票幣別不是本位幣，則進行匯率換算
      let linesAiNote = "";
      try {
        const bookCurrency =
          ((mission.data.accountBook as Record<string, unknown>)
            ?.currency as string) || "TWD";
        let voucherCurrency = bookCurrency;
        let tradingDate = new Date();

        if (priorResults) {
          for (const [key, val] of priorResults.entries()) {
            if (key === "VOUCHER_BASE" || key === "VOUCHER_BASE_PARSING") {
              try {
                const baseObj = JSON.parse(val);
                if (baseObj && typeof baseObj === "object") {
                  if (baseObj.currency) {
                    voucherCurrency = String(baseObj.currency);
                  }
                  if (baseObj.tradingDate) {
                    tradingDate = new Date(baseObj.tradingDate);
                  }
                  break;
                }
              } catch {}
            }
          }
        }

        if (voucherCurrency !== bookCurrency) {
          const rate = getCrossExchangeRateStatic(
            voucherCurrency,
            bookCurrency,
            tradingDate,
          );
          console.log(
            `[VoucherLinesParsingSkill] Currency mismatch: ${voucherCurrency} vs ${bookCurrency}. Applying static exchange rate: ${rate} for tradingDate: ${tradingDate.toISOString().split("T")[0]}`,
          );

          const lineDetails: string[] = [];
          for (const line of lines) {
            if (line.amount !== undefined && line.amount !== null) {
              const origAmount = parseFloat(String(line.amount));
              if (!isNaN(origAmount)) {
                const convertedAmount = Math.round(origAmount * rate);
                line.amount = convertedAmount;
                lineDetails.push(
                  `項目: ${line.particular || "無摘要"}, 原始金額: ${origAmount} -> 換算金額: ${convertedAmount}`,
                );
              }
            }
          }

          linesAiNote =
            `[外幣換算] 原始幣別: ${voucherCurrency}, 適用匯率: ${rate.toFixed(4)}\n` +
            lineDetails.map((d) => `- ${d}`).join("\n");
        }
      } catch (err) {
        console.warn(
          `[VoucherLinesParsingSkill] Stateless conversion skipped: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      /**
       * Info: (20260522 - Tzuhan)
       * Return Clean Extraction (Without LLM Hallucinated Accounting Codes)
       */
      return JSON.stringify({ lines: lines, aiNote: linesAiNote || undefined });
    } catch (error) {
      console.error("[VoucherLinesParsingSkill] Error:", error);
      return JSON.stringify({
        error: "AI 解析傳票分錄失敗，請稍後再試",
      });
    }
  }
}
