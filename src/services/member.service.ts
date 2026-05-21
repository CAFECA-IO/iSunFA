"use server";

import { getAddress, parseAbi, parseEther, formatEther } from "viem";
import { publicClient } from "@/lib/viem";
import {
  getAdminAccount,
  getAdminWalletClient,
} from "@/lib/wallet/admin_wallet";
import { CONTRACT_ADDRESSES } from "@/config/contracts";
import { MoneyUtil } from "@/lib/utils/money";

const MEMBERSHIP_ABI = parseAbi([
  "function registerUser(address user) external",
  "function dailyCheckIn(address user) external",
  "function issuePurchasedPoints(address user, uint256 amount) external",
  "function userRegistrationTimes(address user) external view returns (uint256)",
  "function userLastCheckIns(address user) external view returns (uint256)",
  "function userTotalCheckInRewards(address user) external view returns (uint256)",
  "function userTotalPurchasedPoints(address user) external view returns (uint256)",
]);

type ActionResponse<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
};

// Info: (20260413 - Luphia) Ensures system dependencies are ready
async function getClients() {
  const account = await getAdminAccount();
  const walletClient = await getAdminWalletClient();
  const membershipAddress = CONTRACT_ADDRESSES.MEMBERSHIP_SYSTEM;

  if (!walletClient || !publicClient || !account) {
    throw new Error("Blockchain clients not properly initialized");
  }

  if (!membershipAddress) {
    throw new Error("Server Config Error: MembershipSystem address is missing");
  }

  return {
    account,
    walletClient,
    membershipAddress: getAddress(membershipAddress),
  };
}

// Info: (20260413 - Luphia) Gives a user the 100 pt Registration Reward on-chain.
export async function registerUserViaMembership(
  userAddress: string,
): Promise<ActionResponse> {
  try {
    const { account, walletClient, membershipAddress } = await getClients();
    const validTo = getAddress(userAddress);

    const { request } = await publicClient.simulateContract({
      account,
      address: membershipAddress,
      abi: MEMBERSHIP_ABI,
      functionName: "registerUser",
      args: [validTo],
    });

    const tx = await walletClient.writeContract(request);
    await publicClient.waitForTransactionReceipt({ hash: tx });

    return {
      success: true,
      message: "User registered successfully",
      data: { tx },
    };
  } catch (error) {
    console.error(
      `[MembershipService] registerUser failed for ${userAddress}:`,
      error,
    );
    return { success: false, message: (error as Error).message };
  }
}

/**
 * Info: (20260413 - Luphia) Claims the 5 pt daily check-in reward for a user on-chain.
 * Reverts if 24 hours haven't passed.
 */
export async function claimDailyCheckIn(
  userAddress: string,
): Promise<ActionResponse> {
  try {
    const { account, walletClient, membershipAddress } = await getClients();
    const validTo = getAddress(userAddress);

    const { request } = await publicClient.simulateContract({
      account,
      address: membershipAddress,
      abi: MEMBERSHIP_ABI,
      functionName: "dailyCheckIn",
      args: [validTo],
    });

    const tx = await walletClient.writeContract(request);
    await publicClient.waitForTransactionReceipt({ hash: tx });

    return { success: true, message: "Daily check-in processed", data: { tx } };
  } catch (error) {
    /**
     * Info: (20260413 - Luphia) We don't want to blow up the backend entirely if someone just checks in too early,
     * so just log the warning and return false gracefully.
     */
    console.warn(
      `[MembershipService] dailyCheckIn blocked for ${userAddress}: ${(error as Error).message.split("\n")[0]}`,
    );
    return { success: false, message: (error as Error).message };
  }
}

// Info: (20260413 - Luphia) Distributes purchased points directly through the Membership contract's reserve.
export async function issuePurchasedPointsToMember(
  userAddress: string,
  amount: number | string,
): Promise<ActionResponse> {
  let account, walletClient, membershipAddress;
  try {
    const clients = await getClients();
    account = clients.account;
    walletClient = clients.walletClient;
    membershipAddress = clients.membershipAddress;
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }

  const validTo = getAddress(userAddress);
  const parsedAmount = parseEther(amount.toString());

  const executeIssue = async () => {
    const { request } = await publicClient.simulateContract({
      account: account!,
      address: membershipAddress!,
      abi: MEMBERSHIP_ABI,
      functionName: "issuePurchasedPoints",
      args: [validTo, parsedAmount],
    });

    const tx = await walletClient!.writeContract(request);
    await publicClient.waitForTransactionReceipt({ hash: tx });
    return tx;
  };

  let retries = 3;
  while (retries > 0) {
    try {
      const tx = await executeIssue();
      return {
        success: true,
        message: `Issued ${amount} points`,
        data: { tx },
      };
    } catch (error) {
      const errorMsg = (error as Error).message || "";

      // Info: (20260504 - Luphia) Handle nonce collisions when Bundler and MembershipService use the same admin wallet concurrently
      if (
        errorMsg.includes("replacement transaction underpriced") ||
        errorMsg.includes("nonce too low") ||
        errorMsg.includes("already known")
      ) {
        console.warn(
          `[MembershipService] Nonce collision detected, retrying in 2 seconds... (${retries} retries left)`,
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));
        retries--;
        if (retries === 0) {
          console.error(
            `[MembershipService] Max retries reached for nonce collision for ${userAddress}`,
          );
          return {
            success: false,
            message: "Transaction failed due to concurrent nonce collision.",
          };
        }
        continue; // Info: (20260504 - Luphia) Retry due to nonce collision
      }

      // Info: (20260417 - Luphia) Auto-funding mechanism if contract runs out of ISC reserves
      if (
        errorMsg.includes("InsufficientContractReserves") ||
        errorMsg.includes("0x9443a76e")
      ) {
        // Info: (20260417 - Luphia) Make auto-funding dynamic to cover large issuances, plus 50 as buffer
        const amtDec = MoneyUtil.toDecimal(amount);
        const fundingAmountDec = amtDec.plus(50);
        const fundingAmount = fundingAmountDec.gt(50)
          ? fundingAmountDec.toString()
          : "50";
        console.warn(
          `[MembershipService] Contract reserves low during point issuance. Executing auto-funding of ${fundingAmount} ISC...`,
        );
        const fundRes = await fundMembershipSystem(fundingAmount);
        if (!fundRes.success) {
          return {
            success: false,
            message: `Auto-funding sequence failed: ${fundRes.message}`,
          };
        }
        console.log(
          `[MembershipService] Auto-funding successful. Retrying point issuance...`,
        );

        retries--;
        continue; // Info: (20260504 - Luphia) Retry the issue execution instead of throwing
      }

      console.error(
        `[MembershipService] issuePurchasedPoints failed for ${userAddress}:`,
        error,
      );
      return { success: false, message: errorMsg };
    }
  }

  return { success: false, message: "Max retries exceeded" };
}

// Info: (20260413 - Luphia) Query user info from MembershipSystem
export async function getMemberInfo(userAddress: string) {
  try {
    const { membershipAddress } = await getClients();
    const validTo = getAddress(userAddress);

    const [regTime, lastCheckIn, checkInRewards, purchasedPoints] =
      await Promise.all([
        publicClient.readContract({
          address: membershipAddress,
          abi: MEMBERSHIP_ABI,
          functionName: "userRegistrationTimes",
          args: [validTo],
        }),
        publicClient.readContract({
          address: membershipAddress,
          abi: MEMBERSHIP_ABI,
          functionName: "userLastCheckIns",
          args: [validTo],
        }),
        publicClient.readContract({
          address: membershipAddress,
          abi: MEMBERSHIP_ABI,
          functionName: "userTotalCheckInRewards",
          args: [validTo],
        }),
        publicClient.readContract({
          address: membershipAddress,
          abi: MEMBERSHIP_ABI,
          functionName: "userTotalPurchasedPoints",
          args: [validTo],
        }),
      ]);

    return {
      success: true,
      data: {
        registrationTime: Number(regTime) * 1000,
        lastCheckInTime: Number(lastCheckIn) * 1000,
        totalCheckInRewards: formatEther(checkInRewards as bigint),
        totalPurchasedPoints: formatEther(purchasedPoints as bigint),
      },
    };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

// Info: (20260417 - Luphia) Funds the MembershipSystem contract with Native ISC (Ether equivalent)
export async function fundMembershipSystem(
  amountISC: number | string,
): Promise<ActionResponse> {
  try {
    const { account, walletClient, membershipAddress } = await getClients();
    const parsedAmount = parseEther(amountISC.toString());

    const hash = await walletClient.sendTransaction({
      account,
      to: membershipAddress,
      value: parsedAmount,
    });

    await publicClient.waitForTransactionReceipt({ hash });

    return {
      success: true,
      message: `Successfully funded MembershipSystem with ${amountISC} ISC`,
      data: { tx: hash },
    };
  } catch (error) {
    console.error(`[MembershipService] fundMembershipSystem failed:`, error);
    return { success: false, message: (error as Error).message };
  }
}
