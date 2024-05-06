export interface Response<Data> {
  isLoading: boolean;
  data: Data | undefined;
  message: string | undefined;
  error: Error | null;
}
