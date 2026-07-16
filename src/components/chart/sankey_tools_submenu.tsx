import React, { useState, useMemo, FC, useEffect } from "react";
import {
  Repeat,
  Tag,
  Eraser,
  TrendingUp,
  Shuffle,
  LucideIcon,
} from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import {
  IChartAction,
  ISankeyData,
  ISankeyLink,
  MermaidActionType,
  parseSankeyData,
} from "@/lib/utils/mermaid_helpers";
import {
  MERMAID_INPUT_STYLE,
  MERMAID_LABEL_STYLE,
  MERMAID_SUBMIT_BUTTON_STYLE,
} from "@/constants/mermaid_chart";
import { SegmentedControl } from "@/components/chart/mermaid_common_components";
import { useDecimalInput } from "@/hooks/use_decimal_input";

enum SankeyTools {
  ADD_LINK = "addLink",
  EDIT_LINK = "editLink",
  REVERSE_FLOW = "reverseFlow",
  RENAME_NODE = "renameNode",
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
    tool: SankeyTools.RENAME_NODE,
    icon: Tag,
  },
  {
    tool: SankeyTools.DELETE_LINK,
    icon: Eraser,
  },
];

const SANKEY_TOOL_TRANSLATION_KEYS: Record<SankeyTools, string> = {
  [SankeyTools.ADD_LINK]: "chart.mermaid.ai_editor.sankey.add_link",
  [SankeyTools.EDIT_LINK]: "chart.mermaid.ai_editor.sankey.edit_link",
  [SankeyTools.REVERSE_FLOW]: "chart.mermaid.ai_editor.sankey.reverse_flow",
  [SankeyTools.RENAME_NODE]: "chart.mermaid.ai_editor.sankey.rename_node",
  [SankeyTools.DELETE_LINK]: "chart.mermaid.ai_editor.sankey.delete_link",
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

  const nodeOptions = parsedSankeyData.nodes;

  const [formType, setFormType] = useState<NodeType>(NodeType.EXISTING);
  const [formInput, setFormInput] = useState<string>("");
  const [toType, setToType] = useState<NodeType>(NodeType.EXISTING);
  const [toInput, setToInput] = useState<string>("");

  // Info: (20260714 - Julian) 流向數量/權重：只允許數字與小數點（詳見 useDecimalInput）
  const newValue = useDecimalInput("0");

  const isSubmitDisabled =
    formInput.trim() === "" || toInput.trim() === "" || newValue.numValue === 0;

  const handleSubmit = () => {
    onAddAction({
      id: crypto.randomUUID(),
      type: MermaidActionType.SANKEY_ADD_LINK,
      description: t("chart.mermaid.ai_editor.sankey.action_add_link", {
        source: formInput,
        target: toInput,
      }),
      payload: {
        source: formInput,
        target: toInput,
        value: newValue.numValue,
      },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <TrendingUp size={14} />
        <p>{t("chart.mermaid.ai_editor.sankey.add_link")}</p>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label htmlFor="addLinkFromLabel" className={MERMAID_LABEL_STYLE}>
              {t("chart.mermaid.ai_editor.sankey.data_source_from")}
              <span className="ml-0.5 text-red-500">*</span>
            </label>
            <SegmentedControl
              options={[
                {
                  value: NodeType.EXISTING,
                  label: t("chart.mermaid.ai_editor.sankey.node_type_existing"),
                },
                {
                  value: NodeType.NEW,
                  label: t("chart.mermaid.ai_editor.sankey.node_type_new"),
                },
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
              placeholder={
                t("chart.mermaid.ai_editor.sankey.new_node_placeholder")!
              }
            />
          ) : (
            <select
              id="addLinkFromLabel"
              value={formInput}
              onChange={(e) => setFormInput(e.target.value)}
              className={MERMAID_INPUT_STYLE}
            >
              <option value="">
                {t("chart.mermaid.ai_editor.sankey.select_existing_source")}
              </option>
              {nodeOptions.map((item) => (
                <option key={`sankey-add-opt-${item}`} value={item}>
                  {item}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label htmlFor="addLinkToLabel" className={MERMAID_LABEL_STYLE}>
              {t("chart.mermaid.ai_editor.sankey.flow_target_to")}
              <span className="ml-0.5 text-red-500">*</span>
            </label>
            <SegmentedControl
              options={[
                {
                  value: NodeType.EXISTING,
                  label: t("chart.mermaid.ai_editor.sankey.node_type_existing"),
                },
                {
                  value: NodeType.NEW,
                  label: t("chart.mermaid.ai_editor.sankey.node_type_new"),
                },
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
              placeholder={
                t("chart.mermaid.ai_editor.sankey.new_node_placeholder")!
              }
            />
          ) : (
            <select
              id="addLinkToLabel"
              value={toInput}
              onChange={(e) => setToInput(e.target.value)}
              className={MERMAID_INPUT_STYLE}
            >
              <option value="">
                {t("chart.mermaid.ai_editor.sankey.select_existing_source")}
              </option>
              {nodeOptions.map((item) => (
                <option key={`sankey-add-opt-${item}`} value={item}>
                  {item}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex flex-col">
          <label htmlFor="addValueLabel" className={MERMAID_LABEL_STYLE}>
            {t("chart.mermaid.ai_editor.sankey.flow_value")}
            <span className="ml-0.5 text-red-500">*</span>
          </label>
          <input
            id="addValueLabel"
            type="text"
            // Info: (20260714 - Julian) 保持 type="text" 以維持 UX，改用 inputMode 呼出數字鍵盤
            inputMode="decimal"
            value={newValue.value}
            onChange={newValue.onChange}
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
        {t("chart.mermaid.ai_editor.sankey.add_link")}
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

  const linkOptions = parsedSankeyData.links;
  const nodeOptions = parsedSankeyData.nodes;

  const [selectedLinkId, setSelectedLinkId] = useState<string>("");
  const [selectedLink, setSelectedLink] = useState<ISankeyLink | null>(null);
  const [newSource, setNewSource] = useState<string>("");
  const [newTarget, setNewTarget] = useState<string>("");
  const [newLinkValue, setNewLinkValue] = useState<number>(0);

  // Info: (20260713 - Julian) 初始 source & target & value
  const initialSource = selectedLink ? selectedLink.source : "";
  const initialTarget = selectedLink ? selectedLink.target : "";
  const initialValue = selectedLink ? selectedLink.value : 0;

  useEffect(() => {
    const selectedLink = linkOptions.find(
      (link) => link.lineIndex === Number(selectedLinkId),
    );
    setSelectedLink(selectedLink ?? null);
  }, [selectedLinkId, linkOptions]);

  useEffect(() => {
    // Info: (20260713 - Julian) 匯入初始值
    setNewSource(initialSource);
    setNewTarget(initialTarget);
    setNewLinkValue(initialValue);
  }, [selectedLink, initialSource, initialTarget, initialValue]);

  // Info: (20260714 - Julian) 來源與目標不可為同一節點
  const isSameNode = newSource.trim() !== "" && newSource === newTarget;

  // Info: (20260713 - Julian) 反灰條件
  const selectDisabled = selectedLinkId.trim() === "";
  const submitDisabled =
    selectDisabled ||
    isSameNode ||
    ((newSource === initialSource || newSource.trim() === "") &&
      (newTarget === initialTarget || newTarget.trim() === "") &&
      newLinkValue === initialValue);

  const handleSubmit = () => {
    onAddAction({
      id: crypto.randomUUID(),
      type: MermaidActionType.SANKEY_EDIT_LINK,
      description: t("chart.mermaid.ai_editor.sankey.action_edit_link", {
        source: newSource,
        target: newTarget,
      }),
      payload: {
        lineIndex: Number(selectedLinkId),
        source: newSource,
        target: newTarget,
        value: newLinkValue,
      },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <Shuffle size={14} />
        <p>{t("chart.mermaid.ai_editor.sankey.edit_link")}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 flex flex-col">
          <label htmlFor="editLinkLabel" className={MERMAID_LABEL_STYLE}>
            {t("chart.mermaid.ai_editor.sankey.select_link_to_edit")}
            <span className="ml-0.5 text-red-500">*</span>
          </label>
          <select
            id="editLinkLabel"
            value={selectedLinkId}
            onChange={(e) => setSelectedLinkId(e.target.value)}
            className={MERMAID_INPUT_STYLE}
          >
            <option value="">
              {t("chart.mermaid.ai_editor.sankey.select_link_to_edit")}
            </option>
            {linkOptions.map((item) => (
              <option
                key={`sankey-edit-opt-${item.lineIndex}`}
                value={item.lineIndex}
              >
                {item.source} ➡️ {item.target}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label htmlFor="newSourceLabel" className={MERMAID_LABEL_STYLE}>
            {t("chart.mermaid.ai_editor.sankey.source")}
          </label>
          <select
            id="newSourceLabel"
            value={newSource}
            onChange={(e) => setNewSource(e.target.value)}
            disabled={selectDisabled}
            className={MERMAID_INPUT_STYLE}
          >
            <option value="">
              {t("chart.mermaid.ai_editor.sankey.select_new_source")}
            </option>
            {nodeOptions.map((item) => (
              <option
                key={`sankey-edit-source-opt-${item}`}
                value={item}
                // Info: (20260714 - Julian) 停用已被「流向目標」選取的節點，避免來源與目標相同
                disabled={item === newTarget}
              >
                {item}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center justify-between">
            <label htmlFor="newTargetLabel" className={MERMAID_LABEL_STYLE}>
              {t("chart.mermaid.ai_editor.sankey.target")}
            </label>
          </div>
          <select
            id="newTargetLabel"
            value={newTarget}
            onChange={(e) => setNewTarget(e.target.value)}
            disabled={selectDisabled}
            className={MERMAID_INPUT_STYLE}
          >
            <option value="">
              {t("chart.mermaid.ai_editor.sankey.select_new_target")}
            </option>
            {nodeOptions.map((item) => (
              <option
                key={`sankey-edit-target-opt-${item}`}
                value={item}
                // Info: (20260714 - Julian) 停用已被「資料來源」選取的節點，避免來源與目標相同
                disabled={item === newSource}
              >
                {item}
              </option>
            ))}
          </select>
        </div>
        {/* Info: (20260714 - Julian) 來源與目標相同時的提示 */}
        {isSameNode && (
          <p className="col-span-2 text-[10px] font-bold text-red-500">
            {t("chart.mermaid.ai_editor.sankey.source_target_same_error")}
          </p>
        )}
        <div className="col-span-2 flex flex-col">
          <div className="flex items-center justify-between">
            <label htmlFor="newLinkValueLabel" className={MERMAID_LABEL_STYLE}>
              {t("chart.mermaid.ai_editor.sankey.flow_weight")}
            </label>
          </div>
          <input
            id="newLinkValueLabel"
            type="text"
            value={newLinkValue}
            onChange={(e) => setNewLinkValue(Number(e.target.value))}
            disabled={selectDisabled}
            className={MERMAID_INPUT_STYLE}
          />
        </div>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitDisabled}
        className={MERMAID_SUBMIT_BUTTON_STYLE}
      >
        {t("chart.mermaid.ai_editor.sankey.apply_changes")}
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

  const linkOptions = parsedSankeyData.links;

  const [selectedLinkId, setSelectedLinkId] = useState<string>("");
  const [selectedLink, setSelectedLink] = useState<ISankeyLink | null>(null);

  // Info: (20260714 - Julian) 選擇 source & target
  const selectedSource = selectedLink ? selectedLink.source : "";
  const selectedTarget = selectedLink ? selectedLink.target : "";

  useEffect(() => {
    const selectedLink = linkOptions.find(
      (link) => link.lineIndex === Number(selectedLinkId),
    );
    setSelectedLink(selectedLink ?? null);
  }, [selectedLinkId, linkOptions]);

  const handleSubmit = () => {
    onAddAction({
      id: crypto.randomUUID(),
      type: MermaidActionType.SANKEY_REVERSE_FLOW,
      description: t("chart.mermaid.ai_editor.sankey.action_reverse_flow", {
        source: selectedSource,
        target: selectedTarget,
      }),
      payload: { lineIndex: Number(selectedLinkId) },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <Repeat size={14} />
        <p>{t("chart.mermaid.ai_editor.sankey.reverse_flow")}</p>
      </div>
      <div className="flex flex-col">
        <label htmlFor="reverseLinkLabel" className={MERMAID_LABEL_STYLE}>
          {t("chart.mermaid.ai_editor.sankey.select_link_to_reverse")}
          <span className="ml-0.5 text-red-500">*</span>
        </label>
        <select
          id="reverseLinkLabel"
          value={selectedLinkId}
          onChange={(e) => setSelectedLinkId(e.target.value)}
          className={MERMAID_INPUT_STYLE}
        >
          <option value="">
            {t("chart.mermaid.ai_editor.sankey.select_link_to_reverse")}
          </option>
          {linkOptions.map((link) => (
            <option
              key={`sankey-reverse-opt-${link.lineIndex}`}
              value={link.lineIndex}
            >
              {link.source} ➡️ {link.target}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!selectedLinkId}
        className={MERMAID_SUBMIT_BUTTON_STYLE}
      >
        {t("chart.mermaid.ai_editor.sankey.reverse_flow")}
      </button>
    </div>
  );
};

// Info: (20260713 - Julian) 「變更節點名稱」面板
const RenameNodePanel: FC<IBasePanelProps> = ({
  parsedSankeyData,
  onAddAction,
}) => {
  const { t } = useTranslation();

  const nodeOptions = parsedSankeyData.nodes;

  const [selectedNode, setSelectedNode] = useState<string>("");
  const [newName, setNewName] = useState<string>("");

  const submitDisabled = selectedNode.trim() === "" || newName.trim() === "";

  const handleSubmit = () => {
    onAddAction({
      id: crypto.randomUUID(),
      type: MermaidActionType.SANKEY_RENAME_NODE,
      description: t("chart.mermaid.ai_editor.sankey.action_rename_node", {
        oldName: selectedNode,
        newName: newName,
      }),
      payload: {
        oldName: selectedNode,
        newName: newName,
      },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <Tag size={14} />
        <p>{t("chart.mermaid.ai_editor.sankey.rename_node")}</p>
      </div>
      <div className="flex flex-col">
        <label htmlFor="renameNodeLabel" className={MERMAID_LABEL_STYLE}>
          {t("chart.mermaid.ai_editor.sankey.select_node_to_rename")}
          <span className="ml-0.5 text-red-500">*</span>
        </label>
        <select
          id="renameNodeLabel"
          value={selectedNode}
          onChange={(e) => setSelectedNode(e.target.value)}
          className={MERMAID_INPUT_STYLE}
        >
          <option value="">
            {t("chart.mermaid.ai_editor.sankey.select_node_to_rename")}
          </option>
          {nodeOptions.map((node) => (
            <option key={`sankey-rename-opt-${node}`} value={node}>
              {node}
            </option>
          ))}
        </select>
      </div>
      <div className="col-span-2 flex flex-col">
        <label htmlFor="renameNodeInput" className={MERMAID_LABEL_STYLE}>
          {t("chart.mermaid.ai_editor.sankey.new_name")}
          <span className="ml-0.5 text-red-500">*</span>
        </label>
        <input
          id="renameNodeInput"
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className={MERMAID_INPUT_STYLE}
          placeholder={
            t("chart.mermaid.ai_editor.sankey.new_name_placeholder")!
          }
        />
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitDisabled}
        className={MERMAID_SUBMIT_BUTTON_STYLE}
      >
        {t("chart.mermaid.ai_editor.sankey.rename_node")}
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

  const linkOptions = parsedSankeyData.links;

  const [selectedLinkId, setSelectedLinkId] = useState<string>("");
  const [selectedLink, setSelectedLink] = useState<ISankeyLink | null>(null);

  // Info: (20260714 - Julian) 選擇 source & target
  const selectedSource = selectedLink ? selectedLink.source : "";
  const selectedTarget = selectedLink ? selectedLink.target : "";

  useEffect(() => {
    const selectedLink = linkOptions.find(
      (link) => link.lineIndex === Number(selectedLinkId),
    );
    setSelectedLink(selectedLink ?? null);
  }, [selectedLinkId, linkOptions]);

  const handleSubmit = () => {
    onAddAction({
      id: crypto.randomUUID(),
      type: MermaidActionType.SANKEY_DELETE_LINK,
      description: t("chart.mermaid.ai_editor.sankey.action_delete_link", {
        source: selectedSource,
        target: selectedTarget,
      }),
      payload: { lineIndex: Number(selectedLinkId) },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 text-xs font-bold text-slate-700">
        <Eraser size={14} />
        <p>{t("chart.mermaid.ai_editor.sankey.delete_link")}</p>
      </div>
      <div className="flex flex-col">
        <label htmlFor="reverseLinkLabel" className={MERMAID_LABEL_STYLE}>
          {t("chart.mermaid.ai_editor.sankey.select_link_to_delete")}
          <span className="ml-0.5 text-red-500">*</span>
        </label>
        <select
          id="reverseLinkLabel"
          value={selectedLinkId}
          onChange={(e) => setSelectedLinkId(e.target.value)}
          className={MERMAID_INPUT_STYLE}
        >
          <option value="">
            {t("chart.mermaid.ai_editor.sankey.select_link_to_delete")}
          </option>
          {linkOptions.map((link) => (
            <option
              key={`sankey-delete-opt-${link.lineIndex}`}
              value={link.lineIndex}
            >
              {link.source} ➡️ {link.target}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!selectedLinkId}
        className={MERMAID_SUBMIT_BUTTON_STYLE}
      >
        {t("chart.mermaid.ai_editor.sankey.delete_link")}
      </button>
    </div>
  );
};

const SANKEY_TOOL_PANELS: Record<SankeyTools, FC<IBasePanelProps>> = {
  [SankeyTools.ADD_LINK]: AddLinkPanel,
  [SankeyTools.EDIT_LINK]: EditLinkPanel,
  [SankeyTools.REVERSE_FLOW]: ReverseFlowPanel,
  [SankeyTools.RENAME_NODE]: RenameNodePanel,
  [SankeyTools.DELETE_LINK]: DeleteLinkPanel,
};

interface ISankeyToolsSectionProps {
  selectedTool: string | null;
  setSelectedTool: React.Dispatch<React.SetStateAction<string | null>>;
  chart: string;
  onAddAction: (action: IChartAction) => void;
}

export const SankeyToolsSection: FC<ISankeyToolsSectionProps> = ({
  selectedTool,
  setSelectedTool,
  chart,
  onAddAction,
}) => {
  const { t } = useTranslation();

  // Info: (20260716 - Julian) 元件自行解析所需資料，父層只需傳入圖表字串
  const parsedSankeyData = useMemo(() => parseSankeyData(chart), [chart]);

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
      {/* Info: (20260713 - Julian) 快捷工具選擇列 */}
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
