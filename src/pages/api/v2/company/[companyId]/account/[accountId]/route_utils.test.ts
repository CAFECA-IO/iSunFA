import prisma from '@/client';
import { SPECIAL_ACCOUNTS } from '@/constants/account';
import { IGetLineItemByAccount } from '@/interfaces/line_item';
import { lineItemGetByAccountAPIUtils } from '@/pages/api/v2/company/[companyId]/account/[accountId]/route_utils';
import { LineItem as PrismaLineItem, Account as PrismaAccount } from '@prisma/client';

describe('lineItemGetByAccountAPIUtils', () => {
  let fakeReverseLineItems: PrismaLineItem & {
    account: PrismaAccount;
  };
  let fakeLineItemsFromDB: IGetLineItemByAccount[];
  // let fakePaginatedLineItemsFromDB: IPaginatedData<IGetLineItemByAccount[]>;
  const fakeCompanyId = 1000;

  beforeEach(() => {
    fakeReverseLineItems = {
      id: 1007,
      amount: 100,
      description: '償還應付帳款-應付帳款',
      debit: true,
      accountId: 10000981,
      voucherId: 1002,
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
    };
    fakeLineItemsFromDB = [
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
        voucher: {
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
          originalVouchers: [
            {
              id: 1000,
              eventId: 1000,
              originalVoucherId: 1000,
              resultVoucherId: 1002,
              createdAt: 1731343518,
              updatedAt: 1731343518,
              deletedAt: null,
              resultVoucher: {
                id: 1002,
                issuerId: 1000,
                counterPartyId: 1000,
                companyId: 1000,
                aiResultId: '0',
                status: 'journal:JOURNAL.UPLOADED',
                editable: true,
                no: 'VCH003',
                date: 1672531200,
                type: 'payment',
                note: 'First voucher',
                createdAt: 1672531200,
                updatedAt: 1672531200,
                deletedAt: null,
                lineItems: [
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
              },
            },
          ],
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
        voucher: {
          id: 1002,
          issuerId: 1000,
          counterPartyId: 1000,
          companyId: 1000,
          aiResultId: '0',
          status: 'journal:JOURNAL.UPLOADED',
          editable: true,
          no: 'VCH003',
          date: 1672531200,
          type: 'payment',
          note: 'First voucher',
          createdAt: 1672531200,
          updatedAt: 1672531200,
          deletedAt: null,
          originalVouchers: [],
        },
      },
    ];
    // fakePaginatedLineItemsFromDB = {
    //   data: fakeLineItemsFromDB,
    //   page: 1,
    //   totalPages: 1,
    //   totalCount: 2,
    //   pageSize: 10,
    //   hasNextPage: false,
    //   hasPreviousPage: false,
    //   sort: []
    // };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getLineItemsByAccountIdFromPrisma', () => {
    it('should return paginated data', async () => {
      const accountPayable = await prisma.account.findFirst({
        where: { code: SPECIAL_ACCOUNTS.ACCOUNT_PAYABLE.code },
      });

      expect(accountPayable).toBeDefined();

      const result = await lineItemGetByAccountAPIUtils.getLineItemsByAccountIdFromPrisma({
        accountId: accountPayable!.id,
        companyId: fakeCompanyId,
        startDate: 0,
        endDate: 1772531200,
        sortOption: [],
      });
      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.data.length).toBeGreaterThan(0);
    });
  });

  describe('getReverseLineItems', () => {
    it('should return reverse line items', () => {
      const reverseLineItems = lineItemGetByAccountAPIUtils.getReverseLineItems(
        fakeLineItemsFromDB[0]
      );
      expect(reverseLineItems).toBeDefined();
      expect(reverseLineItems.length).toBeGreaterThan(0);
    });
  });

  describe('calculateLineItemAdjustedAmount', () => {
    it('should return adjusted amount', () => {
      const [fakeLineItem] = fakeLineItemsFromDB;
      const reverseLineItems = lineItemGetByAccountAPIUtils.getReverseLineItems(fakeLineItem);
      const adjustedAmount = lineItemGetByAccountAPIUtils.calculateLineItemAdjustedAmount({
        originDebit: fakeLineItem.debit,
        reverseLineItems,
        originalAmount: fakeLineItemsFromDB[0].amount,
      });
      expect(adjustedAmount).toBeDefined();
      expect(adjustedAmount).toBe(400);
    });
  });

  describe('isLineItemCanBeReversed', () => {
    it('should return true if line item can be reversed', () => {
      const [fakeLineItem] = fakeLineItemsFromDB;
      const canBeReversed = lineItemGetByAccountAPIUtils.isLineItemCanBeReversed(fakeLineItem);
      expect(canBeReversed).toBe(true);
    });
  });

  describe('isLineItemStillReversible', () => {
    it('should return true if line item can not be reversed', () => {
      lineItemGetByAccountAPIUtils.getReverseLineItems = jest
        .fn()
        .mockReturnValue([fakeReverseLineItems]);
      lineItemGetByAccountAPIUtils.calculateLineItemAdjustedAmount = jest.fn().mockReturnValue(400);
      const isStillReversible = lineItemGetByAccountAPIUtils.isLineItemStillReversible(
        fakeLineItemsFromDB[0]
      );
      expect(isStillReversible).toBe(true);
    });

    it('should return false if line item can not be reversed', () => {
      lineItemGetByAccountAPIUtils.getReverseLineItems = jest
        .fn()
        .mockReturnValue([fakeReverseLineItems]);
      lineItemGetByAccountAPIUtils.calculateLineItemAdjustedAmount = jest.fn().mockReturnValue(0);
      const isStillReversible = lineItemGetByAccountAPIUtils.isLineItemStillReversible(
        fakeLineItemsFromDB[0]
      );
      expect(isStillReversible).toBe(false);
    });
  });

  describe('isLineItemCanBeReversedAndStillReversible', () => {
    it('should return true if line item can be reversed and still reversible', () => {
      lineItemGetByAccountAPIUtils.isLineItemCanBeReversed = jest.fn().mockReturnValue(true);
      lineItemGetByAccountAPIUtils.isLineItemStillReversible = jest.fn().mockReturnValue(true);
      const isReversibleAndStillReversible =
        lineItemGetByAccountAPIUtils.isLineItemCanBeReversedAndStillReversible(
          fakeLineItemsFromDB[0]
        );
      expect(isReversibleAndStillReversible).toBe(true);
    });

    it('should return false if line item can not be reversed and still reversible', () => {
      lineItemGetByAccountAPIUtils.isLineItemCanBeReversed = jest.fn().mockReturnValue(false);
      lineItemGetByAccountAPIUtils.isLineItemStillReversible = jest.fn().mockReturnValue(true);
      const isReversibleAndStillReversible =
        lineItemGetByAccountAPIUtils.isLineItemCanBeReversedAndStillReversible(
          fakeLineItemsFromDB[0]
        );
      expect(isReversibleAndStillReversible).toBe(false);
    });
  });
  describe('initLineItemEntity', () => {
    it('should return line item entity', () => {
      const lineItemEntity = lineItemGetByAccountAPIUtils.initLineItemEntity(
        fakeLineItemsFromDB[0]
      );
      expect(lineItemEntity).toBeDefined();
      expect(lineItemEntity.account).toBeDefined();
      expect(lineItemEntity.voucher).toBeDefined();
    });
  });
});
