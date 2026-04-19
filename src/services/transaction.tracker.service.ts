import { publicClient } from "@/lib/viem_public";
import { prisma } from "@/lib/prisma";
import { analysisRepo } from "@/repositories/analysis.repo";
import { failOrder } from "@/services/order.service";
import { MISSION_STATUS } from "@/constants/status";

export class TransactionTrackerService {
  private isScanning = false;

  async scanPendingTransactions() {
    if (this.isScanning) {
      return false; // Info: (20260418 - Luphia) Skip if already scanning
    }

    this.isScanning = true;
    let processedCount = 0;

    try {
      // Info: (20260418 - Luphia) Find all missions stuck in PAYING state
      const pendingMissions = await prisma.mission.findMany({
        where: { status: MISSION_STATUS.PAYING },
        include: {
          analyses: {
            include: { order: true },
          },
        },
      });

      for (const mission of pendingMissions) {
        // Info: (20260418 - Luphia) Get the associated order from the first analysis
        const analysis = mission.analyses[0];
        if (!analysis || !analysis.order || !analysis.order.transactionHash) {
          continue; // Info: (20260418 - Luphia) Missing required transaction hash
        }

        const txHash = analysis.order.transactionHash;

        try {
          // Info: (20260418 - Luphia) Query blockchain for transaction status
          const receipt = await publicClient.getTransactionReceipt({
            hash: txHash as `0x${string}`,
          });

          if (receipt.status === "success") {
            await analysisRepo.updateMissionPaymentSuccess(mission.id);
            console.log(
              `[TxTracker] Mission ${mission.id} marked as PENDING (Tx ${txHash} Success)`,
            );
            processedCount++;
          } else if (receipt.status === "reverted") {
            await analysisRepo.updateMissionUnpaid(
              mission.id,
              "Payment Tx Reverted on chain",
            );
            await failOrder(analysis.order.id, "UserOp transaction reverted");
            console.log(
              `[TxTracker] Mission ${mission.id} marked as UNPAID (Tx ${txHash} Reverted)`,
            );
            processedCount++;
          }
        } catch (e: unknown) {
          // Info: (20260418 - Luphia) If it throws, it usually means TransactionReceiptNotFoundError. We wait.
          const errorMsg = e instanceof Error ? e.message : String(e);
          if (!errorMsg.includes("not found")) {
            console.error(
              `[TxTracker] Error scanning tx ${txHash} for mission ${mission.id}:`,
              errorMsg,
            );
          }
        }
      }
    } catch (error) {
      console.error("[TxTracker] Fatal error while scanning transactions:", error);
    } finally {
      this.isScanning = false;
    }

    return processedCount > 0;
  }
}

export const transactionTrackerService = new TransactionTrackerService();
