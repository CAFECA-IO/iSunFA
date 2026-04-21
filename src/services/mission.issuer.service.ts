import { prisma } from "@/lib/prisma";
import { getAnalysisCost, AnalysisCostParams } from "@/lib/analysis/pricing";
import { storageService } from "@/services/storage.service";
import { getPriorityEnvConfig } from "@/services/env.service";
import { getAdminAccount } from "@/lib/wallet/admin_wallet";
import { createPublicClient, createWalletClient, http, parseAbi, parseEther, formatEther } from "viem";
import { isuncoin } from "@/lib/viem_public";
import fs from "fs/promises";
import path from "path";
import { ORDER_STATUS } from "@/constants/status";
import { analysisRepo } from "@/repositories/analysis.repo";

// Info: (20260420 - Luphia) ERC20 & MissionBoard ABIs
const CP_ABI = parseAbi([
  "function collateralizedMint(address to, uint256 amount) external payable",
  "function collateralRate() view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)"
]);

const MB_ABI = parseAbi([
  "function createTask(string calldata cid, uint256 initialReward) external returns (uint256)",
  "function minReward() view returns (uint256)"
]);

export class MissionIssuerService {
  async processNext() {
    console.log("[MissionIssuer] Scanning for PAID orders to issue missions...");

    // Info: (20260420 - Luphia) Find the first PAID order that has not been converted to a mission
    const order = await prisma.order.findFirst({
      where: {
        status: ORDER_STATUS.PAID,
      },
      orderBy: { createdAt: "asc" }
    });

    if (!order) {
      console.log("[MissionIssuer] No pending PAID orders found.");
      return null;
    }

    console.log(`[MissionIssuer] Processing Order ${order.id}...`);

    try {
      const orderDataObj = (order.data as Record<string, unknown>) || {};
      const payloadData = (orderDataObj.data as Record<string, unknown>) || {};
      const category = (payloadData.category || orderDataObj.category) as string;
      const files = (payloadData.files || orderDataObj.files) as { hash: string; name: string }[] | undefined;

      let itemsToProcess = [{ fileInfo: null as { hash: string; name: string } | null, index: 0 }];
      if (category === "CERTIFICATE_ANALYSIS" && Array.isArray(files) && files.length > 0) {
        itemsToProcess = files.map((f, i) => ({ fileInfo: f, index: i }));
      }

      const generatedTaskIds: string[] = [];

      // Info: (20260420 - Luphia) 2. Setup Blockchain Clients
      const adminAccount = await getAdminAccount();
      const setupConfig = await getPriorityEnvConfig();
      const rpcUrl = setupConfig.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:20024";
      const publicClient = createPublicClient({ transport: http(rpcUrl) });
      const walletClient = createWalletClient({ account: adminAccount, chain: isuncoin, transport: http(rpcUrl) });

      const cpAddress = setupConfig.NEXT_PUBLIC_CREDIT_POINT_ADDRESS as `0x${string}`;
      const mbAddress = setupConfig.NEXT_PUBLIC_MISSION_BOARD_ADDRESS as `0x${string}`;

      if (!cpAddress || !mbAddress) {
        throw new Error("Missing CP or MB contract addresses in env.");
      }

      // Info: (20260420 - Luphia) 3. Calculate Reward using getAnalysisCost
      const actualParams = (orderDataObj.data || orderDataObj) as unknown as AnalysisCostParams;
      const computedCost = getAnalysisCost(actualParams);
      let baseRewardBigInt = parseEther(Math.max(0, computedCost / 2 / itemsToProcess.length).toString());

      const minRewardWei = await publicClient.readContract({
        address: mbAddress,
        abi: MB_ABI,
        functionName: "minReward"
      });

      if (baseRewardBigInt < minRewardWei) {
        console.log(`[MissionIssuer] Reward ${formatEther(baseRewardBigInt)} ICP per task is below minReward ${formatEther(minRewardWei)} ICP, padding it...`);
        baseRewardBigInt = minRewardWei;
      }

      for (const item of itemsToProcess) {
        // Info: (20260420 - Luphia) 1. Generate & Upload mission.json to IPFS (via Laria)
        const itemData = item.fileInfo ? { ...orderDataObj, fileId: item.fileInfo.hash } : orderDataObj;
        const missionData = {
          orderId: order.id,
          type: order.type,
          unit: order.unit,
          amount: order.amount,
          ...itemData
        };

        const missionJsonStr = JSON.stringify(missionData, null, 2);
        const missionBlob = new Blob([missionJsonStr], { type: "application/json" });
        const missionFile = new globalThis.File([missionBlob], "mission.json", { type: "application/json" });

        const cid = await storageService.uploadLaria(missionFile);
        console.log(`[MissionIssuer] Uploaded mission.json. CID: ${cid}`);

        // Info: (20260420 - Luphia) 4. Check Balance & conditionally mint tokens to adminAccount
        const currentBalance = await publicClient.readContract({
          address: cpAddress,
          abi: CP_ABI,
          functionName: "balanceOf",
          args: [adminAccount.address]
        });

        if ((currentBalance as bigint) < baseRewardBigInt) {
          // Info: (20260420 - Luphia) Minting 1000 tokens if insufficient
          const mintAmount = parseEther("1000");
          const collateralRateWei = await publicClient.readContract({
            address: cpAddress,
            abi: CP_ABI,
            functionName: "collateralRate"
          });

          const requiredISC = (mintAmount * (collateralRateWei as bigint)) / BigInt(10 ** 18);

          console.log(`[MissionIssuer] Insufficient balances (has ${formatEther(currentBalance as bigint)} ICP, needs ${formatEther(baseRewardBigInt)} ICP). Minting 1000 ICP with ${formatEther(requiredISC)} ISC collateral...`);
          const mintTx = await walletClient.writeContract({
            account: adminAccount,
            address: cpAddress,
            abi: CP_ABI,
            functionName: "collateralizedMint",
            args: [adminAccount.address, mintAmount],
            value: requiredISC
          });
          await publicClient.waitForTransactionReceipt({ hash: mintTx });
        } else {
          console.log(`[MissionIssuer] Balance sufficient (${formatEther(currentBalance as bigint)} ICP). Skipping mint.`);
        }

        // Info: (20260420 - Luphia) 5. Approve MissionBoard
        const currentAllowance = await publicClient.readContract({
          address: cpAddress,
          abi: CP_ABI,
          functionName: "allowance",
          args: [adminAccount.address, mbAddress]
        });

        if ((currentAllowance as bigint) < baseRewardBigInt) {
          console.log(`[MissionIssuer] Approving MissionBoard to spend ICP...`);
          const approveTx = await walletClient.writeContract({
            account: adminAccount,
            address: cpAddress,
            abi: CP_ABI,
            functionName: "approve",
            args: [mbAddress, baseRewardBigInt] // Info: (20260420 - Luphia) Optionally maxUint256
          });
          await publicClient.waitForTransactionReceipt({ hash: approveTx });
        }

        // Info: (20260420 - Luphia) 6. Create Task on MissionBoard
        console.log(`[MissionIssuer] Creating task on MissionBoard with CID ${cid} and reward ${formatEther(baseRewardBigInt)} ICP...`);
        const { request } = await publicClient.simulateContract({
          account: adminAccount,
          address: mbAddress,
          abi: MB_ABI,
          functionName: "createTask",
          args: [cid, baseRewardBigInt]
        });

        const createTx = await walletClient.writeContract(request);
        const receipt = await publicClient.waitForTransactionReceipt({ hash: createTx });

        // Info: (20260420 - Luphia) Decode the TaskCreated event to get the taskId
        const logs = receipt.logs;
        // Info: (20260420 - Luphia) In viem we can parse the event if we have the full ABI, or we just rely on L2 indexing.
        // Info: (20260420 - Luphia) Wait, let's parse via viem decodeEventLog
        let taskId = "";
        const MB_FULL_ABI = parseAbi([
          "event TaskCreated(uint256 indexed taskId, address indexed creator, uint256 reward, string contentCid)"
        ]);

        for (const log of logs) {
          try {
            const publicClientImport = await import("viem");
            const decoded = publicClientImport.decodeEventLog({
              abi: MB_FULL_ABI,
              data: log.data,
              topics: log.topics,
              eventName: "TaskCreated"
            });
            if (decoded && decoded.args && "taskId" in decoded.args) {
              taskId = String((decoded.args as { taskId: bigint }).taskId);
              break;
            }
          } catch {
            // Info: (20260420 - Luphia) ignore parsing error for other events
          }
        }

        if (!taskId) {
          throw new Error("Could not find TaskCreated event to extract taskId.");
        }

        console.log(`[MissionIssuer] Task created! Task ID: ${taskId}`);

        // Info: (20260420 - Luphia) 7. Store Files Locally (ISSUE_DIR)
        const issueDirBase = setupConfig.ISSUE_DIR || "issues";
        const folderName = `${mbAddress}_${taskId}`;
        const taskDir = path.join(process.cwd(), issueDirBase, folderName);
        await fs.mkdir(taskDir, { recursive: true });

        await fs.writeFile(path.join(taskDir, "mission.json"), missionJsonStr, "utf8");

        const planValidatorContent = `# Plan Validator
This is an automated validation plan.
## Verifications
1. Check if the output follows the expected analysis structure for category: ${category}.
2. Ensure the resulting numerical figures are accurately derived from ${missionData.type}.
`;
        await fs.writeFile(path.join(taskDir, "plan.validator.md"), planValidatorContent, "utf8");

        generatedTaskIds.push(taskId);

        // Info: (20260421 - Luphia) If part of batched multi-file, write individual DB record mapping
        if (item.fileInfo && category === "CERTIFICATE_ANALYSIS") {
          await analysisRepo.create({
            reportId: crypto.randomUUID(),
            userId: order.userId,
            orderId: order.id,
            category: category,
            data: {
              missionName: `Analysis-${category}-${item.fileInfo.name}`,
              missionTaskId: taskId,
              category: category,
              cost: (orderDataObj.cost as number) || 0,
              generatedAt: new Date().toISOString(),
              periodType: "unknown",
              periodValue: "unknown",
              year: new Date().getFullYear(),
              keyword: item.fileInfo.name,
              isExternal: false,
              fileHash: item.fileInfo.hash
            }
          });
        }
      }

      // Info: (20260420 - Luphia) 8. Update DB
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: ORDER_STATUS.EXECUTING,
          mission: JSON.stringify(generatedTaskIds) // Info: (20260422 - Luphia) storing array of TaskIDs safely
        }
      });

      console.log(`[MissionIssuer] Order ${order.id} transitioned to EXECUTING. NFT Task IDs: ${generatedTaskIds.join(", ")}`);
      return generatedTaskIds[0];

    } catch (e) {
      console.error(`[MissionIssuer] Error processing order ${order.id}:`, e);
      // Info: (20260420 - Luphia) Depending on severity, we could mark the order as PAYMENT_FAILED or just retry next loop.
      throw e;
    }
  }
}

export const missionIssuerService = new MissionIssuerService();
