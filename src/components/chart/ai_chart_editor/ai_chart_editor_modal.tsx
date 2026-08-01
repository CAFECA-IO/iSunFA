"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import {
  Sparkles,
  Wrench,
  MessageSquare,
  Lightbulb,
  Trash2,
  Rows2,
  Columns2,
  CircleX,
  Loader2,
  TriangleAlert,
} from "lucide-react";
import ConfirmModal from "@/components/common/confirm_modal";
import { PreviewDirective } from "@/constants/chart_ui";
import { useTranslation } from "@/i18n/i18n_context";
import {
  IChartEditorAction,
  IChartEditorAdapter,
} from "@/interfaces/ai_chart_editor";

interface IAiChartEditorModalProps<TAction extends IChartEditorAction> {
  open: boolean;
  onClose: () => void;
  currentChart: string;
  onAdopt: (newChart: string) => void;
  adapter: IChartEditorAdapter<TAction>;
}

/**
 * Info: (20260730 - Julian)
 * 通用 AI 圖表編輯器 modal：擁有整個版面與狀態機。
 * 左半邊＝共用「圖表標題」欄位 + 兩分頁（常用工具 / AI 指令）；右半邊＝前後預覽。
 * 各圖表家族只透過 adapter 提供「常用工具（Tools）」與「渲染（renderPreview）」兩個差異點，
 * 以及決定論邏輯與少量文案；header、分頁、按鈕、關閉警示等結構全部一致由此元件擁有。
 */
function AiChartEditorModal<TAction extends IChartEditorAction>({
  open,
  onClose,
  currentChart,
  onAdopt,
  adapter,
}: IAiChartEditorModalProps<TAction>) {
  const { t } = useTranslation();

  const [internalBaseChart, setInternalBaseChart] =
    useState<string>(currentChart);
  const [pendingActions, setPendingActions] = useState<TAction[]>([]);
  const [aiInstruction, setAiInstruction] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isShowWarning, setIsShowWarning] = useState<boolean>(false);
  const [previewDirective, setPreviewDirective] = useState<PreviewDirective>(
    PreviewDirective.ROW,
  );
  const abortControllerRef = useRef<AbortController | null>(null);

  // Info: (20260723 - Julian) 目前標題（adapter 決定：優先 pendingActions 中的標題動作）
  const currentTitle = useMemo(
    () => adapter.getTitle(internalBaseChart, pendingActions),
    [adapter, internalBaseChart, pendingActions],
  );
  const [localTitle, setLocalTitle] = useState<string>(currentTitle);
  useEffect(() => {
    setLocalTitle(currentTitle);
  }, [currentTitle]);

  // Info: (20260723 - Julian) 批次套用 pendingActions，決定論算出修改後的圖表
  const currentModifiedChart = useMemo(
    () => adapter.applyActions(internalBaseChart, pendingActions),
    [adapter, internalBaseChart, pendingActions],
  );

  const isDirty =
    pendingActions.length > 0 || internalBaseChart !== currentChart;
  const canAdopt =
    isDirty &&
    !apiError &&
    (adapter.isRenderable ? adapter.isRenderable(currentModifiedChart) : true);

  // Info: (20260723 - Julian) modal 開啟時重置所有狀態
  useEffect(() => {
    if (open) {
      setInternalBaseChart(currentChart);
      setPendingActions([]);
      setAiInstruction("");
      setApiError(null);
      setPreviewDirective(PreviewDirective.ROW);
    }
  }, [open, currentChart]);

  const handleAddAction = (action: TAction) =>
    setPendingActions((prev) => [...prev, action]);

  const handleRemoveAction = (id: string) =>
    setPendingActions((prev) => prev.filter((a) => a.id !== id));

  const commitTitle = () => {
    if (!adapter.buildTitleAction || localTitle === currentTitle) return;
    const titleAction = adapter.buildTitleAction(localTitle);
    setPendingActions((prev) => [
      ...prev.filter((a) => a.type !== titleAction.type),
      titleAction,
    ]);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      commitTitle();
      e.currentTarget.blur();
    }
  };

  const handleGenerate = async () => {
    if (!aiInstruction.trim() || isGenerating) return;
    if (abortControllerRef.current) abortControllerRef.current.abort();

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsGenerating(true);
    setApiError(null);
    try {
      const result = await adapter.generate(
        currentModifiedChart,
        aiInstruction,
        controller.signal,
      );
      setInternalBaseChart(result);
      setPendingActions([]);
      setAiInstruction("");
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log("AI request aborted");
        return;
      }
      console.error("AI edit failed:", error);
      const err = error as Error;
      setApiError(err.message || t("chart.mermaid.ai_editor.generate_failed"));
    } finally {
      if (abortControllerRef.current === controller) {
        setIsGenerating(false);
        abortControllerRef.current = null;
      }
    }
  };

  const handleAbort = () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setIsGenerating(false);
  };

  const handleCancel = () => {
    setAiInstruction("");
    onClose();
  };

  const handleAdopt = () => {
    if (!canAdopt) return;
    onAdopt(currentModifiedChart);
    handleCancel();
  };

  const warningModalToggle = () => setIsShowWarning((prev) => !prev);
  const cancelClicker = () => (isDirty ? warningModalToggle() : handleCancel());

  if (!open) return null;

  const { Tools } = adapter;

  const tabClass = ({ selected }: { selected: boolean }) =>
    `flex items-center justify-center gap-2 rounded-t-2xl border-x border-t border-slate-200 px-4 py-3 text-xs font-bold transition-all focus:outline-none ${
      selected
        ? "bg-slate-50 text-slate-700"
        : "bg-white text-slate-400 hover:text-slate-600"
    }`;

  const previewStyle =
    previewDirective === PreviewDirective.ROW
      ? "h-[48%] min-h-[220px] w-full"
      : "w-[48%] h-full";

  // Info: (20260723 - Julian) 「修改後」預覽：狀態由 modal 擁有，實際渲染交給 adapter
  const renderAfter = () => {
    if (isGenerating) {
      return (
        <div className="flex flex-col items-center gap-2 text-slate-400">
          <Loader2 size={32} className="animate-spin text-orange-600" />
          <span className="text-xs font-bold text-orange-600">
            {t("chart.mermaid.ai_editor.generating")}
          </span>
        </div>
      );
    }
    if (apiError) {
      return (
        <div className="p-4 text-center">
          <div className="mb-1 flex items-center justify-center gap-1 text-xs font-bold text-orange-500">
            <TriangleAlert size={16} className="shrink-0" />
            <span>{t("chart.mermaid.ai_editor.generate_failed")}</span>
          </div>
          <span className="block text-[11px] leading-normal text-slate-500">
            {apiError}
          </span>
        </div>
      );
    }
    return adapter.renderPreview(currentModifiedChart);
  };

  return (
    <div className="fixed inset-0 z-8888 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md transition-opacity sm:p-6 md:p-10">
      <div className="relative flex h-[85vh] min-h-[600px] w-full max-w-6xl transform flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-2xl transition-all md:flex-row">
        {/* Info: (20260723 - Julian) 左欄：header + 共用標題 + 常用工具 / AI 指令 */}
        <div className="flex w-full flex-col overflow-y-auto border-r border-slate-200 bg-slate-50 md:w-2/5">
          <div className="flex shrink-0 items-center justify-between bg-white px-5 py-4">
            <div className="flex items-center gap-2">
              <div className="shrink-0 rounded-lg bg-blue-50 p-1.5 text-blue-600">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="text-sm leading-none font-bold text-slate-800">
                  AI 智慧圖表編輯器
                </h3>
                <span className="text-[10px] font-medium text-slate-400">
                  AI Chart Assistant
                </span>
              </div>
            </div>
          </div>

          <TabGroup className="flex flex-1 flex-col overflow-hidden">
            <TabList className="grid shrink-0 grid-cols-2 gap-1 bg-white px-5">
              <Tab className={tabClass}>
                <Wrench size={14} />
                {t("chart.mermaid.ai_editor.tabs.quick_tools")}
              </Tab>
              <Tab className={tabClass}>
                <MessageSquare size={14} />
                {t("chart.mermaid.ai_editor.tabs.ai_assistant")}
              </Tab>
            </TabList>

            <TabPanels className="flex-1 overflow-y-auto p-5">
              {/* Info: (20260723 - Julian) 共用「圖表標題」欄位（兩分頁皆顯示；adapter 支援時才有） */}
              {adapter.buildTitleAction && (
                <div className="mb-5 flex flex-col gap-2">
                  <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                    {t("chart.mermaid.ai_editor.chart_title")}
                  </span>
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <input
                      id="chart-editor-title-input"
                      type="text"
                      className="w-full text-sm font-semibold text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400"
                      placeholder={
                        t("chart.mermaid.ai_editor.chart_title_placeholder")!
                      }
                      value={localTitle}
                      onChange={(e) => setLocalTitle(e.target.value)}
                      onBlur={commitTitle}
                      onKeyDown={handleTitleKeyDown}
                    />
                  </div>
                </div>
              )}

              {/* Info: (20260723 - Julian) 常用工具 Tab */}
              <TabPanel className="flex flex-col gap-6 focus:outline-none">
                {adapter.hasTools ? (
                  <>
                    <Tools
                      chart={internalBaseChart}
                      pendingActions={pendingActions}
                      onAddAction={handleAddAction}
                      onRemoveAction={handleRemoveAction}
                    />
                    {pendingActions.length > 0 && (
                      <div className="flex flex-col border-t border-slate-200 pt-5">
                        <span className="mb-3 text-xs font-bold tracking-wider text-slate-500 uppercase">
                          {t("chart.mermaid.ai_editor.command_list")}
                        </span>
                        <div className="flex flex-col gap-2">
                          {pendingActions.map((action) => (
                            <div
                              key={action.id}
                              className="flex items-center justify-between rounded-lg border border-blue-100 bg-white p-3 shadow-sm"
                            >
                              <div className="flex flex-col">
                                <span className="text-[10px] font-bold tracking-tight text-blue-600 uppercase">
                                  {action.type}
                                </span>
                                <span className="text-xs font-medium text-slate-700">
                                  {action.description}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveAction(action.id)}
                                className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex h-40 items-center justify-center text-center text-xs text-slate-400">
                    {t("chart.mermaid.ai_editor.no_tools_available")}
                  </div>
                )}
              </TabPanel>

              {/* Info: (20260723 - Julian) AI 指令 Tab */}
              <TabPanel className="flex flex-col gap-5 focus:outline-none">
                <div className="flex flex-col">
                  <div className="mb-2 flex items-center justify-between">
                    <label
                      htmlFor="ai-instruction-input"
                      className="text-xs font-bold tracking-wider text-slate-500"
                    >
                      {t("chart.mermaid.ai_editor.tabs.ai_assistant")}
                    </label>
                    {aiInstruction && (
                      <button
                        type="button"
                        onClick={() => setAiInstruction("")}
                        className="text-[11px] font-bold text-slate-400 transition-colors hover:text-rose-500"
                      >
                        {t("chart.mermaid.ai_editor.clear_btn")}
                      </button>
                    )}
                  </div>
                  <textarea
                    id="ai-instruction-input"
                    value={aiInstruction}
                    onChange={(e) => setAiInstruction(e.target.value)}
                    rows={6}
                    className="w-full rounded-xl border border-slate-200 bg-white p-4 text-xs placeholder-slate-400 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    placeholder={
                      t("chart.mermaid.ai_editor.ai_assistant_placeholder")!
                    }
                  />
                </div>
                <div className="shrink-0 rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-xs leading-relaxed text-blue-800">
                  <div className="mb-1 flex items-center gap-1 font-bold">
                    <Lightbulb size={14} strokeWidth={2.5} />
                    <p>{t("chart.mermaid.ai_editor.instructions_title")}</p>
                  </div>
                  {adapter.examples.length > 0 && (
                    <ul className="mt-2 ml-4 list-disc space-y-1 text-[11px] text-blue-600/80">
                      {adapter.examples.map((example, i) => (
                        <li key={i}>{example}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </TabPanel>
            </TabPanels>
          </TabGroup>
        </div>

        {/* Info: (20260723 - Julian) 右欄：前後預覽 + 底部動作 */}
        <div className="flex h-full w-full flex-col overflow-hidden bg-slate-100 md:w-3/5">
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
            <p className="text-sm font-bold text-slate-700">
              {t("chart.mermaid.ai_editor.preview_compare")}
            </p>
            <div className="flex items-center gap-1 rounded-lg bg-gray-200 p-1">
              <button
                type="button"
                onClick={() => setPreviewDirective(PreviewDirective.ROW)}
                className={`shrink-0 rounded-sm p-1 ${
                  previewDirective === PreviewDirective.ROW
                    ? "bg-white text-red-400 shadow-sm"
                    : "text-gray-500 hover:bg-gray-300"
                }`}
              >
                <Rows2 size={16} />
              </button>
              <button
                type="button"
                onClick={() => setPreviewDirective(PreviewDirective.COLUMN)}
                className={`shrink-0 rounded-sm p-1 ${
                  previewDirective === PreviewDirective.COLUMN
                    ? "bg-white text-red-400 shadow-sm"
                    : "text-gray-500 hover:bg-gray-300"
                }`}
              >
                <Columns2 size={16} />
              </button>
            </div>
          </div>

          <div
            className={`flex flex-1 gap-4 overflow-y-auto p-4 ${
              previewDirective === PreviewDirective.COLUMN
                ? "flex-row"
                : "flex-col"
            }`}
          >
            <div className={`flex flex-col ${previewStyle}`}>
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-500">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400" />
                {t("chart.mermaid.ai_editor.before")}
              </div>
              <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-inner">
                {adapter.renderPreview(internalBaseChart)}
              </div>
            </div>

            <div className={`flex flex-col ${previewStyle}`}>
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-500">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-500" />
                {t("chart.mermaid.ai_editor.after")}
              </div>
              <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-inner">
                {renderAfter()}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4">
            <button
              type="button"
              disabled={isGenerating}
              onClick={cancelClicker}
              className="cursor-pointer rounded-xl px-4 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 disabled:text-slate-400"
            >
              {t("chart.mermaid.ai_editor.cancel")}
            </button>

            {isGenerating ? (
              <button
                type="button"
                onClick={handleAbort}
                className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-rose-100 bg-rose-50 px-5 py-2 text-xs font-bold text-rose-600 shadow-sm transition-all hover:bg-rose-100"
              >
                <CircleX size={14} />
                {t("chart.mermaid.ai_editor.stop_generating")}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!aiInstruction.trim()}
                className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400"
              >
                <Sparkles size={14} />
                {t("chart.mermaid.ai_editor.generate")}
              </button>
            )}

            {canAdopt && (
              <button
                type="button"
                onClick={handleAdopt}
                className="cursor-pointer rounded-xl bg-orange-600 px-5 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-orange-500"
              >
                {t("chart.mermaid.ai_editor.adopt")}
              </button>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={isShowWarning}
        title={t("chart.mermaid.ai_editor.close_warning_title")}
        message={t("chart.mermaid.ai_editor.close_warning_message")}
        onClose={warningModalToggle}
        cancelText={t("chart.mermaid.ai_editor.close_warning_cancel")}
        confirmText={t("chart.mermaid.ai_editor.close_warning_confirm")}
        onConfirm={handleCancel}
      />
    </div>
  );
}

export { AiChartEditorModal };
