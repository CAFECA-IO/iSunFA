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
