/**
 * Info: (20260821 - Julian) 假 prisma 的 `where` 比對器 —— **兩支測試共用一份**
 * （review 第 8 輪第 4 條）。
 *
 * ## 為什麼要抽出來
 *
 * `overtime_revoke_approval.test.ts` 的替身裡有六支方法**完全不看 `where`**
 * （`overtimeSegment.deleteMany`、`leaveCashOutEvent.deleteMany` / `count`、
 * `leaveLedgerEntry.count` 等），於是兩個方向都測不出來：
 *
 * - **放寬**：`where: {}` 也照樣刪，等於跨租戶把整張表清空。
 * - **收緊**：漏掉過濾條件，整個帳本任何一筆 `CONSUME` 都會讓所有撤銷永久失敗。
 *
 * 兩者在那個替身裡塌成同一個值。而同 PR 的 `reachability` 那支雖然有嚴格的
 * 比對器，它的 fixture 在撤銷那一刻只有一張單持有分段 —— 「刪全表」與
 * 「刪這一張」結果相同（checklist §1.4）。
 *
 * ## 為什麼放在 `src/lib/testing` 而不是 `src/__tests__`
 *
 * `next/jest` 的預設 `testMatch` 收 `**\/__tests__\/**\/*.[jt]s?(x)` ——
 * 放進去的話這個檔案本身會被當成一個「沒有任何測試」的 suite 而紅。
 *
 * ## 它刻意**不是**一個通用的 Prisma where 解譯器
 *
 * 只實作被測查詢真的用到的運算子，其餘一律丟。一個「幾乎完整」的替身會讓人
 * 以為沒被測到的條件也被測到了；而遇到不認得的鍵就丟，代表替身跟不上被測查詢
 * 的那一天，紅的是替身而不是斷言。
 */

export type IFakeWhere = Record<string, unknown>;

/**
 * Info: (20260821 - Julian) 依**兩邊的實際型別**選比較方式，型別不同就丟。
 *
 * 先前 `lt` / `gt` 走 `Number(actual)` 而 `gte` / `lte` 走原生字串比較 ——
 * 不對稱的兩組。後果是 `id: { lt: ... }`（字串）永遠不命中：
 * `Number("ot-a")` 是 `NaN`，而 `NaN < NaN` 恆為 false。
 * 一個會把字串悄悄轉成 `NaN` 的替身，錯的方向是「安靜地不命中」。
 */
export const compareValues = (actual: unknown, value: unknown): number => {
  if (typeof actual === "number" && typeof value === "number") {
    return actual === value ? 0 : actual < value ? -1 : 1;
  }
  if (typeof actual === "string" && typeof value === "string") {
    return actual === value ? 0 : actual < value ? -1 : 1;
  }
  throw new Error(
    `替身不比較這組型別：${typeof actual} 對 ${typeof value}（值 ${String(actual)} / ${String(value)}）`,
  );
};

export const matchesField = (actual: unknown, clause: unknown): boolean => {
  if (clause === null || typeof clause !== "object") return actual === clause;

  for (const [op, value] of Object.entries(clause as IFakeWhere)) {
    switch (op) {
      case "lt":
        if (!(compareValues(actual, value) < 0)) return false;
        break;
      case "gt":
        if (!(compareValues(actual, value) > 0)) return false;
        break;
      case "gte":
        if (compareValues(actual, value) < 0) return false;
        break;
      case "lte":
        if (compareValues(actual, value) > 0) return false;
        break;
      case "not":
        // Info: (20260821 - Julian) `{ not: null }` 是「非 null」，不能走值相等那條路
        if (value === null ? actual === null : actual === value) return false;
        break;
      case "in":
        if (!(value as unknown[]).includes(actual)) return false;
        break;
      default:
        throw new Error(`替身不支援這個運算子：${op}`);
    }
  }
  return true;
};

/**
 * Info: (20260821 - Julian) 逐鍵分派；不認得的鍵**丟**，不是安靜略過。
 *
 * 第一版是一連串 `if (where.X !== undefined)`，於是沒被列到的鍵會被安靜略過 ——
 * 而那正是「替身跟不上被測查詢」時最難查的形狀：查詢加了一個條件，替身當它
 * 不存在，測試照樣綠。
 *
 * `fields` 是這張表**允許被查**的欄位；空的 `where: {}` 因此命中每一列，
 * 那是 Prisma 的語意，替身不該偷偷收緊它 —— 呼叫端要靠斷言擋住「忘了帶 where」。
 */
export const matchesRow = (
  row: Record<string, unknown>,
  where: IFakeWhere,
  fields: readonly string[],
): boolean => {
  for (const [key, clause] of Object.entries(where)) {
    if (key === "OR") {
      if (!(clause as IFakeWhere[]).some((one) => matchesRow(row, one, fields)))
        return false;
      continue;
    }
    if (key === "AND") {
      if (
        !(clause as IFakeWhere[]).every((one) => matchesRow(row, one, fields))
      )
        return false;
      continue;
    }
    if (!fields.includes(key)) {
      throw new Error(`替身不支援這個條件鍵：${key}`);
    }
    if (!matchesField(row[key], clause)) return false;
  }
  return true;
};

/**
 * Info: (20260821 - Julian) `orderBy` 也要真的排。
 *
 * 照插入順序回傳的替身會讓「回起點最早的那一張」由 fixture 的排列決定 ——
 * 測試綠燈，而 `orderBy` 是死的裝飾。
 */
export const sortRows = <T extends Record<string, unknown>>(
  rows: T[],
  orderBy: Record<string, string> | undefined,
  fields: readonly string[],
): T[] => {
  if (orderBy === undefined) return rows;
  const [[field, direction]] = Object.entries(orderBy);
  if (!fields.includes(field)) {
    throw new Error(`替身不支援這個排序鍵：${field}`);
  }
  if (direction !== "asc" && direction !== "desc") {
    throw new Error(`替身不支援這個排序方向：${direction}`);
  }
  return [...rows].sort((left, right) => {
    const cmp = compareValues(left[field], right[field]);
    return direction === "asc" ? cmp : -cmp;
  });
};
