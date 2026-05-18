import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { couponService } from "@/services/coupon.service";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await props.params;
    const body = await request.json();
    const { userIds, users } = body;

    let airdropUsers: { userId: string; customQrContent?: string }[] = [];

    if (Array.isArray(users)) {
      airdropUsers = users;
    } else if (Array.isArray(userIds)) {
      airdropUsers = userIds.map((id) => ({ userId: id }));
    }

    if (airdropUsers.length === 0) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }

    const result = await couponService.airdrop(id, airdropUsers);

    return jsonOk(result);
  } catch (error: unknown) {
    console.error("Failed to airdrop coupon:", error);
    if (
      error instanceof Error &&
      error.message === "Exceeds max claims limit"
    ) {
      return jsonFail({
        ...API_ERRORS.VL_SCHEMA_ERROR,
        message: error.message,
      });
    }
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
