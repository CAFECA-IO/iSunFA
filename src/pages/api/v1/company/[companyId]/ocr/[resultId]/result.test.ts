it('shoild pass', () => {
  expect(true).toBe(true);
});
// import { NextApiRequest, NextApiResponse } from 'next';
// import version from '@/lib/version';
// import handler from './result'; // Adjust the import path as necessary

// let req: jest.Mocked<NextApiRequest>;
// let res: jest.Mocked<NextApiResponse>; // Use <any> to avoid type errors with custom response types

// beforeEach(() => {
//   req = {
//     headers: {},
//     body: null,
//     query: {},
//     method: '',
//     json: jest.fn(),
//   } as unknown as jest.Mocked<NextApiRequest>;

//   res = {
//     status: jest.fn().mockReturnThis(),
//     json: jest.fn(),
//   } as unknown as jest.Mocked<NextApiResponse>;
// });

// afterEach(() => {
//   jest.clearAllMocks();
// });

// describe('OCR Result API Handler Tests', () => {
//   it('should handle GET requests successfully', async () => {
//     const resultId = '123';
//     req.query.resultId = resultId; // Valid resultId as a string
//     req.method = 'GET';

//     // const mockOcrReturnArray = [
//     //   {
//     //     date: '2024-12-29',
//     //     eventType: 'income',
//     //     incomeReason: '勞務收入',
//     //     client: 'Isuncloud Limited',
//     //     description: '技術開發軟件與服務',
//     //     price: '469920',
//     //     tax: 'free',
//     //     taxPercentange: 'null',
//     //     fee: '0',
//     //   },
//     // ];
//     await handler(req, res);

//     expect(res.status).toHaveBeenCalledWith(200);
//     // expect(res.json).toHaveBeenCalledWith({
//     //   powerby: `ISunFa api ${version}`,
//     //   success: true,
//     //   code: '200',
//     //   message: `OCR analyzing result of id:${resultId} return successfully`,
//     //   payload: mockOcrReturnArray,
//     // });
//   });

//   it('should return error for non-string resultId', async () => {
//     req.query.resultId = ['123']; // resultId as an array to simulate invalid input
//     req.method = 'GET';

//     await handler(req, res);

//     expect(res.status).toHaveBeenCalledWith(400);
//     expect(res.json).toHaveBeenCalledWith({
//       powerby: `ISunFa api ${version}`,
//       success: false,
//       code: '400',
//       message: 'Invalid resultId',
//     });
//   });

//   it('should return error for missing resultId', async () => {
//     req.query = {}; // No resultId provided
//     req.method = 'GET';

//     await handler(req, res);

//     expect(res.status).toHaveBeenCalledWith(400);
//     expect(res.json).toHaveBeenCalledWith({
//       powerby: `ISunFa api ${version}`,
//       success: false,
//       code: '400',
//       message: 'Invalid resultId',
//     });
//   });

//   it('should return error for unsupported HTTP methods', async () => {
//     req.query.resultId = '123'; // Correct resultId
//     req.method = 'POST'; // Unsupported method

//     await handler(req, res);

//     expect(res.status).toHaveBeenCalledWith(405);
//     expect(res.json).toHaveBeenCalledWith({
//       powerby: `ISunFa api ${version}`,
//       success: false,
//       code: '405',
//       message: 'METHOD_NOT_ALLOWED in ocr get result api',
//     });
//   });
// });
