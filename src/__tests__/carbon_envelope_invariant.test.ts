import { describe, it, expect } from "@jest/globals";
import {
  assertStorableEnvelope,
  CarbonEnvelopeInvariantError,
} from "@/repositories/carbon_envelope_invariant";

/**
 * Info: (20260810 - Emily) 這條不變式守的是「寫得進去卻讀不出來的終態」
 * (PR review 第 2/4 點)。
 *
 * 三個服務的讀取端寫法一字不差:
 *   `encryptedContent && keyDerivationHint ? { ...envelope } : null`
 * 所以下面每一個被擋下的組合,都對應一種前端會判定為「存在但不可讀」、
 * 保留真實 version 不覆蓋、從此只能 DELETE 的紀錄。
 */
describe("assertStorableEnvelope", () => {
  const table = "CarbonReportDraft";

  it("should accept a complete envelope", () => {
    expect(() =>
      assertStorableEnvelope(table, {
        encryptedContent: "cipher",
        keyDerivationHint: "hint",
      }),
    ).not.toThrow();
  });

  it("should accept plain content without an envelope", () => {
    expect(() =>
      assertStorableEnvelope(table, { plainContent: "# 報告" }),
    ).not.toThrow();
  });

  /**
   * Info: (20260810 - Emily) 密文有、hint 沒有 —— 讀取端組不出 envelope,
   * 回 null,而內容其實在那裡且再也解不開。
   */
  it("should reject a cipher without its derivation hint", () => {
    expect(() =>
      assertStorableEnvelope(table, { encryptedContent: "cipher" }),
    ).toThrow(CarbonEnvelopeInvariantError);
  });

  it("should reject a hint without its cipher", () => {
    expect(() =>
      assertStorableEnvelope(table, { keyDerivationHint: "hint" }),
    ).toThrow(CarbonEnvelopeInvariantError);
  });

  /**
   * Info: (20260810 - Emily) 兩者皆空同樣是讀不出內容的終態 ——
   * cipher↔hint 只是其中一種組合,守衛不該只涵蓋一半(第 4 點)。
   */
  it("should reject a record that carries neither an envelope nor plain content", () => {
    expect(() => assertStorableEnvelope(table, {})).toThrow(
      CarbonEnvelopeInvariantError,
    );
    expect(() =>
      assertStorableEnvelope(table, {
        encryptedContent: null,
        keyDerivationHint: null,
        plainContent: "",
      }),
    ).toThrow(CarbonEnvelopeInvariantError);
  });

  /**
   * Info: (20260810 - Emily) 「兩者皆有」違反 schema 的「恰一」業務規則,
   * 但**讀得出來** —— 不屬於這一層。這一層只涵蓋不可讀的終態,
   * 在它自己的層次上是完整的,不是把一條規則折成兩半。
   */
  it("should leave the exactly-one business rule to the schema", () => {
    expect(() =>
      assertStorableEnvelope(table, {
        encryptedContent: "cipher",
        keyDerivationHint: "hint",
        plainContent: "# 報告",
      }),
    ).not.toThrow();
  });

  /**
   * Info: (20260810 - Emily) 錯誤要說得出是哪張表、缺的是什麼。
   * 服務層據此轉成 VL_SCHEMA_ERROR 而不是 IS_DB_FAILED(第 3 點)——
   * 一個與成因無關的 500 正是這批修正要消滅的症狀。
   */
  it("should name the table and the missing side", () => {
    try {
      assertStorableEnvelope("CarbonPendingImport", {
        encryptedContent: "cipher",
      });
      throw new Error("expected the invariant to reject this record");
    } catch (error) {
      expect(error).toBeInstanceOf(CarbonEnvelopeInvariantError);
      const invariant = error as CarbonEnvelopeInvariantError;
      expect(invariant.table).toBe("CarbonPendingImport");
      expect(invariant.message).toContain("keyDerivationHint=false");
    }
  });
});
