import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { teamWalletAllocationSchema } from "@/validators";
import {
  listAllocations,
  manageAllocation,
} from "@/services/team_wallet.service";

function toFailResponse(error: unknown) {
  if (error instanceof ApiError) {
    return jsonFail({
      code: error.code,
      message: error.message,
      status: error.status,
    });
  }
  return jsonFail(API_ERRORS.TW_OPERATION_FAILED);
}

/**
 * Info: (20260807 - Luphia) GET /api/v1/user/team/[team_id]/wallet/allocations（設計書 §7）：
 * OWNER / ADMIN 檢視全員分配清單。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ team_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);
    if (!user) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    const { team_id: teamId } = await params;
    const allocations = await listAllocations({ userId: user.id, teamId });
    return jsonOk(allocations);
  } catch (error) {
    return toFailResponse(error);
  }
}

/**
 * Info: (20260807 - Luphia) POST /api/v1/user/team/[team_id]/wallet/allocations（設計書 §6.2）：
 * OWNER / ADMIN 分配（池 → 成員）或收回（成員 → 池）點數。
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ team_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);
    if (!user) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    const { team_id: teamId } = await params;
    const parsed = teamWalletAllocationSchema.safeParse(await request.json());
    if (!parsed.success) return jsonFail(API_ERRORS.VL_SCHEMA_ERROR);

    const ledger = await manageAllocation({
      teamId,
      operatorUserId: user.id,
      targetUserId: parsed.data.userId,
      amount: BigInt(parsed.data.amount),
      direction: parsed.data.direction,
      idempotencyKey: parsed.data.idempotencyKey,
    });
    return jsonOk(ledger);
  } catch (error) {
    return toFailResponse(error);
  }
}
