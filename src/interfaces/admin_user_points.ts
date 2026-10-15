import type { TeamAllocationRecordStatus } from "@/constants/admin_user_points";

/**
 * Info: (20261015 - Luphia) 後台「點數明細」的回應型別（服務端產生、前端 modal 讀取）。
 * 點數一律以字串傳輸（服務端內部為 BigInt），前端只顯示不做加減。
 */

export interface IAdminListPage<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface IAdminPointLedgerEntryView {
  id: string;
  entryType: string;
  amount: string;
  balanceAfter: string;
  orderId: string | null;
  sourceRef: string | null;
  note: string | null;
  idempotencyKey: string;
  createdAt: string;
}

export interface IAdminPointBreakdownView {
  entryType: string;
  count: number;
  total: string;
}

export interface IAdminTeamAllocatedView {
  teamId: string;
  teamName: string;
  total: string;
}

export interface IAdminUserPointsView {
  userId: string;
  // Info: (20261015 - Luphia) User.pointBalance（快取）
  balance: string;
  // Info: (20261015 - Luphia) PointLedger 加總（真相）；與 balance 不同即 balanceMismatch
  ledgerTotal: string;
  balanceMismatch: boolean;
  breakdown: IAdminPointBreakdownView[];
  teamAllocated: {
    teams: IAdminTeamAllocatedView[];
    total: string;
  };
  ledger: IAdminListPage<IAdminPointLedgerEntryView>;
}

export interface IAdminTeamAllocationRecordView {
  id: string;
  teamId: string;
  teamName: string;
  entryType: string;
  amount: string;
  operatorUserId: string;
  operatorName: string | null;
  operatorAddress: string | null;
  txHash: string | null;
  idempotencyKey: string;
  status: TeamAllocationRecordStatus;
  createdAt: string;
}
