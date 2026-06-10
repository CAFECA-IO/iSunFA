import { z } from "zod";

// Info: (20260609 - Tzuhan) 定義生成 DPP 展示資料的請求結構
export const GenerateDppDemoSchema = z.object({
  stockId: z.string().min(1, "必須提供股票代號"),
  year: z.string().min(4, "必須提供年度"),
  productCount: z.number().min(1).max(10).default(1),
  mode: z
    .enum([
      "all",
      "download_only",
      "generate_only",
      "extrapolate_only",
      "persona_only",
    ])
    .optional()
    .default("all"),
});

export type IGenerateDppDemoPayload = z.infer<typeof GenerateDppDemoSchema>;
