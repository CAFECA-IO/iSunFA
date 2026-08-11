import type { AuthenticationJSON } from "@passwordless-id/webauthn/dist/esm/types";
import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { logger } from "@/lib/utils/logger";
import {
  SECRET_MASK,
  SYSTEM_SETTING_DEFINITIONS,
  SYSTEM_SETTING_FALLBACKS,
  SYSTEM_SETTING_KEYS,
  SettingSnapshotState,
  SystemSettingKey,
  SystemSettingSource,
} from "@/constants/system_setting";
import {
  openSecret,
  sealSecret,
  VaultPurpose,
  isVaultConfigured,
} from "@/lib/auth/key_vault";
import {
  buildSettingsDigest,
  decodeSignature,
  encodeSignature,
  getSuperAdminCredential,
  ISettingEntry,
  ISuperAdminCredential,
  verifySettingsSignature,
} from "@/lib/config/system_setting_signature";
import {
  IPersistableSetting,
  ISystemSettingRepository,
  systemSettingRepo,
} from "@/repositories/system_setting.repo";

/**
 * Info: (20260809 - Luphia) 系統設定服務。
 *
 * 讀取優先序取決於快照狀態（SettingSnapshotState）：
 * - EMPTY（從未用 DB 保管過）：讀 process.env，既有部署不改任何東西也能繼續運作。
 * - TRUSTED（驗簽通過）：DB 就是唯一事實來源，**不再讀 env**。
 * - UNTRUSTED（DB 有設定但驗不過）：拒絕服務並告警。
 * - UNAVAILABLE（DB 暫時讀不到）：沿用上一份可信快照，否則暫時讀 env，且不快取。
 *
 * TRUSTED 之後不讀 env 是刻意的：否則「管理員簽名把某項清空」會被 env 的舊值蓋過去，
 * 而讓驗簽失敗就等於一鍵把整組憑證換回 .env 裡輪替前的版本。
 */

// Info: (20260809 - Luphia) 驗簽是 P-256 運算，用短 TTL 快取避免每次讀設定都算一次
const CACHE_TTL_MS = 30_000;

interface ISettingsSnapshot {
  values: Map<SystemSettingKey, string>;
  version: number;
  state: SettingSnapshotState;
  loadedAt: number;
}

export interface ISettingView {
  key: SystemSettingKey;
  group: string;
  // Info: (20260809 - Luphia) 秘密值一律遮蔽；設定頁只需知道「有沒有值」
  value: string;
  isSecret: boolean;
  hasValue: boolean;
  source: SystemSettingSource;
  /**
   * Info: (20260811 - Luphia) 這一項是否真的存在於（已簽章的）資料庫內。
   *
   * 沒有這個旗標的話，只存在於 .env 的秘密在畫面上同樣顯示 ********，
   * 看起來「有值、有保護」，實際上它不在簽章承諾內、DB 裡也沒有這一列；
   * 管理員按下儲存後那一項會被靜默丟棄，等哪天清理 .env 時服務才會掛掉。
   */
  storedInDb: boolean;
  // Info: (20260809 - Luphia) 未設定時系統實際會採用的保底值，讓管理員知道現在跑的是什麼
  fallback?: string;
}

export interface IPendingChallenge {
  digest: string;
  version: number;
  // Info: (20260809 - Luphia) 讓管理員在簽署前逐項核對自己到底簽了什麼
  items: { key: SystemSettingKey; value: string; isSecret: boolean }[];
}

export class SystemSettingService {
  private snapshot: ISettingsSnapshot | null = null;

  constructor(private readonly repo: ISystemSettingRepository) {}

  public invalidateCache(): void {
    this.snapshot = null;
  }

  /**
   * Info: (20260809 - Luphia) 載入並驗證 DB 內的設定全集。
   * 任一環節失敗都回傳「不可信」的空快照，讓上層自動退回 env。
   */
  private async loadSnapshot(): Promise<ISettingsSnapshot> {
    const cached = this.snapshot;
    if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
      return cached;
    }

    // Info: (20260811 - Luphia) 從未設定過 DB 設定：遷移期的正常狀態，可讀 env
    const empty: ISettingsSnapshot = {
      values: new Map(),
      version: 0,
      state: SettingSnapshotState.EMPTY,
      loadedAt: Date.now(),
    };

    /**
     * Info: (20260811 - Luphia) DB 有內容但驗不過＝遭竄改，與「沒設定過」完全不同。
     * 這個狀態不退回 env，由 get() 拒絕服務——否則 `UPDATE ... SET value = value || 'x'`
     * 這種一行 SQL 就能讓系統改用 .env 裡輪替前的舊憑證，而對外行為完全正常。
     */
    const untrusted: ISettingsSnapshot = {
      values: new Map(),
      version: 0,
      state: SettingSnapshotState.UNTRUSTED,
      loadedAt: Date.now(),
    };

    try {
      const [rows, manifest] = await Promise.all([
        this.repo.findAll(),
        this.repo.getManifest(),
      ]);

      // Info: (20260809 - Luphia) 尚未設定過任何 DB 設定屬正常狀態，不是錯誤
      if (rows.length === 0 && !manifest) {
        this.snapshot = empty;
        return empty;
      }

      if (!manifest) {
        logger.error("System settings present without a signed manifest", {
          count: rows.length,
        });
        this.snapshot = untrusted;
        return untrusted;
      }

      /**
       * Info: (20260809 - Luphia) 信任根不在 env 時退回 env，而不是 fail closed。
       *
       * 這個狀態只可能來自 .env 缺鍵——能改 .env 的人本來就能改任何東西，
       * 不在「具 DB 寫入權限的攻擊者」這個威脅模型內；而硬性停機會讓一次設定失誤
       * 變成全站故障。設定頁另有 trustRootReady 旗標明確呈現這個狀態。
       */
      const credential = getSuperAdminCredential();
      if (!credential) {
        logger.error("SUPER_ADMIN trust root missing; DB settings disabled", {
          reason: "SUPER_ADMIN_CRED_ID / PUB_X / PUB_Y not set in env",
        });
        this.snapshot = empty;
        return empty;
      }

      /**
       * Info: (20260809 - Luphia) Rollback 偵測：manifest 的 version 不得低於稽核表出現過的最高版本。
       * 這擋得住「只把 manifest 與設定列換回舊版」的攻擊；若連稽核表一併回滾則無法偵測，
       * 完整防堵需要 DB 以外的錨點（見 ADR 017）。
       */
      const maxAuditVersion = await this.repo.getMaxAuditVersion();
      if (manifest.version < maxAuditVersion) {
        logger.error("System setting version rollback detected", {
          manifestVersion: manifest.version,
          maxAuditVersion,
        });
        this.snapshot = untrusted;
        return untrusted;
      }

      const entries: ISettingEntry[] = [];
      const values = new Map<SystemSettingKey, string>();

      for (const row of rows) {
        if (!(row.key in SYSTEM_SETTING_DEFINITIONS)) {
          // Info: (20260809 - Luphia) 出現未知鍵代表 DB 被塞入非預期資料，整組判為不可信
          logger.error("Unknown system setting key found", { key: row.key });
          this.snapshot = untrusted;
          return untrusted;
        }

        const key = row.key as SystemSettingKey;

        /**
         * Info: (20260811 - Luphia) isSecret 以程式碼定義為準，並強制與 DB 列一致。
         *
         * 原本直接採信 `row.isSecret`：把某一列改成 is_secret=false、value 換成明文、
         * iv/auth_tag 清空，解密就不會被呼叫，明文與原值相同，於是 digest 與簽章
         * 依然有效、系統回報 trusted——秘密從此明文躺在 DB 裡，沒有任何機制會發現。
         * 加密與否不是資料自己能宣告的事。
         */
        const definition = SYSTEM_SETTING_DEFINITIONS[key];
        if (row.isSecret !== definition.isSecret) {
          logger.error("System setting encryption downgrade detected", {
            key,
            expectedIsSecret: definition.isSecret,
            actualIsSecret: row.isSecret,
          });
          this.snapshot = untrusted;
          return untrusted;
        }

        const plain = definition.isSecret ? this.decryptRow(row) : row.value;
        if (plain === null) {
          this.snapshot = untrusted;
          return untrusted;
        }

        entries.push({ key, value: plain });
        values.set(key, plain);
      }

      const digest = buildSettingsDigest(entries, manifest.version);
      if (digest !== manifest.digest) {
        logger.error("System setting digest mismatch; settings disabled", {
          expected: manifest.digest,
          computed: digest,
        });
        this.snapshot = untrusted;
        return untrusted;
      }

      const signature = decodeSignature(manifest.signature);
      if (!signature) {
        this.snapshot = untrusted;
        return untrusted;
      }

      const isValid = await verifySettingsSignature({
        digest,
        signature,
        credential,
      });
      if (!isValid) {
        this.snapshot = untrusted;
        return untrusted;
      }

      const snapshot: ISettingsSnapshot = {
        values,
        version: manifest.version,
        state: SettingSnapshotState.TRUSTED,
        loadedAt: Date.now(),
      };
      this.snapshot = snapshot;
      return snapshot;
    } catch (error) {
      /**
       * Info: (20260811 - Luphia) DB 暫時讀不到是「不知道」，不是「沒有」。
       *
       * 這個結果刻意不寫進快取，也刻意不覆蓋既有的可信快照：一次 200ms 的連線抖動
       * 原本會把降級狀態固化 30 秒，故障早就恢復了但整批請求還在用 env 的舊憑證。
       */
      logger.error("Failed to load system settings", {
        message: (error as Error).message,
      });

      if (cached) return cached;
      return {
        values: new Map(),
        version: 0,
        state: SettingSnapshotState.UNAVAILABLE,
        loadedAt: Date.now(),
      };
    }
  }

  private decryptRow(row: {
    key: string;
    value: string;
    iv: string | null;
    authTag: string | null;
    keyVersion: number | null;
  }): string | null {
    if (!row.iv || !row.authTag) {
      logger.error("Secret setting missing AES-GCM parameters", {
        key: row.key,
      });
      return null;
    }

    try {
      return openSecret(
        {
          ciphertext: row.value,
          iv: row.iv,
          authTag: row.authTag,
          keyVersion: row.keyVersion ?? 1,
        },
        VaultPurpose.SYSTEM_SETTING,
      );
    } catch (error) {
      logger.error("Failed to decrypt system setting", {
        key: row.key,
        message: (error as Error).message,
      });
      return null;
    }
  }

  /**
   * Info: (20260809 - Luphia) 取單一設定值。
   * 空字串視同未設定，讓「清空設定」與「從未設定」在呼叫端行為一致。
   *
   * Info: (20260811 - Luphia) 可信時 DB 就是唯一事實來源，缺鍵不再落回 env。
   *
   * 原本缺鍵會往下掉去讀 env，造成兩個問題：
   * 1. SUPER_ADMIN 為了停用某項功能把秘密清空並簽名，DB 內該鍵被刪除，
   *    讀取時卻落回 process.env 的舊值——功能照樣啟用，管理員簽下的撤銷被無視。
   * 2. 只要讓驗簽失敗就能讓整組設定退回 env 裡輪替前的舊憑證。
   * 保底值（SYSTEM_SETTING_FALLBACKS）是程式碼常數不是環境狀態，仍然適用。
   */
  public async get(key: SystemSettingKey): Promise<string | undefined> {
    const snapshot = await this.loadSnapshot();

    if (snapshot.state === SettingSnapshotState.TRUSTED) {
      return snapshot.values.get(key) || SYSTEM_SETTING_FALLBACKS[key];
    }

    /**
     * Info: (20260811 - Luphia) DB 有設定但驗不過時拒絕服務，不靜默降級。
     * 這個狀態下任何回傳值都可能是攻擊者選的，或是管理員以為早就換掉的舊憑證。
     */
    if (snapshot.state === SettingSnapshotState.UNTRUSTED) {
      throw new AppError(API_ERRORS.IS_SETTING_STATE_UNTRUSTED);
    }

    const fromEnv = process.env[SYSTEM_SETTING_DEFINITIONS[key].envKey];
    return fromEnv || SYSTEM_SETTING_FALLBACKS[key] || undefined;
  }

  /**
   * Info: (20260811 - Luphia) 目前「實際生效」的設定，供寫入路徑當作合併基準。
   *
   * 一旦資料庫有了任何一筆已簽章的設定，讀取就完全不看 env（見 get()）。
   * 因此第一次寫入必須把當下還靠 env 生效的值一併帶進來，否則既有部署只要在
   * 設定頁存一次 Google OAuth，原本放在 .env 的 GEMINI_API_KEY 就會跟著失效。
   * 遷移完成（TRUSTED）之後就只認資料庫，env 再也不會回頭覆蓋。
   */
  private effectiveValues(
    snapshot: ISettingsSnapshot,
  ): Map<SystemSettingKey, string> {
    if (snapshot.state === SettingSnapshotState.TRUSTED) {
      return snapshot.values;
    }

    const merged = new Map<SystemSettingKey, string>();
    for (const key of SYSTEM_SETTING_KEYS) {
      const fromEnv = process.env[SYSTEM_SETTING_DEFINITIONS[key].envKey];
      if (fromEnv) merged.set(key, fromEnv);
    }
    return merged;
  }

  public async getMany(
    keys: SystemSettingKey[],
  ): Promise<Partial<Record<SystemSettingKey, string>>> {
    const result: Partial<Record<SystemSettingKey, string>> = {};
    await Promise.all(
      keys.map(async (key) => {
        const value = await this.get(key);
        if (value) result[key] = value;
      }),
    );
    return result;
  }

  /**
   * Info: (20260809 - Luphia) 設定頁用的檢視資料：秘密值只回報「有沒有值」與來源，不回傳明文。
   */
  public async listForAdmin(): Promise<ISettingView[]> {
    const snapshot = await this.loadSnapshot();

    const trusted = snapshot.state === SettingSnapshotState.TRUSTED;

    return SYSTEM_SETTING_KEYS.map((key) => {
      const definition = SYSTEM_SETTING_DEFINITIONS[key];
      const dbValue = trusted ? snapshot.values.get(key) : undefined;
      const envValue = process.env[definition.envKey];
      const resolved = dbValue || envValue || "";

      let source = SystemSettingSource.NONE;
      if (dbValue) source = SystemSettingSource.DB;
      else if (envValue) source = SystemSettingSource.ENV;

      return {
        key,
        group: definition.group,
        value: definition.isSecret && resolved ? SECRET_MASK : resolved,
        isSecret: definition.isSecret,
        hasValue: Boolean(resolved),
        source,
        /**
         * Info: (20260811 - Luphia) 讓畫面能區分「已納入資料庫保管」與「只是 env 還有值」。
         * 兩者都顯示 ********，但後者不在簽章承諾內；不標示出來的話，管理員會以為
         * 那一項已經受保護，等哪天清理 .env 才發現服務掛掉。
         */
        storedInDb: Boolean(dbValue),
        fallback: SYSTEM_SETTING_FALLBACKS[key],
      };
    });
  }

  // Info: (20260809 - Luphia) 設定變更歷史，供設定頁稽核檢視；上限避免一次撈爆
  public async listHistory(limit = 20) {
    return this.repo.listAudit(Math.min(Math.max(limit, 1), 100));
  }

  public async getTrustState(): Promise<{
    trusted: boolean;
    version: number;
    vaultReady: boolean;
    trustRootReady: boolean;
  }> {
    const snapshot = await this.loadSnapshot();
    return {
      trusted: snapshot.state === SettingSnapshotState.TRUSTED,
      version: snapshot.version,
      vaultReady: isVaultConfigured(),
      trustRootReady: getSuperAdminCredential() !== null,
    };
  }

  /**
   * Info: (20260809 - Luphia) 把「待簽的設定」轉成 challenge。
   * 送進來的是完整的目標狀態（全量），不是差異——digest 涵蓋全集才擋得住刪除。
   */
  public async buildChallenge(
    pending: Partial<Record<SystemSettingKey, string>>,
    baseVersion: number,
  ): Promise<IPendingChallenge> {
    const snapshot = await this.loadSnapshot();
    await this.assertSafeToReplace(snapshot, baseVersion);

    const version = await this.nextVersion(snapshot);
    const entries = this.toEntries(pending, this.effectiveValues(snapshot));

    /**
     * Info: (20260809 - Luphia) 在發出 challenge 前就擋下來。
     * 若等到寫入時才發現保險庫主密鑰沒設定，管理員已經白按了一次 passkey，
     * 而且只會拿到一個看不出所以然的 500。
     */
    this.assertVaultReadyFor(entries);

    const digest = buildSettingsDigest(entries, version);

    return {
      digest,
      version,
      items: entries.map((entry) => ({
        key: entry.key,
        value: SYSTEM_SETTING_DEFINITIONS[entry.key].isSecret
          ? SECRET_MASK
          : entry.value,
        isSecret: SYSTEM_SETTING_DEFINITIONS[entry.key].isSecret,
      })),
    };
  }

  /**
   * Info: (20260809 - Luphia) 把送進來的目標狀態正規化成 canonical entries。
   *
   * 秘密值在設定頁上是遮罩顯示的，瀏覽器手上沒有明文。若管理員只改了別的欄位、
   * 讓秘密欄位維持遮罩原樣，這裡就把遮罩還原成目前存放的值——
   * 否則「沒動到的秘密」會被當成刪除。
   *
   * buildChallenge 與 applySigned 都走這個函式，因此管理員簽下的 digest
   * 與最終寫進 DB 的內容必然一致。
   */
  /**
   * Info: (20260810 - Luphia) 寫入前的兩道防線，兩者都是為了「全量替換」而存在。
   *
   * 寫入是全量替換：這一版沒帶到的鍵會被刪除。這個設計是必要的（digest 必須涵蓋
   * 全集才擋得住刪除攻擊），但它把「呼叫端手上那份狀態」變成了刪除依據，
   * 因此必須確保那份狀態是新的、而且是看得見的。
   *
   * 1. 現況讀不出來就拒絕寫入。快照不可信時所有設定看起來都是空的，
   *    照著寫下去等於把既有設定全部刪掉。
   * 2. 樂觀鎖比對「呼叫端載入時的版本」。原本比對的是 challenge 當下重算的版本，
   *    兩邊都在同一次請求算出來，永遠相等——完全擋不住陳舊的畫面。
   *
   * 這兩點都是 20260810 的實際事故：設定頁在快照不可信時載入（欄位全空），
   * 之後主密鑰恢復、快照變成可信，使用者一按儲存就把 Google OAuth 設定刪掉了。
   */
  private async assertSafeToReplace(
    snapshot: ISettingsSnapshot,
    baseVersion: number,
  ): Promise<void> {
    /**
     * Info: (20260811 - Luphia) 只有 EMPTY（從未設定過）能在非 TRUSTED 下寫入。
     * UNTRUSTED 代表現況讀不出來，照著寫下去等於把既有設定全部刪掉；
     * UNAVAILABLE 代表 DB 暫時讀不到，同樣不能拿來當刪除依據。
     */
    if (
      snapshot.state !== SettingSnapshotState.TRUSTED &&
      snapshot.state !== SettingSnapshotState.EMPTY
    ) {
      throw new AppError(API_ERRORS.CF_SETTING_STATE_UNREADABLE);
    }

    if (baseVersion !== snapshot.version) {
      throw new AppError(API_ERRORS.CF_SETTING_VERSION_CONFLICT);
    }
  }

  /**
   * Info: (20260811 - Luphia) 下一個版本號必須同時避開 manifest 與稽核表的最高版本。
   *
   * 原本只用 `snapshot.version + 1`。清掉 system_setting 但留著 manifest / 稽核紀錄時
   * 快照的 version 會從 0 重新起算，下次儲存就撞上稽核表的 version 唯一鍵，
   * 整筆 transaction rollback，畫面只看到 500——而且每次重試都一樣，無法從 UI 復原。
   */
  private async nextVersion(snapshot: ISettingsSnapshot): Promise<number> {
    const maxAuditVersion = await this.repo.getMaxAuditVersion();
    return Math.max(snapshot.version, maxAuditVersion) + 1;
  }

  /**
   * Info: (20260809 - Luphia) 秘密設定必須加密才能落盤，因此沒有主密鑰就不接受寫入。
   * 只在「這次真的要寫入秘密值」時擋——只調整非秘密設定（模型名稱、商店代號）
   * 不需要保險庫，不該被一起卡住。
   */
  private assertVaultReadyFor(entries: ISettingEntry[]): void {
    const writesSecret = entries.some(
      (entry) => SYSTEM_SETTING_DEFINITIONS[entry.key].isSecret,
    );

    if (writesSecret && !isVaultConfigured()) {
      throw new AppError(API_ERRORS.IS_SECRET_VAULT_MISSING);
    }
  }

  private toEntries(
    pending: Partial<Record<SystemSettingKey, string>>,
    current: Map<SystemSettingKey, string>,
  ): ISettingEntry[] {
    const entries: ISettingEntry[] = [];

    for (const key of SYSTEM_SETTING_KEYS) {
      const submitted = pending[key] ?? "";
      const isMaskedSecret =
        SYSTEM_SETTING_DEFINITIONS[key].isSecret && submitted === SECRET_MASK;

      const value = isMaskedSecret ? (current.get(key) ?? "") : submitted;
      if (value.length > 0) entries.push({ key, value });
    }

    return entries;
  }

  /**
   * Info: (20260809 - Luphia) 驗證 SUPER_ADMIN 簽章後寫入設定。
   *
   * 這裡刻意重新計算 digest，而不是相信呼叫端傳來的值：
   * 簽章必須綁定「伺服器實際要寫進 DB 的內容」，否則就退化成「同意了某次操作」
   * 而不是「同意了這份內容」。
   */
  public async applySigned(params: {
    pending: Partial<Record<SystemSettingKey, string>>;
    signature: AuthenticationJSON;
    // Info: (20260810 - Luphia) 呼叫端「載入設定時」看到的版本，用於偵測陳舊的畫面
    baseVersion: number;
    /**
     * Info: (20260809 - Luphia) 信任根覆寫，僅供部署精靈使用。
     * 初始化流程中 SUPER_ADMIN 的公鑰還在 .env.setup、尚未載入 process.env，
     * 此時必須由呼叫端提供；一般營運路徑一律留空，改讀 env 的信任根。
     */
    credentialOverride?: ISuperAdminCredential;
  }): Promise<{ version: number; digest: string }> {
    const credential = params.credentialOverride ?? getSuperAdminCredential();
    if (!credential) {
      throw new AppError(API_ERRORS.IS_CONFIG_MISSING);
    }

    const snapshot = await this.loadSnapshot();
    await this.assertSafeToReplace(snapshot, params.baseVersion);

    const version = await this.nextVersion(snapshot);
    const current = this.effectiveValues(snapshot);
    const entries = this.toEntries(params.pending, current);

    // Info: (20260809 - Luphia) challenge 端已擋過一次，這裡再擋是因為兩支 API 可被獨立呼叫
    this.assertVaultReadyFor(entries);

    const digest = buildSettingsDigest(entries, version);

    const isValid = await verifySettingsSignature({
      digest,
      signature: params.signature,
      credential,
    });
    if (!isValid) {
      throw new AppError(API_ERRORS.AUTH_SETTING_SIGNATURE_INVALID);
    }

    const changedKeys = entries
      .filter((entry) => current.get(entry.key) !== entry.value)
      .map((entry) => entry.key);

    await this.repo.replaceAll({
      settings: entries.map((entry) => this.toPersistable(entry)),
      manifest: {
        digest,
        signature: encodeSignature(params.signature),
        signedBy: credential.credentialId,
        version,
      },
      changedKeys,
    });

    this.invalidateCache();
    logger.info("System settings updated", { version, changedKeys });

    return { version, digest };
  }

  private toPersistable(entry: ISettingEntry): IPersistableSetting {
    const definition = SYSTEM_SETTING_DEFINITIONS[entry.key];

    if (!definition.isSecret) {
      return {
        key: entry.key,
        value: entry.value,
        isSecret: false,
        iv: null,
        authTag: null,
        keyVersion: null,
      };
    }

    const sealed = sealSecret(entry.value, VaultPurpose.SYSTEM_SETTING);
    return {
      key: entry.key,
      value: sealed.ciphertext,
      isSecret: true,
      iv: sealed.iv,
      authTag: sealed.authTag,
      keyVersion: sealed.keyVersion,
    };
  }

  /**
   * Info: (20260809 - Luphia) 取得目前的完整明文設定，供設定頁「只改一項」時組出全量狀態。
   * 僅限伺服器端呼叫，回傳值不得直接送到瀏覽器。
   */
  public async getResolvedForUpdate(): Promise<
    Partial<Record<SystemSettingKey, string>>
  > {
    const snapshot = await this.loadSnapshot();
    const current = this.effectiveValues(snapshot);
    const result: Partial<Record<SystemSettingKey, string>> = {};

    for (const key of SYSTEM_SETTING_KEYS) {
      const value = current.get(key);
      if (value) result[key] = value;
    }
    return result;
  }
}

export const systemSettingService = new SystemSettingService(systemSettingRepo);
