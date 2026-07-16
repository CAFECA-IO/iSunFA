"use client";

// Info: (20260716 - Emily) #52 帳本報告檢視器:帳本成員開啟「他人會話」的報告(UAT:組織其他人在哪裡查看)
// Info: (20260716 - Emily) 隱私邊界:本檢視器只載入報告(帳本明文模式),絕不觸碰聊天訊息 —
// Info: (20260716 - Emily) 聊天為個人 E2EE,他人在密碼學上不可讀,結構上也不請求
// Info: (20260716 - Emily) 權限:server 依 TeamRole 裁決 — VIEWER 唯讀;EDITOR 以上可編輯(需解鎖取得本人金鑰簽存)

import { useCallback, useEffect, useRef, useState } from "react";
import { X, Loader2, Check, AlertTriangle } from "lucide-react";
import { IReportData } from "@/types/carbon_chatbot.types";
import {
  loadReportDraft,
  saveReportDraft,
  isDraftVersionConflict,
} from "@/lib/carbon_report_draft_storage";
import { type IChatroomMasterKey } from "@/lib/chatroom_ecies";
import { CARBON_REPORT_AUTOSAVE_DEBOUNCE_MS } from "@/constants/carbon_chatbot";
import { MarkdownContent } from "@/components/common/markdown_content";
import { useTranslation } from "@/i18n/i18n_context";

export interface IBookReportViewerProps {
  channel: string;
  // Info: (20260716 - Emily) 編輯保存需本人金鑰(recipientPublicKey);未解鎖 → 一律唯讀
  masterKey: IChatroomMasterKey | null;
  onClose: () => void;
}

type ViewerSaveStatus = "saving" | "saved" | "error" | null;

export function BookReportViewer({
  channel,
  masterKey,
  onClose,
}: IBookReportViewerProps) {
  const { t } = useTranslation();
  const [reportData, setReportData] = useState<IReportData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [canEdit, setCanEdit] = useState<boolean>(false);
  const [accountBookId, setAccountBookId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<ViewerSaveStatus>(null);
  const versionRef = useRef<number>(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Info: (20260716 - Emily) 載入報告(帳本明文模式免金鑰;access 由 server 裁決回傳)
  useEffect(() => {
    let cancelled = false;
    loadReportDraft(channel, masterKey)
      .then((loaded) => {
        if (cancelled) return;
        setIsLoading(false);
        if (!loaded) return;
        versionRef.current = loaded.version;
        setReportData(loaded.reportData);
        setAccountBookId(loaded.accountBookId);
        // Info: (20260716 - Emily) 編輯需 server 授權 + 本人金鑰(保存 payload 需 recipientPublicKey)
        setCanEdit(loaded.canEdit && Boolean(masterKey));
      })
      .catch((error) => {
        console.error("[book-report-viewer] load failed:", error);
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [channel, masterKey]);

  // Info: (20260716 - Emily) Editor 編輯:直接改 rawMarkdown(權威來源)+ debounce 保存(樂觀鎖)
  const handleChange = useCallback(
    (nextMarkdown: string) => {
      if (!canEdit || !masterKey) return;
      setReportData((prev) => {
        if (!prev) return prev;
        const next = { ...prev, rawMarkdown: nextMarkdown };
        setSaveStatus("saving");
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
          saveTimerRef.current = null;
          saveReportDraft(channel, masterKey, next, versionRef.current, accountBookId)
            .then((newVersion) => {
              versionRef.current = newVersion;
              setSaveStatus("saved");
            })
            .catch((error) => {
              if (isDraftVersionConflict(error)) {
                console.warn("[book-report-viewer] version conflict:", channel);
              } else {
                console.error("[book-report-viewer] save failed:", error);
              }
              setSaveStatus("error");
            });
        }, CARBON_REPORT_AUTOSAVE_DEBOUNCE_MS);
        return next;
      });
    },
    [canEdit, masterKey, channel, accountBookId],
  );

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    },
    [],
  );

  const markdown = reportData?.rawMarkdown ?? "";

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/30 p-4">
      <div className="flex h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
          <span className="min-w-0 truncate text-sm font-bold text-gray-800">
            {reportData?.documentName ??
              t("carbon_chatbot.book_report_viewer_title")}
          </span>
          <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">
            {canEdit
              ? t("carbon_chatbot.book_report_editable")
              : t("carbon_chatbot.read_only")}
          </span>
          {saveStatus === "saving" && (
            <Loader2 size={11} className="animate-spin text-gray-400" />
          )}
          {saveStatus === "saved" && (
            <Check size={11} className="text-green-600" />
          )}
          {saveStatus === "error" && (
            <AlertTriangle size={11} className="text-red-500" />
          )}
          {/* Info: (20260716 - Emily) 隱私聲明:聊天記錄為個人加密,帳本成員僅共享報告 */}
          <span className="ml-auto shrink-0 text-[10px] text-gray-400">
            {t("carbon_chatbot.book_chat_hidden_note")}
          </span>
          <button
            type="button"
            aria-label={t("carbon_chatbot.close_report")}
            onClick={onClose}
            className="shrink-0 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          {isLoading && (
            <div className="flex h-full items-center justify-center text-gray-400">
              <Loader2 size={20} className="animate-spin" />
            </div>
          )}
          {!isLoading && !reportData && (
            <p className="p-8 text-center text-sm text-gray-400">
              {t("carbon_chatbot.book_report_empty")}
            </p>
          )}
          {!isLoading && reportData && canEdit && (
            // Info: (20260716 - Emily) Editor:左編輯右預覽(簡化雙欄;完整工具列屬本人會話動線)
            <div className="grid h-full grid-cols-2 divide-x divide-gray-100">
              <textarea
                value={markdown}
                onChange={(e) => handleChange(e.target.value)}
                aria-label={t("carbon_chatbot.book_report_viewer_title")}
                className="h-full w-full resize-none p-4 font-mono text-xs text-gray-700 outline-none"
              />
              <div className="h-full overflow-y-auto p-4">
                <MarkdownContent content={markdown} theme="light" />
              </div>
            </div>
          )}
          {!isLoading && reportData && !canEdit && (
            <div className="h-full overflow-y-auto p-6">
              <MarkdownContent content={markdown} theme="light" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
