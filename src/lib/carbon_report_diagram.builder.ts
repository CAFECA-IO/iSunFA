// Info: (20260730 - Tzuhan) 結構圖產生器:把「節點 + 父子關係」組成 mermaid flowchart
// Info: (20260730 - Tzuhan) 與 carbon_report_chart.builder 的分工:那邊的數值一律來自 computedLedger,
// Info: (20260730 - Tzuhan) 這邊的素材來自段落原文。兩者共通的哲學是「LLM 不決定語法、不決定數值」——
// Info: (20260730 - Tzuhan) LLM 只回結構化欄位,mermaid 由本模組組出,且每個節點文字都要能在原文找到才畫。

import {
  CarbonDiagramRendererEnum,
  CarbonDiagramTemplateEnum,
  CARBON_DIAGRAM_TEMPLATES,
  CARBON_DIAGRAM_MAX_LABEL_CHARS,
  CARBON_DIAGRAM_MAX_OVERLONG_SHARE,
  CARBON_DIAGRAM_MIN_NODES,
  CARBON_TIMELINE_MIN_DATED_EVENTS,
  buildDiagramAnchorEnd,
  buildDiagramAnchorStart,
} from "@/constants/carbon_report_diagrams";

export interface ICarbonDiagramNode {
  /** Info: (20260730 - Tzuhan) 節點顯示文字;必須為原文中出現過的字串(逐字或去標點後相符) */
  label: string;
  /** Info: (20260730 - Tzuhan) 上層節點的 label;省略即為根節點 */
  parent?: string;
}

export interface ICarbonDiagramLabels {
  /** Info: (20260730 - Tzuhan) 節點無法回溯原文時的說明(不畫圖,但要說為什麼) */
  unverifiable: string;
  /** Info: (20260730 - Tzuhan) 素材不足(無節點)時的佔位說明 */
  insufficient: string;
  /**
   * Info: (20260806 - Tzuhan) 因過長而略過的節點的說明抬頭。
   * 略過而不說等於靜默少了原文的一條 —— 這個專案一貫的做法是「沒畫出來的必須說出來」。
   */
  skippedTooLong?: string;
  /** Info: (20260811 - Emily) 里程碑表的兩個表頭(見 buildMilestoneTable) */
  milestonePeriodHeader?: string;
  milestoneEventHeader?: string;
}

export const CARBON_DIAGRAM_DEFAULT_LABELS: ICarbonDiagramLabels = {
  unverifiable: "(圖表節點無法回溯至本節原文,已略過不繪製)",
  insufficient: "(本節內容不足以繪製結構圖)",
  skippedTooLong: "以下項目文字過長,未畫進圖中(內容仍在本節原文)",
  milestonePeriodHeader: "時間",
  milestoneEventHeader: "事件",
};

export enum DiagramRejectReasonEnum {
  NO_NODES = "no_nodes",
  // Info: (20260730 - Tzuhan) 有時間標籤的事件太少:一兩個點不構成時間軸
  TOO_FEW_DATED_EVENTS = "too_few_dated_events",
  // Info: (20260804 - Tzuhan) 節點太少:一兩個節點不構成結構,畫出來會誤導(見 CARBON_DIAGRAM_MIN_NODES)
  TOO_FEW_NODES = "too_few_nodes",
  TOO_MANY_NODES = "too_many_nodes",
  LABEL_TOO_LONG = "label_too_long",
  LABEL_NOT_IN_SOURCE = "label_not_in_source",
  CYCLIC = "cyclic",
  UNKNOWN_PARENT = "unknown_parent",
}

export interface IDiagramValidation {
  isValid: boolean;
  reason?: DiagramRejectReasonEnum;
  /** Info: (20260730 - Tzuhan) 未通過原文回溯的節點文字,供 log 定位模型在哪裡越界 */
  offendingLabels?: string[];
  /**
   * Info: (20260806 - Tzuhan) 通過原文回溯、但因過長而不畫的節點文字。
   *
   * 與 offendingLabels 是**不同的事**:那個是「模型編的」(信任問題),
   * 這個是「原文就這麼長」(版面問題)。用同一個欄位表達會讓兩者的處置混在一起,
   * 而它們的處置正好相反 —— 一個要整張作廢,一個只是少畫一項並說出來。
   */
  skippedLabels?: string[];
}

/**
 * Info: (20260730 - Tzuhan) 原文比對用的正規化:去空白與常見標點。
 * 目的是容忍抽取時的斷行與全半角差異,但**不放寬語意** —— 文字本體必須一致。
 */
function normalizeForMatch(value: string): string {
  return value
    .replace(/\s+/g, "")
    .replace(/[，。、：；（）()「」【】·．,.:;]/g, "")
    .toLowerCase();
}

// Info: (20260730 - Tzuhan) 節點文字的切段依據:冒號、頓號、括號等;切出的每段都要能在原文找到
const LABEL_SEGMENT_SEPARATOR = /[:：、,，/／|｜()（）\s-]+/;

// Info: (20260730 - Tzuhan) 過短的片段(單字)比對意義低,不納入判定(避免以「的」「與」蒙過關)
const MIN_SEGMENT_CHARS = 2;

/**
 * Info: (20260730 - Tzuhan) 節點文字是否可回溯原文。兩層判定:
 *
 * 1. 正規化後為原文的連續子字串 —— 最強,逐字照抄的段落走這條。
 * 2. 否則切段後「每一段都出現在原文」也接受 —— 因為 AI 草稿段落會改寫語序:
 *    原文寫「由廠長張印燈先生擔任主任委員」,模型給的節點是「主任委員:張印燈廠長」,
 *    語意完全正確但不是連續子字串。只要求連續會把正確的輸入判成捏造。
 *
 * 防捏造的核心仍在:任何原文沒出現過的人名、單位、術語都無法通過(它會是找不到的那一段)。
 */
function isGrounded(label: string, normalizedSource: string): boolean {
  const normalizedLabel = normalizeForMatch(label);
  if (normalizedLabel.length === 0) return false;
  if (normalizedSource.includes(normalizedLabel)) return true;

  const segments = label
    .split(LABEL_SEGMENT_SEPARATOR)
    .map(normalizeForMatch)
    .filter((segment) => segment.length >= MIN_SEGMENT_CHARS);
  // Info: (20260730 - Tzuhan) 切不出可判定的片段時視為不可回溯(不放寬)
  if (segments.length === 0) return false;
  return segments.every((segment) => normalizedSource.includes(segment));
}

/**
 * Info: (20260730 - Tzuhan) 驗證節點是否可採信。任何一項不通過即整張不畫。
 *
 * 為什麼不「丟掉壞節點、留下好節點」:父子關係一旦少了中間層,剩下的圖會呈現
 * 一個原文裡並不存在的層級結構——那比不畫更糟,因為它看起來是對的。
 */
export function validateDiagramNodes(
  templateId: CarbonDiagramTemplateEnum,
  nodes: ICarbonDiagramNode[],
  sourceText: string,
): IDiagramValidation {
  if (nodes.length === 0) {
    return { isValid: false, reason: DiagramRejectReasonEnum.NO_NODES };
  }
  const template = CARBON_DIAGRAM_TEMPLATES[templateId];
  if (nodes.length > template.maxNodes) {
    return { isValid: false, reason: DiagramRejectReasonEnum.TOO_MANY_NODES };
  }

  /**
   * Info: (20260806 - Tzuhan) 原文回溯先驗,長度後驗 —— **順序是這段邏輯的關鍵。**
   *
   * 先驗回溯,才能斷言「過長的那幾個節點不是模型編的」;
   * 反過來的話,一個編造出來的長標籤會被當成版面問題略過,而它其實是信任問題。
   */
  // Info: (20260730 - Tzuhan) 核心護欄:每個節點文字都必須能在本節原文找到,否則就是模型自己編的
  const haystack = normalizeForMatch(sourceText);
  const unverifiable = nodes.filter(
    (node) => !isGrounded(node.label, haystack),
  );
  if (unverifiable.length > 0) {
    return {
      isValid: false,
      reason: DiagramRejectReasonEnum.LABEL_NOT_IN_SOURCE,
      offendingLabels: unverifiable.map((node) => node.label),
    };
  }

  /**
   * Info: (20260806 - Tzuhan) 過長的處置改為**分兩種**。
   *
   * 原本一律整張否決,理由寫「超過即視為模型把整段敘述塞進節點」。
   * 但實測擋掉的是原文的一條完整里程碑(43 字),而它**已經通過上面的原文回溯** ——
   * 那不是編造,只是長。用信任層面的處置(作廢 30 個節點)去解版面問題,代價完全不對等。
   *
   * - 半數以上過長 → 那才像原本設想的「把敘述當節點」,整張不採信。
   * - 否則:**時間軸**略過那幾個並在圖下方列出;**樹狀圖**仍整張否決 ——
   *   本檔開頭那條理由對樹成立:少了中間層會讓剩下的圖呈現原文裡不存在的層級,
   *   而那比不畫更糟,因為它看起來是對的。時間軸沒有層級,所以不受這條限制。
   */
  const tooLong = nodes.filter(
    (node) => node.label.trim().length > CARBON_DIAGRAM_MAX_LABEL_CHARS,
  );
  if (tooLong.length > 0) {
    const isMostlyTooLong =
      tooLong.length / nodes.length > CARBON_DIAGRAM_MAX_OVERLONG_SHARE;
    const isTimeline =
      CARBON_DIAGRAM_TEMPLATES[templateId].renderer ===
      CarbonDiagramRendererEnum.TIMELINE;
    if (isMostlyTooLong || !isTimeline) {
      return {
        isValid: false,
        reason: DiagramRejectReasonEnum.LABEL_TOO_LONG,
        offendingLabels: tooLong.map((node) => node.label),
      };
    }
  }
  const skippedLabels = tooLong.map((node) => node.label);

  // Info: (20260730 - Tzuhan) timeline 的 parent 是「時間標籤」而非另一個節點:
  // Info: (20260730 - Tzuhan) 它只需同樣能在原文找到(上面已驗),不需自己也是節點,也無層級可成環。
  // Info: (20260730 - Tzuhan) 用樹的規則去驗證一條時間軸,會把正確的輸入判成錯的。
  if (template.renderer === CarbonDiagramRendererEnum.TIMELINE) {
    const unverifiableParents = nodes
      .map((node) => node.parent)
      .filter(
        (parent): parent is string =>
          parent !== undefined && !isGrounded(parent, haystack),
      );
    if (unverifiableParents.length > 0) {
      return {
        isValid: false,
        reason: DiagramRejectReasonEnum.LABEL_NOT_IN_SOURCE,
        offendingLabels: unverifiableParents,
      };
    }

    // Info: (20260730 - Tzuhan) 事件節點的文字若等於某個時間標籤,代表模型把時間當成事件(實測發生過),
    // Info: (20260730 - Tzuhan) 該節點不計入有效事件數
    const periods = new Set(
      nodes
        .map((node) => node.parent)
        .filter((parent): parent is string => parent !== undefined)
        .map(normalizeForMatch),
    );
    /**
     * Info: (20260810 - Emily) 下限要以**實際會畫出來的**事件數為準，不是全部節點
     * （PR review 第 6 點）。
     *
     * 上面的 `skippedLabels` 是過長而不畫的節點。原本這裡用完整節點集算 datedEvents，
     * 於是「驗證時 3 個、畫出來 2 個」的情形會通過 —— 產出一條事件數低於下限的時間軸，
     * 而下限存在的理由正是「少於 3 個事件的時間軸讀不出趨勢」。
     *
     * 驗的集合與畫的集合必須是同一個，否則這道護欄擋不住它宣稱要擋的東西。
     */
    const skipped = new Set(skippedLabels);
    const datedEvents = nodes.filter(
      (node) =>
        node.parent !== undefined &&
        !periods.has(normalizeForMatch(node.label)) &&
        !skipped.has(node.label),
    );
    if (datedEvents.length < CARBON_TIMELINE_MIN_DATED_EVENTS) {
      return {
        isValid: false,
        reason: DiagramRejectReasonEnum.TOO_FEW_DATED_EVENTS,
      };
    }
    // Info: (20260806 - Tzuhan) 過長者不畫但要說出來(見上方 skippedLabels 的理由)
    return skippedLabels.length > 0
      ? { isValid: true, skippedLabels }
      : { isValid: true };
  }

  /**
   * Info: (20260804 - Tzuhan) 節點太少即不畫(issue_drafts/inventory_table_import/05)。
   *
   * 放在 timeline 分支之後,因為 timeline 有自己的下限(以「有時間標籤的事件數」為準,
   * 而不是節點總數 —— 時間標籤本身也算節點,用總數會把只有一個事件的時間軸放行)。
   */
  if (nodes.length < CARBON_DIAGRAM_MIN_NODES) {
    return { isValid: false, reason: DiagramRejectReasonEnum.TOO_FEW_NODES };
  }

  // Info: (20260730 - Tzuhan) 父節點必須存在於同一批節點內(不可指向圖外的東西)
  const labels = new Set(nodes.map((node) => node.label));
  const unknownParent = nodes.filter(
    (node) => node.parent !== undefined && !labels.has(node.parent),
  );
  if (unknownParent.length > 0) {
    return {
      isValid: false,
      reason: DiagramRejectReasonEnum.UNKNOWN_PARENT,
      offendingLabels: unknownParent.map((node) => node.parent ?? ""),
    };
  }

  // Info: (20260730 - Tzuhan) 環狀關係會讓 mermaid 畫出無意義的圈,且代表模型誤解了層級
  const parentByLabel = new Map(
    nodes.map((node) => [node.label, node.parent] as const),
  );
  for (const node of nodes) {
    const seen = new Set<string>([node.label]);
    let cursor = parentByLabel.get(node.label);
    while (cursor !== undefined) {
      if (seen.has(cursor)) {
        return { isValid: false, reason: DiagramRejectReasonEnum.CYCLIC };
      }
      seen.add(cursor);
      cursor = parentByLabel.get(cursor);
    }
  }

  return { isValid: true };
}

// Info: (20260730 - Tzuhan) mermaid 節點 id 只能是安全字元;以序號當 id,文字一律放在引號內的 label
const buildNodeId = (index: number): string => `N${index}`;

// Info: (20260730 - Tzuhan) timeline 中無時間標籤事件的分組名(不猜時間,也不丟事件)
const TIMELINE_UNDATED_LABEL = "未標註時間";

// Info: (20260730 - Tzuhan) mermaid 的 label 以雙引號包夾,內部雙引號需移除(逸出規則不完整,直接去掉最安全)
const escapeLabel = (label: string): string =>
  label.trim().replace(/"/g, "").replace(/\s+/g, " ");

/**
 * Info: (20260811 - Emily) 里程碑改成表格之後,要換掉的不再是冒號而是**直線**。
 * timeline 用冒號分隔時間與事件,表格用 `|` 分隔儲存格 ——
 * 事件文字裡的 `|` 若不逸出會多切出一欄,整列跟著錯位。
 * 冒號在表格裡沒有語意,不必再動它(原文的「品管分等檢驗甲等」帶冒號的句子因此保持原樣)。
 */
const escapeTableCell = (label: string): string =>
  escapeLabel(label).replace(/\|/g, "\\|");

/**
 * Info: (20260811 - Emily) 里程碑改為**表格**而不是 mermaid timeline
 * (data/issue_drafts/open/20 第 2 張票)。
 *
 * mermaid 的 timeline 是「一個時間點一欄」,欄寬固定,而中文事件說明約 20 字。
 * 實測高興昌那份的 15 條沿革:SVG 內在寬度 3,559px,排到橫式頁寬 993px 是**縮到 28%**,
 * 事件字級 4.5px —— 正文是 14px。使用者看到的「字疊在一起」是文字在那個尺寸下溢出各自的方塊。
 *
 * 量過三種做法:
 *   現況一條軸    3559px → 28%   4.5px
 *   拆成三段      最差 1744px → 57%   9.1px
 *   表格          688px  → 不縮放     11.3px(與其他表格同級)
 * 拆段要到不縮放得拆成五張圖,15 條沿革拆五張圖不合理。
 * mermaid timeline 也沒有交錯排列的選項:同一時間點的事件只會在那一欄往下疊。
 *
 * 客戶原始報告這一段本來就是條列敘述而不是圖表,表格同時更接近原文。
 *
 * 同一時間點的多個事件各佔一列,時間只寫在該段的第一列 ——
 * 與原文照錄表格的縱向合併慣例一致(見 carbon_source_table 的 T9),
 * 也讓 annotateTable 的欄寬判斷把寬度讓給事件欄。
 *
 * 註:template 的 renderer 仍叫 TIMELINE。那個列舉標的是「這個模板要呈現時序」,
 * 不是「一定要用 mermaid 畫成軸」;呈現方式改變不需要改模板的語意。
 */
function buildMilestoneTable(
  nodes: ICarbonDiagramNode[],
  labels: ICarbonDiagramLabels,
): string {
  const eventsByPeriod = new Map<string, string[]>();
  const undated: string[] = [];
  /**
   * Info: (20260803 - Tzuhan) 時間標籤的集合。模型除了「事件 + 時間標籤」之外,
   * 還會另外回傳一批**標籤本身**當節點(無 parent),實測產出這樣一列:
   * `未標註時間 : 1966年01月 : 1968年06月 : …` —— 那是把時間軸自己再列一次。
   *
   * 本檔開頭寫過「不丟壞節點、只留好節點」,理由是少了中間層會呈現原文不存在的層級。
   * 那條理由對里程碑不成立:它沒有層級,丟掉一個與時間欄重複的項目
   * 不可能捏造出結構。這裡丟掉的不是事件,是時間欄的複本。
   */
  const periods = new Set(
    nodes
      .map((node) => node.parent)
      .filter((parent): parent is string => parent !== undefined)
      .map(escapeTableCell),
  );
  nodes.forEach((node) => {
    const label = escapeTableCell(node.label);
    if (node.parent === undefined) {
      // Info: (20260803 - Tzuhan) 無時間標籤且文字本身就是某個時間標籤 → 複本,不是事件
      if (periods.has(label)) return;
      undated.push(label);
      return;
    }
    const period = escapeTableCell(node.parent);
    const bucket = eventsByPeriod.get(period) ?? [];
    bucket.push(label);
    eventsByPeriod.set(period, bucket);
  });

  const rows: string[] = [];
  eventsByPeriod.forEach((events, period) => {
    events.forEach((event, index) => {
      // Info: (20260811 - Emily) 時間只寫在該段第一列,續列留空(縱向合併的表達方式)
      rows.push(`| ${index === 0 ? period : ""} | ${event} |`);
    });
  });
  // Info: (20260730 - Tzuhan) 沒有時間標籤的事件不丟棄,列於末尾並明示其未標註時間
  undated.forEach((event, index) => {
    rows.push(`| ${index === 0 ? TIMELINE_UNDATED_LABEL : ""} | ${event} |`);
  });

  const periodHeader = labels.milestonePeriodHeader ?? "時間";
  const eventHeader = labels.milestoneEventHeader ?? "事件";
  return [
    `| ${periodHeader} | ${eventHeader} |`,
    "| --- | --- |",
    ...rows,
  ].join("\n");
}

/**
 * Info: (20260730 - Tzuhan) 產出結構圖區塊(錨點包夾,與數據圖表同一套替換機制)。
 * 驗證未過時不畫圖,但輸出說明文字——沉默地少一張圖,查核者不會知道發生過什麼。
 */
export function buildCarbonDiagramBlock(
  templateId: CarbonDiagramTemplateEnum,
  nodes: ICarbonDiagramNode[],
  sourceText: string,
  labels: ICarbonDiagramLabels = CARBON_DIAGRAM_DEFAULT_LABELS,
): string {
  const wrap = (body: string): string =>
    `${buildDiagramAnchorStart(templateId)}\n\n${body}\n\n${buildDiagramAnchorEnd(templateId)}`;

  const validation = validateDiagramNodes(templateId, nodes, sourceText);
  if (!validation.isValid) {
    return wrap(
      `> _${
        validation.reason === DiagramRejectReasonEnum.NO_NODES ||
        validation.reason === DiagramRejectReasonEnum.TOO_FEW_DATED_EVENTS ||
        validation.reason === DiagramRejectReasonEnum.TOO_FEW_NODES
          ? labels.insufficient
          : labels.unverifiable
      }_`,
    );
  }

  /**
   * Info: (20260806 - Tzuhan) 略過過長的節點,並在圖下方列出來。
   * 它們通過了原文回溯(內容仍在本節原文裡),只是畫進圖裡會把版面撐爛。
   */
  const skipped = new Set(validation.skippedLabels ?? []);
  const drawn =
    skipped.size > 0 ? nodes.filter((node) => !skipped.has(node.label)) : nodes;
  const noteSkipped = (body: string): string => {
    if (skipped.size === 0 || !labels.skippedTooLong) return body;
    return [
      body,
      "",
      `**${labels.skippedTooLong}**`,
      "",
      ...Array.from(skipped).map((label) => `- ${label}`),
    ].join("\n");
  };

  const template = CARBON_DIAGRAM_TEMPLATES[templateId];
  if (template.renderer === CarbonDiagramRendererEnum.TIMELINE) {
    return wrap(noteSkipped(buildMilestoneTable(drawn, labels)));
  }

  /**
   * Info: (20260810 - Emily) 這裡也用 drawn 而不是 nodes（PR review 第 7 點）。
   *
   * 今天兩者相等:非時間軸模板遇到過長節點是**整張否決**，所以 skipped 必為空，
   * 這段改動可證明行為不變。留 nodes 的問題不在今天而在明天 ——
   * 哪天樹狀圖也改成「略過過長者」，這裡就會靜默重現本次修的那個 bug：
   * 驗的集合與畫的集合分岔。把兩處都綁到同一個集合，那個分岔就沒有地方可以發生。
   *
   * 邊要一併過濾:父節點若被略過，`idByLabel.get(parent)` 會是 undefined，
   * 產出 `undefined --> x` 這種畫不出來的語法。節點換了集合、邊沒換，
   * 就是另一種形式的同一個錯。
   */
  const idByLabel = new Map(
    drawn.map((node, index) => [node.label, buildNodeId(index)] as const),
  );

  const lines = [
    "```mermaid",
    `flowchart ${template.direction}`,
    ...drawn.map(
      (node) =>
        `    ${idByLabel.get(node.label)}["${escapeLabel(node.label)}"]`,
    ),
    ...drawn
      .filter(
        (node) =>
          node.parent !== undefined && idByLabel.has(node.parent as string),
      )
      .map(
        (node) =>
          `    ${idByLabel.get(node.parent as string)} --> ${idByLabel.get(node.label)}`,
      ),
    "```",
  ];
  return wrap(noteSkipped(lines.join("\n")));
}

/**
 * Info: (20260730 - Tzuhan) 插入結構圖:同模板錨點已存在則原地替換(不疊加),否則附加於尾端。
 * 與數據圖表的插入語意一致,敘述內容零改動。
 */
export function insertCarbonDiagramBlock(
  content: string,
  templateId: CarbonDiagramTemplateEnum,
  block: string,
): string {
  const start = buildDiagramAnchorStart(templateId);
  const end = buildDiagramAnchorEnd(templateId);
  const startIndex = content.indexOf(start);
  const endIndex = content.indexOf(end);
  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    const before = content.slice(0, startIndex).replace(/\s+$/, "");
    const after = content.slice(endIndex + end.length).replace(/^\s+/, "");
    return [before, block, after].filter(Boolean).join("\n\n");
  }
  const trimmed = content.trim();
  return trimmed ? `${trimmed}\n\n${block}` : block;
}

// Info: (20260730 - Tzuhan) 內容是否已含指定結構圖(避免重複生成)
export function hasCarbonDiagramBlock(
  content: string,
  templateId: CarbonDiagramTemplateEnum,
): boolean {
  return content.includes(buildDiagramAnchorStart(templateId));
}

/**
 * Info: (20260730 - Tzuhan) 該段落是否有對應的結構圖模板(一段最多一張,由常數決定)
 */
export function findDiagramTemplateForParagraph(
  paragraphId: string,
): CarbonDiagramTemplateEnum | null {
  const found = Object.entries(CARBON_DIAGRAM_TEMPLATES).find(
    ([, template]) => template.paragraphId === paragraphId,
  );
  return found ? (found[0] as CarbonDiagramTemplateEnum) : null;
}
