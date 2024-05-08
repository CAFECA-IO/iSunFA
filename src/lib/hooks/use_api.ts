import { useEffect, useState, useCallback } from 'react';
import { IAPIInput, IAPIResponse, IHttpMethod } from '@/interfaces/api_connection';
import { fetchData } from '../workers/worker';

const useAPI = <Data>(
  method: IHttpMethod,
  path: string,
  options: IAPIInput,
  cancel?: boolean,
  triggerImmediately: boolean = true
): IAPIResponse<Data> => {
  const [success, setSuccess] = useState<boolean | undefined>(undefined);
  const [data, setData] = useState<Data | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);

  const handleError = useCallback((e: Error) => {
    setError(e);
  }, []);

  const fetchDataCallback = useCallback(
    async (body?: { [key: string]: unknown } | FormData, signal?: AbortSignal) => {
      setIsLoading(true);
      try {
        const response = await fetchData<Data>(
          path,
          method,
          {
            ...options,
            body: body || options.body,
          },
          signal
        );
        if (!response.success) {
          throw new Error(response.message ?? 'Unknown error');
        }
        setData(response.payload as Data);
        setSuccess(true);
      } catch (e) {
        handleError(e as Error);
        setSuccess(false);
      } finally {
        setIsLoading(false);
      }
    },
    [method, options, path, handleError]
  );

  useEffect(() => {
    const controller = new AbortController();

    if (triggerImmediately) {
      fetchDataCallback(undefined, cancel ? controller.signal : undefined);
    }

    return () => {
      controller.abort();
    };
  }, [path, cancel, triggerImmediately]);

  return {
    trigger: fetchDataCallback,
    success,
    isLoading,
    data,
    error,
  };
};

export default useAPI;
