/**
 * Info: (20260812 - Emily) 匯入落地時的兩支決定性正規化，照服務層真正的組合順序。
 *
 * ## 為什麼需要這一支
 *
 * `padTableHeaderToWidest` 與 `replaceOfficeSymbolChars` 都是**修在匯入落地這一層**的
 * （理由:預覽與下載讀同一份 markdown,修在渲染層只會讓兩邊分歧）。但 08-12 那次 UAT
 * 是**既有草稿重新下載**,所以這兩支在匯入端的行為一條都沒被驗證 ——
 * 而「破折號資料列截斷表格範圍」那個迴歸**只在匯入端會造成落地資料的差異**
 * （讀取端每次渲染都重跑,匯入端寫進 DB 就定了）。
 *
 * ## 這支測的是什麼、不是什麼
 *
 * **是**:`ReportImportService` 第 819–820 行與第 883 行呼叫的那兩支純函式,
 * 依它實際的順序（先 `normalizeSymbols`、後 `padTableHeaderToWidest`）,
 * 餵**真實報告的表格形狀**。
 *
 * **不是**:服務本身。`ReportImportService.mapSegments` 需要 Prisma 與 LLM 回應,
 * 而 T7~T9 是 prompt 的約束 —— 那些只能靠真的重新匯入一次來驗
 * （步驟在 `data/scratch/UAT_IMPORT_2026_08_12.md`）。
 *
 * 所以這支關掉的是「決定性的那一半」,不是整個缺口。剩下的缺口寫在那份 UAT 腳本裡。
 */
import { describe, it, expect } from "@jest/globals";
import { padTableHeaderToWidest } from "@/lib/utils/markdown_table_columns";
import {
  replaceOfficeSymbolChars,
  unmappedPrivateUseChars,
} from "@/lib/utils/office_symbol_chars";

/**
 * Info: (20260812 - Emily) 服務層對每一張表做的事,原地照抄
 * （`report_import.service.ts` 819–820 行的 normalizeSymbols、883–898 行的 widened）。
 *
 * 只有一行是判斷:`recoveredCells === 0` 時不覆寫 markdown。
 * 那一行決定「這張表要不要換成補過欄的版本」,所以斷言要打在它的輸出上。
 */
const importTable = (
  markdown: string,
  caption: string,
): {
  markdown: string;
  caption: string;
  recoveredCells: number;
  headerColumns: number;
  widestColumns: number;
  hasSecondHeaderLevel: boolean;
  strayChars: string[];
} => {
  const normalized = replaceOfficeSymbolChars(markdown);
  const fix = padTableHeaderToWidest(normalized);
  return {
    markdown: fix.recoveredCells === 0 ? normalized : fix.markdown,
    caption: replaceOfficeSymbolChars(caption),
    recoveredCells: fix.recoveredCells,
    headerColumns: fix.headerColumns,
    widestColumns: fix.widestColumns,
    hasSecondHeaderLevel: fix.hasSecondHeaderLevel,
    strayChars: unmappedPrivateUseChars(markdown).map(
      (char) => `U+${char.codePointAt(0)?.toString(16).toUpperCase() ?? "?"}`,
    ),
  };
};

const rowsOf = (markdown: string): string[][] =>
  markdown
    .split("\n")
    .filter((line) => !/^\s*\|[\s:|-]+\|\s*$/.test(line))
    .map((line) =>
      line
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim()),
    );

/**
 * Info: (20260812 - Emily) 表3.1（原文 p.17–19）。兩層表頭:
 * 「可能產生溫室氣體種類」橫跨七種氣體,模型把父標題那列寫成 4 欄、資料列 10 欄。
 */
const TABLE_3_1 = [
  "| 設施/活動 | 溫室氣體源 | 可能產生溫室氣體種類 | 備註 |",
  "| :--- | :--- | :--- | :--- |",
  "| | | CO2 | CH4 | N2O | HFCs | PFCs | NF3 | SF6 | （類別） |",
  "| 緊急發電機 | 柴油 | V | V | V | | | | | 類別一 |",
  "| 公務車 | 車用汽油 | V | V | V | | | | | |",
].join("\n");

describe("匯入落地：表3.1 這種兩層表頭", () => {
  it("should widen the header to 10 columns at import time", () => {
    const result = importTable(TABLE_3_1, "表3.1 溫室氣體排放源鑑別");

    expect(result.headerColumns).toBe(4);
    expect(result.widestColumns).toBe(10);
    expect(result.recoveredCells).toBeGreaterThan(0);
    // Info: (20260812 - Emily) 落地的 markdown 每一列都是 10 欄,GFM 不再丟欄
    rowsOf(result.markdown).forEach((row) => expect(row).toHaveLength(10));
  });

  /**
   * Info: (20260812 - Emily) 這張表要被記成 hasSecondHeaderLevel。
   * 補欄讓儲存格回來,但欄位標籤與資料欄的對應要人工對照原文 —— 那要看得到 log。
   */
  it("should flag the second header level so the log tells someone", () => {
    expect(importTable(TABLE_3_1, "").hasSecondHeaderLevel).toBe(true);
  });

  // Info: (20260812 - Emily) 兩端都套的前提是冪等：重新匯入同一份不得再變一次
  it("should be idempotent across a re-import", () => {
    const once = importTable(TABLE_3_1, "").markdown;
    const twice = importTable(once, "").markdown;

    expect(twice).toBe(once);
    expect(importTable(once, "").recoveredCells).toBe(0);
  });
});

/**
 * Info: (20260812 - Emily) 這一組是「破組欄邏輯的迴歸」在匯入端的樣子。
 *
 * `| - | - | … |`（「本項無資料」最常見的寫法）符合 `DIVIDER`,
 * 第一版的邊界邏輯會停在那裡,它後面更寬的資料列一格都沒量到 ——
 * 而匯入端寫進 DB 就定了,不像讀取端每次渲染都重跑。
 */
describe("匯入落地：資料列長得像分隔列", () => {
  const WITH_DASH_ROW = [
    "| 排放源 | 活動數據 | 單位 |",
    "| --- | --- | --- |",
    "| - | - | - |",
    "| 柴油 | 1,240 | 公升 | 類別一 | 直接排放 |",
  ].join("\n");

  it("should still recover the cells after a dash-only row", () => {
    const result = importTable(WITH_DASH_ROW, "");

    expect(result.widestColumns).toBe(5);
    expect(result.recoveredCells).toBe(2);
    expect(result.markdown).toContain("類別一");
    expect(result.markdown).toContain("直接排放");
  });

  // Info: (20260812 - Emily) 破折號那一列本身不得被改寫
  it("should leave the dash row untouched", () => {
    expect(importTable(WITH_DASH_ROW, "").markdown).toContain("| - | - | - |");
  });
});

describe("匯入落地：私有區符號", () => {
  const WITH_PUA = [
    "| 項目 | 說明 |",
    "| --- | --- |",
    "|  固定燃燒源 |  已納入盤查 |",
  ].join("\n");

  it("should replace Word symbol-font code points in table cells", () => {
    const result = importTable(WITH_PUA, " 表2.1 邊界");

    expect(result.markdown).toContain("● 固定燃燒源");
    expect(result.markdown).toContain("✓ 已納入盤查");
    expect(result.caption).toBe("● 表2.1 邊界");
    expect(result.markdown).not.toMatch(/[-]/u);
  });

  /**
   * Info: (20260812 - Emily) 認不出的私有區字元原樣留著並記 log。
   * 不猜:猜錯會把一個未知符號變成另一個看起來合理的符號。
   */
  it("should keep an unmapped code point and report it", () => {
    const result = importTable("| 甲 |  |\n| --- | --- |\n| 1 | 2 |", "");

    expect(result.markdown).toContain("");
    expect(result.strayChars).toEqual(["U+E123"]);
  });

  /**
   * Info: (20260812 - Emily) 符號替換是 1:1 碼位,不改長度也不改欄數 ——
   * 所以它跑在補欄之前或之後都一樣。服務層的順序是「先符號、後補欄」,
   * 這一條釘住那個順序不影響結果（日後有人換順序時不會靜默改變落地資料）。
   */
  it("should not change column counts, so the order does not matter", () => {
    const symbolsFirst = padTableHeaderToWidest(
      replaceOfficeSymbolChars(WITH_PUA),
    ).markdown;
    const paddingFirst = replaceOfficeSymbolChars(
      padTableHeaderToWidest(WITH_PUA).markdown,
    );

    expect(symbolsFirst).toBe(paddingFirst);
  });
});

/**
 * Info: (20260812 - Emily) 補欄**修不到**的兩種,釘住「它不會假裝修好」。
 *
 * 這兩種要靠匯入 prompt（T8 兩層表頭、T9 縱向合併）,
 * 而 prompt 只能靠真的重新匯入一次來驗。這裡先把「不該動」釘住,
 * 免得日後有人為了讓表看起來整齊而讓補欄去猜。
 */
describe("匯入落地：補欄不該修的", () => {
  it("should not invent a column when the extra cells are all empty", () => {
    const trailingPipe = ["| 甲 | 乙 |", "| --- | --- |", "| 1 | 2 | |"].join(
      "\n",
    );
    const result = importTable(trailingPipe, "");

    expect(result.recoveredCells).toBe(0);
    expect(result.markdown).toBe(trailingPipe);
  });

  /**
   * Info: (20260812 - Emily) 表3.4／表4.8 那種第一欄逐列重複（縱向合併沒做成）:
   * 欄數本來就一致,補欄看不到問題也不該動它。這是 T9 的事。
   */
  it("should leave a table whose first column repeats every row", () => {
    const repeated = [
      "| 範疇 | 排放源 | 排放量 |",
      "| --- | --- | --- |",
      "| 範疇一 | 柴油 | 12.4 |",
      "| 範疇一 | 汽油 | 8.1 |",
      "| 範疇一 | 天然氣 | 3.7 |",
    ].join("\n");
    const result = importTable(repeated, "");

    expect(result.recoveredCells).toBe(0);
    expect(result.hasSecondHeaderLevel).toBe(false);
    expect(result.markdown).toBe(repeated);
  });
});
