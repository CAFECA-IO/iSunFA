// Info: (20260730 - Tzuhan) Markdown 顯示層的 HTML 註解剝除(fence-aware)
// Info: (20260730 - Tzuhan) 背景:react-markdown 未啟用 rehype-raw,HTML 註解會被當純文字印出來。
// Info: (20260730 - Tzuhan) 系統以註解作段落錨點(carbon-data-table / carbon-chart / carbon-diagram,
// Info: (20260730 - Tzuhan) 重算連動據此原地替換),錨點必須留在原文、只在渲染時隱藏。
// Info: (20260730 - Tzuhan) 但剝除**必須跳過程式碼區塊**:使用者貼 HTML 教學範例時,
// Info: (20260730 - Tzuhan) fence 內的 `<!-- ... -->` 是內容而不是錨點,吃掉它就是靜默改寫使用者的文件。

/**
 * Info: (20260730 - Tzuhan) 圍欄起訖(``` 或 ~~~,允許前置空白與資訊字串)
 *
 * Info: (20260804 - Tzuhan) 導出供 markdown_line_break 共用:
 * 兩處都要「跳過程式碼區塊」,而判斷圍欄的規則只能有一份。
 * (兩邊各自的狀態機仍是分開的 —— 本檔多一層跨行註解狀態,
 *  抽成共用的 line mapper 需要一併重寫那段,見 issue_drafts/markdown_content/01。)
 */
export const FENCE_PATTERN = /^\s*(```|~~~)/;

// Info: (20260730 - Tzuhan) 單行內的完整註解;跨行註解另以狀態機處理
const INLINE_COMMENT_PATTERN = /<!--.*?-->/g;

/**
 * Info: (20260730 - Tzuhan) 移除程式碼區塊之外的 HTML 註解(含跨行註解),fence 內原樣保留。
 * 純函數;僅影響顯示,呼叫端不得用它改寫要保存的內容。
 */
export function stripMarkdownComments(content: string): string {
  const lines = content.split("\n");
  const output: string[] = [];
  let inFence = false;
  let inComment = false;

  lines.forEach((line) => {
    if (FENCE_PATTERN.test(line)) {
      inFence = !inFence;
      output.push(line);
      return;
    }
    if (inFence) {
      // Info: (20260730 - Tzuhan) 程式碼區塊內一律原樣輸出(即使含註解語法)
      output.push(line);
      return;
    }

    if (inComment) {
      const end = line.indexOf("-->");
      if (end === -1) return;
      inComment = false;
      const rest = line.slice(end + 3);
      const cleaned = rest.replace(INLINE_COMMENT_PATTERN, "");
      // Info: (20260730 - Tzuhan) 註解結束後若同行還有內容才輸出,否則整行捨去(不留空行殘渣)
      if (cleaned.trim().length > 0) output.push(cleaned);
      return;
    }

    let cleaned = line.replace(INLINE_COMMENT_PATTERN, "");
    const openIndex = cleaned.indexOf("<!--");
    if (openIndex !== -1) {
      // Info: (20260730 - Tzuhan) 未閉合 → 進入跨行註解狀態,保留註解前的內容
      inComment = true;
      cleaned = cleaned.slice(0, openIndex);
    }
    // Info: (20260730 - Tzuhan) 原本就是空行要保留(段落間距);只有「被註解清空的行」才捨去
    if (cleaned.trim().length > 0 || line.trim().length === 0) {
      output.push(cleaned);
    }
  });

  return output.join("\n");
}
