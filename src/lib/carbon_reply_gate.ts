// Info: (20260825 - Emily) 回覆出口守門(#6707 第三層):
// Info: (20260825 - Emily) LLM 回覆裡「帶排放單位的數字」必須屬於合法集合,否則整則攔下。
//
// Info: (20260825 - Emily) persona 已經把「清單之外不得有數字」說死(第二層),
// Info: (20260825 - Emily) 但指令不是保證 —— 委員名單捏造(#6708)就是模型無視「照錄」約束的實證。
// Info: (20260825 - Emily) 守門是機器判,不是第二次拜託。
//
// Info: (20260825 - Emily) ## 守門範圍:帶排放單位的數字,不是所有數字
// Info: (20260825 - Emily) 回覆裡的合法數字很多不在事實包:章節號(3.8 節)、年份(2023 年)、
// Info: (20260825 - Emily) 標準號(ISO 14064-1)、步驟編號。全面攔截會把守門變成狼來了,
// Info: (20260825 - Emily) 兩天內就會被迫關掉。排放量斷言的特徵是數字緊鄰排放單位 ——
// Info: (20260825 - Emily) 這正是鐵律一要守的那類數字,窄而準,寧漏勿誤殺
// Info: (20260825 - Emily) (漏掉的裸數字仍有 persona 那層在管;誤殺會殺掉整個功能的可信度)。
//
// Info: (20260825 - Emily) ## 合法集合的兩個來源
// Info: (20260825 - Emily) 1. 事實包的 value(唯一的排放量真值來源)
// Info: (20260825 - Emily) 2. 使用者自己說過的數字 —— AI 覆述使用者的話做對照是正當的
// Info: (20260825 - Emily)    (「您說的 5000 噸與帳本的 8332.581 公噸不符」),攔掉它會禁止糾錯。
// Info: (20260825 - Emily)    只收使用者輪次:收 model 輪次會讓漏網的數字下一輪洗白成合法。

import { logger } from "@/lib/utils/logger";
import type { IContextFact } from "@/interfaces/carbon_paragraph_draft";

/**
 * Info: (20260825 - Emily) 排放單位的上下文窗口。數字後方 6 字內出現這些單位即視為排放量斷言。
 *
 * Info: (20260826 - Emily) 已知漏洞(review 阻擋項,08-26):窗口只看後方,
 * 「排放了 CO2e 約 3470 左右」這種**單位在前、數字在後**的句式整批漏接 ——
 * 原註解宣稱「其數字已在前一個 match 處理過」,對表格欄位敘述成立,
 * 對回覆的自然語句不成立(單位前面根本沒有數字,不存在前一個 match)。
 * 依「寧漏勿誤殺」此為 v1 地板:漏接句仍有 persona 層在管;
 * 偵測器換架構(雙向窗口+非排放單位豁免/LLM 萃取取聯集)另票處理,不在本檔硬補。
 */
const QUANTITY_CLAIM =
  /([0-9][0-9,]*(?:\.[0-9]+)?)(?=[^0-9\n]{0,6}(?:kg\s?CO2e|kgCO2e|tCO2e|公噸|噸|kg\b))/gi;

/** Info: (20260825 - Emily) 千分位逗號去掉;數值本身原樣保留(不去尾零 —— 原樣引用是規格,四捨五入也算違規) */
const normalizeNumber = (raw: string): string => raw.replace(/,/g, "");

/** Info: (20260825 - Emily) 抽出一段文字裡所有「帶排放單位」的數字(正規化後) */
export const extractQuantityClaims = (text: string): string[] =>
  [...text.matchAll(QUANTITY_CLAIM)].map((match) => normalizeNumber(match[1]));

/**
 * Info: (20260825 - Emily) 從合法來源蒐集全部數字 token(不限帶單位 ——
 * 事實包 value 裡的每一個數字都是合法引用對象,含括號內的公噸換算值)。
 *
 * ## 只收 value,而且先剝掉單位字串(review 阻擋項,08-25)
 *
 * 第一版連 label 一起收,而 label 帶的是**非數量的數字**:「排放量第 1 大」的 1、
 * 「勾稽擋下:ch3-8」的 3 和 8。更普遍的是 value 尾端的單位字串本身 ——
 * 每一筆事實都以 kgCO2e 結尾,而 CO2e 含一個 2。實測後果:
 * 「2 公噸」「8 公噸」在任何一場對話都過得了守門 —— 合法集合被灌水,
 * 「每個排放量數字都必須溯源」被靜默放寬。
 * 修法:label 不收;value 先剝單位 token 再抽數字。
 */
const ALL_NUMBERS = /[0-9][0-9,]*(?:\.[0-9]+)?/g;
const UNIT_TOKENS = /kg\s?CO2e|kgCO2e|tCO2e|CO2e/gi;
export const collectAllowedNumbers = (
  facts: IContextFact[],
  userTexts: string[],
): Set<string> => {
  const allowed = new Set<string>();
  const collect = (text: string): void => {
    [...text.matchAll(ALL_NUMBERS)].forEach((match) => {
      allowed.add(normalizeNumber(match[0]));
    });
  };
  facts.forEach((fact) => {
    collect(fact.value.replace(UNIT_TOKENS, " "));
  });
  userTexts.forEach(collect);
  return allowed;
};

export interface IReplyGateResult {
  ok: boolean;
  /** 違規數字(正規化後、去重)。ok 時為空 */
  violations: string[];
}

/**
 * Info: (20260825 - Emily) 守門本體:回覆中每一個帶排放單位的數字都必須屬於合法集合。
 * 比對是**字串精確等值**(去千分位後):「8332.58」不等於「8332.581」——
 * 四捨五入是計算,persona 禁了,守門照攔;要說整數就引用事實包裡有的那個值。
 */
export const auditReplyQuantities = (
  reply: string,
  facts: IContextFact[],
  userTexts: string[],
): IReplyGateResult => {
  const allowed = collectAllowedNumbers(facts, userTexts);
  const violations = [
    ...new Set(
      extractQuantityClaims(reply).filter((number) => !allowed.has(number)),
    ),
  ];
  return { ok: violations.length === 0, violations };
};

/**
 * Info: (20260825 - Emily) 攔下後的決定性替代回覆(不經 LLM —— 攔下的原因就是它不可信,
 * 不能再請它解釋)。說明被攔的是什麼,並給使用者一條路走。
 * 殘留:此訊息未進 i18n(zh_tw 先行,#59 的 i18n 掃描落地後一併補)。
 */
export const buildGateBlockedReply = (violations: string[]): string =>
  `系統攔下了一則回覆:其中的排放量數字(${violations.join("、")})無法溯源到帳本事實,依規則不得送出。請重新提問;若您在問的資料尚未匯入帳本,請先完成報告匯入或活動數據計算。`;

/**
 * Info: (20260826 - Emily) 守門是否上崗,規則只有一條:呼叫端有沒有帶事實包。
 * - undefined = 呼叫端沒帶(舊呼叫端/招呼詞路徑)→ 跳過
 * - [](帳本空)→ **照跑**:這一層存在的理由是「指令不是保證」,
 *   而空包狀態恰好只剩指令,是編造與同業比較最沒有阻力的一格(review 阻擋項,08-25)。
 * 抽成具名謂詞是為了讓「接線」可測:接線測試釘這個謂詞的三種輸入,
 * 而不是在 service 裡留一句誰都能改壞的行內判斷(review 阻擋項,08-26)。
 */
export const shouldRunReplyGate = (
  ledgerFacts: IContextFact[] | undefined,
): ledgerFacts is IContextFact[] => ledgerFacts !== undefined;

/**
 * Info: (20260826 - Emily) 守門套用結果需要撤銷的訊號欄位。
 * 一則編數字的回覆,它的「資訊已齊全」「請修訂某段」「請插圖」判斷同樣不可信,
 * 所以攔下時三個訊號一併歸零;reply 之外的其餘欄位(extraction/usage)原樣保留 ——
 * extraction 照抄的是使用者訊息、另有逐筆裁決,usage 是已發生的計費事實。
 */
interface IGateableSignals {
  reply: string;
  readyParagraphId: string | null;
  revisionParagraphId: string | null;
  chartRequest: object | null;
}

/**
 * Info: (20260826 - Emily) 套用守門(#6707 第三層的「接線」本體)。
 *
 * 原本這段住在 chat.service 的 private method 裡 —— 接線邏輯測不到,
 * 把 `if (!ledgerFacts)` 改成 `if (!ledgerFacts || ledgerFacts.length === 0)`
 * 全部測試照綠(review 以突變實測證明,08-26)。搬進純函式模組後:
 * 行為由本檔測試直接釘死,service 端只剩「有沒有呼叫」一件事,
 * 由掃描測試守(applyReplyGate 呼叫次數 ≥ 結構化/降級兩條路)。
 *
 * 通過時**回傳原物件**(同一參照)——「沒攔」與「改了但看起來一樣」是兩件事,
 * 測試據此用參照相等釘住守門不得夾帶任何改寫。
 */
export const applyReplyGate = <T extends IGateableSignals>(
  structured: T,
  ledgerFacts: IContextFact[] | undefined,
  userTexts: string[],
): T => {
  if (!shouldRunReplyGate(ledgerFacts)) return structured;
  const gate = auditReplyQuantities(structured.reply, ledgerFacts, userTexts);
  if (gate.ok) return structured;
  logger.warn("carbon reply gate blocked", { violations: gate.violations });
  /**
   * Info: (20260826 - Emily) Object.assign 而非 spread:泛型 T 上的欄位覆寫,
   * spread 字面值不可指派回 T(T 可能把欄位收得更窄),assign 的交集型別可以 ——
   * 這裡不用 as 斷言,讓編譯器留在崗位上。
   */
  return Object.assign({}, structured, {
    reply: buildGateBlockedReply(gate.violations),
    readyParagraphId: null,
    revisionParagraphId: null,
    chartRequest: null,
  });
};
