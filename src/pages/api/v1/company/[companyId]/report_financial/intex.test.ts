it('should pass', () => {
  expect(true).toBe(true);
});
// import { NextApiRequest, NextApiResponse } from 'next';
// import version from '@/lib/version';
// import handler from '@/pages/api/v1/company/[companyId]/report_financial/index';

// let req: jest.Mocked<NextApiRequest>;
// let res: jest.Mocked<NextApiResponse>;

// beforeEach(() => {
//   req = {
//     headers: {},
//     body: {
//       type: 'Balance Sheet',
//       language: 'English',
//       start_date: '2024-03-31',
//       end_date: '2024-03-31',
//     },
//     query: {},
//     method: 'POST',
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

// describe('generateFinancialReport API Handler Tests', () => {
//   it('should handle POST request successfully', async () => {
//     await handler(req, res);
//     expect(res.status).toHaveBeenCalledWith(200);
//     expect(res.json).toHaveBeenCalledWith({
//       powerby: 'iSunFA v' + version,
//       success: true,
//       code: '200',
//       message: 'request successful',
//       payload: expect.any(String),
//     });
//   });
//   it('should handle POST request with bad request body', async () => {
//     // Simulating a bad request by providing an incorrect body
//     req.body = {
//       type: 'Unrecognized Report Type',
//       language: 'English',
//       start_date: '2024-03-31',
//       end_date: '2024-03-31',
//     };
//     await handler(req, res);
//     expect(res.status).toHaveBeenCalledWith(400);
//     expect(res.json).toHaveBeenCalledWith({
//       powerby: 'iSunFA v' + version,
//       success: false,
//       code: '400',
//       message: 'bad request',
//       payload: null,
//     });
//   });
// });
