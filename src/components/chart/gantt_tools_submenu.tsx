"use client";

import React, { useState, FC } from "react";
import {
  SquarePlus,
  SquarePen,
  Trash2,
  Tag,
  LucideIcon,
  Shuffle,
} from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { IGanttItem } from "@/lib/utils/mermaid_helpers";
import {
  MERMAID_INPUT_STYLE,
  MERMAID_LABEL_STYLE,
  MERMAID_SUBMIT_BUTTON_STYLE,
  MERMAID_TOGGLE_BUTTON_STYLE,
} from "@/constants/mermaid_chart";

// ==========================================
// Info: (20260707 - Julian) 定義與靜態映射表
// ==========================================

export enum GanttTools {
  ADD_TASK = "addTask",
  EDIT_TASK = "editTask",
  CHANGE_TASK_TYPE = "changeTaskType",
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
    tool: GanttTools.CHANGE_TASK_TYPE,
    icon: Tag,
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
  [GanttTools.CHANGE_TASK_TYPE]: "變更行程類型",
  [GanttTools.SWAP_TASK]: "調整任務順序",
  [GanttTools.DELETE_TASK]: "刪除行程",
};

const INSTRUCTION_TEMPLATES = {
  ADD_GANTT_TASK: {
    render: (
      label: string,
      startDate?: string,
      endDate?: string,
      isCrit?: boolean,
      isMilestone?: boolean,
      isDone?: boolean,
      predecessor?: string,
      duration?: string,
    ) => {
      let desc = `在甘特圖中新增一個任務，名稱為 "${label}"`;
      if (predecessor) {
        desc += `，開始時間設定為在任務 "${predecessor}" 之後`;
      } else if (startDate) {
        desc += `，起始日為 ${startDate}`;
      }

      if (isMilestone) {
        desc += `，並標記為「里程碑」(Milestone)`;
      } else {
        if (isCrit) desc += `，標記為「關鍵路徑」(Critical Path)`;
        if (isDone) desc += `，標記為「已完成」(done)`;
        if (duration) {
          desc += `，工期為 ${duration} 天`;
        } else if (endDate) {
          desc += `，結束日為 ${endDate}`;
        }
      }

      return desc;
    },
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
      isCrit?: boolean,
      isMilestone?: boolean,
      isDone?: boolean,
      predecessor?: string,
      duration?: string,
    ) => {
      const changes: string[] = [];
      if (newSection) {
        changes.push(`行程群組(section)改為 "${newSection}"`);
      }
      if (newLabel) {
        changes.push(`名稱改為 "${newLabel}"`);
      }

      if (predecessor) {
        changes.push(`開始時間設定為在任務 "${predecessor}" 之後`);
      } else if (startDate) {
        changes.push(`起始日改為 ${startDate}`);
      }

      if (isMilestone) {
        changes.push(`標記為「里程碑」(Milestone)`);
      } else {
        if (isCrit) {
          changes.push(`標記為「關鍵路徑」(Critical Path)`);
        }
        if (isDone) {
          changes.push(`標記為「已完成」(done)`);
        }
        if (duration) {
          changes.push(`工期改為 ${duration} 天`);
        } else if (endDate) {
          changes.push(`結束日改為 ${endDate}`);
        }
      }

      if (changes.length === 0) return `修改甘特圖任務 "${targetLabel}"`;

      return `修改甘特圖任務 "${targetLabel}"：${changes.join("，")}`;
    },
  },
  CHANGE_GANTT_PROGRESS: {
    match: (line: string, targetLabel: string) =>
      line.includes(`修改甘特圖任務 "${targetLabel}" 的進度`),
    render: (targetLabel: string, progress: number) => {
      let desc = `修改甘特圖任務 "${targetLabel}" 的進度：將目前進度設定為 ${progress}%`;
      if (progress === 100) {
        desc += `，並標記為「已完成」(done)`;
      }
      return desc;
    },
  },
  SWAP_GANTT_TASK: {
    match: (line: string, targetLabel: string) =>
      line.includes(`將甘特圖任務 "${targetLabel}" 與 "`),
    render: (targetLabel: string, targetLabel2: string) => {
      return `將甘特圖任務 "${targetLabel}" 與 "${targetLabel2}" 的順序進行互換`;
    },
  },
  CHANGE_GANTT_TASK_TYPE: {
    match: (line: string, targetLabel: string) =>
      line.includes(`變更甘特圖任務 "${targetLabel}" 的類型`),
    render: (targetLabel: string, type: TaskType) => {
      const typeMap = {
        [TaskType.ACTIVE]: "一般任務",
        [TaskType.CRIT]: "關鍵路徑 (crit)",
        [TaskType.MILESTONE]: "里程碑 (milestone)",
        done: "已完成 (done)",
      };
      return `變更甘特圖任務 "${targetLabel}" 的類型為「${typeMap[type]}」`;
    },
  },
  DELETE_GANTT_TASK: {
    match: (line: string, targetLabel: string) =>
      line.includes(`從甘特圖中刪除任務 "${targetLabel}"`),
    render: (targetLabel: string) => `從甘特圖中刪除任務 "${targetLabel}"`,
  },
};

// ==========================================
// Info: (20260707 - Julian) 定義 UI 所使用的列舉
// ==========================================

enum StartMode {
  DATE = "date",
  PREDECESSOR = "predecessor",
}

enum EndMode {
  DATE = "date",
  DURATION = "duration",
}

enum TaskType {
  ACTIVE = "active",
  CRIT = "crit",
  MILESTONE = "milestone",
  DONE = "done",
}

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

// ==========================================
// Info: (20260707 - Julian) 內部通用小型組件
// ==========================================

/** Info: (20260707 - Julian) 元件分段切換按鈕 (例如: 指定日期 vs 跟隨前置) */
const SegmentedControl: FC<{
  options: { label: string; value: string }[];
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}> = ({ options, value, onChange, disabled = false }) => (
  <div className={MERMAID_TOGGLE_BUTTON_STYLE.container}>
    {options.map((opt) => (
      <button
        key={opt.value}
        type="button"
        disabled={disabled}
        onClick={() => onChange(opt.value)}
        className={`${MERMAID_TOGGLE_BUTTON_STYLE.button} ${
          value === opt.value
            ? MERMAID_TOGGLE_BUTTON_STYLE.active
            : MERMAID_TOGGLE_BUTTON_STYLE.inactive
        }`}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

/** Info: (20260707 - Julian) 行程類型單選按鈕組 */
const TaskTypeRadioGroup: FC<{
  value: TaskType;
  onChange: (val: TaskType) => void;
  name: string;
  disabled?: boolean;
}> = ({ value, onChange, name, disabled = false }) => {
  const { t } = useTranslation();
  return (
    <div>
      <label className={MERMAID_LABEL_STYLE}>{t("行程類型")}</label>
      <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-2">
        {[
          { label: t("一般任務"), value: "normal" },
          { label: t("已完成任務 (done)"), value: "done" },
          { label: t("關鍵路徑 (crit)"), value: "crit" },
          { label: t("里程碑 (milestone)"), value: "milestone" },
        ].map((opt) => (
          <label
            key={opt.value}
            className={`flex items-center gap-1.5 text-[11px] font-bold text-slate-700 ${
              disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              disabled={disabled}
              checked={value === opt.value}
              onChange={() => onChange(opt.value as TaskType)}
              className="size-3.5 accent-blue-600"
            />
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  );
};

// Info: (20260707 - Julian) 「新增行程」面板
const AddTaskPanel: FC<IBasePanelProps> = ({ parsedGanttItems, onInsert }) => {
  const { t } = useTranslation();
  const [ganttSection, setGanttSection] = useState<string>("");
  const [ganttTaskLabel, setGanttTaskLabel] = useState<string>("");
  const [ganttStartDate, setGanttStartDate] = useState<string>("");
  const [ganttEndDate, setGanttEndDate] = useState<string>("");
  const [ganttPredecessor, setGanttPredecessor] = useState<string>("");
  const [ganttDuration, setGanttDuration] = useState<string>("");
  const [ganttTaskType, setGanttTaskType] = useState<TaskType>(TaskType.ACTIVE);

  const [startMode, setStartMode] = useState<StartMode>(StartMode.DATE);
  const [endMode, setEndMode] = useState<EndMode>(EndMode.DATE);

  const isMilestone = ganttTaskType === TaskType.MILESTONE;

  const submitDisabled =
    !ganttTaskLabel ||
    (startMode === StartMode.DATE && !ganttStartDate) ||
    (startMode === StartMode.PREDECESSOR && !ganttPredecessor) ||
    (!isMilestone && endMode === EndMode.DATE && !ganttEndDate) ||
    (!isMilestone && endMode === EndMode.DURATION && !ganttDuration);

  const handleSubmit = () => {
    if (submitDisabled) return;
    let finalInst = INSTRUCTION_TEMPLATES.ADD_GANTT_TASK.render(
      ganttTaskLabel,
      ganttStartDate,
      ganttEndDate,
      ganttTaskType === TaskType.CRIT,
      isMilestone,
      ganttTaskType === TaskType.DONE,
      ganttPredecessor || undefined,
      ganttDuration || undefined,
    );
    if (ganttSection) {
      finalInst = `在甘特圖行程群組(section) "${ganttSection}" 下，${finalInst}`;
    }
    onInsert(finalInst);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <SquarePlus size={14} />
        <p>{t("新增行程")}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="ganttSection" className={MERMAID_LABEL_STYLE}>
            {t("行程群組")}
          </label>
          <input
            id="ganttSection"
            type="text"
            value={ganttSection}
            onChange={(e) => setGanttSection(e.target.value)}
            className={MERMAID_INPUT_STYLE}
            placeholder={t("請填入行程群組")}
          />
        </div>
        <div>
          <label htmlFor="ganttTaskLabel" className={MERMAID_LABEL_STYLE}>
            {t("行程名稱")}
            <span className="ml-0.5 text-red-500">*</span>
          </label>
          <input
            id="ganttTaskLabel"
            type="text"
            value={ganttTaskLabel}
            onChange={(e) => setGanttTaskLabel(e.target.value)}
            className={MERMAID_INPUT_STYLE}
            placeholder={t("請填入行程名稱")!}
          />
        </div>
        <div className="col-span-2">
          <div className="mb-1.5 flex items-center justify-between">
            <label className={MERMAID_LABEL_STYLE}>
              {t("開始時間")}
              <span className="ml-0.5 text-red-500">*</span>
            </label>
            <SegmentedControl
              value={startMode}
              onChange={(val) => {
                setStartMode(val as StartMode);
                if (val === StartMode.DATE) setGanttPredecessor("");
                else setGanttStartDate("");
              }}
              options={[
                { label: t("指定日期"), value: StartMode.DATE },
                { label: t("跟隨前置任務"), value: StartMode.PREDECESSOR },
              ]}
            />
          </div>

          {startMode === StartMode.DATE ? (
            <input
              id="ganttTaskStartDate"
              type="date"
              value={ganttStartDate}
              onChange={(e) => setGanttStartDate(e.target.value)}
              className={MERMAID_INPUT_STYLE}
            />
          ) : (
            <select
              id="ganttPredecessor"
              value={ganttPredecessor}
              onChange={(e) => setGanttPredecessor(e.target.value)}
              className={MERMAID_INPUT_STYLE}
            >
              <option value="">{t("請選擇前置任務")}</option>
              {parsedGanttItems
                .filter((item) => item.type === "task")
                .map((item) => (
                  <option
                    key={`gantt-add-pre-opt-${item.label}`}
                    value={item.label}
                  >
                    {item.label}
                  </option>
                ))}
            </select>
          )}
        </div>

        {!isMilestone && (
          <div className="col-span-2">
            <div className="mb-1.5 flex items-center justify-between">
              <label className={MERMAID_LABEL_STYLE}>
                {t("結束時間")}
                <span className="ml-0.5 text-red-500">*</span>
              </label>
              <SegmentedControl
                value={endMode}
                onChange={(val) => {
                  setEndMode(val as EndMode);
                  if (val === EndMode.DATE) setGanttDuration("");
                  else setGanttEndDate("");
                }}
                options={[
                  { label: t("指定日期"), value: EndMode.DATE },
                  { label: t("填寫工期天數"), value: "duration" },
                ]}
              />
            </div>

            {endMode === "date" ? (
              <input
                id="ganttTaskEndDate"
                type="date"
                value={ganttEndDate}
                onChange={(e) => setGanttEndDate(e.target.value)}
                className={MERMAID_INPUT_STYLE}
              />
            ) : (
              <input
                id="ganttDuration"
                type="number"
                min="1"
                value={ganttDuration}
                onChange={(e) => setGanttDuration(e.target.value)}
                className={MERMAID_INPUT_STYLE}
                placeholder={t("填入工期天數 (例: 3)")!}
              />
            )}
          </div>
        )}
      </div>

      <TaskTypeRadioGroup
        name="ganttAddTaskType"
        value={ganttTaskType}
        onChange={(val) => {
          setGanttTaskType(val as TaskType);
          if (val === TaskType.MILESTONE) {
            setGanttEndDate("");
            setGanttDuration("");
          }
        }}
      />

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitDisabled}
        className={MERMAID_SUBMIT_BUTTON_STYLE}
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
  const [ganttPredecessor, setGanttPredecessor] = useState<string>("");
  const [ganttDuration, setGanttDuration] = useState<string>("");

  const [startMode, setStartMode] = useState<"date" | "predecessor">("date");
  const [endMode, setEndMode] = useState<"date" | "duration">("date");

  const isMilestone = false;

  const submitDisabled =
    !ganttTaskTarget ||
    (startMode === "date" &&
      !ganttStartDate &&
      endMode === "date" &&
      !ganttEndDate &&
      !ganttNewLabel &&
      !ganttNewSection &&
      !ganttDuration) ||
    (startMode === "predecessor" &&
      !ganttPredecessor &&
      endMode === "date" &&
      !ganttEndDate &&
      !ganttNewLabel &&
      !ganttNewSection &&
      !ganttDuration);

  const handleSubmit = () => {
    if (submitDisabled) return;
    const inst = INSTRUCTION_TEMPLATES.EDIT_GANTT_TASK.render(
      ganttTaskTarget,
      ganttStartDate,
      ganttEndDate,
      ganttNewSection,
      ganttNewLabel || undefined,
      undefined,
      undefined,
      undefined,
      ganttPredecessor || undefined,
      ganttDuration || undefined,
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
          <label htmlFor="ganttTaskTarget" className={MERMAID_LABEL_STYLE}>
            {t("選擇要編輯的行程")}
            <span className="ml-0.5 text-red-500">*</span>
          </label>
          <select
            id="ganttTaskTarget"
            value={ganttTaskTarget}
            onChange={(e) => setGanttTaskTarget(e.target.value)}
            className={MERMAID_INPUT_STYLE}
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
          <label htmlFor="ganttNewSection" className={MERMAID_LABEL_STYLE}>
            {t("變更行程群組")}
          </label>
          <select
            id="ganttNewSection"
            value={ganttNewSection}
            disabled={!isTargetSelected}
            onChange={(e) => setGanttNewSection(e.target.value)}
            className={MERMAID_INPUT_STYLE}
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
          <label htmlFor="ganttNewLabel" className={MERMAID_LABEL_STYLE}>
            {t("變更行程名稱")}
          </label>
          <input
            id="ganttNewLabel"
            type="text"
            value={ganttNewLabel}
            disabled={!isTargetSelected}
            onChange={(e) => setGanttNewLabel(e.target.value)}
            className={MERMAID_INPUT_STYLE}
            placeholder={t("請輸入新的行程名稱")!}
          />
        </div>
        <div className="col-span-2">
          <div className="mb-1.5 flex items-center justify-between">
            <label className={MERMAID_LABEL_STYLE}>{t("變更開始時間")}</label>
            <SegmentedControl
              value={startMode}
              onChange={(val) => {
                setStartMode(val as StartMode);
                if (val === StartMode.DATE) setGanttPredecessor("");
                else setGanttStartDate("");
              }}
              options={[
                { label: t("指定日期"), value: StartMode.DATE },
                { label: t("跟隨前置任務"), value: StartMode.PREDECESSOR },
              ]}
            />
          </div>

          {startMode === StartMode.DATE ? (
            <input
              type="date"
              value={ganttStartDate}
              disabled={!isTargetSelected}
              onChange={(e) => setGanttStartDate(e.target.value)}
              className={MERMAID_INPUT_STYLE}
            />
          ) : (
            <select
              value={ganttPredecessor}
              disabled={!isTargetSelected}
              onChange={(e) => setGanttPredecessor(e.target.value)}
              className={MERMAID_INPUT_STYLE}
            >
              <option value="">{t("請選擇前置任務")}</option>
              {parsedGanttItems
                .filter(
                  (item) =>
                    item.type === "task" && item.label !== ganttTaskTarget,
                )
                .map((item) => (
                  <option
                    key={`gantt-edit-pre-opt-${item.label}`}
                    value={item.label}
                  >
                    {item.label}
                  </option>
                ))}
            </select>
          )}
        </div>

        {!isMilestone && (
          <div className="col-span-2">
            <div className="mb-1.5 flex items-center justify-between">
              <label className={MERMAID_LABEL_STYLE}>{t("變更結束時間")}</label>
              <SegmentedControl
                value={endMode}
                onChange={(val) => {
                  setEndMode(val as EndMode);
                  if (val === EndMode.DATE) setGanttDuration("");
                  else setGanttEndDate("");
                }}
                options={[
                  { label: t("指定日期"), value: EndMode.DATE },
                  { label: t("填寫工期天數"), value: "duration" },
                ]}
              />
            </div>

            {endMode === "date" ? (
              <input
                type="date"
                value={ganttEndDate}
                disabled={!isTargetSelected}
                onChange={(e) => setGanttEndDate(e.target.value)}
                className={MERMAID_INPUT_STYLE}
              />
            ) : (
              <input
                type="number"
                min="1"
                value={ganttDuration}
                disabled={!isTargetSelected}
                onChange={(e) => setGanttDuration(e.target.value)}
                className={MERMAID_INPUT_STYLE}
                placeholder={t("填入工期天數 (例: 3)")!}
              />
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitDisabled}
        className={MERMAID_SUBMIT_BUTTON_STYLE}
      >
        {t("chart.mermaid.ai_editor.flowchart.insert_instruction")}
      </button>
    </div>
  );
};

// Info: (20260707 - Julian) 「變更行程類型」面板
const ChangeTaskTypePanel: FC<IBasePanelProps> = ({
  parsedGanttItems,
  onInsertWithFilter,
}) => {
  const { t } = useTranslation();
  const [ganttTaskTarget, setGanttTaskTarget] = useState<string>("");
  const [ganttTaskType, setGanttTaskType] = useState<TaskType>(TaskType.ACTIVE);

  const handleSubmit = () => {
    if (!ganttTaskTarget) return;
    const inst = INSTRUCTION_TEMPLATES.CHANGE_GANTT_TASK_TYPE.render(
      ganttTaskTarget,
      ganttTaskType,
    );
    onInsertWithFilter(inst, (line) =>
      INSTRUCTION_TEMPLATES.CHANGE_GANTT_TASK_TYPE.match(line, ganttTaskTarget),
    );
  };

  const isTargetSelected = ganttTaskTarget !== "";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <Tag size={14} />
        <p>{t("變更行程類型")}</p>
      </div>
      <div>
        <label htmlFor="ganttTypeTarget" className={MERMAID_LABEL_STYLE}>
          {t("選擇要變更的行程")}
          <span className="ml-0.5 text-red-500">*</span>
        </label>
        <select
          id="ganttTypeTarget"
          value={ganttTaskTarget}
          onChange={(e) => setGanttTaskTarget(e.target.value)}
          className={MERMAID_INPUT_STYLE}
        >
          <option value="">{t("請選擇要變更的行程")}</option>
          {parsedGanttItems
            .filter((item) => item.type === "task")
            .map((item) => (
              <option key={`gantt-type-opt-${item.label}`} value={item.label}>
                {item.section ? `[${item.section}] ` : ""}
                {item.label}
              </option>
            ))}
        </select>
      </div>

      <TaskTypeRadioGroup
        name="ganttChangeTaskType"
        disabled={!isTargetSelected}
        value={ganttTaskType}
        onChange={(val) => setGanttTaskType(val)}
      />

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!isTargetSelected}
        className={MERMAID_SUBMIT_BUTTON_STYLE}
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
        <label htmlFor="ganttSwapTarget" className={MERMAID_LABEL_STYLE}>
          {t("請選擇要交換的行程")}
          <span className="ml-0.5 text-red-500">*</span>
        </label>
        <select
          id="ganttSwapTarget"
          value={ganttTaskTarget}
          onChange={(e) => setGanttTaskTarget(e.target.value)}
          className={MERMAID_INPUT_STYLE}
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
        <label htmlFor="ganttSwapTarget2" className={MERMAID_LABEL_STYLE}>
          {t("請選擇要交換的行程")}
          <span className="ml-0.5 text-red-500">*</span>
        </label>
        <select
          id="ganttSwapTarget2"
          value={ganttTaskTarget2}
          onChange={(e) => setGanttTaskTarget2(e.target.value)}
          className={MERMAID_INPUT_STYLE}
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
        className={MERMAID_SUBMIT_BUTTON_STYLE}
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
        <label htmlFor="ganttTaskTargetDel" className={MERMAID_LABEL_STYLE}>
          {t("請選擇要刪除的行程")}
          <span className="ml-0.5 text-red-500">*</span>
        </label>
        <select
          id="ganttTaskTargetDel"
          value={ganttTaskTarget}
          onChange={(e) => setGanttTaskTarget(e.target.value)}
          className={MERMAID_INPUT_STYLE}
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
        className={MERMAID_SUBMIT_BUTTON_STYLE}
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
  [GanttTools.CHANGE_TASK_TYPE]: ChangeTaskTypePanel,
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
