/* eslint-disable */
// ToDo: (20260728 - Julian) 此元件還在開發中
import React, { useState, useMemo, FC, Dispatch, SetStateAction } from "react";
import {
  SquarePlus,
  PencilLine,
  ChartNoAxesCombined,
  Trash2,
  LucideIcon,
  ChevronDown,
  Move3d,
} from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import {
  HistogramTrendType,
  HistogramActionType,
  HISTOGRAM_TREND_META,
  HISTOGRAM_TREND_COLOR_OPTIONS,
} from "@/constants/custom_chart";
import {
  IHistogramItem,
  IHistogramAction,
  IHistogramParseResult,
} from "@/interfaces/custom_chart";
import {
  MERMAID_INPUT_STYLE,
  MERMAID_LABEL_STYLE,
  MERMAID_SUBMIT_BUTTON_STYLE,
} from "@/constants/mermaid_chart";
import { useDecimalInput } from "@/hooks/use_decimal_input";
import { parseHistogramData } from "@/lib/utils/custom_histogram_editor";
import ColorPicker from "@/components/common/color_picker";

// Info: (20260728 - Julian) 直方圖工具 i18n key 前綴，字面值收斂於 locale 檔
const HISTOGRAM_I18N_PREFIX = "chart.custom_chart.histogram";
const MOVER_FALLBACK_LABEL = "new";

enum HistogramTools {
  ADD_ITEM = "addItem",
  EDIT_ITEM = "editItem",
  EDIT_AXIS = "editAxis",
  SWITCH_TREND_LINE = "switchTrendLine",
  DELETE_ITEM = "deleteItem",
}

enum TrainVariant {
  ADD = "add",
  EDIT = "edit",
}

interface IToolItem {
  tool: HistogramTools;
  icon: LucideIcon;
}

interface IBasePanelProps {
  parsedHistogramData: IHistogramParseResult;
  onAddAction: (action: IHistogramAction) => void;
}

interface IDraggingTrainProps {
  // Info: (20260730 - Julian) 既有分箱（順序固定、不可拖曳）；以 lineIndex 升序視為車廂順序
  originalTrain: IHistogramItem[];
  // Info: (20260730 - Julian) 受控值：新項目要插入的 raw 行號（新列將佔用此行、其後既有列順移）
  newLineIndex: number;
  // Info: (20260730 - Julian) 位置變更回報（唯一輸出：決定 newLineIndex）
  setNewLineIndex: Dispatch<SetStateAction<number>>;
  // Info: (20260730 - Julian) 拖曳車廂顯示文字（未提供時：新增模式顯示 "new"，編輯模式顯示該項目原始 label）
  newLabel?: string;
  // Info: (20260730 - Julian) 模式：新增（幽靈新車廂）或編輯（移動既有項目）；預設 add
  variant: TrainVariant;
  // Info: (20260730 - Julian) 編輯模式下要移動的既有項目 lineIndex；未選取時 undefined（不顯示可拖曳車廂）
  movingLineIndex?: number;
  disabled?: boolean;
}

// Info: (20260730 - Julian) 車廂的判別聯集：可拖曳的「移動車廂」(mover) 無 bin；固定車廂帶 bin（型別安全，免非空斷言）
type ICarriage =
  | { readonly isMover: true }
  | { readonly isMover: false; readonly bin: IHistogramItem };

const HISTOGRAM_TOOLS: IToolItem[] = [
  {
    tool: HistogramTools.ADD_ITEM,
    icon: SquarePlus,
  },
  {
    tool: HistogramTools.EDIT_ITEM,
    icon: PencilLine,
  },
  {
    tool: HistogramTools.EDIT_AXIS,
    icon: Move3d,
  },
  {
    tool: HistogramTools.SWITCH_TREND_LINE,
    icon: ChartNoAxesCombined,
  },
  {
    tool: HistogramTools.DELETE_ITEM,
    icon: Trash2,
  },
];

const HISTOGRAM_TOOL_TRANSLATION_KEYS: Record<HistogramTools, string> = {
  [HistogramTools.ADD_ITEM]: `新增項目`,
  [HistogramTools.EDIT_ITEM]: `編輯項目`,
  [HistogramTools.EDIT_AXIS]: `編輯軸線標題`,
  [HistogramTools.SWITCH_TREND_LINE]: `切換趨勢曲線`,
  [HistogramTools.DELETE_ITEM]: `刪除項目`,
};

/**
 * Info: (20260730 - Julian)
 * 由插槽位置換算 newLineIndex：插在某固定車廂之前→取該車廂 lineIndex；插在最末→末車廂 lineIndex + 1；無固定車廂→0。
 */
const posToLineIndex = (fixed: IHistogramItem[], pos: number): number => {
  if (fixed.length === 0) return 0;
  if (pos >= fixed.length) return fixed[fixed.length - 1].lineIndex + 1;
  return fixed[pos].lineIndex;
};

/**
 * Info: (20260730 - Julian)
 * 排序決定元件（列車 / 車廂比喻）：只讓使用者拖曳「移動車廂」（橘色）到任意位置，
 * 決定它要落在的 raw 行號 newLineIndex；其餘車廂順序固定、不可拖曳。兩模式共用同一套定位邏輯：
 * - add：移動車廂為「幽靈新項目」，不屬於 originalTrain，其餘 bins 皆為固定車廂。
 * - edit：移動車廂為 originalTrain 中 movingLineIndex 指定的既有項目，將其自固定集合抽出、其餘為固定車廂；
 *         未指定（未選取）時不顯示移動車廂。
 * 受控 + 單一資料來源：位置完全由 newLineIndex 推導，變更一律透過 setNewLineIndex 回報。
 */
const DraggingTrain: FC<IDraggingTrainProps> = ({
  originalTrain,
  newLineIndex,
  setNewLineIndex,
  newLabel = "",
  variant,
  movingLineIndex,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const isEdit = variant === "edit";

  // Info: (20260730 - Julian) 以 lineIndex 升序為車廂順序（防禦性排序，不假設輸入已排序）
  const ordered = useMemo(
    () => [...originalTrain].sort((a, b) => a.lineIndex - b.lineIndex),
    [originalTrain],
  );

  // Info: (20260730 - Julian) 編輯模式下被移動的既有項目（未選取或找不到則為 null）
  const movingBin = useMemo(
    () =>
      isEdit && movingLineIndex !== undefined
        ? (ordered.find((bin) => bin.lineIndex === movingLineIndex) ?? null)
        : null,
    [isEdit, movingLineIndex, ordered],
  );

  // Info: (20260730 - Julian) 是否顯示可拖曳的移動車廂：新增模式恆有；編輯模式需已選取有效項目
  const showMover = isEdit ? movingBin !== null : true;

  // Info: (20260730 - Julian) 固定車廂集合：編輯模式排除被移動項目；新增模式即全部既有車廂
  const fixedOrdered = useMemo(
    () =>
      movingBin
        ? ordered.filter((bin) => bin.lineIndex !== movingBin.lineIndex)
        : ordered,
    [ordered, movingBin],
  );

  // Info: (20260730 - Julian) 由 newLineIndex 推導移動車廂插槽：lineIndex 小於它的固定車廂數
  const insertPos = useMemo(
    () => fixedOrdered.filter((bin) => bin.lineIndex < newLineIndex).length,
    [fixedOrdered, newLineIndex],
  );

  // Info: (20260730 - Julian) 移動到指定插槽；換算後與現值不同才回報，避免冗餘更新
  const moveTo = (pos: number) => {
    if (disabled || !showMover) return;
    const next = posToLineIndex(fixedOrdered, pos);
    if (next !== newLineIndex) setNewLineIndex(next);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    setIsDragging(true);
    e.dataTransfer.effectAllowed = "move";
    // Info: (20260730 - Julian) 部分瀏覽器需先設定 dataTransfer 才會啟動拖曳
    e.dataTransfer.setData("text/plain", "mover");
  };
  const handleDragEnd = () => setIsDragging(false);

  /**
   * Info: (20260730 - Julian) 拖曳移動車廂經過某固定車廂時，依游標落在左／右半邊，
   * 即時插到該車廂之前或之後（固定車廂彼此順序不變）。
   */
  const handleDragOverCarriage = (
    e: React.DragEvent<HTMLDivElement>,
    fixedOrdinal: number,
  ) => {
    if (!isDragging || disabled) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const isLeftHalf = e.clientX - rect.left < rect.width / 2;
    moveTo(isLeftHalf ? fixedOrdinal : fixedOrdinal + 1);
  };

  // Info: (20260730 - Julian) 鍵盤可及性：移動車廂聚焦後可用左右鍵微調位置
  const handleMoverKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      moveTo(Math.max(0, insertPos - 1));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      moveTo(Math.min(fixedOrdered.length, insertPos + 1));
    }
  };

  // Info: (20260730 - Julian) 目前車廂順序：固定車廂順序不變，移動車廂插在 insertPos（無移動車廂則只列固定車廂）
  const fixedCarriages: ICarriage[] = fixedOrdered.map((bin) => ({
    isMover: false as const,
    bin,
  }));
  const train: ICarriage[] = showMover
    ? [
        ...fixedCarriages.slice(0, insertPos),
        { isMover: true as const },
        ...fixedCarriages.slice(insertPos),
      ]
    : fixedCarriages;

  // Info: (20260730 - Julian) 移動車廂顯示文字：優先輸入值，其次編輯項目原 label，最後 fallback
  const moverLabel =
    newLabel.trim() !== ""
      ? newLabel
      : (movingBin?.label ?? MOVER_FALLBACK_LABEL);

  // Info: (20260730 - Julian) 操作提示：依模式與是否可操作切換文案
  const hint = disabled
    ? t(`請先選擇要編輯的項目`)
    : isEdit
      ? t(`拖曳橘色車廂即可調整此項目的順序`)
      : t(`拖曳橘色車廂即可調整新項目的插入位置`);

  return (
    <div className="flex flex-col gap-2">
      {/**
       * Info: (20260730 - Julian) 容器統一攔截 dragover/drop 並 preventDefault：
       * 讓「放開處必被視為可放置」，抑制 HTML5 DnD 放置失敗時的回彈（snap-back）動畫。
       */}
      <div
        className="flex flex-wrap items-center gap-2"
        onDragOver={(e) => {
          if (isDragging) e.preventDefault();
        }}
        onDrop={(e) => e.preventDefault()}
      >
        {train.map((carriage, i) => {
          if (carriage.isMover) {
            return (
              <div
                key="mover-carriage"
                draggable={!disabled}
                tabIndex={disabled ? -1 : 0}
                aria-label={t(`拖曳或使用左右鍵調整此車廂的位置`)!}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onKeyDown={handleMoverKeyDown}
                className={` ${isDragging ? "opacity-50" : ""} ${disabled ? "cursor-not-allowed border-slate-300 text-slate-300" : "cursor-grab border-orange-400 text-orange-400 active:cursor-grabbing"} relative flex flex-col items-center rounded-sm border px-1.5 py-0.5 text-[10px] font-bold select-none`}
              >
                <span
                  className={`${disabled ? "hidden" : "flex"} absolute -top-2 z-10 size-3 animate-bounce items-center justify-center rounded-full bg-orange-400 text-white`}
                >
                  <ChevronDown size={12} strokeWidth={3} />
                </span>
                {moverLabel}
              </div>
            );
          }
          // Info: (20260730 - Julian) 固定車廂在 fixedOrdered 中的序位（有移動車廂時跳過它）
          const fixedOrdinal = showMover && i > insertPos ? i - 1 : i;
          return (
            <div
              key={`bin-${carriage.bin.lineIndex}`}
              onDragOver={(e) => handleDragOverCarriage(e, fixedOrdinal)}
              className={`${disabled ? "cursor-not-allowed border-slate-300 text-slate-300" : "border-slate-800 text-slate-800"} relative flex flex-col items-center rounded-sm border px-1.5 py-0.5 text-[10px] font-bold select-none`}
            >
              {carriage.bin.label}
            </div>
          );
        })}
      </div>
      {/* Info: (20260730 - Julian) 操作提示 */}
      <p className="text-[10px] text-slate-400">{hint}</p>
    </div>
  );
};

// Info: (20260728 - Julian) 「新增項目」面板
const AddItemPanel: FC<IBasePanelProps> = ({
  parsedHistogramData,
  onAddAction,
}) => {
  const { t } = useTranslation();
  const { bins } = parsedHistogramData;

  // Info: (20260730 - Julian) 新項目預設插在最末：取既有分箱最大 lineIndex + 1（無資料則為 0）
  const newOrder = () =>
    bins.reduce((max, bin) => Math.max(max, bin.lineIndex), -1) + 1;

  const [titleInput, setTitleInput] = useState<string>("");
  const [newLineIndex, setNewLineIndex] = useState<number>(newOrder);

  // Info: (20260728 - Julian) 數值只允許數字與小數點
  const valueInput = useDecimalInput("");

  const isSubmitDisabled = titleInput.trim() === "" || valueInput.isEmpty;

  const handleSubmit = () => {
    if (isSubmitDisabled) return;
    const label = titleInput.trim();
    onAddAction({
      id: crypto.randomUUID(),
      type: HistogramActionType.ADD_ITEM,
      description: `新增項目：${label}`,
      payload: { label, count: valueInput.numValue, lineIndex: newLineIndex },
    });
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <SquarePlus size={14} />
        <p>{t(`新增項目`)}</p>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-col">
          <label htmlFor="newTitleLabel" className={MERMAID_LABEL_STYLE}>
            {t(`新項目標題`)}
            <span className="ml-0.5 text-red-500">*</span>
          </label>
          <input
            id="newTitleLabel"
            type="text"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            className={MERMAID_INPUT_STYLE}
            placeholder={t(`請輸入新項目的標題`)!}
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="newValueLabel" className={MERMAID_LABEL_STYLE}>
            {t(`新項目數值`)}
            <span className="ml-0.5 text-red-500">*</span>
          </label>
          <input
            id="newValueLabel"
            type="text"
            inputMode="decimal"
            value={valueInput.value}
            onChange={valueInput.onChange}
            className={MERMAID_INPUT_STYLE}
            placeholder="0"
          />
        </div>
        <div className="flex flex-col gap-2">
          <p className={MERMAID_LABEL_STYLE}>
            {t(`插入位置`)}
            <span className="ml-0.5 text-red-500">*</span>
          </p>
          {/* Info: (20260728 - Julian) 僅新車廂（橘色）可拖曳；既有車廂順序固定、不可拖曳 */}
          <DraggingTrain
            originalTrain={bins}
            newLineIndex={newLineIndex}
            setNewLineIndex={setNewLineIndex}
            newLabel={titleInput}
            variant={TrainVariant.ADD}
          />
        </div>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitDisabled}
        className={MERMAID_SUBMIT_BUTTON_STYLE}
      >
        {t(`新增項目`)}
      </button>
    </div>
  );
};

// Info: (20260728 - Julian) 「編輯項目」面板
const EditItemPanel: FC<IBasePanelProps> = ({
  parsedHistogramData,
  onAddAction,
}) => {
  const { t } = useTranslation();

  const { bins } = parsedHistogramData;

  const [selectedId, setSelectedId] = useState<number>(0);
  const [titleInput, setTitleInput] = useState<string>("");
  const [newLineIndex, setNewLineIndex] = useState<number>(0);
  // Info: (20260730 - Julian) 數值只允許數字與小數點
  const valueInput = useDecimalInput("");

  const selectedItem = useMemo(
    () => bins.find((item) => item.lineIndex === Number(selectedId)) ?? null,
    [bins, selectedId],
  );

  const isSelected = !!selectedId;
  const isUnchanged =
    titleInput.trim() === selectedItem?.label &&
    valueInput.numValue === selectedItem.count &&
    newLineIndex === selectedItem.lineIndex;
  const isSubmitDisabled =
    !isSelected ||
    isUnchanged ||
    titleInput.trim() === "" ||
    valueInput.isEmpty;

  // Info: (20260730 - Julian) 於選取事件匯入初始值（不使用 effect，避免 hook setter 非穩定造成的依賴問題）
  const handleSelect = (id: number) => {
    setSelectedId(id);
    const item = bins.find((b) => b.lineIndex === id) ?? null;
    setTitleInput(item ? item.label : "");
    setNewLineIndex(item ? item.lineIndex : 0);
    valueInput.setValue(item ? String(item.count) : "");
  };

  const handleSubmit = () => {
    if (isSubmitDisabled || !selectedItem) return;
    const label = titleInput.trim();
    onAddAction({
      id: crypto.randomUUID(),
      type: HistogramActionType.EDIT_ITEM,
      description: `編輯項目：${label}`,
      payload: {
        lineIndex: selectedItem.lineIndex,
        label,
        count: valueInput.numValue,
        newLineIndex,
      },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <PencilLine size={14} />
        <p>{t(`編輯項目`)}</p>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-col">
          <label htmlFor="editItemLabel" className={MERMAID_LABEL_STYLE}>
            {t(`選擇欲編輯的項目`)}
            <span className="ml-0.5 text-red-500">*</span>
          </label>
          <select
            id="editItemLabel"
            value={selectedId}
            onChange={(e) => handleSelect(Number(e.target.value))}
            className={MERMAID_INPUT_STYLE}
          >
            <option value="">{t(`選擇欲編輯的項目`)}</option>
            {bins.map((item) => (
              <option
                key={`histogram-edit-opt-${item.lineIndex}`}
                value={item.lineIndex}
              >
                {item.label}: {item.count}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label htmlFor="editTitleLabel" className={MERMAID_LABEL_STYLE}>
            {t(`編輯項目標題`)}
          </label>
          <input
            id="editTitleLabel"
            type="text"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            className={MERMAID_INPUT_STYLE}
            placeholder={t(`請輸入新項目的標題`)!}
            disabled={!isSelected}
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="editValueLabel" className={MERMAID_LABEL_STYLE}>
            {t(`編輯項目數值`)}
          </label>
          <input
            id="editValueLabel"
            type="text"
            inputMode="decimal"
            value={valueInput.value}
            onChange={valueInput.onChange}
            className={MERMAID_INPUT_STYLE}
            placeholder="0"
            disabled={!isSelected}
          />
        </div>
        <div className="flex flex-col gap-2">
          <p className={MERMAID_LABEL_STYLE}>{t(`變更順序`)}</p>
          <DraggingTrain
            originalTrain={bins}
            newLineIndex={newLineIndex}
            setNewLineIndex={setNewLineIndex}
            newLabel={titleInput}
            variant={TrainVariant.EDIT}
            movingLineIndex={isSelected ? selectedId : undefined}
            disabled={!isSelected}
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

// Info: (20260728 - Julian) 「編輯軸線標題」面板：
const EditAxisPanel: FC<IBasePanelProps> = ({
  parsedHistogramData,
  onAddAction,
}) => {
  const { t } = useTranslation();

  const { xAxis, yAxis } = parsedHistogramData;

  // const initialLeftName = leftSeries ?? "";
  // const initialRightName = rightSeries ?? "";
  // const initialLeftColor = leftColor ?? "";
  // const initialRightColor = rightColor ?? "";

  const initialYTitle = yAxis ?? "";
  const initialXTitle = xAxis ?? "";

  // const [leftTitleInput, setLeftTitleInput] = useState<string>(initialLeftName);
  // const [leftColorInput, setLeftColorInput] =
  //   useState<string>(initialLeftColor);
  // const [rightTitleInput, setRightTitleInput] =
  //   useState<string>(initialRightName);
  // const [rightColorInput, setRightColorInput] =
  //   useState<string>(initialRightColor);

  const [yTitle, setYTitle] = useState<string>(initialYTitle);
  const [xTitle, setXTitle] = useState<string>(initialXTitle);

  const isUnchanged =
    yTitle.trim() === initialYTitle.trim() &&
    xTitle.trim() === initialXTitle.trim();
  const isSubmitDisabled =
    yTitle.trim() === "" || xTitle.trim() === "" || isUnchanged;

  const handleSubmit = () => {
    if (isSubmitDisabled) return;
    onAddAction({
      id: crypto.randomUUID(),
      type: HistogramActionType.EDIT_AXIS,
      description: `編輯軸線標題`,
      payload: { xAxis: xTitle.trim(), yAxis: yTitle.trim() },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <p>{t(`編輯軸線標題`)}</p>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-col">
          <label htmlFor="editYAxisLabel" className={MERMAID_LABEL_STYLE}>
            {t(`Y 軸文字`)}
            <span className="ml-0.5 text-red-500">*</span>
          </label>
          <input
            id="editYAxisLabel"
            type="text"
            value={yTitle}
            onChange={(e) => setYTitle(e.target.value)}
            className={MERMAID_INPUT_STYLE}
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="editXAxisLabel" className={MERMAID_LABEL_STYLE}>
            {t(`X 軸文字`)}
            <span className="ml-0.5 text-red-500">*</span>
          </label>
          <input
            id="editXAxisLabel"
            type="text"
            value={xTitle}
            onChange={(e) => setXTitle(e.target.value)}
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

// Info: (20260728 - Julian) 「切換趨勢曲線」面板
const SwitchTrendLinePanel: FC<IBasePanelProps> = ({
  parsedHistogramData,
  onAddAction,
}) => {
  const { t } = useTranslation();

  const { trend, trendColor } = parsedHistogramData;

  // Info: (20260730 - Julian) 目前趨勢線類型（暫僅支援常態）；預設色由中繼資料取得
  const trendType = trend ?? HistogramTrendType.NORMAL;
  const defaultColor = HISTOGRAM_TREND_META[trendType].defaultColor;

  // Info: (20260730 - Julian) 原始資料 → 初值：trend 有值即為開啟；顏色取 DSL 指定或該類型預設
  const initialShow = trend !== undefined;
  const initialColor = trendColor ?? defaultColor;

  const [isShowTrend, setIsShowTrend] = useState<boolean>(initialShow);
  const [color, setColor] = useState<string>(initialColor);

  // Info: (20260730 - Julian) 未變更（開關與顏色都同原始）時禁用送出；關閉時不比顏色
  const isUnchanged =
    isShowTrend === initialShow &&
    (!isShowTrend || color.toLowerCase() === initialColor.toLowerCase());
  const isSubmitDisabled = isUnchanged;

  const handleSubmit = () => {
    if (isSubmitDisabled) return;
    // Info: (20260730 - Julian) 開啟 → 帶入 trend 與顏色；關閉 → 省略 trend（引擎會移除趨勢線設定列）
    onAddAction({
      id: crypto.randomUUID(),
      type: HistogramActionType.SWITCH_TREND_LINE,
      description: isShowTrend ? `開啟趨勢線` : `關閉趨勢線`,
      payload: isShowTrend ? { trend: trendType, trendColor: color } : {},
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <ChartNoAxesCombined size={14} />
        <p>{t(`切換趨勢曲線`)}</p>
      </div>

      {/* Info: (20260730 - Julian) 開關：開啟／關閉趨勢線 */}
      <div className="flex items-center justify-between">
        <span className={MERMAID_LABEL_STYLE}>
          {t(HISTOGRAM_TREND_META[trendType].label)}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={isShowTrend}
          aria-label={t(`切換趨勢曲線`)!}
          onClick={() => setIsShowTrend((prev) => !prev)}
          className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
            isShowTrend ? "bg-orange-400" : "bg-slate-300"
          }`}
        >
          <span
            className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform ${
              isShowTrend ? "translate-x-0" : "-translate-x-4"
            }`}
          />
        </button>
      </div>

      {/* Info: (20260730 - Julian) 顏色：僅在開啟時可調整 */}
      {isShowTrend && (
        <div className="flex flex-col gap-1.5">
          <span className={MERMAID_LABEL_STYLE}>{t(`趨勢線顏色`)}</span>
          <ColorPicker
            colorOptions={HISTOGRAM_TREND_COLOR_OPTIONS}
            value={color}
            onChange={setColor}
          />
        </div>
      )}

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

// Info: (20260728 - Julian) 「刪除項目」面板
const DeleteItemPanel: FC<IBasePanelProps> = ({
  parsedHistogramData,
  onAddAction,
}) => {
  const { t } = useTranslation();

  const { bins } = parsedHistogramData;

  const [selectedId, setSelectedId] = useState<string>("");

  const handleSubmit = () => {
    if (!selectedId) return;
    const selectedItem =
      bins.find((item) => item.lineIndex === Number(selectedId)) ?? null;
    if (!selectedItem) return;
    onAddAction({
      id: crypto.randomUUID(),
      type: HistogramActionType.DELETE_ITEM,
      description: `刪除項目：${selectedItem.label}`,
      payload: { lineIndex: selectedItem.lineIndex },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <Trash2 size={14} />
        <p>{t(`刪除項目`)}</p>
      </div>
      <div className="flex flex-col">
        <label htmlFor="deleteItemLabel" className={MERMAID_LABEL_STYLE}>
          {t(`選擇欲刪除的項目`)}
          <span className="ml-0.5 text-red-500">*</span>
        </label>
        <select
          id="deleteItemLabel"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className={MERMAID_INPUT_STYLE}
        >
          <option value="">{t(`選擇欲刪除的項目`)}</option>
          {bins.map((item) => (
            <option
              key={`histogram-delete-opt-${item.lineIndex}`}
              value={item.lineIndex}
            >
              {item.label}: {item.count}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!selectedId}
        className={MERMAID_SUBMIT_BUTTON_STYLE}
      >
        {t(`刪除項目`)}
      </button>
    </div>
  );
};

const HISTOGRAM_TOOL_PANELS: Record<HistogramTools, FC<IBasePanelProps>> = {
  [HistogramTools.ADD_ITEM]: AddItemPanel,
  [HistogramTools.EDIT_ITEM]: EditItemPanel,
  [HistogramTools.EDIT_AXIS]: EditAxisPanel,
  [HistogramTools.SWITCH_TREND_LINE]: SwitchTrendLinePanel,
  [HistogramTools.DELETE_ITEM]: DeleteItemPanel,
};

interface IHistogramToolsSectionProps {
  selectedTool: string | null;
  setSelectedTool: React.Dispatch<React.SetStateAction<string | null>>;
  chart: string;
  onAddAction: (action: IHistogramAction) => void;
}

export const HistogramToolsSection: FC<IHistogramToolsSectionProps> = ({
  selectedTool,
  setSelectedTool,
  chart,
  onAddAction,
}) => {
  const { t } = useTranslation();

  // Info: (20260728 - Julian) 元件自行解析所需資料，父層只需傳入圖表字串
  const parsedHistogramData = useMemo(() => parseHistogramData(chart), [chart]);

  // Info: (20260728 - Julian) 送出動作後收合面板，回到工具選擇列
  const handleAddActionWithReset = (action: IHistogramAction) => {
    onAddAction(action);
    setSelectedTool(null);
  };

  const isHistogramToolSelected = Object.values(HistogramTools).includes(
    selectedTool as HistogramTools,
  );

  const ActivePanel = isHistogramToolSelected
    ? HISTOGRAM_TOOL_PANELS[selectedTool as HistogramTools]
    : null;

  return (
    <>
      {/* Info: (20260728 - Julian) 快捷工具選擇列 */}
      <div className="flex flex-wrap gap-1.5">
        {HISTOGRAM_TOOLS.map((item) => {
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
              <p>{t(HISTOGRAM_TOOL_TRANSLATION_KEYS[item.tool])}</p>
            </button>
          );
        })}
      </div>

      {ActivePanel && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <ActivePanel
            parsedHistogramData={parsedHistogramData}
            onAddAction={handleAddActionWithReset}
          />
        </div>
      )}
    </>
  );
};
