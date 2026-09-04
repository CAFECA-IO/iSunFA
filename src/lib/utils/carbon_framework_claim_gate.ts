/**
 * Info: (20260903 - Emily) 揭露框架宣告的**出口閘門**(#6688-B)。
 *
 * `auditFrameworkClaims` 是判準,本檔是**分流**:同一份稽核結果在不同出口
 * 該擋、該提示、還是該不評估。在此之前那支稽核函式有**零個非測試呼叫端** ——
 * 判準寫好了、四條都有測試,而紙面上一次都沒被問過。
 *
 * ## 為什麼分流要是一張帶 `basis` 的表,而不是幾個 if
 *
 * 「這一格為什麼是擋」必須有依據,否則下一個人只能靠猜(而猜的方向通常是加嚴,
 * 因為加嚴看起來比較安全)。表把 `basis` 設成必填欄位,
 * 再用一條測試釘住「凡 `BLOCK` 必有非空 `basis`」——
 * **忘記寫依據這個動作因此不存在**,而不是靠 review 記得問。
 *
 * ## 為什麼有 `NOT_EVALUATED` 而不是把那些格子從表裡省略
 *
 * 「這個出口看不到那個訊號」不等於「那個訊號為 false」。省略會讓
 * 「忘記接」與「刻意不評估」在表上長得一樣。所以四條 × 兩個出口 = 八格全部列出,
 * 由測試釘住完整性。
 *
 * ## 條 2 / 條 3 今天為什麼不評估(2026-09-03 實測)
 *
 * 兩條都依賴 `alignmentDeclared`,而那個訊號來自「紙上有沒有印架構對齊聲明」。
 * 實測:`carbon_framework_view.ts:66` 組出 `shellClaims: [對齊聲明, 免責句]`,
 * 而 `shellClaims` 的非測試消費端 **0 個**;那兩句的字面字串在 `src/` 與
 * `documents/` 只命中常數定義與測試。也就是**目前沒有任何地方印它們**,於是:
 *
 * - 條 3(印了對齊卻缺免責)恆假 —— 接上去是接死碼
 * - 條 2(沒宣告對齊卻出現 IFRS)對任何含 IFRS 字樣的文字恆真 ——
 *   當擋會擋掉每一份 IFRS 報告,當提示則是每份都叫,等於雜訊
 *
 * 兩格的 `basis` 因此寫明**翻回評估的觸發條件**,讓 #6688-C 做完的人
 * 知道要改什麼、改完為什麼算對。
 *
 * ## 為什麼本檔不產生給使用者看的文字
 *
 * 開發者要讀的理由寫在 `Info:` 註解裡,使用者要看的留痕走 i18n ——
 * 兩個讀者不共用一個字串。把它們合成一個,就是 PR #6725 低-1 的形狀
 *(事實值裡夾了一句指示)。所以本檔回傳結構,文案由呼叫端組。
 */

import {
  auditFrameworkClaims,
  type ICarbonFrameworkClaimAudit,
} from "@/lib/utils/carbon_framework_claims";
import { COMPLIANCE_CLAIM_PATTERNS } from "@/constants/carbon_report_framework";
import {
  CARBON_REPORT_IDENTITY_FIELDS,
  type ICarbonReportIdentity,
} from "@/lib/utils/carbon_report_identity";

/** Info: (20260903 - Emily) 會上紙的兩個出口 */
export enum CarbonFrameworkClaimExitEnum {
  /** Info: (20260903 - Emily) 段落落地:所有寫入最後匯流到報告草稿的保存 */
  DRAFT_SAVE = "DRAFT_SAVE",
  /** Info: (20260903 - Emily) PDF 匯出:不可逆,那份檔案會離開系統 */
  PDF_EXPORT = "PDF_EXPORT",
}

/** Info: (20260903 - Emily) 四條判準,鍵名對齊 `ICarbonFrameworkClaimAudit` 的欄位 */
export enum CarbonFrameworkClaimRuleEnum {
  UNALIGNED_FRAMEWORKS = "unalignedFrameworks",
  IFRS_WITHOUT_ALIGNMENT = "ifrsWithoutAlignment",
  ALIGNMENT_WITHOUT_DISCLAIMER = "alignmentWithoutDisclaimer",
  COMPLIANCE_CLAIMS = "complianceClaims",
}

export enum CarbonFrameworkClaimActionEnum {
  /** Info: (20260903 - Emily) 不落地/不出門 + 留痕 + 訊息指名違反哪一條 */
  BLOCK = "BLOCK",
  /** Info: (20260903 - Emily) 留痕但不阻斷 */
  WARN = "WARN",
  /** Info: (20260903 - Emily) 這個出口看不到這個訊號 —— 不是「訊號為 false」 */
  NOT_EVALUATED = "NOT_EVALUATED",
}

export interface ICarbonFrameworkClaimRouting {
  rule: CarbonFrameworkClaimRuleEnum;
  exit: CarbonFrameworkClaimExitEnum;
  action: CarbonFrameworkClaimActionEnum;
  /**
   * Info: (20260903 - Emily) 這一格為什麼是這個動作。**必填**,由測試釘住非空。
   * `NOT_EVALUATED` 的 `basis` 要寫「翻回評估的觸發條件」,不只寫「看不到」。
   */
  basis: string;
}

const {
  UNALIGNED_FRAMEWORKS,
  IFRS_WITHOUT_ALIGNMENT,
  ALIGNMENT_WITHOUT_DISCLAIMER,
  COMPLIANCE_CLAIMS,
} = CarbonFrameworkClaimRuleEnum;
const { DRAFT_SAVE, PDF_EXPORT } = CarbonFrameworkClaimExitEnum;
const { BLOCK, WARN, NOT_EVALUATED } = CarbonFrameworkClaimActionEnum;

export const CARBON_FRAMEWORK_CLAIM_ROUTING: ReadonlyArray<ICarbonFrameworkClaimRouting> =
  [
    {
      rule: COMPLIANCE_CLAIMS,
      exit: DRAFT_SAVE,
      action: BLOCK,
      basis:
        "條 4 無 when 子句:主體合規宣告永遠禁止上紙(見 constants 檔頭的兩軸說明)。" +
        "#6688-B 的驗收條款就是這一格 —— 手動塞「本公司符合 IFRS S1」必須擋下。",
    },
    {
      rule: COMPLIANCE_CLAIMS,
      exit: PDF_EXPORT,
      action: BLOCK,
      basis: "同上,而且 PDF 是不可逆的出口:那份檔案會離開系統,之後改不掉。",
    },
    {
      rule: UNALIGNED_FRAMEWORKS,
      exit: DRAFT_SAVE,
      action: WARN,
      basis:
        "條 1 雖無 when 子句,但與條 2 同一個「這句是誰寫的」風險:" +
        "匯入路徑會把客戶原文逐字落地成段落,而客戶自己的報告可能提到 TCFD/SASB/GRI/CDP。" +
        "條 2 的洞已被作者量過(IFRS 在客戶原文與三份產出皆 0 次),條 1 這四個字串**沒有量**。" +
        "量完之前不接成擋 —— 接成擋就欠一個做不完的收窄工作。",
    },
    {
      rule: UNALIGNED_FRAMEWORKS,
      exit: PDF_EXPORT,
      action: WARN,
      basis:
        "同上。翻成 BLOCK 的觸發條件:量出 TCFD/SASB/GRI/CDP 在真實匯入語料的出現次數," +
        "或把判準收窄到「系統印的區塊」(而不是整份紙面)。",
    },
    {
      rule: IFRS_WITHOUT_ALIGNMENT,
      exit: DRAFT_SAVE,
      action: NOT_EVALUATED,
      basis:
        "本條依賴 alignmentDeclared,而 2026-09-03 實測:對齊聲明**零印出點**" +
        "(shellClaims 零非測試消費端,兩句字面字串在 src/ 與 documents/ 只有常數與測試)。" +
        "於是本條對任何含 IFRS 字樣的文字恆真 —— 而匯入的原文照錄正好會含。" +
        "翻回評估的觸發條件:#6688-C 讓伺服端印出 shellClaims,且閘門審的文字含那個區塊。",
    },
    {
      rule: IFRS_WITHOUT_ALIGNMENT,
      exit: PDF_EXPORT,
      action: NOT_EVALUATED,
      basis: "同 DRAFT_SAVE 那格:訊號不存在,不是訊號為 false。觸發條件同上。",
    },
    {
      rule: ALIGNMENT_WITHOUT_DISCLAIMER,
      exit: DRAFT_SAVE,
      action: NOT_EVALUATED,
      basis:
        "同樣依賴 alignmentDeclared,而它今天恆為 false,所以本條恆假 —— 接上去是接死碼。" +
        "翻回評估的觸發條件與條 2 相同;此外主守衛應是「shellClaims 兩行原子印出」的測試," +
        "而那要等印出點存在才寫得出來。",
    },
    {
      rule: ALIGNMENT_WITHOUT_DISCLAIMER,
      exit: PDF_EXPORT,
      action: NOT_EVALUATED,
      basis:
        "同 DRAFT_SAVE 那格恆假的理由。" +
        "翻回評估的觸發條件:印出點落地之後這一格應改為 BLOCK —— " +
        "不得讓「印了對齊聲明卻缺免責句」的 PDF 出門(那是紙面上不可逆的一半承諾)。",
    },
  ];

/**
 * Info: (20260903 - Emily) 「什麼上紙就審什麼」——組出要送進判準的那份文字。
 *
 * 不能只審 markdown。`identity` 的 value 是使用者自由輸入、經文件外殼的
 * `.doc-identity` **直接上紙、完全不經 markdown**;驗收條款寫的「手動塞」
 * 沒有說塞在哪,塞在識別欄位就會穿過一個只看 markdown 的閘門。
 *
 * 審**輸入**而不是組好的 HTML:標籤會把片語切開(`本公司<span>符合</span>IFRS`),
 * 而判準是字面比對 —— 這條產品線已經因為換行切開片語誤判三次。
 */
export interface ICarbonPaperTextParts {
  markdown: string;
  title?: string;
  identity?: ReadonlyArray<{ label: string; value: string }>;
  /**
   * Info: (20260903 - Emily) 每一頁頁尾印的那行報告名稱。
   *
   * 與 `title`(封面的 doc-title)是**兩個槽**,不是同一個值:實測
   * `carbon_report_pdf.service.ts` 頁尾印的是 `input.title ?? input.fileName`,
   * 也就是省略 title 時**下載檔名**會被印到每一頁頁尾。呼叫端要帶進來的是
   * 「實際會印的那個值(含 fallback)」,不是把封面標題帶第二次。
   */
  footer?: string;
  /**
   * Info: (20260903 - Emily) 文件外殼的聲明行。今天恆空(見檔頭),
   * #6688-C 把印出點做出來之後由伺服端從常數組出來填進這裡。
   */
  shellClaims?: ReadonlyArray<string>;
}

/**
 * Info: (20260903 - Emily) 槽與槽之間用**句界**分隔,不是換行。
 *
 * 第一版用 `\n` join,而 `auditFrameworkClaims` 收原始文字後自己壓
 * `squeezeForMatch` —— 那支把 `\s+` 全部刪掉(含換行)。於是換行在判準眼裡
 * 根本不存在,相鄰兩槽會**熔成一句**。實測(2026-09-03):markdown 結尾
 * 「本報告已通過第三方查證」接上標題「IFRS S1/S2 揭露報告」,壓過之後命中
 * `通過第三方查證IFRS` —— 兩個各自乾淨的槽合成一句合規宣告,
 * 一份沒有問題的報告因此印不出來(而使用者在紙上找不到那句話)。
 *
 * 這與 `carbon_report_framework.ts` 檔頭記的冒號事故是同一個洞的同一種形狀:
 * 那次是跨句排除類漏了一個字元,這次是分隔字元被壓掉。修法因此相同 ——
 * 用排除類裡**不是空白**的字元當界。`。` 同時滿足兩條(不受 NFKC 影響、在排除類內),
 * 後面的 `\n` 只為了讓人讀 paperText 時仍看得出分行。
 */
const PAPER_SLOT_SEPARATOR = "。\n";

export const composeCarbonPaperText = (parts: ICarbonPaperTextParts): string =>
  [
    parts.markdown,
    parts.title ?? "",
    parts.footer ?? "",
    /*
     * Info: (20260903 - Emily) label 與 value 也各自成槽:那兩個字串在紙上是
     * dt/dd 兩個元素,片語跨不過去。合成一行(`label value`)之後空白會被壓掉,
     * 於是它們也會熔 —— 與上面 PAPER_SLOT_SEPARATOR 記的同一回事。
     */
    ...(parts.identity ?? []).flatMap((row) => [row.label, row.value]),
    ...(parts.shellClaims ?? []),
  ]
    .filter((line) => line.length > 0)
    .join(PAPER_SLOT_SEPARATOR);

/**
 * Info: (20260904 - Emily) 存檔出口的那一份紙面文字(#6688-B 後半)。
 *
 * 存在的理由是**讓判斷離開 hook**:接線可以用掃描守,但「哪幾格算紙面」是判準,
 * 而 hook 沒有辦法用行為測試逼它(本專案 testEnvironment 是 node,沒有 jsdom)。
 * 抽成純函式之後,四個槽的取法各有一條測試。
 *
 * `rawMarkdown` 優先於逐段串接:它是全文的權威來源(見 `IReportData` 的註解),
 * 使用者所見即所存。**沒有它才**退回段落串接 —— 反過來取會審到一份與存下去的
 * 不同的文字(舊草稿沒有 rawMarkdown,新草稿有,兩者都要能審)。
 *
 * 識別欄位只送 value 不送 label:label 是我們自己的 i18n 標籤,不可能含使用者的宣告,
 * 而把那四個標籤搬進這一層會變成第二份文案來源(它們住在預覽元件、由 `t` 取)。
 * PDF 那端的 label 是用戶端實際印在紙上的字串,所以那端連 label 一起審 ——
 * 兩端審的都是「那個出口真的會印/會存的東西」,不是同一組欄位。
 */
export const composeReportDraftPaperText = (draft: {
  readonly rawMarkdown?: string;
  readonly paragraphs?: ReadonlyArray<{ readonly content: string }>;
  readonly reportName?: string;
  readonly identity?: ICarbonReportIdentity;
}): string =>
  composeCarbonPaperText({
    markdown:
      draft.rawMarkdown ??
      (draft.paragraphs ?? [])
        .map((paragraph) => paragraph.content)
        .join(PAPER_SLOT_SEPARATOR),
    title: draft.reportName,
    identity: CARBON_REPORT_IDENTITY_FIELDS.map((field) => ({
      label: "",
      value: draft.identity?.[field] ?? "",
    })),
  });

export interface ICarbonFrameworkClaimFinding {
  rule: CarbonFrameworkClaimRuleEnum;
  /** Info: (20260903 - Emily) 命中的原文片段(依紙面順序,全部命中不只第一筆) */
  matches: ReadonlyArray<string>;
  /**
   * Info: (20260903 - Emily) 條 4 的兩軸:動詞軸與名稱軸(驗收條款要求指名)。
   *
   * 不改 `auditFrameworkClaims` 的介面就拿得到:`COMPLIANCE_CLAIM_PATTERNS`
   * 的那條 regex 本來就有兩個捕獲群(動詞、框架名稱),而稽核函式回傳的是
   * `match[0]`。這裡拿它回傳的片段、用**同一份匯出的 pattern** 再抽一次群 ——
   * 來源仍然只有一份,不是第二套判準。
   */
  axes?: ReadonlyArray<{ verb: string; name: string; matched: string }>;
}

const extractAxes = (
  matches: ReadonlyArray<string>,
): ICarbonFrameworkClaimFinding["axes"] =>
  matches.flatMap((matched) =>
    COMPLIANCE_CLAIM_PATTERNS.flatMap((pattern) => {
      const hit = pattern.exec(matched);
      return hit && hit[1] && hit[2]
        ? [{ verb: hit[1], name: hit[2], matched }]
        : [];
    }),
  );

export interface ICarbonFrameworkClaimGateResult {
  blocked: ReadonlyArray<ICarbonFrameworkClaimFinding>;
  warned: ReadonlyArray<ICarbonFrameworkClaimFinding>;
  audit: ICarbonFrameworkClaimAudit;
}

/**
 * Info: (20260903 - Emily) 一個出口問一次:這份紙面文字在這個出口該擋什麼、提示什麼。
 *
 * 回傳結構不回傳文案(理由見檔頭):`blocked` 非空即代表這個出口要拒絕,
 * 呼叫端負責留痕與 i18n 訊息。
 */
export const gateFrameworkClaims = (
  paperText: string,
  exit: CarbonFrameworkClaimExitEnum,
): ICarbonFrameworkClaimGateResult => {
  const audit = auditFrameworkClaims(paperText);
  const blocked: ICarbonFrameworkClaimFinding[] = [];
  const warned: ICarbonFrameworkClaimFinding[] = [];

  CARBON_FRAMEWORK_CLAIM_ROUTING.filter((cell) => cell.exit === exit).forEach(
    (cell) => {
      if (cell.action === NOT_EVALUATED) return;
      const matches = audit[cell.rule];
      if (matches.length === 0) return;
      const finding: ICarbonFrameworkClaimFinding = {
        rule: cell.rule,
        matches,
        ...(cell.rule === COMPLIANCE_CLAIMS
          ? { axes: extractAxes(matches) }
          : {}),
      };
      if (cell.action === BLOCK) blocked.push(finding);
      else warned.push(finding);
    },
  );

  return { blocked, warned, audit };
};
