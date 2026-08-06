// Info: (20260806 - Tzuhan) 待匯入解析結果服務:讀寫/清除協調 + 錯誤包裝(不讓 Prisma 原始錯誤噴到前端)
// Info: (20260806 - Tzuhan) 內容為 E2EE 密文(或帳本模式明文),本服務不接觸明文語意,只搬封裝

import { logger } from "@/lib/utils/logger";
import { describeError } from "@/lib/utils/error_message";
import {
  carbonPendingImportRepo,
  CarbonPendingImportRepository,
} from "@/repositories/carbon_pending_import.repo";
import { ApiError, API_ERRORS } from "@/lib/utils/error_dictionary";
import { CARBON_CHAT_PURPOSE } from "@/constants/carbon_chatbot";
import { CarbonPendingImportPutPayload } from "@/validators";

export interface IPendingImportRecord {
  // Info: (20260806 - Tzuhan) 雙模式回傳:個人會話 envelope 有值、帳本會話 plainContent 有值
  envelope: {
    encryptedContent: string;
    ephemeralPublicKey: string | null;
    keyDerivationHint: string;
    algorithm: string;
  } | null;
  plainContent: string | null;
  version: number;
  updatedAt: Date;
}

export class CarbonPendingImportService {
  private readonly repo: CarbonPendingImportRepository;

  constructor(repo: CarbonPendingImportRepository = carbonPendingImportRepo) {
    this.repo = repo;
  }

  async getPendingImport(channel: string): Promise<IPendingImportRecord | null> {
    try {
      const record = await this.repo.findByChannel(channel);
      if (!record) return null;
      return {
        envelope:
          record.encryptedContent && record.keyDerivationHint
            ? {
                encryptedContent: record.encryptedContent,
                ephemeralPublicKey: record.ephemeralPublicKey,
                keyDerivationHint: record.keyDerivationHint,
                algorithm: record.algorithm,
              }
            : null,
        plainContent: record.plainContent ?? null,
        version: record.version,
        updatedAt: record.updatedAt,
      };
    } catch (error) {
      logger.error(
        `[CarbonPendingImportService] getPendingImport failed: ${describeError(error)}`,
      );
      throw new ApiError(
        API_ERRORS.IS_DB_FAILED.code,
        API_ERRORS.IS_DB_FAILED.message,
        API_ERRORS.IS_DB_FAILED.status,
      );
    }
  }

  /**
   * Info: (20260806 - Tzuhan) recipientPublicKey 在此**必填**,即使 Schema 放寬為選填。
   * 理由同 CarbonReportDraftService.saveDraft:放寬是為了讓明文模式的呼叫端不必持有金鑰,
   * 而 DB 欄位仍為 non-null,由 API 層以已驗證的使用者位址補齊。
   * 以交集型別表達這條契約,忘了補會在編譯期擋下而不是等 Prisma 在執行期報錯。
   */
  async savePendingImport(
    payload: CarbonPendingImportPutPayload & { recipientPublicKey: string },
  ): Promise<{ version: number }> {
    let saved;
    try {
      saved = await this.repo.upsertByChannel({
        channel: payload.channel,
        purpose: CARBON_CHAT_PURPOSE,
        recipientPublicKey: payload.recipientPublicKey,
        encryptedContent: payload.envelope?.encryptedContent ?? null,
        plainContent: payload.plainContent ?? null,
        ephemeralPublicKey: payload.envelope?.ephemeralPublicKey ?? null,
        keyDerivationHint: payload.envelope?.keyDerivationHint ?? null,
        algorithm: payload.envelope?.algorithm ?? "NONE",
        expectedVersion: payload.version,
      });
    } catch (error) {
      logger.error(
        `[CarbonPendingImportService] savePendingImport failed: ${describeError(error)}`,
      );
      throw new ApiError(
        API_ERRORS.IS_DB_FAILED.code,
        API_ERRORS.IS_DB_FAILED.message,
        API_ERRORS.IS_DB_FAILED.status,
      );
    }

    // Info: (20260806 - Tzuhan) 樂觀鎖衝突:他端已更新,呼叫端須重新載入(不 silent overwrite)
    if (!saved) {
      throw new ApiError(
        API_ERRORS.VL_DRAFT_VERSION_CONFLICT.code,
        API_ERRORS.VL_DRAFT_VERSION_CONFLICT.message,
        API_ERRORS.VL_DRAFT_VERSION_CONFLICT.status,
      );
    }

    return { version: saved.version };
  }

  async deletePendingImport(channel: string): Promise<{ deleted: number }> {
    try {
      const deleted = await this.repo.deleteByChannel(channel);
      return { deleted };
    } catch (error) {
      logger.error(
        `[CarbonPendingImportService] deletePendingImport failed: ${describeError(error)}`,
      );
      throw new ApiError(
        API_ERRORS.IS_DB_FAILED.code,
        API_ERRORS.IS_DB_FAILED.message,
        API_ERRORS.IS_DB_FAILED.status,
      );
    }
  }
}
