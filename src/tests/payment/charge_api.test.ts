import { handlePostRequest } from '@/pages/api/v2/user/[userId]/payment_method/[paymentMethodId]/charge';
import { NextApiRequest } from 'next';
import { IPaymentInfo } from '@/interfaces/payment';
import { IUser } from '@/interfaces/user';
import { ITeamOrder } from '@/interfaces/order';
import { CurrencyType } from '@/constants/currency';
import { PAYMENT_METHOD_TYPE } from '@/constants/payment';
import { formatApiResponse } from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { TRANSACTION_STATUS } from '@/constants/transaction';
import { TPlanType } from '@/interfaces/subscription';
import {
  PaymentQuerySchema,
  PaymentBodySchema,
  getUserPaymentInfoById,
} from '@/lib/utils/repo/user_payment_info.repo';
import { getUserById } from '@/lib/utils/repo/user.repo';
import { transaction } from '@/lib/utils/repo/transaction';
import { generateTeamOrder } from '@/lib/utils/generator/team_order.generator';
import { createTeamOrder, updateTeamOrderStatus } from '@/lib/utils/repo/team_order.repo';
import { createPaymentGateway } from '@/lib/utils/payment/factory';
import { generateTeamPaymentTransaction } from '@/lib/utils/generator/team_payment_transaction.generator';
import { createTeamPaymentTransaction } from '@/lib/utils/repo/team_payment_transaction.repo';
import { generateTeamInvoice } from '@/lib/utils/generator/team_invoice.generator';
import { createTeamInvoice } from '@/lib/utils/repo/team_invoice.repo';
import { generateTeamSubscription } from '@/lib/utils/generator/team_subscription.generator';
import {
  createTeamSubscription,
  updateTeamSubscription,
} from '@/lib/utils/repo/team_subscription.repo';
import { generateTeamPayment } from '@/lib/utils/generator/team_payment.generator';
import { updateTeamPayment } from '@/lib/utils/repo/team_payment.repo';

// Info: (20250604 - Shirley) 模擬依賴
jest.mock('@/lib/utils/repo/user_payment_info.repo', () => ({
  PaymentQuerySchema: {
    parse: jest.fn(),
  },
  PaymentBodySchema: {
    parse: jest.fn(),
  },
  getUserPaymentInfoById: jest.fn(),
}));

jest.mock('@/lib/utils/repo/user.repo', () => ({
  getUserById: jest.fn(),
}));

jest.mock('@/lib/utils/repo/transaction', () => ({
  transaction: jest.fn(),
}));

jest.mock('@/lib/utils/generator/team_order.generator', () => ({
  generateTeamOrder: jest.fn(),
}));

jest.mock('@/lib/utils/repo/team_order.repo', () => ({
  createTeamOrder: jest.fn(),
  updateTeamOrderStatus: jest.fn(),
}));

jest.mock('@/lib/utils/payment/factory', () => ({
  createPaymentGateway: jest.fn(),
}));

jest.mock('@/lib/utils/generator/team_payment_transaction.generator', () => ({
  generateTeamPaymentTransaction: jest.fn(),
}));

jest.mock('@/lib/utils/repo/team_payment_transaction.repo', () => ({
  createTeamPaymentTransaction: jest.fn(),
}));

jest.mock('@/lib/utils/generator/team_invoice.generator', () => ({
  generateTeamInvoice: jest.fn(),
}));

jest.mock('@/lib/utils/repo/team_invoice.repo', () => ({
  createTeamInvoice: jest.fn(),
}));

jest.mock('@/lib/utils/generator/team_subscription.generator', () => ({
  generateTeamSubscription: jest.fn(),
}));

jest.mock('@/lib/utils/repo/team_subscription.repo', () => ({
  createTeamSubscription: jest.fn(),
  updateTeamSubscription: jest.fn(),
}));

jest.mock('@/lib/utils/generator/team_payment.generator', () => ({
  generateTeamPayment: jest.fn(),
}));

jest.mock('@/lib/utils/repo/team_payment.repo', () => ({
  updateTeamPayment: jest.fn(),
}));

jest.mock('@/lib/utils/common', () => ({
  formatApiResponse: jest.fn(),
}));

jest.mock('@/lib/utils/logger_back', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

const mockPaymentQuerySchema = jest.mocked(PaymentQuerySchema);
const mockPaymentBodySchema = jest.mocked(PaymentBodySchema);
const mockGetUserPaymentInfoById = jest.mocked(getUserPaymentInfoById);
const mockGetUserById = jest.mocked(getUserById);
const mockTransaction = jest.mocked(transaction);
const mockGenerateTeamOrder = jest.mocked(generateTeamOrder);
const mockCreateTeamOrder = jest.mocked(createTeamOrder);
const mockUpdateTeamOrderStatus = jest.mocked(updateTeamOrderStatus);
const mockCreatePaymentGateway = jest.mocked(createPaymentGateway);
const mockGenerateTeamPaymentTransaction = jest.mocked(generateTeamPaymentTransaction);
const mockCreateTeamPaymentTransaction = jest.mocked(createTeamPaymentTransaction);
const mockGenerateTeamInvoice = jest.mocked(generateTeamInvoice);
const mockCreateTeamInvoice = jest.mocked(createTeamInvoice);
const mockGenerateTeamSubscription = jest.mocked(generateTeamSubscription);
const mockCreateTeamSubscription = jest.mocked(createTeamSubscription);
const mockUpdateTeamSubscription = jest.mocked(updateTeamSubscription);
const mockGenerateTeamPayment = jest.mocked(generateTeamPayment);
const mockUpdateTeamPayment = jest.mocked(updateTeamPayment);
const mockFormatApiResponse = jest.mocked(formatApiResponse);

// ToDo: (20250612 - Shirley) Revise ineffective test cases
describe('Payment Charge API 測試', () => {
  const mockUserId = 123;
  const mockPaymentMethodId = 456;
  const mockTeamId = 789;
  const mockTeamPlanType = TPlanType.PROFESSIONAL;

  const mockRequest: Partial<NextApiRequest> = {
    query: {
      userId: mockUserId.toString(),
      paymentMethodId: mockPaymentMethodId.toString(),
    },
    body: {
      teamPlanType: mockTeamPlanType,
      teamId: mockTeamId,
    },
  };

  const mockPaymentInfo: IPaymentInfo = {
    id: mockPaymentMethodId,
    userId: mockUserId,
    token: 'test-payment-token',
    transactionId: 'txn-123',
    default: true,
    detail: {
      type: PAYMENT_METHOD_TYPE.VISA,
      number: '4111111111111111',
      expirationDate: '12/25',
      cvv: '123',
    },
    createdAt: 1640995200,
    updatedAt: 1640995200,
  };

  const mockUser: IUser = {
    id: mockUserId,
    name: 'Test User',
    email: 'test@example.com',
    imageId: '',
    agreementList: [],
    deletedAt: 0,
    createdAt: 1640995200,
    updatedAt: 1640995200,
  };

  const mockTeamOrder: ITeamOrder = {
    id: 111,
    teamId: mockTeamId,
    userId: mockUserId,
    status: TRANSACTION_STATUS.PENDING,
    amount: 1000,
    details: [],
    currency: CurrencyType.TWD,
    createdAt: 1640995200,
    updatedAt: 1640995200,
  };

  const mockPaymentGateway = {
    chargeWithToken: jest.fn(),
    getPlatform: jest.fn(() => 'OEN'),
    getCardBindingUrl: jest.fn(),
    getChargeUrl: jest.fn(),
    parseAuthorizationToken: jest.fn(),
  };

  const mockPaymentTransaction = {
    id: 222,
    teamOrderId: 111,
    userPaymentInfoId: mockPaymentMethodId,
    amount: 1000,
    currency: 'TWD',
    paymentGateway: 'OEN',
    paymentGetwayRecordId: 'gateway-record-123',
    status: TRANSACTION_STATUS.SUCCESS,
    createdAt: 1640995200,
    updatedAt: 1640995200,
  };

  const mockTeamInvoice = {
    id: 333,
    teamOrderId: 111,
    teamPaymentTransactionId: mockPaymentTransaction.id,
    invoiceCode: 'INV-123',
    price: 1000,
    tax: 50,
    total: 1050,
    currency: 'TWD',
    status: TRANSACTION_STATUS.SUCCESS,
    issuedAt: 1640995200,
    createdAt: 1640995200,
    updatedAt: 1640995200,
  };

  const mockTeamSubscription = {
    id: 444,
    userId: mockUserId,
    teamId: mockTeamId,
    planType: TPlanType.PROFESSIONAL,
    maxMembers: 10,
    startDate: 1640995200,
    expiredDate: 1643673600,
    createdAt: 1640995200,
    updatedAt: 1640995200,
  };

  const mockNewTeamSubscriptionData = {
    userId: mockUserId,
    teamId: mockTeamId,
    planType: TPlanType.PROFESSIONAL,
    maxMembers: 10,
    startDate: 1640995200,
    expiredDate: 1643673600,
    createdAt: 1640995200,
    updatedAt: 1640995200,
  };

  const mockTeamPayment = {
    id: 555,
    teamId: mockTeamId,
    userId: mockUserId,
    planType: TPlanType.PROFESSIONAL,
    createdAt: 1640995200,
    updatedAt: 1640995200,
    teamPlanType: mockTeamPlanType,
    autoRenewal: true,
    startDate: 1640995200,
    expiredDate: 1643673600,
    nextChargetDate: 1643673600,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockPaymentQuerySchema.parse.mockReturnValue({
      userId: mockUserId,
      paymentMethodId: mockPaymentMethodId,
    });

    mockPaymentBodySchema.parse.mockReturnValue({
      teamPlanType: mockTeamPlanType,
      teamId: mockTeamId,
    });

    mockFormatApiResponse.mockImplementation((message, data) => ({
      httpCode: message === STATUS_MESSAGE.SUCCESS ? 200 : 400,
      result: {
        powerby: 'iSunFA',
        success: message === STATUS_MESSAGE.SUCCESS,
        code: message,
        message,
        payload: data,
      },
    }));
  });

  describe('成功付費流程', () => {
    beforeEach(() => {
      mockGetUserPaymentInfoById.mockResolvedValue(mockPaymentInfo);
      // Deprecated: (20250604 - Luphia) remove eslint-disable
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockGetUserById.mockResolvedValue(mockUser as any);
      mockGenerateTeamOrder.mockResolvedValue(mockTeamOrder);
      mockCreateTeamOrder.mockResolvedValue(mockTeamOrder);
      // Deprecated: (20250604 - Luphia) remove eslint-disable
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockCreatePaymentGateway.mockReturnValue(mockPaymentGateway as any);
      mockPaymentGateway.chargeWithToken.mockResolvedValue('gateway-record-123');
      mockGenerateTeamPaymentTransaction.mockResolvedValue(mockPaymentTransaction);
      mockCreateTeamPaymentTransaction.mockResolvedValue(mockPaymentTransaction);
      mockGenerateTeamInvoice.mockResolvedValue(mockTeamInvoice);
      mockCreateTeamInvoice.mockResolvedValue(mockTeamInvoice);
      mockGenerateTeamSubscription.mockResolvedValue(mockNewTeamSubscriptionData);
      mockCreateTeamSubscription.mockResolvedValue(mockTeamSubscription);
      mockGenerateTeamPayment.mockResolvedValue(mockTeamPayment);
      mockUpdateTeamPayment.mockResolvedValue(mockTeamPayment);
      mockUpdateTeamOrderStatus.mockResolvedValue(mockTeamOrder);

      mockTransaction.mockImplementation(async (callback) => {
        // Deprecated: (20250604 - Luphia) remove eslint-disable
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await callback({} as any);
        return result;
      });
    });

    it('應該成功完成付費流程', async () => {
      const result = await handlePostRequest(mockRequest as NextApiRequest);

      expect(result.httpCode).toBe(200);
      expect(result.result.message).toBe(STATUS_MESSAGE.SUCCESS);
      expect(result.result.payload).toMatchObject({
        teamInvoice: mockTeamInvoice,
        teamSubscription: mockTeamSubscription,
      });

      expect(mockPaymentQuerySchema.parse).toHaveBeenCalledWith(mockRequest.query);
      expect(mockPaymentBodySchema.parse).toHaveBeenCalledWith(mockRequest.body);
      expect(mockGenerateTeamOrder).toHaveBeenCalledWith({
        userId: mockUserId,
        teamId: mockTeamId,
        teamPlanType: mockTeamPlanType,
        quantity: 1,
      });
      expect(mockCreateTeamOrder).toHaveBeenCalledWith(mockTeamOrder, {});
      expect(mockGetUserPaymentInfoById).toHaveBeenCalledWith(mockPaymentMethodId);
      expect(mockGetUserById).toHaveBeenCalledWith(mockUserId);
      expect(mockCreatePaymentGateway).toHaveBeenCalled();
      expect(mockPaymentGateway.chargeWithToken).toHaveBeenCalledWith({
        order: mockTeamOrder,
        user: mockUser,
        token: mockPaymentInfo.token,
      });
    });

    it('應該在付費成功時建立發票和訂閱', async () => {
      await handlePostRequest(mockRequest as NextApiRequest);

      expect(mockGenerateTeamInvoice).toHaveBeenCalledWith(
        mockTeamOrder,
        mockPaymentTransaction,
        mockUser
      );
      expect(mockCreateTeamInvoice).toHaveBeenCalledWith(mockTeamInvoice, {});

      expect(mockGenerateTeamSubscription).toHaveBeenCalledWith(
        mockUserId,
        mockTeamId,
        mockTeamPlanType,
        mockTeamOrder
      );
      expect(mockCreateTeamSubscription).toHaveBeenCalledWith(mockNewTeamSubscriptionData, {});
      expect(mockUpdateTeamSubscription).not.toHaveBeenCalled();

      expect(mockGenerateTeamPayment).toHaveBeenCalledWith(
        mockTeamOrder,
        mockPaymentInfo,
        mockTeamSubscription
      );
      expect(mockUpdateTeamPayment).toHaveBeenCalledWith(mockTeamPayment, {});
    });

    it('應該在既有訂閱時更新而非建立新訂閱', async () => {
      const existingSubscription = { ...mockTeamSubscription, id: 555 };
      mockGenerateTeamSubscription.mockResolvedValue(existingSubscription);
      mockUpdateTeamSubscription.mockResolvedValue(existingSubscription);

      await handlePostRequest(mockRequest as NextApiRequest);

      expect(mockUpdateTeamSubscription).toHaveBeenCalledWith(existingSubscription, {});
      expect(mockCreateTeamSubscription).not.toHaveBeenCalled();
    });
  });

  describe('付費失敗處理', () => {
    beforeEach(() => {
      mockGetUserPaymentInfoById.mockResolvedValue(mockPaymentInfo);
      // Deprecated: (20250604 - Luphia) remove eslint-disable
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockGetUserById.mockResolvedValue(mockUser as any);
      mockGenerateTeamOrder.mockResolvedValue(mockTeamOrder);
      mockCreateTeamOrder.mockResolvedValue(mockTeamOrder);
      // Deprecated: (20250604 - Luphia) remove eslint-disable
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockCreatePaymentGateway.mockReturnValue(mockPaymentGateway as any);

      mockTransaction.mockImplementation(async (callback) => {
        // Deprecated: (20250604 - Luphia) remove eslint-disable
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await callback({} as any);
        return result;
      });
    });

    it('應該在扣款失敗時返回付費失敗訊息', async () => {
      mockPaymentGateway.chargeWithToken.mockResolvedValue(undefined);

      const failedTransaction = {
        ...mockPaymentTransaction,
        status: TRANSACTION_STATUS.FAILED,
        paymentGetwayRecordId: undefined,
      };

      mockGenerateTeamPaymentTransaction.mockResolvedValue(failedTransaction);
      mockCreateTeamPaymentTransaction.mockResolvedValue(failedTransaction);

      const result = await handlePostRequest(mockRequest as NextApiRequest);

      expect(result.httpCode).toBe(400);
      expect(result.result.message).toBe(STATUS_MESSAGE.PAYMENT_FAILED_TO_COMPLETE);
      expect(result.result.payload).toEqual({});

      expect(mockGenerateTeamInvoice).not.toHaveBeenCalled();
      expect(mockCreateTeamInvoice).not.toHaveBeenCalled();
      expect(mockGenerateTeamSubscription).not.toHaveBeenCalled();
      expect(mockCreateTeamSubscription).not.toHaveBeenCalled();
    });

    it('應該在付費閘道錯誤時處理異常', async () => {
      mockPaymentGateway.chargeWithToken.mockRejectedValue(new Error('Gateway timeout'));

      const result = await handlePostRequest(mockRequest as NextApiRequest);

      expect(result.httpCode).toBe(400);
      expect(result.result.message).not.toBe(STATUS_MESSAGE.SUCCESS);
    });
  });

  describe('輸入驗證', () => {
    it('應該驗證無效的用戶 ID', async () => {
      mockPaymentQuerySchema.parse.mockImplementation(() => {
        throw new Error('Invalid userId');
      });

      const result = await handlePostRequest(mockRequest as NextApiRequest);

      expect(result.httpCode).toBe(400);
      expect(result.result.message).not.toBe(STATUS_MESSAGE.SUCCESS);
    });

    it('應該驗證無效的付費方式 ID', async () => {
      mockPaymentQuerySchema.parse.mockImplementation(() => {
        throw new Error('Invalid paymentMethodId');
      });

      const result = await handlePostRequest(mockRequest as NextApiRequest);

      expect(result.httpCode).toBe(400);
      expect(result.result.message).not.toBe(STATUS_MESSAGE.SUCCESS);
    });

    it('應該驗證無效的團隊方案類型', async () => {
      mockPaymentBodySchema.parse.mockImplementation(() => {
        throw new Error('Invalid teamPlanType');
      });

      const result = await handlePostRequest(mockRequest as NextApiRequest);

      expect(result.httpCode).toBe(400);
      expect(result.result.message).not.toBe(STATUS_MESSAGE.SUCCESS);
    });
  });

  describe('權限和資料驗證', () => {
    beforeEach(() => {
      mockGenerateTeamOrder.mockResolvedValue(mockTeamOrder);
      mockCreateTeamOrder.mockResolvedValue(mockTeamOrder);

      mockTransaction.mockImplementation(async (callback) => {
        // Deprecated: (20250604 - Luphia) remove eslint-disable
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await callback({} as any);
        return result;
      });
    });

    it('應該檢查付費方式是否存在', async () => {
      mockGetUserPaymentInfoById.mockResolvedValue(null);

      const result = await handlePostRequest(mockRequest as NextApiRequest);

      expect(result.httpCode).toBe(400);
      expect(result.result.message).toBe(STATUS_MESSAGE.INVALID_PAYMENT_METHOD);
    });

    it('應該檢查用戶是否存在', async () => {
      mockGetUserPaymentInfoById.mockResolvedValue(mockPaymentInfo);
      // Deprecated: (20250604 - Luphia) remove eslint-disable
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockGetUserById.mockResolvedValue(null as any);

      const result = await handlePostRequest(mockRequest as NextApiRequest);

      expect(result.httpCode).toBe(400);
      expect(result.result.message).toBe(STATUS_MESSAGE.INVALID_PAYMENT_METHOD);
    });

    it('應該檢查付費方式是否屬於該用戶', async () => {
      const wrongUserPaymentInfo = { ...mockPaymentInfo, userId: 999 };
      mockGetUserPaymentInfoById.mockResolvedValue(wrongUserPaymentInfo);
      // Deprecated: (20250604 - Luphia) remove eslint-disable
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockGetUserById.mockResolvedValue(mockUser as any);

      const result = await handlePostRequest(mockRequest as NextApiRequest);

      expect(result.httpCode).toBe(400);
      expect(result.result.message).toBe(STATUS_MESSAGE.INVALID_PAYMENT_METHOD);
    });
  });

  describe('資料庫事務處理', () => {
    it('應該在事務失敗時回滾所有操作', async () => {
      mockTransaction.mockRejectedValue(new Error('Transaction failed'));

      const result = await handlePostRequest(mockRequest as NextApiRequest);

      expect(result.httpCode).toBe(400);
      expect(result.result.message).not.toBe(STATUS_MESSAGE.SUCCESS);
    });

    it('應該設定適當的事務超時時間', async () => {
      mockTransaction.mockImplementation(async (callback, options) => {
        expect(options?.timeout).toBe(20_000);
        // Deprecated: (20250604 - Luphia) remove eslint-disable
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return callback({} as any);
      });

      mockGetUserPaymentInfoById.mockResolvedValue(mockPaymentInfo);
      // Deprecated: (20250604 - Luphia) remove eslint-disable
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockGetUserById.mockResolvedValue(mockUser as any);
      mockGenerateTeamOrder.mockResolvedValue(mockTeamOrder);
      mockCreateTeamOrder.mockResolvedValue(mockTeamOrder);
      // Deprecated: (20250604 - Luphia) remove eslint-disable
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockCreatePaymentGateway.mockReturnValue(mockPaymentGateway as any);
      mockPaymentGateway.chargeWithToken.mockResolvedValue('success');

      const successTransaction = {
        ...mockPaymentTransaction,
        status: TRANSACTION_STATUS.SUCCESS,
      };
      mockGenerateTeamPaymentTransaction.mockResolvedValue(successTransaction);
      mockCreateTeamPaymentTransaction.mockResolvedValue(successTransaction);

      mockGenerateTeamInvoice.mockResolvedValue(mockTeamInvoice);
      mockCreateTeamInvoice.mockResolvedValue(mockTeamInvoice);
      mockGenerateTeamSubscription.mockResolvedValue(mockTeamSubscription);
      mockCreateTeamSubscription.mockResolvedValue(mockTeamSubscription);
      mockGenerateTeamPayment.mockResolvedValue(mockTeamPayment);
      mockUpdateTeamPayment.mockResolvedValue(mockTeamPayment);
      mockUpdateTeamOrderStatus.mockResolvedValue(mockTeamOrder);

      await handlePostRequest(mockRequest as NextApiRequest);
    });
  });

  describe('邊界條件', () => {
    it('應該處理空的請求體', async () => {
      const emptyRequest: Partial<NextApiRequest> = {
        query: mockRequest.query,
        body: {},
      };

      mockPaymentBodySchema.parse.mockImplementation(() => {
        throw new Error('Missing required fields');
      });

      const result = await handlePostRequest(emptyRequest as NextApiRequest);

      expect(result.httpCode).toBe(400);
    });

    it('應該處理空的查詢參數', async () => {
      const emptyQueryRequest: Partial<NextApiRequest> = {
        query: {},
        body: mockRequest.body,
      };

      mockPaymentQuerySchema.parse.mockImplementation(() => {
        throw new Error('Missing required query parameters');
      });

      const result = await handlePostRequest(emptyQueryRequest as NextApiRequest);

      expect(result.httpCode).toBe(400);
    });
  });
});
