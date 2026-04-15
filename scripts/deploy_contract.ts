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

  // Info: (20260411 - Luphia) 1. KYCRegistry
  const kycArtifact = getArtifact("kyc_registry", "KYCRegistry");
  console.log("Deploying KYCRegistry...");
  const kycHash = await walletClient.deployContract({
    chain: isuncoin,
    abi: kycArtifact.abi,
    bytecode: kycArtifact.bytecode,
    args: [account.address],
  });
  const kycReceipt = await publicClient.waitForTransactionReceipt({
    hash: kycHash,
  });
  const kycAddress = kycReceipt.contractAddress;
  console.log(`-> KYCRegistry deployed to: ${kycAddress}`);

  // Info: (20260411 - Luphia) 2. DynamicMembershipCard
  const dmcArtifact = getArtifact(
    "dynamic_membership_card",
    "DynamicMembershipCard",
  );
  console.log("Deploying DynamicMembershipCard...");
  const dmcHash = await walletClient.deployContract({
    chain: isuncoin,
    abi: dmcArtifact.abi,
    bytecode: dmcArtifact.bytecode,
    args: [account.address, kycAddress],
  });
  const dmcReceipt = await publicClient.waitForTransactionReceipt({
    hash: dmcHash,
  });
  const dmcAddress = dmcReceipt.contractAddress;
  console.log(`-> DynamicMembershipCard deployed to: ${dmcAddress}`);

  // Info: (20260411 - Luphia) 3. CreditPoint (collateralRate: 5% of 1 ISC = 0.05 ISC per Point = 50000000000000000 wei)
  const treasuryArtifact = getArtifact("credit_point", "CreditPoint");
  console.log("Deploying CreditPoint...");
  const collateralRate = BigInt("50000000000000000");
  const treasuryHash = await walletClient.deployContract({
    chain: isuncoin,
    abi: treasuryArtifact.abi,
    bytecode: treasuryArtifact.bytecode,
    args: [account.address, kycAddress, collateralRate],
  });
  const treasuryReceipt = await publicClient.waitForTransactionReceipt({
    hash: treasuryHash,
  });
  const treasuryAddress = treasuryReceipt.contractAddress;
  console.log(`-> CreditPoint deployed to: ${treasuryAddress}`);

  // Info: (20260411 - Luphia) 4. SubscriptionManager
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
  });
  const subManagerAddress = subManagerReceipt.contractAddress;
  console.log(`-> SubscriptionManager deployed to: ${subManagerAddress}`);

  // Info: (20260411 - Luphia) 5. Connect SubscriptionManager to Treasury
  console.log(
    "Configuring contracts (setting SubscriptionManager in Treasury)...",
  );
  const configHash = await walletClient.writeContract({
    chain: isuncoin,
    address: treasuryAddress as `0x${string}`,
    abi: treasuryArtifact.abi,
    functionName: "setSubscriptionManager",
    args: [subManagerAddress],
  });
  await publicClient.waitForTransactionReceipt({ hash: configHash });
  console.log("-> Configuration completed successfully.");
  // Info: (20260412 - Luphia) 6. Deploy MembershipSystem
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
  });
  const membershipAddress = membershipReceipt.contractAddress;
  console.log(`-> MembershipSystem deployed to: ${membershipAddress}`);

  console.log(
    "Configuring contracts (granting AdminRole to MembershipSystem on Treasury)...",
  );
  const grantHash = await walletClient.writeContract({
    chain: isuncoin,
    address: treasuryAddress as `0x${string}`,
    abi: treasuryArtifact.abi,
    functionName: "grantRole",
    args: [
      "0x0000000000000000000000000000000000000000000000000000000000000000",
      membershipAddress,
    ], // Info: (20260412 - Luphia) DEFAULT_ADMIN_ROLE
  });
  await publicClient.waitForTransactionReceipt({ hash: grantHash });
  console.log("-> MembershipSystem Configuration completed successfully.");

  console.log(
    "Prefunding MembershipSystem with 20 ISC for initial point distribution...",
  );
  const fundHash = await walletClient.sendTransaction({
    chain: isuncoin,
    to: membershipAddress,
    value: 20n * 10n ** 18n,
  });
  await publicClient.waitForTransactionReceipt({ hash: fundHash });
  console.log("-> MembershipSystem prefunded successfully.");
  // Info: (20260412 - Luphia) 6. Deploy EntryPoint
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
  });
  const entryPointAddress = epReceipt.contractAddress;
  console.log(`-> EntryPoint deployed to: ${entryPointAddress}`);

  // Info: (20260412 - Luphia) 7. Deploy Fido2AccountFactory
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
  });
  const factoryAddress = factoryReceipt.contractAddress;
  console.log(`-> Fido2AccountFactory deployed to: ${factoryAddress}`);

  console.log("\n===== DEPLOYMENT SUMMARY =====");
  console.log(`KYCRegistry:           ${kycAddress}`);
  console.log(`DynamicMembershipCard: ${dmcAddress}`);
  console.log(`CreditPoint:           ${treasuryAddress}`);
  console.log(`MembershipSystem:      ${membershipAddress}`);
  console.log(`SubscriptionManager:   ${subManagerAddress}`);
  console.log(`EntryPoint:            ${entryPointAddress}`);
  console.log(`Fido2AccountFactory:   ${factoryAddress}`);
  console.log("==============================\n");

  // Info: (20260412 - Luphia) Automatically update .env.setup file to isolate deployment until setup is completely finalized
  const envSetupPath = path.join(process.cwd(), ".env.setup");

  if (!fs.existsSync(envSetupPath)) {
    fs.writeFileSync(envSetupPath, "", "utf-8");
  }

  let envContent = fs.readFileSync(envSetupPath, "utf-8");
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

  updateEnv("NEXT_PUBLIC_KYC_REGISTRY_ADDRESS", kycAddress || "");
  updateEnv("NEXT_PUBLIC_DYNAMIC_MEMBERSHIP_CARD_ADDRESS", dmcAddress || "");
  updateEnv("NEXT_PUBLIC_CREDIT_POINT_ADDRESS", treasuryAddress || "");
  updateEnv("NEXT_PUBLIC_MEMBERSHIP_SYSTEM_ADDRESS", membershipAddress || "");
  updateEnv(
    "NEXT_PUBLIC_SUBSCRIPTION_MANAGER_ADDRESS",
    subManagerAddress || "",
  );
  updateEnv("NEXT_PUBLIC_SCW_FACTORY_ADDRESS", factoryAddress || "");
  updateEnv("NEXT_PUBLIC_ENTRY_POINT_ADDRESS", entryPointAddress || "");

  fs.writeFileSync(envSetupPath, envContent, "utf-8");
  console.log(
    "-> Successfully updated .env.setup with all contract addresses.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
