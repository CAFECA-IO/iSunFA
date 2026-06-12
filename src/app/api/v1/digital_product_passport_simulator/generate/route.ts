import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { GenerateDppSchema } from "@/validators/dpp.validator";
import { reportDownloadTaskRepo } from "@/repositories/report_download_task.repo";
import { TaskType, TaskStatus } from "@/generated";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

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
    const parsed = GenerateDppSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.format() },
        { status: 400 },
      );
    }

    const { stockId, year, productCount, mode } = parsed.data;
    let { productId } = parsed.data;

    // Info: (20260609 - Tzuhan) 建立 SSE 資料流
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        const sendEvent = (data: ISseEvent) => {
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
            );
          } catch (e) {
            // Info: (20260610 - Tzuhan) Ignore if controller is already closed (client disconnected)
            console.warn("Failed to send event, stream might be closed:", e);
          }
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

            let downloadError: Error | null = null;
            const downloadPromise = runScript("npx", [
              "tsx",
              "scripts/auto_download.ts",
              `--stockId=${stockId}`,
              `--year=${year}`,
              "--resurrect=0",
            ]).catch((err) => {
              downloadError =
                err instanceof Error ? err : new Error(String(err));
            });

            let finCompleted = false;
            let esgCompleted = false;

            // Info: (20260609 - Tzuhan) 開始輪詢資料庫 (Enterprise-grade Status Polling)
            while (!finCompleted || !esgCompleted) {
              if (downloadError) {
                sendEvent({
                  type: "log",
                  message: `[ERR] 執行下載腳本失敗或公司不存在`,
                });
                throw new Error(
                  "下載腳本中斷。可能找不到該公司代號，請先執行同步。",
                );
              }

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

              // Info: (20260611 - Tzuhan) Keep connection alive with heartbeat
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
            // Info: (20260611 - Tzuhan) If we skipped download, we might still want to signal that download is done so the UI can proceed if it was waiting
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
                  "src/scripts/e2e_seeder/ai_vision_extractor.ts",
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
                "src/scripts/e2e_seeder/persona_generator.ts",
                stockId,
                year,
                `--products=${productCount}`,
              ]);

              sendEvent({ type: "log", message: `Rendering HTML persona...` });
              await runScript("npx", [
                "tsx",
                "src/scripts/e2e_seeder/render_persona_html.ts",
                stockId,
                year,
              ]);
            }
          }

          if (
            mode === "all" ||
            mode === "add_sku" ||
            mode === "dpp_only" ||
            mode === "dpp_catalog_only"
          ) {
            // Info: (20260610 - Tzuhan) 步驟五：BOM 與前驅物數據建構
            sendEvent({ type: "step_start", stepIndex: 4 });
            sendEvent({
              type: "log",
              message: `Executing generate_bom_precursors.ts...`,
            });
            const { stdout: bomStdout } = await runScript(
              "npx",
              [
                "tsx",
                "src/scripts/e2e_seeder/cbam/generate_bom_precursors.ts",
                stockId,
                year,
                productCount.toString(),
                mode === "add_sku" ? "add_sku" : "all",
              ],
              true,
            );

            // If mode is add_sku, try to extract the new product ID from stdout
            if (mode === "add_sku") {
              const match = bomStdout.match(/\[NEW_SKU\]\s+(P-[A-Za-z0-9-]+)/);
              if (match && match[1]) {
                productId = match[1];
                sendEvent({
                  type: "log",
                  message: `Detected new SKU: ${productId}`,
                });
              }
            }
            sendEvent({
              type: "preview",
              file: `data/${stockId}/${year}/outputs/mock_sources/boms_and_precursors.json`,
            });
          }

          const isAllProductDpp =
            mode === "all" ||
            mode === "add_sku" ||
            mode === "dpp_only" ||
            mode === "product_dpp_only";
          const productArg = productId ? `--productId=${productId}` : "";

          if (isAllProductDpp || mode === "product_specs_only") {
            // Info: (20260610 - Tzuhan) 步驟六：產品規格生成
            sendEvent({ type: "step_start", stepIndex: 5 });
            sendEvent({
              type: "log",
              message: `Executing generate_product_specs.ts...`,
            });
            await runScript("npx", [
              "tsx",
              "src/scripts/e2e_seeder/dpp/generate_product_specs.ts",
              stockId,
              year,
              ...(productArg ? [productArg] : []),
            ]);
            sendEvent({
              type: "preview",
              file: `data/${stockId}/${year}/outputs/mock_sources/product_specs.json`,
            });
          }

          if (isAllProductDpp || mode === "product_image_only") {
            // Info: (20260610 - Tzuhan) 步驟七：動態生成產品藍圖圖片 (Imagen 4)
            sendEvent({ type: "step_start", stepIndex: 6 });
            sendEvent({
              type: "log",
              message: `Executing generate_product_image.ts...`,
            });
            await runScript("npx", [
              "tsx",
              "src/scripts/e2e_seeder/dpp/generate_product_image.ts",
              stockId,
              year,
              ...(productArg ? [productArg] : []),
            ]);
          }

          if (isAllProductDpp || mode === "dpp_ground_truth_only") {
            // Info: (20260610 - Tzuhan) 步驟八：DPP 核心真實數據演算
            sendEvent({ type: "step_start", stepIndex: 7 });
            sendEvent({
              type: "log",
              message: `Executing generate_dpp_ground_truth.ts...`,
            });
            await runScript("npx", [
              "tsx",
              "src/scripts/e2e_seeder/dpp/generate_dpp_ground_truth.ts",
              stockId,
              year,
              ...(productArg ? [productArg] : []),
            ]);
          }

          if (isAllProductDpp || mode === "dpp_compliance_only") {
            // Info: (20260610 - Tzuhan) 步驟九：DPP 合規與驗證數據生成
            sendEvent({ type: "step_start", stepIndex: 8 });
            sendEvent({
              type: "log",
              message: `Executing generate_dpp_compliance.ts...`,
            });
            await runScript("npx", [
              "tsx",
              "src/scripts/e2e_seeder/dpp/generate_dpp_compliance.ts",
              stockId,
              year,
              ...(productArg ? [productArg] : []),
            ]);

            // Info: (20260610 - Tzuhan) 尋找產生出來的產品 JSON，發送預覽事件
            const outputsDir = path.join(
              process.cwd(),
              "data",
              stockId,
              year,
              "outputs",
            );
            if (fs.existsSync(outputsDir)) {
              const dirs = fs.readdirSync(outputsDir, { withFileTypes: true });
              for (const dir of dirs) {
                if (dir.isDirectory() && dir.name !== "mock_sources") {
                  sendEvent({
                    type: "preview",
                    file: `data/${stockId}/${year}/outputs/${dir.name}/mock_sources/${dir.name}_dpp_compliance_declaration.md`,
                  });
                  break; // Info: (20260610 - Tzuhan) 只預覽第一個產品
                }
              }
            }
          }

          if (
            mode === "all" ||
            mode === "generate_only" ||
            mode === "persona_only"
          ) {
            // Info: (20260609 - Tzuhan) 完成 Day 1 流程
            const mockFilePath = `data/${stockId}/${year}/outputs/${stockId}_company_persona.html`;
            if (mode !== "all") {
              sendEvent({ type: "complete", file: mockFilePath });
            }
          }

          if (mode === "extrapolate_only") {
            sendEvent({
              type: "log",
              message:
                "Extrapolation and vision extraction completed successfully.",
            });
            sendEvent({ type: "complete" }); // Info: (20260611 - Tzuhan) no file attached for extrapolate_only, it relies on next step
          } else if (mode === "download_only") {
            // Info: (20260611 - Tzuhan) For download_only, we just finish successfully
            sendEvent({
              type: "log",
              message: "Downloads completed successfully.",
            });
            sendEvent({ type: "complete" }); // Info: (20260611 - Tzuhan) no file attached for download_only
          } else if (mode === "dpp_catalog_only") {
            sendEvent({
              type: "log",
              message: "DPP Catalog Pipeline completed successfully.",
            });
            sendEvent({ type: "complete" });
          } else if (
            mode === "product_dpp_only" ||
            mode === "product_specs_only" ||
            mode === "product_image_only" ||
            mode === "dpp_ground_truth_only" ||
            mode === "dpp_compliance_only"
          ) {
            sendEvent({
              type: "log",
              message: `Product DPP Pipeline (${mode}) completed successfully for ${productId}.`,
            });
            sendEvent({ type: "complete" });
          } else if (mode === "all" || mode === "dpp_only") {
            // Info: (20260610 - Tzuhan) 完成 Day 2 流程
            sendEvent({
              type: "log",
              message: "DPP Pipeline completed successfully.",
            });
            sendEvent({ type: "complete" }); // Info: (20260611 - Tzuhan) UI 會自己決定預覽哪個檔案
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
