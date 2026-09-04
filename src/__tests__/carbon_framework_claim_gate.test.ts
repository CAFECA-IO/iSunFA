import fs from "fs";
import path from "path";
import { describe, it, expect } from "@jest/globals";
import {
  CARBON_FRAMEWORK_CLAIM_ROUTING,
  CarbonFrameworkClaimActionEnum,
  CarbonFrameworkClaimExitEnum,
  CarbonFrameworkClaimRuleEnum,
  composeCarbonPaperText,
  composeReportDraftPaperText,
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

  it("頁尾那行也在內 —— 它每一頁都印,而它的值可能是下載檔名", () => {
    /**
     * Info: (20260903 - Emily) `carbon_report_pdf.service.ts` 的頁尾印的是
     * `input.title ?? input.fileName`,與封面標題是兩個槽。省略標題時被印到
     * 每一頁的是**檔名** —— 一個從沒人審過、而且使用者可以自己命名的字串。
     */
    const paperText = composeCarbonPaperText({
      markdown: "1.1 組織邊界",
      footer: "本公司符合 IFRS S1 之查證報告",
    });
    expect(gateFrameworkClaims(paperText, PDF_EXPORT).blocked).toHaveLength(1);
  });

  it("空欄位不會製造空行(判準是字面比對,雜訊會讓失敗訊息難讀)", () => {
    expect(composeCarbonPaperText({ markdown: "只有正文" })).toBe("只有正文");
  });
});

describe("槽界:相鄰兩槽不得熔成一句", () => {
  /**
   * Info: (20260903 - Emily) 反向驗過:把 `PAPER_SLOT_SEPARATOR` 改回 `"\n"`
   * 這兩條就紅(第一條擋了一份乾淨的報告,第二條的原因見下)。
   *
   * `auditFrameworkClaims` 收原始文字後自己壓 `squeezeForMatch`,而那支把
   * `\s+` 全部刪掉 —— 換行在判準眼裡不存在,於是換行當分隔等於沒有分隔。
   */
  it("正文結尾的動詞接上標題開頭的框架名稱,不是一句合規宣告", () => {
    const paperText = composeCarbonPaperText({
      markdown: "3.2 查證\n\n本報告已通過第三方查證",
      title: "IFRS S1/S2 揭露報告",
    });
    const { blocked, audit } = gateFrameworkClaims(paperText, PDF_EXPORT);
    /*
     * Info: (20260903 - Emily) 先釘住判準本身:條 4 一筆都不該命中。
     * 只斷言 blocked 為空會被「條 4 沒接上出口」這種壞法蒙過去。
     */
    expect(audit.complianceClaims).toEqual([]);
    expect(blocked).toEqual([]);
  });

  it("識別欄位的 label 與 value 之間也是槽界(紙上是 dt/dd 兩個元素)", () => {
    const paperText = composeCarbonPaperText({
      markdown: "1.1 組織邊界",
      identity: [{ label: "查證結論已通過", value: "IFRS 對照表見附錄" }],
    });
    expect(
      gateFrameworkClaims(paperText, PDF_EXPORT).audit.complianceClaims,
    ).toEqual([]);
  });

  it("同一個槽裡的宣告仍然抓得到(槽界不是把判準關掉)", () => {
    /**
     * Info: (20260903 - Emily) 這一條是上面兩條的配對:分隔字元換成句界之後,
     * 「宣告被切開所以抓不到」與「宣告不存在」在測試上會長得一樣 ——
     * 所以要有一條證明判準還活著,而且活在**同一個 compose 出來的字串**上。
     */
    const paperText = composeCarbonPaperText({
      markdown: "3.2 查證\n\n本公司已通過 IFRS S1 之要求",
      title: "高興昌鋼鐵股份有限公司",
    });
    expect(gateFrameworkClaims(paperText, PDF_EXPORT).blocked).toHaveLength(1);
  });
});

describe("存檔出口:那一份紙面文字怎麼組(#6688-B 後半)", () => {
  /**
   * Info: (20260904 - Emily) 判準抽出 hook 才逼得出行為測試。
   * 本專案 testEnvironment 是 node、沒有 jsdom,hook 只能用掃描守接線;
   * 而「哪幾格算紙面」是判準,判準要有行為測試 —— 所以它住在純函式裡。
   */
  it("rawMarkdown 優先於逐段串接(它是全文的權威來源)", () => {
    const text = composeReportDraftPaperText({
      rawMarkdown: "使用者改過的全文",
      paragraphs: [{ content: "舊的逐段內容" }],
    });
    expect(text).toContain("使用者改過的全文");
    expect(text).not.toContain("舊的逐段內容");
  });

  it("沒有 rawMarkdown 才退回逐段串接(舊草稿也要能審)", () => {
    const { blocked } = gateFrameworkClaims(
      composeReportDraftPaperText({
        paragraphs: [
          { content: "1.1 組織邊界" },
          { content: "本公司符合 IFRS S1 之各項規定。" },
        ],
      }),
      DRAFT_SAVE,
    );
    expect(blocked).toHaveLength(1);
  });

  it("段落之間是句界,不是換行 —— 否則相鄰兩段會熔成一句", () => {
    /**
     * Info: (20260904 - Emily) 與 PAPER_SLOT_SEPARATOR 同一件事:
     * `squeezeForMatch` 把換行刪掉,所以段落串接若用 `\n`,
     * 前一段結尾的動詞會接上下一段開頭的框架名稱。
     */
    const { audit } = gateFrameworkClaims(
      composeReportDraftPaperText({
        paragraphs: [
          { content: "3.2 查證\n\n本報告已通過第三方查證" },
          { content: "IFRS S1/S2 對照表見附錄" },
        ],
      }),
      DRAFT_SAVE,
    );
    expect(audit.complianceClaims).toEqual([]);
  });

  it("報告名稱與識別欄位的值都在審的範圍內", () => {
    expect(
      gateFrameworkClaims(
        composeReportDraftPaperText({
          rawMarkdown: "1.1 組織邊界",
          reportName: "本公司遵循 TIFRS S2 之揭露報告",
        }),
        DRAFT_SAVE,
      ).blocked,
    ).toHaveLength(1);
    expect(
      gateFrameworkClaims(
        composeReportDraftPaperText({
          rawMarkdown: "1.1 組織邊界",
          identity: { verifiedBy: "本公司已達成 IFRS S1 要求" },
        }),
        DRAFT_SAVE,
      ).blocked,
    ).toHaveLength(1);
  });

  it("識別欄位只送 value,不送我們自己的 i18n 標籤", () => {
    /**
     * Info: (20260904 - Emily) 標籤住在預覽元件、由 `t` 取。把那四個字搬進這一層
     * 會變成第二份文案來源 —— 而它們不可能含使用者的宣告,審它換不到東西。
     */
    const text = composeReportDraftPaperText({
      rawMarkdown: "1.1 組織邊界",
      identity: { preparedBy: "溫室氣體盤查小組" },
    });
    expect(text).toContain("溫室氣體盤查小組");
    expect(text).not.toContain("製作單位");
  });

  it("乾淨的草稿不被擋(否則「擋掉一切」也會讓上面幾條綠)", () => {
    expect(
      gateFrameworkClaims(
        composeReportDraftPaperText({
          rawMarkdown:
            "1.1 組織邊界\n\n本公司採用營運控制法。\n本報告依 IFRS S1/S2 之架構編製。\n本報告不構成 IFRS S1/S2 之合規聲明。",
          reportName: "高興昌鋼鐵股份有限公司 2024 年度溫室氣體報告",
          identity: { inventoryYear: "2024", preparedBy: "永續發展部" },
        }),
        DRAFT_SAVE,
      ).blocked,
    ).toEqual([]);
  });
});

describe("存檔出口的接線(掃描 —— hook 沒有 jsdom,行為由上一組純函式守)", () => {
  const hook = fs.readFileSync(
    path.join(process.cwd(), "src/hooks/use_carbon_chat.ts"),
    "utf-8",
  );

  it("守門接在 flushReportDraftSave 的入口,而且在送出之前", () => {
    /**
     * Info: (20260904 - Emily) `flushReportDraftSave` 是所有段落寫入
     *(AI 草稿、修訂、匯入、手動編輯)匯流成一次 PUT 的地方。
     * 接在它入口 = 一個判斷蓋住全部路徑;接在任何一個呼叫端 = 漏掉其他的。
     */
    const guard = hook.indexOf(
      "if (blockedByFrameworkClaim(channel, sessionId)) return;",
    );
    const enqueue = hook.indexOf("savingChannelsRef.current.add(channel);");
    expect(guard).toBeGreaterThan(-1);
    expect(enqueue).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(enqueue);
  });

  it("用的是 DRAFT_SAVE 出口(不是把 PDF 那格的分流套過來)", () => {
    expect(hook).toContain("CarbonFrameworkClaimExitEnum.DRAFT_SAVE");
    expect(hook).not.toContain("CarbonFrameworkClaimExitEnum.PDF_EXPORT");
  });

  it("本地備份**不**被擋 —— 它在守門之前就寫了", () => {
    /**
     * Info: (20260904 - Emily) 這是三個設計決定裡唯一有破壞性風險的那一個。
     * 自動保存的 effect 在進入任何雲端 guard 之前就 `saveLocalDraftBackup`,
     * 所以被擋之後那一版仍在本機、重載讀得回來 —— 代價是「沒上雲」不是「消失」。
     * 把備份也擋掉才是唯一真正毀東西的選項,而本機快取不是紙面。
     */
    const backup = hook.indexOf("const backedUp = saveLocalDraftBackup(");
    const guardDefinition = hook.indexOf(
      "const blockedByFrameworkClaim = useCallback(",
    );
    expect(backup).toBeGreaterThan(-1);
    expect(guardDefinition).toBeGreaterThan(-1);
    expect(
      hook.slice(guardDefinition, hook.indexOf("const flushReportDraftSave")),
    ).not.toContain("saveLocalDraftBackup");
  });

  it('被擋時沿用既有的 saveStatus "local",不新增狀態', () => {
    /**
     * Info: (20260904 - Emily) `"local"` 的語意就是「僅暫存本機、未上雲」,
     * 而那正是被擋之後的真實狀態。新增一種狀態會讓工具列多一種要解釋的顏色,
     * 而它要說的事既有的那個已經說了。原因走 draftNotice(#6624 立的分工)。
     */
    const guard = hook.slice(
      hook.indexOf("const blockedByFrameworkClaim = useCallback("),
      hook.indexOf("const flushReportDraftSave"),
    );
    expect(guard).toContain('setSaveStatus("local")');
    expect(guard).toContain("carbon_chatbot.save_blocked_framework_claim");
    const statuses = /"saving" \| "saved" \| "error" \| "local" \| null/.test(
      hook,
    );
    expect(statuses).toBe(true);
  });
});
