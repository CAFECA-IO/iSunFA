import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { couponService } from "@/services/coupon.service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "15", 10);
    const result = await couponService.getCampaigns(page, limit);

    return jsonOk(result);
  } catch (error) {
    console.error("Failed to fetch coupon campaigns:", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      title,
      metadataHash,
      claimCode,
      redemptionDeadline,
      usageDeadline,
      maxClaims,
      isTransferable,
      customQrContent,
    } = body;

    // Info: (20260517 - Luphia) Basic validation
    if (!title || !metadataHash || !redemptionDeadline || !usageDeadline) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }

    const campaign = await couponService.createCampaign({
      title,
      metadataHash,
      claimCode,
      redemptionDeadline,
      usageDeadline,
      maxClaims,
      isTransferable,
      customQrContent,
    });

    return jsonOk(campaign);
  } catch (error) {
    console.error("Failed to create coupon campaign:", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
