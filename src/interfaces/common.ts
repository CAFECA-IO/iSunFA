// Info Murky (20240505): type guards can input any type and return a boolean
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isStringNumber(value: any): value is string {
  return typeof value === 'string' && !Number.isNaN(Number(value));
}
