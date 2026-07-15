// Info: (20260714 - Emily) 附件萃取 LLM 輸出的 Zod 護欄(responseSchema 之外的第二道防線)

import { z } from "zod";

export const CarbonAttachmentExtractionLlmOutputSchema = z.object({
  facts: z
    .array(
      z.object({
        label: z.string().min(1).max(200),
        value: z.string().min(1).max(500),
        source: z.string().max(200).optional(),
      }),
    )
    .max(50),
  // Info: (20260714 - Emily) 此處僅驗證型別;是否為合法 outline id 由服務層白名單裁決
  suggestedParagraphIds: z.array(z.string().max(50)).max(10),
  confidence: z.enum(["high", "medium", "low"]),
  // Info: (20260716 - Emily) #6518 活動數據:寬鬆收下,逐筆裁決在服務層(壞一筆不廢全包)
  activities: z.array(z.unknown()).max(20).optional(),
});

export type CarbonAttachmentExtractionLlmOutput = z.infer<
  typeof CarbonAttachmentExtractionLlmOutputSchema
>;
