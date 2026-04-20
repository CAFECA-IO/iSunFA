import { getPriorityEnvConfig } from "@/services/env.service";
import { missionGenerator, IMissionParams } from "@/lib/worker/mission.generator";
import { createPublicClient, http, parseAbi } from "viem";
import fs from "fs/promises";
import path from "path";
import { storageService } from "@/services/storage.service";

const MB_ABI = parseAbi([
  "function tasks(uint256) view returns (address creator, string contentCid, uint256 reward, uint256 createdAt, uint256 updatedAt, uint8 status, uint256 submissionCount)"
]);

export class MissionPlannerService {
  // Info: (20260420 - Luphia) Simple in-memory tracker for the current run, ideally backed by a DB or file.
  private lastCheckedTaskId = 0n;

  async processNext() {
    console.log("[MissionPlanner] Fetching open tasks from MissionBoard...");

    const setupConfig = await getPriorityEnvConfig();
    const rpcUrl = setupConfig.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:20024";
    const publicClient = createPublicClient({ transport: http(rpcUrl) });
    const mbAddress = setupConfig.NEXT_PUBLIC_MISSION_BOARD_ADDRESS as `0x${string}`;

    const missionDirBase = setupConfig.MISSION_DIR || "missions";
    await fs.mkdir(path.join(process.cwd(), missionDirBase), { recursive: true });

    let foundOpenTask = false;

    // Info: (20260420 - Luphia) Scan forward starting from lastCheckedTaskId
    while (true) {
      try {
        const taskData = await publicClient.readContract({
          address: mbAddress,
          abi: MB_ABI,
          functionName: "tasks",
          args: [this.lastCheckedTaskId]
        });

        const [creator, contentCid, reward, , , status,] = taskData;

        // Info: (20260420 - Luphia) If creator is address(0), task does not exist (we reached the end)
        if (creator === "0x0000000000000000000000000000000000000000") {
          break;
        }

        // Info: (20260420 - Luphia) status == 0 means Open
        if (status === 0) {
          const taskIdStr = this.lastCheckedTaskId.toString();
          const folderName = `${mbAddress}_${taskIdStr}`;
          const taskDir = path.join(process.cwd(), missionDirBase, folderName);

          // Info: (20260420 - Luphia) Check if we already processed this
          let alreadyExists = false;
          try {
            await fs.access(taskDir);
            alreadyExists = true;
          } catch {
            alreadyExists = false;
          }

          if (!alreadyExists) {
            console.log(`[MissionPlanner] Found new Open task! ID: ${this.lastCheckedTaskId}, CID: ${contentCid}`);
            await fs.mkdir(taskDir, { recursive: true });

            // Info: (20260420 - Luphia) 1. Write meta.json
            const meta = {
              taskId: this.lastCheckedTaskId.toString(),
              creator,
              reward: reward.toString(),
              contentCid
            };
            await fs.writeFile(path.join(taskDir, "meta.json"), JSON.stringify(meta, null, 2), "utf8");

            // Info: (20260420 - Luphia) 2. Download mission.json from IPFS via Laria
            console.log(`[MissionPlanner] Downloading mission.json for CID: ${contentCid}...`);
            try {
              const fileBuffer = await storageService.recoverLaria(contentCid);
              const missionJsonStr = fileBuffer.toString("utf8");
              await fs.writeFile(path.join(taskDir, "mission.json"), missionJsonStr, "utf8");

              const missionObj = JSON.parse(missionJsonStr);

              const missionParams = {
                orderId: missionObj.orderId,
                type: missionObj.type,
                unit: missionObj.unit,
                amount: missionObj.amount,
                ...(missionObj.data || {}),
                category: missionObj.data?.category, // Info: (20260420 - Luphia) Ensure category is strictly at root
                data: missionObj.data || {}
              } as IMissionParams;

              // Info: (20260420 - Luphia) 3. Generate Mission Definition using missionGenerator
              const missionDef = missionGenerator.generateMission(missionParams);

              if (missionDef) {
                await fs.writeFile(
                  path.join(taskDir, "plan.executor.json"),
                  JSON.stringify(missionDef, null, 2),
                  "utf8"
                );
                console.log(`[MissionPlanner] Prepared MISSION_DIR with plan.executor.json for Task ID: ${taskIdStr} (CID: ${contentCid})`);
              } else {
                console.warn(`[MissionPlanner] missionGenerator returned null for category: ${missionParams.category}. Generating fallback execution plan.`);
                // Info: (20260420 - Luphia) 3.5 Fallback to primitive md structure
                const executorPlan = `# Plan Executor
## Category: ${missionParams.category}
## Type: ${missionObj.type}

### Execution Steps
1. Retrieve data.
2. Formulate analytical reasoning using configured Skills.
3. Consolidate results into Markdown format.
4. Export as \`result.md\`.

### Skills to invoke
- \`ai_consulting\`
`;
                await fs.writeFile(path.join(taskDir, "plan.executor.md"), executorPlan, "utf8");
                console.log(`[MissionPlanner] Prepared MISSION_DIR with fallback plan.executor.md for Task ID: ${taskIdStr} (CID: ${contentCid})`);
              }

              foundOpenTask = true;
              // Info: (20260420 - Luphia) process only one new task per run to avoid timeout
              break;
            } catch (dlErr) {
              console.error(`[MissionPlanner] Failed to download or process Task ID ${taskIdStr} (CID ${contentCid}):`, dlErr);
              // Info: (20260420 - Luphia) Clean up dir to allow retry
              await fs.rm(taskDir, { recursive: true, force: true });
            }
          }
        }

        this.lastCheckedTaskId++;
      } catch {
        // Info: (20260420 - Luphia) likely out of bounds or RPC error
        break;
      }
    }

    if (!foundOpenTask) {
      console.log("[MissionPlanner] No new Open tasks to process.");
    }
  }
}

export const missionPlannerService = new MissionPlannerService();
