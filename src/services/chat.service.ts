import {
  GoogleGenerativeAI,
  Part,
  Tool,
  Schema,
  SchemaType,
  GenerationConfig,
  ModelParams,
  GenerateContentResult,
  FinishReason,
} from "@google/generative-ai";
import { DirectChatSkill } from "@/skills/chat/direct_chat";
import { CARBON_CHAT_GREETING_PROMPT } from "@/constants/carbon_chatbot";
import { CARBON_REPORT_OUTLINE } from "@/constants/carbon_report_outline";
import {
  DEFAULT_GEMINI_MODEL,
  LLM_KEY_MISSING_ERROR_MARKER,
  LLM_SYNC_TIMEOUT_MS,
  LLM_TEMPERATURE,
  LLM_TIMEOUT_ERROR_MARKER,
  LLM_TRUNCATED_ERROR_MARKER,
  LlmTaskKeyEnum,
} from "@/constants/llm";
import {
  CarbonChatStructuredReplySchema,
  CarbonActivityRecordSchema,
  CarbonInventoryExtractionSchema,
  CarbonStockRecordSchema,
} from "@/validators";
import { GhgProtocolCategory } from "@/constants/esg";
import { MeasurementUnit } from "@/constants/enums";
import { CarbonChartTemplateEnum } from "@/constants/carbon_report_charts";
import { IInventoryExtraction } from "@/types/carbon_chatbot.types";
import { logger } from "@/lib/utils/logger";
import { recordLlmUsage } from "@/lib/llm/usage_scope";
import { SystemSettingKey } from "@/constants/system_setting";
import { systemSettingService } from "@/services/system_setting.service";
import type { IFaithHistoryTurn } from "@/lib/faith_memory/short_term";

// Info: (20260714 - Tzuhan) 結構化聊天回覆: readyParagraphId 已通過白名單裁決(非法/none 一律為 null)
// Info: (20260716 - Tzuhan) #6518:extraction 為已裁決的事實萃取(壞欄位逐筆丟棄),null = 本輪無可萃取
export interface ICarbonChatStructuredReply {
  reply: string;
  readyParagraphId: string | null;
  extraction: IInventoryExtraction | null;
  // Info: (20260716 - Tzuhan) #55 修訂請求:使用者要求「依附件/指示修改既有段落」時的目標段落(白名單裁決後)
  revisionParagraphId: string | null;
  // Info: (20260720 - Tzuhan) #51 圖表請求(雙 enum 白名單裁決後):LLM 只裁決「哪張圖、放哪段」,數值零參與
  chartRequest: {
    templateId: CarbonChartTemplateEnum;
    paragraphId: string;
  } | null;
  /**
   * Info: (20260813 - Luphia) 碳盤查計費（設計書 §5.5）的結算依據：SDK 回報的 token 用量。
   * 與費思同一套「預扣—結算」，故此處必須把用量原封帶出，不在服務層自行估算。
   * SDK 未回報時為 null，呼叫端據此收斂為最低扣點而非憑空推估。
   */
  usage: ILlmUsage | null;
}

// Info: (20260714 - Tzuhan) readyParagraphId 的無段落標記(LLM enum 選項之一)
const NO_READY_PARAGRAPH = "none";

// Info: (20260714 - Tzuhan) 判斷 LLM 錯誤是否為額度耗盡(429/RESOURCE_EXHAUSTED)，供呼叫端回專屬錯誤碼
export const isLlmQuotaError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("429") ||
    message.includes("resource_exhausted") ||
    message.includes("quota")
  );
};

/**
 * Info: (20260803 - Tzuhan) 判斷是否為「傳輸層沒送到」(fetch failed / ECONNRESET / socket hang up)。
 *
 * 這一類與其他 LLM 錯誤在**可重試性**上性質相反,故必須分開辨識:
 * - 傳輸失敗 = 請求根本沒抵達,重送同一份輸入完全可能成功
 * - 截斷 / schema 無效 = 模型確實回覆了,只是不合用;同輸入必得同結果,重試純粹浪費時間與費用
 *
 * 實測(20260803)一次連線中斷讓 ch3~ch10 共八章連鎖失敗,latency 從 70s 掉到 2.5s ——
 * 那不是八個各自的錯誤,是同一條連線掛掉;而當時匯入路徑沒有任何重試,八章直接報廢。
 */
export const isLlmTransportError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("fetch failed") ||
    message.includes("econnreset") ||
    message.includes("etimedout") ||
    message.includes("enotfound") ||
    message.includes("socket hang up") ||
    message.includes("network")
  );
};

// Info: (20260716 - Tzuhan) 判斷 LLM 錯誤是否為同步路徑逾時(#6515)，供 route/service 層映射 IS_LLM_TIMEOUT
export const isLlmTimeoutError = (error: unknown): boolean =>
  error instanceof Error && error.message.startsWith(LLM_TIMEOUT_ERROR_MARKER);

/**
 * Info: (20260730 - Tzuhan) 判斷是否為「輸出被 token 上限截斷」。
 * 這與「模型亂回」必須分開:截斷是額度問題(加大額度或縮小範圍就能解),
 * 若一律歸為 JSON 解析失敗,呼叫端只會看到「LLM 輸出無效」而完全沒有方向。
 * 實測 gemini-2.5-pro 逐章匯入時前四章全數在此陣亡。
 */
export const isLlmTruncatedError = (error: unknown): boolean =>
  error instanceof Error &&
  error.message.startsWith(LLM_TRUNCATED_ERROR_MARKER);

/**
 * Info: (20260812 - Luphia) 判斷是否為「完全沒有可用的 LLM 金鑰」。
 *
 * 這與其他 LLM 失敗必須分開:它不是暫時性故障,重試一萬次都一樣 ——
 * 唯一的解法是在 /admin/settings 設定金鑰。上層據此回
 * `IS_GEMINI_API_KEY_UNDEFINED` 而不是通用的未知錯誤。
 */
export const isLlmKeyMissingError = (error: unknown): boolean =>
  error instanceof Error &&
  error.message.startsWith(LLM_KEY_MISSING_ERROR_MARKER);

// Info: (20260714 - Tzuhan) 聊天回覆 responseSchema:readyParagraphId 以 enum 約束，禁止 LLM 捏造段落 id
const CARBON_CHAT_REPLY_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    reply: {
      type: SchemaType.STRING,
      description: "顯示給用戶的對話回覆(Markdown)",
    },
    readyParagraphId: {
      type: SchemaType.STRING,
      format: "enum",
      enum: [...CARBON_REPORT_OUTLINE.map((s) => s.id), NO_READY_PARAGRAPH],
      description: "資訊已蒐集齊全可寫入報告的段落 id；尚未齊全時為 none",
    },
    // Info: (20260716 - Tzuhan) #55 修訂請求:僅當使用者明確要求「修改/更新既有段落」時填段落 id,否則 none
    revisionParagraphId: {
      type: SchemaType.STRING,
      format: "enum",
      enum: [...CARBON_REPORT_OUTLINE.map((s) => s.id), NO_READY_PARAGRAPH],
      description:
        "使用者要求依附件或指示『修改既有段落』時填該段 id;非修改請求一律 none",
    },
    // Info: (20260720 - Tzuhan) #51 圖表請求:雙 enum 鎖死(模板白名單 × 段落清單);數值由系統產出
    chartRequest: {
      type: SchemaType.OBJECT,
      description:
        "使用者明確要求在指定段落加入圖表/表格時填寫;非圖表請求省略本欄位",
      properties: {
        templateId: {
          type: SchemaType.STRING,
          format: "enum",
          enum: Object.values(CarbonChartTemplateEnum),
          description:
            "SCOPE_PIE=各範疇占比圓餅圖;SCOPE_BAR=各範疇長條圖;SOURCE_TABLE=排放源明細表;EMISSION_SANKEY=碳流量桑基圖(憑證→排放源→範疇)",
        },
        paragraphId: {
          type: SchemaType.STRING,
          format: "enum",
          enum: CARBON_REPORT_OUTLINE.map((s) => s.id),
          description: "圖表插入的目標段落 id(只能從段落清單挑選)",
        },
      },
      required: ["templateId", "paragraphId"],
    },
    // Info: (20260716 - Tzuhan) #6518 事實萃取: enum 鎖死範疇/單位，數值原樣字串(嚴禁換算),TS 端再白名單複驗
    extraction: {
      type: SchemaType.OBJECT,
      description: "本輪用戶訊息中可萃取的盤查事實；無則各欄位省略",
      properties: {
        company: { type: SchemaType.STRING, description: "企業名稱(用戶原文)" },
        year: {
          type: SchemaType.STRING,
          description: "盤查年度(西元，原樣數字字串)",
        },
        boundaryApproach: {
          type: SchemaType.STRING,
          format: "enum",
          enum: ["operational_control", "financial_control", "equity_share"],
        },
        activities: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              scopeCategory: {
                type: SchemaType.STRING,
                format: "enum",
                enum: Object.values(GhgProtocolCategory),
              },
              sourceName: {
                type: SchemaType.STRING,
                description: "排放源名稱(如: 外購電力、公務車柴油)",
              },
              quantity: {
                type: SchemaType.STRING,
                description: "數量，連同千分位原樣照抄，嚴禁換算或加總",
              },
              unit: {
                type: SchemaType.STRING,
                format: "enum",
                enum: Object.values(MeasurementUnit),
              },
              confidence: {
                type: SchemaType.STRING,
                format: "enum",
                enum: ["high", "medium", "low"],
              },
            },
            required: ["scopeCategory", "sourceName", "quantity", "unit"],
          },
        },
        // Info: (20260720 - Tzuhan) #6520 物料庫存紀錄:期初/採購/期末原樣字串,供質量守恆勾稽
        stockRecords: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              materialName: {
                type: SchemaType.STRING,
                description: "物料名稱,須與活動數據的排放源名稱一致(如: 柴油)",
              },
              openingQuantity: {
                type: SchemaType.STRING,
                description: "期初庫存量,原樣照抄,嚴禁換算",
              },
              purchasedQuantity: {
                type: SchemaType.STRING,
                description: "本期採購量,原樣照抄,嚴禁換算",
              },
              closingQuantity: {
                type: SchemaType.STRING,
                description: "期末庫存量,原樣照抄,嚴禁換算",
              },
              unit: {
                type: SchemaType.STRING,
                format: "enum",
                enum: Object.values(MeasurementUnit),
              },
            },
            required: [
              "materialName",
              "openingQuantity",
              "purchasedQuantity",
              "closingQuantity",
              "unit",
            ],
          },
        },
      },
    },
  },
  required: ["reply", "readyParagraphId"],
};

export type { Part, Schema, Tool };
/**
 * Info: (20260714 - Tzuhan) SchemaType 一併由此 re-export
 * 所有 AI 串接，含 responseSchema 定義統一經 chat.service
 * 其他服務不得直接 import 任何 AI 相關套件
 */
export { SchemaType };

// Info: (20260807 - Luphia) SDK usageMetadata 的摘要（費思計費結算依據）
export interface ILlmUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

/**
 * Info: (20260813 - Luphia) 自 SDK 回應取出用量摘要；缺欄位一律以 0 補齊
 * （計費側會把 0 收斂為最低 1 點，絕不憑空放大）。
 */
export function toLlmUsage(
  usageMetadata:
    | {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      }
    | undefined,
): ILlmUsage | null {
  if (!usageMetadata) return null;
  return {
    inputTokens: usageMetadata.promptTokenCount ?? 0,
    outputTokens: usageMetadata.candidatesTokenCount ?? 0,
    totalTokens: usageMetadata.totalTokenCount ?? 0,
  };
}

export interface IChatGenerationOptions {
  modelName?: string;
  temperature?: number;
  maxOutputTokens?: number;
  responseSchema?: Schema;
  isJson?: boolean;
  tools?: Tool[];
  /**
   * Info: (20260716 - Tzuhan) 同步 HTTP 路徑專用防護(#6515)。
   * timeoutMs: 後端逾時上限，未提供則不啟用(executor 走檔案狀態機重試，行為零改變)。
   * taskKey: 提供時記錄一筆用量 log，欄位對齊 execution_log.json 以便成本聚合。
   */
  timeoutMs?: number;
  taskKey?: LlmTaskKeyEnum;
  // Info: (20260720 - Julian) 傳入呼叫端的 AbortSignal，使用者中止時一併取消底層 LLM 請求
  signal?: AbortSignal;
}

/**
 * Info: (20260812 - Luphia) 建構選項。目前只有一項,而它是安全邊界而不是效能開關。
 */
export interface IChatServiceOptions {
  // Info: (20260812 - Luphia) false = 這個節點不得存取主資料庫（見 allowSystemSettings 欄位註解）
  allowSystemSettings?: boolean;
}

export class ChatService {
  private genAI: GoogleGenerativeAI | null = null;
  private modelName: string = DEFAULT_GEMINI_MODEL;
  private readonly explicitApiKey?: string;

  /**
   * Info: (20260812 - Luphia) 是否允許向 `systemSettingService` 查設定。
   *
   * 預設 true。設為 false 的唯一用途是**沒有主資料庫權限的節點** ——
   * `MissionExecutor` 依 `async_workers/00_async_worker_overview.md` 就是這種節點,
   * 而那道隔離是防提示詞注入的基礎。
   *
   * 為什麼要一個明示的旗標,而不是靠「有沒有傳 apiKey」:
   * 傳進來的金鑰可能是 `undefined`（例如部署照精靈流程走完,金鑰已從 `.env.setup`
   * 移入資料庫,節點的環境裡就沒有了）。那時 truthy 判斷會**默默落到查資料庫那條路**,
   * 也就是隔離變成「env 剛好有值時才成立」的巧合。旗標讓它成為結構。
   */
  private readonly allowSystemSettings: boolean;

  /**
   */

  /**
   * Info: (20260707 - Luphia)
   * 1. API Key 管理中心化：apiKey 改為選填，預設從環境變數讀取。
   * 組件端與業務邏輯層不再需要負責 apiKey 的讀取與驗證，簡化呼叫流程。
   * 2. 本地模型支援預留：將 apiKey 讀取移入 Service 內部，是為了未來能根據環境變數
   * 直接切換至本地模型（如 Ollama）而不需要修改外部呼叫端的代碼。
   */

  /**
   * Info: (20260809 - Luphia) 金鑰與模型名改為「首次使用時才解析」。
   * 正式來源已移至資料庫的 system_setting（經 SUPER_ADMIN 簽章），解析必然是非同步的，
   * 但建構子不能是非同步的——而 `new ChatService()` 散落在 20 幾處，其中還包含
   * 預設參數值與同步 getter。延遲解析讓所有呼叫端一行都不必改，
   * 同時讓輪替金鑰後的新請求自動取得新值（不需重啟）。
   */

  /**
   * Info: (20260812 - Luphia) 上面第 1 條「預設從環境變數讀取」已不成立:
   * `ensureClient()` 不再自行讀 env,環境變數由 `systemSettingService.get()`
   * 在「從未用資料庫保管」的狀態下負責。
   */
  constructor(apiKey?: string, options?: IChatServiceOptions) {
    this.explicitApiKey = apiKey;
    this.allowSystemSettings = options?.allowSystemSettings ?? true;
  }

  /**
   * Info: (20260809 - Luphia) 解析並快取 LLM 用戶端。
   * 優先序：建構子明確傳入 > 資料庫設定 > 環境變數。
   */
  private async ensureClient(): Promise<GoogleGenerativeAI> {
    if (this.genAI) return this.genAI;

    /**
     * Info: (20260812 - Luphia) 呼叫端明確給了金鑰就**不問資料庫**。
     *
     * 原本 `systemSettingService.get()` 在檢查 `explicitApiKey` 之前就無條件執行,
     * 於是即使呼叫端已經給了金鑰,也照樣讀一次主資料庫 —— 而 `MissionExecutor`
     * 是文件明載「絕對沒有存取主系統 PostgreSQL 權限」的節點
     * (`async_workers/00_async_worker_overview.md`),那道隔離是防提示詞注入的基礎。
     *
     * 短路之後,「建構子明確傳入 > 資料庫設定 > 環境變數」這句話才真的成立:
     * 前者勝出時後面兩者連查都不查。Executor 帶著 env 金鑰進來就是零 DB 存取。
     *
     * 這條路徑的 model 取自 env 而非設定 —— 同一個理由:不能為了取模型名稱去讀 DB。
     */
    if (this.explicitApiKey) {
      this.modelName = process.env.MODEL || DEFAULT_GEMINI_MODEL;
      this.genAI = new GoogleGenerativeAI(this.explicitApiKey);
      return this.genAI;
    }

    /**
     * Info: (20260812 - Luphia) 不許查設定的節點在這裡就結束,不會走到下面的 `get()`。
     *
     * 沒有這一段的話,「Executor 零 DB 存取」只在 env 恰好有金鑰時成立 ——
     * 而照精靈流程設定的部署,金鑰簽章後就從 `.env.setup` 移進資料庫了
     * (`setup.system_setting.service` 的 STAGED_KEYS),那些節點的環境裡本來就沒有。
     * 也就是最常見的部署形態剛好是隔離失效的那一種。
     */
    if (!this.allowSystemSettings) {
      throw new Error(
        `${LLM_KEY_MISSING_ERROR_MARKER}: no LLM API key in this node's environment (this node must not read system settings)`,
      );
    }

    const [settingKey, settingModel] = await Promise.all([
      systemSettingService.get(SystemSettingKey.GEMINI_API_KEY),
      systemSettingService.get(SystemSettingKey.LLM_MODEL),
    ]);

    /**
     * Info: (20260812 - Luphia) 不再自行落回環境變數。
     *
     * `get()` 已經是四態的:資料庫可信時以資料庫為準、驗簽失敗拒絕服務、
     * 從未用資料庫保管時才讀 env（`GEMINI_API_KEY` 正是 `LLM_MODEL` 的 `envKey`
     * 對應的那個鍵，`MODEL` 亦然）。所以這裡再讀一次 env 在每個狀態下都是死碼 ——
     * **除了它造成傷害的那一個**:管理員刻意清空並簽名（= 撤銷）之後，
     * DB 回 undefined，這一行會把 env 裡的舊金鑰救回來，撤銷因此無效。
     *
     * `GOOGLE_API_KEY` 一併移除:它不在 `SystemSettingKey` 裡，永遠不受 manifest
     * 簽章涵蓋、也不出現在 /admin/settings —— 能設環境變數的人可以繞過整套
     * 「全集簽章 + 稽核 + 撤銷」注入一把金鑰。它未記載於 .env.example 與任何文件,
     * 要用第二把金鑰請走系統設定。
     */
    const key = settingKey;

    if (!key) {
      /**
       */

      /**
       * Info: (20260707 - Luphia) 若未來支援純本地模型且不需 Key，此處應改為僅在切換至 Google Provider 時才拋錯
       */

      /**
       * Info: (20260812 - Luphia) 以標記開頭,讓上層用 `isLlmKeyMissingError()` 分類,
       * 而不是比對訊息裡有沒有「GEMINI_API_KEY」這串字。
       * 也不再說「in environment」—— 金鑰的正式保管位置已經是資料庫的系統設定,
       * env 只是尚未遷移時的 fallback,寫成 environment 會把人送去改錯的地方。
       */
      throw new Error(
        `${LLM_KEY_MISSING_ERROR_MARKER}: no LLM API key is configured (checked system settings, then environment)`,
      );
    }

    // Info: (20260812 - Luphia) 同理不再讀 process.env.MODEL —— LLM_MODEL 的 envKey 就是 MODEL,`get()` 已經試過
    this.modelName = settingModel || DEFAULT_GEMINI_MODEL;
    this.genAI = new GoogleGenerativeAI(key);
    return this.genAI;
  }

  /**
   * Info: (20260716 - Tzuhan) 同步路徑防護執行器(#6515)
   * 1. timeoutMs 提供時以 Promise.race 限時，逾時拋帶識別標記的錯誤(isLlmTimeoutError 可辨識)
   *    SDK 呼叫無法真正中斷，但 HTTP 回應即刻釋放，不再無限期佔連線
   * 2. taskKey 提供時寫一筆用量 log，欄位名對齊 execution_log.json(taskKey/inputTokens/
   *    outputTokens/totalTokens)，token 數優先取 SDK usageMetadata(零額外 API 呼叫)
   * 兩者皆未提供時行為與裸呼叫完全相同 — executor 與既有呼叫端零改變。
   */
  private async invokeGuarded(
    exec: () => Promise<GenerateContentResult>,
    guards: {
      timeoutMs?: number;
      taskKey?: LlmTaskKeyEnum;
      modelName: string;
    },
  ): Promise<GenerateContentResult> {
    const { timeoutMs, taskKey, modelName } = guards;
    const startedAt = Date.now();

    const race = async (): Promise<GenerateContentResult> => {
      if (!timeoutMs) return exec();
      /**
       * Info: (20260716 - Tzuhan) SDK 呼叫無法真正中斷，逾時後仍在背景執行
       * 先取得其 Promise 並吞掉「逾時之後才發生」的 reject，避免 unhandledRejection(#6521 review)。
       */
      const execPromise = exec();
      execPromise.catch(() => {});
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(`${LLM_TIMEOUT_ERROR_MARKER}: exceeded ${timeoutMs}ms`),
            ),
          timeoutMs,
        );
      });
      try {
        return await Promise.race([execPromise, timeoutPromise]);
      } finally {
        if (timer) clearTimeout(timer);
      }
    };

    try {
      const result = await race();
      /**
       * Info: (20260813 - Luphia) 用量一律回報給捕捉範圍（設計書 §5.5），與 taskKey 無關：
       * taskKey 決定「要不要寫 log」，計費則不能挑呼叫點——漏一個就是一次不計費的用量。
       * 不在捕捉範圍內時 recordLlmUsage 是 no-op，executor 與既有呼叫端零影響。
       */
      recordLlmUsage({
        inputTokens: result.response.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: result.response.usageMetadata?.candidatesTokenCount ?? 0,
        totalTokens: result.response.usageMetadata?.totalTokenCount ?? 0,
      });
      if (taskKey) {
        const usage = result.response.usageMetadata;
        logger.info("llm sync usage", {
          taskKey,
          model: modelName,
          inputTokens: usage?.promptTokenCount ?? 0,
          outputTokens: usage?.candidatesTokenCount ?? 0,
          totalTokens: usage?.totalTokenCount ?? 0,
          latencyMs: Date.now() - startedAt,
          outcome: "success",
        });
      }
      return result;
    } catch (error) {
      if (taskKey) {
        logger.error("llm sync usage", {
          taskKey,
          model: modelName,
          latencyMs: Date.now() - startedAt,
          outcome: isLlmTimeoutError(error) ? "timeout" : "error",
        });
      }
      throw error;
    }
  }

  /**
   * Info: (20260701 - Tzuhan)
   * Universal generateContent interface for all services
   */
  async generateContent(
    parts: Part[],
    options?: IChatGenerationOptions,
  ): Promise<string> {
    const { text } = await this.generateContentWithUsage(parts, options);
    return text;
  }

  /**
   * Info: (20260807 - Luphia) generateContent 的計費版本：連同 usageMetadata 一併回傳，
   * 供費思「預扣—結算」以 SDK 回報的 totalTokens 為準結算（設計書 §5.3，零捏造：
   * token 數取自決定論來源，絕不採信模型自報）。generateContent 委派至此，行為不變。
   */
  async generateContentWithUsage(
    parts: Part[],
    options?: IChatGenerationOptions,
  ): Promise<{ text: string; usage: ILlmUsage }> {
    // Info: (20260809 - Luphia) 先解析用戶端，this.modelName 才會是設定後的值
    const genAI = await this.ensureClient();
    const modelName = options?.modelName || this.modelName;
    const generationConfig: GenerationConfig = {};

    if (options?.temperature !== undefined) {
      generationConfig.temperature = options.temperature;
    }
    if (options?.maxOutputTokens !== undefined) {
      generationConfig.maxOutputTokens = options.maxOutputTokens;
    }
    if (options?.isJson || options?.responseSchema) {
      generationConfig.responseMimeType = "application/json";
    }
    if (options?.responseSchema) {
      generationConfig.responseSchema = options.responseSchema;
    }

    const modelOptions: ModelParams = {
      model: modelName,
      generationConfig,
    };

    if (options?.tools && options.tools.length > 0) {
      modelOptions.tools = options.tools;
    }

    const model = genAI.getGenerativeModel(modelOptions);

    // Info: (20260720 - Julian) 有 signal 才帶 requestOptions，讓底層 fetch 可被中止
    const requestOptions = options?.signal
      ? { signal: options.signal }
      : undefined;

    // Info: (20260716 - Tzuhan) 經防護執行器呼叫，未帶 timeoutMs 或 taskKey 時行為與原裸呼叫相同
    const result = await this.invokeGuarded(
      () => model.generateContent(parts, requestOptions),
      {
        timeoutMs: options?.timeoutMs,
        taskKey: options?.taskKey,
        modelName,
      },
    );
    const response = await result.response;

    // Info: (20260730 - Tzuhan) 截斷偵測:thinking 模型的思考 token 與輸出共用 maxOutputTokens,
    // Info: (20260730 - Tzuhan) 額度被思考吃光時 finishReason 為 MAX_TOKENS,回傳的 JSON 必然殘缺。
    // Info: (20260730 - Tzuhan) 在此明確拋出可辨識的錯誤,而非讓呼叫端誤判為「模型輸出無效」。
    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason === FinishReason.MAX_TOKENS) {
      const usage = response.usageMetadata;
      /**
       * Info: (20260807 - Emily) 訊息必須帶上**思考 token**,否則這行讀起來像鬼故事。
       *
       * 原本只報 output 與 limit,於是 UAT 現場看到的是
       * 「limit=32768 output=9343」—— 兩個數字擺在一起完全不成立,
       * 排查的人第一反應會是去懷疑上限沒生效,而真正吃掉額度的是思考。
       * thinking 沒有獨立欄位,用 total − input − output 推回來。
       */
      const inputTokens = usage?.promptTokenCount ?? 0;
      const outputTokens = usage?.candidatesTokenCount ?? 0;
      const totalTokens = usage?.totalTokenCount ?? 0;
      const thinkingTokens = Math.max(
        0,
        totalTokens - inputTokens - outputTokens,
      );
      throw new Error(
        `${LLM_TRUNCATED_ERROR_MARKER}: output hit maxOutputTokens ` +
          `(model=${modelName} limit=${generationConfig.maxOutputTokens ?? "default"} ` +
          `output=${outputTokens} thinking=${thinkingTokens} ` +
          `output+thinking=${outputTokens + thinkingTokens} ` +
          `input=${inputTokens} total=${totalTokens})`,
      );
    }

    const usageMetadata = response.usageMetadata;
    return {
      text: response.text(),
      usage: {
        inputTokens: usageMetadata?.promptTokenCount ?? 0,
        outputTokens: usageMetadata?.candidatesTokenCount ?? 0,
        totalTokens: usageMetadata?.totalTokenCount ?? 0,
      },
    };
  }

  async generateResponse(
    message: string,
    tags: string[] = [],
    file?: string,
    mimeType?: string,
  ): Promise<string> {
    const skill = new DirectChatSkill();
    return skill.execute(message, tags, file, mimeType, this);
  }

  /**
   * Info: (20260807 - Luphia) 費思計費路徑（設計書 §5.3）：回傳 text + usage 供預扣—結算
   */
  async generateFaithResponse(
    message: string,
    tags: string[] = [],
    file?: string,
    mimeType?: string,
    // Info: (20260809 - Luphia) 成本上界源自 DB 的費思計費設定，由 service 層注入
    maxOutputTokens?: number,
    /**
     * Info: (20260817 - Luphia) 任務短期記憶：同一段對話的前文（第一輪 C-2）。
     * 在此之前費思是 one-shot——方案頁與條款都寫著「所有方案皆具備任務短期記憶」，
     * 而這個函式從來沒有收過任何歷史參數。
     */
    history: IFaithHistoryTurn[] = [],
  ): Promise<{ text: string; usage: ILlmUsage }> {
    const skill = new DirectChatSkill();
    return skill.executeWithUsage(
      message,
      tags,
      file,
      mimeType,
      this,
      maxOutputTokens,
      history,
    );
  }

  /**
   * Info: (20260714 - Tzuhan) 碳會計師人設，結構化回覆與招呼詞共用，避免 prompt 漂移
   */
  private buildCarbonPersonaInstruction(
    currentStep?: string,
    language?: string,
  ): string {
    const langInstruction = language ? `\n請務必使用 ${language} 回覆。` : "";
    const outlineCatalog = CARBON_REPORT_OUTLINE.map(
      (s) => `${s.id}: ${s.code} ${s.title}`,
    ).join("\n");
    return `你是一個專業的碳會計師 (Carbon Accountant)。你的任務是引導用戶進行溫室氣體盤查。請一步步問問題，引導用戶回答，並在適當的時機請用戶上傳相關資料（如BOM表、能源帳單等）。請保持專業、友善，且每次對話只問一個核心問題以免用戶混淆。${currentStep ? `\n當前盤查流程節點：【${currentStep}】。請根據此階段的目標來引導對話。` : ""}
【報告寫入機制】你的回覆一律為 JSON:reply 填對話內容；readyParagraphId 依下列規則填寫:
- 用戶已提供當前段落所需的關鍵資訊，或明確同意/確認你彙整的內容時 → 填該段落的 id(只能從下方清單挑選)
- 資訊尚未齊全、仍在追問時 → 填 "${NO_READY_PARAGRAPH}"
- 填入段落 id 後，系統會自動將該段草稿寫入右側報告；此時請在 reply 告知用戶「本段已寫入報告，可於右側預覽檢視」，不要把完整草稿貼在對話中，也不要再重複詢問同一段落。
【段落修訂機制】使用者上傳新附件或明確要求「更新/修改某段」時 → revisionParagraphId 填該段 id(只能從段落清單挑選)，reply 告知「已產生修訂建議，請於預覽卡確認」；非修改請求一律填 "none"，且不要在 reply 貼修訂內容(由系統以對照卡呈現)。
【圖表機制】使用者明確要求「在某段加圖表/表格」(如「在 3.2 加各範疇占比圓餅圖」)時 → chartRequest 填模板與目標段落(皆只能從列舉挑選)，reply 告知「圖表已由系統依勾稽數據插入該段」；圖表數值由系統決定性產出，嚴禁你在 reply 自繪任何圖表或表格；非圖表請求省略 chartRequest。
【事實萃取機制】每輪回覆的 extraction 欄位，依下列規則萃取「用戶本輪訊息」中的盤查事實:
- 企業名稱、盤查年度(西元)、組織邊界方法: 用戶明確提供時填入，原文照抄，不確定就省略。
- activities: 用戶提供的活動數據(如用電量、油耗)。quantity 連同千分位「原樣照抄」為字串，嚴禁換算單位、加總或推導；單位只能從 unit 列舉挑選，對不上就整筆省略。
- stockRecords: 用戶提供「期初庫存、本期採購、期末庫存」三值齊全的物料(燃料/原料)時填入，數值原樣照抄；materialName 須與該物料在活動數據中的排放源名稱一致；三值不齊全就整筆省略，嚴禁以 0 補位。
- 你是萃取器不是計算機: 任何需要計算的內容一律不填(含庫存缺口、消耗量推算)。沒有可萃取的事實時 extraction 省略。
【段落清單】
${outlineCatalog}${langInstruction}`;
  }

  /**
   * Info: (20260716 - Tzuhan) 萃取結果裁決(#6518): 逐筆 Zod 驗證，壞欄位丟棄該筆而非整包作廢；
   * 全空回 null。enum 已在 responseSchema 鎖死，此處為 TS 端第二道白名單(永不直接採信 LLM)。
   */
  private adjudicateInventoryExtraction(
    value: unknown,
  ): IInventoryExtraction | null {
    if (!value || typeof value !== "object") return null;
    const candidate = value as { activities?: unknown; stockRecords?: unknown };
    const rawActivities = Array.isArray(candidate.activities)
      ? candidate.activities
      : [];
    const activities = rawActivities.flatMap((item) => {
      const parsed = CarbonActivityRecordSchema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    });
    if (rawActivities.length !== activities.length) {
      logger.warn("inventory extraction dropped invalid activities", {
        dropped: rawActivities.length - activities.length,
      });
    }
    // Info: (20260720 - Tzuhan) #6520 庫存紀錄同標準裁決:逐筆驗證,壞欄位丟該筆不作廢整包
    const rawStockRecords = Array.isArray(candidate.stockRecords)
      ? candidate.stockRecords
      : [];
    const stockRecords = rawStockRecords.flatMap((item) => {
      const parsed = CarbonStockRecordSchema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    });
    if (rawStockRecords.length !== stockRecords.length) {
      logger.warn("inventory extraction dropped invalid stock records", {
        dropped: rawStockRecords.length - stockRecords.length,
      });
    }
    const orgParsed = CarbonInventoryExtractionSchema.safeParse({
      ...value,
      activities: [],
      stockRecords: [],
    });
    const org = orgParsed.success ? orgParsed.data : { activities: [] };
    if (
      !org.company &&
      !org.year &&
      !org.boundaryApproach &&
      activities.length === 0 &&
      stockRecords.length === 0
    ) {
      return null;
    }
    return {
      company: org.company,
      year: org.year,
      boundaryApproach: org.boundaryApproach,
      activities,
      stockRecords: stockRecords.length > 0 ? stockRecords : undefined,
    };
  }

  /**
   * Info: (20260714 - Tzuhan) 碳會計師結構化回覆
   * 對話內容 + 段落完成訊號(碳盤查對 Gemini 的唯一對話路徑)
   * 解決「無限訪談迴圈」：AI 判斷段落資訊已齊全時回報 readyParagraphId
   * 由路由層觸發 ParagraphDraftService 寫入報告；id 經 enum 約束 + 本方法白名單裁決
   */
  async generateCarbonChatbotStructuredResponse(
    history: { role: "user" | "model"; text: string }[],
    currentStep?: string,
    language?: string,
    taskKey: LlmTaskKeyEnum = LlmTaskKeyEnum.CARBON_CHAT,
  ): Promise<ICarbonChatStructuredReply> {
    const genAI = await this.ensureClient();
    const model = genAI.getGenerativeModel({
      model: this.modelName,
      systemInstruction: this.buildCarbonPersonaInstruction(
        currentStep,
        language,
      ),
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: CARBON_CHAT_REPLY_SCHEMA,
      },
    });

    const contents = history.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.text }],
    }));

    // Info: (20260716 - Tzuhan) 同步聊天路徑，45秒逾時 + 用量記錄(#6515)
    const response = await this.invokeGuarded(
      () => model.generateContent({ contents }),
      {
        timeoutMs: LLM_SYNC_TIMEOUT_MS,
        taskKey,
        modelName: this.modelName,
      },
    );
    const raw = response.response.text();
    // Info: (20260813 - Luphia) 用量與解析結果無關：即使 JSON 解析失敗降級，這一輪的 tokens 一樣付了
    const usage = toLlmUsage(response.response.usageMetadata);

    // Info: (20260714 - Tzuhan) 永不直接採信 LLM 輸出，JSON + Zod 護欄；解析失敗降級為純文字回覆(不中斷對話)
    try {
      const rawParsed: unknown = JSON.parse(raw);
      const parsed = CarbonChatStructuredReplySchema.parse(rawParsed);
      const isValidParagraph = CARBON_REPORT_OUTLINE.some(
        (s) => s.id === parsed.readyParagraphId,
      );
      // Info: (20260716 - Tzuhan) #6518:extraction 逐筆裁決(獨立於 reply 護欄，萃取壞掉不影響對話)
      const extraction = this.adjudicateInventoryExtraction(
        (rawParsed as { extraction?: unknown }).extraction,
      );
      // Info: (20260716 - Tzuhan) #55:修訂目標同樣經白名單裁決(enum 之外的值一律視為無請求)
      const rawRevision = (rawParsed as { revisionParagraphId?: unknown })
        .revisionParagraphId;
      const revisionParagraphId = CARBON_REPORT_OUTLINE.some(
        (s) => s.id === rawRevision,
      )
        ? (rawRevision as string)
        : null;
      // Info: (20260720 - Tzuhan) #51:圖表請求雙欄位皆須通過白名單,任一非法即視為無請求(永不猜)
      const rawChart = (rawParsed as { chartRequest?: unknown }).chartRequest;
      const chartCandidate =
        rawChart && typeof rawChart === "object"
          ? (rawChart as { templateId?: unknown; paragraphId?: unknown })
          : null;
      const chartRequest =
        chartCandidate &&
        (Object.values(CarbonChartTemplateEnum) as unknown[]).includes(
          chartCandidate.templateId,
        ) &&
        CARBON_REPORT_OUTLINE.some((s) => s.id === chartCandidate.paragraphId)
          ? {
              templateId: chartCandidate.templateId as CarbonChartTemplateEnum,
              paragraphId: chartCandidate.paragraphId as string,
            }
          : null;
      return {
        reply: parsed.reply,
        readyParagraphId: isValidParagraph ? parsed.readyParagraphId : null,
        extraction,
        revisionParagraphId,
        chartRequest,
        usage,
      };
    } catch {
      return {
        reply: raw,
        readyParagraphId: null,
        extraction: null,
        revisionParagraphId: null,
        chartRequest: null,
        usage,
      };
    }
  }

  /**
   * Info: (20260714 - Tzuhan) 產生開場招呼詞
   * 進入 channel 時的前置作業：以 bootstrap 指令產生開場招呼詞（不含真實對話歷史）
   * 改走結構化回覆，移除重複的純文字對話方法，人設單一來源；招呼詞只取 reply
   */
  async generateCarbonChatbotGreeting(
    currentStep?: string,
    language?: string,
  ): Promise<string> {
    const structured = await this.generateCarbonChatbotStructuredResponse(
      [{ role: "user", text: CARBON_CHAT_GREETING_PROMPT }],
      currentStep,
      language,
      LlmTaskKeyEnum.CARBON_GREETING,
    );
    return structured.reply;
  }

  async generateRawWithImages(
    prompt: string,
    images?: { data: string; mimeType: string }[],
    isJson: boolean = false,
    responseSchema?: Schema,
    options?: IChatGenerationOptions,
  ): Promise<string> {
    const { text } = await this.generateRawWithImagesUsage(
      prompt,
      images,
      isJson,
      responseSchema,
      options,
    );
    return text;
  }

  /**
   * Info: (20260807 - Luphia) generateRawWithImages 的計費版本（費思路徑用），
   * 回傳 text + usage；原方法委派至此，既有呼叫端行為不變。
   */
  async generateRawWithImagesUsage(
    prompt: string,
    images?: { data: string; mimeType: string }[],
    isJson: boolean = false,
    responseSchema?: Schema,
    options?: IChatGenerationOptions,
  ): Promise<{ text: string; usage: ILlmUsage }> {
    const parts: Part[] = [{ text: prompt }];

    if (images && images.length > 0) {
      images.forEach((img) => {
        parts.push({
          inlineData: {
            data: img.data,
            mimeType: img.mimeType,
          },
        });
      });
    }

    return this.generateContentWithUsage(parts, {
      ...options,
      isJson: isJson || options?.isJson,
      responseSchema: responseSchema || options?.responseSchema,
    });
  }

  async generateRaw(
    prompt: string,
    responseSchema?: Schema,
    options?: IChatGenerationOptions,
  ): Promise<string> {
    return this.generateContent([{ text: prompt }], {
      temperature: LLM_TEMPERATURE.CHAT, // Info: (20260701 - Tzuhan) Default legacy behavior
      ...options,
      responseSchema: responseSchema || options?.responseSchema,
    });
  }

  async countTokens(text: string): Promise<number> {
    try {
      const genAI = await this.ensureClient();
      const model = genAI.getGenerativeModel({ model: this.modelName });
      const response = await model.countTokens(text);
      return response.totalTokens;
    } catch {
      return 0;
    }
  }

  async generateRawWithSearch(
    prompt: string,
    options?: IChatGenerationOptions,
  ): Promise<string> {
    // Info: (20260311 - Tzuhan) Use explicitly typed googleSearch tool for Gemini Grounding
    const searchTool = { googleSearch: {} } as Tool & { googleSearch: unknown };

    return this.generateContent([{ text: prompt }], {
      temperature: LLM_TEMPERATURE.CHAT, // Info: (20260701 - Tzuhan) Default strict temperature
      ...options,
      tools: [searchTool, ...(options?.tools || [])],
    });
  }
}
