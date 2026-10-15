import fs from "fs/promises";
import path from "path";
import { getPriorityEnvConfig } from "@/services/env.service";
import { Decimal } from "decimal.js";
import {
  formatTaskReward,
  getLatestSubmission,
  getTask,
} from "@/services/mission_board.service";
import {
  MISSION_MAX_REJECTIONS,
  MISSION_TASK_STATUS,
  parseMissionFolderName,
} from "@/constants/mission_board";

export async function processNext() {
  console.log(
    "[MissionFallbacker] Scanning MISSION_DIR for fallbacks and closures...",
  );

  const setupConfig = await getPriorityEnvConfig();
  const missionDirBase = setupConfig.MISSION_DIR || "missions";
  const missionDirPath = path.join(process.cwd(), missionDirBase);

  let processedAny = false;

  try {
    const folders = await fs.readdir(missionDirPath, { withFileTypes: true });

    for (const folder of folders) {
      if (!folder.isDirectory()) continue;
      // Info: (20261015 - Luphia) 舊鏈資料夾的 taskId 可能與 DB 流水號同號，讀到的會是別人的任務狀態
      if (parseMissionFolderName(folder.name) === null) continue;
      const taskDir = path.join(missionDirPath, folder.name);
      const submitPath = path.join(taskDir, "submit.md");
      const closePath = path.join(taskDir, "close.md");
      const resultPath = path.join(taskDir, "result.md");
      const metaPath = path.join(taskDir, "meta.json");

      try {
        await fs.access(submitPath);
      } catch {
        continue; // Info: (20260430 - Luphia) Not submitted yet
      }

      try {
        await fs.access(closePath);
        continue; // Info: (20260430 - Luphia) Already closed
      } catch {}

      try {
        await fs.access(path.join(taskDir, "giveup.md"));
        continue; // Info: (20260502 - Luphia) Already given up
      } catch {}

      processedAny = true;
      console.log(
        `[MissionFallbacker] Checking status for Task ID: ${folder.name}`,
      );

      try {
        const metaStr = await fs.readFile(metaPath, "utf8");
        const metaData = JSON.parse(metaStr);
        const taskId = Number(metaData.taskId);

        const task = await getTask(taskId);
        if (!task) {
          throw new Error(`Task ${metaData.taskId} not found on MissionBoard`);
        }
        const { reward, createdAt, status, submissionCount } = task;

        // Info: (20260430 - Luphia) Extract submit info
        const submitStr = await fs.readFile(submitPath, "utf8");
        const tokenMatch = submitStr.match(/- Consumed Tokens: (\d+)/);
        const dateMatch = submitStr.match(/- Submitted At: (.*)/);

        const consumedTokens = tokenMatch ? BigInt(tokenMatch[1]) : 0n;
        const submittedAt = dateMatch ? new Date(dateMatch[1]) : new Date();

        if (status === MISSION_TASK_STATUS.CLOSED) {
          // Info: (20260430 - Luphia) TaskStatus.Closed -> Approved!
          const revenueStr = formatTaskReward(reward);
          const revenueDec = new Decimal(revenueStr);
          const timeSpentMs = submittedAt.getTime() - createdAt.getTime();
          const timeSpentSec = timeSpentMs > 0 ? timeSpentMs / 1000 : 1;

          const tokenUnitPrice =
            consumedTokens > 0n
              ? revenueDec.dividedBy(consumedTokens.toString()).toFixed(6)
              : "N/A";
          const timeUnitPrice = revenueDec.dividedBy(timeSpentSec).toFixed(6);

          const closeContent = `# Closure Record
- Task ID: ${taskId}
- Status: Approved
- Consumed Tokens: ${consumedTokens}
- Revenue Gained (ISC): ${revenueStr}
- Time Spent (seconds): ${timeSpentSec.toFixed(2)}
- Token Unit Price (ISC/Token): ${tokenUnitPrice}
- Time Unit Price (ISC/second): ${timeUnitPrice}
- Closed At: ${new Date().toISOString()}
`;
          await fs.writeFile(closePath, closeContent, "utf8");
          console.log(
            `[MissionFallbacker] Task ${taskId} approved. close.md created.`,
          );
          break; // Info: (20260430 - Luphia) process one per tick
        } else if (submissionCount > 0) {
          // Info: (20260430 - Luphia) Check if latest submission is rejected
          const latestSubmission = await getLatestSubmission(task);
          const isRejected = latestSubmission?.isRejected ?? false;

          if (isRejected) {
            if (submissionCount >= MISSION_MAX_REJECTIONS) {
              console.log(
                `[MissionFallbacker] Task ${taskId} was REJECTED ${submissionCount} times! Giving up...`,
              );
              const giveupContent = `# Give Up Record
- Task ID: ${taskId}
- Status: Given Up
- Reason: Rejected 3 times
- Given Up At: ${new Date().toISOString()}
`;
              await fs.writeFile(
                path.join(taskDir, "giveup.md"),
                giveupContent,
                "utf8",
              );
              break; // Info: (20260502 - Luphia) process one per tick
            } else {
              console.log(
                `[MissionFallbacker] Task ${taskId} was REJECTED! Renaming files to re-execute...`,
              );
              const timestamp = Date.now();
              try {
                await fs.rename(
                  resultPath,
                  path.join(taskDir, `result_rejected_${timestamp}.md`),
                );
              } catch {}
              try {
                await fs.rename(
                  submitPath,
                  path.join(taskDir, `submit_rejected_${timestamp}.md`),
                );
              } catch {}
              break; // Info: (20260430 - Luphia) process one per tick
            }
          }
        }
      } catch (err) {
        console.error(
          `[MissionFallbacker] Error processing Task ID ${folder.name}:`,
          err,
        );
      }
    }
  } catch (e) {
    console.log(
      "[MissionFallbacker] Invalid MISSION_DIR or none exists yet.",
      e,
    );
  }

  if (!processedAny) {
    console.log("[MissionFallbacker] No pending tasks to fallback or close.");
  }
}
