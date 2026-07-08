"use client";

import { useState, useEffect, useMemo, FC } from "react";
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import { IDonutChartData } from "@/components/common/donut_chart";
import { MermaidAiControlPanel } from "@/components/chart/mermaid_ai_control_panel";
import { MermaidAiPreviewPanel } from "@/components/chart/mermaid_ai_preview_panel";
import { MermaidChartType } from "@/constants/mermaid_chart";
import {
  IGanttItem,
  IChartAction,
  applyGanttAction,
  applyPieAction,
  applyFlowchartAction,
} from "@/lib/utils/mermaid_helpers";

interface IMermaidAiModalProps {
  open: boolean;
  onClose: () => void;
  currentChart: string;
  chartType: MermaidChartType;
  parsedNodes: { id: string; label: string }[];
  parsedPieItems: { label: string; value: number }[];
  parsedGanttItems: IGanttItem[];
  svgStr: string;
  parsedPieData: { title: string; data: IDonutChartData[] } | null;
  onAdopt: (newChart: string) => void;
}

const MermaidAiModal: FC<IMermaidAiModalProps> = ({
  open,
  onClose,
  currentChart,
  chartType,
  parsedNodes,
  parsedPieItems,
  parsedGanttItems,
  svgStr,
  parsedPieData,
  onAdopt,
}) => {
  // Info: (20260708 - Julian) 結構化動作狀態
  const [pendingActions, setPendingActions] = useState<IChartAction[]>([]);

  const [aiInstruction, setAiInstruction] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [newChartPreview, setNewChartPreview] = useState<string>("");
  const [apiError, setApiError] = useState<string | null>(null);

  // Info: (20260708 - Julian) 根據目前的 pendingActions 計算修改後的圖表
  const currentModifiedChart = useMemo(() => {
    let result = currentChart;
    pendingActions.forEach((action) => {
      if (chartType === MermaidChartType.GANTT) {
        result = applyGanttAction(result, action);
      } else if (chartType === MermaidChartType.PIE) {
        result = applyPieAction(result, action);
      } else if (chartType === MermaidChartType.FLOWCHART) {
        result = applyFlowchartAction(result, action);
      }
    });
    return result;
  }, [currentChart, pendingActions, chartType]);

  // Info: (20260708 - Julian) 當有結構化變更時，立即更新預覽
  useEffect(() => {
    if (pendingActions.length > 0) {
      setNewChartPreview(currentModifiedChart);
    } else {
      setNewChartPreview("");
    }
  }, [currentModifiedChart, pendingActions.length]);

  const handleAddAction = (action: IChartAction) => {
    setPendingActions((prev) => [...prev, action]);
  };

  const handleRemoveAction = (id: string) => {
    setPendingActions((prev) => prev.filter((a) => a.id !== id));
  };

  const handleGenerate = async () => {
    if (!aiInstruction.trim() || isGenerating) return;
    setIsGenerating(true);
    setApiError(null);
    try {
      const response = await request<IApiResponse<{ result: string }>>(
        "/api/v1/admin/pdf_editor/mermaid_modify",
        {
          method: "POST",
          body: JSON.stringify({
            originalChart: currentModifiedChart, // Info: (20260708 - Julian) 使用已套用結構化編輯的圖表作為基底
            chartType: chartType,
            instruction: aiInstruction,
          }),
        },
      );

      if (response && response.code === "SUCCESS" && response.payload?.result) {
        setNewChartPreview(response.payload.result);
      } else {
        setApiError(response?.message || "AI 圖表生成失敗");
      }
    } catch (error: unknown) {
      console.error("AI edit failed:", error);
      const err = error as Error;
      setApiError(err.message || "網路連線異常，請重試");
    } finally {
      setIsGenerating(false);
    }
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

  return (
    <Dialog open={open} onClose={handleCancel} className="relative z-9999">
      <DialogBackdrop className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" />

      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-6 md:p-10">
          <DialogPanel className="relative flex h-[85vh] min-h-[600px] w-full max-w-6xl transform flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-2xl transition-all md:flex-row">
            {/* Info: (20260623 - Julian) 左側： AI 控制面板 */}
            <MermaidAiControlPanel
              chartType={chartType}
              aiInstruction={aiInstruction}
              setAiInstruction={setAiInstruction}
              parsedNodes={parsedNodes}
              parsedPieItems={parsedPieItems}
              parsedGanttItems={parsedGanttItems}
              pendingActions={pendingActions}
              onAddAction={handleAddAction}
              onRemoveAction={handleRemoveAction}
              onCancel={handleCancel}
            />

            {/* Info: (20260623 - Julian) 右側： Mermaid 預覽面板 */}
            <MermaidAiPreviewPanel
              svgStr={svgStr}
              parsedPieData={parsedPieData}
              aiInstruction={aiInstruction}
              isGenerating={isGenerating}
              newChartPreview={newChartPreview}
              apiError={apiError}
              onCancel={handleCancel}
              onGenerate={handleGenerate}
              onAdopt={handleAdopt}
              currentChart={currentChart}
            />
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
};

export { MermaidAiModal };
