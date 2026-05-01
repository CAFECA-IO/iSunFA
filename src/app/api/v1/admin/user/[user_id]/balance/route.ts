import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { publicClient } from "@/lib/viem";
import { CONTRACT_ADDRESSES, ABIS } from "@/config/contracts";
import { formatUnits } from "viem";
import { Role } from "@/generated/client";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ user_id: string }> },
) {
  try {
    const authHeader = req.headers.get("authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN)) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const { user_id: userId } = await params;
    if (!userId) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }

    const { webAuthnRepo } = await import("@/repositories/webauthn.repo");
    const targetUser = await webAuthnRepo.findUserById(userId);
    if (!targetUser) {
      return jsonFail(API_ERRORS.NF_USER);
    }
    const address = targetUser.address;

    const balance = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.CREDIT_POINT,
      abi: ABIS.CREDIT_POINT,
      functionName: "balanceOf",
      args: [address as `0x${string}`],
      blockTag: "pending",
    });

    return jsonOk(Number(formatUnits(balance, 18)));
  } catch (error) {
    return jsonFail({
      code: "IS000099",
      message: String((error as Error).message).slice(0, 30),
      status: ApiCode.INTERNAL_SERVER_ERROR,
    });
  }
}
