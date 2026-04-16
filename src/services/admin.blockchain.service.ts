"use server";

import { createPublicClient, createWalletClient, formatEther, http, parseAbi } from "viem";
import { isuncoin } from "@/lib/viem_public";
import { getAdminAccount } from "@/lib/wallet/admin_wallet";
import { getPriorityEnvConfig } from "@/services/env.service";
import { toggleMining } from "@/services/setup.service";
import { cookies } from "next/headers";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { Role } from "@/generated/client";

// Info: (20260416 - Luphia) 忽略本地端自簽憑證錯誤，讓 viem publicClient 可以正常存取 localhost https RPC
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

export interface IBlockchainDashboardData {
  address: string;
  adminIscBalance: string;
  membershipSystemIcpInventory: string;
  isMining: boolean;
  systemTotalIcp: string;
  collateralRate: string;
  totalMembers: number;
}

// Info: (20260416 - Luphia) 檢查使用者權限 (RBAC)
async function enforceAdminRole(clientToken?: string) {
  const cookieStore = await cookies();
  const token = clientToken || cookieStore.get("dewt")?.value;
  if (!token) throw new Error("Unauthorized");

  const dewtUser = await getIdentityFromDeWT(`Bearer ${token}`);
  if (!dewtUser || !dewtUser.id) {
    throw new Error("Forbidden: Invalid session");
  }

  // Info: (20260416 - Luphia) 強制向 DB 最新的 role 確認，不依賴 JWT Payload 容錯機制
  const dbUser = await webAuthnRepo.findUserById(dewtUser.id);

  if (!dbUser || (dbUser.role !== Role.SUPER_ADMIN && dbUser.role !== Role.ADMIN)) {
    console.log("User role:", dbUser?.role);
    throw new Error("Forbidden: Admin access mandatory");
  }
  return dbUser;
}

// Info: (20260416 - Luphia) 取得 Blockchain Dashboard 所需全部維度資料
export async function getBlockchainDashboardData(clientToken?: string): Promise<{ success: boolean, data?: IBlockchainDashboardData, error?: string }> {
  try {
    await enforceAdminRole(clientToken);

    const adminAccount = await getAdminAccount();
    const setupConfig = await getPriorityEnvConfig();
    const rpcUrl = setupConfig.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:20024";
    const publicClient = createPublicClient({ transport: http(rpcUrl) });

    const cpAddress = setupConfig.NEXT_PUBLIC_CREDIT_POINT_ADDRESS as `0x${string}`;
    const msAddress = setupConfig.NEXT_PUBLIC_MEMBERSHIP_SYSTEM_ADDRESS as `0x${string}`;

    // Info: (20260416 - Luphia) 1. Admin Wallet ISC & Mining info
    const adminAddress = adminAccount.address;
    const adminIscWei = await publicClient.getBalance({ address: adminAddress });
    const adminIscBalance = formatEther(adminIscWei);

    /**
     * Info: (20260416 - Luphia) For Mining we reuse toggleMining approach (check via API/Node or we can wrap the existing helper)
     * In setup.service, toggleMining returns status or we query it. 
     * Here we query directly if needed, or import the helper. Wait, `getAdminWalletInfo` in setup.service has logic for it.
     */
    let isMining = false;
    try {
      const { getAdminWalletInfo } = await import("@/services/setup.service");
      const walletInfo = await getAdminWalletInfo();
      isMining = !!walletInfo?.isMining;
    } catch {
      // Info: (20260416 - Luphia) Fallback
    }

    let membershipSystemIcpInventory = "0.0";
    let systemTotalIcp = "0.0";
    let collateralRate = "0.0";
    let totalMembers = 0;

    try {
      totalMembers = await webAuthnRepo.countUsers();
    } catch (e) {
      console.warn("Failed fetching total members: ", e);
    }

    // Info: (20260416 - Luphia) 3. Credit Point interactions
    if (cpAddress) {
      try {
        const cpAbi = parseAbi([
          "function balanceOf(address account) view returns (uint256)",
          "function totalSupply() view returns (uint256)",
          "function collateralRate() view returns (uint256)"
        ]);

        const [msIcpWei, totalWei, collatWei] = await Promise.all([
          msAddress ? publicClient.readContract({ address: cpAddress, abi: cpAbi, functionName: "balanceOf", args: [msAddress] }) : Promise.resolve(0n),
          publicClient.readContract({ address: cpAddress, abi: cpAbi, functionName: "totalSupply" }),
          publicClient.readContract({ address: cpAddress, abi: cpAbi, functionName: "collateralRate" })
        ]);

        membershipSystemIcpInventory = formatEther(msIcpWei as bigint);
        systemTotalIcp = formatEther(totalWei as bigint);
        collateralRate = formatEther(collatWei as bigint);
      } catch (err) {
        console.warn("Failed reading CreditPoint stats:", err);
      }
    }

    return {
      success: true,
      data: {
        address: adminAddress,
        adminIscBalance,
        membershipSystemIcpInventory,
        isMining,
        systemTotalIcp,
        collateralRate,
        totalMembers
      }
    };
  } catch (error: unknown) {
    console.error("Dashboard Fetch Error: ", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Info: (20260416 - Luphia) 安全鑄造代幣功能。透過 publicClient 等待交易完成 (Transaction Receipt) 確保上鏈。
export async function mintIcpAction(amount: number, clientToken?: string): Promise<{ success: boolean, message?: string }> {
  try {
    await enforceAdminRole(clientToken);
    if (typeof amount !== "number" || amount <= 0) {
      throw new Error("Invalid minting amount");
    }

    const adminAccount = await getAdminAccount();
    const setupConfig = await getPriorityEnvConfig();
    const rpcUrl = setupConfig.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:20024";

    const publicClient = createPublicClient({ transport: http(rpcUrl) });
    const walletClient = createWalletClient({ account: adminAccount, chain: isuncoin, transport: http(rpcUrl) });
    const cpAddress = setupConfig.NEXT_PUBLIC_CREDIT_POINT_ADDRESS as `0x${string}`;
    const msAddress = setupConfig.NEXT_PUBLIC_MEMBERSHIP_SYSTEM_ADDRESS as `0x${string}`;

    if (!walletClient || !publicClient || !adminAccount || !cpAddress || !msAddress) {
      throw new Error("Client initialization failed or missing required Addresses (CreditPoint or MembershipSystem).");
    }

    const tokenAbi = parseAbi([
      "function collateralizedMint(address to, uint256 amount) external payable",
      "function collateralRate() view returns (uint256)"
    ]);

    // Info: (20260416 - Luphia) 取得即時抵押率
    const collateralRateWei = await publicClient.readContract({
      address: cpAddress,
      abi: tokenAbi,
      functionName: "collateralRate"
    });

    // Info: (20260416 - Luphia) 換算所需 ISC (Wei)
    const amountBigInt = BigInt(Math.floor(amount * 10 ** 18));
    const requiredISC = (amountBigInt * (collateralRateWei as bigint)) / BigInt(10 ** 18);

    const adminAddress = adminAccount.address;
    const adminIscWei = await publicClient.getBalance({ address: adminAddress });

    if (adminIscWei < requiredISC) {
      throw new Error("Insufficient Admin ISC Balance to cover collateral.");
    }

    // Info: (20260416 - Luphia) 發送交易 (Mint 將代幣直接存入會員系統合約)
    const tx = await walletClient.writeContract({
      account: adminAccount,
      address: cpAddress,
      abi: tokenAbi,
      functionName: "collateralizedMint",
      args: [msAddress, amountBigInt],
      value: requiredISC
    });

    // Info: (20260416 - Luphia) 等待上鏈收據
    const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
    if (receipt.status !== "success") {
      throw new Error(`Transaction reverted on-chain. TX: ${tx}`);
    }

    return { success: true, message: `Successfully minted ${amount} ICP. TX: ${tx}` };
  } catch (error: unknown) {
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Info: (20260416 - Luphia) 切換挖礦開關。嚴格只接受 boolean 防止 Command Injection。
export async function toggleMiningAction(start: boolean, clientToken?: string): Promise<{ success: boolean, output?: string, error?: string }> {
  try {
    await enforceAdminRole(clientToken);

    // Info: (20260416 - Luphia) Mapping boolean state to strictly predefined commands within toggleMining service
    const res = await toggleMining(Boolean(start));
    if (!res.success) {
      throw new Error("error" in res && typeof res.error === "string" ? res.error : "Failed to toggle mining via setup.service");
    }

    return { success: true, output: "output" in res && typeof res.output === "string" ? res.output : undefined };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
