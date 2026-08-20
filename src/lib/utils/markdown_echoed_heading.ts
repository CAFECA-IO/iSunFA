// Info: (20260819 - Emily) 標頭被印兩次:標題行之後緊接一行**同樣文字**的內容(`open/36` 的一半)。
//
// Info: (20260819 - Emily) 成因:組稿端一律由 `p.title` 產生標頭,而 `content` 的第一行
// Info: (20260819 - Emily) 有時就是那個標題(原文照錄帶進來的、或模型回抄的)。
// Info: (20260819 - Emily) 既有的 `stripLeadingSectionHeading` 只剝 `###` 開頭的行,
// Info: (20260819 - Emily) 沒有 `#` 前綴的那一行因此活下來,於是紙上同一句話印兩次。
//
// Info: (20260819 - Emily) 為什麼在讀取端剝而不改組稿端:`reportData.rawMarkdown` 是權威來源
// Info: (20260819 - Emily) 而且是逐段 patch 的 —— 既有草稿早就把那一行存進去了,
// Info: (20260819 - Emily) 改產生端不會改變已經存在的報告。這與文件級 H1、timeline、
// Info: (20260819 - Emily) 私有區符號、表頭補欄是同一個形狀(修正端 ≠ 生效端),
// Info: (20260819 - Emily) 而那幾次都因為改錯端被回報「沒修好」。
//
// Info: (20260819 - Emily) 為什麼只處理「完全相同」那一半:兩邊字串相同時**沒有取捨** ——
// Info: (20260819 - Emily) 沒有任何原文資訊會因為丟掉這一行而消失。
// Info: (20260819 - Emily) 字串不同的那一半(標題「1.3 氣候與永續政策聲明」+ 原文「1.3政策聲明」)
// Info: (20260819 - Emily) 需要先決定保哪一個,那是 `open/36` 未決的立場問題,不在這裡動。
//
// Info: (20260819 - Emily) `content` 本身不變(ADR 014 的逐字照錄),剝除只發生在渲染。

import { FENCE_PATTERN } from "@/lib/utils/markdown_comment";
// Info: (20260820 - Emily) 比對用正規化走 canonical 那一支(PR review B1)
import { squeezeForMatch } from "@/lib/utils/squeeze_for_match";

/** Info: (20260819 - Emily) ATX 標頭;允許最多三格縮排與尾端的收尾井號 */
const HEADING_PATTERN = /^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/;

/**
 * Info: (20260819 - Emily) 剝掉緊接在標題之後、與該標題文字完全相同的行。
 *
 * 純函數、冪等(剝完之後不再有可剝的對象),程式碼區塊內原樣保留 ——
 * 使用者貼 markdown 教學範例時,fence 內的重複標題是內容。
 *
 * 連續多份重複都會被剝(`pendingHeading` 不因剝除而清空);
 * 一旦遇到任何不相同的非空行就停止,所以文件後面剛好等於標題的段落不受影響。
 */
export const stripEchoedSectionHeadings = (content: string): string => {
  const lines = content.split("\n");
  const kept: string[] = [];
  let inFence = false;
  let pendingHeading: string | null = null;

  lines.forEach((line) => {
    if (FENCE_PATTERN.test(line)) {
      inFence = !inFence;
      pendingHeading = null;
      kept.push(line);
      return;
    }
    if (inFence || line.trim().length === 0) {
      kept.push(line);
      return;
    }
    const heading = HEADING_PATTERN.exec(line);
    const candidate = squeezeForMatch(heading ? heading[2] : line);
    if (pendingHeading !== null && candidate === pendingHeading) return;
    pendingHeading = heading ? candidate : null;
    kept.push(line);
  });

  return kept.join("\n");
};
