import { useState, useCallback } from "react";
import { IReportDownloadTask } from "@/interfaces/business_monitor";
import { API_ERRORS } from "@/lib/utils/error_dictionary";

/**
 * Info: (20261022 - Luphia) 下載報告原始檔。
 *
 * 原本連到 /download 的 SSE，那支 API 回的是隨機產生的假進度，完成後再由各元件
 * 產生一份假的 .txt——使用者以為下載了報告，拿到的卻是一行 "Mock Report Content"。
 * 改為直接讀 `/reports/{id}/file` 的回應串流：進度以 Content-Length 計算，完成後存檔。
 */
export const DOWNLOAD_FAILURE = {
  // Info: (20261022 - Luphia) 報告在清單裡，但原始檔還沒下載完成（觀測站排程中）
  FILE_NOT_READY: "FILE_NOT_READY",
  FAILED: "FAILED",
} as const;

export type DownloadFailure =
  (typeof DOWNLOAD_FAILURE)[keyof typeof DOWNLOAD_FAILURE];

// Info: (20261022 - Luphia) 從 filename*=UTF-8''... 取出伺服器給的中文檔名；沒有就用後備名稱
function fileNameFromDisposition(header: string | null, fallback: string) {
  const match = header?.match(/filename\*=UTF-8''([^;]+)/i);
  if (!match) return fallback;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return fallback;
  }
}

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const reportFileUrl = (reportId: string | number) =>
  `/api/v1/business_monitor/reports/${reportId}/file`;

export const useReportDownload = () => {
  const [downloadTask, setDownloadTask] = useState<IReportDownloadTask | null>(
    null,
  );

  const startDownload = useCallback(
    async (
      reportId: string | number,
      onSuccess?: () => void,
      onError?: (reason: DownloadFailure) => void,
    ) => {
      const task: IReportDownloadTask = {
        reportId,
        companyName: "",
        reportTitle: "",
        fileSizeBytes: 0,
        downloadedBytes: 0,
        progress: 0,
        status: "downloading",
      };
      setDownloadTask(task);

      const fail = (reason: DownloadFailure) => {
        setDownloadTask((prev) => (prev ? { ...prev, status: "error" } : null));
        if (onError) onError(reason);
      };

      try {
        const response = await fetch(reportFileUrl(reportId));
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            errorCode?: unknown;
          } | null;
          fail(
            body?.errorCode === API_ERRORS.NF_BUSINESS_MONITOR_REPORT_FILE.code
              ? DOWNLOAD_FAILURE.FILE_NOT_READY
              : DOWNLOAD_FAILURE.FAILED,
          );
          return;
        }

        const totalBytes = Number(response.headers.get("Content-Length")) || 0;
        const fileName = fileNameFromDisposition(
          response.headers.get("Content-Disposition"),
          `report-${reportId}`,
        );
        const contentType =
          response.headers.get("Content-Type") ?? "application/octet-stream";

        const chunks: Uint8Array[] = [];
        let downloadedBytes = 0;
        const reader = response.body?.getReader();
        if (reader) {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            downloadedBytes += value.length;
            setDownloadTask({
              ...task,
              fileSizeBytes: totalBytes,
              downloadedBytes,
              progress: totalBytes
                ? Math.floor((downloadedBytes / totalBytes) * 100)
                : 0,
            });
          }
        } else {
          const buffer = new Uint8Array(await response.arrayBuffer());
          chunks.push(buffer);
          downloadedBytes = buffer.length;
        }

        saveBlob(
          new Blob(chunks as BlobPart[], { type: contentType }),
          fileName,
        );
        setDownloadTask({
          ...task,
          fileSizeBytes: totalBytes || downloadedBytes,
          downloadedBytes,
          progress: 100,
          status: "completed",
        });
        if (onSuccess) onSuccess();
      } catch (err) {
        console.error("Failed to download report file", err);
        fail(DOWNLOAD_FAILURE.FAILED);
      }
    },
    [],
  );

  const resetDownload = useCallback(() => {
    setDownloadTask(null);
  }, []);

  return { downloadTask, startDownload, resetDownload };
};
