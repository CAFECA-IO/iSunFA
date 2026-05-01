import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import {
  getAdminWalletClient,
  getAdminAccount,
} from "@/lib/wallet/admin_wallet";
import { publicClient } from "@/lib/viem_public";
import { parseAbi, maxUint256 } from "viem";
import { validateAdminFido2 } from "@/lib/auth/admin_validator";

const MB_ABI = parseAbi([
  "function cancelTask(uint256 taskId)",
  "function bumpTask(uint256 taskId)",
  "function rewardToken() view returns (address)",
  "function tasks(uint256 taskId) view returns (address creator, string contentCid, uint256 reward, uint256 createdAt, uint256 updatedAt, uint8 status, uint256 submissionCount)",
]);

const ERC20_ABI = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ mission_id: string }> },
) {
  try {
    const { body } = await validateAdminFido2(req);

    const resolvedParams = await params;
    const taskId = Number(resolvedParams.mission_id);
    if (isNaN(taskId)) return jsonFail(API_ERRORS.VL_INVALID_ID);

    const actionType = body.action; // Info: (20260424 - Luphia) "cancel" or "bump"

    const walletClient = await getAdminWalletClient();
    const account = await getAdminAccount();
    const address = process.env
      .NEXT_PUBLIC_MISSION_BOARD_ADDRESS as `0x${string}`;

    if (!address) {
      return jsonFail(API_ERRORS.IS_CONFIG_MISSING);
    }

    if (actionType === "cancel") {
      const { request } = await publicClient.simulateContract({
        account,
        address,
        abi: MB_ABI,
        functionName: "cancelTask",
        args: [BigInt(taskId)],
      });
      const hash = await walletClient.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash });
      return jsonOk({ success: true, hash });
    } else if (actionType === "bump") {
      const rewardTokenAddress = await publicClient.readContract({
        address,
        abi: MB_ABI,
        functionName: "rewardToken",
      });

      const taskData = await publicClient.readContract({
        address,
        abi: MB_ABI,
        functionName: "tasks",
        args: [BigInt(taskId)],
      });

      const currentReward = taskData[2];
      const bumpAmount = currentReward / 10n;

      if (bumpAmount > 0n) {
        const currentAllowance = await publicClient.readContract({
          address: rewardTokenAddress,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [account.address, address],
        });

        if (currentAllowance < bumpAmount) {
          const { request: approveReq } = await publicClient.simulateContract({
            account,
            address: rewardTokenAddress,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [address, maxUint256],
          });
          const approveHash = await walletClient.writeContract(approveReq);
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
        }
      }

      const { request } = await publicClient.simulateContract({
        account,
        address,
        abi: MB_ABI,
        functionName: "bumpTask",
        args: [BigInt(taskId)],
      });
      const hash = await walletClient.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash });
      return jsonOk({ success: true, hash });
    } else {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }
  } catch (error: unknown) {
    console.error("Mission Action Error:", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
