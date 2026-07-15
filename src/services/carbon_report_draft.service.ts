// Info: (20260714 - Emily) 報告草稿服務:讀寫協調 + 錯誤包裝(不讓 Prisma 原始錯誤噴到前端)
// Info: (20260714 - Emily) 草稿為 E2EE 密文,本服務不接觸明文;版本樂觀鎖衝突以 VL_DRAFT_VERSION_CONFLICT 回報

import { logger } from "@/lib/utils/logger";
import {
  carbonReportDraftRepo,
  CarbonReportDraftRepository,
} from "@/repositories/carbon_report_draft.repo";
import { ApiError, API_ERRORS } from "@/lib/utils/error_dictionary";
import { CARBON_CHAT_PURPOSE } from "@/constants/carbon_chatbot";
import { CarbonReportDraftPutPayload } from "@/validators";

export interface IReportDraftRecord {
  envelope: {
    encryptedContent: string;
    ephemeralPublicKey: string | null;
    keyDerivationHint: string;
    algorithm: string;
  };
  version: number;
  updatedAt: Date;
}

export class CarbonReportDraftService {
  private readonly repo: CarbonReportDraftRepository;

  constructor(repo: CarbonReportDraftRepository = carbonReportDraftRepo) {
    this.repo = repo;
  }

  async getDraft(channel: string): Promise<IReportDraftRecord | null> {
    try {
      const draft = await this.repo.findByChannel(channel);
      if (!draft) return null;
      return {
        envelope: {
          encryptedContent: draft.encryptedContent,
          ephemeralPublicKey: draft.ephemeralPublicKey,
          keyDerivationHint: draft.keyDerivationHint,
          algorithm: draft.algorithm,
        },
        version: draft.version,
        updatedAt: draft.updatedAt,
      };
    } catch (error) {
      logger.error(
        `[CarbonReportDraftService] getDraft failed: ${JSON.stringify(error)}`,
      );
      throw new ApiError(
        API_ERRORS.IS_DB_FAILED.code,
        API_ERRORS.IS_DB_FAILED.message,
        API_ERRORS.IS_DB_FAILED.status,
      );
    }
  }

  async saveDraft(
    payload: CarbonReportDraftPutPayload,
  ): Promise<{ version: number }> {
    let saved;
    try {
      saved = await this.repo.upsertByChannel({
        channel: payload.channel,
        purpose: CARBON_CHAT_PURPOSE,
        recipientPublicKey: payload.recipientPublicKey,
        encryptedContent: payload.envelope.encryptedContent,
        ephemeralPublicKey: payload.envelope.ephemeralPublicKey ?? null,
        keyDerivationHint: payload.envelope.keyDerivationHint,
        algorithm: payload.envelope.algorithm,
        expectedVersion: payload.version,
      });
    } catch (error) {
      logger.error(
        `[CarbonReportDraftService] saveDraft failed: ${JSON.stringify(error)}`,
      );
      throw new ApiError(
        API_ERRORS.IS_DB_FAILED.code,
        API_ERRORS.IS_DB_FAILED.message,
        API_ERRORS.IS_DB_FAILED.status,
      );
    }

    // Info: (20260714 - Emily) 樂觀鎖衝突:他端已更新,呼叫端須重新載入最新草稿(不 silent overwrite)
    if (!saved) {
      throw new ApiError(
        API_ERRORS.VL_DRAFT_VERSION_CONFLICT.code,
        API_ERRORS.VL_DRAFT_VERSION_CONFLICT.message,
        API_ERRORS.VL_DRAFT_VERSION_CONFLICT.status,
      );
    }

    return { version: saved.version };
  }
}
