import { describe, it, expect, beforeAll } from "@jest/globals";
import { randomBytes } from "crypto";
import {
  blindIndexEquals,
  blindIndexNationalId,
  decryptPii,
  encryptPii,
  HrPiiDecryptError,
  HrPiiKeyError,
} from "@/lib/hr_pii_crypto";
import {
  HR_PII_ALGORITHM,
  HR_PII_KEY_BYTES,
  HrPiiTable,
} from "@/constants/hr_pii";

/**
 * Info: (20260811 - Julian) 這組測試守的是「加密後還原得回來，且錯的金鑰還原不出東西」。
 *
 * 第二件事比第一件重要：AES-CBC 用錯金鑰會安靜地吐出一段垃圾明文，
 * 而身分證欄位吐出垃圾比解不出來危險得多（會被當成真值寫進申報檔）。
 * 選 GCM 就是為了讓這個情境變成明確的例外，因此它必須被測到。
 */
describe("hr_pii_crypto", () => {
  const NATIONAL_ID = "A123456789";

  /**
   * Info: (20260812 - Luphia) 每段密文都綁在「哪張表的哪一列的哪一欄」上（GCM AAD）。
   * 測試一律用同一個 context，除了刻意驗證搬動的那幾支。
   */
  const CONTEXT = {
    table: HrPiiTable.EMPLOYEE,
    field: "nationalIdCipher",
    recordId: "11111111-1111-1111-1111-111111111111",
  };

  beforeAll(() => {
    process.env.HR_PII_KEY_V1 =
      randomBytes(HR_PII_KEY_BYTES).toString("base64");
    process.env.HR_PII_KEY_V2 =
      randomBytes(HR_PII_KEY_BYTES).toString("base64");
    process.env.HR_PII_BLIND_INDEX_PEPPER = "test-pepper";
  });

  it("should round-trip a value through encrypt and decrypt", () => {
    const encrypted = encryptPii(NATIONAL_ID, CONTEXT);
    expect(encrypted.algorithm).toBe(HR_PII_ALGORITHM);
    expect(encrypted.keyVersion).toBe(1);
    expect(decryptPii(encrypted.cipher, CONTEXT, encrypted.keyVersion)).toBe(
      NATIONAL_ID,
    );
  });

  it("should round-trip non-ASCII values", () => {
    const address = "臺北市大安區信義路四段 1 號 12 樓";
    const encrypted = encryptPii(address, CONTEXT);
    expect(decryptPii(encrypted.cipher, CONTEXT, encrypted.keyVersion)).toBe(
      address,
    );
  });

  // Info: (20260811 - Julian) 隨機 IV 的直接後果，也正是唯一約束掛不上密文、必須另設盲索引的理由
  it("should produce a different ciphertext for the same plaintext each time", () => {
    expect(encryptPii(NATIONAL_ID, CONTEXT).cipher).not.toBe(
      encryptPii(NATIONAL_ID, CONTEXT).cipher,
    );
  });

  it("should fail loudly when decrypting with the wrong key version", () => {
    const encrypted = encryptPii(NATIONAL_ID, CONTEXT, 1);
    expect(() => decryptPii(encrypted.cipher, CONTEXT, 2)).toThrow(
      HrPiiDecryptError,
    );
  });

  it("should fail loudly when the ciphertext has been tampered with", () => {
    const encrypted = encryptPii(NATIONAL_ID, CONTEXT);
    const raw = Buffer.from(encrypted.cipher, "base64");
    raw[raw.length - 1] ^= 0xff;
    expect(() => decryptPii(raw.toString("base64"), CONTEXT, 1)).toThrow(
      HrPiiDecryptError,
    );
  });

  it("should reject a ciphertext too short to hold an IV and a tag", () => {
    expect(() =>
      decryptPii(Buffer.from("short").toString("base64"), CONTEXT, 1),
    ).toThrow(HrPiiDecryptError);
  });

  it("should refuse to use an unconfigured key version", () => {
    expect(() => encryptPii(NATIONAL_ID, CONTEXT, 99)).toThrow(HrPiiKeyError);
  });

  it("should refuse a key of the wrong length", () => {
    const previous = process.env.HR_PII_KEY_V3;
    process.env.HR_PII_KEY_V3 = randomBytes(16).toString("base64");
    expect(() => encryptPii(NATIONAL_ID, CONTEXT, 3)).toThrow(HrPiiKeyError);
    process.env.HR_PII_KEY_V3 = previous;
  });

  // Info: (20260811 - Julian) 錯誤訊息會進 log，金鑰內容不該跟著進去
  it("should not leak key material in the length error", () => {
    process.env.HR_PII_KEY_V4 = randomBytes(16).toString("base64");
    try {
      encryptPii(NATIONAL_ID, CONTEXT, 4);
      throw new Error("expected encryptPii to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(HrPiiKeyError);
      expect((error as HrPiiKeyError).message).not.toContain(
        process.env.HR_PII_KEY_V4,
      );
    }
  });

  /**
   * Info: (20260812 - Luphia) 密文綁定位置（AAD）—— 這組測的是「搬不動」。
   *
   * 沒有 AAD 的話，把 A 的 national_id_cipher 貼到 B 的那一列會**乾淨地解密成功**：
   * GCM 的 tag 只保證密文沒被改過，不保證它屬於誰。而攻擊者不需要改任何一個位元組，
   * 只要換位置 —— 那不在「竄改」的防護範圍內，卻正是「DBA 直連資料庫」做得到的事。
   */
  describe("ciphertext is bound to its location", () => {
    it("should refuse a ciphertext moved to another row", () => {
      const encrypted = encryptPii(NATIONAL_ID, CONTEXT);
      const otherRow = {
        ...CONTEXT,
        recordId: "22222222-2222-2222-2222-222222222222",
      };
      expect(() =>
        decryptPii(encrypted.cipher, otherRow, encrypted.keyVersion),
      ).toThrow(HrPiiDecryptError);
    });

    it("should refuse a ciphertext moved to another field", () => {
      const encrypted = encryptPii(NATIONAL_ID, CONTEXT);
      const otherField = { ...CONTEXT, field: "addressCipher" };
      expect(() =>
        decryptPii(encrypted.cipher, otherField, encrypted.keyVersion),
      ).toThrow(HrPiiDecryptError);
    });

    it("should refuse a ciphertext moved to another table", () => {
      const encrypted = encryptPii(NATIONAL_ID, CONTEXT);
      const otherTable = { ...CONTEXT, table: HrPiiTable.DEPENDENT };
      expect(() =>
        decryptPii(encrypted.cipher, otherTable, encrypted.keyVersion),
      ).toThrow(HrPiiDecryptError);
    });

    it("should still decrypt with the very same context", () => {
      const encrypted = encryptPii(NATIONAL_ID, CONTEXT);
      expect(
        decryptPii(encrypted.cipher, { ...CONTEXT }, encrypted.keyVersion),
      ).toBe(NATIONAL_ID);
    });
  });

  /**
   * Info: (20260812 - Luphia) 空明文的密文長度正好等於 iv + tag（28 bytes），
   * 而解密端的長度守衛是「至少要放得下 iv + tag」—— 加密成功、解密拋錯。
   * 在加密端擋掉,而不是放寬守衛:空字串的個資欄位應該寫 null。
   */
  it("should refuse to encrypt an empty string instead of writing something it cannot read back", () => {
    expect(() => encryptPii("", CONTEXT)).toThrow(HrPiiDecryptError);
  });

  describe("blindIndexNationalId", () => {
    it("should be deterministic for the same input", () => {
      expect(blindIndexNationalId(NATIONAL_ID)).toBe(
        blindIndexNationalId(NATIONAL_ID),
      );
    });

    /**
     * Info: (20260811 - Julian) 沒有正規化，`a123456789` 與 `A123456789` 會得到不同雜湊，
     * 帳本內唯一約束就能被大小寫繞過 —— 同一個人建兩次檔，而這條規則存在的目的正是擋這件事。
     */
    it("should normalize case and surrounding whitespace", () => {
      const canonical = blindIndexNationalId(NATIONAL_ID);
      expect(blindIndexNationalId("a123456789")).toBe(canonical);
      expect(blindIndexNationalId("  A123456789  ")).toBe(canonical);
    });

    it("should differ for different national ids", () => {
      expect(blindIndexNationalId("A123456789")).not.toBe(
        blindIndexNationalId("A123456780"),
      );
    });

    it("should refuse to hash without a pepper", () => {
      const previous = process.env.HR_PII_BLIND_INDEX_PEPPER;
      delete process.env.HR_PII_BLIND_INDEX_PEPPER;
      expect(() => blindIndexNationalId(NATIONAL_ID)).toThrow(HrPiiKeyError);
      process.env.HR_PII_BLIND_INDEX_PEPPER = previous;
    });

    it("should compare hashes in constant time", () => {
      const hash = blindIndexNationalId(NATIONAL_ID);
      expect(blindIndexEquals(hash, hash)).toBe(true);
      expect(blindIndexEquals(hash, blindIndexNationalId("A123456780"))).toBe(
        false,
      );
      // Info: (20260811 - Julian) 長度不同時 timingSafeEqual 會拋錯，必須先擋掉
      expect(blindIndexEquals(hash, "c2hvcnQ=")).toBe(false);
    });
  });
});
