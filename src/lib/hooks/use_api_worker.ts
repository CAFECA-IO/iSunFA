import { useEffect, useState } from 'react';

type FetcherResponse<Data> = {
  data: Data | null;
  isLoading: boolean;
  error: Error | null;
};

const useAPIWorker = <Data>(path: string, options: RequestInit): FetcherResponse<Data> => {
  const [data, setData] = useState<Data | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(path, options);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const responseData: Data = await response.json();
        setData(responseData);
      } catch (e) {
        setError(e as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [path, options]);

  return { data, isLoading, error };
};

export default useAPIWorker;
