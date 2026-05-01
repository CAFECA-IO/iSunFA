import { publicClient } from "@/lib/viem_public";
import { decodeEventLog, parseAbi, parseEther, formatEther } from "viem";
import { orderRepo } from "@/repositories/order.repo";
import { failOrder } from "@/services/order.service";
import { ORDER_STATUS, ORDER_TYPE } from "@/constants/status";
import { ABIS } from "@/config/contracts";

let isScanning = false;

export async function scanPendingTransactions() {
  if (isScanning) {
    return false; // Info: (20260418 - Luphia) Skip if already scanning
  }

  isScanning = true;
  let processedCount = 0;

  try {
    // Info: (20260429 - Luphia) Cancel PENDING orders older than 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const stalePendingOrders = await orderRepo.findMany({
      where: {
        status: ORDER_STATUS.PENDING,
        createdAt: { lt: thirtyMinutesAgo },
      },
    });

    for (const order of stalePendingOrders) {
      await orderRepo.update({
        where: { id: order.id },
        data: { status: ORDER_STATUS.CANCEL },
      });
      console.log(
        `[TxTracker] Order ${order.id} marked as CANCEL (Pending > 30 mins)`,
      );
      processedCount++;
    }

    // Info: (20260420 - Luphia) Find all orders stuck in PAYING state
    const pendingOrders = await orderRepo.findMany({
      where: { status: ORDER_STATUS.PAYING },
      include: { user: true },
    });

    for (const order of pendingOrders) {
      if (!order.transactionHash) {
        continue; // Info: (20260420 - Luphia) Missing required transaction hash
      }

      const txHash = order.transactionHash;

      if (order.unit === "TWD") {
        continue; // Info: (20260420 - Luphia) TWD is handled by Ecpay webhooks, bypass blockchain scan
      }

      try {
        // Info: (20260420 - Luphia) Query blockchain for ISC/ICP transaction status
        const receipt = await publicClient.getTransactionReceipt({
          hash: txHash as `0x${string}`,
        });

        if (receipt.status === "success") {
          if (order.type === ORDER_TYPE.ANALYSIS) {
            let userOpSuccess = false;
            for (const log of receipt.logs) {
              try {
                const decoded = decodeEventLog({
                  abi: ABIS.ENTRY_POINT,
                  data: log.data,
                  topics: log.topics,
                });
                if (decoded.eventName === "UserOperationEvent") {
                  const args = decoded.args as {
                    sender: string;
                    success: boolean;
                  };
                  const orderUser = (
                    order as unknown as { user?: { address: string } | null }
                  ).user;
                  if (
                    orderUser &&
                    args.sender.toLowerCase() ===
                      orderUser.address.toLowerCase()
                  ) {
                    if (args.success) {
                      userOpSuccess = true;
                    }
                    break;
                  }
                }
              } catch {}
            }

            if (!userOpSuccess) {
              await failOrder(order.id, "UserOperation failed on-chain");
              await orderRepo.update({
                where: { id: order.id },
                data: { status: ORDER_STATUS.PAYMENT_FAILED },
              });
              console.log(
                `[TxTracker] Order ${order.id} marked as PAYMENT_FAILED (Tx ${txHash} UserOp failed)`,
              );
              processedCount++;
            } else {
              await orderRepo.update({
                where: { id: order.id },
                data: { status: ORDER_STATUS.PAID },
              });
              console.log(
                `[TxTracker] Order ${order.id} marked as PAID (Tx ${txHash} Success)`,
              );
              processedCount++;
            }
          } else {
            let actualPaid = 0n;
            for (const log of receipt.logs) {
              try {
                const decoded = decodeEventLog({
                  abi: parseAbi([
                    "event Transfer(address indexed from, address indexed to, uint256 value)",
                  ]),
                  data: log.data,
                  topics: log.topics,
                });
                if (decoded.eventName === "Transfer") {
                  const msAddress =
                    process.env.NEXT_PUBLIC_MEMBERSHIP_SYSTEM_ADDRESS;
                  if (
                    msAddress &&
                    decoded.args.to.toLowerCase() === msAddress.toLowerCase()
                  ) {
                    actualPaid = decoded.args.value;
                    break;
                  }
                }
              } catch {}
            }

            const expectedPaid = parseEther(Math.abs(order.amount).toString());
            console.log(
              `[TxTracker] Found amount: ${formatEther(actualPaid)} ${order.unit}`,
            );

            if (actualPaid !== expectedPaid) {
              await failOrder(order.id, "Payment amounts do not match");
              await orderRepo.update({
                where: { id: order.id },
                data: { status: ORDER_STATUS.PAYMENT_FAILED },
              });
              console.log(
                `[TxTracker] Order ${order.id} marked as PAYMENT_FAILED (Tx ${txHash} amount mismatch)`,
              );
              processedCount++;
            } else {
              await orderRepo.update({
                where: { id: order.id },
                data: { status: ORDER_STATUS.PAID },
              });
              console.log(
                `[TxTracker] Order ${order.id} marked as PAID (Tx ${txHash} Success)`,
              );
              processedCount++;
            }
          }
        } else if (receipt.status === "reverted") {
          await failOrder(order.id, "UserOp transaction reverted");
          await orderRepo.update({
            where: { id: order.id },
            data: { status: ORDER_STATUS.PAYMENT_FAILED },
          });
          console.log(
            `[TxTracker] Order ${order.id} marked as PAYMENT_FAILED (Tx ${txHash} Reverted)`,
          );
          processedCount++;
        }
      } catch (e: unknown) {
        // Info: (20260420 - Luphia) If it throws, it usually means TransactionReceiptNotFoundError. We wait.
        const errorMsg = e instanceof Error ? e.message : String(e);
        if (
          !errorMsg.includes("could not be found") &&
          !errorMsg.includes("not found") &&
          !errorMsg.includes("TransactionReceiptNotFound")
        ) {
          console.error(
            `[TxTracker] Error scanning tx ${txHash} for order ${order.id}:`,
            errorMsg,
          );
        }
      }
    }
  } catch (error) {
    console.error(
      "[TxTracker] Fatal error while scanning transactions:",
      error,
    );
  } finally {
    isScanning = false;
  }

  return processedCount > 0;
}
