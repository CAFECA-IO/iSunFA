import React, { useState, useMemo, FC } from "react";
import {
  Settings2,
  ListPlus,
  PencilLine,
  SwatchBook,
  Trash2,
  LucideIcon,
} from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { TornadoActionType, TornadoMode } from "@/constants/custom_chart";
import { ITornadoAction, ITornadoParseResult } from "@/interfaces/custom_chart";
import { parseTornadoData } from "@/lib/utils/custom_tornado_editor";
import {
  MERMAID_INPUT_STYLE,
  MERMAID_LABEL_STYLE,
  MERMAID_SUBMIT_BUTTON_STYLE,
} from "@/constants/mermaid_chart";
import { SegmentedControl } from "@/components/chart/mermaid_common_components";
import { DEFAULT_COLORS } from "@/components/common/donut_chart";
import ColorPicker from "@/components/common/color_picker";
import { useDecimalInput } from "@/hooks/use_decimal_input";

enum TornadoTools {
  EDIT_SETTINGS = "editSettings",
  ADD_ITEM = "addItem",
  EDIT_ITEM = "editItem",
  EDIT_GROUP = "editGroup",
  DELETE_ITEM = "deleteItem",
}

interface IToolItem {
  tool: TornadoTools;
  icon: LucideIcon;
}

const TORNADO_TOOLS: IToolItem[] = [
  {
    tool: TornadoTools.EDIT_SETTINGS,
    icon: Settings2,
  },
  {
    tool: TornadoTools.ADD_ITEM,
    icon: ListPlus,
  },
  {
    tool: TornadoTools.EDIT_ITEM,
    icon: PencilLine,
  },
  {
    tool: TornadoTools.EDIT_GROUP,
    icon: SwatchBook,
  },
  {
    tool: TornadoTools.DELETE_ITEM,
    icon: Trash2,
  },
];

const TORNADO_TOOL_TRANSLATION_KEYS: Record<TornadoTools, string> = {
  [TornadoTools.EDIT_SETTINGS]: `圖表設定`,
  [TornadoTools.ADD_ITEM]: `新增分析項目`,
  [TornadoTools.EDIT_ITEM]: `編輯項目數值`,
  [TornadoTools.EDIT_GROUP]: `編輯項目分組`,
  [TornadoTools.DELETE_ITEM]: `刪除分析項目`,
};

interface IBasePanelProps {
  parsedTornadoData: ITornadoParseResult;
  onAddAction: (action: ITornadoAction) => void;
}

// Info: (20260723 - Julian) 「圖表設定」面板：切換圖表型別（比較型／敏感度型）、單位、基準值
const ChartSettingsPanel: FC<IBasePanelProps> = ({
  parsedTornadoData,
  onAddAction,
}) => {
  const { t } = useTranslation();

  const { mode, unit, baseline } = parsedTornadoData;
  const initialMode = mode ?? TornadoMode.COMPARE;
  const initialUnit = unit ?? "";
  const initialBaseline = baseline !== undefined ? String(baseline) : "";

  const [modeInput, setModeInput] = useState<TornadoMode>(initialMode);
  const [unitInput, setUnitInput] = useState<string>(initialUnit);

  // Info: (20260723 - Julian) 基準值：只允許數字與小數點（可為負，如負的 base-case NPV）
  const baselineField = useDecimalInput(initialBaseline, {
    allowNegative: true,
  });

  const isSensitivity = modeInput === TornadoMode.SENSITIVITY;

  // Info: (20260723 - Julian) 基準值由 useDecimalInput 保證僅含數字，故只需比對是否有變更
  const isUnchanged =
    modeInput === initialMode &&
    unitInput.trim() === initialUnit.trim() &&
    baselineField.value.trim() === initialBaseline.trim();
  const isSubmitDisabled = isUnchanged;

  const handleSubmit = () => {
    if (isSubmitDisabled) return;
    const nextBaseline =
      isSensitivity && !baselineField.isEmpty
        ? baselineField.numValue
        : undefined;
    onAddAction({
      id: crypto.randomUUID(),
      type: TornadoActionType.EDIT_SETTINGS,
      description: `圖表設定（${
        isSensitivity ? t(`敏感度型`) : t(`比較型`)
      }${unitInput.trim() ? `・${unitInput.trim()}` : ""}）`,
      payload: {
        mode: modeInput,
        unit: unitInput.trim(),
        ...(nextBaseline !== undefined ? { baseline: nextBaseline } : {}),
      },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <Settings2 size={14} />
        <p>{t(`圖表設定`)}</p>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-1">
          <label className={MERMAID_LABEL_STYLE}>{t(`圖表型別`)}</label>
          <SegmentedControl
            options={[
              { value: TornadoMode.COMPARE, label: t(`比較型`) },
              { value: TornadoMode.SENSITIVITY, label: t(`敏感度型`) },
            ]}
            value={modeInput}
            onChange={(val) => setModeInput(val as TornadoMode)}
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="editUnitLabel" className={MERMAID_LABEL_STYLE}>
            {t(`單位`)}
          </label>
          <input
            id="editUnitLabel"
            type="text"
            value={unitInput}
            onChange={(e) => setUnitInput(e.target.value)}
            className={MERMAID_INPUT_STYLE}
            placeholder={t(`可留白`)!}
          />
        </div>
        {/* Info: (20260723 - Julian) 基準值僅敏感度型有意義 */}
        {isSensitivity && (
          <div className="flex flex-col">
            <label htmlFor="editBaselineLabel" className={MERMAID_LABEL_STYLE}>
              {t(`基準值`)}
            </label>
            <input
              id="editBaselineLabel"
              type="text"
              inputMode="decimal"
              value={baselineField.value}
              onChange={baselineField.onChange}
              className={MERMAID_INPUT_STYLE}
              placeholder={t(`可留白`)!}
            />
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitDisabled}
        className={MERMAID_SUBMIT_BUTTON_STYLE}
      >
        {t(`套用變更`)}
      </button>
    </div>
  );
};

// Info: (20260723 - Julian) 「新增分析項目」面板
const AddItemPanel: FC<IBasePanelProps> = ({
  parsedTornadoData,
  onAddAction,
}) => {
  const { t } = useTranslation();

  const { mode, leftSeries, rightSeries } = parsedTornadoData;
  const isSensitivity = mode === TornadoMode.SENSITIVITY;
  const leftLabel = leftSeries || (isSensitivity ? t(`負向偏移`) : t(`數值 A`));
  const rightLabel =
    rightSeries || (isSensitivity ? t(`正向偏移`) : t(`數值 B`));

  const [titleInput, setTitleInput] = useState<string>("");
  // Info: (20260723 - Julian) 左右數值：只允許數字與小數點（可為負）
  const leftValue = useDecimalInput("", { allowNegative: true });
  const rightValue = useDecimalInput("", { allowNegative: true });

  const isSubmitDisabled =
    titleInput.trim() === "" || leftValue.isEmpty || rightValue.isEmpty;

  const handleSubmit = () => {
    if (isSubmitDisabled) return;
    const category = titleInput.trim();
    onAddAction({
      id: crypto.randomUUID(),
      type: TornadoActionType.ADD_ITEM,
      description: `新增項目「${category}」`,
      payload: {
        category,
        left: leftValue.numValue,
        right: rightValue.numValue,
      },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <ListPlus size={14} />
        <p>{t(`新增分析項目`)}</p>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-col">
          <label htmlFor="newTitleLabel" className={MERMAID_LABEL_STYLE}>
            {t(`項目標題`)}
            <span className="ml-0.5 text-red-500">*</span>
          </label>
          <input
            id="newTitleLabel"
            type="text"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            className={MERMAID_INPUT_STYLE}
            placeholder={t(`請輸入新項目標題`)!}
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="newLeftValueLabel" className={MERMAID_LABEL_STYLE}>
            {leftLabel}
            <span className="ml-0.5 text-red-500">*</span>
          </label>
          <input
            id="newLeftValueLabel"
            type="text"
            inputMode="decimal"
            value={leftValue.value}
            onChange={leftValue.onChange}
            className={MERMAID_INPUT_STYLE}
            placeholder="0"
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="newRightValueLabel" className={MERMAID_LABEL_STYLE}>
            {rightLabel}
            <span className="ml-0.5 text-red-500">*</span>
          </label>
          <input
            id="newRightValueLabel"
            type="text"
            inputMode="decimal"
            value={rightValue.value}
            onChange={rightValue.onChange}
            className={MERMAID_INPUT_STYLE}
            placeholder="0"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitDisabled}
        className={MERMAID_SUBMIT_BUTTON_STYLE}
      >
        {t(`新增分析項目`)}
      </button>
    </div>
  );
};

// Info: (20260723 - Julian) 「編輯項目數值」面板
const EditItemPanel: FC<IBasePanelProps> = ({
  parsedTornadoData,
  onAddAction,
}) => {
  const { t } = useTranslation();

  const {
    mode,
    bars: itemOptions,
    leftSeries,
    rightSeries,
  } = parsedTornadoData;
  const isSensitivity = mode === TornadoMode.SENSITIVITY;
  const leftLabel = leftSeries || (isSensitivity ? t(`負向偏移`) : t(`數值 A`));
  const rightLabel =
    rightSeries || (isSensitivity ? t(`正向偏移`) : t(`數值 B`));

  const [selectedId, setSelectedId] = useState<string>("");
  const [titleInput, setTitleInput] = useState<string>("");
  // Info: (20260723 - Julian) 左右數值：只允許數字與小數點（可為負）
  const leftValue = useDecimalInput("", { allowNegative: true });
  const rightValue = useDecimalInput("", { allowNegative: true });

  const selectedItem = useMemo(
    () =>
      itemOptions.find((item) => item.lineIndex === Number(selectedId)) ?? null,
    [itemOptions, selectedId],
  );

  // Info: (20260723 - Julian) 於選取事件匯入初始值（不使用 effect，避免 hook setter 非穩定造成的依賴問題）
  const handleSelect = (id: string) => {
    setSelectedId(id);
    const item = itemOptions.find((i) => i.lineIndex === Number(id)) ?? null;
    setTitleInput(item ? item.category : "");
    leftValue.setValue(item ? String(item.left) : "");
    rightValue.setValue(item ? String(item.right) : "");
  };

  const isUnselected = !selectedItem;
  const isUnchanged =
    !!selectedItem &&
    titleInput.trim() === selectedItem.category &&
    leftValue.numValue === selectedItem.left &&
    rightValue.numValue === selectedItem.right;
  const isSubmitDisabled =
    isUnselected ||
    titleInput.trim() === "" ||
    leftValue.isEmpty ||
    rightValue.isEmpty ||
    isUnchanged;

  const handleSubmit = () => {
    if (!selectedItem || isSubmitDisabled) return;
    const category = titleInput.trim();
    onAddAction({
      id: crypto.randomUUID(),
      type: TornadoActionType.EDIT_ITEM,
      description: `編輯項目「${category}」`,
      payload: {
        lineIndex: selectedItem.lineIndex,
        category,
        left: leftValue.numValue,
        right: rightValue.numValue,
      },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <PencilLine size={14} />
        <p>{t(`編輯項目數值`)}</p>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-col">
          <label htmlFor="editIdLabel" className={MERMAID_LABEL_STYLE}>
            {t(`選擇欲編輯的項目`)}
            <span className="ml-0.5 text-red-500">*</span>
          </label>
          <select
            id="editIdLabel"
            value={selectedId}
            onChange={(e) => handleSelect(e.target.value)}
            className={MERMAID_INPUT_STYLE}
          >
            <option value="">{t(`選擇欲編輯的項目`)}</option>
            {itemOptions.map((item) => (
              <option
                key={`tornado-edit-opt-${item.lineIndex}`}
                value={item.lineIndex}
              >
                {item.category}（{item.left} / {item.right}）
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label htmlFor="editTitleLabel" className={MERMAID_LABEL_STYLE}>
            {t(`項目標題`)}
          </label>
          <input
            id="editTitleLabel"
            type="text"
            disabled={isUnselected}
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            className={MERMAID_INPUT_STYLE}
            placeholder={t(`請輸入新項目標題`)!}
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="editLeftValueLabel" className={MERMAID_LABEL_STYLE}>
            {leftLabel}
          </label>
          <input
            id="editLeftValueLabel"
            type="text"
            inputMode="decimal"
            disabled={isUnselected}
            value={leftValue.value}
            onChange={leftValue.onChange}
            className={MERMAID_INPUT_STYLE}
            placeholder="0"
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="editRightValueLabel" className={MERMAID_LABEL_STYLE}>
            {rightLabel}
          </label>
          <input
            id="editRightValueLabel"
            type="text"
            inputMode="decimal"
            disabled={isUnselected}
            value={rightValue.value}
            onChange={rightValue.onChange}
            className={MERMAID_INPUT_STYLE}
            placeholder="0"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitDisabled}
        className={MERMAID_SUBMIT_BUTTON_STYLE}
      >
        {t(`套用變更`)}
      </button>
    </div>
  );
};

// Info: (20260723 - Julian) 「編輯項目分組」面板：設定左右數列名稱與顏色
const EditGroupPanel: FC<IBasePanelProps> = ({
  parsedTornadoData,
  onAddAction,
}) => {
  const { t } = useTranslation();

  const { leftSeries, rightSeries, leftColor, rightColor } = parsedTornadoData;

  const initialLeftName = leftSeries ?? "";
  const initialRightName = rightSeries ?? "";
  const initialLeftColor = leftColor ?? "";
  const initialRightColor = rightColor ?? "";

  const [leftTitleInput, setLeftTitleInput] = useState<string>(initialLeftName);
  const [leftColorInput, setLeftColorInput] =
    useState<string>(initialLeftColor);
  const [rightTitleInput, setRightTitleInput] =
    useState<string>(initialRightName);
  const [rightColorInput, setRightColorInput] =
    useState<string>(initialRightColor);

  const isUnchanged =
    leftTitleInput.trim() === initialLeftName.trim() &&
    rightTitleInput.trim() === initialRightName.trim() &&
    leftColorInput.toLowerCase() === initialLeftColor.toLowerCase() &&
    rightColorInput.toLowerCase() === initialRightColor.toLowerCase();
  const isSubmitDisabled =
    leftTitleInput.trim() === "" ||
    rightTitleInput.trim() === "" ||
    isUnchanged;

  const handleSubmit = () => {
    if (isSubmitDisabled) return;
    onAddAction({
      id: crypto.randomUUID(),
      type: TornadoActionType.EDIT_GROUP,
      description: `編輯數列分組「${leftTitleInput.trim()} / ${rightTitleInput.trim()}」`,
      payload: {
        leftSeries: leftTitleInput.trim(),
        rightSeries: rightTitleInput.trim(),
        ...(leftColorInput.trim() !== "" ? { leftColor: leftColorInput } : {}),
        ...(rightColorInput.trim() !== ""
          ? { rightColor: rightColorInput }
          : {}),
      },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <SwatchBook size={14} />
        <p>{t(`編輯項目分組`)}</p>
      </div>
      <div className="flex gap-2">
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex flex-col">
            <label
              htmlFor="editLeftTitleValueLabel"
              className={MERMAID_LABEL_STYLE}
            >
              {t(`左側數值`)}
              <span className="ml-0.5 text-red-500">*</span>
            </label>
            <input
              id="editLeftTitleValueLabel"
              type="text"
              value={leftTitleInput}
              onChange={(e) => setLeftTitleInput(e.target.value)}
              className={MERMAID_INPUT_STYLE}
            />
          </div>
          <ColorPicker
            colorOptions={DEFAULT_COLORS}
            value={leftColorInput}
            onChange={setLeftColorInput}
          />
        </div>
        <div className="border-l border-dashed border-slate-400"></div>
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex flex-col">
            <label
              htmlFor="editRightTitleValueLabel"
              className={MERMAID_LABEL_STYLE}
            >
              {t(`右側數值`)}
              <span className="ml-0.5 text-red-500">*</span>
            </label>
            <input
              id="editRightTitleValueLabel"
              type="text"
              value={rightTitleInput}
              onChange={(e) => setRightTitleInput(e.target.value)}
              className={MERMAID_INPUT_STYLE}
            />
          </div>
          <ColorPicker
            colorOptions={DEFAULT_COLORS}
            value={rightColorInput}
            onChange={setRightColorInput}
          />
        </div>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitDisabled}
        className={MERMAID_SUBMIT_BUTTON_STYLE}
      >
        {t(`套用變更`)}
      </button>
    </div>
  );
};

// Info: (20260723 - Julian) 「刪除分析項目」面板
const DeleteItemPanel: FC<IBasePanelProps> = ({
  parsedTornadoData,
  onAddAction,
}) => {
  const { t } = useTranslation();

  const { bars: itemOptions } = parsedTornadoData;

  const [selectedId, setSelectedId] = useState<string>("");

  const selectedItem = useMemo(
    () =>
      itemOptions.find((item) => item.lineIndex === Number(selectedId)) ?? null,
    [itemOptions, selectedId],
  );

  const handleSubmit = () => {
    if (!selectedItem) return;
    onAddAction({
      id: crypto.randomUUID(),
      type: TornadoActionType.DELETE_ITEM,
      description: `刪除項目「${selectedItem.category}」`,
      payload: { lineIndex: selectedItem.lineIndex },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <Trash2 size={14} />
        <p>{t(`刪除分析項目`)}</p>
      </div>
      <div className="flex flex-col">
        <label htmlFor="deleteItemLabel" className={MERMAID_LABEL_STYLE}>
          {t(`選擇欲刪除的分析項目`)}
          <span className="ml-0.5 text-red-500">*</span>
        </label>
        <select
          id="deleteItemLabel"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className={MERMAID_INPUT_STYLE}
        >
          <option value="">{t(`選擇欲刪除的分析項目`)}</option>
          {itemOptions.map((item) => (
            <option
              key={`tornado-delete-opt-${item.lineIndex}`}
              value={item.lineIndex}
            >
              {item.category}（{item.left} / {item.right}）
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!selectedItem}
        className={MERMAID_SUBMIT_BUTTON_STYLE}
      >
        {t(`刪除分析項目`)}
      </button>
    </div>
  );
};

const TORNADO_TOOL_PANELS: Record<TornadoTools, FC<IBasePanelProps>> = {
  [TornadoTools.EDIT_SETTINGS]: ChartSettingsPanel,
  [TornadoTools.ADD_ITEM]: AddItemPanel,
  [TornadoTools.EDIT_ITEM]: EditItemPanel,
  [TornadoTools.EDIT_GROUP]: EditGroupPanel,
  [TornadoTools.DELETE_ITEM]: DeleteItemPanel,
};

interface ITornadoToolsSectionProps {
  selectedTool: string | null;
  setSelectedTool: React.Dispatch<React.SetStateAction<string | null>>;
  chart: string;
  onAddAction: (action: ITornadoAction) => void;
}

export const TornadoToolsSection: FC<ITornadoToolsSectionProps> = ({
  selectedTool,
  setSelectedTool,
  chart,
  onAddAction,
}) => {
  const { t } = useTranslation();

  // Info: (20260723 - Julian) 元件自行解析所需資料，父層只需傳入圖表字串
  const parsedTornadoData = useMemo(() => parseTornadoData(chart), [chart]);

  // Info: (20260723 - Julian) 送出動作後收合面板，回到工具選擇列
  const handleAddActionWithReset = (action: ITornadoAction) => {
    onAddAction(action);
    setSelectedTool(null);
  };

  const isTornadoToolSelected = Object.values(TornadoTools).includes(
    selectedTool as TornadoTools,
  );

  const ActivePanel = isTornadoToolSelected
    ? TORNADO_TOOL_PANELS[selectedTool as TornadoTools]
    : null;

  return (
    <>
      {/* Info: (20260723 - Julian) 快捷工具選擇列 */}
      <div className="flex flex-wrap gap-1.5">
        {TORNADO_TOOLS.map((item) => {
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
              <p>{t(TORNADO_TOOL_TRANSLATION_KEYS[item.tool])}</p>
            </button>
          );
        })}
      </div>

      {ActivePanel && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <ActivePanel
            parsedTornadoData={parsedTornadoData}
            onAddAction={handleAddActionWithReset}
          />
        </div>
      )}
    </>
  );
};
