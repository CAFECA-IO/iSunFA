import { NextApiRequest, NextApiResponse } from 'next';
import version from '@/lib/version';
import handler from './preview'; // Ensure this path matches the actual file location

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;

beforeEach(() => {
  req = {
    headers: {},
    body: null,
    query: {},
    method: '',
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiRequest>;

  res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiResponse>;
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('API Handler Tests', () => {
  it('should return 400 if resultId is invalid', async () => {
    req.query.resultId = ['123']; // Invalid resultId as an array
    req.method = 'GET';

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      powerby: `ISunFa api ${version}`,
      success: false,
      code: '400',
      message: 'Invalid resultId',
    });
  });

  it('should handle successful GET requests', async () => {
    const resultId = 'valid_id';
    req.query.resultId = resultId;
    req.method = 'GET';

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    // expect(res.json).toHaveBeenCalledWith({
    //   powerby: `ISunFa api ${version}`,
    //   success: false,
    //   code: '200',
    //   message: `Voucher preview creating process of id:${resultId} return successfully`,
    //   payload: {
    //     date: '2024-12-29',
    //     vouchIndex: '1229001',
    //     type: 'Receiving',
    //     from_or_to: 'Isuncloud Limited',
    //     description: '技術開發軟件與服務',
    //     lineItem: [
    //       {
    //         lineItemIndex: '1229001001',
    //         account: '銀行存款',
    //         description: '港幣120000 * 3.916',
    //         debit: true,
    //         amount: 469920,
    //       },
    //       {
    //         lineItemIndex: '1229001002',
    //         account: '營業收入',
    //         description: '港幣120000 * 3.916',
    //         debit: false,
    //         amount: 469920,
    //       },
    //     ],
    //   },
    // });
  });

  it('should return 405 for unsupported methods', async () => {
    req.query.resultId = '123';
    req.method = 'POST'; // Unsupported method

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({
      powerby: `ISunFa api ${version}`,
      success: false,
      code: '405',
      message: 'Method Not Allowed in voucher preview api',
    });
  });
});
