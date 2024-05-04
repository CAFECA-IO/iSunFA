import { useEffect, useState } from 'react';
import APIName from '@/enums/api_name';
import { HttpMethod } from '@/enums/http_method';
import { Response } from '@/interfaces/response';
import API_CONFIG from '@/constants/api_config';

async function fetchData<Data>(
  path: string,
  method: HttpMethod,
  body?: Record<string, string | number | Record<string, string | number>>,
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
  apiName: APIName,
  params?: Record<string, string | number> | null,
  query?: Record<string, string | number> | null,
  body?: Record<string, string | number | Record<string, string | number>> | null,
  cancel?: boolean
): Response<Data> => {
  const [data, setData] = useState<Data | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [message, setMessage] = useState<string | undefined>(undefined);

  const apiConfig = API_CONFIG[apiName];
  if (!apiConfig) {
    throw new Error(`API configuration not found for ${apiName}`);
  }
  const { pathConstructor, method, checkParams, checkBody } = apiConfig;

  if (params && checkParams) {
    checkParams(params);
  }
  if (body && checkBody) {
    checkBody(body);
  }
  const queryString = query
    ? Object.keys(query)
        .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(query[key]))}`)
        .join('&')
    : '';
  const path = `${pathConstructor(params)}${queryString}`;

  const handleError = (e: Error) => {
    setError(e);
    setMessage(e.message || 'An error occurred');
  };

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
  }, [apiName, params, query, body, cancel]);

  return {
    isLoading,
    data,
    message,
    error,
  };
};

export default useAPI;
