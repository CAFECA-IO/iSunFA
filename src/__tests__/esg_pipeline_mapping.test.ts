import { VoucherPipelineOrchestrator } from "@/services/voucher.pipeline.orchestrator";
import { GhgProtocolCategory, Iso14064Category } from "@/constants/esg";
import type { IAggregatedDocumentResult } from "@/skills/utils/document_parser_db_sync";
import { describe, it, expect } from "@jest/globals";

describe("VoucherPipelineOrchestrator - GHG and ISO Categories Alignment", () => {
  it("should align categories based on activityType ELECTRICITY_USAGE", async () => {
    const payload: IAggregatedDocumentResult = {
      esg: {
        activityType: "ELECTRICITY_USAGE",
        vendor: "Taiwan Power Company",
        amount: 100,
        unit: "kWh",
      },
    };

    const result = await VoucherPipelineOrchestrator.executePipeline(
      payload,
      "TWD",
      "TW",
    );

    expect(result.esg?.ghgProtocolCategory).toBe(
      GhgProtocolCategory.SCOPE_2_INDIRECT,
    );
    expect(result.esg?.isoCategory).toBe(Iso14064Category.CATEGORY_2);
  });

  it("should align categories based on activityType STATIONARY_COMBUSTION", async () => {
    const payload: IAggregatedDocumentResult = {
      esg: {
        activityType: "STATIONARY_COMBUSTION",
        vendor: "CPC Corporation",
        amount: 50,
        unit: "L",
      },
    };

    const result = await VoucherPipelineOrchestrator.executePipeline(
      payload,
      "TWD",
      "TW",
    );

    expect(result.esg?.ghgProtocolCategory).toBe(
      GhgProtocolCategory.SCOPE_1_DIRECT,
    );
    expect(result.esg?.isoCategory).toBe(Iso14064Category.CATEGORY_1);
  });

  it("should align categories based on activityType PURCHASED_GOODS", async () => {
    const payload: IAggregatedDocumentResult = {
      esg: {
        activityType: "PURCHASED_GOODS",
        vendor: "Office Supplies Vendor",
        amount: 500,
        unit: "TWD",
      },
    };

    const result = await VoucherPipelineOrchestrator.executePipeline(
      payload,
      "TWD",
      "TW",
    );

    expect(result.esg?.ghgProtocolCategory).toBe(
      GhgProtocolCategory.SCOPE_3_CAT_1,
    );
    expect(result.esg?.isoCategory).toBe(Iso14064Category.CATEGORY_4);
  });
});
