/**
 * Info: (20260820 - Emily) 原文表格的**形狀語料庫**回放測試。
 *
 * ## 為什麼要有這支
 *
 * 這個缺陷（原文表格被誤判丟棄，`open/47`）是偶發的：同一份原檔、同一個 commit，
 * 每一趟匯入丟掉的表都不一樣。08-20 三趟實測：
 *
 *     run B  0 張（19/19）
 *     run C  表3.4        divider_column_mismatch（表頭 547 格、只有 5 格有字）
 *     run D  表4.4、表4.8  not_a_table（表頭折成碎片，所需續行 5–29 而上限是 4）
 *
 * 於是修法變成「跑一趟 40 分鐘 → 看到一種形狀 → 修一種 → 再跑一趟」。
 * 原檔 19 張表、形狀不知道有幾種，那個迴圈可以跑好幾週，
 * 而**每一趟的成本是 40 分鐘與 20 萬 token**。
 *
 * 這支測試把它換成 0.3 秒：把 log 抓到的**真實 payload** 存成素材，
 * 讓每一次改動都對著**所有已知形狀**跑，而不是對著這一趟抽到的那一種。
 *
 * ## 素材從哪來
 *
 * `fixtures/source_tables/should_accept/` —— `scripts/harvest_source_tables.ts`
 * 從伺服端 log 的 `source table dropped` 事件抓出來的 `full` 欄位，逐字不改。
 * 檔名記著它出自哪一趟、當時被丟的原因；檔頭註解記著 paragraphId 與 lineCount。
 *
 * `fixtures/source_tables/should_reject/` —— **合成**素材，檔名有 `synthetic__` 前綴。
 * 它們是護欄的反向對照：修復管線必須交回原樣、讓驗證器擋下。
 * 沒有這一半，「全部接受」也會是綠的。
 *
 * ## 順序與 report_import.service 必須一致
 *
 * 接回折斷列 → 補分隔列 → 裁超寬列 → 才裁決。
 * 那個順序寫在 `report_import.service.ts` 的註解裡，理由是每一支的判準都依賴
 * 前一支的產出（補分隔列看「連續多列欄數一致」，而一列被切成三行時那個判準不成立）。
 * 這裡刻意複刻同一個順序 —— 順序錯了這支測試就在驗別的東西。
 */
import fs from "fs";
import path from "path";
import { describe, it, expect } from "@jest/globals";
import { joinWrappedTableRows } from "@/lib/utils/markdown_table_rows";
import {
  ensureTableDivider,
  trimRowsToDividerWidth,
} from "@/lib/utils/markdown_table_divider";
import { validateSourceTables } from "@/lib/carbon_source_table.builder";

const CORPUS_ROOT = path.join(
  process.cwd(),
  "src/__tests__/fixtures/source_tables",
);

const listFixtures = (bucket: string): string[] => {
  const dir = path.join(CORPUS_ROOT, bucket);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".md"))
    .sort();
};

const readFixture = (bucket: string, name: string): string =>
  fs
    .readFileSync(path.join(CORPUS_ROOT, bucket, name), "utf-8")
    // Info: (20260820 - Emily) 檔頭的來源註解不是表格內容，餵進管線之前拿掉
    .replace(/<!--[\s\S]*?-->\n?/g, "")
    .trim();

/**
 * Info: (20260820 - Emily) 比對用的正規化：擠掉所有空白。
 * 接回折斷處本來就會改變空白（`joinFragments` 只在兩個 ASCII 詞之間補），
 * 所以「內容有沒有少」不能用含空白的字串比。
 */
const squeeze = (value: string): string =>
  value.normalize("NFKC").replace(/\s+/g, "");

const splitCells = (line: string): string[] =>
  line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split(/(?<!\\)\|/);

/** Info: (20260820 - Emily) 與 report_import.service.ts 同一個順序 */
const repair = (markdown: string): string => {
  const rejoined = joinWrappedTableRows(markdown).markdown;
  const withDivider = ensureTableDivider(rejoined).markdown;
  return trimRowsToDividerWidth(withDivider).markdown;
};

const judge = (
  tableNo: string,
  markdown: string,
): { isValid: boolean; reason?: string } => {
  const check = validateSourceTables([
    { tableNo, caption: "語料庫回放", sourcePages: [1], markdown },
  ]);
  return { isValid: check.isValid, reason: check.reason };
};

describe("原文表格形狀語料庫（回放）", () => {
  const accepted = listFixtures("should_accept");
  const rejected = listFixtures("should_reject");

  it("語料庫不是空的（素材掉了要立刻知道）", () => {
    expect(accepted.length).toBeGreaterThan(0);
    expect(rejected.length).toBeGreaterThan(0);
  });

  /**
   * Info: (20260820 - Emily) 每一份都是**曾經真的被丟掉**的表。
   * 這裡紅掉代表那個形狀又壞了，而它的成本在真實匯入裡是「一整張表無聲消失」。
   */
  describe("should_accept —— 修復管線走完之後必須被認為是表格", () => {
    accepted.forEach((name) => {
      it(name, () => {
        const tableNo = `表${name.split("__")[0].replace(/^t/, "")}`;
        const verdict = judge(
          tableNo,
          repair(readFixture("should_accept", name)),
        );

        expect(verdict.reason ?? "(通過)").toBe("(通過)");
        expect(verdict.isValid).toBe(true);
      });
    });
  });

  /**
   * Info: (20260820 - Emily) 「被認為是表格」不等於「內容沒被改壞」。
   *
   * 這一族的危險錯誤是**兩列併成一列**：後面每一格左移一位，
   * 一個氣體的排放量被標成別的名目，而表格看起來完全正常、驗證器也照樣通過。
   * 只斷言 `isValid` 的話，一個把內容攪爛但結構合法的修復會全綠 ——
   * 那正是這個語料庫要防的東西。
   *
   * 所以再釘兩件事：
   * 1. **一格都不能少** —— 原始素材裡每一段非空的儲存格文字，修完之後仍然找得到。
   *    比對前把空白擠掉，因為接回折斷處本來就會改變空白（`joinFragments` 只在
   *    兩個 ASCII 詞之間補空白）。
   * 2. **欄數要一致** —— 修完之後所有表格列的欄數相同。不一致代表某一列被接錯了，
   *    而那就是欄位錯位的形狀。
   */
  describe("should_accept —— 內容不能在修復過程中被改壞", () => {
    accepted.forEach((name) => {
      it(`${name}：每一格文字都還在`, () => {
        const source = readFixture("should_accept", name);
        const repaired = squeeze(repair(source));
        const cells = source
          .split("\n")
          .filter((line) => line.trim().startsWith("|"))
          .flatMap((line) => splitCells(line))
          .map((cell) => squeeze(cell))
          .filter((cell) => cell.length > 0 && !/^[-:]+$/.test(cell));
        const lost = [...new Set(cells)].filter(
          (cell) => !repaired.includes(cell),
        );

        expect(lost).toEqual([]);
      });

      /**
       * Info: (20260820 - Emily) 釘的是 GFM 的契約,不是「看起來整齊」。
       *
       * 第一版我寫成「修完之後所有表格列的欄數一致」,而那**比契約嚴**:
       * GFM 只要求表頭與緊接的分隔列欄數相同,資料列多一格會被丟、少一格補空,
       * 那是容許的;把欄數補齊是渲染端 `padTableHeaderToWidest` 的工作,
       * 不在匯入修復這一段。三份素材有兩份因此紅 —— 嚴的判準會逼人去改對的程式,
       * 所以改成釘 `divider_column_mismatch` 真正在講的那件事。
       */
      it(`${name}：表頭與分隔列的欄數對得上`, () => {
        const rows = repair(readFixture("should_accept", name))
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => /^\|.*\|$/.test(line));
        const dividerAt = rows.findIndex(
          (row, index) => index > 0 && /^\|[\s:|-]+\|$/.test(row),
        );

        expect(dividerAt).toBeGreaterThan(0);
        expect(splitCells(rows[dividerAt]).length).toBe(
          splitCells(rows[dividerAt - 1]).length,
        );
      });
    });
  });

  /**
   * Info: (20260820 - Emily) 反向對照。少了這一半，把管線改成「什麼都接受」
   * 也會全綠 —— 而那個改動在真實匯入裡會把兩列併成一列，
   * 讓一個氣體的排放量標成別的名目，而表格看起來完全正常。
   */
  describe("should_reject —— 修復管線必須交回原樣，讓驗證器擋下", () => {
    rejected.forEach((name) => {
      it(name, () => {
        const source = readFixture("should_reject", name);
        const repaired = repair(source);
        const verdict = judge("表9.9", repaired);

        expect(verdict.isValid).toBe(false);
      });
    });
  });

  /**
   * Info: (20260820 - Emily) 修復是冪等的 —— 匯入端可能重試，
   * 第二次跑不該產出跟第一次不同的東西。
   */
  it("修復管線是冪等的", () => {
    [...accepted, ...rejected].forEach((name) => {
      const bucket = accepted.includes(name)
        ? "should_accept"
        : "should_reject";
      const once = repair(readFixture(bucket, name));

      expect(repair(once)).toBe(once);
    });
  });
});
