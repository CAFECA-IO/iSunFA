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
} from "@/constants/carbon_chatbot";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import {
  CarbonReportDataSchema,
  StoredSessionsIndexSchema,
  StoredSessionsIndex,
} from "@/validators";

export type ISessionIndexEntry = StoredSessionsIndex["sessions"][number];

export interface ILoadedReportDraft {
  reportData: IReportData;
  version: number;
}

const REPORT_DRAFT_API = "/api/v1/chat/carbon/report";

// Info: (20260714 - Emily) 取回草稿:GET 密文 → 主私鑰解密 → Zod 驗證(壞資料丟棄回 null,不讓髒資料進狀態)
export const loadReportDraft = async (
  channel: string,
  masterKey: IChatroomMasterKey,
): Promise<ILoadedReportDraft | null> => {
  const res = await request<{
    payload: {
      draft: { envelope: IEciesEnvelope; version: number } | null;
    } | null;
  }>(REPORT_DRAFT_API, { query: { channel } });

  const draft = res.payload?.draft;
  if (!draft) return null;

  try {
    const plaintext = await eciesDecrypt(
      masterKey.extendedPrivateKey,
      draft.envelope,
    );
    const parsed = CarbonReportDataSchema.safeParse(JSON.parse(plaintext));
    if (!parsed.success) return null;
    return { reportData: parsed.data, version: draft.version };
  } catch {
    // Info: (20260714 - Emily) 解密失敗(非本金鑰/密文毀損)一律視為無草稿
    return null;
  }
};

// Info: (20260714 - Emily) 保存草稿:明文序列化 → xpub 加密 → PUT(帶樂觀鎖版本);回傳新版本
export const saveReportDraft = async (
  channel: string,
  masterKey: IChatroomMasterKey,
  reportData: IReportData,
  version: number,
): Promise<number> => {
  const envelope = await eciesEncrypt(
    masterKey.extendedPublicKey,
    JSON.stringify(reportData),
  );

  const res = await request<{ payload: { version: number } | null }>(
    REPORT_DRAFT_API,
    {
      method: "PUT",
      body: JSON.stringify({
        channel,
        version,
        recipientPublicKey: masterKey.extendedPublicKey,
        envelope,
      }),
    },
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

// Info: (20260714 - Emily) --- sessions 標題快取(localStorage) ---
const isBrowser = (): boolean => typeof window !== "undefined";

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
