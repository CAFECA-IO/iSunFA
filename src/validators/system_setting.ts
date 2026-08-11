import z from "zod";
import { SYSTEM_SETTING_KEYS } from "@/constants/system_setting";

/**
 * Info: (20260809 - Luphia) 系統設定一律以「全量目標狀態」送出，不接受差異更新。
 * digest 涵蓋全集才擋得住刪除，若允許部分更新就必須在伺服器端合併，
 * 那樣管理員簽的內容與最終落地的內容就可能不一致。
 */
/**
 * Info: (20260811 - Luphia) 設定值不得含控制字元——這是簽章正確性的前提，不只是輸入衛生。
 *
 * canonical string 以「一行一個 key=value」串接後雜湊。值裡藏一個換行就能偽裝成
 * 額外的設定鍵，讓兩組語意不同的設定算出同一個 digest（signature.ts 的 escapeValue
 * 是第二道防線）。同一條規則也擋住部署精靈把換行寫進 .env.setup ——
 * 那條路徑可以憑空長出一個 SUPER_ADMIN_PUB_X，直接換掉信任根。
 *
 * 用 refine 而非 regex 是為了避開 no-control-regex；判斷內容完全相同。
 */
export const settingValueSchema = z
  .string()
  .max(4096)
  .refine(
    (value) =>
      ![...value].some(
        (ch) => ch.charCodeAt(0) < 0x20 || ch.charCodeAt(0) === 0x7f,
      ),
    { message: "Setting value must not contain control characters" },
  );

const settingValuesShape = SYSTEM_SETTING_KEYS.reduce<
  Record<string, z.ZodOptional<typeof settingValueSchema>>
>((shape, key) => {
  shape[key] = settingValueSchema.optional();
  return shape;
}, {});

export const systemSettingValuesSchema = z.object(settingValuesShape).strict();

/**
 * Info: (20260810 - Luphia) baseVersion 是呼叫端「載入設定時」看到的版本。
 * 因為寫入是全量替換，這個值是唯一能偵測「畫面已過期」的依據——
 * 沒有它的話，陳舊的畫面一按儲存就會把它沒看到的設定全部刪掉。
 * 允許 0：代表載入時資料庫還沒有任何已簽章的設定。
 */
const baseVersionSchema = z.number().int().min(0);

export const systemSettingChallengeSchema = z.object({
  values: systemSettingValuesSchema,
  baseVersion: baseVersionSchema,
});

// Info: (20260809 - Luphia) authentication 為 WebAuthn assertion，結構交由 fido2 驗章時把關
export const systemSettingApplySchema = z.object({
  values: systemSettingValuesSchema,
  baseVersion: baseVersionSchema,
  authentication: z.record(z.string(), z.unknown()),
});

// Info: (20260809 - Luphia) 補發保險庫主密鑰時對 .env digest 的 SUPER_ADMIN 簽章
export const vaultKeyApplySchema = z.object({
  authentication: z.record(z.string(), z.unknown()),
});

export type ISystemSettingValuesInput = z.infer<
  typeof systemSettingValuesSchema
>;
