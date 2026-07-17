// Info: (20260715 - Luphia) use_carbon_chat 的純函式輔助模組:無 React 狀態相依,獨立可單元測試
// Info: (20260715 - Luphia) 有狀態相依的 useCallback/useEffect 仍留在 hook 本體,避免跨 ref 拆分引入隱性回歸

import { ApiError as RequestApiError } from "@/lib/utils/request";
import { API_ERRORS } from "@/lib/utils/error_dictionary";

// Info: (20260714 - Emily) 判斷 API 失敗是否為 AI 額度耗盡(IS000011),前端提示稍候重試
export const isQuotaApiError = (error: unknown): boolean => {
  if (!(error instanceof RequestApiError)) return false;
  const data = error.data as { errorCode?: string } | undefined;
  return data?.errorCode === API_ERRORS.IS_LLM_QUOTA_EXCEEDED.code;
};

// Info: (20260716 - Emily) 判斷 API 失敗是否為 AI 回應逾時(IS000012),前端提示重試(#6515)
export const isTimeoutApiError = (error: unknown): boolean => {
  if (!(error instanceof RequestApiError)) return false;
  const data = error.data as { errorCode?: string } | undefined;
  return data?.errorCode === API_ERRORS.IS_LLM_TIMEOUT.code;
};

// Info: (20260716 - Emily) 取出 API 失敗的錯誤碼(無法辨識回 null),供呼叫端對應專屬文案(#6517)
export const getApiErrorCode = (error: unknown): string | null => {
  if (!(error instanceof RequestApiError)) return null;
  const data = error.data as { errorCode?: string } | undefined;
  return data?.errorCode ?? null;
};

// Info: (20260716 - Emily) 判斷 API 失敗是否為限流(IS000013/HTTP 429),前端提示放慢操作(#6516)
export const isRateLimitedApiError = (error: unknown): boolean => {
  if (!(error instanceof RequestApiError)) return false;
  const data = error.data as { errorCode?: string } | undefined;
  return data?.errorCode === API_ERRORS.IS_RATE_LIMITED.code;
};

// Info: (20260716 - Emily) #50 報告 Markdown 切分(保留式,fence-aware):
// Info: (20260716 - Emily) 舊版以 regex 切 `### ` 且丟棄不符結構的內容 → 貼上內容靜默遺失;
// Info: (20260716 - Emily) 新版逐行掃描:程式碼圍欄內的 ### 不觸發切分,所有內容都有去處(零丟棄)
export interface IMarkdownSection {
  heading: string;
  body: string;
}

export interface ISplitReportMarkdown {
  // Info: (20260716 - Emily) 第一個 ### 之前的內容(組稿標頭 + 使用者可能貼上的前言)
  preamble: string;
  sections: IMarkdownSection[];
}

// Info: (20260716 - Emily) 去除組稿時附加於各段尾端的 --- 分隔線
const stripTrailingDivider = (lines: string[]): string =>
  lines.join("\n").replace(/\n+---\s*$/, "").trim();

export const splitReportMarkdownSections = (
  markdown: string,
): ISplitReportMarkdown => {
  const lines = markdown.split("\n");
  const sections: IMarkdownSection[] = [];
  const preambleLines: string[] = [];
  let current: { heading: string; lines: string[] } | null = null;
  let inFence = false;

  lines.forEach((line) => {
    // Info: (20260716 - Emily) 圍欄開闔(``` 或 ~~~):圍欄內任何行都不觸發段落切分
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    if (!inFence && line.startsWith("### ")) {
      if (current) {
        sections.push({
          heading: current.heading,
          body: stripTrailingDivider(current.lines),
        });
      }
      current = { heading: line.slice(4).trim(), lines: [] };
      return;
    }
    if (current) {
      current.lines.push(line);
    } else {
      preambleLines.push(line);
    }
  });
  if (current) {
    sections.push({
      heading: current.heading,
      body: stripTrailingDivider(current.lines),
    });
  }
  return { preamble: preambleLines.join("\n").trim(), sections };
};

/**
 * Info: (20260716 - Emily) #50 標題對齊(取代舊「區塊數 1:1 對位」— 貼上多一個標題就整批丟棄編輯):
 * - section 標題與段落標題完全相符 → 內容歸該段
 * - 不相符的 section(使用者貼上的自訂標題)→ 原文(含 ### 標題)併入前一個相符段落尾端,零丟棄
 * - 前置孤兒(第一個相符段落之前)與「非組稿標頭的前言」→ 併入第一個相符段落開頭
 * - 組稿標頭(# 標題、> _狀態_、--- 、空行)自 preamble 濾除(組稿時會重建,非使用者內容)
 * 回傳 Map<段落 index, 對齊後 body>;未出現在文本中的段落不在 Map 內(呼叫端保留原內容)
 */
export const alignReportSections = (
  paragraphTitles: string[],
  split: ISplitReportMarkdown,
): Map<number, string> => {
  const indexByTitle = new Map(
    paragraphTitles.map((title, index) => [title.trim(), index]),
  );

  // Info: (20260716 - Emily) 濾除組稿標頭後殘餘的前言 = 使用者貼上的內容,不可丟
  const userPreamble = split.preamble
    .split("\n")
    .filter(
      (line) =>
        line.trim() !== "" &&
        line.trim() !== "---" &&
        !line.startsWith("# ") &&
        !/^>\s*_.*_$/.test(line.trim()),
    )
    .join("\n")
    .trim();

  const aligned = new Map<number, string>();
  let lastMatchedIndex: number | null = null;
  const leadingOrphans: string[] = userPreamble ? [userPreamble] : [];

  split.sections.forEach((section) => {
    const index = indexByTitle.get(section.heading);
    if (index === undefined) {
      // Info: (20260716 - Emily) 未知標題:原文保留(含標題行),掛前一個相符段落;無前者先暫存
      const orphanText = `### ${section.heading}\n\n${section.body}`.trim();
      if (lastMatchedIndex !== null) {
        const prev = aligned.get(lastMatchedIndex) ?? "";
        aligned.set(lastMatchedIndex, `${prev}\n\n${orphanText}`.trim());
      } else {
        leadingOrphans.push(orphanText);
      }
      return;
    }
    let body = section.body;
    if (leadingOrphans.length > 0) {
      body = `${leadingOrphans.join("\n\n")}\n\n${body}`.trim();
      leadingOrphans.length = 0;
    }
    aligned.set(index, body);
    lastMatchedIndex = index;
  });

  return aligned;
};

/**
 * Info: (20260716 - Emily) 以標題 patch 報告全文的對應段落(rawMarkdown 權威來源的唯一寫入方式):
 * - fence-aware:程式碼圍欄內的 ### 不視為段落邊界
 * - 標題存在 → 僅替換該段內文(標題行與其後結構原樣保留)
 * - 標題不存在 → 附加於文末(不重排使用者的既有結構)
 */
export const patchMarkdownSection = (
  markdown: string,
  headingTitle: string,
  newBody: string,
): string => {
  const lines = markdown.split("\n");
  const heading = `### ${headingTitle.trim()}`;
  let inFence = false;
  let start = -1;
  let end = lines.length;

  for (let i = 0; i < lines.length; i++) {
    if (/^\s*(```|~~~)/.test(lines[i])) inFence = !inFence;
    if (inFence) continue;
    if (start === -1 && lines[i].trim() === heading) {
      start = i;
      continue;
    }
    if (start !== -1 && lines[i].startsWith("### ")) {
      end = i;
      break;
    }
  }

  if (start === -1) {
    // Info: (20260716 - Emily) 標題不存在:附加於文末,不動既有內容
    return `${markdown.replace(/\n+$/, "")}\n\n${heading}\n\n${newBody}\n`;
  }

  // Info: (20260716 - Emily) 保留段落間的 --- 分隔線(若原本有):偵測區段尾端的分隔線
  const section = lines.slice(start + 1, end);
  const hasDivider = section.some((line) => line.trim() === "---");
  const replacement = [
    lines[start],
    "",
    newBody,
    ...(hasDivider ? ["", "---"] : []),
  ];
  return [...lines.slice(0, start), ...replacement, "", ...lines.slice(end)]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
};
