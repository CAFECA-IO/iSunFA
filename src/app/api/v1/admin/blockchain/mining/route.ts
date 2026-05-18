import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { toggleMiningAction } from "@/services/admin.blockchain.service";
import { jsonFail, jsonOk } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { validateAdminFido2 } from "@/lib/auth/admin_validator";

export async function POST(req: Request) {
  try {
    const { body } = await validateAdminFido2(req);

    // Info: (20260416 - Luphia) Parse body for state
    if (typeof body.state !== "boolean") {
      return jsonFail(API_ERRORS.VA_INVALID_MINING_STATE);
    }

    const authHeader = req.headers.get("authorization");
    const token = authHeader ? authHeader.replace("Bearer ", "") : "";

    const result = await toggleMiningAction(body.state, token);

    if (!result.success) {
      return jsonFail({
        code: "IS000099",
        message: String(result.error || "Failed to toggle mining").slice(0, 30),
        status: ApiCode.INTERNAL_SERVER_ERROR,
      });
    }

    return jsonOk({ output: result.output });
  } catch (error) {
    return jsonFail({
      code: "AU000099",
      message: String((error as Error).message).slice(0, 30),
      status: ApiCode.UNAUTHORIZED,
    });
  }
}
