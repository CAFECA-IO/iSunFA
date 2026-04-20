import { publicClient, isuncoin } from "@/lib/viem_public";
import { http, formatEther, parseAbi, stringToHex, createWalletClient, createPublicClient } from "viem";
import { getAdminAccount } from "@/lib/wallet/admin_wallet";
import { dockerService } from "@/services/docker.service";
import { ENV_PATH, ENV_SETUP_PATH, loadEnvConfig, getPriorityEnvConfig } from "@/services/env.service";

export async function getAdminWalletInfo() {
  try {
    let adminAccount;
    try {
      adminAccount = await getAdminAccount();
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
    const address = adminAccount.address;

    const envConfig = await loadEnvConfig(ENV_PATH);
    const rpcUrl = envConfig.NEXT_PUBLIC_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:20024";

    const localPublicClient = createPublicClient({ transport: http(rpcUrl) });
    const balanceWei = await localPublicClient.getBalance({ address });
    const balanceEth = formatEther(balanceWei);

    let isMining = false;
    try {
      const miningRes = await dockerService.execContainer(
        "blockchain",
        `isuncoin attach --exec "eth.mining" http://127.0.0.1:20024`,
      );
      if (miningRes.success && miningRes.output) {
        isMining = miningRes.output.includes("true");
      }
    } catch (e) {
      console.warn("Failed to check mining status:", e);
    }

    let isfBalance = "0.0";
    const setupConfig = await loadEnvConfig(ENV_SETUP_PATH);
    const cpAddress = setupConfig.NEXT_PUBLIC_CREDIT_POINT_ADDRESS;

    if (cpAddress) {
      try {
        const cpAbi = parseAbi(["function balanceOf(address account) external view returns (uint256)"]);
        const isfWei = await localPublicClient.readContract({
          address: cpAddress as `0x${string}`,
          abi: cpAbi,
          functionName: "balanceOf",
          args: [address],
        });
        isfBalance = formatEther(isfWei);
      } catch (e) {
        console.warn("Could not read ISF balance:", e);
      }
    }

    return {
      success: true,
      address,
      balance: balanceEth,
      isfBalance,
      isMining: !!isMining,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function toggleMining(start: boolean) {
  try {
    let adminAccount;
    try {
      adminAccount = await getAdminAccount();
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
    const address = adminAccount.address;

    const cmd = start
      ? `isuncoin attach --exec "miner.setEtherbase('${address.trim()}'); miner.start(5)" http://127.0.0.1:20024`
      : `isuncoin attach --exec "miner.stop()" http://127.0.0.1:20024`;

    return await dockerService.execContainer("blockchain", cmd);
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function ensureSmartContractWallet(credentialId: string, pubKeyX: string, pubKeyY: string, name: string) {
  const envConfig = await getPriorityEnvConfig();
  const factoryAddress = (envConfig.NEXT_PUBLIC_SCW_FACTORY_ADDRESS || process.env.NEXT_PUBLIC_SCW_FACTORY_ADDRESS) as `0x${string}`;

  if (!factoryAddress) return;

  let adminAccount;
  try {
    adminAccount = await getAdminAccount();
  } catch { return; }

  const rpcUrl = envConfig.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:20024";
  const mainWalletClient = createWalletClient({ chain: isuncoin, account: adminAccount, transport: http(rpcUrl) });

  const factoryAbi = parseAbi([
    "function getAccountByCredentialId(bytes) view returns (address)",
    "function createAccount(bytes, uint256, uint256, uint256, string, string) external returns (address)",
  ]);

  const existingScw = await publicClient.readContract({
    address: factoryAddress,
    abi: factoryAbi,
    functionName: "getAccountByCredentialId",
    args: [stringToHex(credentialId)],
  });

  if (existingScw === "0x0000000000000000000000000000000000000000") {
    const deployTx = await mainWalletClient.writeContract({
      address: factoryAddress,
      abi: factoryAbi,
      functionName: "createAccount",
      args: [stringToHex(credentialId), BigInt(pubKeyX), BigInt(pubKeyY), BigInt(0), name, ""],
    });
    await publicClient.waitForTransactionReceipt({ hash: deployTx });
  }
}

export async function grantDefaultAdminRoles(address: string) {
  const envConfig = await getPriorityEnvConfig();
  let adminAccount;
  try { adminAccount = await getAdminAccount(); } catch { return; }

  const rpcUrl = envConfig.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:20024";
  const mainWalletClient = createWalletClient({ chain: isuncoin, account: adminAccount, transport: http(rpcUrl) });

  const accessControlAbi = parseAbi(["function grantRole(bytes32 role, address account) external"]);
  const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;

  const contractsToTransfer = [
    envConfig.NEXT_PUBLIC_DYNAMIC_KYC_MEMBERSHIP_ADDRESS,
    envConfig.NEXT_PUBLIC_CREDIT_POINT_ADDRESS,
    envConfig.NEXT_PUBLIC_SUBSCRIPTION_MANAGER_ADDRESS,
    envConfig.NEXT_PUBLIC_MISSION_BOARD_ADDRESS,
  ].filter(Boolean);

  for (const contractAddr of contractsToTransfer) {
    const tx = await mainWalletClient.writeContract({
      address: contractAddr as `0x${string}`,
      abi: accessControlAbi,
      functionName: "grantRole",
      args: [DEFAULT_ADMIN_ROLE, address as `0x${string}`],
    });
    await publicClient.waitForTransactionReceipt({ hash: tx });
  }
}

export async function revokeDefaultAdminRoles(address: string) {
  const envConfig = await getPriorityEnvConfig();
  let adminAccount;
  try { adminAccount = await getAdminAccount(); } catch { return; }

  const rpcUrl = envConfig.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:20024";
  const mainWalletClient = createWalletClient({ chain: isuncoin, account: adminAccount, transport: http(rpcUrl) });

  const accessControlAbi = parseAbi(["function revokeRole(bytes32 role, address account) external"]);
  const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;

  const contractsToTransfer = [
    envConfig.NEXT_PUBLIC_DYNAMIC_KYC_MEMBERSHIP_ADDRESS,
    envConfig.NEXT_PUBLIC_CREDIT_POINT_ADDRESS,
    envConfig.NEXT_PUBLIC_SUBSCRIPTION_MANAGER_ADDRESS,
    envConfig.NEXT_PUBLIC_MISSION_BOARD_ADDRESS,
  ].filter(Boolean);

  for (const contractAddr of contractsToTransfer) {
    const tx = await mainWalletClient.writeContract({
      address: contractAddr as `0x${string}`,
      abi: accessControlAbi,
      functionName: "revokeRole",
      args: [DEFAULT_ADMIN_ROLE, address as `0x${string}`],
    });
    await publicClient.waitForTransactionReceipt({ hash: tx });
  }
}

export async function setAccountKYCLevel(address: string, level: number) {
  const envConfig = await getPriorityEnvConfig();
  if (!envConfig.NEXT_PUBLIC_DYNAMIC_KYC_MEMBERSHIP_ADDRESS) return;

  let adminAccount;
  try { adminAccount = await getAdminAccount(); } catch { return; }

  const rpcUrl = envConfig.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:20024";
  const mainWalletClient = createWalletClient({ chain: isuncoin, account: adminAccount, transport: http(rpcUrl) });

  const irAddress = envConfig.NEXT_PUBLIC_DYNAMIC_KYC_MEMBERSHIP_ADDRESS as `0x${string}`;
  const irAbi = parseAbi([
    "function updateKYC(address, uint8) external",
    "function getKYCLevel(address) view returns (uint8)",
  ]);

  const kycLevel = await publicClient.readContract({
    address: irAddress,
    abi: irAbi,
    functionName: "getKYCLevel",
    args: [address as `0x${string}`],
  });

  if (kycLevel < level) {
    const tx = await mainWalletClient.writeContract({
      address: irAddress,
      abi: irAbi,
      functionName: "updateKYC",
      args: [address as `0x${string}`, level],
    });
    await publicClient.waitForTransactionReceipt({ hash: tx });
  }

  const adminKycLevel = await publicClient.readContract({
    address: irAddress,
    abi: irAbi,
    functionName: "getKYCLevel",
    args: [adminAccount.address],
  });

  if (adminKycLevel < level) {
    const adminTx = await mainWalletClient.writeContract({
      address: irAddress,
      abi: irAbi,
      functionName: "updateKYC",
      args: [adminAccount.address, level],
    });
    await publicClient.waitForTransactionReceipt({ hash: adminTx });
  }
}
