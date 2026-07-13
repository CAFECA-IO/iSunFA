import { MermaidChartType } from "@/constants/mermaid_chart";

/**
 * Info: (20260708 - Julian) 甘特圖項目類型
 */
export enum GanttItemType {
  TASK = "task",
  SECTION = "section",
}

/**
 * Info: (20260708 - Julian) 甘特圖任務狀態
 */
export enum GanttTaskStatus {
  ACTIVE = "active",
  DONE = "done",
  CRIT = "crit",
  MILESTONE = "milestone",
}

/**
 * Info: (20260709 - Julian) XY 圖表資料類型
 */
export enum XYChartDataType {
  BAR = "bar",
  LINE = "line",
}

/**
 * Info: (20260709 - Julian) XY 圖表軸類型
 */
export enum XYChartAxisType {
  NUMERIC = "numeric",
  CATEGORY = "category",
}

/**
 * Info: (20260708 - Julian) Mermaid 結構化指令類型列舉
 */
export enum MermaidActionType {
  CHANGE_TITLE = "CHANGE_TITLE",
  GANTT_ADD_TASK = "GANTT_ADD_TASK",
  GANTT_EDIT_TASK = "GANTT_EDIT_TASK",
  GANTT_DELETE_TASK = "GANTT_DELETE_TASK",
  GANTT_SWAP_TASK = "GANTT_SWAP_TASK",
  PIE_ADD_ITEM = "PIE_ADD_ITEM",
  PIE_EDIT_ITEM = "PIE_EDIT_ITEM",
  PIE_DELETE_ITEM = "PIE_DELETE_ITEM",
  FLOWCHART_ADD_NODE = "FLOWCHART_ADD_NODE",
  FLOWCHART_EDIT_NODE = "FLOWCHART_EDIT_NODE",
  FLOWCHART_ADD_CONNECTION = "FLOWCHART_ADD_CONNECTION",
  FLOWCHART_CHANGE_DIRECTION = "FLOWCHART_CHANGE_DIRECTION",
  XYCHART_ADD_SERIES = "XYCHART_ADD_SERIES",
  XYCHART_CHANGE_X_AXIS = "XYCHART_CHANGE_X_AXIS",
  XYCHART_CHANGE_Y_AXIS = "XYCHART_CHANGE_Y_AXIS",
  XYCHART_CHANGE_LINE_SERIES = "XYCHART_CHANGE_LINE_SERIES",
  XYCHART_CHANGE_BAR_SERIES = "XYCHART_CHANGE_BAR_SERIES",
  XYCHART_DELETE_SERIES = "XYCHART_DELETE_SERIES",
}

/**
 * Info: (20260708 - Julian) 結構化動作介面 (Discriminated Union)
 */
export type IChartAction = {
  id: string;
  description: string;
} & (
  | {
      type: MermaidActionType.CHANGE_TITLE;
      payload: { title: string };
    }
  | {
      type: MermaidActionType.XYCHART_ADD_SERIES;
      payload: {
        seriesName: string;
        type: XYChartDataType;
        data: number[];
      };
    }
  | {
      type: MermaidActionType.XYCHART_CHANGE_X_AXIS;
      payload: {
        title?: string;
        categories?: string[];
        min?: number;
        max?: number;
      };
    }
  | {
      type: MermaidActionType.XYCHART_CHANGE_Y_AXIS;
      payload: {
        title?: string;
        min?: number;
        max?: number;
      };
    }
  | {
      type: MermaidActionType.XYCHART_CHANGE_LINE_SERIES;
      payload: {
        seriesName: string;
        seriesIndex: number;
        type: XYChartDataType;
        data: number[];
      };
    }
  | {
      type: MermaidActionType.XYCHART_CHANGE_BAR_SERIES;
      payload: {
        seriesName: string;
        seriesIndex: number;
        type: XYChartDataType;
        data: number[];
      };
    }
  | {
      type: MermaidActionType.XYCHART_DELETE_SERIES;
      payload: {
        seriesIndex: number;
      };
    }
  | {
      type: MermaidActionType.GANTT_ADD_TASK;
      payload: {
        label: string;
        section?: string;
        status?: string;
        id?: string;
        start?: string;
        end?: string;
        isCrit?: boolean;
        isMilestone?: boolean;
        isDone?: boolean;
      };
    }
  | {
      type: MermaidActionType.GANTT_EDIT_TASK;
      payload: {
        taskLabel: string;
        taskId?: string;
        label: string;
        status?: string;
        id?: string;
        start?: string;
        end?: string;
      };
    }
  | {
      type: MermaidActionType.GANTT_DELETE_TASK;
      payload: { taskLabel: string; taskId?: string };
    }
  | {
      type: MermaidActionType.GANTT_SWAP_TASK;
      payload: {
        taskLabel1: string;
        taskId1?: string;
        taskLabel2: string;
        taskId2?: string;
      };
    }
  | {
      type: MermaidActionType.PIE_ADD_ITEM;
      payload: { label: string; value: number };
    }
  | {
      type: MermaidActionType.PIE_EDIT_ITEM;
      payload: { oldLabel: string; newLabel: string; newValue: number };
    }
  | { type: MermaidActionType.PIE_DELETE_ITEM; payload: { label: string } }
  | {
      type: MermaidActionType.FLOWCHART_ADD_NODE;
      payload: {
        id: string;
        label: string;
        fromId?: string;
        toId?: string;
        connText?: string;
      };
    }
  | {
      type: MermaidActionType.FLOWCHART_EDIT_NODE;
      payload: { id: string; label: string };
    }
  | {
      type: MermaidActionType.FLOWCHART_ADD_CONNECTION;
      payload: {
        fromId: string;
        toId: string;
        connType?: string;
        connLabel?: string;
      };
    }
  | {
      type: MermaidActionType.FLOWCHART_CHANGE_DIRECTION;
      payload: { direction: string };
    }
);
/**
 * Info: (20260707 - Julian) 甘特圖資料項目介面
 */
export interface IGanttItem {
  type: GanttItemType;
  label: string;
  section?: string; // Info: (20260707 - Julian) 所屬區塊名稱
  status?: string; // Info: (20260707 - Julian) 狀態標籤 (如 active, crit)
  id?: string; // Info: (20260707 - Julian) 任務 ID
  start?: string; // Info: (20260707 - Julian) 開始日期或前置任務 ID
  end?: string; // Info: (20260707 - Julian) 結束日期或持續時間
  lineIndex: number; // Info: (20260708 - Julian) 原始行號，用於結構化編輯
}

/**
 * Info: (20260709 - Julian) XY 圖表數列介面
 */
export interface IXYChartSeries {
  type: XYChartDataType;
  seriesName: string;
  data: number[];
  lineIndex: number;
}

/**
 * Info: (20260709 - Julian) XY 圖表結構介面
 */
export interface IXYChartData {
  title: string;
  xAxis: {
    title?: string;
    categories?: string[];
    min?: number;
    max?: number;
  };
  yAxis: {
    title?: string;
    min?: number;
    max?: number;
  };
  series: IXYChartSeries[];
}

/**
 * Info: (20260713 - Julian) 桑基圖連結介面
 */
export interface ISankeyLink {
  source: string;
  target: string;
  value: number;
  lineIndex: number;
}

/**
 * Info: (20260713 - Julian) 桑基圖結構介面
 */
export interface ISankeyData {
  links: ISankeyLink[];
  nodes: string[];
}

/**
 * Info: (20260624 - Julian)
 * 略過註解與 %%{init...}%% 設定區塊，判斷是否為圓餅圖
 */
export const isPieChart = (chartStr: string): boolean => {
  if (!chartStr || typeof chartStr !== "string") return false;
  const lines = chartStr.split("\n");
  for (const line of lines) {
    const cleanLine = line.trim().toLowerCase();
    if (!cleanLine || cleanLine.startsWith("%%")) {
      continue;
    }
    return cleanLine.startsWith("pie");
  }
  return false;
};

/**
 * Info: (20260624 - Julian)
 * 自動判別目前的圖表類型 (pie, flowchart, gantt, sequence, unknown)
 */
export const detectChartType = (chartStr: string): MermaidChartType => {
  if (!chartStr || typeof chartStr !== "string")
    return MermaidChartType.UNKNOWN;
  const lines = chartStr.split("\n");
  for (const line of lines) {
    const cleanLine = line.trim().toLowerCase();
    if (!cleanLine || cleanLine.startsWith("%%")) {
      continue;
    }
    if (cleanLine.startsWith("pie")) return MermaidChartType.PIE;
    if (cleanLine.startsWith("flowchart") || cleanLine.startsWith("graph"))
      return MermaidChartType.FLOWCHART;
    if (cleanLine.startsWith("gantt")) return MermaidChartType.GANTT;
    if (cleanLine.startsWith("xychart")) return MermaidChartType.XYCHART;
    if (cleanLine.startsWith("sankey")) return MermaidChartType.SANKEY;
    if (cleanLine.startsWith("sequencediagram"))
      return MermaidChartType.SEQUENCE;
    break;
  }
  return MermaidChartType.UNKNOWN;
};

/**
 * Info: (20260708 - Julian)
 * 取得圖表標題
 */
export const getChartTitle = (chartStr: string): string => {
  if (!chartStr || typeof chartStr !== "string") return "";
  const lines = chartStr.split("\n");
  for (const line of lines) {
    const cleanLine = line.trim();
    if (!cleanLine || cleanLine.startsWith("%%")) {
      continue;
    }
    // Info: (20260709 - Julian) 匹配 "pie title My Title", "title My Title", "title: My Title"
    const match = cleanLine.match(/^(?:(?:\w+)\s+)?title:?\s+(.+)$/i);
    if (match) {
      let title = match[1].trim();
      if (title.startsWith('"') && title.endsWith('"')) {
        title = title.slice(1, -1);
      }
      return title;
    }
  }
  return "";
};

/**
 * Info: (20260709 - Julian)
 * 更新圖表標題
 */
export const updateChartTitle = (
  chartStr: string,
  newTitle: string,
): string => {
  if (!chartStr || typeof chartStr !== "string") return chartStr;

  const chartType = detectChartType(chartStr);
  const lines = chartStr.split("\n");
  const cleanTitle = (newTitle || "").trim();

  // Info: (20260709 - Julian) 尋找現有 title 行
  const titleIndex = lines.findIndex(
    (l) =>
      /^(?:(?:\w+)\s+)?title:?\s+/i.test(l.trim()) &&
      !l.trim().startsWith("%%"),
  );

  if (titleIndex !== -1) {
    if (!cleanTitle) {
      lines.splice(titleIndex, 1);
    } else {
      const line = lines[titleIndex];
      const indentMatch = line.match(/^(\s*)/);
      const indent = indentMatch ? indentMatch[1] : "";

      const keywordMatch = line.trim().match(/^((?:(?:\w+)\s+)?title:?)\s+/i);
      const prefix = keywordMatch ? keywordMatch[1] : "title";

      lines[titleIndex] = `${indent}${prefix} ${cleanTitle}`;
    }
    return lines.join("\n");
  }

  // Info: (20260709 - Julian) 若無現有 title，則插入新的 title
  if (!cleanTitle) return chartStr;

  // Info: (20260709 - Julian) 尋找圖表開始位置
  let startIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const cleanLine = lines[i].trim();
    if (!cleanLine || cleanLine.startsWith("%%")) {
      continue;
    }
    startIndex = i;
    break;
  }

  if (startIndex !== -1) {
    const startLine = lines[startIndex];
    const indentMatch = startLine.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1] : "";

    if (chartType === MermaidChartType.PIE) {
      lines[startIndex] = `${indent}pie title ${cleanTitle}`;
    } else if (chartType === MermaidChartType.GANTT) {
      lines.splice(startIndex + 1, 0, `${indent}    title ${cleanTitle}`);
    } else if (chartType === MermaidChartType.FLOWCHART) {
      if (lines[0]?.trim() === "---") {
        const closeIndex = lines.indexOf("---", 1);
        if (closeIndex !== -1) {
          lines.splice(closeIndex, 0, `title: ${cleanTitle}`);
          return lines.join("\n");
        }
      }
      lines.unshift("---", `title: ${cleanTitle}`, "---");
    } else {
      lines.splice(startIndex + 1, 0, `${indent}    title ${cleanTitle}`);
    }
  } else {
    lines.unshift(`title ${cleanTitle}`);
  }

  return lines.join("\n");
};

/**
 * Info: (20260624 - Julian) 解析 flowchart/graph 中的所有節點
 * @param chartStr - mermaid 字串
 * @returns - 節點 id 與標籤 array
 */
export const parseFlowchartNodes = (
  chartStr: string,
): { id: string; label: string }[] => {
  if (!chartStr || typeof chartStr !== "string") return [];

  const nodes: { id: string; label: string }[] = [];
  const lines = chartStr.split("\n");
  // Info: (20260629 - Julian) 支援以下節點格式：A[B], A[B]{C}, A[B]((C))
  const nodeRegex =
    /([a-zA-Z0-9_-]+)\s*(?:\["([^"]+)"\]|\[([^\]]+)\]|\("([^"]+)"\)|\(([^)]+)\)|\{"([^"]+)"\}|\{([^}]+)\})/g;
  const seenIds = new Set<string>();

  lines.forEach((line) => {
    let match;
    nodeRegex.lastIndex = 0;
    while ((match = nodeRegex.exec(line)) !== null) {
      const id = match[1];
      if (!seenIds.has(id) && !/^(graph|flowchart|subgraph|end)$/i.test(id)) {
        seenIds.add(id);
        const label =
          match[2] ||
          match[3] ||
          match[4] ||
          match[5] ||
          match[6] ||
          match[7] ||
          id;
        nodes.push({ id, label });
      }
    }
  });

  const connRegex = /([a-zA-Z0-9_-]+)\s*(-->|==>|-\.-)\s*([a-zA-Z0-9_-]+)/g;
  lines.forEach((line) => {
    let match;
    connRegex.lastIndex = 0;
    while ((match = connRegex.exec(line)) !== null) {
      const id1 = match[1];
      const id2 = match[3];
      if (!seenIds.has(id1) && !/^(graph|flowchart|subgraph|end)$/i.test(id1)) {
        seenIds.add(id1);
        nodes.push({ id: id1, label: id1 });
      }
      if (!seenIds.has(id2) && !/^(graph|flowchart|subgraph|end)$/i.test(id2)) {
        seenIds.add(id2);
        nodes.push({ id: id2, label: id2 });
      }
    }
  });

  return nodes;
};

/**
 * Info: (20260624 - Julian)
 * 解析 pie chart 的所有項目名稱與值
 */
export const parsePieItems = (
  chartStr: string,
): { label: string; value: number }[] => {
  if (!chartStr || typeof chartStr !== "string") return [];

  const items: { label: string; value: number }[] = [];
  const lines = chartStr.split("\n");
  lines.forEach((line) => {
    const clean = line.trim();
    if (clean.includes(":")) {
      const parts = clean.split(":");
      if (parts.length >= 2) {
        let name = parts[0].trim();
        if (name.startsWith('"') && name.endsWith('"')) {
          name = name.slice(1, -1);
        }
        if (name === "title" || name.startsWith("pie title")) {
          return;
        }
        const valueStr = parts[parts.length - 1].trim();
        const value = parseFloat(valueStr);
        if (!isNaN(value)) {
          items.push({ label: name, value });
        }
      }
    }
  });
  return items;
};

/**
 * Info: (20260624 - Julian)
 * 解析圓餅圖的標題與數值，供 Recharts DonutChart 元件渲染使用
 */
export const parsePieData = (
  chartStr: string,
): { title: string; data: { name: string; value: number }[] } | null => {
  if (!chartStr || typeof chartStr !== "string") return null;
  if (!isPieChart(chartStr)) return null;

  const lines = chartStr.split("\n");
  let title = "";
  const data: { name: string; value: number }[] = [];

  lines.forEach((line) => {
    const cleanLine = line.trim();
    if (cleanLine.startsWith("pie title")) {
      title = cleanLine.replace("pie title", "").trim();
    } else if (cleanLine.includes(":")) {
      const parts = cleanLine.split(":");
      if (parts.length >= 2) {
        let name = parts[0].trim();
        if (name.startsWith('"') && name.endsWith('"')) {
          name = name.slice(1, -1);
        }
        const valueStr = parts[parts.length - 1].trim();
        const value = parseFloat(valueStr.replace("%", ""));
        if (!isNaN(value)) {
          data.push({ name, value });
        }
      }
    }
  });

  if (data.length > 0) {
    return { title, data };
  }
  return null;
};

/**
 * Info: (20260707 - Julian)
 * 解析 gantt chart 的所有項目名稱與屬性
 */
export const parseGanttItems = (chartStr: string): IGanttItem[] => {
  if (!chartStr || typeof chartStr !== "string") return [];

  const items: IGanttItem[] = [];
  const lines = chartStr.split("\n");
  let currentSection = ""; // Info: (20260707 - Julian) 預設無區塊 (Global)

  lines.forEach((line, index) => {
    const cleanLine = line.trim();
    if (
      !cleanLine ||
      cleanLine.startsWith("%%") ||
      cleanLine.toLowerCase() === "gantt"
    )
      return;

    // Info: (20260707 - Julian) 偵測 Section
    const sectionMatch = cleanLine.match(/^section\s+(.+)$/i);
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
      items.push({
        type: GanttItemType.SECTION,
        label: currentSection,
        lineIndex: index,
      });
      return;
    }

    // Info: (20260707 - Julian) 偵測 Task (支援格式：Label : [tags,] [start,] end|duration)
    if (cleanLine.includes(":")) {
      const colonIndex = cleanLine.indexOf(":");
      const label = cleanLine.substring(0, colonIndex).trim();
      const rest = cleanLine.substring(colonIndex + 1).trim();

      const keywords = [
        "title",
        "dateformat",
        "axisformat",
        "todaymarker",
        "excludes",
        "includes",
        "tickinterval",
        "weekday",
      ];
      if (label && !keywords.includes(label.toLowerCase())) {
        const parts = rest.split(",").map((p) => p.trim());
        const tags: string[] = [];
        let id = "";
        let start = "";
        let end = "";

        parts.forEach((part) => {
          const lower = part.toLowerCase();
          if (
            Object.values(GanttTaskStatus).includes(lower as GanttTaskStatus)
          ) {
            tags.push(lower);
          } else if (
            !id &&
            !start &&
            !end &&
            /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(part) &&
            !part.startsWith("after ") &&
            !/^\d{4}-\d{2}-\d{2}$/.test(part)
          ) {
            id = part;
          } else if (
            !start &&
            (part.startsWith("after ") || /^\d{4}-\d{2}-\d{2}$/.test(part))
          ) {
            start = part;
          } else if (!end) {
            end = part;
          }
        });

        items.push({
          type: GanttItemType.TASK,
          label,
          section: currentSection,
          id,
          status: tags.join(", "),
          start,
          end: end || start,
          lineIndex: index,
        });
      }
    }
  });

  return items;
};

/**
 * Info: (20260708 - Julian) 應用結構化編輯動作到甘特圖
 */
export const applyGanttAction = (
  chartStr: string,
  action: IChartAction,
): string => {
  const lines = chartStr.split("\n");

  switch (action.type) {
    case MermaidActionType.GANTT_ADD_TASK: {
      const {
        label,
        section,
        status,
        id,
        start,
        end,
        isCrit,
        isMilestone,
        isDone,
      } = action.payload;
      const tags = [];
      if (isCrit) tags.push(GanttTaskStatus.CRIT);
      if (isMilestone) tags.push(GanttTaskStatus.MILESTONE);
      if (isDone) tags.push(GanttTaskStatus.DONE);
      if (status) tags.push(status);

      const taskParts = [];
      if (tags.length > 0) taskParts.push(tags.join(", "));
      if (id) taskParts.push(id);
      if (start) taskParts.push(start);
      if (end) taskParts.push(end);

      const newLine = `    ${label} : ${taskParts.join(", ")}`;

      if (section) {
        const sectionIndex = lines.findIndex((l) =>
          l.trim().toLowerCase().startsWith(`section ${section.toLowerCase()}`),
        );
        if (sectionIndex !== -1) {
          // Info: (20260708 - Julian) 找到該 section 的結尾（下一個 section 或結束）
          let insertIndex = sectionIndex + 1;
          while (
            insertIndex < lines.length &&
            !lines[insertIndex].trim().toLowerCase().startsWith("section")
          ) {
            insertIndex++;
          }
          lines.splice(insertIndex, 0, newLine);
          return lines.join("\n");
        }
      }
      lines.push(newLine);
      break;
    }

    case MermaidActionType.GANTT_EDIT_TASK: {
      const { taskLabel, taskId, label, status, id, start, end } =
        action.payload;
      const index = lines.findIndex((l) => {
        const clean = l.trim();
        if (!clean.includes(":")) return false;
        const currentLabel = clean.split(":")[0].trim();
        return (
          currentLabel === taskLabel || (!!taskId && clean.includes(taskId))
        );
      });

      if (index !== -1) {
        const taskParts = [];
        if (status) taskParts.push(status);
        if (id) taskParts.push(id);
        if (start) taskParts.push(start);
        if (end) taskParts.push(end);
        lines[index] = `    ${label} : ${taskParts.join(", ")}`;
      }
      break;
    }

    case MermaidActionType.GANTT_DELETE_TASK: {
      const { taskLabel, taskId } = action.payload;
      const index = lines.findIndex((l) => {
        const clean = l.trim();
        if (!clean.includes(":")) return false;
        const currentLabel = clean.split(":")[0].trim();
        return (
          currentLabel === taskLabel || (!!taskId && clean.includes(taskId))
        );
      });

      if (index !== -1) {
        lines.splice(index, 1);
      }
      break;
    }

    case MermaidActionType.GANTT_SWAP_TASK: {
      const { taskLabel1, taskId1, taskLabel2, taskId2 } = action.payload;
      const index1 = lines.findIndex((l) => {
        const clean = l.trim();
        if (!clean.includes(":")) return false;
        const currentLabel = clean.split(":")[0].trim();
        return (
          currentLabel === taskLabel1 || (!!taskId1 && clean.includes(taskId1))
        );
      });
      const index2 = lines.findIndex((l) => {
        const clean = l.trim();
        if (!clean.includes(":")) return false;
        const currentLabel = clean.split(":")[0].trim();
        return (
          currentLabel === taskLabel2 || (!!taskId2 && clean.includes(taskId2))
        );
      });

      if (index1 !== -1 && index2 !== -1) {
        const temp = lines[index1];
        lines[index1] = lines[index2];
        lines[index2] = temp;
      }
      break;
    }
  }

  return lines.join("\n");
};

/**
 * Info: (20260708 - Julian) 應用結構化編輯動作到圓餅圖
 */
export const applyPieAction = (
  chartStr: string,
  action: IChartAction,
): string => {
  const lines = chartStr.split("\n");

  switch (action.type) {
    case MermaidActionType.PIE_ADD_ITEM: {
      const { label, value } = action.payload;
      lines.push(`    "${label}" : ${value}`);
      break;
    }
    case MermaidActionType.PIE_EDIT_ITEM: {
      const { oldLabel, newLabel, newValue } = action.payload;
      const index = lines.findIndex((l) => l.trim().includes(`"${oldLabel}"`));
      if (index !== -1) {
        lines[index] = `    "${newLabel}" : ${newValue}`;
      }
      break;
    }
    case MermaidActionType.PIE_DELETE_ITEM: {
      const { label } = action.payload;
      const index = lines.findIndex((l) => l.trim().includes(`"${label}"`));
      if (index !== -1) {
        lines.splice(index, 1);
      }
      break;
    }
  }

  return lines.join("\n");
};

/**
 * Info: (20260708 - Julian) 應用結構化編輯動作到流程圖
 */
export const applyFlowchartAction = (
  chartStr: string,
  action: IChartAction,
): string => {
  const lines = chartStr.split("\n");

  switch (action.type) {
    case MermaidActionType.FLOWCHART_ADD_NODE: {
      const { id, label, fromId, toId, connText } = action.payload;
      lines.push(`    ${id}["${label}"]`);
      if (fromId) {
        const conn = connText ? ` -- "${connText}" --> ` : " --> ";
        lines.push(`    ${fromId}${conn}${id}`);
      }
      if (toId) {
        const conn = connText ? ` -- "${connText}" --> ` : " --> ";
        lines.push(`    ${id}${conn}${toId}`);
      }
      break;
    }
    case MermaidActionType.FLOWCHART_EDIT_NODE: {
      const { id, label } = action.payload;
      // Info: (20260708 - Julian) 尋找包含 id[Label] 或 id(Label) 或 id{Label} 格式的行
      const index = lines.findIndex((l) =>
        new RegExp(`${id}\\s*(?:\\[|\\(|\\{)`).test(l),
      );
      if (index !== -1) {
        // Info: (20260708 - Julian) 替換括號內的內容
        lines[index] = lines[index].replace(
          /(\[|\(|\{).*?(\]|\)|\})/,
          `$1"${label}"$2`,
        );
      }
      break;
    }
    case MermaidActionType.FLOWCHART_ADD_CONNECTION: {
      const { fromId, toId, connType, connLabel } = action.payload;
      const typeStr = connType || "-->";
      // Info: (20260708 - Julian) Mermaid 語法中 A -->|Label| B 或 A -- Label --> B
      // Info: (20260708 - Julian) 這裡簡化處理
      const finalConn = connLabel
        ? `    ${fromId} ${typeStr.replace(">", "")}|${connLabel}| ${toId}`
        : `    ${fromId} ${typeStr} ${toId}`;
      lines.push(finalConn);
      break;
    }
    case MermaidActionType.FLOWCHART_CHANGE_DIRECTION: {
      const { direction } = action.payload;
      // Info: (20260708 - Julian) 尋找 flowchart TD / graph LR 行並替換
      const index = lines.findIndex((l) =>
        /^(flowchart|graph)\s+/i.test(l.trim()),
      );
      if (index !== -1) {
        lines[index] = lines[index].replace(
          /(flowchart|graph)\s+\w+/i,
          `$1 ${direction}`,
        );
      }
      break;
    }
  }

  return lines.join("\n");
};

/**
 * Info: (20260709 - Julian)
 * 解析 [a, b, "c d"] 形式的數列
 */
const parseBracketArray = (str: string): string[] => {
  const match = str.match(/\[(.*)\]/);
  if (!match) return [];
  const content = match[1];
  const items: string[] = [];
  let current = "";
  let insideQuotes = false;
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      items.push(current.trim().replace(/^"|"$/g, ""));
      current = "";
    } else {
      current += char;
    }
  }
  if (current) {
    items.push(current.trim().replace(/^"|"$/g, ""));
  }
  return items;
};

/**
 * Info: (20260709 - Julian)
 * 解析 series 名稱與數值 array
 */
const parseXYChartSeries = (
  str: string,
): { seriesName: string; data: number[] } => {
  const titleMatch = str.match(/^"([^"]+)"/);

  const series = {
    seriesName: titleMatch ? titleMatch[1] : "",
    data: parseBracketArray(str)
      .map((v) => parseFloat(v))
      .filter((n) => !isNaN(n)),
  };
  return series;
};

/**
 * Info: (20260709 - Julian)
 * 解析 x-axis 或 y-axis 行
 */
const parseAxisLine = (line: string, isXAxis: boolean) => {
  const prefixRegex = isXAxis ? /^x-axis\s+/i : /^y-axis\s+/i;
  const clean = line.replace(prefixRegex, "").trim();

  if (clean.startsWith("[")) {
    return { categories: parseBracketArray(clean) };
  }

  let title = "";
  let min: number | undefined;
  let max: number | undefined;

  let rest = clean;
  const titleMatch = clean.match(/^"([^"]+)"/);
  if (titleMatch) {
    title = titleMatch[1];
    rest = clean.slice(titleMatch[0].length).trim();
  } else if (!clean.includes("-->") && !/^\d/.test(clean)) {
    title = clean;
    rest = "";
  }

  const rangeMatch = rest.match(/(-?\d+(?:\.\d+)?)\s*-->\s*(-?\d+(?:\.\d+)?)/);
  if (rangeMatch) {
    min = parseFloat(rangeMatch[1]);
    max = parseFloat(rangeMatch[2]);
  }

  return { title, min, max };
};

/**
 * Info: (20260709 - Julian)
 * 解析 XY Chart 內容
 */
export const parseXYChartData = (chartStr: string): IXYChartData | null => {
  if (!chartStr || typeof chartStr !== "string") return null;

  const lines = chartStr.split("\n");
  const isXYChart = lines.some((l) => /^\s*xychart/i.test(l));
  if (!isXYChart) return null;

  const title = getChartTitle(chartStr);
  let xAxis: IXYChartData["xAxis"] = {};
  let yAxis: IXYChartData["yAxis"] = {};
  const series: IXYChartSeries[] = [];

  lines.forEach((line, index) => {
    const clean = line.trim();
    if (!clean || clean.startsWith("%%")) return;

    if (/^x-axis\s+/i.test(clean)) {
      xAxis = parseAxisLine(clean, true);
    } else if (/^y-axis\s+/i.test(clean)) {
      yAxis = parseAxisLine(clean, false);
    } else if (/^bar\s+/i.test(clean)) {
      const data = parseXYChartSeries(clean);
      series.push({
        ...data,
        type: XYChartDataType.BAR,
        lineIndex: index,
      });
    } else if (/^line\s+/i.test(clean)) {
      const data = parseXYChartSeries(clean);
      series.push({
        ...data,
        type: XYChartDataType.LINE,
        lineIndex: index,
      });
    }
  });

  return {
    title,
    xAxis,
    yAxis,
    series,
  };
};

/**
 * Info: (20260709 - Julian) 應用結構化編輯動作到 XY 圖表
 */
export const applyXYChartAction = (
  chartStr: string,
  action: IChartAction,
): string => {
  const lines = chartStr.split("\n");

  switch (action.type) {
    case MermaidActionType.XYCHART_ADD_SERIES: {
      const { type, data, seriesName } = action.payload;

      const seriesNameStr = seriesName ? `"${seriesName}" ` : "";

      const newLine = `    ${type} ${seriesNameStr}[${data.join(", ")}]`;
      // Info: (20260709 - Julian) 插入到最後面，避免影響原本的語法
      lines.push(newLine);
      return lines.join("\n");
    }

    case MermaidActionType.XYCHART_CHANGE_X_AXIS: {
      const { title, categories, min, max } = action.payload;
      const index = lines.findIndex((l) => /^\s*x-axis\s+/i.test(l));

      // Construct X-axis line
      let newLine = "";
      if (categories && categories.length > 0) {
        const formattedCats = categories.map((cat) => {
          const trimmed = cat.trim();
          const trimmedNum = Number(trimmed);
          return isNaN(trimmedNum) ? `"${trimmed}"` : trimmedNum;
        });
        newLine = `    x-axis [${formattedCats.join(", ")}]`;
      } else if (min !== undefined && max !== undefined) {
        const titleStr = title ? `"${title}" ` : "";
        newLine = `    x-axis ${titleStr}${min} --> ${max}`;
      } else if (title) {
        newLine = `    x-axis "${title}"`;
      }

      if (newLine) {
        if (index !== -1) {
          lines[index] = newLine;
        } else {
          let insertIndex = lines.findIndex((l) => /^\s*xychart/i.test(l));
          if (insertIndex !== -1) {
            if (
              insertIndex + 1 < lines.length &&
              /^\s*title/i.test(lines[insertIndex + 1])
            ) {
              insertIndex++;
            }
            lines.splice(insertIndex + 1, 0, newLine);
          } else {
            lines.push(newLine);
          }
        }
      }
      break;
    }

    case MermaidActionType.XYCHART_CHANGE_Y_AXIS: {
      const { title, min, max } = action.payload;
      const index = lines.findIndex((l) => /^\s*y-axis\s+/i.test(l));

      let newLine = "";
      const titleStr = title ? `"${title}"` : "";
      if (min !== undefined && max !== undefined) {
        newLine = `    y-axis ${titleStr ? titleStr + " " : ""}${min} --> ${max}`;
      } else if (titleStr) {
        newLine = `    y-axis ${titleStr}`;
      }

      if (newLine) {
        if (index !== -1) {
          lines[index] = newLine;
        } else {
          let insertIndex = lines.findIndex((l) => /^\s*x-axis/i.test(l));
          if (insertIndex === -1) {
            insertIndex = lines.findIndex((l) => /^\s*xychart/i.test(l));
            if (
              insertIndex !== -1 &&
              insertIndex + 1 < lines.length &&
              /^\s*title/i.test(lines[insertIndex + 1])
            ) {
              insertIndex++;
            }
          }
          if (insertIndex !== -1) {
            lines.splice(insertIndex + 1, 0, newLine);
          } else {
            lines.push(newLine);
          }
        }
      }
      break;
    }

    case MermaidActionType.XYCHART_CHANGE_LINE_SERIES:
    case MermaidActionType.XYCHART_CHANGE_BAR_SERIES: {
      const isLine =
        action.type === MermaidActionType.XYCHART_CHANGE_LINE_SERIES;
      const { seriesIndex, data, type, seriesName } = action.payload;
      const targetRegex = isLine ? /^\s*line\s+/i : /^\s*bar\s+/i;

      const seriesIndices: number[] = [];
      lines.forEach((l, idx) => {
        if (targetRegex.test(l)) {
          seriesIndices.push(idx);
        }
      });

      const seriesNameStr = seriesName ? `"${seriesName}" ` : "";
      const newLine = `    ${type} ${seriesNameStr}[${data.join(", ")}]`;

      if (seriesIndex < seriesIndices.length) {
        const lineIdx = seriesIndices[seriesIndex];
        lines[lineIdx] = newLine;
      } else {
        lines.push(newLine);
      }
      break;
    }

    case MermaidActionType.XYCHART_DELETE_SERIES: {
      const { seriesIndex } = action.payload;
      const index = lines.findIndex((l) =>
        l.trim().includes(`"${seriesIndex}"`),
      );
      if (index !== -1) {
        lines.splice(index, 1);
      }
      break;
    }
  }

  return lines.join("\n");
};

/**
 * Info: (20260713 - Julian)
 * 解析單行 Sankey CSV（支援 RFC 4180 引號與逗號）
 */
const parseSankeyCsvLine = (line: string): string[] => {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
};

/**
 * Info: (20260713 - Julian)
 * 判斷是否為 Sankey CSV 標題列
 */
const isSankeyHeaderRow = (fields: string[]): boolean => {
  if (fields.length !== 3) return false;
  const normalized = fields.map((f) => f.toLowerCase());
  return (
    normalized[0] === "source" &&
    normalized[1] === "target" &&
    normalized[2] === "value"
  );
};

/**
 * Info: (20260713 - Julian)
 * 判斷是否為桑基圖
 */
export const isSankeyChart = (chartStr: string): boolean => {
  if (!chartStr || typeof chartStr !== "string") return false;
  const lines = chartStr.split("\n");
  for (const line of lines) {
    const cleanLine = line.trim().toLowerCase();
    if (!cleanLine || cleanLine.startsWith("%%")) {
      continue;
    }
    return cleanLine.startsWith("sankey");
  }
  return false;
};

/**
 * Info: (20260713 - Julian)
 * 解析桑基圖的所有連結
 */
export const parseSankeyLinks = (chartStr: string): ISankeyLink[] => {
  if (!chartStr || typeof chartStr !== "string") return [];

  const links: ISankeyLink[] = [];
  const lines = chartStr.split("\n");

  lines.forEach((line, index) => {
    const clean = line.trim();
    if (!clean || clean.startsWith("%%") || /^sankey(-beta)?$/i.test(clean)) {
      return;
    }

    const fields = parseSankeyCsvLine(clean);
    if (fields.length !== 3 || isSankeyHeaderRow(fields)) {
      return;
    }

    const value = parseFloat(fields[2]);
    if (isNaN(value)) {
      return;
    }

    links.push({
      source: fields[0],
      target: fields[1],
      value,
      lineIndex: index,
    });
  });

  return links;
};

/**
 * Info: (20260713 - Julian)
 * 解析桑基圖內容
 */
export const parseSankeyData = (chartStr: string): ISankeyData | null => {
  if (!chartStr || typeof chartStr !== "string") return null;
  if (!isSankeyChart(chartStr)) return null;

  const links = parseSankeyLinks(chartStr);
  if (links.length === 0) return null;

  const nodeSet = new Set<string>();
  links.forEach(({ source, target }) => {
    nodeSet.add(source);
    nodeSet.add(target);
  });

  return {
    links,
    nodes: Array.from(nodeSet),
  };
};
