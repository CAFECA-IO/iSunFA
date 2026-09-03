import { describe, it, expect } from "@jest/globals";
import {
  CARBON_FRAMEWORK_CLAIM_ROUTING,
  CarbonFrameworkClaimActionEnum,
  CarbonFrameworkClaimExitEnum,
  CarbonFrameworkClaimRuleEnum,
  composeCarbonPaperText,
  gateFrameworkClaims,
} from "@/lib/utils/carbon_framework_claim_gate";
import { auditFrameworkClaims } from "@/lib/utils/carbon_framework_claims";

/**
 * Info: (20260903 - Emily) 出口閘門的分流(#6688-B)。
 *
 * 判準本身由 `carbon_framework_claims.test.ts` 守;本檔守的是**分流**:
 * 同一份稽核結果在哪個出口該擋、該提示、該不評估,以及「擋」有沒有依據。
 */

const { DRAFT_SAVE, PDF_EXPORT } = CarbonFrameworkClaimExitEnum;
const { BLOCK, NOT_EVALUATED } = CarbonFrameworkClaimActionEnum;

describe("分流表:八格全列,凡擋必有依據", () => {
  it("四條 × 兩個出口 = 八格,每格恰好一次", () => {
    /**
     * Info: (20260903 - Emily) 省略一格會讓「忘記接」與「刻意不評估」長得一樣。
     * 所以完整性本身要有測試,而不是靠讀表的人數。
     */
    const rules = Object.values(CarbonFrameworkClaimRuleEnum);
    const exits = Object.values(CarbonFrameworkClaimExitEnum);
    expect(CARBON_FRAMEWORK_CLAIM_ROUTING).toHaveLength(
      rules.length * exits.length,
    );
    rules.forEach((rule) =>
      exits.forEach((exit) => {
        const cells = CARBON_FRAMEWORK_CLAIM_ROUTING.filter(
          (cell) => cell.rule === rule && cell.exit === exit,
        );
        expect(cells).toHaveLength(1);
      }),
    );
  });

  it("**凡 BLOCK 必有非空 basis**(這條是這張表存在的理由)", () => {
    CARBON_FRAMEWORK_CLAIM_ROUTING.filter(
      (cell) => cell.action === BLOCK,
    ).forEach((cell) => {
      expect(cell.basis.trim().length).toBeGreaterThan(0);
    });
    // Info: (20260903 - Emily) 且至少要有一格是 BLOCK,否則上面那條在空集合上恆真
    expect(
      CARBON_FRAMEWORK_CLAIM_ROUTING.some((cell) => cell.action === BLOCK),
    ).toBe(true);
  });

  it("每一格都有 basis(WARN 與 NOT_EVALUATED 也要說得出理由)", () => {
    CARBON_FRAMEWORK_CLAIM_ROUTING.forEach((cell) => {
      expect(cell.basis.trim().length).toBeGreaterThan(0);
    });
  });

  it("NOT_EVALUATED 的 basis 要寫「翻回評估的觸發條件」,不只寫看不到", () => {
    /**
     * Info: (20260903 - Emily) #6688-C 做完之後翻那兩格的人,要能從 basis 知道
     * 要改什麼、改完為什麼算對。只寫「看不到那個訊號」的話,下一個人只能重新調查一次。
     */
    CARBON_FRAMEWORK_CLAIM_ROUTING.filter(
      (cell) => cell.action === NOT_EVALUATED,
    ).forEach((cell) => {
      expect(cell.basis).toContain("觸發條件");
    });
  });
});

describe("驗收條款:手動塞主體合規宣告,兩個出口都擋,且指名兩軸", () => {
  const paper = "1.1 組織邊界\n\n本公司符合 IFRS S1 之各項要求。";

  it("存檔出口:擋下", () => {
    const result = gateFrameworkClaims(paper, DRAFT_SAVE);
    expect(result.blocked).toHaveLength(1);
    expect(result.blocked[0].rule).toBe(
      CarbonFrameworkClaimRuleEnum.COMPLIANCE_CLAIMS,
    );
  });

  it("PDF 出口:擋下", () => {
    expect(gateFrameworkClaims(paper, PDF_EXPORT).blocked).toHaveLength(1);
  });

  it("指名動詞軸與名稱軸(驗收條款要求)", () => {
    /**
     * Info: (20260903 - Emily) 兩軸不必改稽核函式的介面就拿得到:
     * `COMPLIANCE_CLAIM_PATTERNS` 那條 regex 本來就有兩個捕獲群,
     * 而稽核回傳的是 match[0]。這裡從那個片段再抽群,pattern 仍是同一份。
     */
    const axes = gateFrameworkClaims(paper, PDF_EXPORT).blocked[0].axes;
    expect(axes).toBeDefined();
    expect(axes?.[0].verb).toBe("符合");
    expect(axes?.[0].name).toBe("IFRS");
  });

  it("乾淨的紙面不擋也不提示", () => {
    const clean = gateFrameworkClaims(
      "1.1 組織邊界\n\n本公司採用營運控制法界定組織邊界。",
      PDF_EXPORT,
    );
    expect(clean.blocked).toHaveLength(0);
    expect(clean.warned).toHaveLength(0);
  });

  it("否定句不誤報(判準自己的界,這裡只確認閘門沒把它翻過來)", () => {
    const negated = gateFrameworkClaims("本公司尚不符合 IFRS S1。", PDF_EXPORT);
    expect(negated.blocked).toHaveLength(0);
  });
});

describe("條 1:提示而不擋(量完之前)", () => {
  const paper = "1.1 組織邊界\n\n本報告參考 TCFD 之四大支柱編排。";

  it("兩個出口都是 WARN,不是 BLOCK", () => {
    [DRAFT_SAVE, PDF_EXPORT].forEach((exit) => {
      const result = gateFrameworkClaims(paper, exit);
      expect(result.blocked).toHaveLength(0);
      expect(result.warned).toHaveLength(1);
      expect(result.warned[0].rule).toBe(
        CarbonFrameworkClaimRuleEnum.UNALIGNED_FRAMEWORKS,
      );
    });
  });
});

describe("條 2 / 條 3:不評估 —— 而稽核函式仍然會報它們", () => {
  /**
   * Info: (20260903 - Emily) 這一組是「不評估」與「訊號為 false」的差別本身。
   * 稽核函式對這份文字**確實**回報條 2 命中(因為對齊聲明沒印),
   * 而閘門在兩個出口都不把它變成 blocked/warned。
   * 若哪天有人把那兩格從 NOT_EVALUATED 改成 WARN 而沒有先做印出點,
   * 這裡會紅 —— 那正是要攔的。
   */
  const paper = "3.1 揭露架構\n\n本節依 IFRS S2 之氣候相關揭露編排。";

  it("稽核函式回報條 2 命中(前提成立,否則下面兩條是空轉)", () => {
    expect(auditFrameworkClaims(paper).ifrsWithoutAlignment).toEqual(["IFRS"]);
    expect(auditFrameworkClaims(paper).alignmentDeclared).toBe(false);
  });

  it("閘門在兩個出口都不評估它", () => {
    [DRAFT_SAVE, PDF_EXPORT].forEach((exit) => {
      const result = gateFrameworkClaims(paper, exit);
      const rules = [...result.blocked, ...result.warned].map(
        (finding) => finding.rule,
      );
      expect(rules).not.toContain(
        CarbonFrameworkClaimRuleEnum.IFRS_WITHOUT_ALIGNMENT,
      );
      expect(rules).not.toContain(
        CarbonFrameworkClaimRuleEnum.ALIGNMENT_WITHOUT_DISCLAIMER,
      );
    });
  });
});

describe("什麼上紙就審什麼:識別欄位的自由輸入也在內", () => {
  it("塞在識別欄位的合規宣告會被審到(只審 markdown 會漏掉)", () => {
    /**
     * Info: (20260903 - Emily) `identity` 的 value 是使用者自由輸入,
     * 經文件外殼的 `.doc-identity` **直接上紙、完全不經 markdown**。
     * 驗收條款寫的「手動塞」沒有說塞在哪,所以只審 markdown 的閘門會被繞過。
     */
    const paperText = composeCarbonPaperText({
      markdown: "1.1 組織邊界\n\n本公司採用營運控制法。",
      /**
       * Info: (20260903 - Emily) 標題 fixture 刻意不含「盤查報告書」這個片語:
       * `carbon_report_outline.test.ts` 的掃描判準是「指名這份報告的檔案不得宣告 IFRS」,
       * 而本檔必須提到 IFRS(它驗的就是那條判準)。這個測試要的只是
       * 「標題也會上紙、也要被審」,片語本身不承重 —— 所以改 fixture,不進 ALLOWLIST。
       */
      title: "高興昌鋼鐵股份有限公司",
      identity: [
        { label: "製作單位", value: "溫室氣體盤查小組" },
        { label: "備註", value: "本公司符合 IFRS S1" },
      ],
    });
    expect(gateFrameworkClaims(paperText, PDF_EXPORT).blocked).toHaveLength(1);
  });

  it("外殼聲明行的位置留著,#6688-C 填進來就會被審到", () => {
    /**
     * Info: (20260903 - Emily) 今天 `shellClaims` 恆空(零印出點)。
     * 這一條釘住「填進來會進 paperText」這件事,
     * 否則 C 做完之後閘門仍然看不到那個區塊,而條 2/3 那兩格就翻不回來。
     */
    const paperText = composeCarbonPaperText({
      markdown: "1.1 組織邊界",
      shellClaims: ["本公司符合 IFRS S1"],
    });
    expect(paperText).toContain("本公司符合 IFRS S1");
    expect(gateFrameworkClaims(paperText, PDF_EXPORT).blocked).toHaveLength(1);
  });

  it("空欄位不會製造空行(判準是字面比對,雜訊會讓失敗訊息難讀)", () => {
    expect(composeCarbonPaperText({ markdown: "只有正文" })).toBe("只有正文");
  });
});
