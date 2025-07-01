// Info: (20240701 - Shirley) Supertest wrapper for Next.js API handlers
import { createServer, RequestListener } from 'http';
import { NextApiHandler } from 'next';
import { apiResolver } from 'next/dist/server/api-utils/node/api-resolver';
import request from 'supertest';

// Info: (20240701 - Shirley) Create a supertest client for testing Next.js API routes
export const createTestClient = (handler: NextApiHandler) => {
  const listener: RequestListener = (req, res) => {
    return apiResolver(
      req,
      res,
      req.query,
      handler,
      {
        previewModeEncryptionKey: '',
        previewModeId: '',
        previewModeSigningKey: '',
      },
      false
    );
  };
  return request(createServer(listener));
};

// Info: (20240701 - Shirley) Create a specialized client for dynamic routes like [email]
export const createDynamicTestClient = (
  handler: NextApiHandler,
  routeParams: Record<string, string>
) => {
  const listener: RequestListener = (req, res) => {
    // Info: (20240701 - Shirley) Parse the URL to extract path and query
    const url = new URL(req.url || '/', 'http://localhost');

    // Info: (20240701 - Shirley) Initialize query object if not exists
    if (!req.query) {
      req.query = {};
    }

    // Info: (20240701 - Shirley) Add URL query parameters to req.query
    for (const [key, value] of url.searchParams.entries()) {
      req.query[key] = value;
    }

    // Info: (20240701 - Shirley) Add dynamic route parameters to query
    Object.assign(req.query, routeParams);

    // Info: (20240701 - Shirley) Add required headers for testing
    if (!req.headers) {
      req.headers = {};
    }

    // Info: (20240701 - Shirley) Set default headers for testing
    req.headers['user-agent'] = req.headers['user-agent'] || 'supertest-agent';
    req.headers['x-forwarded-for'] = req.headers['x-forwarded-for'] || '127.0.0.1';
    req.headers['x-real-ip'] = req.headers['x-real-ip'] || '127.0.0.1';

    return apiResolver(
      req,
      res,
      req.query,
      handler,
      {
        previewModeEncryptionKey: '',
        previewModeId: '',
        previewModeSigningKey: '',
      },
      false
    );
  };
  return request(createServer(listener));
};

// Info: (20240701 - Shirley) Helper type for test client instance
export type TestClient = ReturnType<typeof createTestClient>;
