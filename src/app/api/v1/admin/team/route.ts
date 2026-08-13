import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { Role } from "@/generated";
import { prisma } from "@/lib/prisma";

/**
 * Info: (20260813 - Luphia) 後台團隊清單（供 /admin/user 的「發放點數給團隊」選擇對象）。
 *
 * 只回發放所需的欄位：團隊名稱、成員數與錢包未分配池餘額。
 * 餘額一併回傳是為了讓管理員發放前看得到現況——否則他只能憑印象決定發多少。
 */
export async function GET(req: Request) {
  try {
    const user = await getIdentityFromDeWT(req.headers.get("authorization"));
    if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN)) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "50", 10), 1),
      200,
    );

    const teams = await prisma.team.findMany({
      where: search
        ? { name: { contains: search, mode: "insensitive" } }
        : undefined,
      select: {
        id: true,
        name: true,
        _count: { select: { teamMembers: true } },
      },
      orderBy: { name: "asc" },
      take: limit,
    });

    // Info: (20260813 - Luphia) 錢包為選配（未購點的團隊尚無錢包列），查無即視為 0
    const wallets = await prisma.teamWallet.findMany({
      where: { teamId: { in: teams.map((team) => team.id) } },
      select: { teamId: true, unallocatedBalance: true },
    });
    const balanceByTeam = new Map(
      wallets.map((wallet) => [
        wallet.teamId,
        wallet.unallocatedBalance.toString(),
      ]),
    );

    return jsonOk(
      teams.map((team) => ({
        id: team.id,
        name: team.name,
        memberCount: team._count.teamMembers,
        unallocatedBalance: balanceByTeam.get(team.id) ?? "0",
      })),
    );
  } catch (error) {
    console.error("[API] /admin/team GET error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
