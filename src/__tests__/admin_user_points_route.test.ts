import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { NextRequest } from "next/server";
import * as pointsRoute from "@/app/api/v1/admin/user/[user_id]/points/route";
import * as teamAllocationsRoute from "@/app/api/v1/admin/user/[user_id]/team_allocations/route";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import {
  getAdminUserPoints,
  listAdminUserTeamAllocations,
} from "@/services/admin_user_points.service";
import { Role } from "@/constants/role";

/**
 * Info: (20261015 - Luphia) 後台「點數明細」兩支端點的接線。
 *
 * 個人點數帳本與團隊分配紀錄是用戶的財務資料：只有平台管理員（SUPER_ADMIN / ADMIN）能看，
 * 一般用戶即使登入也必須在進入 service 之前被擋下。直接呼叫 route handler（測函式不等於測接線）。
 */

jest.mock("@/lib/auth/dewt", () => ({
  getIdentityFromDeWT: jest.fn(),
}));

jest.mock("@/services/admin_user_points.service", () => ({
  getAdminUserPoints: jest.fn(async () => ({ userId: "target-1" })),
  listAdminUserTeamAllocations: jest.fn(async () => ({
    items: [],
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
  })),
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

const ROUTES = [
  {
    name: "points",
    handler: pointsRoute.GET,
    service: getAdminUserPoints,
    module: pointsRoute,
  },
  {
    name: "team_allocations",
    handler: teamAllocationsRoute.GET,
    service: listAdminUserTeamAllocations,
    module: teamAllocationsRoute,
  },
];

function get(
  name: string,
  query: Record<string, string | undefined> = {},
): { request: NextRequest; params: Promise<{ user_id: string }> } {
  const url = new URL(`https://isunfa.com/api/v1/admin/user/target-1/${name}`);
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined) url.searchParams.set(k, v);
  }
  return {
    request: new NextRequest(url, {
      headers: { authorization: "Bearer dewt" },
    }),
    params: Promise.resolve({ user_id: "target-1" }),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  asMock(getIdentityFromDeWT).mockResolvedValue({
    id: "admin-1",
    role: Role.ADMIN,
  });
});

describe.each(ROUTES)(
  "GET /api/v1/admin/user/[user_id]/$name",
  ({ name, handler, service, module }) => {
    it.each([Role.SUPER_ADMIN, Role.ADMIN])("%s 拿得到資料", async (role) => {
      asMock(getIdentityFromDeWT).mockResolvedValue({ id: "admin-1", role });
      const { request, params } = get(name);

      const response = await handler(request, { params });

      expect(response.status).toBe(200);
      expect(service).toHaveBeenCalledWith({
        userId: "target-1",
        page: 1,
        pageSize: 20,
      });
    });

    it("一般用戶不得查詢，且不進入 service", async () => {
      asMock(getIdentityFromDeWT).mockResolvedValue({
        id: "user-9",
        role: Role.USER,
      });
      const { request, params } = get(name);

      const response = await handler(request, { params });

      expect(response.status).not.toBe(200);
      expect(service).not.toHaveBeenCalled();
    });

    it("未登入時不進入 service", async () => {
      asMock(getIdentityFromDeWT).mockResolvedValue(null);
      const { request, params } = get(name);

      const response = await handler(request, { params });

      expect(response.status).not.toBe(200);
      expect(service).not.toHaveBeenCalled();
    });

    it.each([
      { page: "0" },
      { page: "abc" },
      { pageSize: "0" },
      { pageSize: "101" },
    ])("分頁參數 %o 不合法時不進入 service", async (query) => {
      const { request, params } = get(name, query);

      const response = await handler(request, { params });

      expect(response.status).not.toBe(200);
      expect(service).not.toHaveBeenCalled();
    });

    it("分頁參數照傳", async () => {
      const { request, params } = get(name, { page: "3", pageSize: "50" });

      await handler(request, { params });

      expect(service).toHaveBeenCalledWith({
        userId: "target-1",
        page: 3,
        pageSize: 50,
      });
    });

    it("用戶不存在時回 404", async () => {
      asMock(service).mockResolvedValueOnce(null);
      const { request, params } = get(name);

      const response = await handler(request, { params });

      expect(response.status).toBe(404);
    });

    it("只提供 GET（唯讀）", () => {
      expect(Object.keys(module).sort()).toEqual(["GET"]);
    });
  },
);
