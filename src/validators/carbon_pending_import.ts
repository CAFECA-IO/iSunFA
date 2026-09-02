// Info: (20260806 - Tzuhan) 待匯入解析結果(DB E2EE)的 Zod Schema
// Info: (20260806 - Tzuhan) 密文入庫,明文驗證發生在前端解密後;壞資料 Fail Fast 丟棄不入 React 狀態

import { z } from "zod";
import { CarbonReportDraftPutSchema } from "@/validators/carbon_report_storage";
import { CarbonActivityRecordSchema } from "@/validators/carbon_inventory";
import { CarbonSourceTableSchema } from "@/validators/carbon_source_table";
import { CARBON_PENDING_IMPORT_STORAGE_VERSION } from "@/constants/carbon_chatbot";

// Info: (20260806 - Tzuhan) PUT 封裝與報告草稿完全同形(envelope / plainContent 擇一 + 樂觀鎖),共用 schema
export const CarbonPendingImportPutSchema = CarbonReportDraftPutSchema;
export type CarbonPendingImportPutPayload = z.infer<
  typeof CarbonPendingImportPutSchema
>;

const PendingImportItemSchema = z.object({
  paragraphId: z.string().min(1).max(50),
  title: z.string().max(300),
  content: z.string().max(50_000),
  hasExisting: z.boolean(),
  checked: z.boolean(),
  isDraft: z.boolean().optional(),
  /**
   * Info: (20260806 - Tzuhan) 照錄表格**逐張**裁決(與 report_import.service 同一原則):
   * 一張表格格式不合不該賠掉整份待匯入結果 —— 其餘段落與敘述都還是好的,
   * 而整筆丟棄的代價是使用者要重跑十幾次 LLM。
   *
   * 這裡的表格在寫入時已經過 Service 那道裁決,所以到不了這裡才壞;
   * 真的壞了就是資料損毀,靜靜丟掉一張表比丟掉整份解析結果輕。
   * 空陣列收斂為 undefined:「沒有表格」只該有一種表示。
   *
   * Info: (20260813 - Julian) `.optional()` 必須包在 `.transform()` **外面**。
   * 寫成 `.optional().transform()` 時,ZodOptional 被 transform 吞掉,z.infer 推出的是
   * 「鍵必填、值可為 undefined」的 `sourceTables: ICarbonSourceTable[] | undefined`,
   * 與 IPendingImportItem 的 `sourceTables?: ICarbonSourceTable[]` 不相容(TS2322,擋 build)。
   * 順序調換後鍵位維持 optional,執行語意不變:缺鍵時 transform 不執行直接得 undefined,
   * 有鍵時照舊逐張裁決並把空陣列收斂為 undefined。
   */
  sourceTables: z
    .array(z.unknown())
    .max(20)
    .transform((tables) => {
      const accepted = tables.flatMap((candidate) => {
        const parsed = CarbonSourceTableSchema.safeParse(candidate);
        return parsed.success ? [parsed.data] : [];
      });
      return accepted.length > 0 ? accepted : undefined;
    })
    .optional(),
});

/**
 * Info: (20260806 - Tzuhan) 待匯入結果的持久化形狀(前端解密後驗證)。
 *
 * 存的是**尚未寫進報告**的候選內容,所以要連「能不能續作」的線索一起存:
 * - `source.cid` 讓「重試失敗章節」在重載後還能用(File 是記憶體物件,重載即消失)
 * - `pageIndex` 讓重試不必再問一次頁碼索引(重問等於再燒一次全文輸入,而索引不會變)
 * - `activities` 必須一起存;原本它只在 `importActivitiesRef` 裡,
 *   少了它,重載後套用會得到「有段落、沒有活動數據」的半套結果 ——
 *   那正是活動數據面板前幾天在說的那個矛盾。
 */
export const CarbonPendingImportDataSchema = z.object({
  storageVersion: z.literal(CARBON_PENDING_IMPORT_STORAGE_VERSION),
  savedAt: z.string().min(1).max(40),
  source: z.object({
    // Info: (20260806 - Tzuhan) null = 上傳失敗走了直傳退路;重載後不能重試失敗章節,UI 要說出來
    cid: z.string().max(200).nullable(),
    fileName: z.string().min(1).max(300),
    mimeType: z.string().max(200),
  }),
  pending: z.object({
    fileName: z.string().min(1).max(300),
    originSessionId: z.string().min(1).max(50),
    originSessionTitle: z.string().max(200),
    items: z.array(PendingImportItemSchema).max(100),
    unmapped: z.array(z.string().max(50_000)).max(100),
    activityCount: z.number().int().min(0),
    /**
     * Info: (20260902 - Emily) 使用者在預覽卡上確認過的盤查年度(issue_drafts/open/69)。
     *
     * 選填的理由與 pausedChapters 相同:既有紀錄沒有這個欄位,必填會讓它們在
     * 下一次保存時被 schema 擋下。缺席的語意是「還沒確認」,不是「沒有年度」。
     *
     * 存在這裡而不是只放記憶體:預覽卡有「稍後再說」這條路,而重載之後
     * 使用者填過的年度若不見了,他會再填一次(或忘記填),
     * 而那個值決定跨年度合併時哪些分錄被剔除。
     *
     * 上限寫死 2100 而不是「今年 + 1」:schema 是儲存格式,不該隨時間改變判定
     *(那會讓舊紀錄在某一天忽然讀不出來)。收窄到「今年 + 1」的裁決在
     * `normalizeInventoryYear`,那是萃取端的事。
     */
    inventoryYear: z.number().int().min(1990).max(2100).optional(),
    failedChapters: z
      .array(
        z.object({
          id: z.string().min(1).max(50),
          title: z.string().max(300),
        }),
      )
      .max(50),
    /**
     * Info: (20260825 - Luphia) 點數用完的斷點（issue #6713）。
     *
     * 選填：舊的紀錄沒有這兩個欄位，而它們的缺席就是「沒有暫停」——
     * 必填會讓既有的待匯入紀錄在下一次保存時被 schema 擋下。
     *
     * 章（顯示）與單元（接續）各存一份：`buildImportUnits` 會把節數多的章
     * 切成兩份，而只有沒跑完的那一份需要重跑（review #6717 阻擋-1）。
     */
    pausedChapters: z
      .array(
        z.object({
          id: z.string().min(1).max(50),
          title: z.string().max(300),
        }),
      )
      .max(50)
      .optional(),
    pausedUnits: z
      .array(
        z.object({
          chapterId: z.string().min(1).max(50),
          sectionIds: z.array(z.string().min(1).max(50)).max(50),
          partIndex: z.number().int().min(1).max(50),
          partTotal: z.number().int().min(1).max(50),
        }),
      )
      .max(100)
      .optional(),
    // Info: (20260825 - Luphia) JOB_PAUSE_REASON；null／缺席＝沒有暫停
    pauseReason: z.string().max(50).nullable().optional(),
  }),
  activities: z.array(CarbonActivityRecordSchema).max(500),
  // Info: (20260806 - Tzuhan) Map 無法 JSON 序列化,存成 entry 陣列
  pageIndex: z
    .array(z.tuple([z.string().max(50), z.number().int().min(0).max(10_000)]))
    .max(200),
});

export type CarbonPendingImportData = z.infer<
  typeof CarbonPendingImportDataSchema
>;

/**
 * Info: (20260806 - Tzuhan) DELETE 只帶 channel:授權由 resolveCarbonAccess 以 EDIT 層級裁決,
 * schema 不承擔授權職責(同 CarbonSessionArchiveSchema 的分層)。
 */
export const CarbonPendingImportDeleteSchema = z.object({
  channel: z.string().min(1).max(200),
});
export type CarbonPendingImportDeletePayload = z.infer<
  typeof CarbonPendingImportDeleteSchema
>;
