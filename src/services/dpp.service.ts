import { DppRepository } from "@/repositories/dpp.repo";
import { FileRepository } from "@/repositories/file.repo";
import { Prisma } from "@/generated";
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
        const dppExtractionSchema = this.getDppExtractionSchema();

        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-pro",
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: dppExtractionSchema,
            temperature: 0.1,
          },
        });

        const prompt = `You are a Digital Product Passport (DPP) compliance auditor. Analyze the provided document for the product.
For each module in modulesData:
1. If the document contains information for that module, set "extracted" to true and populate the "data" object with the extracted fields.
2. If the document does not contain information for that module, set "extracted" to false and omit or leave "data" empty.
3. For any module that is not covered or has missing critical information, list it in "missingGaps" with a description of the missing info in "issue", and its "impact" ('High', 'Medium', or 'Critical').

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
      modulesData: parsedModulesData as Prisma.InputJsonValue,
      missingGaps: parsedMissingGaps as Prisma.InputJsonValue,
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

    const fileRecord = await this.fileRepo.getFileById(fileId);
    if (!fileRecord) {
      throw new ApiError(
        "ISDPP008",
        "Supplement file not found",
        ApiCode.NOT_FOUND,
      );
    }

    const fileName = fileRecord.fileName || fileRecord.id;
    let fileContent = "";
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
      const STORAGE_DOMAIN =
        process.env.STORAGE_DOMAIN || "http://127.0.0.1:3000";
      const res = await fetch(`${STORAGE_DOMAIN}/api/v1/file/${fileRecord.id}`);
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
      throw new ApiError(
        "ISDPP009",
        "Failed to read supplement file",
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

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
    const dppExtractionSchema = this.getDppExtractionSchema();

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-pro",
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
}
