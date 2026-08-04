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
  // Info: (20260730 - Tzuhan) 經營沿革時間軸:年月 → 里程碑事件(mermaid timeline,非 flowchart)
  MILESTONE_TIMELINE = "MILESTONE_TIMELINE",
  // Info: (20260730 - Tzuhan) 組織邊界圖:公司 → 各廠址/分公司(盤查範圍的視覺化)
  BOUNDARY_MAP = "BOUNDARY_MAP",
}

/**
 * Info: (20260730 - Tzuhan) 渲染型別。timeline 與 flowchart 對 parent 的語意不同:
 * - flowchart:parent 是「另一個節點」,必須存在於同批節點內,層級不得成環
 * - timeline:parent 是「時間標籤」(如 1966年01月),不需要自己也是節點;無層級可成環
 * 這個差異必須明示,否則會用樹的規則去驗證一條時間軸,把正確的輸入判成錯的。
 */
export enum CarbonDiagramRendererEnum {
  FLOWCHART = "flowchart",
  TIMELINE = "timeline",
}

export interface ICarbonDiagramTemplate {
  /** Info: (20260730 - Tzuhan) 該圖預設掛載的段落 id:一圖一段,避免同張圖散落多處各自演化 */
  paragraphId: string;
  /** Info: (20260730 - Tzuhan) 渲染型別:決定 mermaid 語法與 parent 的驗證規則 */
  renderer: CarbonDiagramRendererEnum;
  /** Info: (20260730 - Tzuhan) mermaid flowchart 方向:層級深的用 TD,層級寬的用 LR(timeline 不適用) */
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
    renderer: CarbonDiagramRendererEnum.FLOWCHART,
    direction: "TD",
    maxNodes: 12,
  },
  [CarbonDiagramTemplateEnum.SCOPE_CATEGORY_MAP]: {
    paragraphId: "ch2-3",
    renderer: CarbonDiagramRendererEnum.FLOWCHART,
    direction: "LR",
    maxNodes: 24,
  },
  [CarbonDiagramTemplateEnum.QUANTIFICATION_FLOW]: {
    paragraphId: "ch3-3",
    renderer: CarbonDiagramRendererEnum.FLOWCHART,
    direction: "LR",
    maxNodes: 10,
  },
  // Info: (20260730 - Tzuhan) 沿革條目多(實測那份有 23 個里程碑),上限放寬到 30;
  // Info: (20260730 - Tzuhan) 節點只存事件,年月放 parent(時間標籤),故節點數 = 事件數而非兩倍
  [CarbonDiagramTemplateEnum.MILESTONE_TIMELINE]: {
    paragraphId: "ch1-1",
    renderer: CarbonDiagramRendererEnum.TIMELINE,
    direction: "TD",
    maxNodes: 30,
  },
  [CarbonDiagramTemplateEnum.BOUNDARY_MAP]: {
    paragraphId: "ch1-5",
    renderer: CarbonDiagramRendererEnum.FLOWCHART,
    direction: "TD",
    maxNodes: 12,
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

/**
 * Info: (20260730 - Tzuhan) 時間軸最少需要幾個「有時間標籤」的事件。
 * 實測:1.1 節被 gap-fill 改寫成公司簡介後已無沿革條目,模型只抓到「2023年底 : 員工人數約為217人」
 * 這一個點,還把時間標籤本身當成事件節點 —— 產出一張技術上合法、語意上無意義的時間軸。
 * 護欄擋不住語意荒謬,但擋得住「一個點的時間軸」:少於此數即不畫。
 */
export const CARBON_TIMELINE_MIN_DATED_EVENTS = 3;

/**
 * Info: (20260804 - Tzuhan) flowchart 的節點下限(issue_drafts/inventory_table_import/05)。
 *
 * 實測畫出過只有一個節點的治理架構圖(只有「溫室氣體盤查推行委員會」)、
 * 只有兩個節點的範疇對應圖。**單節點的圖比沒有圖更糟** ——
 * 它看起來像在陳述「這個組織的治理架構只有一個委員會」,而那是錯的訊息;
 * 沒有圖至少不會誤導,說明文字還能指出是原文該節資訊不足。
 *
 * 三個節點是「能構成關係」的最小值:兩個節點只畫得出一條邊,
 * 那用一句話講完即可,不需要一張圖。與 timeline 的下限同一個理由。
 */
export const CARBON_DIAGRAM_MIN_NODES = 3;
