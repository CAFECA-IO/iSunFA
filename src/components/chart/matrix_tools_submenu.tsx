import React, { useState, useMemo, useEffect, FC } from "react";
import {
  Grid2x2,
  MapPinPen,
  MapPinPlusInside,
  MapPinX,
  Move,
  MoveRight,
  Network,
  LucideIcon,
} from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { MatrixActionType } from "@/constants/custom_chart";
import { IMatrixAction, IMatrixParseResult } from "@/interfaces/custom_chart";
import { parseMatrixData } from "@/lib/utils/custom_matrix_editor";
import {
  MERMAID_INPUT_STYLE,
  MERMAID_LABEL_STYLE,
  MERMAID_SUBMIT_BUTTON_STYLE,
} from "@/constants/mermaid_chart";
import { SegmentedControl } from "@/components/chart/mermaid_common_components";
import { DEFAULT_COLORS } from "@/components/common/donut_chart";
import { Checkbox } from "@/components/common/checkbox";

// Info: (20260721 - Julian) 坐標範圍數值
const RANGE_STEP = 10;
const RANGE_MAX = 100;
const RANGE_MIN = -100;

enum GroupType {
  EXISTING = "existing",
  NEW = "new",
}

enum MatrixTools {
  ADD_ITEM = "addItem",
  EDIT_ITEM = "editItem",
  EDIT_AXIS = "editAxis",
  EDIT_GROUP = "editGroup",
  CHANGE_QUADRANT_COLOR = "changeQuadrantColor",
  DELETE_ITEM = "deleteItem",
}

interface IToolItem {
  tool: MatrixTools;
  icon: LucideIcon;
}

const MATRIX_TOOLS: IToolItem[] = [
  {
    tool: MatrixTools.ADD_ITEM,
    icon: MapPinPlusInside,
  },
  {
    tool: MatrixTools.EDIT_ITEM,
    icon: MapPinPen,
  },
  {
    tool: MatrixTools.EDIT_AXIS,
    icon: Move,
  },
  {
    tool: MatrixTools.EDIT_GROUP,
    icon: Network,
  },
  {
    tool: MatrixTools.CHANGE_QUADRANT_COLOR,
    icon: Grid2x2,
  },
  {
    tool: MatrixTools.DELETE_ITEM,
    icon: MapPinX,
  },
];

const MATRIX_TOOL_TRANSLATION_KEYS: Record<MatrixTools, string> = {
  [MatrixTools.ADD_ITEM]: "新增項目",
  [MatrixTools.EDIT_ITEM]: "編輯項目",
  [MatrixTools.EDIT_AXIS]: "編輯軸線",
  [MatrixTools.EDIT_GROUP]: "編輯項目分組",
  [MatrixTools.CHANGE_QUADRANT_COLOR]: "變更象限顏色",
  [MatrixTools.DELETE_ITEM]: "刪除項目",
};

interface IBasePanelProps {
  parsedMatrixData: IMatrixParseResult;
  onAddAction: (action: IMatrixAction) => void;
}

// Info: (20260721 - Julian) 「新增項目」面板
const AddItemPanel: FC<IBasePanelProps> = ({
  parsedMatrixData,
  onAddAction,
}) => {
  const { t } = useTranslation();

  const { xAxis, yAxis, groups: groupOptions } = parsedMatrixData;

  const [titleInput, setTitleInput] = useState<string>("");
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [groupType, setGroupType] = useState<GroupType>(GroupType.EXISTING);
  const [xCoord, setXCoord] = useState<number>(0);
  const [yCoord, setYCoord] = useState<number>(0);

  const isSubmitDisabled = titleInput.trim() === "";

  const handleSubmit = () => {
    if (isSubmitDisabled) return;
    const label = titleInput.trim();
    onAddAction({
      id: crypto.randomUUID(),
      type: MatrixActionType.ADD_ITEM,
      description: `新增項目「${label}」(${xCoord}, ${yCoord})`,
      payload: { label, x: xCoord, y: yCoord, group: selectedGroup },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <MapPinPlusInside size={14} />
        <p>{t("新增項目")}</p>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-col">
          <label htmlFor="newTitleLabel" className={MERMAID_LABEL_STYLE}>
            {t("項目標題")}
            <span className="ml-0.5 text-red-500">*</span>
          </label>
          <input
            id="newTitleLabel"
            type="text"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            className={MERMAID_INPUT_STYLE}
            placeholder="請輸入項目標題"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="newXCoord" className={MERMAID_LABEL_STYLE}>
            {t("X 軸坐標")}
            <span className="ml-0.5 text-red-500">*</span>
          </label>
          <div className="flex flex-col">
            <input
              id="newXCoord"
              type="range"
              min={RANGE_MIN}
              max={RANGE_MAX}
              step={RANGE_STEP}
              value={xCoord}
              onChange={(e) => setXCoord(Number(e.target.value))}
              className=""
            />
            <div className="grid grid-cols-3 text-[10px] text-slate-500">
              <p className="text-left">{xAxis.min}</p>
              <p className="text-center">{xCoord}</p>
              <p className="text-right">{xAxis.max}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="newYCoord" className={MERMAID_LABEL_STYLE}>
            {t("Y 軸坐標")}
            <span className="ml-0.5 text-red-500">*</span>
          </label>
          <div className="flex flex-col">
            <input
              id="newYCoord"
              type="range"
              min={RANGE_MIN}
              max={RANGE_MAX}
              step={RANGE_STEP}
              value={yCoord}
              onChange={(e) => setYCoord(Number(e.target.value))}
              className=""
            />
            <div className="grid grid-cols-3 text-[10px] text-slate-500">
              <p className="text-left">{yAxis.min}</p>
              <p className="text-center">{yCoord}</p>
              <p className="text-right">{yAxis.max}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label htmlFor="newItemGroupLabel" className={MERMAID_LABEL_STYLE}>
              {t("項目分組")}
            </label>
            <SegmentedControl
              options={[
                { value: GroupType.EXISTING, label: t("選擇現有分組") },
                { value: GroupType.NEW, label: t("新增分組") },
              ]}
              value={groupType}
              onChange={(val) => setGroupType(val as GroupType)}
            />
          </div>
          {groupType === GroupType.NEW ? (
            <input
              id="newItemGroupLabel"
              type="text"
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className={MERMAID_INPUT_STYLE}
              placeholder={t("請填入新的分組名稱")!}
            />
          ) : (
            <select
              id="addLinkFromLabel"
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className={MERMAID_INPUT_STYLE}
            >
              <option value="">{t("請選擇現有分組")}</option>
              {groupOptions.map((item) => (
                <option key={`matrix-add-opt-${item}`} value={item}>
                  {item}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitDisabled}
        className={MERMAID_SUBMIT_BUTTON_STYLE}
      >
        {t("新增項目")}
      </button>
    </div>
  );
};

// Info: (20260721 - Julian) 「編輯項目」面板
const EditItemPanel: FC<IBasePanelProps> = ({
  parsedMatrixData,
  onAddAction,
}) => {
  const { t } = useTranslation();

  const {
    xAxis,
    yAxis,
    items: itemOptions,
    groups: groupOptions,
  } = parsedMatrixData;

  const [selectedId, setSelectedId] = useState<string>("");
  const [titleInput, setTitleInput] = useState<string>("");
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [groupType, setGroupType] = useState<GroupType>(GroupType.EXISTING);
  const [xCoord, setXCoord] = useState<number>(0);
  const [yCoord, setYCoord] = useState<number>(0);

  // Info: (20260721 - Julian) 目前選取的資料點（以 lineIndex 定位）
  const selectedItem = useMemo(
    () =>
      itemOptions.find((item) => item.lineIndex === Number(selectedId)) ?? null,
    [itemOptions, selectedId],
  );

  // Info: (20260721 - Julian) 選取後匯入初始值
  useEffect(() => {
    if (selectedItem) {
      setTitleInput(selectedItem.label);
      setXCoord(selectedItem.x);
      setYCoord(selectedItem.y);
      if (selectedItem.group) setSelectedGroup(selectedItem.group);
    } else {
      setTitleInput("");
      setXCoord(0);
      setYCoord(0);
      setSelectedGroup("");
    }
  }, [selectedItem]);

  // Info: (20260721 - Julian) 尚未選擇項目
  const isUnselected = !selectedItem;

  // Info: (20260721 - Julian) 尚未變更表單
  const isUnchanged =
    !!selectedItem &&
    titleInput.trim() === selectedItem.label &&
    xCoord === selectedItem.x &&
    yCoord === selectedItem.y &&
    selectedGroup === selectedItem.group;

  // Info: (20260721 - Julian) 鎖定提交按鈕
  const isSubmitDisabled =
    isUnselected || titleInput.trim() === "" || isUnchanged;

  const handleSubmit = () => {
    if (!selectedItem || isSubmitDisabled) return;
    const label = titleInput.trim();
    onAddAction({
      id: crypto.randomUUID(),
      type: MatrixActionType.EDIT_ITEM,
      description: `編輯項目「${label}」(${xCoord}, ${yCoord})`,
      payload: {
        lineIndex: selectedItem.lineIndex,
        label,
        x: xCoord,
        y: yCoord,
        group: selectedGroup,
      },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <MapPinPen size={14} />
        <p>{t("編輯項目")}</p>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-col">
          <label htmlFor="editIdLabel" className={MERMAID_LABEL_STYLE}>
            {t("選擇欲編輯的項目")}
            <span className="ml-0.5 text-red-500">*</span>
          </label>
          <select
            id="editIdLabel"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className={MERMAID_INPUT_STYLE}
          >
            <option value="">{t("選擇欲編輯的項目")}</option>
            {itemOptions.map((item) => (
              <option
                key={`matrix-edit-opt-${item.lineIndex}`}
                value={item.lineIndex}
              >
                {item.label}（{item.x}, {item.y}）
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label htmlFor="editTitleLabel" className={MERMAID_LABEL_STYLE}>
            {t("項目標題")}
          </label>
          <input
            id="editTitleLabel"
            type="text"
            disabled={isUnselected}
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            className={MERMAID_INPUT_STYLE}
            placeholder="請輸入項目標題"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="editXCoord" className={MERMAID_LABEL_STYLE}>
            {t("X 軸坐標")}
          </label>
          <div className="flex flex-col">
            <input
              id="editXCoord"
              type="range"
              disabled={isUnselected}
              min={RANGE_MIN}
              max={RANGE_MAX}
              step={RANGE_STEP}
              value={xCoord}
              onChange={(e) => setXCoord(Number(e.target.value))}
              className=""
            />
            <div className="grid grid-cols-3 text-[10px] text-slate-500">
              <p className="text-left">{xAxis.min}</p>
              <p className="text-center">{xCoord}</p>
              <p className="text-right">{xAxis.max}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="editYCoord" className={MERMAID_LABEL_STYLE}>
            {t("Y 軸坐標")}
          </label>
          <div className="flex flex-col">
            <input
              id="editYCoord"
              type="range"
              disabled={isUnselected}
              min={RANGE_MIN}
              max={RANGE_MAX}
              step={RANGE_STEP}
              value={yCoord}
              onChange={(e) => setYCoord(Number(e.target.value))}
              className=""
            />
            <div className="grid grid-cols-3 text-[10px] text-slate-500">
              <p className="text-left">{yAxis.min}</p>
              <p className="text-center">{yCoord}</p>
              <p className="text-right">{yAxis.max}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label htmlFor="editItemGroupLabel" className={MERMAID_LABEL_STYLE}>
              {t("項目分組")}
            </label>
            <SegmentedControl
              options={[
                {
                  value: GroupType.EXISTING,
                  label: t("選擇現有分組"),
                },
                {
                  value: GroupType.NEW,
                  label: t("新增分組"),
                },
              ]}
              value={groupType}
              onChange={(val) => setGroupType(val as GroupType)}
            />
          </div>
          {groupType === GroupType.NEW ? (
            <input
              id="editItemGroupLabel"
              type="text"
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className={MERMAID_INPUT_STYLE}
              placeholder={t("請填入新的分組名稱")!}
            />
          ) : (
            <select
              id="addLinkFromLabel"
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className={MERMAID_INPUT_STYLE}
            >
              <option value="">{t("請選擇現有分組")}</option>
              {groupOptions.map((item) => (
                <option key={`matrix-add-opt-${item}`} value={item}>
                  {item}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitDisabled}
        className={MERMAID_SUBMIT_BUTTON_STYLE}
      >
        {t("套用變更")}
      </button>
    </div>
  );
};

// Info: (20260721 - Julian) 「編輯軸線」面板
const EditAxisPanel: FC<IBasePanelProps> = ({
  parsedMatrixData,
  onAddAction,
}) => {
  const { t } = useTranslation();

  const { xAxis, yAxis } = parsedMatrixData;

  // Info: (20260721 - Julian) 以現有雙極端點文字作為初始值（未設定則留白）
  const initialXMin = xAxis.min ?? "";
  const initialXMax = xAxis.max ?? "";
  const initialYMin = yAxis.min ?? "";
  const initialYMax = yAxis.max ?? "";

  const [xMinInput, setXMinInput] = useState<string>(initialXMin);
  const [xMaxInput, setXMaxInput] = useState<string>(initialXMax);
  const [yMinInput, setYMinInput] = useState<string>(initialYMin);
  const [yMaxInput, setYMaxInput] = useState<string>(initialYMax);

  const isSubmitDisabled =
    xMinInput.trim() === initialXMin.trim() &&
    xMaxInput.trim() === initialXMax.trim() &&
    yMinInput.trim() === initialYMin.trim() &&
    yMaxInput.trim() === initialYMax.trim();

  const handleSubmit = () => {
    if (isSubmitDisabled) return;
    onAddAction({
      id: crypto.randomUUID(),
      type: MatrixActionType.EDIT_AXIS,
      description: "編輯座標軸端點文字",
      payload: {
        xMin: xMinInput.trim(),
        xMax: xMaxInput.trim(),
        yMin: yMinInput.trim(),
        yMax: yMaxInput.trim(),
      },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <Move size={14} />
        <p>{t("編輯軸線")}</p>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-col">
          <p className={MERMAID_LABEL_STYLE}>{t("X 軸說明文字")}</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={xMinInput}
              onChange={(e) => setXMinInput(e.target.value)}
              placeholder="可留白"
              className={MERMAID_INPUT_STYLE}
            />
            <MoveRight size={24} className="shrink-0" />
            <input
              type="text"
              value={xMaxInput}
              onChange={(e) => setXMaxInput(e.target.value)}
              placeholder="可留白"
              className={MERMAID_INPUT_STYLE}
            />
          </div>
        </div>
        <div className="flex flex-col"></div>
        <div className="flex flex-col">
          <p className={MERMAID_LABEL_STYLE}>{t("Y 軸說明文字")}</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={yMinInput}
              onChange={(e) => setYMinInput(e.target.value)}
              placeholder="可留白"
              className={MERMAID_INPUT_STYLE}
            />
            <MoveRight size={24} className="shrink-0" />
            <input
              type="text"
              value={yMaxInput}
              onChange={(e) => setYMaxInput(e.target.value)}
              placeholder="可留白"
              className={MERMAID_INPUT_STYLE}
            />
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitDisabled}
        className={MERMAID_SUBMIT_BUTTON_STYLE}
      >
        {t("套用變更")}
      </button>
    </div>
  );
};

// Info: (20260721 - Julian) 「編輯項目分組」面板
const EditGroupPanel: FC<IBasePanelProps> = ({
  parsedMatrixData,
  onAddAction,
}) => {
  const { t } = useTranslation();

  const {
    items: itemOptions,
    groups: groupOptions,
    groupColors,
  } = parsedMatrixData;

  const [selectedGroup, setSelectedGroup] = useState<string>("");
  // Info: (20260721 - Julian) 以行號集合表示分組最終成員，避免物件參照比對
  const [memberIndexes, setMemberIndexes] = useState<number[]>([]);
  const [color, setColor] = useState<string>("");

  // Info: (20260721 - Julian) 選取分組後匯入初始成員與顏色
  useEffect(() => {
    if (selectedGroup) {
      setMemberIndexes(
        itemOptions
          .filter((i) => i.group === selectedGroup)
          .map((i) => i.lineIndex),
      );
      setColor(groupColors[selectedGroup] ?? "");
    } else {
      setMemberIndexes([]);
      setColor("");
    }
  }, [selectedGroup, itemOptions, groupColors]);

  const toggleMember = (lineIndex: number, checked: boolean) =>
    setMemberIndexes((prev) =>
      checked ? [...prev, lineIndex] : prev.filter((i) => i !== lineIndex),
    );

  // Info: (20260721 - Julian) 成員清空代表解散分組
  const isEmptyGroup = selectedGroup !== "" && memberIndexes.length === 0;

  const handleSubmit = () => {
    if (!selectedGroup) return;
    onAddAction({
      id: crypto.randomUUID(),
      type: MatrixActionType.EDIT_GROUP,
      description: isEmptyGroup
        ? `刪除分組「${selectedGroup}」`
        : `編輯分組「${selectedGroup}」（${memberIndexes.length} 個項目${
            color ? `，顏色 ${color}` : ""
          }）`,
      payload: {
        group: selectedGroup,
        memberLineIndexes: memberIndexes,
        ...(color.trim() !== "" ? { color } : {}),
      },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <Network size={14} />
        <p>{t("編輯項目分組")}</p>
      </div>

      {/* Info: (20260721 - Julian) 選擇分組 */}
      <div className="flex flex-col">
        <label htmlFor="editGroupLabel" className={MERMAID_LABEL_STYLE}>
          {t("選擇欲編輯的分組")}
          <span className="ml-0.5 text-red-500">*</span>
        </label>
        <select
          id="editGroupLabel"
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          className={MERMAID_INPUT_STYLE}
        >
          <option value="">{t("選擇欲編輯的分組")}</option>
          {groupOptions.map((group) => (
            <option key={`matrix-group-opt-${group}`} value={group}>
              {group}
            </option>
          ))}
        </select>
      </div>

      {!selectedGroup ? (
        <div className="flex flex-col items-center gap-1 rounded-lg bg-slate-100 p-4">
          <p className="text-xs font-semibold text-slate-500">請選擇分組</p>
        </div>
      ) : (
        <>
          {/* Info: (20260721 - Julian) 分組顏色 */}
          <div className="flex flex-col gap-1.5">
            <p className={MERMAID_LABEL_STYLE}>{t("分組顏色")}</p>
            <MatrixColorPicker value={color} onChange={setColor} />
          </div>

          {/* Info: (20260721 - Julian) 分組成員（勾選代表屬於此分組） */}
          <div className="flex flex-col gap-1.5">
            <p className={MERMAID_LABEL_STYLE}>{t("分組成員")}</p>
            <div className="flex max-h-44 flex-col gap-2 overflow-y-auto rounded-lg border border-slate-200 p-2.5">
              {itemOptions.map((item) => (
                <Checkbox
                  key={`matrix-edit-group-item-opt-${item.lineIndex}`}
                  checked={memberIndexes.includes(item.lineIndex)}
                  onChange={(checked) => toggleMember(item.lineIndex, checked)}
                  label={`${item.label}（${item.x}, ${item.y}）`}
                />
              ))}
            </div>
          </div>

          {isEmptyGroup && (
            <div className="flex flex-col items-center gap-1 rounded-lg bg-rose-50 p-3">
              <p className="text-xs font-semibold text-slate-800">
                分組內暫無選擇項目
              </p>
              <p className="text-[10px] text-red-500">
                注意：此狀態下套用變更，分組將被刪除
              </p>
            </div>
          )}
        </>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!selectedGroup}
        className={MERMAID_SUBMIT_BUTTON_STYLE}
      >
        {t("套用變更")}
      </button>
    </div>
  );
};

// Info: (20260721 - Julian) 「刪除項目」面板
const DeleteItemPanel: FC<IBasePanelProps> = ({
  parsedMatrixData,
  onAddAction,
}) => {
  const { t } = useTranslation();

  const itemOptions = parsedMatrixData.items;

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
      type: MatrixActionType.DELETE_ITEM,
      description: `刪除項目「${selectedItem.label}」`,
      payload: { lineIndex: selectedItem.lineIndex },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <MapPinX size={14} />
        <p>{t("刪除項目")}</p>
      </div>
      <div className="flex flex-col">
        <label htmlFor="deleteItemLabel" className={MERMAID_LABEL_STYLE}>
          {t("選擇欲刪除的項目")}
          <span className="ml-0.5 text-red-500">*</span>
        </label>
        <select
          id="deleteItemLabel"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className={MERMAID_INPUT_STYLE}
        >
          <option value="">{t("選擇欲刪除的項目")}</option>
          {itemOptions.map((item) => (
            <option
              key={`matrix-delete-opt-${item.lineIndex}`}
              value={item.lineIndex}
            >
              {item.label}（{item.x}, {item.y}）
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
        {t("刪除項目")}
      </button>
    </div>
  );
};

// Info: (20260721 - Julian)
// 簡易選色盤：預設調色盤色票（與自動配色一致）+ 原生色票輸入供自訂 HEX。
// 受控元件，value 為目前 HEX（空字串代表尚未選色），onChange 回傳選定 HEX。
const MatrixColorPicker: FC<{
  value: string;
  onChange: (hex: string) => void;
}> = ({ value, onChange }) => (
  <div className="flex flex-wrap items-center gap-1.5">
    {DEFAULT_COLORS.map((color) => (
      <button
        key={`matrix-swatch-${color}`}
        type="button"
        aria-label={color}
        onClick={() => onChange(color)}
        className={`h-7 w-7 rounded-md border-2 transition ${
          value.toLowerCase() === color.toLowerCase()
            ? "border-slate-800"
            : "border-transparent hover:border-slate-300"
        }`}
        style={{ backgroundColor: color }}
      />
    ))}
    {/* Info: (20260721 - Julian) 自訂顏色：原生色票 input（回傳小寫 HEX） */}
    <span
      className="relative block h-7 w-7 shrink-0 overflow-hidden rounded-md border-2 border-dashed border-slate-300"
      title="自訂顏色"
    >
      <input
        type="color"
        aria-label="自訂顏色"
        value={value || "#000000"}
        onChange={(e) => onChange(e.target.value)}
        className="absolute -inset-1 h-[calc(100%+12px)] w-[calc(100%+12px)] cursor-pointer"
      />
    </span>
  </div>
);

// Info: (20260721 - Julian) 「變更象限顏色」面板
// ToDo: (20260721 - Julian) 實作四象限背景顏色設定工具
const ChangeQuadrantColorPanel: FC<IBasePanelProps> = () => {
  const { t } = useTranslation();
  return (
    <div className="flex h-24 items-center justify-center text-xs text-slate-400">
      {t("此工具開發中")}
    </div>
  );
};

const MATRIX_TOOL_PANELS: Record<MatrixTools, FC<IBasePanelProps>> = {
  [MatrixTools.ADD_ITEM]: AddItemPanel,
  [MatrixTools.EDIT_ITEM]: EditItemPanel,
  [MatrixTools.EDIT_AXIS]: EditAxisPanel,
  [MatrixTools.EDIT_GROUP]: EditGroupPanel,
  [MatrixTools.CHANGE_QUADRANT_COLOR]: ChangeQuadrantColorPanel,
  [MatrixTools.DELETE_ITEM]: DeleteItemPanel,
};

interface IMatrixToolsSectionProps {
  selectedTool: string | null;
  setSelectedTool: React.Dispatch<React.SetStateAction<string | null>>;
  chart: string;
  onAddAction: (action: IMatrixAction) => void;
}

export const MatrixToolsSection: FC<IMatrixToolsSectionProps> = ({
  selectedTool,
  setSelectedTool,
  chart,
  onAddAction,
}) => {
  const { t } = useTranslation();

  // Info: (20260721 - Julian) 元件自行解析所需資料，父層只需傳入圖表字串
  const parsedMatrixData = useMemo(() => parseMatrixData(chart), [chart]);

  // Info: (20260721 - Julian) 送出動作後收合面板，回到工具選擇列
  const handleAddActionWithReset = (action: IMatrixAction) => {
    onAddAction(action);
    setSelectedTool(null);
  };

  const isMatrixToolSelected = Object.values(MatrixTools).includes(
    selectedTool as MatrixTools,
  );

  const ActivePanel = isMatrixToolSelected
    ? MATRIX_TOOL_PANELS[selectedTool as MatrixTools]
    : null;

  return (
    <>
      {/* Info: (20260721 - Julian) 快捷工具選擇列 */}
      <div className="flex flex-wrap gap-1.5">
        {MATRIX_TOOLS.map((item) => {
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
              <p>{t(MATRIX_TOOL_TRANSLATION_KEYS[item.tool])}</p>
            </button>
          );
        })}
      </div>

      {ActivePanel && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <ActivePanel
            parsedMatrixData={parsedMatrixData}
            onAddAction={handleAddActionWithReset}
          />
        </div>
      )}
    </>
  );
};
