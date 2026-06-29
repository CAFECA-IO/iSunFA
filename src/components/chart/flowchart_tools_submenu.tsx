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
  label: string;
}

const FLOWCHART_TOOLS: IToolItem[] = [
  {
    tool: FlowchartTools.ADD_NODE,
    icon: CirclePlus,
    label: "新增節點",
  },
  {
    tool: FlowchartTools.EDIT_NODE,
    icon: Pencil,
    label: "變更節點文字",
  },
  {
    tool: FlowchartTools.ADD_CONNECTION,
    icon: SplinePointer,
    label: "變更/新增連線",
  },
  {
    tool: FlowchartTools.CHANGE_COLOR,
    icon: Paintbrush,
    label: "變更節點顏色",
  },
  {
    tool: FlowchartTools.CHANGE_DIRECTION,
    icon: RefreshCcw,
    label: "變更圖表方向",
  },
];

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
  const [newNodeId, setNewNodeId] = useState("");
  const [newNodeLabel, setNewNodeLabel] = useState("");
  const [fromNodeId, setFromNodeId] = useState("");
  const [toNodeId, setToNodeId] = useState("");
  const [connText, setConnText] = useState("");

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
        <p>新增節點工具</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label
            htmlFor="new-node-id"
            className="text-[10px] font-bold text-slate-500"
          >
            節點 ID (選填)
          </label>
          <input
            id="new-node-id"
            type="text"
            value={newNodeId}
            onChange={(e) => handleIdChange(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
            placeholder="例如: Node_01"
          />
        </div>
        <div>
          <label
            htmlFor="new-node-label"
            className="text-[10px] font-bold text-slate-500"
          >
            節點名稱 (必填)
          </label>
          <input
            id="new-node-label"
            type="text"
            value={newNodeLabel}
            onChange={(e) => setNewNodeLabel(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
            placeholder="例如: 審核完成"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label
            htmlFor="from-node-id"
            className="text-[10px] font-bold text-slate-500"
          >
            連接起點 (From)
          </label>
          <select
            id="from-node-id"
            value={fromNodeId}
            onChange={(e) => setFromNodeId(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
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
          <label
            htmlFor="to-node-id"
            className="text-[10px] font-bold text-slate-500"
          >
            連接終點 (To)
          </label>
          <select
            id="to-node-id"
            value={toNodeId}
            onChange={(e) => setToNodeId(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
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
        <label
          htmlFor="conn-text"
          className="text-[10px] font-bold text-slate-500"
        >
          連線文字 (選填)
        </label>
        <input
          id="conn-text"
          type="text"
          value={connText}
          onChange={(e) => setConnText(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
          placeholder="例如: 審核通過"
        />
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!newNodeLabel}
        className="w-full cursor-pointer rounded-lg bg-blue-600 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400"
      >
        插入指令
      </button>
    </div>
  );
};

// Info: (20260629 - Julian) 「變更節點文字」面板
const EditNodePanel: FC<IBasePanelProps> = ({
  parsedNodes,
  onInsertWithFilter,
}) => {
  const [targetNodeId, setTargetNodeId] = useState("");
  const [newNodeText, setNewNodeText] = useState("");

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
        <p>變更節點文字工具</p>
      </div>
      <div>
        <label
          htmlFor="target-node-id"
          className="text-[10px] font-bold text-slate-500"
        >
          選擇目標節點
        </label>
        <select
          id="target-node-id"
          value={targetNodeId}
          onChange={(e) => setTargetNodeId(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
        >
          <option value="">選擇節點...</option>
          {parsedNodes.map((n) => (
            <option key={`edit-${n.id}`} value={n.id}>
              {n.label} ({n.id})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label
          htmlFor="new-node-text"
          className="text-[10px] font-bold text-slate-500"
        >
          新文字
        </label>
        <input
          id="new-node-text"
          type="text"
          value={newNodeText}
          onChange={(e) => setNewNodeText(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
          placeholder="輸入新文字"
        />
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!targetNodeId || !newNodeText}
        className="w-full cursor-pointer rounded-lg bg-blue-600 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400"
      >
        插入指令
      </button>
    </div>
  );
};

// Info: (20260629 - Julian) 「變更連線」面板
const AddConnectionPanel: FC<IBasePanelProps> = ({
  parsedNodes,
  onInsertWithFilter,
}) => {
  const [connFromId, setConnFromId] = useState("");
  const [connToId, setConnToId] = useState("");
  const [connType, setConnType] = useState("-->");
  const [connLabel, setConnLabel] = useState("");

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
        <p>變更/新增連線工具</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label
            htmlFor="connFromId"
            className="text-[10px] font-bold text-slate-500"
          >
            起點節點 (From)
          </label>
          <select
            id="connFromId"
            value={connFromId}
            onChange={(e) => setConnFromId(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
          >
            <option value="">選擇起點...</option>
            {parsedNodes.map((n) => (
              <option key={`conn-from-${n.id}`} value={n.id}>
                {n.label} ({n.id})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="connToId"
            className="text-[10px] font-bold text-slate-500"
          >
            終點節點 (To)
          </label>
          <select
            id="connToId"
            value={connToId}
            onChange={(e) => setConnToId(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
          >
            <option value="">選擇終點...</option>
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
          <label
            htmlFor="connType"
            className="text-[10px] font-bold text-slate-500"
          >
            連線類型
          </label>
          <select
            id="connType"
            value={connType}
            onChange={(e) => setConnType(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
          >
            <option value="-->">箭頭線 (--&gt;)</option>
            <option value="==>">粗箭頭 (==&gt;)</option>
            <option value="-.->">虛線箭頭 (-.-&gt;)</option>
            <option value="---">實線無箭頭 (---)</option>
          </select>
        </div>
        <div>
          <label
            htmlFor="connLabel"
            className="text-[10px] font-bold text-slate-500"
          >
            連線文字 (選填)
          </label>
          <input
            id="connLabel"
            type="text"
            value={connLabel}
            onChange={(e) => setConnLabel(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
            placeholder="例如: 審核中"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!connFromId || !connToId}
        className="w-full cursor-pointer rounded-lg bg-blue-600 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400"
      >
        插入指令
      </button>
    </div>
  );
};

// Info: (20260629 - Julian) 「變更節點顏色」面板
const ChangeColorPanel: FC<IBasePanelProps> = ({
  parsedNodes,
  onInsertWithFilter,
}) => {
  const [colorNodeId, setColorNodeId] = useState("");
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
        <p>變更節點顏色</p>
      </div>
      <div>
        <label
          htmlFor="colorNodeId"
          className="text-[10px] font-bold text-slate-500"
        >
          目標節點
        </label>
        <select
          id="colorNodeId"
          value={colorNodeId}
          onChange={(e) => setColorNodeId(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
        >
          <option value="">選擇節點...</option>
          {parsedNodes.map((n) => (
            <option key={`color-btn-${n.id}`} value={n.id}>
              {n.label} ({n.id})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label
          htmlFor="colorStyle"
          className="text-[10px] font-bold text-slate-500"
        >
          選擇風格色系
        </label>
        <select
          id="colorStyle"
          value={colorStyle}
          onChange={(e) => setColorStyle(e.target.value as NodeColor)}
          className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
        >
          {Object.values(NodeColor).map((color) => (
            <option key={color} value={color}>
              {color}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!colorNodeId}
        className="w-full cursor-pointer rounded-lg bg-blue-600 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400"
      >
        插入指令
      </button>
    </div>
  );
};

// Info: (20260629 - Julian) 「變更方向」面板
const ChangeDirectionPanel: FC<IBasePanelProps> = ({ onInsertWithFilter }) => {
  const [flowDirection, setFlowDirection] = useState("TD");

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
        <p>變更圖表方向</p>
      </div>
      <div>
        <label
          htmlFor="flowDirection"
          className="text-[10px] font-bold text-slate-500"
        >
          方向
        </label>
        <select
          id="flowDirection"
          value={flowDirection}
          onChange={(e) => setFlowDirection(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
        >
          <option value="TD">由上至下 (TD / Top-Down)</option>
          <option value="LR">由左至右 (LR / Left-to-Right)</option>
          <option value="BT">由下至上 (BT / Bottom-to-Top)</option>
          <option value="RL">由右至左 (RL / Right-to-Left)</option>
        </select>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        className="w-full cursor-pointer rounded-lg bg-blue-600 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-500"
      >
        插入指令
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
              <p>{item.label}</p>
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
