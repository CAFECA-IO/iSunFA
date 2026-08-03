// Info: (20260716 - Tzuhan) #56 報告匯入預覽卡:逐段勾選確認後才寫入(與 #55 修訂卡同風格、同人工 gate 原則)
// Info: (20260716 - Tzuhan) unmapped 桶原樣呈現不丟棄;已有內容的段落顯示覆蓋警告;匯入段落查核一律重置

import {
  FileUp,
  Check,
  X,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import type { ICarbonSourceTable } from "@/lib/carbon_source_table.builder";

export interface IPendingImportItem {
  paragraphId: string;
  title: string;
  content: string;
  // Info: (20260716 - Tzuhan) 目標段落已有內容(匯入將覆蓋,需醒目警告)
  hasExisting: boolean;
  checked: boolean;
  // Info: (20260727 - Tzuhan) #57 AI 草稿補齊段落(非逐字原文):預覽需明確標記,與原樣匯入區隔
  isDraft?: boolean;
  /**
   * Info: (20260801 - Tzuhan) 自原文照錄的表格(已逐張裁決)。預覽顯示張數,
   * 使用者勾選該段時一併落地 —— 表格與敘述同屬一段的照錄結果,不該能分開勾。
   */
  sourceTables?: ICarbonSourceTable[];
}

export interface IPendingImport {
  fileName: string;
  items: IPendingImportItem[];
  unmapped: string[];
  // Info: (20260716 - Tzuhan) 匯入的活動數據筆數(顯示用;實際合併於確認時執行)
  activityCount: number;
  // Info: (20260717 - Tzuhan) 逐章解析失敗的章節(id 供重試呼叫、title 供顯示;空陣列 = 全部成功)
  failedChapters: { id: string; title: string }[];
}

export interface IImportPreviewProps {
  pendingImport: IPendingImport;
  onToggleItem: (paragraphId: string) => void;
  onApply: () => void;
  onDiscard: () => void;
  // Info: (20260717 - Tzuhan) 只重跑失敗章節並合併進本預覽(檔案由 hook 暫存,無需重選)
  onRetryFailed?: () => void;
}

export function ImportPreview({
  pendingImport,
  onToggleItem,
  onApply,
  onDiscard,
  onRetryFailed = undefined,
}: IImportPreviewProps) {
  const { t } = useTranslation();
  const checkedCount = pendingImport.items.filter((i) => i.checked).length;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/30 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
          <FileUp size={16} className="shrink-0 text-[#ff5a00]" />
          <span className="truncate text-sm font-bold text-gray-800">
            {t("carbon_chatbot.import_title", {
              name: pendingImport.fileName,
            })}
          </span>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-5">
          {pendingImport.items.map((item) => (
            <label
              key={item.paragraphId}
              aria-label={item.title}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                item.checked
                  ? "border-orange-200 bg-orange-50/60"
                  : "border-gray-100 hover:bg-gray-50"
              }`}
            >
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => onToggleItem(item.paragraphId)}
                className="mt-1 accent-[#ff5a00]"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-xs font-bold text-gray-800">
                    {item.title}
                  </span>
                  {item.hasExisting && (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                      <AlertTriangle size={10} />
                      {t("carbon_chatbot.import_overwrite_warning")}
                    </span>
                  )}
                  {item.isDraft && (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-600">
                      <Sparkles size={10} />
                      {t("carbon_chatbot.import_draft_badge")}
                    </span>
                  )}
                </div>
                <p className="mt-1 line-clamp-3 text-xs whitespace-pre-wrap text-gray-500">
                  {item.content}
                </p>
              </div>
            </label>
          ))}

          {pendingImport.failedChapters.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-xl bg-amber-50 p-3 text-[11px] font-bold text-amber-700">
              <AlertTriangle size={12} className="shrink-0" />
              <span className="min-w-0 flex-1">
                {t("carbon_chatbot.import_failed_chapters", {
                  chapters: pendingImport.failedChapters
                    .map((chapter) => chapter.title)
                    .join("、"),
                })}
              </span>
              {onRetryFailed && (
                <button
                  type="button"
                  onClick={onRetryFailed}
                  className="flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 font-bold text-amber-700 ring-1 ring-amber-200 transition-colors hover:bg-amber-100"
                >
                  <RotateCcw size={11} />
                  {t("carbon_chatbot.import_retry_failed")}
                </button>
              )}
            </div>
          )}

          {pendingImport.unmapped.length > 0 && (
            <div className="rounded-xl bg-gray-50 p-3">
              <div className="mb-1 text-xs font-bold text-gray-500">
                {t("carbon_chatbot.import_unmapped", {
                  count: pendingImport.unmapped.length,
                })}
              </div>
              {pendingImport.unmapped.map((text) => (
                <p
                  key={text.slice(0, 80)}
                  className="mt-1 line-clamp-2 text-[11px] text-gray-400"
                >
                  {text}
                </p>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-gray-100 px-5 py-3">
          {/* Info: (20260716 - Tzuhan) 匯入即重置查核 + 數字重勾稽:對使用者明示,非隱性行為 */}
          <span className="text-[11px] text-gray-400">
            {t("carbon_chatbot.import_reset_note", {
              activities: pendingImport.activityCount,
            })}
          </span>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={onDiscard}
              className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold text-gray-500 transition-colors hover:bg-gray-100"
            >
              <X size={14} />
              {t("carbon_chatbot.revision_discard")}
            </button>
            <button
              type="button"
              onClick={onApply}
              disabled={checkedCount === 0}
              className="flex items-center gap-1.5 rounded-full bg-[#ff5a00] px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#e04f00] disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              <Check size={14} />
              {t("carbon_chatbot.import_apply", { count: checkedCount })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
