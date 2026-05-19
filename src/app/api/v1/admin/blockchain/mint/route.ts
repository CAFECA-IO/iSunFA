import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { mintIcpAction } from "@/services/admin.blockchain.service";
import { jsonFail, jsonOk } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { validateAdminFido2 } from "@/lib/auth/admin_validator";

export async function POST(req: Request) {
  try {
    const { body } = await validateAdminFido2(req);

    // Info: (20260416 - Luphia) Parse body for amount
    if (typeof body.amount !== "number" || body.amount <= 0) {
      return jsonFail(API_ERRORS.VA_INVALID_MINTING_AMOUNT);
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
      return jsonFail({
        code: "IS000099",
        message: String(result.message || "Minting failed").slice(0, 30),
        status: ApiCode.INTERNAL_SERVER_ERROR,
      });
    }

    return jsonOk({ message: result.message });
  } catch (error) {
    return jsonFail({
      code: "AU000099",
      message: String((error as Error).message).slice(0, 30),
      status: ApiCode.UNAUTHORIZED,
    });
  }
}
