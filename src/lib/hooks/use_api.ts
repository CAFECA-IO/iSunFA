import { useEffect, useState, useCallback } from 'react';
import { IAPIConfig, IAPIInput, IAPIResponse } from '@/interfaces/api_connection';
import { IResponseData } from '@/interfaces/response_data';
import { HttpMethod } from '@/constants/api_connection';
import { ErrorMessage, STATUS_CODE } from '@/constants/status_code';

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
};

function getAPIPath(apiConfig: IAPIConfig, input: IAPIInput) {
  const originalPath = apiConfig.path;
  const path = originalPath.replace(/:([^/]+)/g, (match: string, key: string): string => {
    const value = input.params?.[key] as string;

    return value;
  });
  const queryString = input.query
    ? Object.keys(input.query)
        .map(
          (key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(input.query?.[key]))}`
        )
        .join('&')
    : '';
  const result = queryString ? `${path}?${queryString}` : path;

  return result;
}

export async function fetchData<Data>(
  apiConfig: IAPIConfig,
  options: IAPIInput,
  signal?: AbortSignal
): Promise<IResponseData<Data>> {
  const fetchOptions: RequestInit = {
    method: apiConfig.method,
    signal,
  };
  const path = getAPIPath(apiConfig, options);

  // Deprecated: debug log (20240510 - Tzuahan)
  // eslint-disable-next-line no-console
  console.log(`fetchData(${apiConfig.name}), path:`, path, `options:`, options, apiConfig);

  if (apiConfig.method !== HttpMethod.GET && options.body) {
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
  // Deprecated: debug log (20240510 - Tzuahan)
  // eslint-disable-next-line no-console
  console.log('fetchData, fetchOptions:', fetchOptions);

  const response = await fetch(path, fetchOptions);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const result = (await response.json()) as IResponseData<Data>;
  return result;
}

const useAPI = <Data>(
  apiConfig: IAPIConfig,
  options: IAPIInput,
  cancel?: boolean,
  triggerImmediately: boolean = true
): IAPIResponse<Data> => {
  const [success, setSuccess] = useState<boolean | undefined>(undefined);
  const [code, setCode] = useState<string | undefined>(undefined);
  const [data, setData] = useState<Data | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);

  const handleError = useCallback((e: Error) => {
    setError(e);
  }, []);

  const fetchDataCallback = useCallback(
    async (input?: IAPIInput, signal?: AbortSignal) => {
      setIsLoading(true);
      try {
        const response = await fetchData<Data>(
          apiConfig,
          {
            ...options,
            header: input?.header || options.header,
            params: input?.params || options.params,
            query: input?.query || options.query,
            body: input?.body || options.body,
          },
          signal
        );
        setCode(response.code);
        if (!response.success) {
          throw new Error(response.message ?? 'Unknown error');
        }
        setData(response.payload as Data);
        setSuccess(true);
      } catch (e) {
        handleError(e as Error);
        setSuccess(false);
        setCode(STATUS_CODE[ErrorMessage.INTERNAL_SERVICE_ERROR]);
      } finally {
        setIsLoading(false);
      }
    },
    [apiConfig.name, options, handleError]
  );

  useEffect(() => {
    const controller = new AbortController();

    if (triggerImmediately) {
      fetchDataCallback(undefined, cancel ? controller.signal : undefined);
    }

    return () => {
      controller.abort();
    };
  }, [apiConfig.name, cancel, triggerImmediately]);

  return {
    trigger: fetchDataCallback,
    success,
    code,
    isLoading,
    data,
    error,
  };
};

export default useAPI;
