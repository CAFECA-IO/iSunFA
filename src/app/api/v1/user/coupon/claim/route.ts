import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { couponService } from "@/services/coupon.service";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization") || "";
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    const body = await request.json();
    const { claimCode } = body;

    if (!claimCode) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }

    const record = await couponService.claimCoupon(user.id, claimCode);

    return jsonOk(record);
  } catch (error: unknown) {
    console.error("Failed to claim coupon:", error);
    if (error instanceof Error) {
      if (error.message === "Invalid claim code") {
        return jsonFail({
          ...API_ERRORS.VL_SCHEMA_ERROR,
          message: error.message,
        });
      }
      if (error.message === "Coupon redemption period has expired") {
        return jsonFail(API_ERRORS.VL_CAMPAIGN_EXPIRED);
      }
      if (error.message === "User has already claimed this coupon") {
        return jsonFail(API_ERRORS.VL_CAMPAIGN_ALREADY_REGISTERED);
      }
      if (error.message === "Coupon is fully claimed") {
        return jsonFail({
          ...API_ERRORS.VL_SCHEMA_ERROR,
          message: error.message,
        });
      }
    }
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
