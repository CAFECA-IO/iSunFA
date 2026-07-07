"use client";

import React, { useState, FC } from "react";
import { CakeSlice, Paintbrush, Slice, Trash2, LucideIcon } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import {
  MERMAID_INPUT_STYLE,
  MERMAID_LABEL_STYLE,
  MERMAID_SUBMIT_BUTTON_STYLE,
} from "@/constants/mermaid_chart";

// ==========================================
// Info: (20260629 - Julian) 定義與靜態映射表
// ==========================================

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

interface IToolItem {
  tool: PieTools;
  icon: LucideIcon;
}

const PIE_TOOLS: IToolItem[] = [
  {
    tool: PieTools.ADD_SLICE,
    icon: CakeSlice,
  },
  {
    tool: PieTools.EDIT_SLICE,
    icon: Slice,
  },
  {
    tool: PieTools.CHANGE_COLOR,
    icon: Paintbrush,
  },
  {
    tool: PieTools.DELETE_SLICE,
    icon: Trash2,
  },
];

const PIE_TOOL_TRANSLATION_KEYS: Record<PieTools, string> = {
  [PieTools.ADD_SLICE]: "chart.mermaid.ai_editor.pie.add_slice",
  [PieTools.EDIT_SLICE]: "chart.mermaid.ai_editor.pie.edit_slice",
  [PieTools.CHANGE_COLOR]: "chart.mermaid.ai_editor.pie.change_color",
  [PieTools.DELETE_SLICE]: "chart.mermaid.ai_editor.pie.delete_slice",
};

const PIE_COLOR_TRANSLATION_KEYS: Record<PieColor, string> = {
  [PieColor.DEFAULT]: "chart.mermaid.ai_editor.colors.default",
  [PieColor.NAVY]: "chart.mermaid.ai_editor.colors.navy",
  [PieColor.ORANGE]: "chart.mermaid.ai_editor.colors.orange",
  [PieColor.RED]: "chart.mermaid.ai_editor.colors.red",
  [PieColor.GREEN]: "chart.mermaid.ai_editor.colors.green",
  [PieColor.PURPLE]: "chart.mermaid.ai_editor.colors.purple",
};

const INSTRUCTION_TEMPLATES = {
  ADD_PIE_SLICE: {
    render: (label: string, value: string, color?: string) =>
      `在圓餅圖中新增一個項目，名稱為 "${label}"，數值/比例為 ${value}${
        color ? `，顏色為 "${color}"` : ""
      }`,
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

// ==========================================
// Info: (20260629 - Julian) 將每個工具拆分成子元件(sub-panel)
// ==========================================

interface IBasePanelProps {
  parsedPieItems: { label: string; value: number }[];
  onInsert: (text: string) => void;
  onInsertWithFilter: (
    text: string,
    filterFn: (line: string) => boolean,
  ) => void;
}

// Info: (20260629 - Julian) 「新增項目」面板
const AddSlicePanel: FC<IBasePanelProps> = ({ onInsert }) => {
  const { t } = useTranslation();
  const [pieSliceLabel, setPieSliceLabel] = useState<string>("");
  const [pieSliceValue, setPieSliceValue] = useState<string>("");
  const [pieSliceColor, setPieSliceColor] = useState<PieColor | "">("");

  const handleSubmit = () => {
    if (!pieSliceLabel || !pieSliceValue) return;
    const inst = INSTRUCTION_TEMPLATES.ADD_PIE_SLICE.render(
      pieSliceLabel,
      pieSliceValue,
      pieSliceColor || undefined,
    );
    onInsert(inst);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <CakeSlice size={14} />
        <p>{t("chart.mermaid.ai_editor.pie.add_slice_title")}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="pieSliceLabel" className={MERMAID_LABEL_STYLE}>
            {t("chart.mermaid.ai_editor.pie.slice_name_label")}
            <span className="ml-0.5 text-red-500">*</span>
          </label>
          <input
            id="pieSliceLabel"
            type="text"
            value={pieSliceLabel}
            onChange={(e) => setPieSliceLabel(e.target.value)}
            className={MERMAID_INPUT_STYLE}
            placeholder={
              t("chart.mermaid.ai_editor.pie.slice_name_placeholder")!
            }
          />
        </div>
        <div>
          <label htmlFor="pieSliceValue" className={MERMAID_LABEL_STYLE}>
            {t("chart.mermaid.ai_editor.pie.slice_value_label")}
            <span className="ml-0.5 text-red-500">*</span>
          </label>
          <input
            id="pieSliceValue"
            type="text"
            value={pieSliceValue}
            onChange={(e) => setPieSliceValue(e.target.value)}
            className={MERMAID_INPUT_STYLE}
            placeholder={
              t("chart.mermaid.ai_editor.pie.slice_value_placeholder")!
            }
          />
        </div>
        <div className="col-span-2">
          <label htmlFor="pieSliceColor" className={MERMAID_LABEL_STYLE}>
            {t("chart.mermaid.ai_editor.pie.select_style_label")}
          </label>
          <select
            id="pieSliceColor"
            value={pieSliceColor}
            onChange={(e) => setPieSliceColor(e.target.value as PieColor)}
            className={MERMAID_INPUT_STYLE}
          >
            <option value={""}>
              {t("chart.mermaid.ai_editor.pie.ai_auto_select")}
            </option>
            {Object.values(PieColor).map((color) => (
              <option key={color} value={color}>
                {t(PIE_COLOR_TRANSLATION_KEYS[color])}
              </option>
            ))}
          </select>
        </div>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!pieSliceLabel || !pieSliceValue}
        className={MERMAID_SUBMIT_BUTTON_STYLE}
      >
        {t("chart.mermaid.ai_editor.flowchart.insert_instruction")}
      </button>
    </div>
  );
};

// Info: (20260629 - Julian) 「變更標題/數值」面板
const EditSlicePanel: FC<IBasePanelProps> = ({
  parsedPieItems,
  onInsertWithFilter,
}) => {
  const { t } = useTranslation();
  const [pieSliceTarget, setPieSliceTarget] = useState<string>("");
  const [pieSliceNewLabel, setPieSliceNewLabel] = useState<string>("");
  const [pieSliceValue, setPieSliceValue] = useState<string>("");

  const handleSubmit = () => {
    if (!pieSliceTarget || (!pieSliceValue && !pieSliceNewLabel)) return;
    const inst = INSTRUCTION_TEMPLATES.EDIT_PIE_SLICE.render(
      pieSliceTarget,
      pieSliceValue || undefined,
      pieSliceNewLabel || undefined,
    );
    onInsertWithFilter(inst, (line) =>
      INSTRUCTION_TEMPLATES.EDIT_PIE_SLICE.match(line, pieSliceTarget),
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <Slice size={14} />
        <p>{t("chart.mermaid.ai_editor.pie.edit_slice_title")}</p>
      </div>
      <div>
        <label htmlFor="pieSliceTarget" className={MERMAID_LABEL_STYLE}>
          {t("chart.mermaid.ai_editor.pie.select_slice_placeholder")}
          <span className="ml-0.5 text-red-500">*</span>
        </label>
        <select
          id="pieSliceTarget"
          value={pieSliceTarget}
          onChange={(e) => setPieSliceTarget(e.target.value)}
          className={MERMAID_INPUT_STYLE}
        >
          <option value="">
            {t("chart.mermaid.ai_editor.pie.select_slice_placeholder")}
          </option>
          {parsedPieItems.map((item) => (
            <option key={`pie-edit-opt-${item.label}`} value={item.label}>
              {item.label} ({item.value})
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="pieSliceNewLabel" className={MERMAID_LABEL_STYLE}>
            {t("chart.mermaid.ai_editor.pie.new_name_label")}
          </label>
          <input
            id="pieSliceNewLabel"
            type="text"
            value={pieSliceNewLabel}
            onChange={(e) => setPieSliceNewLabel(e.target.value)}
            className={MERMAID_INPUT_STYLE}
            placeholder={t("chart.mermaid.ai_editor.pie.new_name_placeholder")!}
          />
        </div>
        <div>
          <label htmlFor="pieSliceValueEdit" className={MERMAID_LABEL_STYLE}>
            {t("chart.mermaid.ai_editor.pie.new_value_label")}
          </label>
          <input
            id="pieSliceValueEdit"
            type="text"
            value={pieSliceValue}
            onChange={(e) => setPieSliceValue(e.target.value)}
            className={MERMAID_INPUT_STYLE}
            placeholder={
              t("chart.mermaid.ai_editor.pie.new_value_placeholder")!
            }
          />
        </div>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!pieSliceTarget || (!pieSliceValue && !pieSliceNewLabel)}
        className={MERMAID_SUBMIT_BUTTON_STYLE}
      >
        {t("chart.mermaid.ai_editor.flowchart.insert_instruction")}
      </button>
    </div>
  );
};

// Info: (20260629 - Julian) 「變更項目顏色」面板
const ChangeSliceColorPanel: FC<IBasePanelProps> = ({
  parsedPieItems,
  onInsertWithFilter,
}) => {
  const { t } = useTranslation();
  const [pieSliceTarget, setPieSliceTarget] = useState<string>("");
  const [pieSliceColor, setPieSliceColor] = useState<PieColor>(
    PieColor.DEFAULT,
  );

  const handleSubmit = () => {
    if (!pieSliceTarget || !pieSliceColor) return;
    const inst = INSTRUCTION_TEMPLATES.CHANGE_PIE_COLOR.render(
      pieSliceTarget,
      pieSliceColor,
    );
    onInsertWithFilter(inst, (line) =>
      INSTRUCTION_TEMPLATES.CHANGE_PIE_COLOR.match(line, pieSliceTarget),
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <Paintbrush size={14} />
        <p>{t("chart.mermaid.ai_editor.pie.change_color_title")}</p>
      </div>
      <div>
        <label htmlFor="pieColorTarget" className={MERMAID_LABEL_STYLE}>
          {t("chart.mermaid.ai_editor.pie.select_slice_placeholder")}
          <span className="ml-0.5 text-red-500">*</span>
        </label>
        <select
          id="pieColorTarget"
          value={pieSliceTarget}
          onChange={(e) => setPieSliceTarget(e.target.value)}
          className={MERMAID_INPUT_STYLE}
        >
          <option value="">
            {t("chart.mermaid.ai_editor.pie.select_slice_placeholder")}
          </option>
          {parsedPieItems.map((item) => (
            <option key={`pie-color-opt-${item.label}`} value={item.label}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="pieSliceColor" className={MERMAID_LABEL_STYLE}>
          {t("chart.mermaid.ai_editor.pie.select_color_label")}
        </label>
        <select
          id="pieSliceColor"
          value={pieSliceColor}
          onChange={(e) => setPieSliceColor(e.target.value as PieColor)}
          className={MERMAID_INPUT_STYLE}
        >
          {Object.values(PieColor).map((color) => (
            <option key={color} value={color}>
              {t(PIE_COLOR_TRANSLATION_KEYS[color])}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!pieSliceTarget}
        className={MERMAID_SUBMIT_BUTTON_STYLE}
      >
        {t("chart.mermaid.ai_editor.flowchart.insert_instruction")}
      </button>
    </div>
  );
};

// Info: (20260629 - Julian) 「刪除項目」面板
const DeleteSlicePanel: FC<IBasePanelProps> = ({
  parsedPieItems,
  onInsertWithFilter,
}) => {
  const { t } = useTranslation();
  const [pieSliceTarget, setPieSliceTarget] = useState<string>("");

  const handleSubmit = () => {
    if (!pieSliceTarget) return;
    const inst = INSTRUCTION_TEMPLATES.DELETE_PIE_SLICE.render(pieSliceTarget);
    onInsertWithFilter(inst, (line) =>
      INSTRUCTION_TEMPLATES.DELETE_PIE_SLICE.match(line, pieSliceTarget),
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <Trash2 size={14} />
        <p>{t("chart.mermaid.ai_editor.pie.delete_slice_title")}</p>
      </div>
      <div>
        <label htmlFor="pieSliceTargetDel" className={MERMAID_LABEL_STYLE}>
          {t("chart.mermaid.ai_editor.pie.select_delete_placeholder")}
          <span className="ml-0.5 text-red-500">*</span>
        </label>
        <select
          id="pieSliceTargetDel"
          value={pieSliceTarget}
          onChange={(e) => setPieSliceTarget(e.target.value)}
          className={MERMAID_INPUT_STYLE}
        >
          <option value="">
            {t("chart.mermaid.ai_editor.pie.select_delete_placeholder")}
          </option>
          {parsedPieItems.map((item) => (
            <option key={`pie-del-opt-${item.label}`} value={item.label}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!pieSliceTarget}
        className={MERMAID_SUBMIT_BUTTON_STYLE}
      >
        {t("chart.mermaid.ai_editor.flowchart.insert_instruction")}
      </button>
    </div>
  );
};

// ==========================================
// Info: (20260629 - Julian) 工具面板元件映射表
// ==========================================

const PIE_TOOL_PANELS: Record<PieTools, FC<IBasePanelProps>> = {
  [PieTools.ADD_SLICE]: AddSlicePanel,
  [PieTools.EDIT_SLICE]: EditSlicePanel,
  [PieTools.CHANGE_COLOR]: ChangeSliceColorPanel,
  [PieTools.DELETE_SLICE]: DeleteSlicePanel,
};

// ==========================================
// Info: (20260629 - Julian) 主元件
// ==========================================

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

  const isPieToolSelected = Object.values(PieTools).includes(
    selectedTool as PieTools,
  );

  const ActivePanel = isPieToolSelected
    ? PIE_TOOL_PANELS[selectedTool as PieTools]
    : null;

  return (
    <>
      {/* Info: (20260629 - Julian) 快捷工具選擇列 */}
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
              <p>{t(PIE_TOOL_TRANSLATION_KEYS[item.tool])}</p>
            </button>
          );
        })}
      </div>

      {/* Info: (20260629 - Julian) 快捷工具子面板 - 透過 Mapping 動態載入 */}
      {ActivePanel && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <ActivePanel
            parsedPieItems={parsedPieItems}
            onInsert={handleInsertInstruction}
            onInsertWithFilter={handleInsertWithFilter}
          />
        </div>
      )}
    </>
  );
};
