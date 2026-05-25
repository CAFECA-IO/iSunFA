import { ITaskSkill } from "@/skills/types";
import { IPseudoTask, IPseudoMission } from "@/skills/types";
import { ChatService } from "@/services/chat.service";
import { prepareDocumentContext } from "@/skills/utils/document_helper";
import { Schema } from "@google/generative-ai";
import { getCrossExchangeRateStatic } from "@/skills/utils/exchange_rate_helper";

export class VoucherBaseParsingSkill implements ITaskSkill {
  name = "VOUCHER_BASE_PARSING";
  description = "Analyze the base data of a voucher document using AI.";
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
      const text = await chatService.generateRawWithImages(
        promptText,
        images,
        true,
        responseSchema,
      );

      const parsedVal = JSON.parse(text.trim()) as Record<string, unknown>;
      try {
        const bookCurrency =
          ((mission.data.accountBook as Record<string, unknown>)
            ?.currency as string) || "TWD";
        const voucherCurrency = (parsedVal.currency as string) || bookCurrency;

        if (voucherCurrency !== bookCurrency) {
          const tradingDate = new Date(
            (parsedVal.tradingDate as string) || new Date(),
          );
          const rate = getCrossExchangeRateStatic(
            voucherCurrency,
            bookCurrency,
            tradingDate,
          );
          console.log(
            `[VoucherBaseParsingSkill] Currency mismatch: ${voucherCurrency} vs ${bookCurrency}. Applying static exchange rate: ${rate} for tradingDate: ${tradingDate.toISOString().split("T")[0]}`,
          );

          let noteMessage = `[外幣換算] 原始幣別: ${voucherCurrency}, 適用匯率: ${rate.toFixed(4)}, 本位幣為: ${bookCurrency}`;

          if (
            parsedVal.totalAmount !== undefined &&
            parsedVal.totalAmount !== null
          ) {
            const origTotal = parseFloat(String(parsedVal.totalAmount));
            if (!isNaN(origTotal)) {
              const convertedTotal = Math.round(origTotal * rate);
              parsedVal.totalAmount = convertedTotal;
              noteMessage = `[外幣換算] 原始幣別: ${voucherCurrency}, 原始金額: ${origTotal}, 適用匯率: ${rate.toFixed(4)}, 換算為 ${bookCurrency} 金額: ${convertedTotal}`;
            }
          }

          parsedVal.note = parsedVal.note
            ? `${String(parsedVal.note)} (${noteMessage})`
            : noteMessage;
          parsedVal.aiNote = parsedVal.aiNote
            ? `${String(parsedVal.aiNote)}\n${noteMessage}`
            : noteMessage;
        }
      } catch (err) {
        console.warn(
          `[VoucherBaseParsingSkill] Stateless conversion skipped: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      return JSON.stringify(parsedVal);
    } catch (error) {
      console.error("[VoucherBaseParsingSkill] Error:", error);
      return JSON.stringify({
        error: "AI 解析傳票基礎資料失敗，請稍後再試",
      });
    }
  }
}
