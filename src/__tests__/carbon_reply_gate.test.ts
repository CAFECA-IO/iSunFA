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

describe("extractQuantityClaims(只抓帶排放單位的數字)", () => {
  it("抓得到:kgCO2e、公噸、噸、含千分位", () => {
    expect(
      extractQuantityClaims(
        "總量為 8,332,581.1 kgCO2e,約 8332.581 公噸;最大源 3470.34 噸。",
      ),
    ).toEqual(["8332581.1", "8332.581", "3470.34"]);
  });

  it("不抓:章節號、年份、標準號、步驟編號(沒有排放單位就不是排放量斷言)", () => {
    expect(
      extractQuantityClaims(
        "依 ISO 14064-1:2018,請見 3.8 節;2023 年為基準年,第 2 步共 3 筆。",
      ),
    ).toEqual([]);
  });
});

describe("auditReplyQuantities", () => {
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

// Info: (20260826 - Emily) 以下三組是「接線」測試(review 阻擋項:守門邏輯對,
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

  it("攔下:換攔截文案、原回覆消失、三個寫入訊號歸零、extraction/usage 原樣保留", () => {
    const result = applyReplyGate(fabricated, facts, []);
    expect(result.reply).toContain("無法溯源");
    expect(result.reply).toContain("9999");
    expect(result.reply).not.toContain("業界平均");
    expect(result.readyParagraphId).toBeNull();
    expect(result.revisionParagraphId).toBeNull();
    expect(result.chartRequest).toBeNull();
    expect(result.extraction).toBe(fabricated.extraction);
    expect(result.usage).toBe(fabricated.usage);
  });

  it("帳本空([])也照攔:突變回 length === 0 這條會先紅", () => {
    const result = applyReplyGate(fabricated, [], []);
    expect(result.reply).toContain("無法溯源");
    expect(result.readyParagraphId).toBeNull();
  });

  it("通過:回傳**同一參照**(沒攔就一個字都不許動)", () => {
    const clean = {
      reply: "帳本總排放量為 8332581.1 kgCO2e。",
      readyParagraphId: "ch3-8" as string | null,
      revisionParagraphId: null as string | null,
      chartRequest: null as object | null,
    };
    expect(applyReplyGate(clean, facts, [])).toBe(clean);
  });

  it("undefined(呼叫端沒帶)→ 同一參照,即使回覆帶編造數字", () => {
    expect(applyReplyGate(fabricated, undefined, [])).toBe(fabricated);
  });
});

describe("接線反向掃描:守門在真實呼叫端有沒有接上(掃源碼,不是掃行為)", () => {
  const CHAT_SERVICE = path.join(process.cwd(), "src/services/chat.service.ts");
  const CHAT_HOOK = path.join(process.cwd(), "src/hooks/use_carbon_chat.ts");

  it("chat.service:結構化與降級兩條回覆路都呼叫 applyReplyGate(≥2 處)", () => {
    const source = fs.readFileSync(CHAT_SERVICE, "utf-8");
    const calls = source.match(/applyReplyGate\(/g) ?? [];
    expect(calls.length).toBeGreaterThanOrEqual(2);
    expect(source).toContain('from "@/lib/carbon_reply_gate"');
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
});
