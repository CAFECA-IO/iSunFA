import { DppRepository } from "@/repositories/dpp.repo";
import { FileRepository } from "@/repositories/file.repo";
import {
  GoogleGenerativeAI,
  SchemaType,
  Schema,
  Part,
} from "@google/generative-ai";
import {
  IDigitalProductPassportBatch,
  IDigitalProductPassportSku,
} from "@/interfaces/dpp";
import { ApiError } from "@/lib/utils/error_dictionary";
import { ApiCode } from "@/lib/utils/status";
import { DPP_SKU_STATUS } from "@/constants/status";

export class DppService {
  private dppRepo: DppRepository;
  private fileRepo: FileRepository;

  constructor() {
    this.dppRepo = new DppRepository();
    this.fileRepo = new FileRepository();
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
    const publicUrl = `https://dpp.isunfa.com/dpp/sku/${skuId}/batch/${batchNumber}`;
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

    /**
     * Info: (20260611 - Tzuhan) Read file content to dynamically generate DPP modules
     */

    let fileName = "Unknown Document";
    let fileContent = "";
    let isBase64 = false;
    let mimeType = "text/plain";

    if (fileIds.length > 0) {
      const fileRecord = await this.fileRepo.getFileById(fileIds[0]);
      if (fileRecord) {
        fileName = fileRecord.fileName || fileRecord.id;
        if (fileName.toLowerCase().endsWith(".pdf")) {
          mimeType = "application/pdf";
          isBase64 = true;
        } else if (fileName.toLowerCase().endsWith(".csv")) {
          mimeType = "text/csv";
        } else if (fileName.toLowerCase().endsWith(".json")) {
          mimeType = "application/json";
        }

        try {
          const STORAGE_DOMAIN =
            process.env.STORAGE_DOMAIN || "http://127.0.0.1:3000";
          const res = await fetch(
            `${STORAGE_DOMAIN}/api/v1/file/${fileRecord.id}`,
          );
          if (res.ok) {
            if (isBase64) {
              const buffer = await res.arrayBuffer();
              fileContent = Buffer.from(buffer).toString("base64");
            } else {
              fileContent = await res.text();
            }
          }
        } catch (err) {
          console.error("Failed to read file from storage", err);
        }
      } else {
        fileName = fileIds[0].substring(0, 8);
      }
    }

    let parsedGtin = `GTIN-${Date.now()}`;
    let parsedName = `Product SKU based on ${fileName}`;
    let parsedModulesData: Record<string, { extracted: boolean }> = {
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
    let parsedMissingGaps: { module: string; issue: string; impact: string }[] =
      [
        {
          module: "General",
          issue: "Document format unsupported or content empty.",
          impact: "High",
        },
      ];

    if (
      fileContent &&
      !fileName.toLowerCase().endsWith(".docx") &&
      !fileName.toLowerCase().endsWith(".pages")
    ) {
      try {
        const genAI = new GoogleGenerativeAI(
          process.env.GEMINI_API_KEY as string,
        );
        const dppExtractionSchema: Schema = {
          type: SchemaType.OBJECT,
          properties: {
            gtin: { type: SchemaType.STRING },
            name: { type: SchemaType.STRING },
            modulesData: {
              type: SchemaType.OBJECT,
              properties: {
                "1_product_info": {
                  type: SchemaType.OBJECT,
                  properties: { extracted: { type: SchemaType.BOOLEAN } },
                },
                "2_environmental_impact": {
                  type: SchemaType.OBJECT,
                  properties: { extracted: { type: SchemaType.BOOLEAN } },
                },
                "3_circularity": {
                  type: SchemaType.OBJECT,
                  properties: { extracted: { type: SchemaType.BOOLEAN } },
                },
                "4_compliance": {
                  type: SchemaType.OBJECT,
                  properties: { extracted: { type: SchemaType.BOOLEAN } },
                },
                "5_social_impact": {
                  type: SchemaType.OBJECT,
                  properties: { extracted: { type: SchemaType.BOOLEAN } },
                },
                "6_repairability": {
                  type: SchemaType.OBJECT,
                  properties: { extracted: { type: SchemaType.BOOLEAN } },
                },
                "7_logistics": {
                  type: SchemaType.OBJECT,
                  properties: { extracted: { type: SchemaType.BOOLEAN } },
                },
                "8_critical_raw_materials": {
                  type: SchemaType.OBJECT,
                  properties: { extracted: { type: SchemaType.BOOLEAN } },
                },
                "9_material_composition": {
                  type: SchemaType.OBJECT,
                  properties: { extracted: { type: SchemaType.BOOLEAN } },
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
              },
            },
          },
        };

        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-pro",
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: dppExtractionSchema,
            temperature: 0.1,
          },
        });

        const prompt = `You are a Digital Product Passport (DPP) compliance auditor. Analyze the provided document for the product and determine which DPP modules are covered. Generate GTIN if possible, or create a mock one based on the context. Ensure you output a boolean for each module in modulesData. Create missingGaps for any missing critical information (especially Environmental Impact, Compliance, Repairability). Impact should be 'High', 'Medium', or 'Critical'. Document File name: ${fileName}`;

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

    // Info: (20260611 - Tzuhan) Determine final status based on whether there are critical missing gaps
    const finalStatus =
      parsedMissingGaps.length === 0
        ? DPP_SKU_STATUS.READY
        : DPP_SKU_STATUS.INCOMPLETE;

    const sku = await this.dppRepo.createSku({
      accountBookId,
      gtin: parsedGtin,
      name: parsedName,
      status: finalStatus,
      modulesData: parsedModulesData,
      missingGaps: parsedMissingGaps,
    });

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
}
