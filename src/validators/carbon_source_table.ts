// Info: (20260801 - Tzuhan) 原文表格的 Zod Schema(LLM 輸出驗證)
// Info: (20260801 - Tzuhan) 見 issue_drafts/inventory_table_import 的 Issue A。
//
// Info: (20260801 - Tzuhan) 與 carbon_source_table.builder 的 validateSourceTables 分工(刻意兩道):
// Info: (20260801 - Tzuhan) - 本 Schema:**進 Service 前**的欄位級裁決(型別、長度、頁碼範圍、表號格式)。
// Info: (20260801 - Tzuhan)   LLM 輸出是不可預知資料,先縮小型別才准往下傳。
// Info: (20260801 - Tzuhan) - builder 的 validateSourceTables:**寫入段落前**的最後一道,驗 markdown 是否
// Info: (20260801 - Tzuhan)   真的是表格形狀。它的呼叫端不限於匯入(未來可能來自貼上或人工編輯),
// Info: (20260801 - Tzuhan)   因此不能假設一定經過本 Schema。表號格式兩邊都驗是刻意的縱深防禦:
// Info: (20260801 - Tzuhan)   表號會成為 HTML 註解錨點的一部分,任一路徑漏掉都等於讓模型自訂錨點語法。

import { z } from "zod";
import {
  CARBON_SOURCE_TABLE_MAX_PER_PARAGRAPH,
  SOURCE_TABLE_NO_PATTERN,
} from "@/constants/carbon_source_tables";

/**
 * Info: (20260801 - Tzuhan) 標題長度上限。原文表格標題實測最長約 30 字
 * (「全公司溫室氣體各類別排放量統計表 (所在地基準)」),取 120 留餘裕;
 * 超長即代表模型把整段敘述塞進標題,那不是照抄。
 */
const CAPTION_MAX = 120;

/**
 * Info: (20260801 - Tzuhan) 單張表格 markdown 的長度上限。
 * 表3.8 三個廠址逐子代碼展開約 2,000 字元;取 20,000 足以容納最大的表,
 * 同時擋掉「把整章塞進一張表」的退化輸出(那會讓段落內容失控膨脹)。
 */
const MARKDOWN_MAX = 20_000;

/**
 * Info: (20260801 - Tzuhan) 頁碼上限。實測最長的報告 278 頁;取 2,000 為安全上界。
 * 頁碼會顯示在報告上供人翻回原文對照,超出範圍的值是錯的而非只是難看。
 */
const PAGE_MAX = 2_000;

export const CarbonSourceTableSchema = z.object({
  tableNo: z
    .string()
    .min(1)
    .max(16)
    .refine((value) => SOURCE_TABLE_NO_PATTERN.test(value), {
      message: "tableNo must look like 表3.8",
    }),
  caption: z.string().min(1).max(CAPTION_MAX),
  // Info: (20260801 - Tzuhan) 跨頁表格給起訖兩頁,故上限 2;空陣列代表模型沒給頁碼(仍可收,只是不顯示頁碼)
  sourcePages: z.array(z.number().int().min(1).max(PAGE_MAX)).max(2),
  markdown: z.string().min(1).max(MARKDOWN_MAX),
});

/**
 * Info: (20260801 - Tzuhan) 一個段落收到的原文表格清單。
 * 上限與 builder 共用同一個常數 —— 兩處各寫一個數字遲早會不一致,
 * 而不一致的後果是「Zod 放行了但 builder 拒絕」,使用者看到的是沉默的缺表。
 */
export const CarbonSourceTableListSchema = z
  .array(CarbonSourceTableSchema)
  .max(CARBON_SOURCE_TABLE_MAX_PER_PARAGRAPH);

export type ICarbonSourceTablePayload = z.infer<typeof CarbonSourceTableSchema>;
