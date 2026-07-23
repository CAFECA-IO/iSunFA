import React, { useState, useMemo, useEffect, FC } from "react";
import {
  UnfoldHorizontal,
  ListPlus,
  PencilLine,
  SwatchBook,
  Trash2,
  LucideIcon,
} from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { TornadoActionType } from "@/constants/custom_chart";
import { ITornadoAction, ITornadoParseResult } from "@/interfaces/custom_chart";
import { parseTornadoData } from "@/lib/utils/custom_tornado_editor";
import {
  MERMAID_INPUT_STYLE,
  MERMAID_LABEL_STYLE,
  MERMAID_SUBMIT_BUTTON_STYLE,
} from "@/constants/mermaid_chart";
import { DEFAULT_COLORS } from "@/components/common/donut_chart";
import ColorPicker from "@/components/common/color_picker";

// Info: (20260723 - Julian) 數值字串是否為有效有限數字
const isFiniteNumberStr = (s: string): boolean =>
  s.trim() !== "" && Number.isFinite(Number(s));

enum TornadoTools {
  EDIT_BASELINE = "editBaseline",
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
    tool: TornadoTools.EDIT_BASELINE,
    icon: UnfoldHorizontal,
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
  [TornadoTools.EDIT_BASELINE]: `編輯基準線`,
  [TornadoTools.ADD_ITEM]: `新增分析項目`,
  [TornadoTools.EDIT_ITEM]: `編輯項目數值`,
  [TornadoTools.EDIT_GROUP]: `編輯項目分組`,
  [TornadoTools.DELETE_ITEM]: `刪除分析項目`,
};

interface IBasePanelProps {
  parsedTornadoData: ITornadoParseResult;
  onAddAction: (action: ITornadoAction) => void;
}

// Info: (20260723 - Julian) 「編輯基準線」面板：設定基準線數值與單位
const EditBaselinePanel: FC<IBasePanelProps> = ({
  parsedTornadoData,
  onAddAction,
}) => {
  const { t } = useTranslation();

  const { baseline, unit } = parsedTornadoData;
  const initialBaseline = baseline !== undefined ? String(baseline) : "";
  const initialUnit = unit ?? "";

  const [valueInput, setValueInput] = useState<string>(initialBaseline);
  const [unitInput, setUnitInput] = useState<string>(initialUnit);

  // Info: (20260723 - Julian) 基準線可留白（代表不變更），有填則須為有效數字
  const isBaselineValid =
    valueInput.trim() === "" || isFiniteNumberStr(valueInput);
  const isUnchanged =
    valueInput.trim() === initialBaseline.trim() &&
    unitInput.trim() === initialUnit.trim();
  const isSubmitDisabled = !isBaselineValid || isUnchanged;

  const handleSubmit = () => {
    if (isSubmitDisabled) return;
    const nextBaseline =
      valueInput.trim() === "" ? undefined : Number(valueInput);
    onAddAction({
      id: crypto.randomUUID(),
      type: TornadoActionType.EDIT_BASELINE,
      description: `編輯基準線${
        nextBaseline !== undefined ? ` 為 ${nextBaseline}` : ""
      }${unitInput.trim() ? `（${unitInput.trim()}）` : ""}`,
      payload: { baseline: nextBaseline, unit: unitInput.trim() },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <UnfoldHorizontal size={14} />
        <p>{t(`編輯基準線`)}</p>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-col">
          <label htmlFor="editBaselineLabel" className={MERMAID_LABEL_STYLE}>
            {t(`基準線數值`)}
          </label>
          <input
            id="editBaselineLabel"
            type="text"
            inputMode="decimal"
            value={valueInput}
            onChange={(e) => setValueInput(e.target.value)}
            className={MERMAID_INPUT_STYLE}
            placeholder={t(`可留白`)!}
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

  const { leftSeries, rightSeries } = parsedTornadoData;

  const [titleInput, setTitleInput] = useState<string>("");
  const [leftValueInput, setLeftValueInput] = useState<string>("");
  const [rightValueInput, setRightValueInput] = useState<string>("");

  const isSubmitDisabled =
    titleInput.trim() === "" ||
    !isFiniteNumberStr(leftValueInput) ||
    !isFiniteNumberStr(rightValueInput);

  const handleSubmit = () => {
    if (isSubmitDisabled) return;
    const category = titleInput.trim();
    onAddAction({
      id: crypto.randomUUID(),
      type: TornadoActionType.ADD_ITEM,
      description: `新增項目「${category}」`,
      payload: {
        category,
        left: Number(leftValueInput),
        right: Number(rightValueInput),
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
            {leftSeries || t(`數值 A`)}
            <span className="ml-0.5 text-red-500">*</span>
          </label>
          <input
            id="newLeftValueLabel"
            type="text"
            inputMode="decimal"
            value={leftValueInput}
            onChange={(e) => setLeftValueInput(e.target.value)}
            className={MERMAID_INPUT_STYLE}
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="newRightValueLabel" className={MERMAID_LABEL_STYLE}>
            {rightSeries || t(`數值 B`)}
            <span className="ml-0.5 text-red-500">*</span>
          </label>
          <input
            id="newRightValueLabel"
            type="text"
            inputMode="decimal"
            value={rightValueInput}
            onChange={(e) => setRightValueInput(e.target.value)}
            className={MERMAID_INPUT_STYLE}
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

  const { bars: itemOptions, leftSeries, rightSeries } = parsedTornadoData;

  const [selectedId, setSelectedId] = useState<string>("");
  const [titleInput, setTitleInput] = useState<string>("");
  const [leftValueInput, setLeftValueInput] = useState<string>("");
  const [rightValueInput, setRightValueInput] = useState<string>("");

  const selectedItem = useMemo(
    () =>
      itemOptions.find((item) => item.lineIndex === Number(selectedId)) ?? null,
    [itemOptions, selectedId],
  );

  // Info: (20260723 - Julian) 選取後匯入初始值
  useEffect(() => {
    if (selectedItem) {
      setTitleInput(selectedItem.category);
      setLeftValueInput(String(selectedItem.left));
      setRightValueInput(String(selectedItem.right));
    } else {
      setTitleInput("");
      setLeftValueInput("");
      setRightValueInput("");
    }
  }, [selectedItem]);

  const isUnselected = !selectedItem;
  const isUnchanged =
    !!selectedItem &&
    titleInput.trim() === selectedItem.category &&
    Number(leftValueInput) === selectedItem.left &&
    Number(rightValueInput) === selectedItem.right;
  const isSubmitDisabled =
    isUnselected ||
    titleInput.trim() === "" ||
    !isFiniteNumberStr(leftValueInput) ||
    !isFiniteNumberStr(rightValueInput) ||
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
        left: Number(leftValueInput),
        right: Number(rightValueInput),
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
            onChange={(e) => setSelectedId(e.target.value)}
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
            {leftSeries || t(`數值 A`)}
          </label>
          <input
            id="editLeftValueLabel"
            type="text"
            inputMode="decimal"
            disabled={isUnselected}
            value={leftValueInput}
            onChange={(e) => setLeftValueInput(e.target.value)}
            className={MERMAID_INPUT_STYLE}
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="editRightValueLabel" className={MERMAID_LABEL_STYLE}>
            {rightSeries || t(`數值 B`)}
          </label>
          <input
            id="editRightValueLabel"
            type="text"
            inputMode="decimal"
            disabled={isUnselected}
            value={rightValueInput}
            onChange={(e) => setRightValueInput(e.target.value)}
            className={MERMAID_INPUT_STYLE}
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
              {t(`數值 A`)}
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
              {t(`數值 B`)}
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
  [TornadoTools.EDIT_BASELINE]: EditBaselinePanel,
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
