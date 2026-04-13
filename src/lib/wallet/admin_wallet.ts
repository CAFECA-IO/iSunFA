"use server";

import fs from "fs";
import path from "path";
import { keccak256, toBytes, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { Wallet } from "ethers";
import { isuncoin } from "@/lib/viem_public";

// Info: (20260413 - Local) Get the deployed Admin private key from the stored Keystore.
export async function getAdminPrivateKey(): Promise<`0x${string}`> {
  const envAdminPath = path.join(process.cwd(), ".env.admin");
  const envSeedPath = path.join(process.cwd(), ".env.seed");

  if (!fs.existsSync(envAdminPath) || !fs.existsSync(envSeedPath)) {
    throw new Error("Admin wallet not found. Please run npm run initial_wallet first.");
  }

  const keystoreJson = fs.readFileSync(envAdminPath, "utf-8");
  const seedValue = fs.readFileSync(envSeedPath, "utf-8").trim();
  const password = keccak256(toBytes(seedValue));

  const wallet = await Wallet.fromEncryptedJson(keystoreJson, password);
  return wallet.privateKey as `0x${string}`;
}

// Info: (20260413 - Luphia) Get the deployed Admin account for Viem clients.
export async function getAdminAccount() {
  const privateKey = await getAdminPrivateKey();
  return privateKeyToAccount(privateKey);
}

// Info: (20260413 - Luphia) Get the deployed Admin Wallet client.
export async function getAdminWalletClient() {
  const account = await getAdminAccount();
  return createWalletClient({
    account,
    chain: isuncoin,
    transport: http()
  });
}
