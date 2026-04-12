import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { registerUserViaMembership } from "@/services/member.service";
import { CONTRACT_ADDRESSES } from "@/config/contracts";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(ApiCode.UNAUTHORIZED, "Invalid or expired token");
    }

    const body = await request.json();

    // Info: (20260202 - Tzuhan) Update KYC Data
    // const updatedUser = await webAuthnRepo.updateKYCData(user.id, body);
    console.log(
      "[API] KYC Data updated for user:",
      user.address,
      "kycData:",
      body,
    );

    console.log(
      "[API] Registering identity for:",
      user.address,
      "at Token:",
      CONTRACT_ADDRESSES.CREDIT_POINT,
    );

    if (!CONTRACT_ADDRESSES.CREDIT_POINT) {
      throw new Error("Server Config Error: NTD Token Address is missing");
    }

    const result = await registerUserViaMembership(user.address);

    if (!result.success) {
      console.error("Identity registration failed:", result.message);
      return jsonFail(
        ApiCode.INTERNAL_SERVER_ERROR,
        `KYC saved but Identity deployment failed: ${result.message}`,
      );
    }

    try {
      // Info: (20260412 - Luphia) In the enterprise version, KYC is attached directly to the user address
      const identityAddress = user.address;

      return jsonOk({
        identityDeployment: result,
        identityAddress,
      });
    } catch (e) {
      console.warn("Failed to update identity address:", e);
      return jsonFail(
        ApiCode.INTERNAL_SERVER_ERROR,
        "Failed to update identity address",
      );
    }
  } catch (error) {
    console.error("[API] /user/kyc error:", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Internal Server Error");
  }
}
