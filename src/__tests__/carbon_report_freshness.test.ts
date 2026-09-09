import { describe, it, expect } from "@jest/globals";
import fs from "fs";
import path from "path";
import {
  collectSatisfiedClaims,
  buildParagraphFingerprint,
  fingerprintFromSnapshot,
  assessParagraphFreshness,
  summarizeReportFreshness,
  ParagraphFreshnessEnum,
  PARAGRAPH_FINGERPRINT_MAX_CLAIMS,
} from "@/lib/carbon_report_freshness";
import { buildLedgerFactBundle } from "@/lib/carbon_ledger_query";
import { ParagraphOriginEnum } from "@/constants/carbon_chatbot";
import { GhgProtocolCategory, Iso14064Category } from "@/constants/esg";
import {
  LedgerProvenanceEnum,
  EmissionBasisEnum,
} from "@/constants/imported_quantity";
import type {
  IReportParagraph,
  IParagraphLedgerFingerprint,
  IComputedLedger,
  IComputedLedgerEntry,
} from "@/types/carbon_chatbot.types";
import type { IContextFact } from "@/interfaces/carbon_paragraph_draft";

/**
 * Info: (20260908 - Emily) 段落知不知道自己過期(#6786)。
 *
 * owner 的要求是「做好的報告載入後 AI 也有即時更新,隨時能打開就報告透過 AI 協助更新」。
 * 不能自動重寫(花點數、且會覆蓋使用者手改過的字),所以判準是**標出來 + 一鍵更新**。
 *
 * Info: (20260909 - Emily) 指紋從「引用到的事實(label + value)」改成「這一節當初通過守門的主張」
 * (#6789 review 阻-1 / 中-2)。這一組測試最承重的一條因此變成**反面**的:
 * 「替另一個廠補資料 → 總量、占比、排名全變 → 這一節仍然 FRESH」。
 * 9/08 那一版寫不出這條,而寫不出來本身就是結論。
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

describe("這一節的哪些主張當初是帳本說的", () => {
  it("kg 級事實對上公噸級原文 —— 借出口守門的換算,不自己寫字串比對", () => {
    /**
     * Info: (20260908 - Emily) 報告紙上印公噸、帳本存 kg 是**最常見**的情形。
     * 自己寫字串比對會把它判成「沒引用」,於是那一節永遠不會被標過期 ——
     * 靜默漏報,比誤報更難發現。
     */
    const facts = [fact("全公司總排放量", "227898.6 kgCO2e", ["227898.6"])];
    expect(
      collectSatisfiedClaims("本年度總排放量為 227.8986 公噸 CO2e。", facts),
    ).toEqual([{ value: "227.8986", unit: "公噸" }]);
  });

  it("不是排放量的數字不算主張(年度、章節、筆數)", () => {
    /**
     * Info: (20260908 - Emily) `extractQuantityClaims` 要求數字與排放單位相鄰,
     * 所以這些數字不會被當成依據。少了這個限制,一節裡隨便一個 `1`
     * 都會把它綁上一堆無關的事實 → 那些事實一變就假過期。
     */
    const facts = [
      fact("盤查年度", "2024"),
      fact("分錄筆數", "12"),
      fact("章節數", "3"),
    ];
    expect(
      collectSatisfiedClaims("依 2024 年資料,第 3 章共 12 筆分錄。", facts),
    ).toEqual([]);
  });

  it("帳本沒說過的數字不進指紋(原文照錄的既有報告數字不是對帳本的依據)", () => {
    const facts = [fact("全公司總排放量", "227898.6 kgCO2e", ["227898.6"])];
    expect(
      collectSatisfiedClaims(
        "總量 227898.6 kgCO2e;另一份報告寫 999999 kgCO2e。",
        facts,
      ),
    ).toEqual([{ value: "227898.6", unit: "kg" }]);
  });

  it("完全沒有排放量主張的節 → 空陣列(前言、方法論說明)", () => {
    const facts = [fact("全公司總排放量", "227898.6 kgCO2e", ["227898.6"])];
    expect(collectSatisfiedClaims("本節說明盤查邊界與方法論。", facts)).toEqual(
      [],
    );
  });

  it("同一個主張只留一筆(單位原文不同、尺度相同也算同一個);筆數不超過常數上限", () => {
    /**
     * Info: (20260909 - Emily) `extractQuantityClaims` 給的單位是窗內配對到的原文串接,同一個 1 kgCO2e
     * 重複出現時第二個會拿到「kgCO2e kgCO2e」。存原文會讓同一個主張長出多個變體,所以存尺度。
     */
    const facts = [fact("全公司總排放量", "1 kgCO2e", ["1"])];
    const repeated = Array.from({ length: 5 }, () => "1 kgCO2e").join("、");
    expect(collectSatisfiedClaims(repeated, facts)).toEqual([
      { value: "1", unit: "kg" },
    ]);
    expect(PARAGRAPH_FINGERPRINT_MAX_CLAIMS).toBeGreaterThanOrEqual(100);
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

  it("沒有主張時 claims 是空陣列,不是 undefined(空 ≠ 沒有指紋)", () => {
    expect(
      buildParagraphFingerprint({
        content: "本節說明盤查邊界。",
        ledgerFacts: [fact("全公司總排放量", "227898.6 kgCO2e", ["227898.6"])],
        ledgerComputedAt: STAMP_A,
      }),
    ).toEqual({ ledgerComputedAt: STAMP_A, claims: [] });
  });
});

describe("過期裁決", () => {
  const facts = [
    fact("全公司總排放量", "227898.6 kgCO2e", ["227898.6"]),
    fact("範疇一小計", "15437.9 kgCO2e", ["15437.9"]),
  ];
  const fingerprint: IParagraphLedgerFingerprint = {
    ledgerComputedAt: STAMP_A,
    claims: [{ value: "227.8986", unit: "公噸" }],
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

  it("帳本重算了、但這一節依據的值沒變 → FRESH(改了別的範疇不該波及這一節)", () => {
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

  it("依據的值變了 → STALE(公噸級主張對 kg 級新值重新換算後不再通過)", () => {
    const recalculated = [fact("全公司總排放量", "300000 kgCO2e", ["300000"])];
    expect(
      assessParagraphFreshness({
        fingerprint,
        ledgerFacts: recalculated,
        ledgerComputedAt: STAMP_B,
      }),
    ).toBe(ParagraphFreshnessEnum.STALE);
  });

  it("依據的那個數字整個從帳本消失 → STALE", () => {
    expect(
      assessParagraphFreshness({
        fingerprint,
        ledgerFacts: [fact("範疇一小計", "15437.9 kgCO2e", ["15437.9"])],
        ledgerComputedAt: STAMP_B,
      }),
    ).toBe(ParagraphFreshnessEnum.STALE);
  });

  it("claims 是空的 → 永遠 FRESH(它不依賴帳本任何值)", () => {
    expect(
      assessParagraphFreshness({
        fingerprint: { ledgerComputedAt: STAMP_A, claims: [] },
        ledgerFacts: [],
        ledgerComputedAt: STAMP_B,
      }),
    ).toBe(ParagraphFreshnessEnum.FRESH);
  });

  it("一鍵更新之後重打指紋 → 不再過期", () => {
    const recalculated = [fact("全公司總排放量", "300000 kgCO2e", ["300000"])];
    const renewed = buildParagraphFingerprint({
      content: "本年度總排放量為 300000 kgCO2e。",
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

/**
 * Info: (20260909 - Emily) review 阻-1 的場景,用**真的事實包**跑(不是手寫夾具)。
 * 素材是產品裡最普通的動作:替另一個廠補活動數據。總量變、占比變、排名重排 ——
 * 而這一節引用的那個數字一個字都沒動。9/08 那一版在這裡判 STALE。
 */
describe("★ 與這一節無關的變動不得讓它過期(review 阻-1)", () => {
  const entry = (
    activityKey: string,
    site: string,
    sourceName: string,
    co2eKg: string,
  ): IComputedLedgerEntry => ({
    activityKey,
    sourceName,
    scopeCategory: GhgProtocolCategory.SCOPE_2_INDIRECT,
    quantityRaw: "0",
    convertedQuantity: "0",
    convertedUnit: "TONNE",
    co2eKg,
    factor: {
      factorId: "imported:3.8",
      name: "不適用(原文照錄)",
      value: "—",
      unit: "TONNE",
      source: "3.8",
    },
    provenance: LedgerProvenanceEnum.IMPORTED,
    emissionBasis: EmissionBasisEnum.LOCATION,
    importedOrigin: {
      site,
      isoCategory: Iso14064Category.CATEGORY_2,
      subCategory: "2.1 外購電力",
      tableNo: "表3.8",
    },
  });
  const ledgerOf = (
    entries: IComputedLedgerEntry[],
    computedAt: string,
  ): IComputedLedger => {
    const total = entries.reduce((acc, e) => acc + Number(e.co2eKg), 0);
    return {
      entries,
      pending: [],
      scopeSubtotals: { SCOPE_2_INDIRECT: String(total) },
      totalCo2eKg: String(total),
      computedAt,
    };
  };
  const before = ledgerOf(
    [
      entry("hq", "(1) 總公司", "總公司 外購電力", "1000"),
      entry("tp", "(2) 台北", "台北 外購電力", "500"),
    ],
    STAMP_A,
  );
  const content = "本公司總公司外購電力排放量為 1000 kgCO2e。";
  const fingerprint = buildParagraphFingerprint({
    content,
    ledgerFacts: buildLedgerFactBundle(before),
    ledgerComputedAt: STAMP_A,
  });

  it("指紋記的是這一節自己的主張,不是事實的 label / value", () => {
    expect(fingerprint?.claims).toEqual([{ value: "1000", unit: "kg" }]);
  });

  it("替第三個廠補 9000 → 總量 1500→10500、占比全變、總公司從第 1 名掉到第 2 名 → 仍是 FRESH", () => {
    const after = ledgerOf(
      [
        entry("hq", "(1) 總公司", "總公司 外購電力", "1000"),
        entry("tp", "(2) 台北", "台北 外購電力", "500"),
        entry("new", "(3) 新廠", "新廠 外購電力", "9000"),
      ],
      STAMP_B,
    );
    const facts = buildLedgerFactBundle(after);
    // Info: (20260909 - Emily) 先證明素材真的動了:排名與占比都不是原樣
    expect(facts.some((f) => f.label.startsWith("排放量第 2 大:總公司"))).toBe(
      true,
    );
    expect(
      assessParagraphFreshness({
        fingerprint,
        ledgerFacts: facts,
        ledgerComputedAt: STAMP_B,
      }),
    ).toBe(ParagraphFreshnessEnum.FRESH);
  });

  it("總公司那筆真的改了(1000 → 1200)→ STALE", () => {
    const after = ledgerOf(
      [
        entry("hq", "(1) 總公司", "總公司 外購電力", "1200"),
        entry("tp", "(2) 台北", "台北 外購電力", "500"),
      ],
      STAMP_B,
    );
    expect(
      assessParagraphFreshness({
        fingerprint,
        ledgerFacts: buildLedgerFactBundle(after),
        ledgerComputedAt: STAMP_B,
      }),
    ).toBe(ParagraphFreshnessEnum.STALE);
  });
});

describe("指紋用請求時的快照,不用落地時的帳本(#6789 review 中-1)", () => {
  /**
   * Info: (20260909 - Emily) 序列:請求送出時事實 A(總量 227898.6)→ LLM 生成中,匯入完成、
   * 帳本變成 B(總量 300000、戳記 T₁)→ 草稿落地,文字引用的是 A 的數字。
   * 落地時若拿 B 蓋指紋:戳記 = T₁ = 當前 → FRESH 短路;而 227.8986 對 B 不通過 → 不被記為依據。
   * **一節引用舊數字的段落被永久標成最新。** 用 A 蓋:戳記 T₀ ≠ T₁ 且主張不再通過 → 立刻 STALE。
   */
  const factsA = [fact("全公司總排放量", "227898.6 kgCO2e", ["227898.6"])];
  const factsB = [fact("全公司總排放量", "300000 kgCO2e", ["300000"])];
  const content = "本年度總排放量為 227.8986 公噸 CO2e。";

  it("用請求時快照 A 蓋 → 落地時對 B 裁決是 STALE(真相)", () => {
    const stamped = fingerprintFromSnapshot(content, {
      facts: factsA,
      ledgerComputedAt: STAMP_A,
    });
    expect(stamped?.claims).toEqual([{ value: "227.8986", unit: "公噸" }]);
    expect(
      assessParagraphFreshness({
        fingerprint: stamped,
        ledgerFacts: factsB,
        ledgerComputedAt: STAMP_B,
      }),
    ).toBe(ParagraphFreshnessEnum.STALE);
  });

  it("反例:用落地時的 B 蓋 → 假 FRESH,而且依據沒被記到(這就是要避免的形狀)", () => {
    const wrong = buildParagraphFingerprint({
      content,
      ledgerFacts: factsB,
      ledgerComputedAt: STAMP_B,
    });
    expect(wrong?.claims).toEqual([]);
    expect(
      assessParagraphFreshness({
        fingerprint: wrong,
        ledgerFacts: factsB,
        ledgerComputedAt: STAMP_B,
      }),
    ).toBe(ParagraphFreshnessEnum.FRESH);
  });

  it("沒有快照(歷史回填)→ 不打指紋 → UNKNOWN,不偽造「最新」", () => {
    expect(fingerprintFromSnapshot(content, undefined)).toBeUndefined();
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

  it("只有依據變動值的那一節被標 —— 其餘不動", () => {
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

describe("指紋不存 source / label(記主張,不記事實)", () => {
  it("模組裡沒有讀 source 或以 label 認人的程式碼", () => {
    /**
     * Info: (20260908 - Emily) source 含 computedAt,存了它每次重算都把每一節標成過期;
     * Info: (20260909 - Emily) label 是人話會改、value 夾排名與占比會隨整本帳本變(review 中-2 / 阻-1)。
     * 指紋只記這一節自己的主張,這一條把那個決定釘在原地。
     */
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/carbon_report_freshness.ts"),
      "utf8",
    );
    const stripped = source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1");
    expect(stripped).not.toMatch(/\.source\b/);
    expect(stripped).not.toMatch(/\.label\b/);
    expect(stripped).not.toMatch(/imprint\.key|fact\.key/);

    const fingerprint = buildParagraphFingerprint({
      content: "總量 227898.6 kgCO2e",
      ledgerFacts: [fact("全公司總排放量", "227898.6 kgCO2e", ["227898.6"])],
      ledgerComputedAt: STAMP_A,
    });
    expect(Object.keys(fingerprint?.claims[0] ?? {})).toEqual([
      "value",
      "unit",
    ]);
  });
});
