"use client";

import {
  Loader2,
  CircleAlert,
  CheckCircle2,
  FileQuestion,
  Trash2,
  Undo2,
} from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { FilePreview } from "@/components/common/file_preview";
import AiConfidence from "@/components/common/ai_confidence";
import { IJournal } from "@/interfaces/journal";
import { AIAnalysisStatus } from "@/constants/ai_analysis_status";
import { timestampToString } from "@/lib/utils/common";

const JournalListItem = ({
  journal,
  onSelect,
  onDelete,
  onRestore,
}: {
  journal: IJournal;
  onSelect: (j: IJournal) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
}) => {
  const { t } = useTranslation();

  const formattedDate = timestampToString(
    journal.tradingTimestamp,
  ).dateWithDash;
  const formattedID = (
    <span className="inline-block w-[100px] overflow-hidden align-bottom text-ellipsis whitespace-nowrap">
      {journal.id}
    </span>
  );

  const mobileActionBtn = (
    <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
      {journal.isDeleted ? (
        <button
          title={t("common.restore")}
          onClick={() => onRestore(journal.id)}
          className="rounded-full bg-slate-50 p-2.5 text-slate-500 transition-colors hover:bg-emerald-100 hover:text-emerald-600"
        >
          <Undo2 size={20} />
        </button>
      ) : (
        <button
          title={t("common.delete")}
          onClick={() => onDelete(journal.id)}
          className="rounded-full bg-red-100 p-2.5 text-red-600"
        >
          <Trash2 size={20} />
        </button>
      )}
    </div>
  );

  const desktopActionsTd = (
    <td
      aria-label="Actions"
      className="hidden p-2 text-center align-middle md:table-cell lg:px-4 lg:py-4"
      onClick={(e) => e.stopPropagation()}
    >
      {journal.isDeleted ? (
        <button
          title={t("common.restore")}
          onClick={() => onRestore(journal.id)}
          className="rounded-full p-2 text-slate-400 transition-colors hover:bg-emerald-100 hover:text-emerald-500"
        >
          <Undo2 size={20} />
        </button>
      ) : (
        <button
          title={t("common.delete")}
          onClick={() => onDelete(journal.id)}
          className="rounded-full p-2 text-slate-400 transition-colors hover:bg-red-100 hover:text-red-500"
        >
          <Trash2 size={20} />
        </button>
      )}
    </td>
  );

  const mobileInfoRows = (
    <>
      <div className="h-px w-full bg-slate-100" />
      <div className="flex flex-col gap-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-500">{t("ocr.created_date")}：</span>
          <span className="font-medium text-slate-700">{formattedDate}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">{t("ocr.id")}：</span>
          <span className="font-medium text-slate-700">
            <span className="inline-block max-w-[150px] truncate align-bottom">
              {journal.id}
            </span>
          </span>
        </div>
      </div>
      <div className="h-px w-full bg-slate-100" />
    </>
  );

  // Info: (20260320 - Julian) 尚未開始
  if (journal.analysisStatus === AIAnalysisStatus.PENDING) {
    return (
      <tr
        className={`block border-b-4 border-double last:border-0 md:table-row md:border-b md:border-solid ${journal.isDeleted ? "border-slate-700 bg-slate-50 text-slate-500 opacity-50" : "border-slate-500 bg-white text-slate-400 md:border-slate-300"}`}
      >
        {/* Info: (20260601 - Julian) 手機版 */}
        <td className="block w-full p-4 md:hidden">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50">
                {journal.isDeleted ? (
                  <Trash2 className="size-6 text-slate-400" />
                ) : (
                  <Loader2 className="size-6 animate-spin text-orange-400" />
                )}
              </div>
              <div className="flex-1">
                {journal.isDeleted ? (
                  <span className="flex items-center gap-2 text-sm font-bold text-slate-500">
                    <Trash2 size={16} />
                    {t("common.status_deleted")}
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-sm text-slate-500 italic">
                    <Loader2 className="size-4 shrink-0 animate-spin text-orange-400" />
                    {t("common.ai.pending")}
                  </span>
                )}
              </div>
            </div>
            {mobileInfoRows}
            <div className="ml-auto">{mobileActionBtn}</div>
          </div>
        </td>
        {/* Info: (20260601 - Julian) 電腦版 */}
        <td className="hidden px-4 py-3 align-middle md:table-cell lg:px-6">
          <div className="flex size-16 items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50">
            {journal.isDeleted ? (
              <Trash2 className="size-6 text-slate-400" />
            ) : (
              <Loader2 className="size-6 animate-spin text-orange-400" />
            )}
          </div>
        </td>
        <td className="hidden px-4 py-3 align-middle text-sm font-medium whitespace-nowrap md:table-cell lg:px-6">
          {formattedDate}
        </td>
        <td className="hidden px-4 py-3 align-middle text-sm font-medium whitespace-nowrap md:table-cell lg:px-6">
          {formattedID}
        </td>
        <td
          colSpan={2}
          className="hidden px-4 py-3 text-center align-middle text-sm md:table-cell lg:px-6"
        >
          {journal.isDeleted ? (
            <span className="flex items-center justify-center gap-2 font-bold text-slate-500">
              <Trash2 size={16} />
              {t("common.status_deleted")}
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2 italic">
              <Loader2 className="size-4 shrink-0 animate-spin text-orange-400" />
              {t("common.ai.pending")}
            </span>
          )}
        </td>
        {desktopActionsTd}
      </tr>
    );
  }

  // Info: (20260320 - Julian) 處理中
  if (journal.analysisStatus === AIAnalysisStatus.PROCESSING) {
    return (
      <tr
        className={`block border-b last:border-0 md:table-row ${journal.isDeleted ? "border-slate-300 bg-slate-50 text-slate-500 opacity-50" : "border-blue-200 bg-blue-50 text-blue-500 opacity-90"}`}
      >
        {/* Info: (20260601 - Julian) 手機版 */}
        <td className="block w-full p-4 md:hidden">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-blue-300 bg-white">
                {journal.isDeleted ? (
                  <Trash2 className="size-6 text-slate-400" />
                ) : (
                  <Loader2 className="size-6 animate-spin text-blue-500" />
                )}
              </div>
              <div className="flex-1">
                {journal.isDeleted ? (
                  <span className="flex items-center gap-2 text-sm font-bold text-slate-500">
                    <Trash2 size={16} />
                    {t("common.status_deleted")}
                  </span>
                ) : (
                  <div className="flex flex-col gap-2">
                    <span className="flex items-center gap-2 text-sm font-bold italic">
                      <Loader2 className="size-4 shrink-0 animate-spin text-blue-500" />
                      {t("ocr.ai.processing")}
                    </span>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-200">
                      <div className="h-full w-2/3 animate-pulse rounded-full bg-blue-500"></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {mobileInfoRows}
            <div className="ml-auto">{mobileActionBtn}</div>
          </div>
        </td>
        {/* Info: (20260601 - Julian) 電腦版 */}
        <td className="hidden px-4 py-3 align-middle md:table-cell lg:px-6">
          <div className="flex size-16 items-center justify-center overflow-hidden rounded-lg border border-dashed border-blue-300 bg-white">
            {journal.isDeleted ? (
              <Trash2 className="size-6 text-slate-400" />
            ) : (
              <Loader2 className="size-6 shrink-0 animate-spin text-blue-500" />
            )}
          </div>
        </td>
        <td className="hidden px-4 py-3 align-middle text-sm font-medium whitespace-nowrap md:table-cell lg:px-6">
          {formattedDate}
        </td>
        <td className="hidden px-4 py-3 align-middle text-sm font-medium whitespace-nowrap md:table-cell lg:px-6">
          {formattedID}
        </td>
        <td
          aria-label="AI Processing"
          colSpan={2}
          className="hidden px-4 py-3 text-center align-middle text-sm md:table-cell lg:px-6"
        >
          {journal.isDeleted ? (
            <span className="flex items-center justify-center gap-2 font-bold text-slate-500">
              <Trash2 size={16} />
              {t("common.status_deleted")}
            </span>
          ) : (
            <div className="mx-auto flex max-w-sm flex-col gap-2">
              <span className="mb-2 flex items-center justify-center gap-2 font-bold italic">
                <Loader2 className="size-4 shrink-0 animate-spin text-blue-500" />
                {t("ocr.ai.processing")}
              </span>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-200">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-blue-500"></div>
              </div>
            </div>
          )}
        </td>
        {desktopActionsTd}
      </tr>
    );
  }

  // Info: (20260320 - Julian) 分析出錯
  if (journal.analysisStatus === AIAnalysisStatus.FAILED) {
    const failedMessage =
      journal.aiNote && journal.aiNote.trim().length > 0
        ? journal.aiNote
        : (t("ocr.ai.failed") as string);

    return (
      <tr
        onClick={!journal.isDeleted ? () => onSelect(journal) : undefined}
        className={`block border-b transition-colors last:border-0 md:table-row ${journal.isDeleted ? "border-slate-300 bg-slate-50 text-slate-500 opacity-50" : "cursor-pointer border-red-200 bg-red-50 text-red-500 opacity-90 hover:bg-red-100"}`}
      >
        {/* Info: (20260601 - Julian) 手機版 */}
        <td className="block w-full p-4 md:hidden">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-red-300 bg-white">
                {journal.isDeleted ? (
                  <Trash2 className="size-6 text-slate-400" />
                ) : (
                  <CircleAlert size={24} className="text-red-500" />
                )}
              </div>
              <div className="flex-1">
                {journal.isDeleted ? (
                  <span className="flex items-center gap-2 text-sm font-bold text-slate-500">
                    <Trash2 size={16} />
                    {t("common.status_deleted")}
                  </span>
                ) : (
                  <p
                    className="line-clamp-2 text-sm font-bold text-red-500"
                    title={failedMessage}
                  >
                    {failedMessage}
                  </p>
                )}
              </div>
            </div>
            {mobileInfoRows}
            <div className="ml-auto">{mobileActionBtn}</div>
          </div>
        </td>
        {/* Info: (20260601 - Julian) 電腦版 */}
        <td className="hidden px-4 py-3 align-middle md:table-cell lg:px-6">
          <div className="flex size-16 items-center justify-center overflow-hidden rounded-lg border border-dashed border-red-300 bg-white">
            {journal.isDeleted ? (
              <Trash2 className="size-6 text-slate-400" />
            ) : (
              <CircleAlert size={24} className="text-red-500" />
            )}
          </div>
        </td>
        <td className="hidden px-4 py-3 align-middle text-sm font-medium whitespace-nowrap md:table-cell lg:px-6">
          {formattedDate}
        </td>
        <td className="hidden px-4 py-3 align-middle text-sm font-medium whitespace-nowrap md:table-cell lg:px-6">
          {formattedID}
        </td>
        <td
          aria-label="AI Failed"
          colSpan={2}
          className="hidden px-4 py-3 text-center align-middle text-sm md:table-cell lg:px-6"
        >
          {journal.isDeleted ? (
            <span className="flex items-center justify-center gap-2 font-bold text-slate-500">
              <Trash2 size={16} />
              {t("common.status_deleted")}
            </span>
          ) : (
            <p
              className="mx-auto max-w-sm truncate font-bold text-red-500"
              title={failedMessage}
            >
              {failedMessage}
            </p>
          )}
        </td>
        {desktopActionsTd}
      </tr>
    );
  }

  return (
    <tr
      className={`block border-b-4 border-double border-slate-500 transition-colors last:border-0 md:table-row md:border-b md:border-solid md:border-slate-300 ${journal.isDeleted ? "bg-slate-50 opacity-50" : "cursor-pointer bg-white hover:bg-orange-50"}`}
      onClick={!journal.isDeleted ? () => onSelect(journal) : undefined}
    >
      {/* Info: (20260601 - Julian) 手機版 */}
      <td className="block w-full p-4 md:hidden">
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
              {journal.file?.hash ? (
                <FilePreview
                  file={{ filename: journal.file.fileName || "Unknown" }}
                  fileId={journal.file.hash}
                  className="size-full object-cover"
                />
              ) : (
                <span className="text-[10px] text-gray-400">
                  {t("ocr.no_image")}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <pre className="line-clamp-3 font-sans text-sm whitespace-pre-wrap text-slate-700">
                {journal.text || (
                  <span className="text-slate-400 italic">
                    {t("common.empty")}
                  </span>
                )}
              </pre>
            </div>
          </div>

          {mobileInfoRows}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">
                {t("ocr.status")}：
              </span>
              <div className="flex items-center gap-1.5">
                {journal.isDeleted ? (
                  <span className="flex items-center gap-1 text-sm font-bold text-slate-500">
                    <Trash2 size={16} /> {t("common.status_deleted")}
                  </span>
                ) : journal.isVerified ? (
                  <span className="flex items-center gap-1 text-sm font-bold text-emerald-500">
                    <CheckCircle2 size={16} /> {t("verify.status.verified")}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-sm font-bold text-orange-500">
                    <FileQuestion size={16} /> {t("verify.status.unverified")}
                  </span>
                )}
                {!journal.isDeleted && (
                  <span className="text-xs text-slate-400">
                    ({t("ocr.confidence")} {journal.confidence}%)
                  </span>
                )}
              </div>
            </div>
            {mobileActionBtn}
          </div>
        </div>
      </td>

      {/* Info: (20260601 - Julian) 電腦版 */}
      <td className="hidden px-4 py-3 align-middle text-slate-700 md:table-cell lg:px-6">
        <div className="relative mx-auto flex size-16 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50 sm:mx-0">
          {journal.file?.hash ? (
            <FilePreview
              file={{ filename: journal.file.fileName || "Unknown" }}
              fileId={journal.file.hash}
              className="size-full object-cover"
            />
          ) : (
            <span className="text-xs text-gray-400">{t("ocr.no_image")}</span>
          )}
        </div>
      </td>
      <td className="hidden px-4 py-3 align-middle text-sm font-medium whitespace-nowrap text-slate-700 md:table-cell lg:px-6">
        {formattedDate}
      </td>
      <td
        aria-label={t("ocr.id")}
        className="hidden px-4 py-3 align-middle text-sm font-medium whitespace-nowrap text-slate-700 md:table-cell lg:px-6"
      >
        {formattedID}
      </td>
      <td className="hidden px-4 py-3 align-middle text-sm text-slate-700 md:table-cell lg:px-6">
        <pre className="line-clamp-2 font-sans whitespace-normal">
          {journal.text}
        </pre>
      </td>
      <td
        aria-label={`${t("ocr.status")} / ${t("ocr.confidence")}`}
        className="hidden px-4 py-3 text-center align-middle md:table-cell lg:px-6"
      >
        <div className="flex flex-col items-center gap-2">
          {journal.isDeleted ? (
            <div className="mx-auto flex flex-col items-center justify-center gap-1 text-slate-400">
              <Trash2 size={24} />
              <span className="text-xs font-bold whitespace-nowrap">
                {t("common.status_deleted")}
              </span>
            </div>
          ) : journal.isVerified ? (
            <div className="mx-auto flex flex-col items-center justify-center gap-1 text-emerald-500">
              <CheckCircle2 size={24} />
              <span className="text-xs font-bold whitespace-nowrap">
                {t("verify.status.verified")}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-1.5 text-orange-500">
              <FileQuestion size={24} />
              <span className="text-xs font-bold whitespace-nowrap">
                {t("verify.status.unverified")}
              </span>
            </div>
          )}
          <AiConfidence confidence={journal.confidence} barOnly />
        </div>
      </td>
      {desktopActionsTd}
    </tr>
  );
};

const JournalListLayout = ({
  isLoading,
  journals,
  onSelect,
  onDelete,
  onRestore,
}: {
  isLoading: boolean;
  journals: IJournal[];
  onSelect: (journal: IJournal) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
}) => {
  const { t } = useTranslation();

  const loadingView = (
    <tr>
      <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
        <Loader2 className="mx-auto h-6 w-6 shrink-0 animate-spin text-orange-500" />
      </td>
    </tr>
  );

  const emptyView = (
    <tr>
      <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
        {t("ocr.no_records")}
      </td>
    </tr>
  );

  const listLayout = journals.map((journal) => (
    <JournalListItem
      key={journal.id}
      journal={journal}
      onSelect={onSelect}
      onDelete={onDelete}
      onRestore={onRestore}
    />
  ));

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm md:overflow-x-auto">
      <table className="w-full">
        <tbody>
          <tr className="hidden border-b border-slate-200 md:table-row">
            <th className="w-[120px] bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-700 lg:w-[150px] lg:px-6">
              {t("ocr.file")}
            </th>
            <th className="w-[100px] bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-700 lg:w-auto lg:px-6">
              {t("ocr.created_date")}
            </th>
            <th className="bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-700 lg:px-6">
              {t("ocr.id")}
            </th>
            <th className="bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-700 lg:px-6">
              {t("ocr.journal")}
            </th>
            <th className="bg-slate-50 px-4 py-3 text-center text-sm font-semibold text-slate-700 lg:px-6">
              {`${t("ocr.status")} / ${t("ocr.confidence")}`}
            </th>
            <th className="bg-slate-50 px-4 py-3 text-center text-sm font-semibold text-slate-700 lg:px-6">
              {t("common.actions")}
            </th>
          </tr>
          {isLoading
            ? loadingView
            : journals.length === 0
              ? emptyView
              : listLayout}
        </tbody>
      </table>
    </div>
  );
};

export default JournalListLayout;
