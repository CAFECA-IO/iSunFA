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
//
// Info: (20260831 - Emily) **涵蓋範圍(以輸入空間描述)與最壞後果**(PR #6729 review §2.5)。
//
// 這個模組把剝除從「兩行完全相同」放寬到「被標題涵蓋」,而放寬護欄要說得出
// 「現在最多能發生多壞」與「在什麼輸入上成立」。寫成 when 子句:
//
//   **當一行的節號取自章節編號(而非有序清單標記),且它不是完整句子時**,
//   涵蓋判定只會剝掉「沒有原文獨有文字」的那一行。
//
// 那個 when 子句本身就是判準的邊界 —— 第一版沒有寫它,而漏掉的正是括號裡那半:
// `1. 溫室氣體` 的 `1.` 被讀成節號,清單首項被當回聲刪掉(review 高-2)。
//
// **最壞後果**:誤剝 = 從紙上刪掉一行原文,而且無聲(草稿裡還在、紙上沒有,
// 對外送查證的是紙本)。因此所有取捨一律往「保留」倒:
// 分不出是回聲還是內容時保留,漏剝只是同一句印兩次。

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

/**
 * Info: (20260831 - Emily) 有序清單標記**不是**節號(PR #6729 review 高-2)。
 *
 * 連接標點的字元類含 `.`,於是 markdown 的 `1. 溫室氣體` 被讀成
 * 「節號 1 + 文字 溫室氣體」—— 清單項於是變成「在講第 1 節的一行」,
 * 文字又是標題的子串,結果**清單首項被當成回聲標題刪掉**:
 *
 *   "## 1 溫室氣體盤查範圍\n1. 溫室氣體\n2. 邊界" → 首項消失,清單從 2. 開始
 *
 * 三個觸發條件都是日常形狀:章節標題 `## 1 X` 後面接一個從 `1.` 開始的清單時
 * 節號必然相同;盤查報告的標題常是「清單項＋修飾語」;清單項通常沒有句末標點。
 * 與這輪修掉的高-1 是**同一類缺陷從另一個門進來** —— 我補了 ATX 那個旁路,
 * 卻沒有回頭問「還有什麼會被誤認成節號」。
 *
 * 分辨的資訊本來就在手上:`SECTION_NUMBER_PATTERN` 對 `1.` 只吃到 `1`,
 * 是後面那個 replace 把「後面跟著一個點」這件事丟掉的。
 * 節號的點**後面必須有數字**(`1.5`),清單標記的點後面不是數字(`1.` / `1)`)。
 *
 * 失效方向是刻意的:寫成有序清單形式的**真回聲**(`1. 溫室氣體盤查範圍`)
 * 從此不會被剝。誤剝是刪內容、漏剝只是印兩次,兩者代價不對等。
 */
const LIST_MARKER_AFTER_NUMBER = /^[.)](?:[^0-9]|$)/;

const toSectionLabel = (raw: string): ISectionLabel => {
  const squeezed = squeezeForMatch(raw);
  const matched = SECTION_NUMBER_PATTERN.exec(squeezed);
  if (!matched) return { number: "", text: squeezed };
  const rest = squeezed.slice(matched[1].length);
  // Info: (20260831 - Emily) `1.` / `1)` 是清單標記 → 這一行沒有節號,錨不成立(高-2)
  if (LIST_MARKER_AFTER_NUMBER.test(rest))
    return { number: "", text: squeezed };
  return {
    number: matched[1],
    // Info: (20260827 - Emily) 節號後常見的連接標點一併去掉(「1.5、組織邊界」)
    text: rest.replace(/^[、,,::.。\-—－]+/, ""),
  };
};

/**
 * Info: (20260827 - Emily) 這一行是否為「被標題涵蓋的原文標題」(#6705)。
 *
 * 三個條件同時成立才算:
 * 1. 有錨 —— 兩行的節號**相同且非空**
 * 2. 文字非空,且是標題文字的子串(去空白/NFKC 後)—— 沒有原文獨有的字
 * 3. 不是完整句子 —— 帶句末標點的一行是內文,不是標題
 *
 * Info: (20260831 - Emily) 錨只認節號:「這一行本身是 ATX 標頭」**不構成錨**
 * (PR #6729 review 高-1)。
 *
 * 第一版寫成 `lineIsHeading || 節號相同`,而那條旁路把節號比對整個繞過 ——
 * reviewer 拿本函式編譯後實跑的兩個案例:
 *   `## 1.5 組織邊界設定方法` + `### 1.5.1 組織邊界`      → 子節標題被剝掉
 *   `## 3.2 排放源鑑別與量化方法` + `### 排放源鑑別`        → 子節標題被剝掉
 * `1.5.1 ≠ 1.5`,但因為那一行是 `###` 就過了錨,接著文字又是子串 → 剝。
 *
 * 而 1.5 / 1.5.1 這種父子節、且「節標題後緊接第一個子節標題、中間沒有內文」
 * 是盤查報告最普通的排版。命中之後子節標題從紙上消失、底下的內文留著,
 * 讀者會把 1.5.1 的內容讀成 1.5 的內容;而剝除只在渲染端,草稿裡還在、
 * 紙上沒有,對外送查證的是紙本 —— 稽核者比對原文時會發現少一個節。全程無聲。
 *
 * **一行是 ATX 標頭,代表它更可能是原文真正的結構節點,不是被回聲的標題** ——
 * 錨本來要防「刪內容」,那條旁路偏偏在最像真標題的一格失守。
 *
 * 若日後真的遇到「回聲以 ATX 形式出現且節號對不上」而需要放寬,正確的收法是
 * **加深度條件**(ATX 深度比大綱標題更深的一行是子節,不是回聲),
 * 而不是拿掉節號比對;在有實例之前不先寫。
 * 節號相同的 ATX 回聲(`## 1.5 組織邊界設定方法` + `### 1.5 組織邊界`)
 * 仍然由節號那條錨接住,沒有因為這次收緊而漏掉。
 */
const SENTENCE_TAIL = /[。!?!?;;]$/;

const isCoveredByHeading = (
  heading: ISectionLabel,
  line: ISectionLabel,
): boolean => {
  if (line.text.length === 0) return false;
  if (SENTENCE_TAIL.test(line.text)) return false;
  const anchored = line.number.length > 0 && line.number === heading.number;
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
      const covered = isCoveredByHeading(pendingHeading, toSectionLabel(raw));
      if (identical || covered) return;
    }
    pendingHeading = heading ? toSectionLabel(raw) : null;
    pendingSqueezed = heading ? squeezed : null;
    kept.push(line);
  });

  return kept.join("\n");
};
