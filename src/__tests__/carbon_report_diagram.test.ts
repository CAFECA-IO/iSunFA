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
      // Info: (20260804 - Tzuhan) 三個節點是下限(CARBON_DIAGRAM_MIN_NODES);
      // Info: (20260804 - Tzuhan) 此處要驗的是 grounding 的寬容度,不是節點數,故補足到不被下限攔下
      [
        { label: "主任委員 張印燈廠長" },
        { label: "副主任委員 陳豐仁副廠長" },
        { label: "管理代表 歐青銓課長" },
      ],
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
    const long = "主".repeat(80);
    const result = validateDiagramNodes(
      CarbonDiagramTemplateEnum.GOVERNANCE_TREE,
      [{ label: long }],
      long,
    );
    expect(result.reason).toBe(DiagramRejectReasonEnum.LABEL_TOO_LONG);
  });

  /**
   * Info: (20260806 - Tzuhan) 過長的處置分兩種,而分界是**它是不是編造的**。
   *
   * 實測那次被擋掉的是原文的一條完整里程碑(43 字),它通過了原文回溯 ——
   * 那不是「模型把敘述塞進節點」,只是長。原本一律整張否決,
   * 30 個有效節點被 1 個拖垮,代價完全不對等。
   */
  it("時間軸:少數過長者只略過那幾個,其餘照畫", () => {
    /**
     * Info: (20260810 - Emily) fixture 由 3 個事件改為 4 個。
     *
     * 這條測試要證明的是「1 個過長不該拖垮其餘」,那個意圖不變;
     * 但原本用 3 個事件示範,略過 1 個之後只剩 2 個 ——
     * 正好低於時間軸自己的事件數下限(3)。
     * 兩條規則在那個 fixture 上重疊了,而重疊處正是本次修正的 bug:
     * 下限原本用完整節點集驗,所以那張圖會通過驗證卻只畫得出 2 個事件。
     *
     * 改成 4 個之後,略過 1 個仍有 3 個 —— 兩條規則各自成立,互不干擾。
     */
    const longMilestone = "永".repeat(70);
    const source = [
      longMilestone,
      "1966年01月",
      "公司創立",
      "股票上市",
      "永安廠啟用",
    ].join("，");
    const result = validateDiagramNodes(
      CarbonDiagramTemplateEnum.MILESTONE_TIMELINE,
      [
        { label: "公司創立", parent: "1966年01月" },
        { label: "股票上市", parent: "1966年01月" },
        { label: "永安廠啟用", parent: "1966年01月" },
        { label: longMilestone, parent: "1966年01月" },
      ],
      source,
    );
    expect(result.isValid).toBe(true);
    expect(result.skippedLabels).toEqual([longMilestone]);
  });

  /**
   * Info: (20260806 - Tzuhan) 半數以上過長才像原本設想的「把敘述當節點」——
   * 那道界守的是原規則的本意,不是把它拿掉。
   */
  it("時間軸:半數以上過長仍整張否決", () => {
    const a = "甲".repeat(70);
    const b = "乙".repeat(70);
    const source = [a, b, "1966年01月", "公司創立"].join("，");
    const result = validateDiagramNodes(
      CarbonDiagramTemplateEnum.MILESTONE_TIMELINE,
      [
        { label: "公司創立", parent: "1966年01月" },
        { label: a, parent: "1966年01月" },
        { label: b, parent: "1966年01月" },
      ],
      source,
    );
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe(DiagramRejectReasonEnum.LABEL_TOO_LONG);
  });

  /**
   * Info: (20260806 - Tzuhan) 樹狀圖不得只略過壞節點 —— 本檔開頭那條理由對樹成立:
   * 少了中間層會讓剩下的圖呈現原文裡不存在的層級,而那比不畫更糟,因為它看起來是對的。
   */
  it("樹狀圖:即使只有一個過長也整張否決(略過會發明層級)", () => {
    const long = "長".repeat(70);
    const source = [long, "主任委員", "執行秘書", "稽核組"].join("，");
    const result = validateDiagramNodes(
      CarbonDiagramTemplateEnum.GOVERNANCE_TREE,
      [
        { label: "主任委員" },
        { label: "執行秘書", parent: "主任委員" },
        { label: "稽核組", parent: "主任委員" },
        { label: long, parent: "主任委員" },
      ],
      source,
    );
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe(DiagramRejectReasonEnum.LABEL_TOO_LONG);
  });

  /**
   * Info: (20260806 - Tzuhan) 順序的反向測試:回溯先驗、長度後驗。
   * 反過來的話,一個**編造出來的**長標籤會被當成版面問題略過 —— 那是信任問題,
   * 必須整張否決。這條擋的正是那個顛倒。
   */
  it("編造的長標籤是信任問題,不得被當成版面問題略過", () => {
    const fabricated = "編".repeat(70);
    const result = validateDiagramNodes(
      CarbonDiagramTemplateEnum.MILESTONE_TIMELINE,
      [
        { label: "公司創立", parent: "1966年01月" },
        { label: "股票上市", parent: "1966年01月" },
        { label: fabricated, parent: "1966年01月" },
      ],
      "1966年01月，公司創立，股票上市",
    );
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe(DiagramRejectReasonEnum.LABEL_NOT_IN_SOURCE);
    expect(result.skippedLabels).toBeUndefined();
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
      [
        { label: "管理代表:歐青銓課長", parent: "董事長" },
        { label: "主任委員:張印燈廠長" },
        { label: "副主任委員:陳豐仁副廠長" },
      ],
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
        { label: "丙", parent: "甲" },
      ],
      "甲乙丙",
    );
    expect(result.reason).toBe(DiagramRejectReasonEnum.CYCLIC);
  });

  /**
   * Info: (20260804 - Tzuhan) 單節點的圖比沒有圖更糟(issue_drafts/inventory_table_import/05)。
   * 實測畫出過只有「溫室氣體盤查推行委員會」一個節點的治理架構圖 ——
   * 它看起來像在陳述「這個組織的治理架構只有一個委員會」,而那是錯的訊息。
   */
  it("節點少於三個時不畫(一兩個節點不構成結構)", () => {
    const result = validateDiagramNodes(
      CarbonDiagramTemplateEnum.GOVERNANCE_TREE,
      [
        { label: "主任委員:張印燈廠長" },
        { label: "副主任委員:陳豐仁副廠長", parent: "主任委員:張印燈廠長" },
      ],
      GOVERNANCE_SOURCE,
    );
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe(DiagramRejectReasonEnum.TOO_FEW_NODES);
  });

  it("節點不足時輸出說明文字,不是空白也不是空圖", () => {
    const block = buildCarbonDiagramBlock(
      CarbonDiagramTemplateEnum.GOVERNANCE_TREE,
      [{ label: "溫室氣體盤查推行委員會" }],
      GOVERNANCE_SOURCE,
    );
    expect(block).toContain("carbon-diagram:GOVERNANCE_TREE:start");
    expect(block).toContain("本節內容不足以繪製結構圖");
    expect(block).not.toContain("```mermaid");
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
      [{ label: '活動"數據' }, { label: "排放係數" }, { label: "GWP" }],
      '活動"數據 排放係數 GWP',
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

describe("里程碑模板(TIMELINE renderer,產出表格)", () => {
  /**
   * Info: (20260811 - Emily) 里程碑改為表格(issue_drafts/open/20 第 2 張票)。
   *
   * mermaid timeline 一個時間點一欄、欄寬固定,15 條中文沿革的 SVG 內在寬度 3,559px,
   * 排到橫式頁寬要縮到 28%、事件字級 4.5px(正文 14px)。表格是 688px 不縮放、11.3px。
   * 下面這些不變式與時間軸版完全相同 —— 換的是呈現形式,不是規則。
   */
  const nodes: ICarbonDiagramNode[] = [
    { label: "公司創立於高雄市", parent: "1966年01月" },
    { label: "榮獲經濟部中央標準局鍍鋅鋼管正字標記", parent: "1968年06月" },
    { label: "榮獲經濟部中央標準局黑鋼管正字標記", parent: "1968年11月" },
  ];

  const rowsOf = (block: string): string[] =>
    block.split("\n").filter((line) => line.startsWith("| "));

  /**
   * Info: (20260803 - Tzuhan) 實測產出過這一列:`未標註時間 : 1966年01月 : 1968年06月 : …`
   * —— 模型把**時間標籤本身**當成無時間的事件再回傳一次,等於把里程碑自己列了兩遍。
   * 這些是時間欄的複本而非事件,不可渲染。里程碑沒有層級,丟掉它們不會捏造結構。
   */
  it("時間標籤被當成事件回傳時不渲染(時間欄的複本,不是事件)", () => {
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
    expect(block).toContain("| 1966年01月 | 公司創立於高雄市 |");
  });

  it("真正沒有時間標籤的事件仍保留(不猜時間也不丟事件)", () => {
    const block = buildCarbonDiagramBlock(
      CarbonDiagramTemplateEnum.MILESTONE_TIMELINE,
      [...nodes, { label: "公司股票正式掛牌上市" }],
      MILESTONE_SOURCE,
    );
    expect(block).toContain("| 未標註時間 | 公司股票正式掛牌上市 |");
  });

  it("產出 markdown 表格,而非 mermaid 圖", () => {
    const block = buildCarbonDiagramBlock(
      CarbonDiagramTemplateEnum.MILESTONE_TIMELINE,
      nodes,
      MILESTONE_SOURCE,
    );
    expect(block).not.toContain("```mermaid");
    expect(block).not.toContain("flowchart");
    expect(block).toContain("| 時間 | 事件 |");
    expect(block).toContain("| --- | --- |");
    expect(block).toContain("| 1966年01月 | 公司創立於高雄市 |");
  });

  it("同一時間標籤的多個事件各佔一列,時間只寫在第一列", () => {
    const block = buildCarbonDiagramBlock(
      CarbonDiagramTemplateEnum.MILESTONE_TIMELINE,
      [
        { label: "榮獲經濟部中央標準局鍍鋅鋼管正字標記", parent: "1968年06月" },
        { label: "榮獲經濟部中央標準局黑鋼管正字標記", parent: "1968年06月" },
        { label: "公司創立於高雄市", parent: "1966年01月" },
      ],
      MILESTONE_SOURCE,
    );
    /**
     * Info: (20260811 - Emily) 續列的時間欄留空 —— 與原文照錄表格的縱向合併慣例一致,
     * 也讓 annotateTable 把欄寬讓給事件欄(把時間逐列重複正是 20 第 3 張票在修的事)。
     */
    expect(block).toContain(
      "| 1968年06月 | 榮獲經濟部中央標準局鍍鋅鋼管正字標記 |",
    );
    expect(block).toContain("|  | 榮獲經濟部中央標準局黑鋼管正字標記 |");
    // Info: (20260811 - Emily) 兩個事件兩列,不是併成一列
    expect(
      rowsOf(block).filter((row) => row.includes("正字標記")),
    ).toHaveLength(2);
  });

  it("時間標籤不必自己也是節點(里程碑的 parent 語意與樹不同)", () => {
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

  /**
   * Info: (20260811 - Emily) 要逸出的字元換了。
   *
   * timeline 用冒號分隔時間與事件,所以原本必須把事件文字裡的冒號換成連字號。
   * 表格用 `|` 分隔儲存格 —— 現在要逸出的是直線,而冒號沒有語意可以留原樣。
   * 原文「品管分等檢驗甲等」那類帶冒號的句子因此不再被改寫。
   */
  it("事件文字內的直線逸出,冒號保持原樣", () => {
    const source =
      "1966年01月 資本額:捌拾萬元 公司創立於高雄市 1968年06月 榮獲正字標記|甲等 1988年12月 掛牌上市";
    const block = buildCarbonDiagramBlock(
      CarbonDiagramTemplateEnum.MILESTONE_TIMELINE,
      [
        { label: "資本額:捌拾萬元", parent: "1966年01月" },
        { label: "公司創立於高雄市", parent: "1966年01月" },
        { label: "榮獲正字標記|甲等", parent: "1968年06月" },
      ],
      source,
    );
    // Info: (20260811 - Emily) 冒號原樣保留
    expect(block).toContain("| 1966年01月 | 資本額:捌拾萬元 |");
    // Info: (20260811 - Emily) 直線逸出,不會多切出一欄
    expect(block).toContain("| 1968年06月 | 榮獲正字標記\\|甲等 |");
    rowsOf(block).forEach((row) => {
      // Info: (20260811 - Emily) 每一列都是「時間 | 事件」兩欄(逸出的直線不算欄位邊界)
      expect(row.replace(/\\\|/g, "").split("|")).toHaveLength(4);
    });
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

  /**
   * Info: (20260810 - Emily) PR review 第 6 點的回歸測試。
   *
   * 過長的節點會被略過不畫（見 skippedLabels），但下限原本用完整節點集驗 ——
   * 「驗證時 3 個、畫出來 2 個」因此會通過，產出一條低於下限的時間軸。
   * 既有測試抓不到它，是因為它們的節點都沒有過長者。
   */
  it("略過過長節點之後，事件數低於下限即不畫", () => {
    // Info: (20260810 - Emily) 必須真的超過 CARBON_DIAGRAM_MAX_LABEL_CHARS(60)才會被略過
    const longLabel = `本公司於該年度完成全廠區汽電共生設備汰換${"並取得能源管理系統認證與溫室氣體查證聲明書".repeat(2)}`;
    const source = `1966年01月 甲事件 1968年06月 乙事件 1970年03月 ${longLabel}`;
    const result = validateDiagramNodes(
      CarbonDiagramTemplateEnum.MILESTONE_TIMELINE,
      [
        { label: "甲事件", parent: "1966年01月" },
        { label: "乙事件", parent: "1968年06月" },
        { label: longLabel, parent: "1970年03月" },
      ],
      source,
    );
    expect(result.isValid).toBe(false);
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
  /**
   * Info: (20260811 - Emily) 里程碑改成表格之後,這一條拆成兩件事。
   *
   * 原本它同時測了兩件:「里程碑模板會產出 mermaid」與「detectChartType 認得 timeline」。
   * 前者已經不成立(改表格了),但後者仍要留著 —— 那是 20260730 實測過的缺口:
   * timeline 未列入型別清單時全數被擋,圖從未有機會渲染。
   * 使用者手動寫的 timeline、或其他模板日後改回圖表,都還會走到那條路。
   * 所以改成直接對一段 timeline 語法斷言,不再經由里程碑產生器。
   */
  it("timeline 語法被辨識為 TIMELINE,而非 UNKNOWN", () => {
    const block = [
      "```mermaid",
      "timeline",
      "    1966年01月 : 公司創立於高雄市",
      "    1968年06月 : 榮獲經濟部中央標準局鍍鋅鋼管正字標記",
      "```",
    ].join("\n");

    const chart = extractMermaidChart(block);

    expect(chart).not.toBe("");
    expect(detectChartType(chart)).toBe(MermaidChartType.TIMELINE);
  });

  it("里程碑區塊不再是 mermaid 圖(改為表格,見上方里程碑模板)", () => {
    const block = buildCarbonDiagramBlock(
      CarbonDiagramTemplateEnum.MILESTONE_TIMELINE,
      [
        { label: "公司創立於高雄市", parent: "1966年01月" },
        { label: "榮獲經濟部中央標準局鍍鋅鋼管正字標記", parent: "1968年06月" },
        { label: "榮獲經濟部中央標準局黑鋼管正字標記", parent: "1968年11月" },
      ],
      MILESTONE_SOURCE,
    );

    expect(extractMermaidChart(block)).toBe("");
    expect(block).toContain("| 時間 | 事件 |");
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

/**
 * Info: (20260814 - Emily) 節點數上限（issue 34）。
 *
 * 這一組守的是一件比「有沒有畫出圖」更重要的事：**不畫的時候要說對原因**。
 * 「節點太多」與「節點無法回溯原文」是完全不同的兩件事 ——
 * 前者是版面容不下、內容可信；後者是懷疑模型編造。對一份送查證的文件，
 * 說錯會把讀者導向錯誤的結論。
 */
describe("節點數上限與不畫的原因", () => {
  /**
   * Info: (20260814 - Emily) 高興昌那份 1.4 節的真實規模：
   * 1 個根 + 4 位幹部 + 11 個部門委員 = 16 個節點。
   * 上限是 12 的時候它畫不完，而模型被 prompt 要求「超過請只保留最上層與次層」，
   * 於是交回 12 個、圖看起來完整，而品管部／鋼管廠／冷軋廠／屏南廠四個部門不見了。
   */
  const COMMITTEE_UNITS = [
    "人事部",
    "會計部",
    "總務部",
    "工安部",
    "採購部",
    "業務部",
    "生管部",
    "品管部",
    "鋼管廠",
    "冷軋廠",
    "屏南廠",
  ];
  const committeeNodes = (): ICarbonDiagramNode[] => [
    { label: "溫室氣體盤查推行委員會" },
    { label: "主任委員", parent: "溫室氣體盤查推行委員會" },
    { label: "副主任委員", parent: "溫室氣體盤查推行委員會" },
    { label: "管理代表", parent: "溫室氣體盤查推行委員會" },
    { label: "執行秘書", parent: "溫室氣體盤查推行委員會" },
    ...COMMITTEE_UNITS.map((unit) => ({
      label: unit,
      parent: "溫室氣體盤查推行委員會",
    })),
  ];
  const committeeSource = [
    "溫室氣體盤查推行委員會",
    "主任委員",
    "副主任委員",
    "管理代表",
    "執行秘書",
    ...COMMITTEE_UNITS,
  ].join(" ");

  it("16 個節點的委員會要畫得完（上限 12 時畫不完，四個部門會不見）", () => {
    expect(committeeNodes()).toHaveLength(16);

    const result = validateDiagramNodes(
      CarbonDiagramTemplateEnum.GOVERNANCE_TREE,
      committeeNodes(),
      committeeSource,
    );

    expect(result.isValid).toBe(true);
  });

  it("每一個部門都要出現在圖裡，一個都不能少", () => {
    const block = buildCarbonDiagramBlock(
      CarbonDiagramTemplateEnum.GOVERNANCE_TREE,
      committeeNodes(),
      committeeSource,
    );
    const chart = extractMermaidChart(block);

    // Info: (20260814 - Emily) 本檔最重要的一條:少一個部門的圖看起來是對的
    COMMITTEE_UNITS.forEach((unit) => expect(chart).toContain(unit));
  });

  it("超過上限時要說「幾個超過幾個」，而不是說節點無法回溯原文", () => {
    const max = CARBON_DIAGRAM_TEMPLATES.GOVERNANCE_TREE.maxNodes;
    const nodes: ICarbonDiagramNode[] = Array.from(
      { length: max + 3 },
      (unused, index) => ({ label: `單位${index}` }),
    );
    const source = nodes.map((node) => node.label).join(" ");

    const block = buildCarbonDiagramBlock(
      CarbonDiagramTemplateEnum.GOVERNANCE_TREE,
      nodes,
      source,
    );

    expect(block).toContain(String(max + 3));
    expect(block).toContain(String(max));
    // Info: (20260814 - Emily) 這些節點全部通過原文回溯 —— 不可以說它們無法回溯
    expect(block).not.toContain("無法回溯");
  });

  it("超過上限仍回報實際節點數，供判斷是差一點還是差很多", () => {
    const max = CARBON_DIAGRAM_TEMPLATES.GOVERNANCE_TREE.maxNodes;
    const nodes: ICarbonDiagramNode[] = Array.from(
      { length: max + 1 },
      (unused, index) => ({ label: `單位${index}` }),
    );

    const result = validateDiagramNodes(
      CarbonDiagramTemplateEnum.GOVERNANCE_TREE,
      nodes,
      nodes.map((node) => node.label).join(" "),
    );

    expect(result.reason).toBe(DiagramRejectReasonEnum.TOO_MANY_NODES);
    expect(result.nodeCount).toBe(max + 1);
    expect(result.maxNodes).toBe(max);
  });

  it("節點無法回溯原文時仍然說「無法回溯」，不與數量問題混用", () => {
    const block = buildCarbonDiagramBlock(
      CarbonDiagramTemplateEnum.GOVERNANCE_TREE,
      [{ label: "原文裡沒有這個單位" }, { label: "也沒有這個" }],
      "本節原文完全沒有提到上面那兩個名稱",
    );

    expect(block).toContain("無法回溯");
  });
});

/**
 * Info: (20260814 - Emily) 沿革時間軸的上限（issue 34 的回歸）。
 *
 * 這一組守的是一個**我自己造成的回歸**：移除 prompt 的「超過請只保留最上層與次層」
 * 之後，模型照實回報 31 個節點，而上限是 30 —— 那張沿革表就整張不畫了。
 * 之前它畫得出來，是因為模型先幫我們截到 30。
 */
describe("沿革時間軸的節點上限（實測回歸）", () => {
  const milestoneNodes = (count: number): ICarbonDiagramNode[] =>
    Array.from({ length: count }, (unused, index) => ({
      label: `事件${index}`,
      parent: `${1966 + index} 年 01 月`,
    }));
  const milestoneSource = (count: number): string =>
    milestoneNodes(count)
      .map((node) => `${node.parent} ${node.label}`)
      .join(" ");

  it("31 條里程碑要畫得出來（上限 30 時整張不畫）", () => {
    // Info: (20260814 - Emily) 實測那份沿革有 28 條，模型回 31 個節點
    const result = validateDiagramNodes(
      CarbonDiagramTemplateEnum.MILESTONE_TIMELINE,
      milestoneNodes(31),
      milestoneSource(31),
    );

    expect(result.isValid).toBe(true);
  });

  it("超過上限時說的是「太多」而不是「素材不足」", () => {
    /**
     * Info: (20260814 - Emily) 實測那份報告印出的是「(本節內容不足以繪製結構圖)」，
     * 而那一節有 28 條里程碑 —— 與事實完全相反。
     * 真正的成因是 LLM 輸出 schema 的 60 先攔到，把 31 個變成 0 個，
     * 於是走了 `no_nodes` 那條分支。本條釘住 builder 這一端的正確行為。
     */
    const max = CARBON_DIAGRAM_TEMPLATES.MILESTONE_TIMELINE.maxNodes;
    const block = buildCarbonDiagramBlock(
      CarbonDiagramTemplateEnum.MILESTONE_TIMELINE,
      milestoneNodes(max + 1),
      milestoneSource(max + 1),
    );

    expect(block).not.toContain("內容不足");
    expect(block).toContain(String(max + 1));
    expect(block).toContain(String(max));
  });

  it("LLM 輸出 schema 的上限必須高過所有模板的上限，否則它會先攔到", () => {
    /**
     * Info: (20260814 - Emily) 這條守的是兩道閘門的職責分工，不是某個數字。
     *
     * schema 想擋「模型失控」，builder 想擋「畫不下」。schema 的上限若沒有明顯高過
     * builder 的最寬上限，它就會先攔到本該由 builder 說明的情況 —— 而它攔下來的
     * 結果是 0 個節點，訊息因此變成「素材不足」，與事實相反。
     *
     * 數字寫死在這裡是刻意的：改任何一邊的上限都會讓這條紅，而那正是要提醒的時機。
     */
    const widest = Math.max(
      ...Object.values(CARBON_DIAGRAM_TEMPLATES).map(
        (template) => template.maxNodes,
      ),
    );
    const SCHEMA_MAX_NODES = 150;

    expect(widest).toBeLessThan(SCHEMA_MAX_NODES);
    // Info: (20260814 - Emily) 要「明顯」高過，不是差一點 —— 差一點就是 08-14 那個 bug
    expect(SCHEMA_MAX_NODES).toBeGreaterThanOrEqual(widest * 2);
  });
});
