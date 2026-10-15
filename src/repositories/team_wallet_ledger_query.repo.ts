import { prisma } from "@/lib/prisma";
import { TeamWalletLedger } from "@/generated";
import type { TeamWalletEntryType } from "@/constants/subscription_quota";

/**
 * Info: (20261015 - Luphia) 團隊流水帳的**唯讀**查詢（點數移轉紀錄頁的類型篩選）。
 *
 * 與 `teamWalletRepo.listLedger` 分開一個檔案：那支是帳本寫入端（append-only、
 * 條件更新、守恆）的 Repository，這裡只有一個依分錄類型篩選的分頁查詢，
 * 不碰任何寫入路徑。排序與分頁語意與 `listLedger` 相同（createdAt 新到舊）。
 */
export class TeamWalletLedgerQueryRepository {
  async listLedgerByEntryTypes(
    teamId: string,
    entryTypes: readonly TeamWalletEntryType[],
    page: number,
    pageSize: number,
  ): Promise<{ items: TeamWalletLedger[]; total: number }> {
    const wallet = await prisma.teamWallet.findUnique({
      where: { teamId },
      select: { id: true },
    });
    if (!wallet) return { items: [], total: 0 };
    const where = {
      teamWalletId: wallet.id,
      entryType: { in: [...entryTypes] },
    };
    const [items, total] = await Promise.all([
      prisma.teamWalletLedger.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.teamWalletLedger.count({ where }),
    ]);
    return { items, total };
  }
}

export const teamWalletLedgerQueryRepo = new TeamWalletLedgerQueryRepository();
