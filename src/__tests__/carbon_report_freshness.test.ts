import { describe, it, expect } from "@jest/globals";
import fs from "fs";
import path from "path";
import {
  collectQuotedFacts,
  buildParagraphFingerprint,
  assessParagraphFreshness,
  summarizeReportFreshness,
  ParagraphFreshnessEnum,
  PARAGRAPH_FINGERPRINT_MAX_FACTS,
} from "@/lib/carbon_report_freshness";
import { LEDGER_FACT_BUNDLE_MAX } from "@/lib/carbon_ledger_query";
import { ParagraphOriginEnum } from "@/constants/carbon_chatbot";
import type {
  IReportParagraph,
  IParagraphLedgerFingerprint,
} from "@/types/carbon_chatbot.types";
import type { IContextFact } from "@/interfaces/carbon_paragraph_draft";

/**
 * Info: (20260908 - Emily) 段落知不知道自己過期(#6786)。
 *
 * owner 的要求是「做好的報告載入後 AI 也有即時更新,隨時能打開就報告透過 AI 協助更新」。
 * 不能自動重寫(花點數、且會覆蓋使用者手改過的字),所以判準是**標出來 + 一鍵更新**。
 *
 * 這一組測試最承重的一條是「帳本重算但引用值沒變 → 一節都不標」——
 * 少了它,任何一次重算都會把 33 節全部標成過期,而 33 節全紅等於沒有標示。
 */

const STAMP_A = "2026-09-01T00:00:00.000Z";
const STAMP_B = "2026-09-08T00:00:00.000Z";

const fact = (
  label: string,
  value: string,
  emissionsKg?: string[],
): IContextFact => ({
  label,
  value,
  source: `帳本總計欄(計算於 ${STAMP_A})`,
  ...(emissionsKg ? { emissionsKg } : {}),
});

const paragraph = (
  code: string,
  content: string,
  fingerprint?: IParagraphLedgerFingerprint,
): IReportParagraph => ({
  id: `p-${code}`,
  chapterId: "ch3",
  code,
  title: `${code} 標題`,
  content,
  isCompleted: true,
  isVerified: false,
  isDataDriven: true,
  ...(fingerprint ? { ledgerFingerprint: fingerprint } : {}),
});

describe("這一節引用了哪些帳本事實", () => {
  it("kg 級事實對上公噸級原文 —— 借出口守門的換算,不自己寫字串比對", () => {
    /**
     * Info: (20260908 - Emily) 報告紙上印公噸、帳本存 kg 是**最常見**的情形。
     * 自己寫字串比對會把它判成「沒引用」,於是那一節永遠不會被標過期 ——
     * 靜默漏報,比誤報更難發現。
     */
    const facts = [fact("全公司總排放量", "227898.6 kgCO2e", ["227898.6"])];
    const quoted = collectQuotedFacts(
      "本年度總排放量為 227.8986 公噸 CO2e。",
      facts,
    );
    expect(quoted).toEqual([
      { label: "全公司總排放量", value: "227898.6 kgCO2e" },
    ]);
  });

  it("不是排放量的數字不算引用(年度、章節、筆數)", () => {
    /**
     * Info: (20260908 - Emily) `extractQuantityClaims` 要求數字與排放單位相鄰,
     * 所以這些數字不會被當成引用。少了這個限制,一節裡隨便一個 `1`
     * 都會把它綁上一堆無關的事實 → 那些事實一變就假過期。
     */
    const facts = [
      fact("盤查年度", "2024"),
      fact("分錄筆數", "12"),
      fact("章節數", "3"),
    ];
    expect(
      collectQuotedFacts("依 2024 年資料,第 3 章共 12 筆分錄。", facts),
    ).toEqual([]);
  });

  it("完全沒有排放量主張的節 → 空陣列(前言、方法論說明)", () => {
    const facts = [fact("全公司總排放量", "227898.6 kgCO2e", ["227898.6"])];
    expect(collectQuotedFacts("本節說明盤查邊界與方法論。", facts)).toEqual([]);
  });

  it("同一個 label 只留一筆", () => {
    const facts = [
      fact("全公司總排放量", "227898.6 kgCO2e", ["227898.6"]),
      fact("全公司總排放量", "227898.6 kgCO2e", ["227898.6"]),
    ];
    expect(collectQuotedFacts("總量 227898.6 kgCO2e", facts)).toHaveLength(1);
  });

  it("指紋筆數不可能超過事實包上限(由構造保證,不是另外猜的數字)", () => {
    expect(PARAGRAPH_FINGERPRINT_MAX_FACTS).toBe(LEDGER_FACT_BUNDLE_MAX);
    const facts = Array.from({ length: 200 }, (_, index) =>
      fact(`事實 ${index}`, `${index + 1}.5 kgCO2e`, [`${index + 1}.5`]),
    );
    const content = facts.map((f) => f.value).join("、");
    expect(collectQuotedFacts(content, facts).length).toBeLessThanOrEqual(
      facts.length,
    );
  });
});

describe("打指紋", () => {
  it("沒有帳本戳記 → 不打指紋(偽造基準會讓之後每次比對都說「變了」)", () => {
    expect(
      buildParagraphFingerprint({
        content: "總量 227898.6 kgCO2e",
        ledgerFacts: [fact("全公司總排放量", "227898.6 kgCO2e", ["227898.6"])],
        ledgerComputedAt: undefined,
      }),
    ).toBeUndefined();
  });

  it("引用不到事實時 facts 是空陣列,不是 undefined(空 ≠ 沒有指紋)", () => {
    const fingerprint = buildParagraphFingerprint({
      content: "本節說明盤查邊界。",
      ledgerFacts: [fact("全公司總排放量", "227898.6 kgCO2e", ["227898.6"])],
      ledgerComputedAt: STAMP_A,
    });
    expect(fingerprint).toEqual({ ledgerComputedAt: STAMP_A, facts: [] });
  });
});

describe("過期裁決", () => {
  const facts = [
    fact("全公司總排放量", "227898.6 kgCO2e", ["227898.6"]),
    fact("範疇一小計", "15437.9 kgCO2e", ["15437.9"]),
  ];
  const fingerprint: IParagraphLedgerFingerprint = {
    ledgerComputedAt: STAMP_A,
    facts: [{ label: "全公司總排放量", value: "227898.6 kgCO2e" }],
  };

  it("沒有指紋 → UNKNOWN(不是 FRESH:我們並不知道它是最新的)", () => {
    expect(
      assessParagraphFreshness({
        fingerprint: undefined,
        ledgerFacts: facts,
        ledgerComputedAt: STAMP_B,
      }),
    ).toBe(ParagraphFreshnessEnum.UNKNOWN);
  });

  it("帳本此刻讀不到 → UNKNOWN(載入中不得閃一次滿江紅)", () => {
    expect(
      assessParagraphFreshness({
        fingerprint,
        ledgerFacts: [],
        ledgerComputedAt: undefined,
      }),
    ).toBe(ParagraphFreshnessEnum.UNKNOWN);
  });

  it("戳記相同 → FRESH", () => {
    expect(
      assessParagraphFreshness({
        fingerprint,
        ledgerFacts: facts,
        ledgerComputedAt: STAMP_A,
      }),
    ).toBe(ParagraphFreshnessEnum.FRESH);
  });

  it("★ 帳本重算了、但這一節引用的值沒變 → FRESH(改了別的廠址不該波及這一節)", () => {
    const recalculated = [
      fact("全公司總排放量", "227898.6 kgCO2e", ["227898.6"]),
      fact("範疇一小計", "99999.9 kgCO2e", ["99999.9"]),
    ];
    expect(
      assessParagraphFreshness({
        fingerprint,
        ledgerFacts: recalculated,
        ledgerComputedAt: STAMP_B,
      }),
    ).toBe(ParagraphFreshnessEnum.FRESH);
  });

  it("引用的值變了 → STALE", () => {
    const recalculated = [fact("全公司總排放量", "300000 kgCO2e", ["300000"])];
    expect(
      assessParagraphFreshness({
        fingerprint,
        ledgerFacts: recalculated,
        ledgerComputedAt: STAMP_B,
      }),
    ).toBe(ParagraphFreshnessEnum.STALE);
  });

  it("引用的那筆事實整筆不見了 → STALE(維度消失也是變了)", () => {
    expect(
      assessParagraphFreshness({
        fingerprint,
        ledgerFacts: [fact("範疇一小計", "15437.9 kgCO2e", ["15437.9"])],
        ledgerComputedAt: STAMP_B,
      }),
    ).toBe(ParagraphFreshnessEnum.STALE);
  });

  it("指紋的 facts 是空的 → 永遠 FRESH(它不依賴帳本任何值)", () => {
    expect(
      assessParagraphFreshness({
        fingerprint: { ledgerComputedAt: STAMP_A, facts: [] },
        ledgerFacts: [],
        ledgerComputedAt: STAMP_B,
      }),
    ).toBe(ParagraphFreshnessEnum.FRESH);
  });

  it("一鍵更新之後重打指紋 → 不再過期", () => {
    const recalculated = [fact("全公司總排放量", "300000 kgCO2e", ["300000"])];
    const content = "本年度總排放量為 300000 kgCO2e。";
    const renewed = buildParagraphFingerprint({
      content,
      ledgerFacts: recalculated,
      ledgerComputedAt: STAMP_B,
    });
    expect(
      assessParagraphFreshness({
        fingerprint: renewed,
        ledgerFacts: recalculated,
        ledgerComputedAt: STAMP_B,
      }),
    ).toBe(ParagraphFreshnessEnum.FRESH);
  });

  it("使用者手改過的段落一樣會被標過期(標示 ≠ 覆蓋)", () => {
    /**
     * Info: (20260908 - Emily) `origin` 不參與裁決:手改過的節照樣要讓使用者知道
     * 它依據的數字變了。**不自動覆蓋**是由「只標示、更新要按」保證的,
     * 不是靠把手改過的節排除在裁決之外 —— 那會讓最需要提醒的那些節反而沒有提醒。
     */
    const edited: IReportParagraph = {
      ...paragraph("3.2", "使用者改寫過 227.8986 公噸 CO2e", fingerprint),
      origin: ParagraphOriginEnum.MANUAL,
    };
    const summary = summarizeReportFreshness({
      paragraphs: [edited],
      ledgerFacts: [fact("全公司總排放量", "300000 kgCO2e", ["300000"])],
      ledgerComputedAt: STAMP_B,
    });
    expect(summary.staleCodes).toEqual(["3.2"]);
  });
});

describe("整份報告的盤點", () => {
  const facts = [
    fact("全公司總排放量", "227898.6 kgCO2e", ["227898.6"]),
    fact("範疇一小計", "15437.9 kgCO2e", ["15437.9"]),
  ];
  const build = (content: string) =>
    buildParagraphFingerprint({
      content,
      ledgerFacts: facts,
      ledgerComputedAt: STAMP_A,
    });

  const paragraphs = [
    paragraph("3.1", "總量 227898.6 kgCO2e", build("總量 227898.6 kgCO2e")),
    paragraph("3.2", "範疇一 15437.9 kgCO2e", build("範疇一 15437.9 kgCO2e")),
    paragraph("3.3", "本節說明方法論。", build("本節說明方法論。")),
    paragraph("3.4", "沒有指紋的舊段落 227898.6 kgCO2e"),
    paragraph("3.5", ""),
  ];

  it("只有引用到變動值的那一節被標 —— 其餘不動", () => {
    const summary = summarizeReportFreshness({
      paragraphs,
      ledgerFacts: [
        fact("全公司總排放量", "227898.6 kgCO2e", ["227898.6"]),
        fact("範疇一小計", "99999.9 kgCO2e", ["99999.9"]),
      ],
      ledgerComputedAt: STAMP_B,
    });
    expect(summary.staleCodes).toEqual(["3.2"]);
    expect(summary.staleParagraphIds).toEqual(["p-3.2"]);
    expect(summary.staleCount).toBe(1);
  });

  it("沒有指紋的舊段落進 unknown,不進 stale 也不進 fresh", () => {
    const summary = summarizeReportFreshness({
      paragraphs,
      ledgerFacts: facts,
      ledgerComputedAt: STAMP_A,
    });
    expect(summary.unknownCount).toBe(1);
    expect(summary.staleCount).toBe(0);
    expect(summary.freshCount).toBe(3);
  });

  it("還沒寫的節不計入任何一項(那是完成度要說的事,不是新舊)", () => {
    const summary = summarizeReportFreshness({
      paragraphs,
      ledgerFacts: facts,
      ledgerComputedAt: STAMP_A,
    });
    expect(summary.staleCount + summary.freshCount + summary.unknownCount).toBe(
      4,
    );
  });

  it("staleCodes 照報告順序,不是雜湊順序", () => {
    const summary = summarizeReportFreshness({
      paragraphs,
      ledgerFacts: [
        fact("全公司總排放量", "1 kgCO2e", ["1"]),
        fact("範疇一小計", "2 kgCO2e", ["2"]),
      ],
      ledgerComputedAt: STAMP_B,
    });
    expect(summary.staleCodes).toEqual(["3.1", "3.2"]);
  });

  it("paragraphs 為 undefined(舊草稿沒有段落)不得爆炸", () => {
    expect(
      summarizeReportFreshness({
        paragraphs: undefined,
        ledgerFacts: facts,
        ledgerComputedAt: STAMP_A,
      }),
    ).toEqual({
      staleCount: 0,
      staleCodes: [],
      staleParagraphIds: [],
      unknownCount: 0,
      freshCount: 0,
    });
  });
});

describe("指紋不存 source(票面草稿寫的是「值 + 來源」,實作時改掉了)", () => {
  it("source 含 computedAt,存了它會讓每次重算都把每一節標成過期", () => {
    /**
     * Info: (20260908 - Emily) `carbon_ledger_query` 的總計欄事實,source 是
     * 「帳本總計欄(N 筆分錄,計算於 <computedAt>)」。指紋若記 source,
     * 第二條規則(引用值也要變)就被繞過了 —— 這一條把那個決定釘在原地。
     */
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/carbon_report_freshness.ts"),
      "utf8",
    );
    const stripped = source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1");
    expect(stripped).not.toMatch(/source/);

    const fingerprint = buildParagraphFingerprint({
      content: "總量 227898.6 kgCO2e",
      ledgerFacts: [fact("全公司總排放量", "227898.6 kgCO2e", ["227898.6"])],
      ledgerComputedAt: STAMP_A,
    });
    expect(Object.keys(fingerprint?.facts[0] ?? {})).toEqual([
      "label",
      "value",
    ]);
  });
});
