// Info: (20260809 - Luphia) 系統設定資料存取層（唯一碰 Prisma）；只進出密文與簽章，不做加解密與驗簽
import { SystemSetting, SystemSettingManifest } from "@/generated";
import { prisma } from "@/lib/prisma";
import { SYSTEM_SETTING_MANIFEST_KEY } from "@/constants/system_setting";

export interface IPersistableSetting {
  key: string;
  value: string;
  isSecret: boolean;
  iv: string | null;
  authTag: string | null;
  keyVersion: number | null;
}

export interface IPersistableManifest {
  digest: string;
  signature: string;
  signedBy: string;
  version: number;
}

export interface ISystemSettingAuditEntry {
  version: number;
  digest: string;
  signedBy: string;
  changedKeys: string[];
  createdAt: Date;
}

export interface ISystemSettingRepository {
  findAll(): Promise<SystemSetting[]>;
  getManifest(): Promise<SystemSettingManifest | null>;
  getMaxAuditVersion(): Promise<number>;
  listAudit(limit: number): Promise<ISystemSettingAuditEntry[]>;
  countSecrets(): Promise<number>;
  replaceAll(params: {
    settings: IPersistableSetting[];
    manifest: IPersistableManifest;
    changedKeys: string[];
  }): Promise<void>;
}

class SystemSettingRepository implements ISystemSettingRepository {
  public async findAll(): Promise<SystemSetting[]> {
    return prisma.systemSetting.findMany();
  }

  public async getManifest(): Promise<SystemSettingManifest | null> {
    return prisma.systemSettingManifest.findUnique({
      where: { key: SYSTEM_SETTING_MANIFEST_KEY },
    });
  }

  /**
   * Info: (20260809 - Luphia) 稽核表中出現過的最大 version。
   * manifest 的 version 若低於這個值，代表 manifest 被換回舊版本（rollback 跡象）。
   */
  public async getMaxAuditVersion(): Promise<number> {
    const latest = await prisma.systemSettingAudit.findFirst({
      orderBy: { version: "desc" },
      select: { version: true },
    });
    return latest?.version ?? 0;
  }

  // Info: (20260810 - Luphia) 現存密文數量；用來判斷換發保險庫主密鑰是否會讓它們永久解不開
  public async countSecrets(): Promise<number> {
    return prisma.systemSetting.count({ where: { isSecret: true } });
  }

  /**
   * Info: (20260809 - Luphia) 設定變更歷史（新到舊）。
   * 不回傳簽章 blob——它體積大且對畫面無用，需要驗證時直接查 DB。
   */
  public async listAudit(limit: number): Promise<ISystemSettingAuditEntry[]> {
    const rows = await prisma.systemSettingAudit.findMany({
      orderBy: { version: "desc" },
      take: limit,
      select: {
        version: true,
        digest: true,
        signedBy: true,
        changedKeys: true,
        createdAt: true,
      },
    });

    return rows.map((row) => ({
      version: row.version,
      digest: row.digest,
      signedBy: row.signedBy,
      changedKeys: row.changedKeys ? row.changedKeys.split(",") : [],
      createdAt: row.createdAt,
    }));
  }

  /**
   * Info: (20260809 - Luphia) 以「全量替換」寫入。
   * 設定列、manifest 與稽核列必須同生共死：只寫了一半的狀態會讓 digest 對不上，
   * 系統將整組設定判為不可信而停用，因此包在同一個交易內。
   */
  public async replaceAll(params: {
    settings: IPersistableSetting[];
    manifest: IPersistableManifest;
    changedKeys: string[];
  }): Promise<void> {
    const { settings, manifest, changedKeys } = params;
    const keptKeys = settings.map((setting) => setting.key);

    await prisma.$transaction(async (tx) => {
      // Info: (20260809 - Luphia) 這一版沒有的鍵視為刪除；digest 涵蓋全集，刪除同樣受簽章保護
      await tx.systemSetting.deleteMany({
        where: { key: { notIn: keptKeys } },
      });

      for (const setting of settings) {
        await tx.systemSetting.upsert({
          where: { key: setting.key },
          update: {
            value: setting.value,
            isSecret: setting.isSecret,
            iv: setting.iv,
            authTag: setting.authTag,
            keyVersion: setting.keyVersion,
          },
          create: setting,
        });
      }

      await tx.systemSettingManifest.upsert({
        where: { key: SYSTEM_SETTING_MANIFEST_KEY },
        update: manifest,
        create: { key: SYSTEM_SETTING_MANIFEST_KEY, ...manifest },
      });

      await tx.systemSettingAudit.create({
        data: {
          version: manifest.version,
          digest: manifest.digest,
          signature: manifest.signature,
          signedBy: manifest.signedBy,
          changedKeys: changedKeys.join(","),
        },
      });
    });
  }
}

export const systemSettingRepo = new SystemSettingRepository();
