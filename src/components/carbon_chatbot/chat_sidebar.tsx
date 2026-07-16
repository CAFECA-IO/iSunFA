import { useState } from "react";
import {
  Plus,
  Search,
  MessageSquare,
  Clock,
  Settings,
  BookOpen,
  User,
} from "lucide-react";
import { IChatSession } from "@/types/carbon_chatbot.types";

// Info: (20260716 - Emily) #52 可綁定帳本的最小資訊(選單顯示用)
export interface IAccountBookOption {
  id: string;
  name: string;
}

interface IChatSidebarProps {
  sessionsList: IChatSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  // Info: (20260714 - Emily) 新增對話(建立空白 session 並切換)
  // Info: (20260716 - Emily) #52 帶 accountBookId = 建立歸屬該帳本的會話(報告帳本共享);不帶 = 個人會話
  onNewChat?: (accountBookId?: string) => void;
  // Info: (20260716 - Emily) #52 使用者可綁定的帳本;空陣列時點擊直接建個人會話(不出選單)
  accountBooks?: IAccountBookOption[];
}

import { useTranslation } from "@/i18n/i18n_context";

export function ChatSidebar({
  sessionsList,
  activeSessionId,
  onSelectSession,
  onNewChat = undefined,
  accountBooks = [],
}: IChatSidebarProps) {
  const { t } = useTranslation();
  // Info: (20260716 - Emily) #52 新增對話選單開闔(有帳本時才出現)
  const [isNewChatMenuOpen, setIsNewChatMenuOpen] = useState<boolean>(false);

  const handleNewChatClick = () => {
    if (accountBooks.length === 0) {
      onNewChat?.();
      return;
    }
    setIsNewChatMenuOpen((prev) => !prev);
  };

  const handlePickTarget = (accountBookId?: string) => {
    setIsNewChatMenuOpen(false);
    onNewChat?.(accountBookId);
  };
  return (
    <div className="relative hidden w-[280px] shrink-0 flex-col border-r border-gray-200 bg-white lg:flex">
      <div className="relative p-5 pb-2">
        <button
          type="button"
          onClick={handleNewChatClick}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#ff5a00] py-3 text-[15px] font-bold text-white shadow-md shadow-orange-500/20 transition-colors hover:bg-[#e04f00]"
        >
          <Plus className="h-4 w-4" />
          {t("carbon_chatbot.new_chat")}
        </button>

        {/* Info: (20260716 - Emily) #52 歸屬選單:個人(E2EE)或帳本(團隊可閱覽);樣式沿用列表卡片 */}
        {isNewChatMenuOpen && (
          <div className="absolute right-5 left-5 z-30 mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
            <button
              type="button"
              onClick={() => handlePickTarget()}
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-[13px] font-bold text-gray-700 transition-colors hover:bg-orange-50"
            >
              <User className="h-4 w-4 text-gray-400" />
              {t("carbon_chatbot.new_chat_personal")}
            </button>
            {accountBooks.map((book) => (
              <button
                key={book.id}
                type="button"
                onClick={() => handlePickTarget(book.id)}
                className="flex w-full items-center gap-2 border-t border-gray-100 px-4 py-3 text-left text-[13px] font-bold text-gray-700 transition-colors hover:bg-orange-50"
              >
                <BookOpen className="h-4 w-4 text-[#ff5a00]" />
                <span className="truncate">{book.name}</span>
              </button>
            ))}
          </div>
        )}
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
