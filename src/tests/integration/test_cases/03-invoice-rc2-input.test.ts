// import { DeductionType, InvoiceType, TaxType } from '@/constants/invoice_rc2';
// import { IAccountBook } from '@/interfaces/account_book';
// import { IFileBeta } from '@/interfaces/file';
// import { IInvoiceRC2Input } from '@/interfaces/invoice_rc2';
// import { ITeam } from '@/interfaces/team';
// import { IUser } from '@/interfaces/user';
// import { InvoiceRC2TestHelper } from '@/tests/integration/helpers/invoice_rc2_test_helper';

describe('Integration Test - Invoice RC2 API Flow', () => {
  it('should run this dummy test to retain file structure', () => {
    expect(true).toBe(true);
  });

  /** Info: (20250703- Tzuhan) Full invoice input flow test
  let user: IUser;
  let team: ITeam;
  let accountBook: IAccountBook;
  let uploadedFile: IFileBeta;
  let invoiceInput: IInvoiceRC2Input;
  beforeAll(async () => {
    await InvoiceRC2TestHelper.init();
  }, 120000);

  afterAll(async () => {
    await InvoiceRC2TestHelper.teardown();
  }, 30000);

  it('should complete full invoice input flow', async () => {
    // Info: (20250702 - Tzuhan) Step 1: Create user via OTP login
    const createdUser = await InvoiceRC2TestHelper.createUser();
    // eslint-disable-next-line no-console
    console.log('Created User:', createdUser);

    // Info: (20250702 - Tzuhan) Step 2: Get session info to extract default team
    const statusInfo = await InvoiceRC2TestHelper.getStatusInfo();

    expect(statusInfo).toBeDefined();
    user = statusInfo.user!;
    expect(user?.id).toBeDefined();

    team = await InvoiceRC2TestHelper.createTeam();
    const teamId = team.id;

    // Info: (20250702 - Tzuhan) Step 3: Create account book
    accountBook = await InvoiceRC2TestHelper.createAccountBookWithTeam(teamId, 10001200);
    expect(accountBook?.id).toBeDefined();

    // Info: (20250702 - Tzuhan) Step 4: Connect account book
    // const connected = await InvoiceRC2TestHelper.connectAccountBook(accountBook.id);
    // expect(connected?.id).toBe(accountBook.id);
    // Info: (20250702 - Tzuhan) Step 5: Upload encrypted file
    uploadedFile = await InvoiceRC2TestHelper.uploadEncryptedFileFake(accountBook.id);
    expect(uploadedFile?.id).toBeDefined();

    // Info: (20250702 - Tzuhan) Step 6: Create invoice input
    invoiceInput = await InvoiceRC2TestHelper.createInvoiceRC2Input(
      accountBook.id,
      uploadedFile.id
    );
    expect(invoiceInput?.id).toBeDefined();

    // Info: (20250702 - Tzuhan) Step 7: Update invoice input
    const updated = await InvoiceRC2TestHelper.updateInvoiceRC2Input(
      accountBook.id,
      invoiceInput.id,
      {
        no: 'AB25000038',
        type: InvoiceType.INPUT_21,
        taxType: TaxType.TAXABLE,
        issuedDate: 1728835200,
        taxRate: 5,
        netAmount: 5200,
        taxAmount: 260,
        totalAmount: 5460,
        salesName: '統一智能空調工程有限公司',
        salesIdNumber: '00209406',
        deductionType: DeductionType.DEDUCTIBLE_FIXED_ASSETS,
        isSharedAmount: false,
      }
    );
    expect(updated?.no).toBe('AB25000038');

    // Info: (20250702 - Tzuhan) Step 8: Delete invoice
    const deleted = await InvoiceRC2TestHelper.deleteInvoiceRC2Input(accountBook.id, [
      invoiceInput.id,
    ]);
    expect(deleted.success).toBe(true);
    expect(deleted.deletedIds).toContain(invoiceInput.id);
  }, 30000);
  */
});
