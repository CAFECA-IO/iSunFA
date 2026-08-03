// Info: (20260730 - Tzuhan) 結構圖產生器:護欄比圖好不好看重要得多。
// Info: (20260730 - Tzuhan) 「節點文字必須能在原文找到」是這張圖能出現在審計文件裡的唯一理由。
import { describe, it, expect } from "@jest/globals";
import {
  buildCarbonDiagramBlock,
  findDiagramTemplateForParagraph,
  hasCarbonDiagramBlock,
  insertCarbonDiagramBlock,
  validateDiagramNodes,
  DiagramRejectReasonEnum,
  type ICarbonDiagramNode,
} from "@/lib/carbon_report_diagram.builder";
import {
  CarbonDiagramTemplateEnum,
  CARBON_DIAGRAM_TEMPLATES,
} from "@/constants/carbon_report_diagrams";
import { detectChartType } from "@/lib/utils/mermaid_helpers";
import { MermaidChartType } from "@/constants/mermaid_chart";

// Info: (20260730 - Tzuhan) 取出 mermaid 圍籬內的定義字串(前端 markdown 渲染器交給元件的正是這一段)
const extractMermaidChart = (block: string): string =>
  block.match(/```mermaid\n([\s\S]*?)```/)?.[1]?.trim() ?? "";

// Info: (20260730 - Tzuhan) 取自高興昌盤查報告 1.4 節原文(治理架構)
const GOVERNANCE_SOURCE = `1.4 溫室氣體盤查推行委員會
主任委員:張印燈廠長
職責:訂定溫室體體查核與查驗計劃
副主任委員:陳豐仁副廠長
管理代表:歐青銓課長
執行秘書:陳廉佳、歐家安`;

const GOVERNANCE_NODES: ICarbonDiagramNode[] = [
  { label: "主任委員:張印燈廠長" },
  { label: "副主任委員:陳豐仁副廠長", parent: "主任委員:張印燈廠長" },
  { label: "管理代表:歐青銓課長", parent: "副主任委員:陳豐仁副廠長" },
  { label: "執行秘書:陳廉佳、歐家安", parent: "管理代表:歐青銓課長" },
];

describe("validateDiagramNodes", () => {
  it("節點皆可回溯原文時通過", () => {
    const result = validateDiagramNodes(
      CarbonDiagramTemplateEnum.GOVERNANCE_TREE,
      GOVERNANCE_NODES,
      GOVERNANCE_SOURCE,
    );
    expect(result.isValid).toBe(true);
  });

  it("容忍斷行與標點差異(抽取造成的),但不放寬語意", () => {
    const result = validateDiagramNodes(
      CarbonDiagramTemplateEnum.GOVERNANCE_TREE,
      [{ label: "主任委員 張印燈廠長" }],
      GOVERNANCE_SOURCE,
    );
    expect(result.isValid).toBe(true);
  });

  it("原文沒有的節點一律拒絕(模型自己編的)", () => {
    const result = validateDiagramNodes(
      CarbonDiagramTemplateEnum.GOVERNANCE_TREE,
      [...GOVERNANCE_NODES, { label: "財務長:王大明" }],
      GOVERNANCE_SOURCE,
    );
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe(DiagramRejectReasonEnum.LABEL_NOT_IN_SOURCE);
    expect(result.offendingLabels).toEqual(["財務長:王大明"]);
  });

  it("節點文字過長視為把整段敘述塞進節點,不採信", () => {
    const long = "主".repeat(50);
    const result = validateDiagramNodes(
      CarbonDiagramTemplateEnum.GOVERNANCE_TREE,
      [{ label: long }],
      long,
    );
    expect(result.reason).toBe(DiagramRejectReasonEnum.LABEL_TOO_LONG);
  });

  it("節點數超過模板上限時不畫(過密的圖等於沒有圖)", () => {
    const max = CARBON_DIAGRAM_TEMPLATES.GOVERNANCE_TREE.maxNodes;
    const nodes = Array.from({ length: max + 1 }, (_, i) => ({
      label: `節點${i}`,
    }));
    const source = nodes.map((n) => n.label).join("");
    const result = validateDiagramNodes(
      CarbonDiagramTemplateEnum.GOVERNANCE_TREE,
      nodes,
      source,
    );
    expect(result.reason).toBe(DiagramRejectReasonEnum.TOO_MANY_NODES);
  });

  it("父節點不在同批節點內時拒絕(不可指向圖外)", () => {
    const result = validateDiagramNodes(
      CarbonDiagramTemplateEnum.GOVERNANCE_TREE,
      [{ label: "管理代表:歐青銓課長", parent: "董事長" }],
      `${GOVERNANCE_SOURCE} 董事長`,
    );
    expect(result.reason).toBe(DiagramRejectReasonEnum.UNKNOWN_PARENT);
  });

  it("環狀層級關係拒絕", () => {
    const result = validateDiagramNodes(
      CarbonDiagramTemplateEnum.GOVERNANCE_TREE,
      [
        { label: "甲", parent: "乙" },
        { label: "乙", parent: "甲" },
      ],
      "甲乙",
    );
    expect(result.reason).toBe(DiagramRejectReasonEnum.CYCLIC);
  });

  it("無節點時回報素材不足", () => {
    const result = validateDiagramNodes(
      CarbonDiagramTemplateEnum.GOVERNANCE_TREE,
      [],
      GOVERNANCE_SOURCE,
    );
    expect(result.reason).toBe(DiagramRejectReasonEnum.NO_NODES);
  });
});

describe("buildCarbonDiagramBlock", () => {
  it("產出 mermaid flowchart,方向取自模板", () => {
    const block = buildCarbonDiagramBlock(
      CarbonDiagramTemplateEnum.GOVERNANCE_TREE,
      GOVERNANCE_NODES,
      GOVERNANCE_SOURCE,
    );
    expect(block).toContain("```mermaid");
    expect(block).toContain("flowchart TD");
    expect(block).toContain('N0["主任委員:張印燈廠長"]');
    expect(block).toContain("N0 --> N1");
  });

  it("範疇對應圖用 LR(層級寬)", () => {
    const source = "範疇一 直接排放 範疇二 能源間接排放";
    const block = buildCarbonDiagramBlock(
      CarbonDiagramTemplateEnum.SCOPE_CATEGORY_MAP,
      [
        { label: "範疇一" },
        { label: "直接排放", parent: "範疇一" },
        { label: "範疇二" },
        { label: "能源間接排放", parent: "範疇二" },
      ],
      source,
    );
    expect(block).toContain("flowchart LR");
  });

  it("驗證未過時不畫圖,但寫出原因(沉默少一張圖等於隱瞞)", () => {
    const block = buildCarbonDiagramBlock(
      CarbonDiagramTemplateEnum.GOVERNANCE_TREE,
      [{ label: "財務長:王大明" }],
      GOVERNANCE_SOURCE,
    );
    expect(block).not.toContain("```mermaid");
    expect(block).toContain("無法回溯");
  });

  it("無節點時輸出素材不足的說明", () => {
    const block = buildCarbonDiagramBlock(
      CarbonDiagramTemplateEnum.GOVERNANCE_TREE,
      [],
      GOVERNANCE_SOURCE,
    );
    expect(block).toContain("不足");
  });

  it("節點文字內的雙引號移除,避免破壞 mermaid 語法", () => {
    const block = buildCarbonDiagramBlock(
      CarbonDiagramTemplateEnum.QUANTIFICATION_FLOW,
      [{ label: '活動"數據' }],
      '活動"數據',
    );
    expect(block).toContain('N0["活動數據"]');
  });
});

describe("插入與定位", () => {
  const source = "活動數據 排放係數 GWP";
  const block = buildCarbonDiagramBlock(
    CarbonDiagramTemplateEnum.QUANTIFICATION_FLOW,
    [
      { label: "活動數據" },
      { label: "排放係數", parent: "活動數據" },
      { label: "GWP", parent: "排放係數" },
    ],
    source,
  );

  it("首次插入附加於敘述尾端,敘述零改動", () => {
    const content = "本節說明量化方法。";
    const next = insertCarbonDiagramBlock(
      content,
      CarbonDiagramTemplateEnum.QUANTIFICATION_FLOW,
      block,
    );
    expect(next.startsWith(content)).toBe(true);
    expect(
      hasCarbonDiagramBlock(
        next,
        CarbonDiagramTemplateEnum.QUANTIFICATION_FLOW,
      ),
    ).toBe(true);
  });

  it("再次插入為原地替換,不疊加", () => {
    const once = insertCarbonDiagramBlock(
      "敘述",
      CarbonDiagramTemplateEnum.QUANTIFICATION_FLOW,
      block,
    );
    const twice = insertCarbonDiagramBlock(
      once,
      CarbonDiagramTemplateEnum.QUANTIFICATION_FLOW,
      block,
    );
    expect(twice.split("flowchart").length - 1).toBe(1);
  });

  it("段落 id 可反查對應模板,無對應者回 null", () => {
    expect(findDiagramTemplateForParagraph("ch1-4")).toBe(
      CarbonDiagramTemplateEnum.GOVERNANCE_TREE,
    );
    expect(findDiagramTemplateForParagraph("ch2-3")).toBe(
      CarbonDiagramTemplateEnum.SCOPE_CATEGORY_MAP,
    );
    expect(findDiagramTemplateForParagraph("ch11")).toBeNull();
  });
});

// Info: (20260730 - Tzuhan) 取自高興昌盤查報告 1.1 節原文(經營沿革)與 1.5 節(組織邊界)
const MILESTONE_SOURCE = `1966年01月 公司創立於高雄市,資本額新台幣捌拾萬元
1968年06月 榮獲經濟部中央標準局鍍鋅鋼管正字標記
1968年11月 榮獲經濟部中央標準局黑鋼管正字標記
1988年12月 公司股票正式掛牌上市,資本額新台幣壹拾陸億元`;

const BOUNDARY_SOURCE = `1.5.1盤查範圍:本次盤查組織邊界採用控制權法,邊界設定以「高興昌鋼鐵股份有限公司
總公司、高興昌鋼鐵股份有限公司 台北分公司、高興昌鋼鐵股份有限公司 屏東分公司」為盤查範圍`;

describe("時間軸模板(timeline renderer)", () => {
  const nodes: ICarbonDiagramNode[] = [
    { label: "公司創立於高雄市", parent: "1966年01月" },
    { label: "榮獲經濟部中央標準局鍍鋅鋼管正字標記", parent: "1968年06月" },
    { label: "榮獲經濟部中央標準局黑鋼管正字標記", parent: "1968年11月" },
  ];

  /**
   * Info: (20260803 - Tzuhan) 實測產出過這一列:`未標註時間 : 1966年01月 : 1968年06月 : …`
   * —— 模型把**時間標籤本身**當成無時間的事件再回傳一次,等於把時間軸自己列了兩遍。
   * 這些是軸的複本而非事件,不可渲染。timeline 沒有層級,丟掉它們不會捏造結構。
   */
  it("時間標籤被當成事件回傳時不渲染(軸的複本,不是事件)", () => {
    const withAxisDuplicates: ICarbonDiagramNode[] = [
      ...nodes,
      { label: "1966年01月" },
      { label: "1968年06月" },
      { label: "1968年11月" },
    ];
    const block = buildCarbonDiagramBlock(
      CarbonDiagramTemplateEnum.MILESTONE_TIMELINE,
      withAxisDuplicates,
      MILESTONE_SOURCE,
    );
    expect(block).not.toContain("未標註時間");
    // Info: (20260803 - Tzuhan) 真實事件仍在,且仍掛在自己的時間標籤下
    expect(block).toContain("1966年01月 : 公司創立於高雄市");
  });

  it("真正沒有時間標籤的事件仍保留(不猜時間也不丟事件)", () => {
    const block = buildCarbonDiagramBlock(
      CarbonDiagramTemplateEnum.MILESTONE_TIMELINE,
      [...nodes, { label: "公司股票正式掛牌上市" }],
      MILESTONE_SOURCE,
    );
    expect(block).toContain("未標註時間 : 公司股票正式掛牌上市");
  });

  it("產出 mermaid timeline,而非 flowchart", () => {
    const block = buildCarbonDiagramBlock(
      CarbonDiagramTemplateEnum.MILESTONE_TIMELINE,
      nodes,
      MILESTONE_SOURCE,
    );
    expect(block).toContain("```mermaid");
    expect(block).toContain("timeline");
    expect(block).not.toContain("flowchart");
    expect(block).toContain("1966年01月 : 公司創立於高雄市");
  });

  it("同一時間標籤的多個事件併為一列", () => {
    const block = buildCarbonDiagramBlock(
      CarbonDiagramTemplateEnum.MILESTONE_TIMELINE,
      [
        { label: "榮獲經濟部中央標準局鍍鋅鋼管正字標記", parent: "1968年06月" },
        { label: "榮獲經濟部中央標準局黑鋼管正字標記", parent: "1968年06月" },
        { label: "公司創立於高雄市", parent: "1966年01月" },
      ],
      MILESTONE_SOURCE,
    );
    const row = block.split("\n").find((line) => line.includes("1968年06月"))!;
    expect(row.split(" : ")).toHaveLength(3);
  });

  it("時間標籤不必自己也是節點(timeline 的 parent 語意與樹不同)", () => {
    const result = validateDiagramNodes(
      CarbonDiagramTemplateEnum.MILESTONE_TIMELINE,
      nodes,
      MILESTONE_SOURCE,
    );
    expect(result.isValid).toBe(true);
  });

  it("時間標籤同樣必須能在原文找到(不可自行補年月)", () => {
    const result = validateDiagramNodes(
      CarbonDiagramTemplateEnum.MILESTONE_TIMELINE,
      [{ label: "公司創立於高雄市", parent: "1965年12月" }],
      MILESTONE_SOURCE,
    );
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe(DiagramRejectReasonEnum.LABEL_NOT_IN_SOURCE);
    expect(result.offendingLabels).toEqual(["1965年12月"]);
  });

  it("沒有時間標籤的事件不丟棄,歸入未標註時間", () => {
    const block = buildCarbonDiagramBlock(
      CarbonDiagramTemplateEnum.MILESTONE_TIMELINE,
      [...nodes, { label: "公司股票正式掛牌上市" }],
      MILESTONE_SOURCE,
    );
    expect(block).toContain("未標註時間 : 公司股票正式掛牌上市");
  });

  it("事件文字內的冒號換掉,避免撐破 timeline 的分隔語法", () => {
    const source =
      "1966年01月 資本額:捌拾萬元 公司創立於高雄市 1968年06月 榮獲正字標記 1988年12月 掛牌上市";
    const block = buildCarbonDiagramBlock(
      CarbonDiagramTemplateEnum.MILESTONE_TIMELINE,
      [
        { label: "資本額:捌拾萬元", parent: "1966年01月" },
        { label: "公司創立於高雄市", parent: "1966年01月" },
        { label: "榮獲正字標記", parent: "1968年06月" },
      ],
      source,
    );
    const row = block.split("\n").find((line) => line.includes("1966年01月"))!;
    // Info: (20260730 - Tzuhan) 該時間點有兩個事件,故為「時間 : 事件 : 事件」三段;
    // Info: (20260730 - Tzuhan) 重點是原本事件文字裡的冒號已換成連字號,不會多切出一段
    expect(row.split(" : ")).toHaveLength(3);
    expect(row).toContain("資本額-捌拾萬元");
  });
});

describe("組織邊界圖", () => {
  it("公司主體為根,各據點為子節點", () => {
    const block = buildCarbonDiagramBlock(
      CarbonDiagramTemplateEnum.BOUNDARY_MAP,
      [
        { label: "高興昌鋼鐵股份有限公司" },
        { label: "總公司", parent: "高興昌鋼鐵股份有限公司" },
        { label: "台北分公司", parent: "高興昌鋼鐵股份有限公司" },
        { label: "屏東分公司", parent: "高興昌鋼鐵股份有限公司" },
      ],
      BOUNDARY_SOURCE,
    );
    expect(block).toContain("flowchart TD");
    expect(block).toContain("N0 --> N1");
    expect(block).toContain("N0 --> N3");
  });

  it("原文未列出的據點一律拒絕", () => {
    const result = validateDiagramNodes(
      CarbonDiagramTemplateEnum.BOUNDARY_MAP,
      [
        { label: "高興昌鋼鐵股份有限公司" },
        { label: "台中分公司", parent: "高興昌鋼鐵股份有限公司" },
      ],
      BOUNDARY_SOURCE,
    );
    expect(result.reason).toBe(DiagramRejectReasonEnum.LABEL_NOT_IN_SOURCE);
  });

  it("段落 id 反查:1.1 為時間軸、1.5 為邊界圖", () => {
    expect(findDiagramTemplateForParagraph("ch1-1")).toBe(
      CarbonDiagramTemplateEnum.MILESTONE_TIMELINE,
    );
    expect(findDiagramTemplateForParagraph("ch1-5")).toBe(
      CarbonDiagramTemplateEnum.BOUNDARY_MAP,
    );
  });
});

// Info: (20260730 - Tzuhan) 實測回歸:匯入後一張圖都沒出來,兩個原因。
// Info: (20260730 - Tzuhan) 其一是 hook 的 closure 讀到匯入前的舊狀態(在 hook 修);
// Info: (20260730 - Tzuhan) 其二是 gap-fill 產生的段落會改寫語序,連續子字串比對把正確的節點判成捏造 —— 這裡護住。
const GOVERNANCE_AI_DRAFT = `本公司已建立由上而下的氣候治理架構。董事會為最高督導單位。
在管理階層,我們設立了「溫室氣體盤查小組管理委員會」,由廠長張印燈先生擔任主任委員,
負責訂定溫室氣體查核計畫,並由副廠長、課長及執行秘書等成員協助督導與執行資料蒐集。`;

describe("AI 草稿段落的節點回溯(語序被改寫)", () => {
  it("語序不同但每段都在原文中時通過", () => {
    const result = validateDiagramNodes(
      CarbonDiagramTemplateEnum.GOVERNANCE_TREE,
      [
        { label: "溫室氣體盤查小組管理委員會" },
        { label: "主任委員:張印燈", parent: "溫室氣體盤查小組管理委員會" },
        { label: "副廠長", parent: "主任委員:張印燈" },
      ],
      GOVERNANCE_AI_DRAFT,
    );
    expect(result.isValid).toBe(true);
  });

  it("放寬語序後仍擋得住捏造的人名", () => {
    const result = validateDiagramNodes(
      CarbonDiagramTemplateEnum.GOVERNANCE_TREE,
      [{ label: "主任委員:王大明" }],
      GOVERNANCE_AI_DRAFT,
    );
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe(DiagramRejectReasonEnum.LABEL_NOT_IN_SOURCE);
  });

  it("放寬語序後仍擋得住捏造的單位", () => {
    const result = validateDiagramNodes(
      CarbonDiagramTemplateEnum.GOVERNANCE_TREE,
      [{ label: "永續發展委員會" }],
      GOVERNANCE_AI_DRAFT,
    );
    expect(result.isValid).toBe(false);
  });

  it("切不出可判定片段的節點不予放寬", () => {
    const result = validateDiagramNodes(
      CarbonDiagramTemplateEnum.GOVERNANCE_TREE,
      [{ label: "X" }],
      GOVERNANCE_AI_DRAFT,
    );
    expect(result.isValid).toBe(false);
  });

  it("範疇對應圖:草稿裡的粗體與全角括號不影響回溯", () => {
    const source =
      "**範疇一（直接排放）**包含固定式燃燒與移動式燃燒;**範疇二（能源間接排放）**為外購電力。";
    const result = validateDiagramNodes(
      CarbonDiagramTemplateEnum.SCOPE_CATEGORY_MAP,
      [
        { label: "範疇一（直接排放）" },
        { label: "固定式燃燒", parent: "範疇一（直接排放）" },
        { label: "範疇二（能源間接排放）" },
        { label: "外購電力", parent: "範疇二（能源間接排放）" },
      ],
      source,
    );
    expect(result.isValid).toBe(true);
  });

  it("原文拆開寫的詞組不予放寬(無法確認它是一個名詞)", () => {
    // Info: (20260730 - Tzuhan) 原文寫「固定式與移動式燃燒」,並沒有「固定式燃燒」這個詞組;
    // Info: (20260730 - Tzuhan) 放寬到能拼湊出來就等於允許模型自行組詞,故維持拒絕
    const result = validateDiagramNodes(
      CarbonDiagramTemplateEnum.SCOPE_CATEGORY_MAP,
      [{ label: "固定式燃燒" }],
      "範疇一包含固定式與移動式燃燒",
    );
    expect(result.isValid).toBe(false);
  });
});

describe("時間軸的最少事件數(實測回歸)", () => {
  // Info: (20260730 - Tzuhan) 實測產出:1.1 節被改寫成公司簡介後已無沿革,
  // Info: (20260730 - Tzuhan) 模型只抓到一個點,還把時間標籤本身當成事件節點
  const NONSENSE_SOURCE = "截至2023年底,員工人數約為217人。";

  it("只有一個時間點時不畫(那不是時間軸)", () => {
    const result = validateDiagramNodes(
      CarbonDiagramTemplateEnum.MILESTONE_TIMELINE,
      [
        { label: "員工人數約為217人", parent: "2023年底" },
        { label: "2023年底" },
      ],
      NONSENSE_SOURCE,
    );
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe(DiagramRejectReasonEnum.TOO_FEW_DATED_EVENTS);
  });

  it("事件文字等於時間標籤者不計入事件數", () => {
    const source = "1966年01月 甲事件 1968年06月 乙事件";
    const result = validateDiagramNodes(
      CarbonDiagramTemplateEnum.MILESTONE_TIMELINE,
      [
        { label: "甲事件", parent: "1966年01月" },
        { label: "乙事件", parent: "1968年06月" },
        { label: "1966年01月", parent: "1966年01月" },
      ],
      source,
    );
    expect(result.reason).toBe(DiagramRejectReasonEnum.TOO_FEW_DATED_EVENTS);
  });

  it("被擋下時輸出說明而非空白圖", () => {
    const block = buildCarbonDiagramBlock(
      CarbonDiagramTemplateEnum.MILESTONE_TIMELINE,
      [{ label: "員工人數約為217人", parent: "2023年底" }],
      NONSENSE_SOURCE,
    );
    expect(block).not.toContain("```mermaid");
    expect(block).toContain("不足");
  });
});

// Info: (20260730 - Tzuhan) 前端渲染前置條件:mermaid_chart 元件在 render 前先用 detectChartType 過濾,
// Info: (20260730 - Tzuhan) 回 UNKNOWN 就直接顯示 "Mermaid Syntax Error"。實測 timeline 因未列入型別清單而全數被擋,
// Info: (20260730 - Tzuhan) 圖從未有機會渲染 —— 產生器測到底也測不出這個缺口,故在此把兩端接起來。
describe("產出的圖表可被前端型別偵測接受", () => {
  it("timeline 區塊被辨識為 TIMELINE,而非 UNKNOWN", () => {
    const block = buildCarbonDiagramBlock(
      CarbonDiagramTemplateEnum.MILESTONE_TIMELINE,
      [
        { label: "公司創立於高雄市", parent: "1966年01月" },
        { label: "榮獲經濟部中央標準局鍍鋅鋼管正字標記", parent: "1968年06月" },
        { label: "榮獲經濟部中央標準局黑鋼管正字標記", parent: "1968年11月" },
      ],
      MILESTONE_SOURCE,
    );
    const chart = extractMermaidChart(block);
    expect(chart).not.toBe("");
    expect(detectChartType(chart)).toBe(MermaidChartType.TIMELINE);
  });

  it("flowchart 區塊被辨識為 FLOWCHART", () => {
    const block = buildCarbonDiagramBlock(
      CarbonDiagramTemplateEnum.GOVERNANCE_TREE,
      GOVERNANCE_NODES,
      GOVERNANCE_SOURCE,
    );
    expect(detectChartType(extractMermaidChart(block))).toBe(
      MermaidChartType.FLOWCHART,
    );
  });
});
