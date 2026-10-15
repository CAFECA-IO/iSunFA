import { z } from "zod";

/**
 * Info: (20261015 - Luphia) POST /api/v1/user/order/[order_id]/point_payment 的 body。
 *
 * passkey 帳號必須附 `fido2Signature`（條款 §3.3：扣除需經帳戶憑證簽章確認），
 * 形狀與用優惠券相同：USER_ACTION 用途的 challengeToken + 對它的 assertion。
 * 託管帳號原本就由伺服器代簽，不需要附——是否必填由 service 依帳號型別判斷，
 * 因此這裡是 optional。assertion 的結構交由 fido2 驗章把關。
 */
export const pointPaymentSchema = z.object({
  fido2Signature: z
    .object({
      authentication: z.record(z.string(), z.unknown()),
      challengeToken: z.string().min(1),
    })
    .optional(),
});

export type IPointPaymentInput = z.infer<typeof pointPaymentSchema>;
