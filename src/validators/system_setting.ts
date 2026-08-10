import z from "zod";
import { SYSTEM_SETTING_KEYS } from "@/constants/system_setting";

/**
 * Info: (20260809 - Luphia) 系統設定一律以「全量目標狀態」送出，不接受差異更新。
 * digest 涵蓋全集才擋得住刪除，若允許部分更新就必須在伺服器端合併，
 * 那樣管理員簽的內容與最終落地的內容就可能不一致。
 */
const settingValuesShape = SYSTEM_SETTING_KEYS.reduce<
  Record<string, z.ZodOptional<z.ZodString>>
>((shape, key) => {
  shape[key] = z.string().max(4096).optional();
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
