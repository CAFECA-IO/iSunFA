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
  parseFlowchartNodes,
  parsePieItems,
  parseGanttItems,
  parsePieData,
  parseXYChartData,
  getChartTitle,
  updateChartTitle,
} from "@/lib/utils/mermaid_helpers";

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
  const [newChartPreview, setNewChartPreview] = useState<string>("");
  const [apiError, setApiError] = useState<string | null>(null);

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
      }
    });
    return result;
  }, [internalBaseChart, pendingActions, chartType]);

  // Info: (20260708 - Julian) 當有結構化變更或基底變更時，立即更新預覽
  useEffect(() => {
    setNewChartPreview(currentModifiedChart);
  }, [currentModifiedChart]);

  // Info: (20260708 - Julian) 當 modal 被開啟時，重置所有狀態
  useEffect(() => {
    if (open) {
      setInternalBaseChart(currentChart);
      setPendingActions([]);
      setAiInstruction("");
      setNewChartPreview("");
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
        setIsGenerating(false);
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log("AI request aborted");
        return;
      }
      console.error("AI edit failed:", error);
      const err = error as Error;
      setApiError(err.message || "網路連線異常，請重試");
      setIsGenerating(false);
    }
  };

  const handleAbort = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsGenerating(false);
  };

  const handleAdopt = () => {
    if (!newChartPreview) return;
    onAdopt(newChartPreview);
    handleCancel();
  };

  const handleCancel = () => {
    setNewChartPreview("");
    setAiInstruction("");
    onClose();
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md transition-opacity sm:p-6 md:p-10">
      <div className="relative flex h-[85vh] min-h-[600px] w-full max-w-6xl transform flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-2xl transition-all md:flex-row">
        <MermaidAiControlPanel
          chartType={chartType}
          aiInstruction={aiInstruction}
          setAiInstruction={setAiInstruction}
          parsedNodes={currentParsedNodes}
          parsedPieItems={currentParsedPieItems}
          parsedGanttItems={currentParsedGanttItems}
          parsedXYChartData={currentParsedXYChartData}
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
          newChartPreview={newChartPreview}
          apiError={apiError}
          onCancel={handleCancel}
          onGenerate={handleGenerate}
          onAbort={handleAbort}
          onAdopt={handleAdopt}
        />
      </div>
    </div>
  );
};

export { MermaidAiModal };
