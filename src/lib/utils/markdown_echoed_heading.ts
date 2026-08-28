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
//
// Info: (20260827 - Emily) 字串不同那一半的立場已定(#6705):**原文標題被大綱涵蓋就剝**。
// Info: (20260827 - Emily) 判準是「有沒有原文獨有的字」,不是「哪一個比較好」:
// Info: (20260827 - Emily) 大綱「1.5 組織邊界設定方法」+ 原文「1.5 組織邊界」→ 剝
// Info: (20260827 - Emily) (去節號後「組織邊界」是「組織邊界設定方法」的子串,零資訊損失);
// Info: (20260827 - Emily) 大綱「1.5 組織邊界設定方法」+ 原文「1.5 組織邊界與設施清單」→ **保留**
// Info: (20260827 - Emily) (「設施清單」是原文獨有的資訊,剝掉就是刪原文)。
//
// Info: (20260827 - Emily) 涵蓋判定要有**節號當錨**(或 `#` 前綴):否則一句剛好是標題子串的
// Info: (20260827 - Emily) 正常內文(標題「3.2 排放源鑑別」+ 內文首行「排放源」)也會被剝 ——
// Info: (20260827 - Emily) 那是刪內容,不是去重複。節號相同是「這一行在講同一節」的證據。
//
// Info: (20260819 - Emily) `content` 本身不變(ADR 014 的逐字照錄),剝除只發生在渲染。

import { FENCE_PATTERN } from "@/lib/utils/markdown_comment";
// Info: (20260820 - Emily) 比對用正規化走 canonical 那一支(PR review B1)
import { squeezeForMatch } from "@/lib/utils/squeeze_for_match";

/** Info: (20260819 - Emily) ATX 標頭;允許最多三格縮排與尾端的收尾井號 */
const HEADING_PATTERN = /^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/;

/**
 * Info: (20260827 - Emily) 節號:章節編號或「第 N 章」。
 * 用它當「這一行在講同一節」的錨,而不是單憑文字相似度(見檔頭)。
 */
const SECTION_NUMBER_PATTERN =
  /^(第[〇零一二三四五六七八九十百千]+章|[0-9]+(?:\.[0-9]+)*)/;

interface ISectionLabel {
  /** 節號(正規化後);無節號為空字串 */
  number: string;
  /** 去掉節號後的標題文字(正規化後) */
  text: string;
}

const toSectionLabel = (raw: string): ISectionLabel => {
  const squeezed = squeezeForMatch(raw);
  const matched = SECTION_NUMBER_PATTERN.exec(squeezed);
  if (!matched) return { number: "", text: squeezed };
  return {
    number: matched[1],
    // Info: (20260827 - Emily) 節號後常見的連接標點一併去掉(「1.5、組織邊界」)
    text: squeezed.slice(matched[1].length).replace(/^[、,,::.。\-—－]+/, ""),
  };
};

/**
 * Info: (20260827 - Emily) 這一行是否為「被標題涵蓋的原文標題」(#6705)。
 *
 * 三個條件同時成立才算:
 * 1. 有錨 —— 兩行的節號相同(且非空),或這一行本身是 ATX 標頭
 * 2. 文字非空,且是標題文字的子串(去空白/NFKC 後)—— 沒有原文獨有的字
 * 3. 不是完整句子 —— 帶句末標點的一行是內文,不是標題
 */
const SENTENCE_TAIL = /[。!?!?;;]$/;

const isCoveredByHeading = (
  heading: ISectionLabel,
  line: ISectionLabel,
  lineIsHeading: boolean,
): boolean => {
  if (line.text.length === 0) return false;
  if (SENTENCE_TAIL.test(line.text)) return false;
  const anchored =
    lineIsHeading || (line.number.length > 0 && line.number === heading.number);
  if (!anchored) return false;
  return heading.text.includes(line.text);
};

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
  /** Info: (20260827 - Emily) 完全相同那半用原字串比(語意與 08-19 版一致);涵蓋那半用節號+文字比 */
  let pendingSqueezed: string | null = null;
  let pendingHeading: ISectionLabel | null = null;

  lines.forEach((line) => {
    if (FENCE_PATTERN.test(line)) {
      inFence = !inFence;
      pendingHeading = null;
      pendingSqueezed = null;
      kept.push(line);
      return;
    }
    if (inFence || line.trim().length === 0) {
      kept.push(line);
      return;
    }
    const heading = HEADING_PATTERN.exec(line);
    const raw = heading ? heading[2] : line;
    const squeezed = squeezeForMatch(raw);
    if (pendingSqueezed !== null && pendingHeading !== null) {
      const identical = squeezed === pendingSqueezed;
      const covered = isCoveredByHeading(
        pendingHeading,
        toSectionLabel(raw),
        Boolean(heading),
      );
      if (identical || covered) return;
    }
    pendingHeading = heading ? toSectionLabel(raw) : null;
    pendingSqueezed = heading ? squeezed : null;
    kept.push(line);
  });

  return kept.join("\n");
};
