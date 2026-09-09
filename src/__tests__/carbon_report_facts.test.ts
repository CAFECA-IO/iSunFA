import { describe, it, expect } from "@jest/globals";
import fs from "fs";
import path from "path";
import {
  resolveReportSectionTexts,
  buildReportSectionFacts,
  buildReportFacts,
  REPORT_FACT_LABEL_PREFIX,
  REPORT_FACT_OVERFLOW_LABEL,
} from "@/lib/carbon_report_facts";
import type { IReportParagraph } from "@/types/carbon_chatbot.types";
import type { IContextFact } from "@/interfaces/carbon_paragraph_draft";

/**
 * Info: (20260908 - Emily) 報告本體進事實包(#6778 後半)。
 *
 * owner 實測的失敗有兩半:類別維度不存在(前半,已在 develop),
 * 以及**報告上的數字問不到** —— 對話請求只送 `history + currentStep + ledgerFacts`,
 * 報告本體不在裡面。匯入的報告尤其明顯:那些數字是原文照錄的,帳本可能沒有對應的格。
 */
const paragraph = (
  code: string,
  title: string,
  content: string,
): IReportParagraph => ({
  id: `p-${code}`,
  chapterId: "ch3",
  code,
  title,
  content,
  isCompleted: true,
  isVerified: false,
  isDataDriven: true,
});

const ledgerFact = (value: string, emissionsKg?: string[]): IContextFact => ({
  label: "全公司總排放量",
  value,
  source: "帳本總計欄",
  ...(emissionsKg ? { emissionsKg } : {}),
});

describe("每節的現行原文取自哪裡(本模組唯一的判斷)", () => {
  const paragraphs = [
    paragraph("3.1", "3.1 排放源鑑別", "舊的段落內容 111.11 公噸 CO2e"),
    paragraph("3.2", "3.2 排放量計算", "舊的段落內容 222.22 公噸 CO2e"),
  ];

  it("有 rawMarkdown 時以它為準 —— paragraphs 是 derived view,可能已經過期", () => {
    /**
     * Info: (20260908 - Emily) 這一條是整個模組最承重的一格。`rawMarkdown` 的型別註解
     * 寫的是「報告全文的權威來源(使用者所見即所存)」;讀 derived view 會讓
     * **紙上印一個數字、AI 引用另一個**,而兩者都自稱來自報告。
     */
    const rawMarkdown = [
      "# 報告",
      "",
      "### 3.1 排放源鑑別",
      "使用者改過的內容 333.33 公噸 CO2e",
      "",
      "### 3.2 排放量計算",
      "使用者改過的內容 444.44 公噸 CO2e",
    ].join("\n");
    const sections = resolveReportSectionTexts(paragraphs, rawMarkdown);
    expect(sections.map((section) => section.content.trim())).toEqual([
      "使用者改過的內容 333.33 公噸 CO2e",
      "使用者改過的內容 444.44 公噸 CO2e",
    ]);
  });

  it("沒有 rawMarkdown 時退回 paragraphs(舊草稿仍要答得出來)", () => {
    const sections = resolveReportSectionTexts(paragraphs, undefined);
    expect(sections.map((section) => section.content)).toEqual([
      "舊的段落內容 111.11 公噸 CO2e",
      "舊的段落內容 222.22 公噸 CO2e",
    ]);
  });

  it("空內容的節不出現(未撰寫的 33 節不該變成 33 筆空事實)", () => {
    const sections = resolveReportSectionTexts(
      [paragraph("3.1", "3.1 排放源鑑別", "   "), ...paragraphs.slice(1)],
      undefined,
    );
    expect(sections.map((section) => section.code)).toEqual(["3.2"]);
  });

  it("沒有段落 → 空陣列(不是拋錯)", () => {
    expect(resolveReportSectionTexts(undefined, "### 3.1 x\n1 公噸")).toEqual(
      [],
    );
  });
});

describe("報告的數值主張抽成事實", () => {
  it("帶值、帶章節來源,而且說得出與帳本一不一致", () => {
    /**
     * Info: (20260908 - Emily) 「一致 / 不一致」是這一組的中心判準。
     * 「報告寫 237.0968 而帳本是 227.8986」正是查核者要看的那一筆 ——
     * 少了這個標示,模型只會說「報告上是 237.0968」,而沒有人知道它與帳本不同。
     */
    const facts = buildReportSectionFacts(
      [
        {
          code: "3.2",
          title: "3.2 排放量計算",
          content: "全公司總排放量為 227.8986 公噸 CO2e。",
        },
        {
          code: "3.3",
          title: "3.3 類別三",
          content: "類別三排放量為 237.0968 公噸 CO2e。",
        },
      ],
      [ledgerFact("227.8986 公噸 CO2e", ["227898.6"])],
      20,
    );
    const bySection = new Map(facts.map((fact) => [fact.label, fact] as const));
    const matched = bySection.get(
      `${REPORT_FACT_LABEL_PREFIX} 3.2 3.2 排放量計算`,
    );
    const unmatched = bySection.get(
      `${REPORT_FACT_LABEL_PREFIX} 3.3 3.3 類別三`,
    );
    expect(matched?.value).toBe("227.8986 公噸 CO2e");
    expect(matched?.source).toContain("第 3.2 節");
    expect(matched?.source).toContain("與帳本事實的數值一致");
    expect(unmatched?.value).toBe("237.0968 公噸 CO2e");
    expect(unmatched?.source).toContain("帳本事實裡沒有這個數值");
  });

  it("公噸 vs kg:帳本存 kg 級,報告印公噸,同一個量要判成一致", () => {
    /**
     * Info: (20260908 - Emily) 這一條釘住第一版的錯。我原本拿
     * `collectAllowedNumbers(...).equality` 做字串比對 —— 而帳本事實宣告
     * `emissionsKg` 時那支函式**不把 value 放進 equality**,於是
     * 「報告 227.8986 公噸 / 帳本 227898.6 kg」這個最常見的一致情形被判成不一致。
     * 假警報比沒有標示更糟:查核者會去追一個不存在的差異。
     * 現在借出口守門的同一支裁決(含 kg↔公噸 換算),兩邊的定義不可能分岔。
     */
    const facts = buildReportSectionFacts(
      [{ code: "3.2", title: "3.2", content: "總量 227.8986 公噸 CO2e" }],
      [ledgerFact("227898.6 kgCO2e", ["227898.6"])],
      10,
    );
    expect(facts[0].source).toContain("與帳本事實的數值一致");
  });

  it("不宣告 emissionsKg —— 否則報告替自己的下一句背書", () => {
    /**
     * Info: (20260908 - Emily) `emissionsKg` 是「這是可信的排放量」的宣告,
     * 出口守門憑它允許 kg↔公噸換算。報告上的數字有原文照錄(可信)與 AI 撰寫
     * (未經帳本裁決)兩種來歷;後者若進了那個欄位,守門就會拿報告自己的產出
     * 替報告背書 —— **守門被自己要守的東西餵養**。
     */
    const facts = buildReportSectionFacts(
      [{ code: "3.2", title: "3.2", content: "排放量 500 公噸 CO2e" }],
      [],
      10,
    );
    expect(facts).toHaveLength(1);
    expect("emissionsKg" in facts[0]).toBe(false);
  });

  it("不一致的排在前面(逾上限時最後才被裁掉)", () => {
    const sections = [
      { code: "1.1", title: "1.1", content: "一致值 100 公噸 CO2e" },
      { code: "1.2", title: "1.2", content: "不一致值 999 公噸 CO2e" },
    ];
    const facts = buildReportSectionFacts(
      sections,
      [ledgerFact("100 公噸 CO2e")],
      10,
    );
    expect(facts[0].value).toBe("999 公噸 CO2e");
    expect(facts[1].value).toBe("100 公噸 CO2e");
  });

  it("同一節內同值去重,跨節不去重(「哪一節」正是使用者問的)", () => {
    const facts = buildReportSectionFacts(
      [
        {
          code: "3.2",
          title: "3.2",
          content: "總量 3470.34 公噸 CO2e,亦即 3470.34 公噸 CO2e。",
        },
        { code: "3.6", title: "3.6", content: "小結 3470.34 公噸 CO2e。" },
      ],
      [],
      10,
    );
    expect(facts).toHaveLength(2);
    expect(facts.map((fact) => fact.label)).toEqual([
      `${REPORT_FACT_LABEL_PREFIX} 3.2 3.2`,
      `${REPORT_FACT_LABEL_PREFIX} 3.6 3.6`,
    ]);
  });

  it("逾上限:裁尾巴並補「另有 N 個未列出」——靜默截斷等於說謊", () => {
    const sections = Array.from({ length: 30 }, (_, index) => ({
      code: `9.${index}`,
      title: `9.${index}`,
      content: `數值 ${1000 + index} 公噸 CO2e`,
    }));
    const facts = buildReportSectionFacts(sections, [], 5);
    expect(facts).toHaveLength(5);
    const overflow = facts[facts.length - 1];
    expect(overflow.label).toBe(REPORT_FACT_OVERFLOW_LABEL);
    expect(overflow.value).toBe("另有 26 個報告原文的數值未列出");
  });

  it("預算 0 → 一筆都不送(帳本事實不能被報告原文擠掉)", () => {
    expect(
      buildReportSectionFacts(
        [{ code: "1.1", title: "1.1", content: "1 公噸 CO2e" }],
        [],
        0,
      ),
    ).toEqual([]);
  });

  it("沒有排放單位的數字不算主張(年度、頁碼、節號不是排放量)", () => {
    /*
     * Info: (20260908 - Emily) 判準沿用出口守門的 Y 地板(extractQuantityClaims):
     * 數字要與排放單位配對得上才算。自己寫第二支萃取器必然與它分岔,
     * 而分岔的後果是「守門收的集合」與「事實包給的集合」不同。
     */
    const facts = buildReportSectionFacts(
      [
        {
          code: "1.1",
          title: "1.1",
          content: "本報告涵蓋 2024 年度,共 3 個廠址,見第 12 頁。",
        },
      ],
      [],
      10,
    );
    expect(facts).toEqual([]);
  });

  it("組合入口與兩支分開呼叫等價", () => {
    const paragraphs = [paragraph("3.2", "3.2 排放量計算", "500 公噸 CO2e")];
    expect(
      buildReportFacts({ paragraphs, ledgerFacts: [], budget: 10 }),
    ).toEqual(
      buildReportSectionFacts(
        resolveReportSectionTexts(paragraphs, undefined),
        [],
        10,
      ),
    );
  });
});

describe("接線(源碼掃描;jest 是 node 環境、無 jsdom)", () => {
  const hook = fs.readFileSync(
    path.join(process.cwd(), "src/hooks/use_carbon_chat.ts"),
    "utf-8",
  );

  it("對話那條路把報告事實接在帳本事實之後", () => {
    expect(hook).toMatch(
      /const reportFacts = buildReportFacts\(\{[\s\S]{0,400}?\}\);/,
    );
    expect(hook).toMatch(
      /const ledgerFacts = \[\.\.\.channelLedgerFacts, \.\.\.reportFacts\];/,
    );
  });

  it("預算是帳本事實包之外的餘額(帳本那半不能被擠掉)", () => {
    expect(hook).toMatch(
      /budget: Math\.max\(\s*LEDGER_FACT_BUNDLE_MAX - channelLedgerFacts\.length,/,
    );
  });

  it("`/draft` 的兩條路**不**帶報告事實(否則報告替自己的下一句背書)", () => {
    /**
     * Info: (20260908 - Emily) 那兩條是在生成報告的文字,而守門的合法集合會跟著
     * 事實包放寬。帶了之後,3.1 節裡一個 AI 編出來的數字就成了 3.2 節的合法引用來源。
     * 這一條釘住那個邊界:`buildReportFacts` 在整個 hook 裡只能出現在對話那一處。
     */
    const occurrences = hook.match(/buildReportFacts\(/g) ?? [];
    expect(occurrences).toHaveLength(1);
    const draftBodies = hook.match(/contextFacts: [^\n]*/g) ?? [];
    expect(draftBodies.length).toBeGreaterThanOrEqual(2);
    draftBodies.forEach((line) => {
      expect(line).not.toContain("reportFacts");
    });
  });
});
