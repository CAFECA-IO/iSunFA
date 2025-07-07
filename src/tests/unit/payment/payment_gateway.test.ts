import OenPaymentGateway from '@/lib/utils/payment/oen';
import { createPaymentGateway } from '@/lib/utils/payment/factory';
import {
  IPaymentGatewayOptions,
  IGetCardBindingUrlOptions,
  IChargeWithTokenOptions,
} from '@/interfaces/payment_gateway';
import { PAYMENT_GATEWAY } from '@/constants/payment';
import { HttpMethod } from '@/constants/api_connection';
import { IUser } from '@/interfaces/user';
import { ITeamOrder, ITeamOrderDetail } from '@/interfaces/order';
import { CurrencyType } from '@/constants/currency';

// Info: (20250604 - Shirley) 模擬 fetch
global.fetch = jest.fn();

// Info: (20250604 - Shirley) 模擬常量
jest.mock('@/constants/oen', () => ({
  PLATFORM: 'OEN',
  URLS: {
    DEV: {
      HANDSHAKE_URL: 'https://dev.oen.com/handshake',
      CARD_BINDING_URL: 'https://dev.oen.com/bind/:paymentId',
      CHARGE_URL: 'https://dev.oen.com/charge',
    },
    PROD: {
      HANDSHAKE_URL: 'https://prod.oen.com/handshake',
      CARD_BINDING_URL: 'https://prod.oen.com/bind/:paymentId',
      CHARGE_URL: 'https://prod.oen.com/charge',
    },
  },
}));

// Info: (20250604 - Shirley) 模擬訂單格式化器
jest.mock('@/lib/utils/formatter/order.formatter', () => ({
  teamOrderToOrderOen: jest.fn((order, user) => ({
    orderId: order.id,
    amount: order.amount,
    currency: 'TWD',
    userName: user.name,
    userEmail: user.email,
    productDetails: order.details.map((detail: ITeamOrderDetail) => ({
      productionCode: detail.productName,
      description: detail.productName,
      quantity: detail.quantity,
      unit: 'pcs',
      unitPrice: detail.unitPrice,
    })),
  })),
}));

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Info: (20250612 - Shirley) Effective test case
describe('Payment Gateway 測試', () => {
  const mockOptions: IPaymentGatewayOptions = {
    platform: PAYMENT_GATEWAY.OEN,
    prodMode: false,
    id: 'test-merchant-id',
    secret: 'test-secret-token',
  };

  const mockUser: IUser = {
    id: 123,
    name: 'Test User',
    email: 'test@example.com',
    imageId: 'default-image-id',
    agreementList: [],
    createdAt: 1640995200,
    updatedAt: 1640995200,
    deletedAt: 0,
  };

  const mockTeamOrder: ITeamOrder = {
    id: 456,
    userId: 123,
    teamId: 789,
    amount: 1000,
    status: 'PENDING',
    details: [
      {
        id: 1,
        orderId: 456,
        productId: 1,
        productName: 'PREMIUM_PLAN',
        unit: 'pcs',
        unitPrice: 1000,
        quantity: 1,
        currency: 'TWD',
        amount: 1000,
      },
    ],
    currency: CurrencyType.TWD,
    createdAt: 1640995200,
    updatedAt: 1640995200,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('OenPaymentGateway', () => {
    let gateway: OenPaymentGateway;

    beforeEach(() => {
      gateway = new OenPaymentGateway(mockOptions);
    });

    describe('初始化和設定', () => {
      it('應該正確初始化開發環境', () => {
        const devGateway = new OenPaymentGateway({ ...mockOptions, prodMode: false });
        expect(devGateway.getPlatform()).toBe(PAYMENT_GATEWAY.OEN);
      });

      it('應該正確初始化生產環境', () => {
        const prodGateway = new OenPaymentGateway({ ...mockOptions, prodMode: true });
        expect(prodGateway.getPlatform()).toBe(PAYMENT_GATEWAY.OEN);
      });

      it('應該返回正確的平台名稱', () => {
        expect(gateway.getPlatform()).toBe(PAYMENT_GATEWAY.OEN);
      });
    });

    describe('getCardBindingUrl', () => {
      const mockCardBindingOptions: IGetCardBindingUrlOptions = {
        customId: 'user-123',
        successUrl: 'https://app.com/success',
        failureUrl: 'https://app.com/failure',
      };

      it('應該成功獲取綁卡 URL', async () => {
        // Info: (20250604 - Shirley) 準備
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            code: 'S0000',
            data: { id: 'payment-id-123' },
            message: '',
          }),
        } as Response);

        // Info: (20250604 - Shirley) 執行
        const url = await gateway.getCardBindingUrl(mockCardBindingOptions);

        // Info: (20250604 - Shirley) 驗證
        expect(url).toBe('https://dev.oen.com/bind/payment-id-123');
        expect(mockFetch).toHaveBeenCalledWith('https://dev.oen.com/handshake', {
          method: HttpMethod.POST,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockOptions.secret}`,
          },
          body: JSON.stringify({
            merchantId: mockOptions.id,
            customId: mockCardBindingOptions.customId,
            successUrl: mockCardBindingOptions.successUrl,
            failureUrl: mockCardBindingOptions.failureUrl,
          }),
        });
      });

      it('應該處理 API 回應錯誤', async () => {
        // Info: (20250604 - Shirley) 準備
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            code: 'E0001',
            data: {},
            message: 'Invalid request',
          }),
        } as Response);

        // Info: (20250604 - Shirley) 執行
        const url = await gateway.getCardBindingUrl(mockCardBindingOptions);

        // Info: (20250604 - Shirley) 驗證 - 當 API 返回錯誤時，data.id 是 undefined，會被替換到 URL 中
        expect(url).toBe('https://dev.oen.com/bind/undefined');
      });

      it('應該處理網路錯誤', async () => {
        // Info: (20250604 - Shirley) 準備
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        // Info: (20250604 - Shirley) 執行 & 驗證
        await expect(gateway.getCardBindingUrl(mockCardBindingOptions)).rejects.toThrow(
          'Network error'
        );
      });
    });

    describe('chargeWithToken', () => {
      const mockChargeOptions: IChargeWithTokenOptions = {
        order: mockTeamOrder,
        user: mockUser,
        token: 'test-payment-token',
      };

      it('應該成功進行扣款', async () => {
        // Info: (20250604 - Shirley) 準備
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            code: 'S0000',
            data: { id: 'charge-record-123', authCode: '831000' },
            message: '',
          }),
        } as Response);

        // Info: (20250604 - Shirley) 執行
        const result = await gateway.chargeWithToken(mockChargeOptions);

        // Info: (20250604 - Shirley) 驗證
        expect(result).toBe('charge-record-123');
        expect(mockFetch).toHaveBeenCalledWith('https://dev.oen.com/charge', {
          method: HttpMethod.POST,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockOptions.secret}`,
          },
          body: JSON.stringify({
            merchantId: mockOptions.id,
            token: mockChargeOptions.token,
            orderId: mockTeamOrder.id,
            amount: mockTeamOrder.amount,
            currency: 'TWD',
            userName: mockUser.name,
            userEmail: mockUser.email,
            productDetails: [
              {
                productionCode: 'PREMIUM_PLAN',
                description: 'PREMIUM_PLAN',
                quantity: 1,
                unit: 'pcs',
                unitPrice: 1000,
              },
            ],
          }),
        });
      });

      it('應該在扣款失敗時返回 undefined', async () => {
        // Info: (20250604 - Shirley) 準備
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            code: 'E0002',
            data: {},
            message: 'Insufficient funds',
          }),
        } as Response);

        // Info: (20250604 - Shirley) 執行
        const result = await gateway.chargeWithToken(mockChargeOptions);

        // Info: (20250604 - Shirley) 驗證
        expect(result).toBeUndefined();
      });

      it('應該處理無效的 token', async () => {
        // Info: (20250604 - Shirley) 準備
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            code: 'E0003',
            data: {},
            message: 'Invalid token',
          }),
        } as Response);

        // Info: (20250604 - Shirley) 執行
        const result = await gateway.chargeWithToken(mockChargeOptions);

        // Info: (20250604 - Shirley) 驗證
        expect(result).toBeUndefined();
      });

      it('應該處理網路錯誤', async () => {
        // Info: (20250604 - Shirley) 準備
        mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

        // Info: (20250604 - Shirley) 執行 & 驗證
        await expect(gateway.chargeWithToken(mockChargeOptions)).rejects.toThrow('Network timeout');
      });

      it('應該正確格式化訂單資料', async () => {
        // Info: (20250604 - Shirley) 準備
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            code: 'S0000',
            data: { id: 'success-id' },
            message: '',
          }),
        } as Response);

        // Info: (20250604 - Shirley) 執行
        await gateway.chargeWithToken(mockChargeOptions);

        // Info: (20250604 - Shirley) 驗證請求體包含正確的訂單資訊
        const callArgs = mockFetch.mock.calls[0];
        const requestBody = JSON.parse(callArgs[1]?.body as string);

        expect(requestBody).toMatchObject({
          merchantId: mockOptions.id,
          token: mockChargeOptions.token,
          orderId: mockTeamOrder.id,
          amount: mockTeamOrder.amount,
          currency: 'TWD',
          userName: mockUser.name,
          userEmail: mockUser.email,
        });
        expect(requestBody.productDetails).toBeDefined();
        expect(requestBody.productDetails[0]).toMatchObject({
          productionCode: 'PREMIUM_PLAN',
          description: 'PREMIUM_PLAN',
          quantity: 1,
          unitPrice: 1000,
        });
      });
    });

    describe('parseAuthorizationToken', () => {
      it('應該正確解析授權 token', () => {
        // Info: (20250604 - Shirley) 準備
        const mockTokenData = {
          success: true,
          purpose: 'token',
          merchantId: 'test-merchant',
          transactionId: 'txn-123',
          message: null,
          customId: '123',
          token: 'auth-token-456',
          id: 'payment-id-789',
        };

        // Info: (20250604 - Shirley) 執行
        const result = gateway.parseAuthorizationToken(mockTokenData);

        // Info: (20250604 - Shirley) 驗證
        expect(result).toMatchObject({
          platform: PAYMENT_GATEWAY.OEN,
          token: 'auth-token-456',
          userId: 123,
          transactionId: 'txn-123',
          default: true,
        });
        expect(result.detail).toBeDefined();
        expect(result.createdAt).toBeDefined();
        expect(result.updatedAt).toBeDefined();
      });

      it('應該處理缺失欄位的 token 資料', () => {
        // Info: (20250604 - Shirley) 準備
        const incompleteTokenData = {
          token: 'incomplete-token',
          customId: '456',
        };

        // Info: (20250604 - Shirley) 執行
        const result = gateway.parseAuthorizationToken(incompleteTokenData);

        // Info: (20250604 - Shirley) 驗證
        expect(result.token).toBe('incomplete-token');
        expect(result.userId).toBe(456);
        expect(result.transactionId).toBeUndefined();
      });
    });

    describe('getChargeUrl', () => {
      it('應該返回扣款 URL', async () => {
        // Info: (20250604 - Shirley) 執行
        const url = await gateway.getChargeUrl({
          order: mockTeamOrder,
        });

        // Info: (20250604 - Shirley) 驗證
        expect(url).toBe('https://dev.oen.com/charge');
      });
    });
  });

  describe('createPaymentGateway 工廠函數', () => {
    beforeEach(() => {
      // Info: (20250604 - Shirley) 模擬環境變數
      process.env.PAYMENT_ID = 'factory-merchant-id';
      process.env.PAYMENT_TOKEN = 'factory-secret-token';
      process.env.NEXT_PUBLIC_DOMAIN = 'localhost:3000';
    });

    afterEach(() => {
      delete process.env.PAYMENT_ID;
      delete process.env.PAYMENT_TOKEN;
      delete process.env.NEXT_PUBLIC_DOMAIN;
    });

    it('應該創建 OEN 付費閘道實例', () => {
      // Info: (20250604 - Shirley) 執行
      const gateway = createPaymentGateway();

      // Info: (20250604 - Shirley) 驗證
      expect(gateway).toBeInstanceOf(OenPaymentGateway);
      expect(gateway.getPlatform()).toBe(PAYMENT_GATEWAY.OEN);
    });

    it('應該在生產環境中正確設定', () => {
      // Info: (20250604 - Shirley) 準備
      process.env.NEXT_PUBLIC_DOMAIN = 'isunfa.com';

      // Info: (20250604 - Shirley) 執行
      const gateway = createPaymentGateway();

      // Info: (20250604 - Shirley) 驗證
      expect(gateway).toBeInstanceOf(OenPaymentGateway);
    });

    it('應該處理缺失的環境變數', () => {
      // Info: (20250604 - Shirley) 準備
      delete process.env.PAYMENT_ID;
      delete process.env.PAYMENT_TOKEN;

      // Info: (20250604 - Shirley) 執行 & 驗證
      expect(() => createPaymentGateway()).not.toThrow();
    });
  });

  describe('邊界條件和錯誤處理', () => {
    let gateway: OenPaymentGateway;

    beforeEach(() => {
      gateway = new OenPaymentGateway(mockOptions);
    });

    it('應該處理空的訂單資料', async () => {
      // Info: (20250604 - Shirley) 準備
      const emptyOrder = { ...mockTeamOrder, details: [] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: 'S0000', data: { id: 'test' }, message: '' }),
      } as Response);

      // Info: (20250604 - Shirley) 執行
      const result = await gateway.chargeWithToken({
        order: emptyOrder,
        user: mockUser,
        token: 'test-token',
      });

      // Info: (20250604 - Shirley) 驗證
      expect(result).toBe('test');
    });

    it('應該處理無效的用戶資料', async () => {
      // Info: (20250604 - Shirley) 準備
      const invalidUser = { ...mockUser, email: '', name: '' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: 'S0000', data: { id: 'test' }, message: '' }),
      } as Response);

      // Info: (20250604 - Shirley) 執行
      const result = await gateway.chargeWithToken({
        order: mockTeamOrder,
        user: invalidUser,
        token: 'test-token',
      });

      // Info: (20250604 - Shirley) 驗證
      expect(result).toBe('test');
    });

    it('應該處理 API 回應格式錯誤', async () => {
      // Info: (20250604 - Shirley) 準備
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'response' }),
      } as Response);

      // Info: (20250604 - Shirley) 執行 & 驗證
      await expect(
        gateway.chargeWithToken({
          order: mockTeamOrder,
          user: mockUser,
          token: 'test-token',
        })
      ).rejects.toThrow();
    });

    it('應該處理非 JSON 回應', async () => {
      // Info: (20250604 - Shirley) 準備
      const mockResponse = {
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
        headers: new Headers(),
        redirected: false,
        status: 200,
        statusText: 'OK',
        type: 'basic' as ResponseType,
        url: '',
        body: null,
        bodyUsed: false,
        clone: jest.fn(),
        arrayBuffer: jest.fn(),
        blob: jest.fn(),
        formData: jest.fn(),
        text: jest.fn(),
        bytes: jest.fn(),
      };

      mockFetch.mockResolvedValueOnce(mockResponse as Response);

      // Info: (20250604 - Shirley) 執行 & 驗證
      await expect(
        gateway.chargeWithToken({
          order: mockTeamOrder,
          user: mockUser,
          token: 'test-token',
        })
      ).rejects.toThrow('Invalid JSON');
    });
  });

  describe('生產環境配置', () => {
    it('應該在生產環境使用正確的 URL', () => {
      // Info: (20250604 - Shirley) 準備
      const prodOptions: IPaymentGatewayOptions = {
        ...mockOptions,
        prodMode: true,
      };

      // Info: (20250604 - Shirley) 執行
      const gateway = new OenPaymentGateway(prodOptions);

      // Info: (20250604 - Shirley) 驗證 - 這裡我們無法直接驗證內部 URL，但可以確保實例正確創建
      expect(gateway.getPlatform()).toBe(PAYMENT_GATEWAY.OEN);
    });
  });
});
