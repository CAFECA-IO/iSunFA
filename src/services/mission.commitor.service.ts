import { getPriorityEnvConfig } from "@/services/env.service";
import fs from "fs/promises";
import path from "path";
import { storageService } from "@/services/storage.service";
import { submitResult } from "@/services/mission_board.service";
import { parseMissionFolderName } from "@/constants/mission_board";

export async function processNext() {
  console.log(
    "[MissionCommitor] Scanning MISSION_DIR for completed executions to commit...",
  );

  const setupConfig = await getPriorityEnvConfig();
  const missionDirBase = setupConfig.MISSION_DIR || "missions";
  const missionDirPath = path.join(process.cwd(), missionDirBase);

  let submittedTask = false;

  try {
    const folders = await fs.readdir(missionDirPath, { withFileTypes: true });

    for (const folder of folders) {
      if (!folder.isDirectory()) continue;
      // Info: (20261015 - Luphia) 舊鏈資料夾的 taskId 可能與 DB 流水號同號，送出去會交到別人的任務上
      if (parseMissionFolderName(folder.name) === null) continue;
      const taskDir = path.join(missionDirPath, folder.name);
      const resultPath = path.join(taskDir, "result.md");
      const submitPath = path.join(taskDir, "submit.md");
      const metaPath = path.join(taskDir, "meta.json");
      const logPath = path.join(taskDir, "execution_log.json");

      try {
        await fs.access(resultPath);
      } catch {
        // Info: (20260420 - Luphia) No result yet
        continue;
      }

      try {
        await fs.access(submitPath);
        // Info: (20260420 - Luphia) Already submitted
        continue;
      } catch {
        // Info: (20260420 - Luphia) Ready to submit
      }

      try {
        await fs.access(path.join(taskDir, "giveup.md"));
        continue; // Info: (20260502 - Luphia) Already given up
      } catch {}

      const taskFiles = await fs.readdir(taskDir);
      const failedCommitFiles = taskFiles.filter(
        (f) => f.startsWith("commit_failed_") && f.endsWith(".md"),
      );

      if (failedCommitFiles.length >= 1) {
        // Info: (20260427 - Luphia) Max submit retries exceeded
        continue;
      }

      submittedTask = true;
      console.log(
        `[MissionCommitor] Found result ready to commit for Task ID: ${folder.name}`,
      );

      try {
        // Info: (20260420 - Luphia) 1. Read Meta
        const metaStr = await fs.readFile(metaPath, "utf8");
        const metaData = JSON.parse(metaStr);
        const taskId = Number(metaData.taskId);
        // Info: (20261015 - Luphia) meta.json 壞掉就別送出，避免拿 NaN 去查任務
        if (!Number.isSafeInteger(taskId) || taskId < 0) {
          throw new Error(`Invalid taskId in meta.json: ${metaData.taskId}`);
        }

        // Info: (20260420 - Luphia) 2. Upload result.md to IPFS (Laria)
        const resultStr = await fs.readFile(resultPath, "utf8");
        const resultBlob = new Blob([resultStr], { type: "text/markdown" });
        const resultFile = new globalThis.File([resultBlob], "result.md", {
          type: "text/markdown",
        });
        const resultCid = await storageService.uploadLaria(resultFile);
        console.log(`[MissionCommitor] result.md uploaded. CID: ${resultCid}`);

        // Info: (20260420 - Luphia) 2.5 Read Execution Logs for Token Counting
        let totalConsumedTokens = 0n;
        try {
          const logStr = await fs.readFile(logPath, "utf8");
          const logs = JSON.parse(logStr);
          if (Array.isArray(logs)) {
            for (const log of logs) {
              if (log.totalTokens) {
                totalConsumedTokens += BigInt(log.totalTokens);
              }
            }
          }
        } catch {
          console.log(
            `[MissionCommitor] No execution_log.json found or failed to parse for Task ID ${taskId}, defaulting to 0 tokens.`,
          );
        }

        // Info: (20260420 - Luphia) 3. Submit to MissionBoard
        console.log(
          `[MissionCommitor] Submitting result for Task ID: ${taskId} with ${totalConsumedTokens} tokens...`,
        );
        // Info: (20261015 - Luphia) 任務看板改存 DB：一次寫入即完成，沒有交易雜湊可記
        const submission = await submitResult({
          taskId,
          resultCid,
          consumedTokens: totalConsumedTokens,
        });

        console.log(
          `[MissionCommitor] Commit successful. Submission Index: ${submission.subIndex}`,
        );

        // Info: (20260420 - Luphia) 4. Record submit.md
        const submitContent = `# Submission Record
- Task ID: ${taskId}
- Result CID: ${resultCid}
- Consumed Tokens: ${totalConsumedTokens}
- Submission Index: ${submission.subIndex}
- Submitted At: ${new Date().toISOString()}
`;
        await fs.writeFile(submitPath, submitContent, "utf8");
        break; // Info: (20260420 - Luphia) process one at a time
      } catch (submitErr) {
        console.error(
          `[MissionCommitor] Commit error for Task ID ${folder.name}:`,
          submitErr,
        );
        const notePath = path.join(taskDir, "note.md");
        const errorMessage = `[Commit Error at ${new Date().toISOString()}]\n${submitErr instanceof Error ? submitErr.message : String(submitErr)}\n`;
        await fs.appendFile(notePath, errorMessage, "utf8").catch(() => {});
        await fs
          .writeFile(
            path.join(taskDir, `commit_failed_${Date.now()}.md`),
            errorMessage,
            "utf8",
          )
          .catch(() => {});
        break;
      }
    }
  } catch (e) {
    console.log("[MissionCommitor] Invalid MISSION_DIR or none exists yet.", e);
  }

  if (!submittedTask) {
    console.log("[MissionCommitor] No executions pending commit.");
  }
}
