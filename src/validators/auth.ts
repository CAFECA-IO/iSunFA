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
export const custodialSignSchema = z
  .object({
    challenge: z.string().min(1).max(512).optional(),
    challengeToken: z.string().min(1).optional(),
  })
  // Info: (20260811 - Luphia) strict：多送的欄位一律拒絕，讓「不再接受 userOp」是可驗證的，而不是被靜默忽略
  // Info: (20261015 - Luphia) 區塊鏈退役：orderId（付款 UserOp）模式已移除，送 orderId 會被 strict 拒絕
  .strict()
  .refine((value) => Boolean(value.challenge), {
    message: "challenge is required",
  });

/**
 * Info: (20260812 - Luphia) 託管帳號索取 PRF 替身秘密。
 *
 * 只收 `prfSalt`：使用者身分一律取自 DeWT，不接受呼叫端指定 —— 否則這支就變成
 * 「拿一枚 DeWT 換任意帳號的對話金鑰」。`strict()` 讓多送的欄位被拒絕而不是靜默忽略。
 */
export const custodialPrfSchema = z
  .object({
    /**
     * Info: (20260812 - Luphia) 32 bytes 的 base64 就是 44 字元（含一個 padding）。
     *
     * 原本只寫 `min(1).max(256)`。亂送不構成漏洞（不同 salt 得到不同秘密，
     * 而且必須與包裝時完全一致才解得開），但 custodial_signing 那邊已經為訂單
     * challenge 立了 43 字元 base64url 的門檻 —— 沿用同樣的嚴格度，
     * 讓「這個欄位應該長什麼樣」是程式碼而不是慣例（PR review P-6）。
     */
    prfSalt: z
      .string()
      .regex(/^[A-Za-z0-9+/]{43}=$/, "prfSalt must be 32 bytes in base64"),
  })
  .strict();

/**
 * Info: (20261015 - Luphia) Passkey 註冊請求（區塊鏈退役後由伺服器建帳）。
 *
 * `registration` 只驗外形（credential id、attestation 與 clientDataJSON 必須是字串），
 * 內容的真偽交給 `verifyRegistration`（簽章、origin、challenge）；這裡擋的是
 * 「欄位缺了就直接把 undefined 丟進驗證函式庫」那一類錯誤。
 * `name` 與 updateProfileSchema 同一個長度上限。
 */
export const passkeyRegistrationSchema = z
  .object({
    registration: z
      .object({
        id: z.string().min(1),
        rawId: z.string().min(1),
        type: z.literal("public-key"),
        response: z
          .object({
            attestationObject: z.string().min(1),
            clientDataJSON: z.string().min(1),
          })
          .passthrough(),
      })
      .passthrough(),
    challengeToken: z.string().min(1),
    name: z.string().trim().min(1).max(100),
  })
  .strict();

export type IPasskeyRegistrationBody = z.infer<
  typeof passkeyRegistrationSchema
>;
