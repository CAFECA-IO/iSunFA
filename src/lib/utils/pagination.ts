/**
 * Info: (20260815 - Luphia) 分頁參數的解析（PR #6652 第二輪 C-8）。
 *
 * `parseInt(searchParams.get("limit") ?? "20", 10)` 對 `?limit=abc` 會回 `NaN`，
 * 而 `Math.max(NaN, 1)` 仍是 `NaN`——最後 `take: NaN` 交給 Prisma 就是一個 500。
 * 使用者打錯一個字元不該讓端點爆炸；解析不出來就退回預設值。
 *
 * 收斂成共用函式而不是每支端點各寫一次：這個形狀在後台端點裡重複了六次，
 * 而每一次都是同樣的陷阱。
 */

export interface IPositiveIntOptions {
  fallback: number;
  min?: number;
  max?: number;
}

/**
 * Info: (20260815 - Luphia) 解析查詢字串裡的正整數，夾在 [min, max] 之間。
 *
 * 只接受純數字：`"12abc"` 會被 `parseInt` 讀成 12，而那多半代表呼叫端搞錯了格式，
 * 悄悄採用一半的值比退回預設值更難查。
 */
export function parsePositiveInt(
  raw: string | null | undefined,
  options: IPositiveIntOptions,
): number {
  const { fallback, min = 1, max = Number.MAX_SAFE_INTEGER } = options;
  const clamp = (value: number) => Math.min(Math.max(value, min), max);

  if (raw === null || raw === undefined) return clamp(fallback);
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return clamp(fallback);

  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return clamp(fallback);
  return clamp(parsed);
}
