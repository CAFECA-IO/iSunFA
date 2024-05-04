import { APIData } from '@/constants/api_config';
import { HttpMethod } from '@/enums/http_method';

interface FetchRequestData {
  requestId: string;
  apiConfig: APIData;
  path: string;
  body: Record<string, string | number | Record<string, string | number>> | null;
  action?: 'cancel';
}

async function fetchData(
  apiConfig: APIData,
  path: string,
  body: Record<string, string | number | Record<string, string | number>> | null,
  signal: AbortSignal
): Promise<unknown> {
  const { method } = apiConfig;
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

  return fetch(path, fetchOptions).then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  });
}

let activeRequest: string | null = null;
let controller: AbortController | null = null;

// eslint-disable-next-line no-restricted-globals
self.onmessage = async (event: MessageEvent<FetchRequestData>) => {
  const { requestId, apiConfig, path, body, action } = event.data;

  if (action === 'cancel') {
    if (activeRequest === requestId) {
      if (controller) {
        controller.abort();
        controller = null;
        setTimeout(() => {
          // eslint-disable-next-line no-restricted-globals
          self.close();
        }, 1000);
      }
    }
    return;
  }

  if (controller) {
    controller.abort();
  }
  controller = new AbortController();
  activeRequest = requestId;

  try {
    const data = await fetchData(apiConfig, path, body, controller.signal);
    if (activeRequest !== requestId) {
      return;
    }
    postMessage({ data, requestId });
  } catch (error) {
    if (activeRequest !== requestId) {
      return;
    }
    postMessage({ error: error instanceof Error ? error.message : 'Unknown error', requestId });
  }
};

export {};
