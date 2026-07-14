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
import {
  IGanttItem,
  IChartAction,
  MermaidActionType,
  GanttItemType,
  GanttTaskStatus,
} from "@/lib/utils/mermaid_helpers";
import {
  MERMAID_INPUT_STYLE,
  MERMAID_LABEL_STYLE,
  MERMAID_SUBMIT_BUTTON_STYLE,
} from "@/constants/mermaid_chart";
import { SegmentedControl } from "@/components/chart/mermaid_common_components";
import { useDecimalInput } from "@/hooks/use_decimal_input";

// ==========================================
// Info: (20260707 - Julian) 定義與靜態映射表
// ==========================================

enum GanttTools {
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
  [GanttTools.ADD_TASK]: "chart.mermaid.ai_editor.gantt.add_task",
  [GanttTools.EDIT_TASK]: "chart.mermaid.ai_editor.gantt.edit_task",
  [GanttTools.CHANGE_TASK_TYPE]: "chart.mermaid.ai_editor.gantt.change_type",
  [GanttTools.SWAP_TASK]: "chart.mermaid.ai_editor.gantt.swap_task",
  [GanttTools.DELETE_TASK]: "chart.mermaid.ai_editor.gantt.delete_task",
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
  onAddAction: (action: IChartAction) => void;
}

// ==========================================
// Info: (20260707 - Julian) 內部通用小型組件
// ==========================================

/** Info: (20260707 - Julian) 行程類型單選按鈕組 */
const TaskTypeRadioGroup: FC<{
  value: TaskType;
  onChange: (val: TaskType) => void;
  name: string;
  disabled?: boolean;
}> = ({ value, onChange, name, disabled = false }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col">
      <label className={MERMAID_LABEL_STYLE}>
        {t("chart.mermaid.ai_editor.gantt.task_types.label")}
      </label>
      <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-2">
        {[
          {
            label: t("chart.mermaid.ai_editor.gantt.task_types.normal"),
            value: "active",
          },
          {
            label: t("chart.mermaid.ai_editor.gantt.task_types.done"),
            value: "done",
          },
          {
            label: t("chart.mermaid.ai_editor.gantt.task_types.crit"),
            value: "crit",
          },
          {
            label: t("chart.mermaid.ai_editor.gantt.task_types.milestone"),
            value: "milestone",
          },
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
const AddTaskPanel: FC<IBasePanelProps> = ({
  parsedGanttItems,
  onAddAction,
}) => {
  const { t } = useTranslation();
  const [ganttSection, setGanttSection] = useState<string>("");
  const [ganttTaskLabel, setGanttTaskLabel] = useState<string>("");
  const [ganttStartDate, setGanttStartDate] = useState<string>("");
  const [ganttEndDate, setGanttEndDate] = useState<string>("");
  const [ganttPredecessor, setGanttPredecessor] = useState<string>("");
  const [ganttTaskType, setGanttTaskType] = useState<TaskType>(TaskType.ACTIVE);
  const [startMode, setStartMode] = useState<StartMode>(StartMode.DATE);
  const [endMode, setEndMode] = useState<EndMode>(EndMode.DATE);

  // Info: (20260714 - Julian) 工期天數：只允許數字與小數點
  const ganttDuration = useDecimalInput();

  const isMilestone = ganttTaskType === TaskType.MILESTONE;

  const submitDisabled =
    !ganttTaskLabel ||
    (startMode === StartMode.DATE && !ganttStartDate) ||
    (startMode === StartMode.PREDECESSOR && !ganttPredecessor) ||
    (!isMilestone && endMode === EndMode.DATE && !ganttEndDate) ||
    (!isMilestone && endMode === EndMode.DURATION && !ganttDuration.value);

  const handleSubmit = () => {
    if (submitDisabled) return;

    const start =
      startMode === StartMode.PREDECESSOR
        ? `after ${ganttPredecessor}`
        : ganttStartDate;
    const end =
      endMode === EndMode.DURATION ? `${ganttDuration.value}d` : ganttEndDate;

    onAddAction({
      id: crypto.randomUUID(),
      type: MermaidActionType.GANTT_ADD_TASK,
      description: `新增任務 "${ganttTaskLabel}"`,
      payload: {
        label: ganttTaskLabel,
        section: ganttSection || undefined,
        start,
        end,
        isCrit: ganttTaskType === TaskType.CRIT,
        isMilestone: ganttTaskType === TaskType.MILESTONE,
        isDone: ganttTaskType === TaskType.DONE,
      },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <SquarePlus size={14} />
        <p>{t("chart.mermaid.ai_editor.gantt.add_task")}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col">
          <label htmlFor="ganttSection" className={MERMAID_LABEL_STYLE}>
            {t("chart.mermaid.ai_editor.gantt.section")}
          </label>
          <input
            id="ganttSection"
            type="text"
            value={ganttSection}
            onChange={(e) => setGanttSection(e.target.value)}
            className={MERMAID_INPUT_STYLE}
            placeholder={t("chart.mermaid.ai_editor.gantt.section_placeholder")}
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="ganttTaskLabel" className={MERMAID_LABEL_STYLE}>
            {t("chart.mermaid.ai_editor.gantt.task_name")}
            <span className="ml-0.5 text-red-500">*</span>
          </label>
          <input
            id="ganttTaskLabel"
            type="text"
            value={ganttTaskLabel}
            onChange={(e) => setGanttTaskLabel(e.target.value)}
            className={MERMAID_INPUT_STYLE}
            placeholder={
              t("chart.mermaid.ai_editor.gantt.task_name_placeholder")!
            }
          />
        </div>
        <div className="col-span-2 flex flex-col">
          <div className="mb-1.5 flex items-center justify-between">
            <label className={MERMAID_LABEL_STYLE}>
              {t("chart.mermaid.ai_editor.gantt.start_time")}
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
                {
                  label: t("chart.mermaid.ai_editor.gantt.date_fixed"),
                  value: StartMode.DATE,
                },
                {
                  label: t("chart.mermaid.ai_editor.gantt.follow_predecessor"),
                  value: StartMode.PREDECESSOR,
                },
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
              <option value="">
                {t("chart.mermaid.ai_editor.gantt.select_predecessor")}
              </option>
              {parsedGanttItems
                .filter((item) => item.type === GanttItemType.TASK)
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
          <div className="col-span-2 flex flex-col">
            <div className="mb-1.5 flex items-center justify-between">
              <label className={MERMAID_LABEL_STYLE}>
                {t("chart.mermaid.ai_editor.gantt.end_time")}
                <span className="ml-0.5 text-red-500">*</span>
              </label>
              <SegmentedControl
                value={endMode}
                onChange={(val) => {
                  setEndMode(val as EndMode);
                  if (val === EndMode.DATE) ganttDuration.setValue("");
                  else setGanttEndDate("");
                }}
                options={[
                  {
                    label: t("chart.mermaid.ai_editor.gantt.date_fixed"),
                    value: EndMode.DATE,
                  },
                  {
                    label: t("chart.mermaid.ai_editor.gantt.duration_days"),
                    value: "duration",
                  },
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
                type="text"
                inputMode="numeric"
                value={ganttDuration.value}
                onChange={ganttDuration.onChange}
                className={MERMAID_INPUT_STYLE}
                placeholder={
                  t("chart.mermaid.ai_editor.gantt.duration_placeholder")!
                }
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
            ganttDuration.setValue("");
          }
        }}
      />

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitDisabled}
        className={MERMAID_SUBMIT_BUTTON_STYLE}
      >
        {t("chart.mermaid.ai_editor.gantt.add_task")}
      </button>
    </div>
  );
};

// Info: (20260707 - Julian) 「編輯行程」面板
const EditTaskPanel: FC<IBasePanelProps> = ({
  parsedGanttItems,
  onAddAction,
}) => {
  const { t } = useTranslation();
  const [ganttTaskTarget, setGanttTaskTarget] = useState<string>("");
  const [ganttNewSection, setGanttNewSection] = useState<string>("");
  const [ganttNewLabel, setGanttNewLabel] = useState<string>("");
  const [ganttStartDate, setGanttStartDate] = useState<string>("");
  const [ganttEndDate, setGanttEndDate] = useState<string>("");
  const [ganttPredecessor, setGanttPredecessor] = useState<string>("");
  const [startMode, setStartMode] = useState<"date" | "predecessor">("date");
  const [endMode, setEndMode] = useState<"date" | "duration">("date");

  // Info: (20260714 - Julian) 工期天數：只允許數字與小數點
  const ganttDuration = useDecimalInput();

  const submitDisabled =
    !ganttTaskTarget ||
    (startMode === "date" &&
      !ganttStartDate &&
      endMode === "date" &&
      !ganttEndDate &&
      !ganttNewLabel &&
      !ganttNewSection &&
      !ganttDuration.value) ||
    (startMode === "predecessor" &&
      !ganttPredecessor &&
      endMode === "date" &&
      !ganttEndDate &&
      !ganttNewLabel &&
      !ganttNewSection &&
      !ganttDuration.value);

  const handleSubmit = () => {
    if (submitDisabled) return;

    const targetItem = parsedGanttItems.find(
      (i) => i.label === ganttTaskTarget,
    );
    if (!targetItem) return;

    const start =
      startMode === "predecessor" && ganttPredecessor
        ? `after ${ganttPredecessor}`
        : ganttStartDate || targetItem.start;
    const end =
      endMode === "duration" && ganttDuration.value
        ? `${ganttDuration.value}d`
        : ganttEndDate || targetItem.end;

    onAddAction({
      id: crypto.randomUUID(),
      type: MermaidActionType.GANTT_EDIT_TASK,
      description: `修改任務 "${ganttTaskTarget}"`,
      payload: {
        taskLabel: targetItem.label,
        taskId: targetItem.id,
        label: ganttNewLabel || targetItem.label,
        start,
        end,
        status: targetItem.status,
        id: targetItem.id,
      },
    });
  };

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
        <p>{t("chart.mermaid.ai_editor.gantt.edit_task")}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 flex flex-col">
          <label htmlFor="ganttTaskTarget" className={MERMAID_LABEL_STYLE}>
            {t("chart.mermaid.ai_editor.gantt.select_edit_target")}
            <span className="ml-0.5 text-red-500">*</span>
          </label>
          <select
            id="ganttTaskTarget"
            value={ganttTaskTarget}
            onChange={(e) => setGanttTaskTarget(e.target.value)}
            className={MERMAID_INPUT_STYLE}
          >
            <option value="">
              {t("chart.mermaid.ai_editor.gantt.select_edit_placeholder")}
            </option>
            {parsedGanttItems
              .filter((item) => item.type === GanttItemType.TASK)
              .map((item) => (
                <option key={`gantt-edit-opt-${item.label}`} value={item.label}>
                  {item.section ? `[${item.section}] ` : ""}
                  {item.label}
                </option>
              ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label htmlFor="ganttNewSection" className={MERMAID_LABEL_STYLE}>
            {t("chart.mermaid.ai_editor.gantt.change_section")}
          </label>
          <select
            id="ganttNewSection"
            value={ganttNewSection}
            disabled={!isTargetSelected}
            onChange={(e) => setGanttNewSection(e.target.value)}
            className={MERMAID_INPUT_STYLE}
          >
            <option value="">
              {t("chart.mermaid.ai_editor.gantt.select_change_section")}
            </option>
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
        <div className="flex flex-col">
          <label htmlFor="ganttNewLabel" className={MERMAID_LABEL_STYLE}>
            {t("chart.mermaid.ai_editor.gantt.change_name")}
          </label>
          <input
            id="ganttNewLabel"
            type="text"
            value={ganttNewLabel}
            disabled={!isTargetSelected}
            onChange={(e) => setGanttNewLabel(e.target.value)}
            className={MERMAID_INPUT_STYLE}
            placeholder={
              t("chart.mermaid.ai_editor.gantt.new_name_placeholder")!
            }
          />
        </div>
        <div className="col-span-2 flex flex-col">
          <div className="mb-1.5 flex items-center justify-between">
            <label className={MERMAID_LABEL_STYLE}>
              {t("chart.mermaid.ai_editor.gantt.change_start_time")}
            </label>
            <SegmentedControl
              value={startMode}
              onChange={(val) => {
                setStartMode(val as StartMode);
                if (val === StartMode.DATE) setGanttPredecessor("");
                else setGanttStartDate("");
              }}
              options={[
                {
                  label: t("chart.mermaid.ai_editor.gantt.date_fixed"),
                  value: StartMode.DATE,
                },
                {
                  label: t("chart.mermaid.ai_editor.gantt.follow_predecessor"),
                  value: StartMode.PREDECESSOR,
                },
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
              <option value="">
                {t("chart.mermaid.ai_editor.gantt.select_predecessor")}
              </option>
              {parsedGanttItems
                .filter(
                  (item) =>
                    item.type === GanttItemType.TASK &&
                    item.label !== ganttTaskTarget,
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

        <div className="col-span-2 flex flex-col">
          <div className="mb-1.5 flex items-center justify-between">
            <label className={MERMAID_LABEL_STYLE}>
              {t("chart.mermaid.ai_editor.gantt.change_end_time")}
            </label>
            <SegmentedControl
              value={endMode}
              onChange={(val) => {
                setEndMode(val as EndMode);
                if (val === EndMode.DATE) ganttDuration.setValue("");
                else setGanttEndDate("");
              }}
              options={[
                {
                  label: t("chart.mermaid.ai_editor.gantt.date_fixed"),
                  value: EndMode.DATE,
                },
                {
                  label: t("chart.mermaid.ai_editor.gantt.duration_days"),
                  value: "duration",
                },
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
              type="text"
              inputMode="numeric"
              value={ganttDuration.value}
              disabled={!isTargetSelected}
              onChange={ganttDuration.onChange}
              className={MERMAID_INPUT_STYLE}
              placeholder={
                t("chart.mermaid.ai_editor.gantt.duration_placeholder")!
              }
            />
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitDisabled}
        className={MERMAID_SUBMIT_BUTTON_STYLE}
      >
        {t("chart.mermaid.ai_editor.gantt.edit_task")}
      </button>
    </div>
  );
};

// Info: (20260707 - Julian) 「變更行程類型」面板
const ChangeTaskTypePanel: FC<IBasePanelProps> = ({
  parsedGanttItems,
  onAddAction,
}) => {
  const { t } = useTranslation();
  const [ganttTaskTarget, setGanttTaskTarget] = useState<string>("");
  const [ganttTaskType, setGanttTaskType] = useState<TaskType>(TaskType.ACTIVE);

  const handleSubmit = () => {
    if (!ganttTaskTarget) return;
    const targetItem = parsedGanttItems.find(
      (i) => i.label === ganttTaskTarget,
    );
    if (!targetItem) return;

    onAddAction({
      id: crypto.randomUUID(),
      type: MermaidActionType.GANTT_EDIT_TASK,
      description: `變更任務 "${ganttTaskTarget}" 類型`,
      payload: {
        taskLabel: targetItem.label,
        taskId: targetItem.id,
        label: targetItem.label,
        status:
          ganttTaskType === TaskType.DONE
            ? GanttTaskStatus.DONE
            : ganttTaskType === TaskType.CRIT
              ? GanttTaskStatus.CRIT
              : ganttTaskType === TaskType.MILESTONE
                ? GanttTaskStatus.MILESTONE
                : "",
        id: targetItem.id,
        start: targetItem.start,
        end: targetItem.end,
      },
    });
  };

  const isTargetSelected = ganttTaskTarget !== "";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <Tag size={14} />
        <p>{t("chart.mermaid.ai_editor.gantt.change_type")}</p>
      </div>
      <div className="flex flex-col">
        <label htmlFor="ganttTypeTarget" className={MERMAID_LABEL_STYLE}>
          {t("chart.mermaid.ai_editor.gantt.select_edit_target")}
          <span className="ml-0.5 text-red-500">*</span>
        </label>
        <select
          id="ganttTypeTarget"
          value={ganttTaskTarget}
          onChange={(e) => setGanttTaskTarget(e.target.value)}
          className={MERMAID_INPUT_STYLE}
        >
          <option value="">
            {t("chart.mermaid.ai_editor.gantt.select_edit_placeholder")}
          </option>
          {parsedGanttItems
            .filter((item) => item.type === GanttItemType.TASK)
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
        {t("chart.mermaid.ai_editor.gantt.change_type")}
      </button>
    </div>
  );
};

// Info: (20260707 - Julian) 「調整行程順序」面板
const SwapTaskPanel: FC<IBasePanelProps> = ({
  parsedGanttItems,
  onAddAction,
}) => {
  const { t } = useTranslation();
  const [ganttTaskTarget, setGanttTaskTarget] = useState<string>("");
  const [ganttTaskTarget2, setGanttTaskTarget2] = useState<string>("");

  const handleSubmit = () => {
    if (!ganttTaskTarget || !ganttTaskTarget2) return;
    const item1 = parsedGanttItems.find((i) => i.label === ganttTaskTarget);
    const item2 = parsedGanttItems.find((i) => i.label === ganttTaskTarget2);
    if (!item1 || !item2) return;

    onAddAction({
      id: crypto.randomUUID(),
      type: MermaidActionType.GANTT_SWAP_TASK,
      description: `對調任務 "${ganttTaskTarget}" 與 "${ganttTaskTarget2}"`,
      payload: {
        taskLabel1: item1.label,
        taskId1: item1.id,
        taskLabel2: item2.label,
        taskId2: item2.id,
      },
    });
  };

  const taskOptions = parsedGanttItems.filter((item) => item.type === "task");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <Shuffle size={14} />
        <p>{t("chart.mermaid.ai_editor.gantt.swap_task")}</p>
      </div>
      <div className="flex flex-col">
        <label htmlFor="ganttSwapTarget" className={MERMAID_LABEL_STYLE}>
          {t("chart.mermaid.ai_editor.gantt.swap_target_label")}
          <span className="ml-0.5 text-red-500">*</span>
        </label>
        <select
          id="ganttSwapTarget"
          value={ganttTaskTarget}
          onChange={(e) => setGanttTaskTarget(e.target.value)}
          className={MERMAID_INPUT_STYLE}
        >
          <option value="">
            {t("chart.mermaid.ai_editor.gantt.swap_target_label")}
          </option>
          {taskOptions.map((item) => (
            <option key={`gantt-swap-opt1-${item.label}`} value={item.label}>
              {item.section ? `[${item.section}] ` : ""}
              {item.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col">
        <label htmlFor="ganttSwapTarget2" className={MERMAID_LABEL_STYLE}>
          {t("chart.mermaid.ai_editor.gantt.swap_target_label")}
          <span className="ml-0.5 text-red-500">*</span>
        </label>
        <select
          id="ganttSwapTarget2"
          value={ganttTaskTarget2}
          onChange={(e) => setGanttTaskTarget2(e.target.value)}
          className={MERMAID_INPUT_STYLE}
        >
          <option value="">
            {t("chart.mermaid.ai_editor.gantt.swap_target_label")}
          </option>
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
        {t("chart.mermaid.ai_editor.gantt.swap_task")}
      </button>
    </div>
  );
};

// Info: (20260707 - Julian) 「刪除行程」面板
const DeleteTaskPanel: FC<IBasePanelProps> = ({
  parsedGanttItems,
  onAddAction,
}) => {
  const { t } = useTranslation();
  const [ganttTaskTarget, setGanttTaskTarget] = useState<string>("");

  const handleSubmit = () => {
    if (!ganttTaskTarget) return;
    const targetItem = parsedGanttItems.find(
      (i) => i.label === ganttTaskTarget,
    );
    if (!targetItem) return;

    onAddAction({
      id: crypto.randomUUID(),
      type: MermaidActionType.GANTT_DELETE_TASK,
      description: `刪除任務 "${ganttTaskTarget}"`,
      payload: {
        taskLabel: targetItem.label,
        taskId: targetItem.id,
      },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <Trash2 size={14} />
        <p>{t("chart.mermaid.ai_editor.gantt.delete_task")}</p>
      </div>
      <div className="flex flex-col">
        <label htmlFor="ganttTaskTargetDel" className={MERMAID_LABEL_STYLE}>
          {t("chart.mermaid.ai_editor.gantt.delete_target_label")}
          <span className="ml-0.5 text-red-500">*</span>
        </label>
        <select
          id="ganttTaskTargetDel"
          value={ganttTaskTarget}
          onChange={(e) => setGanttTaskTarget(e.target.value)}
          className={MERMAID_INPUT_STYLE}
        >
          <option value="">
            {t("chart.mermaid.ai_editor.gantt.delete_target_label")}
          </option>
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
        {t("chart.mermaid.ai_editor.gantt.delete_task")}
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
  onAddAction: (action: IChartAction) => void;
}

export const GanttToolsSection: FC<IGanttToolsSectionProps> = ({
  selectedTool,
  setSelectedTool,
  parsedGanttItems,
  onAddAction,
}) => {
  const { t } = useTranslation();

  const handleAddActionWithReset = (action: IChartAction) => {
    onAddAction(action);
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
            onAddAction={handleAddActionWithReset}
          />
        </div>
      )}
    </>
  );
};
