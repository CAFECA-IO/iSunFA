"use client";

import { useState, FC } from "react";
import { DialogTitle } from "@headlessui/react";
import {
  CirclePlus,
  Lightbulb,
  Paintbrush,
  Pencil,
  RefreshCcw,
  Sparkles,
  SplinePointer,
  Trash2,
  X,
} from "lucide-react";

enum NodeColor {
  DEFAULT = "Default（預設灰）",
  NAVY = "Navy (海軍藍)",
  ORANGE = "Orange (高光橘)",
  RED = "Red (警告紅)",
  GREEN = "Green (成功綠)",
  PURPLE = "Purple (質感紫)",
}

enum FlowchartTools {
  ADD_NODE = "addNode", // Info: (20260624 - Julian) 新增節點
  EDIT_NODE = "editNode", // Info: (20260624 - Julian) 變更節點文字
  ADD_CONNECTION = "addConnection", // Info: (20260624 - Julian) 變更/新增連線
  CHANGE_COLOR = "changeColor", // Info: (20260624 - Julian) 變更節點顏色
  CHANGE_DIRECTION = "changeDirection", // Info: (20260624 - Julian) 變更圖表方向
}

enum PieTools {
  ADD_SLICE = "addSlice", // Info: (20260624 - Julian) 新增圓餅
  EDIT_SLICE = "editSlice", // Info: (20260624 - Julian) 變更圓餅
  DELETE_SLICE = "deleteSlice", // Info: (20260624 - Julian) 刪除圓餅
}

// Info: (20260624 - Julian) flowchart 小工具
const FLOWCHART_TOOLS = [
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

// Info: (20260624 - Julian) pie 小工具
const PIE_TOOLS = [
  {
    tool: PieTools.ADD_SLICE,
    icon: CirclePlus,
    label: "新增圓餅",
  },
  {
    tool: PieTools.EDIT_SLICE,
    icon: Pencil,
    label: "變更圓餅",
  },
  {
    tool: PieTools.DELETE_SLICE,
    icon: Trash2,
    label: "刪除圓餅",
  },
];

// Info: (20260624 - Julian) 常見修改指令範本，用於插入/覆蓋指令
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
    render: (flowDirection: string) => {
      const dirNames: Record<string, string> = {
        TD: "由上至下 (TD)",
        LR: "由左至右 (LR)",
        BT: "由下至上 (BT)",
        RL: "由右至左 (RL)",
      };
      return `將圖表整體方向變更為 ${dirNames[flowDirection] || flowDirection}`;
    },
  },
  ADD_PIE_SLICE: {
    render: (label: string, value: string) =>
      `在圓餅圖中新增一個項目，名稱為 "${label}"，數值/比例為 ${value}`,
  },
  EDIT_PIE_SLICE: {
    match: (line: string, targetLabel: string) =>
      line.includes(`修改圓餅圖項目 "${targetLabel}" 的數值/比例為`),
    render: (targetLabel: string, value: string, newLabel?: string) => {
      let inst = `修改圓餅圖項目 "${targetLabel}" 的數值/比例為 ${value}`;
      if (newLabel) inst += `，並將其名稱改為 "${newLabel}"`;
      return inst;
    },
  },
  DELETE_PIE_SLICE: {
    match: (line: string, targetLabel: string) =>
      line.includes(`從圓餅圖中刪除項目 "${targetLabel}"`),
    render: (targetLabel: string) => `從圓餅圖中刪除項目 "${targetLabel}"`,
  },
};

interface IMermaidAiControlPanelProps {
  chartType: "pie" | "flowchart" | "sequence" | "unknown";
  aiInstruction: string;
  setAiInstruction: React.Dispatch<React.SetStateAction<string>>;
  parsedNodes: { id: string; label: string }[];
  parsedPieItems: { label: string; value: number }[];
  onCancel: () => void;
}

const MermaidAiControlPanel: FC<IMermaidAiControlPanelProps> = ({
  chartType,
  aiInstruction,
  setAiInstruction,
  parsedNodes,
  parsedPieItems,
  onCancel,
}) => {
  // Info: (20260623 - Julian) 快速指令工具
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  // Info: (20260624 - Julian) 分解 flowchart 的元素（節點、連線等）
  const [newNodeId, setNewNodeId] = useState<string>("");
  const [newNodeLabel, setNewNodeLabel] = useState<string>("");
  const [fromNodeId, setFromNodeId] = useState<string>("");
  const [toNodeId, setToNodeId] = useState<string>("");
  const [connText, setConnText] = useState<string>("");

  const [targetNodeId, setTargetNodeId] = useState<string>("");
  const [newNodeText, setNewNodeText] = useState<string>("");

  const [connFromId, setConnFromId] = useState<string>("");
  const [connToId, setConnToId] = useState<string>("");
  const [connType, setConnType] = useState<string>("-->");
  const [connLabel, setConnLabel] = useState<string>("");

  const [colorNodeId, setColorNodeId] = useState<string>("");
  const [colorStyle, setColorStyle] = useState<NodeColor>(NodeColor.DEFAULT);

  const [flowDirection, setFlowDirection] = useState<string>("TD");

  // Info: (20260624 - Julian) 分解 pie 的元素（圓餅、數值等）
  const [pieSliceLabel, setPieSliceLabel] = useState<string>("");
  const [pieSliceValue, setPieSliceValue] = useState<string>("");
  const [pieSliceTarget, setPieSliceTarget] = useState<string>("");
  const [pieSliceNewLabel, setPieSliceNewLabel] = useState<string>("");

  // Info: (20260623 - Julian) 目前支援 pie 和 flowchart 小工具
  const isShowTools = chartType === "pie" || chartType === "flowchart";

  // Info: (20260624 - Julian) 插入指令
  const handleInsertInstruction = (text: string) => {
    setAiInstruction((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return text;
      return trimmed + "\n" + text;
    });
    setSelectedTool(null);
  };

  // Info: (20260624 - Julian) 插入指令前，先過濾掉相同類型的舊指令
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

  // Info: (20260624 - Julian) 插入「新增節點」指令
  const insertAddNode = () => {
    if (!newNodeLabel) return;
    const id =
      newNodeId.trim() || `node_${Math.random().toString(36).substring(2, 6)}`;
    const inst = INSTRUCTION_TEMPLATES.ADD_NODE.render(
      id,
      newNodeLabel,
      fromNodeId || undefined,
      toNodeId || undefined,
      connText || undefined,
    );
    handleInsertInstruction(inst);
    setNewNodeId("");
    setNewNodeLabel("");
    setFromNodeId("");
    setToNodeId("");
    setConnText("");
  };

  // Info: (20260624 - Julian) 插入「編輯節點」指令
  const insertEditNode = () => {
    if (!targetNodeId || !newNodeText) return;
    const inst = INSTRUCTION_TEMPLATES.EDIT_NODE.render(
      targetNodeId,
      newNodeText,
    );
    handleInsertWithFilter(inst, (line) =>
      INSTRUCTION_TEMPLATES.EDIT_NODE.match(line, targetNodeId),
    );
    setTargetNodeId("");
    setNewNodeText("");
  };

  // Info: (20260624 - Julian) 插入「新增連線」指令
  const insertConnection = () => {
    if (!connFromId || !connToId) return;
    const inst = INSTRUCTION_TEMPLATES.ADD_CONNECTION.render(
      connFromId,
      connToId,
      connType,
      connLabel || undefined,
    );
    handleInsertWithFilter(inst, (line) =>
      INSTRUCTION_TEMPLATES.ADD_CONNECTION.match(line, connFromId, connToId),
    );
    setConnFromId("");
    setConnToId("");
    setConnLabel("");
  };

  // Info: (20260624 - Julian) 插入「變更節點顏色」指令
  const insertColor = () => {
    if (!colorNodeId || !colorStyle) return;
    const inst = INSTRUCTION_TEMPLATES.CHANGE_COLOR.render(
      colorNodeId,
      colorStyle,
    );
    handleInsertWithFilter(inst, (line) =>
      INSTRUCTION_TEMPLATES.CHANGE_COLOR.match(line, colorNodeId),
    );
    setColorNodeId("");
  };

  // Info: (20260624 - Julian) 插入「變更圖表方向」指令
  const insertDirection = () => {
    if (!flowDirection) return;
    const inst = INSTRUCTION_TEMPLATES.CHANGE_DIRECTION.render(flowDirection);
    handleInsertWithFilter(inst, (line) =>
      INSTRUCTION_TEMPLATES.CHANGE_DIRECTION.match(line),
    );
  };

  // Info: (20260624 - Julian) 插入「新增圓餅」指令
  const insertAddPieSlice = () => {
    if (!pieSliceLabel || !pieSliceValue) return;
    const inst = INSTRUCTION_TEMPLATES.ADD_PIE_SLICE.render(
      pieSliceLabel,
      pieSliceValue,
    );
    handleInsertInstruction(inst);
    setPieSliceLabel("");
    setPieSliceValue("");
  };

  // Info: (20260624 - Julian) 插入「編輯圓餅」指令
  const insertEditPieSlice = () => {
    if (!pieSliceTarget || !pieSliceValue) return;
    const inst = INSTRUCTION_TEMPLATES.EDIT_PIE_SLICE.render(
      pieSliceTarget,
      pieSliceValue,
      pieSliceNewLabel || undefined,
    );
    handleInsertWithFilter(inst, (line) =>
      INSTRUCTION_TEMPLATES.EDIT_PIE_SLICE.match(line, pieSliceTarget),
    );
    setPieSliceTarget("");
    setPieSliceNewLabel("");
    setPieSliceValue("");
  };

  // Info: (20260624 - Julian) 插入「刪除圓餅」指令
  const insertDeletePieSlice = () => {
    if (!pieSliceTarget) return;
    const inst = INSTRUCTION_TEMPLATES.DELETE_PIE_SLICE.render(pieSliceTarget);
    handleInsertWithFilter(inst, (line) =>
      INSTRUCTION_TEMPLATES.DELETE_PIE_SLICE.match(line, pieSliceTarget),
    );
    setPieSliceTarget("");
  };

  // Info: (20260622 - Julian) flowchart 常用修改工具選單
  const flowchartToolsMenu = FLOWCHART_TOOLS.map((item) => {
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
  });

  // Info: (20260622 - Julian) pie 常用修改工具選單
  const pieToolsMenu = PIE_TOOLS.map((item) => {
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
  });

  // Info: (20260622 - Julian) 渲染 flowchart 常用修改工具子選單
  const renderFlowchartToolsSubmenu = () => {
    return (
      <>
        {selectedTool === FlowchartTools.ADD_NODE && (
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
                  onChange={(e) => setNewNodeId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
                  placeholder="例如: Node-01"
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
              onClick={insertAddNode}
              disabled={!newNodeLabel}
              className="w-full cursor-pointer rounded-lg bg-blue-600 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400"
            >
              插入指令
            </button>
          </div>
        )}

        {selectedTool === FlowchartTools.EDIT_NODE && (
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
              onClick={insertEditNode}
              disabled={!targetNodeId || !newNodeText}
              className="w-full cursor-pointer rounded-lg bg-blue-600 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400"
            >
              插入指令
            </button>
          </div>
        )}

        {selectedTool === FlowchartTools.ADD_CONNECTION && (
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
              onClick={insertConnection}
              disabled={!connFromId || !connToId}
              className="w-full cursor-pointer rounded-lg bg-blue-600 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400"
            >
              插入指令
            </button>
          </div>
        )}

        {selectedTool === FlowchartTools.CHANGE_COLOR && (
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
              onClick={insertColor}
              disabled={!colorNodeId}
              className="w-full cursor-pointer rounded-lg bg-blue-600 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400"
            >
              插入指令
            </button>
          </div>
        )}

        {selectedTool === FlowchartTools.CHANGE_DIRECTION && (
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
              onClick={insertDirection}
              className="w-full cursor-pointer rounded-lg bg-blue-600 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-500"
            >
              插入指令
            </button>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="flex w-full flex-col overflow-y-auto border-r border-slate-200 bg-slate-50 md:w-2/5">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-blue-50 p-1.5 text-blue-600">
            <Sparkles size={20} />
          </div>
          <div>
            <DialogTitle
              as="h3"
              className="text-sm leading-none font-bold text-slate-800"
            >
              AI 智慧圖表編輯器
            </DialogTitle>
            <span className="text-[10px] font-medium text-slate-400">
              Mermaid AI Chart Assistant
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        {/* Info: (20260623 - Julian) 指令編寫說明 */}
        <div className="shrink-0 rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-xs leading-relaxed text-blue-800">
          <div className="mb-1 flex items-center gap-1 font-bold">
            <div className="flex items-center gap-1">
              <Lightbulb size={14} strokeWidth={2.5} />
              <p>AI 指令編寫說明</p>
            </div>
          </div>
          <p className="text-blue-700">
            使用下方小工具可自動產生指令，您也可以手動修改，例如：
          </p>
          {chartType === "pie" ? (
            <ul className="mt-1 list-disc space-y-0.5 pl-4 font-medium text-blue-600/90">
              <li>「新增『辦公室碳排』15%」</li>
              <li>「將『製造』數值改為 45%，名稱改為『生產製造』」</li>
              <li>「刪除『其他』區塊」</li>
            </ul>
          ) : (
            <ul className="mt-1 list-disc space-y-0.5 pl-4 font-medium text-blue-600/90">
              <li>「新增節點 D，從 C 連接過來，連線文字是『核准』」</li>
              <li>「將 A 的文字改為『填寫申請單』」</li>
              <li>「將 A 到 B 的連線改為粗線」</li>
              <li>「將圖表方向變更為由左到右 (LR)」</li>
            </ul>
          )}
        </div>

        {/* Info: (20260623 - Julian) 指令輸入 */}
        <div className="flex shrink-0 flex-col">
          <div className="mb-1.5 flex items-center justify-between">
            <label
              htmlFor="aiInstructionInput"
              className="text-xs font-bold tracking-wider text-slate-700"
            >
              AI 編輯指令 (Instruction)
            </label>
            {aiInstruction && (
              <button
                type="button"
                onClick={() => setAiInstruction("")}
                className="text-[11px] font-bold text-slate-400 transition-colors hover:text-rose-500"
              >
                清空指令
              </button>
            )}
          </div>
          <textarea
            id="aiInstructionInput"
            value={aiInstruction}
            onChange={(e) => setAiInstruction(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs placeholder-slate-400 focus:border-blue-500 focus:outline-none"
            placeholder={
              chartType === "pie"
                ? "輸入您的修改指示，例如：新增『其他碳排 12%』..."
                : "輸入您的修改指示，例如：新增節點『審核完成』並與『起點』連線..."
            }
          />
        </div>

        {/* Info: (20260623 - Julian) 常用修改工具 */}
        {isShowTools && (
          <div className="flex shrink-0 flex-col">
            <span className="mb-2 text-xs font-bold tracking-wider text-slate-700">
              常用修改工具 (Quick Tools)
            </span>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {chartType === "pie" ? (
                <>{pieToolsMenu}</>
              ) : chartType === "flowchart" ? (
                <>{flowchartToolsMenu}</>
              ) : null}
            </div>

            {/* Info: (20260623 - Julian) 工具選擇表單 */}
            {selectedTool && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                {renderFlowchartToolsSubmenu()}

                {selectedTool === "addPieSlice" && (
                  <div className="flex flex-col gap-3">
                    <div className="border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
                      ➕ 新增圓餅圖項目
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label
                          htmlFor="pieSliceLabel"
                          className="text-[10px] font-bold text-slate-500"
                        >
                          項目名稱
                        </label>
                        <input
                          id="pieSliceLabel"
                          type="text"
                          value={pieSliceLabel}
                          onChange={(e) => setPieSliceLabel(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
                          placeholder="例如: 運輸碳排"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="pieSliceValue"
                          className="text-[10px] font-bold text-slate-500"
                        >
                          數值/比例
                        </label>
                        <input
                          id="pieSliceValue"
                          type="text"
                          value={pieSliceValue}
                          onChange={(e) => setPieSliceValue(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
                          placeholder="例如: 18.5"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={insertAddPieSlice}
                      disabled={!pieSliceLabel || !pieSliceValue}
                      className="w-full cursor-pointer rounded-lg bg-blue-600 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400"
                    >
                      插入指令
                    </button>
                  </div>
                )}

                {selectedTool === "editPieSlice" && (
                  <div className="flex flex-col gap-3">
                    <div className="border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
                      ✏️ 修改項目數值/名稱
                    </div>
                    <div>
                      <label
                        htmlFor="pieSliceTarget"
                        className="text-[10px] font-bold text-slate-500"
                      >
                        目標項目
                      </label>
                      <select
                        id="pieSliceTarget"
                        value={pieSliceTarget}
                        onChange={(e) => setPieSliceTarget(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">選擇項目...</option>
                        {parsedPieItems.map((item) => (
                          <option
                            key={`pie-edit-opt-${item.label}`}
                            value={item.label}
                          >
                            {item.label} ({item.value})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label
                          htmlFor="pieSliceNewLabel"
                          className="text-[10px] font-bold text-slate-500"
                        >
                          新名稱 (選填)
                        </label>
                        <input
                          id="pieSliceNewLabel"
                          type="text"
                          value={pieSliceNewLabel}
                          onChange={(e) => setPieSliceNewLabel(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
                          placeholder="新名稱"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="pieSliceValueEdit"
                          className="text-[10px] font-bold text-slate-500"
                        >
                          新數值
                        </label>
                        <input
                          id="pieSliceValueEdit"
                          type="text"
                          value={pieSliceValue}
                          onChange={(e) => setPieSliceValue(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
                          placeholder="例如: 35"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={insertEditPieSlice}
                      disabled={!pieSliceTarget || !pieSliceValue}
                      className="w-full cursor-pointer rounded-lg bg-blue-600 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400"
                    >
                      插入指令
                    </button>
                  </div>
                )}

                {selectedTool === "deletePieSlice" && (
                  <div className="flex flex-col gap-3">
                    <div className="border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
                      ❌ 刪除圓餅圖項目
                    </div>
                    <div>
                      <label
                        htmlFor="pieSliceTargetDel"
                        className="text-[10px] font-bold text-slate-500"
                      >
                        選擇目標項目
                      </label>
                      <select
                        id="pieSliceTargetDel"
                        value={pieSliceTarget}
                        onChange={(e) => setPieSliceTarget(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">選擇項目...</option>
                        {parsedPieItems.map((item) => (
                          <option
                            key={`pie-del-opt-${item.label}`}
                            value={item.label}
                          >
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={insertDeletePieSlice}
                      disabled={!pieSliceTarget}
                      className="w-full cursor-pointer rounded-lg bg-blue-600 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400"
                    >
                      插入指令
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export { MermaidAiControlPanel };
