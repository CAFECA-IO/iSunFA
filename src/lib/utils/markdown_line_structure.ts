/**
 * Info: (20260810 - Emily) 段落內的換行是作者的斷行,不是可以收掉的空白。
 *
 * ## 問題
 *
 * `3.4 各類排放量計算細節` 在輸出裡是一整片 6,212 字的文字牆
 * (超過 1,000 字的段落共 4 段)。但**結構本來就在**,原始 markdown 是這樣:
 *
 *     3.4 各類排放量計算說明
 *     3.4.1 類別一、直接溫室氣體排放量
 *     (1) 高興昌鋼鐡股份有限公司 總公司
 *     A. 1.1 固定式燃燒
 *
 * markdown 的單一換行是軟斷行,同一段落內會被合併 —— marked 與 react-markdown
 * 的預設 `breaks: false` 皆如此。結構是被渲染器收掉的,不是內容沒有。
 *
 * ## 為什麼不做「合併續行」的聰明版
 *
 * 一開始寫了一版會判斷「這一行是不是被寬度折斷的續行」並把它併回上一行。
 * 實測推翻了那個前提:**這份文件幾乎沒有寬度折行。**
 *
 *     內文行寬  p50=37  p75=56  p90=70  p95=89
 *     「寬度 ≥90 且無句末標點」的行:8 行,而那 8 行的下一行都是 (6) (7) (11)
 *     這類結構開頭 —— 也不是續行
 *
 * 先前看到的「42% 段內換行不以編號開頭」誤導了我:那些行是完整的單位
 * (地址、帶日期的事件、整句),不是被折斷的句子。合併邏輯的複雜度是白付的,
 * 而且它實際會做錯事 —— 三個廠址會被黏成一行,節標題會被吃進內文。
 *
 * ## 為什麼用行尾兩空白而不是 `breaks: true`
 *
 * 行尾兩空白是 markdown 的硬斷行,marked 與 remark 都認,不需要改任一邊的設定、
 * 也不需要多裝 `remark-breaks`。設定是全域的,而這個轉換要能只作用在指定內容上。
 */

const FENCE = /^\s*(```|~~~)/;
const TABLE_ROW = /^\s*\|/;

export const restoreLineStructure = (markdown: string): string => {
  const lines = markdown.split("\n");
  let insideFence = false;

  return lines
    .map((line, index) => {
      if (FENCE.test(line)) {
        insideFence = !insideFence;
        return line;
      }
      // Info: (20260810 - Emily) 圍籬與表格列有自己的斷行語意,加尾隨空白是污染
      if (insideFence || TABLE_ROW.test(line) || line.trim() === "")
        return line;

      const next = lines[index + 1];
      const nextIsBody =
        next !== undefined &&
        next.trim() !== "" &&
        !FENCE.test(next) &&
        !TABLE_ROW.test(next);

      // Info: (20260810 - Emily) 只在「下一行還是內文」時加,段落最後一行不需要
      return nextIsBody ? `${line.replace(/\s+$/, "")}  ` : line;
    })
    .join("\n");
};
