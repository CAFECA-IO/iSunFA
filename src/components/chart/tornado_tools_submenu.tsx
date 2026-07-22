// ToDo: (20260722 - Julian) 此元件還在開發中
import React, {
  useState,
  useMemo,
  // useEffect,
  FC,
} from "react";
import {
  Grid2x2,
  MapPinX,
  Move,
  LucideIcon,
  Palette,
  UnfoldHorizontal,
} from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
// import {
//   MatrixActionType,
//   BACKGROUND_COLOR_OPTIONS,
// } from "@/constants/custom_chart";
import { IMatrixAction } from "@/interfaces/custom_chart";
import { parseMatrixData } from "@/lib/utils/custom_matrix_editor";
import {
  MERMAID_INPUT_STYLE,
  MERMAID_LABEL_STYLE,
  MERMAID_SUBMIT_BUTTON_STYLE,
} from "@/constants/mermaid_chart";
// import { SegmentedControl } from "@/components/chart/mermaid_common_components";
// import { DEFAULT_COLORS } from "@/components/common/donut_chart";
// import { Checkbox } from "@/components/common/checkbox";
// import ColorPicker from "@/components/common/color_picker";

// Info: (20260722 - Julian) 龍捲風工具 i18n key 前綴，字面值收斂於 locale 檔
// const TORNADO_I18N_PREFIX = "chart.custom_chart.matrix";

// Info: (20260721 - Julian) 四象限標籤（Q1..Q4，對應渲染順序：右上、左上、左下、右下）
// const QUADRANT_LABELS = [
//   { labelKey: `${MATRIX_I18N_PREFIX}.quadrant_1`, rotate: "rotate-0" },
//   { labelKey: `${MATRIX_I18N_PREFIX}.quadrant_2`, rotate: "rotate-270" },
//   { labelKey: `${MATRIX_I18N_PREFIX}.quadrant_3`, rotate: "rotate-180" },
//   { labelKey: `${MATRIX_I18N_PREFIX}.quadrant_4`, rotate: "rotate-90" },
// ];

// enum GroupType {
//   EXISTING = "existing",
//   NEW = "new",
// }

enum TornadoTools {
  EDIT_BASELINE = "editBaseline",
  ADD_ITEM = "addItem",
  EDIT_ITEM = "editItem",
  EDIT_AXIS = "editAxis",
  CHANGE_COLOR = "changeColor",
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
    icon: Grid2x2,
  },
  {
    tool: TornadoTools.EDIT_ITEM,
    icon: Grid2x2,
  },
  {
    tool: TornadoTools.EDIT_AXIS,
    icon: Grid2x2,
  },
  {
    tool: TornadoTools.CHANGE_COLOR,
    icon: Palette,
  },
  {
    tool: TornadoTools.DELETE_ITEM,
    icon: Grid2x2,
  },
];

const TORNADO_TOOL_TRANSLATION_KEYS: Record<TornadoTools, string> = {
  [TornadoTools.EDIT_BASELINE]: `編輯基準線`,
  [TornadoTools.ADD_ITEM]: `新增分析項目`,
  [TornadoTools.EDIT_ITEM]: `編輯項目數值`,
  [TornadoTools.EDIT_AXIS]: `變更坐標軸`,
  [TornadoTools.CHANGE_COLOR]: `變更顏色`,
  [TornadoTools.DELETE_ITEM]: `刪除分析項目`,
};

interface IBasePanelProps {
  // ToDo: (20260722 - Julian) 開發完畢後移除
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parsedTornadoData: any;
  onAddAction: (action: IMatrixAction) => void;
}

// Info: (20260722 - Julian) 「編輯基準線」面板
const EditBaselinePanel: FC<IBasePanelProps> = (
  {
    // parsedTornadoData,
    // onAddAction,
  },
) => {
  const { t } = useTranslation();

  const [selectedId, setSelectedId] = useState<string>("");

  // Info: (20260721 - Julian) 目前選取的資料點（以 lineIndex 定位）
  // const selectedItem = useMemo(
  //   () =>
  //     itemOptions.find((item) => item.lineIndex === Number(selectedId)) ?? null,
  //   [itemOptions, selectedId],
  // );

  // Info: (20260721 - Julian) 選取後匯入初始值
  // useEffect(() => {
  //   if (selectedItem) {
  //     setTitleInput(selectedItem.label);
  //     setXCoord(selectedItem.x);
  //     setYCoord(selectedItem.y);
  //     if (selectedItem.group) setSelectedGroup(selectedItem.group);
  //   } else {
  //     setTitleInput("");
  //     setXCoord(0);
  //     setYCoord(0);
  //     setSelectedGroup("");
  //   }
  // }, [selectedItem]);

  // Info: (20260721 - Julian) 尚未選擇項目
  // const isUnselected = !selectedItem;

  // Info: (20260721 - Julian) 尚未變更表單
  // const isUnchanged =
  //   !!selectedItem &&
  //   titleInput.trim() === selectedItem.label &&
  //   xCoord === selectedItem.x &&
  //   yCoord === selectedItem.y &&
  //   selectedGroup === selectedItem.group;

  // Info: (20260721 - Julian) 鎖定提交按鈕
  const isSubmitDisabled = false;
  // isUnselected || titleInput.trim() === "" || isUnchanged;

  const handleSubmit = () => {
    // if (!selectedItem || isSubmitDisabled) return;
    // const label = titleInput.trim();
    // onAddAction({
    //   id: crypto.randomUUID(),
    //   type: MatrixActionType.EDIT_ITEM,
    //   description: t(`${MATRIX_I18N_PREFIX}.action_edit_item`, {
    //     label,
    //     x: xCoord,
    //     y: yCoord,
    //   }),
    //   payload: {
    //     lineIndex: selectedItem.lineIndex,
    //     label,
    //     x: xCoord,
    //     y: yCoord,
    //     group: selectedGroup,
    //   },
    // });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <UnfoldHorizontal size={14} />
        <p>{t(`編輯項目數值`)}</p>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-col">
          <label htmlFor="editBaselineLabel" className={MERMAID_LABEL_STYLE}>
            {t(`選擇欲編輯的項目`)}
            <span className="ml-0.5 text-red-500">*</span>
          </label>
          <select
            id="editBaselineLabel"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className={MERMAID_INPUT_STYLE}
          >
            <option value="">{t(`選擇欲編輯的項目`)}</option>
            {/* {itemOptions.map((item) => (
              <option
                key={`matrix-edit-opt-${item.lineIndex}`}
                value={item.lineIndex}
              >
                {item.label}（{item.x}, {item.y}）
              </option>
            ))} */}
          </select>
        </div>
        {/* <div className="flex flex-col">
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
        </div> */}
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

// Info: (20260722 - Julian) 「新增分析項目」面板
const AddItemPanel: FC<IBasePanelProps> = (
  {
    // parsedTornadoData,
    // onAddAction,
  },
) => {
  const { t } = useTranslation();

  const [titleInput, setTitleInput] = useState<string>("");

  const isSubmitDisabled = titleInput.trim() === "";

  const handleSubmit = () => {
    // if (isSubmitDisabled) return;
    // const label = titleInput.trim();
    // onAddAction({
    //   id: crypto.randomUUID(),
    //   type: MatrixActionType.ADD_ITEM,
    //   description: t(`${MATRIX_I18N_PREFIX}.action_add_item`, {
    //     label,
    //     x: xCoord,
    //     y: yCoord,
    //   }),
    //   payload: { label, x: xCoord, y: yCoord, group: selectedGroup },
    // });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <Grid2x2 size={14} />
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
        {/* <div className="flex flex-col gap-1">
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
        </div> */}
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

// Info: (20260722 - Julian) 「編輯項目數值」面板
const EditItemPanel: FC<IBasePanelProps> = (
  {
    // parsedTornadoData,
    // onAddAction,
  },
) => {
  const { t } = useTranslation();

  const [selectedId, setSelectedId] = useState<string>("");

  // Info: (20260721 - Julian) 目前選取的資料點（以 lineIndex 定位）
  // const selectedItem = useMemo(
  //   () =>
  //     itemOptions.find((item) => item.lineIndex === Number(selectedId)) ?? null,
  //   [itemOptions, selectedId],
  // );

  // Info: (20260721 - Julian) 選取後匯入初始值
  // useEffect(() => {
  //   if (selectedItem) {
  //     setTitleInput(selectedItem.label);
  //     setXCoord(selectedItem.x);
  //     setYCoord(selectedItem.y);
  //     if (selectedItem.group) setSelectedGroup(selectedItem.group);
  //   } else {
  //     setTitleInput("");
  //     setXCoord(0);
  //     setYCoord(0);
  //     setSelectedGroup("");
  //   }
  // }, [selectedItem]);

  // Info: (20260721 - Julian) 尚未選擇項目
  // const isUnselected = !selectedItem;

  // Info: (20260721 - Julian) 尚未變更表單
  // const isUnchanged =
  //   !!selectedItem &&
  //   titleInput.trim() === selectedItem.label &&
  //   xCoord === selectedItem.x &&
  //   yCoord === selectedItem.y &&
  //   selectedGroup === selectedItem.group;

  // Info: (20260721 - Julian) 鎖定提交按鈕
  const isSubmitDisabled = false;
  // isUnselected || titleInput.trim() === "" || isUnchanged;

  const handleSubmit = () => {
    // if (!selectedItem || isSubmitDisabled) return;
    // const label = titleInput.trim();
    // onAddAction({
    //   id: crypto.randomUUID(),
    //   type: MatrixActionType.EDIT_ITEM,
    //   description: t(`${MATRIX_I18N_PREFIX}.action_edit_item`, {
    //     label,
    //     x: xCoord,
    //     y: yCoord,
    //   }),
    //   payload: {
    //     lineIndex: selectedItem.lineIndex,
    //     label,
    //     x: xCoord,
    //     y: yCoord,
    //     group: selectedGroup,
    //   },
    // });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <Grid2x2 size={14} />
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
            {/* {itemOptions.map((item) => (
              <option
                key={`matrix-edit-opt-${item.lineIndex}`}
                value={item.lineIndex}
              >
                {item.label}（{item.x}, {item.y}）
              </option>
            ))} */}
          </select>
        </div>
        {/* <div className="flex flex-col">
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
        </div> */}
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

// Info: (20260721 - Julian) 「變更坐標軸」面板
const EditAxisPanel: FC<IBasePanelProps> = (
  {
    // parsedTornadoData,
    // onAddAction,
  },
) => {
  const { t } = useTranslation();

  // Info: (20260721 - Julian) 以現有雙極端點文字作為初始值（未設定則留白）
  // const initialXMin = xAxis.min ?? "";
  // const initialXMax = xAxis.max ?? "";
  // const initialYMin = yAxis.min ?? "";
  // const initialYMax = yAxis.max ?? "";

  // const [xMinInput, setXMinInput] = useState<string>(initialXMin);
  // const [xMaxInput, setXMaxInput] = useState<string>(initialXMax);
  // const [yMinInput, setYMinInput] = useState<string>(initialYMin);
  // const [yMaxInput, setYMaxInput] = useState<string>(initialYMax);

  const isSubmitDisabled = false;
  // xMinInput.trim() === initialXMin.trim() &&
  // xMaxInput.trim() === initialXMax.trim() &&
  // yMinInput.trim() === initialYMin.trim() &&
  // yMaxInput.trim() === initialYMax.trim();

  const handleSubmit = () => {
    // if (isSubmitDisabled) return;
    // onAddAction({
    //   id: crypto.randomUUID(),
    //   type: MatrixActionType.EDIT_AXIS,
    //   description: t(`${MATRIX_I18N_PREFIX}.action_edit_axis`),
    //   payload: {
    //     xMin: xMinInput.trim(),
    //     xMax: xMaxInput.trim(),
    //     yMin: yMinInput.trim(),
    //     yMax: yMaxInput.trim(),
    //   },
    // });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <Move size={14} />
        <p>{t(`變更坐標軸`)}</p>
      </div>
      <div className="flex flex-col gap-2">
        {/* <div className="flex flex-col">
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
        <div className="flex flex-col"></div>
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
        </div> */}
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

// Info: (20260722 - Julian) 「變更顏色」面板
const ChangeColorPanel: FC<IBasePanelProps> = (
  {
    // parsedTornadoData,
    // onAddAction,
  },
) => {
  const { t } = useTranslation();

  // Info: (20260721 - Julian) 以現有象限底色為初始值，缺項退回預設
  // const initialColors = QUADRANT_LABELS.map(
  //   (_, i) => parsedTornadoData.quadrantColors[i] ?? DEFAULT_QUADRANT_COLORS[i],
  // );

  // const [colors, setColors] = useState<string[]>([]);

  // const setColorAt = (index: number, hex: string) =>
  //   setColors((prev) => prev.map((c, i) => (i === index ? hex : c)));

  // Info: (20260721 - Julian) 與初始值完全相同時停用送出
  const isSubmitDisabled = false;
  // colors.every(
  //   (c, i) => c.toLowerCase() === initialColors[i].toLowerCase(),
  // );

  const handleSubmit = () => {
    // if (isSubmitDisabled) return;
    // onAddAction({
    //   id: crypto.randomUUID(),
    //   type: MatrixActionType.CHANGE_QUADRANT_COLOR,
    //   description: t(`${MATRIX_I18N_PREFIX}.action_change_quadrant_color`),
    //   payload: { colors },
    // });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <Palette size={14} />
        <p>{t(`變更顏色`)}</p>
      </div>
      <div className="flex flex-col gap-3">
        {/* {QUADRANT_LABELS.map((l, i) => (
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
        ))} */}
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

// Info: (20260722 - Julian) 「刪除分析項目」面板
const DeleteItemPanel: FC<IBasePanelProps> = (
  {
    // parsedTornadoData,
    // onAddAction,
  },
) => {
  const { t } = useTranslation();

  const [selectedId, setSelectedId] = useState<string>("");

  // const selectedItem = useMemo(
  //   () =>
  //     itemOptions.find((item) => item.lineIndex === Number(selectedId)) ?? null,
  //   [itemOptions, selectedId],
  // );

  const isSubmitDisabled = false; // !selectedItem && !selectedGroup;

  const handleSubmit = () => {
    // if (selectedItem) {
    //   onAddAction({
    //     id: crypto.randomUUID(),
    //     type: MatrixActionType.DELETE_ITEM,
    //     description: t(`${MATRIX_I18N_PREFIX}.action_delete_item`, {
    //       label: selectedItem.label,
    //     }),
    //     payload: { lineIndex: selectedItem.lineIndex },
    //   });
    //   return;
    // }
    // if (selectedGroup) {
    //   onAddAction({
    //     id: crypto.randomUUID(),
    //     type: MatrixActionType.DELETE_ITEM,
    //     description: t(`${MATRIX_I18N_PREFIX}.action_delete_group`, {
    //       group: selectedGroup,
    //     }),
    //     payload: { group: selectedGroup },
    //   });
    // }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <MapPinX size={14} />
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
          onChange={(e) => {
            setSelectedId(e.target.value);
          }}
          className={MERMAID_INPUT_STYLE}
        >
          <option value="">{t(`選擇欲刪除的分析項目`)}</option>
          {/* {itemOptions.map((item) => (
            <option
              key={`matrix-delete-opt-${item.lineIndex}`}
              value={item.lineIndex}
            >
              {item.label}（{item.x}, {item.y}）
            </option>
          ))} */}
        </select>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitDisabled}
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
  [TornadoTools.EDIT_AXIS]: EditAxisPanel,
  [TornadoTools.CHANGE_COLOR]: ChangeColorPanel,
  [TornadoTools.DELETE_ITEM]: DeleteItemPanel,
};

interface ITornadoToolsSectionProps {
  selectedTool: string | null;
  setSelectedTool: React.Dispatch<React.SetStateAction<string | null>>;
  chart: string;
  // ToDo: (20260722 - Julian) 開發完畢後移除
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onAddAction: (action: any) => void;
}

export const TornadoToolsSection: FC<ITornadoToolsSectionProps> = ({
  selectedTool,
  setSelectedTool,
  chart,
  onAddAction,
}) => {
  const { t } = useTranslation();

  // Info: (20260721 - Julian) 元件自行解析所需資料，父層只需傳入圖表字串
  const parsedTornadoData = useMemo(() => parseMatrixData(chart), [chart]);

  // Info: (20260721 - Julian) 送出動作後收合面板，回到工具選擇列
  const handleAddActionWithReset = (action: IMatrixAction) => {
    onAddAction(action);
    setSelectedTool(null);
  };

  const isMatrixToolSelected = Object.values(TornadoTools).includes(
    selectedTool as TornadoTools,
  );

  const ActivePanel = isMatrixToolSelected
    ? TORNADO_TOOL_PANELS[selectedTool as TornadoTools]
    : null;

  return (
    <>
      {/* Info: (20260721 - Julian) 快捷工具選擇列 */}
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
