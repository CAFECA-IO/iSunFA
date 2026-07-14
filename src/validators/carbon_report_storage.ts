// Info: (20260714 - Emily) localStorage 報告草稿/sessions 索引的 Zod Schema
// Info: (20260714 - Emily) 讀取時 Fail Fast:壞資料(手動竄改/版本不符)直接丟棄,不讓髒資料進前端狀態

import { z } from "zod";
import { CARBON_REPORT_DRAFT_STORAGE_VERSION } from "@/constants/carbon_chatbot";

const ReportCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  emissions: z.number(),
});

const ReportParagraphSchema = z.object({
  id: z.string().min(1),
  chapterId: z.string().min(1),
  code: z.string().min(1),
  title: z.string(),
  content: z.string(),
  isCompleted: z.boolean(),
  isVerified: z.boolean(),
  isDataDriven: z.boolean(),
});

export const StoredReportDraftSchema = z.object({
  version: z.literal(CARBON_REPORT_DRAFT_STORAGE_VERSION),
  savedAt: z.string(),
  reportData: z.object({
    documentName: z.string(),
    title: z.string(),
    section: z.string(),
    categories: z.array(ReportCategorySchema),
    paragraphs: z.array(ReportParagraphSchema).optional(),
    totalEmissions: z.number(),
  }),
});

export type StoredReportDraft = z.infer<typeof StoredReportDraftSchema>;

export const StoredSessionsIndexSchema = z.object({
  version: z.literal(CARBON_REPORT_DRAFT_STORAGE_VERSION),
  sessions: z
    .array(
      z.object({
        id: z.string().min(1).max(50),
        title: z.string().max(200),
        createdAt: z.string().max(50),
      }),
    )
    .max(100),
});

export type StoredSessionsIndex = z.infer<typeof StoredSessionsIndexSchema>;
