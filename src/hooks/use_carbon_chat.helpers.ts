// Info: (20260715 - Luphia) use_carbon_chat 的純函式輔助模組:無 React 狀態相依,獨立可單元測試
// Info: (20260715 - Luphia) 有狀態相依的 useCallback/useEffect 仍留在 hook 本體,避免跨 ref 拆分引入隱性回歸

import { ApiError as RequestApiError } from "@/lib/utils/request";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import {
  JOB_CLAIM_DENIAL,
  JOB_PAUSE_REASON,
  type JobClaimDenial,
  type JobPauseReason,
} from "@/constants/resumable_job";
import { type IImportUnit } from "@/lib/carbon_page_slice";
import type { ICreditPauseDetail } from "@/constants/carbon_chatbot";
import {
  parseQuotaExceededError,
  resolveQuotaResetAt,
} from "@/lib/quota/quota_notice";
import type { ICarbonSourceTable } from "@/lib/carbon_source_table.builder";
import { CARBON_SOURCE_TABLE_MAX_PER_PARAGRAPH } from "@/constants/carbon_source_tables";
import type { IActivityRecord } from "@/types/carbon_chatbot.types";

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
/**
 * Info: (20260828 - Julian) **尚未做**：把 402 的 payload 一起帶下來
 *（計劃 `resumable_job_resume_landing_and_copy.md` §4）。
 *
 * 這支現在只取 `errorCode`，其餘整包丟掉。而伺服器那邊事實是齊的：
 * `buildQuotaExceededPayload` 回的 402 帶著 `exceeded`（哪個視窗先卡）、
 * 兩個視窗各自的 `limit`/`used`/`resetAt`、以及 `exceedsWindowLimit`
 *（單筆金額就超過方案上限時，**等重置永遠不會好**）。
 *
 * 少了它，三種處置完全不同的情況在畫面上是同一句「點數已用完」：
 * 今天的額度用完（等幾小時）、本週用完（等到重置日）、單筆超過上限（只能升級）。
 *
 * 改法是回傳 `{ reason, quota }` 而不是只回 `reason`。
 * **不要另寫一支解析函式**：同一個錯誤被解析兩次，兩次的判準遲早分岔。
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

export interface IPausedUnitSummary {
  // Info: (20260825 - Luphia) 接續要跑的工作單元（份粒度）
  pausedUnits: IImportUnit[];
  // Info: (20260825 - Luphia) 顯示用：收斂成章（使用者認得的是章，不是「第幾份」）
  pausedChapters: { id: string; title: string }[];
}

/**
 * Info: (20260825 - Luphia) 把驅動器回的「還沒做的單元」整理成兩份清單
 *（review #6717 阻擋-1）。
 *
 * 這支存在的理由是一個真的缺陷：先前這段推導寫在迴圈裡，而且以**章**為單位
 * 做正向標記（成功就 `add(chapter.id)`）。`buildImportUnits` 會把節數多的章
 * 切成兩份（實測 11 章 → 14 個單元，ch1／ch3／ch9 各兩份），於是
 * 「一份做完、另一份撞牆」時整章被當成處理過：
 *
 * - 不在暫停名單（被正向標記排除）
 * - 不在失敗名單（暫停刻意不進 failed，那是對的）
 * - 而合併出來的內容**少了一半的節**，沒有任何訊息提過
 *
 * `failed` 以章去重是安全的（任一份壞掉就整章列入），同樣的手法用在正向標記上
 * 語意剛好翻過來。抽成純函式之後，那個情形是一條可以直接測的斷言。
 *
 * 已經在 `failed` 的章要排除：同一章同時出現在「解析失敗」與「還沒開始解析」
 * 兩句話裡是自相矛盾的，而使用者無從判斷該信哪一句。失敗優先——它有重試入口，
 * 而那條路會把整章重跑。
 */
export const summarisePausedUnits = (params: {
  remainingUnits: readonly IImportUnit[];
  failedChapterIds: readonly string[];
  resolveTitle: (chapterId: string) => string;
}): IPausedUnitSummary => {
  const failed = new Set(params.failedChapterIds);
  const pausedUnits = params.remainingUnits.filter(
    (unit) => !failed.has(unit.chapterId),
  );
  const pausedChapters = Array.from(
    new Set(pausedUnits.map((unit) => unit.chapterId)),
  ).map((chapterId) => ({
    id: chapterId,
    title: params.resolveTitle(chapterId),
  }));
  return { pausedUnits, pausedChapters };
};

/**
 * Info: (20260827 - Luphia) 把逐章／逐份回來的結果摺成一份（issue #6723）。
 *
 * 抽出來的理由不是重用，是**只能有一份**：中途存檔與最後存檔如果各自組一次，
 * 兩者遲早給出不一樣的形狀，而接續的程式會看到兩種資料。原本這段邏輯寫在
 * 迴圈之後的行內，於是「中途存檔」這件事根本沒有地方可以接。
 *
 * 三個累積各有一個踩過的坑，都在下方的註解裡——它們是這支函式存在的真正代價。
 */
export interface IImportChunkLike {
  segments: {
    paragraphId: string;
    title: string;
    content: string;
    sourceTables?: ICarbonSourceTable[];
  }[];
  unmapped: string[];
  activities?: IActivityRecord[];
}

export interface IFoldedImportChunks {
  segments: {
    paragraphId: string;
    title: string;
    content: string;
    sourceTables: ICarbonSourceTable[];
  }[];
  unmapped: string[];
  activities: IActivityRecord[];
}

/**
 * Info: (20260827 - Luphia) 一次檢查點的內容（issue #6723）。
 *
 * 與暫停時寫下的那一份**形狀相同**——接續的程式只認得一種資料，
 * 而「中斷」與「暫停」的差別只在 `pauseReason` 有沒有值。
 */
export interface IImportCheckpoint extends IFoldedImportChunks {
  remainingUnits: IImportUnit[];
  pausedChapters: { id: string; title: string }[];
  totalUnits: number;
}

export const foldImportChunks = (
  results: readonly (IImportChunkLike | null)[],
): IFoldedImportChunks => {
  const segmentsById = new Map<
    string,
    { title: string; parts: string[]; sourceTables: ICarbonSourceTable[] }
  >();
  const unmapped: string[] = [];
  let activities: IActivityRecord[] = [];

  results.forEach((chunk) => {
    if (!chunk) return;
    chunk.segments.forEach((segment) => {
      const bucket = segmentsById.get(segment.paragraphId) ?? {
        title: segment.title,
        parts: [],
        sourceTables: [],
      };
      bucket.parts.push(segment.content);
      /**
       * Info: (20260803 - Tzuhan) 表格隨敘述一起累積。以表號去重:
       * 同一節的內容可能被切成多段回來,同一張表因此可能重複出現,
       * 而重複的表在報告上是兩張一樣的表 —— 讀者無從判斷哪張才是原文。
       */
      (segment.sourceTables ?? []).forEach((table) => {
        if (bucket.sourceTables.some((kept) => kept.tableNo === table.tableNo))
          return;
        if (bucket.sourceTables.length >= CARBON_SOURCE_TABLE_MAX_PER_PARAGRAPH)
          return;
        bucket.sourceTables.push(table);
      });
      segmentsById.set(segment.paragraphId, bucket);
    });
    unmapped.push(...chunk.unmapped);
    /**
     * Info: (20260817 - Emily) 累加而不是覆蓋
     * (`data/issue_drafts/open/46_activity_data_traceability.md`)。
     *
     * 原本是 `activities = chunk.activities` —— 賦值。
     * 排放章(ch3)六節會被切成兩個工作單元,兩次呼叫各自回一份,
     * **後回來的那份整批蓋掉前一份**。就算兩次都抽到,也只留下一半,
     * 而現場看到的只是一個偏低的數字,沒有任何跡象顯示發生過覆蓋。
     */
    if (chunk.activities && chunk.activities.length > 0) {
      activities = [...activities, ...chunk.activities];
    }
  });

  return {
    segments: Array.from(segmentsById.entries()).map(
      ([paragraphId, bucket]) => ({
        paragraphId,
        title: bucket.title,
        content: bucket.parts.join("\n\n").trim(),
        sourceTables: bucket.sourceTables,
      }),
    ),
    unmapped,
    activities,
  };
};

/**
 * Info: (20260901 - Luphia) 換許可失敗時，伺服器的判決是什麼（review #6726 阻-1）。
 *
 * **純函式**，不碰網路也不碰 React——判斷收斂在這裡，hook 只負責呼叫它
 *（同一份 review 的「觀察」：判斷抽成純函式，掃描測試降級為「元件真的呼叫了
 * 這支函式」）。四種判決的處置寫在 `JOB_CLAIM_DENIAL` 的註解。
 *
 * 回 `null` 表示「這不是一個判決」——網路斷、伺服器自己壞掉、或一個這一版
 * 前端不認得的錯誤碼。呼叫端對 `null` 放行（fail-open）：這把鎖是為了省錢，
 * 不是為了在它自己壞掉時把功能一起關掉。**認不得的錯誤碼也放行**與這個
 * 立場一致：新的拒絕理由要先教會這裡，否則它的處置只能是「當作鎖壞了」。
 */
export const resolveJobClaimDenial = (
  error: unknown,
): JobClaimDenial | null => {
  if (!(error instanceof RequestApiError)) return null;
  const data = error.data as { errorCode?: string } | undefined;
  switch (data?.errorCode) {
    case API_ERRORS.TW_JOB_ALREADY_RUNNING.code:
      return JOB_CLAIM_DENIAL.BUSY;
    case API_ERRORS.TW_JOB_CANCELLED.code:
      return JOB_CLAIM_DENIAL.CANCELLED;
    case API_ERRORS.TW_JOB_ALREADY_COMPLETED.code:
      return JOB_CLAIM_DENIAL.COMPLETED;
    case API_ERRORS.AUTH_PERMISSION_DENIED.code:
      return JOB_CLAIM_DENIAL.FORBIDDEN;
    default:
      return null;
  }
};

/**
 * Info: (20260827 - Luphia) 「另一個地方正在跑同一個任務」（issue #6721）。
 *
 * 與其他失敗分開的理由與 `resolveCreditPauseReason` 相同：處置不一樣。
 * 這一種**不要**收起按鈕、不要叫使用者去補點數——等一下再按就好。
 * 落到通用失敗那條路的話，畫面會說「匯入失敗」，而什麼都沒有壞。
 * Info: (20260901 - Luphia) 改為建立在 `resolveJobClaimDenial` 之上：
 * 兩份判準分岔的話，「busy」在兩個呼叫端會是兩種東西。
 */
export const isJobBusyError = (error: unknown): boolean =>
  resolveJobClaimDenial(error) === JOB_CLAIM_DENIAL.BUSY;

/**
 * Info: (20260827 - Luphia) 從 402 取出「接下來能做什麼」（issue #6714）。
 *
 * 伺服器已經算好了，這裡只負責搬——**不重算**。前端自己推導出路的話，
 * 它與扣款端遲早分岔，而分岔的症狀是畫面很有說服力地指錯方向
 *（檢查表 §1.10）。
 *
 * 取不到就回 null（例如需要簽章付款那種 402，它沒有額度視窗可談）：
 * 呼叫端據此退回「只說原因、不說出路」，而不是顯示一個空的出路清單。
 */
export const extractCreditPauseDetail = (
  error: unknown,
): ICreditPauseDetail | null => {
  const payload = parseQuotaExceededError(error);
  if (!payload) return null;
  return {
    /**
     * Info: (20260827 - Luphia) 超過視窗上限時**不給** resetAt：等重置永遠不會好，
     * 而一個倒數本身就是「等一下就能用」的承諾。
     */
    resetAt: payload.exceedsWindowLimit ? null : resolveQuotaResetAt(payload),
    options: [...payload.options],
    exceedsWindowLimit: payload.exceedsWindowLimit,
  };
};
