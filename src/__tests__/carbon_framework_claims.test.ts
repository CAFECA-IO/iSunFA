import { describe, it, expect } from "@jest/globals";
import { auditFrameworkClaims } from "@/lib/utils/carbon_framework_claims";
import {
  FRAMEWORK_ALIGNMENT_PHRASE,
  COMPLIANCE_CLAIM_PATTERNS,
  FRAMEWORK_DISCLAIMER_PHRASE,
} from "@/constants/carbon_report_framework";

/**
 * Info: (20260821 - Emily) 判準從「全域禁止揭露框架」改成「依成品自己的宣告分流」。
 *
 * 這支測試存在的理由：現有的三份產出都**沒有**印過架構對齊聲明，也就是說
 * 四條判準裡有兩條從來沒有走過 true 分支 —— 拿真實產出跑只證明「今天不會誤報」，
 * 不證明「該叫的時候會叫」。所以每一條都用合成輸入逼紅一次。
 */
describe("auditFrameworkClaims", () => {
  const PAPER_TODAY =
    "第一章 報告基本資訊\n本報告依 ISO 14064-1 編製，查證依 ISO 14064-3。";

  it("今天的產出形狀（沒有任何揭露框架字樣）四條全過", () => {
    const audit = auditFrameworkClaims(PAPER_TODAY);

    expect(audit.alignmentDeclared).toBe(false);
    expect(audit.disclaimerPresent).toBe(false);
    expect(audit.unalignedFrameworks).toEqual([]);
    expect(audit.ifrsWithoutAlignment).toEqual([]);
    expect(audit.alignmentWithoutDisclaimer).toEqual([]);
    expect(audit.complianceClaims).toEqual([]);
  });

  it("條 2：出現 IFRS 但沒宣告架構對齊 → 紅", () => {
    const audit = auditFrameworkClaims(
      `${PAPER_TODAY}\n本節參考 IFRS S2 的氣候相關揭露要求。`,
    );

    expect(audit.ifrsWithoutAlignment).toEqual(["IFRS"]);
  });

  it("條 3：宣告架構對齊但沒印免責句 → 紅，且條 2 不重複報", () => {
    const audit = auditFrameworkClaims(
      `${PAPER_TODAY}\n${FRAMEWORK_ALIGNMENT_PHRASE}。`,
    );

    expect(audit.alignmentDeclared).toBe(true);
    expect(audit.alignmentWithoutDisclaimer).toEqual(["缺少免責句"]);
    expect(audit.ifrsWithoutAlignment).toEqual([]);
  });

  /**
   * Info: (20260821 - Emily) 這一條是**放行**那條路 —— 整個改動的目的就是讓它綠。
   * 它紅掉代表 IFRS 架構的報告根本出不去。
   */
  it("對齊聲明 + 免責句 → 四條全過（IFRS 得以合法出現在紙上）", () => {
    const audit = auditFrameworkClaims(
      `${PAPER_TODAY}\n${FRAMEWORK_ALIGNMENT_PHRASE}。${FRAMEWORK_DISCLAIMER_PHRASE}。`,
    );

    expect(audit.alignmentDeclared).toBe(true);
    expect(audit.disclaimerPresent).toBe(true);
    expect(audit.ifrsWithoutAlignment).toEqual([]);
    expect(audit.alignmentWithoutDisclaimer).toEqual([]);
    expect(audit.complianceClaims).toEqual([]);
  });

  it("條 4：即使聲明與免責句都在，主體合規宣告仍然紅", () => {
    const audit = auditFrameworkClaims(
      `${FRAMEWORK_ALIGNMENT_PHRASE}。${FRAMEWORK_DISCLAIMER_PHRASE}。本公司符合 IFRS S1 之要求。`,
    );

    expect(audit.complianceClaims).toEqual(["符合IFRS"]);
  });

  /**
   * Info: (20260821 - Emily) 否定式不得誤判。壓過空白之後「不符合IFRS」含「符合IFRS」，
   * 字串清單版會把一句意思相反的話報成合規宣告。
   */
  it("否定式（尚不符合 / 未符合）不算合規宣告", () => {
    ["本報告尚不符合 IFRS S1", "本公司未符合 IFRS S2"].forEach((sentence) => {
      expect(auditFrameworkClaims(sentence).complianceClaims).toEqual([]);
    });
  });

  /**
   * Info: (20260821 - Emily) 我們自己的免責句不能觸發我們自己的判準 ——
   * 那會讓「照規定印免責句」變成一個違規。
   */
  it("免責句本身不會被判成合規宣告", () => {
    expect(
      auditFrameworkClaims(FRAMEWORK_DISCLAIMER_PHRASE).complianceClaims,
    ).toEqual([]);
  });

  /**
   * Info: (20260824 - Luphia) 多句合規宣告要**全部**回報，依紙面順序（PR review）。
   *
   * 原本是非 global regex 配 `String.match`，只給第一筆 —— 閘門仍然會紅，
   * 但這個陣列是 UAT 印給人看的修正清單，少報會讓人「改一句、重跑驗收、
   * 才發現下一句」。三句就要跑三輪，而每一輪都要重新產或重讀 PDF。
   */
  it("條 4 回報全部命中,依紙面順序", () => {
    const audit = auditFrameworkClaims(
      "本公司遵循 IFRS S2 辦理。另本公司符合 IFRS S1 之要求。",
    );

    expect(audit.complianceClaims).toEqual(["遵循IFRS", "符合IFRS"]);
  });

  /**
   * Info: (20260824 - Luphia) 同一句話出現兩次是**兩個**要改的地方，不去重。
   * 去重會把「紙上有幾處」這個數字抹掉，而那正是這個陣列要回答的問題。
   */
  it("同一種說法出現兩次回報兩筆", () => {
    const audit = auditFrameworkClaims(
      "第一章:本公司符合 IFRS S1。第五章:本公司符合 IFRS S1。",
    );

    expect(audit.complianceClaims).toEqual(["符合IFRS", "符合IFRS"]);
  });

  /**
   * Info: (20260824 - Luphia) 共用的 pattern **不得帶 `g`**。
   *
   * `carbon_report_outline.test.ts` 拿同一份 `COMPLIANCE_CLAIM_PATTERNS`
   * 對 33 節 guidance 逐節 `pattern.test(...)`。帶 `g` 的 regex 在 `test`
   * 命中時會推進 `lastIndex`，於是**下一節從上次停的位置開始找** ——
   * 症狀是隔一節漏一節，而那個掃描仍然是綠的。
   *
   * 這個洞今天量不出來：33 節 guidance 目前全都乾淨，`test` 一次也沒命中，
   * `lastIndex` 因此一直是 0。它會在**第一次真的有人寫出合規動詞**時現形 ——
   * 也就是那個掃描唯一該叫的那一刻。
   *
   * 所以直接釘不變式本身，而不是靠一個「連續呼叫兩次答案相同」的行為測試：
   * 後者對 `matchAll`、對 `String.match`、對帶不帶 `g` 全都是綠的
   * （實測過），等於一條看起來在守、實際上什麼都沒守的測試。
   *
   * 條 4 自己要的 global 由 `allComplianceClaims` 每次現場複製一份，
   * 狀態不跨呼叫也不回寫共用常數。
   */
  it("共用的合規宣告 pattern 不得帶 g 旗標", () => {
    expect(
      COMPLIANCE_CLAIM_PATTERNS.filter((pattern) =>
        pattern.flags.includes("g"),
      ),
    ).toEqual([]);
  });

  it("條 4 不重複報：一句合規宣告只回一條", () => {
    const audit = auditFrameworkClaims("本公司符合 IFRS S1 與 IFRS S2。");

    expect(audit.complianceClaims).toHaveLength(1);
  });

  it("條 1：沒有對齊的框架任何情況都紅", () => {
    const audit = auditFrameworkClaims(
      `${FRAMEWORK_ALIGNMENT_PHRASE}。${FRAMEWORK_DISCLAIMER_PHRASE}。本報告同時依 TCFD 與 GRI 編製。`,
    );

    expect(audit.unalignedFrameworks).toEqual(["TCFD", "GRI"]);
  });

  /**
   * Info: (20260821 - Emily) 正規化在函式裡面做。PDF 文字層會在任意位置換行，
   * 而本產品線已經因為「字面比對輸給換行」誤判三次（表號、繪製上限、議定書）。
   */
  it("片語被換行切開仍然偵測得到", () => {
    const wrapped =
      "本報告依 IFRS S1/S2\n之架構編製。本報告不構成 IFRS\nS1/S2 之合規聲明。";
    const audit = auditFrameworkClaims(wrapped);

    expect(audit.alignmentDeclared).toBe(true);
    expect(audit.disclaimerPresent).toBe(true);
  });

  // Info: (20260821 - Emily) NFKC:全角字母在 PDF 文字層是真的會出現的
  it("全角字母正規化之後仍然偵測得到", () => {
    expect(
      auditFrameworkClaims("本公司符合 ＩＦＲＳ Ｓ１ 之要求。")
        .complianceClaims,
    ).toHaveLength(1);
  });
});

/**
 * Info: (20260821 - Emily) PR review 第二輪:條 4 的界是**動詞軸 × 名稱軸**。
 * 第一版只收四種動詞、只認 IFRS 一個名稱 —— 七種繞過全過,其中「依據」
 * 正是揭露版 guidance 自己用過的動詞(ch1-5,已改「參照」)。
 */
describe("條 4 的兩軸界(review 第二輪的七個繞過)", () => {
  const BYPASSES = [
    "本報告依據 IFRS S2 規定編製組織邊界",
    "本公司依照 IFRS S2 規定辦理",
    "本報告按照 IFRS S1 之要求編製",
    "本公司遵照 IFRS S2 準則揭露",
    "本公司符合 TIFRS S1",
    "本公司符合國際財務報導準則 S1",
    "已達成 IFRS S1 要求",
  ];

  BYPASSES.forEach((sentence) => {
    it(`繞過被抓到:${sentence}`, () => {
      expect(
        auditFrameworkClaims(sentence).complianceClaims.length,
      ).toBeGreaterThan(0);
    });
  });

  /**
   * Info: (20260821 - Emily) 釘住 review 指出的掩護結構:「TIFRS」與「動詞不緊鄰」
   * 今天之所以安全,是被條 2(沒宣告對齊就不准出現 IFRS)蓋住的;而條 2 在印了
   * 對齊聲明後**關閉** —— #54 上線那一刻掩護消失。這條測試模擬那一刻:
   * 對齊聲明 + 免責句都在(條 2 關閉),條 4 必須**自己**抓到。
   */
  it("印了對齊聲明之後(條 2 關閉),TIFRS 的合規宣告由條 4 自己抓到", () => {
    const audit = auditFrameworkClaims(
      `${FRAMEWORK_ALIGNMENT_PHRASE}。${FRAMEWORK_DISCLAIMER_PHRASE}。本公司符合 TIFRS S1。`,
    );

    expect(audit.ifrsWithoutAlignment).toEqual([]);
    expect(audit.complianceClaims).toHaveLength(1);
  });

  /**
   * Info: (20260821 - Emily) 跨子句不誤報 —— 而且**兩種逗號都要測**:
   * squeezeForMatch 的 NFKC 會把全形逗號正規化成半形,排除類只排全形的話,
   * 壓過的文字上每一個逗號都攔不住(review 給的排除類就有這個洞,已修)。
   */
  it("動詞與 IFRS 隔著子句時不誤報(全形與半形逗號)", () => {
    [
      "通過第三方查證,並依 IFRS 架構揭露",
      "通過第三方查證，並依 IFRS 架構揭露",
    ].forEach((sentence) => {
      expect(auditFrameworkClaims(sentence).complianceClaims).toEqual([]);
    });
  });

  /**
   * Info: (20260824 - Luphia) 冒號也是子句邊界 —— 兩種寬度都測（PR review）。
   *
   * 上面那條守住了逗號，而排除類原本沒有冒號：NFKC 把 `：` 正規化成 `:`，
   * 兩種都攔不住。冒號在報告裡比逗號更常出現（「查證結論：」這類標籤位置），
   * 所以它是這個洞裡最容易踩到的那一半。
   */
  it("動詞與 IFRS 隔著冒號時不誤報(全形與半形冒號)", () => {
    [
      "通過第三方查證:本報告依 IFRS S1/S2 之架構編製",
      "通過第三方查證：本報告依 IFRS S1/S2 之架構編製",
    ].forEach((sentence) => {
      expect(auditFrameworkClaims(sentence).complianceClaims).toEqual([]);
    });
  });

  /**
   * Info: (20260824 - Luphia) #54 上線後外殼要印的那張封面必須是綠的。
   *
   * 這是本條判準最重要的一個形狀：允許的〔對齊聲明 + 免責句〕**加上**
   * 一行報告本來就有的查證聲明。三句各自合法，而 `squeezeForMatch`
   * 連換行一起壓掉 —— 相鄰兩行變成一個連續字串，於是「通過…:…IFRS」
   * 跨了兩句被條 4 命中，一份完全合規的報告過不了驗收。
   *
   * 條 2 與條 3 在這裡都必須是滿足的（有對齊聲明、也有免責句），
   * 一起斷言才說得完整：紅的只會是條 4，而那正是要修掉的那一條。
   */
  it("允許的封面組合加上查證聲明時,四條判準全綠", () => {
    const cover = [
      "本報告已通過第三方查證：",
      `${FRAMEWORK_ALIGNMENT_PHRASE}。`,
      `${FRAMEWORK_DISCLAIMER_PHRASE}。`,
    ].join("\n");
    const audit = auditFrameworkClaims(cover);

    expect(audit.alignmentDeclared).toBe(true);
    expect(audit.disclaimerPresent).toBe(true);
    expect(audit.unalignedFrameworks).toEqual([]);
    expect(audit.ifrsWithoutAlignment).toEqual([]);
    expect(audit.alignmentWithoutDisclaimer).toEqual([]);
    expect(audit.complianceClaims).toEqual([]);
  });

  it("新動詞的否定式不誤報", () => {
    ["本公司未遵照 IFRS S2 辦理", "本報告尚未依據 IFRS S2 編製"].forEach(
      (sentence) => {
        expect(auditFrameworkClaims(sentence).complianceClaims).toEqual([]);
      },
    );
  });

  // Info: (20260821 - Emily) ch1-5 改動詞後的正常輸出必須綠 —— 這是改動詞的目的
  it("「參照 IFRS S2 所定之方法」是方法論引用,不誤報", () => {
    expect(
      auditFrameworkClaims("本公司之組織邊界參照 IFRS S2 所定之方法對齊")
        .complianceClaims,
    ).toEqual([]);
  });
});
