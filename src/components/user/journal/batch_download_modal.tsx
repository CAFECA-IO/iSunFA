"use client";

import { Fragment, useState } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { X, Download } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import { IJournal } from "@/interfaces/journal";
import { downloadFile } from "@/lib/file_operator";
import JSZip from "jszip";

interface IBatchDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountBookId: string;
}

export default function BatchDownloadModal({
  isOpen,
  onClose,
  accountBookId,
}: IBatchDownloadModalProps) {
  const { t } = useTranslation();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");

  const handleDownload = async () => {
    if (!startDate || !endDate) return;
    setIsDownloading(true);
    setProgressMsg(t("common.loading"));

    try {
      let currentPage = 1;
      const pageSize = 100;
      let allJournals: IJournal[] = [];

      while (true) {
        const params = new URLSearchParams();
        if (startDate) {
          const [y, m, d] = startDate.split("-").map(Number);
          const start = new Date(y, m - 1, d, 0, 0, 0, 0);
          params.append("startDate", start.toISOString());
        }
        if (endDate) {
          const [y, m, d] = endDate.split("-").map(Number);
          const end = new Date(y, m - 1, d, 23, 59, 59, 999);
          params.append("endDate", end.toISOString());
        }

        params.append("page", currentPage.toString());
        params.append("pageSize", pageSize.toString());

        const data = await request<
          IApiResponse<{ data: IJournal[]; total: number }>
        >(
          `/api/v1/user/account_book/${accountBookId}/journal?${params.toString()}`,
        );

        if (data?.payload?.data && data.payload.data.length > 0) {
          allJournals = allJournals.concat(data.payload.data);
          if (data.payload.data.length < pageSize) {
            break;
          }
        } else {
          break;
        }
        currentPage++;
      }

      const journalsWithFiles = allJournals.filter((j) => !!j.file?.hash);

      if (journalsWithFiles.length === 0) {
        alert(t("common.no_data"));
        setIsDownloading(false);
        return;
      }

      setProgressMsg(
        `${t("common.downloading")} (0/${journalsWithFiles.length})`,
      );
      const zip = new JSZip();

      const downloadFileAsync = (
        hash: string,
      ): Promise<{ blob: Blob; filename?: string }> => {
        return new Promise((resolve, reject) => {
          downloadFile(hash, {
            onSuccess: (blob, filename) => resolve({ blob, filename }),
            onError: (err) => reject(new Error(err)),
          });
        });
      };

      const nameCounts: Record<string, number> = {};
      let count = 0;

      for (const j of journalsWithFiles) {
        if (!j.file?.hash) continue;
        try {
          const { blob, filename } = await downloadFileAsync(j.file.hash);
          let finalName = j.file.fileName || filename || `journal_${j.id}`;

          if (nameCounts[finalName]) {
            const extIdx = finalName.lastIndexOf(".");
            const nameCount = nameCounts[finalName];
            if (extIdx > -1) {
              finalName = `${finalName.substring(0, extIdx)}_${nameCount}${finalName.substring(extIdx)}`;
            } else {
              finalName = `${finalName}_${nameCount}`;
            }
            nameCounts[finalName] = nameCount + 1;
          } else {
            nameCounts[finalName] = 1;
          }

          zip.file(finalName, blob);
        } catch (err) {
          console.error(`Failed to download file for journal ${j.id}:`, err);
        }
        count++;
        setProgressMsg(
          `${t("common.downloading")} (${count}/${journalsWithFiles.length})`,
        );
      }

      setProgressMsg(t("common.zipping"));
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `journals_${startDate}_${endDate}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      onClose();
    } catch (error) {
      console.error("Batch download failed:", error);
      alert(t("common.error.download_failed"));
    } finally {
      setIsDownloading(false);
      setProgressMsg("");
    }
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-200" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" />
        </TransitionChild>

        <div className="fixed inset-0 z-201 w-screen overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <DialogPanel className="relative w-full max-w-md transform overflow-hidden rounded-xl bg-white text-left shadow-xl transition-all sm:my-8">
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                  <DialogTitle
                    as="h3"
                    className="text-lg font-bold text-slate-800"
                  >
                    {t("common.batch_download")}
                  </DialogTitle>
                  <button
                    type="button"
                    className="rounded-full p-2 text-slate-400 transition-colors outline-none hover:bg-slate-100 hover:text-slate-600"
                    onClick={onClose}
                    disabled={isDownloading}
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="px-6 py-6">
                  <div className="mb-4">
                    <label
                      htmlFor="start-date"
                      className="mb-1 block text-sm font-medium text-slate-700"
                    >
                      {t("common.start_date")}
                    </label>
                    <input
                      id="start-date"
                      type="date"
                      value={startDate}
                      aria-label="common.start_date"
                      onChange={(e) => setStartDate(e.target.value)}
                      disabled={isDownloading}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-gray-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>
                  <div className="mb-6">
                    <label
                      htmlFor="end-date"
                      className="mb-1 block text-sm font-medium text-slate-700"
                    >
                      {t("common.end_date")}
                    </label>
                    <input
                      id="end-date"
                      type="date"
                      value={endDate}
                      aria-label="common.end_date"
                      onChange={(e) => setEndDate(e.target.value)}
                      disabled={isDownloading}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-gray-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={isDownloading}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {t("common.cancel")}
                    </button>
                    <button
                      type="button"
                      onClick={handleDownload}
                      disabled={!startDate || !endDate || isDownloading}
                      className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
                    >
                      {isDownloading ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span>{progressMsg}</span>
                        </>
                      ) : (
                        <>
                          <Download size={16} />
                          <span>{t("common.download")}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
