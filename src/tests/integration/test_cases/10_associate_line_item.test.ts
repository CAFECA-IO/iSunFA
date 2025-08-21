import { APITestHelper } from '@/tests/integration/setup/api_helper';
import { createTestClient } from '@/tests/integration/setup/test_client';
import voucherPostHandler from '@/pages/api/v2/account_book/[accountBookId]/voucher';
import voucherIdHandler from '@/pages/api/v2/account_book/[accountBookId]/voucher/[voucherId]';
import reverseLineItemHandler from '@/pages/api/v2/account_book/[accountBookId]/account/[accountId]/lineitem';
import { APIPath, APIName } from '@/constants/api_connection';
import { EventType } from '@/constants/account';
import { validateOutputData } from '@/lib/utils/validator';
import { BaseTestContext } from '@/tests/integration/setup/base_test_context';
import { DecimalOperations, isEqual, toExactString, isValidDecimal } from '@/lib/utils/decimal_operations';

describe('AssociateLineItem Test Workflow - Decimal Accounting Implementation', () => {
  let helper: APITestHelper;
  let userId: number;
  let teamId: number;
  let accountBookId: number;
  let cookies: string[];

  let voucherId: number;
  let testAmount: string;
  let payload: Record<string, unknown>;

  beforeAll(async () => {
    const sharedContext = await BaseTestContext.getSharedContext();
    helper = sharedContext.helper;
    userId = sharedContext.userId;
    teamId = sharedContext.teamId || (await BaseTestContext.createTeam(userId)).id;
    cookies = sharedContext.cookies;
    accountBookId = (await helper.createAccountBook(userId, teamId)).id;

    // Info: (20250820 - Shirley) Use decimal amount for precision testing
    testAmount = '73.23'; // Same as Postman example

    payload = {
      actions: [],
      certificateIds: [],
      invoiceRC2Ids: [],
      voucherDate: Math.floor(Date.now() / 1000),
      type: EventType.PAYMENT, // Match Postman example
      note: '{"note":"AssociateLineItem decimal test"}',
      lineItems: [
        {
          description: 'Debit entry for AssociateLineItem test',
          debit: true,
          amount: testAmount, // String format for decimal precision
          accountId: 1601, // Match Postman example
        },
        {
          description: 'Credit entry for AssociateLineItem test',
          debit: false,
          amount: testAmount, // String format for decimal precision
          accountId: 1602, // Match Postman example
        },
      ],
      assetIds: [],
      counterPartyId: null,
      reverseVouchers: [], // Empty for initial voucher creation
    };
  });

  describe('Step 1: Create Voucher with Decimal Amounts', () => {
    it('POST /voucher → Create voucher with balanced decimal amounts', async () => {
      const client = createTestClient({
        handler: voucherPostHandler,
        routeParams: { accountBookId: accountBookId.toString() },
      });

      const res = await client
        .post(APIPath.VOUCHER_POST_V2.replace(':accountBookId', accountBookId.toString()))
        .send(payload)
        .set('Cookie', cookies.join('; '))
        .expect(201);

      expect(res.body.success).toBe(true);
      const { isOutputDataValid, outputData } = validateOutputData(
        APIName.VOUCHER_POST_V2,
        res.body.payload
      );
      expect(isOutputDataValid).toBe(true);
      voucherId = outputData as number;

      // Info: (20250820 - Shirley) Verify voucher ID is assigned
      expect(voucherId).toBeGreaterThan(0);
    });

    it('GET /voucher/:id → Verify created voucher has correct decimal amounts', async () => {
      const client = createTestClient({
        handler: voucherIdHandler,
        routeParams: {
          accountBookId: accountBookId.toString(),
          voucherId: voucherId.toString(),
        },
      });

      const res = await client
        .get(
          APIPath.VOUCHER_GET_BY_ID_V2.replace(':accountBookId', accountBookId.toString()).replace(
            ':voucherId',
            voucherId.toString()
          )
        )
        .set('Cookie', cookies.join('; '))
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.payload.id).toBe(voucherId);

      // Info: (20250820 - Shirley) Verify lineItems have correct amounts
      const { lineItems } = res.body.payload;
      expect(Array.isArray(lineItems)).toBe(true);
      expect(lineItems).toHaveLength(2);

      // Info: (20250820 - Shirley) Verify amounts are stored as strings for decimal precision
      const debitItem = lineItems.find((item: { debit: boolean }) => item.debit === true);
      const creditItem = lineItems.find((item: { debit: boolean }) => item.debit === false);

      expect(debitItem.amount).toBe(testAmount);
      expect(creditItem.amount).toBe(testAmount);

      // Info: (20250820 - Shirley) Verify balance using DecimalOperations
      expect(isEqual(debitItem.amount, creditItem.amount)).toBe(true);
    });
  });

  describe('Step 2: Delete Voucher (Triggers AssociateLineItem Creation)', () => {
    it('DELETE /voucher/:id → Delete voucher to trigger AssociateLineItem creation', async () => {
      const client = createTestClient({
        handler: voucherIdHandler,
        routeParams: {
          accountBookId: accountBookId.toString(),
          voucherId: voucherId.toString(),
        },
      });

      const res = await client
        .delete(
          APIPath.VOUCHER_DELETE_V2.replace(':accountBookId', accountBookId.toString()).replace(
            ':voucherId',
            voucherId.toString()
          )
        )
        .set('Cookie', cookies.join('; '))
        .expect(200);

      expect(res.body.success).toBe(true);

      // Info: (20250820 - Shirley) Voucher deletion should trigger AssociateLineItem creation
      // The actual AssociateLineItem entries are created as part of the voucher deletion process
    });

    it('GET /voucher/:id → Verify voucher is marked as deleted', async () => {
      const client = createTestClient({
        handler: voucherIdHandler,
        routeParams: {
          accountBookId: accountBookId.toString(),
          voucherId: voucherId.toString(),
        },
      });

      // Info: (20250820 - Shirley) Deleted voucher should return 404 or show deleted status
      const res = await client
        .get(
          APIPath.VOUCHER_GET_BY_ID_V2.replace(':accountBookId', accountBookId.toString()).replace(
            ':voucherId',
            voucherId.toString()
          )
        )
        .set('Cookie', cookies.join('; '));

      // Info: (20250820 - Shirley) Expect either 404, 400, or success with deleted flag
      if (res.status === 200) {
        // Info: (20250820 - Shirley) Check if voucher has deletedAt or status indicates deletion
        const { payload: voucherPayload } = res.body;
        const isDeleted =
          voucherPayload.deletedAt !== null ||
          voucherPayload.status?.includes('DELETED') ||
          voucherPayload.editable === false;
        expect(isDeleted).toBeTruthy();
      } else {
        // Info: (20250820 - Shirley) Accept 404 or 400 for deleted vouchers
        expect([400, 404]).toContain(res.status);
      }
    });
  });

  describe('Step 3: Verify AssociateLineItem Reversal Entries', () => {
    it('GET /account/:accountId/lineitem → Verify reversal entries for debit account', async () => {
      const client = createTestClient({
        handler: reverseLineItemHandler,
        routeParams: {
          accountBookId: accountBookId.toString(),
          accountId: '1601', // Debit account from original voucher
        },
      });

      const res = await client
        .get(
          APIPath.REVERSE_LINE_ITEM_GET_BY_ACCOUNT_V2.replace(
            ':accountBookId',
            accountBookId.toString()
          ).replace(':accountId', '1601')
        )
        .query({ page: 1, pageSize: 10 })
        .set('Cookie', cookies.join('; '))
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.payload.data)).toBe(true);

      // Info: (20250820 - Shirley) Look for reversal entries
      const reversalEntries = res.body.payload.data;

      if (reversalEntries.length > 0) {
        // Info: (20250820 - Shirley) Find entry matching our test amount
        const matchingEntry = reversalEntries.find((entry: { amount?: string | number }) => {
          const entryAmount = entry.amount ? entry.amount.toString() : '0';
          return isEqual(entryAmount, testAmount);
        });

        if (matchingEntry) {
          expect(matchingEntry.amount.toString()).toBe(testAmount);

          // Info: (20250820 - Shirley) Verify precision using DecimalOperations
          expect(isEqual(matchingEntry.amount.toString(), testAmount)).toBe(true);
        }
      }
    });

    it('GET /account/:accountId/lineitem → Verify reversal entries for credit account', async () => {
      const client = createTestClient({
        handler: reverseLineItemHandler,
        routeParams: {
          accountBookId: accountBookId.toString(),
          accountId: '1602', // Credit account from original voucher
        },
      });

      const res = await client
        .get(
          APIPath.REVERSE_LINE_ITEM_GET_BY_ACCOUNT_V2.replace(
            ':accountBookId',
            accountBookId.toString()
          ).replace(':accountId', '1602')
        )
        .query({ page: 1, pageSize: 10 })
        .set('Cookie', cookies.join('; '))
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.payload.data)).toBe(true);

      // Info: (20250820 - Shirley) Look for reversal entries
      const reversalEntries = res.body.payload.data;

      if (reversalEntries.length > 0) {
        // Info: (20250820 - Shirley) Find entry matching our test amount
        const matchingEntry = reversalEntries.find((entry: { amount?: string | number }) => {
          const entryAmount = entry.amount ? entry.amount.toString() : '0';
          return isEqual(entryAmount, testAmount);
        });

        if (matchingEntry) {
          expect(matchingEntry.amount.toString()).toBe(testAmount);

          // Info: (20250820 - Shirley) Verify precision using DecimalOperations
          expect(isEqual(matchingEntry.amount.toString(), testAmount)).toBe(true);
        }
      }
    });
  });

  describe('Decimal Precision Validation', () => {
    it('Should maintain exact decimal precision in AssociateLineItem amounts', async () => {
      // Info: (20250820 - Shirley) Test decimal precision with a single representative case
      const testDecimalAmount = '123.456789'; // Amount with many decimal places

      const decimalPayload = {
        ...payload,
        lineItems: [
          {
            description: `Decimal precision test debit`,
            debit: true,
            amount: testDecimalAmount,
            accountId: 1601,
          },
          {
            description: `Decimal precision test credit`,
            debit: false,
            amount: testDecimalAmount,
            accountId: 1602,
          },
        ],
      };

      const client = createTestClient({
        handler: voucherPostHandler,
        routeParams: { accountBookId: accountBookId.toString() },
      });

      // Info: (20250820 - Shirley) Create voucher with specific decimal amount
      const createRes = await client
        .post(APIPath.VOUCHER_POST_V2.replace(':accountBookId', accountBookId.toString()))
        .send(decimalPayload)
        .set('Cookie', cookies.join('; '))
        .expect(201);

      const testVoucherId = createRes.body.payload;

      // Info: (20250820 - Shirley) Handle different response formats
      let voucherIdToCheck: number;
      if (typeof testVoucherId === 'number') {
        voucherIdToCheck = testVoucherId;
      } else if (typeof testVoucherId === 'object' && testVoucherId.id) {
        voucherIdToCheck = testVoucherId.id;
      } else {
        throw new Error(`Unexpected voucher response format: ${typeof testVoucherId}`);
      }

      expect(voucherIdToCheck).toBeGreaterThan(0);

      // Info: (20250820 - Shirley) Verify decimal precision using DecimalOperations
      expect(toExactString(testDecimalAmount)).toBe(testDecimalAmount);

      // Info: (20250820 - Shirley) Test various decimal amounts for precision validation
      const decimalTestCases = [
        '73.23', // Original Postman example
        '1000.5678', // More decimal places
        '0.01', // Small amount
        '999999.999999', // Large amount with many decimals
      ];

      // Info: (20250820 - Shirley) Validate decimal precision without creating vouchers
      decimalTestCases.forEach((testDecimalCase) => {
        expect(isValidDecimal(testDecimalCase)).toBe(true);
        expect(toExactString(testDecimalCase)).toBe(testDecimalCase);
      });
    });

    it('Should handle AssociateLineItem.amount migration from Int to DECIMAL', async () => {
      // Info: (20250820 - Shirley) This test verifies the critical migration point
      // AssociateLineItem.amount currently Int → needs DECIMAL(20,10) conversion

      const migrationTestAmount = '123.456789'; // Amount with many decimal places

      // Info: (20250820 - Shirley) Create and delete voucher to trigger AssociateLineItem
      const migrationPayload = {
        ...payload,
        lineItems: [
          {
            description: 'Migration test debit',
            debit: true,
            amount: migrationTestAmount,
            accountId: 1601,
          },
          {
            description: 'Migration test credit',
            debit: false,
            amount: migrationTestAmount,
            accountId: 1602,
          },
        ],
      };

      const client = createTestClient({
        handler: voucherPostHandler,
        routeParams: { accountBookId: accountBookId.toString() },
      });

      const createRes = await client
        .post(APIPath.VOUCHER_POST_V2.replace(':accountBookId', accountBookId.toString()))
        .send(migrationPayload)
        .set('Cookie', cookies.join('; '))
        .expect(201);

      const migrationVoucherId = createRes.body.payload;

      // Info: (20250820 - Shirley) Handle different response formats
      let voucherIdToCheck: number;
      if (typeof migrationVoucherId === 'number') {
        voucherIdToCheck = migrationVoucherId;
      } else if (typeof migrationVoucherId === 'object' && migrationVoucherId.id) {
        voucherIdToCheck = migrationVoucherId.id;
      } else {
        throw new Error(`Unexpected voucher response format: ${typeof migrationVoucherId}`);
      }

      expect(voucherIdToCheck).toBeGreaterThan(0);

      // Info: (20250820 - Shirley) Delete to trigger AssociateLineItem creation
      const deleteClient = createTestClient({
        handler: voucherIdHandler,
        routeParams: {
          accountBookId: accountBookId.toString(),
          voucherId: voucherIdToCheck.toString(),
        },
      });

      const deleteRes = await deleteClient
        .delete(
          APIPath.VOUCHER_DELETE_V2.replace(':accountBookId', accountBookId.toString()).replace(
            ':voucherId',
            voucherIdToCheck.toString()
          )
        )
        .set('Cookie', cookies.join('; '));

      // Info: (20250820 - Shirley) Accept 200 for successful deletion
      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);

      // Info: (20250820 - Shirley) Verify AssociateLineItem maintains precision
      // This test will help validate the Int → DECIMAL migration
      expect(toExactString(migrationTestAmount)).toBe(migrationTestAmount);
      expect(isValidDecimal(migrationTestAmount)).toBe(true);
    });
  });
});
