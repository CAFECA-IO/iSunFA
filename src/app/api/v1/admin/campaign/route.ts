import { campaignRepo } from "@/repositories/campaign.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { Role } from "@/constants/role";
import { MoneyUtil } from "@/lib/utils/money";

export async function GET(req: Request) {
  try {
    const user = await getIdentityFromDeWT(req.headers.get("authorization"));
    if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN)) {
      return jsonFail(API_ERRORS.AUTH_ADMIN_REQUIRED);
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "15", 10);
    const skip = (page - 1) * limit;

    const [campaigns, totalElements] = await Promise.all([
      campaignRepo.findManyWithParticipantCount(skip, limit),
      campaignRepo.count(),
    ]);

    const formattedData = campaigns.map((c) => ({
      ...c,
      participantCount: c._count.registrations,
      totalPointsIssued: c._count.registrations * c.bonusPoints,
    }));

    return jsonOk({
      data: formattedData,
      pagination: {
        page,
        limit,
        totalElements,
        totalPages: Math.ceil(totalElements / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch campaigns:", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}

export async function POST(req: Request) {
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

    const newCampaign = await campaignRepo.create({
      code,
      name,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      bonusPoints: MoneyUtil.toDecimal(bonusPoints).toNumber(),
      bonusModules: Array.isArray(bonusModules) ? bonusModules : [],
      isActive: Boolean(isActive),
    });

    return jsonOk(newCampaign);
  } catch (error) {
    console.error("Failed to create campaign:", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
