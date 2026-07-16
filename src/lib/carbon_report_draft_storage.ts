"use client";

// Info: (20260714 - Emily) 報告草稿儲存模組:DB E2EE 版(取代 localStorage 草稿)
// Info: (20260714 - Emily) 前端以主公鑰(xpub)加密後 PUT、以 PRF 解鎖之主私鑰解密 GET 回來的密文;server 全程不見明文
// Info: (20260714 - Emily) sessions 標題快取仍留 localStorage(標題衍生自密文首訊,server 無法提供)

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
  buildCarbonSessionsIndexKey,
  buildCarbonReportDraftKey,
} from "@/constants/carbon_chatbot";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import {
  CarbonReportDataSchema,
  StoredSessionsIndexSchema,
  StoredSessionsIndex,
} from "@/validators";

export type ISessionIndexEntry = StoredSessionsIndex["sessions"][number];

export interface ILoadedReportDraft {
  // Info: (20260714 - Emily) null = 草稿存在但無法解密/驗證(版本仍有效,禁止以版本 0 覆蓋)
  reportData: IReportData | null;
  version: number;
  // Info: (20260716 - Emily) #52 存取中繼資料:canEdit=false 時前端進唯讀;accountBookId 決定保存模式
  canEdit: boolean;
  accountBookId: string | null;
}

const REPORT_DRAFT_API = "/api/v1/chat/carbon/report";

// Info: (20260714 - Emily) 取回草稿:GET 密文 → 主私鑰解密 → Zod 驗證
// Info: (20260714 - Emily) 回傳三態:null = 無草稿(版本 0 可首存);reportData null = 草稿存在但無法解讀
// Info: (20260714 - Emily) (仍回真實版本,避免呼叫端以版本 0 撞既有草稿造成衝突死循環)
// Info: (20260716 - Emily) #52 雙模式讀取:帳本會話回 plainContent(無需金鑰,VIEWER 亦可讀);
// Info: (20260716 - Emily) 個人會話回 envelope(需主私鑰解密)— masterKey 因此改為可空
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
      // Info: (20260716 - Emily) 個人密文但無金鑰(未解鎖):內容不可用,版本仍有效
      return { reportData: null, version: draft.version, ...access };
    }
    const parsed = CarbonReportDataSchema.safeParse(JSON.parse(plaintext));
    return {
      reportData: parsed.success ? parsed.data : null,
      version: draft.version,
      ...access,
    };
  } catch {
    // Info: (20260714 - Emily) 解密失敗(非本金鑰/密文毀損):內容不可用,但版本仍有效
    return { reportData: null, version: draft.version, ...access };
  }
};

// Info: (20260714 - Emily) 保存草稿:明文序列化 → xpub 加密 → PUT(帶樂觀鎖版本);回傳新版本
// Info: (20260716 - Emily) #52 雙模式保存:帳本會話送明文(模型 A);個人會話維持 E2EE envelope
export const saveReportDraft = async (
  channel: string,
  masterKey: IChatroomMasterKey,
  reportData: IReportData,
  version: number,
  accountBookId: string | null = null,
): Promise<number> => {
  const serialized = JSON.stringify(reportData);
  const body = accountBookId
    ? {
        channel,
        version,
        recipientPublicKey: masterKey.extendedPublicKey,
        plainContent: serialized,
      }
    : {
        channel,
        version,
        recipientPublicKey: masterKey.extendedPublicKey,
        envelope: await eciesEncrypt(masterKey.extendedPublicKey, serialized),
      };

  const res = await request<{ payload: { version: number } | null }>(
    REPORT_DRAFT_API,
    { method: "PUT", body: JSON.stringify(body) },
  );

  if (!res.payload) throw new Error("Empty save draft payload");
  return res.payload.version;
};

// Info: (20260714 - Emily) 判斷保存失敗是否為樂觀鎖衝突(他端已更新,呼叫端應重新載入)
export const isDraftVersionConflict = (error: unknown): boolean => {
  if (!(error instanceof ApiError)) return false;
  const data = error.data as { errorCode?: string } | undefined;
  return data?.errorCode === API_ERRORS.VL_DRAFT_VERSION_CONFLICT.code;
};

// Info: (20260715 - Luphia) --- 本機快取(localStorage);DB 為權威來源 ---
// Info: (20260716 - Emily) UAT P0 修正:快取改「常駐」(雲端保存後不再清除,僅更新版本)。
// Info: (20260716 - Emily) 個人 E2EE 會話在解鎖前無法解密 DB 草稿,refresh 後畫面全空被認定為資料遺失;
// Info: (20260716 - Emily) 常駐快取讓內容於解鎖前即刻可見(明文限本機,信任邊界為使用者裝置),
// Info: (20260716 - Emily) 解鎖後與 DB 比版本取新者,跨裝置一致性仍由 DB 樂觀鎖保證
const isBrowser = (): boolean => typeof window !== "undefined";

// Info: (20260715 - Luphia) 編輯後立即寫入本機安全快取(明文限本機,信任邊界為使用者裝置;E2EE 針對的是 server)
// Info: (20260716 - Emily) draftVersion = 內容對應的 DB 樂觀鎖版本(0 = 尚未上雲),供還原時與 DB 比新舊
export const saveLocalDraftBackup = (
  channel: string,
  reportData: IReportData,
  draftVersion: number = 0,
): void => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(
      buildCarbonReportDraftKey(channel),
      JSON.stringify({
        version: CARBON_REPORT_DRAFT_STORAGE_VERSION,
        draftVersion,
        reportData,
      }),
    );
  } catch (error) {
    console.error(
      "[carbon-report-storage] save local draft backup failed:",
      error,
    );
  }
};

export interface ILocalDraftBackup {
  reportData: IReportData;
  // Info: (20260716 - Emily) 內容對應的 DB 版本(舊格式快取無此欄 → 0,視為未上雲)
  draftVersion: number;
}

// Info: (20260716 - Emily) 讀取本機常駐快取;格式不符即清除回 null
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

// Info: (20260716 - Emily) 清除本機快取(會話刪除等情境用;一般保存流程不再清除 — 快取常駐)
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

// Info: (20260714 - Emily) --- sessions 標題快取(localStorage) ---

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
