"use client";

// Info: (20260714 - Tzuhan) 報告草稿儲存模組:DB E2EE 版(取代 localStorage 草稿)
// Info: (20260714 - Tzuhan) 前端以主公鑰(xpub)加密後 PUT、以 PRF 解鎖之主私鑰解密 GET 回來的密文;server 全程不見明文
// Info: (20260714 - Tzuhan) sessions 標題快取仍留 localStorage(標題衍生自密文首訊,server 無法提供)

import { IReportData } from "@/types/carbon_chatbot.types";
import {
  eciesEncrypt,
  eciesDecrypt,
  type IEciesEnvelope,
  type IChatroomMasterKey,
} from "@/lib/chatroom_ecies";
import { request, ApiError } from "@/lib/utils/request";
import {
  CARBON_REPORT_DRAFT_STORAGE_VERSION,
  CARBON_REPORT_DRAFT_MAX_CONTENT_CHARS,
  buildCarbonSessionsIndexKey,
  buildCarbonReportDraftKey,
} from "@/constants/carbon_chatbot";
import { projectedEciesContentChars } from "@/lib/chatroom_ecies";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import {
  CarbonReportDataSchema,
  StoredSessionsIndexSchema,
  StoredSessionsIndex,
} from "@/validators";

export type ISessionIndexEntry = StoredSessionsIndex["sessions"][number];

export interface ILoadedReportDraft {
  // Info: (20260714 - Tzuhan) null = 草稿存在但無法解密/驗證(版本仍有效,禁止以版本 0 覆蓋)
  reportData: IReportData | null;
  version: number;
  // Info: (20260716 - Tzuhan) #52 存取中繼資料:canEdit=false 時前端進唯讀;accountBookId 決定保存模式
  canEdit: boolean;
  accountBookId: string | null;
}

const REPORT_DRAFT_API = "/api/v1/chat/carbon/report";

/**
 * Info: (20260807 - Emily) 草稿超出欄位上限 —— 以具名錯誤拋出,而不是讓它變成一個 400。
 *
 * 舊行為:超過 2M 由 server 的 Zod 擋下,前端收到 VL_SCHEMA_ERROR,
 * 與「網路斷了」「版本衝突」共用同一個 catch,畫面上都是同一個小圖示。
 * 整份盤查報告書匯入後本來就會逼近這個上限,那不是例外而是常態,
 * 呼叫端必須能分辨出「太大」並對使用者說得出原因。
 */
export class CarbonDraftTooLargeError extends Error {
  readonly chars: number;

  readonly limit: number;

  constructor(chars: number, limit: number) {
    super(`carbon report draft too large: ${chars} > ${limit}`);
    this.name = "CarbonDraftTooLargeError";
    this.chars = chars;
    this.limit = limit;
  }
}

export const isDraftTooLargeError = (
  error: unknown,
): error is CarbonDraftTooLargeError =>
  error instanceof CarbonDraftTooLargeError;

/**
 * Info: (20260807 - Emily) 上限管的是**送出欄位**的長度,而這裡手上只有明文。
 *
 * Info: (20260808 - Luphia) 改為精確投影,不再用固定倍率估。
 * 密文長度取決於明文的 UTF-8 位元組數,而 `.length` 數的是 UTF-16 code units ——
 * 中文字 1 個 `.length` 佔 3 bytes,固定倍率(原 1.4)對中文報告會低估到 3 倍:
 * 預檢放行、伺服端 400,正是預檢要消滅的那種失敗,而中文報告是這個功能的主場。
 * 明文模式送的就是字串本身,伺服端 zod `.max()` 數的同樣是 `.length`,直接比即可;
 * 加密模式以 UTF-8 位元組數走 `projectedEciesContentChars` 精確換算。
 */
const projectedDraftContentChars = (
  serialized: string,
  isPlainMode: boolean,
): number =>
  isPlainMode
    ? serialized.length
    : projectedEciesContentChars(new TextEncoder().encode(serialized).length);

// Info: (20260714 - Tzuhan) 取回草稿:GET 密文 → 主私鑰解密 → Zod 驗證
// Info: (20260714 - Tzuhan) 回傳三態:null = 無草稿(版本 0 可首存);reportData null = 草稿存在但無法解讀
// Info: (20260714 - Tzuhan) (仍回真實版本,避免呼叫端以版本 0 撞既有草稿造成衝突死循環)
// Info: (20260716 - Tzuhan) #52 雙模式讀取:帳本會話回 plainContent(無需金鑰,VIEWER 亦可讀);
// Info: (20260716 - Tzuhan) 個人會話回 envelope(需主私鑰解密)— masterKey 因此改為可空
export const loadReportDraft = async (
  channel: string,
  masterKey: IChatroomMasterKey | null,
): Promise<ILoadedReportDraft | null> => {
  const res = await request<{
    payload: {
      draft: {
        envelope: IEciesEnvelope | null;
        plainContent: string | null;
        version: number;
      } | null;
      access: { canEdit: boolean; accountBookId: string | null } | null;
    } | null;
  }>(REPORT_DRAFT_API, { query: { channel } });

  const draft = res.payload?.draft;
  const access = res.payload?.access ?? { canEdit: true, accountBookId: null };
  if (!draft) return null;

  try {
    let plaintext: string;
    if (draft.plainContent !== null) {
      plaintext = draft.plainContent;
    } else if (draft.envelope && masterKey) {
      plaintext = await eciesDecrypt(
        masterKey.extendedPrivateKey,
        draft.envelope,
      );
    } else {
      // Info: (20260716 - Tzuhan) 個人密文但無金鑰(未解鎖):內容不可用,版本仍有效
      return { reportData: null, version: draft.version, ...access };
    }
    const parsed = CarbonReportDataSchema.safeParse(JSON.parse(plaintext));
    return {
      reportData: parsed.success ? parsed.data : null,
      version: draft.version,
      ...access,
    };
  } catch {
    // Info: (20260714 - Tzuhan) 解密失敗(非本金鑰/密文毀損):內容不可用,但版本仍有效
    return { reportData: null, version: draft.version, ...access };
  }
};

// Info: (20260714 - Tzuhan) 保存草稿:明文序列化 → xpub 加密 → PUT(帶樂觀鎖版本);回傳新版本
// Info: (20260716 - Tzuhan) #52 雙模式保存:帳本會話送明文(模型 A);個人會話維持 E2EE envelope
export const saveReportDraft = async (
  channel: string,
  /**
   * Info: (20260803 - Tzuhan) 明文模式(帳本會話)可為 null —— 沒有加密就不需要收件公鑰。
   * 原本一律必填,造成「帳本會話免金鑰」只實現一半:讀免金鑰、寫仍要 master,
   * 未解鎖時讀得到卻存不了(見 issue_drafts/inventory_table_import/04)。
   * 明文模式的擁有者標記改由 API 層以已驗證的使用者位址補上。
   */
  masterKey: IChatroomMasterKey | null,
  reportData: IReportData,
  version: number,
  accountBookId: string | null = null,
): Promise<number> => {
  // Info: (20260803 - Tzuhan) 加密模式沒有金鑰就無從加密,必須在這裡失敗而不是送出空密文
  if (!accountBookId && !masterKey) {
    throw new Error("masterKey is required for encrypted mode");
  }
  const serialized = JSON.stringify(reportData);
  /**
   * Info: (20260807 - Emily) 送出前先量,不要讓上限以 400 的形式被發現。
   * Fail Fast 的對象是使用者:超過上限時他必須當場知道「這一版沒有存進去」,
   * 而不是在重整之後才發現最後幾分鐘的成果不見了。
   */
  const projectedChars = projectedDraftContentChars(
    serialized,
    Boolean(accountBookId),
  );
  if (projectedChars > CARBON_REPORT_DRAFT_MAX_CONTENT_CHARS) {
    throw new CarbonDraftTooLargeError(
      projectedChars,
      CARBON_REPORT_DRAFT_MAX_CONTENT_CHARS,
    );
  }
  const body = accountBookId
    ? {
        channel,
        version,
        // Info: (20260803 - Tzuhan) 明文模式不帶公鑰;有金鑰時仍附上(保留既有紀錄語意)
        ...(masterKey
          ? { recipientPublicKey: masterKey.extendedPublicKey }
          : {}),
        plainContent: serialized,
      }
    : {
        channel,
        version,
        recipientPublicKey: (masterKey as IChatroomMasterKey).extendedPublicKey,
        envelope: await eciesEncrypt(
          (masterKey as IChatroomMasterKey).extendedPublicKey,
          serialized,
        ),
      };

  const res = await request<{ payload: { version: number } | null }>(
    REPORT_DRAFT_API,
    { method: "PUT", body: JSON.stringify(body) },
  );

  if (!res.payload) throw new Error("Empty save draft payload");
  return res.payload.version;
};

// Info: (20260714 - Tzuhan) 判斷保存失敗是否為樂觀鎖衝突(他端已更新,呼叫端應重新載入)
export const isDraftVersionConflict = (error: unknown): boolean => {
  if (!(error instanceof ApiError)) return false;
  const data = error.data as { errorCode?: string } | undefined;
  return data?.errorCode === API_ERRORS.VL_DRAFT_VERSION_CONFLICT.code;
};

// Info: (20260715 - Luphia) --- 本機快取(localStorage);DB 為權威來源 ---
// Info: (20260716 - Tzuhan) UAT P0 修正:快取改「常駐」(雲端保存後不再清除,僅更新版本)。
// Info: (20260716 - Tzuhan) 個人 E2EE 會話在解鎖前無法解密 DB 草稿,refresh 後畫面全空被認定為資料遺失;
// Info: (20260716 - Tzuhan) 常駐快取讓內容於解鎖前即刻可見(明文限本機,信任邊界為使用者裝置),
// Info: (20260716 - Tzuhan) 解鎖後與 DB 比版本取新者,跨裝置一致性仍由 DB 樂觀鎖保證
const isBrowser = (): boolean => typeof window !== "undefined";

// Info: (20260715 - Luphia) 編輯後立即寫入本機安全快取(明文限本機,信任邊界為使用者裝置;E2EE 針對的是 server)
// Info: (20260716 - Tzuhan) draftVersion = 內容對應的 DB 樂觀鎖版本(0 = 尚未上雲),供還原時與 DB 比新舊
/**
 * Info: (20260807 - Emily) 回傳是否真的寫進去了。
 *
 * 原本回 void 且 catch 只 console.error —— 而這一層是雲端保存失敗時的**唯一退路**。
 * 整份盤查報告書(153 頁)序列化後逼近 localStorage 的 5 MB 配額,
 * QuotaExceededError 一旦發生,兩層保存就同時靜靜失效,
 * 使用者看到的仍只是一個小圖示(issue_drafts/inventory_table_import/12)。
 * 呼叫端要能知道退路也沒了,才有辦法把話說清楚。
 */
export const saveLocalDraftBackup = (
  channel: string,
  reportData: IReportData,
  draftVersion: number = 0,
): boolean => {
  if (!isBrowser()) return false;
  try {
    window.localStorage.setItem(
      buildCarbonReportDraftKey(channel),
      JSON.stringify({
        version: CARBON_REPORT_DRAFT_STORAGE_VERSION,
        draftVersion,
        reportData,
      }),
    );
    return true;
  } catch (error) {
    console.error(
      "[carbon-report-storage] save local draft backup failed:",
      error,
    );
    return false;
  }
};

export interface ILocalDraftBackup {
  reportData: IReportData;
  // Info: (20260716 - Tzuhan) 內容對應的 DB 版本(舊格式快取無此欄 → 0,視為未上雲)
  draftVersion: number;
}

// Info: (20260716 - Tzuhan) 讀取本機常駐快取;格式不符即清除回 null
export const loadLocalDraftBackup = (
  channel: string,
): ILocalDraftBackup | null => {
  if (!isBrowser()) return null;
  const key = buildCarbonReportDraftKey(channel);
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    const outer = JSON.parse(raw) as {
      reportData?: unknown;
      draftVersion?: unknown;
    };
    const parsed = CarbonReportDataSchema.safeParse(outer.reportData);
    if (!parsed.success) {
      window.localStorage.removeItem(key);
      return null;
    }
    return {
      reportData: parsed.data,
      draftVersion:
        typeof outer.draftVersion === "number" ? outer.draftVersion : 0,
    };
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
};

// Info: (20260716 - Tzuhan) 清除本機快取(會話刪除等情境用;一般保存流程不再清除 — 快取常駐)
export const clearLocalDraftBackup = (channel: string): void => {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(buildCarbonReportDraftKey(channel));
  } catch (error) {
    console.error(
      "[carbon-report-storage] clear local draft backup failed:",
      error,
    );
  }
};

// Info: (20260714 - Tzuhan) --- sessions 標題快取(localStorage) ---

export const loadSessionsIndex = (
  address: string,
): ISessionIndexEntry[] | null => {
  if (!isBrowser()) return null;
  const key = buildCarbonSessionsIndexKey(address);
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = StoredSessionsIndexSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      window.localStorage.removeItem(key);
      return null;
    }
    return parsed.data.sessions;
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
};

export const saveSessionsIndex = (
  address: string,
  sessions: ISessionIndexEntry[],
): void => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(
      buildCarbonSessionsIndexKey(address),
      JSON.stringify({
        version: CARBON_REPORT_DRAFT_STORAGE_VERSION,
        sessions,
      }),
    );
  } catch (error) {
    console.error("[carbon-report-storage] save sessions index failed:", error);
  }
};
