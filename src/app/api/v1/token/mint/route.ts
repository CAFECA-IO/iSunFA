import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { mintToAddress } from "@/services/token.service";
import { CONTRACT_ADDRESSES } from "@/config/contracts";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const { credits } = await request.json();

    if (!credits || credits <= 0) {
      return jsonFail(API_ERRORS.VL_BAD_AMOUNT);
    }

    const result = await mintToAddress(
      CONTRACT_ADDRESSES.CREDIT_POINT,
      user.address,
      credits,
    );

    if (!result.success) {
      return jsonFail({ code: "IS000099", message: String(result.message).slice(0, 30), status: ApiCode.INTERNAL_SERVER_ERROR });
    }

    return jsonOk({
      txHash: (result.data as { tx: string })?.tx,
      message: "Minting successful",
    });
  } catch (error) {
    console.error("[API] /token/mint error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
