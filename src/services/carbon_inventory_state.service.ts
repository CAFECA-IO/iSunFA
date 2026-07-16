// Info: (20260716 - Emily) 盤查狀態帳本服務(#6518): 讀寫協調 + 錯誤包裝(比照 CarbonReportDraftService)
// Info: (20260716 - Emily) 狀態為 E2EE 密文，本服務不接觸明文；merge 與狀態機在前端(lib/carbon_inventory)執行

import { logger } from "@/lib/utils/logger";
import {
  carbonInventoryStateRepo,
  CarbonInventoryStateRepository,
} from "@/repositories/carbon_inventory_state.repo";
import { ApiError, API_ERRORS } from "@/lib/utils/error_dictionary";
import { CARBON_CHAT_PURPOSE } from "@/constants/carbon_chatbot";
import { CarbonInventoryStatePutPayload } from "@/validators";

export interface IInventoryStateRecord {
  envelope: {
    encryptedContent: string;
    ephemeralPublicKey: string | null;
    keyDerivationHint: string;
    algorithm: string;
  };
  version: number;
  updatedAt: Date;
}

export class CarbonInventoryStateService {
  private readonly repo: CarbonInventoryStateRepository;

  constructor(repo: CarbonInventoryStateRepository = carbonInventoryStateRepo) {
    this.repo = repo;
  }

  async getState(channel: string): Promise<IInventoryStateRecord | null> {
    try {
      const record = await this.repo.findByChannel(channel);
      if (!record) return null;
      return {
        envelope: {
          encryptedContent: record.encryptedContent,
          ephemeralPublicKey: record.ephemeralPublicKey,
          keyDerivationHint: record.keyDerivationHint,
          algorithm: record.algorithm,
        },
        version: record.version,
        updatedAt: record.updatedAt,
      };
    } catch (error) {
      logger.error(
        `[CarbonInventoryStateService] getState failed: ${JSON.stringify(error)}`,
      );
      throw new ApiError(
        API_ERRORS.IS_DB_FAILED.code,
        API_ERRORS.IS_DB_FAILED.message,
        API_ERRORS.IS_DB_FAILED.status,
      );
    }
  }

  async saveState(
    payload: CarbonInventoryStatePutPayload,
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
        `[CarbonInventoryStateService] saveState failed: ${JSON.stringify(error)}`,
      );
      throw new ApiError(
        API_ERRORS.IS_DB_FAILED.code,
        API_ERRORS.IS_DB_FAILED.message,
        API_ERRORS.IS_DB_FAILED.status,
      );
    }

    // Info: (20260716 - Emily) 樂觀鎖衝突: 他端已更新，呼叫端須重新載入(不 silent overwrite)
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
