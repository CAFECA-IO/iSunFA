// Info: (20260908 - Emily) 段落知不知道自己過期 —— 帳本指紋與過期裁決(#6786)
//
// Info: (20260908 - Emily) 職責邊界:本模組**只裁決新舊**,不生成文字、不改帳本、不動守門。
// Info: (20260908 - Emily) 「要不要重寫」是使用者的決定(重寫花點數、且會覆蓋手改過的字);
// Info: (20260908 - Emily) 這裡只負責讓那個決定有依據。

import {
  extractQuantityClaims,
  collectAllowedNumbers,
  adjudicateQuantityClaims,
  isTonneScaleUnit,
} from "@/lib/carbon_reply_gate";
import type {
  IReportParagraph,
  IParagraphFactImprint,
  IParagraphLedgerFingerprint,
} from "@/types/carbon_chatbot.types";
import type { IContextFact } from "@/interfaces/carbon_paragraph_draft";

/**
 * Info: (20260908 - Emily) 一節相對於帳本的新舊。三態而不是布林 —— 理由是第三個。
 *
 * - `FRESH`:有指紋,而且它依據的數字到現在都還是帳本主張的
 * - `STALE`:有指紋,而且它依據的某個數字帳本不再主張了
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
 * Info: (20260909 - Emily) 「這段文字是依據哪一份事實寫的」—— 在**請求送出時**拍下(#6789 review 中-1)。
 *
 * 指紋不能在回應落地時才拿當下的事實包蓋。`/draft` 請求送出到草稿回來之間是 LLM 生成的
 * 秒到分鐘,而「匯入 → 自動草稿」這種長流程裡帳本正好會在這個窗內改變(`use_carbon_chat`
 * 07-22 那段註解寫的就是這個流程)。落地時蓋當下的帳本,會發生:文字引用的是舊值 F₀、
 * 指紋記的戳記卻是新帳本 T₁ → `assessParagraphFreshness` 走 FRESH 短路;
 * 而舊值對不上新事實包 → 不被記為依據 → 之後怎麼變都不會 STALE。
 * **一節引用舊數字的段落被永久標成最新,比沒有標示更糟 —— 使用者會信它。**
 *
 * 所以請求送出時就把事實包與帳本戳記拍下來,跟著請求一起走,落地時用它蓋。
 * 若落地時帳本已變、且依據的數字變了,那一節**立刻**是 STALE —— 那是真相。
 */
export interface ILedgerFactSnapshot {
  facts: IContextFact[];
  ledgerComputedAt: string | undefined;
}

/**
 * Info: (20260909 - Emily) 一節指紋裡主張數的上界。實務上一節敘述十幾個;給到 400 是為了**不截斷**
 * (截斷 = 少認依賴 = 該過期的節不標,靜默漏報),同時擋住把整張表塞進敘述的異常輸入。
 * 與 zod schema 同源(schema 引這個常數)。
 */
export const PARAGRAPH_FINGERPRINT_MAX_CLAIMS = 400;

/**
 * Info: (20260909 - Emily) 單位只存兩種尺度。`extractQuantityClaims` 給的是窗內配對到的原文串接
 * (「公噸 CO2e」、「kgCO2e kgCO2e」),裁決只看它是不是公噸級;存原文會讓同一個主張長出多個變體。
 */
export const TONNE_UNIT = "公噸";
export const KG_UNIT = "kg";
const canonicalUnit = (unit: string): string =>
  isTonneScaleUnit(unit) ? TONNE_UNIT : KG_UNIT;

const claimId = (claim: IParagraphFactImprint): string =>
  `${claim.value} ${claim.unit}`;

/**
 * Info: (20260909 - Emily) 這一節的敘述裡,哪些排放量主張**當初是帳本說的**(#6786 review 阻-1 的修法)。
 *
 * 借**既有的**出口守門三件套:`extractQuantityClaims` 抽主張(數字要與排放單位相鄰,所以
 * `2024 年`、`第 3 章` 不算),`collectAllowedNumbers` 組合法集合,`adjudicateQuantityClaims`
 * 判每一個主張通不通過。通過的就是這一節對帳本的依據 —— 不通過的(原文照錄的既有報告數字、
 * 尚未勾稽的敘述)不是依據,不進指紋。
 *
 * 不記「哪筆事實」:事實的 label 是人話會改(review 中-2),value 夾著排名與占比會隨整本帳本變
 * (review 阻-1)。記主張本身,裁決時重新過守門,兩個問題一起消失。
 * kg↔公噸換算跟著守門一起借到:報告寫 `227.8986 公噸`、帳本存 `227898.6 kg` 是同一個依據。
 */
export const collectSatisfiedClaims = (
  content: string,
  ledgerFacts: ReadonlyArray<IContextFact>,
): IParagraphFactImprint[] => {
  const claims = extractQuantityClaims(content);
  if (claims.length === 0) return [];
  const allowed = collectAllowedNumbers([...ledgerFacts], []);
  const seen = new Set<string>();
  const satisfied: IParagraphFactImprint[] = [];
  claims.forEach((claim) => {
    const imprint = { value: claim.value, unit: canonicalUnit(claim.unit) };
    if (seen.has(claimId(imprint))) return;
    if (adjudicateQuantityClaims([claim], allowed).length > 0) return;
    seen.add(claimId(imprint));
    satisfied.push(imprint);
  });
  return satisfied.slice(0, PARAGRAPH_FINGERPRINT_MAX_CLAIMS);
};

/**
 * Info: (20260908 - Emily) 生成/更新一節時打上指紋。
 *
 * 沒有帳本戳記(帳本還沒載入、或這個會話還沒有帳本)→ 回 `undefined`:
 * 打一個沒有戳記的指紋等於偽造一個比對基準,之後每一次比對都會說「變了」。
 *
 * 一個帳本數字都沒引用的節(前言、方法論說明)→ 指紋的 `claims` 是**空陣列**,
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
    claims: collectSatisfiedClaims(input.content, input.ledgerFacts),
  };
};

/**
 * Info: (20260909 - Emily) 用**請求時拍下的**快照蓋指紋(中-1 的落地形式)。
 * 沒有快照(歷史回填、這張票之前的路徑)→ 不打指紋 → 那一節是「不知道」,
 * 而不是拿當下帳本偽造一個「最新」。
 */
export const fingerprintFromSnapshot = (
  content: string,
  snapshot: ILedgerFactSnapshot | undefined,
): IParagraphLedgerFingerprint | undefined =>
  snapshot
    ? buildParagraphFingerprint({
        content,
        ledgerFacts: snapshot.facts,
        ledgerComputedAt: snapshot.ledgerComputedAt,
      })
    : undefined;

/**
 * Info: (20260908 - Emily) 一節過期了沒有 —— 兩個條件都要成立。
 *
 * 1. 帳本戳記變了,**而且**
 * 2. 這一節當初通過守門的某個主張,對現在的事實包**不再通過**
 *
 * 第二條是這張票的重點。少了它,任何一次重算(改了別的廠址、補了一筆與這節無關的活動數據)
 * 都會把 33 節全部標成過期 —— 而 33 節全紅的畫面,使用者第二次看到就會直接忽略它,
 * 於是真正該重寫的那一節也跟著被忽略。**假警報比沒有標示更糟**。
 *
 * Info: (20260909 - Emily) 第二條的實作是**重新過一次守門**,不是比對事實字串(review 阻-1):
 * 替另一個廠補資料 → 總量變、占比變、排名重排,但這一節引用的 1000 kgCO2e 還在帳本裡 →
 * 主張仍通過 → FRESH。這一節引用的總量從 227898.6 變成 300000 → 主張不再通過 → STALE。
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
  if (fingerprint.claims.length === 0) return ParagraphFreshnessEnum.FRESH;
  const allowed = collectAllowedNumbers([...ledgerFacts], []);
  const broken = adjudicateQuantityClaims(fingerprint.claims, allowed);
  return broken.length > 0
    ? ParagraphFreshnessEnum.STALE
    : ParagraphFreshnessEnum.FRESH;
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
