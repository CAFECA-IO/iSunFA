/**
 * Info: (20260811 - Luphia) challengeToken 的用途分類。
 *
 * 原本的 challengeToken payload 只有 `{ challenge }`：不綁使用者、不綁用途。
 * 於是「一枚有效的 challengeToken ＋ 一份對它的簽章」可以授權**任何**需要簽章的操作——
 * 拿去用優惠券、拿去發點數、拿去改系統設定都成立。加上託管代簽之後，
 * 攻擊者只要拿到某個託管管理員的 session 就能索取簽章並橫向套用到最高權限操作。
 *
 * 因此 token 現在同時承諾「給誰」（sub）與「能做什麼」（purpose），
 * 驗證端必須指名自己預期的 purpose，對不上一律拒絕。
 */
export enum ChallengePurpose {
  // Info: (20260811 - Luphia) 尚未登入時取得的探索式登入 nonce，唯一不綁 sub 的用途
  LOGIN = "LOGIN",
  // Info: (20260811 - Luphia) 已登入使用者對自己資源的操作（用優惠券、付款…）
  USER_ACTION = "USER_ACTION",
  // Info: (20260811 - Luphia) 管理員操作，權限最高，且明確禁止託管代簽
  ADMIN_ACTION = "ADMIN_ACTION",
}

export const CHALLENGE_PURPOSE_VALUES = Object.values(ChallengePurpose);

export function isChallengePurpose(value: unknown): value is ChallengePurpose {
  return (
    typeof value === "string" &&
    (CHALLENGE_PURPOSE_VALUES as string[]).includes(value)
  );
}
