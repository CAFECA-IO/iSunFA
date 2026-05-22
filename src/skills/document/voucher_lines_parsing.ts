import { ITaskSkill } from "@/skills/types";
import { IPseudoTask, IPseudoMission } from "@/skills/types";
import { ChatService } from "@/services/chat.service";
import { prepareDocumentContext } from "@/skills/utils/document_helper";
import { SchemaType, Schema } from "@google/generative-ai";
import { CoaVectorSearchService } from "@/services/coa_vector_search.service";
import { CountryCode, JournalGenerationSource } from "@/constants/enums";
import { ACCOUNTS } from "@/constants/accounts";

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
    const country =
      (task.data as Record<string, unknown>)?.country || CountryCode.TW;
    const dictionary =
      ACCOUNTS[country as CountryCode] || ACCOUNTS[CountryCode.TW];

    // ==========================================
    // Turn 1: 語意萃取 (Extract intent/particulars)
    // ==========================================
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
              },
              required: ["particular", "amount", "isDebit"],
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

      const turn1Result = JSON.parse(turn1Text.trim());
      const lines = turn1Result.lines || [];

      if (lines.length === 0) {
        return JSON.stringify({ lines: [] });
      }

      // ==========================================
      // Vector RAG: Fetch Top 10 Candidates per line
      // ==========================================
      const linesWithCandidates = lines.map((line: Record<string, unknown>) => {
        const candidates = CoaVectorSearchService.matchTopN(
          (line.particular as string) || "",
          country as CountryCode,
          10,
        );

        // Fetch display names for the prompt
        const candidateDetails = candidates.map((code) => {
          const acc = dictionary.find((a) => a.code === code);
          return {
            code,
            name: acc ? acc.name : "Unknown",
            description: acc ? acc.description : "",
          };
        });

        return {
          ...line,
          candidates: candidateDetails,
        };
      });

      // ==========================================
      // Turn 2: 讓 AI 從候選清單中決策科目
      // ==========================================
      const turn2Prompt = `
你剛才已經從憑證中萃取出 ${lines.length} 筆明細。
現在，我們需要為每一筆明細決定正確的會計科目代碼 (accountingCode)。

以下是每一筆明細的摘要與系統透過 Vector RAG 找出的前 10 名候選科目：
${JSON.stringify(linesWithCandidates, null, 2)}

請綜合憑證的上下文與你的財務會計專業知識，從候選清單中為每一行選擇「最合理的一個」科目代碼。
如果候選清單中真的沒有任何合適的項目，你可以回傳 "UNKNOWN"。
絕對不可以發明候選清單以外的會計代碼！
      `;

      const turn2Schema: Schema = {
        type: SchemaType.OBJECT,
        properties: {
          lines: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                particular: { type: SchemaType.STRING },
                amount: { type: SchemaType.NUMBER },
                isDebit: { type: SchemaType.BOOLEAN },
                accountingCode: {
                  type: SchemaType.STRING,
                  description: "從候選清單中挑選出的會計科目代碼",
                },
              },
              required: ["particular", "amount", "isDebit", "accountingCode"],
            },
          },
        },
        required: ["lines"],
      };

      // Notice: Turn 2 uses the same images for context
      const turn2Text = await chatService.generateRawWithImages(
        turn2Prompt,
        images,
        true,
        turn2Schema,
      );

      const turn2Result = JSON.parse(turn2Text.trim());

      // ==========================================
      // Audit Trail Injection (isVerified: false)
      // ==========================================
      const finalLines = (turn2Result.lines || []).map(
        (line: Record<string, unknown>) => {
          return {
            ...line,
            isVerified: false,
            generationSource: JournalGenerationSource.AI_SPECULATIVE,
          };
        },
      );

      return JSON.stringify({ lines: finalLines });
    } catch (error) {
      console.error("[VoucherLinesParsingSkill] Error:", error);
      return JSON.stringify({
        error: "AI 解析傳票分錄失敗 (Two-Turn RAG Error)，請稍後再試",
      });
    }
  }
}
