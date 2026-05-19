import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { couponService } from "@/services/coupon.service";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization") || "";
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    const coupons = await couponService.getUserCoupons(user.id);

    return jsonOk(coupons);
  } catch (error) {
    console.error("Failed to fetch user coupons:", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
