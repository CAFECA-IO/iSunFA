/* eslint-disable no-console */
import { useEffect, useState, useCallback } from 'react';

import { IAPIInput, IHttpMethod } from '@/interfaces/api_connection';
import { Response } from '@/interfaces/response';

import { APIConfig, APIName, HttpMethod } from '@/constants/api_connection';
import { checkInput, getAPIPath } from '../utils/common';

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
};

async function fetchData<Data>(
  path: string,
  method: IHttpMethod,
  options: IAPIInput,
  signal?: AbortSignal
): Promise<Data> {
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

  const response = await fetch(path, fetchOptions);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

const useAPI = <Data>(apiName: APIName, options: IAPIInput, cancel?: boolean): Response<Data> => {
  const [data, setData] = useState<Data | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [message, setMessage] = useState<string | undefined>(undefined);

  const apiConfig = APIConfig[apiName];
  console.log('useAPI is called, apiConfig', apiConfig, `options`, options, `cancel`, cancel);
  checkInput(apiConfig, options);

  const path = getAPIPath(apiConfig, options);
  console.log('useAPI path', path);

  const handleError = (e: Error) => {
    setError(e);
    setMessage(e.message || 'An error occurred');
  };

  const fetchDataCallback = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetchData<Data>(path, apiConfig.method, options);
      setData(response);
      setMessage('Request was successful');
    } catch (e) {
      handleError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, [apiConfig.method, options, path]);

  console.log(
    'useAPI is called, apiConfig',
    apiConfig,
    `path`,
    path,
    `options`,
    options,
    `cancel`,
    cancel
  );

  useEffect(() => {
    if (!cancel) {
      fetchDataCallback();
    }
  }, [fetchDataCallback, cancel]);

  return {
    isLoading,
    data,
    message,
    error,
  };
};

export default useAPI;
