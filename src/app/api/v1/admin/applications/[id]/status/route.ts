import { updateApplicationStatus } from "@/services/solution.service";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";

/**
 * Info: (20260706 - Luphia) 管理後台：更新申請狀態
 * PATCH /api/v1/admin/applications/[id]/status
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return jsonFail(API_ERRORS.VA_STATUS_IS_REQUIRED);
    }

    const result = await updateApplicationStatus(id, status);

    return jsonOk(result);
  } catch (error) {
    console.error("[Admin Application Status API Error]:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
