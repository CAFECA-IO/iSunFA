// Info: (20260714 - Tzuhan) 報告草稿服務:讀寫協調 + 錯誤包裝(不讓 Prisma 原始錯誤噴到前端)
// Info: (20260714 - Tzuhan) 草稿為 E2EE 密文,本服務不接觸明文;版本樂觀鎖衝突以 VL_DRAFT_VERSION_CONFLICT 回報

import { logger } from "@/lib/utils/logger";
import { describeError } from "@/lib/utils/error_message";
import {
  carbonReportDraftRepo,
  CarbonReportDraftRepository,
} from "@/repositories/carbon_report_draft.repo";
import { ApiError, API_ERRORS } from "@/lib/utils/error_dictionary";
import { CARBON_CHAT_PURPOSE } from "@/constants/carbon_chatbot";
import { CarbonReportDraftPutPayload } from "@/validators";

export interface IReportDraftRecord {
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
        envelope:
          draft.encryptedContent && draft.keyDerivationHint
            ? {
                encryptedContent: draft.encryptedContent,
                ephemeralPublicKey: draft.ephemeralPublicKey,
                keyDerivationHint: draft.keyDerivationHint,
                algorithm: draft.algorithm,
              }
            : null,
        plainContent: draft.plainContent ?? null,
        version: draft.version,
        updatedAt: draft.updatedAt,
      };
    } catch (error) {
      logger.error(
        `[CarbonReportDraftService] getDraft failed: ${describeError(error)}`,
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
  async saveDraft(
    payload: CarbonReportDraftPutPayload & { recipientPublicKey: string },
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
      logger.error(
        `[CarbonReportDraftService] saveDraft failed: ${describeError(error)}`,
      );
      throw new ApiError(
        API_ERRORS.IS_DB_FAILED.code,
        API_ERRORS.IS_DB_FAILED.message,
        API_ERRORS.IS_DB_FAILED.status,
      );
    }

    // Info: (20260714 - Tzuhan) 樂觀鎖衝突:他端已更新,呼叫端須重新載入最新草稿(不 silent overwrite)
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
