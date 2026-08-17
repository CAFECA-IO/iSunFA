// Info: (20260814 - Emily) 碳報告產出的自動驗收(`data/issue_drafts/open/37_carbon_output_acceptance.md`)
// Info: (20260814 - Emily) 用法:npx tsx scripts/uat_carbon_report.ts --pdf <下載的報告.pdf> [--log <server.log>] [--out snap.json] [--baseline 上一趟.json]
//
// Info: (20260814 - Emily) 為什麼要這支:08-14 之前每一輪修正的驗證都是「跑 12 分鐘匯入 → 人眼翻 57 頁」。
// Info: (20260814 - Emily) 人眼看得到最刺眼的,看不到最嚴重的 —— 「表4.8 掉了」在 57 頁裡翻不到。
// Info: (20260814 - Emily) 判準一律是**內部一致性**而不是比對某一份報告的形狀,否則換一份客戶報告就全部失效。

import fs from "node:fs";
import { extractPdfTextLayer } from "@/lib/pdf_text_layer";
import { CARBON_REPORT_OUTLINE } from "@/constants/carbon_report_outline";

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
/** Info: (20260814 - Emily) 圖表未繪製的三種說明,要分得開 */
const DIAGRAM_NOTES: ReadonlyArray<{ pattern: RegExp; meaning: string }> = [
  { pattern: /本節內容不足以繪製結構圖/g, meaning: "素材不足" },
  { pattern: /超過本圖的繪製上限/g, meaning: "節點太多" },
  { pattern: /無法回溯至本節原文/g, meaning: "無法回溯原文(疑似模型編造)" },
];

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
  const extracted = await extractPdfTextLayer(fs.readFileSync(pdfPath));
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

  // Info: (20260814 - Emily) ── 靜默失敗:沒有錯誤訊息、版面正常、內容是錯的 ──
  expectZero("私有區符號", [...raw].filter(isPrivateUse));
  reportRadicals([...raw].filter(isCompatibilityRadical));
  expectZero("反斜線逸出外洩", text.match(ESCAPE_LEAK) ?? []);
  expectZero("mermaid 語法外洩", text.match(MERMAID_LEAK) ?? []);
  expectZero("待補佔位符", text.match(/待補/g) ?? []);
  expectZero("資料不足佔位符", text.match(/資料不足/g) ?? []);

  // Info: (20260814 - Emily) ── 圖表沒畫要指名是哪一節,而且三種原因要分開 ──
  DIAGRAM_NOTES.forEach(({ pattern, meaning }) => {
    const hits = text.match(pattern) ?? [];
    snapshot[`圖表未繪製_${meaning}`] = hits.length;
    if (hits.length === 0) return;
    record(
      "warn",
      `圖表未繪製(${meaning})`,
      `${hits.length} 處 —— 需確認那一節是否真的該有圖`,
    );
  });

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

  // Info: (20260814 - Emily) ── 目錄的每一條要對得上實體頁(頁碼是量測出來的,所以可以反查) ──
  checkToc(text);

  // Info: (20260814 - Emily) ── 行結構:標記黏在同一行 = 整份清單擠成一段文字牆 ──
  checkLineStructure(text);

  const logPath = arg("--log");
  if (logPath) checkLog(fs.readFileSync(logPath, "utf-8"));

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
const checkLog = (log: string): void => {
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
   */
  const cause =
    asked.length === 0
      ? "沒有任何一次呼叫帶 withActivities:true(前端旗標問題,不是 prompt)"
      : hasKey.length === 0
        ? `${asked.length} 次有要求,但模型每次都沒回 activities 這個鍵(prompt / required 問題)`
        : `模型有回這個鍵但內容是空的(看 rawSample)`;
  record("fail", "log:活動數據", `0 筆 —— ${cause}`);
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
 * Info: (20260814 - Emily) 輸出。任何一項 fail 就 exit 1 —— 這支要能掛在 CI 上。
 */
const report = (): void => {
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

  /**
   * Info: (20260814 - Emily) 與上一趟比對 —— 這是抓**非決定性缺陷**的唯一辦法。
   * 那類缺陷的特徵就是「這次好、下次壞」,而 diff 正是為此存在。
   */
  const baselinePath = arg("--baseline");
  if (baselinePath && fs.existsSync(baselinePath)) {
    const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf-8"));
    const changed = Object.keys(snapshot).filter(
      (key) => JSON.stringify(baseline[key]) !== JSON.stringify(snapshot[key]),
    );
    process.stdout.write(
      changed.length === 0
        ? "\n與基準線完全相同\n"
        : `\n與基準線有 ${changed.length} 項不同:\n${changed
            .map(
              (key) =>
                `  ${key}: ${JSON.stringify(baseline[key])} → ${JSON.stringify(snapshot[key])}`,
            )
            .join("\n")}\n`,
    );
  }

  process.exit(failed > 0 ? 1 : 0);
};

main().catch((error: unknown) => {
  process.stderr.write(`驗收腳本失敗:${String(error)}\n`);
  process.exit(2);
});
