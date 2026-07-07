import { MermaidChartType } from "@/constants/mermaid_chart";

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
 * 嘗試從 mermaid 設定區塊中提取圓餅圖的顏色定義
 */
export const parsePieColors = (
  chartStr: string,
  defaultColors: string[],
): string[] => {
  const colors: string[] = [];
  for (let i = 0; i < 20; i++) {
    colors.push(defaultColors[i % defaultColors.length]);
  }

  const initMatch = chartStr.match(/%%\{init:\s*(\{[\s\S]*?\})\s*\}%%/);
  if (initMatch) {
    const configStr = initMatch[1];
    try {
      const config = JSON.parse(configStr);
      const themeVars = config.themeVariables;
      if (themeVars) {
        Object.keys(themeVars).forEach((key) => {
          const match = key.match(/^pie(\d+)$/);
          if (match) {
            const index = parseInt(match[1], 10) - 1;
            if (index >= 0 && index < colors.length) {
              colors[index] = themeVars[key];
            }
          }
        });
        return colors;
      }
    } catch {
      // Info: (20260624 - Julian) 忽略並使用 regex 兜底
    }

    // Info: (20260624 - Julian) 備案：使用 regex 解析顏色
    const colorMatches = configStr.matchAll(
      /['"]?pie(\d+)['"]?\s*:\s*['"](#[a-fA-F0-9]{3,8})['"]/gi,
    );
    for (const match of colorMatches) {
      const index = parseInt(match[1], 10) - 1;
      if (index >= 0 && index < colors.length) {
        colors[index] = match[2];
      }
    }
  }
  return colors;
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
    if (cleanLine.startsWith("sequencediagram"))
      return MermaidChartType.SEQUENCE;
    break;
  }
  return MermaidChartType.UNKNOWN;
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
