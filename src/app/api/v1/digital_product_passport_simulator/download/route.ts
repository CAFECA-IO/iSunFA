import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import archiver from "archiver";
import { PassThrough } from "stream";
import { convertJsonToCsv } from "@/scripts/e2e_seeder/dpp/convert_json_to_csv";
import { renderDppPdf } from "@/scripts/e2e_seeder/dpp/render_dpp_pdf";

export async function POST(request: Request) {
  let tmpDir: string | null = null;
  try {
    const body = await request.json();
    const { stockId, year, skuId, missingModules = [] } = body;

    if (!stockId || !year || !skuId) {
      return NextResponse.json(
        { success: false, message: "Missing required parameters" },
        { status: 400 },
      );
    }

    const baseOutputsDir = path.join(
      process.cwd(),
      "data",
      stockId,
      year,
      "outputs",
    );
    if (!fs.existsSync(baseOutputsDir)) {
      return NextResponse.json(
        {
          success: false,
          message: "Company data not found. Please generate first.",
        },
        { status: 404 },
      );
    }

    // Create unique temporary directory
    const tmpDirName = `tmp_${skuId}_${Date.now()}`;
    tmpDir = path.join(baseOutputsDir, tmpDirName);
    const tmpMockSourcesDir = path.join(tmpDir, "mock_sources");
    const tmpProductMockDir = path.join(tmpDir, skuId, "mock_sources");

    fs.mkdirSync(tmpMockSourcesDir, { recursive: true });
    fs.mkdirSync(tmpProductMockDir, { recursive: true });

    // Copy original JSONs
    const originalBomsPath = path.join(
      baseOutputsDir,
      "mock_sources",
      "boms_and_precursors.json",
    );
    const originalGroundTruthPath = path.join(
      baseOutputsDir,
      skuId,
      "mock_sources",
      `${skuId}_dpp_ground_truth.json`,
    );

    if (
      !fs.existsSync(originalBomsPath) ||
      !fs.existsSync(originalGroundTruthPath)
    ) {
      return NextResponse.json(
        { success: false, message: "Original mock sources missing." },
        { status: 404 },
      );
    }

    const tmpBomsPath = path.join(
      tmpMockSourcesDir,
      "boms_and_precursors.json",
    );
    const tmpGroundTruthPath = path.join(
      tmpProductMockDir,
      `${skuId}_dpp_ground_truth.json`,
    );

    const bomsData = JSON.parse(fs.readFileSync(originalBomsPath, "utf-8"));
    const groundTruthData = JSON.parse(
      fs.readFileSync(originalGroundTruthPath, "utf-8"),
    );

    // Apply Gap Settings (Dig holes)
    if (missingModules.includes("BOM")) {
      // Empty the BOM list for this product
      const productBom = bomsData.products.find(
        (p: unknown) => (p as { productId: string }).productId === skuId,
      );
      if (productBom) {
        productBom.bom = [];
      }
    }

    if (missingModules.includes("LCA")) {
      // Zero out emissions in BOM
      const productBom = bomsData.products.find(
        (p: unknown) => (p as { productId: string }).productId === skuId,
      );
      if (productBom) {
        productBom.bom.forEach((b: unknown) => {
          (
            b as { embeddedEmissionsKgCO2ePerKg: number }
          ).embeddedEmissionsKgCO2ePerKg = 0;
        });
      }
      // Zero out emissions in Ground Truth
      if (groundTruthData.carbonFootprint) {
        groundTruthData.carbonFootprint.total_tCO2e = 0;
        groundTruthData.carbonFootprint.breakdown.precursorsEmissions = 0;
        groundTruthData.carbonFootprint.breakdown.directEmissionsScope1 = 0;
        groundTruthData.carbonFootprint.breakdown.indirectEmissionsScope2 = 0;
      }
    }

    // Write modified JSONs to tmp directory
    fs.writeFileSync(tmpBomsPath, JSON.stringify(bomsData, null, 2));
    fs.writeFileSync(
      tmpGroundTruthPath,
      JSON.stringify(groundTruthData, null, 2),
    );

    // Copy static assets needed for PDF
    const blueprintPath = path.join(baseOutputsDir, "fastener_blueprint.png");
    if (fs.existsSync(blueprintPath)) {
      fs.copyFileSync(
        blueprintPath,
        path.join(tmpDir, "fastener_blueprint.png"),
      );
    }

    // Execute generation scripts on tmp directory
    await convertJsonToCsv(stockId, year, {
      baseDirOverride: tmpDir,
      targetProductId: skuId,
    });
    await renderDppPdf(stockId, year, {
      baseDirOverride: tmpDir,
      targetProductId: skuId,
    });

    // Pack the ZIP
    const archive = archiver("zip", { zlib: { level: 9 } });
    const passThrough = new PassThrough();
    archive.pipe(passThrough);

    // 1. Add generated CSV
    const generatedCsvPath = path.join(
      tmpMockSourcesDir,
      "boms_and_precursors.csv",
    );
    if (fs.existsSync(generatedCsvPath)) {
      archive.file(generatedCsvPath, { name: "BOM_材料清單.csv" });
    }

    // 2. Add generated PDF
    const generatedPdfPath = path.join(
      tmpDir,
      skuId,
      "system_ingestion",
      `${skuId}_dpp_ground_truth_dashboard.pdf`,
    );
    if (fs.existsSync(generatedPdfPath)) {
      archive.file(generatedPdfPath, { name: "合規宣告書_與_LCA報告.pdf" });
    }

    // 3. Add company baseline (optional, for realism)
    if (fs.existsSync(baseOutputsDir)) {
      const items = fs.readdirSync(baseOutputsDir, { withFileTypes: true });
      for (const item of items) {
        if (!item.isDirectory() && item.name.endsWith(".json")) {
          archive.file(path.join(baseOutputsDir, item.name), {
            name: `company_baseline/${item.name}`,
          });
        }
      }
    }

    // Await full zip generation into a memory buffer
    const zipBuffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      passThrough.on("data", (chunk) => chunks.push(chunk));
      passThrough.on("end", () => resolve(Buffer.concat(chunks)));
      passThrough.on("error", reject);
      archive.on("error", reject);
      archive.finalize();
    });

    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${stockId}_${skuId}_dpp_real_mock.zip"`,
      },
    });
  } catch (error) {
    console.error("Download generation error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  } finally {
    if (tmpDir && fs.existsSync(tmpDir)) {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch (cleanupErr) {
        console.error("Cleanup error:", cleanupErr);
      }
    }
  }
}
