// hooks/useAPIResponse.ts

import APIName from '@/enums/api_name';
import API_CONFIG from '@/constants/api_config';
import { useEffect } from 'react';
import useAPIWorker from './use_api_worker';

type Response = {
  success: boolean;
  isLoading: boolean;
  payload: unknown;
  code: string;
  message: string;
};

const useAPIResponse = (
  apiName: APIName,
  params?: Record<string, string> | null,
  body?: Record<string, unknown> | null
): Response => {
  let payload = null;
  let isLoading = false;
  let error: Error | null = null;
  const apiConfig = API_CONFIG[apiName];
  if (!apiConfig) {
    throw new Error(`API configuration not found for ${apiName}`);
  }

  const { path, method, checkParams, checkBody, useWorker } = apiConfig;

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  };

  useEffect(() => {
    const cleanupFunction = () => {};
    const pathWithParams = Object.entries(params || {}).reduce(
      (acc, [key, val]) => acc.replace(new RegExp(`:${key}\\b`, 'g'), val.toString()),
      path as unknown as string
    );

    if (params && checkParams) {
      checkParams(params);
    }
    if (body && checkBody) {
      checkBody(body);
    }

    if (useWorker) {
      const { data: d, isLoading: loading, error: e } = useAPIWorker(pathWithParams, options);
      isLoading = loading;
      if (!loading && e) {
        error = e;
      }
      payload = d;
      // TODO: Implement the following block (20240503 - tzuhan)
    } else {
      isLoading = true;
      fetch(pathWithParams, options)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        // eslint-disable-next-line consistent-return
        .then((data) => {
          // TODO: Implement the following block (20240503 - tzuhan)
          if (data.success) {
            payload = data.payload;
          }
        })
        .catch((e) => {
          error = e;
        });
    }

    return cleanupFunction;
  }, [apiName, path, method, options, params, body]);

  return {
    success: true,
    payload,
    message: error ? (error as Error)?.message || JSON.stringify(error) : `Success for ${apiName}`,
    code: '000000',
    isLoading,
  };
};

export default useAPIResponse;
