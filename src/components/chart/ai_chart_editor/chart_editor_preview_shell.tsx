"use client";

import { FC, ReactNode, useState } from "react";
import { Columns2, Rows2, Sparkles, CircleX } from "lucide-react";
import { PreviewDirective } from "@/constants/chart_ui";

interface IChartEditorPreviewShellProps {
  // Info: (20260721 - Julian) 前後預覽內容（各圖表自行渲染，含各自狀態）
  before: ReactNode;
  after: ReactNode;
  // Info: (20260721 - Julian) 文案
  previewCompareLabel: string;
  beforeLabel: string;
  afterLabel: string;
  cancelLabel: string;
  generateLabel: string;
  stopGeneratingLabel: string;
  adoptLabel: string;
  // Info: (20260721 - Julian) 底部動作
  aiInstruction: string;
  isGenerating: boolean;
  canAdopt: boolean;
  onCancel: () => void;
  onGenerate: () => void;
  onAbort: () => void;
  onAdopt: () => void;
}

/**
 * Info: (20260721 - Julian)
 * AI 圖表編輯器右欄共用外殼：header（含 ROW/COLUMN 排版切換）、前後預覽對照框、底部動作列
 * （取消 / 產生 / 停止 / 採用）。前後預覽的實際內容與各自狀態由 mermaid / custom 以 slot 注入。
 */
const ChartEditorPreviewShell: FC<IChartEditorPreviewShellProps> = ({
  before,
  after,
  previewCompareLabel,
  beforeLabel,
  afterLabel,
  cancelLabel,
  generateLabel,
  stopGeneratingLabel,
  adoptLabel,
  aiInstruction,
  isGenerating,
  canAdopt,
  onCancel,
  onGenerate,
  onAbort,
  onAdopt,
}) => {
  const [previewDirective, setPreviewDirective] = useState<PreviewDirective>(
    PreviewDirective.ROW,
  );

  const previewStyle =
    previewDirective === PreviewDirective.ROW
      ? "h-[48%] min-h-[220px] w-full"
      : "w-[48%] h-full";

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-slate-100 md:w-3/5">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
        <p className="text-sm font-bold text-slate-700">
          {previewCompareLabel}
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
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400" />
            {beforeLabel}
          </div>
          <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-inner">
            {before}
          </div>
        </div>

        {/* Info: (20260623 - Julian) 修改後預覽 */}
        <div className={`flex flex-col ${previewStyle}`}>
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-500" />
            {afterLabel}
          </div>
          <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-inner">
            {after}
          </div>
        </div>
      </div>

      {/* Info: (20260623 - Julian) 底部動作按鈕 */}
      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4">
        <button
          type="button"
          disabled={isGenerating}
          onClick={onCancel}
          className="cursor-pointer rounded-xl px-4 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 disabled:text-slate-400"
        >
          {cancelLabel}
        </button>

        {isGenerating ? (
          <button
            type="button"
            onClick={onAbort}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-rose-100 bg-rose-50 px-5 py-2 text-xs font-bold text-rose-600 shadow-sm transition-all hover:bg-rose-100"
          >
            <CircleX size={14} />
            {stopGeneratingLabel}
          </button>
        ) : (
          <button
            type="button"
            onClick={onGenerate}
            disabled={!aiInstruction.trim()}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400"
          >
            <Sparkles size={14} />
            {generateLabel}
          </button>
        )}

        {canAdopt && (
          <button
            type="button"
            onClick={onAdopt}
            className="cursor-pointer rounded-xl bg-orange-600 px-5 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-orange-500"
          >
            {adoptLabel}
          </button>
        )}
      </div>
    </div>
  );
};

export { ChartEditorPreviewShell };
