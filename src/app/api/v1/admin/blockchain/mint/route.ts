import { mintIcpAction } from "@/services/admin.blockchain.service";
import { jsonFail, jsonOk } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { validateAdminFido2 } from "@/lib/auth/admin_validator";

export async function POST(req: Request) {
  try {
    const { body } = await validateAdminFido2(req);

    // Info: (20260416 - Luphia) Parse body for amount
    if (typeof body.amount !== "number" || body.amount <= 0) {
      return jsonFail(ApiCode.VALIDATION_ERROR, "Invalid minting amount");
    }

    /**
     * Info: (20260416 - Luphia) Pass the token associated with the Request session back into the core, or rewrite action to skip token check
     * since validateAdminFido2 just did the Role + Session check. However, blockchain.service still does `enforceAdminRole`.
     * Wait, let's keep passing the token to satisfy service or just pass it directly.
     */
    const authHeader = req.headers.get("authorization");
    const token = authHeader ? authHeader.replace("Bearer ", "") : "";

    const result = await mintIcpAction(body.amount, token);

    if (!result.success) {
      return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, result.message || "Minting failed");
    }

    return jsonOk({ message: result.message });
  } catch (error) {
    return jsonFail(ApiCode.UNAUTHORIZED, (error as Error).message);
  }
}
