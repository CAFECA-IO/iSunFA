import { describe, it, expect } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { readFileSync } from "fs";
import { join } from "path";
import { createPublicKey } from "crypto";
import { custodialWalletService } from "@/services/custodial_wallet.service";
import { deriveAccountAddress } from "@/lib/auth/account_address";
import { CUSTODIAL_CREDENTIAL_PREFIX } from "@/constants/auth_provider";

/**
 * Info: (20261015 - Luphia) 託管帳號建帳不再部署 SCW（區塊鏈退役）。
 *
 * provisionWallet 原本 readContract(getAddress) → 組 initCode → 代簽 → 送 bundler。
 * 現在只產生金鑰、以 `deriveAccountAddress` 推導位址；回傳形狀不變（oauth.service 依賴它）。
 */

jest.mock("@/repositories/custodial_key.repo", () => ({
  custodialKeyRepo: { findByUserId: jest.fn() },
}));

jest.mock("@/repositories/payment.repo", () => ({
  paymentRepo: { getOrderByIdAndUserId: jest.fn() },
}));

describe("custodialWalletService.provisionWallet", () => {
  it("位址由 credentialId 與公鑰鏈下推導", async () => {
    const wallet = await custodialWalletService.provisionWallet();

    expect(wallet.credentialId.startsWith(CUSTODIAL_CREDENTIAL_PREFIX)).toBe(
      true,
    );
    expect(wallet.address).toBe(
      deriveAccountAddress({
        credentialId: wallet.credentialId,
        pubKeyX: wallet.pubKeyX,
        pubKeyY: wallet.pubKeyY,
      }),
    );
  });

  it("回傳的私鑰是可用的 P-256 PKCS#8 PEM，且對應回傳的公鑰", async () => {
    const wallet = await custodialWalletService.provisionWallet();
    const jwk = createPublicKey(wallet.privateKeyPem).export({
      format: "jwk",
    });

    expect(jwk.crv).toBe("P-256");
    expect(
      BigInt(`0x${Buffer.from(jwk.x!, "base64url").toString("hex")}`),
    ).toBe(BigInt(wallet.pubKeyX));
    expect(
      BigInt(`0x${Buffer.from(jwk.y!, "base64url").toString("hex")}`),
    ).toBe(BigInt(wallet.pubKeyY));
  });

  it("每次產生不同的金鑰與位址", async () => {
    const a = await custodialWalletService.provisionWallet();
    const b = await custodialWalletService.provisionWallet();

    expect(a.credentialId).not.toBe(b.credentialId);
    expect(a.address).not.toBe(b.address);
  });

  it("不再有部署或 bundler 路徑", () => {
    const source = readFileSync(
      join(process.cwd(), "src", "services", "custodial_wallet.service.ts"),
      "utf8",
    );

    expect(source).not.toMatch(/bundler\.service/);
    expect(source).not.toMatch(/BundlerService/);
    expect(source).not.toMatch(/functionName: "createAccount"/);
    expect(source).not.toMatch(/public async executeCall/);
  });
});
