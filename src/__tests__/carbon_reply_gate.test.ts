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
  adjudicateQuantityClaims,
  shiftDecimalString,
  type IQuantityClaim,
} from "@/lib/carbon_reply_gate";
import type { IContextFact } from "@/interfaces/carbon_paragraph_draft";

// Info: (20260826 - Emily) 斷言形狀是 {value, unit}(round-4 阻擋-1:Y 也要帶單位);
// Info: (20260826 - Emily) 多數案例只關心抓到哪些數字,用這個投影保持測試可讀
const values = (text: string): string[] =>
  extractQuantityClaims(text).map((claim) => claim.value);

/**
 * Info: (20260827 - Emily) 形狀取自 carbon_ledger_query 的真實產出(§1.4):
 * value 是渲染字串(排放量 + 括號裡的換算量/占比),emissionsKg 是決定性標記的
 * 排放量本體 —— round-5 阻擋項的修法就在這個欄位上(見 IContextFact.emissionsKg)。
 * 表3.8 匯入分錄的 convertedQuantity 是**同一筆排放量的公噸寫法**(TONNE),
 * 所以「3470.3354 噸」合法 —— 但它靠的是 ×1000 換算命中 emissionsKg,不是字串等值。
 */
const facts: IContextFact[] = [
  {
    label: "全公司總排放量",
    value: "8332581.1 kgCO2e",
    source: "帳本總計欄",
    emissionsKg: ["8332581.1"],
  },
  {
    label: "排放量第 1 大:總公司 外購電力",
    value: "3470335.4 kgCO2e(3470.3354 TONNE)",
    source: "原文照錄 表3.8",
    emissionsKg: ["3470335.4"],
  },
];

describe("extractQuantityClaims(Y 地板:遮單位 → 雙向窗 → 非排放單位豁免)", () => {
  it("抓得到:kgCO2e、公噸、噸、含千分位(單位在後的基本形)", () => {
    expect(
      values("總量為 8,332,581.1 kgCO2e,約 8332.581 公噸;最大源 3470.34 噸。"),
    ).toEqual(["8332581.1", "8332.581", "3470.34"]);
  });

  it("不抓:章節號、年份、標準號、步驟編號(附近沒有排放單位)", () => {
    expect(
      values(
        "依 ISO 14064-1:2018,請見 3.8 節;2023 年為基準年,第 2 步共 3 筆。",
      ),
    ).toEqual([]);
  });

  /**
   * Info: (20260826 - Emily) review round-3 的 5 個 ESCAPES:單位在前的中文標準寫法
   * (「排放量(公噸 CO2e):X」是盤查報告最常見的欄位形),v1 只看數字後方整批漏接。
   */
  it("單位在前(round-3 ESCAPES)全數收進:括號欄位形/為字連接/單位前置宣告/以…計/跨行", () => {
    expect(values("貴公司排放量(公噸 CO2e):9999")).toEqual(["9999"]);
    expect(values("排放量(公噸CO2e)為 9999")).toEqual(["9999"]);
    expect(values("單位:公噸 CO2e,總量 9999")).toEqual(["9999"]);
    expect(values("以公噸 CO2e 計,全公司總量為 9999")).toEqual(["9999"]);
    expect(values("甲廠排放量:9999\n公噸 CO2e")).toEqual(["9999"]);
  });

  it("非排放單位豁免:數字自帶元/節/年/%/頁時,窗內有排放單位也不算斷言", () => {
    expect(values("費用 300 元,含 CO2e 查證")).toEqual([]);
    expect(values("第 3 節說明公噸 CO2e 的計算")).toEqual([]);
    expect(values("佔比 39.9%,以公噸 CO2e 計")).toEqual([]);
    expect(values("報告第 42 頁的公噸 CO2e 數據")).toEqual([]);
    // Info: (20260826 - Emily) 豁免只救自帶單位的那顆:同句真正的排放量照抓
    expect(values("2023 年為基準年,總量 9999 公噸 CO2e")).toEqual(["9999"]);
  });

  it("最近數字配對:數字與單位之間夾著別的數字時不誤殺(排名索引/清單編號)", () => {
    // Info: (20260826 - Emily) 沒有這條,「第 1 大(3470.3 公噸)」的 1 在 10 字窗內會被判成斷言
    expect(values("第 1 大(3470.3 公噸)")).toEqual(["3470.3"]);
  });

  it("單位裡的數字不是數字:CO2e 的 2 不會被抓成斷言", () => {
    expect(values("單位為公噸 CO2e。")).toEqual([]);
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

describe("collectAllowedNumbers(兩級集合:equality / emissionKg)", () => {
  it("宣告 emissionsKg 的事實:只有排放量進集合,渲染字串裡的換算量與占比出局", () => {
    const allowed = collectAllowedNumbers(facts, []);
    expect(allowed.equality.has("8332581.1")).toBe(true);
    expect(allowed.equality.has("3470335.4")).toBe(true);
    expect(allowed.emissionKg.has("8332581.1")).toBe(true);
    expect(allowed.emissionKg.has("3470335.4")).toBe(true);
    /**
     * Info: (20260827 - Emily) round-5:3470.3354 是渲染字串裡的公噸寫法,
     * 不再靠字串等值放行 —— 它由 ×1000 換算命中 3470335.4 才合法。
     * 同一條規則把活動數據(1000 立方公尺)與占比(60%)一併擋在集合外。
     */
    expect(allowed.equality.has("3470.3354")).toBe(false);
    /**
     * Info: (20260825 - Emily) source 裡的表號(表3.8)刻意不收:
     * 「表3.8」後面沒有排放單位,守門本來就不看它;
     * 收進集合只會讓「3.8 噸」這種編造多一條漏網路徑。
     */
    expect(allowed.equality.has("3.8")).toBe(false);
  });

  it("敘事型事實(沒宣告 emissionsKg)照舊全收其數字,但不進換算集合", () => {
    /**
     * Info: (20260827 - Emily) 待補說明與勾稽阻擋原因是**證據字串**,
     * 使用者要能原樣引用(「差額 700.0005(原文 901.465 vs 加總 201.4645)」);
     * 但它們沒有結構化的單位,參與換算沒有依據。
     */
    const narrative: IContextFact[] = [
      {
        label: "匯入表格被勾稽擋下:ch3-8",
        value: "總公司 差額 700.0005(原文 901.465 vs 加總 201.4645)",
        source: "匯入勾稽紀錄",
      },
    ];
    const allowed = collectAllowedNumbers(narrative, []);
    expect(allowed.equality.has("700.0005")).toBe(true);
    expect(allowed.equality.has("901.465")).toBe(true);
    expect(allowed.emissionKg.size).toBe(0);
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
        emissionsKg: ["4000000"],
      },
      {
        label: "匯入表格被勾稽擋下:ch3-8",
        value: "60 列無法解析",
        source: "s",
      },
    ];
    const allowed = collectAllowedNumbers(polluted, []);
    expect(allowed.equality.has("4000000")).toBe(true);
    expect(allowed.equality.has("60")).toBe(true);
    expect(allowed.equality.has("1")).toBe(false);
    expect(allowed.equality.has("2")).toBe(false);
    expect(allowed.equality.has("3")).toBe(false);
    expect(allowed.equality.has("8")).toBe(false);
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

describe("adjudicateQuantityClaims(Y/X 共用裁決:等值或決定性換算)", () => {
  const allowed = collectAllowedNumbers(facts, []);

  it("等值 → 過;不在集合 → 違規", () => {
    expect(
      adjudicateQuantityClaims(
        [{ value: "8,332,581.1", unit: "kgCO2e" }],
        allowed,
      ),
    ).toEqual([]);
    expect(
      adjudicateQuantityClaims([{ value: "9999", unit: "公噸 CO2e" }], allowed),
    ).toEqual(["9999"]);
  });

  it("同一事實的兩種正確寫法答案一致(round-3 指出 Y 做不到的那格):換算路徑要用「等值救不了」的數字驗", () => {
    // Info: (20260826 - Emily) 8332.5811 不在集合(集合只有 kg 值 8332581.1),公噸級 ×1000 對得上 → 合法
    expect(
      adjudicateQuantityClaims(
        [{ value: "8332.5811", unit: "公噸 CO2e" }],
        allowed,
      ),
    ).toEqual([]);
    // Info: (20260826 - Emily) 換算容差僅此一條:四捨五入仍然攔(×1000 後也對不上)
    expect(
      adjudicateQuantityClaims([{ value: "3470.34", unit: "公噸" }], allowed),
    ).toEqual(["3470.34"]);
  });

  /**
   * Info: (20260827 - Emily) round-5 阻擋項的對照實驗(reviewer 實測表,同一句只差事實包)。
   * 洞的形狀:合法集合收了整串 value 的每個數字(活動數據、占比),
   * 換算再把碰撞面乘一倍 —— 而活動數據常是整數,小整數正是估算的模型會吐的東西。
   */
  it("小整數排放量不因活動數據/占比而洗白(reviewer 的實測表全部 BLOCK)", () => {
    const withActivity = collectAllowedNumbers(
      [
        {
          label: "排放量第 1 大:甲廠 外購電力",
          value: "5000000 kgCO2e(1000 立方公尺,占全公司總量 60%)",
          source: "s",
          emissionsKg: ["5000000"],
        },
      ],
      [],
    );
    const judge = (value: string, unit: string): string[] =>
      adjudicateQuantityClaims([{ value, unit }], withActivity);
    // Info: (20260827 - Emily) ×1000 撞活動量 1000 / 2000 / 5000 / 60000 —— 全部不得放行
    expect(judge("1", "公噸")).toEqual(["1"]);
    expect(judge("2", "公噸")).toEqual(["2"]);
    expect(judge("5", "公噸")).toEqual(["5"]);
    expect(judge("60", "公噸")).toEqual(["60"]);
    // Info: (20260827 - Emily) 活動量與占比本身也不得以排放單位被引用(equality 一併收緊)
    expect(judge("1000", "公噸 CO2e")).toEqual(["1000"]);
    expect(judge("60", "kgCO2e")).toEqual(["60"]);
    // Info: (20260827 - Emily) 而真值的兩種正確寫法都過:kg 原值與公噸換算
    expect(judge("5000000", "kgCO2e")).toEqual([]);
    expect(judge("5000", "公噸 CO2e")).toEqual([]);
  });
});

// Info: (20260826 - Emily) 以下是「接線」測試(review 阻擋項:守門邏輯對,
// Info: (20260826 - Emily) 但沒有任何測試釘住它有沒有被呼叫、在什麼條件下被呼叫 ——
// Info: (20260826 - Emily) 把上崗條件突變成 length === 0 全部測試照綠)。

describe("round-4 阻擋-1:Y 帶單位 —— 公噸回答對上 kg 事實(X 換算原本執行不到的那格)", () => {
  // Info: (20260826 - Emily) reviewer 實跑的重現:查詢層每一筆排放量事實都是 kg 寫法,
  // Info: (20260826 - Emily) 而盤查報告與 persona 慣用公噸。Y 先攔短路,需要換算的數字
  // Info: (20260826 - Emily) 必然是 Y 的違規 —— X 的換算容差在真實條件下執行不到。
  const kgOnlyFacts: IContextFact[] = [
    {
      label: "全公司總排放量",
      value: "8332581 kgCO2e",
      source: "帳本總計欄",
      // Info: (20260827 - Emily) round-5:換算只認宣告的排放量(查詢層每筆都宣告)
      emissionsKg: ["8332581"],
    },
  ];

  it("Y 的斷言帶配對單位", () => {
    const claims = extractQuantityClaims("總量 8332.581 公噸 CO2e。");
    expect(claims).toHaveLength(1);
    expect(claims[0].value).toBe("8332.581");
    expect(claims[0].unit).toContain("公噸");
  });

  it("「8332.581 公噸」對 kg-only 事實包 → 過(reviewer 的重現案例)", () => {
    expect(
      auditReplyQuantities("全公司總排放量 8332.581 公噸。", kgOnlyFacts, [])
        .ok,
    ).toBe(true);
    expect(
      auditReplyQuantities(
        "全公司總排放量 8332.581 公噸 CO2e,來源:帳本總計欄。",
        kgOnlyFacts,
        [],
      ).ok,
    ).toBe(true);
  });

  it("換算容差不放過四捨五入:8332.58 公噸(×1000=8332580)仍攔", () => {
    const result = auditReplyQuantities("總量 8332.58 公噸。", kgOnlyFacts, []);
    expect(result.ok).toBe(false);
    expect(result.violations).toEqual(["8332.58"]);
  });

  /**
   * Info: (20260827 - Emily) round-5:換算只有「公噸級 ×1000 → kg」一個方向,
   * 因為 emissionsKg 依契約是 kg 級 —— 反向分支在真實資料裡永遠執行不到,
   * 留著就是 round-4 那個「機制寫出來但真實條件下不成立」再犯一次。
   * 這條把邊界釘住:沒有結構的敘事型事實不參與換算,公噸寫法照攔。
   */
  it("敘事型事實(無 emissionsKg)不參與換算:公噸寫法攔,原樣引用過", () => {
    const narrative: IContextFact[] = [
      {
        label: "匯入表格被勾稽擋下:ch3-8",
        value: "總公司 差額 700.0005(原文 901.465 vs 加總 201.4645)",
        source: "匯入勾稽紀錄",
      },
    ];
    expect(
      auditReplyQuantities("差額為 700.0005 公噸。", narrative, []).ok,
    ).toBe(true);
    expect(
      auditReplyQuantities("差額為 0.7000005 公噸。", narrative, []).violations,
    ).toEqual(["0.7000005"]);
  });
});

describe("round-4 中-1:全形數字摺疊(原本同時繞過 Y 與前置過濾)", () => {
  it("全形數字/小數點受守門,與半形同一結果", () => {
    expect(values("總排放量 ８３３２．５８１ 公噸")).toEqual(["8332.581"]);
    const result = auditReplyQuantities(
      "總排放量 ８３３２．５８１ 公噸。",
      facts,
      [],
    );
    // Info: (20260826 - Emily) 8332.581 不在事實包(帳本值是 8332581.1)→ 攔
    expect(result.ok).toBe(false);
    expect(result.violations).toEqual(["8332.581"]);
  });

  it("全形寫法引用合法值(含換算)→ 過;使用者說全形數字,覆述也過", () => {
    expect(
      auditReplyQuantities("總排放量 ８３３２５８１.1 kgCO2e。", facts, []).ok,
    ).toBe(true);
    expect(
      auditReplyQuantities("您提到 ５０００ 公噸,帳本查無此值。", facts, [
        "我們排 5000 公噸吧?",
      ]).ok,
    ).toBe(true);
  });
});

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
    const extractor = async (): Promise<IQuantityClaim[]> => [
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
    const extractor = async (): Promise<IQuantityClaim[]> => [
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
    const extractor = async (): Promise<IQuantityClaim[]> => {
      throw new Error("extractor down");
    };
    expect(await applyReplyGate(structured, facts, [], extractor)).toBe(
      structured,
    );
  });

  it("前置過濾:回覆不含數字就不呼叫 X(拒答句是多數,不花這筆錢)", async () => {
    let calls = 0;
    const extractor = async (): Promise<IQuantityClaim[]> => {
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
    const extractor = async (): Promise<IQuantityClaim[]> => {
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
    const extractor = async (): Promise<IQuantityClaim[]> => {
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

  /**
   * Info: (20260826 - Emily) round-4 高-1:TS 不信 X 的判斷,卻曾完全信它的轉錄。
   * 幻覺斷言與少抄一位都必須在裁決前被回覆內容檢查丟掉 ——
   * 且檢查是「數字 token 精確等值」不是子字串:「少抄一位」的 833258
   * 是 8332581 的子字串,includes 會誤命中,第二個症狀修不掉。
   */
  it("X 幻覺斷言(回覆裡沒有的數字)→ 丟掉,正確回覆同一參照放行", async () => {
    const structured = {
      ...base,
      reply: "帳本目前沒有這一項的數據,請先完成活動數據計算。共 1 筆待補。",
    };
    const extractor = async (): Promise<IQuantityClaim[]> => [
      { value: "9999", unit: "公噸" },
    ];
    expect(await applyReplyGate(structured, facts, [], extractor)).toBe(
      structured,
    );
  });

  it("X 少抄一位(833258 是 8332581 的子字串)→ 同樣丟掉,不誤攔", async () => {
    const structured = {
      ...base,
      reply: "帳本的全公司總排放量是 8332581.1 kgCO2e,溯源見上。",
    };
    const extractor = async (): Promise<IQuantityClaim[]> => [
      { value: "833258", unit: "kgCO2e" },
    ];
    expect(await applyReplyGate(structured, facts, [], extractor)).toBe(
      structured,
    );
  });

  it("回覆裡真的有的違規斷言不因內容檢查而漏:千分位寫法對得上 token", async () => {
    const structured = {
      ...base,
      // Info: (20260826 - Emily) 單位距離 >10 讓 Y 構不到,確保走的是 X 的內容檢查+裁決
      reply: "另據估算為 9,876,543,詳細單位標註於下方說明的公噸 CO2e 欄。",
    };
    expect(auditReplyQuantities(structured.reply, facts, []).ok).toBe(true);
    const extractor = async (): Promise<IQuantityClaim[]> => [
      { value: "9876543", unit: "公噸 CO2e" },
    ];
    const result = await applyReplyGate(structured, facts, [], extractor);
    expect(result.reply).toContain("無法溯源");
    expect(result.reply).toContain("9876543");
  });

  /**
   * Info: (20260826 - Emily) round-4 中-1 的中文數字半邊:Y 構不到,由 X 涵蓋 ——
   * 前置過濾認得連續中文數字,萃取的原樣字串走子字串內容檢查(非數值 token)。
   */
  it("中文數字量:前置過濾放 X 上崗,原樣斷言查無合法集合 → 攔", async () => {
    let calls = 0;
    const extractor = async (): Promise<IQuantityClaim[]> => {
      calls += 1;
      return [{ value: "八千三百", unit: "公噸" }];
    };
    const structured = { ...base, reply: "總排放量約八千三百公噸。" };
    const result = await applyReplyGate(structured, facts, [], extractor);
    expect(calls).toBe(1);
    expect(result.reply).toContain("無法溯源");
    expect(result.reply).toContain("八千三百");
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
