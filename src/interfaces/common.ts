// Info Murky (20240505): type guards can input any type and return a boolean
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isStringNumber(value: any): value is string {
  return typeof value === 'string' && !Number.isNaN(Number(value));
}

// is {[key: string]: number}
export function isStringNumberPair(value: unknown): value is { [key: string]: string } {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return Object.values(value).every((v) => typeof v === 'number');
}
