export function isParamOrQueryString(data: string | string[] | undefined): data is string {
  return typeof data === 'string';
}

export function isParamOrQueryNumericString(data: string | string[] | undefined): data is string {
    return isParamOrQueryString(data) && !Number.isNaN(Number(data));
}
