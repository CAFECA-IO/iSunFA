import fs from "fs";
import path from "path";
import {
  keccak256,
  toBytes,
  createPublicClient,
  createWalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { Wallet } from "ethers";
import { http } from "viem";
import { isuncoin } from "@/lib/viem";

async function main() {
  console.log("Compiling contracts...");

  const envAdminPath = path.join(process.cwd(), ".env.admin");
  const envSeedPath = path.join(process.cwd(), ".env.seed");

  if (!fs.existsSync(envAdminPath) || !fs.existsSync(envSeedPath)) {
    console.error("Wallet not found. Please run npm run initial_wallet first.");
    process.exit(1);
  }

  const keystoreJson = fs.readFileSync(envAdminPath, "utf-8");
  const seedValue = fs.readFileSync(envSeedPath, "utf-8").trim();
  const password = keccak256(toBytes(seedValue));

  console.log("Decrypting deployment wallet...");
  const wallet = await Wallet.fromEncryptedJson(keystoreJson, password);
  const privateKey = wallet.privateKey as `0x${string}`;

  const account = privateKeyToAccount(privateKey);
  console.log(`Deploying contracts with account: ${account.address}`);

  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:20024";
  const mainTransport = http(rpcUrl);

  const walletClient = createWalletClient({
    account,
    chain: isuncoin,
    transport: mainTransport,
  });

  const publicClient = createPublicClient({
    chain: isuncoin,
    transport: mainTransport,
  });

  const getArtifact = (pathName: string, contractName: string) => {
    return JSON.parse(
      fs.readFileSync(
        path.join(
          process.cwd(),
          `artifacts/contracts/${pathName}.sol/${contractName}.json`,
        ),
        "utf-8",
      ),
    );
  };

  const envSetupPath = path.join(process.cwd(), ".env.setup");
  let envContent = fs.existsSync(envSetupPath) ? fs.readFileSync(envSetupPath, "utf-8") : "";
  let forceRedeployCore = process.env.FORCE_REDEPLOY_CORE === "1";
  const getEnv = (key: string) => {
    if (forceRedeployCore) return "";
    const match = envContent.match(new RegExp(`^${key}="(.*)"$`, "m")) || envContent.match(new RegExp(`^${key}=(.*)$`, "m"));
    return match ? match[1] : (process.env[key] || "");
  };

  // Info: (20260418 - Luphia) 1. DynamicKYCMembership
  let dmcAddress = getEnv("NEXT_PUBLIC_DYNAMIC_KYC_MEMBERSHIP_ADDRESS");

  if (!dmcAddress || dmcAddress === "") {
    forceRedeployCore = true; // Info: (20260418 - Luphia) New Architecture detected. We must redeploy downstream contracts.
    const dmcArtifact = getArtifact("dynamic_kyc_membership", "DynamicKYCMembership");
    console.log("Deploying DynamicKYCMembership...");
    const dmcHash = await walletClient.deployContract({
      chain: isuncoin,
      abi: dmcArtifact.abi,
      bytecode: dmcArtifact.bytecode,
      args: [account.address],
    });
    const dmcReceipt = await publicClient.waitForTransactionReceipt({ hash: dmcHash ,  timeout: 1200000, });
    dmcAddress = dmcReceipt.contractAddress!;
    console.log(`-> DynamicKYCMembership deployed to: ${dmcAddress}`);
  } else {
    console.log(`-> Skipped: DynamicKYCMembership already exists at ${dmcAddress}`);
  }
  const kycAddress = dmcAddress;

  // Info: (20260416 - Luphia) 3. CreditPoint
  let treasuryAddress = getEnv("NEXT_PUBLIC_CREDIT_POINT_ADDRESS");
  if (!treasuryAddress || treasuryAddress === "" || forceRedeployCore) {
    const treasuryArtifact = getArtifact("credit_point", "CreditPoint");
    console.log("Deploying CreditPoint...");
    const configRateStr = process.env.DEPLOY_COLLATERAL_RATE || "0.05";
    let rateFloat = parseFloat(configRateStr);
    if (isNaN(rateFloat) || rateFloat < 1e-9 || rateFloat > 100) rateFloat = 0.05;
    const collateralRate = BigInt(Math.floor(rateFloat * 10 ** 18));
    console.log(`-> Utilizing Collateral Rate: ${rateFloat} ISC/ICP (${collateralRate} wei)`);
    const treasuryHash = await walletClient.deployContract({
      chain: isuncoin,
      abi: treasuryArtifact.abi,
      bytecode: treasuryArtifact.bytecode,
      args: [account.address, kycAddress, collateralRate],
    });
    const treasuryReceipt = await publicClient.waitForTransactionReceipt({
      hash: treasuryHash,
      timeout: 1200000,
      });
    treasuryAddress = treasuryReceipt.contractAddress!;
    console.log(`-> CreditPoint deployed to: ${treasuryAddress}`);
  } else {
    console.log(`-> Skipped: CreditPoint already exists at ${treasuryAddress}`);
  }
  const treasuryArtifactGlobal = getArtifact("credit_point", "CreditPoint");

  // Info: (20260411 - Luphia) 4. SubscriptionManager
  let subManagerAddress = getEnv("NEXT_PUBLIC_SUBSCRIPTION_MANAGER_ADDRESS");
  let newlyDeployedSubManager = false;
  if (!subManagerAddress || subManagerAddress === "" || forceRedeployCore) {
    newlyDeployedSubManager = true;
    const subManagerArtifact = getArtifact(
      "subscription_manager",
      "SubscriptionManager",
    );
    console.log("Deploying SubscriptionManager...");
    const subManagerHash = await walletClient.deployContract({
      chain: isuncoin,
      abi: subManagerArtifact.abi,
      bytecode: subManagerArtifact.bytecode,
      args: [account.address, kycAddress, treasuryAddress],
    });
    const subManagerReceipt = await publicClient.waitForTransactionReceipt({
      hash: subManagerHash,
      timeout: 1200000,
      });
    subManagerAddress = subManagerReceipt.contractAddress!;
    console.log(`-> SubscriptionManager deployed to: ${subManagerAddress}`);
  } else {
    console.log(`-> Skipped: SubscriptionManager already exists at ${subManagerAddress}`);
  }

  // Info: (20260411 - Luphia) 5. Connect SubscriptionManager to Treasury
  if (newlyDeployedSubManager) {
    console.log(
      "Configuring contracts (setting SubscriptionManager in Treasury)...",
    );
    const configHash = await walletClient.writeContract({
      chain: isuncoin,
      address: treasuryAddress as `0x${string}`,
      abi: treasuryArtifactGlobal.abi,
      functionName: "setSubscriptionManager",
      args: [subManagerAddress],
    });
    await publicClient.waitForTransactionReceipt({ hash: configHash ,  timeout: 1200000, });
    console.log("-> Configuration completed successfully.");
  }

  // Info: (20260412 - Luphia) 6. Deploy MembershipSystem
  let membershipAddress = getEnv("NEXT_PUBLIC_MEMBERSHIP_SYSTEM_ADDRESS");
  if (!membershipAddress || membershipAddress === "" || forceRedeployCore) {
    const membershipArtifact = getArtifact(
      "membership_system",
      "MembershipSystem",
    );
    console.log("Deploying MembershipSystem...");
    const membershipHash = await walletClient.deployContract({
      chain: isuncoin,
      abi: membershipArtifact.abi,
      bytecode: membershipArtifact.bytecode,
      args: [account.address, treasuryAddress],
    });
    const membershipReceipt = await publicClient.waitForTransactionReceipt({
      hash: membershipHash,
      timeout: 1200000,
      });
    membershipAddress = membershipReceipt.contractAddress!;
    console.log(`-> MembershipSystem deployed to: ${membershipAddress}`);

    console.log(
      "Configuring contracts (granting AdminRole to MembershipSystem on Treasury)...",
    );
    const grantHash = await walletClient.writeContract({
      chain: isuncoin,
      address: treasuryAddress as `0x${string}`,
      abi: treasuryArtifactGlobal.abi,
      functionName: "grantRole",
      args: [
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        membershipAddress,
      ],
    });
    await publicClient.waitForTransactionReceipt({ hash: grantHash ,  timeout: 1200000, });
    console.log("-> MembershipSystem Configuration completed successfully.");

    console.log(
      "Prefunding MembershipSystem with 20 ISC for initial point distribution...",
    );
    const fundHash = await walletClient.sendTransaction({
      chain: isuncoin,
      to: membershipAddress as `0x${string}`,
      value: 20n * 10n ** 18n,
    });
    await publicClient.waitForTransactionReceipt({ hash: fundHash ,  timeout: 1200000, });
    console.log("-> MembershipSystem prefunded successfully.");
  } else {
    console.log(`-> Skipped: MembershipSystem already exists at ${membershipAddress}`);
  }

  // Info: (20260412 - Luphia) 6. Deploy EntryPoint
  let entryPointAddress = getEnv("NEXT_PUBLIC_ENTRY_POINT_ADDRESS");
  if (!entryPointAddress || entryPointAddress === "") {
    const epArtifact = JSON.parse(
      fs.readFileSync(
        path.join(
          process.cwd(),
          "node_modules/@account-abstraction/contracts/artifacts/EntryPoint.json",
        ),
        "utf-8",
      ),
    );
    console.log("Deploying EntryPoint...");
    const epHash = await walletClient.deployContract({
      chain: isuncoin,
      abi: epArtifact.abi,
      bytecode: epArtifact.bytecode,
    });
    const epReceipt = await publicClient.waitForTransactionReceipt({
      hash: epHash,
      timeout: 1200000,
      });
    entryPointAddress = epReceipt.contractAddress!;
    console.log(`-> EntryPoint deployed to: ${entryPointAddress}`);
  } else {
    console.log(`-> Skipped: EntryPoint already exists at ${entryPointAddress}`);
  }

  // Info: (20260412 - Luphia) 7. Deploy Fido2AccountFactory
  let factoryAddress = getEnv("NEXT_PUBLIC_SCW_FACTORY_ADDRESS");
  if (!factoryAddress || factoryAddress === "") {
    const fido2FactoryArtifact = getArtifact(
      "fido2_account_factory",
      "Fido2AccountFactory",
    );
    console.log("Deploying Fido2AccountFactory...");
    const factoryHash = await walletClient.deployContract({
      chain: isuncoin,
      abi: fido2FactoryArtifact.abi,
      bytecode: fido2FactoryArtifact.bytecode,
      args: [entryPointAddress],
    });
    const factoryReceipt = await publicClient.waitForTransactionReceipt({
      hash: factoryHash,
      timeout: 1200000,
      });
    factoryAddress = factoryReceipt.contractAddress!;
    console.log(`-> Fido2AccountFactory deployed to: ${factoryAddress}`);
  } else {
    console.log(`-> Skipped: Fido2AccountFactory already exists at ${factoryAddress}`);
  }

  // Info: (20260418 - Luphia) 8. Deploy MissionBoard
  let missionBoardAddress = getEnv("NEXT_PUBLIC_MISSION_BOARD_ADDRESS");
  if (!missionBoardAddress || missionBoardAddress === "" || forceRedeployCore) {
    const missionBoardArtifact = getArtifact("mission_board", "MissionBoard");
    console.log("Deploying MissionBoard...");
    const minReward = 10n ** 16n;
    const mbHash = await walletClient.deployContract({
      chain: isuncoin,
      abi: missionBoardArtifact.abi,
      bytecode: missionBoardArtifact.bytecode,
      args: [treasuryAddress, kycAddress, minReward, account.address],
    });
    const mbReceipt = await publicClient.waitForTransactionReceipt({
      hash: mbHash,
      timeout: 1200000,
      });
    missionBoardAddress = mbReceipt.contractAddress!;
    console.log(`-> MissionBoard deployed to: ${missionBoardAddress}`);
  } else {
    console.log(`-> Skipped: MissionBoard already exists at ${missionBoardAddress}`);
  }

  console.log("\n===== DEPLOYMENT SUMMARY =====");
  console.log(`DynamicKYCMembership:  ${dmcAddress}`);
  console.log(`CreditPoint:           ${treasuryAddress}`);
  console.log(`MembershipSystem:      ${membershipAddress}`);
  console.log(`SubscriptionManager:   ${subManagerAddress}`);
  console.log(`EntryPoint:            ${entryPointAddress}`);
  console.log(`Fido2AccountFactory:   ${factoryAddress}`);
  console.log(`MissionBoard:          ${missionBoardAddress}`);
  console.log("==============================\n");

  if (!fs.existsSync(envSetupPath)) {
    fs.writeFileSync(envSetupPath, "", "utf-8");
  }

  if (!envContent.includes("# PART 2")) {
    envContent += "\n\n# PART 2: Smart Contract Deployment";
  }

  const updateEnv = (key: string, value: string) => {
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (envContent.match(regex)) {
      envContent = envContent.replace(regex, `${key}="${value}"`);
    } else {
      envContent += `\n${key}="${value}"`;
    }
  };

  updateEnv("NEXT_PUBLIC_DYNAMIC_KYC_MEMBERSHIP_ADDRESS", dmcAddress || "");
  updateEnv("NEXT_PUBLIC_CREDIT_POINT_ADDRESS", treasuryAddress || "");
  updateEnv("NEXT_PUBLIC_MEMBERSHIP_SYSTEM_ADDRESS", membershipAddress || "");
  updateEnv("NEXT_PUBLIC_SUBSCRIPTION_MANAGER_ADDRESS", subManagerAddress || "");
  updateEnv("NEXT_PUBLIC_SCW_FACTORY_ADDRESS", factoryAddress || "");
  updateEnv("NEXT_PUBLIC_ENTRY_POINT_ADDRESS", entryPointAddress || "");
  updateEnv("NEXT_PUBLIC_MISSION_BOARD_ADDRESS", missionBoardAddress || "");

  fs.writeFileSync(envSetupPath, envContent, "utf-8");
  console.log(
    "-> Successfully updated .env.setup with all contract addresses.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
