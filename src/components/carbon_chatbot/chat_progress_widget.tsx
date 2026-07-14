// Info: (20260713 - Tzuhan) 進度浮窗:完成/查核雙軌顯示,數據來源為 reportStats(實際段落統計)

import { IReportProgressStats } from "@/types/carbon_chatbot.types";
import { useTranslation } from "@/i18n/i18n_context";

export interface IChatProgressWidgetProps {
  stats: IReportProgressStats;
  // Info: (20260714 - Emily) 定位可覆寫:報告主視圖右下已被聊天浮動鈕佔用時改置左下
  positionClassName?: string;
}

export function ChatProgressWidget({
  stats,
  // Info: (20260714 - Emily) display 一併由此控制(避免與 hidden/md:flex 等響應式覆寫衝突)
  positionClassName = "right-10 bottom-10 flex",
}: IChatProgressWidgetProps) {
  const { t } = useTranslation();
  return (
    <div
      className={`absolute ${positionClassName} z-20 w-80 items-center gap-5 rounded-2xl bg-[#1e293b] p-5 text-white shadow-2xl`}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-slate-800 shadow-inner">
        <svg
          className="h-6 w-6 text-[#ff5a00]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex justify-between text-xs font-bold tracking-wide text-slate-300">
          <span>{t("carbon_chatbot.report_progress")}</span>
          <span className="text-white">
            {stats.completedCount}/{stats.totalCount} · {stats.completedPercent}
            %
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full border border-white/5 bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-500 to-[#ff5a00] shadow-[0_0_10px_rgba(255,90,0,0.5)] transition-all duration-1000 ease-out"
            style={{ width: `${stats.completedPercent}%` }}
          ></div>
        </div>
        {/* Info: (20260713 - Tzuhan) 次軌:人工查核簽核進度(零信任:AI 產出須經人工覆核) */}
        <div className="mt-2 mb-1 flex justify-between text-[11px] font-bold tracking-wide text-slate-400">
          <span>{t("carbon_chatbot.verified_progress")}</span>
          <span className="text-slate-200">
            {stats.verifiedCount}/{stats.totalCount} · {stats.verifiedPercent}%
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full border border-white/5 bg-slate-800">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-1000 ease-out"
            style={{ width: `${stats.verifiedPercent}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}
