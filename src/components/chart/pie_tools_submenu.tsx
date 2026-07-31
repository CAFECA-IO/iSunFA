import React, { useState, useMemo, FC } from "react";
import { CakeSlice, Slice, Trash2 } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import {
  IToolItem as IToolItemBase,
  IChartPanelProps,
} from "@/interfaces/chart_tools";
import {
  IChartAction,
  MermaidActionType,
  parsePieItems,
} from "@/lib/utils/mermaid_helpers";
import {
  MERMAID_INPUT_STYLE,
  MERMAID_LABEL_STYLE,
  MERMAID_SUBMIT_BUTTON_STYLE,
} from "@/constants/mermaid_chart";
import { SegmentedControl } from "@/components/chart/mermaid_common_components";
import { useDecimalInput } from "@/hooks/use_decimal_input";

// ==========================================
// Info: (20260629 - Julian) 定義與靜態映射表
// ==========================================

enum PieTools {
  ADD_SLICE = "addSlice",
  EDIT_SLICE = "editSlice",
  DELETE_SLICE = "deleteSlice",
}

enum PieValueMode {
  VALUE = "value",
  PROPORTION = "proportion",
}

type IToolItem = IToolItemBase<PieTools>;

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
    tool: PieTools.DELETE_SLICE,
    icon: Trash2,
  },
];

const PIE_TOOL_TRANSLATION_KEYS: Record<PieTools, string> = {
  [PieTools.ADD_SLICE]: "chart.mermaid.ai_editor.pie.add_slice",
  [PieTools.EDIT_SLICE]: "chart.mermaid.ai_editor.pie.edit_slice",
  [PieTools.DELETE_SLICE]: "chart.mermaid.ai_editor.pie.delete_slice",
};

// ==========================================
// Info: (20260629 - Julian) 將每個工具拆分成子元件(sub-panel)
// ==========================================

type IBasePanelProps = IChartPanelProps<
  { label: string; value: number }[],
  IChartAction
>;

// Info: (20260629 - Julian) 「新增項目」面板
const AddSlicePanel: FC<IBasePanelProps> = ({ parsedData, onAddAction }) => {
  const { t } = useTranslation();
  const [pieSliceLabel, setPieSliceLabel] = useState<string>("");
  const [valueMode, setValueMode] = useState<PieValueMode>(PieValueMode.VALUE);

  const isProportion = valueMode === PieValueMode.PROPORTION;

  // Info: (20260714 - Julian) 圓餅圖數值：只允許數字與小數點
  const pieSliceValue = useDecimalInput();

  const handleSubmit = () => {
    if (!pieSliceLabel || !pieSliceValue.value) return;

    let finalValue = parseFloat(pieSliceValue.value);
    if (isProportion) {
      const existingSum = parsedData.reduce((acc, i) => acc + i.value, 0);
      const p = parseFloat(pieSliceValue.value);
      if (p >= 100) {
        // Info: (20260708 - Julian) 若為 100% 則給予一個極大值或依邏輯處理，此處簡單防呆
        finalValue = existingSum * 99;
      } else {
        finalValue = (p * existingSum) / (100 - p);
      }
    }

    onAddAction({
      id: crypto.randomUUID(),
      type: MermaidActionType.PIE_ADD_ITEM,
      description: t("chart.mermaid.ai_editor.pie.action_add_slice", {
        label: pieSliceLabel,
        value: isProportion ? pieSliceValue.value + "%" : pieSliceValue.value,
      }),
      payload: {
        label: pieSliceLabel,
        value: finalValue,
      },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <CakeSlice size={14} />
        <p>{t("chart.mermaid.ai_editor.pie.add_slice_title")}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 flex flex-col">
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
        <div className="col-span-2 flex flex-col">
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="pieSliceValue" className={MERMAID_LABEL_STYLE}>
              {t("chart.mermaid.ai_editor.pie.slice_value_label")}
              <span className="ml-0.5 text-red-500">*</span>
            </label>
            <SegmentedControl
              value={valueMode}
              onChange={(val) => setValueMode(val as PieValueMode)}
              options={[
                {
                  label: t("chart.mermaid.ai_editor.pie.value_mode_value"),
                  value: PieValueMode.VALUE,
                },
                {
                  label: t("chart.mermaid.ai_editor.pie.value_mode_proportion"),
                  value: PieValueMode.PROPORTION,
                },
              ]}
            />
          </div>
          <input
            id="pieSliceValue"
            type="text"
            inputMode="decimal"
            value={pieSliceValue.value}
            onChange={pieSliceValue.onChange}
            className={MERMAID_INPUT_STYLE}
            placeholder={
              isProportion
                ? "例如: 25"
                : t("chart.mermaid.ai_editor.pie.slice_value_placeholder")!
            }
          />
        </div>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!pieSliceLabel || !pieSliceValue.value}
        className={MERMAID_SUBMIT_BUTTON_STYLE}
      >
        {t("chart.mermaid.ai_editor.pie.add_slice")}
      </button>
    </div>
  );
};

// Info: (20260629 - Julian) 「變更標題/數值」面板
const EditSlicePanel: FC<IBasePanelProps> = ({ parsedData, onAddAction }) => {
  const { t } = useTranslation();
  const [pieSliceTarget, setPieSliceTarget] = useState<string>("");
  const [pieSliceNewLabel, setPieSliceNewLabel] = useState<string>("");
  const [valueMode, setValueMode] = useState<PieValueMode>(PieValueMode.VALUE);

  const isProportion = valueMode === PieValueMode.PROPORTION;

  // Info: (20260714 - Julian) 圓餅圖數值：只允許數字與小數點
  const pieSliceValue = useDecimalInput();

  const handleSubmit = () => {
    if (!pieSliceTarget || (!pieSliceValue.value && !pieSliceNewLabel)) return;
    const targetItem = parsedData.find((i) => i.label === pieSliceTarget);
    if (!targetItem) return;

    let finalValue = pieSliceValue.value
      ? parseFloat(pieSliceValue.value)
      : targetItem.value;

    if (pieSliceValue.value && isProportion) {
      const otherSum = parsedData
        .filter((i) => i.label !== pieSliceTarget)
        .reduce((acc, i) => acc + i.value, 0);
      const p = parseFloat(pieSliceValue.value);
      if (p >= 100) {
        finalValue = otherSum * 99;
      } else {
        finalValue = (p * otherSum) / (100 - p);
      }
    }

    onAddAction({
      id: crypto.randomUUID(),
      type: MermaidActionType.PIE_EDIT_ITEM,
      description: t("chart.mermaid.ai_editor.pie.action_edit_slice", {
        target: pieSliceTarget,
      }),
      payload: {
        oldLabel: pieSliceTarget,
        newLabel: pieSliceNewLabel || pieSliceTarget,
        newValue: finalValue,
      },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <Slice size={14} />
        <p>{t("chart.mermaid.ai_editor.pie.edit_slice_title")}</p>
      </div>
      <div className="flex flex-col">
        <label htmlFor="pieSliceTarget" className={MERMAID_LABEL_STYLE}>
          {t("chart.mermaid.ai_editor.pie.select_slice")}
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
          {parsedData.map((item) => (
            <option key={`pie-edit-opt-${item.label}`} value={item.label}>
              {item.label} ({item.value})
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 flex flex-col">
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
        <div className="col-span-2 flex flex-col">
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="pieSliceValueEdit" className={MERMAID_LABEL_STYLE}>
              {t("chart.mermaid.ai_editor.pie.new_value_label")}
            </label>
            <SegmentedControl
              value={valueMode}
              onChange={(val) => setValueMode(val as PieValueMode)}
              options={[
                {
                  label: t("chart.mermaid.ai_editor.pie.value_mode_value"),
                  value: PieValueMode.VALUE,
                },
                {
                  label: t("chart.mermaid.ai_editor.pie.value_mode_proportion"),
                  value: PieValueMode.PROPORTION,
                },
              ]}
            />
          </div>
          <input
            id="pieSliceValueEdit"
            type="text"
            inputMode="decimal"
            value={pieSliceValue.value}
            onChange={pieSliceValue.onChange}
            className={MERMAID_INPUT_STYLE}
            placeholder={
              isProportion
                ? "例如: 25"
                : t("chart.mermaid.ai_editor.pie.new_value_placeholder")!
            }
          />
        </div>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={
          !pieSliceTarget || (!pieSliceValue.value && !pieSliceNewLabel)
        }
        className={MERMAID_SUBMIT_BUTTON_STYLE}
      >
        {t("chart.mermaid.ai_editor.pie.edit_slice")}
      </button>
    </div>
  );
};

// Info: (20260629 - Julian) 「刪除項目」面板
const DeleteSlicePanel: FC<IBasePanelProps> = ({ parsedData, onAddAction }) => {
  const { t } = useTranslation();
  const [pieSliceTarget, setPieSliceTarget] = useState<string>("");

  const handleSubmit = () => {
    if (!pieSliceTarget) return;
    onAddAction({
      id: crypto.randomUUID(),
      type: MermaidActionType.PIE_DELETE_ITEM,
      description: t("chart.mermaid.ai_editor.pie.action_delete_slice", {
        target: pieSliceTarget,
      }),
      payload: {
        label: pieSliceTarget,
      },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <Trash2 size={14} />
        <p>{t("chart.mermaid.ai_editor.pie.delete_slice_title")}</p>
      </div>
      <div className="flex flex-col">
        <label htmlFor="pieSliceTargetDel" className={MERMAID_LABEL_STYLE}>
          {t("chart.mermaid.ai_editor.pie.select_delete")}
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
          {parsedData.map((item) => (
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
        {t("chart.mermaid.ai_editor.pie.delete_slice")}
      </button>
    </div>
  );
};

const PIE_TOOL_PANELS: Record<PieTools, FC<IBasePanelProps>> = {
  [PieTools.ADD_SLICE]: AddSlicePanel,
  [PieTools.EDIT_SLICE]: EditSlicePanel,
  [PieTools.DELETE_SLICE]: DeleteSlicePanel,
};

interface IPieToolsSectionProps {
  selectedTool: string | null;
  setSelectedTool: React.Dispatch<React.SetStateAction<string | null>>;
  chart: string;
  onAddAction: (action: IChartAction) => void;
}

export const PieToolsSection: FC<IPieToolsSectionProps> = ({
  selectedTool,
  setSelectedTool,
  chart,
  onAddAction,
}) => {
  const { t } = useTranslation();

  // Info: (20260716 - Julian) 元件自行解析所需資料，父層只需傳入圖表字串
  const parsedData = useMemo(() => parsePieItems(chart), [chart]);

  const handleAddActionWithReset = (action: IChartAction) => {
    onAddAction(action);
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
