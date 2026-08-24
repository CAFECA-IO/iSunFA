import fs from "fs";
import path from "path";
import { describe, it, expect } from "@jest/globals";
import { parseTable38 } from "@/lib/carbon_table38.parser";

/**
 * Info: (20260824 - Emily) 廠址總計列「數字黏在標籤格尾巴」的回歸測試。
 *
 * ## 這個缺陷是五趟裡三趟帳本全空的根因
 *
 * 表3.8 的廠址總計列,模型有兩種輸出(同一份原檔、同一版程式):
 *
 *     run B/F  | …所在地基準 (公噸 CO2e/年) | | 201.465 | |   乾淨格 → 勾稽通過
 *     run C/E  | …所在地基準 (公噸 CO2e/年) 201.465 | | | |   黏尾   → 6 列 unparsed
 *              → siteTotals 空 → 第三層「Σ廠址=0」對 8332.581 → 不入帳 → 帳本空
 *              → 桑基圖消失、資料不足佔位符 ×3、活動數據 0 筆
 *
 * 一路被誤診三次:先當成「表3.8 沒進來」,再當成「表3.6 總量讀成 0」——
 * 兩次都是方向錯。定罪的證據是 E/F 的快照對照(對帳逐字引用列_排除 6 vs 0)
 * 與對帳附錄逐字引用的那 6 列本尊。
 *
 * ## 測試的形式:拿 F 的本尊 fixture 程式化地「黏住」
 *
 * 斷言「黏住版的解析結果 === 乾淨版」。不手寫黏住的表 ——
 * 手寫素材已經兩次不具代表性(欄數斷言那次、3 格閉合列那次),
 * 從本尊變換出來的素材不會漂。
 */
const FIXTURE = path.join(
  process.cwd(),
  "src/__tests__/fixtures/source_tables/should_accept/t3.8__0824_F__candidate.md",
);

const readFixture = (): string =>
  fs
    .readFileSync(FIXTURE, "utf-8")
    .replace(/<!--[\s\S]*?-->\n?/g, "")
    .trim();

/** Info: (20260824 - Emily) 把「| 標籤 | | 201.465 | |」變成「| 標籤 201.465 | | | |」 */
const fuseTotalsIntoLabel = (markdown: string): string =>
  markdown
    .split("\n")
    .map((line) => {
      if (!/基準/.test(line) || !/\|/.test(line)) return line;
      const cells = line
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim());
      const valueIndex = cells.findIndex((cell) =>
        /^[0-9][0-9,]*(?:\.[0-9]+)?$/.test(cell),
      );
      if (valueIndex < 0) return line;
      const labelIndex = cells.findIndex((cell) => /基準/.test(cell));
      if (labelIndex < 0) return line;
      const value = cells[valueIndex];
      cells[valueIndex] = "";
      cells[labelIndex] = `${cells[labelIndex]} ${value}`;
      return `| ${cells.join(" | ")} |`;
    })
    .join("\n");

describe("表3.8 廠址總計:數字黏在標籤格尾巴(run C/E 的形狀)", () => {
  const clean = parseTable38(readFixture());
  const fused = parseTable38(fuseTotalsIntoLabel(readFixture()));

  it("前提:乾淨版本尊有 6 筆廠址總計、零未解析(fixture 沒壞)", () => {
    expect(clean.siteTotals).toHaveLength(6);
    expect(clean.unparsedRows).toEqual([]);
  });

  it("前提:變換真的把 6 列黏住了(變換器沒有靜默失效)", () => {
    const fusedLines = fuseTotalsIntoLabel(readFixture())
      .split("\n")
      .filter((line) => /基準[^|]*[0-9][0-9,.]*\s*\|/.test(line));

    expect(fusedLines).toHaveLength(6);
  });

  it("黏住版的廠址總計與乾淨版完全相同(數值、廠址、基準)", () => {
    expect(fused.siteTotals).toEqual(clean.siteTotals);
  });

  it("黏住版零未解析(那 6 列不再進 unparsedRows)", () => {
    expect(fused.unparsedRows).toEqual([]);
  });

  /**
   * Info: (20260824 - Emily) 反向對照:救援只在「整列沒有乾淨數字」時啟動,
   * 而且只抽含基準字樣那一格的尾端。基準列裡別格的數字(占比、年份)不得被抽走。
   */
  it("基準格沒有尾端數字、別格也沒有乾淨數字時,照舊進 unparsedRows", () => {
    const noNumber =
      "(1) 測試廠\n| 直接與間接溫室氣體總排放量-所在地基準 (公噸 CO2e/年) | | 無資料 | |";
    const parsed = parseTable38(noNumber);

    expect(parsed.siteTotals).toEqual([]);
    expect(parsed.unparsedRows).toHaveLength(1);
  });

  it("乾淨數字存在時不動救援路徑(取乾淨格,不取黏尾)", () => {
    const both =
      "(1) 測試廠\n| 所在地基準 (公噸 CO2e/年) 99999 | | 201.465 | |";
    const parsed = parseTable38(both);

    expect(parsed.siteTotals).toHaveLength(1);
    expect(parsed.siteTotals[0].tonneCo2e).toBe("201.465");
  });
});
