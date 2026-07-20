"use client";

import { FC, useState, useEffect } from "react";
import { Sparkles, X, Send } from "lucide-react";
import { CustomChartType } from "@/constants/custom_chart";

interface ICustomChartAiModalProps {
  open: boolean;
  onClose: () => void;
  chartType: CustomChartType;
  chartTitle?: string;
  raw: string;
}

// Info: (20260720 - Julian) mock 模擬「思考」耗時（毫秒），純前端計時，不呼叫後端
const MOCK_THINKING_MS = 800;

/**
 * Info: (20260720 - Julian)
 * 自訂圖表 AI 助手 Modal（mock）。
 * 目前僅提供介面預覽：可輸入指令、看到當前 DSL 原文，但「產生」不呼叫後端、不變更圖表，
 * 僅模擬思考後回覆「開發中」提示。待後端 AI 管線就緒，於 handleMockGenerate 接上真正的請求即可。
 */
const CustomChartAiModal: FC<ICustomChartAiModalProps> = ({
  open,
  onClose,
  chartType,
  chartTitle = "",
  raw,
}) => {
  const [instruction, setInstruction] = useState<string>("");
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Info: (20260720 - Julian) 開啟時重置狀態
  useEffect(() => {
    if (open) {
      setInstruction("");
      setIsThinking(false);
      setNotice(null);
    }
  }, [open]);

  if (!open) return null;

  const handleMockGenerate = () => {
    if (!instruction.trim() || isThinking) return;
    setIsThinking(true);
    setNotice(null);
    // Info: (20260720 - Julian) mock：模擬思考後給出「開發中」提示，不動任何資料
    window.setTimeout(() => {
      setIsThinking(false);
      setNotice(
        "自訂圖表的 AI 編輯尚在開發中，此為介面預覽（mock），不會變更圖表。",
      );
    }, MOCK_THINKING_MS);
  };

  return (
    <div className="fixed inset-0 z-8888 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md sm:p-6 md:p-10">
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Info: (20260720 - Julian) Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <Sparkles size={16} />
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-800">
                AI 圖表編輯
              </span>
              <span className="text-[11px] text-slate-400">
                {chartType}
                {chartTitle ? ` · ${chartTitle}` : ""}
              </span>
            </div>
            <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
              Mock
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            title="關閉"
          >
            <X size={18} />
          </button>
        </div>

        {/* Info: (20260720 - Julian) Body */}
        <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="custom-chart-ai-instruction"
              className="text-xs font-bold text-slate-500"
            >
              修改指令
            </label>
            <textarea
              id="custom-chart-ai-instruction"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              rows={3}
              placeholder="例如：把長條改成由大到小排序、標題改為『Q1 分布』…"
              className="resize-none rounded-lg border border-slate-200 p-3 text-sm text-slate-700 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-slate-500">
              目前圖表原始碼 (DSL)
            </span>
            <pre className="max-h-48 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-[11px] whitespace-pre-wrap text-slate-600">
              {raw.trim()}
            </pre>
          </div>

          {notice && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
              {notice}
            </div>
          )}
        </div>

        {/* Info: (20260720 - Julian) Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-1.5 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleMockGenerate}
            disabled={!instruction.trim() || isThinking}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isThinking ? (
              <>
                <Sparkles size={16} className="animate-pulse" />
                產生中…
              </>
            ) : (
              <>
                <Send size={16} />
                產生
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export { CustomChartAiModal };
