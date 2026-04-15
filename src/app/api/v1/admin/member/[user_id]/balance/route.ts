import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { publicClient } from "@/lib/viem";
import { CONTRACT_ADDRESSES, ABIS } from "@/config/contracts";
import { formatUnits } from "viem";
import { Role } from "@/generated/enums";
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
      return jsonFail(ApiCode.UNAUTHORIZED, "Unauthorized");
    }

    const { user_id: userId } = await params;
    if (!userId) {
      return jsonFail(ApiCode.VALIDATION_ERROR, "Missing user_id");
    }

    const { webAuthnRepo } = await import("@/repositories/webauthn.repo");
    const targetUser = await webAuthnRepo.findUserById(userId);
    if (!targetUser) {
      return jsonFail(ApiCode.NOT_FOUND, "Missing user");
    }
    const address = targetUser.address;

    const balance = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.CREDIT_POINT,
      abi: ABIS.CREDIT_POINT,
      functionName: "balanceOf",
      args: [address as `0x${string}`],
    });

    return jsonOk(Number(formatUnits(balance, 18)));
  } catch (error) {
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, (error as Error).message);
  }
}
