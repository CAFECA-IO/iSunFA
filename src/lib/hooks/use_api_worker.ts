/* eslint-disable no-console */
import { IAPIInput } from '@/interfaces/api_connection';
import { Action } from '@/constants/action';
import { Response } from '@/interfaces/response';
import { useCallback, useEffect, useRef, useState } from 'react';
import { APIConfig, APIName } from '@/constants/api_connection';
import { checkInput, getAPIPath } from '../utils/common';

interface ResponseData<Data> {
  data?: Data;
  error?: Error | undefined;
}

const useAPIWorker = <Data>(
  apiName: APIName,
  options: IAPIInput,
  cancel?: boolean,
  triggerImmediately: boolean = true
): Response<Data> => {
  const [success, setSuccess] = useState<boolean | undefined>(undefined);
  const [data, setData] = useState<Data | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);
  const requestIdRef = useRef<string | undefined>(undefined);
  const controllerRef = useRef<AbortController | null>(null);

  const apiConfig = APIConfig[apiName];
  checkInput(apiConfig, options);

  const path = getAPIPath(apiConfig, options);

  const handleResponse = (responseData: ResponseData<Data>, requestId: string) => {
    const { data: newData, error: workerError } = responseData;

    if (requestId !== requestIdRef.current) return;
    if (workerError) {
      setError(workerError instanceof Error ? workerError : new Error(workerError));
      setSuccess(false);
    } else {
      setData(newData);
      setError(null);
      setSuccess(true);
    }
    setIsLoading(false);
  };

  const fetchData = useCallback(() => {
    console.log(
      `useAPIWorker fetchData is called, path`,
      path,
      `options`,
      options,
      `cancel`,
      cancel
    );
    const worker = new Worker(new URL('../workers/worker.ts', import.meta.url), {
      type: 'module',
    });
    const requestId = apiConfig.name;
    requestIdRef.current = requestId;

    setIsLoading(true);

    worker.postMessage({
      requestId,
      apiConfig,
      path,
      body: options.body,
      action: cancel ? Action.CANCEL : undefined,
    });

    const handleMessage = (event: MessageEvent) => {
      handleResponse(event.data, requestId);
    };

    worker.addEventListener(Action.MESSAGE, handleMessage);
    worker.onerror = (e: ErrorEvent) => {
      setError(e instanceof Error ? e : new Error('An error occurred'));
      setSuccess(false);
      setIsLoading(false);
    };

    // Info: Cleanup function (20240504 - tzuhan)
    return () => {
      worker.removeEventListener(Action.MESSAGE, handleMessage);
      worker.terminate();
    };
  }, []);

  useEffect(() => {
    if (controllerRef.current && cancel) {
      controllerRef.current.abort();
    }
    controllerRef.current = new AbortController();
    const cleanup = triggerImmediately ? fetchData() : () => {};
    return cleanup;
  }, [path, cancel, triggerImmediately]);

  return {
    trigger: fetchData,
    success,
    isLoading,
    data,
    error,
  };
};

export default useAPIWorker;
