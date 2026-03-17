import { taskService } from '@/services/task.service';
import { taskRepo } from '@/repositories/task.repo';
import { ethers } from 'ethers';
import { TASK_BOARD_ABI } from '@/lib/task_board_abi';
import 'dotenv/config';

/**
 * Info: (20260130 - Luphia)
 * Worker script to continuously process pending analysis tasks.
 * Run with: npx tsx scripts/worker.run.ts
 */
async function runWorker() {
  console.log('[Worker] Starting Analysis Task Worker...');
  console.log('[Worker] Press Ctrl+C to stop.');

  try {
    const updated = await taskRepo.resetAllRunningTasks();
    if (updated.count > 0) {
      console.log(`[Worker] Recovered ${updated.count} interrupted RUNNING tasks back to PENDING for smooth continuation.`);
    }
  } catch (err) {
    console.error('[Worker] Failed to reset running tasks on startup:', err);
  }

  let isRunning = true;

  // Info: (20260130 - Luphia) Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n[Worker] Stopping...');
    isRunning = false;
  });

  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "https://mainnet.isuncoin.com";
  const taskBoardAddress = process.env.NEXT_PUBLIC_TASK_BOARD_ADDRESS;

  let provider: ethers.JsonRpcProvider | null = null;
  let taskBoard: ethers.Contract | null = null;

  if (rpcUrl && taskBoardAddress) {
    try {
      provider = new ethers.JsonRpcProvider(rpcUrl);
      taskBoard = new ethers.Contract(taskBoardAddress, TASK_BOARD_ABI, provider);
      console.log(`[Worker] Connected to TaskBoard at ${taskBoardAddress}`);
    } catch (e) {
      console.error("[Worker] Failed to initialize ethers provider/contract. Falling back to local tasks only.", e);
    }
  } else {
    console.warn("[Worker] Missing NEXT_PUBLIC_RPC_URL or NEXT_PUBLIC_TASK_BOARD_ADDRESS. Falling back to local tasks only.");
  }

  while (isRunning) {
    try {
      let processed = false;
      let highestRewardTask: { id: string; reward: bigint; publisher: string } | null = null;

      // Info: (20260317 - Luphia) 1. Check Smart Contract for highest reward task
      if (taskBoard) {
        try {
          const allTaskIds = await taskBoard.listTask();

          let highestReward = BigInt(0);

          for (const taskId of allTaskIds) {
            const taskDetails = await taskBoard.tasks(taskId);
            const status = Number(taskDetails.status);
            const deadline = Number(taskDetails.deadline);
            const rewardAmount = BigInt(taskDetails.rewardAmount);

            // Info: (20260317 - Luphia) Only consider Open (0) tasks that haven't missed their deadline
            if (status === 0 && deadline > Math.floor(Date.now() / 1000)) {
              if (rewardAmount > highestReward) {
                highestReward = rewardAmount;
                highestRewardTask = {
                  id: taskId,
                  reward: rewardAmount,
                  publisher: taskDetails.publisher
                };
              }
            }
          }
        } catch (e) {
          console.error("[Worker] Failed querying TaskBoard. Skipping smart contract tasks this cycle:", e);
        }
      }

      // Info: (20260317 - Luphia) 2. Process Smart Contract Task if found
      if (highestRewardTask) {
        console.log(`[Worker] Found high reward Smart Contract Task: ${highestRewardTask.id} (${ethers.formatUnits(highestRewardTask.reward, 18)} Tokens)`);

        /**
         * Info: (20260317 - Luphia)
         * Execute task natively via TaskService without a local DB mission.
         * The smart contract taskId (CID) holds the execution reference.
         */
        console.log(`[Worker] Executing Smart Contract Task via TaskService immediately...`);
        const mockTaskPayload = {
          id: highestRewardTask.id,
          // Info: (20260317 - Luphia) In a full production env, we fetch IPFS CID text here for prompt
          data: { prompt: `Analyzing Task CID: ${highestRewardTask.id} and formulating result...` }
        };

        // Info: (20260317 - Luphia) No underlying Prisma mission context, execute standalone ad-hoc task
        await taskService.executeTask(mockTaskPayload, null);
        processed = true;
      }

      // Info: (20260317 - Luphia) 3. Fallback to Local Round-Robin if no smart contract tasks processed
      if (!processed) {
        processed = await taskService.processNextTask();
      }

      // Info: (20260130 - Luphia) Wait before next check to avoid tight loop
      const waitTime = processed ? 5000 : 60000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    } catch (error) {
      console.error('[Worker] Error in loop:', error);
      // Info: (20260130 - Luphia) Wait longer on error
      await new Promise(resolve => setTimeout(resolve, 60000));
    }
  }

  console.log('[Worker] Stopped.');
  process.exit(0);
}

runWorker().catch(err => {
  console.error('[Worker] Fatal error:', err);
  process.exit(1);
});
