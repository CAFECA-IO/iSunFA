/**
 * Info: (20261015 - Luphia) 讀出 LanceDB 資料表 `vector` 欄位的維度。純函數。
 *
 * 向量欄位是 Arrow 的 FixedSizeList，維度在 `type.listSize`。這裡只靠結構判斷、不引入
 * apache-arrow 的型別：讀不到（欄位不存在或不是定長串列）就回 null，由呼叫端決定怎麼處理。
 */
export const LANCE_VECTOR_COLUMN = "vector";

export function vectorDimensionOf(schema: {
  fields: readonly { name: string; type: unknown }[];
}): number | null {
  const field = schema.fields.find((f) => f.name === LANCE_VECTOR_COLUMN);
  if (!field || typeof field.type !== "object" || field.type === null) {
    return null;
  }
  const listSize: unknown = Reflect.get(field.type, "listSize");
  return typeof listSize === "number" && Number.isInteger(listSize)
    ? listSize
    : null;
}
