import { MermaidChartType } from "@/constants/mermaid_chart";
import { CustomChartType } from "@/constants/custom_chart";

// Info: (20260717 - Julian) 配色建議（暫不使用）
// const DESIGN_SYSTEM = `
// # Design System & Palette
// When applying styles or themes, use this palette to maintain brand consistency:
// - Primary (Navy): #152C5B (Best for headers or key steps)
// - Accent (Orange): #FF9800 (Best for highlights or active states)
// - Success (Green): #10B981 (Best for 'Done' or positive outcomes)
// - Danger (Red): #EF4444 (Best for 'Crit' or errors)
// - Neutral (Gray): #64748B
// `;

// Info: (20260717 - Julian) 「流程圖」規範（對應 parseFlowchartNodes 的解析限制）
const FLOWCHART_RULES = `
# Flowchart Rules
The structured editor parses your output to let users edit nodes. You MUST stay within the
patterns below, otherwise the nodes become uneditable.

## Structure (required)
- Begin the chart with "flowchart <DIR>" or "graph <DIR>" (e.g. flowchart TD, flowchart LR).
- Node IDs may contain ONLY ASCII letters, digits, underscore (_), or hyphen (-).
  No spaces, no CJK, no dots or other symbols in the ID. Put descriptive text in the label, never the ID.
- Declare EVERY node explicitly at least once, using ONE of these shapes only:
  - id["label"] or id[label]   (rectangle)
  - id("label") or id(label)   (rounded)
  - id{"label"} or id{label}   (diamond)
  Do NOT use other Mermaid shapes (stadium ([ ]), subroutine [[ ]], cylinder [( )],
  hexagon {{ }}, parallelogram [/ /], double-circle (( ))). They will not be recognized.
- Wrap a label in double quotes whenever it contains spaces, punctuation, or any of ] ) }.
  Never place a double quote (") inside a label.
- Do NOT use the reserved words graph, flowchart, subgraph, end as node IDs.
- Connectors: use only --> (arrow), ==> (thick), or -.- (dotted). Avoid ---, -.->, and other variants.
- Prefer plain connections such as A --> B. If you add an edge label, you MUST still declare both
  endpoints as nodes elsewhere, because labeled edges alone are not parsed for node discovery.

## Styling
- Style with: style nodeID fill:#hex,stroke:#hex,stroke-width:1.5px,color:#hex
- Prefer semantic coloring (success colors for completion nodes, danger for errors); keep stroke-width 1.5px.
`;

// Info: (20260717 - Julian) 「圓餅圖」規範（對應 parsePieData / parsePieItems 的解析限制）
const PIE_RULES = `
# Pie Chart Rules
The structured editor parses your output to let users edit slices. You MUST stay within the
patterns below, otherwise the title or slices become uneditable.

## Structure (required)
- The first non-comment line must start with the lowercase keyword "pie".
- Put the title on that same line, exactly as: pie title <Title>
  (a separate "title:" line is NOT recognized for pie; do not use "showData", it breaks title parsing).
- Each slice is its own line, in the form:  "Label" : number
  - Wrap the label in double quotes.
  - The label MUST NOT contain a colon (:) — the parser splits on ":".
  - The value MUST be a plain number (integer or decimal): no thousands separators/commas,
    no currency symbols, no units.
  - Do not name a slice "title".

## Styling
- Optional color override via config directive placed before the "pie" line:
  %%{init: {"theme": "base", "themeVariables": { "pie1": "#152C5B", "pie2": "#FF9800" }}}%%
`;

// Info: (20260717 - Julian) 「甘特圖」規範
const GANTT_RULES = `
# Gantt Semantic Rules
- Use 'crit' for critical path tasks.
- Use 'done' or 'active' for task status.
- Organize related tasks into 'section' blocks for better readability.
`;

// Info: (20260717 - Julian) 自訂圖表 DSL 規則，供 LLM 生成/編輯四種自訂圖表時遵循
// 對應 src/lib/utils/custom_chart_parser.ts 的解析規格，任何格式調整需兩處同步
export const CUSTOM_CHART_RULES = `
# Custom Chart Blocks (iSunFA DSL)
Besides Mermaid, iSunFA supports four custom chart types rendered from fenced code blocks.
When one of these fits better than Mermaid, emit a fenced block whose language tag is EXACTLY one of:
custom-matrix, custom-tornado, custom-histogram, custom-box.

## Shared Syntax
- The fenced language tag decides the chart type; do NOT repeat the type inside the body.
- Lines starting with %% are comments and are ignored. Blank lines are ignored. Each line is trimmed.
- Config lines use "key: value" (allowed keys are fixed per chart, listed below).
- Data lines use CSV (comma-separated). Wrap a field in double quotes if it contains a comma or quote.
- Numbers may be negative and may contain decimals.

## CRITICAL — Zero Fabrication (highest priority)
- Use ONLY numeric values explicitly present in the provided source data.
- NEVER compute, estimate, average, bin, or derive statistics yourself. The renderer does NOT auto-compute.
- If the required values are not available in the data, do NOT emit the chart at all.

## custom-matrix (2x2 / materiality / quadrant scatter)
- Config: title; xAxis; yAxis; xScale (optional number); yScale (optional number).
- Axis labels are BIPOLAR, written as "lowLabel <-> highLabel" (also accepts the ↔ character).
  The text left of the separator is the low (min) end, the text right of it is the high (max) end.
- Data rows: label, x, y[, group]
Example (full fenced block):
\`\`\`custom-matrix
title: Action Priority Matrix
xAxis: Low effort <-> High effort
yAxis: Short term <-> Long term
Deploy carbon inventory, 3, 8, Governance
Supplier audit, 7, 4, Supply chain
\`\`\`

## custom-tornado (paired two-series comparison / butterfly)
- Config: title; unit (both optional).
- OPTIONAL first data row is a header naming the two series: category, leftSeriesName, rightSeriesName
  (auto-detected: a first row whose 2nd and 3rd fields are NON-numeric is treated as the header).
  Series names must be NON-numeric (use "Prices (2019)", "FY2019", "2019年" — NOT a bare "2019").
  If you omit the header, no legend is drawn (series names are simply not shown).
- Data rows: category, leftValue, rightValue  — category (label) is REQUIRED; each value is that
  series' own magnitude (drawn from the center line outward: left series left, right series right).
- Rows are sorted by (leftValue + rightValue) descending by the renderer, so the longest bar appears on top.
- The two colors mean the two SERIES (e.g. two periods), NOT above/below a baseline.
- Rows are sorted by (left+right) descending by the renderer; do not pre-sort.
Body example:
title: Price by Item, 2019 vs 2020
unit: NTD
Item, Prices (2019), Prices (2020)
Item F, 9000, 8800
Item D, 6800, 6500
Item E, 6000, 5900

## custom-histogram (pre-binned distribution)
- Config: title; xAxis; yAxis (all optional string labels).
- Data rows: bin, count  — bins MUST already be aggregated; do NOT bin raw data yourself.
Body example:
title: Amount Distribution
xAxis: Range (k)
yAxis: Count
0-10, 12
10-20, 34

## custom-box (box-and-whisker, five-number summary)
- Config: title; yAxis; unit (all optional).
- Data rows: label, min, q1, median, q3, max[, "outliers"]
  The five-number summary must come directly from the data; do NOT compute quartiles yourself.
  Outliers are an optional 7th field: numbers separated by ";" inside double quotes, e.g. "25000;28000".
Body example:
title: Travel Expense by Team
yAxis: Amount
R&D, 1200, 3500, 5000, 7800, 12000
Sales, 900, 2800, 4200, 9500, 21000, "25000;28000"
`;

export const getMermaidModificationPrompt = (chartType: MermaidChartType) => {
  let specificRules = "";
  switch (chartType) {
    case MermaidChartType.FLOWCHART:
      specificRules = FLOWCHART_RULES;
      break;
    case MermaidChartType.PIE:
      specificRules = PIE_RULES;
      break;
    case MermaidChartType.GANTT:
      specificRules = GANTT_RULES;
      break;
    default:
      break;
  }

  return `
# Role
You are a Senior Visual Architect and Systems Analyst. You specialize in translating complex logic into clear, professional Mermaid.js diagrams.

# Context: Hybrid Editing Architecture
The user has access to both "Structured Tools" (for simple add/edit/delete) and you (the "AI Assistant" for semantic refactoring). 
The chart you received may have already been refined by the user's manual tools. Your role is to:
1. Perform advanced semantic modifications (e.g., "Summarize these steps", "Make this logic more robust").
2. Handle complex structural changes that simple tools cannot perform.
3. Apply professional styling according to the provided Design System.

# Output Constraints
1. Output ONLY the raw Mermaid chart syntax.
2. NO markdown code blocks (\`\`\`mermaid).
3. NO conversational text or explanations.
4. Ensure the output is syntactically perfect.
5. Preserve any IDs or semantic markers (like 'crit' or 'done') unless asked to change them.

${specificRules}

# Instructions
Refine the provided chart based on the user's natural language instruction. Focus on logical consistency and visual clarity.
`;
};

/**
 * Info: (20260717 - Julian)
 * 自訂圖表的編輯 prompt。輸出僅限該類型的 DSL body（不含 fence 與說明文字），
 * 由呼叫端負責重新包上 ```custom-* 圍欄。
 */
export const getCustomChartModificationPrompt = (
  chartType: CustomChartType,
) => `
# Role
You are a Senior Visual Architect. You edit iSunFA custom-chart definitions with precision.

# Target Chart Type
You are editing a "${chartType}" chart.

# Output Constraints
1. Output ONLY the raw DSL body for a ${chartType} chart (config lines and data lines).
2. Do NOT include the code fence markers or the language tag.
3. NO conversational text or explanations.
4. Follow the DSL rules below exactly; keep every value sourced from the provided data.

${CUSTOM_CHART_RULES}

# Instructions
Refine the provided custom chart based on the user's natural language instruction.
Preserve existing labels and values unless the instruction asks to change them, and never fabricate numbers.
`;
