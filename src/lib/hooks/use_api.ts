import { useEffect, useState, useCallback } from 'react';
import { IAPIConfig, IAPIInput, IAPIResponse } from '@/interfaces/api_connection';
import { IResponseData } from '@/interfaces/response_data';
import { HttpMethod } from '@/constants/api_connection';
import { STATUS_MESSAGE, STATUS_CODE } from '@/constants/status_code';

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
        .filter((key) => input.query?.[key] !== undefined)
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

  if (apiConfig.method !== HttpMethod.GET) {
    if (options.body) {
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
  } else {
    fetchOptions.headers = {
      ...DEFAULT_HEADERS,
      ...(options.header || {}),
    };
  }

  const response = await fetch(path, fetchOptions);
  const result = (await response.json()) as IResponseData<Data>;

  return result;
}

const useAPI = <Data>(
  apiConfig: IAPIConfig,
  options: IAPIInput,
  triggerImmediately: boolean = false,
  cancel?: boolean,
): IAPIResponse<Data> => {
  const [success, setSuccess] = useState<boolean | undefined>(undefined);
  const [code, setCode] = useState<string | undefined>(undefined);
  const [data, setData] = useState<Data | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);

  const handleError = useCallback((e: Error) => {
    setError(e);
  }, []);

  const trigger = useCallback(
    async (
      input?: IAPIInput,
      signal?: AbortSignal
    ): Promise<{
      success: boolean;
      data: Data | null;
      code: string;
      error: Error | null;
    }> => {
      setIsLoading(true);
      setSuccess(undefined);
      setCode(undefined);
      setError(null);
      setData(undefined);
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
        setData(response.payload as Data);
        setSuccess(response.success);

        if (!response.success) {
          const apiError = new Error(
            response.message || STATUS_MESSAGE.MISSING_ERROR_FROM_BACKEND_API
          ); // Info: 實際上這裡應該要顯示從後端 API response 的錯誤訊息 (20240716 - Shirley)
          setError(apiError);
          return {
            success: false,
            data: null,
            code: response.code,
            error: apiError,
          };
        }

        return {
          success: response.success,
          data: response.payload as Data,
          code: response.code,
          error: null,
        };
      } catch (e) {
        handleError(e as Error);
        setSuccess(false);
        setCode(STATUS_CODE[STATUS_MESSAGE.INTERNAL_SERVICE_ERROR]);
        return {
          success: false,
          data: null,
          code: STATUS_CODE[STATUS_MESSAGE.INTERNAL_SERVICE_ERROR],
          error: e as Error,
        };
      } finally {
        setIsLoading(false);
      }
    },
    [apiConfig, options, handleError]
  );

  useEffect(() => {
    const controller = new AbortController();

    if (triggerImmediately) {
      trigger(undefined, cancel ? controller.signal : undefined);
    }

    return () => {
      controller.abort();
    };
  }, [apiConfig.name, cancel, triggerImmediately]);

  return {
    trigger,
    success,
    code,
    isLoading,
    data,
    error,
  };
};

export default useAPI;
