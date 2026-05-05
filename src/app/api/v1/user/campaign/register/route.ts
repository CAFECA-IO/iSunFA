import { campaignRepo } from "@/repositories/campaign.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { issuePurchasedPointsToMember } from "@/services/member.service";

export async function POST(req: Request) {
  try {
    const user = await getIdentityFromDeWT(req.headers.get("authorization"));
    if (!user) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const body = await req.json();
    const { campaignCode, entityType, entityName, contactEmail, contactPhone } =
      body;

    if (
      !campaignCode ||
      !entityType ||
      !entityName ||
      !contactEmail ||
      !contactPhone
    ) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }

    const campaign = await campaignRepo.findByCode(campaignCode.toUpperCase());

    if (!campaign || !campaign.isActive) {
      return jsonFail(API_ERRORS.NF_CAMPAIGN);
    }

    const now = new Date();
    if (now < campaign.startDate || now > campaign.endDate) {
      return jsonFail(API_ERRORS.VL_CAMPAIGN_EXPIRED);
    }

    // Info: (20260504 - Luphia) Check if user already registered for this campaign
    const existingRegistration = await campaignRepo.findRegistration(
      campaign.id,
      user.id,
    );

    if (existingRegistration) {
      return jsonFail(API_ERRORS.VL_CAMPAIGN_ALREADY_REGISTERED);
    }

    // Info: (20260504 - Luphia) Create registration
    const registration = await campaignRepo.createRegistration({
      campaignId: campaign.id,
      userId: user.id,
      entityType,
      entityName,
      contactEmail,
      contactPhone,
    });

    // Info: (20260504 - Luphia) Issue bonus points
    if (campaign.bonusPoints > 0) {
      await issuePurchasedPointsToMember(user.address, campaign.bonusPoints);
    }

    // Info: (20260504 - Luphia) Bonus modules will be implemented when module access system is ready

    return jsonOk({
      registrationId: registration.id,
      bonusPoints: campaign.bonusPoints,
      bonusModules: campaign.bonusModules,
    });
  } catch (error) {
    console.error("Failed to register for campaign:", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
