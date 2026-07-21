// Info: (20260720 - Emily) 憑證聯動服務(#53):帳本已認列的 EsgRecord → 碳盤查活動數據
// Info: (20260720 - Emily) 原則:碳盤查報告以財報/憑證為依據 — 憑證管線(voucher → EsgRecord)的
// Info: (20260720 - Emily) 認列結果直接成為報告的活動數據來源,不需在對話中重新口述。
// Info: (20260720 - Emily) 零捏造:emissions 為同一決定論引擎產物,直採不重算;
// Info: (20260720 - Emily) 無法決定性映射(範疇/單位對不上)的紀錄「明示跳過」絕不猜值補位。
// Info: (20260720 - Emily) 證據鏈外鍵:esgRecordId(根)+ voucherId/journalId/fileId(#54 據此下鑽到憑證)

import { logger } from "@/lib/utils/logger";
import { esgRepo } from "@/repositories/esg.repo";
import { ApiError, API_ERRORS } from "@/lib/utils/error_dictionary";
import { GhgProtocolCategory } from "@/constants/esg";
import { AIAnalysisStatus } from "@/constants/ai_analysis_status";
import { normalizeCoefficientUnit } from "@/services/carbon_calculation.service";
import { IActivityRecord } from "@/types/carbon_chatbot.types";
import { IEsgRecordDetail } from "@/interfaces/esg";

// Info: (20260720 - Emily) 跳過原因(決定性列舉;回傳給前端明示,使用者可回 ESG 頁補資料)
export enum CarbonEsgSkipReasonEnum {
  // Info: (20260720 - Emily) AI 分析未完成(PENDING/PROCESSING/FAILED)的紀錄不可入報告
  NOT_COMPLETED = "NOT_COMPLETED",
  // Info: (20260720 - Emily) SCOPE_3 未標 GHG Protocol 子分類:15 類不可代猜
  UNMAPPED_SCOPE = "UNMAPPED_SCOPE",
  // Info: (20260720 - Emily) 單位無法正規化為 MeasurementUnit
  UNMAPPED_UNIT = "UNMAPPED_UNIT",
}

export interface ISkippedEsgRecord {
  esgRecordId: string;
  sourceName: string;
  reason: CarbonEsgSkipReasonEnum;
}

export interface IBookEsgActivitiesResult {
  activities: IActivityRecord[];
  skipped: ISkippedEsgRecord[];
}

// Info: (20260720 - Emily) EsgScope(SCOPE_1/2)→ GhgProtocolCategory 的無歧義映射;SCOPE_3 必須有子分類
const SCOPE_FALLBACK_MAP: Record<string, GhgProtocolCategory> = {
  SCOPE_1: GhgProtocolCategory.SCOPE_1_DIRECT,
  SCOPE_2: GhgProtocolCategory.SCOPE_2_INDIRECT,
};

// Info: (20260720 - Emily) 範疇裁決:優先用紀錄自帶的 GHG Protocol 子分類(enum 白名單複驗)
const resolveScopeCategory = (
  record: IEsgRecordDetail,
): GhgProtocolCategory | null => {
  const declared = record.ghgProtocolCategory;
  if (
    typeof declared === "string" &&
    (Object.values(GhgProtocolCategory) as string[]).includes(declared)
  ) {
    return declared as GhgProtocolCategory;
  }
  if (record.scope && SCOPE_FALLBACK_MAP[record.scope]) {
    return SCOPE_FALLBACK_MAP[record.scope];
  }
  return null;
};

export class CarbonEsgLinkService {
  private readonly repo: typeof esgRepo;

  constructor(repo: typeof esgRepo = esgRepo) {
    this.repo = repo;
  }

  /**
   * Info: (20260720 - Emily) 列出帳本可匯入的活動數據(冪等;去重由前端 esgRecordId 鍵天然防護):
   * 逐筆決定性映射,對不上者進 skipped(理由明示),嚴禁靜默丟棄或猜測補位
   */
  async listBookActivities(
    accountBookId: string,
  ): Promise<IBookEsgActivitiesResult> {
    let records: IEsgRecordDetail[];
    try {
      records = await this.repo.getEsgRecords(accountBookId);
    } catch (error) {
      logger.error(
        `[CarbonEsgLinkService] listBookActivities failed: ${JSON.stringify(error)}`,
      );
      throw new ApiError(
        API_ERRORS.IS_DB_FAILED.code,
        API_ERRORS.IS_DB_FAILED.message,
        API_ERRORS.IS_DB_FAILED.status,
      );
    }

    const activities: IActivityRecord[] = [];
    const skipped: ISkippedEsgRecord[] = [];

    records.forEach((record) => {
      // Info: (20260720 - Emily) 已刪除紀錄直接略過(不列入 skipped:非資料問題,無需使用者處理)
      if (record.isDeleted) return;
      const sourceName =
        record.emissionSource?.name || record.vendor || record.activityType;
      if (!sourceName) return;

      if (record.analysisStatus !== AIAnalysisStatus.COMPLETED) {
        skipped.push({
          esgRecordId: record.id,
          sourceName,
          reason: CarbonEsgSkipReasonEnum.NOT_COMPLETED,
        });
        return;
      }

      const scopeCategory = resolveScopeCategory(record);
      if (!scopeCategory) {
        skipped.push({
          esgRecordId: record.id,
          sourceName,
          reason: CarbonEsgSkipReasonEnum.UNMAPPED_SCOPE,
        });
        return;
      }

      const unit = normalizeCoefficientUnit(record.unit);
      if (!unit) {
        skipped.push({
          esgRecordId: record.id,
          sourceName,
          reason: CarbonEsgSkipReasonEnum.UNMAPPED_UNIT,
        });
        return;
      }

      activities.push({
        scopeCategory,
        sourceName,
        // Info: (20260720 - Emily) Decimal→字串(repo 已 toString),全程不經 number
        quantity: record.amount,
        unit,
        emissionFactor: record.coefficient?.emissionFactor,
        factorSource: record.coefficient
          ? `${record.coefficient.name}(${record.coefficient.source})`
          : undefined,
        // Info: (20260720 - Emily) 證據鏈外鍵慣例:voucher 優先(#54 下鑽);無傳票時退 esg 紀錄
        source: record.voucherId
          ? `voucher:${record.voucherId}`
          : `esg:${record.id}`,
        esgRecordId: record.id,
        voucherId: record.voucherId,
        journalId: record.journalId,
        fileId: record.fileId || undefined,
        precomputedCo2eKg: record.emissions,
      });
    });

    return { activities, skipped };
  }
}
