import fs from "fs";
import {
  keccak256,
  toBytes,
  createWalletClient,
  createPublicClient,
  http,
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
  const membershipAddress = process.env
    .NEXT_PUBLIC_MEMBERSHIP_SYSTEM_ADDRESS as `0x${string}`;

  if (!membershipAddress) {
    console.log("No membership address found");
    return;
  }

  const keystoreJson = fs.readFileSync(envAdminPath, "utf-8");
  const seedValue = fs.readFileSync(envSeedPath, "utf-8").trim();
  const password = keccak256(toBytes(seedValue));

  const wallet = await Wallet.fromEncryptedJson(keystoreJson, password);
  const privateKey = wallet.privateKey as `0x${string}`;
  const account = privateKeyToAccount(privateKey);

  const mainTransport = http("http://127.0.0.1:20024");

  const walletClient = createWalletClient({
    account,
    transport: mainTransport,
  });
  const publicClient = createPublicClient({ transport: mainTransport });

  console.log(
    `Funding membership system at ${membershipAddress} with 10,000 ISC...`,
  );

  const hash = await walletClient.sendTransaction({
    chain: isuncoin,
    to: membershipAddress,
    value: 100n * 10n ** 18n,
  });

  await publicClient.waitForTransactionReceipt({ hash });
  console.log(`Success! Tx hash: ${hash}`);
}

main().catch(console.error);
