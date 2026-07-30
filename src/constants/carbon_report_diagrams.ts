// Info: (20260730 - Tzuhan) 結構圖模板白名單:不依賴 computedLedger 的圖,素材來自段落原文本身
// Info: (20260730 - Tzuhan) 動機:現行 4 張圖表模板全部由 computedLedger 產值,活動數據未進帳前整份報告一張圖都沒有。
// Info: (20260730 - Tzuhan) 但盤查報告的敘述章節本身就有大量結構性素材(治理架構、範疇類別對應、量化流程),
// Info: (20260730 - Tzuhan) 這些圖不需要任何數值,畫出來即可大幅提升可讀性與查核效率。
// Info: (20260730 - Tzuhan) 鐵律不變:LLM 只回「節點文字 + 父子關係」,mermaid 語法由模板組出,
// Info: (20260730 - Tzuhan) 且每個節點文字都必須能在該段原文中找到 —— 找不到就整張不畫(見 carbon_report_diagram.builder)。

export enum CarbonDiagramTemplateEnum {
  // Info: (20260730 - Tzuhan) 治理架構圖:主任委員 → 副主任委員 → 管理代表 → 執行秘書(上下層級)
  GOVERNANCE_TREE = "GOVERNANCE_TREE",
  // Info: (20260730 - Tzuhan) 範疇與類別對應圖:範疇一/二/三 → 類別 → 排放源(左右展開,層級較寬)
  SCOPE_CATEGORY_MAP = "SCOPE_CATEGORY_MAP",
  // Info: (20260730 - Tzuhan) 量化方法流程圖:活動數據 → 排放係數 → GWP → CO2e(線性鏈)
  QUANTIFICATION_FLOW = "QUANTIFICATION_FLOW",
}

export interface ICarbonDiagramTemplate {
  /** Info: (20260730 - Tzuhan) 該圖預設掛載的段落 id:一圖一段,避免同張圖散落多處各自演化 */
  paragraphId: string;
  /** Info: (20260730 - Tzuhan) mermaid flowchart 方向:層級深的用 TD,層級寬的用 LR */
  direction: "TD" | "LR";
  /** Info: (20260730 - Tzuhan) 節點數上限:超過即不畫(過密的圖等於沒有圖) */
  maxNodes: number;
}

export const CARBON_DIAGRAM_TEMPLATES: Record<
  CarbonDiagramTemplateEnum,
  ICarbonDiagramTemplate
> = {
  [CarbonDiagramTemplateEnum.GOVERNANCE_TREE]: {
    paragraphId: "ch1-4",
    direction: "TD",
    maxNodes: 12,
  },
  [CarbonDiagramTemplateEnum.SCOPE_CATEGORY_MAP]: {
    paragraphId: "ch2-3",
    direction: "LR",
    maxNodes: 24,
  },
  [CarbonDiagramTemplateEnum.QUANTIFICATION_FLOW]: {
    paragraphId: "ch3-3",
    direction: "LR",
    maxNodes: 10,
  },
};

// Info: (20260730 - Tzuhan) 結構圖區塊錨點(HTML 註解,渲染不可見):與數據圖表分開命名空間,重建互不干擾
export const CARBON_DIAGRAM_ANCHOR_PREFIX = "carbon-diagram";

export const buildDiagramAnchorStart = (
  templateId: CarbonDiagramTemplateEnum,
): string => `<!-- ${CARBON_DIAGRAM_ANCHOR_PREFIX}:${templateId}:start -->`;

export const buildDiagramAnchorEnd = (
  templateId: CarbonDiagramTemplateEnum,
): string => `<!-- ${CARBON_DIAGRAM_ANCHOR_PREFIX}:${templateId}:end -->`;

/**
 * Info: (20260730 - Tzuhan) 節點文字長度上限:過長的節點會把 mermaid 圖撐爛。
 * 超過即視為「模型把整段敘述塞進節點」,該張圖不予採信。
 */
export const CARBON_DIAGRAM_MAX_LABEL_CHARS = 40;
