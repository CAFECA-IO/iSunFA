import { prisma } from "@/lib/prisma";
import { TeamWalletLedger } from "@/generated";
import {
  ALLOCATE_OFFCHAIN_EXIT_FEATURE_CODE,
  TEAM_WALLET_ENTRY_TYPE,
  type TeamWalletEntryType,
} from "@/constants/subscription_quota";

/**
 * Info: (20261015 - Luphia) 團隊流水帳的**唯讀**查詢（點數移轉紀錄頁的類型篩選）。
 *
 * 與 `teamWalletRepo.listLedger` 分開一個檔案：那支是帳本寫入端（append-only、
 * 條件更新、守恆）的 Repository，這裡只有一個依分錄類型篩選的分頁查詢，
 * 不碰任何寫入路徑。排序與分頁語意與 `listLedger` 相同（createdAt 新到舊）。
 */
export class TeamWalletLedgerQueryRepository {
  /**
   * Info: (20261015 - Luphia) `entryTypes` 為空即不限類型（「全部」）。
   * `hideMemberTransferExits` 為 true 時排除「分配撥入成員」的配對 ADJUST
   * （featureCode = allocate-offchain-exit）：它不動池餘額，畫面上併入分配那一列。
   * 以 OR 展開而不是 NOT(ADJUST AND featureCode = x)：featureCode 可為 NULL，
   * SQL 的 NOT(… AND NULL) 會是 NULL，會把一般分錄也一併濾掉。
   */
  async listLedgerByEntryTypes(
    teamId: string,
    entryTypes: readonly TeamWalletEntryType[],
    page: number,
    pageSize: number,
    hideMemberTransferExits = false,
  ): Promise<{ items: TeamWalletLedger[]; total: number }> {
    const wallet = await prisma.teamWallet.findUnique({
      where: { teamId },
      select: { id: true },
    });
    if (!wallet) return { items: [], total: 0 };
    const where = {
      teamWalletId: wallet.id,
      ...(entryTypes.length > 0 ? { entryType: { in: [...entryTypes] } } : {}),
      ...(hideMemberTransferExits
        ? {
            OR: [
              { entryType: { not: TEAM_WALLET_ENTRY_TYPE.ADJUST } },
              { featureCode: null },
              { featureCode: { not: ALLOCATE_OFFCHAIN_EXIT_FEATURE_CODE } },
            ],
          }
        : {}),
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
