import { describe, it, expect } from "@jest/globals";
import { auditFrameworkClaims } from "@/lib/utils/carbon_framework_claims";
import {
  FRAMEWORK_ALIGNMENT_PHRASE,
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
