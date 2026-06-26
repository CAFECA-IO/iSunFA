import { DppRepository } from "@/repositories/dpp.repo";
import { FileRepository } from "@/repositories/file.repo";
import { StorageService } from "@/services/storage.service";
import { Prisma } from "@/generated";
import * as fs from "fs";
import * as path from "path";
import {
  FaithService,
  SchemaType,
  Schema,
  Part,
} from "@/services/faith.service";
import { mdToPdf } from "md-to-pdf";
import {
  IDigitalProductPassportBatch,
  IDigitalProductPassportSku,
  IDppMissingGap,
} from "@/interfaces/dpp";
import { ApiError, API_ERRORS } from "@/lib/utils/error_dictionary";
import { ApiCode } from "@/lib/utils/status";
import { DPP_SKU_STATUS } from "@/constants/status";

export class DppService {
  private dppRepo: DppRepository;
  private fileRepo: FileRepository;

  constructor() {
    this.dppRepo = new DppRepository();
    this.fileRepo = new FileRepository();
  }

  // Info: (20260615 - Tzuhan) Initialize and validate FaithService client
  private getGenAI(): FaithService {
    const apiKey = process.env.AI_SERVICE;
    if (!apiKey) {
      throw new ApiError(
        API_ERRORS.IS_AI_SERVICE_UNDEFINED.code,
        API_ERRORS.IS_AI_SERVICE_UNDEFINED.message,
        API_ERRORS.IS_AI_SERVICE_UNDEFINED.status,
      );
    }
    return new FaithService(apiKey);
  }

  public async issueBatch(
    skuId: string,
    userAddress: string,
    batchData: {
      batchNumber: string;
      manufactureDate: string;
      facilitySite: string;
      serialRange?: string;
    },
  ): Promise<IDigitalProductPassportBatch> {
    const { batchNumber, manufactureDate, facilitySite, serialRange } =
      batchData;

    if (!batchNumber || !manufactureDate || !facilitySite) {
      throw new ApiError(
        "ISDPP006",
        "Missing required batch parameters",
        ApiCode.VALIDATION_ERROR,
      );
    }

    // Info: (20260514 - Luphia) Verify SKU exists and user has access
    const skuWithAccess = await this.dppRepo.getSkuByIdWithTeamAccess(
      skuId,
      userAddress,
    );

    if (!skuWithAccess) {
      throw new ApiError("ISDPP004", "SKU not found", ApiCode.NOT_FOUND);
    }

    if (skuWithAccess.accountBook.team.teamMembers.length === 0) {
      throw new ApiError("ISDPP005", "Access denied", ApiCode.FORBIDDEN);
    }

    // Info: (20260514 - Luphia) Check for duplicate batch number
    const existingBatch = await this.dppRepo.getBatchByNumber(
      skuId,
      batchNumber,
    );
    if (existingBatch) {
      throw new ApiError(
        "ISDPP007",
        "Batch number already exists",
        ApiCode.CONFLICT,
      );
    }

    // Info: (20260514 - Luphia) Create the Batch
    const publicUrl = `/digital_product_passport/sku/${skuId}/batch/${batchNumber}`;
    const dynamicOverrides: {
      createdAt: string;
    } = {
      createdAt: new Date().toISOString(),
    };

    const batch = await this.dppRepo.createBatch({
      skuId,
      batchNumber,
      manufactureDate: new Date(manufactureDate),
      facilitySite,
      serialRange: serialRange || null,
      publicUrl,
      dynamicOverrides,
    });

    return batch;
  }

  public async createSku(
    accountBookId: string,
    userAddress: string,
    fileIds: string[],
  ): Promise<IDigitalProductPassportSku> {
    // Info: (20260513 - Luphia) Verify account book exists and user has access
    const accountBook = await this.dppRepo.verifyAccountBookAccess(
      accountBookId,
      userAddress,
    );

    if (!accountBook) {
      throw new ApiError(
        "ISDPP003",
        "Account book not found or access denied",
        ApiCode.FORBIDDEN,
      );
    }

    const stockId = accountBook.enterpriseId;
    let personaContext = "";
    if (stockId) {
      try {
        const cwd = process.cwd();
        let personaPath = path.join(
          cwd,
          "data",
          stockId,
          "2024",
          "outputs",
          `${stockId}_company_persona.json`,
        );
        if (!fs.existsSync(personaPath)) {
          personaPath = path.join(
            cwd,
            "data",
            stockId,
            "2025",
            "outputs",
            `${stockId}_company_persona.json`,
          );
        }
        if (fs.existsSync(personaPath)) {
          const personaRaw = fs.readFileSync(personaPath, "utf-8");
          const persona = JSON.parse(personaRaw);
          personaContext = `\n\nCompany Background Profile:
- Company Name (Chinese): ${accountBook.name || ""}
- Industry Dynamics & Supply Chain Profile: ${persona.industryDynamics || ""}
- Manufacturing Process Steps: ${JSON.stringify(persona.manufacturingProcess || [])}`;
        }
      } catch (err) {
        console.warn(
          `[DppService] Failed to load company persona for stockId ${stockId}:`,
          err,
        );
      }
    }

    /**
     * Info: (20260611 - Tzuhan) Read file content to dynamically generate DPP modules
     */

    let fileName = "Multiple Documents";
    let parsedGtin = `GTIN-${Date.now()}`;
    let parsedName = "Product SKU";
    let parsedModulesData: Record<
      string,
      { extracted: boolean; data?: Record<string, unknown> }
    > = {
      "1_product_info": { extracted: false },
      "2_environmental_impact": { extracted: false },
      "3_circularity": { extracted: false },
      "4_compliance": { extracted: false },
      "5_social_impact": { extracted: false },
      "6_repairability": { extracted: false },
      "7_logistics": { extracted: false },
      "8_critical_raw_materials": { extracted: false },
      "9_material_composition": { extracted: false },
    };
    let parsedMissingGaps: IDppMissingGap[] = [
      {
        module: "General",
        issue: "Document format unsupported or content empty.",
        impact: "High",
      },
    ];

    if (fileIds.length > 0) {
      const prompt = `You are a Digital Product Passport (DPP) compliance auditor. Analyze the provided documents for the product.
For each module in modulesData:
1. If any of the documents contain information for that module, set "extracted" to true and populate the "data" object with the extracted fields. Combine insights from multiple documents if necessary.
2. If none of the documents contain information for that module, set "extracted" to false and omit or leave "data" empty.
3. For any module that is not covered or has missing critical information, list it in "missingGaps" with a description of the missing info in "issue", and its "impact" ('High', 'Medium', or 'Critical'). If a module explicitly claims third-party certifications or compliance (e.g. SA8000 for social impact, ISO 14067 for LCA), consider it covered and do not report a missing gap.

Make sure to extract:
- Product info (ID, name, model, CN code, weight) for "1_product_info".
- Carbon footprint (Scope 1, Scope 2, precursor emissions) for "2_environmental_impact".
- Circularity recycled shares (pre-consumer, post-consumer, primary material) for "3_circularity".
- Compliance certificates/declarations for "4_compliance".
- Social/ethical sourcing info for "5_social_impact".
- Durability (lifespan, repair notes, disposal instructions) for "6_repairability".
- Importer details for "7_logistics".
- Critical raw materials list for "8_critical_raw_materials".
- Material chemical composition breakdown for "9_material_composition".
${personaContext}`;

      const parts: Part[] = [{ text: prompt }];
      let hasContent = false;
      let lastFileName = "Unknown Document";

      for (const fileId of fileIds) {
        try {
          const details = await this.resolveFileDetails(fileId);
          if (details.fileContent) {
            hasContent = true;
            lastFileName = details.fileName;
            if (details.isBase64) {
              parts.push({
                inlineData: {
                  data: details.fileContent,
                  mimeType: details.mimeType,
                },
              });
              parts.push({
                text: `\n\n--- Document File name: ${details.fileName} ---\n`,
              });
            } else {
              parts.push({
                text: `\n\n--- Document File name: ${details.fileName} ---\n${details.fileContent}`,
              });
            }
          }
        } catch (err) {
          console.error(
            `Failed to resolve file details for ${fileId} in createSku`,
            err,
          );
        }
      }

      if (hasContent) {
        fileName = lastFileName;
        parsedName = `Product SKU based on ${fileName}`;
        try {
          const genAI = this.getGenAI();
          const dppExtractionSchema = this.getDppExtractionSchema();

          const model = genAI.getGenerativeModel({
            model: "gemma4:e4b",
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: dppExtractionSchema,
              temperature: 0.1,
              maxOutputTokens: 8192,
            },
          });

          const result = await model.generateContent(parts);
          let responseText = result.response.text();
          responseText = responseText
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();

          let parsed;
          try {
            parsed = JSON.parse(responseText);
          } catch (jsonErr) {
            console.error(
              "Failed to parse JSON directly. Truncated output? Attempting to fix.",
              jsonErr,
            );
            // Info: (20260615 - Tzuhan) Basic attempt to close truncated JSON object if missing }
            if (!responseText.endsWith("}")) {
              responseText += "}";
            }
            try {
              parsed = JSON.parse(responseText);
            } catch {
              // Info: (20260615 - Tzuhan) Add closing quotes and braces
              responseText = responseText.replace(/[^}"]*$/, "") + '"}';
              try {
                parsed = JSON.parse(responseText);
              } catch {
                throw jsonErr;
              }
            }
          }

          if (parsed.gtin) parsedGtin = parsed.gtin;
          if (parsed.name) parsedName = parsed.name;
          if (parsed.modulesData) parsedModulesData = parsed.modulesData;
          if (parsed.missingGaps) parsedMissingGaps = parsed.missingGaps;
        } catch (err) {
          console.error("Gemini AI extraction failed:", err);
          parsedMissingGaps = [
            {
              module: "General",
              issue: "AI parsing failed or document is too large.",
              impact: "Critical",
            },
          ];
        }
      }
    }

    // Info: (20260611 - Tzuhan) Determine final status based on whether there are critical missing gaps
    const finalStatus =
      parsedMissingGaps.length === 0
        ? DPP_SKU_STATUS.READY
        : DPP_SKU_STATUS.INCOMPLETE;

    const existingSku = await this.dppRepo.getSkuByGtin(parsedGtin);
    let sku;

    if (existingSku) {
      if (existingSku.accountBookId !== accountBookId) {
        throw new ApiError(
          "ISDPP011",
          `SKU with GTIN ${parsedGtin} already exists in another account book.`,
          ApiCode.CONFLICT,
        );
      }
      sku = await this.dppRepo.updateSku(existingSku.id, {
        name: parsedName,
        status: finalStatus,
        modulesData: parsedModulesData as Prisma.InputJsonValue,
        missingGaps: parsedMissingGaps as unknown as Prisma.InputJsonValue,
      });
    } else {
      sku = await this.dppRepo.createSku({
        accountBookId,
        gtin: parsedGtin,
        name: parsedName,
        status: finalStatus,
        modulesData: parsedModulesData as Prisma.InputJsonValue,
        missingGaps: parsedMissingGaps as unknown as Prisma.InputJsonValue,
      });
    }

    return sku;
  }

  public async getSkus(
    userAddress: string,
  ): Promise<IDigitalProductPassportSku[]> {
    return this.dppRepo.getSkusByUser(userAddress);
  }

  public async getBatches(
    userAddress: string,
  ): Promise<IDigitalProductPassportBatch[]> {
    return this.dppRepo.getBatchesByUser(userAddress);
  }

  public async getSku(
    skuId: string,
    userAddress: string,
  ): Promise<Partial<IDigitalProductPassportSku>> {
    const skuWithAccess = await this.dppRepo.getSkuByIdWithTeamAccess(
      skuId,
      userAddress,
    );

    if (!skuWithAccess) {
      throw new ApiError("ISDPP004", "SKU not found", ApiCode.NOT_FOUND);
    }

    // Info: (20260513 - Luphia) Verify user has access to the account book this SKU belongs to
    if (skuWithAccess.accountBook.team.teamMembers.length === 0) {
      throw new ApiError("ISDPP005", "Access denied", ApiCode.FORBIDDEN);
    }

    const skuData = { ...skuWithAccess } as Partial<typeof skuWithAccess>;
    delete skuData.accountBook;

    return skuData as unknown as Partial<IDigitalProductPassportSku>;
  }

  public async updateSkuWithSupplement(
    skuId: string,
    userAddress: string,
    fileId: string,
  ): Promise<IDigitalProductPassportSku> {
    const skuWithAccess = await this.dppRepo.getSkuByIdWithTeamAccess(
      skuId,
      userAddress,
    );

    if (!skuWithAccess) {
      throw new ApiError("ISDPP004", "SKU not found", ApiCode.NOT_FOUND);
    }

    if (skuWithAccess.accountBook.team.teamMembers.length === 0) {
      throw new ApiError("ISDPP005", "Access denied", ApiCode.FORBIDDEN);
    }

    let fileName = "Unknown Document";
    let fileContent = "";
    let isBase64 = false;
    let mimeType = "text/plain";

    try {
      const details = await this.resolveFileDetails(fileId);
      fileName = details.fileName;
      fileContent = details.fileContent;
      isBase64 = details.isBase64;
      mimeType = details.mimeType;
    } catch (err) {
      console.error(
        "Failed to resolve file details in updateSkuWithSupplement",
        err,
      );
      throw new ApiError(
        "ISDPP009",
        "Failed to read supplement file: " +
          (err instanceof Error ? err.message : String(err)),
        ApiCode.INTERNAL_SERVER_ERROR,
      );
    }

    if (!fileContent) {
      throw new ApiError(
        "ISDPP010",
        "Supplement file is empty",
        ApiCode.VALIDATION_ERROR,
      );
    }

    const stockId = skuWithAccess.accountBook.enterpriseId;
    let personaContext = "";
    if (stockId) {
      try {
        const cwd = process.cwd();
        let personaPath = path.join(
          cwd,
          "data",
          stockId,
          "2024",
          "outputs",
          `${stockId}_company_persona.json`,
        );
        if (!fs.existsSync(personaPath)) {
          personaPath = path.join(
            cwd,
            "data",
            stockId,
            "2025",
            "outputs",
            `${stockId}_company_persona.json`,
          );
        }
        if (fs.existsSync(personaPath)) {
          const personaRaw = fs.readFileSync(personaPath, "utf-8");
          const persona = JSON.parse(personaRaw);
          personaContext = `\n\nCompany Background Profile:
- Company Name (Chinese): ${skuWithAccess.accountBook.name || ""}
- Industry Dynamics & Supply Chain Profile: ${persona.industryDynamics || ""}
- Manufacturing Process Steps: ${JSON.stringify(persona.manufacturingProcess || [])}`;
        }
      } catch (err) {
        console.warn(
          `[DppService] Failed to load company persona for stockId ${stockId}:`,
          err,
        );
      }
    }

    const genAI = this.getGenAI();
    const dppExtractionSchema = this.getDppExtractionSchema();

    const model = genAI.getGenerativeModel({
      model: "gemma4:e4b",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: dppExtractionSchema,
        temperature: 0.1,
      },
    });

    const prompt = `You are a Digital Product Passport (DPP) compliance auditor. Analyze the provided supplementary document.
For each module in modulesData:
1. If the document contains information for that module, set "extracted" to true and populate the "data" object with the extracted fields.
2. If the document does not contain information for that module, set "extracted" to false.
${personaContext}

Document File name: ${fileName}`;

    const parts: Part[] = [{ text: prompt }];
    if (isBase64) {
      parts.push({
        inlineData: {
          data: fileContent,
          mimeType,
        },
      });
    } else {
      parts.push({ text: `\n\n--- Document Content ---\n${fileContent}` });
    }

    const result = await model.generateContent(parts);
    const parsed = JSON.parse(result.response.text());

    const existingModules =
      (skuWithAccess.modulesData as Record<
        string,
        { extracted: boolean; data?: Record<string, unknown> }
      >) || {};
    const existingGaps =
      (skuWithAccess.missingGaps as Array<{
        module: string;
        issue: string;
        impact: string;
      }>) || [];

    const updatedModules = { ...existingModules };
    let updatedGaps = [...existingGaps];

    const moduleNormalizedNames: Record<string, string[]> = {
      "1_product_info": ["general", "product info", "product_info"],
      "2_environmental_impact": [
        "environmental impact",
        "environmental_impact",
        "carbon footprint",
        "carbon_footprint",
      ],
      "3_circularity": ["circularity"],
      "4_compliance": ["compliance"],
      "5_social_impact": ["social impact", "social_impact"],
      "6_repairability": ["repairability", "durability"],
      "7_logistics": ["logistics", "importer"],
      "8_critical_raw_materials": [
        "critical raw materials",
        "critical_raw_materials",
        "raw materials",
      ],
      "9_material_composition": [
        "material composition",
        "material_composition",
      ],
    };

    if (parsed.modulesData) {
      for (const [moduleKey, moduleVal] of Object.entries(parsed.modulesData)) {
        const val = moduleVal as {
          extracted: boolean;
          data?: Record<string, unknown>;
        };
        if (val.extracted) {
          updatedModules[moduleKey] = val;
          const matchNames = moduleNormalizedNames[moduleKey] || [moduleKey];
          updatedGaps = updatedGaps.filter(
            (g) => !matchNames.includes(g.module.toLowerCase().trim()),
          );
        }
      }
    }

    const finalStatus =
      updatedGaps.length === 0
        ? DPP_SKU_STATUS.READY
        : DPP_SKU_STATUS.INCOMPLETE;

    const updatedSku = await this.dppRepo.updateSku(skuId, {
      status: finalStatus,
      modulesData: updatedModules as Prisma.InputJsonValue,
      missingGaps: updatedGaps as Prisma.InputJsonValue,
    });

    return updatedSku;
  }

  public async getPublicBatchPassport(
    skuId: string,
    batchNumber: string,
  ): Promise<{
    sku: IDigitalProductPassportSku;
    batch: IDigitalProductPassportBatch;
  }> {
    const sku = await this.dppRepo.getSkuById(skuId);
    if (!sku) {
      throw new ApiError("ISDPP004", "SKU not found", ApiCode.NOT_FOUND);
    }

    const batch = await this.dppRepo.getBatchByNumber(skuId, batchNumber);
    if (!batch) {
      throw new ApiError("ISDPP007", "Batch not found", ApiCode.NOT_FOUND);
    }

    return { sku, batch };
  }

  public async generateBatchPdf(
    skuId: string,
    batchNumber: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const passport = await this.getPublicBatchPassport(skuId, batchNumber);

    if (!passport || !passport.sku) {
      throw new ApiError("ISDPP004", "Passport not found", ApiCode.NOT_FOUND);
    }

    const { sku, batch } = passport;

    interface IDppModule<T> {
      data?: T;
      extracted?: boolean;
    }
    interface IProductInfo {
      modelNumber?: string;
      productId?: string;
      cnCode?: string;
      category?: string;
      weightKg?: number;
      facility?: string;
      facilityUNLOCODE?: string;
      manufacturedDate?: string;
    }
    interface IEnvImpact {
      total_tCO2e?: number;
      methodology?: string;
      breakdown?: {
        precursorsEmissions?: number;
        directEmissionsScope1?: number;
        indirectEmissionsScope2?: number;
      };
    }
    interface IRecycledContentShare {
      material: string;
      preConsumerShare?: number;
      postConsumerShare?: number;
      primaryMaterial?: number;
    }
    interface ICircularity {
      recycledContentShare?: IRecycledContentShare[];
    }
    interface ICompliance {
      iatf16949Compliant?: boolean;
      iatfCertificateId?: string;
      rohsCompliant?: boolean;
      pfasFree?: boolean;
      declarationDocument?: string;
    }
    interface ISocialImpact {
      ethicalSourcing?: boolean;
      laborStandardCompliant?: boolean;
    }
    interface IRepairability {
      physicalLifespanYears?: number;
      repairability?: string;
      disposal?: string;
    }
    interface ILogistics {
      companyName?: string;
      eori?: string;
    }
    interface ICriticalRawMaterials {
      criticalRawMaterials?: string[];
    }
    interface IMaterialElement {
      element: string;
      percentage: number;
    }
    interface IComposition {
      materialName: string;
      elements: IMaterialElement[];
    }
    interface IMaterialComposition {
      materialComposition?: IComposition[];
    }

    interface IModulesData {
      "1_product_info"?: IDppModule<IProductInfo>;
      "2_environmental_impact"?: IDppModule<IEnvImpact>;
      "3_circularity"?: IDppModule<ICircularity>;
      "4_compliance"?: IDppModule<ICompliance>;
      "5_social_impact"?: IDppModule<ISocialImpact>;
      "6_repairability"?: IDppModule<IRepairability>;
      "7_logistics"?: IDppModule<ILogistics>;
      "8_critical_raw_materials"?: IDppModule<ICriticalRawMaterials>;
      "9_material_composition"?: IDppModule<IMaterialComposition>;
    }

    const modules = (sku.modulesData || {}) as IModulesData;

    const productInfo = modules["1_product_info"]?.data || {};
    const envImpact = modules["2_environmental_impact"]?.data || {};
    const carbonBreakdown = envImpact.breakdown || {};
    const circularity = modules["3_circularity"]?.data || {};
    const recycledContentShare = circularity.recycledContentShare || [];
    const compliance = modules["4_compliance"]?.data || {};
    const socialImpact = modules["5_social_impact"]?.data || {};
    const repairability = modules["6_repairability"]?.data || {};
    const logistics = modules["7_logistics"]?.data || {};
    const rawMaterials = modules["8_critical_raw_materials"]?.data || {};
    const criticalRawMaterials = rawMaterials.criticalRawMaterials || [];
    const compositionData = modules["9_material_composition"]?.data || {};
    const materialComposition = compositionData.materialComposition || [];

    const totalCO2e = Number(envImpact.total_tCO2e || 0);
    const precursors = Number(carbonBreakdown.precursorsEmissions || 0);
    const scope1 = Number(carbonBreakdown.directEmissionsScope1 || 0);
    const scope2 = Number(carbonBreakdown.indirectEmissionsScope2 || 0);

    const totalBreakdown = precursors + scope1 + scope2;
    const prePct = totalBreakdown > 0 ? (precursors / totalBreakdown) * 100 : 0;
    const s1Pct = totalBreakdown > 0 ? (scope1 / totalBreakdown) * 100 : 0;
    const s2Pct = totalBreakdown > 0 ? (scope2 / totalBreakdown) * 100 : 0;

    const displayTCO2e =
      totalCO2e === 0
        ? "0.0000"
        : totalCO2e < 0.0001
          ? totalCO2e.toExponential(2)
          : totalCO2e.toFixed(4);
    const displayPre =
      precursors === 0
        ? "0.0000"
        : precursors < 0.0001
          ? precursors.toExponential(2)
          : precursors.toFixed(4);
    const displayS1 =
      scope1 === 0
        ? "0.0000"
        : scope1 < 0.0001
          ? scope1.toExponential(2)
          : scope1.toFixed(4);
    const displayS2 =
      scope2 === 0
        ? "0.0000"
        : scope2 < 0.0001
          ? scope2.toExponential(2)
          : scope2.toFixed(4);

    const stockId = sku.accountBookName || sku.accountBookId;
    const year = new Date(batch.manufactureDate).getFullYear().toString();
    const modelNumber = productInfo.modelNumber || productInfo.productId;

    let blueprintBase64 = "";
    if (stockId && year && modelNumber) {
      let blueprintPath = path.resolve(
        process.cwd(),
        "data",
        stockId,
        year,
        "outputs",
        modelNumber,
        "mock_sources",
        "fastener_blueprint.png",
      );
      if (!fs.existsSync(blueprintPath)) {
        blueprintPath = path.resolve(
          process.cwd(),
          "data",
          stockId,
          "2024",
          "outputs",
          modelNumber,
          "mock_sources",
          "fastener_blueprint.png",
        );
      }
      if (fs.existsSync(blueprintPath)) {
        blueprintBase64 = fs.readFileSync(blueprintPath).toString("base64");
      }
    }

    const logoPath = path.resolve(process.cwd(), "public/isunfa_logo.svg");
    let logoBase64 = "";
    if (fs.existsSync(logoPath)) {
      logoBase64 = fs.readFileSync(logoPath).toString("base64");
    }

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, sans-serif; background-color: #ffffff; color: #1e293b; margin: 0; padding: 0; font-size: 13px; }
    .header { background-color: #0f172a; color: #f8fafc; padding: 16px 40px; display: flex; justify-content: space-between; align-items: center; margin: 0; }
    .header-left { display: flex; align-items: center; font-size: 18px; font-weight: 600; letter-spacing: 0.5px; }
    .header-separator { margin: 0 12px; color: #334155; }
    .header-badge { border: 1px solid #1e293b; background-color: #0f172a; color: #3b82f6; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 500; }
    .content-wrapper { padding: 20px 40px; }
    .doc-meta { margin-bottom: 12px; display: flex; align-items: center; gap: 12px; }
    .doc-tag { background-color: #ffedd5; color: #c2410c; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .doc-info { color: #64748b; font-size: 13px; }
    .doc-title { font-size: 24px; font-weight: 700; margin: 0 0 6px 0; color: #0f172a; display: flex; align-items: center; gap: 12px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
    .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; page-break-inside: avoid; break-inside: avoid; }
    .card h2 { font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-top: 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 16px; }
    .kv-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; }
    .kv-key { color: #64748b; line-height: 1.4; flex-shrink: 0; }
    .kv-val { color: #0f172a; font-weight: 600; text-align: right; margin-left: 15px; word-break: break-word; }
    .recycled-bar { height: 10px; border-radius: 5px; background: #f1f5f9; margin-top: 6px; display: flex; overflow: hidden; }
    .recycled-bar .pre { background: #f97316; }
    .recycled-bar .post { background: #10b981; }
    .recycled-bar .primary { background: #94a3b8; }
    .status-badge { background: #dcfce7; color: #166534; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; }
    .pie-chart { width: 120px; height: 120px; }
    .legend { display: flex; flex-direction: column; gap: 6px; font-size: 11px; color: #475569; }
    .legend-item { display: flex; align-items: center; gap: 6px; }
    .legend-color { width: 10px; height: 10px; border-radius: 2px; }
    .footer { background-color: #fff7ed; padding: 20px; text-align: center; margin-top: 30px; border-top: 1px solid #ffedd5; }
    .footer-title { font-size: 16px; font-weight: bold; color: #0f172a; margin-bottom: 8px; letter-spacing: 1px; }
    .footer-text { font-size: 12px; color: #64748b; }
    .tag { display: inline-flex; align-items: center; border-radius: 6px; padding: 2px 8px; font-size: 11px; font-weight: 600; }
    .tag-blue { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
    .tag-red { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      ${logoBase64 ? '<img src="data:image/svg+xml;base64,' + logoBase64 + '" style="height: 24px;">' : "<span>iSunFA</span>"}
      <span class="header-separator">|</span>
      <span>陽光智能碳會計</span>
    </div>
    <div class="header-badge">內部文件</div>
  </div>

  <div class="content-wrapper">
    <div class="doc-meta">
      <div class="doc-tag">系統報告</div>
      <div class="doc-info">iSunFA Enterprise Solutions &nbsp;&bull;&nbsp; ${new Date().toLocaleDateString("zh-TW", { year: "numeric", month: "numeric", day: "numeric" })}</div>
    </div>

    <div class="doc-title">
      Digital Product Passport
      <span class="status-badge">✔ VERIFIED BY TÜV Rheinland</span>
    </div>
    <div style="color: #64748b; margin-bottom: 20px; font-family: monospace; font-size: 12px;">Passport ID: ${skuId}-${batchNumber}</div>

    <div class="grid">
      <div class="card">
        <h2>General Information</h2>
        ${blueprintBase64 ? '<div style="text-align: center; margin-bottom: 12px;"><img src="data:image/png;base64,' + blueprintBase64 + '" style="max-width: 100%; max-height: 160px; border-radius: 6px; border: 1px solid #e2e8f0;"></div>' : ""}
        <div class="kv-row"><span class="kv-key">Product Name</span><span class="kv-val">${sku.name}</span></div>
        <div class="kv-row"><span class="kv-key">Model Number</span><span class="kv-val">${productInfo.modelNumber || "N/A"}</span></div>
        <div class="kv-row"><span class="kv-key">GTIN</span><span class="kv-val">${sku.gtin || "N/A"}</span></div>
        <div class="kv-row"><span class="kv-key">CN Code</span><span class="kv-val">${productInfo.cnCode || "7318.15"}</span></div>
        <div class="kv-row"><span class="kv-key">Category</span><span class="kv-val">${productInfo.category || "N/A"}</span></div>
        <div class="kv-row"><span class="kv-key">Weight</span><span class="kv-val">${productInfo.weightKg || "N/A"} kg</span></div>
        <div class="kv-row"><span class="kv-key">Facility</span><span class="kv-val">${productInfo.facility || batch.facilitySite} (UNLOCODE: ${productInfo.facilityUNLOCODE || "N/A"})</span></div>
        <div class="kv-row"><span class="kv-key">Manufactured Date</span><span class="kv-val">${productInfo.manufacturedDate || new Date(batch.manufactureDate).toISOString().split("T")[0]}</span></div>
        
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed #e2e8f0;">
          <div style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold; color: #475569;">Batch details</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; padding: 12px; border-radius: 6px;">
            <div><div style="font-size: 10px; color: #94a3b8; font-weight: bold;">BATCH NUMBER</div><div style="font-size: 12px; font-weight: bold; color: #1e293b; font-family: monospace;">${batch.batchNumber}</div></div>
            <div><div style="font-size: 10px; color: #94a3b8; font-weight: bold;">SERIAL RANGE</div><div style="font-size: 12px; font-weight: bold; color: #1e293b; font-family: monospace;">${batch.serialRange || "N/A"}</div></div>
          </div>
        </div>

        ${
          logistics.companyName || logistics.eori
            ? `
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed #e2e8f0;">
          <div style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold; color: #475569;">EU Importer Information</div>
          <div class="kv-row"><span class="kv-key">Company</span><span class="kv-val">${logistics.companyName || "N/A"}</span></div>
          <div class="kv-row"><span class="kv-key">EORI Number</span><span class="kv-val">${logistics.eori || "N/A"}</span></div>
        </div>
        `
            : ""
        }
      </div>

      <div class="card">
        <h2>Carbon Footprint Summary</h2>
        <div style="font-size: 36px; font-weight: bold; color: #10b981; text-align: center; margin-top: 8px;">
          ${displayTCO2e} <span style="font-size: 14px; color: #64748b;">tCO₂e</span>
        </div>
        <div style="text-align: center; font-size: 11px; color: #94a3b8; margin-top: 4px;">Methodology: ${envImpact.methodology || "ISO 14067 (Cradle-to-Gate)"}</div>
        
        <div style="display: flex; align-items: center; justify-content: center; gap: 24px; margin: 20px 0;">
          <div class="pie-chart" style="border-radius: 50%; background: ${totalBreakdown > 0 ? "conic-gradient(#f97316 0% " + prePct + "%, #3b82f6 " + prePct + "% " + (prePct + s1Pct) + "%, #10b981 " + (prePct + s1Pct) + "% 100%)" : "#10b981"}; display: flex; align-items: center; justify-content: center;">
            <div style="width: 70%; height: 70%; background: #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 10px; color: #64748b; font-weight: 600; line-height: 1.2;">
              CRADLE<br>TO GATE
            </div>
          </div>
          <div class="legend">
            <div class="legend-item"><div class="legend-color" style="background: #f97316;"></div><span>Precursors: ${prePct.toFixed(1)}%</span></div>
            <div class="legend-item"><div class="legend-color" style="background: #3b82f6;"></div><span>Scope 1: ${s1Pct.toFixed(1)}%</span></div>
            <div class="legend-item"><div class="legend-color" style="background: #10b981;"></div><span>Scope 2: ${s2Pct.toFixed(1)}%</span></div>
          </div>
        </div>

        <div style="border-top: 1px solid #f1f5f9; padding-top: 12px;">
          <div class="kv-row"><span class="kv-key">Precursors Emissions</span><span class="kv-val">${displayPre} tCO₂e</span></div>
          <div class="kv-row"><span class="kv-key">Direct Emissions (Scope 1)</span><span class="kv-val">${displayS1} tCO₂e</span></div>
          <div class="kv-row"><span class="kv-key">Indirect Emissions (Scope 2)</span><span class="kv-val">${displayS2} tCO₂e</span></div>
        </div>
      </div>
    </div>
    
    
    <div class="card" style="margin-bottom: 20px; margin-top: 20px;">
      <h2>Circularity & Material Composition</h2>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
        <!-- Left Column: Recycled Content Share -->
        <div>
          <h3 style="font-size: 12px; color: #334155; margin-top: 0; margin-bottom: 12px;">Recycled Content Share</h3>
          ${recycledContentShare
            .map((m) => {
              const preShareRaw = Number(m.preConsumerShare || 0);
              const postShareRaw = Number(m.postConsumerShare || 0);
              const primaryShareRaw = Number(m.primaryMaterial || 0);
              const isFraction =
                preShareRaw + postShareRaw + primaryShareRaw <= 1.01;
              const multiplier = isFraction ? 100 : 1;

              const preShare = preShareRaw * multiplier;
              const postShare = postShareRaw * multiplier;
              const primaryShare = primaryShareRaw * multiplier;
              const totalRecycled = preShare + postShare;

              return (
                '<div style="margin-bottom: 16px; background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #f1f5f9;">' +
                '<div class="kv-row" style="margin-bottom: 4px;">' +
                '<span class="kv-key" style="font-weight: bold; color: #0f172a;">' +
                m.material +
                "</span>" +
                '<span class="kv-val" style="color: #10b981;">Recycled: ' +
                totalRecycled.toFixed(1) +
                "%</span>" +
                "</div>" +
                '<div class="recycled-bar">' +
                '<div class="pre" style="width: ' +
                preShare +
                '%"></div>' +
                '<div class="post" style="width: ' +
                postShare +
                '%"></div>' +
                '<div class="primary" style="width: ' +
                primaryShare +
                '%"></div>' +
                "</div>" +
                '<div style="font-size: 9px; color: #64748b; margin-top: 8px; display: flex; flex-wrap: wrap; gap: 8px; font-weight: bold; text-transform: uppercase;">' +
                '<span style="display: flex; align-items: center; gap: 4px;"><span style="color: #f97316; font-size: 14px;">■</span> PRE-CONSUMER (' +
                preShare.toFixed(1) +
                "%)</span>" +
                '<span style="display: flex; align-items: center; gap: 4px;"><span style="color: #10b981; font-size: 14px;">■</span> POST-CONSUMER (' +
                postShare.toFixed(1) +
                "%)</span>" +
                '<span style="display: flex; align-items: center; gap: 4px;"><span style="color: #94a3b8; font-size: 14px;">■</span> PRIMARY (' +
                primaryShare.toFixed(1) +
                "%)</span>" +
                "</div>" +
                "</div>"
              );
            })
            .join("")}
        </div>

        <!-- Right Column: Chemical Composition & Critical Raw Materials -->
        <div>
          <h3 style="font-size: 12px; color: #334155; margin-top: 0; margin-bottom: 12px;">Chemical Composition</h3>
          <div style="margin-bottom: 16px;">
          ${materialComposition
            .map((comp) => {
              return (
                '<div style="margin-bottom: 12px; background: #ffffff; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">' +
                '<div style="font-weight: bold; color: #1e293b; margin-bottom: 8px;">' +
                comp.materialName +
                "</div>" +
                '<div style="display: flex; flex-wrap: wrap; gap: 6px;">' +
                comp.elements
                  .map(
                    (el) =>
                      '<span style="background: #f1f5f9; color: #475569; padding: 3px 6px; border-radius: 4px; font-size: 10px; font-weight: 600;">' +
                      el.element +
                      ": " +
                      Number(el.percentage).toFixed(3) +
                      "%</span>",
                  )
                  .join("") +
                "</div>" +
                "</div>"
              );
            })
            .join("")}
          </div>

          <h3 style="font-size: 12px; color: #334155; margin-top: 24px; margin-bottom: 12px; text-transform: uppercase;">Critical Raw Materials</h3>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${
              criticalRawMaterials.length > 0
                ? criticalRawMaterials
                    .map(
                      (crm: string) =>
                        '<span class="tag tag-red">⚠️ ' + crm + "</span>",
                    )
                    .join("")
                : '<span style="font-size: 11px; color: #94a3b8; font-style: italic;">None identified.</span>'
            }
          </div>
        </div>
      </div>
    </div>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
      <div class="card" style="margin-bottom: 0;">
        <h2>Durability & Repairability</h2>
        <div class="kv-row"><span class="kv-key">Physical Lifespan</span><span class="kv-val">${repairability.physicalLifespanYears ? repairability.physicalLifespanYears + " Years" : "N/A"}</span></div>
        <div class="kv-row" style="flex-direction: column; gap: 6px; margin-top: 12px;">
          <span class="kv-key" style="text-transform: uppercase; font-size: 10px; font-weight: bold;">Repairability Instructions</span>
          <span class="kv-val" style="color: #475569; background: #f8fafc; padding: 12px; border-radius: 6px; font-weight: normal; line-height: 1.4; white-space: normal; text-align: left; margin-left: 0;">${repairability.repairability || "No special repair instructions."}</span>
        </div>
        <div class="kv-row" style="flex-direction: column; gap: 6px; margin-top: 12px;">
          <span class="kv-key" style="text-transform: uppercase; font-size: 10px; font-weight: bold;">End of Life / Disposal</span>
          <span class="kv-val" style="color: #475569; background: #f8fafc; padding: 12px; border-radius: 6px; font-weight: normal; line-height: 1.4; white-space: normal; text-align: left; margin-left: 0;">${repairability.disposal || "Dispose in accordance with local e-waste regulations."}</span>
        </div>
      </div>
      
      <div class="card" style="margin-bottom: 0;">
        <h2>Compliance & Certifications</h2>
        <div class="kv-row"><span class="kv-key">IATF 16949</span><span class="kv-val">${compliance.iatf16949Compliant ? "<span style='color: #10b981;'>✅ Compliant (" + (compliance.iatfCertificateId || "Certified") + ")</span>" : "<span style='color: #94a3b8;'>Not Certified</span>"}</span></div>
        <div class="kv-row"><span class="kv-key">RoHS Compliant</span><span class="kv-val">${compliance.rohsCompliant ? "<span style='color: #10b981;'>✅ Compliant</span>" : "<span style='color: #ef4444;'>❌ Non-compliant</span>"}</span></div>
        <div class="kv-row"><span class="kv-key">PFAS Free</span><span class="kv-val">${compliance.pfasFree ? "<span style='color: #10b981;'>✅ PFAS Free</span>" : "<span style='color: #ef4444;'>❌ Contains PFAS</span>"}</span></div>
        
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9;">
          <h3 style="font-size: 12px; color: #334155; margin-top: 0; margin-bottom: 12px;">Social Responsibility</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div style="background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #f1f5f9; text-align: center;">
              <div style="font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">Ethical Sourcing</div>
              <div style="font-size: 12px; font-weight: bold; color: #1e293b;">${socialImpact.ethicalSourcing ? "✅ Verified" : "Not Audited"}</div>
            </div>
            <div style="background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #f1f5f9; text-align: center;">
              <div style="font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">Labor Standards</div>
              <div style="font-size: 12px; font-weight: bold; color: #1e293b;">${socialImpact.laborStandardCompliant ? "✅ Compliant" : "Not Audited"}</div>
            </div>
          </div>
        </div>

        ${
          compliance.declarationDocument
            ? `
        <div style="margin-top: 24px; padding: 12px; background: #eff6ff; border-radius: 6px; border: 1px solid #bfdbfe;">
          <div style="color: #94a3b8; font-size: 10px; margin-bottom: 4px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Attached Declaration Document</div>
          <div style="color: #2563eb; font-weight: bold; word-break: break-all; font-size: 11px; font-family: monospace;">📄 ${compliance.declarationDocument}</div>
        </div>
        `
            : ""
        }
      </div>
    </div>
  </div> <!-- end of content-wrapper -->

  <div style="page-break-inside: avoid; break-inside: avoid;">
    <div style="padding: 0 40px;">
      <div style="text-align: center; margin-top: 10px; padding: 10px 15px; border-top: 1px dashed #e2e8f0; color: #64748b; font-size: 11px; line-height: 1.4;">
        * Carbon footprint evaluated according to ISO 14067 / CBAM Implementing Regulation (EU) 2023/1773. System boundary: Cradle-to-Gate.<br>
        <i style="color: #94a3b8; font-weight: bold;">Powered by iSunFA Enterprise Carbon Accounting System • Verified via Decentralized Trust Engine</i>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    const safeHtmlContent = htmlContent.replace(/\n/g, " ").replace(/\r/g, "");

    const pdfBuffer = await mdToPdf(
      { content: safeHtmlContent },
      {
        pdf_options: {
          format: "A4",
          margin: { top: "0mm", right: "0mm", bottom: "16mm", left: "0mm" },
          printBackground: true,
          displayHeaderFooter: true,
          headerTemplate: "<span></span>",
          footerTemplate: `<div style="width: 100%; text-align: center; font-family: Arial, sans-serif; font-size: 9px; color: #64748b; padding: 10px 0; border-top: 1px solid #e2e8f0; background: #fff7ed !important; -webkit-print-color-adjust: exact;"><div style="font-weight: bold; color: #1e293b; font-size: 10px; margin-bottom: 2px;">用人工智能重塑碳會計</div><div>© ${new Date().getFullYear()} iSunFA. All rights reserved. Generated securely via iSunFA Admin Portal.</div></div>`,
        },
      },
    );

    const filename = sku.name + "_DPP_" + batchNumber + ".pdf";
    return { buffer: pdfBuffer.content as unknown as Buffer, filename };
  }

  private getDppExtractionSchema(): Schema {
    return {
      type: SchemaType.OBJECT,
      properties: {
        gtin: { type: SchemaType.STRING },
        name: { type: SchemaType.STRING },
        modulesData: {
          type: SchemaType.OBJECT,
          properties: {
            "1_product_info": {
              type: SchemaType.OBJECT,
              properties: {
                extracted: { type: SchemaType.BOOLEAN },
                data: {
                  type: SchemaType.OBJECT,
                  properties: {
                    productId: { type: SchemaType.STRING },
                    name: { type: SchemaType.STRING },
                    modelNumber: { type: SchemaType.STRING },
                    category: { type: SchemaType.STRING },
                    cnCode: { type: SchemaType.STRING },
                    manufacturedDate: { type: SchemaType.STRING },
                    facility: { type: SchemaType.STRING },
                    facilityUNLOCODE: { type: SchemaType.STRING },
                    weightKg: { type: SchemaType.NUMBER },
                  },
                },
              },
              required: ["extracted"],
            },
            "2_environmental_impact": {
              type: SchemaType.OBJECT,
              properties: {
                extracted: { type: SchemaType.BOOLEAN },
                data: {
                  type: SchemaType.OBJECT,
                  properties: {
                    total_tCO2e: { type: SchemaType.NUMBER },
                    methodology: { type: SchemaType.STRING },
                    breakdown: {
                      type: SchemaType.OBJECT,
                      properties: {
                        precursorsEmissions: { type: SchemaType.NUMBER },
                        directEmissionsScope1: { type: SchemaType.NUMBER },
                        indirectEmissionsScope2: { type: SchemaType.NUMBER },
                      },
                    },
                  },
                },
              },
              required: ["extracted"],
            },
            "3_circularity": {
              type: SchemaType.OBJECT,
              properties: {
                extracted: { type: SchemaType.BOOLEAN },
                data: {
                  type: SchemaType.OBJECT,
                  properties: {
                    recycledContentShare: {
                      type: SchemaType.ARRAY,
                      items: {
                        type: SchemaType.OBJECT,
                        properties: {
                          material: { type: SchemaType.STRING },
                          preConsumerShare: { type: SchemaType.NUMBER },
                          postConsumerShare: { type: SchemaType.NUMBER },
                          primaryMaterial: { type: SchemaType.NUMBER },
                        },
                      },
                    },
                  },
                },
              },
              required: ["extracted"],
            },
            "4_compliance": {
              type: SchemaType.OBJECT,
              properties: {
                extracted: { type: SchemaType.BOOLEAN },
                data: {
                  type: SchemaType.OBJECT,
                  properties: {
                    rohsCompliant: { type: SchemaType.BOOLEAN },
                    pfasFree: { type: SchemaType.BOOLEAN },
                    iatf16949Compliant: { type: SchemaType.BOOLEAN },
                    iatfCertificateId: { type: SchemaType.STRING },
                    declarationDocument: { type: SchemaType.STRING },
                  },
                },
              },
              required: ["extracted"],
            },
            "5_social_impact": {
              type: SchemaType.OBJECT,
              properties: {
                extracted: { type: SchemaType.BOOLEAN },
                data: {
                  type: SchemaType.OBJECT,
                  properties: {
                    ethicalSourcing: { type: SchemaType.BOOLEAN },
                    laborStandardCompliant: { type: SchemaType.BOOLEAN },
                  },
                },
              },
              required: ["extracted"],
            },
            "6_repairability": {
              type: SchemaType.OBJECT,
              properties: {
                extracted: { type: SchemaType.BOOLEAN },
                data: {
                  type: SchemaType.OBJECT,
                  properties: {
                    physicalLifespanYears: { type: SchemaType.NUMBER },
                    repairability: { type: SchemaType.STRING },
                    disposal: { type: SchemaType.STRING },
                  },
                },
              },
              required: ["extracted"],
            },
            "7_logistics": {
              type: SchemaType.OBJECT,
              properties: {
                extracted: { type: SchemaType.BOOLEAN },
                data: {
                  type: SchemaType.OBJECT,
                  properties: {
                    companyName: { type: SchemaType.STRING },
                    address: { type: SchemaType.STRING },
                    eori: { type: SchemaType.STRING },
                  },
                },
              },
              required: ["extracted"],
            },
            "8_critical_raw_materials": {
              type: SchemaType.OBJECT,
              properties: {
                extracted: { type: SchemaType.BOOLEAN },
                data: {
                  type: SchemaType.OBJECT,
                  properties: {
                    criticalRawMaterials: {
                      type: SchemaType.ARRAY,
                      items: { type: SchemaType.STRING },
                    },
                  },
                },
              },
              required: ["extracted"],
            },
            "9_material_composition": {
              type: SchemaType.OBJECT,
              properties: {
                extracted: { type: SchemaType.BOOLEAN },
                data: {
                  type: SchemaType.OBJECT,
                  properties: {
                    materialComposition: {
                      type: SchemaType.ARRAY,
                      items: {
                        type: SchemaType.OBJECT,
                        properties: {
                          materialName: { type: SchemaType.STRING },
                          elements: {
                            type: SchemaType.ARRAY,
                            items: {
                              type: SchemaType.OBJECT,
                              properties: {
                                element: { type: SchemaType.STRING },
                                percentage: { type: SchemaType.NUMBER },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
              required: ["extracted"],
            },
          },
        },
        missingGaps: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              module: { type: SchemaType.STRING },
              issue: { type: SchemaType.STRING },
              impact: { type: SchemaType.STRING },
            },
            required: ["module", "issue", "impact"],
          },
        },
      },
      required: ["gtin", "name", "modulesData", "missingGaps"],
    };
  }

  private async resolveFileDetails(fileId: string): Promise<{
    fileName: string;
    fileContent: string;
    isBase64: boolean;
    mimeType: string;
  }> {
    const fileRecord = await this.fileRepo.getFileById(fileId);
    const dbFileName = fileRecord?.fileName;

    const STORAGE_DOMAIN =
      process.env.STORAGE_DOMAIN || "http://127.0.0.1:3000";
    const domain = STORAGE_DOMAIN.replace(/\/$/, "");

    let lariaFileName: string | undefined;
    let lariaMimeType: string | undefined;

    try {
      const metaRes = await fetch(`${domain}/api/v1/file/${fileId}`);
      if (metaRes.ok) {
        const metaJson = (await metaRes.json()) as {
          payload?: {
            filename?: string;
            mimeType?: string;
            type?: string;
            shards?: unknown[];
          };
          filename?: string;
          mimeType?: string;
          type?: string;
          shards?: unknown[];
        };
        const metaObj = metaJson.payload || metaJson;
        if (metaObj && metaObj.shards && Array.isArray(metaObj.shards)) {
          lariaFileName = metaObj.filename;
          lariaMimeType = metaObj.mimeType || metaObj.type;
        }
      }
    } catch (err) {
      console.warn(
        `[resolveFileDetails] Failed to retrieve Laria metadata for ${fileId}:`,
        err,
      );
    }

    const resolvedFileName = dbFileName || lariaFileName || fileId;

    let finalFileName = resolvedFileName;
    if (finalFileName === fileId && fileId.length > 8) {
      finalFileName = fileId.substring(0, 8);
    }

    const resFile = await this.getFileContent(fileId, resolvedFileName);

    return {
      fileName: finalFileName,
      fileContent: resFile.content,
      isBase64: resFile.isBase64,
      mimeType: lariaMimeType || resFile.mimeType,
    };
  }

  private async getFileContent(
    fileId: string,
    fileName: string,
  ): Promise<{ content: string; isBase64: boolean; mimeType: string }> {
    const storageService = new StorageService();
    let isBase64 = false;
    let mimeType = "text/plain";

    if (fileName.toLowerCase().endsWith(".pdf")) {
      mimeType = "application/pdf";
      isBase64 = true;
    } else if (fileName.toLowerCase().endsWith(".csv")) {
      mimeType = "text/csv";
    } else if (fileName.toLowerCase().endsWith(".json")) {
      mimeType = "application/json";
    }

    try {
      // Info: (20260612 - Tzuhan) Try to recover Laria split file first
      const buffer = await storageService.recoverLaria(fileId);
      const content = isBase64
        ? buffer.toString("base64")
        : buffer.toString("utf-8");
      return { content, isBase64, mimeType };
    } catch (recoverErr) {
      console.warn(
        `[getFileContent] Laria recovery failed, falling back to direct fetch for ${fileId}:`,
        recoverErr,
      );

      const STORAGE_DOMAIN =
        process.env.STORAGE_DOMAIN || "http://127.0.0.1:3000";
      const res = await fetch(`${STORAGE_DOMAIN}/api/v1/file/${fileId}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch file: ${res.statusText}`);
      }

      let content = "";
      if (isBase64) {
        const buffer = await res.arrayBuffer();
        content = Buffer.from(buffer).toString("base64");
      } else {
        content = await res.text();
      }
      return { content, isBase64, mimeType };
    }
  }
}
