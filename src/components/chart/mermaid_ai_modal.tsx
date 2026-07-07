"use client";

import { useState, FC } from "react";
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import { IDonutChartData } from "@/components/common/donut_chart";
import { MermaidAiControlPanel } from "@/components/chart/mermaid_ai_control_panel";
import { MermaidAiPreviewPanel } from "@/components/chart/mermaid_ai_preview_panel";
import { MermaidChartType } from "@/constants/mermaid_chart";

interface IMermaidAiModalProps {
  open: boolean;
  onClose: () => void;
  currentChart: string;
  chartType: MermaidChartType;
  parsedNodes: { id: string; label: string }[];
  parsedPieItems: { label: string; value: number }[];
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
  svgStr,
  parsedPieData,
  onAdopt,
}) => {
  // Info: (20260623 - Julian) AI 處理 states
  const [aiInstruction, setAiInstruction] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [newChartPreview, setNewChartPreview] = useState<string>("");
  const [apiError, setApiError] = useState<string | null>(null);

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
            chart: currentChart,
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
