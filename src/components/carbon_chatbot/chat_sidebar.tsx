import { Plus, Search, MessageSquare, Clock, Settings } from "lucide-react";
import { IChatSession } from "@/types/carbon_chatbot.types";

interface IChatSidebarProps {
  sessionsList: IChatSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
}

import { useTranslation } from "@/i18n/i18n_context";

export function ChatSidebar({
  sessionsList,
  activeSessionId,
  onSelectSession,
}: IChatSidebarProps) {
  const { t } = useTranslation();
  return (
    <div className="relative hidden w-[280px] shrink-0 flex-col border-r border-gray-200 bg-white lg:flex">
      <div className="p-5 pb-2">
        <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#ff5a00] py-3 text-[15px] font-bold text-white shadow-md shadow-orange-500/20 transition-colors hover:bg-[#e04f00]">
          <Plus className="h-4 w-4" />
          {t("carbon_chatbot.new_chat")}
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        <div>
          <div className="mb-3 flex items-center justify-between px-2">
            <span className="text-xs font-bold text-gray-400">
              {t("carbon_chatbot.history")}
            </span>
            <Search className="h-3.5 w-3.5 cursor-pointer text-gray-400 hover:text-gray-600" />
          </div>

          <div className="space-y-1.5">
            {sessionsList.map((s) => (
              <div
                key={s.id}
                role="button"
                tabIndex={0}
                aria-label={s.title}
                onClick={() => onSelectSession(s.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectSession(s.id);
                  }
                }}
                className={`cursor-pointer rounded-2xl border p-3.5 transition-all ${
                  activeSessionId === s.id
                    ? "border-orange-100 bg-orange-50/80 shadow-sm"
                    : "border-transparent hover:bg-gray-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 rounded-xl p-2 ${
                      activeSessionId === s.id
                        ? "bg-[#ff5a00] text-white shadow-sm"
                        : "border border-gray-100 bg-white text-gray-400"
                    }`}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-bold text-gray-800">
                      {s.title}
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1 text-[11px] font-medium text-gray-400">
                        <Clock className="h-3 w-3" />
                        {s.time}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider ${s.statusColor}`}
                      >
                        {s.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="cursor-pointer border-t border-gray-100 p-4 transition-colors hover:bg-gray-50">
        <div className="flex items-center gap-3 px-2 text-gray-500">
          <Settings className="h-4 w-4" />
          <span className="text-[13px] font-bold">{t("sidebar.settings")}</span>
        </div>
      </div>
    </div>
  );
}
