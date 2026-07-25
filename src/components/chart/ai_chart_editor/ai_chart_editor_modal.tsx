"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import ConfirmModal from "@/components/common/confirm_modal";
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
 * Info: (20260721 - Julian)
 * 通用 AI 圖表編輯器 modal：擁有狀態機（編輯基底、暫存動作、產生流程、關閉警示）與兩欄外殼，
 * 所有圖表別差異交由 adapter（見 IChartEditorAdapter）。mermaid 與自訂圖表共用此元件。
 */
function AiChartEditorModal<TAction extends IChartEditorAction>({
  open,
  onClose,
  currentChart,
  onAdopt,
  adapter,
}: IAiChartEditorModalProps<TAction>) {
  // Info: (20260708 - Julian) 內部編輯基底狀態
  const [internalBaseChart, setInternalBaseChart] =
    useState<string>(currentChart);
  const [pendingActions, setPendingActions] = useState<TAction[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [aiInstruction, setAiInstruction] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isShowWarning, setIsShowWarning] = useState<boolean>(false);

  // Info: (20260709 - Julian) 目前標題（adapter 決定：優先 pendingActions 中的標題動作）
  const currentTitle = useMemo(
    () => adapter.getTitle(internalBaseChart, pendingActions),
    [adapter, internalBaseChart, pendingActions],
  );

  // Info: (20260708 - Julian) 依序套用 pendingActions，決定論算出修改後的圖表
  const currentModifiedChart = useMemo(
    () =>
      pendingActions.reduce(
        (result, action) => adapter.applyAction(result, action),
        internalBaseChart,
      ),
    [adapter, pendingActions, internalBaseChart],
  );

  // Info: (20260714 - Julian) 是否有未儲存的變更（有結構化動作，或 AI 已改動基底）
  const isDirty =
    pendingActions.length > 0 || internalBaseChart !== currentChart;

  // Info: (20260708 - Julian) modal 開啟時重置所有狀態
  useEffect(() => {
    if (open) {
      setInternalBaseChart(currentChart);
      setPendingActions([]);
      setAiInstruction("");
      setApiError(null);
    }
  }, [open, currentChart]);

  const handleAddAction = (action: TAction) => {
    setPendingActions((prev) => [...prev, action]);
  };

  const handleRemoveAction = (id: string) => {
    setPendingActions((prev) => prev.filter((a) => a.id !== id));
  };

  const handleTitleChange = (newTitle: string) => {
    if (!adapter.buildTitleAction) return;
    const titleAction = adapter.buildTitleAction(newTitle);
    setPendingActions((prev) => [
      ...prev.filter((a) => a.type !== titleAction.type),
      titleAction,
    ]);
  };

  const handleGenerate = async () => {
    if (!aiInstruction.trim() || isGenerating) return;

    // Info: (20260708 - Julian) 中斷上一個請求（如果存在）
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

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
      // Info: (20260708 - Julian) 產生成功 → 設為新基底並清空已套用的結構化動作
      setInternalBaseChart(result);
      setPendingActions([]);
      setAiInstruction("");
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        // Info: (20260714 - Julian) 主動中斷：loading 交由後續請求或 handleAbort 處理
        console.log("AI request aborted");
        return;
      }
      console.error("AI edit failed:", error);
      const err = error as Error;
      setApiError(err.message || "網路連線異常，請重試");
    } finally {
      // Info: (20260714 - Julian) 僅當此請求仍為當前請求時才重設 loading，避免競態覆蓋新請求
      if (abortControllerRef.current === controller) {
        setIsGenerating(false);
        abortControllerRef.current = null;
      }
    }
  };

  const handleAbort = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsGenerating(false);
  };

  const handleCancel = () => {
    setAiInstruction("");
    onClose();
  };

  const handleAdopt = () => {
    if (!currentModifiedChart) return;
    onAdopt(currentModifiedChart);
    handleCancel();
  };

  const warningModalToggle = () => setIsShowWarning((prev) => !prev);

  // Info: (20260713 - Julian) 已編輯狀態下點取消 → 彈出關閉提醒
  const cancelClicker = () => {
    if (isDirty) {
      warningModalToggle();
    } else {
      handleCancel();
    }
  };

  if (!open) return null;

  // Info: (20260721 - Julian) 以 JSX element 渲染 adapter 面板（component boundary），
  // 使傳入的 handler 不被視為 render 期間呼叫，避免 react-hooks/refs 對 abortControllerRef 誤判
  const { ControlPanel, PreviewPanel } = adapter;

  return (
    <div className="fixed inset-0 z-8888 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md transition-opacity sm:p-6 md:p-10">
      <div className="relative flex h-[85vh] min-h-[600px] w-full max-w-6xl transform flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-2xl transition-all md:flex-row">
        <ControlPanel
          chart={internalBaseChart}
          aiInstruction={aiInstruction}
          setAiInstruction={setAiInstruction}
          pendingActions={pendingActions}
          onAddAction={handleAddAction}
          onRemoveAction={handleRemoveAction}
          chartTitle={currentTitle}
          onTitleChange={handleTitleChange}
        />
        <PreviewPanel
          baseChart={internalBaseChart}
          aiInstruction={aiInstruction}
          isGenerating={isGenerating}
          newChartPreview={currentModifiedChart}
          apiError={apiError}
          onCancel={cancelClicker}
          onGenerate={handleGenerate}
          onAbort={handleAbort}
          onAdopt={handleAdopt}
        />
      </div>

      <ConfirmModal
        isOpen={isShowWarning}
        title={adapter.closeWarning.title}
        message={adapter.closeWarning.message}
        onClose={warningModalToggle}
        cancelText={adapter.closeWarning.cancelText}
        confirmText={adapter.closeWarning.confirmText}
        onConfirm={handleCancel}
      />
    </div>
  );
}

export { AiChartEditorModal };
