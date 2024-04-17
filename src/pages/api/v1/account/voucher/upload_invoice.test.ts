import { NextApiRequest, NextApiResponse } from 'next';
import handler from './upload_invoice';
import { isAccountInvoiceData } from '../../../../../interfaces/account';
// Mock the module and its function

// Cast to jest.Mock to inform TypeScript about the jest mocking properties

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;
jest.mock('../../../../../interfaces/account', () => {
  return {
    isAccountInvoiceData: jest.fn(),
  };
});
beforeEach(() => {
  req = {
    headers: {},
    body: {},
    query: {},
    method: 'POST',
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

describe('Invoice Upload API Handler Tests', () => {
  it('should return 200 and success message for valid invoices', async () => {
    (isAccountInvoiceData as unknown as jest.Mock).mockReturnValue(true);
    req.body.invoices = [{ id: 'inv123', amount: 1000 }];
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'success',
      data: {
        resultId: '1229001',
        status: 'success',
      },
    });
  });

  it('should return 400 for invalid invoices', async () => {
    (isAccountInvoiceData as unknown as jest.Mock).mockReturnValue(false);
    req.body.invoices = [{ id: 'inv123', amount: null }];
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'error',
      errorReason: 'Invalid invoices',
    });
  });

  // Additional tests can be added here
  it('should return 405 for invalid method', async () => {
    req.method = 'PUT';
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({
      message: 'error',
      errorReason: 'Method Not Allowed',
    });
  });
});
