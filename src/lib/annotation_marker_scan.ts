// Info: (20260909 - Emily) 註解標記格式的機械化檢查(#6763)—— `annotation.md` 的規定有牙齒

/**
 * Info: (20260909 - Emily) `documents/engineering_guidelines/work_guidelines/annotation.md`(v1.0.4)
 * 規定註解帶 `Info: (YYYYMMDD - Author)` 這種前綴,`ToDo` / `Deprecated` 有釋放義務、`Info` 沒有。
 * 09-03 實測:全庫 201 個 `ToDo` 最舊 2025-04-17、`eslint-disable` 的說明義務遵守率約 6% ——
 * 標記制度只在字面上存在。這一支把**格式**變成程式判;「`ToDo` 有沒有被釋放」不在這裡
 * (那是另一件事,要先把 201 則分類:還成立的、已失效的、其實是 `Info` 寫錯標記的)。
 *
 * ## 只守標記,不守「每一行註解都要有標記」
 *
 * 全庫 52,811 行註解,20,403 行帶正確標記,51 行標記**寫壞**(`Info:(` 少空白、缺作者、
 * `TODO:` 大寫無日期;票上寫 58 是用較寬的字面搜尋量的,含散文裡的提及與 `Note:`),其餘是多行區塊的續行、JSDoc、`@ts-expect-error` 這類不該有標記的行。
 * 「沒有標記」與「標記寫壞」是兩件事:前者要先定義哪些行算「一則註解的第一行」,
 * 本票不碰;後者今天就判得準 —— 一行以 `Info` / `ToDo` / `Deprecated`(或它們的變體
 * `TODO` / `Todo` / `FIXME`)開頭卻不符格式,沒有第二種解讀。
 *
 * ## 既有的 51 + 31 則怎麼辦:基準線,而且是逐行、雙向嚴格的
 *
 * 缺作者的 `Info: (20260616)` 不能由實作者補上一個名字(那是捏造出處),所以既有的不修,
 * 記進基準線(`src/__tests__/fixtures/annotation_marker_baseline.json`)。基準線記的是
 * `檔案::那一行的原文`,不是每檔幾筆 —— 記筆數的話,同一個檔修掉一則、新寫壞一則,數字不動,規則就瞎了。
 * 雙向嚴格:基準線裡的行被修掉了也紅,訊息會說「把這一行從基準線刪掉」—— 基準線不許過時,
 * 過時的基準線是下一個「看起來有護欄」的地方。
 */

export const ANNOTATION_MARKER_KINDS = ["Info", "ToDo", "Deprecated"] as const;
export type AnnotationMarkerKind = (typeof ANNOTATION_MARKER_KINDS)[number];

/**
 * Info: (20260909 - Emily) `eslint-disable-next-line` 上方那一行允許的標記。
 *
 * `annotation.md` 的「Eslint Disable」一節,**文字**寫 `ToDo`、**範例**寫 `Deprecated` ——
 * 兩者互相矛盾,而該用哪一個要由文件 owner 決定,不是實作者選一個(選了就把一個猜的判準釘成正確)。
 * 決定之前這裡收**文件自己寫出的兩種**;決定之後刪掉另一個,基準線裡用錯標記的那幾則會跟著紅。
 * 有測試釘住這個陣列只能是那兩個的子集。
 */
export const ESLINT_DISABLE_MARKER_KINDS: ReadonlyArray<AnnotationMarkerKind> =
  ["ToDo", "Deprecated"];

/** Info: (20260909 - Emily) 票上寫的那條:`(Info|ToDo|Deprecated): (YYYYMMDD - Author)`;作者 `\w+`,與票同 */
export const ANNOTATION_MARKER_EXACT =
  /^(Info|ToDo|Deprecated): \((\d{8}) - (\w+)\)/;
/** Info: (20260909 - Emily) 多行 `Deprecated` 的收尾,文件明列的唯一不帶日期的形式 */
export const DEPRECATED_END_MARK = /^Deprecated: \[end\]\s*$/;
/**
 * Info: (20260909 - Emily) 「看起來想寫標記」的開頭:三種正名與常見變體。
 * 只看**註解內容的開頭**,所以 `` `Info:` 註解裡 `` 這種散文裡的提及不算。
 */
const MARKER_ATTEMPT = /^(info|to-?do|deprecated|fixme)\b/i;

export enum AnnotationFindingKindEnum {
  /** Info: (20260909 - Emily) 以標記字開頭但不符 `Kind: (YYYYMMDD - Author)` */
  MALFORMED_MARKER = "MALFORMED_MARKER",
  /** Info: (20260909 - Emily) 格式對、日期不是一個存在的日子(20260931) */
  INVALID_DATE = "INVALID_DATE",
  /** Info: (20260909 - Emily) `eslint-disable-next-line` 上一行沒有允許的標記 */
  ESLINT_DISABLE_UNMARKED = "ESLINT_DISABLE_UNMARKED",
  /** Info: (20260909 - Emily) 用了 `eslint-disable` / `eslint-disable-line`;文件只允許 next-line */
  ESLINT_DISABLE_FORBIDDEN_FORM = "ESLINT_DISABLE_FORBIDDEN_FORM",
}

export interface IAnnotationFinding {
  kind: AnnotationFindingKindEnum;
  /** Info: (20260909 - Emily) 1-based */
  line: number;
  /** Info: (20260909 - Emily) 那一行 trim 過的原文;基準線用它當鍵 */
  text: string;
}

/**
 * Info: (20260909 - Emily) 把一行程式碼裡的「註解內容」抽出來;不是註解行回 null。
 * 認的形式:`// …`、`/* …`、`* …`(區塊續行)、`{/* … *\/}`(JSX)。
 * 區塊註解的續行只在 `inBlock` 時才算 —— `*` 開頭的程式碼行(乘法換行)不是註解。
 */
const commentBody = (
  trimmed: string,
  inBlock: boolean,
): { body: string; opensBlock: boolean; closesBlock: boolean } | null => {
  if (inBlock) {
    const closes = trimmed.includes("*/");
    const body = trimmed
      .replace(/^\*+\s?/, "")
      .replace(/\*\/\s*\}?\s*$/, "")
      .trim();
    return { body, opensBlock: false, closesBlock: closes };
  }
  if (trimmed.startsWith("//")) {
    return {
      body: trimmed.replace(/^\/\/+\s?/, "").trim(),
      opensBlock: false,
      closesBlock: false,
    };
  }
  const blockOpen = trimmed.match(/^\{?\s*\/\*+\s?(.*)$/);
  if (blockOpen) {
    const rest = blockOpen[1];
    const closes = rest.includes("*/");
    const body = rest.replace(/\*\/\s*\}?\s*$/, "").trim();
    return { body, opensBlock: !closes, closesBlock: closes };
  }
  return null;
};

const isRealDate = (yyyymmdd: string): boolean => {
  const year = Number(yyyymmdd.slice(0, 4));
  const month = Number(yyyymmdd.slice(4, 6));
  const day = Number(yyyymmdd.slice(6, 8));
  if (year < 2000 || year > 2099) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

/**
 * Info: (20260909 - Emily) 指令要在註解內容的**開頭**才是指令;`remove eslint-disable` 這種散文裡的提及不是。
 * 少了 `^`,文件範例裡那句 `Deprecated: (…) remove eslint-disable` 自己就會被判成檔案級停用。
 */
const ESLINT_DISABLE_ANY = /^eslint-disable(?:-next-line|-line)?\b/;
const ESLINT_DISABLE_NEXT_LINE = /^eslint-disable-next-line\b/;

/**
 * Info: (20260909 - Emily) 掃一個檔案的原始碼,回所有不合規之處。純函式,不讀檔;讀檔在測試那端。
 */
export const scanAnnotationMarkers = (source: string): IAnnotationFinding[] => {
  const findings: IAnnotationFinding[] = [];
  const lines = source.split("\n");
  let inBlock = false;
  /** Info: (20260909 - Emily) 上一個**非空**行的註解內容(給 eslint-disable 找它上面那則標記) */
  let previousBody: string | null = null;
  let previousWasBlank = false;
  /** Info: (20260909 - Emily) `/**` 自己那行是空的,標記在下一行 —— 那一行才是「一則註解的第一行」 */
  let awaitingBlockFirstLine = false;

  lines.forEach((rawLine, index) => {
    const trimmed = rawLine.trim();
    const line = index + 1;
    if (trimmed.length === 0) {
      previousWasBlank = true;
      return;
    }
    const parsed = commentBody(trimmed, inBlock);
    if (!parsed) {
      inBlock = false;
      awaitingBlockFirstLine = false;
      previousBody = null;
      previousWasBlank = false;
      return;
    }
    const { body, opensBlock, closesBlock } = parsed;
    const wasContinuation = inBlock;
    if (opensBlock) inBlock = true;
    if (closesBlock) inBlock = false;

    if (ESLINT_DISABLE_ANY.test(body)) {
      if (!ESLINT_DISABLE_NEXT_LINE.test(body)) {
        findings.push({
          kind: AnnotationFindingKindEnum.ESLINT_DISABLE_FORBIDDEN_FORM,
          line,
          text: trimmed,
        });
      } else {
        const marker = previousWasBlank
          ? null
          : previousBody?.match(ANNOTATION_MARKER_EXACT);
        const allowed =
          marker !== null &&
          marker !== undefined &&
          (ESLINT_DISABLE_MARKER_KINDS as ReadonlyArray<string>).includes(
            marker[1],
          );
        if (!allowed) {
          findings.push({
            kind: AnnotationFindingKindEnum.ESLINT_DISABLE_UNMARKED,
            line,
            text: trimmed,
          });
        }
      }
      previousBody = body;
      previousWasBlank = false;
      return;
    }

    // Info: (20260909 - Emily) 區塊註解的續行不是「一則註解的第一行」:不檢查標記,也不覆蓋 previousBody ——
    // Info: (20260909 - Emily) 一個區塊對 eslint-disable 而言就是「它第一行的那個標記」
    if (wasContinuation && !(awaitingBlockFirstLine && body.length > 0)) {
      previousWasBlank = false;
      return;
    }
    if (body.length === 0) {
      // Info: (20260909 - Emily) `/**` 這種開頭行:標記在下一行,previousBody 留給續行去填
      awaitingBlockFirstLine = opensBlock;
      previousWasBlank = false;
      return;
    }
    awaitingBlockFirstLine = false;

    const exact = body.match(ANNOTATION_MARKER_EXACT);
    if (exact) {
      if (!isRealDate(exact[2])) {
        findings.push({
          kind: AnnotationFindingKindEnum.INVALID_DATE,
          line,
          text: trimmed,
        });
      }
    } else if (!DEPRECATED_END_MARK.test(body) && MARKER_ATTEMPT.test(body)) {
      findings.push({
        kind: AnnotationFindingKindEnum.MALFORMED_MARKER,
        line,
        text: trimmed,
      });
    }
    previousBody = body;
    previousWasBlank = false;
  });

  return findings;
};

/** Info: (20260909 - Emily) 基準線的鍵:檔案路徑 + 那一行原文。行號會漂,原文不會 */
export const annotationBaselineKey = (
  file: string,
  finding: IAnnotationFinding,
): string => `${file}::${finding.kind}::${finding.text}`;
