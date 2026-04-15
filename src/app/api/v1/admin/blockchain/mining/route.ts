import { toggleMiningAction } from "@/services/admin.blockchain.service";
import { jsonFail, jsonOk } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { validateAdminFido2 } from "@/lib/auth/admin_validator";

export async function POST(req: Request) {
  try {
    const { body } = await validateAdminFido2(req);

    // Info: (20260416 - Luphia) Parse body for state
    if (typeof body.state !== "boolean") {
      return jsonFail(ApiCode.VALIDATION_ERROR, "Invalid mining state");
    }

    const authHeader = req.headers.get("authorization");
    const token = authHeader ? authHeader.replace("Bearer ", "") : "";

    const result = await toggleMiningAction(body.state, token);

    if (!result.success) {
      return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, result.error || "Failed to toggle mining");
    }

    return jsonOk({ output: result.output });
  } catch (error) {
    return jsonFail(ApiCode.UNAUTHORIZED, (error as Error).message);
  }
}
