import z from "zod";
import { jsonValueSchema } from "@/validators/common";
import { userOperationJsonSchema } from "@/validators/erc4337";

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  photo: z.string().optional(),

  // Info: (20251128 - Tzuhan) 新增 SCW 相關欄位驗證，允許透過 PATCH 更新
  blockchainAddress: z.string().startsWith("0x").length(42).optional(),
  initPublicKey: jsonValueSchema.optional(), // Info: (20251224 - Tzuhan) { x: string, y: string }
  deploymentSalt: z.string().optional(),
  newAuthenticator: z
    .object({
      credentialID: z.string(),
      credentialPublicKey: z.string(),
      counter: z
        .number()
        .or(z.string())
        .transform((val) => Number(val)),
      algorithm: z.enum(["ES256", "RS256", "EdDSA"]).default("ES256"),
      userHandle: z.string().optional(),
      label: z.string().optional(),
    })
    .optional(),
});

/**
 * Info: (20260810 - Luphia) 託管帳號代簽請求。
 * 兩種模式：直接給 challenge（需為本站發出過的值），或給一份 UserOp
 * 讓伺服器自行重算雜湊。兩者都不接受來源不明的任意雜湊。
 */
export const custodialSignSchema = z
  .object({
    challenge: z.string().min(1).max(512).optional(),
    challengeToken: z.string().min(1).optional(),
    userOp: userOperationJsonSchema.optional(),
  })
  .refine((value) => Boolean(value.challenge || value.userOp), {
    message: "Either challenge or userOp is required",
  });
