// Info: (20260825 - Emily) 回覆出口守門(#6707 第三層):
// Info: (20260825 - Emily) LLM 回覆裡「排放量斷言的數字」必須屬於合法集合,否則整則攔下。
//
// Info: (20260825 - Emily) persona 已經把「清單之外不得有數字」說死(第二層),
// Info: (20260825 - Emily) 但指令不是保證 —— 委員名單捏造(#6708)就是模型無視「照錄」約束的實證。
// Info: (20260825 - Emily) 守門是機器判,不是第二次拜託。
//
// Info: (20260826 - Emily) ## 涵蓋範圍(依 §2.5 用**輸入空間**描述,不是用程式碼描述)
// Info: (20260826 - Emily) 一個數字受守門,當它滿足下列任一條:
// Info: (20260826 - Emily) (Y 地板,可從程式碼推導)10 字雙向窗內有排放單位、兩者之間沒有別的數字、
// Info: (20260826 - Emily) 且該數字沒有自帶非排放單位(元/頁/節/年/%…);
// Info: (20260826 - Emily) (X 主力,只能抽樣量測)LLM 萃取器把它列為排放量斷言。
// Info: (20260826 - Emily) 兩者取**聯集**:Y 提供不隨模型改版退化的最低涵蓋,X 補改述空間
// Info: (20260826 - Emily) (單位在前、跨行、表格、換算寫法)。裁決權全在 TS:字串等值+決定性換算,
// Info: (20260826 - Emily) LLM 只回答「這則回覆裡有哪些排放量斷言」,不判對錯(review round-3 建議方向)。
// Info: (20260826 - Emily) X 不可用時退到 Y 並記 log —— 靜默降級等於把守門關掉而沒人知道。
//
// Info: (20260825 - Emily) ## 合法集合的兩個來源
// Info: (20260825 - Emily) 1. 事實包的 value(唯一的排放量真值來源)
// Info: (20260825 - Emily) 2. 使用者自己說過的數字 —— AI 覆述使用者的話做對照是正當的
// Info: (20260825 - Emily)    (「您說的 5000 噸與帳本的 8332.581 公噸不符」),攔掉它會禁止糾錯。
// Info: (20260825 - Emily)    只收使用者輪次:收 model 輪次會讓漏網的數字下一輪洗白成合法。

import { logger } from "@/lib/utils/logger";
import type { IContextFact } from "@/interfaces/carbon_paragraph_draft";

/**
 * Info: (20260826 - Emily) 排放單位 token(Y 地板用)。長 token 在前,避免 kg 先吃掉 kgCO2e。
 * kg 用 (?![A-Za-z0-9]) 而非 \b:後面接中文時 \b 也成立,但接 kWh 的 k 時要擋。
 */
const EMISSION_UNITS = /kg\s?CO2e|tCO2e|CO2e|公噸|噸|kg(?![A-Za-z0-9])/gi;

/**
 * Info: (20260826 - Emily) 非排放單位豁免:數字**自帶**這些單位時,它不是排放量斷言 ——
 * 即使 10 字窗內剛好有排放單位(「費用 300 元,含 CO2e 查證」的 300、
 * 「第 3 節說明公噸 CO2e 的計算」的 3)。清單是開集、只會變長 ——
 * 這正是 Y 是地板不是主力的原因(review round-3);X 不需要這張清單。
 */
const NON_EMISSION_TAIL =
  /^(?:元|塊|頁|節|章|年|月|日|號|樓|%|％|度|筆|次|人|步|項|個|條|款|期|季|週|周|天|小時|分鐘|秒|位|家|間|台|份|公里|公尺|公升|立方公尺|kWh|MJ)/i;

/** Info: (20260826 - Emily) Y 地板的雙向窗口:數字與排放單位相距 ≤ 10 字(含換行 —— 跨行漏接是 round-3 實測的 ESCAPES 之一) */
const UNIT_WINDOW = 10;

/** Info: (20260825 - Emily) 千分位逗號去掉;數值本身原樣保留(不去尾零 —— 原樣引用是規格,四捨五入也算違規) */
const normalizeNumber = (raw: string): string => raw.replace(/,/g, "");

/**
 * Info: (20260826 - Emily) 逗號只能出現在數字**中間**(千分位),不能收尾:
 * `[0-9][0-9,]*` 會把「9999,」的尾逗號吃進 token,數字的右邊界右移一格,
 * 雙向窗的距離就此少算一字(编譯後行為驗證抓到的實例)。
 */
const ALL_NUMBERS = /[0-9](?:[0-9,]*[0-9])?(?:\.[0-9]+)?/g;

interface ISpan {
  start: number;
  end: number;
}

/**
 * Info: (20260826 - Emily) 抽出一段文字裡所有「排放量斷言」的數字(正規化後)—— Y 地板。
 *
 * 演算法(review round-3 建議:遮單位 → 雙向窗 → 非排放單位豁免):
 * 1. 先找出排放單位的位置,並在副本上把它們遮成空白 —— 一石二鳥:
 *    數字掃描不會把 CO2e 裡的 2 當數字,單位裡的字元也不會干擾距離計算。
 * 2. 在遮罩後文字上掃數字。數字自帶非排放單位(緊隨其後,可隔空白)→ 豁免。
 * 3. 否則,存在一個排放單位與它相距 ≤ 10 字、**且兩者之間沒有別的數字**
 *    (單位配對最近的數字 —— 沒有這條,「第 1 大(3470.3 公噸)」的 1 會被誤殺)→ 斷言。
 *
 * 原 v1 只看數字後方 6 字,「排放量(公噸 CO2e):9999」這類單位在前的標準寫法
 * 整批漏接(round-3 實測 5 個 ESCAPES);雙向窗口把那一批收進來。
 */
export const extractQuantityClaims = (text: string): string[] => {
  const unitSpans: ISpan[] = [...text.matchAll(EMISSION_UNITS)].map((m) => ({
    start: m.index ?? 0,
    end: (m.index ?? 0) + m[0].length,
  }));
  let masked = text;
  unitSpans.forEach((span) => {
    masked =
      masked.slice(0, span.start) +
      " ".repeat(span.end - span.start) +
      masked.slice(span.end);
  });

  const claims: string[] = [];
  [...masked.matchAll(ALL_NUMBERS)].forEach((m) => {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    // Info: (20260826 - Emily) 豁免看原文(單位遮掉前):數字自帶的單位緊隨其後
    const tail = text.slice(end).replace(/^[ \t]*/, "");
    if (NON_EMISSION_TAIL.test(tail)) return;
    const paired = unitSpans.some((unit) => {
      const gap =
        unit.start >= end
          ? masked.slice(end, unit.start)
          : masked.slice(unit.end, start);
      if (
        unit.start >= end
          ? unit.start - end > UNIT_WINDOW
          : start - unit.end > UNIT_WINDOW
      ) {
        return false;
      }
      // Info: (20260826 - Emily) 最近數字配對:數字與單位之間夾著別的數字 → 這顆不算
      return !/[0-9]/.test(gap);
    });
    if (paired) claims.push(normalizeNumber(m[0]));
  });
  return claims;
};

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
 * Info: (20260825 - Emily) Y 地板守門:回覆中每一個排放量斷言的數字都必須屬於合法集合。
 * 比對是**字串精確等值**(去千分位後):「8332.58」不等於「8332.581」——
 * 四捨五入是計算,persona 禁了,守門照攔;要說整數就引用事實包裡有的那個值。
 * (單位換算的容差只給 X:它帶結構化 unit,換算才是決定性的;Y 沒有 unit 資訊。)
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
 * Info: (20260826 - Emily) X 主力:LLM 萃取器的介面與裁決。
 * 萃取器由呼叫端注入(chat.service 用自己的 LLM 通道建),
 * 本模組保持純函式可測 —— 測試注入假萃取器,不 mock 本模組。
 */
export interface IExtractedEmissionClaim {
  /** 數字原樣(可含千分位) */
  value: string;
  /** 單位原樣(公噸 CO2e/kgCO2e/噸…) */
  unit: string;
}

export type ClaimExtractor = (
  reply: string,
) => Promise<IExtractedEmissionClaim[]>;

/**
 * Info: (20260826 - Emily) 十進位字串位移(×10^n / ÷10^n),不經浮點 ——
 * 換算是決定性規則,不能引入 0.30000000000000004。
 */
export const shiftDecimalString = (value: string, digits: number): string => {
  if (!/^[0-9]+(?:\.[0-9]+)?$/.test(value)) return value;
  const [intPart, fracPart = ""] = value.split(".");
  const joined = intPart + fracPart;
  let point = intPart.length + digits;
  let padded = joined;
  if (point <= 0) {
    padded = "0".repeat(1 - point) + joined;
    point = 1;
  } else if (point > joined.length) {
    padded = joined + "0".repeat(point - joined.length);
  }
  const head = padded.slice(0, point).replace(/^0+(?=[0-9])/, "");
  const tail = padded.slice(point).replace(/0+$/, "");
  return tail.length > 0 ? `${head}.${tail}` : head;
};

const TONNE_SCALE = /公噸|^噸$|噸\s?CO2e|tCO2e|TONNE/i;
const KG_SCALE = /kg|公斤/i;

/**
 * Info: (20260826 - Emily) X 的裁決(TS 端,決定性):字串等值,或同值異單位的決定性換算
 * (公噸級 ×1000 → kg 級;kg 級 ÷1000 → 公噸級)。review round-3 指出 Y 的字串等值會讓
 * 「8332.581 公噸」與「8332581 公斤」—— 同一事實的兩種正確寫法 —— 一過一不過;
 * X 帶結構化 unit,換算才寫得成規則。容差僅此一條,四捨五入仍然攔。
 */
export const adjudicateExtractedClaims = (
  claims: IExtractedEmissionClaim[],
  allowed: Set<string>,
): string[] => {
  const violations = claims
    .map((claim) => normalizeNumber(claim.value))
    .filter((value, index) => {
      if (allowed.has(value)) return false;
      const unit = claims[index].unit;
      if (TONNE_SCALE.test(unit) && allowed.has(shiftDecimalString(value, 3))) {
        return false;
      }
      if (KG_SCALE.test(unit) && allowed.has(shiftDecimalString(value, -3))) {
        return false;
      }
      return true;
    });
  return [...new Set(violations)];
};

/**
 * Info: (20260826 - Emily) 萃取可重放(review round-3 配套 #3):同一則回覆的萃取結果快取,
 * B3 兩趟比對的前提是同一輸入同一答案 —— 這比「相信 temperature 0」可靠。
 * 上限防無界成長;鍵直接用回覆內容(單機行程內,回覆長度有 token 上限)。
 */
const EXTRACTION_CACHE = new Map<string, IExtractedEmissionClaim[]>();
const EXTRACTION_CACHE_MAX = 200;

const cachedExtract = async (
  extractor: ClaimExtractor,
  reply: string,
): Promise<IExtractedEmissionClaim[]> => {
  const hit = EXTRACTION_CACHE.get(reply);
  if (hit) return hit;
  const claims = await extractor(reply);
  if (EXTRACTION_CACHE.size >= EXTRACTION_CACHE_MAX) {
    const oldest = EXTRACTION_CACHE.keys().next().value;
    if (oldest !== undefined) EXTRACTION_CACHE.delete(oldest);
  }
  EXTRACTION_CACHE.set(reply, claims);
  return claims;
};

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

const toBlocked = <T extends IGateableSignals>(
  structured: T,
  violations: string[],
  source: "floor" | "extractor",
): T => {
  logger.warn("carbon reply gate blocked", { violations, source });
  /**
   * Info: (20260826 - Emily) Object.assign 而非 spread:泛型 T 上的欄位覆寫,
   * spread 字面值不可指派回 T(T 可能把欄位收得更窄),assign 的交集型別可以 ——
   * 這裡不用 as 斷言,讓編譯器留在崗位上。
   */
  return Object.assign({}, structured, {
    reply: buildGateBlockedReply(violations),
    readyParagraphId: null,
    revisionParagraphId: null,
    chartRequest: null,
  });
};

/**
 * Info: (20260826 - Emily) 套用守門(#6707 第三層的「接線」本體)。
 *
 * 原本這段住在 chat.service 的 private method 裡 —— 接線邏輯測不到,
 * 把 `if (!ledgerFacts)` 改成 `if (!ledgerFacts || ledgerFacts.length === 0)`
 * 全部測試照綠(review 以突變實測證明,08-26)。搬進純函式模組後:
 * 行為由本檔測試直接釘死,service 端只剩「有沒有呼叫」一件事,
 * 由掃描測試+真 handler 接線測試守。
 *
 * 執行順序:Y 地板先跑(便宜、決定性)—— 攔到就攔,不再花一次 LLM 呼叫;
 * Y 過了且回覆含數字才叫 X(前置過濾:拒答句是多數,無數字不花錢)。
 * X 失敗 → **降級留痕**後放行(Y 已過):守門此輪只有地板在守,log 必記。
 *
 * 通過時**回傳原物件**(同一參照)——「沒攔」與「改了但看起來一樣」是兩件事,
 * 測試據此用參照相等釘住守門不得夾帶任何改寫。
 */
export const applyReplyGate = async <T extends IGateableSignals>(
  structured: T,
  ledgerFacts: IContextFact[] | undefined,
  userTexts: string[],
  extractor?: ClaimExtractor,
): Promise<T> => {
  if (!shouldRunReplyGate(ledgerFacts)) return structured;
  const floor = auditReplyQuantities(structured.reply, ledgerFacts, userTexts);
  if (!floor.ok) return toBlocked(structured, floor.violations, "floor");
  if (!extractor || !/[0-9]/.test(structured.reply)) return structured;
  let claims: IExtractedEmissionClaim[];
  try {
    claims = await cachedExtract(extractor, structured.reply);
  } catch (error) {
    logger.warn("carbon reply gate extractor degraded", {
      message: error instanceof Error ? error.message : String(error),
    });
    return structured;
  }
  const allowed = collectAllowedNumbers(ledgerFacts, userTexts);
  const xViolations = adjudicateExtractedClaims(claims, allowed);
  if (xViolations.length > 0) {
    return toBlocked(structured, xViolations, "extractor");
  }
  return structured;
};
