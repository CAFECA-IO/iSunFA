// Info: (20260715 - Luphia) use_carbon_chat 的純函式輔助模組:無 React 狀態相依,獨立可單元測試
// Info: (20260715 - Luphia) 有狀態相依的 useCallback/useEffect 仍留在 hook 本體,避免跨 ref 拆分引入隱性回歸

import { ApiError as RequestApiError } from "@/lib/utils/request";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import {
  JOB_PAUSE_REASON,
  type JobPauseReason,
} from "@/constants/resumable_job";

// Info: (20260714 - Tzuhan) 判斷 API 失敗是否為 AI 額度耗盡(IS000011),前端提示稍候重試
export const isQuotaApiError = (error: unknown): boolean => {
  if (!(error instanceof RequestApiError)) return false;
  const data = error.data as { errorCode?: string } | undefined;
  return data?.errorCode === API_ERRORS.IS_LLM_QUOTA_EXCEEDED.code;
};

/**
 * Info: (20260825 - Luphia) 判斷失敗是否為**使用者的點數用完**（issue #6713）。
 *
 * 這與上面那支 `isQuotaApiError` 是**兩件不同的事**，而混用它們正是這個 bug 的
 * 一半成因：
 *
 * - `IS_LLM_QUOTA_EXCEEDED`（上面那支）＝ **LLM 供應商**的配額用完。與使用者
 *   的錢無關，稍後重試就好。
 * - `TW_QUOTA_EXCEEDED` / `TW_PERSONAL_PAYMENT_REQUIRED`（這支）＝ **使用者的
 *   點數**用完。重試一百次也一樣，要等額度重置、加購點數或升級方案。
 *
 * 在此之前前端只認得前者，於是點數用完會落到「一般失敗」那條路——
 * 而匯入的一般失敗文案是「章節解析失敗」。
 *
 * 回傳暫停原因而不是布林：兩種點數不足的出路不同（一個是等額度／加購，
 * 一個是要簽章付款），而畫面要說得出使用者接下來能做什麼。
 */
export const resolveCreditPauseReason = (
  error: unknown,
): JobPauseReason | null => {
  if (!(error instanceof RequestApiError)) return null;
  const data = error.data as { errorCode?: string } | undefined;
  if (data?.errorCode === API_ERRORS.TW_QUOTA_EXCEEDED.code) {
    return JOB_PAUSE_REASON.CREDITS_EXHAUSTED;
  }
  if (data?.errorCode === API_ERRORS.TW_PERSONAL_PAYMENT_REQUIRED.code) {
    return JOB_PAUSE_REASON.PAYMENT_REQUIRED;
  }
  return null;
};

// Info: (20260716 - Tzuhan) 判斷 API 失敗是否為 AI 回應逾時(IS000012),前端提示重試(#6515)
export const isTimeoutApiError = (error: unknown): boolean => {
  if (!(error instanceof RequestApiError)) return false;
  const data = error.data as { errorCode?: string } | undefined;
  return data?.errorCode === API_ERRORS.IS_LLM_TIMEOUT.code;
};

// Info: (20260730 - Tzuhan) gateway 讀取逾時的 HTTP 狀態:504 由反向代理產生,502/524 為同族群的連線中斷
// Info: (20260730 - Tzuhan) (Bad Gateway / Cloudflare timeout),三者共通點是「請求沒有走完,但伺服端可能仍在跑」
const GATEWAY_TIMEOUT_STATUSES: readonly number[] = [502, 504, 524];

/**
 * Info: (20260730 - Tzuhan) 判斷失敗是否為「連線被中途切斷」而非「工作失敗」。
 * 實測:附件→段落管線約 87s,而 gateway 的 proxy_read_timeout 預設 60s,
 * 連線被切時伺服端其實跑完了、草稿也經 Centrifugo 推達,此時彈「系統錯誤」是誤報。
 * 這類錯誤應改為提示「仍在處理中」,並讓訂閱通道把結果補上。
 */
export const isGatewayTimeoutError = (error: unknown): boolean => {
  if (!(error instanceof RequestApiError)) return false;
  // Info: (20260730 - Tzuhan) 已能辨識的業務錯誤碼(額度/逾時/限流)不算連線中斷,交由原有文案處理
  const data = error.data as { errorCode?: string } | undefined;
  if (data?.errorCode) return false;
  return GATEWAY_TIMEOUT_STATUSES.includes(error.status);
};

// Info: (20260716 - Tzuhan) 取出 API 失敗的錯誤碼(無法辨識回 null),供呼叫端對應專屬文案(#6517)
export const getApiErrorCode = (error: unknown): string | null => {
  if (!(error instanceof RequestApiError)) return null;
  const data = error.data as { errorCode?: string } | undefined;
  return data?.errorCode ?? null;
};

// Info: (20260716 - Tzuhan) 判斷 API 失敗是否為限流(IS000013/HTTP 429),前端提示放慢操作(#6516)
export const isRateLimitedApiError = (error: unknown): boolean => {
  if (!(error instanceof RequestApiError)) return false;
  const data = error.data as { errorCode?: string } | undefined;
  return data?.errorCode === API_ERRORS.IS_RATE_LIMITED.code;
};

/**
 * Info: (20260806 - Tzuhan) 逐會話提示的 reducer(issue_drafts/inventory_table_import/06)。
 *
 * 抽成純函式而不是留在 `setDraftNotice` 裡,是因為這裡的規則有一條**測不到就會回歸**的:
 * 「寫 B 房不得動到 A 房」。那正是原本的 bug —— 匯入跑在 A 房,
 * 切到 B 房隨手做任何會設提示的動作,A 房的進度就被覆蓋掉,
 * 切回 A 房畫面一片乾淨而匯入其實還在跑,於是使用者重新上傳一次。
 *
 * hook 本體目前沒有測試環境(`@testing-library/react` 未安裝,見 enterprise/40),
 * 把不變式放進純函式是現在唯一測得到它的方式。
 */
export type IDraftNoticeMap<TNotice> = Readonly<Record<string, TNotice>>;

/**
 * Info: (20260806 - Tzuhan) 寫入或清除指定會話的提示。
 * `notice` 為 null 即從 map 移除而非留 null —— 留著空鍵會讓「有沒有提示」多一種等價表示。
 * 無變化時回傳原物件(同一參考),避免無謂的重繪。
 */
export const reduceDraftNotice = <TNotice>(
  current: IDraftNoticeMap<TNotice>,
  sessionId: string,
  notice: TNotice | null,
): IDraftNoticeMap<TNotice> => {
  if (!notice) {
    if (!(sessionId in current)) return current;
    const rest = { ...current };
    delete rest[sessionId];
    return rest;
  }
  if (current[sessionId] === notice) return current;
  return { ...current, [sessionId]: notice };
};

/**
 * Info: (20260806 - Tzuhan) 匯入時對「那份檔案」的引用。
 *
 * 一份 64 頁報告要 14 次 `/import` 呼叫,而原本每一次都把整份 PDF 放進 multipart 再傳一次
 * —— 同一個 2.02 MB 的檔案上傳 14 次 ≈ 28 MB,伺服端也跟著重跑 14 次 PDF 文字層抽取。
 *
 * 檔案本體改為選檔時就存進 Laria(`/chat/carbon/attachment`,切片 + Reed-Solomon),
 * 之後只帶 cid。`file` 保留為退路:上傳失敗時仍能直傳,
 * 而「上傳失敗就整個匯入不能做」是不必要的脆弱。
 */
export interface ICarbonImportSource {
  /** Info: (20260806 - Tzuhan) Laria metadata hash;取不到即為 null,由 file 那條路頂上 */
  cid: string | null;
  fileName: string;
  mimeType: string;
  /** Info: (20260806 - Tzuhan) 沒有 cid 時的退路;重載之後只剩 cid,這裡會是 null */
  file: File | null;
}

/**
 * Info: (20260806 - Tzuhan) 把檔案引用寫進 multipart。
 *
 * 有 cid 就只送 cid 與宣告的檔名/型別 —— 伺服端會 `recoverLaria` 取回並**複驗 magic bytes**,
 * 所以宣告的型別不被信任(那正是那道防線要擋的)。
 */
export const appendImportSource = (
  formData: FormData,
  source: ICarbonImportSource,
): void => {
  if (source.cid) {
    formData.append("cid", source.cid);
    formData.append("fileName", source.fileName);
    formData.append("mimeType", source.mimeType);
    return;
  }
  if (source.file) {
    formData.append("file", source.file);
    return;
  }
  /**
   * Info: (20260806 - Tzuhan) 兩者都沒有即無從取得檔案 —— 早點拋,不要送一個註定失敗的請求。
   * 這個情形出現在「重載之後 cid 也沒存下來」,而那是呼叫端該擋的。
   */
  throw new Error("import source has neither cid nor file");
};

/**
 * Info: (20260806 - Tzuhan) 會話清單排序:最近有動作的在最上面。
 *
 * 原本清單是 `Object.values(sessionsData)` 的**插入順序** —— 沒有排序。
 * 看起來像照日期排,是因為 API 回的是 createdAt desc;
 * 而新建的會話用 `{ ...prev, [id]: session }` 加進去,新鍵在物件的最後 ——
 * 於是**新增對話出現在清單最底部**(實測就是這樣)。
 *
 * 排序鍵取 ISO 字串的 `updatedAt`,不取 `time`:後者是 `toLocaleDateString()` 的產物,
 * 只有日期而且格式隨語系變(zh-TW 的 `2026/8/6` 與 en-US 的 `8/6/2026` 字典序完全不同)。
 * 在中文環境「剛好會對」的排序,換個語系就錯,而那種錯沒有人會聯想到排序。
 *
 * 缺 `updatedAt` 的(舊的本機快取)排在有值者之後 —— 不假裝它很新;
 * 同組之內維持原順序(穩定排序),否則每次 render 的順序都可能不同。
 */
export const sortSessionsByRecency = <T extends { updatedAt?: string }>(
  sessions: readonly T[],
): T[] =>
  sessions
    .map((session, index) => ({ session, index }))
    .sort((a, b) => {
      const left = a.session.updatedAt;
      const right = b.session.updatedAt;
      if (left && right && left !== right) return left < right ? 1 : -1;
      if (left && !right) return -1;
      if (!left && right) return 1;
      // Info: (20260806 - Tzuhan) 同時間或都沒有時間:維持原順序(穩定)
      return a.index - b.index;
    })
    .map(({ session }) => session);

// Info: (20260716 - Tzuhan) #50 報告 Markdown 切分(保留式,fence-aware):
// Info: (20260716 - Tzuhan) 舊版以 regex 切 `### ` 且丟棄不符結構的內容 → 貼上內容靜默遺失;
// Info: (20260716 - Tzuhan) 新版逐行掃描:程式碼圍欄內的 ### 不觸發切分,所有內容都有去處(零丟棄)
export interface IMarkdownSection {
  heading: string;
  body: string;
}

export interface ISplitReportMarkdown {
  // Info: (20260716 - Tzuhan) 第一個 ### 之前的內容(組稿標頭 + 使用者可能貼上的前言)
  preamble: string;
  sections: IMarkdownSection[];
}

// Info: (20260716 - Tzuhan) 去除組稿時附加於各段尾端的 --- 分隔線
const stripTrailingDivider = (lines: string[]): string =>
  lines
    .join("\n")
    .replace(/\n+---\s*$/, "")
    .trim();

export const splitReportMarkdownSections = (
  markdown: string,
): ISplitReportMarkdown => {
  const lines = markdown.split("\n");
  const sections: IMarkdownSection[] = [];
  const preambleLines: string[] = [];
  // Info: (20260720 - Tzuhan) flush 以參數傳入(而非閉包讀取):closure 內賦值會讓 TS 對閉包外的
  // Info: (20260720 - Tzuhan) narrowing 失效(推成 never),參數化後型別收窄在函式邊界內完成
  const flushSection = (open: { heading: string; lines: string[] } | null) => {
    if (open) {
      sections.push({
        heading: open.heading,
        body: stripTrailingDivider(open.lines),
      });
    }
  };
  let current: { heading: string; lines: string[] } | null = null;
  let inFence = false;

  lines.forEach((line) => {
    // Info: (20260716 - Tzuhan) 圍欄開闔(``` 或 ~~~):圍欄內任何行都不觸發段落切分
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    if (!inFence && line.startsWith("### ")) {
      flushSection(current);
      current = { heading: line.slice(4).trim(), lines: [] };
      return;
    }
    if (current) {
      current.lines.push(line);
    } else {
      preambleLines.push(line);
    }
  });
  flushSection(current);
  return { preamble: preambleLines.join("\n").trim(), sections };
};

/**
 * Info: (20260716 - Tzuhan) #50 標題對齊(取代舊「區塊數 1:1 對位」— 貼上多一個標題就整批丟棄編輯):
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

  // Info: (20260716 - Tzuhan) 濾除組稿標頭後殘餘的前言 = 使用者貼上的內容,不可丟
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
      // Info: (20260716 - Tzuhan) 未知標題:原文保留(含標題行),掛前一個相符段落;無前者先暫存
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
 * Info: (20260716 - Tzuhan) 以標題 patch 報告全文的對應段落(rawMarkdown 權威來源的唯一寫入方式):
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
    // Info: (20260716 - Tzuhan) 標題不存在:附加於文末,不動既有內容
    return `${markdown.replace(/\n+$/, "")}\n\n${heading}\n\n${newBody}\n`;
  }

  // Info: (20260716 - Tzuhan) 保留段落間的 --- 分隔線(若原本有):偵測區段尾端的分隔線
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

/**
 * Info: (20260813 - Luphia) 無帳本會話的待付款 402（設計書 §5.5）。
 *
 * 個人點數在鏈上、扣款需簽章，因此後端先建單並以此錯誤回傳 orderId；
 * 呼叫端付款後以**相同的 clientMessageId** 重送，冪等鍵不變才會找回那張已付訂單。
 * payload 形狀不符即回 null——沒有 orderId 就無從付款，退回一般錯誤處理。
 */
export const parsePersonalPaymentRequired = (
  error: unknown,
): { orderId: string; cost: number } | null => {
  if (!(error instanceof RequestApiError)) return null;
  const body = error.data as
    | { errorCode?: string; payload?: unknown }
    | undefined;
  if (body?.errorCode !== API_ERRORS.TW_PERSONAL_PAYMENT_REQUIRED.code) {
    return null;
  }
  const payload = body.payload as
    | { orderId?: unknown; cost?: unknown }
    | undefined;
  if (
    typeof payload?.orderId !== "string" ||
    typeof payload.cost !== "number"
  ) {
    return null;
  }
  return { orderId: payload.orderId, cost: payload.cost };
};
