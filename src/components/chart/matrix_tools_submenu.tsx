import React, { useState, useMemo, useEffect, FC } from "react";
import {
  Blocks,
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
import {
  MatrixActionType,
  BACKGROUND_COLOR_OPTIONS,
} from "@/constants/custom_chart";
import { IMatrixAction, IMatrixParseResult } from "@/interfaces/custom_chart";
import { parseMatrixData } from "@/lib/utils/custom_matrix_editor";
import {
  MERMAID_INPUT_STYLE,
  MERMAID_LABEL_STYLE,
  MERMAID_SUBMIT_BUTTON_STYLE,
  MERMAID_RANGE_STYLE,
} from "@/constants/mermaid_chart";
import { SegmentedControl } from "@/components/chart/mermaid_common_components";
import { DEFAULT_COLORS } from "@/components/common/donut_chart";
import { Checkbox } from "@/components/common/checkbox";
import { DEFAULT_QUADRANT_COLORS } from "@/constants/custom_chart";
import ColorPicker from "@/components/common/color_picker";

// Info: (20260722 - Julian) 矩陣工具 i18n key 前綴，字面值收斂於 locale 檔
const MATRIX_I18N_PREFIX = "chart.custom_chart.matrix";

// Info: (20260721 - Julian) 坐標範圍數值
const RANGE_STEP = 10;
const RANGE_MAX = 100;
const RANGE_MIN = -100;

// Info: (20260721 - Julian) 四象限標籤（Q1..Q4，對應渲染順序：右上、左上、左下、右下）
const QUADRANT_LABELS = [
  { labelKey: `${MATRIX_I18N_PREFIX}.quadrant_1`, rotate: "rotate-0" },
  { labelKey: `${MATRIX_I18N_PREFIX}.quadrant_2`, rotate: "rotate-270" },
  { labelKey: `${MATRIX_I18N_PREFIX}.quadrant_3`, rotate: "rotate-180" },
  { labelKey: `${MATRIX_I18N_PREFIX}.quadrant_4`, rotate: "rotate-90" },
];

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
  [MatrixTools.ADD_ITEM]: `${MATRIX_I18N_PREFIX}.add_item`,
  [MatrixTools.EDIT_ITEM]: `${MATRIX_I18N_PREFIX}.edit_item`,
  [MatrixTools.EDIT_AXIS]: `${MATRIX_I18N_PREFIX}.edit_axis`,
  [MatrixTools.EDIT_GROUP]: `${MATRIX_I18N_PREFIX}.edit_group`,
  [MatrixTools.CHANGE_QUADRANT_COLOR]: `${MATRIX_I18N_PREFIX}.change_quadrant_color`,
  [MatrixTools.DELETE_ITEM]: `${MATRIX_I18N_PREFIX}.delete_item`,
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
      description: t(`${MATRIX_I18N_PREFIX}.action_add_item`, {
        label,
        x: xCoord,
        y: yCoord,
      }),
      payload: { label, x: xCoord, y: yCoord, group: selectedGroup },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <MapPinPlusInside size={14} />
        <p>{t(`${MATRIX_I18N_PREFIX}.add_item`)}</p>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-col">
          <label htmlFor="newTitleLabel" className={MERMAID_LABEL_STYLE}>
            {t(`${MATRIX_I18N_PREFIX}.item_title`)}
            <span className="ml-0.5 text-red-500">*</span>
          </label>
          <input
            id="newTitleLabel"
            type="text"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            className={MERMAID_INPUT_STYLE}
            placeholder={t(`${MATRIX_I18N_PREFIX}.item_title_placeholder`)!}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="newXCoord" className={MERMAID_LABEL_STYLE}>
            {t(`${MATRIX_I18N_PREFIX}.x_coord`)}
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
              className={MERMAID_RANGE_STYLE}
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
            {t(`${MATRIX_I18N_PREFIX}.y_coord`)}
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
              className={MERMAID_RANGE_STYLE}
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
              {t(`${MATRIX_I18N_PREFIX}.item_group`)}
            </label>
            <SegmentedControl
              options={[
                {
                  value: GroupType.EXISTING,
                  label: t(`${MATRIX_I18N_PREFIX}.select_existing_group`),
                },
                {
                  value: GroupType.NEW,
                  label: t(`${MATRIX_I18N_PREFIX}.new_group`),
                },
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
              placeholder={t(`${MATRIX_I18N_PREFIX}.new_group_placeholder`)!}
            />
          ) : (
            <select
              id="newItemGroupLabel"
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className={MERMAID_INPUT_STYLE}
            >
              <option value="">
                {t(`${MATRIX_I18N_PREFIX}.select_existing_group_placeholder`)}
              </option>
              {groupOptions.map((item) => (
                <option key={`matrix-add-group-opt-${item}`} value={item}>
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
        {t(`${MATRIX_I18N_PREFIX}.add_item`)}
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

  // Info: (20260722 - Luphia) 尚未變更表單；未分組項目 group 為 undefined，正規化為空字串再比對，避免誤判為已變更
  const isUnchanged =
    !!selectedItem &&
    titleInput.trim() === selectedItem.label &&
    xCoord === selectedItem.x &&
    yCoord === selectedItem.y &&
    selectedGroup.trim() === (selectedItem.group ?? "");

  // Info: (20260721 - Julian) 鎖定提交按鈕
  const isSubmitDisabled =
    isUnselected || titleInput.trim() === "" || isUnchanged;

  const handleSubmit = () => {
    if (!selectedItem || isSubmitDisabled) return;
    const label = titleInput.trim();
    onAddAction({
      id: crypto.randomUUID(),
      type: MatrixActionType.EDIT_ITEM,
      description: t(`${MATRIX_I18N_PREFIX}.action_edit_item`, {
        label,
        x: xCoord,
        y: yCoord,
      }),
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
        <p>{t(`${MATRIX_I18N_PREFIX}.edit_item`)}</p>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-col">
          <label htmlFor="editIdLabel" className={MERMAID_LABEL_STYLE}>
            {t(`${MATRIX_I18N_PREFIX}.select_edit_item`)}
            <span className="ml-0.5 text-red-500">*</span>
          </label>
          <select
            id="editIdLabel"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className={MERMAID_INPUT_STYLE}
          >
            <option value="">
              {t(`${MATRIX_I18N_PREFIX}.select_edit_item`)}
            </option>
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
            {t(`${MATRIX_I18N_PREFIX}.item_title`)}
          </label>
          <input
            id="editTitleLabel"
            type="text"
            disabled={isUnselected}
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            className={MERMAID_INPUT_STYLE}
            placeholder={t(`${MATRIX_I18N_PREFIX}.item_title_placeholder`)!}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="editXCoord" className={MERMAID_LABEL_STYLE}>
            {t(`${MATRIX_I18N_PREFIX}.x_coord`)}
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
              className={MERMAID_RANGE_STYLE}
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
            {t(`${MATRIX_I18N_PREFIX}.y_coord`)}
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
              className={MERMAID_RANGE_STYLE}
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
              {t(`${MATRIX_I18N_PREFIX}.item_group`)}
            </label>
            <SegmentedControl
              options={[
                {
                  value: GroupType.EXISTING,
                  label: t(`${MATRIX_I18N_PREFIX}.select_existing_group`),
                },
                {
                  value: GroupType.NEW,
                  label: t(`${MATRIX_I18N_PREFIX}.new_group`),
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
              disabled={isUnselected}
              placeholder={t(`${MATRIX_I18N_PREFIX}.new_group_placeholder`)!}
            />
          ) : (
            <select
              id="editItemGroupLabel"
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className={MERMAID_INPUT_STYLE}
              disabled={isUnselected}
            >
              <option value="">
                {t(`${MATRIX_I18N_PREFIX}.select_existing_group_placeholder`)}
              </option>
              {groupOptions.map((item) => (
                <option key={`matrix-edit-group-opt-${item}`} value={item}>
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
        {t(`${MATRIX_I18N_PREFIX}.apply_changes`)}
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
      description: t(`${MATRIX_I18N_PREFIX}.action_edit_axis`),
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
        <p>{t(`${MATRIX_I18N_PREFIX}.edit_axis`)}</p>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-col">
          <p className={MERMAID_LABEL_STYLE}>
            {t(`${MATRIX_I18N_PREFIX}.x_axis_desc`)}
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={xMinInput}
              onChange={(e) => setXMinInput(e.target.value)}
              placeholder={t(`${MATRIX_I18N_PREFIX}.axis_placeholder`)!}
              className={MERMAID_INPUT_STYLE}
            />
            <MoveRight size={24} className="shrink-0" />
            <input
              type="text"
              value={xMaxInput}
              onChange={(e) => setXMaxInput(e.target.value)}
              placeholder={t(`${MATRIX_I18N_PREFIX}.axis_placeholder`)!}
              className={MERMAID_INPUT_STYLE}
            />
          </div>
        </div>
        <div className="flex flex-col">
          <p className={MERMAID_LABEL_STYLE}>
            {t(`${MATRIX_I18N_PREFIX}.y_axis_desc`)}
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={yMinInput}
              onChange={(e) => setYMinInput(e.target.value)}
              placeholder={t(`${MATRIX_I18N_PREFIX}.axis_placeholder`)!}
              className={MERMAID_INPUT_STYLE}
            />
            <MoveRight size={24} className="shrink-0" />
            <input
              type="text"
              value={yMaxInput}
              onChange={(e) => setYMaxInput(e.target.value)}
              placeholder={t(`${MATRIX_I18N_PREFIX}.axis_placeholder`)!}
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
        {t(`${MATRIX_I18N_PREFIX}.apply_changes`)}
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
        ? t(`${MATRIX_I18N_PREFIX}.action_delete_group`, {
            group: selectedGroup,
          })
        : color.trim() !== ""
          ? t(`${MATRIX_I18N_PREFIX}.action_edit_group_with_color`, {
              group: selectedGroup,
              count: memberIndexes.length,
              color,
            })
          : t(`${MATRIX_I18N_PREFIX}.action_edit_group`, {
              group: selectedGroup,
              count: memberIndexes.length,
            }),
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
        <p>{t(`${MATRIX_I18N_PREFIX}.edit_group`)}</p>
      </div>

      {/* Info: (20260721 - Julian) 選擇分組 */}
      <div className="flex flex-col">
        <label htmlFor="editGroupLabel" className={MERMAID_LABEL_STYLE}>
          {t(`${MATRIX_I18N_PREFIX}.select_edit_group`)}
          <span className="ml-0.5 text-red-500">*</span>
        </label>
        <select
          id="editGroupLabel"
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          className={MERMAID_INPUT_STYLE}
        >
          <option value="">
            {t(`${MATRIX_I18N_PREFIX}.select_edit_group`)}
          </option>
          {groupOptions.map((group) => (
            <option key={`matrix-group-opt-${group}`} value={group}>
              {group}
            </option>
          ))}
        </select>
      </div>

      {!selectedGroup ? (
        <div className="flex flex-col items-center gap-1 rounded-lg bg-slate-100 p-4">
          <p className="text-xs font-semibold text-slate-500">
            {t(`${MATRIX_I18N_PREFIX}.please_select_group`)}
          </p>
        </div>
      ) : (
        <>
          {/* Info: (20260721 - Julian) 分組顏色 */}
          <div className="flex flex-col gap-1.5">
            <p className={MERMAID_LABEL_STYLE}>
              {t(`${MATRIX_I18N_PREFIX}.group_color`)}
            </p>
            <ColorPicker
              colorOptions={DEFAULT_COLORS}
              value={color}
              onChange={setColor}
            />
          </div>

          {/* Info: (20260721 - Julian) 分組成員（勾選代表屬於此分組） */}
          <div className="flex flex-col gap-1.5">
            <p className={MERMAID_LABEL_STYLE}>
              {t(`${MATRIX_I18N_PREFIX}.group_members`)}
            </p>
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
                {t(`${MATRIX_I18N_PREFIX}.empty_group_title`)}
              </p>
              <p className="text-[10px] text-red-500">
                {t(`${MATRIX_I18N_PREFIX}.empty_group_warning`)}
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
        {t(`${MATRIX_I18N_PREFIX}.apply_changes`)}
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

  const { items: itemOptions, groups: groupOptions } = parsedMatrixData;

  const [selectedId, setSelectedId] = useState<string>("");
  const [selectedGroup, setSelectedGroup] = useState<string>("");

  const selectedItem = useMemo(
    () =>
      itemOptions.find((item) => item.lineIndex === Number(selectedId)) ?? null,
    [itemOptions, selectedId],
  );

  const isSubmitDisabled = !selectedItem && !selectedGroup;

  const handleSubmit = () => {
    if (selectedItem) {
      onAddAction({
        id: crypto.randomUUID(),
        type: MatrixActionType.DELETE_ITEM,
        description: t(`${MATRIX_I18N_PREFIX}.action_delete_item`, {
          label: selectedItem.label,
        }),
        payload: { lineIndex: selectedItem.lineIndex },
      });
      return;
    }
    if (selectedGroup) {
      onAddAction({
        id: crypto.randomUUID(),
        type: MatrixActionType.DELETE_ITEM,
        description: t(`${MATRIX_I18N_PREFIX}.action_delete_group`, {
          group: selectedGroup,
        }),
        payload: { group: selectedGroup },
      });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <MapPinX size={14} />
        <p>{t(`${MATRIX_I18N_PREFIX}.delete_item`)}</p>
      </div>
      <div className="flex flex-col">
        <label htmlFor="deleteItemLabel" className={MERMAID_LABEL_STYLE}>
          {t(`${MATRIX_I18N_PREFIX}.select_delete_item`)}
          <span className="ml-0.5 text-red-500">*</span>
        </label>
        <select
          id="deleteItemLabel"
          value={selectedId}
          // Info: (20260721 - Julian) 擇一：選項目時清除分組選取，選分組時停用本選單
          disabled={!!selectedGroup}
          onChange={(e) => {
            setSelectedId(e.target.value);
            setSelectedGroup("");
          }}
          className={MERMAID_INPUT_STYLE}
        >
          <option value="">
            {t(`${MATRIX_I18N_PREFIX}.select_delete_item`)}
          </option>
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
      <div className="flex flex-col">
        <label htmlFor="deleteGroupLabel" className={MERMAID_LABEL_STYLE}>
          {t(`${MATRIX_I18N_PREFIX}.select_delete_group`)}
          <span className="ml-0.5 text-red-500">*</span>
        </label>
        <select
          id="deleteGroupLabel"
          value={selectedGroup}
          // Info: (20260721 - Julian) 擇一：選分組時清除項目選取，選項目時停用本選單
          disabled={!!selectedItem}
          onChange={(e) => {
            setSelectedGroup(e.target.value);
            setSelectedId("");
          }}
          className={MERMAID_INPUT_STYLE}
        >
          <option value="">
            {t(`${MATRIX_I18N_PREFIX}.select_delete_group`)}
          </option>
          {groupOptions.map((group) => (
            <option key={`matrix-delete-group-opt-${group}`} value={group}>
              {group}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitDisabled}
        className={MERMAID_SUBMIT_BUTTON_STYLE}
      >
        {t(`${MATRIX_I18N_PREFIX}.delete_item`)}
      </button>
    </div>
  );
};

// Info: (20260721 - Julian) 「變更象限顏色」面板：分別為四象限挑選底色 → 送出 CHANGE_QUADRANT_COLOR
const ChangeQuadrantColorPanel: FC<IBasePanelProps> = ({
  parsedMatrixData,
  onAddAction,
}) => {
  const { t } = useTranslation();

  // Info: (20260721 - Julian) 以現有象限底色為初始值，缺項退回預設
  const initialColors = QUADRANT_LABELS.map(
    (_, i) => parsedMatrixData.quadrantColors[i] ?? DEFAULT_QUADRANT_COLORS[i],
  );

  const [colors, setColors] = useState<string[]>(initialColors);

  const setColorAt = (index: number, hex: string) =>
    setColors((prev) => prev.map((c, i) => (i === index ? hex : c)));

  // Info: (20260721 - Julian) 與初始值完全相同時停用送出
  const isSubmitDisabled = colors.every(
    (c, i) => c.toLowerCase() === initialColors[i].toLowerCase(),
  );

  const handleSubmit = () => {
    if (isSubmitDisabled) return;
    onAddAction({
      id: crypto.randomUUID(),
      type: MatrixActionType.CHANGE_QUADRANT_COLOR,
      description: t(`${MATRIX_I18N_PREFIX}.action_change_quadrant_color`),
      payload: { colors },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <Grid2x2 size={14} />
        <p>{t(`${MATRIX_I18N_PREFIX}.change_quadrant_color`)}</p>
      </div>
      <div className="flex flex-col gap-3">
        {QUADRANT_LABELS.map((l, i) => (
          <div
            key={`matrix-quadrant-${l.labelKey}`}
            className="flex flex-col gap-1.5"
          >
            <div className="flex items-center gap-1 text-slate-500">
              <Blocks size={14} className={`shrink-0 ${l.rotate}`} />
              <p className={MERMAID_LABEL_STYLE}>{t(l.labelKey)}</p>
            </div>
            <ColorPicker
              colorOptions={BACKGROUND_COLOR_OPTIONS}
              value={colors[i]}
              onChange={(hex) => setColorAt(i, hex)}
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitDisabled}
        className={MERMAID_SUBMIT_BUTTON_STYLE}
      >
        {t(`${MATRIX_I18N_PREFIX}.apply_changes`)}
      </button>
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
