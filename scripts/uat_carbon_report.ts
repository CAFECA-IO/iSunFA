// Info: (20260814 - Emily) 碳報告產出的自動驗收(`data/issue_drafts/open/37_carbon_output_acceptance.md`)
// Info: (20260814 - Emily) 用法:npx tsx scripts/uat_carbon_report.ts --pdf <下載的報告.pdf> [--log <server.log>] [--out snap.json] [--baseline 上一趟.json]
//
// Info: (20260814 - Emily) 為什麼要這支:08-14 之前每一輪修正的驗證都是「跑 12 分鐘匯入 → 人眼翻 57 頁」。
// Info: (20260814 - Emily) 人眼看得到最刺眼的,看不到最嚴重的 —— 「表4.8 掉了」在 57 頁裡翻不到。
// Info: (20260814 - Emily) 判準一律是**內部一致性**而不是比對某一份報告的形狀,否則換一份客戶報告就全部失效。

import fs from "node:fs";
import zlib from "node:zlib";
import { PDFDocument, PDFName, PDFRawStream } from "pdf-lib";
import { extractPdfTextLayer } from "@/lib/pdf_text_layer";
import {
  CARBON_REPORT_CHAPTERS,
  CARBON_REPORT_OUTLINE,
} from "@/constants/carbon_report_outline";
import { CARBON_CHART_DEFAULT_LABELS } from "@/lib/carbon_report_chart.builder";
/**
 * Info: (20260818 - Emily) 兩個片語 import 自產生端的常數,不在這裡重打一份正規表示式。
 * 重打的話,文案改了而這支腳本照舊回報 ✓ —— 而它是上線判準的量尺。
 */
import {
  DIAGRAM_CAP_EXCEEDED_PHRASE,
  DIAGRAM_DEGRADED_TO_TABLE_PHRASE,
} from "@/constants/carbon_report_diagrams";
import {
  BASELINE_THRESHOLD_LIMITS,
  activityDataLevel,
  classifyKey,
  normalizeUatLog,
  unmeasuredThresholdLevel,
} from "@/constants/carbon_uat_baseline";
import {
  isCompatibilityCode,
  mapCompatibilityRadical,
  parseCMapEntries,
} from "@/lib/utils/pdf_tounicode_repair";

type Level = "pass" | "fail" | "warn";

interface ICheck {
  readonly level: Level;
  readonly name: string;
  readonly detail: string;
}

const checks: ICheck[] = [];
const snapshot: Record<string, number | string | string[]> = {};

const record = (level: Level, name: string, detail: string): void => {
  checks.push({ level, name, detail });
};

/**
 * Info: (20260814 - Emily) 「應該是 0」的那一類。數量本身進快照,供下一趟比對。
 */
const expectZero = (name: string, found: readonly string[]): void => {
  snapshot[name] = found.length;
  if (found.length === 0) {
    record("pass", name, "0");
    return;
  }
  record("fail", name, `${found.length} 處:${found.slice(0, 3).join(" / ")}`);
};

/**
 * Info: (20260817 - Emily) 相容區部首要**點名是哪幾個字**,不能只給總數。
 * 給了字才知道是字型子集化的問題還是來源文字本來就髒 —— 兩者的修正端不同。
 */
const reportRadicals = (found: readonly string[]): void => {
  const counts = new Map<string, number>();
  found.forEach((char) => counts.set(char, (counts.get(char) ?? 0) + 1));
  snapshot.相容區部首 = found.length;
  snapshot.相容區部首字種 = counts.size;
  if (found.length === 0) {
    record("pass", "相容區部首(康熙部首)", "0");
    return;
  }
  const top = [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([char, count]) => `${char}→${char.normalize("NFKC")} x${count}`);
  record(
    "fail",
    "相容區部首(康熙部首)",
    `${found.length} 字、${counts.size} 種:${top.join(" ")} —— 印出來一樣,但搜尋與複製都是錯的`,
  );
};

/**
 * Info: (20260817 - Emily) 「這份 PDF 是不是本系統產出的報告」。
 *
 * 判準用大綱節數的命中數,而不是品牌字串或頁尾文案 ——
 * 那些是 i18n、由用戶端帶上來,換一個語言或換一個客戶就對不上。
 * 大綱是硬編常數(`CARBON_REPORT_OUTLINE`),我們產出的每一份都會有它。
 *
 * 門檻取 8（33 節的四分之一）的理由:
 * - 我們的產出實測**三趟都是 33/33**
 * - 客戶原檔實測 **0**（它自己的節標題是「本公司簡介」「組織邊界」，
 *   而我們的是「公司簡介與財務報告邊界」「組織邊界設定方法」，壓掉空白後不互相包含）
 *
 * 兩者差距是 33 vs 0,所以門檻放在很低的地方就夠 ——
 * 它只負責擋「拿錯檔案」,**不負責擋真缺陷**。真的只落地 5 節時,
 * 應該由「大綱有節沒出現」那一條報 ✗,而不是被這個守衛吃掉。
 */
const OUR_REPORT_MIN_OUTLINE_HITS = 8;

const assertOurReport = (text: string): boolean => {
  const squeeze = (value: string): string =>
    value.normalize("NFKC").replace(/\s+/g, "");
  const squeezed = squeeze(text);
  const hits = CARBON_REPORT_OUTLINE.filter((section) =>
    squeezed.includes(squeeze(section.title)),
  ).length;
  snapshot.大綱命中數 = hits;

  if (hits >= OUR_REPORT_MIN_OUTLINE_HITS) return true;

  record(
    "fail",
    "這份 PDF 不像本系統的產出",
    `33 節大綱只命中 ${hits} 節（門檻 ${OUR_REPORT_MIN_OUTLINE_HITS}）—— ` +
      `本腳本驗的是我們產出的 Carbon_Report_Draft_*.pdf,不是客戶的原檔。` +
      `原檔請不要餵進來:它沒有我們的大綱與目錄格式,每一項都會回報假的 ✗`,
  );
  return false;
};

/**
 * Info: (20260817 - Emily) ToUnicode CMap 的**結構**檢查（PR review A1 的驗收判準）。
 *
 * ## 為什麼文字層的檢查不夠
 *
 * 「相容區部首 0 個」是從**抽回來的文字**判的,而它與「來源側被改壞」是相容的:
 * `repairPdfToUnicode` 的第一版把 `<2F42> <6587>` 改成 `<6587> <6587>`,
 * 那條 entry 從此不指向相容區 —— 文字層看到的部首因此也是 0,
 * 而 glyph 2F42 的對照**整條消失**（那個字變成抽不出來,比抽出錯字更糟）。
 *
 * 也就是說:上面那一條 ✓ 沒有能力區分「修好了」與「改壞了」。
 * 這一段補的就是那個能力 —— 直接讀 CMap,查三個結構不變量。
 *
 * ## 三個判準
 *
 * 1. **`low <= high`**（fail）—— 端點被改寫的簽名。非法區間可能讓讀取器整張拒收,
 *    那壞掉的不是一個字,是那個字型的整張對照表。
 * 2. **目標側落在相容區 = 0**（fail）—— 修補確實生效。這一項與文字層那條互相印證:
 *    數字對不上就是其中一支壞了（實測 08-17:log 說 `replaced: 143`,
 *    修復前的 PDF 目標側相容區 143、修復後 0 —— 三個數字咬得起來）。
 * 3. **來源側落在相容區 = 0**（warn，不是 fail）—— 這一項不是缺陷,是**前提失效的警報**。
 *    Chrome/Skia 目前對 subset 字型重新編號成小 CID（實測兩份真報告的來源側最大
 *    CID 都是 0x85B = 2139，整個 0x2E80–0x2FDF 窗口在 CID 範圍之外），
 *    所以來源側今天不可能被誤判成相容區碼位。哪天這個數字不是 0,
 *    表示換了字型嵌入方式（例如 Identity-H 保留原 glyph id），
 *    「只改目標側」的保證必須重新實測 —— 那時要有人看到這行,而不是等使用者回報。
 *
 * 讀的是 `parseCMapEntries` —— 產品自己在改寫時用的那一支 parser,不是另寫一份。
 * 自己另寫的那一版在 08-17 回報過「25 個非法區間」的**假警報**（regex 跨 entry 配對），
 * 而真正的答案是 0。驗證的工具自己壞掉時，它會很有說服力地指著錯的地方。
 */
const CMAP_HINTS = ["beginbfchar", "beginbfrange"] as const;

const decodeStream = (stream: PDFRawStream): string | null => {
  const filter = stream.dict.get(PDFName.of("Filter"));
  try {
    const raw = Buffer.from(stream.contents);
    const bytes =
      filter !== undefined && String(filter).includes("FlateDecode")
        ? zlib.inflateSync(raw)
        : raw;
    return bytes.toString("latin1");
  } catch {
    // Info: (20260817 - Emily) 解不開的串流不是缺陷（影像、字型檔都在這裡），跳過
    return null;
  }
};

const checkCMaps = async (bytes: Buffer): Promise<void> => {
  let document: PDFDocument;
  try {
    document = await PDFDocument.load(bytes);
  } catch (error) {
    record(
      "warn",
      "ToUnicode CMap 結構",
      `讀不開這份 PDF 的物件表(${error instanceof Error ? error.message : "未知"}) —— 這一項略過,文字層的判定不受影響`,
    );
    return;
  }

  let streams = 0;
  let entries = 0;
  let sourceMax = -1;
  const illegal: string[] = [];
  const sourceCompat: string[] = [];
  const destinationCompat: string[] = [];
  // Info: (20260817 - Luphia) 相容區但無對照可用 —— 是「表要長大」的清單，不是修補失效
  const destinationUnmapped: string[] = [];

  document.context.enumerateIndirectObjects().forEach(([, object]) => {
    if (!(object instanceof PDFRawStream)) return;
    const text = decodeStream(object);
    if (text === null) return;
    if (!CMAP_HINTS.some((hint) => text.includes(hint))) return;
    streams += 1;

    parseCMapEntries(text).forEach((entry) => {
      entries += 1;
      const sources =
        entry.kind === "bfchar" ? [entry.source] : [entry.low, entry.high];
      sources.forEach((code) => {
        sourceMax = Math.max(sourceMax, code);
        if (isCompatibilityCode(code)) {
          sourceCompat.push(`U+${code.toString(16).toUpperCase()}`);
        }
      });
      if (entry.kind === "bfrange" && entry.low > entry.high) {
        illegal.push(
          `<${entry.low.toString(16).toUpperCase()}> > <${entry.high
            .toString(16)
            .toUpperCase()}>`,
        );
      }
      entry.destinations.forEach((token) => {
        if (token.hex.length !== 4) return;
        const code = parseInt(token.hex, 16);
        if (!isCompatibilityCode(code)) return;
        /**
         * Info: (20260817 - Luphia) 依「有沒有對照可用」分流（PR review 的追加項）。
         *
         * `repairPdfToUnicode` 刻意不碰沒有對照的碼位（U+2EA1 那種變體部首，
         * 猜錯是把字改成別的字，比搜不到更糟）。那些碼位因此會留在成品裡 ——
         * 把它們算進「修補確實生效」那一項，會讓一份**修補完全正常**的報告被判 ✗，
         * 而診斷指向錯的方向：該做的是確認字形後把它加進 `SUPPLEMENT_MAP`，
         * 不是去查修補為什麼沒生效。
         *
         * 分流之後兩邊的下一步各自明確，也不會讓這支開始亂叫 ——
         * 手法與上面來源側的 warn/fail 分流相同。
         */
        if (mapCompatibilityRadical(code) === null) {
          destinationUnmapped.push(`U+${token.hex.toUpperCase()}`);
          return;
        }
        destinationCompat.push(`U+${token.hex.toUpperCase()}`);
      });
    });
  });

  snapshot.CMap串流數 = streams;
  snapshot.CMap條目數 = entries;
  snapshot.CMap來源側最大碼 = sourceMax;

  if (streams === 0) {
    record(
      "warn",
      "ToUnicode CMap 結構",
      "找不到任何 CMap 串流 —— 若文字層抽得出中文,表示這支的解碼漏了某種串流形式,要查",
    );
    return;
  }

  record(
    "pass",
    "ToUnicode CMap 讀取",
    `${streams} 個串流、${entries} 筆條目,來源側最大碼 0x${sourceMax
      .toString(16)
      .toUpperCase()}`,
  );

  expectZero("CMap 非法區間(lo>hi)", illegal);
  // Info: (20260817 - Luphia) 有對照卻還留在相容區 = 修補真的沒生效,這一項維持 fail
  expectZero("CMap 目標側落在相容區", destinationCompat);

  snapshot["CMap 目標側無對照"] = destinationUnmapped.length;
  if (destinationUnmapped.length === 0) {
    record("pass", "CMap 目標側無對照", "0");
  } else {
    record(
      "warn",
      "CMap 目標側無對照",
      `${destinationUnmapped.length} 處(${[...new Set(destinationUnmapped)]
        .slice(0, 5)
        .join(" ")})—— 這些字沒有對照可用,` +
        "確認字形相同後加進 SUPPLEMENT_MAP;修補本身是正常的",
    );
  }

  snapshot["CMap 來源側落在相容區"] = sourceCompat.length;
  if (sourceCompat.length === 0) {
    record(
      "pass",
      "CMap 來源側落在相容區",
      "0 —— 來源側是 subset CID,與相容區窗口不重疊,「只改目標側」的前提成立",
    );
  } else {
    record(
      "warn",
      "CMap 來源側落在相容區",
      `${sourceCompat.length} 筆(${[...new Set(sourceCompat)]
        .slice(0, 5)
        .join(" ")})—— 字型嵌入方式變了,` +
        "repairPdfToUnicode 只改目標側的保證要重新實測,不能沿用 08-17 的結論",
    );
  }
};

const arg = (flag: string): string | undefined => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

// Info: (20260814 - Emily) 私有區:Word 符號字型的字落在這裡,任何一個出現在成品上都是漏換
const isPrivateUse = (char: string): boolean => {
  const code = char.codePointAt(0) ?? 0;
  return code >= 0xe000 && code <= 0xf8ff;
};
/**
 * Info: (20260817 - Emily) 相容區部首:`⽂`(U+2F42)長得跟 `文`(U+6587) 一模一樣,
 * 但那是「康熙部首」區的字,只該出現在字典裡解釋部首時。
 *
 * 它印在紙上看不出來,可是 Ctrl+F 搜「文件」搜不到「⽂件」,複製出去也是錯的字。
 * 這是**看不見的靜默失敗**,跟私有區符號同一族,所以放在一起檢查。
 *
 * 兩個區段:U+2E80–U+2EFF(CJK 部首補充)、U+2F00–U+2FDF(康熙部首)。
 */
const isCompatibilityRadical = (char: string): boolean => {
  const code = char.codePointAt(0) ?? 0;
  return (
    (code >= 0x2e80 && code <= 0x2eff) || (code >= 0x2f00 && code <= 0x2fdf)
  );
};
// Info: (20260814 - Emily) markdown 逸出字元外洩(轉換沒吃掉,直接印在紙上)
const ESCAPE_LEAK = /\\[\\`*_[\]#|]/g;
// Info: (20260814 - Emily) mermaid 語法印成文字 = 圖沒被渲染,而版面看起來還算正常
const MERMAID_LEAK = /(sankey-beta|graph (TD|LR)\b|flowchart (TD|LR)\b|%%\{)/g;
/**
 * Info: (20260814 - Emily) 內文引用表號:`如表 3.1`、`見表3.1`、`表 3.1 所示`。
 *
 * 後面不得再接數字或點 —— 否則「排放係數管理表 6.0.4 版」會被當成「表6.0」,
 * 然後回報「內文引用的表6.0 不存在」。這是本專案第三次被 `6.0.4` 咬到。
 */
const TABLE_REFERENCE = /表\s?(\d+\.\d+)(?![\d.])/g;
/** Info: (20260814 - Emily) 表的標題行:行首的 `表3.1 <標題>` */
const TABLE_CAPTION = /^\s*表(\d+\.\d+)\s+\S/gm;
/**
 * Info: (20260814 - Emily) 圖表未繪製的說明,三種原因要分得開。
 *
 * Info: (20260818 - Emily) 08-18 起「節點太多」不再是未繪製,而是**退化成表格**
 * （`data/issue_drafts/open/48_diagram_silent_failure.md`）。所以這裡分成兩件事:
 *
 * - `未繪製` 那句話再出現就是 **fail** —— 退化沒接上,而內容在紙上不見了
 * - `改以表格呈現` 是退化生效的痕跡,計數但不算缺陷（它是這張票的驗收憑證）
 *
 * 判準寫成兩條而不是把舊那條的 level 改掉,是因為兩者要能在同一份報告上分辨:
 * 只看「超過本圖的繪製上限」出現幾次的話,退化成功與整張消失是同一個數字。
 */
const DIAGRAM_NOTES: ReadonlyArray<{
  pattern: RegExp;
  meaning: string;
  level: Level;
}> = [
  { pattern: /本節內容不足以繪製結構圖/g, meaning: "素材不足", level: "warn" },
  {
    pattern: /無法回溯至本節原文/g,
    meaning: "無法回溯原文(疑似模型編造)",
    level: "warn",
  },
  {
    pattern: new RegExp(`${DIAGRAM_CAP_EXCEEDED_PHRASE}[^)）]*未繪製`, "g"),
    meaning: "節點太多且整張消失",
    level: "fail",
  },
];

/** Info: (20260818 - Emily) 退化成表格的痕跡 —— 出現代表 open/48 的修正在這一趟生效了 */
const DIAGRAM_DEGRADED = new RegExp(
  `${DIAGRAM_CAP_EXCEEDED_PHRASE}[^)）]*${DIAGRAM_DEGRADED_TO_TABLE_PHRASE}`,
  "g",
);

/**
 * Info: (20260818 - Emily) 分類表的守門:快照有鍵沒被分類就 fail。
 *
 * 這一週三次「清單短了」的共同成因是**清單沒有被機械化**
 * (`44` 說 8 條實際 16 處、`48` 漏了排序那個洞、B2 說三端實際四端)。
 * 一張手寫的分類表會用完全一樣的方式過期:有人加了一個快照鍵,而它悄悄落進
 * 「沒有人在判」的縫裡。這條讓那件事變成紅的。
 */
const checkSnapshotClassification = (): void => {
  const unclassified = Object.keys(snapshot).filter(
    (key) => classifyKey(key) === undefined,
  );
  if (unclassified.length === 0) {
    record(
      "pass",
      "快照鍵全部已分類",
      `${Object.keys(snapshot).length} 個鍵,三層分類無遺漏`,
    );
    return;
  }
  record(
    "fail",
    "快照有未分類的鍵",
    `${unclassified.join("、")} —— 加進 BASELINE_TIERS 並決定它屬於哪一層`,
  );
};

/**
 * Info: (20260818 - Emily) B4:每一趟各自過閾值,不要求兩趟相同。
 * 三段判定(pass / warn / fail)的理由見 `BASELINE_THRESHOLD_LIMITS` 的註解 ——
 * 把 fail 線畫在票自己允許的區間中間,會讓正常的一趟被判 fail。
 */
const checkThresholds = (): void => {
  BASELINE_THRESHOLD_LIMITS.forEach(
    ({ key, passAtOrBelow, failAbove, unit }) => {
      const value = snapshot[key];
      if (typeof value !== "number") {
        /**
         * Info: (20260818 - Emily) 量不到就不能算過。而**有 `--baseline` 代表這是驗收趟**,
         * 那時沒判 B4 就是 fail —— 08-18 實跑那兩趟 exit 0 而 B4 兩個門檻都沒判,
         * 綠燈蓋住了兩個沒被檢查的閘門項目(理由見 `unmeasuredThresholdLevel`)。
         */
        const hasLog = arg("--log") !== undefined;
        const hasBaseline = arg("--baseline") !== undefined;
        record(
          unmeasuredThresholdLevel({ hasBaseline, hasLog }),
          `B4 閾值:${key}`,
          hasLog
            ? `log 裡沒有 ${key} —— ${hasBaseline ? "驗收趟必須判 B4,請確認這份 log 涵蓋整趟匯入" : "這一層沒判"}`
            : `本趟沒有 --log${hasBaseline ? " —— 有 --baseline 代表這是驗收趟,B4 必須判" : ",這一層沒判"}`,
        );
        return;
      }
      if (value <= passAtOrBelow) {
        record(
          "pass",
          `B4 閾值:${key}`,
          `${value} ${unit}(目標 ≤ ${passAtOrBelow}）`,
        );
        return;
      }
      if (value <= failAbove) {
        record(
          "warn",
          `B4 閾值:${key}`,
          `${value} ${unit} —— 超過目標 ${passAtOrBelow} 但在容許上限 ${failAbove} 內,能定價,記一筆`,
        );
        return;
      }
      record(
        "fail",
        `B4 閾值:${key}`,
        `${value} ${unit} —— 超過容許上限 ${failAbove}`,
      );
    },
  );
};

const main = async (): Promise<void> => {
  const pdfPath = arg("--pdf");
  if (!pdfPath) {
    process.stdout.write(
      "用法:npx tsx scripts/uat_carbon_report.ts --pdf <報告.pdf> [--log <server.log>] [--out snap.json] [--baseline 上一趟.json]\n",
    );
    process.exit(2);
  }

  /**
   * Info: (20260814 - Emily) 用產品自己的抽取器,不另接一支。
   * 兩支抽取器遲早會分岔,而分岔的那天驗收會說「沒問題」而使用者看到問題。
   */
  const bytes = fs.readFileSync(pdfPath);
  const extracted = await extractPdfTextLayer(bytes);
  if (!extracted) {
    record("fail", "文字層", "抽不出文字層 —— 這份 PDF 不可搜尋");
    report();
    return;
  }
  /**
   * Info: (20260817 - Emily) 兩份文字,用途分開,不能只留一份:
   *
   * - `raw`  —— 原封不動,只給「碼位對不對」那一類檢查用(私有區、相容區部首)
   * - `text` —— NFKC 正規化後,給所有「內容對不對」的檢查用
   *
   * 為什麼一定要正規化:相容區部首會讓**其他每一條檢查失明**。
   * 實測 08-17:未正規化時「本節內容不足以繪製結構圖」查不到,因為 `足` 在紙上是
   * `⾜`(U+2F9C);修好碼位後同一份 PDF 立刻多報一處。
   * 也就是說,在修掉部首外洩之前,這支腳本自己回報的每一個 ✓ 都只是「查不到」。
   */
  const raw = extracted.text;
  const text = raw.normalize("NFKC");
  snapshot.pages = extracted.pages;
  snapshot.chars = text.length;
  record("pass", "頁數／字元數", `${extracted.pages} 頁 / ${text.length} 字元`);

  /**
   * Info: (20260817 - Emily) 先確認這是**本系統產出的報告**,再開始判定。
   *
   * 08-17 實際發生:把腳本指到客戶的原檔
   * (`高興昌鋼鐵股份有限公司溫室氣體盤查報告書.pdf`)而不是我們產出的
   * `Carbon_Report_Draft_*.pdf`。那會讓 12 項判定全部回報 ✗ ——
   * 而每一個 ✗ 都是假的,真正的問題只有一句「拿錯檔案」。
   *
   * **一支會亂叫的驗收腳本,沒有人會再看它。** 擋掉錯的輸入比多報幾個缺陷重要。
   */
  if (!assertOurReport(text)) {
    report(2);
    return;
  }

  // Info: (20260814 - Emily) ── 靜默失敗:沒有錯誤訊息、版面正常、內容是錯的 ──
  expectZero("私有區符號", [...raw].filter(isPrivateUse));
  reportRadicals([...raw].filter(isCompatibilityRadical));
  /**
   * Info: (20260817 - Emily) 上一行判的是抽回來的**文字**,這一行判 CMap 的**結構**。
   * 兩者不可互相取代:文字層那條沒有能力區分「修好了」與「來源側被改壞了」。
   */
  await checkCMaps(bytes);
  expectZero("反斜線逸出外洩", text.match(ESCAPE_LEAK) ?? []);
  expectZero("mermaid 語法外洩", text.match(MERMAID_LEAK) ?? []);
  expectZero("待補佔位符", text.match(/待補/g) ?? []);
  expectZero("資料不足佔位符", text.match(/資料不足/g) ?? []);

  // Info: (20260814 - Emily) ── 圖表沒畫要指名是哪一節,而且三種原因要分開 ──
  DIAGRAM_NOTES.forEach(({ pattern, meaning, level }) => {
    const hits = text.match(pattern) ?? [];
    snapshot[`圖表未繪製_${meaning}`] = hits.length;
    if (hits.length === 0) {
      // Info: (20260818 - Emily) fail 級的那條要正面報 ✓,不然「沒出現」在輸出上看不見
      if (level === "fail") record("pass", `圖表未繪製(${meaning})`, "0");
      return;
    }
    record(
      level,
      `圖表未繪製(${meaning})`,
      level === "fail"
        ? `${hits.length} 處 —— 退化成表格沒有生效,那幾節的內容在紙上不見了`
        : `${hits.length} 處 —— 需確認那一節是否真的該有圖`,
    );
  });

  /**
   * Info: (20260818 - Emily) 退化計數。它不是缺陷,而是 `open/48` 的驗收憑證:
   * 08-17 那一趟有 2 節整張消失（沿革 62 個、委員會 21 個）,
   * 修好之後同樣的輸入應該變成 2 次退化 + 0 次消失。
   */
  const degraded = text.match(DIAGRAM_DEGRADED) ?? [];
  snapshot.圖表退化成表格 = degraded.length;
  record(
    "pass",
    "圖表退化成表格",
    degraded.length === 0
      ? "0 —— 這一趟沒有任何一節超過繪製上限"
      : `${degraded.length} 處 —— 超過上限但內容以表格保留在紙上(補而不丟)`,
  );

  // Info: (20260814 - Emily) ── 內文引用的表都要存在(實際發生過:內文寫「如表 3.1」而表被丟掉) ──
  const referenced = new Set(
    [...text.matchAll(TABLE_REFERENCE)].map((match) => match[1]),
  );
  const captioned = new Set(
    [...text.matchAll(TABLE_CAPTION)].map((match) => match[1]),
  );
  const missing = [...referenced].filter((no) => !captioned.has(no)).sort();
  snapshot.引用的表號 = referenced.size;
  snapshot.有標題的表 = captioned.size;
  snapshot.引用但不存在的表 = missing;
  if (missing.length === 0) {
    record(
      "pass",
      "內文引用的表都存在",
      `引用 ${referenced.size} 個、落地 ${captioned.size} 個`,
    );
  } else {
    record(
      "fail",
      "內文引用的表不存在",
      `缺 ${missing.map((no) => `表${no}`).join("、")}`,
    );
  }

  // Info: (20260814 - Emily) ── 大綱的每一節都要有標題出現在紙上 ──
  /**
   * Info: (20260814 - Emily) 比對前先壓掉所有空白與儲存格分隔。
   *
   * 抽取器會在文字裡插入 `\t`（儲存格）與換行，於是「報告目的與主要使用者」
   * 在文字層裡可能是「報告目的與主要\n使用者」—— 直接 includes 會全部落空。
   * 第一版沒壓，結果 8 節被誤報為「沒出現」。
   */
  const squeeze = (value: string): string =>
    value.normalize("NFKC").replace(/\s+/g, "");
  const squeezed = squeeze(text);
  const absentSections = CARBON_REPORT_OUTLINE.filter(
    (section) => !squeezed.includes(squeeze(section.title)),
  ).map((section) => `${section.code} ${section.title}`);
  snapshot.大綱節數 = CARBON_REPORT_OUTLINE.length;
  snapshot.未出現的節 = absentSections;
  if (absentSections.length === 0) {
    record(
      "pass",
      "大綱節數",
      `${CARBON_REPORT_OUTLINE.length}/${CARBON_REPORT_OUTLINE.length} 節都在`,
    );
  } else {
    record(
      "fail",
      "大綱有節沒出現",
      `${absentSections.length} 節:${absentSections.slice(0, 3).join(" / ")}`,
    );
  }

  // Info: (20260819 - Emily) ── 標題不能被印兩次 ──
  /**
   * Info: (20260819 - Emily) 08-19 在兩份實跑報告上量到:第五、第六章的標題連續印了
   * 兩行完全相同的字,而第七章 run1 正常、run2 重複 —— 兩趟不一致,
   * 而 `compareBaseline` 報「must_match 差異 0 項」。
   *
   * 判準蓋不住它要守的東西:上面「大綱的每一節都要有標題出現在紙上」擋得住**少印**,
   * 擋不住**多印**。這是本週第六處靜默給綠燈。
   *
   * 只認兩件事,兩邊都是為了不讓判準比它要守的東西寬:
   * 1. 只認**大綱與章的標題**字串 —— 表格列本來就可能出現相同內容,
   *    用「任何連續重複的行」會把它們一起抓進來。
   * 2. 只認**緊鄰**的重複 —— 目錄那一條和正文那一條本來就會是同一串字,
   *    用全文計數會把目錄算成缺陷。
   */
  const headingStrings = new Set<string>([
    ...CARBON_REPORT_CHAPTERS.map((chapter) => squeeze(chapter.title)),
    ...CARBON_REPORT_OUTLINE.map((section) =>
      squeeze(`${section.code} ${section.title}`),
    ),
  ]);
  const nonEmptyLines = text
    .split("\n")
    .map((line) => squeeze(line))
    .filter((line) => line.length > 0);
  const repeatedHeadings = [
    ...new Set(
      nonEmptyLines.filter(
        (line, index) =>
          index > 0 &&
          line === nonEmptyLines[index - 1] &&
          headingStrings.has(line),
      ),
    ),
  ];
  snapshot.重複的標題 = repeatedHeadings;
  if (repeatedHeadings.length === 0) {
    record(
      "pass",
      "標題沒有被印兩次",
      `${headingStrings.size} 個標題字串都只印一次`,
    );
  } else {
    record(
      "fail",
      "標題被印兩次",
      `${repeatedHeadings.length} 處:${repeatedHeadings.slice(0, 3).join(" / ")}`,
    );
  }

  // Info: (20260819 - Emily) ── 節標題被重印:系統標題之後緊接原文自己的標題 ──
  /**
   * Info: (20260819 - Emily) `open/36`。與上面「重複的標題」是**不同形狀**:
   * 那條是同一個字串連印兩行,這條是系統大綱標題之後緊接原文自己的標題
   * (例:`1.3 氣候與永續政策聲明` 下一行 `1.3政策聲明`)。
   *
   * ## 為什麼是 record_only 而不是 must_match
   *
   * `36` 卡在立場決定(保系統標題還是保原文標題),延到 post-launch。
   * 08-19 實測兩趟是 12 與 13 處,而且**集合不同**(run1 有 9.2,run2 有 1.1/1.3)——
   * 列進 `must_match` 會讓「兩趟一致」在 `36` 修好之前永遠過不了,
   * 那正是 `carbon_uat_baseline.ts` 對 `open/47` 寫過的理由。
   * `36` 修好之後再升層。
   *
   * ## 兩個鍵而不是一個
   *
   * `節標題重印` 是 A2(只剝掉重複的節號前綴)修得掉的那一半。
   * `節標題重印_剝號後仍同文` 是 A2 **修不掉**的那一半 —— 原文標題剝掉號之後
   * 與系統標題互相包含(`1.5 組織邊界` vs `組織邊界設定方法`、
   * `3.1 溫室氣體排放量計算說明` 兩邊完全相同),讀者看到的還是同一句話印兩次。
   * 08-19 實測 5 與 6 處。分兩個鍵,判準才能活過那次修正 ——
   * 只記總數的話,A2 上線後數字掉一半,看起來像修好了。
   *
   * 子節不算重印:`1.1` 之後的 `1.1.1 公司名稱` 是正常的階層,不是同一個標題印兩次。
   */
  const numberedSections = CARBON_REPORT_OUTLINE.filter((section) =>
    /^\d+\.\d+$/.test(section.code),
  );
  const reprintedHeadings: string[] = [];
  const reprintedStillSameText: string[] = [];
  numberedSections.forEach((section) => {
    const heading = squeeze(`${section.code} ${section.title}`);
    const code = squeeze(section.code);
    const at = nonEmptyLines.indexOf(heading);
    if (at < 0) return;
    for (let j = at + 1; j < Math.min(at + 4, nonEmptyLines.length); j += 1) {
      const line = nonEmptyLines[j];
      // Info: (20260819 - Emily) 同一字串連印兩行是上一條判準的事,這裡跳過
      if (line === heading) continue;
      if (!line.startsWith(code) || line.length === code.length) continue;
      const rest = line.slice(code.length);
      // Info: (20260819 - Emily) `.數字` = 子節編號,不是標題重印(否定前瞻的等價寫法)
      if (/^\.\d/.test(rest)) break;
      reprintedHeadings.push(section.code);
      const title = squeeze(section.title);
      if (title.includes(rest) || rest.includes(title)) {
        reprintedStillSameText.push(section.code);
      }
      break;
    }
  });
  snapshot.節標題重印 = reprintedHeadings;
  snapshot.節標題重印_剝號後仍同文 = reprintedStillSameText;
  record(
    reprintedHeadings.length === 0 ? "pass" : "warn",
    "節標題重印(open/36,不擋上線)",
    `${reprintedHeadings.length}/${numberedSections.length} 節重印,其中 ${reprintedStillSameText.length} 節剝號後仍與系統標題同文`,
  );

  // Info: (20260819 - Emily) ── 紙面上不得宣告別的揭露框架 ──
  /**
   * Info: (20260819 - Emily) `open/44` / `open/54` 的**紙面側**判準。
   *
   * 08-18 之後 guidance 那一側已經是 0/33 節(由 `carbon_report_outline.test.ts` 守),
   * 但那條測試看的是 constants,看不到紙。模型可以在別的地方寫出這些字
   * (原文引用、自行補的參考文獻、AI 自己的框架句),而那才是客戶拿到的東西。
   * 修正端與生效端要分清楚 —— 這一條守生效端。
   *
   * ## 為什麼只列框架名稱
   *
   * 只列揭露框架的**專有名稱**。08-19 量過客戶原文:`財務` 出現 58 次
   * (例如財務控制法,是 ISO 14064-1 自己的合併方法用語),
   * 所以拿「財務」「投資人」「股東」當判準會比它要守的東西寬 ——
   * 那些詞在一份合法的 ISO 盤查報告裡本來就可能出現。
   * 這裡守的是「宣告了哪個框架」,不是「用了哪些字」。
   *
   * 已驗:這五個字串在客戶原文與兩份 08-18 產出裡都是 0 次
   * (`GRID` 也是 0,所以 `GRI` 沒有子字串誤判的風險)。
   *
   * ## 什麼時候要改
   *
   * `open/54` 的框架選擇落地之後,這一條要改成依所選框架分流:
   * 選 IFRS 的產出**應該**出現 IFRS,而且未到期時必須有免責敘述。
   * 屆時把這裡換成 `checkFrameworkConsistency(framework)`。
   */
  const FOREIGN_FRAMEWORKS = ["IFRS", "TCFD", "SASB", "GRI", "CDP"];
  expectZero(
    "紙上宣告別的揭露框架",
    FOREIGN_FRAMEWORKS.filter((name) => squeezed.includes(name)),
  );

  // Info: (20260819 - Emily) ── 桑基圖要嘛在紙上,要嘛紙上說明它為什麼不在 ──
  /**
   * Info: (20260819 - Emily) 判準讀 `CARBON_CHART_DEFAULT_LABELS` 而不是自己寫字串。
   * 自己寫一份的話,哪天有人改了圖說,這條會繼續綠著而紙上已經不同了(本尊,不是替身)。
   *
   * 「有圖」或「有說明為什麼沒圖」二者之一即可 —— 帳本沒有可用數據時
   * 圖畫不出來是正確行為,但**不能無聲**。與 `open/48` 的退化判準同一個原則:
   * 失敗要留下痕跡。兩者都沒有才是缺陷。
   */
  const sankeyTitle = squeeze(
    CARBON_CHART_DEFAULT_LABELS.importedSankeyTitle ?? "",
  );
  const sankeyNoLedger = squeeze(
    CARBON_CHART_DEFAULT_LABELS.importedSankeyNoLedger ?? "",
  );
  const sankeyPresent =
    sankeyTitle.length > 0 && squeezed.includes(sankeyTitle);
  const sankeyExplained =
    sankeyNoLedger.length > 0 && squeezed.includes(sankeyNoLedger);
  expectZero(
    "桑基圖既不在紙上也沒說明",
    sankeyPresent || sankeyExplained
      ? []
      : ["排放流向圖與其缺席說明都不在紙上"],
  );

  // Info: (20260819 - Emily) ── 紙上出現「範疇」就必須有範疇↔類別的對照說明 ──
  /**
   * Info: (20260819 - Emily) `open/53`。敘述採 ISO 類別制而系統圖表標範疇制,
   * 兩邊各自都對、中間對不上。08-19 量到一份宣告依 ISO 14064-1 編製的報告裡
   * 「範疇」出現 77 次,其中至少 72 次是系統自己印的(客戶原文全文只有 5 次)。
   *
   * 判準不是「不准出現範疇」—— 那會要求把圖表改成類別制,而那要改分組鍵
   * (多個 GHG 類別對到同一個 ISO 類別),不是這一版的範圍。
   * 判準是**出現就要有對照說明**:隱藏的分類判斷等於沒有依據。
   *
   * `open/53` 真修之後這條要改成「不得出現範疇」。
   */
  const isoMappingNote = squeeze(
    CARBON_CHART_DEFAULT_LABELS.importedSankeyIsoMapping ?? "",
  );
  const scopeWordAppears = squeezed.includes("範疇");
  expectZero(
    "紙上有範疇卻沒有類別對照說明",
    scopeWordAppears &&
      !(isoMappingNote.length > 0 && squeezed.includes(isoMappingNote))
      ? ["缺少範疇↔類別對照說明"]
      : [],
  );

  // Info: (20260814 - Emily) ── 目錄的每一條要對得上實體頁(頁碼是量測出來的,所以可以反查) ──
  checkToc(text);

  // Info: (20260814 - Emily) ── 行結構:標記黏在同一行 = 整份清單擠成一段文字牆 ──
  checkLineStructure(text);

  const logPath = arg("--log");
  // Info: (20260817 - Emily) 把紙上的文字一起交給 log 側 —— 交叉比對需要兩邊
  /**
   * Info: (20260818 - Emily) 先正規化格式。Next.js 16 的 `.next/dev/logs/next-development.log`
   * 是 JSON-lines 且引號轉義,直接餵進來會讓每一條帶引號的判準靜默回 0
   * （理由見 `normalizeUatLog`）。
   */
  if (logPath) {
    checkLog(normalizeUatLog(fs.readFileSync(logPath, "utf-8")), text);
  }

  report();
};

/**
 * Info: (20260814 - Emily) 目錄逐條對實體頁。
 *
 * 判準是「目錄說的那一頁,實際上放的是不是那一節」——
 * 不是「頁碼等於某個固定值」。後者換一份報告就全錯。
 */
const splitPages = (text: string): string[] => text.split(/-- p\.\d+\/\d+ --/);

/**
 * Info: (20260817 - Emily) 只從**目錄區**收條目,不要掃全文。
 *
 * 第一版掃全文,結果 25 條「目錄對不上」全部是正文裡的表格列:
 * `3.1 上游運輸 產品運輸(海) 1 \t1 \t… \t8` 的形狀跟目錄行一模一樣
 * (編號開頭、空白結尾接一個數字),於是被當成「目錄說 3.1 在第 8 頁」。
 *
 * 兩條結構性的判準,都不綁特定報告:
 * 1. 目錄行指向的頁,一定在它自己所在的實體頁**之後**(目錄印在正文前面)
 * 2. 目錄是**連續**的 —— 中間不會隔七頁再冒出一條
 *
 * 這兩條讓第 9 頁那張表的 `3.1 … 8` 立刻出局(9 不小於 8,而且離目錄七頁遠)。
 */
const collectTocEntries = (
  text: string,
): ReadonlyArray<{ code: string; page: number }> => {
  const markers = [...text.matchAll(/-- p\.(\d+)\/\d+ --/g)].map(
    (match) => match.index ?? 0,
  );
  const physicalPageOf = (position: number): number => {
    const passed = markers.findIndex((start) => position < start);
    return passed === -1 ? markers.length + 1 : passed + 1;
  };

  const accepted: Array<{ code: string; page: number }> = [];
  let lastPhysical = 0;
  for (const match of text.matchAll(
    /^\s*(\d+\.\d+)\s+(\S[^\n]*?)\s{2,}(\d+)\s*$/gm,
  )) {
    const physical = physicalPageOf(match.index ?? 0);
    const page = Number(match[3]);
    if (physical >= page) break;
    if (lastPhysical !== 0 && physical > lastPhysical + 1) break;
    accepted.push({ code: match[1], page });
    lastPhysical = physical;
  }
  return accepted;
};

const checkToc = (text: string): void => {
  /**
   * Info: (20260814 - Emily) 用抽取器自己植入的 `-- p.N/總頁 --` 標記分頁,
   * 不要用 `\f` —— 那是 pdftotext 的產物,而這支走的是產品的抽取器。
   * 第一版寫成 `\f` 的結果是 48 條目錄全部「對不上」,而報告其實是對的。
   */
  const pages = splitPages(text);
  const entries = collectTocEntries(text);

  if (entries.length === 0) {
    record("warn", "目錄", "找不到目錄條目 —— 可能沒有產生目錄");
    snapshot.目錄條目 = 0;
    return;
  }

  const wrong = entries.filter((entry) => {
    const page = pages[entry.page - 1];
    return (
      page === undefined || !new RegExp(`^\\s*${entry.code}\\s`, "m").test(page)
    );
  });
  snapshot.目錄條目 = entries.length;
  snapshot.目錄對不上的條目 = wrong.map(
    (entry) => `${entry.code}→p${entry.page}`,
  );
  if (wrong.length === 0) {
    record(
      "pass",
      "目錄頁碼",
      `${entries.length}/${entries.length} 對得上實體頁`,
    );
  } else {
    record(
      "fail",
      "目錄頁碼對不上",
      `${wrong.length} 條:${snapshot.目錄對不上的條目.slice(0, 4).join(" ")}`,
    );
  }
};

/**
 * Info: (20260814 - Emily) 行結構。
 *
 * 這裡量的是**比例**而不是絕對數:一份報告有幾個項目符號取決於原文,
 * 但「黏在同一行的比例」在任何一份報告上都該接近 0。
 */
const checkLineStructure = (text: string): void => {
  const lines = text.split("\n");
  const MARKERS: ReadonlyArray<{
    name: string;
    test: (line: string) => number;
  }> = [
    {
      name: "項目符號",
      test: (line) => (line.match(/[●■◆▪•➢]/g) ?? []).length,
    },
    {
      name: "括號序號",
      test: (line) => (line.match(/[(（]\d{1,2}[)）]/g) ?? []).length,
    },
    {
      name: "標籤冒號",
      test: (line) => {
        const labels = [...line.matchAll(/([^\s:：]{2,8})[:：]/g)].map(
          (match) => match[1],
        );
        const counts = new Map<string, number>();
        labels.forEach((label) =>
          counts.set(label, (counts.get(label) ?? 0) + 1),
        );
        return Math.max(0, ...counts.values());
      },
    },
  ];

  MARKERS.forEach(({ name, test }) => {
    const glued = lines.filter((line) => test(line) >= 3).length;
    snapshot[`黏在一行_${name}`] = glued;
    if (glued === 0) {
      record("pass", `行結構(${name})`, "沒有黏成一行的清單");
    } else {
      record(
        "warn",
        `行結構(${name})`,
        `${glued} 行有 3 個以上同族標記 —— 可能是整份清單擠在一行`,
      );
    }
  });
};

/**
 * Info: (20260814 - Emily) log 側。PDF 看不出來的都在這裡:
 * 丟了幾張表、影像頁送到哪幾章、活動數據抽到幾筆、圖為什麼沒畫。
 */
const checkLog = (log: string, text?: string): void => {
  const count = (pattern: RegExp): number => (log.match(pattern) ?? []).length;

  const dropped = [
    ...log.matchAll(/source table dropped.*?"tableNo":"([^"]+)"/g),
  ].map((match) => match[1]);
  snapshot.log_丟表 = dropped;
  if (dropped.length === 0) {
    record("pass", "log:原文表格被丟", "0 張");
  } else {
    record(
      "fail",
      "log:原文表格被丟",
      `${dropped.length} 張:${dropped.join("、")}`,
    );
  }

  /**
   * Info: (20260818 - Emily) **整批被丟**的那條路徑,原本這支腳本讀不到。
   *
   * `report_import.service.ts` 有兩條丟表的 log:
   *
   * | 行 | 訊息 | 內容 | 這支腳本 |
   * | --- | --- | --- | --- |
   * | 1057 | `source table dropped`（**單數**） | 逐張被拒,有 `tableNo` | ✅ 上面那段 |
   * | 1128 | `source table`**s**` dropped`（**複數**） | `validateSourceTables` 的數量上限,整段的表一起丟,**沒有 tableNo** | ❌ 讀不到 |
   *
   * 複數那條的註解寫著「逐張過關後仍要驗數量上限(單張檢查看不到總數)」——
   * 也就是說它是**每張表自己都合格、但總數過多**時才會走的路。
   * 那條路一旦觸發,一整段的表會消失,而 `log_丟表` 仍然是 `[]`,
   * 這支腳本會回報「log:原文表格被丟 0 張」。
   *
   * **一個永遠不會紅的 fail 級判準,比沒有那個判準更糟** —— 它會讓人以為查過了。
   * 08-18 兩趟實測兩條都沒出現（真的 0 張),所以那兩趟的結論不受影響;
   * 但下一次若走了複數那條路,舊版腳本會靜默放行。
   *
   * 沒有 `tableNo` 就無法跟紙上的表號交叉比對,所以另記一個鍵而不是併進 `log_丟表` ——
   * 兩者的可追溯程度不同,混在一起會讓「知道少了哪幾張」與「只知道少了一批」看起來一樣。
   */
  const droppedBatches = [
    ...log.matchAll(
      /source tables dropped.*?"paragraphId":"([^"]+)".*?"count":(\d+)/g,
    ),
  ].map((match) => `${match[1]}(${match[2]} 張)`);
  snapshot.log_丟整批表 = droppedBatches;
  record(
    droppedBatches.length === 0 ? "pass" : "fail",
    "log:整段的表被丟",
    droppedBatches.length === 0
      ? "0 段"
      : `${droppedBatches.length} 段:${droppedBatches.join("、")} —— 每張都合格但總數超過上限,無 tableNo 可回溯`,
  );

  /**
   * Info: (20260817 - Emily) 丟表要跟紙上交叉比對 —— 這是 08-17 抓到的驗收破洞。
   *
   * 那一趟 log 說丟了 表2.1（三次）與 表2.2，而 PDF 側的
   * 「內文引用的表都存在」卻是 ✓「引用 17 個、落地 17 個」——
   * **因為內文的引用也一起消失了**。兩邊各自自洽，而中間少了 4 張表。
   *
   * 內部一致性檢查有一個盲點:當缺漏兩邊同時發生時它看不見。
   * 所以「原文本來有幾張」這個外部事實只能從 log 來，
   * 而它必須跟紙上的表號取聯集才問得出「到底少了誰」。
   */
  if (text !== undefined) {
    const droppedNos = new Set(dropped.map((no) => no.replace(/^表/, "")));
    const onPaper = new Set(
      [...text.matchAll(TABLE_CAPTION)].map((match) => match[1]),
    );
    const missingFromPaper = [...droppedNos].filter((no) => !onPaper.has(no));
    snapshot.丟表且紙上也沒有 = missingFromPaper;
    if (missingFromPaper.length > 0) {
      record(
        "fail",
        "log 說丟了、紙上也真的沒有",
        `${missingFromPaper.map((no) => `表${no}`).join("、")} —— 原文有、報告沒有。` +
          `內文引用也一起不見了，所以「引用的表都存在」那一條看不出來`,
      );
    } else if (droppedNos.size > 0) {
      record(
        "warn",
        "log 說丟了、但紙上有",
        `${[...droppedNos].map((no) => `表${no}`).join("、")} —— 可能由後續重試救回`,
      );
    }
  }

  snapshot.log_補分隔列 = count(/source table divider inserted/g);
  snapshot.log_接回折斷列 = count(/source table rows rejoined/g);
  snapshot.log_補欄 = count(/source table header widened/g);
  record(
    "pass",
    "log:表格修補次數",
    `補分隔列 ${snapshot.log_補分隔列}、接回折斷列 ${snapshot.log_接回折斷列}、補欄 ${snapshot.log_補欄}`,
  );

  checkActivities(log);
  checkPageSlices(log);

  const rejected = [
    ...log.matchAll(
      /carbon diagram rejected.*?"templateId":"([^"]+)".*?"reason":"([^"]+)"/g,
    ),
  ].map((match) => `${match[1]}(${match[2]})`);
  snapshot.log_圖表被拒 = rejected;
  if (rejected.length > 0) {
    record("warn", "log:圖表被拒", rejected.join("、"));
  }

  const rendered =
    /"chartsRendered":(\d+),"chartsFailed":(\d+),"tocFilled":(\d+),"tocMissing":(\d+)/.exec(
      log,
    );
  if (rendered) {
    snapshot.log_chartsRendered = Number(rendered[1]);
    snapshot.log_chartsFailed = Number(rendered[2]);
    snapshot.log_tocMissing = Number(rendered[4]);
    const bad = Number(rendered[2]) > 0 || Number(rendered[4]) > 0;
    record(
      bad ? "fail" : "pass",
      "log:列印結果",
      `畫出 ${rendered[1]} 張、失敗 ${rendered[2]} 張、目錄填 ${rendered[3]} 缺 ${rendered[4]}`,
    );
  }

  /**
   * Info: (20260817 - Emily) ToUnicode 修補。PDF 側查的是「還剩幾個部首」,
   * 這裡查的是「修補到底有沒有跑」—— 兩者都 0 才分得出
   * 「這份本來就乾淨」與「修補整個沒接上」。
   */
  const repair =
    /tounicode repaired.*?"replaced":(\d+).*?"decision":"([^"]+)"/.exec(log);
  if (repair) {
    snapshot.log_tounicode_replaced = Number(repair[1]);
    snapshot.log_tounicode_decision = repair[2];
    record(
      repair[2] === "failed" ? "fail" : "pass",
      "log:ToUnicode 修補",
      `${repair[2]}、改了 ${repair[1]} 個碼位`,
    );
  }
  const unmapped = /"unmapped":\[([^\]]*)\]/.exec(log);
  if (unmapped && unmapped[1].trim() !== "") {
    record(
      "warn",
      "log:相容區沒有對照的碼位",
      `${unmapped[1]} —— 確認字形相同後補進 SUPPLEMENT_MAP`,
    );
  }

  const tokens = [...log.matchAll(/"inputTokens":(\d+)/g)].reduce(
    (sum, match) => sum + Number(match[1]),
    0,
  );
  snapshot.log_input_tokens = tokens;
  snapshot.log_llm_呼叫次數 = count(/llm sync usage/g);
  record(
    "pass",
    "log:成本",
    `${snapshot.log_llm_呼叫次數} 次呼叫、input 約 ${Math.round(tokens / 1000)}k token`,
  );
};

/**
 * Info: (20260817 - Emily) 活動數據。
 *
 * 判準的重點是**「這行從沒印過」與「印了 0」必須分得開**。
 * 第一版把兩者 `reduce` 成同一個 `0/0`,於是
 * 「沒帶 withActivities 旗標」與「模型一筆都沒回」在驗收報告上是同一句話,
 * 而它們的修法完全不同(前者改前端旗標,後者改 prompt)。
 */
const checkActivities = (log: string): void => {
  const lines = [...log.matchAll(/activity extraction result[^\n]*/g)].map(
    (match) => match[0],
  );
  snapshot.log_活動數據_呼叫次數 = lines.length;
  if (lines.length === 0) {
    record(
      "fail",
      "log:活動數據",
      "這行從沒印過 —— 不是抽到 0 筆,是這段路沒跑到(先確認 withActivities 旗標)",
    );
    return;
  }

  const num = (line: string, key: string): number =>
    Number(new RegExp(`"${key}":(\\d+)`).exec(line)?.[1] ?? 0);
  const received = lines.reduce((sum, line) => sum + num(line, "received"), 0);
  const accepted = lines.reduce((sum, line) => sum + num(line, "accepted"), 0);
  const asked = lines.filter((line) => line.includes('"withActivities":true'));
  const hasKey = lines.filter((line) => line.includes('"hasKey":true'));
  snapshot.log_活動數據_received = received;
  snapshot.log_活動數據_accepted = accepted;
  snapshot.log_活動數據_有要求的呼叫 = asked.length;
  snapshot.log_活動數據_模型有回這個鍵 = hasKey.length;

  if (accepted > 0) {
    record(
      "pass",
      "log:活動數據",
      `${lines.length} 次呼叫、${asked.length} 次有要求,抽到 ${received} 筆、採用 ${accepted} 筆`,
    );
    return;
  }
  /**
   * Info: (20260817 - Emily) 0 的時候要指名是哪一種 0,否則這條 ✗ 沒有行動價值。
   *
   * Info: (20260818 - Emily) 層級改由 `activityDataLevel` 決定 —— **三種 0 不是同一件事**,
   * 而 B1 已於 08-17 從閘門移除(見那個函式的註解)。
   * 只有「模型有回鍵但內容是空的」降成 warn;前兩種是管線斷了,仍然 fail。
   */
  const cause =
    asked.length === 0
      ? "沒有任何一次呼叫帶 withActivities:true(前端旗標問題,不是 prompt)"
      : hasKey.length === 0
        ? `${asked.length} 次有要求,但模型每次都沒回 activities 這個鍵(prompt / required 問題)`
        : `模型有回這個鍵但內容是空的(rawSample "[]") —— 高興昌的表3.4 是活動數據的種類不是數量,見 open/46(P1,已於 08-17 移出上線閘門)`;
  record(
    activityDataLevel({
      asked: asked.length,
      hasKey: hasKey.length,
      accepted,
    }),
    "log:活動數據",
    `0 筆 —— ${cause}`,
  );
};

/**
 * Info: (20260817 - Emily) 頁碼切片。這裡量的是**成本的分水嶺**:
 * 一趟 14 次呼叫有幾次真的切到片、幾次退回送全文。
 *
 * 三條路徑要分開數,因為修法不同:
 * - `page slice` + `fellBack:false`  → 切成功
 * - `page slice` + `fellBack:true`   → 切了但退回(範圍無效或太短)
 * - `page slice skipped`             → 根本沒切(只有下界,伺服端整份送)
 */
const checkPageSlices = (log: string): void => {
  const slices = [...log.matchAll(/report import page slice[^\n]*/g)].map(
    (match) => match[0],
  );
  const skipped = slices.filter((line) => line.includes("slice skipped"));
  const applied = slices.filter((line) => !line.includes("slice skipped"));
  const fellBack = applied.filter((line) => line.includes('"fellBack":true'));

  snapshot.log_切片_切成功 = applied.length - fellBack.length;
  snapshot.log_切片_切了但退回 = fellBack.length;
  snapshot.log_切片_根本沒切 = skipped.length;

  const wasted = fellBack.length + skipped.length;
  const detail = `切成功 ${applied.length - fellBack.length} 次、退回 ${fellBack.length} 次、沒切 ${skipped.length} 次`;
  record(wasted > 0 ? "warn" : "pass", "log:頁碼切片", detail);

  // Info: (20260817 - Emily) 索引缺哪幾節 —— 退回的成因幾乎都在這裡
  const missing = /"missing":\[([^\]]*)\]/.exec(log);
  if (missing) {
    const ids = missing[1]
      .split(",")
      .map((id) => id.trim().replace(/^"|"$/g, ""))
      .filter((id) => id !== "");
    snapshot.log_索引缺的節 = ids;
    if (ids.length > 0) {
      record(
        "warn",
        "log:頁碼索引缺項",
        `${ids.length} 節沒索引:${ids.slice(0, 8).join(" ")}${ids.length > 8 ? " …" : ""}`,
      );
    } else {
      record("pass", "log:頁碼索引", "33 節全部有索引");
    }
  }
};

/**
 * Info: (20260814 - Emily) 與上一趟比對 —— 這是抓**非決定性缺陷**的唯一辦法。
 * 那類缺陷的特徵就是「這次好、下次壞」,而 diff 正是為此存在。
 */
/**
 * Info: (20260818 - Emily) 08-18 起**分層比對**(見 `BASELINE_TIERS`)。
 *
 * 原本是「任何一項不同就印出來」,而印出來之後沒有人判 ——
 * 於是 B3 的完成定義實際上是「有人看過那份 diff 並覺得可以」。
 * 現在 `must_match` 那一層的差異會 `record("fail")`,直接讓離開碼變 1。
 *
 * 回傳字串而不是直接印:呼叫端要先把 `record()` 的結果算進總數,再印明細。
 */
const compareBaseline = (): string | undefined => {
  const baselinePath = arg("--baseline");
  if (!baselinePath) return undefined;
  if (!fs.existsSync(baselinePath)) {
    record("fail", "基準線檔案不存在", baselinePath);
    return undefined;
  }
  const baseline: Record<string, unknown> = JSON.parse(
    fs.readFileSync(baselinePath, "utf-8"),
  );
  const changed = Object.keys(snapshot).filter(
    (key) => JSON.stringify(baseline[key]) !== JSON.stringify(snapshot[key]),
  );
  const line = (key: string): string =>
    `  ${key}: ${JSON.stringify(baseline[key])} → ${JSON.stringify(snapshot[key])}`;

  const broke = changed.filter((key) => classifyKey(key) === "must_match");
  const drifted = changed.filter((key) => classifyKey(key) !== "must_match");

  if (broke.length === 0) {
    record(
      "pass",
      "B3 兩趟一致(must_match 層)",
      `${drifted.length} 項在允許變動的層,0 項在必須相同的層`,
    );
  } else {
    record(
      "fail",
      "B3 兩趟不一致(must_match 層)",
      `${broke.join("、")} —— 這幾個非零就是缺陷,不是統計波動`,
    );
  }

  const sections: string[] = [];
  if (broke.length > 0) {
    sections.push(
      `\n✗ 必須相同卻變了(${broke.length} 項):\n${broke.map(line).join("\n")}`,
    );
  }
  if (drifted.length > 0) {
    sections.push(
      `\n⚠ 允許變動(${drifted.length} 項,僅記錄):\n${drifted.map(line).join("\n")}`,
    );
  }
  if (sections.length === 0) sections.push("\n與基準線完全相同");
  return `${sections.join("\n")}\n`;
};

/**
 * Info: (20260814 - Emily) 輸出。任何一項 fail 就 exit 1 —— 這支要能掛在 CI 上。
 */
/**
 * Info: (20260817 - Emily) `forcedExit` 用來區分兩種非零結束:
 * - 1 = 報告有缺陷（CI 該紅）
 * - 2 = 輸入不對（拿錯檔案／缺參數）—— 那不是產品的問題,不該跟缺陷混在同一個碼
 */
const report = (forcedExit?: number): void => {
  /**
   * Info: (20260818 - Emily) 這三步要在算 `failed` **之前**跑,因為它們會 `record()`,
   * 而它們的結果必須影響離開碼 —— B3/B4 是閘門,不是附註。
   *
   * `forcedExit` 有值代表**輸入不對**(拿錯檔案、抽不出文字層),那時快照幾乎是空的:
   * 跑這三步只會印出一串與產品無關的 ⚠。沿用本檔既有的那條分野 ——
   * exit 2 是「輸入不對」,不該跟產品缺陷混在同一份輸出裡。
   */
  const baselineReport =
    forcedExit === undefined
      ? (checkSnapshotClassification(), checkThresholds(), compareBaseline())
      : undefined;

  const icon: Record<Level, string> = { pass: "✓", fail: "✗", warn: "⚠" };
  checks.forEach((check) => {
    process.stdout.write(
      `${icon[check.level]} ${check.name.padEnd(24)} ${check.detail}\n`,
    );
  });

  const failed = checks.filter((check) => check.level === "fail").length;
  const warned = checks.filter((check) => check.level === "warn").length;
  process.stdout.write(
    `\n${checks.length - failed - warned} 通過 / ${failed} 失敗 / ${warned} 警告\n`,
  );

  const out = arg("--out");
  if (out) {
    fs.writeFileSync(out, `${JSON.stringify(snapshot, null, 2)}\n`, "utf-8");
    process.stdout.write(`快照已寫入 ${out}\n`);
  }

  if (baselineReport) process.stdout.write(baselineReport);

  process.exit(forcedExit ?? (failed > 0 ? 1 : 0));
};

main().catch((error: unknown) => {
  process.stderr.write(`驗收腳本失敗:${String(error)}\n`);
  process.exit(2);
});
