"use client";

import { FC } from "react";
import { ExternalLink } from "lucide-react";
import { IAICitation, IAIResponse } from "@/interfaces/business_monitor";
import { useTranslation } from "@/i18n/i18n_context";
import {
  DOWNLOAD_FAILURE,
  useReportDownload,
} from "@/hooks/use_report_download";

interface IAiResponseCardProps {
  aiResponse: IAIResponse;
  onShowToast: (type: "success" | "error", message: string) => void;
}

interface ICitationRowProps {
  citation: IAICitation;
  onShowToast: (type: "success" | "error", message: string) => void;
}

/**
 * Info: (20261022 - Luphia) 一筆出處：[n] 公司｜報告｜頁碼，加上官方來源連結與原始檔下載。
 * 原本這裡的「下載」產生一份假的 .txt；現在下載的是觀測站或匯入時保存的原始檔。
 */
const CitationRow: FC<ICitationRowProps> = ({ citation, onShowToast }) => {
  const { t } = useTranslation();
  const { downloadTask, startDownload } = useReportDownload();
  const isDownloading = downloadTask?.status === "downloading";

  const handleDownload = () => {
    startDownload(citation.reportId, undefined, (reason) =>
      onShowToast(
        "error",
        reason === DOWNLOAD_FAILURE.FILE_NOT_READY
          ? t("business_monitor.reports.item.toast_file_not_ready", {
              company: citation.companyName,
            })
          : t("business_monitor.reports.item.toast_download_error", {
              company: citation.companyName,
            }),
      ),
    );
  };

  return (
    <li className="flex flex-col gap-1 text-xs font-medium text-slate-600 md:flex-row md:items-center">
      <p className="min-w-0 flex-1">
        <span className="mr-1 font-bold text-orange-700">
          [{citation.index}]
        </span>
        {citation.companyName}｜{citation.title}
        {citation.pageNumber !== null && (
          <>
            ｜
            {t("business_monitor.ai_section.page_number", {
              page: citation.pageNumber,
            })}
          </>
        )}
      </p>
      <div className="flex shrink-0 items-center gap-3">
        {citation.sourceUrl && (
          <a
            href={citation.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 font-bold text-blue-500 underline underline-offset-2 hover:text-blue-700"
          >
            {t("business_monitor.ai_section.official_source")}
            <ExternalLink size={12} className="shrink-0" />
          </a>
        )}
        <button
          type="button"
          onClick={handleDownload}
          disabled={isDownloading}
          className="font-bold text-blue-500 underline underline-offset-2 transition-colors hover:text-blue-700 focus:outline-none disabled:cursor-not-allowed disabled:text-slate-400"
        >
          {isDownloading
            ? t("business_monitor.reports.item.downloading")
            : t("business_monitor.detail.download_report")}
        </button>
      </div>
    </li>
  );
};

const AiResponseCard: FC<IAiResponseCardProps> = ({
  aiResponse,
  onShowToast,
}) => {
  const { t } = useTranslation();

  // Info: (20261022 - Luphia) 回答裡標了編號的排在前面；其餘是有送給 AI 讀、但回答沒引用的段落
  const cited = aiResponse.citations.filter((c) => c.cited);
  const uncited = aiResponse.citations.filter((c) => !c.cited);

  if (aiResponse.citations.length === 0) return null;

  return (
    <div className="mt-2 flex flex-col gap-3 border-t border-orange-100 pt-3">
      {cited.length > 0 && (
        <div>
          <p className="text-xs font-bold text-orange-800">
            {t("business_monitor.ai_section.data_sources")}
          </p>
          <ul className="mt-1 flex flex-col gap-2">
            {cited.map((citation) => (
              <CitationRow
                key={citation.index}
                citation={citation}
                onShowToast={onShowToast}
              />
            ))}
          </ul>
        </div>
      )}
      {uncited.length > 0 && (
        <div>
          <p className="text-xs font-bold text-slate-500">
            {t("business_monitor.ai_section.other_references")}
          </p>
          <ul className="mt-1 flex flex-col gap-2">
            {uncited.map((citation) => (
              <CitationRow
                key={citation.index}
                citation={citation}
                onShowToast={onShowToast}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AiResponseCard;
