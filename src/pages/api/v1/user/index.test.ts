// import { NextApiRequest, NextApiResponse } from 'next';
// import handler from './index';

// let req: jest.Mocked<NextApiRequest>;
// let res: jest.Mocked<NextApiResponse>;

// beforeEach(() => {
//   req = {
//     headers: {},
//     body: null,
//     query: {},
//     method: 'GET',
//     json: jest.fn(),
//   } as unknown as jest.Mocked<NextApiRequest>;

//   res = {
//     status: jest.fn().mockReturnThis(),
//     json: jest.fn(),
//   } as unknown as jest.Mocked<NextApiResponse>;
// });

describe('test user API', () => {
  // it('should list all users', async () => {
  //   await handler(req, res);
  //   expect(res.status).toHaveBeenCalledWith(200);
  //   expect(res.json).toHaveBeenCalledWith(
  //     expect.objectContaining({
  //       powerby: expect.any(String),
  //       success: expect.any(Boolean),
  //       code: expect.stringContaining('200'),
  //       message: expect.any(String),
  //       payload: expect.arrayContaining([
  //         expect.objectContaining({
  //           id: expect.any(String),
  //           name: expect.any(String),
  //           credentialId: expect.any(String),
  //           publicKey: expect.any(String),
  //           algorithm: expect.any(String),
  //         }),
  //       ]),
  //     })
  //   );
  // });

  // it('should create a new user', async () => {
  //   req.method = 'POST';
  //   req.body = { name: 'Jane' };
  //   await handler(req, res);
  //   expect(res.status).toHaveBeenCalledWith(201);
  //   expect(res.json).toHaveBeenCalledWith(
  //     expect.objectContaining({
  //       powerby: expect.any(String),
  //       success: expect.any(Boolean),
  //       code: expect.stringContaining('201'),
  //       message: expect.any(String),
  //       payload: expect.objectContaining({
  //         id: expect.any(String),
  //         name: expect.any(String),
  //         fullName: expect.any(String),
  //         email: expect.any(String),
  //         phone: expect.any(String),
  //         kycStatus: expect.any(String),
  //         credentialId: expect.any(String),
  //         publicKey: expect.any(String),
  //         algorithm: expect.any(String),
  //       }),
  //     })
  //   );
  // });

  // it('should handle unsupported HTTP methods', async () => {
  //   req.method = 'PUT';
  //   await handler(req, res);
  //   expect(res.status).toHaveBeenCalledWith(405);
  //   expect(res.json).toHaveBeenCalledWith(
  //     expect.objectContaining({
  //       powerby: expect.any(String),
  //       success: expect.any(Boolean),
  //       code: expect.stringContaining('405'),
  //       message: expect.any(String),
  //       payload: expect.any(Object),
  //     })
  //   );
  // });
  it('should list all users', async () => {});
});
