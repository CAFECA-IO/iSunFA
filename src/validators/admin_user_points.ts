import { z } from "zod";
import { ADMIN_USER_POINTS_PAGE_SIZE } from "@/constants/admin_user_points";

/**
 * Info: (20261015 - Luphia) 後台「點數明細」兩支清單端點的分頁參數
 * （GET /api/v1/admin/user/[user_id]/points、/team_allocations）。
 */
export const adminUserPointsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(ADMIN_USER_POINTS_PAGE_SIZE.MAX)
    .default(ADMIN_USER_POINTS_PAGE_SIZE.DEFAULT),
});

export type AdminUserPointsQuery = z.infer<typeof adminUserPointsQuerySchema>;
