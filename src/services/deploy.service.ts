"use server"

import fs from "fs";
import path from "path";
import { runCommand } from "@/services/cli.service";

export async function deployContracts() {
  // Info: (20260412 - Luphia) Skip deployment if already deployed in .env.setup
  const envSetupPath = path.join(process.cwd(), ".env.setup");
  if (fs.existsSync(envSetupPath)) {
    const dotenv = (await import("dotenv")).default;
    const envConfig = dotenv.parse(fs.readFileSync(envSetupPath, "utf8"));
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

  const rootPath = process.cwd();
  const reportsDir = path.join(rootPath, "reports");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  const logFile = path.join(reportsDir, ".deploy_progress.log");
  fs.writeFileSync(logFile, "Starting deployment...\n", "utf8");

  // Info: (20260412 - Luphia) Redirect output to a temp file for live polling via getDeployProgress
  const cmd = `npm run deploy_contract > "${logFile}" 2>&1`;
  const result = await runCommand(cmd, rootPath, 5 * 1024 * 1024);

  if (fs.existsSync(logFile)) {
    result.output = fs.readFileSync(logFile, "utf8");
  }
  return result;
}

export async function getDeployProgress() {
  const logFile = path.join(process.cwd(), "reports", ".deploy_progress.log");
  if (fs.existsSync(logFile)) {
    return fs.readFileSync(logFile, "utf8");
  }
  return "";
};
