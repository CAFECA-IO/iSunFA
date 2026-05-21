import { createPublicClient, http, parseAbi } from "viem";
import { orderRepo } from "@/repositories/order.repo";
import { getPriorityEnvConfig } from "@/services/env.service";

const MB_ABI = parseAbi([
  "function taskSubmissions(uint256, uint256) view returns (address submitter, string resultCid, uint256 consumedTokens, bool isRejected, uint256 disputeUntil)",
  "function tasks(uint256) view returns (address creator, string contentCid, uint256 reward, uint256 createdAt, uint256 updatedAt, uint8 status, uint256 submissionCount)",
]);

export class OrderBackfillService {
  public async syncTokensFromBlockchain(): Promise<void> {
    console.log("[OrderBackfillService] Starting backfill for Order tokens...");

    const envConfig = await getPriorityEnvConfig();
    const missionBoardAddress =
      envConfig.NEXT_PUBLIC_MISSION_BOARD_ADDRESS as `0x${string}`;

    if (!missionBoardAddress) {
      console.warn(
        "[OrderBackfillService] NEXT_PUBLIC_MISSION_BOARD_ADDRESS is missing. Skipping backfill.",
      );
      return;
    }

    const publicClient = createPublicClient({
      transport: http(envConfig.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545"),
    });

    const orders = await orderRepo.getOrdersMissingTokens();
    console.log(
      `[OrderBackfillService] Found ${orders.length} ANALYSIS orders to process.`,
    );

    for (const order of orders) {
      if (!order.mission) continue;

      let taskIds: number[] = [];
      try {
        taskIds = JSON.parse(order.mission);
      } catch {
        console.warn(
          `[OrderBackfillService] Could not parse mission for order ${order.id}: ${order.mission}`,
        );
        continue;
      }

      if (!Array.isArray(taskIds) || taskIds.length === 0) continue;

      let totalTokensForOrder = 0n;

      for (const taskId of taskIds) {
        try {
          const taskTuple = (await publicClient.readContract({
            address: missionBoardAddress,
            abi: MB_ABI,
            functionName: "tasks",
            args: [BigInt(taskId)],
          })) as [string, string, bigint, bigint, bigint, number, bigint];

          const submissionCount = taskTuple[6]; // Info: (20260519 - Tzuhan) Keep as BigInt

          if (submissionCount > 0n) {
            const subTuple = (await publicClient.readContract({
              address: missionBoardAddress,
              abi: MB_ABI,
              functionName: "taskSubmissions",
              args: [BigInt(taskId), 0n],
            })) as [string, string, bigint, boolean, bigint];

            const consumedTokens = subTuple[2]; // Info: (20260519 - Tzuhan) Keep as BigInt
            totalTokensForOrder += consumedTokens;
            console.log(
              `[OrderBackfillService] Task ${taskId} consumed ${consumedTokens.toString()} tokens.`,
            );
          }
        } catch (err) {
          console.error(
            `[OrderBackfillService] Failed to fetch from MissionBoard for task ${taskId}:`,
            err,
          );
        }
      }

      if (totalTokensForOrder > 0n) {
        if (totalTokensForOrder > 2147483647n) {
          throw new Error(
            `[DB Overflow] Order ${order.id} token count exceeds Prisma Int bounds.`,
          );
        }
        await orderRepo.updateOrderTokens({
          id: order.id,
          tokens: Number(totalTokensForOrder), // Info: (20260519 - Tzuhan) Guarded against Prisma Int overflow
        });
        console.log(
          `[OrderBackfillService] Updated Order ${order.id} with ${totalTokensForOrder.toString()} tokens.`,
        );
      } else {
        console.log(
          `[OrderBackfillService] Order ${order.id} had 0 tokens found on blockchain.`,
        );
      }
    }

    console.log("[OrderBackfillService] Backfill completed.");
  }
}

export const orderBackfillService = new OrderBackfillService();
