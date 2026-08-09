// Info: (20260805 - Tzuhan) 匯入通知訊息的請求驗證。
//
// Info: (20260805 - Tzuhan) 前端只送**事實**,不送文案:入庫的內容是系統的陳述,
// Info: (20260805 - Tzuhan) 不能讓呼叫端塞任意字串進使用者的對話紀錄。
// Info: (20260805 - Tzuhan) 句子由 buildImportSummaryNotice / buildImportParsedNotice 在伺服端組出。

import { z } from "zod";
import {
  CarbonImportReconciliationStateEnum,
  CarbonImportNoticeKindEnum,
} from "@/constants/carbon_chatbot";
import {
  CARBON_REPORT_CHAPTERS,
  CARBON_REPORT_OUTLINE,
} from "@/constants/carbon_report_outline";

/**
 * Info: (20260806 - Tzuhan) 兩種通知共用的欄位。
 *
 * ECIES 收件公鑰(xpub)**必填**。原註解寫「選填:省略時伺服端以 session 的 address 補上
 * (與 report PUT 同一慣例)」—— 那句話不成立,而這條端點因此從上線起一次都沒成功過。
 * report PUT 的 address 補位只在**明文模式**:那時 address 是擁有者標記,不是金鑰。
 * 聊天訊息一律 E2EE,這個值會被拿去做 ECIES 加密,而 `0x…` 位址不是 base58 xpub。
 *
 * 改必填而不是留選填讓路由擋:選填的欄位會讓呼叫端以為「不送也行」,
 * 而它一送就是 500。契約上就該說清楚。
 */
const NoticeCommonShape = {
  channel: z.string().min(1).max(200),
  recipientPublicKey: z.string().min(1).max(300),
  fileName: z.string().min(1).max(300),
  // Info: (20260805 - Tzuhan) 章節標題,上限取章數;內容不入判斷邏輯,僅呈現
  failedChapters: z
    .array(z.string().min(1).max(100))
    .max(CARBON_REPORT_CHAPTERS.length)
    .default([]),
  language: z.string().min(2).max(10).optional(),
};

/**
 * Info: (20260805 - Tzuhan) 節數上限取大綱節數:超過即不可能是真的節數,
 * 而讓一個誇大的數字入庫等於在對話紀錄裡留下假事實。
 */
const sectionCount = () =>
  z.number().int().min(0).max(CARBON_REPORT_OUTLINE.length);

const ImportSummaryNoticeSchema = z.object({
  ...NoticeCommonShape,
  kind: z.literal(CarbonImportNoticeKindEnum.SUMMARY),
  importedCount: sectionCount(),
  draftedCount: sectionCount(),
  reconciliation: z.nativeEnum(CarbonImportReconciliationStateEnum),
});

/**
 * Info: (20260806 - Tzuhan) 解析完成(尚未寫入報告)的通知。
 * 沒有 reconciliation 欄位是刻意的:那時一筆都還沒入帳,對帳這件事還沒發生 ——
 * 讓 schema 收下一個此刻不可能成立的欄位,就是允許它說出錯的事實。
 */
const ImportParsedNoticeSchema = z.object({
  ...NoticeCommonShape,
  kind: z.literal(CarbonImportNoticeKindEnum.PARSED),
  pendingCount: sectionCount(),
  draftedCount: sectionCount(),
  // Info: (20260806 - Tzuhan) 活動數據上限對齊 CarbonPendingImportDataSchema 的 activities
  activityCount: z.number().int().min(0).max(500),
});

export const CarbonImportNoticeSchema = z.discriminatedUnion("kind", [
  ImportSummaryNoticeSchema,
  ImportParsedNoticeSchema,
]);

export type CarbonImportNoticePayload = z.infer<
  typeof CarbonImportNoticeSchema
>;
