"use client";

import { useState, useEffect, useMemo, useRef, FC } from "react";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import { IDonutChartData } from "@/components/common/donut_chart";
import { MermaidAiControlPanel } from "@/components/chart/mermaid_ai_control_panel";
import { MermaidAiPreviewPanel } from "@/components/chart/mermaid_ai_preview_panel";
import { MermaidChartType } from "@/constants/mermaid_chart";
import {
  IChartAction,
  MermaidActionType,
  applyGanttAction,
  applyPieAction,
  applyFlowchartAction,
  applyXYChartAction,
  applySankeyAction,
  parseFlowchartNodes,
  parsePieItems,
  parseGanttItems,
  parsePieData,
  parseXYChartData,
  getChartTitle,
  updateChartTitle,
  parseSankeyData,
} from "@/lib/utils/mermaid_helpers";
import ConfirmModal from "@/components/common/confirm_modal";

interface IMermaidAiModalProps {
  open: boolean;
  onClose: () => void;
  currentChart: string;
  chartType: MermaidChartType;
  svgStr: string;
  parsedPieData: { title: string; data: IDonutChartData[] } | null;
  onAdopt: (newChart: string) => void;
}

const MermaidAiModal: FC<IMermaidAiModalProps> = ({
  open,
  onClose,
  currentChart,
  chartType,
  svgStr,
  parsedPieData: initialParsedPieData,
  onAdopt,
}) => {
  // Info: (20260708 - Julian) 內部編輯基底狀態
  const [internalBaseChart, setInternalBaseChart] =
    useState<string>(currentChart);
  const [pendingActions, setPendingActions] = useState<IChartAction[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [aiInstruction, setAiInstruction] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const [isShowWarning, setIsShowWarning] = useState<boolean>(false);

  // Info: (20260708 - Julian) 當內部基底改變時，重新解析元數據供工具選單使用
  const currentParsedNodes = useMemo(
    () => parseFlowchartNodes(internalBaseChart),
    [internalBaseChart],
  );
  const currentParsedPieItems = useMemo(
    () => parsePieItems(internalBaseChart),
    [internalBaseChart],
  );
  const currentParsedGanttItems = useMemo(
    () => parseGanttItems(internalBaseChart),
    [internalBaseChart],
  );
  const currentParsedPieData = useMemo(
    () => parsePieData(internalBaseChart),
    [internalBaseChart],
  );
  const currentParsedXYChartData = useMemo(
    () => parseXYChartData(internalBaseChart),
    [internalBaseChart],
  );
  const currentParsedSankeyData = useMemo(
    () => parseSankeyData(internalBaseChart),
    [internalBaseChart],
  );

  // Info: (20260709 - Julian) 計算當前圖表標題
  const currentTitle = useMemo(() => {
    const changeTitleAction = pendingActions.find(
      (a) => a.type === MermaidActionType.CHANGE_TITLE,
    );
    if (
      changeTitleAction &&
      changeTitleAction.type === MermaidActionType.CHANGE_TITLE
    ) {
      return changeTitleAction.payload.title;
    }
    return getChartTitle(internalBaseChart);
  }, [internalBaseChart, pendingActions]);

  // Info: (20260708 - Julian) 根據目前的 pendingActions 計算修改後的圖表
  const currentModifiedChart = useMemo(() => {
    let result = internalBaseChart;
    pendingActions.forEach((action) => {
      if (action.type === MermaidActionType.CHANGE_TITLE) {
        result = updateChartTitle(result, action.payload.title);
      } else if (chartType === MermaidChartType.GANTT) {
        result = applyGanttAction(result, action);
      } else if (chartType === MermaidChartType.PIE) {
        result = applyPieAction(result, action);
      } else if (chartType === MermaidChartType.FLOWCHART) {
        result = applyFlowchartAction(result, action);
      } else if (chartType === MermaidChartType.XYCHART) {
        result = applyXYChartAction(result, action);
      } else if (chartType === MermaidChartType.SANKEY) {
        result = applySankeyAction(result, action);
      }
    });
    return result;
  }, [internalBaseChart, pendingActions, chartType]);

  // Info: (20260714 - Julian) 是否有未儲存的變更（有結構化動作，或 AI 已改動基底）
  const isDirty =
    pendingActions.length > 0 || internalBaseChart !== currentChart;

  // Info: (20260708 - Julian) 當 modal 被開啟時，重置所有狀態
  useEffect(() => {
    if (open) {
      setInternalBaseChart(currentChart);
      setPendingActions([]);
      setAiInstruction("");
      setApiError(null);
    }
  }, [open, currentChart]);

  const handleAddAction = (action: IChartAction) => {
    setPendingActions((prev) => [...prev, action]);
  };

  const handleRemoveAction = (id: string) => {
    setPendingActions((prev) => prev.filter((a) => a.id !== id));
  };

  const handleTitleChange = (newTitle: string) => {
    setPendingActions((prev) => {
      const filtered = prev.filter(
        (a) => a.type !== MermaidActionType.CHANGE_TITLE,
      );
      const titleAction: IChartAction = {
        id: crypto.randomUUID(),
        type: MermaidActionType.CHANGE_TITLE,
        description: `修改圖表標題為 "${newTitle}"`,
        payload: { title: newTitle },
      };
      return [...filtered, titleAction];
    });
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
      const response = await request<IApiResponse<{ result: string }>>(
        "/api/v1/admin/pdf_editor/mermaid_modify",
        {
          method: "POST",
          signal: controller.signal,
          body: JSON.stringify({
            originalChart: currentModifiedChart, // Info: (20260708 - Julian) 使用已套用結構化編輯的圖表作為基底
            chartType: chartType,
            instruction: aiInstruction,
          }),
        },
      );

      if (response && response.code === "SUCCESS" && response.payload?.result) {
        // Info: (20260708 - Julian) 將 AI 結果設為新的內部基底，並清空已套用的結構化動作
        setInternalBaseChart(response.payload.result);
        setPendingActions([]);
        setAiInstruction("");
      } else {
        // Info: (20260714 - Julian) 回應非成功（未拋錯），仍需顯示錯誤訊息
        setApiError("AI 圖表產生失敗，請重試");
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        // Info: (20260714 - Julian) 主動中斷：loading 狀態交由後續請求或 handleAbort 處理
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

  const handleAdopt = () => {
    if (!currentModifiedChart) return;
    onAdopt(currentModifiedChart);
    handleCancel();
  };

  const handleCancel = () => {
    setAiInstruction("");
    onClose();
  };

  const warningModalToggle = () => setIsShowWarning((prev) => !prev);

  // Info: (20260713 - Julian) 如果正在已編輯狀態，則在點擊取消時彈出關閉提醒
  const cancelClicker = () => {
    if (isDirty) {
      warningModalToggle();
    } else {
      handleCancel();
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-8888 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md transition-opacity sm:p-6 md:p-10">
      <div className="relative flex h-[85vh] min-h-[600px] w-full max-w-6xl transform flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-2xl transition-all md:flex-row">
        <MermaidAiControlPanel
          chartType={chartType}
          aiInstruction={aiInstruction}
          setAiInstruction={setAiInstruction}
          parsedNodes={currentParsedNodes}
          parsedPieItems={currentParsedPieItems}
          parsedGanttItems={currentParsedGanttItems}
          parsedXYChartData={currentParsedXYChartData}
          parsedSankeyData={currentParsedSankeyData}
          pendingActions={pendingActions}
          onAddAction={handleAddAction}
          onRemoveAction={handleRemoveAction}
          chartTitle={currentTitle}
          onTitleChange={handleTitleChange}
        />
        <MermaidAiPreviewPanel
          svgStr={svgStr}
          parsedPieData={currentParsedPieData || initialParsedPieData}
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
        title="即將關閉 AI 智慧圖表編輯器"
        message="尚未儲存圖表變更，您確定要關閉 AI 智慧圖表編輯器嗎？"
        onClose={warningModalToggle}
        cancelText="取消"
        confirmText="確認關閉"
        onConfirm={handleCancel}
      />
    </div>
  );
};

export { MermaidAiModal };
