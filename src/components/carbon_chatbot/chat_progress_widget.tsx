// Info: (20260713 - Tzuhan) 進度浮窗:完成/查核雙軌顯示,數據來源為 reportStats(實際段落統計)
// Info: (20260714 - Emily) 可收合:展開為完整雙軌面板,收合為小藥丸(避免遮擋報告內容)

import { useState } from "react";
import { TrendingUp, Minus } from "lucide-react";
import { IReportProgressStats } from "@/types/carbon_chatbot.types";
import { useTranslation } from "@/i18n/i18n_context";

export interface IChatProgressWidgetProps {
  stats: IReportProgressStats;
  // Info: (20260714 - Emily) 定位可覆寫:報告主視圖右下已被聊天浮動鈕佔用時改置左下
  // Info: (20260714 - Emily) display 一併由此控制(避免與 hidden/md:flex 等響應式覆寫衝突)
  positionClassName?: string;
}

export function ChatProgressWidget({
  stats,
  positionClassName = "right-10 bottom-10 flex",
}: IChatProgressWidgetProps) {
  const { t } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // Info: (20260714 - Emily) 收合態:小藥丸只顯示完成數,點擊展開
  if (isCollapsed) {
    return (
      <button
        type="button"
        title={t("carbon_chatbot.report_progress")}
        onClick={() => setIsCollapsed(false)}
        className={`absolute ${positionClassName} z-20 items-center gap-2 rounded-full bg-[#1e293b] px-4 py-2 text-xs font-bold text-white shadow-2xl transition-transform hover:scale-105`}
      >
        <TrendingUp size={14} className="text-[#ff5a00]" />
        {stats.completedCount}/{stats.totalCount}
      </button>
    );
  }

  return (
    <div
      className={`absolute ${positionClassName} z-20 w-80 items-center gap-5 rounded-2xl bg-[#1e293b] p-5 text-white shadow-2xl`}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-slate-800 shadow-inner">
        <TrendingUp className="h-6 w-6 text-[#ff5a00]" />
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

      {/* Info: (20260714 - Emily) 收合鈕:縮成小藥丸,避免遮擋報告內容 */}
      <button
        type="button"
        aria-label={t("carbon_chatbot.progress_collapse")}
        title={t("carbon_chatbot.progress_collapse")}
        onClick={() => setIsCollapsed(true)}
        className="absolute top-2 right-2 rounded p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
      >
        <Minus size={14} />
      </button>
    </div>
  );
}
