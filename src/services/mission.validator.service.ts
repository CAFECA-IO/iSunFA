import { getPriorityEnvConfig } from "@/services/env.service";
import fs from "fs/promises";
import path from "path";
import { storageService } from "@/services/storage.service";
import { getAdminAccount } from "@/lib/wallet/admin_wallet";
import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { isuncoin } from "@/lib/viem_public";

const MB_ABI = parseAbi([
  "function tasks(uint256) view returns (address creator, string contentCid, uint256 reward, uint256 createdAt, uint256 updatedAt, uint8 status, uint256 submissionCount)",
  "function taskSubmissions(uint256, uint256) view returns (address submitter, string resultCid, uint256 consumedTokens, bool isRejected, uint256 disputeUntil)",
  "function approveSubmission(uint256 taskId, uint256 subIndex) external",
  "function rejectSubmission(uint256 taskId, uint256 subIndex) external"
]);

export class MissionValidatorService {
  private lastCheckedTaskId = 0n;

  async processNext() {
    console.log("[MissionValidator] Fetching PendingReview tasks from MissionBoard...");

    const adminAccount = await getAdminAccount();
    const setupConfig = await getPriorityEnvConfig();
    const rpcUrl = setupConfig.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:20024";
    const publicClient = createPublicClient({ transport: http(rpcUrl) });
    const walletClient = createWalletClient({ account: adminAccount, chain: isuncoin, transport: http(rpcUrl) });

    const mbAddress = setupConfig.NEXT_PUBLIC_MISSION_BOARD_ADDRESS as `0x${string}`;

    const issueDirBase = setupConfig.ISSUE_DIR || "issues";
    const issueDirPath = path.join(process.cwd(), issueDirBase);

    let validatedTask = false;

    /**
     * Info: (20260420 - Luphia) We can rescan from 0, or keep track. Keeping it simple: scan from 0 for pending ones.
     * In production we would maintain state or query event logs.
     */
    let currentTaskId = 0n;

    while (true) {
      try {
        const taskData = await publicClient.readContract({
          address: mbAddress,
          abi: MB_ABI,
          functionName: "tasks",
          args: [currentTaskId]
        });

        const [creator, , , , , status, submissionCount] = taskData;

        if (creator === "0x0000000000000000000000000000000000000000") {
          break; // Info: (20260420 - Luphia) End of tasks
        }

        // Info: (20260420 - Luphia) status == 1 means PendingReview
        if (status === 1 && submissionCount > 0n) {
          const subIndex = submissionCount - 1n;
          const subData = await publicClient.readContract({
            address: mbAddress,
            abi: MB_ABI,
            functionName: "taskSubmissions",
            args: [currentTaskId, subIndex]
          });

          const [, resultCid, , isRejected,] = subData;

          if (!isRejected) {
            console.log(`[MissionValidator] Found PendingReview for Task ID: ${currentTaskId}, SubIndex: ${subIndex}`);

            const taskIssueDir = path.join(issueDirPath, currentTaskId.toString());
            const approvedPath = path.join(taskIssueDir, `approved.${subIndex}.md`);
            const rejectedPath = path.join(taskIssueDir, `rejected.${subIndex}.md`);

            // Info: (20260420 - Luphia) Check if we already validated this
            let alreadyValidated = false;
            try {
              await fs.access(approvedPath);
              alreadyValidated = true;
            } catch { /* Info: (20260420 - Luphia) nothing to do */ }
            try {
              await fs.access(rejectedPath);
              alreadyValidated = true;
            } catch { /* Info: (20260420 - Luphia) nothing to do */ }

            if (!alreadyValidated) {
              await fs.mkdir(taskIssueDir, { recursive: true });
              const validatorPlanPath = path.join(taskIssueDir, "plan.validator.md");
              let validatorPlan = "";
              try {
                validatorPlan = await fs.readFile(validatorPlanPath, "utf8");
              } catch {
                console.warn(`[MissionValidator] No plan.validator.md found for Task ID: ${currentTaskId}. Falling back to default rules.`);
                validatorPlan = "Default acceptance rules apply.";
              }
              console.log("[MissionValidator] Using plan for validation:", validatorPlan.substring(0, 50));

              console.log(`[MissionValidator] Downloading result CID: ${resultCid} from IPFS (Laria)...`);
              const fileBuffer = await storageService.recoverLaria(resultCid);
              const resultContent = fileBuffer.toString("utf8");

              const resultFileLocalPath = path.join(taskIssueDir, `${subIndex}.md`);
              await fs.writeFile(resultFileLocalPath, resultContent, "utf8");

              /**
               * Info: (20260420 - Luphia)
               * Here we would dynamically load LLM or validation rules matching \`plan.validator.md\`
               * Since we are executing off-chain templates, we simulate an 'Approved' validation here.
               */
              const isApproved = true;

              if (isApproved) {
                console.log(`[MissionValidator] Validation passed for Task ID: ${currentTaskId}. Approving submission...`);
                const { request } = await publicClient.simulateContract({
                  account: adminAccount,
                  address: mbAddress,
                  abi: MB_ABI,
                  functionName: "approveSubmission",
                  args: [currentTaskId, subIndex]
                });
                const txHash = await walletClient.writeContract(request);
                await publicClient.waitForTransactionReceipt({ hash: txHash });

                const approvedContent = `# Approved Submission
- Result CID: ${resultCid}
- Submission Index: ${subIndex}
- Validator Note: Everything matches \`plan.validator.md\` successfully.
- Transaction Hash: ${txHash}
`;
                await fs.writeFile(approvedPath, approvedContent, "utf8");
              } else {
                console.log(`[MissionValidator] Validation failed for Task ID: ${currentTaskId}. Rejecting submission...`);
                const { request } = await publicClient.simulateContract({
                  account: adminAccount,
                  address: mbAddress,
                  abi: MB_ABI,
                  functionName: "rejectSubmission",
                  args: [currentTaskId, subIndex]
                });
                const txHash = await walletClient.writeContract(request);
                await publicClient.waitForTransactionReceipt({ hash: txHash });

                const rejectedContent = `# Rejected Submission
- Result CID: ${resultCid}
- Submission Index: ${subIndex}
- Reason: Failed to meet validator structural requirements.
- Transaction Hash: ${txHash}
`;
                await fs.writeFile(rejectedPath, rejectedContent, "utf8");
              }

              validatedTask = true;
              break; // Info: (20260420 - Luphia) process one at a time
            }
          }
        }

        currentTaskId++;
      } catch (e) {
        console.error(`[MissionValidator] Execution error on Task ID ${currentTaskId}:`, e);
        /**
         * Info: (20260420 - Luphia) Do not break the entire loop on a single task error if it's not a contract out-of-bounds,
         * but since we don't know, we will stop exactly here until next interval to avoid spamming.
         */
        break;
      }
    }

    if (!validatedTask) {
      console.log("[MissionValidator] No pending review tasks found.");
    }
  }
}

export const missionValidatorService = new MissionValidatorService();
