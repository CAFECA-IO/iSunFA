import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { companyRepo } from "@/repositories/company.repo";
import { reportDownloadTaskRepo } from "@/repositories/report_download_task.repo";

export type FileNode = {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
};

// Info: (20260712 - Luphia) 唯讀 DPP 模擬器服務：僅提供 data/ 下的檔案樹、檔案讀取與模擬器清單查詢
// Info: (20260712 - Luphia) 與產生管線（createGenerateStream / generateDownloadZip 的 spawn tsx、seeder 動態 import）拆開
// Info: (20260712 - Luphia) 避免 list / files 路由把整條 pipeline 拉進 Turbopack NFT 追蹤而誤判為 whole project
export class DppSimulatorReadService {
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
}
