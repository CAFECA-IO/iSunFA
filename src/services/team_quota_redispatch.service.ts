import { Prisma } from "@/generated";
import { ANALYSIS_CATEGORY } from "@/constants/analysis";
import { orderRepo } from "@/repositories/order.repo";

/**
 * Info: (20261015 - Luphia) 補派團隊額度付款後卡住的分析訂單（使用者回報 20261015）。
 *
 * `team_quota_payment` 原本在履行後直接把訂單標成 COMPLETED，而任務派發只撿 PAID——
 * 那些訂單扣了團隊額度、建了報告佔位，卻從來沒有被派成任務。修正之後新訂單不再卡住，
 * 這支處理修正前留下的舊單：送回 PAID，交給 issue.service 照常派發。
 *
 * 判定（全部成立才補派）：
 * - ANALYSIS、狀態 COMPLETED、`mission` 為空（issue.service 派發時一定會寫入）
 * - signature 的 `verifiedVia` 是 `team_quota`（個人點數付款不受這個 bug 影響）
 * - 不是物流碳足跡：它由試算端點同步算出結果，本來就不走任務管線
 */

// Info: (20261015 - Luphia) 團隊額度付款寫在 signature 的來源標記（見 team_quota_payment route）
const TEAM_QUOTA_VERIFIED_VIA = "team_quota";

export interface IRedispatchCandidate {
  id: string;
  userId: string;
  data: Prisma.JsonValue;
  signature: string | null;
  mission: string | null;
  createdAt: Date;
}

export interface IRedispatchSelection {
  toRedispatch: IRedispatchCandidate[];
  skipped: { orderId: string; reason: string }[];
}

function readVerifiedVia(signature: string | null): string | null {
  if (!signature) return null;
  try {
    const parsed: unknown = JSON.parse(signature);
    if (parsed && typeof parsed === "object" && "verifiedVia" in parsed) {
      const via = (parsed as { verifiedVia: unknown }).verifiedVia;
      return typeof via === "string" ? via : null;
    }
  } catch {
    // Info: (20261015 - Luphia) 非 JSON 的 signature 不是團隊額度付款
  }
  return null;
}

function readCategory(data: Prisma.JsonValue): string | undefined {
  if (!data || typeof data !== "object" || Array.isArray(data))
    return undefined;
  const obj = data as Record<string, unknown>;
  if (typeof obj.category === "string") return obj.category;
  const inner = obj.data;
  if (inner && typeof inner === "object" && !Array.isArray(inner)) {
    const category = (inner as Record<string, unknown>).category;
    if (typeof category === "string") return category;
  }
  return undefined;
}

function hasMission(mission: string | null): boolean {
  if (!mission) return false;
  try {
    const parsed: unknown = JSON.parse(mission);
    return Array.isArray(parsed) ? parsed.length > 0 : Boolean(parsed);
  } catch {
    return mission.trim().length > 0;
  }
}

// Info: (20261015 - Luphia) 純函式：從候選中挑出真的要補派的訂單
export function selectRedispatchableOrders(
  candidates: readonly IRedispatchCandidate[],
): IRedispatchSelection {
  const selection: IRedispatchSelection = { toRedispatch: [], skipped: [] };
  for (const order of candidates) {
    if (readVerifiedVia(order.signature) !== TEAM_QUOTA_VERIFIED_VIA) {
      selection.skipped.push({
        orderId: order.id,
        reason: "not paid with team quota",
      });
      continue;
    }
    if (hasMission(order.mission)) {
      selection.skipped.push({
        orderId: order.id,
        reason: "already dispatched",
      });
      continue;
    }
    const category = readCategory(order.data);
    if (category === ANALYSIS_CATEGORY.TRANSPORTATION_CARBON_FOOTPRINT) {
      selection.skipped.push({
        orderId: order.id,
        reason: "transportation is calculated synchronously, no task needed",
      });
      continue;
    }
    if (!category) {
      selection.skipped.push({ orderId: order.id, reason: "no category" });
      continue;
    }
    selection.toRedispatch.push(order);
  }
  return selection;
}

export async function loadRedispatchSelection(params: {
  orderId?: string;
}): Promise<IRedispatchSelection> {
  const candidates =
    await orderRepo.listUndispatchedTeamQuotaCandidates(params);
  return selectRedispatchableOrders(candidates);
}

export async function requeueOrders(
  orders: readonly IRedispatchCandidate[],
): Promise<{ requeued: string[]; unchanged: string[] }> {
  const requeued: string[] = [];
  const unchanged: string[] = [];
  for (const order of orders) {
    if (await orderRepo.requeueUndispatchedOrder(order.id)) {
      requeued.push(order.id);
    } else {
      unchanged.push(order.id);
    }
  }
  return { requeued, unchanged };
}
