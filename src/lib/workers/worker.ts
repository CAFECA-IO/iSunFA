import { IAPIConfig } from '@/interfaces/api_connection';

import { HttpMethod } from '@/constants/api_connection';
import { Action } from '@/constants/action';

interface FetchRequestData {
  requestId: string;
  apiConfig: IAPIConfig;
  path: string;
  body: Record<string, string | number | Record<string, string | number>> | null;
  action?: Action.CANCEL;
}

async function fetchData(
  apiConfig: IAPIConfig,
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

  const response = await fetch(path, fetchOptions);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

let activeRequest: string | null = null;
let controller: AbortController | null = null;

const handleRequest = async (
  requestId: string,
  apiConfig: IAPIConfig,
  path: string,
  body: Record<string, string | number | Record<string, string | number>> | null
) => {
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

// eslint-disable-next-line no-restricted-globals
self.onmessage = async (event: MessageEvent<FetchRequestData>) => {
  const { requestId, apiConfig, path, body, action } = event.data;

  if (action === Action.CANCEL) {
    if (activeRequest === requestId && controller) {
      controller.abort();
      controller = null;
      setTimeout(() => {
        // eslint-disable-next-line no-restricted-globals
        self.close();
      }, 1000);
    }
    return;
  }

  await handleRequest(requestId, apiConfig, path, body);
};

export {};
