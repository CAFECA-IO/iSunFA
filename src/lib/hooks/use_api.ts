/* eslint-disable no-console */
import { useEffect, useState, useCallback } from 'react';
import { IAPIInput, IAPIResponse, IHttpMethod } from '@/interfaces/api_connection';
import { IResponseData } from '@/interfaces/response_data';
import { HttpMethod } from '@/constants/api_connection';

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
};

export async function fetchData<Data>(
  path: string,
  method: IHttpMethod,
  options: IAPIInput,
  signal?: AbortSignal
): Promise<IResponseData<Data>> {
  const fetchOptions: RequestInit = {
    method,
    signal,
  };

  console.log('fetchData, path:', path, `options:`, options);

  if (method !== HttpMethod.GET && options.body) {
    if (options.body instanceof FormData) {
      fetchOptions.body = options.body;
    } else {
      fetchOptions.body = JSON.stringify(options.body);
      fetchOptions.headers = {
        ...DEFAULT_HEADERS,
        ...(options.header || {}),
      };
    }
  }

  console.log('fetchData, fetchOptions:', fetchOptions);

  const response = await fetch(path, fetchOptions);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const result = (await response.json()) as IResponseData<Data>;
  return result;
}

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
        const response = await fetchData<Data>(path, method, options, signal);
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
