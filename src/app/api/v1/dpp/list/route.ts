import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { companyRepo } from "@/repositories/company.repo";
import { reportDownloadTaskRepo } from "@/repositories/report_download_task.repo";

export async function GET() {
  const dataDir = path.join(process.cwd(), "data");
  const items = [];

  // Info: (20260609 - Tzuhan) 抓取所有公司資料來映射名稱
  const companies = await companyRepo.findMany();
  const companyMap = new Map(companies.map((c) => [c.stockId, c.name]));

  if (fs.existsSync(dataDir)) {
    const stockIds = fs.readdirSync(dataDir).filter((f) => !f.startsWith("."));
    for (const stockId of stockIds) {
      const stockPath = path.join(dataDir, stockId);
      if (fs.statSync(stockPath).isDirectory()) {
        const years = fs
          .readdirSync(stockPath)
          .filter((f) => !f.startsWith("."));
        for (const year of years) {
          const yearPath = path.join(stockPath, year);
          if (fs.statSync(yearPath).isDirectory()) {
            // Info: (20260609 - Tzuhan) 檢查 Day 1 進度
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
              path.join(yearPath, "outputs", `${stockId}_company_persona.html`),
            );

            // Info: (20260610 - Tzuhan) 讀取 BOMs 取出 products
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

            // Info: (20260610 - Tzuhan) 判斷是否企業階段 (Phase 1) 完成
            const isComplete = hasFin && hasEsg && hasPersonaHtml && hasBom;

            // Info: (20260609 - Tzuhan) 從資料庫撈取公司名稱，如果沒有則顯示企業+代號
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

  return NextResponse.json({ success: true, payload: items });
}

export async function DELETE(req: NextRequest) {
  try {
    const { stockId, year } = await req.json();
    if (!stockId || !year) {
      return NextResponse.json(
        { success: false, error: "Missing stockId or year" },
        { status: 400 },
      );
    }

    // Info: (20260610 - Tzuhan) 1. Delete files
    const targetDir = path.join(
      process.cwd(),
      "data",
      stockId,
      year.toString(),
    );
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true });
    }

    // Info: (20260610 - Tzuhan) 2. Delete database records
    await reportDownloadTaskRepo.deleteMany({
      where: {
        stockId,
        year: parseInt(year),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Delete failed", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
