/* eslint-disable no-console */
import { useEffect, useState, useCallback } from 'react';

import { IAPIInput, IHttpMethod } from '@/interfaces/api_connection';
import { Response } from '@/interfaces/response';

import { APIConfig, APIName, HttpMethod } from '@/constants/api_connection';
import { IResponseData } from '@/interfaces/response_data';
import { checkInput, getAPIPath } from '../utils/common';

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
};

async function fetchData<Data>(
  path: string,
  method: IHttpMethod,
  options: IAPIInput,
  signal?: AbortSignal
): Promise<IResponseData<Data>> {
  console.log(`useAPI fetchData is called, path`, path, `options`, options, `signal`, signal);
  const fetchOptions: RequestInit = {
    method,
    signal,
  };

  if (method !== HttpMethod.GET && options.body) {
    fetchOptions.body = JSON.stringify(options.body);
    fetchOptions.headers = {
      ...DEFAULT_HEADERS,
      ...(options.header ?? {}),
    };
  }

  console.log(`fetchData fetchOptions`, fetchOptions);
  const response = await fetch(path, fetchOptions);
  console.log(`fetchData response`, response);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const result = (await response.json()) as IResponseData<Data>;
  console.log(`fetchData result`, result);
  return result;
}

const useAPI = <Data>(
  apiName: APIName,
  options: IAPIInput,
  cancel?: boolean,
  triggerImmediately: boolean = true
): Response<Data> => {
  const [success, setSuccess] = useState<boolean | undefined>(undefined);
  const [data, setData] = useState<Data | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);

  const apiConfig = APIConfig[apiName];
  checkInput(apiConfig, options);

  const path = getAPIPath(apiConfig, options);

  const handleError = useCallback((e: Error) => {
    setError(e);
  }, []);

  const fetchDataCallback = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      try {
        const response = await fetchData<Data>(path, apiConfig.method, options, signal);
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
    [apiConfig.method, options, path, handleError]
  );

  useEffect(() => {
    const controller = new AbortController();

    if (triggerImmediately) {
      fetchDataCallback(cancel ? controller.signal : undefined);
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
