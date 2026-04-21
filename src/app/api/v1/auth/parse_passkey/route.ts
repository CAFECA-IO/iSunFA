import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { webAuthnService } from "@/services/webauthn.service";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { AppError } from "@/lib/utils/error";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { registration, challenge } = body;

    if (!registration || !challenge) {
      throw new AppError(API_ERRORS.VL_MISSING_PARAMS);
    }

    // Info: (20251223 - Tzuhan) 呼叫 Service 解析 Passkey，取得 x, y 座標與 Credential ID
    const result = await webAuthnService.parseRegistrationCredential(
      registration,
      challenge,
    );

    return jsonOk(result);
  } catch (error) {
    console.error("[API] Parse Passkey Error:", error);

    if (error instanceof AppError) {
      return jsonFail(API_ERRORS.IS_UNKNOWN);
    }

    return jsonFail({ code: "VA000099", message: "Failed to parse passkey cre...", status: ApiCode.VALIDATION_ERROR },  );
  }
}
