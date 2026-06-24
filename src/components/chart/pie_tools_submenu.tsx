"use client";

import { useState, FC } from "react";
import { CakeSlice, Paintbrush, Slice, Trash2 } from "lucide-react";

export enum PieColor {
  DEFAULT = "Default (預設灰)",
  NAVY = "Navy (海軍藍)",
  ORANGE = "Orange (高光橘)",
  RED = "Red (警告紅)",
  GREEN = "Green (成功綠)",
  PURPLE = "Purple (質感紫)",
}

export enum PieTools {
  ADD_SLICE = "addSlice",
  EDIT_SLICE = "editSlice",
  CHANGE_COLOR = "changeColor",
  DELETE_SLICE = "deleteSlice",
}

const PIE_TOOLS = [
  {
    tool: PieTools.ADD_SLICE,
    icon: CakeSlice,
    label: "新增項目",
  },
  {
    tool: PieTools.EDIT_SLICE,
    icon: Slice,
    label: "變更標題/數值",
  },
  {
    tool: PieTools.CHANGE_COLOR,
    icon: Paintbrush,
    label: "變更項目顏色",
  },
  {
    tool: PieTools.DELETE_SLICE,
    icon: Trash2,
    label: "刪除項目",
  },
];

const INSTRUCTION_TEMPLATES = {
  ADD_PIE_SLICE: {
    render: (label: string, value: string) =>
      `在圓餅圖中新增一個項目，名稱為 "${label}"，數值/比例為 ${value}`,
  },
  EDIT_PIE_SLICE: {
    match: (line: string, targetLabel: string) =>
      line.includes(`修改圓餅圖項目 "${targetLabel}"`),
    render: (targetLabel: string, value?: string, newLabel?: string) => {
      if (value && newLabel) {
        return `修改圓餅圖項目 "${targetLabel}" 的數值/比例為 ${value}，並將其名稱改為 "${newLabel}"`;
      } else if (value) {
        return `修改圓餅圖項目 "${targetLabel}" 的數值/比例為 ${value}`;
      } else if (newLabel) {
        return `修改圓餅圖項目 "${targetLabel}" 的名稱為 "${newLabel}"`;
      }
      return "";
    },
  },
  CHANGE_PIE_COLOR: {
    match: (line: string, targetLabel: string) =>
      line.includes(`將圓餅圖項目 "${targetLabel}" 的顏色調整為`),
    render: (targetLabel: string, color: string) =>
      `將圓餅圖項目 "${targetLabel}" 的顏色調整為 "${color}"`,
  },
  DELETE_PIE_SLICE: {
    match: (line: string, targetLabel: string) =>
      line.includes(`從圓餅圖中刪除項目 "${targetLabel}"`),
    render: (targetLabel: string) => `從圓餅圖中刪除項目 "${targetLabel}"`,
  },
};

interface IPieToolsSectionProps {
  selectedTool: string | null;
  setSelectedTool: React.Dispatch<React.SetStateAction<string | null>>;
  parsedPieItems: { label: string; value: number }[];
  setAiInstruction: React.Dispatch<React.SetStateAction<string>>;
}

export const PieToolsSection: FC<IPieToolsSectionProps> = ({
  selectedTool,
  setSelectedTool,
  parsedPieItems,
  setAiInstruction,
}) => {
  // Form states
  const [pieSliceLabel, setPieSliceLabel] = useState<string>("");
  const [pieSliceValue, setPieSliceValue] = useState<string>("");
  const [pieSliceTarget, setPieSliceTarget] = useState<string>("");
  const [pieSliceNewLabel, setPieSliceNewLabel] = useState<string>("");
  const [pieSliceColor, setPieSliceColor] = useState<PieColor>(
    PieColor.DEFAULT,
  );

  // Helper insertion handlers
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

  const insertEditPieSlice = () => {
    if (!pieSliceTarget || (!pieSliceValue && !pieSliceNewLabel)) return;
    const inst = INSTRUCTION_TEMPLATES.EDIT_PIE_SLICE.render(
      pieSliceTarget,
      pieSliceValue || undefined,
      pieSliceNewLabel || undefined,
    );
    handleInsertWithFilter(inst, (line) =>
      INSTRUCTION_TEMPLATES.EDIT_PIE_SLICE.match(line, pieSliceTarget),
    );
    setPieSliceTarget("");
    setPieSliceNewLabel("");
    setPieSliceValue("");
  };

  const insertChangePieColor = () => {
    if (!pieSliceTarget || !pieSliceColor) return;
    const inst = INSTRUCTION_TEMPLATES.CHANGE_PIE_COLOR.render(
      pieSliceTarget,
      pieSliceColor,
    );
    handleInsertWithFilter(inst, (line) =>
      INSTRUCTION_TEMPLATES.CHANGE_PIE_COLOR.match(line, pieSliceTarget),
    );
    setPieSliceTarget("");
    setPieSliceColor(PieColor.DEFAULT);
  };

  const insertDeletePieSlice = () => {
    if (!pieSliceTarget) return;
    const inst = INSTRUCTION_TEMPLATES.DELETE_PIE_SLICE.render(pieSliceTarget);
    handleInsertWithFilter(inst, (line) =>
      INSTRUCTION_TEMPLATES.DELETE_PIE_SLICE.match(line, pieSliceTarget),
    );
    setPieSliceTarget("");
  };

  const isPieToolSelected = Object.values(PieTools).includes(
    selectedTool as PieTools,
  );

  return (
    <>
      {/* Horizontal select buttons list */}
      <div className="flex flex-wrap gap-1.5">
        {PIE_TOOLS.map((item) => {
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

      {/* Submenu form card */}
      {selectedTool && isPieToolSelected && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          {selectedTool === PieTools.ADD_SLICE && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
                <CakeSlice size={14} />
                <p>新增圓餅圖項目</p>
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

          {selectedTool === PieTools.EDIT_SLICE && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
                <Slice size={14} />
                <p>修改項目數值/名稱</p>
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
                    新數值 (選填)
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
                disabled={
                  !pieSliceTarget || (!pieSliceValue && !pieSliceNewLabel)
                }
                className="w-full cursor-pointer rounded-lg bg-blue-600 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400"
              >
                插入指令
              </button>
            </div>
          )}

          {selectedTool === PieTools.CHANGE_COLOR && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
                <Paintbrush size={14} />
                <p>變更項目顏色</p>
              </div>
              <div>
                <label
                  htmlFor="pieColorTarget"
                  className="text-[10px] font-bold text-slate-500"
                >
                  目標項目
                </label>
                <select
                  id="pieColorTarget"
                  value={pieSliceTarget}
                  onChange={(e) => setPieSliceTarget(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">選擇項目...</option>
                  {parsedPieItems.map((item) => (
                    <option
                      key={`pie-color-opt-${item.label}`}
                      value={item.label}
                    >
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="pieSliceColor"
                  className="text-[10px] font-bold text-slate-500"
                >
                  選擇顏色風格
                </label>
                <select
                  id="pieSliceColor"
                  value={pieSliceColor}
                  onChange={(e) => setPieSliceColor(e.target.value as PieColor)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
                >
                  {Object.values(PieColor).map((color) => (
                    <option key={color} value={color}>
                      {color}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={insertChangePieColor}
                disabled={!pieSliceTarget}
                className="w-full cursor-pointer rounded-lg bg-blue-600 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400"
              >
                插入指令
              </button>
            </div>
          )}

          {selectedTool === PieTools.DELETE_SLICE && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
                <Trash2 size={14} />
                <p>刪除圓餅圖項目</p>
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
    </>
  );
};
