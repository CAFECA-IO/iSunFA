import { ITaskSkill } from "@/skills/types";
import { IPseudoTask, IPseudoMission } from "@/skills/types";
import { ChatService } from "@/services/chat.service";
import { prepareDocumentContext } from "@/skills/utils/document_helper";
import { SchemaType, Schema } from "@google/generative-ai";
import { EsgGenerationSource, EsgFallbackCategory } from "@/constants/enums";
import { MeasurementUnit } from "@/constants/enums";
import { ALL_COEFFICIENTS } from "@/constants/true_esg_coefficients";
import { MOCK_EEIO_COEFFICIENTS } from "@/constants/mock_eeio_coefficients";
import { MoneyUtil } from "@/lib/utils/money";
import { EmissionFactorRepo } from "@/repositories/emission_factor.repo";
import { prisma } from "@/lib/prisma";

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
    // priorResults?: Map<string, string>,
  ): Promise<string> {
    const { images, parsedContext } = await prepareDocumentContext(task);

    // Info: (20260501 - Luphia) Use fullPrompt provided by executor to keep worker stateless
    let promptText = fullPrompt;

    if (parsedContext.journalText) {
      promptText += `\n\n【重要指示】\n使用者已提供/修正日記帳的最新內容如下。請優先依據以下文字資訊進行解析，若與圖片內容有衝突，以此文字為準：\n${parsedContext.journalText}`;
    }

    try {
      // Info: (20260522 - Tzuhan) [ADR 006] 動態兩回合檢索 (Two-Turn RAG)
      // ==========================================
      // Info: (20260522 - Tzuhan) Turn 1: 意圖與關鍵字萃取
      // ==========================================
      const turn1Prompt =
        promptText +
        `\n\n[Turn 1 指示]\n請分析此憑證的範疇、活動類型、供應商，並給出最符合的大類標籤 (fallbackCategory)，以及 3-5 個搜尋具體碳排係數用的關鍵字 (searchKeywords)。`;

      const turn1Schema: Schema = {
        type: SchemaType.OBJECT,
        properties: {
          scope: {
            type: SchemaType.STRING,
            description: "範疇，如 SCOPE_1, SCOPE_2, SCOPE_3",
          },
          activityType: { type: SchemaType.STRING, description: "活動類型" },
          vendor: { type: SchemaType.STRING, description: "供應商" },
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
          searchKeywords: {
            type: SchemaType.ARRAY,
            description: "3-5 個用於搜尋具體碳排係數的關鍵字",
            items: {
              type: SchemaType.STRING,
            },
          },
        },
        required: [
          "scope",
          "activityType",
          "vendor",
          "fallbackCategory",
          "searchKeywords",
          "aiNote",
        ],
      };

      const text1 = await chatService.generateRawWithImages(
        turn1Prompt,
        images,
        true,
        turn1Schema,
      );

      const parsed1 = JSON.parse(text1.trim());

      // ==========================================
      // Info: (20260522 - Tzuhan) Backend: Keyword Weight Matching for Top 20
      // ==========================================
      const keywords = [
        ...(parsed1.searchKeywords || []),
        parsed1.fallbackCategory || "",
      ];

      // Info: (20260522 - Tzuhan) Fetch dynamic coefficients from DB (including our Mock EEIOs)
      const dbCoefficients =
        await EmissionFactorRepo.getAllGlobalCoefficients(prisma);

      // Info: (20260522 - Tzuhan) Combine static and DB coefficients, deduplicating by ID (DB takes precedence)
      const combinedCoefficientsMap = new Map();
      [...ALL_COEFFICIENTS, ...MOCK_EEIO_COEFFICIENTS].forEach((c) =>
        combinedCoefficientsMap.set(c.id, c),
      );
      dbCoefficients.forEach((c) =>
        combinedCoefficientsMap.set(c.id, {
          ...c,
          emissionFactor: c.emissionFactor.toString(),
        }),
      );
      const combinedCoefficients = Array.from(combinedCoefficientsMap.values());

      const isServiceCategory = [
        EsgFallbackCategory.IT_AND_TELECOM,
        EsgFallbackCategory.ACCOMMODATION_AND_DINING,
        EsgFallbackCategory.REAL_ESTATE_AND_EQUIPMENT_RENTAL,
        EsgFallbackCategory.PROFESSIONAL_SERVICES,
      ].includes(parsed1.fallbackCategory as EsgFallbackCategory);

      const scoredCoefficients = combinedCoefficients.map((c) => {
        let score = 0;
        const textToSearch = (
          c.name +
          " " +
          (c.description || "")
        ).toLowerCase();
        for (const kw of keywords) {
          if (kw && textToSearch.includes(kw.toLowerCase())) {
            score += 10;
          }
        }

        // Info: (20260522 - Tzuhan) Dimensional Weighting (量綱加權分數)
        if (isServiceCategory && c.unit === "TWD") {
          score += 100; // Info: (20260522 - Tzuhan) 強力引導 AI 選擇 EEIO 係數
        }

        return { ...c, score };
      });

      const candidates = scoredCoefficients
        .sort((a, b) => b.score - a.score)
        .slice(0, 20)
        .map((c) => ({
          id: c.id,
          name: c.name,
          unit: c.unit,
          emissionFactor: c.emissionFactor,
        }));

      // ==========================================
      // Info: (20260522 - Tzuhan) Turn 2: 係數挑選與數量萃取
      // ==========================================
      const turn2Prompt =
        promptText +
        `\n\n[Turn 2 指示]\n你先前在 Turn 1 分析為：${parsed1.scope}, ${parsed1.activityType}, ${parsed1.vendor}。大類為 ${parsed1.fallbackCategory}。\n以下是系統根據關鍵字檢索出的 Top 20 候選碳排係數：\n${JSON.stringify(candidates, null, 2)}\n\n請從中精準挑選一個最適合的 coefficientId，並根據該係數的單位，從憑證中萃取出正確的 amount (數量) 與對應的 unit (單位)。\n\n【CPA 級別鐵律：絕對禁止 AI 進行數學計算】\n你只需要萃取 amount，後端系統會自動進行高精度乘法運算。`;

      const turn2Schema: Schema = {
        type: SchemaType.OBJECT,
        properties: {
          coefficientId: {
            type: SchemaType.STRING,
            nullable: true,
            description: "挑選的係數 ID。若提供的候選清單皆不符合，請設為 null",
          },
          amount: {
            type: SchemaType.NUMBER,
            nullable: true,
            description: "對應該係數單位的數量",
          },
          unit: {
            type: SchemaType.STRING,
            description: "對應的單位",
            format: "enum",
            enum: Object.values(MeasurementUnit),
          },
          aiNote: {
            type: SchemaType.STRING,
            description: "係數挑選理由與數量萃取邏輯",
          },
          confidence: {
            type: SchemaType.NUMBER,
            description: "信心指數 1-100",
          },
        },
        required: ["coefficientId", "amount", "unit", "aiNote", "confidence"],
      };

      const text2 = await chatService.generateRawWithImages(
        turn2Prompt,
        images,
        true,
        turn2Schema,
      );

      const parsed2 = JSON.parse(text2.trim());

      // ==========================================
      // Info: (20260522 - Tzuhan) Backend: CPA-Grade Emission Calculation
      // ==========================================
      const selectedCoef = combinedCoefficients.find(
        (c) => c.id === parsed2.coefficientId,
      );
      let calculatedEmissions = "0";
      let finalAiNote = `[Turn 1] ${parsed1.aiNote}\n[Turn 2] ${parsed2.aiNote}`;

      if (selectedCoef && parsed2.amount != null) {
        // Info: (20260522 - Tzuhan) 嚴格使用 MoneyUtil 高精度運算
        calculatedEmissions = MoneyUtil.multiply(
          parsed2.amount,
          selectedCoef.emissionFactor,
        ).toString();

        if (
          selectedCoef.source === "Internal_Proxy_Estimation_Based_On_Spend"
        ) {
          finalAiNote +=
            "\n*使用內部過渡期 EEIO 係數進行花費基礎估算，非官方直接宣告數值，待查核*";
        }
      }

      const finalParsed = {
        scope: parsed1.scope,
        activityType: parsed1.activityType,
        vendor: parsed1.vendor,
        fallbackCategory: parsed1.fallbackCategory,
        coefficientId: parsed2.coefficientId,
        amount: parsed2.amount,
        unit: parsed2.unit,
        emissions: calculatedEmissions,
        aiNote: finalAiNote,
        confidence: parsed2.confidence,
        generationSource: EsgGenerationSource.AI_GENERATED,
      };

      return JSON.stringify(finalParsed);
    } catch (error) {
      console.error("[EsgParsingSkill] Error:", error);
      return JSON.stringify({
        error: "AI 解析碳盤查失敗，請稍後再試",
      });
    }
  }
}
