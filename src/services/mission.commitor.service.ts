import { getPriorityEnvConfig } from "@/services/env.service";
import fs from "fs/promises";
import path from "path";
import { storageService } from "@/services/storage.service";
import { getAdminAccount } from "@/lib/wallet/admin_wallet";
import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { isuncoin } from "@/lib/viem_public";

const MB_ABI = parseAbi([
  "function submitResult(uint256 taskId, string calldata resultCid, uint256 consumedTokens) external"
]);

export class MissionCommitorService {
  async processNext() {
    console.log("[MissionCommitor] Scanning MISSION_DIR for completed executions to commit...");

    const setupConfig = await getPriorityEnvConfig();
    const missionDirBase = setupConfig.MISSION_DIR || "missions";
    const missionDirPath = path.join(process.cwd(), missionDirBase);

    let submittedTask = false;

    try {
      const folders = await fs.readdir(missionDirPath, { withFileTypes: true });

      for (const folder of folders) {
        if (!folder.isDirectory()) continue;
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

        submittedTask = true;
        console.log(`[MissionCommitor] Found result ready to commit for Task ID: ${folder.name}`);

        try {
          // Info: (20260420 - Luphia) 1. Read Meta
          const metaStr = await fs.readFile(metaPath, "utf8");
          const metaData = JSON.parse(metaStr);
          const taskId = BigInt(metaData.taskId);

          // Info: (20260420 - Luphia) 2. Upload result.md to IPFS (Laria)
          console.log(`[MissionCommitor] Uploading result.md to Laria...`);
          const resultStr = await fs.readFile(resultPath, "utf8");
          const resultBlob = new Blob([resultStr], { type: "text/markdown" });
          const resultFile = new globalThis.File([resultBlob], "result.md", { type: "text/markdown" });

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
            console.log(`[MissionCommitor] No execution_log.json found or failed to parse for Task ID ${taskId}, defaulting to 0 tokens.`);
          }

          // Info: (20260420 - Luphia) 3. Submit to MissionBoard
          const adminAccount = await getAdminAccount();
          const rpcUrl = setupConfig.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:20024";
          const publicClient = createPublicClient({ transport: http(rpcUrl) });
          const walletClient = createWalletClient({ account: adminAccount, chain: isuncoin, transport: http(rpcUrl) });

          const mbAddress = setupConfig.NEXT_PUBLIC_MISSION_BOARD_ADDRESS as `0x${string}`;

          console.log(`[MissionCommitor] Submitting result for Task ID: ${taskId} with ${totalConsumedTokens} tokens...`);
          const { request } = await publicClient.simulateContract({
            account: adminAccount,
            address: mbAddress,
            abi: MB_ABI,
            functionName: "submitResult",
            args: [taskId, resultCid, totalConsumedTokens]
          });

          const txHash = await walletClient.writeContract(request);
          await publicClient.waitForTransactionReceipt({ hash: txHash });

          console.log(`[MissionCommitor] Commit successful. Tx: ${txHash}`);

          // Info: (20260420 - Luphia) 4. Record submit.md
          const submitContent = `# Submission Record
- Task ID: ${taskId}
- Result CID: ${resultCid}
- Consumed Tokens: ${totalConsumedTokens}
- Transaction Hash: ${txHash}
- Submitted At: ${new Date().toISOString()}
`;
          await fs.writeFile(submitPath, submitContent, "utf8");
          break; // Info: (20260420 - Luphia) process one at a time
        } catch (submitErr) {
          console.error(`[MissionCommitor] Commit error for Task ID ${folder.name}:`, submitErr);
          const notePath = path.join(taskDir, "note.md");
          const errorMessage = `[Commit Error at ${new Date().toISOString()}]\n${submitErr instanceof Error ? submitErr.message : String(submitErr)}\n`;
          await fs.appendFile(notePath, errorMessage, "utf8").catch(() => { });
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
}

export const missionCommitorService = new MissionCommitorService();
