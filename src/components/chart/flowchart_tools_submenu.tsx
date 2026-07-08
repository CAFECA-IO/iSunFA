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
  IChartAction,
  MermaidActionType,
  FlowchartColor,
} from "@/lib/utils/mermaid_helpers";
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
  NAVY = FlowchartColor.NAVY,
  ORANGE = FlowchartColor.ORANGE,
  RED = FlowchartColor.RED,
  GREEN = FlowchartColor.GREEN,
  PURPLE = FlowchartColor.PURPLE,
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

// ==========================================
// Info: (20260629 - Julian) 將每個工具拆分成子元件(sub-panel)
// ==========================================

interface IBasePanelProps {
  parsedNodes: { id: string; label: string }[];
  onAddAction: (action: IChartAction) => void;
}

// Info: (20260629 - Julian) 「新增節點」面板
const AddNodePanel: FC<IBasePanelProps> = ({ parsedNodes, onAddAction }) => {
  const { t } = useTranslation();
  const [newNodeId, setNewNodeId] = useState<string>("");
  const [newNodeLabel, setNewNodeLabel] = useState<string>("");
  const [fromNodeId, setFromNodeId] = useState<string>("");
  const [toNodeId, setToNodeId] = useState<string>("");
  const [connText, setConnText] = useState<string>("");

  // Info: (20260629 - Julian) 限制只能輸入英數、底線、連字號以避免 Mermaid 語法崩潰
  const handleIdChange = (val: string) => {
    setNewNodeId(val.replace(/[^a-zA-Z0-9_-]/g, ""));
  };

  const handleSubmit = () => {
    if (!newNodeLabel) return;
    const cleanId =
      newNodeId.trim() || `node_${Math.random().toString(36).substring(2, 6)}`;

    onAddAction({
      id: crypto.randomUUID(),
      type: MermaidActionType.FLOWCHART_ADD_NODE,
      description: `新增節點 "${newNodeLabel}" (${cleanId})`,
      payload: {
        id: cleanId,
        label: newNodeLabel,
        fromId: fromNodeId || undefined,
        toId: toNodeId || undefined,
        connText: connText || undefined,
      },
    });
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
        {t("chart.mermaid.ai_editor.flowchart.add_node")}
      </button>
    </div>
  );
};

// Info: (20260629 - Julian) 「變更節點文字」面板
const EditNodePanel: FC<IBasePanelProps> = ({ parsedNodes, onAddAction }) => {
  const { t } = useTranslation();
  const [targetNodeId, setTargetNodeId] = useState<string>("");
  const [newNodeText, setNewNodeText] = useState<string>("");

  const handleSubmit = () => {
    if (!targetNodeId || !newNodeText) return;
    onAddAction({
      id: crypto.randomUUID(),
      type: MermaidActionType.FLOWCHART_EDIT_NODE,
      description: `修改節點 "${targetNodeId}" 文字為 "${newNodeText}"`,
      payload: { id: targetNodeId, label: newNodeText },
    });
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
        {t("chart.mermaid.ai_editor.flowchart.edit_node")}
      </button>
    </div>
  );
};

// Info: (20260629 - Julian) 「變更連線」面板
const AddConnectionPanel: FC<IBasePanelProps> = ({
  parsedNodes,
  onAddAction,
}) => {
  const { t } = useTranslation();
  const [connFromId, setConnFromId] = useState<string>("");
  const [connToId, setConnToId] = useState<string>("");
  const [connType, setConnType] = useState<string>("-->");
  const [connLabel, setConnLabel] = useState<string>("");

  const handleSubmit = () => {
    if (!connFromId || !connToId) return;
    onAddAction({
      id: crypto.randomUUID(),
      type: MermaidActionType.FLOWCHART_ADD_CONNECTION,
      description: `建立連線從 "${connFromId}" 到 "${connToId}"`,
      payload: {
        fromId: connFromId,
        toId: connToId,
        connType,
        connLabel: connLabel || undefined,
      },
    });
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
        {t("chart.mermaid.ai_editor.flowchart.add_conn")}
      </button>
    </div>
  );
};

// Info: (20260629 - Julian) 「變更節點顏色」面板
const ChangeColorPanel: FC<IBasePanelProps> = ({
  parsedNodes,
  onAddAction,
}) => {
  const { t } = useTranslation();
  const [colorNodeId, setColorNodeId] = useState<string>("");
  const [colorStyle, setColorStyle] = useState<NodeColor>(NodeColor.DEFAULT);

  const handleSubmit = () => {
    if (!colorNodeId || !colorStyle) return;
    onAddAction({
      id: crypto.randomUUID(),
      type: MermaidActionType.FLOWCHART_CHANGE_COLOR,
      description: `變更節點 "${colorNodeId}" 顏色為 ${colorStyle}`,
      payload: {
        id: colorNodeId,
        color: colorStyle as unknown as FlowchartColor,
      },
    });
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
        {t("chart.mermaid.ai_editor.flowchart.change_color")}
      </button>
    </div>
  );
};

// Info: (20260629 - Julian) 「變更方向」面板
const ChangeDirectionPanel: FC<IBasePanelProps> = ({ onAddAction }) => {
  const { t } = useTranslation();
  const [flowDirection, setFlowDirection] = useState<string>("TD");

  const handleSubmit = () => {
    if (!flowDirection) return;
    onAddAction({
      id: crypto.randomUUID(),
      type: MermaidActionType.FLOWCHART_CHANGE_DIRECTION,
      description: `變更圖表方向為 ${DIRECTION_NAMES[flowDirection] || flowDirection}`,
      payload: { direction: flowDirection },
    });
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
        className={MERMAID_SUBMIT_BUTTON_STYLE}
      >
        {t("chart.mermaid.ai_editor.flowchart.change_dir")}
      </button>
    </div>
  );
};

const TOOL_PANELS: Record<FlowchartTools, FC<IBasePanelProps>> = {
  [FlowchartTools.ADD_NODE]: AddNodePanel,
  [FlowchartTools.EDIT_NODE]: EditNodePanel,
  [FlowchartTools.ADD_CONNECTION]: AddConnectionPanel,
  [FlowchartTools.CHANGE_COLOR]: ChangeColorPanel,
  [FlowchartTools.CHANGE_DIRECTION]: ChangeDirectionPanel,
};

interface IFlowchartToolsSectionProps {
  selectedTool: string | null;
  setSelectedTool: React.Dispatch<React.SetStateAction<string | null>>;
  parsedNodes: { id: string; label: string }[];
  onAddAction: (action: IChartAction) => void;
}

export const FlowchartToolsSection: FC<IFlowchartToolsSectionProps> = ({
  selectedTool,
  setSelectedTool,
  parsedNodes,
  onAddAction,
}) => {
  const { t } = useTranslation();

  const handleAddActionWithReset = (action: IChartAction) => {
    onAddAction(action);
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
            onAddAction={handleAddActionWithReset}
          />
        </div>
      )}
    </>
  );
};
