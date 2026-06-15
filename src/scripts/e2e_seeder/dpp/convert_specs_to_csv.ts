import * as fs from "fs";
import * as path from "path";

interface IDppGroundTruth {
  general?: {
    gtin?: string;
    cnCode?: string;
    manufacturedDate?: string;
    facility?: string;
    facilityUNLOCODE?: string;
    weightKg?: number;
  };
  carbonFootprint?: {
    total_tCO2e?: number;
    methodology?: string;
    breakdown?: {
      directEmissionsScope1?: number;
      indirectEmissionsScope2?: number;
      precursorsEmissions?: number;
    };
  };
  circularity?: {
    recycledContentShare?: Array<{
      material: string;
      preConsumerShare: number;
      postConsumerShare: number;
      primaryMaterial: number;
    }>;
  };
  materialComposition?: Array<{
    materialName: string;
    elements?: Array<{
      element: string;
      percentage: number;
    }>;
  }>;
  importer?: {
    companyName: string;
    address?: string;
    eori: string;
  };
  compliance?: {
    iatf16949Compliant?: boolean;
    iatfCertificateId?: string;
  };
  durabilityAndRepair?: {
    physicalLifespanYears?: number;
    repairability?: string;
    disposal?: string;
  };
}

export async function convertSpecsToCsv(
  stockId: string,
  year: string = "2024",
  options?: { baseDirOverride?: string; targetProductId?: string },
) {
  const dataDir = path.resolve(process.cwd(), `data/${stockId}/${year}`);
  const baseDir = options?.baseDirOverride || path.join(dataDir, "outputs");
  const mockSourcesDir = path.join(baseDir, "mock_sources");
  const bomPath = path.join(mockSourcesDir, "boms_and_precursors.json");

  if (!fs.existsSync(bomPath)) {
    console.error(`❌ Missing BOM file: ${bomPath}`);
    return;
  }

  const bomRaw = JSON.parse(fs.readFileSync(bomPath, "utf-8"));

  console.log(
    `🚀 [Specs CSV Converter] 開始為 ${bomRaw.products.length} 項產品生成 產品規格與技術手冊 CSV...`,
  );

  for (const product of bomRaw.products) {
    if (
      options?.targetProductId &&
      product.productId !== options.targetProductId
    )
      continue;
    const productId = product.productId;
    const productMockDir = path.join(baseDir, productId, "mock_sources");

    const specsPath = path.join(
      productMockDir,
      `${productId}_product_specs.json`,
    );
    const outFile = path.join(productMockDir, `${productId}_product_specs.csv`);

    if (!fs.existsSync(specsPath)) {
      console.warn(
        `⚠️ [${productId}] 找不到對應的 Specs JSON，跳過 CSV 產出。`,
      );
      continue;
    }

    const specsData = JSON.parse(fs.readFileSync(specsPath, "utf-8"));

    // Info: (20260612 - Tzuhan) Read ground truth if it exists to enrich CSV
    const groundTruthPath = path.join(
      productMockDir,
      `${productId}_dpp_ground_truth.json`,
    );
    let groundTruthData: IDppGroundTruth | null = null;
    if (fs.existsSync(groundTruthPath)) {
      try {
        groundTruthData = JSON.parse(
          fs.readFileSync(groundTruthPath, "utf-8"),
        ) as IDppGroundTruth;
      } catch (err) {
        console.error(
          `Failed to parse ground truth at ${groundTruthPath}`,
          err,
        );
      }
    }

    const csvLines = [
      "Category,Key,Value",
      `General,Product ID,${specsData.productId}`,
      `General,Product Name,${specsData.productName}`,
    ];

    if (groundTruthData) {
      // Info: (20260615 - Tzuhan) General
      if (groundTruthData.general?.gtin) {
        csvLines.push(`General,GTIN,${groundTruthData.general.gtin}`);
      }
      if (groundTruthData.general?.cnCode) {
        csvLines.push(`General,CN Code,${groundTruthData.general.cnCode}`);
      }
      if (groundTruthData.general?.manufacturedDate) {
        csvLines.push(
          `General,Manufactured Date,${groundTruthData.general.manufacturedDate}`,
        );
      }
      if (groundTruthData.general?.facility) {
        csvLines.push(
          `General,Manufacturing Facility,${groundTruthData.general.facility}`,
        );
      }
      if (groundTruthData.general?.facilityUNLOCODE) {
        csvLines.push(
          `General,Facility UN/LOCODE,${groundTruthData.general.facilityUNLOCODE}`,
        );
      }
      if (groundTruthData.general?.weightKg) {
        csvLines.push(
          `General,Product Weight (Kg),${groundTruthData.general.weightKg}`,
        );
      }

      // Info: (20260615 - Tzuhan) Carbon Footprint
      if (groundTruthData.carbonFootprint) {
        const cf = groundTruthData.carbonFootprint;
        csvLines.push(
          `Environmental,Total Carbon Footprint (tCO2e),${cf.total_tCO2e || "N/A"}`,
        );
        csvLines.push(
          `Environmental,CF Methodology,${cf.methodology || "N/A"}`,
        );
        if (cf.breakdown) {
          csvLines.push(
            `Environmental,Scope 1 Direct Emissions (tCO2e),${cf.breakdown.directEmissionsScope1 || "0"}`,
          );
          csvLines.push(
            `Environmental,Scope 2 Indirect Emissions (tCO2e),${cf.breakdown.indirectEmissionsScope2 || "0"}`,
          );
          csvLines.push(
            `Environmental,Precursor Embedded Emissions (tCO2e),${cf.breakdown.precursorsEmissions || "0"}`,
          );
        }
      }

      // Info: (20260615 - Tzuhan) Circularity
      if (groundTruthData.circularity?.recycledContentShare) {
        const shares = groundTruthData.circularity.recycledContentShare;
        shares.forEach((share) => {
          csvLines.push(`Circularity,Material,${share.material}`);
          csvLines.push(
            `Circularity,Pre-Consumer Recycled Share (%),${share.preConsumerShare}`,
          );
          csvLines.push(
            `Circularity,Post-Consumer Recycled Share (%),${share.postConsumerShare}`,
          );
          csvLines.push(
            `Circularity,Primary Material Share (%),${share.primaryMaterial}`,
          );
        });
      }

      // Info: (20260615 - Tzuhan) Material Composition
      if (groundTruthData.materialComposition) {
        const comp = groundTruthData.materialComposition;
        comp.forEach((mat) => {
          csvLines.push(`Material,Material Name,${mat.materialName}`);
          if (mat.elements) {
            mat.elements.forEach((el) => {
              csvLines.push(
                `Material,Element ${el.element} (%),${el.percentage}`,
              );
            });
          }
        });
      }

      // Info: (20260615 - Tzuhan) Importer Details
      if (groundTruthData.importer) {
        const imp = groundTruthData.importer;
        csvLines.push(`Logistics,Importer Company Name,${imp.companyName}`);
        csvLines.push(
          `Logistics,Importer Address,"${(imp.address || "").replace(/"/g, '""')}"`,
        );
        csvLines.push(`Logistics,Importer EORI,${imp.eori}`);
      }

      // Info: (20260615 - Tzuhan) Compliance additions
      if (groundTruthData.compliance) {
        const comp = groundTruthData.compliance;
        csvLines.push(
          `Compliance,IATF 16949 Compliant,${comp.iatf16949Compliant ? "Yes" : "No"}`,
        );
        if (comp.iatfCertificateId) {
          csvLines.push(
            `Compliance,IATF Certificate ID,${comp.iatfCertificateId}`,
          );
        }
      }

      // Info: (20260615 - Tzuhan) Social Impact
      csvLines.push(`Social,Ethical Sourcing,Yes`);
      csvLines.push(`Social,Labor Standard Compliant,Yes`);
    }

    csvLines.push(
      `Durability,Physical Lifespan (Years),${groundTruthData?.durabilityAndRepair?.physicalLifespanYears || specsData.durability?.physicalLifespanYears || "N/A"}`,
      `Durability,Max Operating Temp (C),${specsData.durability?.maxOperatingTemperature_C || "N/A"}`,
      `Durability,Operating Conditions,"${(specsData.durability?.operatingConditions || "N/A").replace(/"/g, '""')}"`,
      `Repair & Teardown,Is Repairable,${specsData.repairAndTeardown?.isRepairable ? "Yes" : "No"}`,
      `Repair & Teardown,Requires Special Tools,${specsData.repairAndTeardown?.requiresSpecialTools ? "Yes" : "No"}`,
      `Repair & Teardown,Tool List,"${(specsData.repairAndTeardown?.toolList || []).join(", ").replace(/"/g, '""')}"`,
      `Repair & Teardown,Teardown Effort,${specsData.repairAndTeardown?.teardownEffort || "N/A"}`,
      `Repair & Teardown,Guidelines,"${(groundTruthData?.durabilityAndRepair?.repairability || specsData.repairAndTeardown?.guidelines || "N/A").replace(/"/g, '""')}"`,
      `Disposal,Recyclability Rate (%),${specsData.disposal?.recyclabilityRate_percent || "0"}`,
      `Disposal,Disposal Method,"${(specsData.disposal?.disposalMethod || "N/A").replace(/"/g, '""')}"`,
      `Disposal,Instructions,"${(groundTruthData?.durabilityAndRepair?.disposal || specsData.disposal?.instructions || "N/A").replace(/"/g, '""')}"`,
    );

    fs.writeFileSync(outFile, "\uFEFF" + csvLines.join("\n")); // Add BOM for excel support
    console.log(`✅ [${productId}] 生成 CSV 完成: ${outFile}`);
  }
}

// Info: (20260615 - Tzuhan) Support direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const stockId = process.argv[2];
  const year = process.argv[3];
  if (!stockId || !year) {
    console.error("Usage: npx tsx convert_specs_to_csv.ts <stockId> <year>");
    process.exit(1);
  }
  convertSpecsToCsv(stockId, year)
    .then(() => {
      console.log("Done.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Error:", err);
      process.exit(1);
    });
}
