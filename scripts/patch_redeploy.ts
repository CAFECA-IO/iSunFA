import fs from "fs";
import {
  keccak256,
  toBytes,
  createWalletClient,
  createPublicClient,
  http,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { Wallet } from "ethers";
import { isuncoin } from "@/lib/viem_public";
import { config } from "dotenv";
config({ path: ".env.admin" });
config({ path: ".env.seed" });
config({ path: ".env" });

async function main() {
  const envAdminPath = ".env.admin";
  const envSeedPath = ".env.seed";
  const envSetupPath = ".env";

  const keystoreJson = fs.readFileSync(envAdminPath, "utf-8");
  const seedValue = fs.readFileSync(envSeedPath, "utf-8").trim();
  const password = keccak256(toBytes(seedValue));

  const wallet = await Wallet.fromEncryptedJson(keystoreJson, password);
  const privateKey = wallet.privateKey as `0x${string}`;
  const account = privateKeyToAccount(privateKey);

  const mainTransport = http("http://127.0.0.1:20024");
  const walletClient = createWalletClient({
    account,
    chain: isuncoin,
    transport: mainTransport,
  });
  const publicClient = createPublicClient({
    chain: isuncoin,
    transport: mainTransport,
  });

  const getArtifact = (pathName: string, contractName: string) =>
    JSON.parse(
      fs.readFileSync(
        `artifacts/contracts/${pathName}.sol/${contractName}.json`,
        "utf-8",
      ),
    );

  const kycAddress = process.env.NEXT_PUBLIC_KYC_REGISTRY_ADDRESS;
  const subManagerAddress =
    process.env.NEXT_PUBLIC_SUBSCRIPTION_MANAGER_ADDRESS;

  console.log("1. Redeploying CreditPoint with 0.01 ISC collateral rate...");
  const treasuryArtifact = getArtifact("credit_point", "CreditPoint");
  const treasuryHash = await walletClient.deployContract({
    abi: treasuryArtifact.abi,
    bytecode: treasuryArtifact.bytecode,
    args: [account.address, kycAddress, parseEther("0.01")],
  });
  const treasuryReceipt = await publicClient.waitForTransactionReceipt({
    hash: treasuryHash,
  });
  const treasuryAddress = treasuryReceipt.contractAddress;

  console.log("2. Configuring CreditPoint with SubscriptionManager...");
  const configHash = await walletClient.writeContract({
    chain: isuncoin,
    address: treasuryAddress as `0x${string}`,
    abi: treasuryArtifact.abi,
    functionName: "setSubscriptionManager",
    args: [subManagerAddress],
  });
  await publicClient.waitForTransactionReceipt({ hash: configHash });

  console.log("3. Redeploying MembershipSystem...");
  const membershipArtifact = getArtifact(
    "membership_system",
    "MembershipSystem",
  );
  const membershipHash = await walletClient.deployContract({
    abi: membershipArtifact.abi,
    bytecode: membershipArtifact.bytecode,
    args: [account.address, treasuryAddress],
  });
  const membershipReceipt = await publicClient.waitForTransactionReceipt({
    hash: membershipHash,
  });
  const membershipAddress = membershipReceipt.contractAddress;

  console.log("4. Granting AdminRole to MembershipSystem on Treasury...");
  const grantHash = await walletClient.writeContract({
    chain: isuncoin,
    address: treasuryAddress as `0x${string}`,
    abi: treasuryArtifact.abi,
    functionName: "grantRole",
    args: [
      "0x0000000000000000000000000000000000000000000000000000000000000000",
      membershipAddress,
    ],
  });
  await publicClient.waitForTransactionReceipt({ hash: grantHash });

  console.log(
    "5. Prefunding MembershipSystem with 10 ISC (enough for 1,000 points via 0.01 rate)...",
  );
  const fundHash = await walletClient.sendTransaction({
    chain: isuncoin,
    to: membershipAddress,
    value: parseEther("10"),
  });
  await publicClient.waitForTransactionReceipt({ hash: fundHash });

  console.log("6. Updating .env...");
  let envContent = fs.readFileSync(envSetupPath, "utf-8");
  const updateEnv = (key: string, value: string) => {
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (envContent.match(regex)) {
      envContent = envContent.replace(regex, `${key}="${value}"`);
    } else {
      envContent += `\n${key}="${value}"`;
    }
  };
  updateEnv("NEXT_PUBLIC_CREDIT_POINT_ADDRESS", treasuryAddress || "");
  updateEnv("NEXT_PUBLIC_MEMBERSHIP_SYSTEM_ADDRESS", membershipAddress || "");
  fs.writeFileSync(envSetupPath, envContent, "utf-8");

  console.log("Done. New CreditPoint:", treasuryAddress);
  console.log("Done. New MembershipSystem:", membershipAddress);
}
main().catch(console.error);
