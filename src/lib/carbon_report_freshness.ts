// Info: (20260908 - Emily) 段落知不知道自己過期 —— 帳本指紋與過期裁決(#6786)
//
// Info: (20260908 - Emily) 職責邊界:本模組**只裁決新舊**,不生成文字、不改帳本、不動守門。
// Info: (20260908 - Emily) 「要不要重寫」是使用者的決定(重寫花點數、且會覆蓋手改過的字);
// Info: (20260908 - Emily) 這裡只負責讓那個決定有依據。

import {
  extractQuantityClaims,
  collectAllowedNumbers,
  adjudicateQuantityClaims,
} from "@/lib/carbon_reply_gate";
import { LEDGER_FACT_BUNDLE_MAX } from "@/lib/carbon_ledger_query";
import type {
  IReportParagraph,
  IParagraphFactImprint,
  IParagraphLedgerFingerprint,
} from "@/types/carbon_chatbot.types";
import type { IContextFact } from "@/interfaces/carbon_paragraph_draft";

/**
 * Info: (20260908 - Emily) 一節相對於帳本的新舊。三態而不是布林 —— 理由是第三個。
 *
 * - `FRESH`:有指紋,而且它依據的值到現在都沒變
 * - `STALE`:有指紋,而且它依據的某個值變了(或那筆事實不見了)
 * - `UNKNOWN`:**沒有指紋**(這張票之前生成的段落),或帳本此刻讀不到
 *
 * 為什麼一定要 `UNKNOWN`:把「不知道」併進 `FRESH` 等於對使用者宣稱這一節是最新的,
 * 而我們並不知道;併進 `STALE` 則會讓所有舊報告一打開就滿江紅,而那等於沒有標示。
 * 「不知道」與「最新」要在畫面上分得開。
 */
export enum ParagraphFreshnessEnum {
  UNKNOWN = "UNKNOWN",
  FRESH = "FRESH",
  STALE = "STALE",
}

/**
 * Info: (20260908 - Emily) 指紋筆數的上界 = 事實包本身的上界。
 *
 * 指紋是事實包的**子集**,所以這不是另外猜的一個數字,而是由構造保證不會超過的那個數字
 * (有測試釘住)。刻意不另設更小的上限:更小的上限會需要截斷,而截斷後的指紋
 * 會少認一個依賴 → 該過期的節不標過期,是**靜默的漏報**。
 */
export const PARAGRAPH_FINGERPRINT_MAX_FACTS = LEDGER_FACT_BUNDLE_MAX;

/**
 * Info: (20260908 - Emily) 這一節引用了哪些帳本事實。
 *
 * 判定借**既有的**出口守門三件套:`extractQuantityClaims` 抽這一節的排放量主張,
 * 再對每一筆事實單獨組合法集合問「這個主張能不能由這一筆事實支持」。
 * 不自己寫第二套比對 —— 那會讓「守門認可的引用」與「指紋認定的引用」分岔。
 *
 * 借它還附帶兩個正確性:
 * 1. **kg↔公噸換算**:報告紙上印 `227.8986 公噸`、帳本存 `227898.6 kg`,是同一個值。
 *    自己寫字串比對會把這個最常見的情形判成「沒引用」,於是那一節永遠不會標過期。
 * 2. **只認排放量主張**:`extractQuantityClaims` 要求數字與排放單位相鄰(≤10 字),
 *    所以 `2024 年`、`第 3 章`、`共 12 筆` 這些數字不會被當成引用 ——
 *    否則一節裡隨便一個 `1` 就會把它綁上一堆與它無關的事實(過度歸因 → 假過期)。
 */
export const collectQuotedFacts = (
  content: string,
  ledgerFacts: ReadonlyArray<IContextFact>,
): IParagraphFactImprint[] => {
  const claims = extractQuantityClaims(content);
  if (claims.length === 0) return [];
  const seen = new Set<string>();
  const quoted: IParagraphFactImprint[] = [];
  ledgerFacts.forEach((fact) => {
    if (seen.has(fact.label)) return;
    const allowed = collectAllowedNumbers([fact], []);
    if (allowed.equality.size === 0 && allowed.emissionKg.size === 0) return;
    const isQuoted = claims.some(
      (claim) => adjudicateQuantityClaims([claim], allowed).length === 0,
    );
    if (!isQuoted) return;
    seen.add(fact.label);
    quoted.push({ label: fact.label, value: fact.value });
  });
  return quoted;
};

/**
 * Info: (20260908 - Emily) 生成/更新一節時打上指紋。
 *
 * 沒有帳本戳記(帳本還沒載入、或這個會話還沒有帳本)→ 回 `undefined`:
 * 打一個沒有戳記的指紋等於偽造一個比對基準,之後每一次比對都會說「變了」。
 *
 * 引用不到任何事實的節(前言、方法論說明)→ 指紋的 `facts` 是**空陣列**,
 * 而那是有意義的:它不依賴帳本任何值,所以它永遠不會過期。
 * 空陣列與 `undefined`(沒有指紋)是兩件事。
 */
export const buildParagraphFingerprint = (input: {
  content: string;
  ledgerFacts: ReadonlyArray<IContextFact>;
  ledgerComputedAt: string | undefined;
}): IParagraphLedgerFingerprint | undefined => {
  if (!input.ledgerComputedAt) return undefined;
  return {
    ledgerComputedAt: input.ledgerComputedAt,
    facts: collectQuotedFacts(input.content, input.ledgerFacts),
  };
};

/**
 * Info: (20260908 - Emily) 一節過期了沒有 —— 兩個條件都要成立。
 *
 * 1. 帳本戳記變了,**而且**
 * 2. 這一節引用到的某個值也變了(或那筆事實不見了)
 *
 * 第二條是這張票的重點。少了它,任何一次重算(改了別的廠址、補了一筆與這節無關的活動數據)
 * 都會把 33 節全部標成過期 —— 而 33 節全紅的畫面,使用者第二次看到就會直接忽略它,
 * 於是真正該重寫的那一節也跟著被忽略。**假警報比沒有標示更糟**。
 *
 * 帳本此刻讀不到(`ledgerComputedAt` 為 undefined)一律回 `UNKNOWN`:
 * 「還在載入」與「帳本被清空」在這一層分不開,而把載入中判成過期會讓報告一打開就閃一次滿江紅。
 */
export const assessParagraphFreshness = (input: {
  fingerprint: IParagraphLedgerFingerprint | undefined;
  ledgerFacts: ReadonlyArray<IContextFact>;
  ledgerComputedAt: string | undefined;
}): ParagraphFreshnessEnum => {
  const { fingerprint, ledgerFacts, ledgerComputedAt } = input;
  if (!fingerprint) return ParagraphFreshnessEnum.UNKNOWN;
  if (!ledgerComputedAt) return ParagraphFreshnessEnum.UNKNOWN;
  if (fingerprint.ledgerComputedAt === ledgerComputedAt) {
    return ParagraphFreshnessEnum.FRESH;
  }
  const current = new Map(
    ledgerFacts.map((fact) => [fact.label, fact.value] as const),
  );
  const changed = fingerprint.facts.some(
    (imprint) => current.get(imprint.label) !== imprint.value,
  );
  return changed ? ParagraphFreshnessEnum.STALE : ParagraphFreshnessEnum.FRESH;
};

/** Info: (20260908 - Emily) 工具列要顯示的那個數字,以及點開之後列出哪幾節 */
export interface IReportFreshnessSummary {
  staleCount: number;
  /** Info: (20260908 - Emily) 過期節的 `code`(3.2 這種),照報告順序 */
  staleCodes: string[];
  staleParagraphIds: string[];
  unknownCount: number;
  freshCount: number;
}

/**
 * Info: (20260908 - Emily) 整份報告的新舊盤點。
 *
 * **空內容的節不計入任何一項**:大綱骨架裡還沒寫的節不是「過期」也不是「最新」,
 * 它只是還沒寫 —— 那件事由既有的完成度進度(`IReportProgressStats`)負責說。
 */
export const summarizeReportFreshness = (input: {
  paragraphs: ReadonlyArray<IReportParagraph> | undefined;
  ledgerFacts: ReadonlyArray<IContextFact>;
  ledgerComputedAt: string | undefined;
}): IReportFreshnessSummary => {
  const summary: IReportFreshnessSummary = {
    staleCount: 0,
    staleCodes: [],
    staleParagraphIds: [],
    unknownCount: 0,
    freshCount: 0,
  };
  (input.paragraphs ?? []).forEach((paragraph) => {
    if (paragraph.content.trim().length === 0) return;
    const state = assessParagraphFreshness({
      fingerprint: paragraph.ledgerFingerprint,
      ledgerFacts: input.ledgerFacts,
      ledgerComputedAt: input.ledgerComputedAt,
    });
    if (state === ParagraphFreshnessEnum.STALE) {
      summary.staleCount += 1;
      summary.staleCodes.push(paragraph.code);
      summary.staleParagraphIds.push(paragraph.id);
      return;
    }
    if (state === ParagraphFreshnessEnum.UNKNOWN) {
      summary.unknownCount += 1;
      return;
    }
    summary.freshCount += 1;
  });
  return summary;
};
