import { IGetOneVoucherResponse } from '@/interfaces/voucher';
import { voucherAPIGetOneUtils } from '@/pages/api/v2/company/[companyId]/voucher/[voucherId]/route_utils';

// Info: (20240927 - Murky) Comment if you want to check validateRequest related info
// jest.mock('../../../../../../lib/utils/logger_back', () => ({
//   loggerRequest: jest.fn().mockReturnValue({
//     info: jest.fn(),
//     error: jest.fn(),
//   }),
//   loggerError: jest.fn().mockReturnValue({
//     info: jest.fn(),
//     error: jest.fn(),
//   }),
// }));

describe('voucherAPIGetOneUtils', () => {
  let fakeVoucherFromPrisma: IGetOneVoucherResponse;
  beforeEach(() => {
    fakeVoucherFromPrisma = {
      id: 1002,
      issuerId: 1000,
      counterPartyId: 1000,
      companyId: 1000,
      aiResultId: '0',
      status: 'journal:JOURNAL.UPLOADED',
      editable: true,
      no: 'VCH001',
      date: 1672531200,
      type: 'payment',
      note: 'First voucher',
      createdAt: 1672531200,
      updatedAt: 1672531200,
      deletedAt: null,
      issuer: {
        id: 1000,
        name: 'Test_User_1',
        email: 'test1@gmail.com',
        imageFileId: 1002,
        createdAt: 1,
        updatedAt: 1,
        deletedAt: null,
      },
      voucherCertificates: [
        {
          id: 1000,
          voucherId: 1002,
          certificateId: 1000,
          createdAt: 1,
          updatedAt: 1,
          deletedAt: null,

          certificate: {
            id: 1000,
            aiResultId: '0',
            companyId: 1003,
            fileId: 1000,
            uploaderId: 1000,
            invoices: [
              {
                id: 1000,
                name: 'invoice',
                certificateId: 1000,
                counterPartyId: 1000,
                inputOrOutput: 'input',
                date: 1,
                no: '1001',
                currencyAlias: 'TWD',
                priceBeforeTax: 2000,
                taxType: 'taxable',
                taxRatio: 5,
                taxPrice: 100,
                totalPrice: 2100,
                type: 'PURCHASE_TRIPLICATE_AND_ELECTRONIC',
                deductible: true,
                createdAt: 1,
                updatedAt: 1,
                deletedAt: null,
              },
            ],
            file: {
              id: 1,
              name: 'murky.jpg',
              size: 1000,
              mimeType: 'image/jpeg',
              type: 'tmp',
              url: 'https://isunfa.com/elements/avatar_default.svg?w=256&q=75',
              createdAt: 1,
              updatedAt: 1,
              deletedAt: null,
              isEncrypted: false,
              iv: Buffer.from('1234567890123456'),
              encryptedSymmetricKey: '1234567890123456',
            },
            createdAt: 1,
            updatedAt: 1,
            deletedAt: null,
            UserCertificate: [
              {
                id: 1,
                userId: 1,
                certificateId: 1,
                isRead: false,
                createdAt: 1,
                updatedAt: 1,
                deletedAt: null,
              },
            ],
          },
        },
      ],
      counterparty: {
        id: 1000,
        companyId: 1000,
        name: 'ABC Corp',
        taxId: '123456789',
        type: 'SUPPLIER',
        note: 'Preferred supplier',
        createdAt: 1622548800,
        updatedAt: 1625130800,
        deletedAt: null,
      },
      originalVouchers: [
        {
          id: 1000,
          eventId: 1000,
          originalVoucherId: 1002,
          resultVoucherId: 1000,
          createdAt: 1731343518,
          updatedAt: 1731343518,
          deletedAt: null,
          event: {
            id: 1000,
            eventType: 'revert',
            frequence: 'once',
            startDate: 1731343518,
            endDate: 1731343518,
            daysOfWeek: [],
            monthsOfYear: [],
            createdAt: 1731343518,
            updatedAt: 1731343518,
            deletedAt: null,
          },
          resultVoucher: {
            id: 1000,
            issuerId: 1000,
            counterPartyId: 1000,
            companyId: 1000,
            aiResultId: '0',
            status: 'journal:JOURNAL.UPLOADED',
            editable: true,
            no: 'VCH001',
            date: 1672531200,
            type: 'payment',
            note: 'First voucher',
            createdAt: 1672531200,
            updatedAt: 1672531200,
            deletedAt: null,
            lineItems: [
              {
                id: 1001,
                amount: 500,
                description: '購買存貨-應付帳款',
                debit: false,
                accountId: 10000981,
                voucherId: 1000,
                createdAt: 1,
                updatedAt: 1,
                deletedAt: null,
                account: {
                  id: 10000981,
                  companyId: 1002,
                  system: 'IFRS',
                  type: 'liability',
                  debit: false,
                  liquidity: true,
                  code: '2171',
                  name: '應付帳款',
                  forUser: true,
                  parentCode: '2170',
                  rootCode: '2170',
                  createdAt: 0,
                  updatedAt: 0,
                  level: 3,
                  deletedAt: null,
                },
              },
              {
                id: 1002,
                amount: 1500,
                description: '購買存貨-商品存貨',
                debit: true,
                accountId: 10001099,
                voucherId: 1000,
                createdAt: 1,
                updatedAt: 1,
                deletedAt: null,
                account: {
                  id: 10001099,
                  companyId: 1002,
                  system: 'IFRS',
                  type: 'asset',
                  debit: true,
                  liquidity: true,
                  code: '1301',
                  name: '商品存貨',
                  forUser: true,
                  parentCode: '1300',
                  rootCode: '130X',
                  createdAt: 0,
                  updatedAt: 0,
                  level: 4,
                  deletedAt: null,
                },
              },
              {
                id: 1000,
                amount: 1000,
                description: '購買存貨-銀行現金',
                debit: false,
                accountId: 10000603,
                voucherId: 1000,
                createdAt: 1,
                updatedAt: 1,
                deletedAt: null,
                account: {
                  id: 10000603,
                  companyId: 1002,
                  system: 'IFRS',
                  type: 'asset',
                  debit: true,
                  liquidity: true,
                  code: '1103',
                  name: '銀行存款',
                  forUser: true,
                  parentCode: '1100',
                  rootCode: '1100',
                  createdAt: 0,
                  updatedAt: 0,
                  level: 3,
                  deletedAt: null,
                },
              },
            ],
          },
        },
      ],
      resultVouchers: [
        {
          id: 1000,
          eventId: 1000,
          originalVoucherId: 1000,
          resultVoucherId: 1002,
          createdAt: 1731343518,
          updatedAt: 1731343518,
          deletedAt: null,
          event: {
            id: 1000,
            eventType: 'revert',
            frequence: 'once',
            startDate: 1731343518,
            endDate: 1731343518,
            daysOfWeek: [],
            monthsOfYear: [],
            createdAt: 1731343518,
            updatedAt: 1731343518,
            deletedAt: null,
          },
          originalVoucher: {
            id: 1000,
            issuerId: 1000,
            counterPartyId: 1000,
            companyId: 1000,
            aiResultId: '0',
            status: 'journal:JOURNAL.UPLOADED',
            editable: true,
            no: 'VCH001',
            date: 1672531200,
            type: 'payment',
            note: 'First voucher',
            createdAt: 1672531200,
            updatedAt: 1672531200,
            deletedAt: null,
            lineItems: [
              {
                id: 1001,
                amount: 500,
                description: '購買存貨-應付帳款',
                debit: false,
                accountId: 10000981,
                voucherId: 1000,
                createdAt: 1,
                updatedAt: 1,
                deletedAt: null,
                account: {
                  id: 10000981,
                  companyId: 1002,
                  system: 'IFRS',
                  type: 'liability',
                  debit: false,
                  liquidity: true,
                  code: '2171',
                  name: '應付帳款',
                  forUser: true,
                  parentCode: '2170',
                  rootCode: '2170',
                  createdAt: 0,
                  updatedAt: 0,
                  level: 3,
                  deletedAt: null,
                },
              },
              {
                id: 1002,
                amount: 1500,
                description: '購買存貨-商品存貨',
                debit: true,
                accountId: 10001099,
                voucherId: 1000,
                createdAt: 1,
                updatedAt: 1,
                deletedAt: null,
                account: {
                  id: 10001099,
                  companyId: 1002,
                  system: 'IFRS',
                  type: 'asset',
                  debit: true,
                  liquidity: true,
                  code: '1301',
                  name: '商品存貨',
                  forUser: true,
                  parentCode: '1300',
                  rootCode: '130X',
                  createdAt: 0,
                  updatedAt: 0,
                  level: 4,
                  deletedAt: null,
                },
              },
              {
                id: 1000,
                amount: 1000,
                description: '購買存貨-銀行現金',
                debit: false,
                accountId: 10000603,
                voucherId: 1000,
                createdAt: 1,
                updatedAt: 1,
                deletedAt: null,
                account: {
                  id: 10000603,
                  companyId: 1002,
                  system: 'IFRS',
                  type: 'asset',
                  debit: true,
                  liquidity: true,
                  code: '1103',
                  name: '銀行存款',
                  forUser: true,
                  parentCode: '1100',
                  rootCode: '1100',
                  createdAt: 0,
                  updatedAt: 0,
                  level: 3,
                  deletedAt: null,
                },
              },
            ],
          },
        },
      ],
      assetVouchers: [
        {
          id: 1000,
          assetId: 1,
          voucherId: 1000,
          createdAt: 1,
          updatedAt: 1,
          deletedAt: null,
          asset: {
            id: 1,
            name: 'Notebook',
            type: '1691',
            depreciationMethod: 'straight_line',
            createdAt: 1609459200,
            updatedAt: 1609459200,
            deletedAt: null,
            residualValue: 1000,
            companyId: 1000,
            number: 'LAPTOP-001',
            acquisitionDate: 1609459200,
            purchasePrice: 30000,
            accumulatedDepreciation: 5000,
            remainingLife: 36,
            status: 'normal',
            depreciationStart: 1612137600,
            usefulLife: 60,
            note: 'This is a notebook',
          },
        },
      ],
      lineItems: [
        {
          id: 1006,
          amount: 100,
          description: '償還應付帳款-銀行現金',
          debit: false,
          accountId: 10000603,
          voucherId: 1002,
          createdAt: 1,
          updatedAt: 1,
          deletedAt: null,
          originalLineItem: [],
          account: {
            id: 10000603,
            companyId: 1002,
            system: 'IFRS',
            type: 'asset',
            debit: true,
            liquidity: true,
            code: '1103',
            name: '銀行存款',
            forUser: true,
            parentCode: '1100',
            rootCode: '1100',
            createdAt: 0,
            updatedAt: 0,
            level: 3,
            deletedAt: null,
          },
        },
        {
          id: 1007,
          amount: 100,
          description: '償還應付帳款-應付帳款',
          debit: true,
          accountId: 10000981,
          voucherId: 1002,
          createdAt: 1,
          updatedAt: 1,
          deletedAt: null,
          originalLineItem: [],
          account: {
            id: 10000981,
            companyId: 1002,
            system: 'IFRS',
            type: 'liability',
            debit: false,
            liquidity: true,
            code: '2171',
            name: '應付帳款',
            forUser: true,
            parentCode: '2170',
            rootCode: '2170',
            createdAt: 0,
            updatedAt: 0,
            level: 3,
            deletedAt: null,
          },
        },
      ],
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getVoucherFromPrisma', () => {
    it('should return voucher from prisma', () => {
      const voucherId = 1002;
      const result = voucherAPIGetOneUtils.getVoucherFromPrisma(voucherId);
      expect(result).toBeDefined();
    });
  });

  describe('getAccountingSettingFromPrisma', () => {
    it('should return accounting setting from prisma', () => {
      const companyId = 1001;
      const result = voucherAPIGetOneUtils.getAccountingSettingFromPrisma(companyId);
      expect(result).toBeDefined();
    });
  });

  describe('initIssuerEntity', () => {
    it('should return issuer entity', () => {
      const issuerEntity = voucherAPIGetOneUtils.initIssuerEntity(fakeVoucherFromPrisma);
      expect(issuerEntity).toBeDefined();
      expect(issuerEntity.id).toEqual(1000);
    });
  });

  describe('initCounterPartyEntity', () => {
    it('should return counter party entity', () => {
      const counterPartyEntity =
        voucherAPIGetOneUtils.initCounterPartyEntity(fakeVoucherFromPrisma);
      expect(counterPartyEntity).toBeDefined();
      expect(counterPartyEntity.id).toEqual(1000);
    });
  });

  describe('initOriginalEventEntities', () => {
    it('should return original event entities', () => {
      const originalEventEntities =
        voucherAPIGetOneUtils.initOriginalEventEntities(fakeVoucherFromPrisma);
      expect(originalEventEntities).toBeDefined();
      expect(originalEventEntities.length).toBeGreaterThan(0);
      expect(originalEventEntities[0].associateVouchers.length).toBeGreaterThan(0);
      expect(originalEventEntities[0].associateVouchers[0].originalVoucher).toBeDefined();
      expect(originalEventEntities[0].associateVouchers[0].resultVoucher).toBeDefined();
    });
  });

  describe('initResultEventEntities', () => {
    it('should return result event entities', () => {
      const resultEventEntities =
        voucherAPIGetOneUtils.initResultEventEntities(fakeVoucherFromPrisma);
      expect(resultEventEntities).toBeDefined();
      expect(resultEventEntities.length).toBeGreaterThan(0);
      expect(resultEventEntities[0].associateVouchers.length).toBeGreaterThan(0);
      expect(resultEventEntities[0].associateVouchers[0].originalVoucher).toBeDefined();
      expect(resultEventEntities[0].associateVouchers[0].resultVoucher).toBeDefined();
    });
  });

  describe('initAssetEntities', () => {
    it('should return asset entities', () => {
      const assetEntities = voucherAPIGetOneUtils.initAssetEntities(fakeVoucherFromPrisma);
      expect(assetEntities).toBeDefined();
      expect(assetEntities.length).toBeGreaterThan(0);
    });
  });

  describe('initLineItemEntities', () => {
    it('should return line item entities', () => {
      const lineItemEntities = voucherAPIGetOneUtils.initLineItemEntities(fakeVoucherFromPrisma);
      expect(lineItemEntities).toBeDefined();
      expect(lineItemEntities.length).toBeGreaterThan(0);
      expect(lineItemEntities[0].account).toBeDefined();
    });
  });

  describe('initCertificateEntities', () => {
    it('should return certificate entities', () => {
      const certificateEntities =
        voucherAPIGetOneUtils.initCertificateEntities(fakeVoucherFromPrisma);
      expect(certificateEntities).toBeDefined();
      expect(certificateEntities.length).toBeGreaterThan(0);
      expect(certificateEntities[0].file).toBeDefined();
      expect(certificateEntities[0].invoice).toBeDefined();
      expect(certificateEntities[0].userCertificates).toBeDefined();
      expect(certificateEntities[0].userCertificates.length).toBeGreaterThan(0);
    });
  });

  describe('getPayableReceivableInfoFromVoucher', () => {
    it('should return payable receivable info from voucher', () => {
      // Info: (20241112 - Murky) fakeVoucherFromPrisma 是反轉別人的分錄
      // 所以只有resultEventEntities，沒有originalEventEntities的結果
      const resultEventEntities =
        voucherAPIGetOneUtils.initResultEventEntities(fakeVoucherFromPrisma);
      const result = voucherAPIGetOneUtils.getPayableReceivableInfoFromVoucher(resultEventEntities);
      expect(result).toBeDefined();
      expect(result.payableInfo).toBeDefined();
      expect(result.receivingInfo).toBeUndefined();
    });
  });
});
