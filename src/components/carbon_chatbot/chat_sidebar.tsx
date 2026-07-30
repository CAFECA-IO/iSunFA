import { useState } from "react";
import {
  Plus,
  Search,
  MessageSquare,
  Clock,
  Settings,
  BookOpen,
  User,
  Pencil,
  ChevronDown,
  ChevronRight,
  FileText,
} from "lucide-react";
import { IChatSession } from "@/types/carbon_chatbot.types";

// Info: (20260716 - Tzuhan) #52 可綁定帳本的最小資訊(選單顯示用)
export interface IAccountBookOption {
  id: string;
  name: string;
}

interface IChatSidebarProps {
  // Info: (20260722 - Tzuhan) UAT:boundBookName 有值 = 帳本會話(列表以圖示+帳本名 chip 區隔個人會話)
  sessionsList: (IChatSession & { boundBookName?: string })[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  // Info: (20260714 - Tzuhan) 新增對話(建立空白 session 並切換)
  // Info: (20260716 - Tzuhan) #52 帶 accountBookId = 建立歸屬該帳本的會話(報告帳本共享);不帶 = 個人會話
  onNewChat?: (accountBookId?: string) => void;
  // Info: (20260716 - Tzuhan) #52 使用者可綁定的帳本;空陣列時點擊直接建個人會話(不出選單)
  accountBooks?: IAccountBookOption[];
  // Info: (20260716 - Tzuhan) 對話改名(自訂標題持久化,首訊衍生不再覆蓋)
  onRenameSession?: (sessionId: string, title: string) => void;
  // Info: (20260716 - Tzuhan) UAT 帳本報告入口:展開帳本時載入該帳本全部會話(含他人;成員即可見)
  onFetchBookSessions?: (accountBookId: string) => Promise<IBookSessionEntry[]>;
  // Info: (20260716 - Tzuhan) 開啟他人會話的報告(帳本檢視器;本人會話走 onSelectSession)
  onOpenBookReport?: (channel: string) => void;
}

// Info: (20260716 - Tzuhan) 帳本會話列表項(標題衍生自密文首訊 server 不可讀,故以建立日期呈現)
export interface IBookSessionEntry {
  sessionId: string;
  channel: string;
  createdAt: string;
  isOwn: boolean;
}

import { useTranslation } from "@/i18n/i18n_context";

export function ChatSidebar({
  sessionsList,
  activeSessionId,
  onSelectSession,
  onNewChat = undefined,
  accountBooks = [],
  onRenameSession = undefined,
  onFetchBookSessions = undefined,
  onOpenBookReport = undefined,
}: IChatSidebarProps) {
  const { t } = useTranslation();
  // Info: (20260716 - Tzuhan) #52 新增對話選單開闔(有帳本時才出現)
  const [isNewChatMenuOpen, setIsNewChatMenuOpen] = useState<boolean>(false);
  // Info: (20260716 - Tzuhan) 改名編輯狀態(session id + 草稿值;Enter/blur 提交,Esc 取消)
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(
    null,
  );

  const commitRename = () => {
    if (editing && editing.value.trim()) {
      onRenameSession?.(editing.id, editing.value);
    }
    setEditing(null);
  };

  // Info: (20260716 - Tzuhan) 帳本報告區:展開狀態與 lazy 載入的會話列表(每帳本一次)
  const [expandedBookId, setExpandedBookId] = useState<string | null>(null);
  const [bookSessions, setBookSessions] = useState<
    Record<string, IBookSessionEntry[]>
  >({});

  const handleToggleBook = async (bookId: string) => {
    if (expandedBookId === bookId) {
      setExpandedBookId(null);
      return;
    }
    setExpandedBookId(bookId);
    if (!bookSessions[bookId] && onFetchBookSessions) {
      try {
        const sessions = await onFetchBookSessions(bookId);
        setBookSessions((prev) => ({ ...prev, [bookId]: sessions }));
      } catch (error) {
        console.error("[chat-sidebar] fetch book sessions failed:", error);
        setBookSessions((prev) => ({ ...prev, [bookId]: [] }));
      }
    }
  };

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

        {/* Info: (20260716 - Tzuhan) #52 歸屬選單:個人(E2EE)或帳本(團隊可閱覽);樣式沿用列表卡片 */}
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
                    {/* Info: (20260722 - Tzuhan) UAT:帳本會話與個人會話的視覺區隔(帳本=書本圖示) */}
                    {s.boundBookName ? (
                      <BookOpen className="h-4 w-4" />
                    ) : (
                      <MessageSquare className="h-4 w-4" />
                    )}
                  </div>
                  <div className="group min-w-0 flex-1">
                    {editing?.id === s.id ? (
                      <input
                        type="text"
                        value={editing.value}
                        // Info: (20260716 - Tzuhan) callback ref 聚焦(jsx-a11y 禁 autoFocus prop;編輯模式為使用者主動觸發)
          ref={(node) => node?.focus()}
                        aria-label={t("carbon_chatbot.rename_session")}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          setEditing({ id: s.id, value: e.target.value })
                        }
                        onBlur={commitRename}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === "Enter") commitRename();
                          if (e.key === "Escape") setEditing(null);
                        }}
                        className="w-full rounded border border-orange-200 px-1.5 py-0.5 text-[13px] font-bold text-gray-800 outline-none focus:border-[#ff5a00]"
                      />
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="truncate text-[13px] font-bold text-gray-800">
                          {s.title}
                        </span>
                        {onRenameSession && (
                          <button
                            type="button"
                            aria-label={t("carbon_chatbot.rename_session")}
                            title={t("carbon_chatbot.rename_session")}
                            onClick={(e) => {
                              // Info: (20260716 - Tzuhan) 不觸發卡片的切換對話
                              e.stopPropagation();
                              setEditing({ id: s.id, value: s.title });
                            }}
                            className="shrink-0 rounded p-0.5 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-[#ff5a00]"
                          >
                            <Pencil size={11} />
                          </button>
                        )}
                      </div>
                    )}
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
                      {/* Info: (20260722 - Tzuhan) UAT:帳本會話 chip(帳本名;個人會話不顯示) */}
                      {s.boundBookName && (
                        <span
                          title={s.boundBookName}
                          className="flex min-w-0 items-center gap-0.5 rounded-full bg-orange-50 px-2 py-0.5 text-[9px] font-bold text-[#e04f00] ring-1 ring-orange-100"
                        >
                          <BookOpen size={9} className="shrink-0" />
                          <span className="max-w-[7rem] truncate">
                            {s.boundBookName}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Info: (20260716 - Tzuhan) UAT 帳本報告:成員查看團隊碳盤查報告的入口(聊天記錄個人加密,僅共享報告) */}
      {accountBooks.length > 0 && onFetchBookSessions && (
        <div className="border-t border-gray-100 px-3 py-3">
          <div className="mb-2 px-2 text-xs font-bold text-gray-400">
            {t("carbon_chatbot.book_reports_title")}
          </div>
          <div className="space-y-1">
            {accountBooks.map((book) => (
              <div key={book.id}>
                <button
                  type="button"
                  onClick={() => handleToggleBook(book.id)}
                  className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-[13px] font-bold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  {expandedBookId === book.id ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  )}
                  <BookOpen className="h-4 w-4 shrink-0 text-[#ff5a00]" />
                  <span className="truncate">{book.name}</span>
                </button>
                {expandedBookId === book.id && (
                  <div className="ml-6 space-y-0.5">
                    {(bookSessions[book.id] ?? []).length === 0 && (
                      <p className="px-2 py-1 text-[11px] text-gray-400">
                        {t("carbon_chatbot.book_no_sessions")}
                      </p>
                    )}
                    {(bookSessions[book.id] ?? []).map((entry) => (
                      <button
                        key={entry.channel}
                        type="button"
                        onClick={() =>
                          entry.isOwn
                            ? onSelectSession(entry.sessionId)
                            : onOpenBookReport?.(entry.channel)
                        }
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] text-gray-600 transition-colors hover:bg-orange-50"
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0 text-gray-300" />
                        <span className="truncate">
                          {entry.isOwn
                            ? t("carbon_chatbot.book_session_own", {
                                date: new Date(
                                  entry.createdAt,
                                ).toLocaleDateString(),
                              })
                            : t("carbon_chatbot.book_session_member", {
                                date: new Date(
                                  entry.createdAt,
                                ).toLocaleDateString(),
                              })}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="cursor-pointer border-t border-gray-100 p-4 transition-colors hover:bg-gray-50">
        <div className="flex items-center gap-3 px-2 text-gray-500">
          <Settings className="h-4 w-4" />
          <span className="text-[13px] font-bold">{t("sidebar.settings")}</span>
        </div>
      </div>
    </div>
  );
}
