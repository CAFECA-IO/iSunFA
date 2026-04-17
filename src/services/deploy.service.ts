"use server";

import fs from "fs";
import { exec } from "child_process";
import {
  loadEnvConfig,
  ENV_SETUP_PATH,
  ENV_PATH,
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

export async function deployContracts(collateralRate: number = 0.05): Promise<{
  success: boolean;
  output: string;
}> {
  // Info: (20260414 - Luphia) Skip deployment if already deployed in any env file
  const envPaths = [ENV_SETUP_PATH, ENV_PATH];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const envConfig = await loadEnvConfig(envPath);
      if (envConfig.NEXT_PUBLIC_SCW_FACTORY_ADDRESS) {
        const mockOutput = `
        KYCRegistry: ${envConfig.NEXT_PUBLIC_KYC_REGISTRY_ADDRESS || "0x"}
        DynamicMembershipCard: ${envConfig.NEXT_PUBLIC_DYNAMIC_MEMBERSHIP_CARD_ADDRESS || "0x"}
        CreditPoint: ${envConfig.NEXT_PUBLIC_CREDIT_POINT_ADDRESS || "0x"}
        MembershipSystem: ${envConfig.NEXT_PUBLIC_MEMBERSHIP_SYSTEM_ADDRESS || "0x"}
        SubscriptionManager: ${envConfig.NEXT_PUBLIC_SUBSCRIPTION_MANAGER_ADDRESS || "0x"}
        EntryPoint: ${envConfig.NEXT_PUBLIC_ENTRY_POINT_ADDRESS || "0x"}
        Fido2AccountFactory: ${envConfig.NEXT_PUBLIC_SCW_FACTORY_ADDRESS || "0x"}
        `;
        return { success: true, output: mockOutput };
      }
    }
  }

  const rootPath = process.cwd();
  globalAny.deployTaskProgress = "Starting deployment...\n";

  return new Promise<{ success: boolean; output: string }>((resolve) => {
    const child = exec(
      "npm run deploy_contract",
      { 
        cwd: rootPath, 
        maxBuffer: 5 * 1024 * 1024,
        env: { ...process.env, DEPLOY_COLLATERAL_RATE: collateralRate.toString() }
      },
      (error) => {
        if (error) {
          resolve({
            success: false,
            output: globalAny.deployTaskProgress || "",
          });
        } else {
          resolve({
            success: true,
            output: globalAny.deployTaskProgress || "",
          });
        }
      },
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
  });
}

export async function getDeployProgress() {
  return globalAny.deployTaskProgress || "";
}
