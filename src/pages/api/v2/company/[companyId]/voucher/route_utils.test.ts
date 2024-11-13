import prisma from '@/client';
import { EventType } from '@/constants/account';
import { AssetDepreciationMethod, AssetEntityType, AssetStatus } from '@/constants/asset';
import { CounterpartyType } from '@/constants/counterparty';
import { EventEntityFrequency, EventEntityType } from '@/constants/event';
import { JOURNAL_EVENT } from '@/constants/journal';
import { IAssetEntity } from '@/interfaces/asset';
import { ICompanyEntity } from '@/interfaces/company';
import { ICounterparty } from '@/interfaces/counterparty';
import { IEventEntity } from '@/interfaces/event';
import { ILineItemEntity } from '@/interfaces/line_item';
import { IUserEntity } from '@/interfaces/user';
import { IVoucherEntity } from '@/interfaces/voucher';
import { voucherAPIPostUtils as postUtils } from '@/pages/api/v2/company/[companyId]/voucher/route_utils';

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

describe('voucherAPIPostUtils', () => {
  beforeEach(() => {});

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initCompanyFromPrisma', () => {
    it('should get default company and init ICompanyEntity', async () => {
      const company = await postUtils.initCompanyFromPrisma(1000);

      expect(company).toBeDefined();
      expect(company.id).toBe(1000);
    });
  });

  describe('initIssuerFromPrisma', () => {
    it('should get default issuer and init IIssuerEntity', async () => {
      const issuer = await postUtils.initIssuerFromPrisma(1000);

      expect(issuer).toBeDefined();
      expect(issuer.id).toBe(1000);
    });
  });

  describe('initCounterPartyFromPrisma', () => {
    it('should get default counterparty and init ICounterparty', async () => {
      const counterParty = await postUtils.initCounterPartyFromPrisma(1000);

      expect(counterParty).toBeDefined();
      expect(counterParty.id).toBe(1000);
    });
  });

  describe('initLineItemEntities', () => {
    it('should init line item entities', async () => {
      const fakeLineItems = [
        {
          debit: true,
          description: 'fake description',
          amount: 1000,
          accountId: 1000,
        },
      ];

      const lineItems = postUtils.initLineItemEntities(fakeLineItems);

      expect(lineItems).toBeDefined();
      expect(lineItems.length).toBe(1);
      expect(lineItems[0].id).toBe(0);
    });
  });

  describe('initVoucherFromPrisma', () => {
    it('should get default voucher and init IVoucherEntity', async () => {
      const voucher = await postUtils.initVoucherFromPrisma(1000);

      expect(voucher).toBeDefined();
      expect(voucher.id).toBe(1000);
    });
  });

  describe('initLineItemFromPrisma', () => {
    it('should get default line item and init ILineItemEntity', async () => {
      const lineItem = await postUtils.initLineItemFromPrisma(10000000);
      expect(lineItem).toBeDefined();
      expect(lineItem.id).toBe(10000000);
    });
  });

  describe('initAssetFromPrisma', () => {
    it('should get default asset and init IAssetEntity', async () => {
      const asset = await postUtils.initAssetFromPrisma(1);
      expect(asset).toBeDefined();
      expect(asset.id).toBe(1);
    });
  });

  describe('isVoucherExistById', () => {
    it('should return true if voucher exist', async () => {
      const isExist = await postUtils.isVoucherExistById(1000);

      expect(isExist).toBe(true);
    });
  });

  describe('isLineItemExistById', () => {
    it('should return true if line item exist', async () => {
      const isExist = await postUtils.isLineItemExistById(10000000);

      expect(isExist).toBe(true);
    });
  });

  describe('isAssetExistById', () => {
    it('should return true if asset exist', async () => {
      const isExist = await postUtils.isAssetExistById(1);

      expect(isExist).toBe(true);
    });
  });

  describe('areAllVouchersExistById', () => {
    it('should return true if all vouchers exist', async () => {
      postUtils.isVoucherExistById = jest.fn().mockResolvedValue(true);
      const isAllExist = await postUtils.areAllVouchersExistById([1000, 1001]);
      expect(isAllExist).toBe(true);
    });

    it('should return false if any voucher does not exist', async () => {
      postUtils.isVoucherExistById = jest
        .fn()
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      const isAllExist = await postUtils.areAllVouchersExistById([1000, 1001]);
      expect(isAllExist).toBe(false);
    });
  });

  describe('areAllLineItemsExistById', () => {
    it('should return true if all line items exist', async () => {
      postUtils.isLineItemExistById = jest.fn().mockResolvedValue(true);
      const isAllExist = await postUtils.areAllLineItemsExistById([10000000, 10000001]);
      expect(isAllExist).toBe(true);
    });

    it('should return false if any line item does not exist', async () => {
      postUtils.isLineItemExistById = jest
        .fn()
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      const isAllExist = await postUtils.areAllLineItemsExistById([10000000, 10000001]);
      expect(isAllExist).toBe(false);
    });
  });

  describe('areAllAssetsExistById', () => {
    it('should return true if all assets exist', async () => {
      postUtils.isAssetExistById = jest.fn().mockResolvedValue(true);
      const isAllExist = await postUtils.areAllAssetsExistById([1, 2]);
      expect(isAllExist).toBe(true);
    });

    it('should return false if any asset does not exist', async () => {
      postUtils.isAssetExistById = jest
        .fn()
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      const isAllExist = await postUtils.areAllAssetsExistById([1, 2]);
      expect(isAllExist).toBe(false);
    });
  });

  describe('initRevertAssociateVouchers', () => {
    let fakeRevertOthersLineItems: ILineItemEntity[] = [];

    let fakeOriginalVoucher: IVoucherEntity;
    let fakeReversedVoucher: IVoucherEntity;
    let fakeReversedLineItem: ILineItemEntity;

    beforeEach(() => {
      fakeRevertOthersLineItems = [
        {
          id: 0,
          description: '存入銀行',
          amount: 600,
          debit: true,
          accountId: 10000000,
          voucherId: 1,
          createdAt: 1,
          updatedAt: 1,
          deletedAt: null,
        },
        {
          id: 0,
          description: '存入銀行',
          amount: 600,
          debit: true,
          accountId: 10000000,
          voucherId: 1,
          createdAt: 1,
          updatedAt: 1,
          deletedAt: null,
        },
        {
          id: 0,
          description: '原價屋',
          amount: 1000,
          debit: false,
          accountId: 10000000,
          voucherId: 1,
          createdAt: 1,
          updatedAt: 1,
          deletedAt: null,
        },
      ];

      fakeOriginalVoucher = {
        id: 0, // Info: (20241111 - Murky) not created so id is 0
        issuerId: 1,
        counterPartyId: 1,
        companyId: 1,
        status: JOURNAL_EVENT.UPLOADED,
        editable: true,
        no: '1001',
        date: 1,
        type: EventType.INCOME,
        note: 'this is original Voucher',
        createdAt: 1,
        updatedAt: 1,
        deletedAt: null,
        lineItems: [],
        originalEvents: [],
        resultEvents: [],
        certificates: [],
        asset: [],
        readByUsers: [],
      };

      fakeReversedLineItem = {
        id: 10,
        description: 'fake Reversed description',
        amount: 1000,
        debit: true,
        accountId: 1000,
        voucherId: 1,
        createdAt: 1,
        updatedAt: 1,
        deletedAt: null,
      };

      fakeReversedVoucher = {
        id: 3,
        issuerId: 3,
        counterPartyId: 3,
        companyId: 3,
        status: JOURNAL_EVENT.UPLOADED,
        editable: true,
        no: '1001',
        date: 1,
        type: EventType.INCOME,
        note: 'this is Reversed Voucher',
        createdAt: 1,
        updatedAt: 1,
        deletedAt: null,
        lineItems: [],
        originalEvents: [],
        resultEvents: [],
        certificates: [],
        asset: [],
        readByUsers: [],
      };
    });

    it('should init revert associate vouchers', async () => {
      postUtils.initVoucherFromPrisma = jest.fn().mockResolvedValue(fakeReversedVoucher);
      postUtils.initLineItemFromPrisma = jest.fn().mockResolvedValue(fakeReversedLineItem);

      const associateVouchers = await postUtils.initRevertAssociateVouchers({
        originalVoucher: fakeOriginalVoucher,
        revertOtherLineItems: fakeRevertOthersLineItems,
        reverseVouchersInfo: [
          {
            voucherId: fakeReversedVoucher.id,
            amount: 1000,
            lineItemIdBeReversed: fakeReversedLineItem.id,
            lineItemIdReverseOther: 0,
          },
        ],
      });

      const { originalVoucher: original, resultVoucher: result } = associateVouchers[0];
      const [originalLineItem] = original.lineItems;
      const [resultLineItem] = result.lineItems;

      expect(originalLineItem.id).toBe(10);
      expect(resultLineItem.id).toBe(0);
    });
  });

  describe('saveVoucherToPrisma', () => {
    let fakeLineItems: ILineItemEntity[] = [];

    let fakeReversedLineItem: ILineItemEntity;

    let fakeVoucher: IVoucherEntity;

    let fakeCompany: ICompanyEntity;

    let fakeCounterParty: ICounterparty;

    let fakeIssuer: IUserEntity;

    const fakeNowInSecond = 1;

    let fakeAssets: IAssetEntity[];

    let fakeRevertEvent: IEventEntity;

    let fakeReversedVoucher: IVoucherEntity;

    let fakeEventControlPanel: {
      revertEvent: IEventEntity | null;
      recurringEvent: IEventEntity | null;
      assetEvent: IEventEntity | null;
    };

    beforeEach(async () => {
      const bankCashAccount = await prisma.account.findFirst({
        where: {
          code: '1103',
        },
      });

      const storeCashAccount = await prisma.account.findFirst({
        where: {
          code: '1101',
        },
      });

      const accountReceivableAccount = await prisma.account.findFirst({
        where: {
          code: '1172',
        },
      });

      fakeLineItems = [
        {
          id: 1,
          description: '存入銀行',
          amount: 600,
          debit: true,
          accountId: bankCashAccount?.id || 10000000,
          voucherId: 1,
          createdAt: 1,
          updatedAt: 1,
          deletedAt: null,
        },
        {
          id: 2,
          description: '存入銀行',
          amount: 600,
          debit: true,
          accountId: storeCashAccount?.id || 10000000,
          voucherId: 1,
          createdAt: 1,
          updatedAt: 1,
          deletedAt: null,
        },
        {
          id: 3,
          description: '原價屋',
          amount: 1000,
          debit: false,
          accountId: accountReceivableAccount?.id || 10000000,
          voucherId: 1,
          createdAt: 1,
          updatedAt: 1,
          deletedAt: null,
        },
      ];

      fakeCompany = {
        id: 1000,
        name: 'Test Company',
        taxId: 'TEST123',
        startDate: 1,
        createdAt: 1,
        updatedAt: 1,
        deletedAt: null,
      };

      fakeCounterParty = {
        id: 1000,
        companyId: 1000,
        name: 'ABC Corp',
        taxId: '123456789',
        type: CounterpartyType.SUPPLIER,
        note: 'Preferred supplier',
        createdAt: 1622548800,
        updatedAt: 1625130800,
      };

      fakeIssuer = {
        id: 1001,
        name: 'Test_User_2',
        email: 'test2@gmail.com',
        imageFileId: 1,
        createdAt: 1,
        updatedAt: 1,
        deletedAt: null,
      };

      fakeAssets = [
        {
          id: 1, // Info: (20241111 - Murky) 測試環境中seeder必須要有這一筆
          companyId: 1000,
          name: 'Test Asset',
          type: AssetEntityType.OFFICE_EQUIPMENT,
          number: '1001',
          acquisitionDate: 1,
          purchasePrice: 1000,
          accumulatedDepreciation: 0,
          residualValue: 0,
          remainingLife: 10,
          status: AssetStatus.NORMAL,
          depreciationStart: 1,
          depreciationMethod: AssetDepreciationMethod.STRAIGHT_LINE,
          usefulLife: 1,
          createdAt: 1,
          updatedAt: 1,
          deletedAt: null,
          note: 'this is note',
          assetVouchers: [],
        },
      ];

      fakeVoucher = {
        id: 0,
        issuerId: fakeIssuer.id,
        counterPartyId: fakeCounterParty.id,
        companyId: fakeCompany.id,
        status: JOURNAL_EVENT.UPLOADED,
        editable: true,
        no: '1001',
        date: 1,
        type: EventType.INCOME,
        note: 'this is note',
        createdAt: 1,
        updatedAt: 1,
        deletedAt: null,
        lineItems: fakeLineItems,
        originalEvents: [],
        resultEvents: [],
        certificates: [],
        asset: [],
        readByUsers: [],
      };

      fakeReversedLineItem = {
        id: 10000000,
        description: 'fake Reversed description',
        amount: 1000,
        debit: true,
        accountId: 1000,
        voucherId: 1,
        createdAt: 1,
        updatedAt: 1,
        deletedAt: null,
      };

      fakeReversedVoucher = {
        id: 1001,
        issuerId: 3,
        counterPartyId: 3,
        companyId: 3,
        status: JOURNAL_EVENT.UPLOADED,
        editable: true,
        no: '1001',
        date: 1,
        type: EventType.INCOME,
        note: 'this is Reversed Voucher',
        createdAt: 1,
        updatedAt: 1,
        deletedAt: null,
        lineItems: [fakeReversedLineItem],
        originalEvents: [],
        resultEvents: [],
        certificates: [],
        asset: [],
        readByUsers: [],
      };

      fakeEventControlPanel = {
        revertEvent: null,
        recurringEvent: null,
        assetEvent: null,
      };

      fakeRevertEvent = {
        id: 0,
        eventType: EventEntityType.REVERT,
        frequency: EventEntityFrequency.ONCE,
        startDate: 1,
        endDate: 1,
        dateOfWeek: [],
        monthsOfYear: [],
        createdAt: 1,
        updatedAt: 1,
        deletedAt: null,
        associateVouchers: [
          {
            amount: 1000,
            originalVoucher: fakeReversedVoucher,
            resultVoucher: {
              ...fakeVoucher,
              lineItems: fakeLineItems,
            },
          },
        ],
      };
    });

    it('No Special event, should save voucher to prisma', async () => {
      const voucher = await postUtils.saveVoucherToPrisma({
        nowInSecond: fakeNowInSecond,
        originalVoucher: fakeVoucher,
        company: fakeCompany,
        issuer: fakeIssuer,
        eventControlPanel: fakeEventControlPanel,
      });

      expect(voucher).toBeDefined();
      expect(voucher.id).toBeGreaterThan(0);
      expect(voucher.lineItems.length).toBe(3);

      await Promise.all(
        voucher.lineItems.map((lineItem) => {
          const deletedLineItem = prisma.lineItem.delete({
            where: {
              id: lineItem.id,
            },
          });

          return deletedLineItem;
        })
      );

      await prisma.voucher.delete({
        where: {
          id: voucher.id,
        },
      });
    });

    it('should create asset voucher if asset is provided', async () => {
      fakeVoucher.asset = fakeAssets;
      const voucher = await postUtils.saveVoucherToPrisma({
        nowInSecond: fakeNowInSecond,
        originalVoucher: fakeVoucher,
        company: fakeCompany,
        issuer: fakeIssuer,
        eventControlPanel: fakeEventControlPanel,
      });

      expect(voucher).toBeDefined();
      expect(voucher.id).toBeGreaterThan(0);
      expect(voucher.lineItems.length).toBe(3);

      const assetVoucher = await prisma.assetVoucher.findFirst({
        where: {
          voucherId: voucher.id,
          assetId: fakeAssets[0].id,
        },
      });

      expect(assetVoucher).toBeDefined();

      if (assetVoucher) {
        await prisma.assetVoucher.delete({
          where: {
            id: assetVoucher.id,
          },
        });
      }

      await Promise.all(
        voucher.lineItems.map((lineItem) => {
          const deletedLineItem = prisma.lineItem.delete({
            where: {
              id: lineItem.id,
            },
          });

          return deletedLineItem;
        })
      );

      await prisma.voucher.delete({
        where: {
          id: voucher.id,
        },
      });
    });

    it('Revert event', async () => {
      fakeEventControlPanel.revertEvent = fakeRevertEvent;

      const voucher = await postUtils.saveVoucherToPrisma({
        nowInSecond: fakeNowInSecond,
        originalVoucher: fakeVoucher,
        company: fakeCompany,
        issuer: fakeIssuer,
        eventControlPanel: fakeEventControlPanel,
      });

      expect(voucher).toBeDefined();
      expect(voucher.id).toBeGreaterThan(0);
      expect(voucher.lineItems.length).toBe(3);

      const associateVoucher = await prisma.accociateVoucher.findFirst({
        where: {
          originalVoucherId: fakeReversedVoucher.id,
          resultVoucherId: voucher.id,
        },
      });

      const associateLineItem = await prisma.accociateLineItem.findFirst({
        where: {
          originalLineItemId: fakeReversedLineItem.id,
          accociateVoucherId: associateVoucher?.id,
        },
      });
      expect(associateLineItem).toBeDefined();

      expect(associateVoucher).toBeDefined();

      const event = await prisma.event.findFirst({
        where: {
          id: associateVoucher?.eventId,
        },
      });

      expect(event).toBeDefined();

      if (associateLineItem) {
        await prisma.accociateLineItem.delete({
          where: {
            id: associateLineItem.id,
          },
        });
      }
      if (associateVoucher) {
        await prisma.accociateVoucher.delete({
          where: {
            id: associateVoucher.id,
          },
        });
      }

      if (event) {
        await prisma.event.delete({
          where: {
            id: event.id,
          },
        });
      }

      await Promise.all(
        voucher.lineItems.map((lineItem) => {
          const deletedLineItem = prisma.lineItem.delete({
            where: {
              id: lineItem.id,
            },
          });

          return deletedLineItem;
        })
      );

      await prisma.voucher.delete({
        where: {
          id: voucher.id,
        },
      });
    });
  });
});
