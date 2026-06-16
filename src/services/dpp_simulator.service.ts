import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { companyRepo } from "@/repositories/company.repo";
import { reportDownloadTaskRepo } from "@/repositories/report_download_task.repo";
import { spawn, ChildProcess } from "child_process";
import { TaskType, TaskStatus } from "@/generated";

export type FileNode = {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
};

export interface ISseEvent {
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

export class DppSimulatorService {
  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case ".html":
        return "text/html";
      case ".pdf":
        return "application/pdf";
      case ".png":
        return "image/png";
      case ".jpg":
      case ".jpeg":
        return "image/jpeg";
      case ".csv":
        return "text/csv";
      case ".json":
        return "application/json";
      case ".md":
        return "text/markdown";
      case ".txt":
        return "text/plain";
      default:
        return "application/octet-stream";
    }
  }

  public async getFileTree(
    dirPath: string,
    rootPath: string,
  ): Promise<FileNode[]> {
    const entries = await fsPromises.readdir(dirPath, { withFileTypes: true });
    const nodes: FileNode[] = [];

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relPath = path.relative(rootPath, fullPath);

      if (entry.isDirectory()) {
        const children = await this.getFileTree(fullPath, rootPath);
        nodes.push({
          name: entry.name,
          path: relPath,
          type: "directory",
          children,
        });
      } else {
        nodes.push({ name: entry.name, path: relPath, type: "file" });
      }
    }

    nodes.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === "directory" ? -1 : 1;
    });

    return nodes;
  }

  public async getFileDetails(
    absolutePath: string,
    cwd: string,
  ): Promise<{ buffer: Buffer; headers: Record<string, string> }> {
    if (!absolutePath.startsWith(path.join(cwd, "data"))) {
      throw new Error("Access denied");
    }

    let stats;
    let finalPath = absolutePath;
    try {
      stats = fs.statSync(finalPath);
    } catch (err) {
      const fallbackPath = finalPath.replace(
        new RegExp("/data/([^/]+)/\\d{4}/"),
        "/data/$1/2024/",
      );
      if (fallbackPath !== finalPath) {
        stats = fs.statSync(fallbackPath);
        finalPath = fallbackPath;
      } else {
        throw err;
      }
    }

    if (!stats.isFile()) {
      throw new Error("Not a file");
    }

    const mimeType = this.getMimeType(finalPath);
    const fileBuffer = await fsPromises.readFile(finalPath);

    const headers: Record<string, string> = {
      "Content-Type": mimeType,
      "Content-Length": stats.size.toString(),
      "Cache-Control": "public, max-age=3600",
    };

    return { buffer: fileBuffer, headers };
  }

  public async getSimulatorList() {
    const cwd = process.cwd();
    const dataDir = path.join(cwd, "data");
    const items = [];

    const companies = await companyRepo.findMany();
    const companyMap = new Map(companies.map((c) => [c.stockId, c.name]));

    if (fs.existsSync(dataDir)) {
      const stockIds = fs
        .readdirSync(dataDir)
        .filter((f) => !f.startsWith("."));
      for (const stockId of stockIds) {
        const stockPath = path.join(dataDir, stockId);
        if (fs.statSync(stockPath).isDirectory()) {
          const years = fs
            .readdirSync(stockPath)
            .filter((f) => !f.startsWith("."));
          for (const year of years) {
            const yearPath = path.join(stockPath, year);
            if (fs.statSync(yearPath).isDirectory()) {
              const hasFin = fs.existsSync(
                path.join(
                  yearPath,
                  "inputs",
                  "raw_reports",
                  `${year}_FIN_REPORT.pdf`,
                ),
              );
              const hasEsg = fs.existsSync(
                path.join(
                  yearPath,
                  "inputs",
                  "raw_reports",
                  `${year}_ESG_REPORT.pdf`,
                ),
              );
              const hasPersonaHtml = fs.existsSync(
                path.join(
                  yearPath,
                  "outputs",
                  `${stockId}_company_persona.html`,
                ),
              );
              const hasVisionCache = fs.existsSync(
                path.join(
                  yearPath,
                  "outputs",
                  "ai_extracted_context_cache.json",
                ),
              );
              const hasEsgExtrapolation = fs.existsSync(
                path.join(yearPath, "outputs", "esg_extrapolation.json"),
              );

              let products: unknown[] = [];
              const bomFilePath = path.join(
                yearPath,
                "outputs",
                "mock_sources",
                "boms_and_precursors.json",
              );
              const hasBom = fs.existsSync(bomFilePath);
              if (hasBom) {
                try {
                  const bomData = JSON.parse(
                    fs.readFileSync(bomFilePath, "utf-8"),
                  );
                  if (bomData.products) {
                    products = bomData.products.map(
                      (p: { productId: string; productName: string }) => {
                        const productMockDir = path.join(
                          yearPath,
                          "outputs",
                          p.productId,
                          "mock_sources",
                        );
                        const hasSpecs = fs.existsSync(
                          path.join(
                            productMockDir,
                            `${p.productId}_product_specs.json`,
                          ),
                        );
                        const hasImage = fs.existsSync(
                          path.join(
                            yearPath,
                            "outputs",
                            p.productId,
                            "mock_sources",
                            "fastener_blueprint.png",
                          ),
                        );

                        let dppGroundTruthFile: string | undefined;
                        let dppComplianceFile: string | undefined;

                        if (
                          fs.existsSync(
                            path.join(
                              productMockDir,
                              `${p.productId}_dpp_ground_truth.json`,
                            ),
                          )
                        ) {
                          dppGroundTruthFile = `data/${stockId}/${year}/outputs/${p.productId}/mock_sources/${p.productId}_dpp_ground_truth.json`;
                        }
                        if (
                          fs.existsSync(
                            path.join(
                              productMockDir,
                              `${p.productId}_dpp_compliance_declaration.md`,
                            ),
                          )
                        ) {
                          dppComplianceFile = `data/${stockId}/${year}/outputs/${p.productId}/mock_sources/${p.productId}_dpp_compliance_declaration.md`;
                        }

                        return {
                          productId: p.productId,
                          productName: p.productName,
                          progress: {
                            hasSpecs,
                            hasImage,
                            dppGroundTruthFile,
                            dppComplianceFile,
                          },
                        };
                      },
                    );
                  }
                } catch (e) {
                  console.error("Failed to parse bom:", e);
                }
              }

              const isComplete = hasFin && hasEsg && hasPersonaHtml && hasBom;
              const companyName = companyMap.get(stockId) || `企業 ${stockId}`;

              items.push({
                id: `${stockId}-${year}`,
                stockId,
                year,
                name: companyName,
                progress: {
                  hasFin,
                  hasEsg,
                  hasPersonaHtml,
                  hasVisionCache,
                  hasEsgExtrapolation,
                  hasBom,
                  products,
                },
                isComplete,
              });
            }
          }
        }
      }
    }

    return items;
  }

  public async deleteSimulatorData(stockId: string, year: string) {
    const targetDir = path.join(
      process.cwd(),
      "data",
      stockId,
      year.toString(),
    );
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true });
    }

    await reportDownloadTaskRepo.deleteMany({
      where: {
        stockId,
        year: parseInt(year),
      },
    });
  }

  public createGenerateStream(params: {
    stockId: string;
    year: string;
    productCount: number;
    mode: string;
    productId?: string;
  }) {
    const { stockId, year, productCount, mode } = params;
    let { productId } = params;

    if (mode === "generate_only" || mode === "baseline_only") {
      const cacheDir = path.join(
        process.cwd(),
        "data",
        stockId,
        year,
        "outputs",
      );
      const filesToDelete = [
        "ai_extracted_context_cache.json",
        "esg_extrapolation.json",
        `${stockId}_company_persona.json`,
        `${stockId}_company_persona.html`,
      ];
      for (const file of filesToDelete) {
        const filePath = path.join(cacheDir, file);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
            console.log(`[CLEAN] Cleared cache file: ${filePath}`);
          } catch (e) {
            console.warn(`[CLEAN] Failed to delete cache file: ${filePath}`, e);
          }
        }
      }
    }

    let activeChild: ChildProcess | null = null;
    let isAborted = false;

    return new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        const sendEvent = (data: ISseEvent) => {
          if (isAborted) return;
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
            );
          } catch (e) {
            console.warn("Failed to send event, stream might be closed:", e);
          }
        };

        const runScript = async (
          command: string,
          args: string[],
          captureOutput = false,
        ) => {
          if (isAborted) throw new Error("Stream aborted");
          return new Promise<{ stdout: string }>((resolve, reject) => {
            const child = spawn(command, args);
            activeChild = child;
            let stdoutFull = "";

            const heartbeat = setInterval(() => {
              sendEvent({
                type: "log",
                message: `⌛ [System] Running ${path.basename(args[1] || command)}...`,
              });
            }, 15000);

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
              clearInterval(heartbeat);
              if (activeChild === child) activeChild = null;
              if (code === 0) {
                resolve({ stdout: stdoutFull });
              } else {
                reject(new Error(`Process exited with code ${code}`));
              }
            });
          });
        };

        try {
          if (
            mode === "all" ||
            mode === "download_only" ||
            mode === "baseline_only"
          ) {
            sendEvent({ type: "step_start", stepIndex: 0 });
            sendEvent({ type: "step_start", stepIndex: 1 });

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

              sendEvent({
                type: "log",
                message: `Waiting for download tasks...`,
              });
              await new Promise((resolve) => setTimeout(resolve, 2000));
            }

            await downloadPromise;

            const pdfPath = `data/${stockId}/${year}/mock_sources/${stockId}_sustainability_report.pdf`;
            sendEvent({ type: "preview", file: pdfPath });
          }

          if (
            mode === "all" ||
            mode === "extrapolate_only" ||
            mode === "persona_only" ||
            mode === "baseline_only" ||
            mode === "generate_only"
          ) {
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
              mode === "generate_only" ||
              mode === "extrapolate_only" ||
              mode === "baseline_only"
            ) {
              sendEvent({ type: "step_start", stepIndex: 2 });
              sendEvent({
                type: "log",
                message: `Executing ai_vision_extractor.ts...`,
              });
              await runScript("npx", [
                "tsx",
                "src/scripts/e2e_seeder/ai_vision_extractor.ts",
                stockId,
                year,
              ]);

              sendEvent({
                type: "log",
                message: `Executing esg_extrapolator.ts...`,
              });
              const { stdout: esgStdout } = await runScript(
                "npx",
                [
                  "tsx",
                  "src/scripts/e2e_seeder/esg_extrapolator.ts",
                  stockId,
                  year,
                ],
                true,
              );

              if (
                esgStdout.includes("[SUCCESS] Extrapolated ESG data") ||
                esgStdout.includes("[INFO] ESG Extrapolation found")
              ) {
                sendEvent({ type: "extrapolation_alert" });
              }
            }

            if (
              mode === "generate_only" ||
              mode === "persona_only" ||
              mode === "baseline_only"
            ) {
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
            mode === "dpp_catalog_only" ||
            mode === "bom_only" ||
            mode === "generate_only" ||
            mode === "baseline_only"
          ) {
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
                  break;
                }
              }
            }
          }

          if (
            mode === "generate_only" ||
            mode === "persona_only" ||
            mode === "baseline_only"
          ) {
            const mockFilePath = `data/${stockId}/${year}/outputs/${stockId}_company_persona.html`;
            sendEvent({ type: "complete", file: mockFilePath });
          }

          if (mode === "extrapolate_only") {
            sendEvent({
              type: "log",
              message:
                "Extrapolation and vision extraction completed successfully.",
            });
            sendEvent({ type: "complete" });
          } else if (mode === "bom_only") {
            sendEvent({
              type: "log",
              message: "BOM Generation completed successfully.",
            });
            const bomFilePath = `data/${stockId}/${year}/outputs/mock_sources/boms_and_precursors.json`;
            sendEvent({ type: "complete", file: bomFilePath });
          } else if (mode === "generate_only" || mode === "baseline_only") {
            sendEvent({
              type: "log",
              message: "Company Baseline Pipeline completed successfully.",
            });
            sendEvent({ type: "complete" });
          } else if (mode === "download_only") {
            sendEvent({
              type: "log",
              message: "Downloads completed successfully.",
            });
            sendEvent({ type: "complete" });
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
            sendEvent({
              type: "log",
              message: "DPP Pipeline completed successfully.",
            });
            sendEvent({ type: "complete" });
          }
        } catch (err: unknown) {
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
      cancel() {
        isAborted = true;
        if (activeChild) {
          console.warn(
            "Killing active child process due to stream cancellation",
          );
          activeChild.kill();
          activeChild = null;
        }
      },
    });
  }
}
