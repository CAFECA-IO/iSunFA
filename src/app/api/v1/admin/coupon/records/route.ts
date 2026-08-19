import { jsonOk, jsonFail } from "@/lib/utils/response";
import { parsePositiveInt } from "@/lib/utils/pagination";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { couponService } from "@/services/coupon.service";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { validateAdminFido2 } from "@/lib/auth/admin_validator";
import { Role } from "@/constants/role";

export async function GET(req: Request) {
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
    const campaignId = searchParams.get("campaignId") || undefined;
    const search = searchParams.get("search") || undefined;

    const result = await couponService.getCoupons(
      page,
      limit,
      campaignId,
      search,
    );
    return jsonOk(result);
  } catch (error) {
    console.error("Failed to fetch coupon records:", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}

export async function POST(req: Request) {
  try {
    // Info: (20260525 - Luphia) Enforce SUPER_ADMIN/ADMIN fido2 validation
    const { body } = await validateAdminFido2(req);

    const { couponId } = body;
    if (typeof couponId !== "string" || !couponId) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }

    const updatedCoupon = await couponService.forceResetCouponStatus(couponId);
    return jsonOk(updatedCoupon);
  } catch (error) {
    console.error("Failed to reset coupon record:", error);
    return jsonFail({
      ...API_ERRORS.IS_UNKNOWN,
      message: String((error as Error).message).slice(0, 50),
    });
  }
}
