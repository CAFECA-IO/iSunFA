import { prisma } from "@/lib/prisma";
import { Prisma, TeamLedgerAnchor, TeamWalletLedger } from "@/generated";
import { TEAM_LEDGER_ANCHOR_STATUS } from "@/constants/subscription_quota";

/**
 * Info: (20260807 - Luphia) 每日 Ledger 錨定 Repository（ADR 015 C 案 Phase 1）。
 * anchorDate @unique 保證每個營業日只有一列；merkle 計算在純函式層，
 * 本層只負責讀當日分錄（穩定排序）與錨定列的狀態流轉。
 */
export class TeamLedgerAnchorRepository {
  async getLatestAnchored(): Promise<TeamLedgerAnchor | null> {
    return prisma.teamLedgerAnchor.findFirst({
      where: { status: TEAM_LEDGER_ANCHOR_STATUS.ANCHORED },
      orderBy: { anchorDate: "desc" },
    });
  }

  async getByDate(anchorDate: Date): Promise<TeamLedgerAnchor | null> {
    return prisma.teamLedgerAnchor.findUnique({ where: { anchorDate } });
  }

  async upsertPending(
    data: Omit<Prisma.TeamLedgerAnchorUncheckedCreateInput, "status">,
  ): Promise<TeamLedgerAnchor> {
    const { anchorDate, entryCount, dayMerkleRoot, chainedRoot } = data;
    return prisma.teamLedgerAnchor.upsert({
      where: { anchorDate: anchorDate as Date },
      update: { entryCount, dayMerkleRoot, chainedRoot },
      create: {
        anchorDate,
        entryCount,
        dayMerkleRoot,
        chainedRoot,
        status: TEAM_LEDGER_ANCHOR_STATUS.PENDING,
      },
    });
  }

  async markAnchored(id: string, txHash: string): Promise<TeamLedgerAnchor> {
    return prisma.teamLedgerAnchor.update({
      where: { id },
      data: { status: TEAM_LEDGER_ANCHOR_STATUS.ANCHORED, txHash },
    });
  }

  async markFailed(id: string): Promise<TeamLedgerAnchor> {
    return prisma.teamLedgerAnchor.update({
      where: { id },
      data: { status: TEAM_LEDGER_ANCHOR_STATUS.FAILED },
    });
  }

  /**
   * Info: (20260807 - Luphia) 取一日視窗內的全域 Ledger 分錄，
   * 以 (createdAt, id) 穩定排序——葉序即 merkle 序，重算方必須用同一排序。
   */
  async listLedgerForWindow(
    startInclusive: Date,
    endExclusive: Date,
  ): Promise<TeamWalletLedger[]> {
    return prisma.teamWalletLedger.findMany({
      where: { createdAt: { gte: startInclusive, lt: endExclusive } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
  }
}

export const teamLedgerAnchorRepo = new TeamLedgerAnchorRepository();
