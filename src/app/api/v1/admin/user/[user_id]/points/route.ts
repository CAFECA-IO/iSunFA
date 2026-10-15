import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { Role } from "@/constants/role";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { adminUserPointsQuerySchema } from "@/validators";
import { getAdminUserPoints } from "@/services/admin_user_points.service";

/**
 * Info: (20261015 - Luphia) GET /api/v1/admin/user/[user_id]/points（僅平台管理員）：
 * 個人點數餘額與帳本加總、依型別加總、各團隊實際分配給他的點數，以及分頁的個人帳本。
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

    const view = await getAdminUserPoints({ userId, ...parsed.data });
    if (!view) return jsonFail(API_ERRORS.NF_USER);
    return jsonOk(view);
  } catch {
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
