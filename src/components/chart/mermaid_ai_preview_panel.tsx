"use client";

import { useEffect, useState, useMemo, FC } from "react";
import mermaid from "mermaid";
import { DonutChart, IDonutChartData } from "@/components/common/donut_chart";
import { Columns2, Loader2, Rows2, Sparkles } from "lucide-react";

enum PreviewDirective {
  ROW = "ROW",
  COLUMN = "COLUMN",
}

interface IMermaidAiPreviewPanelProps {
  svgStr: string;
  parsedPieData: { title: string; data: IDonutChartData[] } | null;
  aiInstruction: string;
  isGenerating: boolean;
  newChartPreview: string;
  apiError: string | null;
  onCancel: () => void;
  onGenerate: () => void;
  onAdopt: () => void;
}

const MermaidAiPreviewPanel: FC<IMermaidAiPreviewPanelProps> = ({
  svgStr,
  parsedPieData,
  aiInstruction,
  isGenerating,
  newChartPreview,
  apiError,
  onCancel,
  onGenerate,
  onAdopt,
}) => {
  const [previewDirective, setPreviewDirective] = useState<PreviewDirective>(
    PreviewDirective.ROW,
  );

  const [previewSvgStr, setPreviewSvgStr] = useState<string>("");
  const [previewHasError, setPreviewHasError] = useState<boolean>(false);

  const previewStyle =
    previewDirective === PreviewDirective.ROW
      ? "h-[48%] min-h-[220px] w-full"
      : "w-[48%] h-full";

  const previewPieData = useMemo(() => {
    if (!newChartPreview || typeof newChartPreview !== "string") return null;
    const cleanChart = newChartPreview.trim();
    if (!cleanChart.startsWith("pie")) return null;

    const lines = cleanChart.split("\n");
    let title = "";
    const data: IDonutChartData[] = [];

    lines.forEach((line) => {
      const cleanLine = line.trim();
      if (cleanLine.startsWith("pie title")) {
        title = cleanLine.replace("pie title", "").trim();
      } else if (cleanLine.includes(":")) {
        const parts = cleanLine.split(":");
        if (parts.length >= 2) {
          let name = parts[0].trim();
          if (name.startsWith('"') && name.endsWith('"')) {
            name = name.slice(1, -1);
          }
          const valueStr = parts[parts.length - 1].trim();
          const value = parseFloat(valueStr.replace("%", ""));
          if (!isNaN(value)) {
            data.push({ name, value });
          }
        }
      }
    });

    if (data.length > 0) {
      return { title, data };
    }
    return null;
  }, [newChartPreview]);

  useEffect(() => {
    if (!newChartPreview || previewPieData) {
      setPreviewSvgStr("");
      setPreviewHasError(false);
      return;
    }

    let isCurrent = true;

    const renderPreview = async () => {
      try {
        const id = `mermaid-preview-${Math.random().toString(36).substring(2, 9)}`;
        const { svg } = await mermaid.render(id, newChartPreview);
        if (isCurrent) {
          setPreviewSvgStr(svg);
          setPreviewHasError(false);
        }
      } catch (error) {
        console.error("Preview Mermaid rendering failed", error);
        if (isCurrent) {
          setPreviewHasError(true);
        }
      }
    };

    renderPreview();
    return () => {
      isCurrent = false;
    };
  }, [newChartPreview, previewPieData]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-slate-100 md:w-3/5">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
        <p className="text-sm font-bold text-slate-700">
          圖表變更預覽對比 (Preview & Comparison)
        </p>
        {/* Info: (20260623 - Julian) 預覽排版切換 */}
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
          previewDirective === PreviewDirective.COLUMN ? "flex-row" : "flex-col"
        } `}
      >
        {/* Info: (20260623 - Julian) 原始圖表 */}
        <div className={`flex flex-col ${previewStyle}`}>
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400"></span>
            原始圖表 (Before)
          </div>
          <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-inner">
            {parsedPieData ? (
              <DonutChart
                title={parsedPieData.title}
                data={parsedPieData.data}
              />
            ) : (
              <div
                className="flex h-full max-h-[95%] w-full max-w-[95%] origin-center scale-[0.8] items-center justify-center select-none"
                dangerouslySetInnerHTML={{ __html: svgStr }}
              />
            )}
          </div>
        </div>

        {/* Info: (20260623 - Julian) 修改後預覽 */}
        <div className={`flex flex-col ${previewStyle}`}>
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-500"></span>
            修改後預覽 (After)
          </div>
          <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-inner">
            {isGenerating ? (
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <Loader2 size={32} className="animate-spin text-orange-600" />
                <span className="text-xs font-bold text-orange-600">
                  AI 正在調整圖表，請稍候...
                </span>
              </div>
            ) : apiError ? (
              <div className="p-4 text-center">
                <span className="mb-1 block text-xs font-semibold text-rose-500">
                  ⚠️ 調整失敗
                </span>
                <span className="block text-[11px] leading-normal text-slate-500">
                  {apiError}
                </span>
              </div>
            ) : newChartPreview ? (
              previewPieData ? (
                <DonutChart
                  title={previewPieData.title}
                  data={previewPieData.data}
                />
              ) : previewHasError ? (
                <div className="p-4 text-center">
                  <span className="mb-1 block text-xs font-bold text-red-500">
                    ❌ 語法渲染失敗
                  </span>
                  <span className="block max-h-[120px] overflow-y-auto font-mono text-[11px] whitespace-pre-wrap text-slate-400">
                    {newChartPreview}
                  </span>
                </div>
              ) : (
                <div
                  className="flex h-full max-h-[95%] w-full max-w-[95%] origin-center scale-[0.8] items-center justify-center select-none"
                  dangerouslySetInnerHTML={{ __html: previewSvgStr }}
                />
              )
            ) : (
              <div className="text-center text-slate-400">
                <Sparkles
                  size={24}
                  className="mx-auto mb-2 animate-pulse text-slate-300"
                />
                <span className="text-xs">
                  在左側輸入指令並點擊「產生新圖表」即可在此預覽
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info: (20260623 - Julian) 底部動作按鈕 */}
      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4">
        <button
          type="button"
          onClick={onCancel}
          className="cursor-pointer rounded-xl px-4 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100"
        >
          取消
        </button>

        <button
          type="button"
          onClick={onGenerate}
          disabled={!aiInstruction.trim() || isGenerating}
          className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400"
        >
          {isGenerating ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              分析中
            </>
          ) : (
            <>
              <Sparkles size={14} />
              產生新圖表
            </>
          )}
        </button>

        {newChartPreview && !previewHasError && (
          <button
            type="button"
            onClick={onAdopt}
            className="cursor-pointer rounded-xl bg-orange-600 px-5 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-orange-500"
          >
            採用新圖表 (Adopt)
          </button>
        )}
      </div>
    </div>
  );
};

export { MermaidAiPreviewPanel };
