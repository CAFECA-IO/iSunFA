import { ITaskSkill } from "@/skills/types";
import { IPseudoTask, IPseudoMission } from "@/skills/types";
import { ChatService } from "@/services/chat.service";
import { prepareDocumentContext } from "@/skills/utils/document_helper";
import { SchemaType, Schema } from "@google/generative-ai";
import { VendorRegistry, IEsgRule } from "@/services/rules/vendor_registry";
import { MeasurementUnit } from "@/constants/enums";

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
    priorResults?: Map<string, string>,
  ): Promise<string> {
    const { images, parsedContext } = await prepareDocumentContext(task);

    // Info: (20260501 - Luphia) Use fullPrompt provided by executor to keep worker stateless
    let promptText = fullPrompt;

    if (parsedContext.journalText) {
      promptText += `\n\n【重要指示】\n使用者已提供/修正日記帳的最新內容如下。請優先依據以下文字資訊進行解析，若與圖片內容有衝突，以此文字為準：\n${parsedContext.journalText}`;
    }

    let esgRuleForFallback: IEsgRule | null = null;

    if (priorResults) {
      let baseParsed: Record<string, unknown> | null = null;
      for (const prevResultStr of priorResults.values()) {
        try {
          const parsed = JSON.parse(prevResultStr);
          const actualParsed = parsed.data || parsed;
          if (actualParsed.vendorName && actualParsed.documentType) {
            baseParsed = actualParsed;
            break;
          }
        } catch {}
      }

      if (baseParsed && baseParsed.vendorName) {
        const esgRule = VendorRegistry.matchEsg(
          String(baseParsed.vendorName),
          String(baseParsed.documentType || "ACCRUAL_NOTICE"),
        );

        if (esgRule) {
          if (esgRule.suppressEsg) {
            console.log(
              `[EsgParsingSkill] 🎯 Stage 2 Match: ESG suppressed for ${baseParsed.vendorName} (${baseParsed.documentType})`,
            );
            return JSON.stringify({
              generationSource: "RULE_ENGINE_STAGE_2",
              confidence: 100,
              aiNote:
                "系統判定：此為資金沖銷/繳費收據，非實體消耗，因此無須計算碳排。",
              scope: null,
              activityType: "N/A",
              amount: "0",
              unit: "KG",
            });
          } else {
            console.log(
              `[EsgParsingSkill] 🎯 Stage 2 Match: Deterministic ESG rules found for ${baseParsed.vendorName}, falling back to AI for coefficient estimation.`,
            );
            esgRuleForFallback = esgRule;
            promptText += `\n\n【決定論攔截指示】\n系統已判定此廠商為 ${esgRule.esgScope} / ${esgRule.esgActivityType}。請你「強制」使用此範疇與活動類型，並依據其通用知識，僅輸出一個最接近的「官方標準大類標籤」(fallbackCategory)，嚴禁自行推估數值。必須從提供的 Enum 清單中選擇。`;
          }
        }
      }
    }

    try {
      const responseSchema: Schema = {
        type: SchemaType.OBJECT,
        properties: {
          scope: {
            type: SchemaType.STRING,
            description: "範疇，如 SCOPE_1, SCOPE_2, SCOPE_3",
          },
          activityType: { type: SchemaType.STRING, description: "活動類型" },
          vendor: { type: SchemaType.STRING, description: "供應商" },
          amount: { type: SchemaType.NUMBER, description: "數量" },
          unit: {
            type: SchemaType.STRING,
            description:
              "單位 (必須是以下之一: KWH, LITER, KG, TONNE, GALLON, PIECE, TWD)",
            format: "enum",
            // Info: (20260520 - Tzuhan) [AUDIT FIX] CPA directive: Refactor magic strings to Enum
            enum: Object.values(MeasurementUnit),
          },
          fallbackCategory: {
            type: SchemaType.STRING,
            description: "最接近的官方標準大類標籤",
            format: "enum",
            enum: [
              // Info: (20260521 - Tzuhan) --- 能源與燃料 (Scope 1 & 2) ---
              "外購電力與熱能",
              "天然氣與瓦斯",
              "汽油與航空燃油",
              "柴油與重油",
              "煤炭與固體燃料",
              "生質能與替代燃料",

              // Info: (20260521 - Tzuhan) --- 逸散與環境 (Scope 1 & 3) ---
              "冷媒與工業氣體",
              "自來水與污水處理",
              "廢棄物處理與回收",

              // Info: (20260521 - Tzuhan) --- 交通與物流 (Scope 1 & 3) ---
              "陸上交通與通勤",
              "航空運輸",
              "貨運與物流",

              // Info: (20260521 - Tzuhan) --- 採購商品 (Scope 3 - 實體物品) ---
              "塑膠與橡膠製品",
              "金屬與礦物製品",
              "紙製品與木材",
              "電子與電機設備",
              "化學品與溶劑",
              "農林漁牧與食品",
              "紡織與服飾",

              // Info: (20260521 - Tzuhan) --- 採購服務與資本財 (Scope 3 - 無形服務) ---
              "資訊與通訊服務",
              "住宿與餐飲服務",
              "不動產與設備租賃",
              "專業與各項服務",

              // Info: (20260521 - Tzuhan) --- 兜底防線 ---
              "其他未知項目",
            ],
          },
          aiNote: {
            type: SchemaType.STRING,
            description: "AI 分析邏輯",
          },
          confidence: {
            type: SchemaType.NUMBER,
            description: "信心指數 1-100",
          },
        },
        required: [
          "scope",
          "activityType",
          "vendor",
          "amount",
          "unit",
          "aiNote",
          "confidence",
          "fallbackCategory",
        ],
      };

      let text = await chatService.generateRawWithImages(
        promptText,
        images,
        true,
        responseSchema,
      );

      text = text.trim();

      try {
        const parsed = JSON.parse(text);
        if (typeof parsed === "object") {
          if (esgRuleForFallback && !parsed.error) {
            parsed.scope = esgRuleForFallback.esgScope || parsed.scope;
            parsed.activityType =
              esgRuleForFallback.esgActivityType || parsed.activityType;
            parsed.unit = esgRuleForFallback.esgUnit || parsed.unit;
            parsed.generationSource = "HYBRID_STAGE_2_AND_3";
            if (parsed.aiNote) {
              parsed.aiNote = `[混合決策] 範疇與活動由規則引擎鎖定，係數由 AI 推估。原註記: ${parsed.aiNote}`;
            } else {
              parsed.aiNote =
                "[混合決策] 範疇與活動由規則引擎鎖定，係數由 AI 推估。";
            }
            text = JSON.stringify(parsed);
          } else if (!parsed.generationSource) {
            parsed.generationSource = "LLM_FALLBACK_STAGE_3";
            text = JSON.stringify(parsed);
          }
        }
      } catch {}

      return text;
    } catch (error) {
      console.error("[EsgParsingSkill] Error:", error);
      return JSON.stringify({
        error: "AI 解析碳盤查失敗，請稍後再試",
      });
    }
  }
}
