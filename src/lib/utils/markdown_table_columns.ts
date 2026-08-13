/**
 * Info: (20260811 - Emily) markdown 表格的欄數修補
 * (data/issue_drafts/open/19 第 3 張票的實際根因)。
 *
 * GFM 的規則是「資料列超出表頭的欄一律丟棄」。原文照錄的表格常常踩到它 ——
 * 原始報告用的是兩層表頭(父標題橫跨數欄,子標題在下一列),
 * 而 markdown 沒有 colspan,模型只好把父標題那一列寫成較少的欄。
 * 於是表頭宣告 4 欄、資料列有 10 欄,後面 6 欄**連同內容一起消失**,
 * 而且沒有任何錯誤 —— 渲染出來是一張看起來很正常、少了六欄的表。
 *
 * 實測 UAT 那份報告(1,807 行、26 張表):4 張表的表頭比資料列窄,
 * 合計 **261 個非空儲存格**被靜默丟掉,包括表3.1 七種溫室氣體裡的五種。
 * 那是一份要送第三方查證的文件。
 *
 * 這裡只做一件事:把表頭(與其分隔列)補到「最寬那一列」的欄數。
 * 不動任何一格既有內容,只在表頭尾端加空欄 —— 子標題列因此落在正確的位置。
 *
 * **只在真的會掉資料時才補。** 有些表的資料列多出來的那一格是空的
 * (行尾多打一個 `|`),補欄只會憑空多一條空欄;那種情況維持原樣。
 *
 * ## 補欄**不**修什麼(2026-08-12 補記,PR review)
 *
 * 補欄讓被丟掉的儲存格重新出現,但它**不會**讓表頭標籤對回正確的資料欄。
 * 實測(marked 渲染 `| 項目 | 排放量 | 備註 |` + 5 欄資料列):
 *
 *     補欄前  0:項目↔甲類  1:排放量↔1.2  2:備註↔3.4
 *     補欄後  0:項目↔甲類  1:排放量↔1.2  2:備註↔3.4  3:(空)↔5.6  4:(空)↔說明
 *
 * `備註 ↔ 3.4` 在前後**完全相同** —— 錯位是來源表格自己的性質(父標題那一列
 * 描述的是欄群組,而 markdown 沒有 colspan),不是補欄造成的。補欄沒有移動
 * 任何既有標籤,只是讓後面的欄變得可見。
 *
 * 所以這裡**刻意不猜**空欄該插在哪裡。要把 `備註` 移到第 5 欄,前提是「父標題
 * 從左往右依序覆蓋子欄群組」這個假設 —— 那是猜,而猜錯的後果是把一個氣體的
 * 排放量標成別的名目。寧可留下沒有標籤的欄(看得出來要對照原文),
 * 也不要生出一個看起來合理的錯誤對應。
 *
 * 偵測到第二層表頭時以 `hasSecondHeaderLevel` 回報,讓呼叫端記 log ——
 * 那種表的欄位標籤需要人工對照原文。
 */

import {
  classifyMarkdownLines,
  MarkdownLineKind,
} from "@/lib/utils/markdown_fence";

const ROW = /^\s*\|.*\|\s*$/;
const DIVIDER = /^\s*\|[\s:|-]+\|\s*$/;

/** Info: (20260811 - Emily) 逐格切開;`\|` 是逃脫的直線,不是欄位邊界 */
const splitCells = (line: string): string[] =>
  line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split(/(?<!\\)\|/);

export interface IMarkdownTableColumnFix {
  /** Info: (20260811 - Emily) 修補後的 markdown;不需修補時與輸入相同 */
  markdown: string;
  /** Info: (20260811 - Emily) 表頭原本的欄數 */
  headerColumns: number;
  /** Info: (20260811 - Emily) 最寬那一列的欄數 */
  widestColumns: number;
  /** Info: (20260811 - Emily) 補欄後不再被 GFM 丟掉的非空儲存格數 */
  recoveredCells: number;
  /**
   * Info: (20260812 - Emily) 第一列資料的前導格是空的 —— 那是第二層表頭。
   * 這種表的欄位標籤與資料欄不對應,而補欄不修那件事(見檔頭)。
   */
  hasSecondHeaderLevel: boolean;
}

interface ITableRegion {
  /** Info: (20260812 - Emily) 表頭列的索引;它的下一列是分隔列 */
  headerIndex: number;
  /** Info: (20260812 - Emily) 資料列結束的索引(不含) */
  bodyEnd: number;
}

/**
 * Info: (20260812 - Emily) 找出文件裡每一張表的範圍。
 *
 * 兩件事原本是壞的:
 *
 * 1. **資料列的蒐集沒有邊界。** 原本是 `lines.slice(headerIndex + 2).filter(ROW.test)`,
 *    掃到檔尾 —— 中間的空行與散文都不會中斷它,於是第二張表的表頭與資料列
 *    全被算進第一張表的「最寬那一列」。實測 2 欄 + 4 欄兩張表放在同一份 markdown,
 *    第一張被補成 4 欄、憑空多兩條空欄,而 log 回報「recovered 4 cells」——
 *    一個假的成功。有界之後 `recoveredCells` 才是誠實的數字。
 * 2. **不看圍籬。** 程式碼區塊裡含直線的行會被當成表格列。
 *
 * Info: (20260812 - Emily) 資料列的邊界只看「還是不是表格列」,**不看它像不像分隔列**。
 *
 * 第一版拿 `DIVIDER` 當中止條件,而 `DIVIDER` 認得的不只是分隔列 ——
 * 一列「每格都是破折號」的資料列(`| - | - |`,「本項無資料」最常見的寫法)
 * 一模一樣符合。於是掃描在那裡停住,它**後面**更寬的資料列一格都沒量到:
 *
 *     | 甲 | 乙 |
 *     | --- | --- |
 *     | - | - |            ← 停在這裡
 *     | 1 | 2 | 掉了嗎 |    ← 沒量到,`掉了嗎` 照樣被 GFM 丟掉
 *
 * 實測 recoveredCells 從 1 變 0 —— 這支工具存在的理由(261 個被靜默丟掉的儲存格)
 * 在它自己的邊界邏輯上復發,而且同樣不會有任何錯誤。
 *
 * 掃到檔尾不會誤併兩張表:GFM 只認**表頭下一列**那個分隔列,
 * 中間再出現的 `| --- | --- |` 對 GFM 而言就是一列資料。所以「一路吃到非表格列」
 * 與渲染器的看法一致 —— 不中止反而比中止更接近事實。
 */
const findTableRegions = (
  lines: readonly string[],
  kinds: readonly MarkdownLineKind[],
): ITableRegion[] => {
  const regions: ITableRegion[] = [];
  const isTableLine = (index: number): boolean =>
    index < lines.length &&
    kinds[index] === MarkdownLineKind.PROSE &&
    ROW.test(lines[index]);

  let index = 0;
  while (index < lines.length) {
    const isHeader =
      isTableLine(index) &&
      !DIVIDER.test(lines[index]) &&
      isTableLine(index + 1) &&
      DIVIDER.test(lines[index + 1]);
    if (!isHeader) {
      index += 1;
      continue;
    }

    let bodyEnd = index + 2;
    while (isTableLine(bodyEnd)) bodyEnd += 1;
    regions.push({ headerIndex: index, bodyEnd });
    index = bodyEnd;
  }
  return regions;
};

interface IRegionFix extends Omit<IMarkdownTableColumnFix, "markdown"> {
  lines: string[];
}

/**
 * Info: (20260812 - Emily) 把一張表的表頭(與其分隔列)補到最寬那一列的欄數。
 * 只改那兩行的內容,不增刪任何行 —— 所以多張表可以各自套用,索引不會位移。
 */
const padRegion = (
  lines: readonly string[],
  region: ITableRegion,
): IRegionFix => {
  const headerColumns = splitCells(lines[region.headerIndex]).length;
  const bodyRows: string[][] = [];
  for (let index = region.headerIndex + 2; index < region.bodyEnd; index += 1) {
    bodyRows.push(splitCells(lines[index]));
  }

  const widestColumns = bodyRows.reduce(
    (widest, cells) => Math.max(widest, cells.length),
    headerColumns,
  );
  const recoveredCells = bodyRows
    .flatMap((cells) => cells.slice(headerColumns))
    .filter((cell) => cell.trim() !== "").length;
  const hasSecondHeaderLevel =
    bodyRows.length > 0 && (bodyRows[0][0] ?? "").trim() === "";
  const measured = {
    headerColumns,
    widestColumns,
    recoveredCells,
    hasSecondHeaderLevel,
  };

  if (widestColumns <= headerColumns || recoveredCells === 0) {
    return { ...measured, lines: [...lines] };
  }

  const missing = widestColumns - headerColumns;
  const pad = (line: string, filler: string): string =>
    `${line.trimEnd()}${` ${filler} |`.repeat(missing)}`;
  const patched = [...lines];
  patched[region.headerIndex] = pad(patched[region.headerIndex], "");
  patched[region.headerIndex + 1] = pad(patched[region.headerIndex + 1], "---");
  return { ...measured, lines: patched };
};

/**
 * Info: (20260811 - Emily) 把**第一張**表的表頭補到最寬那一列的欄數。
 * 找不到「表頭列 + 分隔列」的組合(不是表格)即原樣返回。
 *
 * Info: (20260812 - Emily) 匯入端一次只餵一張表,所以這支維持單張的契約
 * (回傳的欄數與 recoveredCells 描述的就是那一張)。整份文件請用 padAllTableHeaders。
 */
export const padTableHeaderToWidest = (
  markdown: string,
): IMarkdownTableColumnFix => {
  const lines = markdown.split("\n");
  const [first] = findTableRegions(lines, classifyMarkdownLines(lines));
  if (!first) {
    return {
      markdown,
      headerColumns: 0,
      widestColumns: 0,
      recoveredCells: 0,
      hasSecondHeaderLevel: false,
    };
  }

  const fix = padRegion(lines, first);
  return {
    markdown: fix.recoveredCells === 0 ? markdown : fix.lines.join("\n"),
    headerColumns: fix.headerColumns,
    widestColumns: fix.widestColumns,
    recoveredCells: fix.recoveredCells,
    hasSecondHeaderLevel: fix.hasSecondHeaderLevel,
  };
};

/**
 * Info: (20260812 - Emily) 整份文件裡每一張表都補一次。
 *
 * 為什麼讀取端也要套:補欄原本只在匯入落地時跑,理由是「修在渲染層只會讓
 * 預覽與下載再度分歧」。但**既有草稿的表頭已經是窄的** —— 匯入端修不到它們。
 * 同一個 PR 裡的 timeline 與私有區符號都有讀取端遷移(理由是重新產生一份
 * 54 頁報告很貴),補欄用了相反的推論,於是那 261 個儲存格一格都沒救回來,
 * 而且這次連 log 都不會有(只在匯入時記)。
 *
 * 兩端套用是安全的:補完之後表頭已經是最寬,第二次跑 recoveredCells 為 0 而原樣返回。
 */
export const padAllTableHeaders = (markdown: string): string => {
  if (!markdown.includes("|")) return markdown;

  let lines = markdown.split("\n");
  const regions = findTableRegions(lines, classifyMarkdownLines(lines));
  if (regions.length === 0) return markdown;

  regions.forEach((region) => {
    lines = padRegion(lines, region).lines;
  });
  return lines.join("\n");
};
