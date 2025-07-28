import { NextApiHandler } from 'next';
// Info: (20250703 - Shirley) Supertest is test library and not a dependency of the project
// eslint-disable-next-line import/no-extraneous-dependencies
import request from 'supertest';

export interface TestClientOptions {
  handler: NextApiHandler;
  routeParams?: Record<string, string>;
  queryParams?: Record<string, string | string[]>;
}

export type TestClient = ReturnType<typeof request>;
