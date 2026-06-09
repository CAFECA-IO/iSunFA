import { useState, useCallback } from "react";
import { IReportDownloadTask } from "@/interfaces/business_monitor";

export const useReportDownload = () => {
  const [downloadTask, setDownloadTask] = useState<IReportDownloadTask | null>(
    null,
  );

  const startDownload = useCallback(
    (
      reportId: string | number,
      onSuccess?: () => void,
      onError?: () => void,
    ) => {
      setDownloadTask({
        reportId,
        companyName: "",
        reportTitle: "",
        fileSizeBytes: 0,
        downloadedBytes: 0,
        progress: 0,
        status: "downloading",
      });

      const eventSource = new EventSource(
        `/api/v1/mock/download?reportId=${reportId}`,
      );

      eventSource.onmessage = (event) => {
        try {
          const data: IReportDownloadTask = JSON.parse(event.data);
          setDownloadTask(data);

          if (data.status === "completed") {
            eventSource.close();
            if (onSuccess) onSuccess();
          } else if (data.status === "error") {
            eventSource.close();
            if (onError) onError();
          }
        } catch (err) {
          console.error("Failed to parse SSE data", err);
          setDownloadTask((prev) =>
            prev ? { ...prev, status: "error" } : null,
          );
          eventSource.close();
          if (onError) onError();
        }
      };

      eventSource.onerror = () => {
        setDownloadTask((prev) => (prev ? { ...prev, status: "error" } : null));
        eventSource.close();
        if (onError) onError();
      };
    },
    [],
  );

  const resetDownload = useCallback(() => {
    setDownloadTask(null);
  }, []);

  return { downloadTask, startDownload, resetDownload };
};
