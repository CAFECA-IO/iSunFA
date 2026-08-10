import { describe, it, expect } from "@jest/globals";
import { createHash } from "crypto";
import {
  buildCanonicalString,
  buildSettingsDigest,
  computeDigest,
  decodeSignature,
  encodeSignature,
} from "@/lib/config/system_setting_signature";
import {
  SYSTEM_SETTING_DEFINITIONS,
  SYSTEM_SETTING_GROUP_ORDER,
  SYSTEM_SETTING_KEYS,
  SystemSettingKey,
} from "@/constants/system_setting";

/**
 * Info: (20260809 - Luphia) 這組測試守的是設定簽章的決定性。
 * canonical string 只要有一點不穩定（順序、空值處理、version 未納入），
 * 管理員簽下的 digest 就可能與伺服器重算的不一致，導致設定被誤判為遭竄改而全面停用。
 */

const CLIENT_ID = SystemSettingKey.GOOGLE_OAUTH_CLIENT_ID;
const CLIENT_SECRET = SystemSettingKey.GOOGLE_OAUTH_CLIENT_SECRET;

describe("system setting signature", () => {
  it("canonical string 與輸入順序無關", () => {
    const a = buildCanonicalString(
      [
        { key: CLIENT_SECRET, value: "secret" },
        { key: CLIENT_ID, value: "id" },
      ],
      1,
    );
    const b = buildCanonicalString(
      [
        { key: CLIENT_ID, value: "id" },
        { key: CLIENT_SECRET, value: "secret" },
      ],
      1,
    );

    expect(a).toBe(b);
  });

  it("空字串與未提供該鍵得到相同 digest", () => {
    const omitted = buildSettingsDigest([{ key: CLIENT_ID, value: "id" }], 1);
    const emptied = buildSettingsDigest(
      [
        { key: CLIENT_ID, value: "id" },
        { key: CLIENT_SECRET, value: "" },
      ],
      1,
    );

    expect(emptied).toBe(omitted);
  });

  it("version 納入簽章範圍，改版本即改 digest", () => {
    const entries = [{ key: CLIENT_ID, value: "id" }];
    expect(buildSettingsDigest(entries, 1)).not.toBe(
      buildSettingsDigest(entries, 2),
    );
  });

  it("任一設定值改變都會改變 digest", () => {
    const before = buildSettingsDigest(
      [
        { key: CLIENT_ID, value: "id" },
        { key: CLIENT_SECRET, value: "secret" },
      ],
      3,
    );
    const after = buildSettingsDigest(
      [
        { key: CLIENT_ID, value: "id" },
        { key: CLIENT_SECRET, value: "secret-rotated" },
      ],
      3,
    );

    expect(after).not.toBe(before);
  });

  it("digest 為 canonical string 的 SHA-256 base64url", () => {
    const canonical = buildCanonicalString(
      [{ key: CLIENT_ID, value: "id" }],
      7,
    );
    const expected = createHash("sha256").update(canonical).digest("base64url");

    expect(computeDigest(canonical)).toBe(expected);
    // Info: (20260809 - Luphia) base64url 不得含 +、/、= —— 它要直接當 WebAuthn challenge 使用
    expect(expected).not.toMatch(/[+/=]/);
  });

  it("canonical string 以 __version__ 結尾，避免值內容偽造版本行", () => {
    const canonical = buildCanonicalString(
      [{ key: CLIENT_ID, value: "id" }],
      5,
    );
    const lines = canonical.split("\n");

    expect(lines[lines.length - 1]).toBe("__version__=5");
  });

  it("簽章 blob 可完整往返", () => {
    const signature = {
      id: "credential-id",
      rawId: "raw",
      response: {
        authenticatorData: "auth",
        clientDataJSON: "client",
        signature: "sig",
      },
      type: "public-key",
    };

    const encoded = encodeSignature(
      signature as unknown as Parameters<typeof encodeSignature>[0],
    );
    expect(decodeSignature(encoded)).toEqual(signature);
  });

  it("損毀的簽章 blob 回傳 null 而非拋錯", () => {
    expect(decodeSignature("not-base64-json")).toBeNull();
    expect(decodeSignature(Buffer.from("{}").toString("base64"))).toBeNull();
  });
});

/**
 * Info: (20260809 - Luphia) 設定定義是簽章、設定頁與部署精靈三方共用的單一事實來源。
 * 定義缺漏或 envKey 撞名會讓「讀到的值」與「簽章涵蓋的值」不一致，屬於靜默錯誤，故用測試釘住。
 */
describe("system setting definitions", () => {
  it("每個設定鍵都有定義，且 key 與定義自我一致", () => {
    for (const key of SYSTEM_SETTING_KEYS) {
      const definition = SYSTEM_SETTING_DEFINITIONS[key];
      expect(definition).toBeDefined();
      expect(definition.key).toBe(key);
      expect(definition.envKey.length).toBeGreaterThan(0);
    }
  });

  it("envKey 不重複，避免兩個設定搶同一個環境變數", () => {
    const envKeys = SYSTEM_SETTING_KEYS.map(
      (key) => SYSTEM_SETTING_DEFINITIONS[key].envKey,
    );
    expect(new Set(envKeys).size).toBe(envKeys.length);
  });

  it("每個設定的分組都在設定頁的排序清單內，否則畫面上會消失", () => {
    for (const key of SYSTEM_SETTING_KEYS) {
      expect(SYSTEM_SETTING_GROUP_ORDER).toContain(
        SYSTEM_SETTING_DEFINITIONS[key].group,
      );
    }
  });

  it("秘密設定不得有明文保底值", async () => {
    const { SYSTEM_SETTING_FALLBACKS } =
      await import("@/constants/system_setting");

    for (const key of SYSTEM_SETTING_KEYS) {
      if (SYSTEM_SETTING_DEFINITIONS[key].isSecret) {
        expect(SYSTEM_SETTING_FALLBACKS[key]).toBeUndefined();
      }
    }
  });
});
