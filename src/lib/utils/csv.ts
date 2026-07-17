/**
 * Info: (20260716 - Julian)
 * 通用單行 CSV 解析（RFC 4180 引號規則）：
 * 支援雙引號包夾含逗號/引號的欄位，`""` 表示跳脫的引號；每個欄位回傳前會 trim。
 * 供自訂圖表 DSL 與其他需要容錯 CSV 解析的場景重用。
 */
export const parseCsvLine = (line: string): string[] => {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
};
