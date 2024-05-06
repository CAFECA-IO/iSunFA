export interface Response<Data> {
  success: boolean | undefined;
  trigger: () => void;
  isLoading: boolean | undefined;
  data: Data | undefined;
  error: Error | null;
}
