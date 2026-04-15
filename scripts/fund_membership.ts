import fs from "fs";
import path from "path";
import {
  keccak256,
  toBytes,
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { Wallet } from "ethers";
import { isuncoin } from "@/lib/viem";

async function main() {
  const envAdminPath = path.join(process.cwd(), ".env.admin");
  const envSeedPath = path.join(process.cwd(), ".env.seed");

  if (!fs.existsSync(envAdminPath) || !fs.existsSync(envSeedPath)) {
    console.error("Wallet not found. Please run npm run initial_wallet first.");
    process.exit(1);
  }

  const keystoreJson = fs.readFileSync(envAdminPath, "utf-8");
  const seedValue = fs.readFileSync(envSeedPath, "utf-8").trim();
  const password = keccak256(toBytes(seedValue));

  const wallet = await Wallet.fromEncryptedJson(keystoreJson, password);
  const privateKey = wallet.privateKey as `0x${string}`;

  const account = privateKeyToAccount(privateKey);
  console.log(`Funding from account: ${account.address}`);

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

  // Info: (20260413 - Luphia) Load ABI from .env
  const dotenv = (await import("dotenv")).default;
  const envConfig = dotenv.parse(
    fs.readFileSync(path.join(process.cwd(), ".env"), "utf-8"),
  );

  const membershipAddress =
    envConfig.NEXT_PUBLIC_MEMBERSHIP_SYSTEM_ADDRESS as `0x${string}`;

  if (!membershipAddress) {
    console.error(
      "Could not find NEXT_PUBLIC_MEMBERSHIP_SYSTEM_ADDRESS in .env",
    );
    process.exit(1);
  }

  console.log(
    `Funding MembershipSystem at ${membershipAddress} with 50 ISC...`,
  );
  const fundHash = await walletClient.sendTransaction({
    to: membershipAddress,
    value: parseEther("50"),
  });

  await publicClient.waitForTransactionReceipt({ hash: fundHash });
  console.log(`Funding complete! Transaction Hash: ${fundHash}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
