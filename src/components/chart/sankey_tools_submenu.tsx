/* eslint-disable */
// ToDo: (20260713 - Julian) 這個元件還在開發中
import React, { useState, FC } from "react";
import {
  Repeat,
  Tag,
  Trash2,
  TrendingUp,
  Shuffle,
  LucideIcon,
} from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import {
  IChartAction,
  ISankeyData,
  MermaidActionType,
} from "@/lib/utils/mermaid_helpers";
import {
  MERMAID_INPUT_STYLE,
  MERMAID_LABEL_STYLE,
  MERMAID_SUBMIT_BUTTON_STYLE,
} from "@/constants/mermaid_chart";
import { SegmentedControl } from "@/components/chart/mermaid_common_components";

enum SankeyTools {
  ADD_LINK = "addLink",
  EDIT_LINK = "editLink",
  REVERSE_FLOW = "reverseFlow",
  CHANGE_NODE_NAME = "changeNodeName",
  DELETE_LINK = "deleteLink",
}

interface IToolItem {
  tool: SankeyTools;
  icon: LucideIcon;
}

const SANKEY_TOOLS: IToolItem[] = [
  {
    tool: SankeyTools.ADD_LINK,
    icon: TrendingUp,
  },
  {
    tool: SankeyTools.EDIT_LINK,
    icon: Shuffle,
  },
  {
    tool: SankeyTools.REVERSE_FLOW,
    icon: Repeat,
  },
  {
    tool: SankeyTools.CHANGE_NODE_NAME,
    icon: Tag,
  },
  {
    tool: SankeyTools.DELETE_LINK,
    icon: Trash2,
  },
];

const SANKEY_TOOL_TRANSLATION_KEYS: Record<SankeyTools, string> = {
  [SankeyTools.ADD_LINK]: "新增流向",
  [SankeyTools.EDIT_LINK]: "編輯流向",
  [SankeyTools.REVERSE_FLOW]: "反轉流向",
  [SankeyTools.CHANGE_NODE_NAME]: "變更節點名稱",
  [SankeyTools.DELETE_LINK]: "刪除流向",
};

interface IBasePanelProps {
  parsedSankeyData: ISankeyData;
  onAddAction: (action: IChartAction) => void;
}

enum NodeType {
  NEW = "new",
  EXISTING = "existing",
}

// Info: (20260713 - Julian) 「新增流向」面板
const AddLinkPanel: FC<IBasePanelProps> = ({
  parsedSankeyData,
  onAddAction,
}) => {
  const { t } = useTranslation();

  const [formType, setFormType] = useState<NodeType>(NodeType.EXISTING);
  const [formInput, setFormInput] = useState<string>("");
  const [toType, setToType] = useState<NodeType>(NodeType.EXISTING);
  const [toInput, setToInput] = useState<string>("");
  const [newValue, setNewValue] = useState<number>(0);

  const isSubmitDisabled = formInput === "" || toInput === "" || newValue === 0;

  const handleSubmit = () => {
    // onAddAction({
    //   id: crypto.randomUUID(),
    //   type: MermaidActionType.SANKEY_ADD_ITEM,
    //   description: `新增項目 "${sankeySliceLabel}" (${
    //     isProportion ? sankeySliceValue + "%" : sankeySliceValue
    //   })`,
    //   payload: {
    //     label: sankeySliceLabel,
    //     value: finalValue,
    //   },
    // });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <TrendingUp size={14} />
        <p>{t("新增流向")}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label htmlFor="addLinkFromLabel" className={MERMAID_LABEL_STYLE}>
              {t("資料來源（From）")}
              <span className="ml-0.5 text-red-500">*</span>
            </label>
            <SegmentedControl
              options={[
                { value: NodeType.EXISTING, label: "選擇現有節點" },
                { value: NodeType.NEW, label: "新增節點" },
              ]}
              value={formType}
              onChange={(val) => setFormType(val as NodeType)}
            />
          </div>
          {formType === NodeType.NEW ? (
            <input
              id="addLinkFromLabel"
              type="text"
              value={formInput}
              onChange={(e) => setFormInput(e.target.value)}
              className={MERMAID_INPUT_STYLE}
              placeholder={t("請填入新的資料來源")!}
            />
          ) : (
            <select
              id="addLinkFromLabel"
              value={formInput}
              onChange={(e) => setFormInput(e.target.value)}
              className={MERMAID_INPUT_STYLE}
            >
              <option value="">{t("請選擇現有資料來源")}</option>
            </select>
          )}
        </div>
        <div className="col-span-2 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label htmlFor="addLinkToLabel" className={MERMAID_LABEL_STYLE}>
              {t("流向目的地（To）")}
              <span className="ml-0.5 text-red-500">*</span>
            </label>
            <SegmentedControl
              options={[
                { value: NodeType.EXISTING, label: "選擇現有節點" },
                { value: NodeType.NEW, label: "新增節點" },
              ]}
              value={toType}
              onChange={(val) => setToType(val as NodeType)}
            />
          </div>
          {toType === NodeType.NEW ? (
            <input
              id="addLinkToLabel"
              type="text"
              value={toInput}
              onChange={(e) => setToInput(e.target.value)}
              className={MERMAID_INPUT_STYLE}
              placeholder={t("請填入新的資料來源")!}
            />
          ) : (
            <select
              id="addLinkToLabel"
              value={toInput}
              onChange={(e) => setToInput(e.target.value)}
              className={MERMAID_INPUT_STYLE}
            >
              <option value="">{t("請選擇現有資料來源")}</option>
            </select>
          )}
        </div>
        <div className="col-span-2 flex flex-col gap-2">
          <label htmlFor="addValueLabel" className={MERMAID_LABEL_STYLE}>
            {t("流向數量/權重（Value）")}
            <span className="ml-0.5 text-red-500">*</span>
          </label>
          <input
            id="addValueLabel"
            type="number"
            value={newValue}
            onChange={(e) => setNewValue(Number(e.target.value))}
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
        {t("新增流向")}
      </button>
    </div>
  );
};

// Info: (20260713 - Julian) 「編輯流向」面板
const EditLinkPanel: FC<IBasePanelProps> = ({
  parsedSankeyData,
  onAddAction,
}) => {
  const { t } = useTranslation();
  const [sankeySliceTarget, setSankeySliceTarget] = useState<string>("");
  const [sankeySliceNewLabel, setSankeySliceNewLabel] = useState<string>("");
  const [sankeySliceValue, setSankeySliceValue] = useState<string>("");

  const handleSubmit = () => {
    // onAddAction({
    //   id: crypto.randomUUID(),
    //   type: MermaidActionType.SANKEY_EDIT_ITEM,
    //   description: `修改項目 "${sankeySliceTarget}"`,
    //   payload: {
    //     oldLabel: sankeySliceTarget,
    //     newLabel: sankeySliceNewLabel || sankeySliceTarget,
    //     newValue: finalValue,
    //   },
    // });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <Shuffle size={14} />
        <p>{t("chart.mermaid.ai_editor.sankey.edit_slice_title")}</p>
      </div>
      <div className="flex flex-col">
        <label htmlFor="sankeySliceTarget" className={MERMAID_LABEL_STYLE}>
          {t("chart.mermaid.ai_editor.sankey.select_slice")}
          <span className="ml-0.5 text-red-500">*</span>
        </label>
        <select
          id="sankeySliceTarget"
          value={sankeySliceTarget}
          onChange={(e) => setSankeySliceTarget(e.target.value)}
          className={MERMAID_INPUT_STYLE}
        >
          <option value="">
            {t("chart.mermaid.ai_editor.sankey.select_slice_placeholder")}
          </option>
          {/* {parsedSankeyData.map((item) => (
            <option key={`sankey-edit-opt-${item.label}`} value={item.label}>
              {item.label} ({item.value})
            </option>
          ))} */}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 flex flex-col">
          <label htmlFor="sankeySliceNewLabel" className={MERMAID_LABEL_STYLE}>
            {t("chart.mermaid.ai_editor.sankey.new_name_label")}
          </label>
          <input
            id="sankeySliceNewLabel"
            type="text"
            value={sankeySliceNewLabel}
            onChange={(e) => setSankeySliceNewLabel(e.target.value)}
            className={MERMAID_INPUT_STYLE}
            placeholder={
              t("chart.mermaid.ai_editor.sankey.new_name_placeholder")!
            }
          />
        </div>
        <div className="col-span-2 flex flex-col">
          <div className="mb-1 flex items-center justify-between">
            <label
              htmlFor="sankeySliceValueEdit"
              className={MERMAID_LABEL_STYLE}
            >
              {t("chart.mermaid.ai_editor.sankey.new_value_label")}
            </label>
            {/* <SegmentedControl
              value={valueMode}
              onChange={(val) => setValueMode(val as SankeyValueMode)}
              options={[
                {
                  label: t("chart.mermaid.ai_editor.sankey.value_mode_value"),
                  value: SankeyValueMode.VALUE,
                },
                {
                  label: t(
                    "chart.mermaid.ai_editor.sankey.value_mode_proportion",
                  ),
                  value: SankeyValueMode.PROPORTION,
                },
              ]}
            /> */}
          </div>
          <input
            id="sankeySliceValueEdit"
            type="number"
            step="any"
            value={sankeySliceValue}
            onChange={(e) => setSankeySliceValue(e.target.value)}
            className={MERMAID_INPUT_STYLE}
            // placeholder={
            //   isProportion
            //     ? "例如: 25"
            //     : t("chart.mermaid.ai_editor.sankey.new_value_placeholder")!
            // }
          />
        </div>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={
          !sankeySliceTarget || (!sankeySliceValue && !sankeySliceNewLabel)
        }
        className={MERMAID_SUBMIT_BUTTON_STYLE}
      >
        {t("chart.mermaid.ai_editor.sankey.edit_slice")}
      </button>
    </div>
  );
};

// Info: (20260713 - Julian) 「反轉流向」面板
const ReverseFlowPanel: FC<IBasePanelProps> = ({
  parsedSankeyData,
  onAddAction,
}) => {
  const { t } = useTranslation();
  const [sankeySliceTarget, setSankeySliceTarget] = useState<string>("");
  const [sankeySliceNewLabel, setSankeySliceNewLabel] = useState<string>("");
  const [sankeySliceValue, setSankeySliceValue] = useState<string>("");

  const handleSubmit = () => {
    // onAddAction({
    //   id: crypto.randomUUID(),
    //   type: MermaidActionType.SANKEY_EDIT_ITEM,
    //   description: `修改項目 "${sankeySliceTarget}"`,
    //   payload: {
    //     oldLabel: sankeySliceTarget,
    //     newLabel: sankeySliceNewLabel || sankeySliceTarget,
    //     newValue: finalValue,
    //   },
    // });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <Repeat size={14} />
        <p>{t("chart.mermaid.ai_editor.sankey.edit_slice_title")}</p>
      </div>
      <div className="flex flex-col">
        <label htmlFor="sankeySliceTarget" className={MERMAID_LABEL_STYLE}>
          {t("chart.mermaid.ai_editor.sankey.select_slice")}
          <span className="ml-0.5 text-red-500">*</span>
        </label>
        <select
          id="sankeySliceTarget"
          value={sankeySliceTarget}
          onChange={(e) => setSankeySliceTarget(e.target.value)}
          className={MERMAID_INPUT_STYLE}
        >
          <option value="">
            {t("chart.mermaid.ai_editor.sankey.select_slice_placeholder")}
          </option>
          {/* {parsedSankeyData.map((item) => (
            <option key={`sankey-edit-opt-${item.label}`} value={item.label}>
              {item.label} ({item.value})
            </option>
          ))} */}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 flex flex-col">
          <label htmlFor="sankeySliceNewLabel" className={MERMAID_LABEL_STYLE}>
            {t("chart.mermaid.ai_editor.sankey.new_name_label")}
          </label>
          <input
            id="sankeySliceNewLabel"
            type="text"
            value={sankeySliceNewLabel}
            onChange={(e) => setSankeySliceNewLabel(e.target.value)}
            className={MERMAID_INPUT_STYLE}
            placeholder={
              t("chart.mermaid.ai_editor.sankey.new_name_placeholder")!
            }
          />
        </div>
        <div className="col-span-2 flex flex-col">
          <div className="mb-1 flex items-center justify-between">
            <label
              htmlFor="sankeySliceValueEdit"
              className={MERMAID_LABEL_STYLE}
            >
              {t("chart.mermaid.ai_editor.sankey.new_value_label")}
            </label>
            {/* <SegmentedControl
              value={valueMode}
              onChange={(val) => setValueMode(val as SankeyValueMode)}
              options={[
                {
                  label: t("chart.mermaid.ai_editor.sankey.value_mode_value"),
                  value: SankeyValueMode.VALUE,
                },
                {
                  label: t(
                    "chart.mermaid.ai_editor.sankey.value_mode_proportion",
                  ),
                  value: SankeyValueMode.PROPORTION,
                },
              ]}
            /> */}
          </div>
          <input
            id="sankeySliceValueEdit"
            type="number"
            step="any"
            value={sankeySliceValue}
            onChange={(e) => setSankeySliceValue(e.target.value)}
            className={MERMAID_INPUT_STYLE}
            // placeholder={
            //   isProportion
            //     ? "例如: 25"
            //     : t("chart.mermaid.ai_editor.sankey.new_value_placeholder")!
            // }
          />
        </div>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={
          !sankeySliceTarget || (!sankeySliceValue && !sankeySliceNewLabel)
        }
        className={MERMAID_SUBMIT_BUTTON_STYLE}
      >
        {t("chart.mermaid.ai_editor.sankey.edit_slice")}
      </button>
    </div>
  );
};

// Info: (20260713 - Julian) 「變更節點名稱」面板
const ChangeNodeNamePanel: FC<IBasePanelProps> = ({
  parsedSankeyData,
  onAddAction,
}) => {
  const { t } = useTranslation();
  const [sankeySliceTarget, setSankeySliceTarget] = useState<string>("");
  const [sankeySliceNewLabel, setSankeySliceNewLabel] = useState<string>("");
  const [sankeySliceValue, setSankeySliceValue] = useState<string>("");

  const handleSubmit = () => {
    // onAddAction({
    //   id: crypto.randomUUID(),
    //   type: MermaidActionType.SANKEY_EDIT_ITEM,
    //   description: `修改項目 "${sankeySliceTarget}"`,
    //   payload: {
    //     oldLabel: sankeySliceTarget,
    //     newLabel: sankeySliceNewLabel || sankeySliceTarget,
    //     newValue: finalValue,
    //   },
    // });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <Tag size={14} />
        <p>{t("chart.mermaid.ai_editor.sankey.edit_slice_title")}</p>
      </div>
      <div className="flex flex-col">
        <label htmlFor="sankeySliceTarget" className={MERMAID_LABEL_STYLE}>
          {t("chart.mermaid.ai_editor.sankey.select_slice")}
          <span className="ml-0.5 text-red-500">*</span>
        </label>
        <select
          id="sankeySliceTarget"
          value={sankeySliceTarget}
          onChange={(e) => setSankeySliceTarget(e.target.value)}
          className={MERMAID_INPUT_STYLE}
        >
          <option value="">
            {t("chart.mermaid.ai_editor.sankey.select_slice_placeholder")}
          </option>
          {/* {parsedSankeyData.map((item) => (
            <option key={`sankey-edit-opt-${item.label}`} value={item.label}>
              {item.label} ({item.value})
            </option>
          ))} */}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 flex flex-col">
          <label htmlFor="sankeySliceNewLabel" className={MERMAID_LABEL_STYLE}>
            {t("chart.mermaid.ai_editor.sankey.new_name_label")}
          </label>
          <input
            id="sankeySliceNewLabel"
            type="text"
            value={sankeySliceNewLabel}
            onChange={(e) => setSankeySliceNewLabel(e.target.value)}
            className={MERMAID_INPUT_STYLE}
            placeholder={
              t("chart.mermaid.ai_editor.sankey.new_name_placeholder")!
            }
          />
        </div>
        <div className="col-span-2 flex flex-col">
          <div className="mb-1 flex items-center justify-between">
            <label
              htmlFor="sankeySliceValueEdit"
              className={MERMAID_LABEL_STYLE}
            >
              {t("chart.mermaid.ai_editor.sankey.new_value_label")}
            </label>
            {/* <SegmentedControl
              value={valueMode}
              onChange={(val) => setValueMode(val as SankeyValueMode)}
              options={[
                {
                  label: t("chart.mermaid.ai_editor.sankey.value_mode_value"),
                  value: SankeyValueMode.VALUE,
                },
                {
                  label: t(
                    "chart.mermaid.ai_editor.sankey.value_mode_proportion",
                  ),
                  value: SankeyValueMode.PROPORTION,
                },
              ]}
            /> */}
          </div>
          <input
            id="sankeySliceValueEdit"
            type="number"
            step="any"
            value={sankeySliceValue}
            onChange={(e) => setSankeySliceValue(e.target.value)}
            className={MERMAID_INPUT_STYLE}
            // placeholder={
            //   isProportion
            //     ? "例如: 25"
            //     : t("chart.mermaid.ai_editor.sankey.new_value_placeholder")!
            // }
          />
        </div>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={
          !sankeySliceTarget || (!sankeySliceValue && !sankeySliceNewLabel)
        }
        className={MERMAID_SUBMIT_BUTTON_STYLE}
      >
        {t("chart.mermaid.ai_editor.sankey.edit_slice")}
      </button>
    </div>
  );
};

// Info: (20260629 - Julian) 「刪除流向」面板
const DeleteLinkPanel: FC<IBasePanelProps> = ({
  parsedSankeyData,
  onAddAction,
}) => {
  const { t } = useTranslation();
  const [sankeySliceTarget, setSankeySliceTarget] = useState<string>("");

  const handleSubmit = () => {
    // if (!sankeySliceTarget) return;
    // onAddAction({
    //   id: crypto.randomUUID(),
    //   type: MermaidActionType.SANKEY_DELETE_ITEM,
    //   description: `刪除項目 "${sankeySliceTarget}"`,
    //   payload: {
    //     label: sankeySliceTarget,
    //   },
    // });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <Trash2 size={14} />
        <p>{t("chart.mermaid.ai_editor.sankey.delete_slice_title")}</p>
      </div>
      <div className="flex flex-col">
        <label htmlFor="sankeySliceTargetDel" className={MERMAID_LABEL_STYLE}>
          {t("chart.mermaid.ai_editor.sankey.select_delete")}
          <span className="ml-0.5 text-red-500">*</span>
        </label>
        <select
          id="sankeySliceTargetDel"
          value={sankeySliceTarget}
          onChange={(e) => setSankeySliceTarget(e.target.value)}
          className={MERMAID_INPUT_STYLE}
        >
          <option value="">
            {t("chart.mermaid.ai_editor.sankey.select_delete_placeholder")}
          </option>
          {/* {parsedSankeyData.map((item) => (
            <option key={`sankey-del-opt-${item.label}`} value={item.label}>
              {item.label}
            </option>
          ))} */}
        </select>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!sankeySliceTarget}
        className={MERMAID_SUBMIT_BUTTON_STYLE}
      >
        {t("chart.mermaid.ai_editor.sankey.delete_slice")}
      </button>
    </div>
  );
};

const SANKEY_TOOL_PANELS: Record<SankeyTools, FC<IBasePanelProps>> = {
  [SankeyTools.ADD_LINK]: AddLinkPanel,
  [SankeyTools.EDIT_LINK]: EditLinkPanel,
  [SankeyTools.REVERSE_FLOW]: ReverseFlowPanel,
  [SankeyTools.CHANGE_NODE_NAME]: ChangeNodeNamePanel,
  [SankeyTools.DELETE_LINK]: DeleteLinkPanel,
};

interface ISankeyToolsSectionProps {
  selectedTool: string | null;
  setSelectedTool: React.Dispatch<React.SetStateAction<string | null>>;
  parsedSankeyData: ISankeyData | null;
  onAddAction: (action: IChartAction) => void;
}

export const SankeyToolsSection: FC<ISankeyToolsSectionProps> = ({
  selectedTool,
  setSelectedTool,
  parsedSankeyData,
  onAddAction,
}) => {
  const { t } = useTranslation();

  const handleAddActionWithReset = (action: IChartAction) => {
    onAddAction(action);
    setSelectedTool(null);
  };

  const isSankeyToolSelected = Object.values(SankeyTools).includes(
    selectedTool as SankeyTools,
  );

  const ActivePanel = isSankeyToolSelected
    ? SANKEY_TOOL_PANELS[selectedTool as SankeyTools]
    : null;

  return (
    <>
      {/* Info: (20260629 - Julian) 快捷工具選擇列 */}
      <div className="flex flex-wrap gap-1.5">
        {SANKEY_TOOLS.map((item) => {
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
              <p>{t(SANKEY_TOOL_TRANSLATION_KEYS[item.tool])}</p>
            </button>
          );
        })}
      </div>

      {ActivePanel && parsedSankeyData && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <ActivePanel
            parsedSankeyData={parsedSankeyData}
            onAddAction={handleAddActionWithReset}
          />
        </div>
      )}
    </>
  );
};
