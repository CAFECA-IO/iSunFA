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
  /**
   * Info: (20260810 - Emily) 必填的理由記在這裡,而不是在路由（PR review 第 8 點）。
   *
   * 原本這段說明掛在 notice route 的執行期檢查上方;檢查移除之後它就懸空了 ——
   * 不依附任何 statement,讀起來像在註解下面的 try。而它解釋的是「為什麼這個欄位
   * 必填」,規則住在這一行,理由就該和它守護的東西在同一個地方。
   *
   * 原本寫 `recipientPublicKey ?? sessionUser.address`,理由是「與 report PUT 同一慣例」,
   * 而這條端點因此從上線起一次都沒成功過(實測 500:
   * `invalid base58 value (argument="letter", value="0")`)。
   *
   * report PUT 的 address 補位只發生在**明文模式**:帳本會話存明文,
   * address 只是擁有者標記,從不當金鑰用。
   * 而聊天訊息一律 E2EE,`recordAndPublishAiReply` 會拿這個值做 ECIES 加密 ——
   * 它必須是 base58 的 xpub,而 `0x…` 十六進位位址在第一個 `0` 就解不出來。
   *
   * 一個慣例被跨過了它不成立的邊界。改必填而不是留選填讓路由擋:
   * 選填的欄位會讓呼叫端以為「不送也行」,而它一送就是 500。
   */
  recipientPublicKey: z.string().min(1).max(300),
  fileName: z.string().min(1).max(300),
  // Info: (20260805 - Tzuhan) 章節標題,上限取章數;內容不入判斷邏輯,僅呈現
  failedChapters: z
    .array(z.string().min(1).max(100))
    .max(CARBON_REPORT_CHAPTERS.length)
    .default([]),
  /**
   * Info: (20260825 - Luphia) 因點數用完而未解析的章節標題（issue #6713）。
   * 與 `failedChapters` 分開收：兩者在訊息裡是兩句話，
   * 混成一個欄位就再也分不出「試過壞了」與「一步都沒試」。
   */
  pausedChapters: z
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
