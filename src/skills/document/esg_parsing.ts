import { ITaskSkill } from "@/skills/types";
import { IPseudoTask, IPseudoMission } from "@/skills/types";
import { ChatService } from "@/services/chat.service";
import { prepareDocumentContext } from "@/skills/utils/document_helper";
import { SchemaType, Schema } from "@google/generative-ai";

export class EsgParsingSkill implements ITaskSkill {
  name = "ESG_PARSING";
  description = "Analyze the ESG data from a document using AI.";
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
      const responseSchema: Schema = {
        type: SchemaType.OBJECT,
        properties: {
          tradingDate: {
            type: SchemaType.STRING,
            description: "交易日期 YYYY-MM-DD",
          },
          scope: {
            type: SchemaType.STRING,
            description: "範疇，如 SCOPE_1, SCOPE_2, SCOPE_3",
          },
          activityType: { type: SchemaType.STRING, description: "活動類型" },
          vendor: { type: SchemaType.STRING, description: "供應商" },
          amount: { type: SchemaType.NUMBER, description: "數量" },
          unit: { type: SchemaType.STRING, description: "單位" },
          emissions: { type: SchemaType.NUMBER, description: "碳排放量" },
          intensity: {
            type: SchemaType.STRING,
            description: "排放強度 HIGH, MEDIUM, LOW",
          },
          dqiScore: {
            type: SchemaType.NUMBER,
            description: "數據品質分數 1-5",
          },
          confidence: {
            type: SchemaType.NUMBER,
            description: "信心指數 1-100",
          },
          coefficientId: {
            type: SchemaType.STRING,
            description: "使用既有係數之 ID",
            nullable: true,
          },
          newCoefficient: {
            type: SchemaType.OBJECT,
            nullable: true,
            properties: {
              name: { type: SchemaType.STRING },
              description: { type: SchemaType.STRING },
              unit: { type: SchemaType.STRING },
              emissionFactor: { type: SchemaType.NUMBER },
              source: { type: SchemaType.STRING },
            },
          },
          emissionSourceId: {
            type: SchemaType.STRING,
            description: "使用既有排放源歸口 ID",
            nullable: true,
          },
          newEmissionSource: {
            type: SchemaType.OBJECT,
            nullable: true,
            properties: {
              name: { type: SchemaType.STRING },
            },
          },
          aiNote: { type: SchemaType.STRING, description: "AI 分析備註" },
        },
        required: [
          "scope",
          "activityType",
          "vendor",
          "amount",
          "unit",
          "emissions",
          "confidence",
          "aiNote",
        ],
      };

      const text = await chatService.generateRawWithImages(
        promptText,
        images,
        true,
        responseSchema,
      );
      return JSON.stringify({ data: JSON.parse(text) });
    } catch (error) {
      console.error("[EsgParsingSkill] Error:", error);
      return JSON.stringify({
        data: null,
        error: "AI 解析碳盤查失敗，請稍後再試",
      });
    }
  }
}
