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

      let totalTokensForOrder = 0;

      for (const taskId of taskIds) {
        try {
          const taskTuple = (await publicClient.readContract({
            address: missionBoardAddress,
            abi: MB_ABI,
            functionName: "tasks",
            args: [BigInt(taskId)],
          })) as [string, string, bigint, bigint, bigint, number, bigint];

          const submissionCount = Number(taskTuple[6]);

          if (submissionCount > 0) {
            const subTuple = (await publicClient.readContract({
              address: missionBoardAddress,
              abi: MB_ABI,
              functionName: "taskSubmissions",
              args: [BigInt(taskId), 0n],
            })) as [string, string, bigint, boolean, bigint];

            const consumedTokens = Number(subTuple[2]);
            totalTokensForOrder += consumedTokens;
            console.log(
              `[OrderBackfillService] Task ${taskId} consumed ${consumedTokens} tokens.`,
            );
          }
        } catch (err) {
          console.error(
            `[OrderBackfillService] Failed to fetch from MissionBoard for task ${taskId}:`,
            err,
          );
        }
      }

      if (totalTokensForOrder > 0) {
        await orderRepo.updateOrderTokens({
          id: order.id,
          tokens: totalTokensForOrder,
        });
        console.log(
          `[OrderBackfillService] Updated Order ${order.id} with ${totalTokensForOrder} tokens.`,
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
