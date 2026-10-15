import {
  TEAM_WALLET_LEDGER_FILTER,
  TEAM_WALLET_LEDGER_FILTER_ENTRY_TYPES,
  type TeamWalletLedgerFilter,
} from "@/constants/team_wallet_ledger";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import type { ILedgerEntryView } from "@/interfaces/team_wallet";
import { assertWalletManager } from "@/services/team_wallet_access.guard";
import {
  listTeamWalletLedger,
  toLedgerView,
} from "@/services/team_wallet.service";
import { teamWalletLedgerQueryRepo } from "@/repositories/team_wallet_ledger_query.repo";

/**
 * Info: (20261015 - Luphia) 團隊點數移轉紀錄（流水帳）的篩選查詢。
 *
 * 「全部」直接委派既有的 `listTeamWalletLedger`，讓未篩選的行為與既有 API 逐位元相同；
 * 有篩選時才走依分錄類型的查詢。權限與錯誤包裝與 team_wallet.service 一致：
 * 僅 OWNER（管理職）可讀，非 ApiError 一律包成 TW_OPERATION_FAILED，不外洩 Prisma 細節。
 */

export async function listTeamWalletLedgerByFilter(params: {
  userId: string;
  teamId: string;
  filter: TeamWalletLedgerFilter;
  page: number;
  pageSize: number;
}): Promise<{ items: ILedgerEntryView[]; total: number }> {
  const { userId, teamId, filter, page, pageSize } = params;
  if (filter === TEAM_WALLET_LEDGER_FILTER.ALL) {
    return listTeamWalletLedger({ userId, teamId, page, pageSize });
  }
  try {
    await assertWalletManager(userId, teamId);
    const { items, total } =
      await teamWalletLedgerQueryRepo.listLedgerByEntryTypes(
        teamId,
        TEAM_WALLET_LEDGER_FILTER_ENTRY_TYPES[filter],
        page,
        pageSize,
      );
    return { items: items.map(toLedgerView), total };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      API_ERRORS.TW_OPERATION_FAILED.code,
      API_ERRORS.TW_OPERATION_FAILED.message,
      API_ERRORS.TW_OPERATION_FAILED.status,
    );
  }
}
