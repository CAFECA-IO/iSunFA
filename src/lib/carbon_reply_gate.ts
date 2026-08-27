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
//
// Info: (20260826 - Emily) ## 威脅模型(round-4 review 的範圍說明,照收)
// Info: (20260826 - Emily) 事實包由呼叫端送上來(帳本 E2EE,伺服端讀不到)。這道守門防的是
// Info: (20260826 - Emily) **模型編數字**,不是防改過的前端 —— 使用者是自己報告的唯一消費者,
// Info: (20260826 - Emily) 這是正確的威脅模型。但它因此**不是稽核控制項**:對外文件不得把這一層
// Info: (20260826 - Emily) 說成「系統保證每個數字都溯源得到」。
//
// Info: (20260826 - Emily) ## 數字的寫法邊界
// Info: (20260826 - Emily) 全形數字/小數點在進守門前 1:1 摺疊成半形(round-4 中-1:
// Info: (20260826 - Emily) 全形寫法原本同時繞過 Y 與前置過濾)。攔下訊息中的數字以半形正規形呈現。
// Info: (20260826 - Emily) 中文數字(八千三百)Y 構不到,由 X 的萃取涵蓋(前置過濾認得中文數字,
// Info: (20260826 - Emily) 會放 X 上崗;萃取出的原樣字串過回覆內容檢查後,查無合法集合即攔)。

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

/**
 * Info: (20260826 - Emily) 全形數字/全形小數點 1:1 摺疊成半形(round-4 中-1)。
 * 只摺這兩類:等長替換,所有 index 與窗口距離不變。
 * **不摺全形逗號**:「,」是中文的句讀,摺成半形會讓「9999,5000」被千分位規則
 * 黏成一個 token。
 */
const foldFullWidthDigits = (text: string): string =>
  text
    .replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/．/g, ".");

/**
 * Info: (20260826 - Emily) 前置過濾的「含數字」判準:半形、全形、中文數字都算
 * (round-4 中-1:原本只認 [0-9],全形與中文數字的回覆連 X 都不會上崗)。
 * 中文數字要求**連續兩字以上**(八千三百/一萬):單一個「一」在中文裡
 * 太常見(一起/逐一/一併),放單字進判準等於把前置過濾關掉、每則回覆都花一次 X。
 * 代價:「排放約三噸」這種單字中文數字量不觸發 X —— 據實申報的已知界,
 * persona 禁用中文數字寫量(數字只能原樣引用事實包,事實包全是半形)。
 */
const HAS_NUMERAL = /[0-9０-９]|[〇零一二三四五六七八九十百千萬万億兆]{2,}/;

interface ISpan {
  start: number;
  end: number;
}

/**
 * Info: (20260826 - Emily) 一則排放量斷言:數字(正規化後)+ 它配對到的單位文字。
 * Y 與 X 產出同一個形狀,吃同一支裁決(adjudicateQuantityClaims)——
 * round-4 阻擋-1 的教訓:換算容差只寫在 X,而 Y 先攔短路,
 * 「8332.581 公噸」(事實包只有 kg 寫法)這個最常見的正確回答被 Y 攔死,
 * X 的換算永遠執行不到 —— 機制寫出來了,但在真實條件下不成立。
 */
export interface IQuantityClaim {
  /** 數字(可含千分位;裁決端會正規化) */
  value: string;
  /** 配對到的單位文字(Y:窗內配對單位串接;X:LLM 原樣照抄) */
  unit: string;
}

/**
 * Info: (20260826 - Emily) 抽出一段文字裡所有「排放量斷言」(數字+配對單位)—— Y 地板。
 *
 * 演算法(review round-3 建議:遮單位 → 雙向窗 → 非排放單位豁免):
 * 0. 全形數字/小數點先摺半形(round-4 中-1;等長替換,index 不變)。
 * 1. 找出排放單位的位置,並在副本上把它們遮成空白 —— 一石二鳥:
 *    數字掃描不會把 CO2e 裡的 2 當數字,單位裡的字元也不會干擾距離計算。
 * 2. 在遮罩後文字上掃數字。數字自帶非排放單位(緊隨其後,可隔空白)→ 豁免。
 * 3. 否則,存在一個排放單位與它相距 ≤ 10 字、**且兩者之間沒有別的數字**
 *    (單位配對最近的數字 —— 沒有這條,「第 1 大(3470.3 公噸)」的 1 會被誤殺)→ 斷言,
 *    並把窗內配對到的單位文字一起帶出(round-4 阻擋-1:Y 也要有單位資訊才換算得成)。
 *
 * 原 v1 只看數字後方 6 字,「排放量(公噸 CO2e):9999」這類單位在前的標準寫法
 * 整批漏接(round-3 實測 5 個 ESCAPES);雙向窗口把那一批收進來。
 */
export const extractQuantityClaims = (rawText: string): IQuantityClaim[] => {
  const text = foldFullWidthDigits(rawText);
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

  const claims: IQuantityClaim[] = [];
  [...masked.matchAll(ALL_NUMBERS)].forEach((m) => {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    // Info: (20260826 - Emily) 豁免看原文(單位遮掉前):數字自帶的單位緊隨其後
    const tail = text.slice(end).replace(/^[ \t]*/, "");
    if (NON_EMISSION_TAIL.test(tail)) return;
    const paired = unitSpans.filter((unit) => {
      if (
        unit.start >= end
          ? unit.start - end > UNIT_WINDOW
          : start - unit.end > UNIT_WINDOW
      ) {
        return false;
      }
      const gap =
        unit.start >= end
          ? masked.slice(end, unit.start)
          : masked.slice(unit.end, start);
      // Info: (20260826 - Emily) 最近數字配對:數字與單位之間夾著別的數字 → 這顆不算
      return !/[0-9]/.test(gap);
    });
    if (paired.length > 0) {
      claims.push({
        value: normalizeNumber(m[0]),
        unit: paired.map((u) => text.slice(u.start, u.end)).join(" "),
      });
    }
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

/**
 * Info: (20260827 - Emily) 裁決用的兩級合法集合(round-5 阻擋項)。
 *
 * ## 為什麼要分兩級
 *
 * 一筆事實的 value 是渲染給人看的字串,裡面同時有排放量、活動數據與占比:
 * 「5000000 kgCO2e(1000 立方公尺,占全公司總量 60%)」。
 * 第一版把整串的每個數字都當成「排放量的合法值」,於是活動數據與占比
 * 替編造的排放量背書;round-4 加上 kg↔公噸換算之後碰撞面又乘一倍 ——
 * reviewer 實測「甲廠排放 1 公噸」在有「1000 立方公尺」的帳本裡直接放行,
 * 而**活動數據常是整數、小整數又正是估算的模型最會吐的東西**。
 *
 * 修法:排放量斷言的合法集合裡只該有排放量。事實只要**宣告了 emissionsKg**
 * (查詢層對每一筆有 co2eKg 的事實都會宣告),就只有它宣告的那些值進 equality,
 * 它的活動量與占比一律出局;**沒宣告的敘事型事實**(待補說明、勾稽阻擋原因)
 * 照舊全收其數字 —— 那些字串裡的數字是使用者要能原樣引用的證據
 * (「差額 700.0005(原文 901.465 vs 加總 201.4645)」),但它們不參與換算
 * (沒有 unit 資訊,換算沒有依據)。
 *
 * 殘留(據實申報):敘事型事實的數字仍可能被以排放單位引用而放行 ——
 * 面窄(要模型剛好說出那串數字)、且方向是「少攔」而非「錯放特定編造值」。
 * 徹底解法與此處同一主張:敘事型事實也帶結構(#6707 的後續票)。
 */
export interface IAllowedNumbers {
  /** 字串精確等值可接受的數字(排放量 + 敘事型事實的數字 + 使用者說過的數字) */
  equality: Set<string>;
  /** 可參與 kg↔公噸決定性換算的排放量數值(kg 級,只來自宣告 emissionsKg 的事實) */
  emissionKg: Set<string>;
}

const addNumbers = (target: Set<string>, text: string): void => {
  [...foldFullWidthDigits(text).matchAll(ALL_NUMBERS)].forEach((match) => {
    target.add(normalizeNumber(match[0]));
  });
};

export const collectAllowedNumbers = (
  facts: IContextFact[],
  userTexts: string[],
): IAllowedNumbers => {
  const equality = new Set<string>();
  const emissionKg = new Set<string>();
  facts.forEach((fact) => {
    if (fact.emissionsKg && fact.emissionsKg.length > 0) {
      fact.emissionsKg.forEach((amount) => {
        addNumbers(equality, amount);
        addNumbers(emissionKg, amount);
      });
      return;
    }
    addNumbers(equality, fact.value.replace(UNIT_TOKENS, " "));
  });
  userTexts.forEach((text) => addNumbers(equality, text));
  return { equality, emissionKg };
};

export interface IReplyGateResult {
  ok: boolean;
  /** 違規數字(正規化後、去重)。ok 時為空 */
  violations: string[];
}

/**
 * Info: (20260825 - Emily) Y 地板守門:回覆中每一個排放量斷言都必須通過裁決 ——
 * 字串精確等值(去千分位後),或同值異單位的決定性換算(公噸級↔kg 級)。
 * 「8332.58」不等於「8332.581」:四捨五入是計算,persona 禁了,守門照攔;
 * 要說整數就引用事實包裡有的那個值。
 *
 * Info: (20260826 - Emily) round-4 阻擋-1:換算容差原本只寫在 X,而 Y 先攔短路,
 * 事實包只有 kg 寫法時「8332.581 公噸」這個最常見的正確回答被 Y 攔死。
 * 修法照 review 建議 1:Y 的斷言帶配對單位,與 X 吃同一支裁決 ——
 * 矛盾就此消失,而且不花一次 LLM 呼叫。
 */
export const auditReplyQuantities = (
  reply: string,
  facts: IContextFact[],
  userTexts: string[],
): IReplyGateResult => {
  const allowed = collectAllowedNumbers(facts, userTexts);
  const violations = adjudicateQuantityClaims(
    extractQuantityClaims(reply),
    allowed,
  );
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
 * Info: (20260826 - Emily) X 主力:LLM 萃取器的介面。產出形狀與 Y 相同(IQuantityClaim),
 * 吃同一支裁決。萃取器由呼叫端注入(chat.service 用自己的 LLM 通道建),
 * 本模組保持純函式可測 —— 測試注入假萃取器,不 mock 本模組。
 */
export type ClaimExtractor = (reply: string) => Promise<IQuantityClaim[]>;

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

/**
 * Info: (20260826 - Emily) 裁決(TS 端,決定性,Y 與 X 共用):字串等值,
 * 或同值異單位的決定性換算(公噸級 ×1000 → kg 級;kg 級 ÷1000 → 公噸級)。
 * 事實包的排放量一律是 kg 寫法,而盤查報告與 persona 慣用公噸 ——
 * 「8332.581 公噸」與「8332581 kgCO2e」是同一事實的兩種正確寫法,
 * 裁決必須給出同一個答案(round-4 阻擋-1)。容差僅此一條,四捨五入仍然攔。
 *
 * Info: (20260827 - Emily) round-5:換算**只比對排放量集合**(allowed.emissionKg)。
 * 對 equality 用的是全集(含敘事型事實與使用者數字),對換算用的是排放量子集 ——
 * 否則活動數據(1000 立方公尺)與占比(60%)會替「1 公噸」「60 公噸」背書。
 */
export const adjudicateQuantityClaims = (
  claims: IQuantityClaim[],
  allowed: IAllowedNumbers,
): string[] => {
  const violations = claims
    .map((claim) => normalizeNumber(foldFullWidthDigits(claim.value)))
    .filter((value, index) => {
      if (allowed.equality.has(value)) return false;
      const unit = claims[index].unit;
      if (
        TONNE_SCALE.test(unit) &&
        allowed.emissionKg.has(shiftDecimalString(value, 3))
      ) {
        return false;
      }
      /**
       * Info: (20260827 - Emily) 只有「公噸級 → kg」這一個方向。
       * emissionsKg 依契約是 kg 級,所以 kg 級的斷言必然走 equality 命中,
       * 反向(kg ÷1000 對上某個公噸級事實)在真實資料裡不存在 ——
       * 寫了就是永遠執行不到的分支(round-4 的教訓:機制寫出來但真實條件下不成立)。
       * 使用者說公噸、AI 自己換成公斤,那是計算,persona 禁、守門照攔。
       */
      return true;
    });
  return [...new Set(violations)];
};

/**
 * Info: (20260826 - Emily) 萃取可重放(review round-3 配套 #3):同一則回覆的萃取結果快取,
 * B3 兩趟比對的前提是同一輸入同一答案 —— 這比「相信 temperature 0」可靠。
 * 上限防無界成長;鍵直接用回覆內容(單機行程內,回覆長度有 token 上限)。
 */
const EXTRACTION_CACHE = new Map<string, IQuantityClaim[]>();
const EXTRACTION_CACHE_MAX = 200;

const cachedExtract = async (
  extractor: ClaimExtractor,
  reply: string,
): Promise<IQuantityClaim[]> => {
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
  if (!extractor || !HAS_NUMERAL.test(structured.reply)) return structured;
  let claims: IQuantityClaim[];
  try {
    claims = await cachedExtract(extractor, structured.reply);
  } catch (error) {
    logger.warn("carbon reply gate extractor degraded", {
      message: error instanceof Error ? error.message : String(error),
    });
    return structured;
  }
  /**
   * Info: (20260826 - Emily) 回覆內容檢查(round-4 高-1):裁決權全在 TS 的立場
   * 之前只落實了一半 —— 不信 X 的判斷,卻完全信它的轉錄。轉錄也是 LLM 輸出:
   * 幻覺斷言(回覆裡根本沒有的數字)或少抄一位,會讓一則完全正確的回覆被攔,
   * 且攔下訊息報一個使用者從沒見過的數字 —— 最難自救的失敗。
   *
   * 比 review 建議的子字串 includes 強一階:「少抄一位」的 833258 是
   * 8332581 的**子字串**,includes 會誤命中,他的第二個症狀修不掉。
   * 數值斷言改比「回覆的數字 token 集合」精確等值(千分位與全形先正規化);
   * 非數值斷言(中文數字「八千三百」,ALL_NUMBERS 掃不到)才用子字串。
   * 誤差方向安全:被丟掉的只會少攔,少攔的那一半有 Y 地板在守。
   * 被丟掉的斷言記 log —— 那是萃取器品質的訊號,值得看得到。
   */
  const foldedReply = foldFullWidthDigits(structured.reply);
  const replyNumberTokens = new Set(
    [...foldedReply.matchAll(ALL_NUMBERS)].map((m) => normalizeNumber(m[0])),
  );
  const present = claims.filter((claim) => {
    const value = normalizeNumber(foldFullWidthDigits(claim.value));
    return /[0-9]/.test(value)
      ? replyNumberTokens.has(value)
      : foldedReply.includes(claim.value);
  });
  if (present.length < claims.length) {
    logger.warn("carbon reply gate extractor claim not in reply, dropped", {
      dropped: claims.length - present.length,
    });
  }
  const allowed = collectAllowedNumbers(ledgerFacts, userTexts);
  const xViolations = adjudicateQuantityClaims(present, allowed);
  if (xViolations.length > 0) {
    return toBlocked(structured, xViolations, "extractor");
  }
  return structured;
};
