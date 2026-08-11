import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;

/**
 * Info: (20260809 - Luphia) 保險庫的三個承諾：
 * 1. 主密鑰缺失／過短／為空字串時一律視為未設定（Fail Fast，絕不退化成弱加密）
 * 2. 密文可完整還原
 * 3. 不同用途派生出的子金鑰互不相通——託管私鑰的密文不該能被當成系統設定解開
 *
 * 第 1 點是實際踩過的雷：.env 裡留了一行空的 SECRET_VAULT_MASTER_KEY=，
 * 若把「有這個鍵」當成「有設定」，錯誤會延後到寫入資料庫時才爆。
 */

const VALID_KEY = "a".repeat(48);

async function loadVault(secret?: string) {
  // Info: (20260809 - Luphia) key_vault 會在模組層快取派生金鑰，換 env 必須重載模組
  jest.resetModules();

  if (secret === undefined) {
    delete process.env.SECRET_VAULT_MASTER_KEY;
  } else {
    process.env.SECRET_VAULT_MASTER_KEY = secret;
  }

  return import("@/lib/auth/key_vault");
}

describe("secret vault", () => {
  const original = process.env.SECRET_VAULT_MASTER_KEY;

  beforeEach(() => {
    delete process.env.SECRET_VAULT_MASTER_KEY;
  });

  afterEach(() => {
    if (original === undefined) delete process.env.SECRET_VAULT_MASTER_KEY;
    else process.env.SECRET_VAULT_MASTER_KEY = original;
  });

  it("主密鑰未設定、為空字串或過短時都視為未就緒", async () => {
    for (const secret of [undefined, "", "   ", "too-short"]) {
      const vault = await loadVault(secret);
      expect(vault.isVaultConfigured()).toBe(false);
    }
  });

  it("主密鑰長度足夠時視為就緒", async () => {
    const vault = await loadVault(VALID_KEY);
    expect(vault.isVaultConfigured()).toBe(true);
  });

  it("未就緒時加密直接拋錯，不會靜默降級", async () => {
    const vault = await loadVault("");
    expect(() =>
      vault.sealSecret("secret", vault.VaultPurpose.SYSTEM_SETTING),
    ).toThrow();
  });

  it("密文可完整還原", async () => {
    const vault = await loadVault(VALID_KEY);
    const sealed = vault.sealSecret(
      "GOCSPX-example-secret",
      vault.VaultPurpose.SYSTEM_SETTING,
    );

    expect(sealed.ciphertext).not.toContain("GOCSPX");
    expect(vault.openSecret(sealed, vault.VaultPurpose.SYSTEM_SETTING)).toBe(
      "GOCSPX-example-secret",
    );
  });

  it("不同用途的子金鑰互不相通", async () => {
    const vault = await loadVault(VALID_KEY);
    const sealed = vault.sealSecret(
      "custodial-private-key",
      vault.VaultPurpose.CUSTODIAL_KEY,
    );

    expect(() =>
      vault.openSecret(sealed, vault.VaultPurpose.SYSTEM_SETTING),
    ).toThrow();
  });

  it("密文遭竄改時 GCM authTag 會擋下來", async () => {
    const vault = await loadVault(VALID_KEY);
    const sealed = vault.sealSecret(
      "original",
      vault.VaultPurpose.SYSTEM_SETTING,
    );

    const tampered = Buffer.from(sealed.ciphertext, "base64");
    tampered[0] ^= 0xff;

    expect(() =>
      vault.openSecret(
        { ...sealed, ciphertext: tampered.toString("base64") },
        vault.VaultPurpose.SYSTEM_SETTING,
      ),
    ).toThrow();
  });
});
