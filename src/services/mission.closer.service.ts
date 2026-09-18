import fs from "fs/promises";
import path from "path";
import { createPublicClient, http, formatEther } from "viem";
import { getPriorityEnvConfig } from "@/services/env.service";
import { DEFAULT_MISSION_DIR } from "@/constants/worker_node";
import {
  MISSION_BOARD_READ_ABI,
  isTaskGivenUp,
} from "@/lib/worker/mission_board_verdict";
import { Decimal } from "decimal.js";

// Info: (20260914 - Luphia) ABI 與 recorder 共用同一份（review 需修-6），見 lib/worker/mission_board_verdict
const MB_ABI = MISSION_BOARD_READ_ABI;

export async function processNext() {
  console.log(
    "[MissionFallbacker] Scanning MISSION_DIR for fallbacks and closures...",
  );

  const setupConfig = await getPriorityEnvConfig();
  const missionDirBase = setupConfig.MISSION_DIR || DEFAULT_MISSION_DIR;
  const missionDirPath = path.join(process.cwd(), missionDirBase);

  const rpcUrl = setupConfig.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:20024";
  const publicClient = createPublicClient({ transport: http(rpcUrl) });
  const mbAddress =
    setupConfig.NEXT_PUBLIC_MISSION_BOARD_ADDRESS as `0x${string}`;

  if (!mbAddress) {
    console.warn("[MissionFallbacker] MissionBoard address not configured.");
    return;
  }

  let processedAny = false;

  try {
    const folders = await fs.readdir(missionDirPath, { withFileTypes: true });

    for (const folder of folders) {
      if (!folder.isDirectory()) continue;
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
        const taskId = BigInt(metaData.taskId);

        const taskData = (await publicClient.readContract({
          address: mbAddress,
          abi: MB_ABI,
          functionName: "tasks",
          args: [taskId],
        })) as [string, string, bigint, bigint, bigint, number, bigint];

        const [, , reward, createdAt, , status, submissionCount] = taskData;

        // Info: (20260430 - Luphia) Extract submit info
        const submitStr = await fs.readFile(submitPath, "utf8");
        const tokenMatch = submitStr.match(/- Consumed Tokens: (\d+)/);
        const dateMatch = submitStr.match(/- Submitted At: (.*)/);

        const consumedTokens = tokenMatch ? BigInt(tokenMatch[1]) : 0n;
        const submittedAt = dateMatch ? new Date(dateMatch[1]) : new Date();

        if (status === 3) {
          // Info: (20260430 - Luphia) TaskStatus.Closed -> Approved!
          const revenueStr = formatEther(reward);
          const revenueDec = new Decimal(revenueStr);
          const timeSpentMs = submittedAt.getTime() - Number(createdAt) * 1000;
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
        } else if (submissionCount > 0n) {
          // Info: (20260430 - Luphia) Check if latest submission is rejected
          const latestSubIndex = submissionCount - 1n;
          const subData = (await publicClient.readContract({
            address: mbAddress,
            abi: MB_ABI,
            functionName: "taskSubmissions",
            args: [taskId, latestSubIndex],
          })) as [string, string, bigint, boolean, bigint];

          const [, , , isRejected] = subData;

          if (isRejected) {
            /**
             * Info: (20260914 - Luphia) 「放棄」的判準抽成純函式與 recorder 共用
             *（review 需修-6）：維運節點讀不到這裡寫的 `giveup.md`，改從鏈上
             * 推導同一個結論——兩邊各寫一個 3 就是分岔的起點。
             */
            if (isTaskGivenUp(submissionCount, isRejected)) {
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
