import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
import {
  IReportDownloadTask,
  DownloadStatus,
} from "@/interfaces/business_monitor";

/*
 ** Info:(20260609 - Julian) 用於開發 Business Monitor 的 Mock API，之後會移除
 ** GET /api/v1/mock/download?reportId={reportId}
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const reportId = searchParams.get("reportId") || "unknown";

  // Info:(20260609 - Julian) 模擬 10MB ~ 30MB 的檔案大小
  const totalBytes = Math.floor(Math.random() * 20 + 10) * 1024 * 1024;
  let downloadedBytes = 0;
  let status: DownloadStatus = "downloading";

  const stream = new ReadableStream({
    async start(controller) {
      // Info:(20260609 - Julian) 模擬 500ms 發送一次資料
      const interval = setInterval(() => {
        // Info:(20260609 - Julian) 模擬每個 chunk 介於 1MB ~ 3MB 之間
        const chunk = Math.floor(Math.random() * 2 + 1) * 1024 * 1024;
        downloadedBytes += chunk;

        if (downloadedBytes >= totalBytes) {
          downloadedBytes = totalBytes;
          status = "completed";
        }

        const progress = Math.floor((downloadedBytes / totalBytes) * 100);

        // Info:(20260609 - Julian) mock report data
        const data: IReportDownloadTask = {
          reportId,
          companyName: "Mock Company Ltd.",
          reportTitle: "2024 年永續報告書",
          fileSizeBytes: totalBytes,
          downloadedBytes,
          progress,
          status,
        };

        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`),
        );

        if (status === "completed") {
          clearInterval(interval);
          controller.close();
        }
      }, 500);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
