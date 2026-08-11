// Info: (20260716 - Tzuhan) 盤查狀態帳本服務(#6518): 讀寫協調 + 錯誤包裝(比照 CarbonReportDraftService)
// Info: (20260716 - Tzuhan) 狀態為 E2EE 密文，本服務不接觸明文；merge 與狀態機在前端(lib/carbon_inventory)執行

import { logger } from "@/lib/utils/logger";
import { CarbonEnvelopeInvariantError } from "@/repositories/carbon_envelope_invariant";
import { describeError } from "@/lib/utils/error_message";
import {
  carbonInventoryStateRepo,
  CarbonInventoryStateRepository,
} from "@/repositories/carbon_inventory_state.repo";
import { ApiError, API_ERRORS } from "@/lib/utils/error_dictionary";
import { CARBON_CHAT_PURPOSE } from "@/constants/carbon_chatbot";
import { CarbonInventoryStatePutPayload } from "@/validators";

export interface IInventoryStateRecord {
  // Info: (20260716 - Tzuhan) #52 雙模式回傳:個人會話 envelope 有值、帳本會話 plainContent 有值
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
        `[CarbonInventoryStateService] getState failed: ${describeError(error)}`,
      );
      throw new ApiError(
        API_ERRORS.IS_DB_FAILED.code,
        API_ERRORS.IS_DB_FAILED.message,
        API_ERRORS.IS_DB_FAILED.status,
      );
    }
  }

  /**
   * Info: (20260803 - Tzuhan) recipientPublicKey 在此**必填**,即使 Schema 放寬為選填。
   * 放寬是為了讓明文模式的呼叫端不必持有金鑰;而 DB 欄位仍為 non-null,
   * 由 API 層以已驗證的使用者位址補齊。以交集型別表達這條契約 ——
   * 若哪天有人忘了補,會在編譯期擋下,而不是等到 Prisma 在執行期報錯。
   */
  async saveState(
    payload: CarbonInventoryStatePutPayload & { recipientPublicKey: string },
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
        // Info: (20260716 - Tzuhan) #52 帳本模式無 ECIES envelope,algorithm 僅個人模式有意義
        algorithm: payload.envelope?.algorithm ?? "NONE",
        expectedVersion: payload.version,
      });
    } catch (error) {
      /**
       * Info: (20260810 - Emily) 呼叫端違反儲存層不變式 ≠ DB 掛了（PR review 第 3 點）。
       *
       * 兩者的處置完全相反:前者重試一萬次都一樣(送進來的資料本身不合法),
       * 後者值得重試。原本一律轉成 IS_DB_FAILED,呼叫端看到的是一個
       * 與成因無關的 500,而 DB 其實好得很 —— 那正是第 5 點要消滅的症狀。
       */
      if (error instanceof CarbonEnvelopeInvariantError) {
        logger.error(
          `[CarbonInventoryStateService] saveState rejected by storage invariant: ${error.message}`,
        );
        throw new ApiError(
          API_ERRORS.VL_SCHEMA_ERROR.code,
          API_ERRORS.VL_SCHEMA_ERROR.message,
          API_ERRORS.VL_SCHEMA_ERROR.status,
        );
      }
      logger.error(
        `[CarbonInventoryStateService] saveState failed: ${describeError(error)}`,
      );
      throw new ApiError(
        API_ERRORS.IS_DB_FAILED.code,
        API_ERRORS.IS_DB_FAILED.message,
        API_ERRORS.IS_DB_FAILED.status,
      );
    }

    // Info: (20260716 - Tzuhan) 樂觀鎖衝突: 他端已更新，呼叫端須重新載入(不 silent overwrite)
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
