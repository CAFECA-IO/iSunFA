export interface IChatProgressWidgetProps {
  progress: number;
}
import { useTranslation } from "@/i18n/i18n_context";

export function ChatProgressWidget({ progress }: IChatProgressWidgetProps) {
  const { t } = useTranslation();
  return (
    <div className="absolute right-10 bottom-10 z-20 flex w-80 items-center gap-5 rounded-2xl bg-[#1e293b] p-5 text-white shadow-2xl">
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
        <div className="mb-2.5 flex justify-between text-xs font-bold tracking-wide text-slate-300">
          <span>{t("carbon_chatbot.report_progress")}</span>
          <span className="text-white">{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full border border-white/5 bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-500 to-[#ff5a00] shadow-[0_0_10px_rgba(255,90,0,0.5)] transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}
