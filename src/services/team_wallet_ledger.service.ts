import {
  TEAM_WALLET_LEDGER_FILTER,
  TEAM_WALLET_LEDGER_FILTER_ENTRY_TYPES,
  type TeamWalletLedgerFilter,
} from "@/constants/team_wallet_ledger";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import type { ILedgerEntryView } from "@/interfaces/team_wallet";
import { assertWalletManager } from "@/services/team_wallet_access.guard";
import { toLedgerView } from "@/services/team_wallet.service";
import { teamWalletLedgerQueryRepo } from "@/repositories/team_wallet_ledger_query.repo";
import { adminUserPointsRepo } from "@/repositories/admin_user_points.repo";
import {
  allocationSiblingKeys,
  deriveTeamAllocationStatuses,
} from "@/lib/quota/admin_user_points";
import { TEAM_WALLET_ENTRY_TYPE } from "@/constants/subscription_quota";

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
  // Info: (20261015 - Luphia) true 時連「分配撥入成員」的系統分錄也列出（預設併入分配列）
  includeSystem?: boolean;
}): Promise<{ items: ILedgerEntryView[]; total: number }> {
  const { userId, teamId, filter, page, pageSize, includeSystem } = params;
  try {
    await assertWalletManager(userId, teamId);
    const entryTypes =
      filter === TEAM_WALLET_LEDGER_FILTER.ALL
        ? []
        : TEAM_WALLET_LEDGER_FILTER_ENTRY_TYPES[filter];
    const { items, total } =
      await teamWalletLedgerQueryRepo.listLedgerByEntryTypes(
        teamId,
        entryTypes,
        page,
        pageSize,
        !includeSystem,
      );

    /**
     * Info: (20261015 - Luphia) 每筆 ALLOCATE 帶上「是否已撥入成員個人點數」。
     * 判定靠兄弟分錄（offchain-exit／allocate-failed）是否存在——它們可能不在這一頁，
     * 甚至被上面濾掉了，所以依精確的鍵另外查，不依賴這一頁的內容。
     */
    const allocations = items.filter(
      (row) => row.entryType === TEAM_WALLET_ENTRY_TYPE.ALLOCATE,
    );
    const siblingKeys = allocations.length
      ? new Set(
          await adminUserPointsRepo.findExistingIdempotencyKeys(
            allocationSiblingKeys(allocations),
          ),
        )
      : new Set<string>();
    const statuses = deriveTeamAllocationStatuses(allocations, siblingKeys);

    return {
      items: items.map((row) => {
        const view = toLedgerView(row);
        const status = statuses.get(row.id);
        return status ? { ...view, memberTransferStatus: status } : view;
      }),
      total,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      API_ERRORS.TW_OPERATION_FAILED.code,
      API_ERRORS.TW_OPERATION_FAILED.message,
      API_ERRORS.TW_OPERATION_FAILED.status,
    );
  }
}
