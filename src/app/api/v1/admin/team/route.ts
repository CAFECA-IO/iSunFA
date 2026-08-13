import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { Role, TeamRole } from "@/generated";
import { prisma } from "@/lib/prisma";

/**
 * Info: (20260813 - Luphia) 後台團隊清單（供 /admin/user 的「發放點數給團隊」選擇對象）。
 *
 * 實測資料：2,118 個團隊、僅 1,496 個不同名稱（622 個撞名），而名稱多為
 * 「<email>'s Team」。因此這支端點的設計圍繞「怎麼把對的那一個找出來」：
 *
 * 1. `userId`：列出**該用戶所屬**的團隊。管理員在用戶列表上手裡有的線索是用戶，
 *    不是團隊名——從用戶出發可以完全避開搜尋。
 * 2. `search`：同時比對團隊名稱**與擁有者的名稱／位址**。撞名時擁有者才是能分辨的線索。
 * 3. 預設依建立時間新到舊：要發點數的通常是剛開通的團隊，字母序把它們埋在兩千筆之後。
 *
 * 每列一併回傳擁有者、成員數與未分配餘額——沒有這些，管理員只能在一串同名團隊裡猜。
 */
export async function GET(req: Request) {
  try {
    const user = await getIdentityFromDeWT(req.headers.get("authorization"));
    if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN)) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get("search") || "").trim();
    const userId = searchParams.get("userId") || "";
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "20", 10), 1),
      100,
    );

    const teams = await prisma.team.findMany({
      where: {
        ...(userId ? { teamMembers: { some: { userId } } } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                {
                  teamMembers: {
                    some: {
                      role: TeamRole.OWNER,
                      user: {
                        OR: [
                          { name: { contains: search, mode: "insensitive" } },
                          {
                            address: { contains: search, mode: "insensitive" },
                          },
                        ],
                      },
                    },
                  },
                },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        _count: { select: { teamMembers: true } },
        // Info: (20260813 - Luphia) 擁有者是撞名時唯一的分辨線索，隨清單一起回傳
        teamMembers: {
          where: { role: TeamRole.OWNER },
          take: 1,
          select: { user: { select: { name: true, address: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
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
        ownerName: team.teamMembers[0]?.user.name ?? null,
        ownerAddress: team.teamMembers[0]?.user.address ?? null,
        createdAt: Math.floor(team.createdAt.getTime() / 1000),
      })),
    );
  } catch (error) {
    console.error("[API] /admin/team GET error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
