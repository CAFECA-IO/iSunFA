import { useCallback, useEffect } from 'react';
import useStateRef from 'react-usestateref';
import APIName from '@/enums/api_name';
import API_CONFIG from '@/constants/api_config';
import { HttpMethod } from '@/enums/http_method';
import { Response } from '@/interfaces/response';
import useAPIWorker from './use_api_worker';

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

function useAPIResponse<Data>(
  apiName: APIName,
  params?: Record<string, string | number> | null,
  query?: Record<string, string | number> | null,
  body?: Record<string, string | number | Record<string, string | number>> | null,
  cancel?: boolean
): Response<Data> {
  const [data, setData, dataRef] = useStateRef<Data | undefined>(undefined);
  const [isLoading, setIsLoading, isLoadingRef] = useStateRef<boolean>(true);
  const [error, setError, errorRef] = useStateRef<Error | null>(null);
  const [message, setMessage, messageRef] = useStateRef<string | undefined>(undefined);

  const apiConfig = API_CONFIG[apiName];
  if (!apiConfig) {
    throw new Error(`API configuration not found for ${apiName}`);
  }
  const { pathConstructor, method, checkParams, checkBody, useWorker } = apiConfig;

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

  const fetchDataCallback = useCallback(() => {
    let cleanupFunction = () => {};
    if (cancel) {
      const controller = new AbortController();
      setIsLoading(true);
      fetchData<Data>(path, method, body || {}, controller.signal)
        .then((responseData) => {
          setData(responseData);
          setError(null);
          setMessage('Request was cancelled');
        })
        .catch((e) => {
          setError(e instanceof Error ? e : new Error('An error occurred'));
          setMessage(errorRef.current?.message || 'An error occurred');
        })
        .finally(() => {
          setIsLoading(false);
        });

      cleanupFunction = () => controller.abort(); // Info: Cleanup function to abort fetch request (20240227 - Shirley)
    } else {
      setIsLoading(true);
      fetchData<Data>(path, method, body || {})
        .then((responseData) => {
          setData(responseData);
          setError(null);
          setMessage('Request was successful');
        })
        .catch((e) => {
          setError(e instanceof Error ? e : new Error('An error occurred'));
          setMessage(errorRef.current?.message || 'An error occurred');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
    return cleanupFunction;
  }, [cancel]);

  useEffect(() => {
    if (useWorker) {
      useAPIWorker(apiConfig, path, body || {}, cancel);
    } else {
      fetchDataCallback();
    }
  }, [fetchDataCallback]);

  return {
    isLoading: isLoadingRef.current || isLoading,
    data: dataRef.current || data,
    message: messageRef.current || message,
    error: errorRef.current || error,
  };
}

export default useAPIResponse;
