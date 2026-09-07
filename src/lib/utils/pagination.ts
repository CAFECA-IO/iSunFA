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

/**
 * Info: (20260815 - Luphia) 選填版：未提供或格式不合法時回 `undefined`（PR #6652 第二輪 C-8）。
 *
 * 有些端點的分頁預設值在下游的 service 裡，因此參數本身是可選的
 * （`searchParams.get("page") ? parseInt(...) : undefined`）。
 * 那個寫法的問題只在「有值但不是數字」——`parseInt("abc")` 回 NaN 並一路傳到 Prisma。
 * 回 `undefined` 讓下游套用它自己的預設值，行為與「沒帶這個參數」一致。
 *
 * 刻意不設上限：這些端點的頁面大小由下游決定，在這裡夾一個數字會悄悄改變
 * 既有呼叫端拿得到的筆數。這支函式只負責「不要讓 NaN 流出去」。
 */
export function parseOptionalPositiveInt(
  raw: string | null | undefined,
  options: { min?: number; max?: number } = {},
): number | undefined {
  if (raw === null || raw === undefined) return undefined;
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return undefined;

  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return undefined;

  const { min, max } = options;
  if (typeof min === "number" && parsed < min) return min;
  if (typeof max === "number" && parsed > max) return max;
  return parsed;
}
