import { APIData } from '@/constants/api_config';
import { Response } from '@/interfaces/response';
import { useCallback, useEffect, useRef } from 'react';
import useStateRef from 'react-usestateref';

const useAPIWorker = <Data>(
  apiConfig: APIData,
  path: string,
  body: Record<string, string | number | Record<string, string | number>> | null,
  cancel?: boolean
): Response<Data> => {
  const [data, setData, dataRef] = useStateRef<Data | undefined>(undefined);
  const [isLoading, setIsLoading, isLoadingRef] = useStateRef<boolean>(true);
  const [error, setError, errorRef] = useStateRef<Error | null>(null);
  const [message, setMessage, messageRef] = useStateRef<string | undefined>(undefined);
  const requestIdRef = useRef<string | undefined>(undefined);

  const fetchData = useCallback(() => {
    const worker = new Worker(new URL('../../public/worker.ts', import.meta.url), {
      type: 'module',
    });
    requestIdRef.current = apiConfig.name;

    setIsLoading(true);

    worker.postMessage({
      requestId: requestIdRef.current,
      apiConfig,
      path,
      body,
      action: cancel ? 'cancel' : undefined,
    });

    const handleMessage = (event: MessageEvent) => {
      const { data: newData, error: workerError, requestId } = event.data;

      if (requestId !== requestIdRef.current) return;
      if (workerError) {
        setError(new Error(workerError));
        setError(workerError instanceof Error ? workerError : new Error('An error occurred'));
        setMessage(errorRef.current?.message || 'An error occurred');
      } else {
        setData(newData);
        setError(null);
        setMessage('Request was cancelled');
      }
      setIsLoading(false);
    };

    worker.addEventListener('message', handleMessage);
    worker.onerror = (e: ErrorEvent) => {
      setError(e instanceof Error ? e : new Error('An error occurred'));
      setMessage(errorRef.current?.message || 'An error occurred');
      setIsLoading(false);
    };
  }, []);

  useEffect(() => {
    return fetchData();
  }, [fetchData]);

  return {
    isLoading: isLoadingRef.current || isLoading,
    data: dataRef.current || data,
    message: messageRef.current || message,
    error: errorRef.current || error,
  };
};

export default useAPIWorker;
