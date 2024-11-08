export function convertToCSV<
  T extends Record<string, string | number | boolean | null | undefined>,
>(fields: (keyof T)[], data: T[], fieldNameMap?: Record<keyof T, string>): string {
  // 如果有提供 fieldNameMap，使用對應的中文名稱，否則使用原始欄位名稱
  const headerFields = fieldNameMap ? fields.map((field) => fieldNameMap[field]) : fields;

  const header = headerFields.join(',') + '\n';
  const rows = data
    .map((item) =>
      fields
        .map((field) => {
          const value = item[field];
          if (
            typeof value === 'string' &&
            (value.includes(',') || value.includes('\n') || value.includes('"'))
          ) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(',')
    )
    .join('\n');
  return header + rows;
}
