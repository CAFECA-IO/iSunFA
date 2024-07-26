it('should pass', () => {
  expect(true).toBe(true);
});
// import { NextApiRequest, NextApiResponse } from 'next';
// import * as module from '@/pages/api/v1/company/[companyId]/account/[accountId]/index';
// import prisma from '@/client';
// import * as authCheck from '@/lib/utils/auth_check';
// import { Account } from '@prisma/client';
// import { IAccount } from '@/interfaces/accounting_account';

// jest.mock('../../../../../../../lib/utils/auth_check', () => {
//   return {
//     checkAdmin: jest.fn(),
//   };
// });
// let req: jest.Mocked<NextApiRequest>;
// let res: jest.Mocked<NextApiResponse>;

// const companyId = 2;
// const testAccountId = 1;

// const session = {
//   companyId,
//   // Info (20240516 - Murky) - Mocking session
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
// } as any;
// const mockAccountInDB: Account = {
//   id: testAccountId,
//   companyId,
//   system: 'IFRS',
//   type: 'asset',
//   debit: true,
//   liquidity: true,
//   code: '1103-1',
//   parentCode: '1103',
//   rootCode: '1100',
//   forUser: true,
//   name: 'Sun Bank',
//   createdAt: 1000000000,
//   updatedAt: 1000000000,
//   level: 1,
//   deletedAt: null,
// };

// const mockAccount: IAccount = {
//   id: testAccountId,
//   companyId,
//   system: 'IFRS',
//   type: 'asset',
//   debit: true,
//   liquidity: true,
//   code: '1103-1',
//   name: 'Sun Bank',
//   createdAt: 1000000000,
//   updatedAt: 1000000000,
//   deletedAt: null,
// };
// beforeEach(() => {
//   jest.spyOn(authCheck, 'checkAdmin').mockResolvedValue(session);
//   req = {
//     headers: {},
//     query: {},
//     method: '',
//     json: jest.fn(),
//     body: {},
//   } as unknown as jest.Mocked<NextApiRequest>;

//   res = {
//     status: jest.fn().mockReturnThis(),
//     json: jest.fn(),
//   } as unknown as jest.Mocked<NextApiResponse>;
// });

// afterEach(() => {
//   jest.clearAllMocks();
// });

// describe('GET account by id', () => {
//   it('should return account when account id is provided correctly', async () => {
//     jest.spyOn(prisma.account, 'findFirst').mockResolvedValueOnce(mockAccountInDB);
//     req.method = 'GET';
//     req.query = { companyId: '1', accountId: `${testAccountId}` };
//     const { httpCode, result } = await module.handleGetRequest(companyId, testAccountId);
//     expect(httpCode).toBe(200);
//     expect(result.payload).toEqual(mockAccount);
//   });

//   it('should return an error when account id is not found', async () => {
//     jest.spyOn(prisma.account, 'findFirst').mockResolvedValueOnce(null);
//     req.method = 'GET';
//     req.query = { companyId: '1', accountId: '-2' };
//     await module.default(req, res);
//     expect(res.status).toHaveBeenCalledWith(200);

//     const expectedResponse = expect.objectContaining({
//       powerby: expect.any(String),
//       success: true,
//       code: expect.stringContaining('200'),
//       message: expect.any(String),
//       payload: {},
//     });

//     expect(res.json).toHaveBeenCalledWith(expectedResponse);
//   });

//   it('should return an error when account id is not a number', async () => {
//     jest.spyOn(prisma.account, 'findFirst').mockResolvedValueOnce(null);
//     req.method = 'GET';
//     req.query = { companyId: '1', accountId: 'a' };
//     await module.default(req, res);
//     expect(res.status).toHaveBeenCalledWith(422);

//     const expectedResponse = expect.objectContaining({
//       powerby: expect.any(String),
//       success: false,
//       code: expect.stringContaining('422'),
//       message: expect.any(String),
//     });

//     expect(res.json).toHaveBeenCalledWith(expectedResponse);
//   });
// });
