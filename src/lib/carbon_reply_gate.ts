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

import type { IContextFact } from "@/interfaces/carbon_paragraph_draft";

/**
 * Info: (20260825 - Emily) 排放單位的上下文窗口。數字後方 6 字內出現這些單位即視為排放量斷言。
 * 窗口只看後方:中文計量慣例是「3470.34 公噸」數字在前;
 * 「公噸 CO2e/年」這種單位在前的寫法,其數字已在前一個 match 處理過。
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
