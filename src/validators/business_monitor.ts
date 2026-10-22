import { z } from "zod";
import {
  BUSINESS_MONITOR_COMPANY_MAX_PAGE_SIZE,
  BUSINESS_MONITOR_COMPANY_PAGE_SIZE,
  BUSINESS_MONITOR_MAX_SCOPE_YEARS,
  BUSINESS_MONITOR_QUESTION_MAX_LENGTH,
  BUSINESS_MONITOR_SEARCH_MAX_LENGTH,
  BUSINESS_MONITOR_STOCK_ID_PATTERN,
} from "@/constants/business_monitor";

/**
 * Info: (20261022 - Luphia) 企業觀測站 API 的 Schema。
 *
 * `clientMessageId` 是計費冪等鍵的一部分：個人點數路徑是「402 → 付款 → 重送同一則」，
 * 重送時帶同一個 id 才不會付了一張訂單又建一張。
 */

export const businessMonitorStockIdSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(BUSINESS_MONITOR_STOCK_ID_PATTERN);

/**
 * Info: (20261022 - Luphia) AI 諮詢的範疇由前端明示：公司頁帶 stockId；年度是送出前顯示給使用者看、
 * 使用者可以取消的那幾個。`years` 有帶（即使是空陣列）就照用，不再從問題裡偵測。
 */
export const businessMonitorChatScopeSchema = z.object({
  stockId: businessMonitorStockIdSchema.optional(),
  years: z
    .array(z.string().regex(/^\d{4}$/))
    .max(BUSINESS_MONITOR_MAX_SCOPE_YEARS)
    .optional(),
});

export type IBusinessMonitorChatScope = z.infer<
  typeof businessMonitorChatScopeSchema
>;

export const businessMonitorChatSchema = z.object({
  question: z.string().trim().min(1).max(BUSINESS_MONITOR_QUESTION_MAX_LENGTH),
  clientMessageId: z.string().min(1).max(128),
  scope: businessMonitorChatScopeSchema.optional(),
});

export type IBusinessMonitorChatRequest = z.infer<
  typeof businessMonitorChatSchema
>;

// Info: (20261022 - Luphia) 路徑上的報告 id（`Report.id`，自增整數）
export const businessMonitorReportIdSchema = z.coerce.number().int().positive();

// Info: (20261022 - Luphia) 公司清單：搜尋字（名稱／簡稱／代號／統編）或產業代碼，兩者可並用
export const businessMonitorCompanyListSchema = z.object({
  q: z.string().trim().max(BUSINESS_MONITOR_SEARCH_MAX_LENGTH).optional(),
  industry: z.string().trim().max(10).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce
    .number()
    .int()
    .positive()
    .max(BUSINESS_MONITOR_COMPANY_MAX_PAGE_SIZE)
    .default(BUSINESS_MONITOR_COMPANY_PAGE_SIZE),
});

export type IBusinessMonitorCompanyListQuery = z.infer<
  typeof businessMonitorCompanyListSchema
>;
