"use client";

// Info: (20260713 - Tzuhan) 報告工具列:文件名 + 完成/查核雙軌進度膠囊 + 章節目錄開關

import { useRef, useState } from "react";
import {
  FileText,
  ListTree,
  Check,
  Loader2,
  AlertTriangle,
  FileUp,
  Pencil,
  ShieldCheck,
} from "lucide-react";
import { IReportProgressStats } from "@/types/carbon_chatbot.types";
import { ReportSaveStatus } from "@/hooks/use_carbon_chat";
import { useTranslation } from "@/i18n/i18n_context";

interface IReportToolbarProps {
  documentName: string;
  stats: IReportProgressStats;
  /**
   * Info: (20260804 - Tzuhan) 匯入來歷。與 stats 的匯入計數是兩件事:
   * 計數會隨編輯下降(編輯把段落 origin 改成 MANUAL),歸零時整塊消失;
   * 來歷是發生過的事實,一旦寫入就不再改變。
   */
  importedFrom?: { fileName: string; importedAt: string };
  isDrawerOpen: boolean;
  onToggleDrawer: () => void;
  // Info: (20260713 - Tzuhan) 報告狀態徽章(取代舊 Markdown 內嵌 HTML 的狀態列)
  status?: string;
  statusColor?: string;
  // Info: (20260714 - Tzuhan) 報告草稿本機保存狀態(null = 尚無變更)
  saveStatus?: ReportSaveStatus;
  // Info: (20260716 - Tzuhan) #52 唯讀徽章(帳本 VIEWER 閱覽他人報告)
  readOnly?: boolean;
  // Info: (20260716 - Tzuhan) #56 匯入整份報告(pdf/md/txt);唯讀時隱藏
  onImportReport?: (file: File) => void;
  // Info: (20260716 - Tzuhan) 報告檔名改名(隨草稿持久化,下載檔名跟隨);唯讀時隱藏
  onRenameDocument?: (documentName: string) => void;
  /**
   * Info: (20260814 - Emily) 查證識別欄位面板的開關（issue 24）。
   * 面板本身在預覽層（`carbon_report_preview`），這裡只放觸發鈕 ——
   * 工具列是一列，塞不進四個輸入框。
   */
  onToggleIdentity?: () => void;
  /** Info: (20260814 - Emily) 還沒填幾項;0 即不顯示紅點 */
  identityMissing?: number;
  isIdentityOpen?: boolean;
}

export function ReportToolbar({
  documentName,
  stats,
  importedFrom = undefined,
  isDrawerOpen,
  onToggleDrawer,
  status = undefined,
  statusColor = undefined,
  saveStatus = null,
  readOnly = false,
  onImportReport = undefined,
  onRenameDocument = undefined,
  onToggleIdentity = undefined,
  identityMissing = 0,
  isIdentityOpen = false,
}: IReportToolbarProps) {
  const { t } = useTranslation();
  const importInputRef = useRef<HTMLInputElement>(null);
  // Info: (20260716 - Tzuhan) 檔名 inline 編輯狀態(Enter/blur 提交,Esc 取消)
  const [editingName, setEditingName] = useState<string | null>(null);

  const commitRename = () => {
    if (editingName !== null && editingName.trim()) {
      onRenameDocument?.(editingName);
    }
    setEditingName(null);
  };

  /**
   * Info: (20260805 - Tzuhan) 允許換行(`flex-wrap`)。
   *
   * 原本是單行 flex,而列上幾乎每個膠囊都 `shrink-0`:
   * 檔名 + 狀態 + 保存 + 匯入報告 + 進度膠囊(完成/查核/逐字匯入/AI 草稿/匯入自 檔名/進度條) + 目錄。
   * 聊天面板 dock 起來會從文檔流吃掉 420px,剩餘寬度裝不下這一列 —— 於是整列往右溢出。
   * 而外層報告容器是 `relative`、聊天面板 dock 時是 `static`,**定位元素畫在未定位元素之上**,
   * 溢出的「目錄」按鈕就疊在聊天面板的標題上(實測畫面正是如此)。
   *
   * 選換行而不是隱藏或裁切:這一列每一項都是審計資訊 ——
   * 逐字匯入 vs AI 草稿的區隔、匯入來歷的檔名,少一項就是少一項事實。
   * 寧可多佔一行,不可讓資訊消失或互相遮蔽。
   */
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-gray-200 bg-white px-4 py-2.5">
      <FileText size={16} className="shrink-0 text-gray-400" />
      {editingName !== null ? (
        <input
          type="text"
          value={editingName}
          // Info: (20260716 - Tzuhan) callback ref 聚焦(jsx-a11y 禁 autoFocus prop;編輯模式為使用者主動觸發)
          ref={(node) => node?.focus()}
          aria-label={t("carbon_chatbot.rename_document")}
          onChange={(e) => setEditingName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") setEditingName(null);
          }}
          className="min-w-0 flex-1 rounded border border-orange-200 px-1.5 py-0.5 text-xs font-bold text-gray-700 outline-none focus:border-[#ff5a00]"
        />
      ) : (
        <span
          className="min-w-0 truncate text-xs font-bold text-gray-700"
          title={documentName}
        >
          {documentName}
        </span>
      )}
      {onRenameDocument && !readOnly && editingName === null && (
        <button
          type="button"
          aria-label={t("carbon_chatbot.rename_document")}
          title={t("carbon_chatbot.rename_document")}
          onClick={() => setEditingName(documentName)}
          className="shrink-0 rounded p-0.5 text-gray-300 transition-colors hover:text-[#ff5a00]"
        >
          <Pencil size={12} />
        </button>
      )}
      {/* Info: (20260814 - Emily) 查證識別欄位（issue 24）。未填的項數用數字而不是紅點:
          「還缺 4 項」與「還缺 1 項」的急迫性不同,一個點看不出來。 */}
      {onToggleIdentity && (
        <button
          type="button"
          aria-label={t("admin_mission_board.pdf_editor.report_identity.title")}
          title={t("admin_mission_board.pdf_editor.report_identity.title")}
          aria-expanded={isIdentityOpen}
          onClick={onToggleIdentity}
          className={`flex shrink-0 items-center gap-1 rounded px-1 py-0.5 text-[11px] font-bold transition-colors ${
            isIdentityOpen
              ? "bg-orange-100 text-[#ff5a00]"
              : "text-gray-300 hover:text-[#ff5a00]"
          }`}
        >
          <ShieldCheck size={12} />
          {identityMissing > 0 && (
            <span className="text-[#ff5a00]">{identityMissing}</span>
          )}
        </button>
      )}
      {status && (
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${statusColor ?? "bg-gray-100 text-gray-500"}`}
        >
          {status}
        </span>
      )}

      {/* Info: (20260714 - Tzuhan) 草稿保存指示(E2EE 入庫);error = 保存失敗或他端已更新(版本衝突) */}
      {saveStatus && (
        <span
          title={
            saveStatus === "error"
              ? t("carbon_chatbot.save_failed_hint")
              : t("carbon_chatbot.save_local_hint")
          }
          className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-gray-400"
        >
          {saveStatus === "saving" && (
            <>
              <Loader2 size={11} className="animate-spin" />
              {t("carbon_chatbot.save_saving")}
            </>
          )}
          {onImportReport && !readOnly && (
            <>
              <input
                ref={importInputRef}
                type="file"
                accept=".pdf,.md,.txt,application/pdf,text/markdown,text/plain"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onImportReport(file);
                  // Info: (20260716 - Tzuhan) 清空 value,允許重選同一檔案
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                title={t("carbon_chatbot.import_button")}
                onClick={() => importInputRef.current?.click()}
                className="flex shrink-0 items-center gap-1 rounded-full border border-gray-200 px-2.5 py-1 text-[11px] font-bold text-gray-500 transition-colors hover:border-orange-200 hover:text-[#ff5a00]"
              >
                <FileUp size={12} />
                {t("carbon_chatbot.import_button")}
              </button>
            </>
          )}
          {readOnly && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">
              {t("carbon_chatbot.read_only")}
            </span>
          )}
          {saveStatus === "local" && (
            <>
              {/* Info: (20260716 - Tzuhan) #50 未解鎖前僅本機暫存:琥珀色提示,解鎖後自動轉雲端保存 */}
              <AlertTriangle size={11} className="text-amber-500" />
              <span className="text-amber-600">
                {t("carbon_chatbot.save_local")}
              </span>
            </>
          )}
          {saveStatus === "saved" && (
            <>
              <Check size={11} className="text-green-600" />
              {t("carbon_chatbot.save_saved")}
            </>
          )}
          {saveStatus === "error" && (
            <>
              <AlertTriangle size={11} className="text-red-500" />
              <span className="text-red-500">
                {t("carbon_chatbot.save_failed")}
              </span>
            </>
          )}
        </span>
      )}

      {/* Info: (20260713 - Tzuhan) 進度膠囊:點擊也可展開章節目錄 */}
      <button
        type="button"
        onClick={onToggleDrawer}
        className="ml-auto flex min-w-0 items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs transition-colors hover:bg-gray-100"
        title={t("carbon_chatbot.outline_title")}
      >
        {/* Info: (20260805 - Tzuhan) 數字與進度條不可壓縮:壓縮後就讀不出來了。要讓位的是下方的匯入檔名 */}
        <span className="shrink-0 font-medium text-green-700">
          {t("carbon_chatbot.completed_short")} {stats.completedCount}/
          {stats.totalCount}
        </span>
        <span className="shrink-0 text-gray-300">|</span>
        <span className="shrink-0 font-medium text-blue-700">
          {t("carbon_chatbot.verified_short")} {stats.verifiedCount}/
          {stats.totalCount}
        </span>
        {/* Info: (20260730 - Tzuhan) 來源拆解原本只出現在已移除的進度浮窗;進度收斂到此處後一併帶過來,
            否則「逐字匯入 vs AI 草稿」的區隔會隨浮窗一起消失(那是審計文件的底線,不可掉) */}
        {stats.importedCount + stats.draftedCount > 0 && (
          <>
            <span className="shrink-0 text-gray-300">|</span>
            <span className="shrink-0 font-medium text-emerald-700">
              {t("carbon_chatbot.origin_imported")} {stats.importedCount}
            </span>
            <span className="shrink-0 font-medium text-purple-700">
              {t("carbon_chatbot.origin_ai_draft")} {stats.draftedCount}
            </span>
          </>
        )}
        {importedFrom && (
          <>
            <span className="shrink-0 text-gray-300">|</span>
            {/* Info: (20260805 - Tzuhan) 檔名是這列唯一可截斷的:全名在 title 與報告的匯入摘要裡都留著 */}
            <span
              className="max-w-40 min-w-0 truncate font-medium text-emerald-700"
              title={t("carbon_chatbot.imported_from_title", {
                name: importedFrom.fileName,
                date: new Date(importedFrom.importedAt).toLocaleString(),
              })}
            >
              {t("carbon_chatbot.imported_from_short")} {importedFrom.fileName}
            </span>
          </>
        )}
        <span className="relative inline-block h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-gray-200">
          <span
            className="absolute inset-y-0 left-0 rounded-full bg-green-400 transition-all duration-500"
            style={{ width: `${stats.completedPercent}%` }}
          />
          <span
            className="absolute inset-y-0 left-0 rounded-full bg-blue-500 transition-all duration-500"
            style={{ width: `${stats.verifiedPercent}%` }}
          />
        </span>
      </button>

      <button
        type="button"
        onClick={onToggleDrawer}
        className={`flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
          isDrawerOpen
            ? "border-[#ff5a00] bg-orange-50 text-[#ff5a00]"
            : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
        }`}
      >
        <ListTree size={14} />
        {t("carbon_chatbot.outline_button")}
      </button>
    </div>
  );
}
