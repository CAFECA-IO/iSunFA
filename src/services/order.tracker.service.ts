import { orderRepo } from "@/repositories/order.repo";
import { ORDER_STATUS, ORDER_TYPE } from "@/constants/status";
import { BANK_TRANSFER } from "@/constants/price";
import { releaseDebitOfCancelledOrder } from "@/services/point_payment.service";

/**
 * Info: (20261015 - Luphia) 訂單追蹤（區塊鏈退役）。
 *
 * 原本這支還輪詢 PAYING 訂單的鏈上收據，成功標 PAID、失敗標 PAYMENT_FAILED。
 * 個人點數付款改為 DB 帳本後，扣點與標 PAID 在付款請求內同步完成
 * （point_payment.service），不再產生 PAYING；鏈已損毀的舊 PAYING 訂單
 * 由復原指令（scripts/restore_points_from_db.ts）終結，這裡不碰它們。
 *
 * 留下的只有逾時取消：PENDING 超過 30 分鐘的訂單標為 CANCEL。
 */

let isScanning = false;

// Info: (20261015 - Luphia) PENDING 訂單的逾時門檻
const STALE_PENDING_MS = 30 * 60 * 1000;

export async function scanPendingTransactions() {
  if (isScanning) {
    return false; // Info: (20260418 - Luphia) Skip if already scanning
  }

  isScanning = true;
  let processedCount = 0;

  try {
    // Info: (20260429 - Luphia) Cancel PENDING orders older than 30 minutes
    const staleBefore = new Date(Date.now() - STALE_PENDING_MS);
    const stalePendingOrders = await orderRepo.findMany({
      where: {
        status: ORDER_STATUS.PENDING,
        createdAt: { lt: staleBefore },
      },
    });

    for (const order of stalePendingOrders) {
      // Info: (20260705 - Luphia) Skip bank transfer orders as they require manual verification
      // Info: (20260705 - Luphia) Exclude ON_PREMISE and SOLUTION orders from auto-cancellation
      if (
        order.type === ORDER_TYPE.BILLING_ON_PREMISE ||
        order.type === ORDER_TYPE.BILLING_SOLUTION
      ) {
        continue;
      }

      // Info: (20260705 - Luphia) Fallback check for bank transfer in items
      const orderData = order.data as Record<string, unknown>;
      const items = (orderData?.items as Record<string, unknown>[]) || [];
      if (
        items.some(
          (item: Record<string, unknown>) => item.remark === BANK_TRANSFER,
        )
      ) {
        continue;
      }

      // Info: (20261015 - Luphia) 條件式取消：剛好在這一刻被付掉的訂單不會被蓋回 CANCEL
      const cancelled = await orderRepo.cancelIfPending(order.id);
      if (!cancelled) continue;

      /**
       * Info: (20261015 - Luphia) 取消**之後**退回這張單可能已扣的點數（扣點後、標 PAID 前
       * 被中斷的付款）。順序不能反過來：先退再取消，中間若那個付款請求剛好把訂單標成
       * PAID，就成了「已付款、點數也退了」。取消成功之後付款端標不了 PAID，
       * 它自己也會走退點，兩邊共用 `orderRefund` 鍵，只退一次。
       */
      const released = await releaseDebitOfCancelledOrder(order);
      if (!released) {
        console.error(
          `[TxTracker] Order ${order.id} cancelled but its point debit was not refunded`,
        );
      }

      console.log(
        `[TxTracker] Order ${order.id} marked as CANCEL (Pending > 30 mins)`,
      );
      processedCount++;
    }
  } catch (error) {
    console.error("[TxTracker] Fatal error while scanning orders:", error);
  } finally {
    isScanning = false;
  }

  return processedCount > 0;
}
