import { describe, it, expect } from "@jest/globals";
import type { AuthenticationJSON } from "@passwordless-id/webauthn/dist/esm/types";
import { SystemSettingService } from "@/services/system_setting.service";
import { SystemSettingKey } from "@/constants/system_setting";
import type {
  IPersistableManifest,
  IPersistableSetting,
  ISystemSettingAuditEntry,
  ISystemSettingRepository,
} from "@/repositories/system_setting.repo";
import type { SystemSetting, SystemSettingManifest } from "@/generated";

/**
 * Info: (20260810 - Luphia) 這組測試守的是一次真實的資料遺失事故。
 *
 * 寫入設定是「全量替換」——這一版沒帶到的鍵會被刪除。該設計是必要的
 * （digest 涵蓋全集才擋得住刪除攻擊），但它把呼叫端手上那份狀態變成了刪除依據。
 *
 * 20260810 發生的事：保險庫主密鑰一度不可用，設定頁載入時所有欄位都是空的；
 * 之後主密鑰恢復，使用者按下儲存，那份「空的畫面」就把已存好的
 * GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET / LLM_MODEL 全部刪掉了。
 *
 * 兩道防線必須成立：
 * 1. 現況讀不出來（快照不可信）但資料庫裡有東西 → 拒絕寫入
 * 2. 呼叫端載入時的版本與現況不符 → 拒絕寫入
 */

const FAKE_SIGNATURE = { id: "irrelevant" } as unknown as AuthenticationJSON;

function makeRow(key: SystemSettingKey, isSecret: boolean): SystemSetting {
  return {
    key,
    value: "ciphertext",
    isSecret,
    iv: isSecret ? "iv" : null,
    authTag: isSecret ? "tag" : null,
    keyVersion: isSecret ? 1 : null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  } as SystemSetting;
}

class FakeRepo implements ISystemSettingRepository {
  public replaceCalls = 0;

  constructor(
    private readonly rows: SystemSetting[],
    private readonly manifest: SystemSettingManifest | null,
  ) {}

  async findAll(): Promise<SystemSetting[]> {
    return this.rows;
  }

  async getManifest(): Promise<SystemSettingManifest | null> {
    return this.manifest;
  }

  async getMaxAuditVersion(): Promise<number> {
    return this.manifest?.version ?? 0;
  }

  async listAudit(): Promise<ISystemSettingAuditEntry[]> {
    return [];
  }

  async countSecrets(): Promise<number> {
    return this.rows.filter((row) => row.isSecret).length;
  }

  async replaceAll(params: {
    settings: IPersistableSetting[];
    manifest: IPersistableManifest;
    changedKeys: string[];
  }): Promise<void> {
    // Info: (20260810 - Luphia) 只計次；測試關心的是「有沒有被呼叫」
    void params;
    this.replaceCalls += 1;
  }
}

describe("system setting write guard", () => {
  it("現況讀不出來時拒絕寫入，且完全不呼叫替換", async () => {
    /**
     * Info: (20260810 - Luphia) 有設定列但沒有 manifest → 快照不可信。
     * 這正是「讀不到現況」的狀態，此時全量替換會把既有設定刪光。
     */
    const repo = new FakeRepo(
      [makeRow(SystemSettingKey.GOOGLE_OAUTH_CLIENT_ID, false)],
      null,
    );
    const service = new SystemSettingService(repo);

    await expect(
      service.applySigned({
        pending: { [SystemSettingKey.LLM_MODEL]: "gemini-2.5-pro" },
        signature: FAKE_SIGNATURE,
        baseVersion: 0,
      }),
    ).rejects.toThrow();

    expect(repo.replaceCalls).toBe(0);
  });

  it("讀不出現況時連 challenge 都不發，避免白簽一次 passkey", async () => {
    const repo = new FakeRepo(
      [makeRow(SystemSettingKey.GOOGLE_OAUTH_CLIENT_SECRET, true)],
      null,
    );
    const service = new SystemSettingService(repo);

    await expect(
      service.buildChallenge(
        { [SystemSettingKey.LLM_MODEL]: "gemini-2.5-pro" },
        0,
      ),
    ).rejects.toThrow();
  });

  it("資料庫本來就空的時候不算「讀不出來」，不應被擋", async () => {
    const repo = new FakeRepo([], null);
    const service = new SystemSettingService(repo);

    const challenge = await service.buildChallenge(
      { [SystemSettingKey.LLM_MODEL]: "gemini-2.5-pro" },
      0,
    );

    expect(challenge.version).toBe(1);
    expect(challenge.digest.length).toBeGreaterThan(0);
  });

  it("基準版本與現況不符時拒絕寫入（偵測陳舊畫面）", async () => {
    const repo = new FakeRepo([], null);
    const service = new SystemSettingService(repo);

    // Info: (20260810 - Luphia) 現況是 0，呼叫端卻聲稱載入時看到 3 → 畫面來源不一致
    await expect(
      service.buildChallenge(
        { [SystemSettingKey.LLM_MODEL]: "gemini-2.5-pro" },
        3,
      ),
    ).rejects.toThrow();
  });
});
