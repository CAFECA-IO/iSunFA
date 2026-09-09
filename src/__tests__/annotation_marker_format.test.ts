import { describe, it, expect } from "@jest/globals";
import fs from "fs";
import path from "path";
import {
  ANNOTATION_MARKER_EXACT,
  ANNOTATION_MARKER_KINDS,
  AnnotationFindingKindEnum,
  ESLINT_DISABLE_MARKER_KINDS,
  annotationBaselineKey,
  scanAnnotationMarkers,
} from "@/lib/annotation_marker_scan";

/**
 * Info: (20260909 - Emily) 註解標記格式的機械化檢查(#6763)。
 *
 * `annotation.md` 規定的 `Info: (YYYYMMDD - Author)` 前綴,到 09-03 為止沒有任何程式判 ——
 * 寫了 `ToDo` 與沒寫的差別只在字面上。這一支讓「新寫的標記格式不合」在 husky 就紅。
 *
 * ## 三個部分
 *
 * 1. 掃描器本身的單元測試(給它一段原始碼,它要抓到什麼、不該抓到什麼)—— 沒有這一組,
 *    下面那條全庫掃描綠了也不知道是「都合規」還是「掃描器瞎了」(見 08 那次 lazy quantifier 的假綠)。
 * 2. 全庫掃描 vs 基準線:既有的 51 則寫壞標記 + 31 則沒標記的 `eslint-disable-next-line`
 *    記在 `fixtures/annotation_marker_baseline.json`。**逐行、雙向嚴格**:新出現的紅、
 *    基準線裡已經修掉的也紅(訊息告訴你怎麼改基準線)。基準線不許過時。
 * 3. 文件那一個未決的字:`eslint-disable-next-line` 上方該 `ToDo` 還是 `Deprecated`,
 *    `annotation.md` 文字與範例互相矛盾。決定之前規則收兩種;這裡釘住它只能是那兩種的子集,
 *    owner 決定後刪一個即可。
 *
 * ## 重建基準線
 *
 *     ANNOTATION_BASELINE_WRITE=1 npx jest src/__tests__/annotation_marker_format.test.ts
 *
 * 只在**確認新增的那幾行確實該進基準線**時用(例如缺作者的舊註解不該由你補名字);
 * 自己新寫的標記不合格式,修標記,不要重建基準線。
 */
const ROOT = process.cwd();
const SCAN_ROOTS = ["src", "scripts"];
const SCAN_EXTENSIONS = new Set([".ts", ".tsx", ".mjs"]);
/** Info: (20260909 - Emily) 與 eslint.config.mjs 的 ignores 同一份立場:產生出來的檔不歸我們管 */
const SCAN_IGNORED_DIRS = new Set(["node_modules", "generated"]);
const BASELINE_PATH = path.join(
  ROOT,
  "src/__tests__/fixtures/annotation_marker_baseline.json",
);

const listSourceFiles = (): string[] => {
  const files: string[] = [];
  const walk = (dir: string) => {
    fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SCAN_IGNORED_DIRS.has(entry.name)) walk(full);
        return;
      }
      if (SCAN_EXTENSIONS.has(path.extname(entry.name))) files.push(full);
    });
  };
  SCAN_ROOTS.forEach((root) => {
    const full = path.join(ROOT, root);
    if (fs.existsSync(full)) walk(full);
  });
  return files.sort();
};

const scanRepository = (): string[] =>
  listSourceFiles().flatMap((file) => {
    const relative = path.relative(ROOT, file).split(path.sep).join("/");
    return scanAnnotationMarkers(fs.readFileSync(file, "utf-8")).map(
      (finding) => annotationBaselineKey(relative, finding),
    );
  });

/** Info: (20260909 - Emily) 多重集合差:同一行原文在同一檔可能出現兩次(JSX 的重複區塊),要按次數算 */
const multisetDifference = (left: string[], right: string[]): string[] => {
  const counts = new Map<string, number>();
  right.forEach((key) => counts.set(key, (counts.get(key) ?? 0) + 1));
  return left.filter((key) => {
    const remaining = counts.get(key) ?? 0;
    if (remaining === 0) return true;
    counts.set(key, remaining - 1);
    return false;
  });
};

describe("掃描器:該抓的抓到,不該抓的放過", () => {
  const kinds = (source: string) =>
    scanAnnotationMarkers(source).map((finding) => finding.kind);

  it("三種正名、單行/多行/JSX 三種寫法、Deprecated: [end] 都是合規的,零發現", () => {
    const source = [
      "// Info: (20260909 - Emily) 單行",
      "// ToDo: (20260909 - Emily) 單行",
      "// Deprecated: (20260909 - Emily) [start] 多行",
      "const a = 1;",
      "// Deprecated: [end]",
      "/**",
      " * Info: (20260909 - Emily)",
      " * 第二行",
      " */",
      "{/* Info: (20260909 - Emily) JSX */}",
      "/* ToDo: (20260909 - Emily) 單行區塊 */",
    ].join("\n");
    expect(scanAnnotationMarkers(source)).toEqual([]);
  });

  it("寫壞的標記:少空白、缺作者、大寫 TODO 無日期、日期用斜線、作者用小寫連字號", () => {
    const cases = [
      "// Info:(20260609 - Julian) 少空白",
      "// Info: (20260616) 缺作者",
      "// TODO: Translate to ja",
      "// Info: (2026/04/19) 斜線日期",
      "// Info: (20251001-tzuhan)",
      "// Todo: (20260129 - Tzuhan) Todo 大小寫錯",
      "{/* Info:(20260609 - Julian) JSX 少空白 */}",
      ["/**", " * Info:(20260610 - Julian) 區塊第一行少空白", " */"].join("\n"),
    ];
    cases.forEach((line) => {
      expect({ line, kinds: kinds(line) }).toEqual({
        line,
        kinds: [AnnotationFindingKindEnum.MALFORMED_MARKER],
      });
    });
  });

  it("多行區塊的續行不是「一則註解的第一行」,裡面提到 Info: 不算寫壞", () => {
    const source = [
      "/**",
      " * Info: (20260909 - Emily) 說明",
      " * schema 裡的 enum 成員後面常跟著 `// Info: ...` 說明",
      " * TODO 這個字出現在句中也不算",
      " */",
    ].join("\n");
    expect(kinds(source)).toEqual([]);
  });

  it("散文裡提到標記字、或不是以標記字開頭的註解,不算", () => {
    expect(kinds("// 開發者要讀的理由寫在 `Info:` 註解裡")).toEqual([]);
    expect(kinds("// Information about the flow")).toEqual([]);
    expect(kinds("// Note: this is prose")).toEqual([]);
    expect(kinds("const todo = 1; // info")).toEqual([]);
  });

  it("格式對但日期不存在(20260931、20261301)→ INVALID_DATE", () => {
    expect(kinds("// Info: (20260931 - Emily) 九月沒有 31")).toEqual([
      AnnotationFindingKindEnum.INVALID_DATE,
    ]);
    expect(kinds("// Info: (20261301 - Emily) 沒有 13 月")).toEqual([
      AnnotationFindingKindEnum.INVALID_DATE,
    ]);
    expect(kinds("// Info: (20240229 - Emily) 閏年有 2/29")).toEqual([]);
    expect(kinds("// Info: (20230229 - Emily) 非閏年沒有")).toEqual([
      AnnotationFindingKindEnum.INVALID_DATE,
    ]);
  });

  it("eslint-disable-next-line:上一行有允許的標記 → 過;沒有、或隔了空行、或是 Info → 紅", () => {
    const ok = [
      "// Deprecated: (20260730 - Tzuhan) remove eslint-disable",
      "// eslint-disable-next-line react-hooks/exhaustive-deps",
    ].join("\n");
    expect(kinds(ok)).toEqual([]);
    const okJsx = [
      "{/* ToDo: (20260909 - Emily) remove eslint-disable */}",
      "{/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}",
    ].join("\n");
    expect(kinds(okJsx)).toEqual([]);
    const okBlock = [
      "/**",
      " * Deprecated: (20260909 - Emily)",
      " * remove eslint-disable",
      " */",
      "// eslint-disable-next-line no-console",
    ].join("\n");
    expect(kinds(okBlock)).toEqual([]);

    expect(kinds("// eslint-disable-next-line no-console")).toEqual([
      AnnotationFindingKindEnum.ESLINT_DISABLE_UNMARKED,
    ]);
    const gap = [
      "// Deprecated: (20260730 - Tzuhan) remove eslint-disable",
      "",
      "// eslint-disable-next-line no-console",
    ].join("\n");
    expect(kinds(gap)).toEqual([
      AnnotationFindingKindEnum.ESLINT_DISABLE_UNMARKED,
    ]);
    const code = [
      "// Deprecated: (20260730 - Tzuhan) remove eslint-disable",
      "const a = 1;",
      "// eslint-disable-next-line no-console",
    ].join("\n");
    expect(kinds(code)).toEqual([
      AnnotationFindingKindEnum.ESLINT_DISABLE_UNMARKED,
    ]);
    const info = [
      "// Info: (20260730 - Tzuhan) 這裡需要 any",
      "// eslint-disable-next-line @typescript-eslint/no-explicit-any",
    ].join("\n");
    expect(kinds(info)).toEqual([
      AnnotationFindingKindEnum.ESLINT_DISABLE_UNMARKED,
    ]);
  });

  it("檔案級 eslint-disable 與 eslint-disable-line:文件只允許 next-line", () => {
    expect(kinds("/* eslint-disable */")).toEqual([
      AnnotationFindingKindEnum.ESLINT_DISABLE_FORBIDDEN_FORM,
    ]);
    expect(kinds("// eslint-disable-line no-console")).toEqual([
      AnnotationFindingKindEnum.ESLINT_DISABLE_FORBIDDEN_FORM,
    ]);
  });

  it("行號是 1-based、text 是 trim 過的原文(基準線靠它當鍵)", () => {
    const [finding] = scanAnnotationMarkers("const a = 1;\n   // TODO: x\n");
    expect(finding.line).toBe(2);
    expect(finding.text).toBe("// TODO: x");
  });
});

describe("規則本身與票、與文件對得上", () => {
  it("正名只有三種,exact 正規式就是票上那條", () => {
    expect([...ANNOTATION_MARKER_KINDS]).toEqual([
      "Info",
      "ToDo",
      "Deprecated",
    ]);
    expect(ANNOTATION_MARKER_EXACT.source).toBe(
      "^(Info|ToDo|Deprecated): \\((\\d{8}) - (\\w+)\\)",
    );
  });

  it("eslint-disable 上方允許的標記 ⊆ {ToDo, Deprecated}(文件寫出的兩種;owner 決定後刪一個)", () => {
    expect(ESLINT_DISABLE_MARKER_KINDS.length).toBeGreaterThan(0);
    ESLINT_DISABLE_MARKER_KINDS.forEach((kind) =>
      expect(["ToDo", "Deprecated"]).toContain(kind),
    );
    /**
     * Info: (20260909 - Emily) 文件裡那一節的矛盾是真的,不是我讀錯:文字說 ToDo、範例寫 Deprecated。
     * 這一條釘住矛盾還在;owner 改了文件,這一條會紅,提醒把上面那個陣列收成一個。
     */
    const doc = fs.readFileSync(
      path.join(
        ROOT,
        "documents/engineering_guidelines/work_guidelines/annotation.md",
      ),
      "utf-8",
    );
    const section = doc.slice(
      doc.indexOf("## Eslint Disable"),
      doc.indexOf("## Deprecated"),
    );
    const textSaysToDo = /must add a `ToDo` comment/.test(section);
    const exampleSaysDeprecated =
      /\/\/ Deprecated: \(date - author\) remove eslint-disable/.test(section);
    const stillContradictory = textSaysToDo && exampleSaysDeprecated;
    expect(stillContradictory).toBe(ESLINT_DISABLE_MARKER_KINDS.length === 2);
  });
});

describe("全庫掃描 vs 基準線(逐行、雙向嚴格)", () => {
  it("新寫的標記格式不合就紅;基準線裡已修掉的也紅(基準線不許過時)", () => {
    const current = scanRepository().sort();
    if (process.env.ANNOTATION_BASELINE_WRITE === "1") {
      fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(current, null, 2)}\n`);
    }
    const baseline = (
      JSON.parse(fs.readFileSync(BASELINE_PATH, "utf-8")) as string[]
    ).sort();
    const added = multisetDifference(current, baseline);
    const removed = multisetDifference(baseline, current);
    const describeKey = (key: string) => {
      const [file, kind, ...text] = key.split("::");
      return `  ${file}  [${kind}]  ${text.join("::")}`;
    };
    const message = [
      added.length > 0
        ? `新出現的不合規標記(修標記,不是改基準線):\n${added.map(describeKey).join("\n")}`
        : "",
      removed.length > 0
        ? `基準線裡這些行已經不存在(把它們從 fixtures/annotation_marker_baseline.json 刪掉):\n${removed.map(describeKey).join("\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    expect({ added: added.length, removed: removed.length, message }).toEqual({
      added: 0,
      removed: 0,
      message: "",
    });
  });

  it("基準線只會變短,不會變長:它記的是歷史欠賬,不是配額", () => {
    /**
     * Info: (20260909 - Emily) 09-09 建立時 82 則(51 寫壞 + 31 eslint-disable 沒標記)。
     * 這個數字是天花板:有人把新寫壞的標記用 ANNOTATION_BASELINE_WRITE 洗進基準線,這一條會紅。
     */
    const baseline = JSON.parse(
      fs.readFileSync(BASELINE_PATH, "utf-8"),
    ) as string[];
    expect(baseline.length).toBeLessThanOrEqual(82);
  });
});
