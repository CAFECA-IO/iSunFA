import z from "zod";
import { AUTH_PROVIDER_VALUES } from "@/constants/auth_provider";

// Info: (20260809 - Luphia) provider 路徑參數統一大小寫不敏感，內部一律轉大寫比對 AuthProvider
export const authProviderSchema = z
  .string()
  .transform((value) => value.toUpperCase())
  .refine(
    (value): value is (typeof AUTH_PROVIDER_VALUES)[number] =>
      (AUTH_PROVIDER_VALUES as string[]).includes(value),
    { message: "Unsupported auth provider" },
  );

/**
 * Info: (20260809 - Luphia) 發起授權：前端只需告知要導回自家的哪一個 callback 頁。
 * redirectUri 必須是本站絕對網址，由 Service 層對照白名單，避免 open redirect。
 */
export const oauthStartSchema = z.object({
  redirectUri: z.string().url(),
  // Info: (20260809 - Luphia) 登入成功後要回到的站內路徑，僅允許以 / 開頭的相對路徑
  returnTo: z.string().startsWith("/").max(512).optional(),
});

// Info: (20260809 - Luphia) 授權碼換 DeWT：state 由 provider 回傳，stateToken 是我方簽發的簽章憑證
export const oauthCallbackSchema = z.object({
  provider: authProviderSchema,
  code: z.string().min(1),
  state: z.string().min(1),
  stateToken: z.string().min(1),
});

// Info: (20260809 - Luphia) 已登入使用者把第三方帳號綁到既有（passkey）帳號
export const oauthLinkSchema = oauthCallbackSchema;

export const oauthUnlinkSchema = z.object({
  provider: authProviderSchema,
});

export type IOAuthStartInput = z.infer<typeof oauthStartSchema>;
export type IOAuthCallbackInput = z.infer<typeof oauthCallbackSchema>;
export type IOAuthUnlinkInput = z.infer<typeof oauthUnlinkSchema>;
