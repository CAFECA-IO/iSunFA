import { z } from "zod";

export const AiReportGenerateSchema = z.object({
  data: z.string().min(1, "Data is required"),
  instruction: z.string().optional(),
});

export type AiReportGeneratePayload = z.infer<typeof AiReportGenerateSchema>;

export const AiRefineSchema = z.object({
  text: z.string().min(1, "Text is required"),
  action: z.string().min(1, "Action is required"),
});

export type AiRefinePayload = z.infer<typeof AiRefineSchema>;
