import React, { useState, useMemo, FC } from "react";
import { CirclePlus, Pencil, RefreshCcw, SplinePointer } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import {
  IToolItem as IToolItemBase,
  IChartPanelProps,
} from "@/interfaces/chart_tools";
import {
  IChartAction,
  MermaidActionType,
  parseFlowchartNodes,
} from "@/lib/utils/mermaid_helpers";
import {
  MERMAID_INPUT_STYLE,
  MERMAID_LABEL_STYLE,
  MERMAID_SUBMIT_BUTTON_STYLE,
} from "@/constants/mermaid_chart";

// ==========================================
// Info: (20260629 - Julian) 定義與靜態映射表
// ==========================================

enum FlowchartTools {
  ADD_NODE = "addNode",
  EDIT_NODE = "editNode",
  ADD_CONNECTION = "addConnection",
  CHANGE_DIRECTION = "changeDirection",
}

type IToolItem = IToolItemBase<FlowchartTools>;

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
    tool: FlowchartTools.CHANGE_DIRECTION,
    icon: RefreshCcw,
  },
];

const FLOWCHART_TOOL_TRANSLATION_KEYS: Record<FlowchartTools, string> = {
  [FlowchartTools.ADD_NODE]: "chart.mermaid.ai_editor.flowchart.add_node",
  [FlowchartTools.EDIT_NODE]: "chart.mermaid.ai_editor.flowchart.edit_node",
  [FlowchartTools.ADD_CONNECTION]: "chart.mermaid.ai_editor.flowchart.add_conn",
  [FlowchartTools.CHANGE_DIRECTION]:
    "chart.mermaid.ai_editor.flowchart.change_dir",
};

// ==========================================
// Info: (20260629 - Julian) 將每個工具拆分成子元件(sub-panel)
// ==========================================

type IBasePanelProps = IChartPanelProps<
  { id: string; label: string }[],
  IChartAction
>;

// Info: (20260629 - Julian) 「新增節點」面板
const AddNodePanel: FC<IBasePanelProps> = ({ parsedData, onAddAction }) => {
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
      description: t("chart.mermaid.ai_editor.flowchart.action_add_node", {
        label: newNodeLabel,
        id: cleanId,
      }),
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
        <div className="flex flex-col">
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
        <div className="flex flex-col">
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
        <div className="flex flex-col">
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
            {parsedData.map((n) => (
              <option key={`from-${n.id}`} value={n.id}>
                {n.label} ({n.id})
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
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
            {parsedData.map((n) => (
              <option key={`to-${n.id}`} value={n.id}>
                {n.label} ({n.id})
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-col">
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
const EditNodePanel: FC<IBasePanelProps> = ({ parsedData, onAddAction }) => {
  const { t } = useTranslation();
  const [targetNodeId, setTargetNodeId] = useState<string>("");
  const [newNodeText, setNewNodeText] = useState<string>("");

  const handleSubmit = () => {
    if (!targetNodeId || !newNodeText) return;
    onAddAction({
      id: crypto.randomUUID(),
      type: MermaidActionType.FLOWCHART_EDIT_NODE,
      description: t("chart.mermaid.ai_editor.flowchart.action_edit_node", {
        id: targetNodeId,
        text: newNodeText,
      }),
      payload: { id: targetNodeId, label: newNodeText },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <Pencil size={14} />
        <p>{t("chart.mermaid.ai_editor.flowchart.edit_node_title")}</p>
      </div>
      <div className="flex flex-col">
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
          {parsedData.map((n) => (
            <option key={`edit-${n.id}`} value={n.id}>
              {n.label} ({n.id})
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col">
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
  parsedData,
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
      description: t("chart.mermaid.ai_editor.flowchart.action_add_conn", {
        from: connFromId,
        to: connToId,
      }),
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
        <div className="flex flex-col">
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
            {parsedData.map((n) => (
              <option key={`conn-from-${n.id}`} value={n.id}>
                {n.label} ({n.id})
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
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
            {parsedData.map((n) => (
              <option key={`conn-to-${n.id}`} value={n.id}>
                {n.label} ({n.id})
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col">
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
        <div className="flex flex-col">
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

// Info: (20260629 - Julian) 「變更方向」面板
const ChangeDirectionPanel: FC<IBasePanelProps> = ({ onAddAction }) => {
  const { t } = useTranslation();
  const [flowDirection, setFlowDirection] = useState<string>("TD");

  const handleSubmit = () => {
    if (!flowDirection) return;
    onAddAction({
      id: crypto.randomUUID(),
      type: MermaidActionType.FLOWCHART_CHANGE_DIRECTION,
      description: t("chart.mermaid.ai_editor.flowchart.action_change_dir", {
        dir: t(
          `chart.mermaid.ai_editor.flowchart.dir_${flowDirection.toLowerCase()}`,
        ),
      }),
      payload: { direction: flowDirection },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <RefreshCcw size={14} />
        <p>{t("chart.mermaid.ai_editor.flowchart.change_dir_title")}</p>
      </div>
      <div className="flex flex-col">
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
  [FlowchartTools.CHANGE_DIRECTION]: ChangeDirectionPanel,
};

interface IFlowchartToolsSectionProps {
  selectedTool: string | null;
  setSelectedTool: React.Dispatch<React.SetStateAction<string | null>>;
  chart: string;
  onAddAction: (action: IChartAction) => void;
}

export const FlowchartToolsSection: FC<IFlowchartToolsSectionProps> = ({
  selectedTool,
  setSelectedTool,
  chart,
  onAddAction,
}) => {
  const { t } = useTranslation();

  // Info: (20260716 - Julian) 元件自行解析所需資料，父層只需傳入圖表字串
  const parsedData = useMemo(() => parseFlowchartNodes(chart), [chart]);

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
            parsedData={parsedData}
            onAddAction={handleAddActionWithReset}
          />
        </div>
      )}
    </>
  );
};
