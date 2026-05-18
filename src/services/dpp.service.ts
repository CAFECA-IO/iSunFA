import { DppRepository } from "@/repositories/dpp.repo";
import {
  IDigitalProductPassportBatch,
  IDigitalProductPassportSku,
} from "@/interfaces/dpp";
import { ApiError } from "@/lib/utils/error_dictionary";
import { ApiCode } from "@/lib/utils/status";
import { DPP_SKU_STATUS } from "@/constants/status";

export class DppService {
  private dppRepo: DppRepository;

  constructor() {
    this.dppRepo = new DppRepository();
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
    const dynamicOverrides = {
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
     * Info: (20260513 - Luphia) Mock AI Analysis Workflow ---
     * Normally, we would send these files to our LangChain/LLM pipeline
     * to map against the 9 DPP modules and identify missing required gaps.
     */

    const mockGtin = `GTIN-${Date.now()}`;
    const mockName = `Product SKU based on document ${fileIds[0] ? fileIds[0].substring(0, 8) : "Unknown Document"}`;
    const mockModulesData = {
      "1_product_info": { extracted: true },
      "2_environmental_impact": { extracted: true },
      "3_circularity": { extracted: true },
      "4_compliance": { extracted: false },
      "5_social_impact": { extracted: false },
      "6_repairability": { extracted: false },
      "7_logistics": { extracted: true },
      "8_critical_raw_materials": { extracted: true },
      "9_material_composition": { extracted: false },
    };

    const mockMissingGaps = [
      {
        module: "6.1 Repair & Teardown Guidelines",
        issue:
          "No circuit diagrams or mainboard layout found in uploaded documents.",
        impact: "High",
      },
      {
        module: "9.3 Hazardous Chemicals (PFAS)",
        issue: "Missing declaration of exact locations of hazardous materials.",
        impact: "Critical",
      },
    ];

    const sku = await this.dppRepo.createSku({
      accountBookId,
      gtin: mockGtin,
      name: mockName,
      status: DPP_SKU_STATUS.INCOMPLETE, // Info: (20260513 - Luphia) Because there are missing gaps
      modulesData: mockModulesData,
      missingGaps: mockMissingGaps,
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
