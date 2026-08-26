// Info: (20260825 - Emily) 回覆出口守門的測試(#6707 第三層)。
// Info: (20260825 - Emily) 守門的生死線是誤殺率:合法回覆被攔,兩天內守門就會被關掉 ——
// Info: (20260825 - Emily) 所以「不該攔的」測試與「該攔的」一樣多。

import fs from "fs";
import path from "path";
import {
  extractQuantityClaims,
  collectAllowedNumbers,
  auditReplyQuantities,
  buildGateBlockedReply,
  shouldRunReplyGate,
  applyReplyGate,
  adjudicateExtractedClaims,
  shiftDecimalString,
  type IExtractedEmissionClaim,
} from "@/lib/carbon_reply_gate";
import type { IContextFact } from "@/interfaces/carbon_paragraph_draft";

const facts: IContextFact[] = [
  {
    label: "全公司總排放量",
    value: "8332581.1 kgCO2e",
    source: "帳本總計欄",
  },
  {
    label: "排放量第 1 大:總公司 外購電力",
    value: "3470335.4 kgCO2e(3470.3354 TONNE)",
    source: "原文照錄 表3.8",
  },
];

describe("extractQuantityClaims(Y 地板:遮單位 → 雙向窗 → 非排放單位豁免)", () => {
  it("抓得到:kgCO2e、公噸、噸、含千分位(單位在後的基本形)", () => {
    expect(
      extractQuantityClaims(
        "總量為 8,332,581.1 kgCO2e,約 8332.581 公噸;最大源 3470.34 噸。",
      ),
    ).toEqual(["8332581.1", "8332.581", "3470.34"]);
  });

  it("不抓:章節號、年份、標準號、步驟編號(附近沒有排放單位)", () => {
    expect(
      extractQuantityClaims(
        "依 ISO 14064-1:2018,請見 3.8 節;2023 年為基準年,第 2 步共 3 筆。",
      ),
    ).toEqual([]);
  });

  /**
   * Info: (20260826 - Emily) review round-3 的 5 個 ESCAPES:單位在前的中文標準寫法
   * (「排放量(公噸 CO2e):X」是盤查報告最常見的欄位形),v1 只看數字後方整批漏接。
   */
  it("單位在前(round-3 ESCAPES)全數收進:括號欄位形/為字連接/單位前置宣告/以…計/跨行", () => {
    expect(extractQuantityClaims("貴公司排放量(公噸 CO2e):9999")).toEqual([
      "9999",
    ]);
    expect(extractQuantityClaims("排放量(公噸CO2e)為 9999")).toEqual(["9999"]);
    expect(extractQuantityClaims("單位:公噸 CO2e,總量 9999")).toEqual(["9999"]);
    expect(extractQuantityClaims("以公噸 CO2e 計,全公司總量為 9999")).toEqual([
      "9999",
    ]);
    expect(extractQuantityClaims("甲廠排放量:9999\n公噸 CO2e")).toEqual([
      "9999",
    ]);
  });

  it("非排放單位豁免:數字自帶元/節/年/%/頁時,窗內有排放單位也不算斷言", () => {
    expect(extractQuantityClaims("費用 300 元,含 CO2e 查證")).toEqual([]);
    expect(extractQuantityClaims("第 3 節說明公噸 CO2e 的計算")).toEqual([]);
    expect(extractQuantityClaims("佔比 39.9%,以公噸 CO2e 計")).toEqual([]);
    expect(extractQuantityClaims("報告第 42 頁的公噸 CO2e 數據")).toEqual([]);
    // Info: (20260826 - Emily) 豁免只救自帶單位的那顆:同句真正的排放量照抓
    expect(
      extractQuantityClaims("2023 年為基準年,總量 9999 公噸 CO2e"),
    ).toEqual(["9999"]);
  });

  it("最近數字配對:數字與單位之間夾著別的數字時不誤殺(排名索引/清單編號)", () => {
    // Info: (20260826 - Emily) 沒有這條,「第 1 大(3470.3 公噸)」的 1 在 10 字窗內會被判成斷言
    expect(extractQuantityClaims("第 1 大(3470.3 公噸)")).toEqual(["3470.3"]);
  });

  it("單位裡的數字不是數字:CO2e 的 2 不會被抓成斷言", () => {
    expect(extractQuantityClaims("單位為公噸 CO2e。")).toEqual([]);
  });
});

describe("auditReplyQuantities(Y 地板裁決:字串精確等值)", () => {
  it("引用事實包原值(含千分位變體)→ 過", () => {
    const result = auditReplyQuantities(
      "帳本總排放量為 8,332,581.1 kgCO2e,最大排放源為外購電力 3470.3354 噸。",
      facts,
      [],
    );
    expect(result).toEqual({ ok: true, violations: [] });
  });

  it("覆述使用者自己說過的數字做對照 → 過(禁止糾錯等於禁止對帳)", () => {
    const result = auditReplyQuantities(
      "您提到的 5000 噸與帳本的 8332581.1 kgCO2e 不一致。",
      facts,
      ["我們去年大概排了 5000 噸吧?"],
    );
    expect(result.ok).toBe(true);
  });

  it("事實包沒有的排放量 → 攔,violations 列出正規化後的數字", () => {
    const result = auditReplyQuantities(
      "貴公司排放量約 9,999 噸,屬業界平均。",
      facts,
      [],
    );
    expect(result.ok).toBe(false);
    expect(result.violations).toEqual(["9999"]);
  });

  it("四捨五入也算違規:8332.58 公噸不在事實包(原樣引用是規格)", () => {
    const result = auditReplyQuantities("總量約 8332.58 公噸。", facts, []);
    expect(result.ok).toBe(false);
    expect(result.violations).toEqual(["8332.58"]);
  });

  it("同一違規數字出現多次只列一次", () => {
    const result = auditReplyQuantities(
      "約 500 噸;是的,500 噸左右。",
      facts,
      [],
    );
    expect(result.violations).toEqual(["500"]);
  });

  it("單位在前的編造(round-3 ESCAPES)現在會被攔", () => {
    const result = auditReplyQuantities(
      "貴公司排放量(公噸 CO2e):9999",
      facts,
      [],
    );
    expect(result.ok).toBe(false);
    expect(result.violations).toEqual(["9999"]);
  });
});

describe("collectAllowedNumbers", () => {
  it("只收 value 的數字(含括號內換算值);source 不進", () => {
    const allowed = collectAllowedNumbers(facts, []);
    expect(allowed.has("8332581.1")).toBe(true);
    expect(allowed.has("3470335.4")).toBe(true);
    expect(allowed.has("3470.3354")).toBe(true);
    /**
     * Info: (20260825 - Emily) source 裡的表號(表3.8)刻意不收:
     * 「表3.8」後面沒有排放單位,守門本來就不看它;
     * 收進集合只會讓「3.8 噸」這種編造多一條漏網路徑。
     */
    expect(allowed.has("3.8")).toBe(false);
  });

  it("label 的數字不收(排名索引/段落 id 不是數量);單位字串的 2 也不收(review 阻擋項)", () => {
    /**
     * Info: (20260825 - Emily) review 實測:label「第 1 大」的 1、「ch3-8」的 3 和 8、
     * 單位 kgCO2e 的 2 全被灌進合法集合 —— 於是「2 公噸」在任何對話都過得了守門。
     */
    const polluted: IContextFact[] = [
      {
        label: "排放量第 1 大:總公司 外購電力",
        value: "4000000 kgCO2e",
        source: "s",
      },
      {
        label: "匯入表格被勾稽擋下:ch3-8",
        value: "60 列無法解析",
        source: "s",
      },
    ];
    const allowed = collectAllowedNumbers(polluted, []);
    expect(allowed.has("4000000")).toBe(true);
    expect(allowed.has("60")).toBe(true);
    expect(allowed.has("1")).toBe(false);
    expect(allowed.has("2")).toBe(false);
    expect(allowed.has("3")).toBe(false);
    expect(allowed.has("8")).toBe(false);
  });

  it("回歸:「2 公噸」不再因單位字串而放行", () => {
    const result = auditReplyQuantities("該項約 2 公噸。", facts, []);
    expect(result.ok).toBe(false);
    expect(result.violations).toEqual(["2"]);
  });
});

describe("事實包為空時守門照跑(review 阻擋項:只剩指令的狀態最需要機器判)", () => {
  it("編造排放量 → 攔;引用同業平均 → 攔", () => {
    expect(
      auditReplyQuantities("貴公司年排放約 8332.581 公噸 CO2e。", [], []).ok,
    ).toBe(false);
    expect(
      auditReplyQuantities("同業平均約 5000 公噸,貴公司應相近。", [], []).ok,
    ).toBe(false);
  });

  it("覆述使用者的數字 → 過;純拒答 → 過(沒有誤殺的代價)", () => {
    expect(
      auditReplyQuantities(
        "您提到的 5000 公噸,帳本中查無資料。",
        [],
        ["我們大概排 5000 公噸吧?"],
      ).ok,
    ).toBe(true);
    expect(
      auditReplyQuantities("帳本中沒有這項資料,請先完成報告匯入。", [], []).ok,
    ).toBe(true);
  });
});

describe("buildGateBlockedReply", () => {
  it("決定性訊息:點名被攔的數字並給下一步", () => {
    const text = buildGateBlockedReply(["9999", "500"]);
    expect(text).toContain("9999、500");
    expect(text).toContain("無法溯源");
  });
});

describe("shiftDecimalString(決定性十進位位移,不經浮點)", () => {
  it("×1000 / ÷1000 / 邊界補零", () => {
    expect(shiftDecimalString("3470.3354", 3)).toBe("3470335.4");
    expect(shiftDecimalString("4000", 3)).toBe("4000000");
    expect(shiftDecimalString("8332581", -3)).toBe("8332.581");
    expect(shiftDecimalString("5", -3)).toBe("0.005");
  });
});

describe("adjudicateExtractedClaims(X 的 TS 裁決:等值或決定性換算)", () => {
  const allowed = collectAllowedNumbers(facts, []);

  it("等值 → 過;不在集合 → 違規", () => {
    expect(
      adjudicateExtractedClaims(
        [{ value: "8,332,581.1", unit: "kgCO2e" }],
        allowed,
      ),
    ).toEqual([]);
    expect(
      adjudicateExtractedClaims(
        [{ value: "9999", unit: "公噸 CO2e" }],
        allowed,
      ),
    ).toEqual(["9999"]);
  });

  it("同一事實的兩種正確寫法答案一致(round-3 指出 Y 做不到的那格):換算路徑要用「等值救不了」的數字驗", () => {
    // Info: (20260826 - Emily) 8332.5811 不在集合(集合只有 kg 值 8332581.1),公噸級 ×1000 對得上 → 合法
    expect(
      adjudicateExtractedClaims(
        [{ value: "8332.5811", unit: "公噸 CO2e" }],
        allowed,
      ),
    ).toEqual([]);
    // Info: (20260826 - Emily) kg 級 ÷1000 對得上公噸級事實 → 合法(集合只有 4000)
    expect(
      adjudicateExtractedClaims(
        [{ value: "4000000", unit: "kgCO2e" }],
        collectAllowedNumbers(
          [{ label: "l", value: "4000 tCO2e", source: "s" }],
          [],
        ),
      ),
    ).toEqual([]);
    // Info: (20260826 - Emily) 換算容差僅此一條:四捨五入仍然攔(×1000 後也對不上)
    expect(
      adjudicateExtractedClaims([{ value: "3470.34", unit: "公噸" }], allowed),
    ).toEqual(["3470.34"]);
  });
});

// Info: (20260826 - Emily) 以下是「接線」測試(review 阻擋項:守門邏輯對,
// Info: (20260826 - Emily) 但沒有任何測試釘住它有沒有被呼叫、在什麼條件下被呼叫 ——
// Info: (20260826 - Emily) 把上崗條件突變成 length === 0 全部測試照綠)。

describe("shouldRunReplyGate(上崗規則:看『有沒有帶』,不看『有幾筆』)", () => {
  it("undefined(呼叫端沒帶事實包)→ 跳過", () => {
    expect(shouldRunReplyGate(undefined)).toBe(false);
  });

  it("空陣列(帳本空)→ 上崗:只剩指令的狀態最需要機器判", () => {
    expect(shouldRunReplyGate([])).toBe(true);
  });

  it("有事實 → 上崗", () => {
    expect(shouldRunReplyGate(facts)).toBe(true);
  });
});

describe("applyReplyGate(套用結果的成對斷言:攔下改了什麼、通過沒改什麼)", () => {
  const fabricated = {
    reply: "貴公司年排放約 9999 公噸,屬業界平均。",
    readyParagraphId: "ch3-8" as string | null,
    revisionParagraphId: "ch3-2" as string | null,
    chartRequest: { templateId: "SCOPE_PIE", paragraphId: "ch3-2" } as {
      templateId: string;
      paragraphId: string;
    } | null,
    extraction: { company: "測試公司", activities: [] },
    usage: { inputTokens: 1, outputTokens: 2, totalTokens: 3 },
  };

  it("攔下:換攔截文案、原回覆消失、三個寫入訊號歸零、extraction/usage 原樣保留", async () => {
    const result = await applyReplyGate(fabricated, facts, []);
    expect(result.reply).toContain("無法溯源");
    expect(result.reply).toContain("9999");
    expect(result.reply).not.toContain("業界平均");
    expect(result.readyParagraphId).toBeNull();
    expect(result.revisionParagraphId).toBeNull();
    expect(result.chartRequest).toBeNull();
    expect(result.extraction).toBe(fabricated.extraction);
    expect(result.usage).toBe(fabricated.usage);
  });

  it("帳本空([])也照攔:突變回 length === 0 這條會先紅", async () => {
    const result = await applyReplyGate(fabricated, [], []);
    expect(result.reply).toContain("無法溯源");
    expect(result.readyParagraphId).toBeNull();
  });

  it("通過:回傳**同一參照**(沒攔就一個字都不許動)", async () => {
    const clean = {
      reply: "帳本總排放量為 8332581.1 kgCO2e。",
      readyParagraphId: "ch3-8" as string | null,
      revisionParagraphId: null as string | null,
      chartRequest: null as object | null,
    };
    expect(await applyReplyGate(clean, facts, [])).toBe(clean);
  });

  it("undefined(呼叫端沒帶)→ 同一參照,即使回覆帶編造數字", async () => {
    expect(await applyReplyGate(fabricated, undefined, [])).toBe(fabricated);
  });
});

describe("applyReplyGate × X 萃取器(聯集/降級留痕/前置過濾)", () => {
  const base = {
    readyParagraphId: null as string | null,
    revisionParagraphId: null as string | null,
    chartRequest: null as object | null,
  };

  it("Y 過但 X 抓到(單位距離超出 Y 的窗)→ 攔:聯集單調優於任一方", async () => {
    const structured = {
      ...base,
      // Info: (20260826 - Emily) 9999 與公噸相距 >10 字,Y 地板構不到
      reply: "全公司總量為 9999,單位標示於本節末尾的公噸 CO2e 說明。",
    };
    expect(auditReplyQuantities(structured.reply, facts, []).ok).toBe(true);
    const extractor = async (): Promise<IExtractedEmissionClaim[]> => [
      { value: "9999", unit: "公噸 CO2e" },
    ];
    const result = await applyReplyGate(structured, facts, [], extractor);
    expect(result.reply).toContain("無法溯源");
    expect(result.reply).toContain("9999");
  });

  it("X 抓到但換算後屬合法(公噸級 ×1000 = 事實 kg 值)→ 過,同一參照", async () => {
    const structured = {
      ...base,
      reply: "最大源折合公噸級數值,列示於本段末:3470.3354(公噸 CO2e)。",
    };
    const extractor = async (): Promise<IExtractedEmissionClaim[]> => [
      { value: "3470.3354", unit: "公噸 CO2e" },
    ];
    expect(await applyReplyGate(structured, facts, [], extractor)).toBe(
      structured,
    );
  });

  it("X 掛掉 → 降級放行(Y 已過)但不靜默:留痕由 logger 承擔,行為是放行原回覆", async () => {
    const structured = {
      ...base,
      reply: "帳本總排放量為 8332581.1 kgCO2e,細節見上。",
    };
    const extractor = async (): Promise<IExtractedEmissionClaim[]> => {
      throw new Error("extractor down");
    };
    expect(await applyReplyGate(structured, facts, [], extractor)).toBe(
      structured,
    );
  });

  it("前置過濾:回覆不含數字就不呼叫 X(拒答句是多數,不花這筆錢)", async () => {
    let calls = 0;
    const extractor = async (): Promise<IExtractedEmissionClaim[]> => {
      calls += 1;
      return [];
    };
    const structured = {
      ...base,
      reply: "帳本中沒有這項資料,請先完成報告匯入。",
    };
    await applyReplyGate(structured, facts, [], extractor);
    expect(calls).toBe(0);
  });

  it("Y 已攔就不再呼叫 X(短路:已經要攔了,不必再花一次萃取)", async () => {
    let calls = 0;
    const extractor = async (): Promise<IExtractedEmissionClaim[]> => {
      calls += 1;
      return [];
    };
    const structured = { ...base, reply: "貴公司排放量約 7777 公噸。" };
    const result = await applyReplyGate(structured, facts, [], extractor);
    expect(result.reply).toContain("無法溯源");
    expect(calls).toBe(0);
  });

  it("萃取可重放:同一則回覆第二次不再呼叫萃取器(hash 快取)", async () => {
    let calls = 0;
    const extractor = async (): Promise<IExtractedEmissionClaim[]> => {
      calls += 1;
      return [];
    };
    // Info: (20260826 - Emily) 快取鍵是回覆內容,用本測試獨有的字串避免跨測試污染
    const structured = {
      ...base,
      reply: "重放測試專用回覆:8332581.1 kgCO2e(quNiQuE)。",
    };
    await applyReplyGate(structured, facts, [], extractor);
    await applyReplyGate(structured, facts, [], extractor);
    expect(calls).toBe(1);
  });
});

describe("接線反向掃描:守門在真實呼叫端有沒有接上(掃源碼,不是掃行為)", () => {
  const CHAT_SERVICE = path.join(process.cwd(), "src/services/chat.service.ts");
  const CHAT_HOOK = path.join(process.cwd(), "src/hooks/use_carbon_chat.ts");

  it("chat.service:結構化與降級兩條回覆路都呼叫 applyReplyGate(≥2 處),且帶萃取器", () => {
    const source = fs.readFileSync(CHAT_SERVICE, "utf-8");
    const calls = source.match(/applyReplyGate\(/g) ?? [];
    expect(calls.length).toBeGreaterThanOrEqual(2);
    expect(source).toContain('from "@/lib/carbon_reply_gate"');
    expect(source).toContain("buildEmissionClaimExtractor");
  });

  it("chat.service:上崗判斷不得在 service 端重長回來(私有方法/行內空包跳過)", () => {
    const source = fs.readFileSync(CHAT_SERVICE, "utf-8");
    /**
     * Info: (20260826 - Emily) 這兩串是 review 用突變實測打穿的形狀:
     * 「private applyReplyGate」= 邏輯縮回測不到的地方;
     * 「ledgerFacts.length === 0」= 空包跳過(帳本空時守門下班)。
     * persona 的 ledgerFactBlock 用 length > 0 選文案是合法的,不在掃描面。
     */
    expect(source).not.toContain("private applyReplyGate");
    expect(source).not.toContain("ledgerFacts.length === 0");
  });

  it("hook:事實包無條件隨行(空包也送 [],不得條件式帶欄位)", () => {
    const source = fs.readFileSync(CHAT_HOOK, "utf-8");
    expect(source).toContain("buildLedgerFactBundle(");
    expect(source).toContain("ledgerFacts,");
    // Info: (20260826 - Emily) 舊形狀:...(ledgerFacts.length > 0 ? { ledgerFacts } : {})
    expect(source).not.toContain("ledgerFacts.length > 0");
  });

  it("route:守門後方的草稿生成(readyParagraphId 路徑)帶事實包且過同一把尺", () => {
    /**
     * Info: (20260826 - Emily) review 阻擋 3:對話回覆過了守門,但 readyParagraphId
     * 觸發的**另一次 LLM 呼叫**(generateParagraphDraft)寫出來的字直接進報告,
     * 原本既拿不到事實包、產物也不過守門 —— 守門後方一段沒有網的生成。
     */
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/v1/chat/carbon/route.ts"),
      "utf-8",
    );
    expect(source).toContain("contextFacts: ledgerFacts");
    expect(source).toContain("shouldRunReplyGate(ledgerFacts)");
    expect(source).toContain("auditReplyQuantities(");
  });
});
