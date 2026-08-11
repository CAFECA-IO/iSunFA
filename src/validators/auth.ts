import z from "zod";
import { jsonValueSchema } from "@/validators/common";

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
 * Info: (20260811 - Luphia) 託管帳號代簽請求。
 *
 * 兩種模式：直接給 challenge（需為本站發出過的值），或給 orderId 讓伺服器自己組
 * 付款 UserOp。**刻意不接受呼叫端傳入的 UserOp**——只驗 sender 的話，callData 仍由
 * 呼叫端決定，那就是一支任意動作簽章預言機（見 custodial_wallet.service）。
 */
/**
 * Info: (20260812 - Luphia) 託管帳號索取 PRF 替身秘密。
 *
 * 只收 `prfSalt`：使用者身分一律取自 DeWT，不接受呼叫端指定 —— 否則這支就變成
 * 「拿一枚 DeWT 換任意帳號的對話金鑰」。`strict()` 讓多送的欄位被拒絕而不是靜默忽略。
 */
export const custodialPrfSchema = z
  .object({
    // Info: (20260812 - Luphia) base64 的 32 bytes salt；長度上限留餘裕，內容不入判斷邏輯
    prfSalt: z.string().min(1).max(256),
  })
  .strict();

export const custodialSignSchema = z
  .object({
    challenge: z.string().min(1).max(512).optional(),
    challengeToken: z.string().min(1).optional(),
    orderId: z.string().uuid().optional(),
  })
  // Info: (20260811 - Luphia) strict：多送的欄位一律拒絕，讓「不再接受 userOp」是可驗證的，而不是被靜默忽略
  .strict()
  .refine((value) => Boolean(value.challenge || value.orderId), {
    message: "Either challenge or orderId is required",
  });
