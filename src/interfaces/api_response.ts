// Info: Murky (20240418) T is a placeholder for the actual data type
export interface ResponseType<T> {
  powerby: string;
  success: boolean;
  code: string;
  message: string;
  payload?: T;
}
