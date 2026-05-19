import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { couponService } from "@/services/coupon.service";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { verifyChallengeToken } from "@/lib/auth/challenge_token";
import { webAuthnService } from "@/services/webauthn.service";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization") || "";
    const jwtUser = await getIdentityFromDeWT(authHeader);

    if (!jwtUser) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    // Info: (20260519 - Luphia) Parse body for FIDO2 signature
    const body = await request.json().catch(() => ({}));
    if (
      !body.fido2Signature ||
      !body.fido2Signature.authentication ||
      !body.fido2Signature.challengeToken
    ) {
      return jsonFail({
        ...API_ERRORS.VL_MISSING_PARAMS,
        message: "FIDO2 signature required",
      });
    }

    const { authentication, challengeToken } = body.fido2Signature;
    const expectedChallenge = await verifyChallengeToken(challengeToken);

    const isValid = await webAuthnService.verifySignature(
      jwtUser.address,
      authentication,
      expectedChallenge,
    );

    if (!isValid) {
      return jsonFail(API_ERRORS.UN_ERROR);
    }

    const { id } = await props.params;

    if (!id) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }

    const record = await couponService.useCoupon(jwtUser.id, id);

    let qrPayload = "";
    const customContent =
      record.customQrContent || record.campaign.customQrContent;
    if (customContent) {
      qrPayload = customContent
        .replace(/{userId}/g, record.userId)
        .replace(/{couponId}/g, record.id)
        .replace(/{campaignId}/g, record.campaignId);
    } else {
      qrPayload = JSON.stringify({
        couponId: record.id,
        campaignId: record.campaignId,
        userId: record.userId,
      });
    }

    return jsonOk({ record, qrPayload });
  } catch (error: unknown) {
    console.error("Failed to use coupon:", error);
    if (error instanceof Error) {
      if (error.message === "Coupon record not found") {
        return jsonFail({
          ...API_ERRORS.VL_SCHEMA_ERROR,
          message: error.message,
        });
      }
      if (error.message === "Coupon is not active") {
        return jsonFail({
          ...API_ERRORS.VL_SCHEMA_ERROR,
          message: error.message,
        });
      }
    }
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
