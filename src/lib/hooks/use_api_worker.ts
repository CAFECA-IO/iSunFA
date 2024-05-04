import { APIData } from '@/constants/api_config';
import { Action } from '@/enums/action';
import { Response } from '@/interfaces/response';
import { useCallback, useEffect, useRef, useState } from 'react';

interface ResponseData<Data> {
  data?: Data;
  error?: Error | undefined;
}

const useAPIWorker = <Data>(
  apiConfig: APIData,
  path: string,
  body: Record<string, unknown> | null,
  cancel?: boolean
): Response<Data> => {
  const [data, setData] = useState<Data | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [message, setMessage] = useState<string | undefined>(undefined);
  const requestIdRef = useRef<string | undefined>(undefined);
  const controllerRef = useRef<AbortController | null>(null);

  const handleResponse = (responseData: ResponseData<Data>, requestId: string) => {
    const { data: newData, error: workerError } = responseData;

    if (requestId !== requestIdRef.current) return;
    if (workerError) {
      setError(workerError instanceof Error ? workerError : new Error(workerError));
      setMessage(workerError instanceof Error ? workerError.message : 'An error occurred');
    } else {
      setData(newData);
      setError(null);
      setMessage('Request was successful');
    }
    setIsLoading(false);
  };

  const fetchData = useCallback(() => {
    const worker = new Worker(new URL('../../public/worker.ts', import.meta.url), {
      type: 'module',
    });
    const requestId = apiConfig.name;
    requestIdRef.current = requestId;

    setIsLoading(true);

    worker.postMessage({
      requestId,
      apiConfig,
      path,
      body,
      action: cancel ? Action.CANCEL : undefined,
    });

    const handleMessage = (event: MessageEvent) => {
      handleResponse(event.data, requestId);
    };

    worker.addEventListener(Action.MESSAGE, handleMessage);
    worker.onerror = (e: ErrorEvent) => {
      setError(e instanceof Error ? e : new Error('An error occurred'));
      setMessage(e instanceof Error ? e.message : 'An error occurred');
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

    return fetchData();
  }, [fetchData]);

  return {
    isLoading,
    data,
    message,
    error,
  };
};

export default useAPIWorker;
