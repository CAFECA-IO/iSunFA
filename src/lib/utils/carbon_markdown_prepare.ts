// Info: (20260820 - Emily) 兩個渲染端共用的前置轉換。**順序寫在這裡，不寫在註解裡。**
//
// Info: (20260820 - Emily) 起因：`markdown_content.tsx` 與 `carbon_report_html.ts` 各自
// Info: (20260820 - Emily) 排一串轉換，靠兩邊各寫一則註解互相引用來維持一致。
// Info: (20260820 - Emily) 而那句「順序完全一致」在 PR review 時已經不成立 ——
// Info: (20260820 - Emily) `stripLeadingDocumentTitle` 兩邊的位置不同，於是同一份輸入
// Info: (20260820 - Emily) 產出不同結果：
//
// Info: (20260820 - Emily)   輸入   <!-- draft note -->\n# 高興昌 溫室氣體盤查報告書\n\n內文
// Info: (20260820 - Emily)   預覽端 → 報告名稱留著（剝除只看第一個非空行，被那行註解擋住）
// Info: (20260820 - Emily)   匯出端 → 報告名稱被剝掉（先剝註解，第一行才是 H1）
//
// Info: (20260820 - Emily) 而系統**刻意**把 HTML 註解存在 markdown 裡當段落錨點
// Info: (20260820 - Emily)（見 `markdown_comment.ts` 檔頭），所以那不是假想輸入。
//
// Info: (20260820 - Emily) 這是本產品線第五次「修正端 ≠ 生效端」——
// Info: (20260820 - Emily) 前四次（文件級 H1、timeline、私有區符號、表頭補欄）都是
// Info: (20260820 - Emily) 被回報「沒修好」才發現。第五次是靠 review 在出事之前抓到的。
//
// Info: (20260820 - Emily) 註解防不住順序，函式可以。兩端各呼叫這一支一次。

import { stripMarkdownComments } from "@/lib/utils/markdown_comment";
import { stripHtmlLineBreaksOutsideFences } from "@/lib/utils/markdown_line_break";
import { stripLeadingDocumentTitle } from "@/lib/utils/carbon_report_title";
import { replaceOfficeSymbolChars } from "@/lib/utils/office_symbol_chars";
import { stripEchoedSectionHeadings } from "@/lib/utils/markdown_echoed_heading";

export interface IPreparedCarbonMarkdown {
  /** Info: (20260820 - Emily) 前置轉換完成的 markdown */
  markdown: string;
  /**
   * Info: (20260820 - Emily) 被剝下來的文件級標題（`stripDocumentTitle` 為 false 時是空字串）。
   * 回傳而不是丟掉：既有草稿的第一行烤著 `# <會話名>`，那是目前唯一的名稱來源。
   */
  documentTitle: string;
}

/**
 * Info: (20260820 - Emily) 順序的四個約束，每一個都有實測依據：
 *
 * 1. `stripMarkdownComments` 要在最前面 —— 段落錨點的 HTML 註解會擋住
 *    後面每一支「只看第一個非空行」或「看相鄰行」的轉換。
 * 2. `stripLeadingDocumentTitle` 要在剝註解**之後** ——
 *    否則註解在 H1 前面時漏剝（見檔頭那個實測輸入）。
 * 3. `stripEchoedSectionHeadings` 要在剝註解之後（相鄰判定會被註解擋掉），
 *    且要在任何**插入換行**的轉換之前（`restoreLineStructure` /
 *    `splitInlineListItems` 會把同文那一行拆開，就不再等於標題）。
 *    那兩支都在本函式之後，由各端自行決定。
 * 4. `replaceOfficeSymbolChars` 排在 echo 之前：標題字串裡若有 Word 私有區符號，
 *    換過之後兩邊比對才對得上。它是冪等且不改長度的，各端後面再套一次無害。
 *
 * ⚠ 本函式**只涵蓋兩端真正共用的前段**。之後的步驟兩端仍然不同
 * （預覽是 timeline → padHeaders → split/restore；匯出是 split/restore →
 * office → timeline → padHeaders，而且預覽把 split/restore 掛在
 * `restoreSourceLineBreaks` 開關下）。那個分歧是既有的、與本次修正無關，
 * 已另開票處理 —— 不在這裡順手擴大範圍。
 */
export const prepareCarbonMarkdown = (
  markdown: string,
  options: { stripDocumentTitle: boolean },
): IPreparedCarbonMarkdown => {
  const cleaned = stripHtmlLineBreaksOutsideFences(
    stripMarkdownComments(markdown),
  );
  const titled = options.stripDocumentTitle
    ? stripLeadingDocumentTitle(cleaned)
    : { title: "", body: cleaned };

  return {
    markdown: stripEchoedSectionHeadings(replaceOfficeSymbolChars(titled.body)),
    documentTitle: titled.title,
  };
};
