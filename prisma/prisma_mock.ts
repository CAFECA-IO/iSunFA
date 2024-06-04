import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';

// import prisma from './client';

// jest.mock('./client', () => ({
//   __esModule: true,
//   default: mockDeep<PrismaClient>(),
// }));

// beforeEach(() => {
//   // Info: (20240524 Murky) prisma 官方推薦寫法 https://www.prisma.io/docs/orm/prisma-client/testing/unit-testing
//   // eslint-disable-next-line @typescript-eslint/no-use-before-define
//   mockReset(prismaMock);
// });
// export const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;
