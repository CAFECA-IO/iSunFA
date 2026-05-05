import { campaignRepo } from "@/repositories/campaign.repo";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }

    const campaign = await campaignRepo.findByCode(code.toUpperCase());

    if (!campaign || !campaign.isActive) {
      return jsonFail(API_ERRORS.NF_CAMPAIGN);
    }

    const now = new Date();
    if (now < campaign.startDate || now > campaign.endDate) {
      return jsonFail(API_ERRORS.VL_CAMPAIGN_EXPIRED);
    }

    return jsonOk({
      id: campaign.id,
      code: campaign.code,
      name: campaign.name,
      description: campaign.description,
      bonusPoints: campaign.bonusPoints,
      bonusModules: campaign.bonusModules,
    });
  } catch (error) {
    console.error("Failed to verify campaign:", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
