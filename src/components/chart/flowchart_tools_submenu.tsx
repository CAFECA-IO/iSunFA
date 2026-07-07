"use client";

import React, { useState, FC } from "react";
import {
  CirclePlus,
  Paintbrush,
  Pencil,
  RefreshCcw,
  SplinePointer,
  LucideIcon,
} from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import {
  MERMAID_INPUT_STYLE,
  MERMAID_LABEL_STYLE,
  MERMAID_SUBMIT_BUTTON_STYLE,
} from "@/constants/mermaid_chart";

// ==========================================
// Info: (20260629 - Julian) 定義與靜態映射表
// ==========================================

export enum NodeColor {
  DEFAULT = "Default（預設灰）",
  NAVY = "Navy (海軍藍)",
  ORANGE = "Orange (高光橘)",
  RED = "Red (警告紅)",
  GREEN = "Green (成功綠)",
  PURPLE = "Purple (質感紫)",
}

export enum FlowchartTools {
  ADD_NODE = "addNode",
  EDIT_NODE = "editNode",
  ADD_CONNECTION = "addConnection",
  CHANGE_COLOR = "changeColor",
  CHANGE_DIRECTION = "changeDirection",
}

interface IToolItem {
  tool: FlowchartTools;
  icon: LucideIcon;
}

const FLOWCHART_TOOLS: IToolItem[] = [
  {
    tool: FlowchartTools.ADD_NODE,
    icon: CirclePlus,
  },
  {
    tool: FlowchartTools.EDIT_NODE,
    icon: Pencil,
  },
  {
    tool: FlowchartTools.ADD_CONNECTION,
    icon: SplinePointer,
  },
  {
    tool: FlowchartTools.CHANGE_COLOR,
    icon: Paintbrush,
  },
  {
    tool: FlowchartTools.CHANGE_DIRECTION,
    icon: RefreshCcw,
  },
];

const FLOWCHART_TOOL_TRANSLATION_KEYS: Record<FlowchartTools, string> = {
  [FlowchartTools.ADD_NODE]: "chart.mermaid.ai_editor.flowchart.add_node",
  [FlowchartTools.EDIT_NODE]: "chart.mermaid.ai_editor.flowchart.edit_node",
  [FlowchartTools.ADD_CONNECTION]: "chart.mermaid.ai_editor.flowchart.add_conn",
  [FlowchartTools.CHANGE_COLOR]:
    "chart.mermaid.ai_editor.flowchart.change_color",
  [FlowchartTools.CHANGE_DIRECTION]:
    "chart.mermaid.ai_editor.flowchart.change_dir",
};

const FLOWCHART_COLOR_TRANSLATION_KEYS: Record<NodeColor, string> = {
  [NodeColor.DEFAULT]: "chart.mermaid.ai_editor.colors.default",
  [NodeColor.NAVY]: "chart.mermaid.ai_editor.colors.navy",
  [NodeColor.ORANGE]: "chart.mermaid.ai_editor.colors.orange",
  [NodeColor.RED]: "chart.mermaid.ai_editor.colors.red",
  [NodeColor.GREEN]: "chart.mermaid.ai_editor.colors.green",
  [NodeColor.PURPLE]: "chart.mermaid.ai_editor.colors.purple",
};

const DIRECTION_NAMES: Record<string, string> = {
  TD: "由上至下 (TD)",
  LR: "由左至右 (LR)",
  BT: "由下至上 (BT)",
  RL: "由右至左 (RL)",
};

const INSTRUCTION_TEMPLATES = {
  ADD_NODE: {
    render: (
      id: string,
      label: string,
      fromId?: string,
      toId?: string,
      connText?: string,
    ) => {
      let inst = `在圖表中新增一個節點，ID 為 "${id}"，文字為 "${label}"`;
      if (fromId) inst += `，從現有節點 "${fromId}" 連線過來`;
      if (toId) inst += `，並連線到現有節點 "${toId}"`;
      if (connText) inst += `，連線上的文字為 "${connText}"`;
      return inst;
    },
  },
  EDIT_NODE: {
    match: (line: string, targetNodeId: string) =>
      line.includes(`將節點 "${targetNodeId}" 的文字改為`),
    render: (targetNodeId: string, newNodeText: string) =>
      `將節點 "${targetNodeId}" 的文字改為 "${newNodeText}"`,
  },
  ADD_CONNECTION: {
    match: (line: string, connFromId: string, connToId: string) =>
      line.includes(`從節點 "${connFromId}" 到 "${connToId}"`),
    render: (
      connFromId: string,
      connToId: string,
      connType: string,
      connLabel?: string,
    ) => {
      let inst = `建立一條從節點 "${connFromId}" 到 "${connToId}" 的 "${connType}" 連線`;
      if (connLabel) inst += `，連線上的文字為 "${connLabel}"`;
      return inst;
    },
  },
  CHANGE_COLOR: {
    match: (line: string, colorNodeId: string) =>
      line.includes(`將節點 "${colorNodeId}" 的背景/邊框風格調整為`),
    render: (colorNodeId: string, colorStyle: string) =>
      `將節點 "${colorNodeId}" 的背景/邊框風格調整為 "${colorStyle}"`,
  },
  CHANGE_DIRECTION: {
    match: (line: string) => line.includes("將圖表整體方向變更為"),
    render: (flowDirection: string) =>
      `將圖表整體方向變更為 ${DIRECTION_NAMES[flowDirection] || flowDirection}`,
  },
};

// ==========================================
// Info: (20260629 - Julian) 將每個工具拆分成子元件(sub-panel)
// ==========================================

interface IBasePanelProps {
  parsedNodes: { id: string; label: string }[];
  onInsert: (text: string) => void;
  onInsertWithFilter: (
    text: string,
    filterFn: (line: string) => boolean,
  ) => void;
}

// Info: (20260629 - Julian) 「新增節點」面板
const AddNodePanel: FC<IBasePanelProps> = ({ parsedNodes, onInsert }) => {
  const { t } = useTranslation();
  const [newNodeId, setNewNodeId] = useState<string>("");
  const [newNodeLabel, setNewNodeLabel] = useState<string>("");
  const [fromNodeId, setFromNodeId] = useState<string>("");
  const [toNodeId, setToNodeId] = useState<string>("");
  const [connText, setConnText] = useState<string>("");

  const handleIdChange = (val: string) => {
    // Info: (20260629 - Julian) 限制只能輸入英數、底線、連字號以避免 Mermaid 語法崩潰
    setNewNodeId(val.replace(/[^a-zA-Z0-9_-]/g, ""));
  };

  const handleSubmit = () => {
    if (!newNodeLabel) return;
    const cleanId =
      newNodeId.trim() || `node_${Math.random().toString(36).substring(2, 6)}`;
    const inst = INSTRUCTION_TEMPLATES.ADD_NODE.render(
      cleanId,
      newNodeLabel,
      fromNodeId || undefined,
      toNodeId || undefined,
      connText || undefined,
    );
    onInsert(inst);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <CirclePlus size={14} />
        <p>{t("chart.mermaid.ai_editor.flowchart.add_node_title")}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="new-node-id" className={MERMAID_LABEL_STYLE}>
            {t("chart.mermaid.ai_editor.flowchart.node_id_label")}
          </label>
          <input
            id="new-node-id"
            type="text"
            value={newNodeId}
            onChange={(e) => handleIdChange(e.target.value)}
            className={MERMAID_INPUT_STYLE}
            placeholder={
              t("chart.mermaid.ai_editor.flowchart.node_id_placeholder")!
            }
          />
        </div>
        <div>
          <label htmlFor="new-node-label" className={MERMAID_LABEL_STYLE}>
            {t("chart.mermaid.ai_editor.flowchart.node_name_label")}
            <span className="ml-0.5 text-red-500">*</span>
          </label>
          <input
            id="new-node-label"
            type="text"
            value={newNodeLabel}
            onChange={(e) => setNewNodeLabel(e.target.value)}
            className={MERMAID_INPUT_STYLE}
            placeholder={
              t("chart.mermaid.ai_editor.flowchart.node_name_placeholder")!
            }
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="from-node-id" className={MERMAID_LABEL_STYLE}>
            {t("chart.mermaid.ai_editor.flowchart.from_label")}
          </label>
          <select
            id="from-node-id"
            value={fromNodeId}
            onChange={(e) => setFromNodeId(e.target.value)}
            className={MERMAID_INPUT_STYLE}
          >
            <option value="">(無)</option>
            {parsedNodes.map((n) => (
              <option key={`from-${n.id}`} value={n.id}>
                {n.label} ({n.id})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="to-node-id" className={MERMAID_LABEL_STYLE}>
            {t("chart.mermaid.ai_editor.flowchart.to_label")}
          </label>
          <select
            id="to-node-id"
            value={toNodeId}
            onChange={(e) => setToNodeId(e.target.value)}
            className={MERMAID_INPUT_STYLE}
          >
            <option value="">(無)</option>
            {parsedNodes.map((n) => (
              <option key={`to-${n.id}`} value={n.id}>
                {n.label} ({n.id})
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="conn-text" className={MERMAID_LABEL_STYLE}>
          {t("chart.mermaid.ai_editor.flowchart.conn_text_label")}
        </label>
        <input
          id="conn-text"
          type="text"
          value={connText}
          onChange={(e) => setConnText(e.target.value)}
          className={MERMAID_INPUT_STYLE}
          placeholder={
            t("chart.mermaid.ai_editor.flowchart.conn_text_placeholder")!
          }
        />
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!newNodeLabel}
        className={MERMAID_SUBMIT_BUTTON_STYLE}
      >
        {t("chart.mermaid.ai_editor.flowchart.insert_instruction")}
      </button>
    </div>
  );
};

// Info: (20260629 - Julian) 「變更節點文字」面板
const EditNodePanel: FC<IBasePanelProps> = ({
  parsedNodes,
  onInsertWithFilter,
}) => {
  const { t } = useTranslation();
  const [targetNodeId, setTargetNodeId] = useState<string>("");
  const [newNodeText, setNewNodeText] = useState<string>("");

  const handleSubmit = () => {
    if (!targetNodeId || !newNodeText) return;
    const inst = INSTRUCTION_TEMPLATES.EDIT_NODE.render(
      targetNodeId,
      newNodeText,
    );
    onInsertWithFilter(inst, (line) =>
      INSTRUCTION_TEMPLATES.EDIT_NODE.match(line, targetNodeId),
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <Pencil size={14} />
        <p>{t("chart.mermaid.ai_editor.flowchart.edit_node_title")}</p>
      </div>
      <div>
        <label htmlFor="target-node-id" className={MERMAID_LABEL_STYLE}>
          {t("chart.mermaid.ai_editor.flowchart.select_node_placeholder")}
          <span className="ml-0.5 text-red-500">*</span>
        </label>
        <select
          id="target-node-id"
          value={targetNodeId}
          onChange={(e) => setTargetNodeId(e.target.value)}
          className={MERMAID_INPUT_STYLE}
        >
          <option value="">
            {t("chart.mermaid.ai_editor.flowchart.select_node_placeholder")}
          </option>
          {parsedNodes.map((n) => (
            <option key={`edit-${n.id}`} value={n.id}>
              {n.label} ({n.id})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="new-node-text" className={MERMAID_LABEL_STYLE}>
          {t("chart.mermaid.ai_editor.flowchart.new_text_label")}
          <span className="ml-0.5 text-red-500">*</span>
        </label>
        <input
          id="new-node-text"
          type="text"
          value={newNodeText}
          onChange={(e) => setNewNodeText(e.target.value)}
          className={MERMAID_INPUT_STYLE}
          placeholder={
            t("chart.mermaid.ai_editor.flowchart.new_text_placeholder")!
          }
        />
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!targetNodeId || !newNodeText}
        className={MERMAID_SUBMIT_BUTTON_STYLE}
      >
        {t("chart.mermaid.ai_editor.flowchart.insert_instruction")}
      </button>
    </div>
  );
};

// Info: (20260629 - Julian) 「變更連線」面板
const AddConnectionPanel: FC<IBasePanelProps> = ({
  parsedNodes,
  onInsertWithFilter,
}) => {
  const { t } = useTranslation();
  const [connFromId, setConnFromId] = useState<string>("");
  const [connToId, setConnToId] = useState<string>("");
  const [connType, setConnType] = useState<string>("-->");
  const [connLabel, setConnLabel] = useState<string>("");

  const handleSubmit = () => {
    if (!connFromId || !connToId) return;
    const inst = INSTRUCTION_TEMPLATES.ADD_CONNECTION.render(
      connFromId,
      connToId,
      connType,
      connLabel || undefined,
    );
    onInsertWithFilter(inst, (line) =>
      INSTRUCTION_TEMPLATES.ADD_CONNECTION.match(line, connFromId, connToId),
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <SplinePointer size={14} />
        <p>{t("chart.mermaid.ai_editor.flowchart.add_conn_title")}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="connFromId" className={MERMAID_LABEL_STYLE}>
            {t("chart.mermaid.ai_editor.flowchart.select_from_placeholder")}
            <span className="ml-0.5 text-red-500">*</span>
          </label>
          <select
            id="connFromId"
            value={connFromId}
            onChange={(e) => setConnFromId(e.target.value)}
            className={MERMAID_INPUT_STYLE}
          >
            <option value="">
              {t("chart.mermaid.ai_editor.flowchart.select_from_placeholder")}
            </option>
            {parsedNodes.map((n) => (
              <option key={`conn-from-${n.id}`} value={n.id}>
                {n.label} ({n.id})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="connToId" className={MERMAID_LABEL_STYLE}>
            {t("chart.mermaid.ai_editor.flowchart.select_to_placeholder")}
            <span className="ml-0.5 text-red-500">*</span>
          </label>
          <select
            id="connToId"
            value={connToId}
            onChange={(e) => setConnToId(e.target.value)}
            className={MERMAID_INPUT_STYLE}
          >
            <option value="">
              {t("chart.mermaid.ai_editor.flowchart.select_to_placeholder")}
            </option>
            {parsedNodes.map((n) => (
              <option key={`conn-to-${n.id}`} value={n.id}>
                {n.label} ({n.id})
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="connType" className={MERMAID_LABEL_STYLE}>
            {t("chart.mermaid.ai_editor.flowchart.conn_type_label")}
          </label>
          <select
            id="connType"
            value={connType}
            onChange={(e) => setConnType(e.target.value)}
            className={MERMAID_INPUT_STYLE}
          >
            <option value="-->">
              {t("chart.mermaid.ai_editor.flowchart.conn_type_arrow")}
            </option>
            <option value="==>">
              {t("chart.mermaid.ai_editor.flowchart.conn_type_bold")}
            </option>
            <option value="-.->">
              {t("chart.mermaid.ai_editor.flowchart.conn_type_dotted")}
            </option>
            <option value="---">
              {t("chart.mermaid.ai_editor.flowchart.conn_type_line")}
            </option>
          </select>
        </div>
        <div>
          <label htmlFor="connLabel" className={MERMAID_LABEL_STYLE}>
            {t("chart.mermaid.ai_editor.flowchart.conn_text_label")}
          </label>
          <input
            id="connLabel"
            type="text"
            value={connLabel}
            onChange={(e) => setConnLabel(e.target.value)}
            className={MERMAID_INPUT_STYLE}
            placeholder={
              t("chart.mermaid.ai_editor.flowchart.conn_text_placeholder")!
            }
          />
        </div>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!connFromId || !connToId}
        className={MERMAID_SUBMIT_BUTTON_STYLE}
      >
        {t("chart.mermaid.ai_editor.flowchart.insert_instruction")}
      </button>
    </div>
  );
};

// Info: (20260629 - Julian) 「變更節點顏色」面板
const ChangeColorPanel: FC<IBasePanelProps> = ({
  parsedNodes,
  onInsertWithFilter,
}) => {
  const { t } = useTranslation();
  const [colorNodeId, setColorNodeId] = useState<string>("");
  const [colorStyle, setColorStyle] = useState<NodeColor>(NodeColor.DEFAULT);

  const handleSubmit = () => {
    if (!colorNodeId || !colorStyle) return;
    const inst = INSTRUCTION_TEMPLATES.CHANGE_COLOR.render(
      colorNodeId,
      colorStyle,
    );
    onInsertWithFilter(inst, (line) =>
      INSTRUCTION_TEMPLATES.CHANGE_COLOR.match(line, colorNodeId),
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <Paintbrush size={14} />
        <p>{t("chart.mermaid.ai_editor.flowchart.change_color_title")}</p>
      </div>
      <div>
        <label htmlFor="colorNodeId" className={MERMAID_LABEL_STYLE}>
          {t("chart.mermaid.ai_editor.flowchart.select_node_placeholder")}
          <span className="ml-0.5 text-red-500">*</span>
        </label>
        <select
          id="colorNodeId"
          value={colorNodeId}
          onChange={(e) => setColorNodeId(e.target.value)}
          className={MERMAID_INPUT_STYLE}
        >
          <option value="">
            {t("chart.mermaid.ai_editor.flowchart.select_node_placeholder")}
          </option>
          {parsedNodes.map((n) => (
            <option key={`color-btn-${n.id}`} value={n.id}>
              {n.label} ({n.id})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="colorStyle" className={MERMAID_LABEL_STYLE}>
          {t("chart.mermaid.ai_editor.flowchart.select_style_label")}
        </label>
        <select
          id="colorStyle"
          value={colorStyle}
          onChange={(e) => setColorStyle(e.target.value as NodeColor)}
          className={MERMAID_INPUT_STYLE}
        >
          {Object.values(NodeColor).map((color) => (
            <option key={color} value={color}>
              {t(FLOWCHART_COLOR_TRANSLATION_KEYS[color])}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!colorNodeId}
        className={MERMAID_SUBMIT_BUTTON_STYLE}
      >
        {t("chart.mermaid.ai_editor.flowchart.insert_instruction")}
      </button>
    </div>
  );
};

// Info: (20260629 - Julian) 「變更方向」面板
const ChangeDirectionPanel: FC<IBasePanelProps> = ({ onInsertWithFilter }) => {
  const { t } = useTranslation();
  const [flowDirection, setFlowDirection] = useState<string>("TD");

  const handleSubmit = () => {
    if (!flowDirection) return;
    const inst = INSTRUCTION_TEMPLATES.CHANGE_DIRECTION.render(flowDirection);
    onInsertWithFilter(inst, (line) =>
      INSTRUCTION_TEMPLATES.CHANGE_DIRECTION.match(line),
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <RefreshCcw size={14} />
        <p>{t("chart.mermaid.ai_editor.flowchart.change_dir_title")}</p>
      </div>
      <div>
        <label htmlFor="flowDirection" className={MERMAID_LABEL_STYLE}>
          {t("chart.mermaid.ai_editor.flowchart.dir_label")}
        </label>
        <select
          id="flowDirection"
          value={flowDirection}
          onChange={(e) => setFlowDirection(e.target.value)}
          className={MERMAID_INPUT_STYLE}
        >
          <option value="TD">
            {t("chart.mermaid.ai_editor.flowchart.dir_td")}
          </option>
          <option value="LR">
            {t("chart.mermaid.ai_editor.flowchart.dir_lr")}
          </option>
          <option value="BT">
            {t("chart.mermaid.ai_editor.flowchart.dir_bt")}
          </option>
          <option value="RL">
            {t("chart.mermaid.ai_editor.flowchart.dir_rl")}
          </option>
        </select>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        className="w-full cursor-pointer rounded-lg bg-blue-600 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-500"
      >
        {t("chart.mermaid.ai_editor.flowchart.insert_instruction")}
      </button>
    </div>
  );
};

// ==========================================
// Info: (20260629 - Julian) 工具面板元件映射表
// ==========================================

const TOOL_PANELS: Record<FlowchartTools, FC<IBasePanelProps>> = {
  [FlowchartTools.ADD_NODE]: AddNodePanel,
  [FlowchartTools.EDIT_NODE]: EditNodePanel,
  [FlowchartTools.ADD_CONNECTION]: AddConnectionPanel,
  [FlowchartTools.CHANGE_COLOR]: ChangeColorPanel,
  [FlowchartTools.CHANGE_DIRECTION]: ChangeDirectionPanel,
};

// ==========================================
// Info: (20260629 - Julian) 主元件
// ==========================================

interface IFlowchartToolsSectionProps {
  selectedTool: string | null;
  setSelectedTool: React.Dispatch<React.SetStateAction<string | null>>;
  parsedNodes: { id: string; label: string }[];
  setAiInstruction: React.Dispatch<React.SetStateAction<string>>;
}

export const FlowchartToolsSection: FC<IFlowchartToolsSectionProps> = ({
  selectedTool,
  setSelectedTool,
  parsedNodes,
  setAiInstruction,
}) => {
  const { t } = useTranslation();

  const handleInsertInstruction = (text: string) => {
    setAiInstruction((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return text;
      return trimmed + "\n" + text;
    });
    setSelectedTool(null);
  };

  const handleInsertWithFilter = (
    text: string,
    filterFn: (line: string) => boolean,
  ) => {
    setAiInstruction((prev) => {
      const lines = prev.split("\n");
      const filteredLines = lines.filter((line) => !filterFn(line));
      const clean = filteredLines.join("\n").trim();
      if (!clean) return text;
      return clean + "\n" + text;
    });
    setSelectedTool(null);
  };

  const isFlowchartToolSelected = Object.values(FlowchartTools).includes(
    selectedTool as FlowchartTools,
  );

  const ActivePanel = isFlowchartToolSelected
    ? TOOL_PANELS[selectedTool as FlowchartTools]
    : null;

  return (
    <>
      {/* Info: (20260629 - Julian) 快捷工具選擇列 */}
      <div className="flex flex-wrap gap-1.5">
        {FLOWCHART_TOOLS.map((item) => {
          const handleClick = () =>
            setSelectedTool(selectedTool === item.tool ? null : item.tool);

          return (
            <button
              key={item.tool}
              type="button"
              onClick={handleClick}
              className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-all ${
                selectedTool === item.tool
                  ? "border-blue-500 bg-blue-50 text-blue-600"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <item.icon size={14} className="shrink-0" />
              <p>{t(FLOWCHART_TOOL_TRANSLATION_KEYS[item.tool])}</p>
            </button>
          );
        })}
      </div>

      {/* Info: (20260629 - Julian) 快捷工具子面板 - 透過 Mapping 動態載入 */}
      {ActivePanel && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <ActivePanel
            parsedNodes={parsedNodes}
            onInsert={handleInsertInstruction}
            onInsertWithFilter={handleInsertWithFilter}
          />
        </div>
      )}
    </>
  );
};
