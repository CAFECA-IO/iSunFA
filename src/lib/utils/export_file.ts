export function convertToCSV<
  T extends Record<string, string | number | boolean | null | undefined>,
>(fields: (keyof T)[], data: T[]): string {
  const header = fields.join(',') + '\n';
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
