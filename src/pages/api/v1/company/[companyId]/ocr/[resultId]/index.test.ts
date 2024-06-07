import { NextApiResponse } from 'next';
import * as module from '@/pages/api/v1/company/[companyId]/ocr/[resultId]/index';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IInvoice } from '@/interfaces/invoice';
import { EventType, PaymentPeriodType, PaymentStatusType } from '@/constants/account';
import * as common from '@/lib/utils/common';

let res: jest.Mocked<NextApiResponse>;

global.fetch = jest.fn();

jest.mock('../../../../../../../lib/utils/common', () => ({
  ...jest.requireActual('../../../../../../../lib/utils/common'),
  formatApiResponse: jest.fn(),
}));

beforeEach(() => {
  res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiResponse>;
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('isResultIdValid', () => {
  it('should return true if resultId is valid', () => {
    const resultId = 'validResultId';
    const result = module.isResultIdValid(resultId);
    expect(result).toBe(true);
  });

  it('should return false if resultId is undefined', () => {
    const resultId = undefined;
    const result = module.isResultIdValid(resultId);
    expect(result).toBe(false);
  });

  it('should return false if resultId is an array', () => {
    const resultId = ['validResultId'];
    const result = module.isResultIdValid(resultId);
    expect(result).toBe(false);
  });
});

describe('fetchOCRResult', () => {
  it('should fetch OCR result with GET', async () => {
    const resultId = 'validResultId';
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({ payload: "testPayload" }),
    } as unknown as Response;

    global.fetch = jest.fn().mockResolvedValue(mockResponse);
    const result = await module.fetchOCRResult(resultId);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/api/v1/ocr/${resultId}/result`)
    );

    expect(result).toEqual({ payload: "testPayload" });
  });

  it('should throw an error if fetch fails', async () => {
    const resultId = 'validResultId';
    global.fetch = jest.fn().mockRejectedValue(new Error('Failed to fetch'));

    await expect(module.fetchOCRResult(resultId)).rejects.toThrow(STATUS_MESSAGE.BAD_GATEWAY_AICH_FAILED);
  });

  it('should throw an error if response is not ok', async () => {
    const resultId = 'validResultId';
    const response = {
      ok: false,
    } as unknown as Response;
    global.fetch = jest.fn().mockResolvedValue(response);

    await expect(module.fetchOCRResult(resultId)).rejects.toThrow(STATUS_MESSAGE.BAD_GATEWAY_AICH_FAILED);
  });
});

describe("getPayloadFromResponseJSON", () => {
  it("should return payload if responseJSON is valid", async () => {
    const responseJSON = Promise.resolve({ payload: "testPayload" });
    const result = await module.getPayloadFromResponseJSON(responseJSON);

    expect(result).toEqual("testPayload");
  });

  it("should throw an error if await responseJSON fails", async () => {
    const responseJSON = Promise.reject(new Error("Failed to get responseJSON"));

    await expect(module.getPayloadFromResponseJSON(responseJSON)).rejects.toThrow(STATUS_MESSAGE.PARSE_JSON_FAILED_ERROR);
  });
});

describe("setOCRResultJournalId", () => {
  it("should set journalId to the OCR result", () => {
    const ocrResult = {
      journalId: null,
    } as IInvoice;
    const journalId = 123;

    module.setOCRResultJournalId(ocrResult, journalId);

    expect(ocrResult?.journalId).toEqual(journalId);
  });
});

describe("formatOCRResultDate", () => {
  it("should format the date in OCR result", () => {
    const mockSeconds = 1620000000;
    const ocrResult = {
      date: mockSeconds * 1000,
    } as IInvoice;

    module.formatOCRResultDate(ocrResult);

    expect(ocrResult?.date).toEqual(mockSeconds);
  });

  it("should not format the date in OCR result if date is already in seconds", () => {
    const mockSeconds = 1620000000;
    const ocrResult = {
      date: mockSeconds,
    } as IInvoice;

    module.formatOCRResultDate(ocrResult);

    expect(ocrResult?.date).toEqual(mockSeconds);
  });
});

describe("handleGetRequest", () => {
  it("should handle GET request", async () => {
    const resultId = "validResultId";
    const mockInvoice: IInvoice = {
      journalId: null,
      date: 1620000000,
      eventType: EventType.INCOME,
      paymentReason: "testPaymentReason",
      description: "testDescription",
      vendorOrSupplier: "testVendorOrSupplier",
      projectId: null,
      project: null,
      contractId: null,
      contract: null,
      payment: {
        isRevenue: true,
        price: 1000,
        hasTax: true,
        taxPercentage: 5,
        hasFee: true,
        fee: 100,
        method: "testMethod",
        period: PaymentPeriodType.AT_ONCE,
        installmentPeriod: 1,
        alreadyPaid: 0,
        status: PaymentStatusType.PARTIAL,
        progress: 0,
      },
    };
    const mockPayload = { payload: mockInvoice };

    const mockFetchResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue(mockPayload),
    } as unknown as Response;

  const mockResult = {
      powerby: 'ISunFa',
      success: true,
      code: '201',
      message: 'Success',
      payload: mockInvoice,
    };
    const mockResponse = {
      httpCode: 200,
      result: mockResult,
    };
    global.fetch = jest.fn().mockResolvedValue(mockFetchResponse);
    jest.spyOn(common, "formatApiResponse").mockReturnValue(mockResponse);

    await module.handleGetRequest(resultId, res);

    expect(res.json).toHaveBeenCalledWith(mockResult);
  });
});
