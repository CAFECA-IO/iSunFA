import { z } from "zod";
import { INVITE_TOKEN_HEX_LENGTH } from "@/lib/team/invite_token";

/**
 * Info: (20260818 - Luphia) 邀請 token 的請求本文（PR #6652 第三輪 D）。
 *
 * token 從 URL path 移到 POST body，理由見 `buildInviteUrl`：
 * path 會進 access log、瀏覽器歷史與 `Referer`，body 不會。
 *
 * 長度與字元集在此就擋掉：token 是固定長度的 hex，
 * 不合格的輸入沒有必要往下走到雜湊與資料庫查詢。
 */
export const inviteTokenBodySchema = z.object({
  token: z
    .string()
    .length(INVITE_TOKEN_HEX_LENGTH)
    .regex(/^[0-9a-f]+$/, "token must be lowercase hex"),
});

export type IInviteTokenBody = z.infer<typeof inviteTokenBodySchema>;
