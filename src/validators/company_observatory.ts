import { z } from "zod";
import {
  OBSERVATORY_DOCUMENT_STATUSES,
  OBSERVATORY_LIST_DEFAULT_PAGE_SIZE,
  OBSERVATORY_LIST_MAX_PAGE_SIZE,
  OBSERVATORY_REQUEUE_MAX_IDS,
  OBSERVATORY_SEARCH_DEFAULT_LIMIT,
  OBSERVATORY_SEARCH_MAX_LIMIT,
  OBSERVATORY_SOURCES,
  ObservatoryDocumentStatus,
  ObservatorySource,
} from "@/constants/company_observatory";

/**
 * Info: (20261015 - Luphia) 企業觀測站的 Schema：
 * 上半部是外部來源的回應（不可預知的資料先過 Schema 才使用），下半部是管理端 API 的參數。
 * 外部回應只宣告用得到的欄位，其餘由 zod 預設行為剝除。
 */

// ---------------------------------------------------------------------------
// Info: (20261015 - Luphia) 外部來源回應
// ---------------------------------------------------------------------------

// Info: (20261015 - Luphia) 商業司的數值欄位有時是數字、有時是字串，查無時是空字串；一律收成字串原樣保留
const gcisScalar = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((value) =>
    value === null || value === undefined ? "" : String(value),
  );

export const gcisCompanyBasicSchema = z.object({
  Business_Accounting_NO: gcisScalar,
  Company_Name: gcisScalar,
  Company_Status_Desc: gcisScalar,
  Capital_Stock_Amount: gcisScalar,
  Paid_In_Capital_Amount: gcisScalar,
  Share_Val: gcisScalar,
  Equity_Amt: gcisScalar,
  Responsible_Name: gcisScalar,
  Company_Location: gcisScalar,
  Register_Organization_Desc: gcisScalar,
  Company_Setup_Date: gcisScalar,
  Change_Of_Approval_Data: gcisScalar,
  Revoke_App_Date: gcisScalar,
  Case_Status_Desc: gcisScalar,
  Sus_App_Date: gcisScalar,
  Sus_Beg_Date: gcisScalar,
  Sus_End_Date: gcisScalar,
});

export const gcisCompanyBasicListSchema = z.array(gcisCompanyBasicSchema);

export const gcisDirectorSchema = z.object({
  Person_Position_Name: gcisScalar,
  Person_Name: gcisScalar,
  Juristic_Person_Name: gcisScalar,
  Person_Shareholding: gcisScalar,
});

export const gcisDirectorListSchema = z.array(gcisDirectorSchema);

export type IGcisCompanyBasic = z.infer<typeof gcisCompanyBasicSchema>;
export type IGcisDirector = z.infer<typeof gcisDirectorSchema>;

export const esgReportListResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z
    .array(
      z.object({
        code: z.string().optional(),
        name: z.string().nullish(),
        shortName: z.string().nullish(),
        reportingInterval: z.string().nullish(),
        valiProvider: z.string().nullish(),
        thirdStd: z.string().nullish(),
        twDocLink: z.string().nullish(),
        twFirstReportDownloadId: z.string().nullish(),
        twEditReportDownloadId: z.string().nullish(),
      }),
    )
    .nullish(),
});

export type IEsgReportListResponse = z.infer<
  typeof esgReportListResponseSchema
>;

const esgControlSchema = z.object({
  title: z.string().nullish(),
  showTitle: z.string().nullish(),
  value: z.union([z.string(), z.number(), z.null()]).optional(),
});

const esgSectionSchema = z.object({
  name: z.string().nullish(),
  showName: z.string().nullish(),
  controls: z.array(esgControlSchema).nullish(),
  comment: z.string().nullish(),
});

const esgDeclareItemSchema = z.object({
  declareItemName: z.string().nullish(),
  declareItemShowName: z.string().nullish(),
  sections: z.array(esgSectionSchema).nullish(),
});

export const esgMetricsResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z
    .array(
      z.object({
        companyName: z.string().nullish(),
        companyCode: z.string().nullish(),
        year: z.number().nullish(),
        treeModels: z
          .array(
            z.object({
              categoryString: z.string().nullish(),
              items: z.array(esgDeclareItemSchema).nullish(),
            }),
          )
          .nullish(),
      }),
    )
    .nullish(),
});

export type IEsgMetricsResponse = z.infer<typeof esgMetricsResponseSchema>;
export type IEsgDeclareItem = z.infer<typeof esgDeclareItemSchema>;

// Info: (20261015 - Luphia) Ollama /api/embed 回應：每個 input 一個向量（已做 L2 正規化）
export const ollamaEmbeddingResponseSchema = z.object({
  embeddings: z.array(z.array(z.number())).optional(),
  error: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Info: (20261015 - Luphia) 管理端 API 參數
// ---------------------------------------------------------------------------

// Info: (20261015 - Luphia) 股票代號只允許英數（上櫃有 6 碼與英文字尾）；也是 LanceDB 過濾式不被注入的前提
export const observatoryStockIdSchema = z
  .string()
  .trim()
  .regex(/^[0-9A-Za-z]{2,10}$/);

const sourceSchema = z
  .string()
  .refine((value): value is ObservatorySource =>
    (OBSERVATORY_SOURCES as readonly string[]).includes(value),
  );

const statusSchema = z
  .string()
  .refine((value): value is ObservatoryDocumentStatus =>
    (OBSERVATORY_DOCUMENT_STATUSES as readonly string[]).includes(value),
  );

const yearSchema = z.coerce.number().int().min(1990).max(2100);

export const observatoryListQuerySchema = z.object({
  stockId: observatoryStockIdSchema.optional(),
  source: sourceSchema.optional(),
  status: statusSchema.optional(),
  year: yearSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(OBSERVATORY_LIST_MAX_PAGE_SIZE)
    .default(OBSERVATORY_LIST_DEFAULT_PAGE_SIZE),
});

export const observatorySearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(500),
  stockId: observatoryStockIdSchema.optional(),
  source: sourceSchema.optional(),
  year: yearSchema.optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(OBSERVATORY_SEARCH_MAX_LIMIT)
    .default(OBSERVATORY_SEARCH_DEFAULT_LIMIT),
});

// Info: (20261015 - Luphia) 重新排入死信：指定 id，或一次清空全部（可限縮來源）
export const observatoryRequeueSchema = z.union([
  z.object({
    ids: z.array(z.string().uuid()).min(1).max(OBSERVATORY_REQUEUE_MAX_IDS),
  }),
  z.object({
    allDead: z.literal(true),
    source: sourceSchema.optional(),
  }),
]);

export type IObservatoryRequeueInput = z.infer<typeof observatoryRequeueSchema>;

// Info: (20261015 - Luphia) `ObservatoryDocument.metadata`（Json 欄位）讀回時先過 Schema
export const observatoryReportMetadataSchema = z.object({
  period: z.string().optional(),
  verificationAgency: z.string().optional(),
  verificationStandards: z.string().optional(),
  assuranceAgency: z.string().optional(),
  assuranceStandards: z.string().optional(),
});
