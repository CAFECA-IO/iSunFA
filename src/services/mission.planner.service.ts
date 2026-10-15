import { getPriorityEnvConfig } from "@/services/env.service";
import {
  missionGenerator,
  IMissionParams,
} from "@/lib/worker/mission.generator";
import fs from "fs/promises";
import path from "path";
import { storageService } from "@/services/storage.service";
import { listTasksToPlan } from "@/services/mission_board.service";
import { missionFolderName } from "@/constants/mission_board";

export async function processNext() {
  console.log("[MissionPlanner] Fetching open tasks from MissionBoard...");

  const setupConfig = await getPriorityEnvConfig();

  const missionDirBase = setupConfig.MISSION_DIR || "missions";
  await fs.mkdir(path.join(process.cwd(), missionDirBase), { recursive: true });

  let foundOpenTask = false;

  /**
   * Info: (20261015 - Luphia) 直接向 DB 要 Open 任務（取代從 0 起逐一讀合約 + 記憶 lastCheckedTaskId）。
   * 已建立 MISSION_DIR 的任務跳過；任務一旦被提交就離開 Open，不會被一直掃到。
   */
  const openTasks = await listTasksToPlan();

  for (const task of openTasks) {
    const { creator, contentCid, reward } = task;
    const taskIdStr = task.id.toString();
    const folderName = missionFolderName(task.id);
    const taskDir = path.join(process.cwd(), missionDirBase, folderName);

    // Info: (20260420 - Luphia) Check if we already processed this
    let alreadyExists = false;
    try {
      await fs.access(taskDir);
      alreadyExists = true;
    } catch {
      alreadyExists = false;
    }

    if (alreadyExists) continue;

    console.log(
      `[MissionPlanner] Found new Open task! ID: ${taskIdStr}, CID: ${contentCid}`,
    );
    await fs.mkdir(taskDir, { recursive: true });

    // Info: (20260420 - Luphia) 1. Write meta.json
    const meta = {
      taskId: taskIdStr,
      creator,
      reward: reward.toString(),
      contentCid,
    };
    await fs.writeFile(
      path.join(taskDir, "meta.json"),
      JSON.stringify(meta, null, 2),
      "utf8",
    );

    // Info: (20260420 - Luphia) 2. Download mission.json from IPFS via Laria
    console.log(
      `[MissionPlanner] Downloading mission.json for CID: ${contentCid}...`,
    );
    try {
      const fileBuffer = await storageService.recoverLaria(contentCid);
      const missionJsonStr = fileBuffer.toString("utf8");
      await fs.writeFile(
        path.join(taskDir, "mission.json"),
        missionJsonStr,
        "utf8",
      );

      const missionObj = JSON.parse(missionJsonStr);

      const latestAccountBook = missionObj.accountBook || null;

      const missionParams = {
        orderId: missionObj.orderId,
        type: missionObj.type,
        unit: missionObj.unit,
        amount: missionObj.amount,
        fileId: missionObj.fileId || missionObj.data?.fileId,
        ...(missionObj.data || {}),
        category: missionObj.data?.category, // Info: (20260420 - Luphia) Ensure category is strictly at root
        data: missionObj.data || {},
        prerequisiteData: {
          ...(missionObj.prerequisiteData ||
            missionObj.data?.prerequisiteData ||
            {}),
          ...(latestAccountBook
            ? {
                accountBook: latestAccountBook,
              }
            : {}),
        },
      } as IMissionParams;

      // Info: (20260420 - Luphia) 3. Generate Mission Definition using missionGenerator
      const missionDef = missionGenerator.generateMission(missionParams);

      if (missionDef) {
        await fs.writeFile(
          path.join(taskDir, "plan.executor.json"),
          JSON.stringify(missionDef, null, 2),
          "utf8",
        );
        console.log(
          `[MissionPlanner] Prepared MISSION_DIR with plan.executor.json for Task ID: ${taskIdStr} (CID: ${contentCid})`,
        );
      } else {
        console.warn(
          `[MissionPlanner] missionGenerator returned null for category: ${missionParams.category}. Generating fallback execution plan.`,
        );
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
        await fs.writeFile(
          path.join(taskDir, "plan.executor.md"),
          executorPlan,
          "utf8",
        );
        console.log(
          `[MissionPlanner] Prepared MISSION_DIR with fallback plan.executor.md for Task ID: ${taskIdStr} (CID: ${contentCid})`,
        );
      }

      foundOpenTask = true;
      // Info: (20260420 - Luphia) process only one new task per run to avoid timeout
      break;
    } catch (dlErr) {
      console.error(
        `[MissionPlanner] Failed to download or process Task ID ${taskIdStr} (CID ${contentCid}):`,
        dlErr,
      );
      // Info: (20260420 - Luphia) Clean up dir to allow retry
      await fs.rm(taskDir, { recursive: true, force: true });
      // Info: (20261015 - Luphia) 本輪停在這裡，下一輪再從 DB 重拿 Open 任務重試
      break;
    }
  }

  if (!foundOpenTask) {
    console.log("[MissionPlanner] No new Open tasks to process.");
  }
}
