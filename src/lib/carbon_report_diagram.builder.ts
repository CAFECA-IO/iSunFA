// Info: (20260730 - Tzuhan) 結構圖產生器:把「節點 + 父子關係」組成 mermaid flowchart
// Info: (20260730 - Tzuhan) 與 carbon_report_chart.builder 的分工:那邊的數值一律來自 computedLedger,
// Info: (20260730 - Tzuhan) 這邊的素材來自段落原文。兩者共通的哲學是「LLM 不決定語法、不決定數值」——
// Info: (20260730 - Tzuhan) LLM 只回結構化欄位,mermaid 由本模組組出,且每個節點文字都要能在原文找到才畫。

import {
  CarbonDiagramRendererEnum,
  CarbonDiagramTemplateEnum,
  CARBON_DIAGRAM_TEMPLATES,
  CARBON_DIAGRAM_MAX_LABEL_CHARS,
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
}

export const CARBON_DIAGRAM_DEFAULT_LABELS: ICarbonDiagramLabels = {
  unverifiable: "(圖表節點無法回溯至本節原文,已略過不繪製)",
  insufficient: "(本節內容不足以繪製結構圖)",
};

export enum DiagramRejectReasonEnum {
  NO_NODES = "no_nodes",
  // Info: (20260730 - Tzuhan) 有時間標籤的事件太少:一兩個點不構成時間軸
  TOO_FEW_DATED_EVENTS = "too_few_dated_events",
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

  const tooLong = nodes.filter(
    (node) => node.label.trim().length > CARBON_DIAGRAM_MAX_LABEL_CHARS,
  );
  if (tooLong.length > 0) {
    return {
      isValid: false,
      reason: DiagramRejectReasonEnum.LABEL_TOO_LONG,
      offendingLabels: tooLong.map((node) => node.label),
    };
  }

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
    const datedEvents = nodes.filter(
      (node) =>
        node.parent !== undefined &&
        !periods.has(normalizeForMatch(node.label)),
    );
    if (datedEvents.length < CARBON_TIMELINE_MIN_DATED_EVENTS) {
      return {
        isValid: false,
        reason: DiagramRejectReasonEnum.TOO_FEW_DATED_EVENTS,
      };
    }
    return { isValid: true };
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

// Info: (20260730 - Tzuhan) timeline 以冒號分隔時間與事件,label 內的冒號必須換掉否則整列語意錯位
const escapeTimelineLabel = (label: string): string =>
  escapeLabel(label).replace(/[:：]/g, "-");

/**
 * Info: (20260730 - Tzuhan) mermaid timeline:`時間標籤 : 事件 : 事件`。
 * 同一時間標籤的多個事件併為一列,無時間標籤者集中於「未標註時間」之後——
 * 不猜時間、也不丟掉事件。時間順序沿用模型回傳的順序(原文本身即依時序書寫)。
 */
function buildTimeline(nodes: ICarbonDiagramNode[]): string {
  const eventsByPeriod = new Map<string, string[]>();
  const undated: string[] = [];
  nodes.forEach((node) => {
    const label = escapeTimelineLabel(node.label);
    if (node.parent === undefined) {
      undated.push(label);
      return;
    }
    const period = escapeTimelineLabel(node.parent);
    const bucket = eventsByPeriod.get(period) ?? [];
    bucket.push(label);
    eventsByPeriod.set(period, bucket);
  });

  const rows = Array.from(eventsByPeriod.entries()).map(
    ([period, events]) => `    ${period} : ${events.join(" : ")}`,
  );
  // Info: (20260730 - Tzuhan) 沒有時間標籤的事件不丟棄,列於末尾並明示其未標註時間
  if (undated.length > 0) {
    rows.push(`    ${TIMELINE_UNDATED_LABEL} : ${undated.join(" : ")}`);
  }
  return ["```mermaid", "timeline", ...rows, "```"].join("\n");
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
        validation.reason === DiagramRejectReasonEnum.TOO_FEW_DATED_EVENTS
          ? labels.insufficient
          : labels.unverifiable
      }_`,
    );
  }

  const template = CARBON_DIAGRAM_TEMPLATES[templateId];
  if (template.renderer === CarbonDiagramRendererEnum.TIMELINE) {
    return wrap(buildTimeline(nodes));
  }

  const idByLabel = new Map(
    nodes.map((node, index) => [node.label, buildNodeId(index)] as const),
  );

  const lines = [
    "```mermaid",
    `flowchart ${template.direction}`,
    ...nodes.map(
      (node) =>
        `    ${idByLabel.get(node.label)}["${escapeLabel(node.label)}"]`,
    ),
    ...nodes
      .filter((node) => node.parent !== undefined)
      .map(
        (node) =>
          `    ${idByLabel.get(node.parent as string)} --> ${idByLabel.get(node.label)}`,
      ),
    "```",
  ];
  return wrap(lines.join("\n"));
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
