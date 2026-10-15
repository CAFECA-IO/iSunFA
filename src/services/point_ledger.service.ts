import {
  POINT_LEDGER_ENTRY_TYPE,
  POINT_LEDGER_KEY,
  PointLedgerEntryType,
} from "@/constants/point_ledger";
import {
  IPointLedgerResult,
  pointLedgerRepo,
} from "@/repositories/point_ledger.repo";

/**
 * Info: (20261015 - Luphia) 個人點數服務（區塊鏈退役）。
 *
 * 自建鏈損毀後，個人點數改以 DB 帳本為唯一真相：
 * - 發點（購點、後台發放、註冊獎勵、活動贈點、團隊分配、退款）→ `credit`
 * - 扣點（ANALYSIS 訂單付款）→ `debitForOrder`，餘額不足即回 INSUFFICIENT，不放行
 *
 * 所有入口都以「來源」產生冪等鍵（見 `POINT_LEDGER_KEY`），與復原指令共用，
 * 所以同一個來源無論被重試幾次、或被復原指令補寫，都只入帳一次。
 */

export interface ICreditPointsInput {
  userId: string;
  amount: number | bigint;
  entryType: PointLedgerEntryType;
  idempotencyKey: string;
  orderId?: string | null;
  sourceRef?: string | null;
  note?: string | null;
}

function toPositiveBigInt(amount: number | bigint): bigint {
  if (typeof amount === "number" && !Number.isInteger(amount)) {
    throw new Error(`point amount must be an integer, got ${amount}`);
  }
  const value = BigInt(amount);
  if (value <= BigInt(0)) {
    throw new Error(`point amount must be positive, got ${value}`);
  }
  return value;
}

export async function creditPoints(
  input: ICreditPointsInput,
): Promise<IPointLedgerResult> {
  return pointLedgerRepo.applyEntry({
    userId: input.userId,
    amount: toPositiveBigInt(input.amount),
    entryType: input.entryType,
    idempotencyKey: input.idempotencyKey,
    orderId: input.orderId,
    sourceRef: input.sourceRef,
    note: input.note,
  });
}

/**
 * Info: (20261015 - Luphia) 以個人點數支付一張消費訂單。
 * `cost` 為正整數點數（訂單金額為負數，呼叫端自行取絕對值）。
 */
export async function debitPointsForOrder(params: {
  userId: string;
  orderId: string;
  cost: number | bigint;
  note?: string | null;
}): Promise<IPointLedgerResult> {
  return pointLedgerRepo.applyEntry({
    userId: params.userId,
    amount: -toPositiveBigInt(params.cost),
    entryType: POINT_LEDGER_ENTRY_TYPE.CONSUME,
    idempotencyKey: POINT_LEDGER_KEY.orderDebit(params.orderId),
    orderId: params.orderId,
    note: params.note,
  });
}

// Info: (20261015 - Luphia) 工作失敗退還該訂單已扣的點數（每張訂單只退一次）
export async function refundPointsForOrder(params: {
  userId: string;
  orderId: string;
  amount: number | bigint;
  note?: string | null;
}): Promise<IPointLedgerResult> {
  return pointLedgerRepo.applyEntry({
    userId: params.userId,
    amount: toPositiveBigInt(params.amount),
    entryType: POINT_LEDGER_ENTRY_TYPE.REFUND,
    idempotencyKey: POINT_LEDGER_KEY.orderRefund(params.orderId),
    orderId: params.orderId,
    note: params.note,
  });
}

export async function getPointBalance(userId: string): Promise<bigint> {
  return pointLedgerRepo.getBalance(userId);
}
