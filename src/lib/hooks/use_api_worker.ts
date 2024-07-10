import { IAPIConfig, IAPIInput, IAPIResponse } from '@/interfaces/api_connection';
import { Action } from '@/constants/action';
import { useCallback, useEffect, useRef, useState } from 'react';
import { IResponseData } from '@/interfaces/response_data';
import { ErrorMessage, STATUS_CODE } from '@/constants/status_code';

const useAPIWorker = <Data>(
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
  const requestIdRef = useRef<string | undefined>(undefined);
  const controllerRef = useRef<AbortController | null>(null);

  const handleResponse = (response: { data: IResponseData<Data>; requestId: string }) => {
    const { data: responseData, requestId } = response;
    const { success: apiSuccess, payload, message, code: responseCode } = responseData;
    if (requestId !== requestIdRef.current) return;
    setCode(responseCode);
    if (!apiSuccess) {
      setError(new Error(message));
    } else {
      setData(payload as Data);
      setError(null);
    }
    setSuccess(apiSuccess);
    setIsLoading(false);
  };

  const trigger = useCallback(
    async (input?: IAPIInput): Promise<Data | undefined> => {
      return new Promise((resolve, reject) => {
        const worker = new Worker(new URL('../workers/worker.ts', import.meta.url), {
          type: 'module',
        });
        const requestId = apiConfig.name;
        requestIdRef.current = requestId;

        setIsLoading(true);
        setSuccess(undefined);
        setCode(undefined);
        setError(null);
        setData(undefined);

        worker.postMessage({
          apiConfig,
          options: {
            ...options,
            header: input?.header || options.header,
            params: input?.params || options.params,
            query: input?.query || options.query,
            body: input?.body || options.body,
          },
          action: cancel ? Action.CANCEL : undefined,
        });

        const handleMessage = (event: MessageEvent) => {
          handleResponse(event.data);
          resolve(event.data.data.payload as Data); // Resolve the promise with the data
          worker.removeEventListener(Action.MESSAGE, handleMessage);
          worker.terminate();
        };

        worker.addEventListener(Action.MESSAGE, handleMessage);
        worker.onerror = (e: ErrorEvent) => {
          setError(e instanceof Error ? e : new Error('An error occurred'));
          setCode(STATUS_CODE[ErrorMessage.INTERNAL_SERVICE_ERROR]);
          setSuccess(false);
          setIsLoading(false);
          reject(e); // Reject the promise with the error
          worker.terminate();
        };
      });
    },
    [apiConfig, options, cancel]
  );

  useEffect(() => {
    if (controllerRef.current && cancel) {
      controllerRef.current.abort();
    }
    controllerRef.current = new AbortController();
    const cleanup = triggerImmediately ? trigger() : () => {};
    return () => {
      if (typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, [apiConfig.name, options.params, cancel, triggerImmediately]);

  return {
    trigger,
    success,
    code,
    isLoading,
    data,
    error,
  };
};

export default useAPIWorker;
