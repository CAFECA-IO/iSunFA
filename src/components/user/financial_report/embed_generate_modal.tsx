"use client";

import { useState } from "react";
import { Code, X, Check, Info, CheckCircle2, Copy } from "lucide-react";

enum ReportType {
  BALANCE_SHEET = "資產負債表",
  INCOME_STATEMENT = "損益表",
  CASH_FLOW_STATEMENT = "現金流量表",
  TRIAL_BALANCE = "試算表",
}

enum PeriodType {
  Q2_THIS_YEAR = "Q2_THIS_YEAR",
  Q1_THIS_YEAR = "Q1_THIS_YEAR",
  JUNE_THIS_YEAR = "JUNE_THIS_YEAR", // ToDo: (20260320 - Julian) 未來可能調整
  ANNUAL_LAST_YEAR = "ANNUAL_LAST_YEAR",
}

export default function EmbedGenerateModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const [isGenerated, setIsGenerated] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [selectedReportTypes, setSelectedReportTypes] = useState<ReportType[]>([
    ReportType.BALANCE_SHEET,
  ]);
  const [selectedPeriods, setSelectedPeriods] = useState<PeriodType[]>([
    PeriodType.Q2_THIS_YEAR,
  ]);

  // ToDo: (20260319 - Julian) 產生嵌入碼
  const embedCode = "Hello, world";

  const toggleReportType = (type: ReportType) => {
    setSelectedReportTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const togglePeriod = (period: PeriodType) => {
    setSelectedPeriods((prev) =>
      prev.includes(period)
        ? prev.filter((p) => p !== period)
        : [...prev, period],
    );
  };

  const handleGenerateEmbedCode = () => {
    setIsGenerated(true);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(embedCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="text-xl w-full max-w-2xl rounded-2xl bg-white">
        {/* Info: (20260319 - Julian) Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-orange-50">
              <Code className="size-5 text-amber-500" strokeWidth={2.5} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">嵌入報表設定</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={24} />
          </button>
        </div>

        {/* Info: (20260319 - Julian) Modal Body / Success State Switch */}
        {isGenerated ? (
          <div className="flex flex-col items-center justify-center p-8 text-center md:p-12">
            <div className="mb-6 flex size-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
              <CheckCircle2 className="size-8" strokeWidth={2.5} />
            </div>
            <h3 className="mb-2 text-2xl font-bold text-slate-800">
              嵌入程式碼已產生
            </h3>
            <p className="mb-10 text-sm font-medium text-slate-500">
              已根據您的選擇彙整了 {selectedReportTypes.length} 項報表。
            </p>

            <div className="w-full text-left">
              <div className="mb-3 block text-sm font-bold text-slate-600">
                HTML 嵌入碼
              </div>
              <div className="relative rounded-2xl bg-slate-900 px-6 py-8 font-mono text-sm text-amber-100">
                {embedCode}
                <button
                  type="button"
                  onClick={handleCopy}
                  className="absolute top-4 right-4 flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-white/20"
                >
                  {isCopied ? <Check size={16} /> : <Copy size={16} />}
                  {isCopied ? "已複製" : "一鍵複製"}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsGenerated(false)}
              className="mt-8 text-sm font-bold text-amber-500 transition-colors hover:text-amber-600"
            >
              修改設定並重新產生
            </button>
          </div>
        ) : (
          <div className="p-8">
            {/* Info: (20260319 - Julian) 報表種類 */}
            <div className="mb-8">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-800">
                  1. 選擇包含的報表種類
                </h3>
                <span className="text-xs font-semibold text-slate-400">
                  可複選
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(ReportType).map(([key, value]) => {
                  const isSelected = selectedReportTypes.includes(
                    value as ReportType,
                  );
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleReportType(value as ReportType)}
                      className={`flex items-center justify-between rounded-xl border p-3 font-bold transition-all ${
                        isSelected
                          ? "border-amber-500 bg-amber-50 text-amber-500"
                          : "border-slate-200 text-slate-600 hover:border-amber-500/50 hover:text-amber-500"
                      }`}
                    >
                      <span>{key}</span>
                      {isSelected && <Check size={20} strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Info: (20260319 - Julian) 呈現期間 */}
            <div className="mb-8">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-800">
                  2. 選擇呈現的期間
                </h3>
                <span className="text-xs font-semibold text-slate-400">
                  可複選
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(PeriodType).map(([key, value]) => {
                  const isSelected = selectedPeriods.includes(
                    value as PeriodType,
                  );
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => togglePeriod(value as PeriodType)}
                      className={`flex items-center justify-between rounded-xl border p-3 font-bold transition-all ${
                        isSelected
                          ? "border-amber-500 bg-amber-50 text-amber-500"
                          : "border-slate-200 text-slate-600 hover:border-amber-500/50 hover:text-amber-500"
                      }`}
                    >
                      <span>{key}</span>
                      {isSelected && <Check size={20} strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Info: (20260319 - Julian) Info Banner */}
            <div className="flex items-start gap-3 rounded-xl bg-slate-100 p-4">
              <Info className="mt-0.5 size-5 shrink-0 text-slate-500" />
              <p className="text-sm leading-relaxed font-medium text-slate-600">
                產生的嵌入碼將包含即時連動數據。當您在後台更新傳票時，外部網站顯示的報表內容也會同步更新。
              </p>
            </div>
          </div>
        )}

        {/* Info: (20260319 - Julian) Modal Footer */}
        <div
          className={`flex items-center gap-2 border-t border-slate-200 p-6 ${isGenerated ? "justify-end" : "justify-end"}`}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 text-sm font-bold text-slate-600 transition-colors hover:text-slate-800"
          >
            關閉
          </button>
          {!isGenerated && (
            <button
              type="button"
              onClick={handleGenerateEmbedCode}
              className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-amber-600"
            >
              <Code className="size-4" strokeWidth={2.5} />
              產生嵌入碼
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
