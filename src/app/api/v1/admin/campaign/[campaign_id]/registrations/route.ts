import { campaignRepo } from "@/repositories/campaign.repo";
import { parsePositiveInt } from "@/lib/utils/pagination";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { Role } from "@/constants/role";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ campaign_id: string }> },
) {
  try {
    const user = await getIdentityFromDeWT(req.headers.get("authorization"));
    if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN)) {
      return jsonFail(API_ERRORS.AUTH_ADMIN_REQUIRED);
    }

    const { searchParams } = new URL(req.url);
    const page = parsePositiveInt(searchParams.get("page"), {
      fallback: 1,
    });
    const limit = parsePositiveInt(searchParams.get("limit"), {
      fallback: 15,
      max: 100,
    });
    const skip = (page - 1) * limit;

    const { campaign_id: campaignId } = await params;

    const { data, count } = await campaignRepo.findRegistrationsByCampaignId(
      campaignId,
      skip,
      limit,
    );

    return jsonOk({
      data,
      pagination: {
        page,
        limit,
        totalElements: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch campaign registrations:", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
