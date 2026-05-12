import { addPeerAction } from "@/services/admin.blockchain.service";
import { jsonFail, jsonOk } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { API_ERRORS } from "@/lib/utils/error_dictionary";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return jsonFail(API_ERRORS.AUTH_MISSING_HEADER);
    const token = authHeader.replace("Bearer ", "");

    const body = await req.json();
    if (!body.enodeUrl) {
      return jsonFail({
        code: "IS000098",
        message: "Missing enodeUrl",
        status: ApiCode.VALIDATION_ERROR,
      });
    }

    const result = await addPeerAction(body.enodeUrl, token);

    if (!result.success) {
      return jsonFail({
        code: "IS000099",
        message: String(result.message || "Failed to add peer"),
        status: ApiCode.INTERNAL_SERVER_ERROR,
      });
    }

    return jsonOk({ message: result.message });
  } catch (error) {
    return jsonFail({
      code: "IS000099",
      message: String((error as Error).message),
      status: ApiCode.INTERNAL_SERVER_ERROR,
    });
  }
}
