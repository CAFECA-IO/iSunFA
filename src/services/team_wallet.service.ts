import { randomUUID } from "crypto";
import { Order, TeamWalletLedger } from "@/generated";
import { CREDIT_PLANS } from "@/config/credit_plans";
import { CURRENCY_UNIT } from "@/constants/price";
import { ORDER_STATUS, ORDER_TYPE } from "@/constants/status";
import {
  ALLOCATION_DIRECTION,
  AllocationDirection,
  TEAM_WALLET_STATUS,
  TeamWalletEntryType,
  TeamWalletStatus,
  WALLET_OP_OUTCOME,
  WalletOpOutcome,
} from "@/constants/subscription_quota";
import { API_ERRORS, ApiError, IErrorDef } from "@/lib/utils/error_dictionary";
import type {
  IAllocationView,
  ILedgerEntryView,
  ITeamWalletView,
} from "@/interfaces/team_wallet";
import { generatePaymentOrder } from "@/services/order.service";
import {
  assertTeamMember,
  assertWalletManager,
  isWalletManager,
} from "@/services/team_wallet_access.guard";
import { teamRepo } from "@/repositories/team.repo";
import { teamWalletRepo } from "@/repositories/team_wallet.repo";
import { paymentRepo } from "@/repositories/payment.repo";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { issuePurchasedPointsToMember } from "@/services/member.service";
import { burn } from "@/services/token.service";
import { CONTRACT_ADDRESSES } from "@/config/contracts";
import { logger } from "@/lib/utils/logger";

/**
 * Info: (20260807 - Luphia) 團隊錢包 Service（設計書 §6）：購點、分配、收回、
 * 成員移除自動收回、錢包視圖與 Ledger 查詢。原子性在 Repository 層，
 * 本層負責授權、業務防呆與錯誤包裝。
 */

export interface IManageAllocationParams {
  teamId: string;
  operatorUserId: string;
  targetUserId: string;
  amount: bigint;
  direction: AllocationDirection;
  idempotencyKey?: string;
}

export interface ITeamWalletDetailView extends ITeamWalletView {
  allocations?: IAllocationView[];
}

function toApiError(def: IErrorDef): ApiError {
  return new ApiError(def.code, def.message, def.status);
}

/**
 * Info: (20260807 - Luphia) Service 層錯誤邊界（同 spend.service）：
 * ApiError 原樣上拋，其餘一律包裝為 TW_OPERATION_FAILED，不外洩底層細節。
 */
async function guarded<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw toApiError(API_ERRORS.TW_OPERATION_FAILED);
  }
}

function toLedgerView(ledger: TeamWalletLedger): ILedgerEntryView {
  return {
    id: ledger.id,
    entryType: ledger.entryType as TeamWalletEntryType,
    amount: ledger.amount.toString(),
    poolBalanceAfter: ledger.poolBalanceAfter?.toString() ?? null,
    allocationBalanceAfter: ledger.allocationBalanceAfter?.toString() ?? null,
    targetUserId: ledger.targetUserId,
    operatorUserId: ledger.operatorUserId,
    orderId: ledger.orderId,
    featureCode: (ledger.featureCode ??
      null) as ILedgerEntryView["featureCode"],
    createdAt: Math.floor(ledger.createdAt.getTime() / 1000),
  };
}

/**
 * Info: (20260807 - Luphia) 建立團隊購點訂單（設計書 §6.1 步驟 1）。
 * 點數包沿用 credit_plans（tier1–tier6）；訂單 data 內帶 teamId 供付款成功後分流入池。
 */
export async function createTeamPointPurchaseOrder(params: {
  userId: string;
  teamId: string;
  creditPlanId: string;
  paymentMethodId: string;
}) {
  const { userId, teamId, creditPlanId, paymentMethodId } = params;

  return guarded(async () => {
    await assertWalletManager(userId, teamId);

    const plan = CREDIT_PLANS.find((p) => p.id === creditPlanId);
    if (!plan) throw toApiError(API_ERRORS.TW_INVALID_CREDIT_PLAN);

    return generatePaymentOrder(userId, {
      type: ORDER_TYPE.BILLING_TEAM_POINT,
      amount: plan.price.twd,
      unit: CURRENCY_UNIT.TWD,
      credits: plan.credits,
      paymentMethodId,
      title: `iSunFA Team Credits - ${plan.credits}`,
      teamId,
      data: { creditPlanId },
    });
  });
}

/**
 * Info: (20260807 - Luphia) 綁卡直扣（checkout）路徑的購點履行：
 * 入池（冪等鍵 purchase:{orderId}）後標記訂單 COMPLETED。
 * webhook 路徑不經此函式——processOenPayment 已於交易內原子處理。
 */
export async function fulfillTeamPointPurchase(order: Order): Promise<void> {
  return guarded(async () => {
    if (order.type !== ORDER_TYPE.BILLING_TEAM_POINT) {
      throw toApiError(API_ERRORS.TW_OPERATION_FAILED);
    }
    const data = order.data as { teamId?: string; credits?: number } | null;
    const teamId = data?.teamId;
    const credits = data?.credits ?? 0;
    if (!teamId || credits <= 0) {
      throw toApiError(API_ERRORS.TW_OPERATION_FAILED);
    }

    const credited = await teamWalletRepo.creditPool({
      teamId,
      credits: BigInt(credits),
      orderId: order.id,
      operatorUserId: order.userId,
      idempotencyKey: `purchase:${order.id}`,
    });
    if (
      credited.outcome !== WALLET_OP_OUTCOME.OK &&
      credited.outcome !== WALLET_OP_OUTCOME.DUPLICATE
    ) {
      // Info: (20260807 - Luphia) 已扣款但錢包凍結：訂單停在 PAID，勾稽解凍後人工補入
      throw toApiError(API_ERRORS.TW_WALLET_FROZEN);
    }

    await paymentRepo.updateOrderCompleted(order.id);
  });
}

/**
 * Info: (20260809 - Luphia) 錢包視圖（設計書 §7 GET /wallet）：
 * 一般成員僅見自己的分配餘額與錢包狀態；未分配池餘額與全員分配清單為
 * 管理職資訊，僅 OWNER / ADMIN 回傳——後端就不給，非僅前端隱藏（零信任）。
 */
export async function getTeamWalletView(params: {
  userId: string;
  teamId: string;
}): Promise<ITeamWalletDetailView> {
  const { userId, teamId } = params;

  return guarded(async () => {
    const member = await assertTeamMember(userId, teamId);

    const wallet = await teamWalletRepo.getWalletByTeamId(teamId);
    const allocation = await teamWalletRepo.getAllocation(teamId, userId);

    const view: ITeamWalletDetailView = {
      teamId,
      status: (wallet?.status ?? TEAM_WALLET_STATUS.ACTIVE) as TeamWalletStatus,
      myAllocationBalance: (allocation?.balance ?? BigInt(0)).toString(),
    };

    if (isWalletManager(member)) {
      view.unallocatedBalance = (
        wallet?.unallocatedBalance ?? BigInt(0)
      ).toString();
      const allocations = await teamWalletRepo.listAllocations(teamId);
      view.allocations = allocations.map((a) => ({
        userId: a.userId,
        balance: a.balance.toString(),
        updatedAt: Math.floor(a.updatedAt.getTime() / 1000),
      }));
    }

    return view;
  });
}

export async function listAllocations(params: {
  userId: string;
  teamId: string;
}): Promise<IAllocationView[]> {
  const { userId, teamId } = params;
  return guarded(async () => {
    await assertWalletManager(userId, teamId);
    const allocations = await teamWalletRepo.listAllocations(teamId);
    return allocations.map((a) => ({
      userId: a.userId,
      balance: a.balance.toString(),
      updatedAt: Math.floor(a.updatedAt.getTime() / 1000),
    }));
  });
}

/**
 * Info: (20260807 - Luphia) 分配 / 收回（設計書 §6.2）。
 * ALLOCATE 目標必須是現任有效成員；冪等鍵未提供時以 UUID 補上（僅保證唯一，無重放保護）。
 */
export async function manageAllocation(
  params: IManageAllocationParams,
): Promise<ILedgerEntryView> {
  const { teamId, operatorUserId, targetUserId, amount, direction } = params;

  if (typeof amount !== "bigint" || amount <= BigInt(0)) {
    throw toApiError(API_ERRORS.TW_INVALID_SPEND_AMOUNT);
  }

  return guarded(async () => {
    await assertWalletManager(operatorUserId, teamId);

    if (direction === ALLOCATION_DIRECTION.ALLOCATE) {
      const target = await teamRepo.getTeamMember(targetUserId, teamId);
      if (!target) throw toApiError(API_ERRORS.TW_NOT_TEAM_MEMBER);
    }

    const idempotencyKey = params.idempotencyKey ?? randomUUID();

    /**
     * Info: (20260814 - Luphia) 分配 / 收回都要動鏈上餘額（ADR 015 修訂，產品拍板 20260814）：
     * 分配的點數直接鑄到成員自己的區塊鏈錢包，之後就是他的個人點數，
     * 在任何情境都能用——不再有「只能在這個團隊裡花」的第二套餘額。
     */
    const target = await webAuthnRepo.findUserById(targetUserId);
    if (!target?.address) {
      throw toApiError(API_ERRORS.TW_MEMBER_WALLET_MISSING);
    }
    const input = {
      teamId,
      targetUserId,
      amount,
      operatorUserId,
      idempotencyKey,
    };

    if (direction === ALLOCATION_DIRECTION.ALLOCATE) {
      // Info: (20260814 - Luphia) 先扣池（可條件失敗、可補償），再鑄鏈上點數
      const result = await teamWalletRepo.allocate(input);
      if (result.outcome === WALLET_OP_OUTCOME.DUPLICATE && result.ledger) {
        return toLedgerView(result.ledger);
      }
      if (result.outcome !== WALLET_OP_OUTCOME.OK || !result.ledger) {
        throw toApiError(mapAllocationFailure(direction, result.outcome));
      }

      const minted = await issuePurchasedPointsToMember(
        target.address,
        Number(amount),
      );
      if (!minted.success) {
        /**
         * Info: (20260814 - Luphia) 鑄造明確失敗：把點數退回池並留下反向分錄。
         * 不沉默吞掉——池已經扣過了，不補回去就是團隊平白少一筆點數。
         */
        await teamWalletRepo.compensateFailedAllocation({
          teamId,
          targetUserId,
          amount,
          operatorUserId,
          idempotencyKey,
          reason: minted.message ?? "mint failed",
        });
        logger.error("team allocation mint failed", {
          teamId,
          targetUserId,
          amount: amount.toString(),
          message: minted.message,
        });
        throw toApiError(API_ERRORS.TW_OPERATION_FAILED);
      }

      const txHash = (minted.data as { tx?: string })?.tx;
      if (txHash)
        await teamWalletRepo.setLedgerTxHash(result.ledger.id, txHash);
      return toLedgerView({ ...result.ledger, txHash: txHash ?? null });
    }

    /**
     * Info: (20260814 - Luphia) 收回＝銷毀成員鏈上點數再回補池，且**以團隊淨分配量為上限**：
     * 點數進了成員錢包後與他自費購買的混在同一個餘額裡，鏈上分不出來；
     * 沒有這道上限，團隊就能銷毀成員自己買的點數。
     * 成員已經花掉的部分收不回來——這是「點數直接給他」的必然結果。
     */
    const netAllocated = await teamWalletRepo.sumNetAllocatedToMember(
      teamId,
      targetUserId,
    );
    if (netAllocated < amount) {
      throw toApiError(API_ERRORS.TW_ALLOCATION_INSUFFICIENT);
    }

    const burned = await burn(
      CONTRACT_ADDRESSES.CREDIT_POINT,
      target.address,
      Number(amount),
    );
    if (!burned.success) {
      logger.error("team allocation burn failed", {
        teamId,
        targetUserId,
        amount: amount.toString(),
        message: burned.message,
      });
      throw toApiError(API_ERRORS.TW_ALLOCATION_INSUFFICIENT);
    }

    const result = await teamWalletRepo.revoke({
      ...input,
      txHash: (burned.data as { tx?: string })?.tx,
    });
    if (
      result.outcome === WALLET_OP_OUTCOME.OK ||
      result.outcome === WALLET_OP_OUTCOME.DUPLICATE
    ) {
      if (!result.ledger) throw toApiError(API_ERRORS.TW_OPERATION_FAILED);
      return toLedgerView(result.ledger);
    }
    throw toApiError(mapAllocationFailure(direction, result.outcome));
  });
}

function mapAllocationFailure(
  direction: AllocationDirection,
  outcome: WalletOpOutcome,
): IErrorDef {
  if (outcome === WALLET_OP_OUTCOME.FROZEN) return API_ERRORS.TW_WALLET_FROZEN;
  if (
    outcome === WALLET_OP_OUTCOME.INSUFFICIENT ||
    outcome === WALLET_OP_OUTCOME.NO_WALLET
  ) {
    return direction === ALLOCATION_DIRECTION.ALLOCATE
      ? API_ERRORS.TW_WALLET_INSUFFICIENT
      : API_ERRORS.TW_ALLOCATION_INSUFFICIENT;
  }
  return API_ERRORS.TW_OPERATION_FAILED;
}

export async function listTeamWalletLedger(params: {
  userId: string;
  teamId: string;
  page: number;
  pageSize: number;
}): Promise<{ items: ILedgerEntryView[]; total: number }> {
  const { userId, teamId, page, pageSize } = params;
  return guarded(async () => {
    await assertWalletManager(userId, teamId);
    const { items, total } = await teamWalletRepo.listLedger(
      teamId,
      page,
      pageSize,
    );
    return { items: items.map(toLedgerView), total };
  });
}

/**
 * Info: (20260807 - Luphia) 成員移除自動收回（設計書 §6.2）：
 * 於移除流程「刪除成員之前」呼叫；FROZEN 時丟錯中止移除（守恆優先）；
 * 冪等鍵綁 memberId，重試安全。
 */
/**
 * Info: (20260814 - Luphia) 成員移除時的收回**只處理舊的離鏈分配餘額**（ADR 015 修訂）。
 *
 * 分配改為鑄到成員自己的錢包之後，那些點數就是他的個人資產、能在團隊之外使用，
 * 移除成員時自動銷毀等於沒收別人的東西。要收回請在移除前明確執行 REVOKE
 * （上限為團隊淨分配量，且成員已花掉的部分收不回來）。
 *
 * 遷移完成後這條路徑對新資料會一律回 NOT_FOUND（no-op），舊餘額則照原規則回池。
 */
export async function revokeAllocationOnMemberRemoval(params: {
  teamId: string;
  targetUserId: string;
  operatorUserId: string;
  memberId: string;
}): Promise<{ revoked: boolean }> {
  const { teamId, targetUserId, operatorUserId, memberId } = params;
  return guarded(async () => {
    const result = await teamWalletRepo.revokeAllForUser({
      teamId,
      targetUserId,
      operatorUserId,
      idempotencyKey: `revoke-all:${memberId}`,
    });
    if (
      result.outcome === WALLET_OP_OUTCOME.OK ||
      result.outcome === WALLET_OP_OUTCOME.DUPLICATE
    ) {
      return { revoked: true };
    }
    if (result.outcome === WALLET_OP_OUTCOME.FROZEN) {
      throw toApiError(API_ERRORS.TW_WALLET_FROZEN);
    }
    // Info: (20260807 - Luphia) NOT_FOUND / NO_WALLET：無分配可收，no-op
    return { revoked: false };
  });
}

/**
 * Info: (20260813 - Luphia) 後台發放點數給團隊（/admin/user 的團隊發放功能）。
 *
 * 與用戶發放的關鍵差別：**團隊點數是離鏈帳本**（ADR 015），不 mint 鏈上點數，
 * 因此不經 member.service，而是直接入團隊錢包的未分配池並寫一筆 Ledger。
 *
 * 仍建立一張 ADMIN_ISSUED 訂單：發放點數是金流事件，必須留下「誰、何時、發給哪個團隊」
 * 的紀錄；訂單掛在**操作的管理員**名下並於 data 標記 teamId，
 * 因此 point_history 需將帶 teamId 的 ADMIN_ISSUED 排除，否則會顯示成管理員自己收到點數。
 */
export async function issueTeamCreditsByAdmin(params: {
  teamId: string;
  credits: bigint;
  operatorUserId: string;
}): Promise<{ orderId: string; credits: string }> {
  const { teamId, credits, operatorUserId } = params;

  // Info: (20260813 - Luphia) Fail Fast：非正整數的發放金額直接凍結
  if (typeof credits !== "bigint" || credits <= BigInt(0)) {
    throw toApiError(API_ERRORS.TW_INVALID_SPEND_AMOUNT);
  }

  return guarded(async () => {
    const team = await teamRepo.getTeamById(teamId);
    if (!team) throw toApiError(API_ERRORS.NF_TEAM);

    const order = await paymentRepo.createOrder({
      userId: operatorUserId,
      type: ORDER_TYPE.ADMIN_ISSUED,
      amount: credits,
      unit: CURRENCY_UNIT.ICP,
      status: ORDER_STATUS.COMPLETED,
      challenge: "admin_distribute_team",
      data: { adminIssued: true, issuedBy: operatorUserId, teamId },
    });

    const credited = await teamWalletRepo.creditPool({
      teamId,
      credits,
      orderId: order.id,
      operatorUserId,
      idempotencyKey: `admin-issue:${order.id}`,
    });
    if (
      credited.outcome !== WALLET_OP_OUTCOME.OK &&
      credited.outcome !== WALLET_OP_OUTCOME.DUPLICATE
    ) {
      /**
       * Info: (20260813 - Luphia) 錢包凍結（守恆勾稽失敗）時不得入帳：
       * 凍結的意思就是「這本帳現在不可信」，往裡面加點數只會讓人工核帳更難。
       */
      throw toApiError(API_ERRORS.TW_WALLET_FROZEN);
    }

    return { orderId: order.id, credits: credits.toString() };
  });
}
