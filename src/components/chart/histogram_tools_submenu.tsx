/* eslint-disable */
// ToDo: (20260728 - Julian) 此元件還在開發中
import React, { useState, useMemo, FC, Dispatch, SetStateAction } from "react";
import {
  SlidersHorizontal,
  SquarePlus,
  PencilLine,
  ChartNoAxesCombined,
  Trash2,
  LucideIcon,
  ChevronDown,
} from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
// import { HistogramActionType, HistogramMode } from "@/constants/custom_chart";
import {
  IHistogramItem,
  // IHistogramAction,
  IHistogramParseResult,
} from "@/interfaces/custom_chart";
import {
  MERMAID_INPUT_STYLE,
  MERMAID_LABEL_STYLE,
  MERMAID_SUBMIT_BUTTON_STYLE,
} from "@/constants/mermaid_chart";
// import { SegmentedControl } from "@/components/chart/mermaid_common_components";
import { useDecimalInput } from "@/hooks/use_decimal_input";
import { parseHistogramData } from "@/lib/utils/custom_histogram_editor";

// Info: (20260728 - Julian) 直方圖工具 i18n key 前綴，字面值收斂於 locale 檔
const HISTOGRAM_I18N_PREFIX = "chart.custom_chart.histogram";

enum HistogramTools {
  ADD_ITEM = "addItem",
  EDIT_ITEM = "editItem",
  EDIT_AXIS = "editAxis",
  SWITCH_TREND_LINE = "switchTrendLine",
  DELETE_ITEM = "deleteItem",
}

interface IToolItem {
  tool: HistogramTools;
  icon: LucideIcon;
}

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
    icon: SlidersHorizontal,
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

interface IBasePanelProps {
  parsedHistogramData: IHistogramParseResult;
  onAddAction: any; // (action: IHistogramAction) => void;
}

interface IDraggingTrainProps {
  // Info: (20260730 - Julian) 既有分箱（順序固定、不可拖曳）；以 lineIndex 升序視為車廂順序
  originalTrain: IHistogramItem[];
  // Info: (20260730 - Julian) 受控值：新項目要插入的 raw 行號（新列將佔用此行、其後既有列順移）
  newLineIndex: number;
  // Info: (20260730 - Julian) 位置變更回報（唯一輸出：決定 newLineIndex）
  setNewLineIndex: Dispatch<SetStateAction<number>>;
  // Info: (20260730 - Julian) 新車廂顯示文字（未提供時顯示 "new"）
  newLabel?: string;
}

// Info: (20260730 - Julian) 車廂的判別聯集：新車廂無資料、既有車廂帶 bin（避免非空斷言，型別安全）
type Carriage =
  | { readonly isNew: true }
  | { readonly isNew: false; readonly bin: IHistogramItem };

const NEW_CARRIAGE_FALLBACK_LABEL = "new";

/**
 * Info: (20260730 - Julian)
 * 由插槽位置換算 newLineIndex：插在某既有車廂之前→取該車廂 lineIndex；插在最末→末車廂 lineIndex + 1；無既有車廂→0。
 */
const posToLineIndex = (ordered: IHistogramItem[], pos: number): number => {
  if (ordered.length === 0) return 0;
  if (pos >= ordered.length) return ordered[ordered.length - 1].lineIndex + 1;
  return ordered[pos].lineIndex;
};

/**
 * Info: (20260730 - Julian)
 * 「新增項目」的排序決定元件（列車 / 車廂比喻）：只讓使用者拖曳「新車廂」（橘色）到任意位置，
 * 決定新項目要落在的 raw 行號 newLineIndex；既有車廂順序固定、不可拖曳。
 * 受控 + 單一資料來源：位置完全由 newLineIndex 推導，變更一律透過 setNewLineIndex 回報。
 * 僅 HistogramToolsSection 使用，故與其同檔、不外移。純 UI、決定論、不做數值計算。
 */
const DraggingTrain: FC<IDraggingTrainProps> = ({
  originalTrain,
  newLineIndex,
  setNewLineIndex,
  newLabel = "",
}) => {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Info: (20260730 - Julian) 以 lineIndex 升序為車廂順序（防禦性排序，不假設輸入已排序）
  const ordered = useMemo(
    () => [...originalTrain].sort((a, b) => a.lineIndex - b.lineIndex),
    [originalTrain],
  );

  // Info: (20260730 - Julian) 由 newLineIndex 推導插槽位置：lineIndex 小於它的既有車廂數
  const insertPos = useMemo(
    () => ordered.filter((bin) => bin.lineIndex < newLineIndex).length,
    [ordered, newLineIndex],
  );

  // Info: (20260730 - Julian) 移動新車廂到指定插槽；換算後與現值不同才回報，避免冗餘更新
  const moveTo = (pos: number) => {
    const next = posToLineIndex(ordered, pos);
    if (next !== newLineIndex) setNewLineIndex(next);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    setIsDragging(true);
    e.dataTransfer.effectAllowed = "move";
    // Info: (20260730 - Julian) 部分瀏覽器需先設定 dataTransfer 才會啟動拖曳
    e.dataTransfer.setData("text/plain", "new-carriage");
  };
  const handleDragEnd = () => setIsDragging(false);

  /**
   * Info: (20260730 - Julian) 拖曳新車廂經過某既有車廂時，依游標落在左／右半邊，
   * 即時將新車廂插到該車廂之前或之後（既有車廂彼此順序不變）。
   */
  const handleDragOverCarriage = (
    e: React.DragEvent<HTMLDivElement>,
    binOrdinal: number,
  ) => {
    if (!isDragging) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const isLeftHalf = e.clientX - rect.left < rect.width / 2;
    moveTo(isLeftHalf ? binOrdinal : binOrdinal + 1);
  };

  // Info: (20260730 - Julian) 鍵盤可及性：新車廂聚焦後可用左右鍵微調位置
  const handleNewKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      moveTo(Math.max(0, insertPos - 1));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      moveTo(Math.min(ordered.length, insertPos + 1));
    }
  };

  // Info: (20260730 - Julian) 目前車廂順序：既有車廂固定，新車廂插在 insertPos
  const train: Carriage[] = [
    ...ordered
      .slice(0, insertPos)
      .map((bin) => ({ isNew: false as const, bin })),
    { isNew: true as const },
    ...ordered.slice(insertPos).map((bin) => ({ isNew: false as const, bin })),
  ];

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
          // Info: (20260730 - Julian) 既有車廂在 ordered 中的序位（跳過新車廂本身）
          const binOrdinal = i < insertPos ? i : i - 1;
          if (carriage.isNew) {
            return (
              <div
                key="new-carriage"
                draggable
                tabIndex={0}
                aria-label={t(`拖曳或使用左右鍵調整新項目的插入位置`)!}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onKeyDown={handleNewKeyDown}
                className={`${isDragging ? "opacity-50" : ""} relative flex cursor-grab flex-col items-center rounded-sm border border-orange-400 px-1.5 py-0.5 text-[10px] font-bold text-orange-400 select-none active:cursor-grabbing`}
              >
                <span className="absolute -top-2 z-10 flex size-3 animate-bounce items-center justify-center rounded-full bg-orange-400 text-white">
                  <ChevronDown size={12} strokeWidth={3} />
                </span>
                {newLabel.trim() !== ""
                  ? newLabel
                  : NEW_CARRIAGE_FALLBACK_LABEL}
              </div>
            );
          }
          return (
            <div
              key={`bin-${carriage.bin.lineIndex}`}
              onDragOver={(e) => handleDragOverCarriage(e, binOrdinal)}
              className="relative flex flex-col items-center rounded-sm border border-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-slate-800 select-none"
            >
              {carriage.bin.label}
            </div>
          );
        })}
      </div>
      {/* Info: (20260730 - Julian) 操作提示 */}
      <p className="text-[10px] text-slate-400">
        {t(`拖曳橘色車廂即可調整新項目的插入位置`)}
      </p>
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

  const [titleInput, setTitleInput] = useState<string>("");
  // Info: (20260730 - Julian) 新項目預設插在最末：取既有分箱最大 lineIndex + 1（無資料則為 0）
  const [newLineIndex, setNewLineIndex] = useState<number>(
    () => bins.reduce((max, bin) => Math.max(max, bin.lineIndex), -1) + 1,
  );

  // Info: (20260728 - Julian) 數值只允許數字與小數點
  const valueInput = useDecimalInput("");

  const isSubmitDisabled = titleInput.trim() === "" || valueInput.isEmpty;

  const handleSubmit = () => {
    if (isSubmitDisabled) return;
    const data: IHistogramItem = {
      label: titleInput,
      count: valueInput.numValue,
      lineIndex: newLineIndex,
    };
    // const category = titleInput.trim();
    // onAddAction({
    //   id: crypto.randomUUID(),
    //   type: HistogramActionType.ADD_ITEM,
    //   description: t(`${HISTOGRAM_I18N_PREFIX}.action_add_item`, { category }),
    //   payload: {
    //     category,
    //     left: leftValue.numValue,
    //     right: rightValue.numValue,
    //   },
    // });
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
  // parsedHistogramData,
  onAddAction,
}) => {
  const { t } = useTranslation();

  // const {
  //   mode,
  //   bars: itemOptions,
  //   leftSeries,
  //   rightSeries,
  // } = parsedHistogramData;
  // const isSensitivity = mode === HistogramMode.SENSITIVITY;
  // const leftLabel =
  //   leftSeries ||
  //   (isSensitivity
  //     ? t(`${HISTOGRAM_I18N_PREFIX}.negative_offset`)
  //     : t(`${HISTOGRAM_I18N_PREFIX}.left_legend`));
  // const rightLabel =
  //   rightSeries ||
  //   (isSensitivity
  //     ? t(`${HISTOGRAM_I18N_PREFIX}.positive_offset`)
  //     : t(`${HISTOGRAM_I18N_PREFIX}.right_legend`));

  const [selectedId, setSelectedId] = useState<string>("");
  const [titleInput, setTitleInput] = useState<string>("");
  // Info: (20260728 - Julian) 左右數值：只允許數字與小數點（可為負）
  const leftValue = useDecimalInput("", { allowNegative: true });
  const rightValue = useDecimalInput("", { allowNegative: true });

  // const selectedItem = useMemo(
  //   () =>
  //     itemOptions.find((item) => item.lineIndex === Number(selectedId)) ?? null,
  //   [itemOptions, selectedId],
  // );

  // Info: (20260728 - Julian) 於選取事件匯入初始值（不使用 effect，避免 hook setter 非穩定造成的依賴問題）
  // const handleSelect = (id: string) => {
  //   setSelectedId(id);
  //   const item = itemOptions.find((i) => i.lineIndex === Number(id)) ?? null;
  //   setTitleInput(item ? item.category : "");
  //   leftValue.setValue(item ? String(item.left) : "");
  //   rightValue.setValue(item ? String(item.right) : "");
  // };

  // const isUnselected = !selectedItem;
  // const isUnchanged =
  //   !!selectedItem &&
  //   titleInput.trim() === selectedItem.category &&
  //   leftValue.numValue === selectedItem.left &&
  //   rightValue.numValue === selectedItem.right;
  // const isSubmitDisabled =
  //   isUnselected ||
  //   titleInput.trim() === "" ||
  //   leftValue.isEmpty ||
  //   rightValue.isEmpty ||
  //   isUnchanged;

  const handleSubmit = () => {
    // if (!selectedItem || isSubmitDisabled) return;
    // const category = titleInput.trim();
    // onAddAction({
    //   id: crypto.randomUUID(),
    //   type: HistogramActionType.EDIT_ITEM,
    //   description: t(`${HISTOGRAM_I18N_PREFIX}.action_edit_item`, { category }),
    //   payload: {
    //     lineIndex: selectedItem.lineIndex,
    //     category,
    //     left: leftValue.numValue,
    //     right: rightValue.numValue,
    //   },
    // });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <PencilLine size={14} />
        <p>{t(`${HISTOGRAM_I18N_PREFIX}.edit_item`)}</p>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-col">
          <label htmlFor="editIdLabel" className={MERMAID_LABEL_STYLE}>
            {t(`編輯項目`)}
            <span className="ml-0.5 text-red-500">*</span>
          </label>
          {/* <select
            id="editIdLabel"
            value={selectedId}
            onChange={(e) => handleSelect(e.target.value)}
            className={MERMAID_INPUT_STYLE}
          >
            <option value="">
              {t(`${HISTOGRAM_I18N_PREFIX}.select_edit_item`)}
            </option>
            {itemOptions.map((item) => (
              <option
                key={`histogram-edit-opt-${item.lineIndex}`}
                value={item.lineIndex}
              >
                {item.category}（{item.left} / {item.right}）
              </option>
            ))}
          </select> */}
        </div>
        {/* <div className="flex flex-col">
          <label htmlFor="editTitleLabel" className={MERMAID_LABEL_STYLE}>
            {t(`${HISTOGRAM_I18N_PREFIX}.item_title`)}
          </label>
          <input
            id="editTitleLabel"
            type="text"
            disabled={isUnselected}
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            className={MERMAID_INPUT_STYLE}
            placeholder={t(`${HISTOGRAM_I18N_PREFIX}.item_title_placeholder`)!}
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
        </div> */}
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        // disabled={isSubmitDisabled}
        className={MERMAID_SUBMIT_BUTTON_STYLE}
      >
        {t(`${HISTOGRAM_I18N_PREFIX}.apply_changes`)}
      </button>
    </div>
  );
};

// Info: (20260728 - Julian) 「編輯軸線標題」面板：
const EditAxisPanel: FC<IBasePanelProps> = ({
  // parsedHistogramData,
  onAddAction,
}) => {
  const { t } = useTranslation();

  // const { leftSeries, rightSeries, leftColor, rightColor } =
  //   parsedHistogramData;

  // const initialLeftName = leftSeries ?? "";
  // const initialRightName = rightSeries ?? "";
  // const initialLeftColor = leftColor ?? "";
  // const initialRightColor = rightColor ?? "";

  // const [leftTitleInput, setLeftTitleInput] = useState<string>(initialLeftName);
  // const [leftColorInput, setLeftColorInput] =
  //   useState<string>(initialLeftColor);
  // const [rightTitleInput, setRightTitleInput] =
  //   useState<string>(initialRightName);
  // const [rightColorInput, setRightColorInput] =
  //   useState<string>(initialRightColor);

  // const isUnchanged =
  //   leftTitleInput.trim() === initialLeftName.trim() &&
  //   rightTitleInput.trim() === initialRightName.trim() &&
  //   leftColorInput.toLowerCase() === initialLeftColor.toLowerCase() &&
  //   rightColorInput.toLowerCase() === initialRightColor.toLowerCase();
  // const isSubmitDisabled =
  //   leftTitleInput.trim() === "" ||
  //   rightTitleInput.trim() === "" ||
  //   isUnchanged;

  const handleSubmit = () => {
    // if (isSubmitDisabled) return;
    // onAddAction({
    //   id: crypto.randomUUID(),
    //   type: HistogramActionType.EDIT_GROUP,
    //   description: t(`${HISTOGRAM_I18N_PREFIX}.action_edit_group`, {
    //     left: leftTitleInput.trim(),
    //     right: rightTitleInput.trim(),
    //   }),
    //   payload: {
    //     leftSeries: leftTitleInput.trim(),
    //     rightSeries: rightTitleInput.trim(),
    //     ...(leftColorInput.trim() !== "" ? { leftColor: leftColorInput } : {}),
    //     ...(rightColorInput.trim() !== ""
    //       ? { rightColor: rightColorInput }
    //       : {}),
    //   },
    // });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <ChartNoAxesCombined size={14} />
        <p>{t(`編輯軸線標題`)}</p>
      </div>
      <div className="flex gap-2">
        <div className="flex flex-1 flex-col gap-2">
          {/* <div className="flex flex-col">
            <label
              htmlFor="editLeftTitleValueLabel"
              className={MERMAID_LABEL_STYLE}
            >
              {t(`${HISTOGRAM_I18N_PREFIX}.left_legend`)}
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
          /> */}
        </div>
        <div className="border-l border-dashed border-slate-400"></div>
        {/* <div className="flex flex-1 flex-col gap-2">
          <div className="flex flex-col">
            <label
              htmlFor="editRightTitleValueLabel"
              className={MERMAID_LABEL_STYLE}
            >
              {t(`${HISTOGRAM_I18N_PREFIX}.right_legend`)}
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
        </div> */}
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        // disabled={isSubmitDisabled}
        className={MERMAID_SUBMIT_BUTTON_STYLE}
      >
        {t(`${HISTOGRAM_I18N_PREFIX}.apply_changes`)}
      </button>
    </div>
  );
};

// Info: (20260728 - Julian) 「切換趨勢曲線」面板
const SwitchTrendLinePanel: FC<IBasePanelProps> = ({
  // parsedHistogramData,
  onAddAction,
}) => {
  const { t } = useTranslation();

  // const { bars: itemOptions } = parsedHistogramData;

  const [selectedId, setSelectedId] = useState<string>("");

  // const selectedItem = useMemo(
  //   () =>
  //     itemOptions.find((item) => item.lineIndex === Number(selectedId)) ?? null,
  //   [itemOptions, selectedId],
  // );

  const handleSubmit = () => {
    // if (!selectedItem) return;
    // onAddAction({
    //   id: crypto.randomUUID(),
    //   type: HistogramActionType.DELETE_ITEM,
    //   description: t(`${HISTOGRAM_I18N_PREFIX}.action_delete_item`, {
    //     category: selectedItem.category,
    //   }),
    //   payload: { lineIndex: selectedItem.lineIndex },
    // });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <Trash2 size={14} />
        <p>{t(`${HISTOGRAM_I18N_PREFIX}.delete_item`)}</p>
      </div>
      <div className="flex flex-col">
        <label htmlFor="deleteItemLabel" className={MERMAID_LABEL_STYLE}>
          {t(`刪除項目`)}
          <span className="ml-0.5 text-red-500">*</span>
        </label>
        <select
          id="deleteItemLabel"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className={MERMAID_INPUT_STYLE}
        >
          <option value="">
            {t(`${HISTOGRAM_I18N_PREFIX}.select_delete_item`)}
          </option>
          {/* {itemOptions.map((item) => (
            <option
              key={`histogram-delete-opt-${item.lineIndex}`}
              value={item.lineIndex}
            >
              {item.category}（{item.left} / {item.right}）
            </option>
          ))} */}
        </select>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        // disabled={!selectedItem}
        className={MERMAID_SUBMIT_BUTTON_STYLE}
      >
        {t(`${HISTOGRAM_I18N_PREFIX}.delete_item`)}
      </button>
    </div>
  );
};

// Info: (20260728 - Julian) 「刪除項目」面板
const DeleteItemPanel: FC<IBasePanelProps> = ({
  // parsedHistogramData,
  onAddAction,
}) => {
  const { t } = useTranslation();

  // const { bars: itemOptions } = parsedHistogramData;

  const [selectedId, setSelectedId] = useState<string>("");

  // const selectedItem = useMemo(
  //   () =>
  //     itemOptions.find((item) => item.lineIndex === Number(selectedId)) ?? null,
  //   [itemOptions, selectedId],
  // );

  const handleSubmit = () => {
    // if (!selectedItem) return;
    // onAddAction({
    //   id: crypto.randomUUID(),
    //   type: HistogramActionType.DELETE_ITEM,
    //   description: t(`${HISTOGRAM_I18N_PREFIX}.action_delete_item`, {
    //     category: selectedItem.category,
    //   }),
    //   payload: { lineIndex: selectedItem.lineIndex },
    // });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <Trash2 size={14} />
        <p>{t(`${HISTOGRAM_I18N_PREFIX}.delete_item`)}</p>
      </div>
      <div className="flex flex-col">
        <label htmlFor="deleteItemLabel" className={MERMAID_LABEL_STYLE}>
          {t(`刪除項目`)}
          <span className="ml-0.5 text-red-500">*</span>
        </label>
        <select
          id="deleteItemLabel"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className={MERMAID_INPUT_STYLE}
        >
          <option value="">
            {t(`${HISTOGRAM_I18N_PREFIX}.select_delete_item`)}
          </option>
          {/* {itemOptions.map((item) => (
            <option
              key={`histogram-delete-opt-${item.lineIndex}`}
              value={item.lineIndex}
            >
              {item.category}（{item.left} / {item.right}）
            </option>
          ))} */}
        </select>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        // disabled={!selectedItem}
        className={MERMAID_SUBMIT_BUTTON_STYLE}
      >
        {t(`${HISTOGRAM_I18N_PREFIX}.delete_item`)}
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
  onAddAction: any; // (action: IHistogramAction) => void;
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
  const handleAddActionWithReset = (
    action: any, //IHistogramAction
  ) => {
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
