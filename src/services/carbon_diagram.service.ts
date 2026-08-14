// Info: (20260730 - Tzuhan) 結構圖節點萃取服務
// Info: (20260730 - Tzuhan) 職責邊界(CLAUDE.md 第 7 條):LLM 只把段落敘述轉成「節點 + 父子關係」,
// Info: (20260730 - Tzuhan) 既不決定 mermaid 語法、也不決定要畫哪張圖(模板由段落 id 決定)。
// Info: (20260730 - Tzuhan) 每個節點文字必須能在該段原文找到,否則整張不畫 —— 驗證在 builder,不在此。

import { logger } from "@/lib/utils/logger";
import {
  ChatService,
  isLlmQuotaError,
  isLlmTimeoutError,
  SchemaType,
  type Schema,
} from "@/services/chat.service";
import {
  LLM_DIAGRAM_TIMEOUT_MS,
  LLM_TEMPERATURE,
  LLM_MAX_OUTPUT_TOKENS,
  LlmTaskKeyEnum,
} from "@/constants/llm";
import { ApiError, API_ERRORS } from "@/lib/utils/error_dictionary";
import { describeError } from "@/lib/utils/error_message";
import { CarbonDiagramNodesLlmOutputSchema } from "@/validators";
import {
  CarbonDiagramTemplateEnum,
  CARBON_DIAGRAM_TEMPLATES,
} from "@/constants/carbon_report_diagrams";
import type { ICarbonDiagramNode } from "@/lib/carbon_report_diagram.builder";

// Info: (20260730 - Tzuhan) 每張圖的萃取指示:告訴模型「這張圖的節點是什麼、層級怎麼分」,
// Info: (20260730 - Tzuhan) 但不告訴它可以補充原文沒有的東西。指示集中於此,不散落 prompt 字串。
const DIAGRAM_EXTRACTION_GUIDANCE: Record<CarbonDiagramTemplateEnum, string> = {
  [CarbonDiagramTemplateEnum.GOVERNANCE_TREE]:
    "萃取溫室氣體盤查推行委員會的組織層級:每個節點為「職稱:姓名」或單位名稱,parent 為其上一層。只取原文明確寫出的層級關係。",
  [CarbonDiagramTemplateEnum.SCOPE_CATEGORY_MAP]:
    "萃取排放範疇與類別的對應關係:第一層為範疇(如範疇一),第二層為類別或排放源類型(如固定式燃燒),parent 指向所屬範疇。只取原文列出的項目。",
  [CarbonDiagramTemplateEnum.QUANTIFICATION_FLOW]:
    "萃取排放量的計算流程:依原文的算式順序,每個節點為算式中的一個要素(如活動數據、排放係數、全球暖化潛勢、二氧化碳當量),parent 為流程上的前一步。",
  [CarbonDiagramTemplateEnum.MILESTONE_TIMELINE]:
    "萃取經營沿革的里程碑:label 為事件敘述(照抄原文,可截去冗長的後綴但不得改寫),parent 為該事件的年月(如 1966年01月)。依原文順序回傳,不要重新排序、不要補上原文沒寫的年月。",
  [CarbonDiagramTemplateEnum.BOUNDARY_MAP]:
    "萃取盤查組織邊界:第一層為公司主體,第二層為各廠址或分公司名稱,parent 指向公司主體。只取原文列出的據點,不要補上地址以外的推測。",
};

const DIAGRAM_RESPONSE_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    nodes: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          label: {
            type: SchemaType.STRING,
            description: "節點文字,必須是原文中出現過的字串,嚴禁改寫或補充",
          },
          parent: {
            type: SchemaType.STRING,
            description: "上一層節點的 label;本身為最上層時省略此欄",
          },
        },
        required: ["label"],
      },
    },
  },
  required: ["nodes"],
};

export class CarbonDiagramService {
  private readonly injectedChatService?: ChatService;

  constructor(chatService?: ChatService) {
    this.injectedChatService = chatService;
  }

  private getChatService(): ChatService {
    return this.injectedChatService ?? new ChatService();
  }

  /**
   * Info: (20260730 - Tzuhan) 從段落內容萃取結構圖節點。
   * 失敗一律回空陣列:圖是加值,不是段落成立的前提,不可因為畫不出圖而讓段落寫入失敗。
   * (額度與逾時例外——那兩者需讓呼叫端知道是「稍後可重試」而非「這段沒有素材」。)
   */
  async extractDiagramNodes(
    templateId: CarbonDiagramTemplateEnum,
    paragraphContent: string,
    language?: string,
  ): Promise<ICarbonDiagramNode[]> {
    const template = CARBON_DIAGRAM_TEMPLATES[templateId];
    const prompt = `你是一位文件結構萃取助手。以下是溫室氣體盤查報告某一節的內文,請把它的結構關係萃取成節點清單。

【任務】
${DIAGRAM_EXTRACTION_GUIDANCE[templateId]}

【鐵律】
1. label 必須是原文中出現過的字串,嚴禁改寫、翻譯、補充或推測。
2. 原文沒有明確寫出的層級關係,不要建立;寧可少畫也不要猜。
3. 完整回報所有節點,**不要為了數量自行刪減**。本圖的繪製上限是 ${template.maxNodes} 個,
   超過時由系統決定如何處置並在圖的位置說明原因 —— 你先刪掉的話,系統看不出原文本來有幾個。
4. 每個 label 不超過 40 字。
5. 語言:${language ?? "zh-TW"}(僅影響你對語意的理解,文字一律照抄)。

【本節內文】
${paragraphContent}`;

    let raw: string;
    try {
      raw = await this.getChatService().generateRaw(
        prompt,
        DIAGRAM_RESPONSE_SCHEMA,
        {
          temperature: LLM_TEMPERATURE.EXTRACTION,
          timeoutMs: LLM_DIAGRAM_TIMEOUT_MS,
          taskKey: LlmTaskKeyEnum.DIAGRAM_EXTRACTION,
          // Info: (20260730 - Tzuhan) 沿革時間軸的節點數可達 30 筆,思考 token 又與輸出共用額度,故給足空間
          maxOutputTokens: LLM_MAX_OUTPUT_TOKENS.REPORT_IMPORT,
        },
      );
    } catch (error) {
      // Info: (20260730 - Tzuhan) 額度/逾時要讓使用者知道可以重試,其餘一律安靜降級為「不畫圖」
      if (isLlmQuotaError(error)) {
        throw new ApiError(
          API_ERRORS.IS_LLM_QUOTA_EXCEEDED.code,
          API_ERRORS.IS_LLM_QUOTA_EXCEEDED.message,
          API_ERRORS.IS_LLM_QUOTA_EXCEEDED.status,
        );
      }
      if (isLlmTimeoutError(error)) {
        throw new ApiError(
          API_ERRORS.IS_LLM_TIMEOUT.code,
          API_ERRORS.IS_LLM_TIMEOUT.message,
          API_ERRORS.IS_LLM_TIMEOUT.status,
        );
      }
      logger.error(
        `[CarbonDiagramService] extraction failed for ${templateId}: ${describeError(error)}`,
      );
      return [];
    }

    try {
      const parsed = CarbonDiagramNodesLlmOutputSchema.parse(JSON.parse(raw));
      return parsed.nodes;
    } catch (error) {
      logger.error(
        `[CarbonDiagramService] output invalid for ${templateId}: ${describeError(error)}`,
      );
      return [];
    }
  }
}
