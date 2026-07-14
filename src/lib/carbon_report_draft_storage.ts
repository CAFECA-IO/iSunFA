"use client";

// Info: (20260714 - Emily) 報告草稿 + sessions 索引的本機儲存模組(demo 階段採 localStorage)
// Info: (20260714 - Emily) 介面設計與未來 DB API(GET/PUT /api/v1/chat/carbon/report)對齊,呼叫端不感知儲存實作
// ToDo: (20260714 - Emily) DB 化(仿 CarbonInventoryState:CarbonReportDraft model + version 樂觀鎖)時抽換本模組實作

import { IReportData } from "@/types/carbon_chatbot.types";
import {
  CARBON_REPORT_DRAFT_STORAGE_VERSION,
  buildCarbonReportDraftKey,
  buildCarbonSessionsIndexKey,
} from "@/constants/carbon_chatbot";
import {
  StoredReportDraftSchema,
  StoredSessionsIndexSchema,
  StoredSessionsIndex,
} from "@/validators";

export type ISessionIndexEntry = StoredSessionsIndex["sessions"][number];

const isBrowser = (): boolean => typeof window !== "undefined";

// Info: (20260714 - Emily) 讀取共用:JSON + Zod 驗證,壞資料直接移除並回 null(Fail Fast,不讓髒資料進狀態)
const readValidated = <T>(
  key: string,
  parse: (raw: unknown) => T | null,
): T | null => {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    const result = parse(JSON.parse(raw));
    if (result === null) window.localStorage.removeItem(key);
    return result;
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
};

export const loadReportDraft = (channel: string): IReportData | null =>
  readValidated(buildCarbonReportDraftKey(channel), (raw) => {
    const parsed = StoredReportDraftSchema.safeParse(raw);
    return parsed.success ? parsed.data.reportData : null;
  });

export const saveReportDraft = (
  channel: string,
  reportData: IReportData,
): void => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(
      buildCarbonReportDraftKey(channel),
      JSON.stringify({
        version: CARBON_REPORT_DRAFT_STORAGE_VERSION,
        savedAt: new Date().toISOString(),
        reportData,
      }),
    );
  } catch (error) {
    // Info: (20260714 - Emily) 寫入失敗(如容量滿)僅記錄,不中斷對話流程
    console.error("[carbon-report-storage] save draft failed:", error);
  }
};

export const clearReportDraft = (channel: string): void => {
  if (!isBrowser()) return;
  window.localStorage.removeItem(buildCarbonReportDraftKey(channel));
};

export const loadSessionsIndex = (
  address: string,
): ISessionIndexEntry[] | null =>
  readValidated(buildCarbonSessionsIndexKey(address), (raw) => {
    const parsed = StoredSessionsIndexSchema.safeParse(raw);
    return parsed.success ? parsed.data.sessions : null;
  });

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
