import { campaignRepo } from "@/repositories/campaign.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { Role } from "@/constants/role";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ campaign_id: string }> },
) {
  try {
    const user = await getIdentityFromDeWT(req.headers.get("authorization"));
    if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN)) {
      return jsonFail(API_ERRORS.AUTH_ADMIN_REQUIRED);
    }

    const body = await req.json();
    const {
      code,
      name,
      description,
      startDate,
      endDate,
      bonusPoints,
      bonusModules,
      isActive,
    } = body;

    const { campaign_id: campaignId } = await params;

    const updatedCampaign = await campaignRepo.update(campaignId, {
      ...(code !== undefined && { code }),
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(startDate !== undefined && { startDate: new Date(startDate) }),
      ...(endDate !== undefined && { endDate: new Date(endDate) }),
      ...(bonusPoints !== undefined && { bonusPoints: Number(bonusPoints) }),
      ...(bonusModules !== undefined && {
        bonusModules: Array.isArray(bonusModules) ? bonusModules : [],
      }),
      ...(isActive !== undefined && { isActive: Boolean(isActive) }),
    });

    return jsonOk(updatedCampaign);
  } catch (error) {
    console.error("Failed to update campaign:", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ campaign_id: string }> },
) {
  try {
    const user = await getIdentityFromDeWT(req.headers.get("authorization"));
    if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN)) {
      return jsonFail(API_ERRORS.AUTH_ADMIN_REQUIRED);
    }

    const { campaign_id: campaignId } = await params;
    await campaignRepo.delete(campaignId);

    return jsonOk(null);
  } catch (error) {
    console.error("Failed to delete campaign:", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
