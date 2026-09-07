// Info: (20260716 - Tzuhan) 碳盤查狀態帳本 Zod Schema(#6518)
// Info: (20260716 - Tzuhan) LLM 萃取結果的白名單護欄(enum 鎖死) + E2EE 狀態封裝的形狀驗證

import { z } from "zod";
import { CarbonDisclosureFrameworkEnum } from "@/constants/carbon_report_framework";
import { GhgProtocolCategory, Iso14064Category } from "@/constants/esg";
import {
  EmissionBasisEnum,
  LedgerProvenanceEnum,
} from "@/constants/imported_quantity";
import { MeasurementUnit } from "@/constants/enums";
import {
  CarbonInventoryStep,
  INVENTORY_YEAR_MIN,
  INVENTORY_YEAR_STORAGE_MAX,
} from "@/constants/carbon_chatbot";
import { CARBON_CALCULATE_MAX_ACTIVITIES } from "@/constants/carbon_calculation";
import {
  CARBON_ARTICULATION_MAX_STOCK_RECORDS,
  ArticulationStatusEnum,
  ArticulationViolationReasonEnum,
  ArticulationWarningReasonEnum,
} from "@/constants/carbon_articulation";
import { CarbonReportDraftPutSchema } from "@/validators/carbon_report_storage";
import {
  EMISSION_TIMESTAMP_MIN_SECONDS,
  EMISSION_TIMESTAMP_MAX_SECONDS,
} from "@/constants/emission_period";

// Info: (20260716 - Tzuhan) 單筆活動數據: scopeCategory/unit 以 nativeEnum 鎖死；quantity 原樣字串(嚴禁在此轉數字)
/**
 * Info: (20260721 - Tzuhan) 單位護欄(UAT 修正):
 * - 對話/附件萃取的活動:unit 必須是 MeasurementUnit(決定性換算引擎的輸入邊界)
 * - 憑證匯入的活動(esgRecordId + precomputedCo2eKg):排放量直採不重算,
 *   金額基準(spend-based,如 TWD)等非物理單位原樣放行(僅顯示用)
 */
const activityUnitGuard = (
  record: { unit: string; esgRecordId?: string; precomputedCo2eKg?: string },
  ctx: z.RefinementCtx,
) => {
  const isVoucherLinked = Boolean(
    record.esgRecordId && record.precomputedCo2eKg,
  );
  if (
    !isVoucherLinked &&
    !(Object.values(MeasurementUnit) as string[]).includes(record.unit)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["unit"],
      message: "unit must be a MeasurementUnit for non-voucher records",
    });
  }
};

// Info: (20260721 - Tzuhan) shape 供 extend(ZodEffects 不可 extend);對外 schema 一律掛 unit 護欄
const CarbonActivityRecordShape = z.object({
  scopeCategory: z.nativeEnum(GhgProtocolCategory),
  sourceName: z.string().min(1).max(100),
  quantity: z.string().min(1).max(50),
  unit: z.string().min(1).max(50),
  confidence: z.enum(["high", "medium", "low"]).optional(),
  source: z.string().max(200).optional(),
  // Info: (20260720 - Tzuhan) #53 憑證聯動結構化引用(帳本匯入路徑;LLM responseSchema 無此欄位)
  esgRecordId: z.string().max(100).optional(),
  voucherId: z.string().max(100).optional(),
  journalId: z.string().max(100).optional(),
  fileId: z.string().max(100).optional(),
  fileHash: z.string().max(200).optional(),
  precomputedCo2eKg: z.string().max(60).optional(),
  /**
   * Info: (20260806 - Tzuhan) 交易日期(Unix 秒)。**沒有這一行,月別分層只在重載前有效** ——
   * Zod 預設 strip 未宣告的鍵,活動明細解密後過這道 schema 就把時間戳洗掉了,
   * 而畫面上看不出任何異狀:桑基圖只是安靜地退回「未標註期間」一個節點。
   * 上下界與 resolveEmissionMonth 同一組常數(擋毫秒誤傳成秒)。
   */
  tradingTimestamp: z
    .number()
    .int()
    .min(EMISSION_TIMESTAMP_MIN_SECONDS)
    .max(EMISSION_TIMESTAMP_MAX_SECONDS)
    .optional(),
});

export const CarbonActivityRecordSchema =
  CarbonActivityRecordShape.superRefine(activityUnitGuard);

// Info: (20260720 - Tzuhan) #6520 物料庫存紀錄: 質量守恆等式資料;數值原樣字串(解析於 articulation 服務)
export const CarbonStockRecordSchema = z.object({
  materialName: z.string().min(1).max(100),
  openingQuantity: z.string().min(1).max(50),
  purchasedQuantity: z.string().min(1).max(50),
  closingQuantity: z.string().min(1).max(50),
  unit: z.nativeEnum(MeasurementUnit),
  source: z.string().max(200).optional(),
});

// Info: (20260716 - Tzuhan) LLM 萃取輸出: year 為字串原樣，由此決定性轉數字(1990-2100 合理性邊界)
export const CarbonInventoryExtractionSchema = z.object({
  company: z.string().min(1).max(100).optional(),
  year: z.coerce
    .number()
    .int()
    .min(INVENTORY_YEAR_MIN)
    .max(INVENTORY_YEAR_STORAGE_MAX)
    .optional(),
  boundaryApproach: z
    .enum(["operational_control", "financial_control", "equity_share"])
    .optional(),
  activities: z.array(CarbonActivityRecordSchema).max(20).default([]),
  // Info: (20260720 - Tzuhan) #6520 庫存紀錄萃取(期初/採購/期末;守恆檢核的資料來源)
  stockRecords: z.array(CarbonStockRecordSchema).max(20).optional(),
});

export type CarbonInventoryExtractionPayload = z.infer<
  typeof CarbonInventoryExtractionSchema
>;

// Info: (20260716 - Tzuhan) #6519 計算請求: 活動明細（上限護欄）；計算為決定論，無 LLM
export const CarbonCalculateRequestSchema = z.object({
  activities: z
    .array(
      CarbonActivityRecordShape.extend({
        emissionFactor: z.string().max(50).optional(),
        factorSource: z.string().max(200).optional(),
      }).superRefine(activityUnitGuard),
    )
    .min(1)
    .max(CARBON_CALCULATE_MAX_ACTIVITIES),
  // Info: (20260720 - Tzuhan) #6520 庫存紀錄一併送檢:計算 + 守恆勾稽同一請求(結果掛回 ledger.articulation)
  stockRecords: z
    .array(CarbonStockRecordSchema)
    .max(CARBON_ARTICULATION_MAX_STOCK_RECORDS)
    .optional(),
});
export type CarbonCalculateRequestPayload = z.infer<
  typeof CarbonCalculateRequestSchema
>;

// Info: (20260716 - Tzuhan) #6519 計算總表（前端解密後驗證用；數值皆字串化 Decimal）
const FactorSnapshotSchema = z.object({
  factorId: z.string().max(100),
  name: z.string().max(300),
  value: z.string().max(50),
  unit: z.string().max(50),
  source: z.string().max(300),
});

export const ComputedLedgerSchema = z.object({
  entries: z.array(
    z.object({
      activityKey: z.string().max(300),
      scopeCategory: z.nativeEnum(GhgProtocolCategory),
      sourceName: z.string().max(100),
      quantityRaw: z.string().max(50),
      convertedQuantity: z.string().max(60),
      convertedUnit: z.string().max(50),
      co2eKg: z.string().max(60),
      // Info: (20260806 - Tzuhan) 同上:總表 entry 也要保留時間戳,否則重載後月別分層一樣消失
      tradingTimestamp: z
        .number()
        .int()
        .min(EMISSION_TIMESTAMP_MIN_SECONDS)
        .max(EMISSION_TIMESTAMP_MAX_SECONDS)
        .optional(),
      ghgBreakdown: z.record(z.string(), z.string()).optional(),
      gwpVersion: z.string().max(30).optional(),
      factor: FactorSnapshotSchema,
      /**
       * Info: (20260807 - Emily) 出處必須跟著帳本一起存
       * (issue_drafts/inventory_table_import/16)。
       *
       * 這三個欄位原本在 `IComputedLedgerEntry` 上有,卻不在這個 schema 裡 ——
       * zod 預設剝掉未宣告的鍵,於是存檔那一刻它們就消失了。
       * 重載後 `provenance` 變成 undefined,而型別註解寫著「未給即視為 COMPUTED」,
       * 於是 33 列「原文照錄(表3.8)」全部被改寫成「系統計算」,
       * 活動數據欄還印出從 CO2e 反推的數字 —— 原文根本沒提供過那個值。
       *
       * 數字沒變所以畫面看不出異常,變的是「這筆數字從哪來」的聲明。
       * 對查證文件來說那正是最不能錯的一欄:它決定查核者要向誰索取佐證。
       *
       * 「未給即視為 COMPUTED」這個預設本身是合理的(既有憑證路徑零改動),
       * 但它讓欄位遺失變成**靜默的出處竄改**而不是一個錯誤 ——
       * 所以真正該修的是讓欄位存得下來,而不是改那個預設。
       */
      provenance: z.nativeEnum(LedgerProvenanceEnum).optional(),
      emissionBasis: z.nativeEnum(EmissionBasisEnum).optional(),
      importedOrigin: z
        .object({
          site: z.string().max(200),
          isoCategory: z.nativeEnum(Iso14064Category),
          subCategory: z.string().max(50),
          tableNo: z.string().max(50),
          /**
           * Info: (20260903 - Emily) 盤查年度必須跟著分錄一起存。
           *
           * 這一行是補上本 PR 自己的漏:R1 把 `year` 加進 `IImportedOrigin`,
           * 卻沒有加進這個 schema —— 而漏的位置就在上面那段(08-07)的正下方,
           * 那段字寫的正是這個失敗模式。
           *
           * 後果比 08-07 那次更重:寫路徑是 `JSON.stringify(state)` **不過 schema**,
           * 所以年度存得進去;讀路徑剝掉它;而 hook 把 `parsed.data` 直接放進 state,
           * 於是**重載後的第一次存檔會把剝掉年度的版本寫回伺服器** ——
           * 年度從此永久消失,事後補 schema 也救不回來。
           *
           * 而規則 3 在那之後拿到的 `entryYear` 全是 undefined → 不剔除 →
           * 跨年度孤兒列全部保留 → 實測 28.6% 虛增原樣回來。也就是本 PR 的主張
           * 原本只在「同一個 session 內連續匯兩份」成立,而真實情境
           *(去年的報告、今年的報告)本來就跨天。
           *
           * 範圍與頂層 `year` 對齊(1990–2100):schema 是儲存格式,不隨時間收窄,
           * 否則舊紀錄會在某一天忽然讀不出來。
           */
          year: z
            .number()
            .int()
            .min(INVENTORY_YEAR_MIN)
            .max(INVENTORY_YEAR_STORAGE_MAX)
            .optional(),
        })
        .optional(),
      // Info: (20260720 - Tzuhan) #53 證據引用(憑證匯入的活動才有)
      evidence: z
        .object({
          esgRecordId: z.string().max(100),
          voucherId: z.string().max(100).optional(),
          journalId: z.string().max(100).optional(),
          fileId: z.string().max(100).optional(),
        })
        .optional(),
    }),
  ),
  pending: z.array(
    z.object({
      activityKey: z.string().max(300),
      sourceName: z.string().max(100),
      reason: z.string().max(50),
    }),
  ),
  scopeSubtotals: z.record(z.string(), z.string()),
  totalCo2eKg: z.string().max(60),
  computedAt: z.string().max(50),
  // Info: (20260720 - Tzuhan) #6520 勾稽結果(等式兩側值透明保存,審計可追溯)
  articulation: z
    .object({
      status: z.nativeEnum(ArticulationStatusEnum),
      violations: z.array(
        z.object({
          materialName: z.string().max(100),
          unit: z.string().max(50),
          reason: z.nativeEnum(ArticulationViolationReasonEnum),
          expectedConsumption: z.string().max(60),
          actualConsumption: z.string().max(60),
          gap: z.string().max(60),
        }),
      ),
      warnings: z.array(
        z.object({
          activityKey: z.string().max(300),
          sourceName: z.string().max(100),
          reason: z.nativeEnum(ArticulationWarningReasonEnum),
          quantity: z.string().max(60),
          plausibleMax: z.string().max(60),
          unit: z.string().max(50),
        }),
      ),
      checkedAt: z.string().max(50),
    })
    .optional(),
});

// Info: (20260716 - Tzuhan) 前端解密後的狀態驗證（壞資料 Fail Fast 丟棄，不入 React 狀態）
export const CarbonInventoryStateSchema = z.object({
  step: z.nativeEnum(CarbonInventoryStep),
  company: z.string().max(100).optional(),
  year: z
    .number()
    .int()
    .min(INVENTORY_YEAR_MIN)
    .max(INVENTORY_YEAR_STORAGE_MAX)
    .optional(),
  boundaryApproach: z
    .enum(["operational_control", "financial_control", "equity_share"])
    .optional(),
  activities: z.array(
    CarbonActivityRecordShape.extend({
      emissionFactor: z.string().max(50).optional(),
      factorSource: z.string().max(200).optional(),
    }).superRefine(activityUnitGuard),
  ),
  // Info: (20260720 - Tzuhan) #6520 物料庫存紀錄(隨 state E2EE 保存)
  stockRecords: z.array(CarbonStockRecordSchema).optional(),
  computedLedger: ComputedLedgerSchema.optional(),
  /**
   * Info: (20260903 - Emily) 年度快照與年度警示同樣要存得下來。
   *
   * `ledgerByYear` 的鍵在型別上是 `number`,而 JSON 序列化之後是字串 ——
   * 用 `z.coerce.number()` 當鍵 schema,讓還原後的型別對得上介面。
   *
   * `ledgerYearWarning` 只在匯入時寫入(載入路徑不重算),所以它一旦被剝掉
   * 就不會自己回來;而剝掉年度之後的下一次匯入又會對**全部**分錄發警示 ——
   * 兩個方向都錯。
   */
  ledgerByYear: z.record(z.coerce.number(), ComputedLedgerSchema).optional(),
  ledgerYearWarning: z
    .object({
      incomingYear: z
        .number()
        .int()
        .min(INVENTORY_YEAR_MIN)
        .max(INVENTORY_YEAR_STORAGE_MAX),
      undatedCount: z.number().int().min(0),
    })
    .optional(),
  /**
   * Info: (20260903 - Emily) 揭露框架的選擇(#6688-A)。
   *
   * **型別加了、schema 沒加,等於沒做**:`loadInventoryState` 回傳
   * `safeParse(...).data`,而 zod 預設剝掉未宣告的鍵 ——
   * 完成判準「選 IFRS 後重載仍是 IFRS」會靜默失效。
   * 這個檔案已經被同一件事咬過兩次(見上面 08-07 那段與 `importedOrigin.year`),
   * 所以這一行與型別那一行是同一個工作,不是兩件事。
   */
  disclosureFramework: z.nativeEnum(CarbonDisclosureFrameworkEnum).optional(),
  /*
   * Info: (20260904 - Emily) `ledgerImportBlocks` **刻意不在這裡宣告**,理由見
   * `data/scratch/issue_drafts/open/73_ledger_import_blocks_bound.md`。
   *
   * 這個欄位(#6707)確實少了持久化 —— 型別有、schema 沒有,所以重載之後
   * 「帳本為空的原因」說不出來。但它的寫入端 `blockedReason` 是
   * `checks.filter(未通過).map(...).join(";")`,而 `checks` 的筆數隨報告的
   * 廠址 × 類別數成長、`subject` 是客戶報告裡的自由字串 —— **寫入端的值域無上界**。
   *
   * 給它一個猜的上界(本檔一度寫過 `reason: max(500)`)比不宣告更糟:
   * 寫路徑是 `JSON.stringify(state)`(不過 schema),讀路徑是
   * `parsed.success ? parsed.data : null` —— 超界的那一次存得進去、
   * **下一次載入整份盤查狀態(帳本、活動數據、待補項)一起被丟棄**。
   * 這正是 PR #6725 review 阻-2 抓到的同一個形狀(年度 `1024` 手滑毀整份 state)。
   *
   * 所以先量寫入端能產出多長、再決定是截斷還是放寬,而截斷要放在唯一的寫入者
   *(`recordLedgerImportBlocks`)並配一條「寫入端能產出的,儲存端一定讀得回來」
   * 的不變式測試。量完之前不宣告 —— 與分流表那四格的立場一致。
   */
  notes: z.array(z.string().max(500)).optional(),
  updatedAt: z.string().max(50),
  version: z.number().int().min(0),
});

// Info: (20260716 - Tzuhan) PUT /inventory 與報告草稿同封裝（密文形狀相同），直接共用 schema 語意化別名
export const CarbonInventoryStatePutSchema = CarbonReportDraftPutSchema;
export type CarbonInventoryStatePutPayload = z.infer<
  typeof CarbonInventoryStatePutSchema
>;

// Info: (20260716 - Tzuhan) #52 帳本會話綁定請求
export const CarbonSessionBindSchema = z.object({
  sessionId: z.string().min(1).max(50),
  accountBookId: z.string().min(1).max(100),
  recipientPublicKey: z.string().min(1).max(300),
});
export type CarbonSessionBindPayload = z.infer<typeof CarbonSessionBindSchema>;

/**
 * Info: (20260730 - Tzuhan) 會話封存/還原請求:只帶 channel。
 * 權限由 resolveCarbonAccess 以 DELETE 層級裁決(個人限擁有者;帳本限擁有者或 OWNER/ADMIN),
 * 故此處不驗擁有權——驗證與授權分層,schema 不承擔授權職責。
 */
export const CarbonSessionArchiveSchema = z.object({
  channel: z.string().min(1).max(200),
});
export type CarbonSessionArchivePayload = z.infer<
  typeof CarbonSessionArchiveSchema
>;

// Info: (20260716 - Tzuhan) #56 報告匯入 LLM 輸出(responseSchema 之外的第二道防線);
// Info: (20260716 - Tzuhan) paragraphId 僅驗型別,白名單複驗於服務層(非法者降入 unmapped 不丟棄)
/**
 * Info: (20260803 - Tzuhan) 單一段落的形狀。獨立匯出是為了讓 Service 能**逐段**裁決。
 *
 * 實測代價:第二章有一段不合形狀,整章的匯入就以 500 收場(LLM output invalid),
 * 該章十幾節的原文全部落空、退回 AI 草稿 —— 一段壞掉賠掉一整章。
 * 這與底下 sourceTables 的註解是同一條原則,我卻只把它套用在表格上,沒套用在段落本身。
 */
export const CarbonReportImportSegmentSchema = z.object({
  paragraphId: z.string().max(50),
  content: z.string().min(1).max(50_000),
  /**
   * Info: (20260801 - Tzuhan) 原文照錄的表格。此處刻意用 unknown 收下再逐張裁決:
   * 一張表格格式不合就整批匯入失敗是不對的比例 —— 其餘段落與敘述都還是好的。
   * 逐張以 CarbonSourceTableSchema 判定,壞的丟掉並記 log(與 activities 同一原則)。
   */
  sourceTables: z.array(z.unknown()).max(20).optional(),
});

export const CarbonReportImportLlmOutputSchema = z.object({
  // Info: (20260803 - Tzuhan) 收下 unknown 再逐段裁決(見 CarbonReportImportSegmentSchema)
  segments: z.array(z.unknown()).max(100),
  unmapped: z.array(z.string().max(50_000)).max(100),
  activities: z.array(z.unknown()).max(50).optional(),
  /**
   * Info: (20260902 - Emily) 這份報告的盤查年度(issue_drafts/open/69)。
   *
   * 收字串而不是數字,理由與 activities 的 quantity 相同:模型會回
   * 「2024」「2024年」「113」這些形狀,而**哪些收哪些退**是裁決,不是型別。
   * 型別只擋「完全跑掉」(超長字串),裁決留給 normalizeInventoryYear。
   */
  inventoryYear: z.string().max(40).optional(),
});
export type CarbonReportImportLlmOutput = z.infer<
  typeof CarbonReportImportLlmOutputSchema
>;

/**
 * Info: (20260730 - Tzuhan) 結構圖節點 LLM 輸出。
 * LLM 只回「節點文字 + 父節點文字」,mermaid 語法由 carbon_report_diagram.builder 組出;
 * 節點文字是否真的出現在該段原文,由 builder 的 validateDiagramNodes 複驗(找不到就整張不畫)。
 */
/**
 * Info: (20260817 - Emily) LLM 結構圖節點的 schema 上限。
 *
 * 它**不是**實際的閘門 —— 逐模板的上限在 `CARBON_DIAGRAM_TEMPLATES`,由 builder 裁決。
 * 這個值只負責擋「模型完全跑掉」（回幾百個節點）,所以必須明顯高過最寬的模板上限。
 * 匯出是為了讓測試讀它而不是自己寫一份（見 carbon_report_diagram.test.ts 的分工測試）。
 */
export const CARBON_DIAGRAM_LLM_MAX_NODES = 150;

export const CarbonDiagramNodesLlmOutputSchema = z.object({
  nodes: z
    .array(
      z.object({
        label: z.string().min(1).max(120),
        parent: z.string().min(1).max(120).optional(),
      }),
    )
    /**
     * Info: (20260730 - Tzuhan) 上限取最寬的模板(沿革時間軸 30)再留餘裕;逐模板的實際上限由 builder 裁決
     *
     * Info: (20260814 - Emily) 60 → 150。這個 schema 不能成為實際的閘門
     * (`data/issue_drafts/open/34_diagram_overflow_clips_nodes.md`)。
     *
     * 2026-08-14 實測：模型回 31 個節點（沿革有 28 條里程碑），第一次被 builder 以
     * `too_many_nodes` 擋下並附上「31 個超過上限 30」的說明 —— 那是對的。
     * 但重試那次回超過 60 個，撞到這裡的 schema，整批 `ZodError` 被拒 → `nodes` 變成空陣列
     * → builder 收到 0 個節點 → 判成 `no_nodes` → 報告上印
     * 「(本節內容不足以繪製結構圖)」。
     *
     * **那句話與事實完全相反**：那一節有 28 條里程碑，是內容太多而不是不足。
     * 而使用者看到的只有這句話。
     *
     * 根因是兩道閘門的職責重疊：schema 想擋「模型跑掉」，builder 想擋「畫不下」，
     * 而 schema 的上限比 builder 的上限只高一倍，於是它會先攔到本該由 builder
     * 說明的情況 —— 然後把「31 個」變成「0 個」，訊息也就跟著錯。
     *
     * 150 讓兩道閘門的角色分開：builder 的逐模板上限（目前最寬 40）永遠先觸發，
     * 說得出「幾個超過幾個」；schema 只留著擋真正的失控輸出（回幾百個節點），
     * 而那時整批拒絕是對的處置。
     *
     * Info: (20260817 - Emily) 抽成匯出常數（PR review A2）。
     * 原本測試檔自己寫了一個 `const SCHEMA_MAX_NODES = 150`,於是它比較的是
     * 「40 < 150」而 150 是它自己寫的 —— **那條測試不可能為了它存在的理由而失敗**。
     * 實測：把這裡改回 `.max(60)`（就是造成 08-14 回歸的那個值）,全套仍然 53 passed。
     */
    .max(CARBON_DIAGRAM_LLM_MAX_NODES),
});
export type CarbonDiagramNodesLlmOutput = z.infer<
  typeof CarbonDiagramNodesLlmOutputSchema
>;

/**
 * Info: (20260730 - Tzuhan) 頁碼索引 LLM 輸出(兩階段匯入的第一階段)。
 * 只回「每節起始於第幾頁」,輸出極小(33 個數字),用來把第二階段的輸入從整份文件縮成該章對應頁。
 * startPage 僅驗範圍;是否合理由服務層以實際頁數複驗,對不上一律退回送全文(不猜)。
 */
export const CarbonReportPageIndexLlmOutputSchema = z.object({
  index: z
    .array(
      z.object({
        paragraphId: z.string().max(50),
        startPage: z.number().int().min(1).max(5_000),
      }),
    )
    .max(100),
});
export type CarbonReportPageIndexLlmOutput = z.infer<
  typeof CarbonReportPageIndexLlmOutputSchema
>;

// Info: (20260727 - Tzuhan) #57 草稿補齊 LLM 輸出:匯入後仍空白的段落,依上傳文件撰寫草稿(非照抄);
// Info: (20260727 - Tzuhan) paragraphId 僅驗型別,白名單複驗於服務層
export const CarbonReportGapFillLlmOutputSchema = z.object({
  segments: z
    .array(
      z.object({
        paragraphId: z.string().max(50),
        content: z.string().min(1).max(50_000),
      }),
    )
    .max(100),
});
export type CarbonReportGapFillLlmOutput = z.infer<
  typeof CarbonReportGapFillLlmOutputSchema
>;
