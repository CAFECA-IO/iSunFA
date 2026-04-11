import fs from "fs";
import path from "path";
import { keccak256, toBytes, createPublicClient, createWalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { Wallet } from "ethers";

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

  const { http } = await import("viem");
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "https://mainnet.isuncoin.com";
  const mainTransport = http(rpcUrl);

  const walletClient = createWalletClient({
    account,
    transport: mainTransport,
  });

  const publicClient = createPublicClient({
    transport: mainTransport,
  });

  const getArtifact = (pathName: string, contractName: string) => {
    return JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), `artifacts/contracts/${pathName}.sol/${contractName}.json`),
        "utf-8"
      )
    );
  };

  // Info: (20260411 - Luphia) 1. KYCRegistry
  const kycArtifact = getArtifact("kyc_registry", "KYCRegistry");
  // @ts-expect-error - viem TS strict check for chain parameter
  const kycHash = await walletClient.deployContract({
    abi: kycArtifact.abi,
    bytecode: kycArtifact.bytecode,
    args: [account.address],
  });
  const kycReceipt = await publicClient.waitForTransactionReceipt({ hash: kycHash });
  const kycAddress = kycReceipt.contractAddress;
  console.log(`-> KYCRegistry deployed to: ${kycAddress}`);

  // Info: (20260411 - Luphia) 2. DynamicMembershipCard
  const dmcArtifact = getArtifact("dynamic_membership_card", "DynamicMembershipCard");
  // @ts-expect-error - viem TS strict check for chain parameter
  const dmcHash = await walletClient.deployContract({
    abi: dmcArtifact.abi,
    bytecode: dmcArtifact.bytecode,
    args: [account.address, kycAddress],
  });
  const dmcReceipt = await publicClient.waitForTransactionReceipt({ hash: dmcHash });
  const dmcAddress = dmcReceipt.contractAddress;
  console.log(`-> DynamicMembershipCard deployed to: ${dmcAddress}`);

  // Info: (20260411 - Luphia) 3. PointERC3643Treasury (collateralRate: 5% of 1 ETH = 0.05 ETH per Point = 50000000000000000 wei)
  const treasuryArtifact = getArtifact("point_erc3643_treasury", "PointERC3643Treasury");
  const collateralRate = BigInt("50000000000000000");
  // @ts-expect-error - viem TS strict check for chain parameter
  const treasuryHash = await walletClient.deployContract({
    abi: treasuryArtifact.abi,
    bytecode: treasuryArtifact.bytecode,
    args: [account.address, kycAddress, collateralRate],
  });
  const treasuryReceipt = await publicClient.waitForTransactionReceipt({ hash: treasuryHash });
  const treasuryAddress = treasuryReceipt.contractAddress;
  console.log(`-> PointERC3643Treasury deployed to: ${treasuryAddress}`);

  // Info: (20260411 - Luphia) 4. SubscriptionManager
  const subManagerArtifact = getArtifact("subscription_manager", "SubscriptionManager");
  // @ts-expect-error - viem TS strict check for chain parameter
  const subManagerHash = await walletClient.deployContract({
    abi: subManagerArtifact.abi,
    bytecode: subManagerArtifact.bytecode,
    args: [account.address, kycAddress, treasuryAddress],
  });
  const subManagerReceipt = await publicClient.waitForTransactionReceipt({ hash: subManagerHash });
  const subManagerAddress = subManagerReceipt.contractAddress;
  console.log(`-> SubscriptionManager deployed to: ${subManagerAddress}`);

  // Info: (20260411 - Luphia) 5. Connect SubscriptionManager to Treasury
  console.log("Configuring contracts (setting SubscriptionManager in Treasury)...");
  // @ts-expect-error - viem TS strict check for chain parameter
  const configHash = await walletClient.writeContract({
    address: treasuryAddress as `0x${string}`,
    abi: treasuryArtifact.abi,
    functionName: "setSubscriptionManager",
    args: [subManagerAddress],
  });
  await publicClient.waitForTransactionReceipt({ hash: configHash });
  console.log("-> Configuration completed successfully.");

  console.log("\n===== DEPLOYMENT SUMMARY =====");
  console.log(`KYCRegistry:           ${kycAddress}`);
  console.log(`DynamicMembershipCard: ${dmcAddress}`);
  console.log(`PointERC3643Treasury:  ${treasuryAddress}`);
  console.log(`SubscriptionManager:   ${subManagerAddress}`);
  console.log("==============================\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
