import { IAPIInput, IAPIName, IAPIResponse, IHttpMethod } from '@/interfaces/api_connection';
import { Action } from '@/constants/action';
import { useCallback, useEffect, useRef, useState } from 'react';
import { IResponseData } from '@/interfaces/response_data';

const useAPIWorker = <Data>(
  apiName: IAPIName,
  method: IHttpMethod,
  path: string,
  options: IAPIInput,
  cancel?: boolean,
  triggerImmediately: boolean = true
): IAPIResponse<Data> => {
  const [success, setSuccess] = useState<boolean | undefined>(undefined);
  const [data, setData] = useState<Data | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);
  const requestIdRef = useRef<string | undefined>(undefined);
  const controllerRef = useRef<AbortController | null>(null);

  const handleResponse = (response: { data: IResponseData<Data>; requestId: string }) => {
    const { data: responseData, requestId } = response;
    const { success: apiSuccess, payload, message } = responseData;
    if (requestId !== requestIdRef.current) return;
    if (!apiSuccess) {
      setError(new Error(message));
    } else {
      setData(payload as Data);
      setError(null);
    }
    setSuccess(apiSuccess);
    setIsLoading(false);
  };

  const fetchData = useCallback(() => {
    const worker = new Worker(new URL('../workers/worker.ts', import.meta.url), {
      type: 'module',
    });
    const requestId = apiName;
    requestIdRef.current = requestId;

    setIsLoading(true);

    worker.postMessage({
      requestId,
      method,
      path,
      body: options.body,
      action: cancel ? Action.CANCEL : undefined,
    });

    const handleMessage = (event: MessageEvent) => {
      handleResponse(event.data);
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
