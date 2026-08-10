import type { AuthenticationJSON } from "@passwordless-id/webauthn/dist/esm/types";
import {
  ENV_SETUP_PATH,
  getEnvRawContent,
  saveEnvRawContent,
  updateOrAppendEnv,
  computePredictedFinalEnvString,
} from "@/services/env.service";
import { parse } from "dotenv";
import {
  SECRET_MASK,
  SYSTEM_SETTING_DEFINITIONS,
  SYSTEM_SETTING_KEYS,
  SystemSettingKey,
  isSystemSettingKey,
} from "@/constants/system_setting";
import { systemSettingService } from "@/services/system_setting.service";
import { ISuperAdminCredential } from "@/lib/config/system_setting_signature";

/**
 * Info: (20260809 - Luphia) 部署精靈專用的系統設定流程。
 *
 * 精靈的步驟之間沒有伺服器端 session，既有做法是把輸入暫存在 .env.setup。
 * 這裡沿用同一個機制作為「暫存區」，但在管理員簽章後把值寫進資料庫，
 * 並從 .env.setup 移除——所以這些設定最終不會落進 .env，而是以 DB 為正式保管地。
 */

/**
 * Info: (20260809 - Luphia) 暫存於 .env.setup 的鍵名與正式設定鍵同名，方便對照。
 * 直接取自設定定義，新增設定項時精靈自動涵蓋，不需要再改這裡。
 */
const STAGED_KEYS: SystemSettingKey[] = SYSTEM_SETTING_KEYS;

// Info: (20260809 - Luphia) 暫存區標頭，簽章寫入資料庫後連同鍵值一起從 .env.setup 移除
const STAGING_HEADER =
  "# STAGING: System Settings (簽章後移入資料庫，不會保留在 .env)";

function stripQuotes(value: string): string {
  return value.replace(/^"(.*)"$/, "$1");
}

function readStagedSettings(): Partial<Record<SystemSettingKey, string>> {
  const config = parse(computePredictedFinalEnvString());
  const staged: Partial<Record<SystemSettingKey, string>> = {};

  for (const key of STAGED_KEYS) {
    const raw = config[key];
    if (raw) staged[key] = stripQuotes(raw);
  }
  return staged;
}

/**
 * Info: (20260810 - Luphia) 精靈要寫入的完整目標狀態＝「資料庫現況」疊上「這次暫存的變更」。
 *
 * 為什麼一定要以資料庫為底：寫入是全量替換（這一版沒帶到的鍵會被刪除），
 * 而暫存區只看得見 .env / .env.setup。設定搬進資料庫後就會從 .env.setup 移除，
 * 於是重跑精靈時暫存區是空的——若直接拿它去做全量替換，等於把資料庫裡
 * 所有沒被重新輸入的設定刪掉。20260810 的 Google OAuth 設定就是這樣消失第二次的。
 *
 * 因此精靈只能「新增或覆寫」，不能刪除。要清空某一項請走 /admin/settings，
 * 那裡的畫面能明確呈現「刪除」這個意圖。
 */
async function buildPendingSettings(): Promise<
  Partial<Record<SystemSettingKey, string>>
> {
  const current = await systemSettingService.getResolvedForUpdate();
  return { ...current, ...readStagedSettings() };
}

// Info: (20260810 - Luphia) 暫存值是否真的改變了現況；沒有變更就不需要再簽一次
function hasActualChange(
  current: Partial<Record<SystemSettingKey, string>>,
  staged: Partial<Record<SystemSettingKey, string>>,
): boolean {
  return STAGED_KEYS.some((key) => {
    const next = staged[key];
    return next !== undefined && next !== (current[key] ?? "");
  });
}

function readSuperAdminCredential(): ISuperAdminCredential | null {
  const config = parse(computePredictedFinalEnvString());
  const credentialId = config.SUPER_ADMIN_CRED_ID;
  const pubKeyX = config.SUPER_ADMIN_PUB_X;
  const pubKeyY = config.SUPER_ADMIN_PUB_Y;

  if (!credentialId || !pubKeyX || !pubKeyY) return null;
  return {
    credentialId: stripQuotes(credentialId),
    pubKeyX: stripQuotes(pubKeyX),
    pubKeyY: stripQuotes(pubKeyY),
  };
}

/**
 * Info: (20260809 - Luphia) 步驟 7「設定外部整合」暫存所有由資料庫保管的設定。
 * 值為空字串代表不啟用該項；若整組皆空，後續的簽章步驟會自動跳過。
 */
export async function saveSystemSettingDraft(
  values: Record<string, string>,
): Promise<{ success: boolean; error?: string }> {
  try {
    let content = getEnvRawContent(ENV_SETUP_PATH);

    if (!content.includes(STAGING_HEADER)) {
      content += `\n\n${STAGING_HEADER}\n`;
    }

    for (const [key, value] of Object.entries(values)) {
      // Info: (20260809 - Luphia) 只接受已定義的設定鍵，避免精靈被用來往 .env 塞任意內容
      if (!isSystemSettingKey(key)) continue;

      /**
       * Info: (20260810 - Luphia) 遮罩代表「這一項沒有改動」，不是要把值設成 "********"。
       * 秘密設定在精靈畫面上以遮罩顯示（明文不會送到瀏覽器），照原樣送回來時必須忽略，
       * 由寫入端沿用資料庫現況。
       */
      if (value === SECRET_MASK) continue;

      content = updateOrAppendEnv(content, key, `"${value.trim()}"`);
    }

    saveEnvRawContent(ENV_SETUP_PATH, content);
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Info: (20260810 - Luphia) 步驟 7 表單的初始值：呈現「已經設定好什麼」，含資料庫現況。
 *
 * 秘密值一律以遮罩回傳。部署精靈的 API 完全沒有身分驗證（它服務的是系統尚未初始化的
 * 階段），把解密後的金鑰送到那個畫面等於白送。遮罩送回來時由 saveSystemSettingDraft 忽略。
 */
export async function getSystemSettingDraft() {
  const current = await systemSettingService.getResolvedForUpdate();
  const staged = readStagedSettings();
  const data: Record<string, string> = {};

  for (const key of STAGED_KEYS) {
    const value = staged[key] ?? current[key] ?? "";
    data[key] =
      value && SYSTEM_SETTING_DEFINITIONS[key].isSecret ? SECRET_MASK : value;
  }

  return { success: true, data };
}

/**
 * Info: (20260809 - Luphia) 精靈的簽章步驟用來判斷需不需要第二次 passkey 簽署。
 * 沒有暫存任何系統設定時就沿用原本的單次簽章流程，不增加使用者負擔。
 *
 * Info: (20260810 - Luphia) 判斷依據改為「暫存值是否真的改變了資料庫現況」。
 * 原本只看暫存區有沒有東西，於是重跑精靈時（暫存區已被清空）會回報 false，
 * 卻仍有其他路徑觸發全量替換；現在沒有實質變更就完全不動資料庫。
 */
export async function hasPendingSystemSettings(): Promise<{
  success: boolean;
  pending: boolean;
}> {
  const current = await systemSettingService.getResolvedForUpdate();
  const staged = readStagedSettings();
  return { success: true, pending: hasActualChange(current, staged) };
}

export async function getSystemSettingChallenge(): Promise<{
  success: boolean;
  challenge?: string;
  version?: number;
  items?: { key: string; value: string; isSecret: boolean }[];
  error?: string;
}> {
  try {
    const pending = await buildPendingSettings();

    /**
     * Info: (20260810 - Luphia) 精靈的「基準版本」直接取當下已儲存的版本。
     * 與設定頁不同，待寫入的內容是伺服器端即時組出來的，不存在陳舊畫面的問題；
     * 但仍必須傳入正確的基準版本，樂觀鎖才不會誤判。
     */
    const { version: baseVersion } = await systemSettingService.getTrustState();
    const challenge = await systemSettingService.buildChallenge(
      pending,
      baseVersion,
    );

    return {
      success: true,
      challenge: challenge.digest,
      version: challenge.version,
      items: challenge.items,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Info: (20260809 - Luphia) 驗章後把暫存設定寫入資料庫，並從 .env.setup 移除。
 * 移除這一步很關鍵：秘密值若同時留在 .env，就等於白費了「DB 加密保管」的設計。
 */
export async function applySystemSettingSignature(
  authData: AuthenticationJSON,
): Promise<{ success: boolean; version?: number; error?: string }> {
  try {
    const pending = await buildPendingSettings();
    if (Object.keys(pending).length === 0) {
      return { success: true };
    }

    const credential = readSuperAdminCredential();
    if (!credential) {
      return { success: false, error: "Super admin credential not found." };
    }

    // Info: (20260810 - Luphia) applySigned 會自行重算 digest，這裡只需要基準版本
    const { version: baseVersion } = await systemSettingService.getTrustState();
    const result = await systemSettingService.applySigned({
      pending,
      signature: authData,
      baseVersion,
      credentialOverride: credential,
    });

    let content = getEnvRawContent(ENV_SETUP_PATH);
    for (const key of STAGED_KEYS) {
      content = content.replace(new RegExp(`^${key}=.*$`, "gm"), "");
    }
    content = content
      .split("\n")
      .filter((line) => line.trim() !== STAGING_HEADER)
      .join("\n")
      .replace(/\n{3,}/g, "\n\n");
    saveEnvRawContent(ENV_SETUP_PATH, content);

    return { success: true, version: result.version };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
