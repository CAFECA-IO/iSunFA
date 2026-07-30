// Info: (20260714 - Tzuhan) Carbon Chatbot 段落草稿生成的 Zod Schema(請求驗證 + LLM 輸出驗證)

import { z } from "zod";
import { CARBON_REPORT_OUTLINE } from "@/constants/carbon_report_outline";
import { CARBON_CHAT_AI_CONTEXT_SIZE } from "@/constants/carbon_chatbot";
import { ChatRoleEnum } from "@/types/carbon_chatbot.types";

// Info: (20260714 - Tzuhan) 段落 id 白名單:僅接受標準大綱內的段落,杜絕捏造的段落編號
const OUTLINE_PARAGRAPH_IDS = new Set(CARBON_REPORT_OUTLINE.map((s) => s.id));

export const CarbonParagraphDraftRequestSchema = z.object({
  paragraphId: z
    .string()
    .min(1)
    .refine((id) => OUTLINE_PARAGRAPH_IDS.has(id), {
      message: "paragraphId is not in the carbon report outline",
    }),
  conversationContext: z
    .array(
      z.object({
        role: z.nativeEnum(ChatRoleEnum),
        text: z.string().min(1).max(4000),
      }),
    )
    .max(CARBON_CHAT_AI_CONTEXT_SIZE),
  contextFacts: z
    .array(
      z.object({
        label: z.string().min(1).max(200),
        value: z.string().min(1).max(500),
        source: z.string().max(200).optional(),
      }),
    )
    .max(50)
    .optional(),
  language: z.string().max(20).optional(),
  // Info: (20260716 - Tzuhan) #55 修訂模式:兩者皆有 = 修訂既有段落(僅依指示與事實修改,其餘保留原文)
  existingContent: z.string().min(1).max(20_000).optional(),
  instruction: z.string().min(1).max(2_000).optional(),
});

export type CarbonParagraphDraftRequestPayload = z.infer<
  typeof CarbonParagraphDraftRequestSchema
>;

/**
 * Info: (20260730 - Tzuhan) 段落結構圖請求:paragraphId 須在大綱內(要畫哪張圖由段落決定,請求端無從指定)。
 * content 為該段當前內文——節點文字必須能在其中找到才會被畫出,故它同時是素材與驗證基準。
 */
export const CarbonDiagramRequestSchema = z.object({
  paragraphId: z
    .string()
    .min(1)
    .refine((id) => OUTLINE_PARAGRAPH_IDS.has(id), {
      message: "paragraphId is not in the carbon report outline",
    }),
  content: z.string().min(1).max(50_000),
  language: z.string().max(10).optional(),
});
export type CarbonDiagramRequest = z.infer<typeof CarbonDiagramRequestSchema>;

// Info: (20260714 - Tzuhan) LLM 結構化輸出的後端護欄:responseSchema 之外再以 Zod 交叉驗證,永不直接採信 LLM 輸出
export const CarbonParagraphDraftLlmOutputSchema = z.object({
  content: z.string().min(1),
  citedFacts: z.array(z.string()).default([]),
});

export type CarbonParagraphDraftLlmOutput = z.infer<
  typeof CarbonParagraphDraftLlmOutputSchema
>;
