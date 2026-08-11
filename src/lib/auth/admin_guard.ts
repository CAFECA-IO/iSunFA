import type { NextRequest } from "next/server";
import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { Role } from "@/constants/role";
import { IUser } from "@/interfaces/user";

/**
 * Info: (20260811 - Luphia) 管理端 route 的身分／角色守門。
 *
 * 架構規範明訂 route 只做「取身分 → 驗參數 → 呼叫 service → 回應」，不寫角色判斷。
 * 系統設定的四支端點原本各自 inline 一份 role 比對（其中一支還在 route 檔內自建
 * requireAdmin helper），四份重複實作、語意還不完全一致——這正是日後某一支被漏改
 * 而開出權限缺口的典型形狀。
 *
 * 這裡以 throw AppError 的形式回報，route 端沿用既有的 AppError → jsonFail 轉換。
 */

async function requireIdentity(request: NextRequest): Promise<IUser> {
  const user = await getIdentityFromDeWT(request.headers.get("Authorization"));
  if (!user) {
    throw new AppError(API_ERRORS.AUTH_INVALID_TOKEN);
  }
  return user;
}

// Info: (20260811 - Luphia) ADMIN 或 SUPER_ADMIN 皆可
export async function requireAdmin(request: NextRequest): Promise<IUser> {
  const user = await requireIdentity(request);

  if (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN) {
    throw new AppError(API_ERRORS.AUTH_ADMIN_REQUIRED);
  }
  return user;
}

/**
 * Info: (20260811 - Luphia) 僅 SUPER_ADMIN。
 * 系統設定的信任根是 SUPER_ADMIN 的 passkey，簽署權限不下放給 ADMIN。
 */
export async function requireSuperAdmin(request: NextRequest): Promise<IUser> {
  const user = await requireIdentity(request);

  if (user.role !== Role.SUPER_ADMIN) {
    throw new AppError(API_ERRORS.AUTH_SUPER_ADMIN_REQUIRED);
  }
  return user;
}
