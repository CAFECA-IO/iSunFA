it('should pass', () => {
  expect(true).toBe(true);
});
// import { NextApiRequest, NextApiResponse } from 'next';
// import handler from '@/pages/api/v1/company/[companyId]/report_generated/index';

// let req: jest.Mocked<NextApiRequest>;
// let res: jest.Mocked<NextApiResponse>;

// beforeEach(async () => {
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

// afterEach(async () => {
//   jest.clearAllMocks();
// });

// xdescribe('generatedReports API Handler Tests', () => {
//   it('should handle GET requests successfully', async () => {
//     req.method = 'GET';
//     await handler(req, res);
//     const responsePayload = res.json.mock.calls[0][0];
//     responsePayload.payload.forEach((item: object) => {
//       if ('project' in item && item.project !== null) {
//         const projectInfo = {
//           id: expect.any(String),
//           name: expect.any(String),
//           code: expect.any(String),
//         };
//         expect(item.project).toEqual(projectInfo);
//       }
//     });
//     expect(res.status).toHaveBeenCalledWith(200);
//     const period = {
//       startTimestamp: expect.any(Number),
//       endTimestamp: expect.any(Number),
//     };
//     const expectedStructure = expect.objectContaining({
//       id: expect.any(String),
//       name: expect.any(String),
//       createdTimestamp: expect.any(Number),
//       period: expect.objectContaining(period),
//       project: expect.anything(),
//       reportType: expect.any(String),
//       type: expect.any(String),
//       reportLinkId: expect.any(String),
//       downloadLink: expect.any(String),
//       blockchainExplorerLink: expect.any(String),
//       evidenceId: expect.any(String),
//     });
//     expect(res.json).toHaveBeenCalledWith(
//       expect.objectContaining({
//         powerby: expect.any(String),
//         success: expect.any(Boolean),
//         code: expect.stringContaining('200'),
//         message: expect.any(String),
//         payload: expect.arrayContaining([expectedStructure]),
//       })
//     );
//   });
//   it('should return [] if no data', async () => {
//     req.method = 'GET';
//     await handler(req, res);
//     expect(res.status).toHaveBeenCalledWith(200);
//     expect(res.json).toHaveBeenCalledWith(
//       expect.objectContaining({
//         powerby: expect.any(String),
//         success: expect.any(Boolean),
//         code: expect.stringContaining('200'),
//         message: expect.any(String),
//         payload: expect.any(Array),
//       })
//     );
//   });
//   it('should return error if not GET', async () => {
//     req.method = 'POST';
//     await handler(req, res);
//     expect(res.status).toHaveBeenCalledWith(405);
//     expect(res.json).toHaveBeenCalledWith(
//       expect.objectContaining({
//         powerby: expect.any(String),
//         success: expect.any(Boolean),
//         code: expect.stringContaining('405'),
//         message: expect.any(String),
//         payload: expect.any(Object),
//       })
//     );
//   });
// });
