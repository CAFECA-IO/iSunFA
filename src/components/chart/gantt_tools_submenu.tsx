"use client";

import React, { useState, FC } from "react";
import {
  SquarePlus,
  PaintRoller,
  SquarePen,
  Trash2,
  LucideIcon,
  Shuffle,
} from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { IGanttItem } from "@/lib/utils/mermaid_helpers";

// ==========================================
// Info: (20260707 - Julian) 定義與靜態映射表
// ==========================================

export enum GanttColor {
  DEFAULT = "Default (預設灰)",
  NAVY = "Navy (海軍藍)",
  ORANGE = "Orange (高光橘)",
  RED = "Red (警告紅)",
  GREEN = "Green (成功綠)",
  PURPLE = "Purple (質感紫)",
}

export enum GanttTools {
  ADD_TASK = "addTask",
  EDIT_TASK = "editTask",
  CHANGE_COLOR = "changeColor",
  SWAP_TASK = "swapTask",
  DELETE_TASK = "deleteTask",
}

interface IToolItem {
  tool: GanttTools;
  icon: LucideIcon;
}

const GANTT_TOOLS: IToolItem[] = [
  {
    tool: GanttTools.ADD_TASK,
    icon: SquarePlus,
  },
  {
    tool: GanttTools.EDIT_TASK,
    icon: SquarePen,
  },
  {
    tool: GanttTools.CHANGE_COLOR,
    icon: PaintRoller,
  },
  {
    tool: GanttTools.SWAP_TASK,
    icon: Shuffle,
  },
  {
    tool: GanttTools.DELETE_TASK,
    icon: Trash2,
  },
];

const GANTT_TOOL_TRANSLATION_KEYS: Record<GanttTools, string> = {
  [GanttTools.ADD_TASK]: "新增行程",
  [GanttTools.EDIT_TASK]: "編輯行程",
  [GanttTools.CHANGE_COLOR]: "變更行程顏色",
  [GanttTools.SWAP_TASK]: "調整任務順序",
  [GanttTools.DELETE_TASK]: "刪除行程",
};

const GANTT_COLOR_TRANSLATION_KEYS: Record<GanttColor, string> = {
  [GanttColor.DEFAULT]: "chart.mermaid.ai_editor.colors.default",
  [GanttColor.NAVY]: "chart.mermaid.ai_editor.colors.navy",
  [GanttColor.ORANGE]: "chart.mermaid.ai_editor.colors.orange",
  [GanttColor.RED]: "chart.mermaid.ai_editor.colors.red",
  [GanttColor.GREEN]: "chart.mermaid.ai_editor.colors.green",
  [GanttColor.PURPLE]: "chart.mermaid.ai_editor.colors.purple",
};

const INSTRUCTION_TEMPLATES = {
  ADD_GANTT_TASK: {
    render: (
      label: string,
      startDate: string,
      endDate: string,
      color?: string,
    ) =>
      `在甘特圖中新增一個任務，名稱為 "${label}"，起始日為 ${startDate}，結束日為 ${endDate}${
        color ? `，顏色為 "${color}"` : ""
      }`,
  },
  EDIT_GANTT_TASK: {
    match: (line: string, targetLabel: string) =>
      line.includes(`修改甘特圖任務 "${targetLabel}"`),
    render: (
      targetLabel: string,
      startDate?: string,
      endDate?: string,
      newSection?: string,
      newLabel?: string,
    ) => {
      const changes: string[] = [];

      if (newSection) {
        changes.push(`搬移到 "${newSection}" 任務群組`);
      }
      if (startDate) {
        changes.push(`起始日改為 ${startDate}`);
      }
      if (endDate) {
        changes.push(`結束日改為 ${endDate}`);
      }
      if (newLabel) {
        changes.push(`名稱改為 "${newLabel}"`);
      }

      if (changes.length === 0) return `修改甘特圖任務 "${targetLabel}"`;

      return `修改甘特圖任務 "${targetLabel}"：${changes.join("，")}`;
    },
  },
  CHANGE_GANTT_COLOR: {
    match: (line: string, targetLabel: string) =>
      line.includes(`將甘特圖任務 "${targetLabel}" 的顏色調整為`),
    render: (targetLabel: string, color: string) =>
      `將甘特圖任務 "${targetLabel}" 的顏色調整為 "${color}"`,
  },
  SWAP_GANTT_TASK: {
    match: (line: string, targetLabel: string) =>
      line.includes(`將甘特圖任務 "${targetLabel}" 與 "`),
    render: (targetLabel: string, targetLabel2: string) => {
      return `將甘特圖任務 "${targetLabel}" 與 "${targetLabel2}" 的順序進行互換`;
    },
  },
  DELETE_GANTT_TASK: {
    match: (line: string, targetLabel: string) =>
      line.includes(`從甘特圖中刪除任務 "${targetLabel}"`),
    render: (targetLabel: string) => `從甘特圖中刪除任務 "${targetLabel}"`,
  },
};

// ==========================================
// Info: (20260707 - Julian) 將每個工具拆分成子元件(sub-panel)
// ==========================================

interface IBasePanelProps {
  parsedGanttItems: IGanttItem[];
  onInsert: (text: string) => void;
  onInsertWithFilter: (
    text: string,
    filterFn: (line: string) => boolean,
  ) => void;
}

// Info: (20260707 - Julian) 「新增行程」面板
const AddTaskPanel: FC<IBasePanelProps> = ({ onInsert }) => {
  const { t } = useTranslation();
  const [ganttSection, setGanttSection] = useState<string>("");
  const [ganttTaskLabel, setGanttTaskLabel] = useState<string>("");
  const [ganttStartDate, setGanttStartDate] = useState<string>("");
  const [ganttEndDate, setGanttEndDate] = useState<string>("");
  const [ganttTaskColor, setGanttTaskColor] = useState<GanttColor | "">("");

  const handleSubmit = () => {
    if (!ganttTaskLabel || !ganttStartDate || !ganttEndDate) return;
    const inst = INSTRUCTION_TEMPLATES.ADD_GANTT_TASK.render(
      ganttTaskLabel,
      ganttStartDate,
      ganttEndDate,
      ganttTaskColor || undefined,
    );
    onInsert(inst);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <SquarePlus size={14} />
        <p>{t("新增行程")}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label
            htmlFor="ganttSection"
            className="text-[10px] font-bold text-slate-500"
          >
            {t("行程群組")}
          </label>
          <input
            id="ganttSection"
            type="text"
            value={ganttSection}
            onChange={(e) => setGanttSection(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
            placeholder={t("請填入行程群組")}
          />
        </div>
        <div>
          <label
            htmlFor="ganttTaskLabel"
            className="text-[10px] font-bold text-slate-500"
          >
            {t("行程名稱")}
            <span className="ml-0.5 text-red-500">*</span>
          </label>
          <input
            id="ganttTaskLabel"
            type="text"
            value={ganttTaskLabel}
            onChange={(e) => setGanttTaskLabel(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
            placeholder={t("請填入行程名稱")!}
          />
        </div>
        <div>
          <label
            htmlFor="ganttTaskStartDate"
            className="text-[10px] font-bold text-slate-500"
          >
            {t("開始日期")}
            <span className="ml-0.5 text-red-500">*</span>
          </label>
          <input
            id="ganttTaskStartDate"
            type="date"
            value={ganttStartDate}
            onChange={(e) => setGanttStartDate(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label
            htmlFor="ganttTaskEndDate"
            className="text-[10px] font-bold text-slate-500"
          >
            {t("結束日期")}
            <span className="ml-0.5 text-red-500">*</span>
          </label>
          <input
            id="ganttTaskEndDate"
            type="date"
            value={ganttEndDate}
            onChange={(e) => setGanttEndDate(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>
      <div className="col-span-2">
        <label
          htmlFor="ganttTaskColor"
          className="text-[10px] font-bold text-slate-500"
        >
          {t("選擇行程顏色")}
        </label>
        <select
          id="ganttTaskColor"
          value={ganttTaskColor}
          onChange={(e) => setGanttTaskColor(e.target.value as GanttColor)}
          className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
        >
          <option value={""}>{t("請選擇行程顏色")}</option>
          {Object.values(GanttColor).map((color) => (
            <option key={color} value={color}>
              {t(GANTT_COLOR_TRANSLATION_KEYS[color])}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!ganttTaskLabel || !ganttStartDate || !ganttEndDate}
        className="w-full cursor-pointer rounded-lg bg-blue-600 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400"
      >
        {t("chart.mermaid.ai_editor.flowchart.insert_instruction")}
      </button>
    </div>
  );
};

// Info: (20260707 - Julian) 「編輯行程」面板
const EditTaskPanel: FC<IBasePanelProps> = ({
  parsedGanttItems,
  onInsertWithFilter,
}) => {
  const { t } = useTranslation();
  const [ganttTaskTarget, setGanttTaskTarget] = useState<string>("");
  const [ganttNewSection, setGanttNewSection] = useState<string>("");
  const [ganttNewLabel, setGanttNewLabel] = useState<string>("");
  const [ganttStartDate, setGanttStartDate] = useState<string>("");
  const [ganttEndDate, setGanttEndDate] = useState<string>("");

  const submitDisabled =
    !ganttTaskTarget ||
    (!ganttStartDate && !ganttEndDate && !ganttNewLabel && !ganttNewSection);

  const handleSubmit = () => {
    if (submitDisabled) return;
    const inst = INSTRUCTION_TEMPLATES.EDIT_GANTT_TASK.render(
      ganttTaskTarget,
      ganttStartDate,
      ganttEndDate,
      ganttNewSection,
      ganttNewLabel || undefined,
    );
    onInsertWithFilter(inst, (line) =>
      INSTRUCTION_TEMPLATES.EDIT_GANTT_TASK.match(line, ganttTaskTarget),
    );
  };

  // Info: (20260707 - Julian) 判斷目標任務是否已被選取
  const isTargetSelected = ganttTaskTarget !== "";

  // Info: (20260707 - Julian) 取得選擇任務所屬的 section
  const targetSection = isTargetSelected
    ? parsedGanttItems.find((item) => item.label === ganttTaskTarget)
        ?.section || ""
    : "";

  // Info: (20260707 - Julian) 取得任務分組 (section) 的選項：排除 targetSection
  const sectionOptions = parsedGanttItems
    .filter((item) => item.type === "section")
    .filter((item) => item.label !== targetSection);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <SquarePen size={14} />
        <p>{t("編輯行程")}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <label
            htmlFor="ganttTaskTarget"
            className="text-[10px] font-bold text-slate-500"
          >
            {t("選擇要編輯的行程")}
            <span className="ml-0.5 text-red-500">*</span>
          </label>
          <select
            id="ganttTaskTarget"
            value={ganttTaskTarget}
            onChange={(e) => setGanttTaskTarget(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
          >
            <option value="">{t("請選擇要編輯的行程")}</option>
            {parsedGanttItems
              .filter((item) => item.type === "task")
              .map((item) => (
                <option key={`gantt-edit-opt-${item.label}`} value={item.label}>
                  {item.section ? `[${item.section}] ` : ""}
                  {item.label}
                </option>
              ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="ganttNewSection"
            className="text-[10px] font-bold text-slate-500"
          >
            {t("變更行程群組")}
          </label>
          <select
            id="ganttNewSection"
            value={ganttNewSection}
            disabled={!isTargetSelected} // Info: (20260707 - Julian) 只有當目標任務被選取時，才能選擇新的分組
            onChange={(e) => setGanttNewSection(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            <option value="">{t("請選擇要變更的行程群組")}</option>
            {sectionOptions.map((item) => (
              <option
                key={`gantt-section-opt-${item.label}`}
                value={item.label}
              >
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="ganttNewLabel"
            className="text-[10px] font-bold text-slate-500"
          >
            {t("變更行程名稱")}
          </label>
          <input
            id="ganttNewLabel"
            type="text"
            value={ganttNewLabel}
            onChange={(e) => setGanttNewLabel(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
            placeholder={t("請輸入新的行程名稱")!}
          />
        </div>
        <div>
          <label
            htmlFor="ganttStartDate"
            className="text-[10px] font-bold text-slate-500"
          >
            {t("變更開始時間")}
          </label>
          <input
            id="ganttStartDate"
            type="date"
            value={ganttStartDate}
            onChange={(e) => setGanttStartDate(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
            placeholder={t("請選擇要變更的開始時間")!}
          />
        </div>
        <div>
          <label
            htmlFor="ganttEndDate"
            className="text-[10px] font-bold text-slate-500"
          >
            {t("變更結束時間")}
          </label>
          <input
            id="ganttEndDate"
            type="date"
            value={ganttEndDate}
            onChange={(e) => setGanttEndDate(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
            placeholder={t("請選擇要變更的結束時間")!}
          />
        </div>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitDisabled}
        className="w-full cursor-pointer rounded-lg bg-blue-600 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400"
      >
        {t("chart.mermaid.ai_editor.flowchart.insert_instruction")}
      </button>
    </div>
  );
};

// Info: (20260707 - Julian) 「變更行程顏色」面板
const ChangeTaskColorPanel: FC<IBasePanelProps> = ({
  parsedGanttItems,
  onInsertWithFilter,
}) => {
  const { t } = useTranslation();
  const [ganttTaskTarget, setGanttTaskTarget] = useState<string>("");
  const [ganttTaskColor, setGanttTaskColor] = useState<GanttColor>(
    GanttColor.DEFAULT,
  );

  const handleSubmit = () => {
    if (!ganttTaskTarget || !ganttTaskColor) return;
    const inst = INSTRUCTION_TEMPLATES.CHANGE_GANTT_COLOR.render(
      ganttTaskTarget,
      ganttTaskColor,
    );
    onInsertWithFilter(inst, (line) =>
      INSTRUCTION_TEMPLATES.CHANGE_GANTT_COLOR.match(line, ganttTaskTarget),
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <PaintRoller size={14} />
        <p>{t("變更行程顏色")}</p>
      </div>
      <div>
        <label
          htmlFor="ganttColorTarget"
          className="text-[10px] font-bold text-slate-500"
        >
          {t("選擇要變更的行程")}
          <span className="ml-0.5 text-red-500">*</span>
        </label>
        <select
          id="ganttColorTarget"
          value={ganttTaskTarget}
          onChange={(e) => setGanttTaskTarget(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
        >
          <option value="">{t("請選擇要變更的行程")}</option>
          {parsedGanttItems
            .filter((item) => item.type === "task")
            .map((item) => (
              <option key={`gantt-color-opt-${item.label}`} value={item.label}>
                {item.label}
              </option>
            ))}
        </select>
      </div>
      <div>
        <label
          htmlFor="ganttTaskColor"
          className="text-[10px] font-bold text-slate-500"
        >
          {t("選擇要變更的顏色")}
          <span className="ml-0.5 text-red-500">*</span>
        </label>
        <select
          id="ganttTaskColor"
          value={ganttTaskColor}
          onChange={(e) => setGanttTaskColor(e.target.value as GanttColor)}
          className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
        >
          {Object.values(GanttColor).map((color) => (
            <option key={color} value={color}>
              {t(GANTT_COLOR_TRANSLATION_KEYS[color])}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!ganttTaskTarget}
        className="w-full cursor-pointer rounded-lg bg-blue-600 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400"
      >
        {t("chart.mermaid.ai_editor.flowchart.insert_instruction")}
      </button>
    </div>
  );
};

// Info: (20260707 - Julian) 「調整行程順序」面板
const SwapTaskPanel: FC<IBasePanelProps> = ({
  parsedGanttItems,
  onInsertWithFilter,
}) => {
  const { t } = useTranslation();
  const [ganttTaskTarget, setGanttTaskTarget] = useState<string>("");
  const [ganttTaskTarget2, setGanttTaskTarget2] = useState<string>("");

  const handleSubmit = () => {
    if (!ganttTaskTarget || !ganttTaskTarget2) return;
    const inst = INSTRUCTION_TEMPLATES.SWAP_GANTT_TASK.render(
      ganttTaskTarget,
      ganttTaskTarget2,
    );
    onInsertWithFilter(inst, (line) =>
      INSTRUCTION_TEMPLATES.SWAP_GANTT_TASK.match(line, ganttTaskTarget),
    );
  };

  // Info: (20260707 - Julian) 取得所有 Task
  const taskOptions = parsedGanttItems.filter((item) => item.type === "task");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <Shuffle size={14} />
        <p>{t("調整行程順序")}</p>
      </div>
      <div>
        <label
          htmlFor="ganttSwapTarget"
          className="text-[10px] font-bold text-slate-500"
        >
          {t("請選擇要交換的行程")}
          <span className="ml-0.5 text-red-500">*</span>
        </label>
        <select
          id="ganttSwapTarget"
          value={ganttTaskTarget}
          onChange={(e) => setGanttTaskTarget(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
        >
          <option value="">{t("請選擇要交換的行程")}</option>
          {taskOptions.map((item) => (
            <option key={`gantt-swap-opt1-${item.label}`} value={item.label}>
              {item.section ? `[${item.section}] ` : ""}
              {item.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label
          htmlFor="ganttSwapTarget2"
          className="text-[10px] font-bold text-slate-500"
        >
          {t("請選擇要交換的行程")}
          <span className="ml-0.5 text-red-500">*</span>
        </label>
        <select
          id="ganttSwapTarget2"
          value={ganttTaskTarget2}
          onChange={(e) => setGanttTaskTarget2(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
        >
          <option value="">{t("請選擇要交換的行程")}</option>
          {taskOptions.map((item) => (
            <option key={`gantt-swap-opt2-${item.label}`} value={item.label}>
              {item.section ? `[${item.section}] ` : ""}
              {item.label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!ganttTaskTarget || !ganttTaskTarget2}
        className="w-full cursor-pointer rounded-lg bg-blue-600 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400"
      >
        {t("chart.mermaid.ai_editor.flowchart.insert_instruction")}
      </button>
    </div>
  );
};

// Info: (20260707 - Julian) 「刪除行程」面板
const DeleteTaskPanel: FC<IBasePanelProps> = ({
  parsedGanttItems,
  onInsertWithFilter,
}) => {
  const { t } = useTranslation();
  const [ganttTaskTarget, setGanttTaskTarget] = useState<string>("");

  const handleSubmit = () => {
    if (!ganttTaskTarget) return;
    const inst =
      INSTRUCTION_TEMPLATES.DELETE_GANTT_TASK.render(ganttTaskTarget);
    onInsertWithFilter(inst, (line) =>
      INSTRUCTION_TEMPLATES.DELETE_GANTT_TASK.match(line, ganttTaskTarget),
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <Trash2 size={14} />
        <p>{t("刪除行程")}</p>
      </div>
      <div>
        <label
          htmlFor="ganttTaskTargetDel"
          className="text-[10px] font-bold text-slate-500"
        >
          {t("請選擇要刪除的行程")}
          <span className="ml-0.5 text-red-500">*</span>
        </label>
        <select
          id="ganttTaskTargetDel"
          value={ganttTaskTarget}
          onChange={(e) => setGanttTaskTarget(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
        >
          <option value="">{t("請選擇要刪除的行程")}</option>
          {parsedGanttItems
            .filter((item) => item.type === "task")
            .map((item) => (
              <option key={`gantt-del-opt-${item.label}`} value={item.label}>
                {item.label}
              </option>
            ))}
        </select>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!ganttTaskTarget}
        className="w-full cursor-pointer rounded-lg bg-blue-600 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400"
      >
        {t("chart.mermaid.ai_editor.flowchart.insert_instruction")}
      </button>
    </div>
  );
};

// ==========================================
// Info: (20260707 - Julian) 工具面板元件映射表
// ==========================================

const GANTT_TOOL_PANELS: Record<GanttTools, FC<IBasePanelProps>> = {
  [GanttTools.ADD_TASK]: AddTaskPanel,
  [GanttTools.EDIT_TASK]: EditTaskPanel,
  [GanttTools.CHANGE_COLOR]: ChangeTaskColorPanel,
  [GanttTools.SWAP_TASK]: SwapTaskPanel,
  [GanttTools.DELETE_TASK]: DeleteTaskPanel,
};

// ==========================================
// Info: (20260707 - Julian) 主元件
// ==========================================

interface IGanttToolsSectionProps {
  selectedTool: string | null;
  setSelectedTool: React.Dispatch<React.SetStateAction<string | null>>;
  parsedGanttItems: IGanttItem[];
  setAiInstruction: React.Dispatch<React.SetStateAction<string>>;
}

export const GanttToolsSection: FC<IGanttToolsSectionProps> = ({
  selectedTool,
  setSelectedTool,
  parsedGanttItems,
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

  const isGanttToolSelected = Object.values(GanttTools).includes(
    selectedTool as GanttTools,
  );

  const ActivePanel = isGanttToolSelected
    ? GANTT_TOOL_PANELS[selectedTool as GanttTools]
    : null;

  return (
    <>
      {/* Info: (20260707 - Julian) 快捷工具選擇列 */}
      <div className="flex flex-wrap gap-1.5">
        {GANTT_TOOLS.map((item) => {
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
              <p>{t(GANTT_TOOL_TRANSLATION_KEYS[item.tool])}</p>
            </button>
          );
        })}
      </div>

      {/* Info: (20260707 - Julian) 快捷工具子面板 - 透過 Mapping 動態載入 */}
      {ActivePanel && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <ActivePanel
            parsedGanttItems={parsedGanttItems}
            onInsert={handleInsertInstruction}
            onInsertWithFilter={handleInsertWithFilter}
          />
        </div>
      )}
    </>
  );
};
