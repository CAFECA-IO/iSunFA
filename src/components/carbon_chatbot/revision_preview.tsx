// Info: (20260716 - Emily) #55 段落修訂對照卡:AI 依附件/指示產生的修訂稿「不直接落地」,
// Info: (20260716 - Emily) 原文/修訂並列供人工確認 — AI 動既有內容必須過人工 gate(與草稿填空白段落不同)
// Info: (20260716 - Emily) #56 報告匯入共用本卡(逐段確認),樣式沿用聊天視窗白卡系

import { useMemo } from "react";
import { FileDiff, Check, X } from "lucide-react";
import { diffLines, DiffLineTypeEnum } from "@/lib/line_diff";
import { useTranslation } from "@/i18n/i18n_context";

export interface IPendingRevision {
  paragraphId: string;
  // Info: (20260716 - Emily) 顯示用段落標題(code + title)
  title: string;
  original: string;
  revised: string;
  // Info: (20260716 - Emily) 修訂引用的事實(零捏造溯源,可為空)
  citedFacts: string[];
}

export interface IRevisionPreviewProps {
  revision: IPendingRevision;
  onApply: () => void;
  onDiscard: () => void;
}

export function RevisionPreview({
  revision,
  onApply,
  onDiscard,
}: IRevisionPreviewProps) {
  const { t } = useTranslation();

  // Info: (20260717 - Emily) 行級 diff(LCS):一眼看見動了哪幾行;超出護欄回 null → 退回原文/修訂並列
  const diff = useMemo(
    () => diffLines(revision.original, revision.revised),
    [revision.original, revision.revised],
  );

  return (
    // Info: (20260716 - Emily) 置中覆蓋卡(z 高於聊天視窗):確認前阻擋誤操作報告
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/30 p-4">
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
          <FileDiff size={16} className="shrink-0 text-[#ff5a00]" />
          <span className="truncate text-sm font-bold text-gray-800">
            {t("carbon_chatbot.revision_title", { section: revision.title })}
          </span>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
          {diff ? (
            // Info: (20260717 - Emily) 單欄行級對照:紅=刪除(原文)、綠=新增(修訂)、灰=未動
            <div className="rounded-xl border border-gray-100 text-sm">
              {diff.map((line, index) => {
                const key = `${line.type}-${index}-${line.text.slice(0, 24)}`;
                if (line.type === DiffLineTypeEnum.REMOVED) {
                  return (
                    <div
                      key={key}
                      className="bg-red-50 px-3 py-0.5 whitespace-pre-wrap text-red-600 line-through"
                    >
                      {line.text || " "}
                    </div>
                  );
                }
                if (line.type === DiffLineTypeEnum.ADDED) {
                  return (
                    <div
                      key={key}
                      className="bg-emerald-50 px-3 py-0.5 whitespace-pre-wrap text-emerald-800"
                    >
                      {line.text || " "}
                    </div>
                  );
                }
                return (
                  <div
                    key={key}
                    className="px-3 py-0.5 whitespace-pre-wrap text-gray-500"
                  >
                    {line.text || " "}
                  </div>
                );
              })}
            </div>
          ) : (
            // Info: (20260717 - Emily) 超長內容退回並列呈現(不做部分 diff 誤導)
            <>
              <div>
                <div className="mb-1 text-xs font-bold text-gray-400">
                  {t("carbon_chatbot.revision_original")}
                </div>
                <div className="rounded-xl bg-gray-50 p-3 text-sm whitespace-pre-wrap text-gray-600">
                  {revision.original}
                </div>
              </div>
              <div>
                <div className="mb-1 text-xs font-bold text-emerald-600">
                  {t("carbon_chatbot.revision_revised")}
                </div>
                <div className="rounded-xl bg-emerald-50 p-3 text-sm whitespace-pre-wrap text-gray-800">
                  {revision.revised}
                </div>
              </div>
            </>
          )}
          {revision.citedFacts.length > 0 && (
            <div className="text-[11px] text-gray-400">
              {t("carbon_chatbot.revision_cited_facts")}:
              {` ${revision.citedFacts.join("、")}`}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-3">
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
            className="flex items-center gap-1.5 rounded-full bg-[#ff5a00] px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#e04f00]"
          >
            <Check size={14} />
            {t("carbon_chatbot.revision_apply")}
          </button>
        </div>
      </div>
    </div>
  );
}
