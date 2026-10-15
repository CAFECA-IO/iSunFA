import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { Role } from "@/constants/role";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { adminUserPointsQuerySchema } from "@/validators";
import { listAdminUserTeamAllocations } from "@/services/admin_user_points.service";

/**
 * Info: (20261015 - Luphia) GET /api/v1/admin/user/[user_id]/team_allocations（僅平台管理員）：
 * 指向該用戶的團隊分錄（ALLOCATE / REVOKE / 有 targetUserId 的 ADJUST），分頁、新到舊，
 * 每筆附「有沒有實際給到」的判定狀態（見 lib/quota/admin_user_points）。
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ user_id: string }> },
) {
  try {
    const user = await getIdentityFromDeWT(req.headers.get("authorization"));
    if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN)) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const { user_id: userId } = await params;
    if (!userId) return jsonFail(API_ERRORS.VL_MISSING_PARAMS);

    const { searchParams } = new URL(req.url);
    const parsed = adminUserPointsQuerySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
    });
    if (!parsed.success) return jsonFail(API_ERRORS.VL_SCHEMA_ERROR);

    const view = await listAdminUserTeamAllocations({ userId, ...parsed.data });
    if (!view) return jsonFail(API_ERRORS.NF_USER);
    return jsonOk(view);
  } catch {
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
