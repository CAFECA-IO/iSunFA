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
import { HR_PII_ALGORITHM, HR_PII_KEY_BYTES } from "@/constants/hr_pii";

/**
 * Info: (20260811 - Julian) 這組測試守的是「加密後還原得回來，且錯的金鑰還原不出東西」。
 *
 * 第二件事比第一件重要：AES-CBC 用錯金鑰會安靜地吐出一段垃圾明文，
 * 而身分證欄位吐出垃圾比解不出來危險得多（會被當成真值寫進申報檔）。
 * 選 GCM 就是為了讓這個情境變成明確的例外，因此它必須被測到。
 */
describe("hr_pii_crypto", () => {
  const NATIONAL_ID = "A123456789";

  beforeAll(() => {
    process.env.HR_PII_KEY_V1 =
      randomBytes(HR_PII_KEY_BYTES).toString("base64");
    process.env.HR_PII_KEY_V2 =
      randomBytes(HR_PII_KEY_BYTES).toString("base64");
    process.env.HR_PII_BLIND_INDEX_PEPPER = "test-pepper";
  });

  it("should round-trip a value through encrypt and decrypt", () => {
    const encrypted = encryptPii(NATIONAL_ID);
    expect(encrypted.algorithm).toBe(HR_PII_ALGORITHM);
    expect(encrypted.keyVersion).toBe(1);
    expect(decryptPii(encrypted.cipher, encrypted.keyVersion)).toBe(
      NATIONAL_ID,
    );
  });

  it("should round-trip non-ASCII values", () => {
    const address = "臺北市大安區信義路四段 1 號 12 樓";
    const encrypted = encryptPii(address);
    expect(decryptPii(encrypted.cipher, encrypted.keyVersion)).toBe(address);
  });

  // Info: (20260811 - Julian) 隨機 IV 的直接後果，也正是唯一約束掛不上密文、必須另設盲索引的理由
  it("should produce a different ciphertext for the same plaintext each time", () => {
    expect(encryptPii(NATIONAL_ID).cipher).not.toBe(
      encryptPii(NATIONAL_ID).cipher,
    );
  });

  it("should fail loudly when decrypting with the wrong key version", () => {
    const encrypted = encryptPii(NATIONAL_ID, 1);
    expect(() => decryptPii(encrypted.cipher, 2)).toThrow(HrPiiDecryptError);
  });

  it("should fail loudly when the ciphertext has been tampered with", () => {
    const encrypted = encryptPii(NATIONAL_ID);
    const raw = Buffer.from(encrypted.cipher, "base64");
    raw[raw.length - 1] ^= 0xff;
    expect(() => decryptPii(raw.toString("base64"), 1)).toThrow(
      HrPiiDecryptError,
    );
  });

  it("should reject a ciphertext too short to hold an IV and a tag", () => {
    expect(() =>
      decryptPii(Buffer.from("short").toString("base64"), 1),
    ).toThrow(HrPiiDecryptError);
  });

  it("should refuse to use an unconfigured key version", () => {
    expect(() => encryptPii(NATIONAL_ID, 99)).toThrow(HrPiiKeyError);
  });

  it("should refuse a key of the wrong length", () => {
    const previous = process.env.HR_PII_KEY_V3;
    process.env.HR_PII_KEY_V3 = randomBytes(16).toString("base64");
    expect(() => encryptPii(NATIONAL_ID, 3)).toThrow(HrPiiKeyError);
    process.env.HR_PII_KEY_V3 = previous;
  });

  // Info: (20260811 - Julian) 錯誤訊息會進 log，金鑰內容不該跟著進去
  it("should not leak key material in the length error", () => {
    process.env.HR_PII_KEY_V4 = randomBytes(16).toString("base64");
    try {
      encryptPii(NATIONAL_ID, 4);
      throw new Error("expected encryptPii to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(HrPiiKeyError);
      expect((error as HrPiiKeyError).message).not.toContain(
        process.env.HR_PII_KEY_V4,
      );
    }
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
