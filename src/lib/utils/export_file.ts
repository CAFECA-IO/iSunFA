/**
 * Info: (20241108 - Shirley) Convert data to CSV format
 * @param fields - The fields to be converted
 * @param data - The data to be converted
 * @param fieldNameMap - The mapping of fields to header names in local language
 * @returns The CSV string
 */
export function convertToCSV<
  T extends Record<string, string | number | boolean | null | undefined>,
>(fields: (keyof T)[], data: T[], fieldNameMap?: Record<keyof T, string>): string {
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

/**
 * Info: (20241108 - Shirley) Select specific fields from the data
 * @param data - The data to be selected
 * @param fields - The fields to be selected
 * @returns The selected data
 */
export function selectFields<T>(data: T[], fields?: (keyof T)[]): T[] {
  if (!fields || fields.length === 0) return data;
  return data.map((item) => {
    const selected = {} as T;
    fields.forEach((field) => {
      selected[field] = item[field];
    });
    return selected;
  });
}
