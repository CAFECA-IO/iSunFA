import { useEffect, useState } from 'react';

import { IAPIConfig, IHttpMethod } from '@/interfaces/api_connection';
import { Response } from '@/interfaces/response';

import { HttpMethod } from '@/constants/api_connection';

async function fetchData<Data>(
  path: string,
  method: IHttpMethod,
  body?: Record<string, unknown>,
  signal?: AbortSignal
): Promise<Data> {
  const fetchOptions: RequestInit = {
    method,
    signal,
  };

  if (method !== HttpMethod.GET && body) {
    fetchOptions.body = JSON.stringify(body);
    fetchOptions.headers = {
      'Content-Type': 'application/json',
    };
  }

  try {
    const response = await fetch(path, fetchOptions);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    throw new Error(`${error}`);
  }
}

const useAPI = <Data>(
  apiConfig: IAPIConfig,
  path: string,
  body: { [key: string]: unknown } | null,
  cancel?: boolean
): Response<Data> => {
  const [data, setData] = useState<Data | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [message, setMessage] = useState<string | undefined>(undefined);

  const handleError = (e: Error) => {
    setError(e);
    setMessage(e.message || 'An error occurred');
  };
  const { method } = apiConfig;

  useEffect(() => {
    let cleanupFunction = () => {};
    if (cancel) {
      const controller = new AbortController();
      setIsLoading(true);

      fetchData<Data>(path, method, body || {}, controller.signal)
        .then((responseData) => {
          setData(responseData);
          setMessage('Request was cancelled');
        })
        .catch(handleError)
        .finally(() => {
          setIsLoading(false);
        });

      cleanupFunction = () => controller.abort();
    } else {
      setIsLoading(true);
      fetchData<Data>(path, method, body || {})
        .then((responseData) => {
          setData(responseData);
          setMessage('Request was successful');
        })
        .catch(handleError)
        .finally(() => {
          setIsLoading(false);
        });
    }
    return cleanupFunction;
  }, [apiConfig, path, body, cancel]);

  return {
    isLoading,
    data,
    message,
    error,
  };
};

export default useAPI;
