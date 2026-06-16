import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import JSZip from "jszip";
import { convertJsonToCsv } from "@/scripts/e2e_seeder/dpp/convert_json_to_csv";
import { convertSpecsToCsv } from "@/scripts/e2e_seeder/dpp/convert_specs_to_csv";

export async function POST(request: Request) {
  let tmpDir: string | null = null;
  try {
    const body = await request.json();
    const { stockId, year, skuId } = body;

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

    // Info: (20260612 - Tzuhan) Create unique temporary directory
    const tmpDirName = `tmp_${skuId}_${Date.now()}`;
    tmpDir = path.join(baseOutputsDir, tmpDirName);
    const tmpMockSourcesDir = path.join(tmpDir, "mock_sources");
    const tmpProductMockDir = path.join(tmpDir, skuId, "mock_sources");

    fs.mkdirSync(tmpMockSourcesDir, { recursive: true });
    fs.mkdirSync(tmpProductMockDir, { recursive: true });

    // Info: (20260612 - Tzuhan) Copy original JSONs
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

    // Info: (20260612 - Tzuhan) Write modified JSONs to tmp directory
    fs.writeFileSync(tmpBomsPath, JSON.stringify(bomsData, null, 2));
    fs.writeFileSync(
      tmpGroundTruthPath,
      JSON.stringify(groundTruthData, null, 2),
    );

    const originalSpecsPath = path.join(
      baseOutputsDir,
      skuId,
      "mock_sources",
      `${skuId}_product_specs.json`,
    );
    const tmpSpecsPath = path.join(
      tmpProductMockDir,
      `${skuId}_product_specs.json`,
    );
    if (fs.existsSync(originalSpecsPath)) {
      const specsData = JSON.parse(fs.readFileSync(originalSpecsPath, "utf-8"));
      fs.writeFileSync(tmpSpecsPath, JSON.stringify(specsData, null, 2));
    }

    // Info: (20260615 - Tzuhan) Removed incorrect blueprint copy to tmpDir

    // Info: (20260612 - Tzuhan) Execute generation scripts on tmp directory
    await convertJsonToCsv(stockId, year, {
      baseDirOverride: tmpDir,
    });
    await convertSpecsToCsv(stockId, year, {
      baseDirOverride: tmpDir,
      targetProductId: skuId,
    });

    const zip = new JSZip();

    // Info: (20260615 - Tzuhan) 1. boms_and_precursors.csv
    const generatedCsvPath = path.join(
      tmpMockSourcesDir,
      "boms_and_precursors.csv",
    );
    if (fs.existsSync(generatedCsvPath)) {
      zip.file("boms_and_precursors.csv", fs.readFileSync(generatedCsvPath));
    }

    // Info: (20260615 - Tzuhan) 2. product_specs.csv
    const generatedSpecsCsvPath = path.join(
      tmpProductMockDir,
      `${skuId}_product_specs.csv`,
    );
    if (fs.existsSync(generatedSpecsCsvPath)) {
      zip.file(
        `${skuId}_product_specs.csv`,
        fs.readFileSync(generatedSpecsCsvPath),
      );
    }

    // Info: (20260615 - Tzuhan) 3. fastener_blueprint.png
    const blueprintPathSrc = path.join(
      baseOutputsDir,
      skuId,
      "mock_sources",
      "fastener_blueprint.png",
    );
    if (fs.existsSync(blueprintPathSrc)) {
      zip.file("fastener_blueprint.png", fs.readFileSync(blueprintPathSrc));
    }

    // Info: (20260615 - Tzuhan) 4. dpp_compliance_declaration.pdf
    const compliancePdfPathSrc = path.join(
      baseOutputsDir,
      skuId,
      "system_ingestion",
      `${skuId}_dpp_compliance_declaration.pdf`,
    );
    if (fs.existsSync(compliancePdfPathSrc)) {
      zip.file(
        `${skuId}_dpp_compliance_declaration.pdf`,
        fs.readFileSync(compliancePdfPathSrc),
      );
    }

    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 9 },
    });

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="DPP_Simulation_${stockId}_${year}_${skuId}.zip"`,
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
