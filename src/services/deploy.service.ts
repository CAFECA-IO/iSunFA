import fs from "fs";
import { exec } from "child_process";
import { createPublicClient, http, parseAbi } from "viem";
import {
  loadEnvConfig,
  ENV_SETUP_PATH,
  ENV_PATH,
  getPriorityEnvConfig,
} from "@/services/env.service";

const globalAny = global as typeof globalThis & { deployTaskProgress?: string };

export async function checkHasExistingContracts(): Promise<boolean> {
  const envPaths = [ENV_SETUP_PATH, ENV_PATH];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const envConfig = await loadEnvConfig(envPath);
      if (envConfig.NEXT_PUBLIC_SCW_FACTORY_ADDRESS) {
        return true;
      }
    }
  }
  return false;
}

export async function deployContracts(collateralRate: number = 0.05, useExisting: boolean = true): Promise<{
  success: boolean;
  output: string;
  pending?: boolean;
}> {
  // Info: (20260414 - Luphia) Skip deployment if already deployed in any env file
  if (useExisting) {
    const envPaths = [ENV_SETUP_PATH, ENV_PATH];

    for (const envPath of envPaths) {
      if (fs.existsSync(envPath)) {
        const envConfig = await loadEnvConfig(envPath);
        if (
          envConfig.NEXT_PUBLIC_SCW_FACTORY_ADDRESS &&
          envConfig.NEXT_PUBLIC_MISSION_BOARD_ADDRESS &&
          envConfig.NEXT_PUBLIC_MISSION_BOARD_ADDRESS !== ""
        ) {
          const mockOutput = `
          DynamicKYCMembership: ${envConfig.NEXT_PUBLIC_DYNAMIC_KYC_MEMBERSHIP_ADDRESS || "0x"}
          CreditPoint: ${envConfig.NEXT_PUBLIC_CREDIT_POINT_ADDRESS || "0x"}
          MembershipSystem: ${envConfig.NEXT_PUBLIC_MEMBERSHIP_SYSTEM_ADDRESS || "0x"}
          SubscriptionManager: ${envConfig.NEXT_PUBLIC_SUBSCRIPTION_MANAGER_ADDRESS || "0x"}
          EntryPoint: ${envConfig.NEXT_PUBLIC_ENTRY_POINT_ADDRESS || "0x"}
          Fido2AccountFactory: ${envConfig.NEXT_PUBLIC_SCW_FACTORY_ADDRESS || "0x"}
          MissionBoard: ${envConfig.NEXT_PUBLIC_MISSION_BOARD_ADDRESS || "0x"}
          `;
          return { success: true, output: mockOutput };
        }
      }
    }
  }

  const rootPath = process.cwd();

  // Info: (20260419 - Luphia) If already running, return immediately
  if (globalAny.deployTaskProgress && globalAny.deployTaskProgress.includes("Starting deployment") && !globalAny.deployTaskProgress.includes("===== DEPLOYMENT SUMMARY =====") && !globalAny.deployTaskProgress.includes("Failed")) {
    return { success: true, output: globalAny.deployTaskProgress, pending: true };
  }

  globalAny.deployTaskProgress = "Starting deployment...\n";
  const command = "npm run deploy_contract";

  const child = exec(
    command,
    {
      cwd: rootPath,
      maxBuffer: 5 * 1024 * 1024,
      env: { ...process.env, DEPLOY_COLLATERAL_RATE: collateralRate.toString(), FORCE_REDEPLOY_CORE: useExisting ? "0" : "1" }
    },
    (error) => {
      if (error) {
        globalAny.deployTaskProgress += "\nFailed: " + error.message;
      }
    }
  );

  if (child.stdout) {
    child.stdout.on("data", (data) => {
      globalAny.deployTaskProgress += data;
    });
  }
  if (child.stderr) {
    child.stderr.on("data", (data) => {
      globalAny.deployTaskProgress += data;
    });
  }

  return { success: true, output: "Deployment started in background", pending: true };
}

export async function getDeployProgress() {
  return globalAny.deployTaskProgress || "";
}

export async function verifyContractDependencies() {
  const envConfig = await getPriorityEnvConfig();
  const rpcUrl = envConfig.NEXT_PUBLIC_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:20024";

  if (!envConfig.NEXT_PUBLIC_CREDIT_POINT_ADDRESS || !envConfig.NEXT_PUBLIC_DYNAMIC_KYC_MEMBERSHIP_ADDRESS) {
    return { success: false, results: [] };
  }

  const cp = envConfig.NEXT_PUBLIC_CREDIT_POINT_ADDRESS as `0x${string}`;
  const dmc = envConfig.NEXT_PUBLIC_DYNAMIC_KYC_MEMBERSHIP_ADDRESS as `0x${string}`;
  const sub = envConfig.NEXT_PUBLIC_SUBSCRIPTION_MANAGER_ADDRESS as `0x${string}`;
  const mb = envConfig.NEXT_PUBLIC_MISSION_BOARD_ADDRESS as `0x${string}`;
  const mem = envConfig.NEXT_PUBLIC_MEMBERSHIP_SYSTEM_ADDRESS as `0x${string}`;

  try {
    const client = createPublicClient({ transport: http(rpcUrl) });
    const results = [];

    const kycAbi = parseAbi(["function kycRegistry() external view returns (address)", "function kycMembership() external view returns (address)"]);
    const cpAbi = parseAbi(["function treasury() external view returns (address)", "function creditPoint() external view returns (address)"]);
    const roleAbi = parseAbi(["function hasRole(bytes32 role, address account) external view returns (bool)"]);

    // Info: (20260419 - Luphia) CreditPoint -> DynamicKYC
    const cpKyc = await client.readContract({ address: cp, abi: kycAbi, functionName: "kycRegistry" });
    results.push({ source: "CreditPoint", sourceAddress: cp, target: "DynamicKYCMembership", targetAddress: cpKyc, valid: cpKyc.toLowerCase() === dmc.toLowerCase() });

    // Info: (20260419 - Luphia) SubscriptionManager -> DynamicKYC & Treasury
    if (sub) {
      const subKyc = await client.readContract({ address: sub, abi: kycAbi, functionName: "kycRegistry" });
      const subTreasury = await client.readContract({ address: sub, abi: cpAbi, functionName: "treasury" });
      results.push({ source: "SubscriptionManager", sourceAddress: sub, target: "DynamicKYCMembership", targetAddress: subKyc, valid: subKyc.toLowerCase() === dmc.toLowerCase() });
      results.push({ source: "SubscriptionManager", sourceAddress: sub, target: "CreditPoint", targetAddress: subTreasury, valid: subTreasury.toLowerCase() === cp.toLowerCase() });
    }

    // Info: (20260419 - Luphia) MembershipSystem -> Treasury & Role
    if (mem) {
      const memCp = await client.readContract({ address: mem, abi: cpAbi, functionName: "creditPoint" });
      const hasAdmin = await client.readContract({ address: cp, abi: roleAbi, functionName: "hasRole", args: ["0x0000000000000000000000000000000000000000000000000000000000000000", mem] });
      results.push({ source: "MembershipSystem", sourceAddress: mem, target: "CreditPoint", targetAddress: memCp, valid: memCp.toLowerCase() === cp.toLowerCase() && hasAdmin });
    }

    // Info: (20260419 - Luphia) MissionBoard -> KYC & Treasury
    if (mb) {
      const mbKyc = await client.readContract({ address: mb, abi: kycAbi, functionName: "kycMembership" });
      const mbReward = await client.readContract({ address: mb, abi: parseAbi(["function rewardToken() external view returns (address)"]), functionName: "rewardToken" });
      results.push({ source: "MissionBoard", sourceAddress: mb, target: "DynamicKYCMembership", targetAddress: mbKyc, valid: mbKyc.toLowerCase() === dmc.toLowerCase() });
      results.push({ source: "MissionBoard", sourceAddress: mb, target: "CreditPoint", targetAddress: mbReward, valid: mbReward.toLowerCase() === cp.toLowerCase() });
    }

    return { success: true, results };
  } catch (error) {
    console.error("Dependency Verification Error:", error);
    return { success: false, results: [] };
  }
}
