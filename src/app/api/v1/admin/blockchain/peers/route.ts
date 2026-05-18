import { addPeerAction } from "@/services/admin.blockchain.service";
import { jsonFail, jsonOk } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return jsonFail(API_ERRORS.AUTH_MISSING_HEADER);
    const token = authHeader.replace("Bearer ", "");

    const body = await req.json();
    if (!body.enodeUrl) {
      return jsonFail(API_ERRORS.IS_MISSING_ENODEURL);
    }

    const result = await addPeerAction(body.enodeUrl, token);

    if (!result.success) {
      return jsonFail({
        ...API_ERRORS.IS_BLOCKCHAIN_FAILED,
        message: String(result.message || "Failed to add peer"),
      });
    }

    return jsonOk({ message: result.message });
  } catch (error) {
    console.error("[API] /admin/blockchain/peers POST error:", error);
    return jsonFail({
      ...API_ERRORS.IS_UNKNOWN,
      message: String((error as Error).message),
    });
  }
}
