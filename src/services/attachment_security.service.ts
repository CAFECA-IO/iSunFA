// Info: (20260716 - Emily) 附件安全管線(#6517): 內容簽章驗證 → 掃毒 → 配額 → Laria 上傳 → 記帳
// Info: (20260716 - Emily) 職責: route 只呼叫 processUpload;所有裁決與 DB/儲存協調收斂於此(三層架構)

import { ApiError, API_ERRORS } from "@/lib/utils/error_dictionary";
import { logger } from "@/lib/utils/logger";
import { matchesDeclaredMimeType } from "@/lib/file_signature";
import {
  IVirusScanner,
  VirusScanStatusEnum,
  createVirusScanner,
} from "@/lib/virus_scanner";
import { storageService, StorageService } from "@/services/storage.service";
import { userStorageUsageRepo } from "@/repositories/user_storage_usage.repo";
import { CARBON_STORAGE_QUOTA_BYTES } from "@/constants/carbon_chatbot";

export interface IAttachmentUploadInput {
  address: string;
  file: File;
}

export interface IAttachmentUploadResult {
  cid: string;
}

type IUsageRepo = typeof userStorageUsageRepo;

export class AttachmentSecurityService {
  private readonly scanner: IVirusScanner;

  private readonly storage: StorageService;

  private readonly usageRepo: IUsageRepo;

  // Info: (20260716 - Emily) 依賴全部可注入: 單元測試不需 ClamAV/Laria/DB
  constructor(deps?: {
    scanner?: IVirusScanner;
    storage?: StorageService;
    usageRepo?: IUsageRepo;
  }) {
    this.scanner = deps?.scanner ?? createVirusScanner();
    this.storage = deps?.storage ?? storageService;
    this.usageRepo = deps?.usageRepo ?? userStorageUsageRepo;
  }

  /**
   * Info: (20260716 - Emily) Fail Fast 順序(失敗不留殘料，通過才上傳):
   * 1. magic bytes vs 宣告 MIME(防偽裝檔) 2. 掃毒(infected 拒收;未配置/故障 fail-open + 告警)
   * 3. 配額(5GB 常數，見 CARBON_STORAGE_QUOTA_BYTES 註解) 4. uploadLaria 5. 用量記帳
   */
  async processUpload(
    input: IAttachmentUploadInput,
  ): Promise<IAttachmentUploadResult> {
    const { address, file } = input;
    const buffer = Buffer.from(await file.arrayBuffer());

    if (!matchesDeclaredMimeType(buffer, file.type)) {
      logger.warn("attachment content/type mismatch rejected", {
        address,
        declaredMimeType: file.type,
        name: file.name,
      });
      throw new ApiError(
        API_ERRORS.IS_ATTACHMENT_TYPE_MISMATCH.code,
        API_ERRORS.IS_ATTACHMENT_TYPE_MISMATCH.message,
        API_ERRORS.IS_ATTACHMENT_TYPE_MISMATCH.status,
      );
    }

    const scanResult = await this.scanner.scan(buffer);
    if (scanResult.status === VirusScanStatusEnum.INFECTED) {
      // Info: (20260716 - Emily) 掃出惡意內容: 拒收 + 告警(不回傳簽名細節給前端)
      logger.error("attachment rejected by virus scanner", {
        address,
        name: file.name,
        signature: scanResult.signature ?? "unknown",
      });
      throw new ApiError(
        API_ERRORS.IS_ATTACHMENT_INFECTED.code,
        API_ERRORS.IS_ATTACHMENT_INFECTED.message,
        API_ERRORS.IS_ATTACHMENT_INFECTED.status,
      );
    }

    const usedBytes = await this.usageRepo.getUsedBytes(address);
    if (usedBytes + BigInt(file.size) > CARBON_STORAGE_QUOTA_BYTES) {
      throw new ApiError(
        API_ERRORS.IS_STORAGE_QUOTA_EXCEEDED.code,
        API_ERRORS.IS_STORAGE_QUOTA_EXCEEDED.message,
        API_ERRORS.IS_STORAGE_QUOTA_EXCEEDED.status,
      );
    }

    const cid = await this.storage.uploadLaria(file);

    // Info: (20260716 - Emily) 記帳於上傳成功後(失敗不計量);硬刪除歸還配額由 issue 30 承接
    await this.usageRepo.addUsedBytes(address, BigInt(file.size));

    return { cid };
  }
}
