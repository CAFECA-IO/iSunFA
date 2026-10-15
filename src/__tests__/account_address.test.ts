import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";
import { concat, keccak256, toBytes, getAddress, isAddress } from "viem";
import { deriveAccountAddress } from "@/lib/auth/account_address";
import { ACCOUNT_ADDRESS_DERIVATION_TAG } from "@/constants/auth_provider";

/**
 * Info: (20261015 - Luphia) 鏈下帳號位址推導（區塊鏈退役）。
 *
 * 這支函式的輸出會永久寫進 `User.address`，所以規則本身就是契約：
 * 一旦改了，之後重算（例如重送註冊時的重複檢查）就對不上已發出的位址。
 * 下面用一組釘死的向量守住它，並以手工拼接的位元組獨立重算一次，
 * 證明 encodePacked 的版面（string ‖ bytes ‖ uint256 ‖ uint256）真的是文件寫的那樣。
 */

const VECTOR = {
  credentialId: "test-credential",
  pubKeyX: "1",
  pubKeyY: "2",
  address: "0xCdAd1d7640d0c406d098CD0f652bb5dA2F3F57C6",
};

function uint256Bytes(value: bigint): Uint8Array {
  return toBytes(value, { size: 32 });
}

describe("deriveAccountAddress", () => {
  it("釘死的向量（規則變更必須換新的網域標籤）", () => {
    expect(ACCOUNT_ADDRESS_DERIVATION_TAG).toBe("isunfa-account-v1");
    expect(deriveAccountAddress(VECTOR)).toBe(VECTOR.address);
  });

  it("與手工拼接的 keccak256 後 20 bytes 相同", () => {
    const packed = concat([
      toBytes(ACCOUNT_ADDRESS_DERIVATION_TAG),
      toBytes(VECTOR.credentialId),
      uint256Bytes(BigInt(VECTOR.pubKeyX)),
      uint256Bytes(BigInt(VECTOR.pubKeyY)),
    ]);
    const digest = keccak256(packed, "bytes");
    const expected = getAddress(
      `0x${Buffer.from(digest.slice(12)).toString("hex")}`,
    );

    expect(deriveAccountAddress(VECTOR)).toBe(expected);
  });

  it("回傳 EIP-55 checksum 形式", () => {
    const address = deriveAccountAddress(VECTOR);
    expect(isAddress(address, { strict: true })).toBe(true);
    expect(address).toBe(getAddress(address));
  });

  it("字串與 bigint 輸入得到同一個位址", () => {
    expect(
      deriveAccountAddress({
        credentialId: VECTOR.credentialId,
        pubKeyX: BigInt(1),
        pubKeyY: BigInt(2),
      }),
    ).toBe(VECTOR.address);
  });

  it("credentialId 或任一座標不同，位址就不同", () => {
    const base = deriveAccountAddress(VECTOR);
    expect(
      deriveAccountAddress({ ...VECTOR, credentialId: "other-credential" }),
    ).not.toBe(base);
    expect(deriveAccountAddress({ ...VECTOR, pubKeyX: "3" })).not.toBe(base);
    expect(deriveAccountAddress({ ...VECTOR, pubKeyY: "3" })).not.toBe(base);
  });

  it("缺 credentialId 直接拒絕", () => {
    expect(() => deriveAccountAddress({ ...VECTOR, credentialId: "" })).toThrow(
      /credentialId/,
    );
  });

  it("座標不是整數或超出 uint256 範圍時拒絕", () => {
    expect(() => deriveAccountAddress({ ...VECTOR, pubKeyX: "abc" })).toThrow(
      /pubKeyX/,
    );
    expect(() => deriveAccountAddress({ ...VECTOR, pubKeyY: "0" })).toThrow(
      /pubKeyY/,
    );
    expect(() =>
      deriveAccountAddress({
        ...VECTOR,
        pubKeyX: (BigInt(2) ** BigInt(256)).toString(),
      }),
    ).toThrow(/pubKeyX/);
  });

  // Info: (20261015 - Luphia) 純函式：不得依賴任何節點或合約設定
  it("不 import 任何鏈上模組", () => {
    const source = readFileSync(
      join(process.cwd(), "src", "lib", "auth", "account_address.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/@\/lib\/viem/);
    expect(source).not.toMatch(/@\/config\/contracts/);
    expect(source).not.toMatch(/@\/lib\/chain\//);
  });
});
