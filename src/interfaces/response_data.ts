export interface IResponseData<T> {
  powerby: string;
  success: boolean;
  code: string;
  message: string;
  payload: T | object;
}
