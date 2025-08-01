import { APITestHelper } from '@/tests/integration/setup/api_helper';
import { TestDataFactory } from '@/tests/integration/setup/test_data_factory';
import prisma from '@/client';
import { IAccountBookInfo } from '@/interfaces/account_book';
import { InvoiceDirection } from '@/constants/invoice_rc2';
import { IInvoiceRC2Base, IInvoiceRC2Input } from '@/interfaces/invoice_rc2';
import { ITeam } from '@/interfaces/team';

/** Info: (20250717 - Tzuhan)
 * 在整個整合測試階段持有「所有測試資料的 ID」
 * 方便在 globalTeardown / afterAll 做一次性清理。
 */
export interface SharedContext {
  helper: APITestHelper;
  cookies: string[];
  userId: number;
  team?: ITeam;
  teamId?: number;
  accountBook?: IAccountBookInfo;
  accountBookId?: number;
  uploadedFileIdForInput?: number;
  uploadedFileIdForOutput?: number;
  inputInvoice?: IInvoiceRC2Input;
  outputInvoice?: IInvoiceRC2Input;
  startDate: number;
  endDate: number;
}

export class BaseTestContext {
  /** Info: (20250717 - Tzuhan) 真正存放資料的單例 */
  private static ctx: SharedContext | null = null;

  /** Info: (20250717 - Tzuhan) 解決多個 getSharedContext() 併發呼叫時的 race condition */
  private static initializing: Promise<SharedContext> | null = null;

  private static createdAccountBooks = new Set<number>();

  private constructor() {
    /* Info: (20250717 - Tzuhan) 禁止實例化 */
  }

  /**
   * Info: (20250717 - Tzuhan)
   * 取得全域 SharedContext（lazy 初始化 + 併發安心）
   */
  static async getSharedContext(): Promise<SharedContext> {
    if (this.ctx) return this.ctx;

    // Info: (20250717 - Tzuhan) 若已有初始化中的 Promise，直接等那個
    if (this.initializing) return this.initializing;

    this.initializing = (async () => {
      // Info: (20250717 - Tzuhan) 建立空殼，確保 recordXXX 在初始化途中也能安全使用
      this.ctx = {
        helper: undefined as unknown as APITestHelper,
        cookies: [],
        userId: 0,
        teamId: 0,
        accountBookId: 0,
        startDate: 0,
        endDate: 0,
      };

      // Info: (20250717 - Tzuhan) === ↓ 真正呼叫 API、產生測試基礎資料 ↓ ===
      const helper = await APITestHelper.createHelper({ autoAuth: true });
      // Info: (20250717 - Tzuhan) 取得 User
      const status = await helper.getStatusInfo();
      const userId = (status.body.payload?.user as { id: number }).id as number;
      const cookies = helper.getCurrentSession();
      // Info: (20250717 - Tzuhan) Complete user registration with default values
      await helper.agreeToTerms();
      await helper.createUserRole();
      await helper.selectUserRole();

      // Info: (20250717 - Tzuhan) 建立 Team
      // const team = await helper.createTeam(userId, 'IT Shared Team');

      // Info: (20250721 - Tzuhan) 建立 Account Book
      // const accountBookId = await helper.createAccountBook(userId, teamId);

      Object.assign(this.ctx, {
        helper,
        cookies,
        userId,
        // team,
        // teamId: team.id,
        // accountBookId,
      });

      return this.ctx;
    })();

    return this.initializing;
  }

  static async createTeam(userId: number, teamName?: string): Promise<ITeam> {
    if (!this.ctx) {
      throw new Error('BaseTestContext not initialized. Call getSharedContext() first.');
    }
    if (!this.ctx.team) {
      const team = await this.ctx.helper.createTeam(userId, teamName);
      this.ctx.team = team;
      this.ctx.teamId = team.id;
    }
    return this.ctx.team;
  }

  static async createAccountBook(
    userId: number,
    teamId: number,
    name?: string,
    options?: {
      useFixedTimestamp?: boolean;
      customTimestamp?: number;
    }
  ) {
    if (!this.ctx) {
      throw new Error('BaseTestContext not initialized. Call getSharedContext() first.');
    }
    if (!this.ctx.accountBook) {
      const accountBook = await this.ctx.helper.createAccountBook(userId, teamId, name);
      this.ctx.accountBook = accountBook;
      this.ctx.accountBookId = accountBook.id;
    }

    // Info: (20250728 - Shirley) Set timestamp and date range based on test requirements
    let baseTimestamp: number;
    if (options?.useFixedTimestamp) {
      // Info: (20250728 - Shirley) For trial balance test - use fixed timestamp to match TestDataFactory expectations
      baseTimestamp = options.customTimestamp || Math.floor(Date.now() / 1000); // Dynamic timestamp
      this.ctx.startDate = baseTimestamp + 86400 * 10; // Start after voucher creation, so vouchers are in "beginning"
      this.ctx.endDate = baseTimestamp + 86400 * 40; // End after start
    } else {
      // Info: (20250728 - Shirley) For other tests - use today's midnight as before
      const now = Date.now();
      baseTimestamp = Math.floor(now / 86400000) * 86400;
      this.ctx.startDate = baseTimestamp;
      this.ctx.endDate = baseTimestamp + 86400 * 30;
    }

    if (!this.createdAccountBooks.has(this.ctx.accountBookId!)) {
      await BaseTestContext.createTestVouchers(this.ctx.accountBookId!, baseTimestamp);
      this.createdAccountBooks.add(this.ctx.accountBookId!);
    }
    return this.ctx.accountBook!;
  }

  static async uploadEncryptedFile(
    filename: string,
    accountBookId: number,
    direction: InvoiceDirection
  ) {
    if (!this.ctx) {
      throw new Error('BaseTestContext not initialized. Call getSharedContext() first.');
    }
    if (direction === InvoiceDirection.INPUT && this.ctx.uploadedFileIdForInput) {
      return this.ctx.uploadedFileIdForInput;
    }
    if (direction === InvoiceDirection.OUTPUT && this.ctx.uploadedFileIdForOutput) {
      return this.ctx.uploadedFileIdForOutput;
    }
    const fileId = await this.ctx.helper.uploadEncryptedFile(filename, accountBookId);
    if (direction === InvoiceDirection.INPUT) {
      this.ctx.uploadedFileIdForInput = fileId;
    }
    if (direction === InvoiceDirection.OUTPUT) {
      this.ctx.uploadedFileIdForOutput = fileId;
    }
    return fileId;
  }

  static async createInvoice<T extends IInvoiceRC2Base>(
    accountBookId: number,
    fileId: number,
    direction: InvoiceDirection
  ) {
    if (!this.ctx) {
      throw new Error('BaseTestContext not initialized. Call getSharedContext() first.');
    }
    if (direction === InvoiceDirection.INPUT && this.ctx.inputInvoice) {
      return this.ctx.inputInvoice as T;
    }
    if (direction === InvoiceDirection.OUTPUT && this.ctx.outputInvoice) {
      return this.ctx.outputInvoice as T;
    }
    const invoice = await this.ctx.helper.createInvoice<T>(accountBookId, fileId, direction);
    if (direction === InvoiceDirection.INPUT) {
      this.ctx.inputInvoice = invoice as IInvoiceRC2Input;
    } else {
      this.ctx.outputInvoice = invoice as IInvoiceRC2Input;
    }
    return invoice;
  }

  static async createTestVouchers(accountBookId: number, testBaseTs: number) {
    if (!this.ctx) {
      throw new Error('BaseTestContext not initialized. Call getSharedContext() first.');
    }
    return this.ctx.helper.createTestVouchers(accountBookId, testBaseTs);
  }

  // -----------------------------------------
  // Info: (20250717 - Tzuhan) 清理 / 重設
  // -----------------------------------------
  /** Info: (20250717 - Tzuhan) 刪除 DB 中所有測試期間建立的資料，並斷線 */
  static async cleanup(): Promise<void> {
    // Todo: 透過補上開始測試時間與結束時間，用來清楚測試期間內新增的 file
    // Todo： 移除 ctx，透過email來刪除測試資料
    if (!this.ctx) return;

    const userIds = await prisma.user
      .findMany({
        where: {
          email: { in: TestDataFactory.DEFAULT_TEST_EMAILS },
        },
        select: { id: true },
      })
      .then((users) => users.map((user) => user.id));

    const orphanAccountBookIds = await prisma.accountBook
      .findMany({
        where: { userId: { in: userIds } },
        select: { id: true },
      })
      .then((abs) => abs.map((ab) => ab.id));

    const orphanTeamIds = await prisma.team
      .findMany({
        where: { ownerId: { in: userIds } },
        select: { id: true },
      })
      .then((teams) => teams.map((team) => team.id));

    const voucherIdsToPurge = await prisma.voucher
      // Info: (20250717 - Tzuhan) ① 先拿要清的 voucherId：自己 record 的 + 同一本帳的
      .findMany({
        where: { accountBookId: { in: orphanAccountBookIds } },
        select: { id: true },
      })
      .then((vs) => vs.map((v) => v.id));

    const invoiceIdsToPurge = await prisma.invoiceRC2
      .findMany({
        where: { accountBookId: { in: orphanAccountBookIds } },
        select: { id: true },
      })
      .then((ins) => ins.map((i) => i.id));

    // Info: (20250725 - Shirley) Get report IDs that reference the companies to be deleted
    const reportIdsToPurge = await prisma.report
      .findMany({
        where: { accountBookId: { in: orphanAccountBookIds } },
        select: { id: true },
      })
      .then((reports) => reports.map((report) => report.id));

    await prisma.$transaction([
      // Info: (20250717 - Tzuhan) ── asset_voucher / associate_line_item / voucher_salary_record / invoice_voucher_journal …
      prisma.associateLineItem.deleteMany({
        where: {
          OR: [
            { originalLineItem: { voucherId: { in: voucherIdsToPurge } } },
            { resultLineItem: { voucherId: { in: voucherIdsToPurge } } },
          ],
        },
      }),
      prisma.associateVoucher.deleteMany({
        where: {
          OR: [
            { originalVoucherId: { in: voucherIdsToPurge } },
            { resultVoucherId: { in: voucherIdsToPurge } },
          ],
        },
      }),
      prisma.assetVoucher.deleteMany({ where: { voucherId: { in: voucherIdsToPurge } } }),
      prisma.voucherSalaryRecord.deleteMany({ where: { voucherId: { in: voucherIdsToPurge } } }),
      prisma.invoiceVoucherJournal.deleteMany({ where: { voucherId: { in: voucherIdsToPurge } } }),
      // Info: (20250717 - Tzuhan) ── line_item 直接指 voucher
      prisma.lineItem.deleteMany({
        where: { voucherId: { in: voucherIdsToPurge } },
      }),
      // Info: (20250717 - Tzuhan) ── 現在才能刪 voucher
      prisma.voucher.deleteMany({
        where: { id: { in: voucherIdsToPurge } },
      }),
      // Info: (20250717 - Tzuhan) ── 如果還有 InvoiceRC2 連到 voucher，要在這裡把 voucherId 置空或一起刪
      prisma.invoiceRC2.updateMany({
        where: { voucherId: { in: voucherIdsToPurge } },
        data: { voucherId: null },
      }),
      prisma.invoiceRC2.deleteMany({
        where: { id: { in: invoiceIdsToPurge } },
      }),
      prisma.accountingSetting.deleteMany({
        where: { accountBookId: { in: orphanAccountBookIds } },
      }),
      prisma.accountBookSetting.deleteMany({
        where: { accountBookId: { in: orphanAccountBookIds } },
      }),
      prisma.account.deleteMany({
        where: { accountBookId: { in: orphanAccountBookIds } },
      }),
      // Info: (20250725 - Shirley) Delete audit reports before reports (foreign key dependency)
      prisma.auditReport.deleteMany({
        where: { accountBookId: { in: orphanAccountBookIds } },
      }),
      // Info: (20250725 - Shirley) Delete reports before companies (foreign key constraint)
      prisma.report.deleteMany({
        where: { id: { in: reportIdsToPurge } },
      }),
      prisma.accountBook.deleteMany({
        where: { id: { in: orphanAccountBookIds } },
      }),
      prisma.inviteTeamMember.deleteMany({ where: { teamId: { in: orphanTeamIds } } }),
      prisma.teamSubscription.deleteMany({ where: { teamId: { in: orphanTeamIds } } }),
      prisma.teamMember.deleteMany({ where: { teamId: { in: orphanTeamIds } } }),
      prisma.notification.deleteMany({ where: { userId: { in: userIds } } }),
      prisma.team.deleteMany({ where: { id: { in: orphanTeamIds } } }),
      prisma.userActionLog.deleteMany({ where: { userId: { in: userIds } } }),
      prisma.userAgreement.deleteMany({ where: { userId: { in: userIds } } }),
      prisma.userRole.deleteMany({ where: { userId: { in: userIds } } }),
      prisma.authentication.deleteMany({ where: { userId: { in: userIds } } }),
      prisma.emailLogin.deleteMany({
        where: { email: { in: TestDataFactory.DEFAULT_TEST_EMAILS } },
      }),
      prisma.user.deleteMany({ where: { id: { in: userIds } } }),
    ]);

    // Info: (20250728 - Shirley) Clear the created account books set
    this.createdAccountBooks.clear();

    // Deprecated: (20250717 - Luphia) remove eslint-disable
    // eslint-disable-next-line no-console
    console.log('BaseTestContext.cleanup() - All test data purged successfully.');
    await prisma.$disconnect();
  }

  /** Info: (20250717 - Tzuhan) 僅用於單元測試之間重設（不常用） */
  static resetForNextSuite() {
    this.ctx = null;
    this.initializing = null;
  }
}
