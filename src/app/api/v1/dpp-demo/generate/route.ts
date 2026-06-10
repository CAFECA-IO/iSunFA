import { NextRequest, NextResponse } from "next/server";
import { exec, spawn } from "child_process";
import util from "util";
import { GenerateDppDemoSchema } from "@/validators/dpp_demo.validator";
import { reportDownloadTaskRepo } from "@/repositories/report_download_task.repo";
import { TaskType, TaskStatus } from "@/generated";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const execPromise = util.promisify(exec);

// Info: (20260609 - Tzuhan) 定義 SSE 事件介面
interface ISseEvent {
  type:
    | "step_start"
    | "log"
    | "preview"
    | "extrapolation_alert"
    | "complete"
    | "error"
    | "fin_complete"
    | "esg_complete";
  stepIndex?: number;
  message?: string;
  file?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const parsed = GenerateDppDemoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.format() },
        { status: 400 },
      );
    }

    const { stockId, year, productCount, mode } = parsed.data;

    // Info: (20260609 - Tzuhan) 建立 SSE 資料流
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        const sendEvent = (data: ISseEvent) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
          );
        };

        const runScript = async (
          command: string,
          args: string[],
          captureOutput = false,
        ) => {
          return new Promise<{ stdout: string }>((resolve, reject) => {
            const child = spawn(command, args);
            let stdoutFull = "";

            child.stdout.on("data", (data: Buffer) => {
              const lines = data.toString().split("\n");
              for (const line of lines) {
                if (line.trim()) {
                  if (captureOutput) stdoutFull += line + "\n";
                  sendEvent({ type: "log", message: line.trim() });
                }
              }
            });

            child.stderr.on("data", (data: Buffer) => {
              const lines = data.toString().split("\n");
              for (const line of lines) {
                if (line.trim()) {
                  sendEvent({ type: "log", message: `[ERR] ${line.trim()}` });
                }
              }
            });

            child.on("close", (code: number) => {
              if (code === 0) {
                resolve({ stdout: stdoutFull });
              } else {
                reject(new Error(`Process exited with code ${code}`));
              }
            });
          });
        };

        try {
          if (mode === "all" || mode === "download_only") {
            // Info: (20260609 - Tzuhan) 步驟一與二：財務與 ESG 永續報告下載 (非同步監聽)
            sendEvent({ type: "step_start", stepIndex: 0 }); // Info: (20260609 - Tzuhan) fin_download
            sendEvent({ type: "step_start", stepIndex: 1 }); // Info: (20260609 - Tzuhan) esg_download

            sendEvent({
              type: "log",
              message: `Executing auto_download.ts for ${stockId} (${year}) in background...`,
            });

            // Info: (20260609 - Tzuhan) 非同步啟動下載腳本，不使用 await 阻擋 Event Loop，並設定 resurrect=0 避免失敗時腳本進入 10 分鐘睡眠而卡死 API
            const downloadPromise = execPromise(
              `npx tsx scripts/auto_download.ts --stockId=${stockId} --year=${year} --resurrect=0`,
            );

            let finCompleted = false;
            let esgCompleted = false;

            // Info: (20260609 - Tzuhan) 開始輪詢資料庫 (Enterprise-grade Status Polling)
            while (!finCompleted || !esgCompleted) {
              const tasks = await reportDownloadTaskRepo.findMany({
                where: {
                  stockId,
                  year: parseInt(year),
                  taskType: { in: [TaskType.FIN_REPORT, TaskType.ESG_REPORT] },
                },
              });

              const finTask = tasks.find(
                (t) => t.taskType === TaskType.FIN_REPORT,
              );
              const esgTask = tasks.find(
                (t) => t.taskType === TaskType.ESG_REPORT,
              );

              if (!finCompleted && finTask?.status === TaskStatus.SUCCESS) {
                finCompleted = true;
                sendEvent({
                  type: "log",
                  message: `[FIN_REPORT] Download Success`,
                });
                sendEvent({
                  type: "fin_complete",
                  file: `data/${stockId}/${year}/inputs/raw_reports/${year}_FIN_REPORT.pdf`,
                });
              }
              if (!finCompleted && finTask?.status === TaskStatus.FAILED) {
                finCompleted = true;
                sendEvent({
                  type: "log",
                  message: `[FIN_REPORT] Download Failed (Retried Max)`,
                });
                sendEvent({ type: "fin_complete" });
              }

              if (!esgCompleted && esgTask?.status === TaskStatus.SUCCESS) {
                esgCompleted = true;
                sendEvent({
                  type: "log",
                  message: `[ESG_REPORT] Download Success`,
                });
                sendEvent({
                  type: "esg_complete",
                  file: `data/${stockId}/${year}/inputs/raw_reports/${year}_ESG_REPORT.pdf`,
                });
              }
              if (!esgCompleted && esgTask?.status === TaskStatus.FAILED) {
                esgCompleted = true;
                sendEvent({
                  type: "log",
                  message: `[ESG_REPORT] Download Failed (Retried Max)`,
                });
                sendEvent({ type: "esg_complete" });
              }

              // Keep connection alive with heartbeat
              sendEvent({
                type: "log",
                message: `Waiting for download tasks...`,
              });
              await new Promise((resolve) => setTimeout(resolve, 2000));
            }

            // Info: (20260609 - Tzuhan) 等待腳本內的其他微小任務 (fin_data, esg_metrics) 收尾
            await downloadPromise;

            // Info: (20260609 - Tzuhan) 傳送 PDF 預覽路徑，讓右側視窗在執行後續腳本時可以先預覽
            const pdfPath = `data/${stockId}/${year}/mock_sources/${stockId}_sustainability_report.pdf`;
            sendEvent({ type: "preview", file: pdfPath });
          }

          if (
            mode === "all" ||
            mode === "generate_only" ||
            mode === "extrapolate_only" ||
            mode === "persona_only"
          ) {
            // If we skipped download, we might still want to signal that download is done so the UI can proceed if it was waiting
            if (mode !== "all") {
              sendEvent({
                type: "fin_complete",
                file: `data/${stockId}/${year}/inputs/raw_reports/${year}_FIN_REPORT.pdf`,
              });
              sendEvent({
                type: "esg_complete",
                file: `data/${stockId}/${year}/inputs/raw_reports/${year}_ESG_REPORT.pdf`,
              });
              sendEvent({
                type: "preview",
                file: `data/${stockId}/${year}/inputs/raw_reports/${year}_ESG_REPORT.pdf`,
              });
            }

            if (
              mode === "all" ||
              mode === "generate_only" ||
              mode === "extrapolate_only"
            ) {
              // Info: (20260609 - Tzuhan) 步驟三：AI 視覺圖表萃取
              sendEvent({ type: "step_start", stepIndex: 2 });
              sendEvent({
                type: "log",
                message: `Executing ai_vision_extractor.ts...`,
              });
              const { stdout: visionStdout } = await runScript(
                "npx",
                [
                  "tsx",
                  "src/scripts/e2e-seeder/ai_vision_extractor.ts",
                  stockId,
                  year,
                ],
                true,
              );

              if (
                visionStdout.includes("[WARN] 確定取得") ||
                visionStdout.includes("準備啟動歷史回溯")
              ) {
                sendEvent({ type: "extrapolation_alert" });
              }
            }

            if (
              mode === "all" ||
              mode === "generate_only" ||
              mode === "persona_only"
            ) {
              // Info: (20260609 - Tzuhan) 步驟四：企業畫像建構
              sendEvent({ type: "step_start", stepIndex: 3 });
              sendEvent({
                type: "log",
                message: `Executing persona_generator.ts...`,
              });
              await runScript("npx", [
                "tsx",
                "src/scripts/e2e-seeder/persona_generator.ts",
                stockId,
                year,
                `--products=${productCount}`,
              ]);

              sendEvent({ type: "log", message: `Rendering HTML persona...` });
              await runScript("npx", [
                "tsx",
                "src/scripts/e2e-seeder/render_persona_html.ts",
                stockId,
                year,
              ]);
            }
          }

          if (
            mode === "all" ||
            mode === "generate_only" ||
            mode === "persona_only"
          ) {
            // Info: (20260609 - Tzuhan) 完成流程並回傳檔案路徑 (Day 1 Scope 結束)
            const mockFilePath = `data/${stockId}/${year}/outputs/${stockId}_company_persona.html`;
            sendEvent({ type: "complete", file: mockFilePath });
          } else if (mode === "extrapolate_only") {
            sendEvent({
              type: "log",
              message:
                "Extrapolation and vision extraction completed successfully.",
            });
            sendEvent({ type: "complete" }); // no file attached for extrapolate_only, it relies on next step
          } else {
            // For download_only, we just finish successfully
            sendEvent({
              type: "log",
              message: "Downloads completed successfully.",
            });
            sendEvent({ type: "complete" }); // no file attached for download_only
          }
        } catch (err: unknown) {
          // Info: (20260609 - Tzuhan) 攔截執行錯誤
          let errorMessage = "Execution failed";
          if (err instanceof Error) {
            errorMessage = err.message;
          }
          console.error("Script execution failed:", err);
          sendEvent({ type: "error", message: errorMessage });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err: unknown) {
    // Info: (20260609 - Tzuhan) JSON 解析失敗或例外錯誤
    let message = "Internal Server Error";
    if (err instanceof Error) {
      message = err.message;
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
