export interface IJwt {
  header: Record<string, string>;
  payload: Record<string, string>;
  signature: string;
}
